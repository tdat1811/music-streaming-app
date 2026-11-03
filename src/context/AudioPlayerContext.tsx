import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { PLAYLIST_DETAILS_TRACKS, Song } from "../data/musicData";

// Định nghĩa khuôn mẫu Context
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
  toggleLikeCurrentTrack: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Song | null>(PLAYLIST_DETAILS_TRACKS[0]);
  const [playlist, setPlaylist] = useState<Song[]>(PLAYLIST_DETAILS_TRACKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Thời gian bài hát (mặc định 3 phút 36 giây = 216000 ms)
  const [positionMillis, setPositionMillis] = useState<number>(6000);
  const [durationMillis, setDurationMillis] = useState<number>(216000);

  // Bộ hẹn giờ giả lập nhịp phát nhạc an toàn cho Expo Go
  const timerRef = useRef<any>(null);

  // Hiệu ứng tự động đếm giây khi isPlaying = true
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPositionMillis((prev) => {
          if (prev >= durationMillis) {
            playNext(); // Hết bài tự chuyển bài tiếp theo
            return 0;
          }
          return prev + 1000; // Mỗi giây tăng 1000ms
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, durationMillis, currentTrack]);

  // Hàm phát bài hát
  const playSong = async (song: Song, newPlaylist?: Song[]) => {
    setCurrentTrack(song);
    setPositionMillis(0); // Reset về 0 giây
    setIsPlaying(true);

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }
  };

  // Hàm Play / Pause
  const togglePlayPause = async () => {
    setIsPlaying((prev) => !prev);
  };

  // Hàm chuyển bài tiếp theo
  const playNext = async () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((s) => s.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    await playSong(playlist[nextIndex], playlist);
  };

  // Hàm lùi bài trước
  const playPrevious = async () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((s) => s.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    await playSong(playlist[prevIndex], playlist);
  };

  // Hàm tua bài hát
  const seekTo = async (posMillis: number) => {
    setPositionMillis(posMillis);
  };

  // Hàm thả tim bài hát
  const toggleLikeCurrentTrack = () => {
    if (!currentTrack) return;
    const updated = { ...currentTrack, isLiked: !currentTrack.isLiked };
    setCurrentTrack(updated);
    setPlaylist((prev) => prev.map((s) => (s.id === currentTrack.id ? updated : s)));
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
        toggleLikeCurrentTrack,
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