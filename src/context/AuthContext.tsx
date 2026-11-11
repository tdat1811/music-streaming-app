import React, { createContext, useContext, useState } from 'react';
import {
  DEFAULT_PLAYLIST_COVER,
  Playlist,
  SAMPLE_USERS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  User,
  USER_PLAYLISTS,
} from '../data/musicData';
import { api } from '../services/api';

export const MIN_PASSWORD_LENGTH = 6;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileUpdates {
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  currentUser: User | null;
  activePlan: SubscriptionPlan | null;
  userPlaylists: Playlist[];
  likedAlbumIds: string[];
  downloadedSongIds: string[];
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  subscribe: (plan: SubscriptionPlan) => void;
  updateProfile: (updates: ProfileUpdates) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  toggleLikeSong: (songId: string) => void;
  toggleFollowArtist: (artistId: string) => void;
  createPlaylist: (title: string) => boolean;
  addSongToPlaylist: (playlistId: string, songId: string) => boolean;
  toggleLikeAlbum: (albumId: string) => void;
  isAlbumLiked: (albumId: string) => boolean;
  downloadSong: (songId: string) => void;
  downloadAllSongs: (songIds: string[]) => void;
  isSongDownloaded: (songId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Bỏ id nếu đã có, ngược lại thêm vào đầu danh sách (mới nhất lên trước)
const toggleId = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];

// Dữ liệu bắt đầu từ file mẫu. Mọi thay đổi (tài khoản, gói, playlist...) chỉ lưu trong bộ nhớ:
// app đang chạy không ghi được vào file nguồn, nên tải lại app sẽ về dữ liệu mẫu.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(SAMPLE_USERS);
  const [playlists, setPlaylists] = useState<Playlist[]>(USER_PLAYLISTS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likedAlbumIds, setLikedAlbumIds] = useState<string[]>(['ta1']);
  const [downloadedSongIds, setDownloadedSongIds] = useState<string[]>(['pdt1']);

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === currentUser?.planId) ?? null;
  const userPlaylists = playlists.filter((playlist) => playlist.ownerId === currentUserId);

  // Đăng nhập qua Backend API (mật khẩu được xác thực bằng bcrypt trên server)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.auth.login({ email, password });
      if (response?.success && response?.data) {
        const dbUser = response.data;
        // Cập nhật user vào state local (không lưu password)
        const mappedUser: User = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '',
          password: '***', // Không lưu password ở client
          planId: dbUser.planId || null,
          likedSongIds: dbUser.likedSongIds || [],
          followedArtistIds: dbUser.followedArtistIds || [],
        };
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === mappedUser.id);
          return exists
            ? prev.map((u) => (u.id === mappedUser.id ? mappedUser : u))
            : [...prev, mappedUser];
        });
        setCurrentUserId(mappedUser.id);
        // Đồng bộ likedAlbumIds và downloadedSongIds từ server
        if (dbUser.likedAlbumIds) setLikedAlbumIds(dbUser.likedAlbumIds);
        if (dbUser.downloadedSongIds) setDownloadedSongIds(dbUser.downloadedSongIds);
        return true;
      }
      return false;
    } catch (err) {
      console.log('Login error:', err);
      // Fallback: thử đăng nhập local (cho trường hợp server offline)
      const user = users.find(
        (u) => u.email === normalizeEmail(email) && u.password === password
      );
      if (!user) return false;
      setCurrentUserId(user.id);
      return true;
    }
  };

  // Đăng ký qua Backend API (mật khẩu được hash bằng bcrypt trên server)
  const signUp = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.auth.register({ name, email, password });
      if (response?.success && response?.data) {
        const dbUser = response.data;
        const mappedUser: User = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '',
          password: '***', // Không lưu password ở client
          planId: null,
          likedSongIds: [],
          followedArtistIds: [],
        };
        setUsers((prev) => [...prev, mappedUser]);
        setCurrentUserId(mappedUser.id);
        return true;
      }
      return false;
    } catch (err) {
      console.log('SignUp error:', err);
      // Fallback local
      const normalizedEmail = normalizeEmail(email);
      if (users.some((u) => u.email === normalizedEmail)) return false;
      const newUser: User = {
        id: `u${users.length + 1}`,
        name: name.trim(),
        email: normalizedEmail,
        phone: '',
        password,
        planId: null,
        likedSongIds: [],
        followedArtistIds: [],
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUserId(newUser.id);
      return true;
    }
  };

  const logout = () => setCurrentUserId(null);

  const subscribe = (plan: SubscriptionPlan) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, planId: plan.id } : u))
    );
    // Đồng bộ lên server
    if (currentUserId) {
      api.auth.subscribe(currentUserId, plan.id).catch(() => {});
    }
  };

  // Cập nhật thông tin cá nhân qua Backend API
  const updateProfile = async ({ name, email, phone }: ProfileUpdates): Promise<boolean> => {
    if (!currentUserId) return false;
    try {
      const response: any = await api.auth.updateProfile({
        userId: currentUserId,
        name,
        email,
        phone,
      });
      if (response?.success && response?.data) {
        const dbUser = response.data;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === currentUserId
              ? { ...u, name: dbUser.name, email: dbUser.email, phone: dbUser.phone || '' }
              : u
          )
        );
        return true;
      }
      return false;
    } catch (err) {
      console.log('UpdateProfile error:', err);
      // Fallback: cập nhật local
      const normalizedEmail = normalizeEmail(email);
      if (users.some((u) => u.id !== currentUserId && u.email === normalizedEmail)) return false;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUserId
            ? { ...u, name: name.trim(), email: normalizedEmail, phone: phone.trim() }
            : u
        )
      );
      return true;
    }
  };

  // Đổi mật khẩu qua Backend API (xác thực bcrypt trên server)
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!currentUserId) return false;
    try {
      const response: any = await api.auth.changePassword({
        userId: currentUserId,
        currentPassword,
        newPassword,
      });
      if (response?.success) {
        return true;
      }
      return false;
    } catch (err) {
      console.log('ChangePassword error:', err);
      // Fallback local
      if (currentUser?.password !== currentPassword) return false;
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUserId ? { ...u, password: newPassword } : u))
      );
      return true;
    }
  };

  const toggleLikeSong = (songId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId ? { ...u, likedSongIds: toggleId(u.likedSongIds, songId) } : u
      )
    );
    // Đồng bộ lên server
    if (currentUserId) {
      api.auth.toggleLikeSong(currentUserId, songId).catch(() => {});
    }
  };

  const toggleFollowArtist = (artistId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId
          ? { ...u, followedArtistIds: toggleId(u.followedArtistIds, artistId) }
          : u
      )
    );
    // Đồng bộ lên server
    if (currentUserId) {
      api.auth.toggleFollowArtist(currentUserId, artistId).catch(() => {});
    }
  };

  // Trả về false nếu tài khoản đã có playlist cùng tên
  const createPlaylist = (title: string) => {
    if (!currentUserId) return false;
    const trimmedTitle = title.trim();
    const isDuplicate = userPlaylists.some(
      (playlist) => playlist.title.toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (isDuplicate) return false;
    const newPlaylist: Playlist = {
      id: `p${playlists.length + 1}`,
      ownerId: currentUserId,
      title: trimmedTitle,
      description: 'Your new playlist',
      coverImage: DEFAULT_PLAYLIST_COVER,
      songIds: [],
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    return true;
  };

  const addSongToPlaylist = (playlistId: string, songId: string): boolean => {
    let added = false;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          if (!pl.songIds.includes(songId)) {
            added = true;
            return { ...pl, songIds: [...pl.songIds, songId] };
          }
        }
        return pl;
      })
    );
    return added;
  };

  const toggleLikeAlbum = (albumId: string) => {
    setLikedAlbumIds((prev) =>
      prev.includes(albumId) ? prev.filter((id) => id !== albumId) : [...prev, albumId]
    );
    // Đồng bộ lên server
    if (currentUserId) {
      api.auth.toggleLikeAlbum(currentUserId, albumId).catch(() => {});
    }
  };

  const isAlbumLiked = (albumId: string) => likedAlbumIds.includes(albumId);

  const downloadSong = (songId: string) => {
    setDownloadedSongIds((prev) =>
      prev.includes(songId) ? prev : [...prev, songId]
    );
    if (currentUserId) {
      api.auth.downloadSong(currentUserId, songId).catch(() => {});
    }
  };

  const downloadAllSongs = (songIds: string[]) => {
    setDownloadedSongIds((prev) => {
      const set = new Set([...prev, ...songIds]);
      return Array.from(set);
    });
  };

  const isSongDownloaded = (songId: string) => downloadedSongIds.includes(songId);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activePlan,
        userPlaylists,
        likedAlbumIds,
        downloadedSongIds,
        createPlaylist,
        addSongToPlaylist,
        toggleLikeAlbum,
        isAlbumLiked,
        downloadSong,
        downloadAllSongs,
        isSongDownloaded,
        login,
        signUp,
        logout,
        subscribe,
        updateProfile,
        changePassword,
        toggleLikeSong,
        toggleFollowArtist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải nằm trong AuthProvider');
  }
  return context;
};
