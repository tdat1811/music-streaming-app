import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import { PLAYLIST_DETAILS_TRACKS, Song } from "../data/musicData";
import { resolveServerUrl, SERVER_ORIGIN } from "../services/api";

// "03:36" | "1:02:10" -> millis
export const parseDuration = (d?: string): number => {
  if (!d) return 0;
  const secs = d.split(":").map(Number).reduce((acc, p) => acc * 60 + p, 0);
  return secs * 1000;
};

export const shuffleTracks = (tracks: Song[]): Song[] => {
  const result = [...tracks];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Bài đang phát đứng đầu, các bài còn lại xáo ngẫu nhiên
const buildShuffledQueue = (current: Song | null, tracks: Song[]): Song[] => {
  const others = tracks.filter((track) => track.id !== current?.id);
  return current ? [current, ...shuffleTracks(others)] : shuffleTracks(others);
};

// Tua tới sát cuối bài thì dừng tại đó thay vì để bài kết thúc và chuyển bài
const SEEK_END_MARGIN_MS = 500;

export type RepeatMode = "off" | "all" | "one";

const NEXT_REPEAT_MODE: Record<RepeatMode, RepeatMode> = { off: "one", one: "all", all: "off" };

interface AudioPlayerContextType {
  currentTrack: Song | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playSong: (song: Song, playlist?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  playPrevious: () => Promise<void>;
  playNext: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialTrack = PLAYLIST_DETAILS_TRACKS[0] ?? null;

  const [currentTrack, setCurrentTrack] = useState<Song | null>(initialTrack);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(parseDuration(initialTrack?.duration));
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);

  // Ref để listener luôn đọc được giá trị mới nhất (tránh stale closure)
  const currentTrackRef = useRef<Song | null>(currentTrack);
  const playlistRef = useRef<Song[]>(PLAYLIST_DETAILS_TRACKS);
  const shuffledQueueRef = useRef<Song[]>([]);
  const isShuffleRef = useRef<boolean>(false);
  const repeatModeRef = useRef<RepeatMode>("off");
  // Đã yêu cầu phát nhưng chưa có âm thanh (đang tải): vẫn hiển thị là đang phát
  const awaitingPlaybackRef = useRef<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);
  const repeatCountRef = useRef<number>(0);

  const getQueue = () => (isShuffleRef.current ? shuffledQueueRef.current : playlistRef.current);

  // Cho phép phát nhạc cả khi iPhone bật chế độ im lặng
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => {
      subRef.current?.remove();
      playerRef.current?.remove();
    };
  }, []);

  const releasePlayer = () => {
    subRef.current?.remove();
    subRef.current = null;
    playerRef.current?.remove();
    playerRef.current = null;
  };

  const startTrack = async (song: Song) => {
    setCurrentTrack(song);
    currentTrackRef.current = song;
    setPositionMillis(0);
    setDurationMillis(parseDuration(song.duration));
    repeatCountRef.current = 0;

    releasePlayer();

    // Ưu tiên phát file âm thanh full chính thức từ server (/audio/<songId>.m4a)
    let audioUri = `${SERVER_ORIGIN}/audio/${song.id}.m4a`;

    // Nếu song có audioUrl trực tiếp (không phải iTunes preview 30s) thì dùng
    if (song.audioUrl && !song.audioUrl.includes('itunes.apple.com') && song.audioUrl.startsWith('http')) {
      audioUri = resolveServerUrl(song.audioUrl);
    }

    try {
      const player = createAudioPlayer({ uri: audioUri });
      try {
        player.loop = repeatModeRef.current === "one";
      } catch {}
      playerRef.current = player;
      hasFinishedRef.current = false;

      subRef.current = player.addListener("playbackStatusUpdate", (status) => {
        setPositionMillis(Math.floor(status.currentTime * 1000));
        if (status.duration > 0) {
          setDurationMillis(Math.floor(status.duration * 1000));
        }
        if (status.playing && status.currentTime > 0) {
          awaitingPlaybackRef.current = false;
        }
        if (!awaitingPlaybackRef.current) {
          setIsPlaying(status.playing);
        }
        const isEnded = status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.25);
        if (isEnded) {
          if (!hasFinishedRef.current) {
            hasFinishedRef.current = true;
            handleTrackFinished();
          }
        } else {
          hasFinishedRef.current = false;
        }
      });

      awaitingPlaybackRef.current = true;
      player.play();
      setIsPlaying(true);
    } catch (err) {
      console.log("Audio player fallback:", err);
      // Nếu thiết bị không chạy được native audio thì vẫn bật cờ isPlaying để giao diện đếm giờ
      setIsPlaying(true);
    }
  };

  const restartFromBeginning = async (shouldPlay: boolean) => {
    const player = playerRef.current;
    setPositionMillis(0);
    hasFinishedRef.current = false;
    awaitingPlaybackRef.current = shouldPlay;
    if (!player) {
      setIsPlaying(shouldPlay);
      return;
    }
    try {
      await player.seekTo(0);
    } catch {}
    if (shouldPlay) {
      try {
        await player.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(true);
      }
    } else {
      try {
        await player.pause();
      } catch {}
      setIsPlaying(false);
    }
  };

  const handleTrackFinished = async () => {
    // 1. Chế độ lặp 1 lần (icon số 1): Lặp đúng 1 lần rồi dừng lại và tắt vòng lặp
    if (repeatModeRef.current === "one") {
      if (repeatCountRef.current < 1) {
        repeatCountRef.current += 1;
        await restartFromBeginning(true);
        return;
      } else {
        repeatCountRef.current = 0;
        repeatModeRef.current = "off";
        setRepeatMode("off");
        if (playerRef.current) {
          try {
            playerRef.current.loop = false;
          } catch {}
        }
        await restartFromBeginning(false);
        return;
      }
    }

    // 2. Chế độ lặp vô hạn ở bài hát đó luôn (icon repeat cyan)
    if (repeatModeRef.current === "all") {
      await restartFromBeginning(true);
      return;
    }

    // 3. Khi không bật vòng lặp (off): phát bài tiếp nếu có, hết bài cuối thì dừng
    const queue = getQueue();
    if (queue.length > 0) {
      const idx = queue.findIndex((s) => s.id === currentTrackRef.current?.id);
      if (idx >= 0 && idx < queue.length - 1) {
        await startTrack(queue[idx + 1]);
        return;
      }
    }
    await restartFromBeginning(false);
  };

  const playSong = async (song: Song, newPlaylist?: Song[]) => {
    if (newPlaylist && newPlaylist.length > 0) {
      playlistRef.current = newPlaylist;
      if (isShuffleRef.current) {
        shuffledQueueRef.current = buildShuffledQueue(song, newPlaylist);
      }
    }
    await startTrack(song);
  };

  const togglePlayPause = async () => {
    const player = playerRef.current;
    if (!player) {
      if (currentTrackRef.current) await playSong(currentTrackRef.current);
      return;
    }
    if (player.playing || awaitingPlaybackRef.current) {
      awaitingPlaybackRef.current = false;
      player.pause();
      setIsPlaying(false);
    } else {
      awaitingPlaybackRef.current = true;
      player.play();
      setIsPlaying(true);
    }
  };

  // Người dùng bấm next/previous luôn chuyển bài, kể cả khi đang lặp một bài
  const playNext = async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    const idx = queue.findIndex((s) => s.id === currentTrackRef.current?.id);
    await startTrack(queue[(idx + 1) % queue.length]);
  };

  const playPrevious = async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    const idx = queue.findIndex((s) => s.id === currentTrackRef.current?.id);
    await startTrack(queue[idx <= 0 ? queue.length - 1 : idx - 1]);
  };

  // expo-audio tính bằng GIÂY, UI của mình dùng millis
  const seekTo = async (posMillis: number) => {
    const player = playerRef.current;
    const endPosition = durationMillis - SEEK_END_MARGIN_MS;
    if (durationMillis > 0 && posMillis >= endPosition) {
      if (repeatModeRef.current !== "off") {
        await handleTrackFinished();
        return;
      }
      awaitingPlaybackRef.current = false;
      try {
        await player?.pause();
      } catch {}
      setIsPlaying(false);
      setPositionMillis(endPosition);
      try {
        await player?.seekTo(endPosition / 1000);
      } catch {}
      return;
    }
    setPositionMillis(posMillis);
    hasFinishedRef.current = false;
    try {
      await player?.seekTo(posMillis / 1000);
    } catch {}
  };

  const toggleShuffle = () => {
    const next = !isShuffleRef.current;
    isShuffleRef.current = next;
    setIsShuffle(next);
    if (next) {
      shuffledQueueRef.current = buildShuffledQueue(currentTrackRef.current, playlistRef.current);
    }
  };

  const cycleRepeatMode = () => {
    const next = NEXT_REPEAT_MODE[repeatModeRef.current];
    repeatModeRef.current = next;
    setRepeatMode(next);
    repeatCountRef.current = 0;
    if (playerRef.current) {
      try {
        // Chỉ loop vô hạn native khi ở chế độ 'all' (vô hạn)
        playerRef.current.loop = next === "all";
      } catch {}
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        positionMillis,
        durationMillis,
        isShuffle,
        repeatMode,
        playSong,
        togglePlayPause,
        playPrevious,
        playNext,
        seekTo,
        toggleShuffle,
        cycleRepeatMode,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer phải nằm trong AudioPlayerProvider");
  }
  return context;
};
