import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import { PLAYLIST_DETAILS_TRACKS, Song } from "../data/musicData";

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

const NEXT_REPEAT_MODE: Record<RepeatMode, RepeatMode> = { off: "all", all: "one", one: "off" };

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

    releasePlayer();

    // Link nhạc mặc định nếu bài hát chưa có link riêng
    const audioUri = song.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    try {
      const player = createAudioPlayer({ uri: audioUri });
      playerRef.current = player;

      subRef.current = player.addListener("playbackStatusUpdate", (status) => {
        setPositionMillis(Math.floor(status.currentTime * 1000));
        if (status.duration > 0) {
          setDurationMillis(Math.floor(status.duration * 1000));
        }
        // Chỉ coi là đã phát khi thời gian chạy: bản web báo playing ngay từ lúc gọi play()
        if (status.playing && status.currentTime > 0) {
          awaitingPlaybackRef.current = false;
        }
        if (!awaitingPlaybackRef.current) {
          setIsPlaying(status.playing);
        }
        if (status.didJustFinish) {
          handleTrackFinished();
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
    if (!player) return;
    await player.seekTo(0);
    setPositionMillis(0);
    awaitingPlaybackRef.current = shouldPlay;
    if (shouldPlay) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  };

  const handleTrackFinished = async () => {
    if (repeatModeRef.current === "one") {
      await restartFromBeginning(true);
      return;
    }
    const queue = getQueue();
    if (queue.length === 0) return;
    const idx = queue.findIndex((s) => s.id === currentTrackRef.current?.id);
    // Không lặp danh sách thì dừng lại sau bài cuối
    if (idx === queue.length - 1 && repeatModeRef.current === "off") {
      await restartFromBeginning(false);
      return;
    }
    await startTrack(queue[(idx + 1) % queue.length]);
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
      awaitingPlaybackRef.current = false;
      player?.pause();
      setIsPlaying(false);
      setPositionMillis(endPosition);
      await player?.seekTo(endPosition / 1000);
      return;
    }
    setPositionMillis(posMillis);
    await player?.seekTo(posMillis / 1000);
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
