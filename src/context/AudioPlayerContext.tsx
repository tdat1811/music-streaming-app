import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import { PLAYLIST_DETAILS_TRACKS, Song } from "../data/musicData";

// "03:36" | "1:02:10" -> millis
export const parseDuration = (d?: string): number => {
  if (!d) return 0;
  const secs = d.split(":").map(Number).reduce((acc, p) => acc * 60 + p, 0);
  return secs * 1000;
};

interface AudioPlayerContextType {
  currentTrack: Song | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  playSong: (song: Song, playlist?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  playPrevious: () => Promise<void>;
  playNext: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialTrack = PLAYLIST_DETAILS_TRACKS[0] ?? null;

  const [currentTrack, setCurrentTrack] = useState<Song | null>(initialTrack);
  const [playlist, setPlaylist] = useState<Song[]>(PLAYLIST_DETAILS_TRACKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(parseDuration(initialTrack?.duration));

  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);

  // Ref để listener luôn đọc được giá trị mới nhất (tránh stale closure)
  const currentTrackRef = useRef<Song | null>(currentTrack);
  const playlistRef = useRef<Song[]>(playlist);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

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

    const playSong = async (song: Song, newPlaylist?: Song[]) => {
    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
      playlistRef.current = newPlaylist;
    }
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
        setIsPlaying(status.playing);
        if (status.didJustFinish) {
          playNext();
        }
      });

      player.play();
      setIsPlaying(true);
    } catch (err) {
      console.log("Audio player fallback:", err);
      // Nếu thiết bị không chạy được native audio thì vẫn bật cờ isPlaying để giao diện đếm giờ
      setIsPlaying(true);
    }
  };

  const togglePlayPause = async () => {
    const player = playerRef.current;
    if (!player) {
      if (currentTrackRef.current) await playSong(currentTrackRef.current);
      return;
    }
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const playNext = async () => {
    const track = currentTrackRef.current;
    const list = playlistRef.current;
    if (!track || list.length === 0) return;
    const idx = list.findIndex((s) => s.id === track.id);
    const next = list[(idx + 1) % list.length];
    await playSong(next, list);
  };

  const playPrevious = async () => {
    const track = currentTrackRef.current;
    const list = playlistRef.current;
    if (!track || list.length === 0) return;
    const idx = list.findIndex((s) => s.id === track.id);
    const prev = list[idx <= 0 ? list.length - 1 : idx - 1];
    await playSong(prev, list);
  };

  // expo-audio tính bằng GIÂY, UI của mình dùng millis
  const seekTo = async (posMillis: number) => {
    setPositionMillis(posMillis);
    await playerRef.current?.seekTo(posMillis / 1000);
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        positionMillis,
        durationMillis,
        playSong,
        togglePlayPause,
        playPrevious,
        playNext,
        seekTo,
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