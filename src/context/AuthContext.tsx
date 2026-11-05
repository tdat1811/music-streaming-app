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
  login: (email: string, password: string) => boolean;
  signUp: (name: string, email: string, password: string) => boolean;
  logout: () => void;
  subscribe: (plan: SubscriptionPlan) => void;
  updateProfile: (updates: ProfileUpdates) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
  toggleLikeSong: (songId: string) => void;
  toggleFollowArtist: (artistId: string) => void;
  createPlaylist: (title: string) => boolean;
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

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === currentUser?.planId) ?? null;
  const userPlaylists = playlists.filter((playlist) => playlist.ownerId === currentUserId);

  const login = (email: string, password: string) => {
    const user = users.find(
      (u) => u.email === normalizeEmail(email) && u.password === password
    );
    if (!user) return false;
    setCurrentUserId(user.id);
    return true;
  };

  // Trả về false nếu email đã được dùng
  const signUp = (name: string, email: string, password: string) => {
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
  };

  const logout = () => setCurrentUserId(null);

  const subscribe = (plan: SubscriptionPlan) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, planId: plan.id } : u))
    );
  };

  // Trả về false nếu email đã thuộc về tài khoản khác
  const updateProfile = ({ name, email, phone }: ProfileUpdates) => {
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
  };

  // Trả về false nếu mật khẩu hiện tại không đúng
  const changePassword = (currentPassword: string, newPassword: string) => {
    if (currentUser?.password !== currentPassword) return false;
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUserId ? { ...u, password: newPassword } : u))
    );
    return true;
  };

  const toggleLikeSong = (songId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId ? { ...u, likedSongIds: toggleId(u.likedSongIds, songId) } : u
      )
    );
  };

  const toggleFollowArtist = (artistId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUserId
          ? { ...u, followedArtistIds: toggleId(u.followedArtistIds, artistId) }
          : u
      )
    );
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activePlan,
        userPlaylists,
        createPlaylist,
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
