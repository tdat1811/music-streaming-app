import React, { createContext, useContext, useRef, useState } from 'react';
import {
  DEFAULT_PLAYLIST_COVER,
  Playlist,
  SAMPLE_USERS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  User,
  USER_PLAYLISTS,
} from '../data/musicData';
import { api, isApiError, setAuthToken } from '../services/api';

export const MIN_PASSWORD_LENGTH = 6;
export const FREE_PLAN_ID = 'free';
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileUpdates {
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  currentUser: User | null;
  activePlan: SubscriptionPlan | null;
  // Đang dùng gói VIP (không tính gói Free)
  isVip: boolean;
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
  // Trả về null nếu tạo được, ngược lại là thông báo lỗi để hiển thị
  createPlaylist: (title: string) => Promise<string | null>;
  addSongToPlaylist: (playlistId: string, songId: string) => boolean;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  toggleLikeAlbum: (albumId: string) => void;
  isAlbumLiked: (albumId: string) => boolean;
  downloadSong: (songId: string) => void;
  downloadAllSongs: (songIds: string[]) => void;
  isSongDownloaded: (songId: string) => boolean;
  // Tải lại thông tin tài khoản và playlist từ máy chủ (dùng khi làm mới ứng dụng)
  reloadAccount: () => Promise<void>;
  // Tìm id tài khoản theo tên (chỉ khi đúng một tài khoản mang tên đó), dùng cho dữ liệu mẫu
  findUserIdByName: (name: string) => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Bỏ id nếu đã có, ngược lại thêm vào đầu danh sách (mới nhất lên trước)
const toggleId = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];

// Dữ liệu tài khoản từ máy chủ (không giữ mật khẩu ở client)
const mapDbUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  phone: dbUser.phone || '',
  password: '***',
  planId: dbUser.planId || null,
  likedSongIds: dbUser.likedSongIds || [],
  followedArtistIds: dbUser.followedArtistIds || [],
  likedAlbumIds: dbUser.likedAlbumIds || [],
  downloadedSongIds: dbUser.downloadedSongIds || [],
});

const mapDbPlaylist = (p: any): Playlist => ({
  id: p.id,
  ownerId: p.ownerId,
  title: p.title,
  description: p.description || 'Your new playlist',
  coverImage: p.coverImage || DEFAULT_PLAYLIST_COVER,
  songIds: p.songIds ?? [],
});

const DUPLICATE_PLAYLIST_MESSAGE = 'You already have a playlist with this name.';

// Gọi API ngay sau khi đã cập nhật giao diện. Nếu máy chủ từ chối thì hoàn tác;
// nếu chỉ mất kết nối thì giữ thay đổi trên máy (chế độ dự phòng).
const syncOrRevert = (request: Promise<unknown>, revert: () => void) => {
  request.catch((err) => {
    if (isApiError(err)) {
      console.log('Máy chủ từ chối, hoàn tác:', err.message);
      revert();
    }
  });
};

// Dữ liệu bắt đầu từ file mẫu và được đồng bộ với máy chủ khi đăng nhập.
// Khi máy chủ không chạy, các thay đổi chỉ lưu trong bộ nhớ của ứng dụng.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(SAMPLE_USERS);
  const [playlists, setPlaylists] = useState<Playlist[]>(USER_PLAYLISTS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Bản mới nhất của currentUserId cho các yêu cầu bất đồng bộ (bỏ kết quả nếu đã đổi tài khoản)
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = currentUserId;
  // Đăng nhập qua máy chủ: playlist được đọc và ghi trên máy chủ
  const onlineSession = useRef(false);

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === currentUser?.planId) ?? null;
  // Gói "free" vẫn là thành viên thường; các gói còn lại (hiện là "premium") là VIP
  const isVip = activePlan !== null && activePlan.id !== FREE_PLAN_ID;
  const userPlaylists = playlists.filter((playlist) => playlist.ownerId === currentUserId);
  const likedAlbumIds = currentUser?.likedAlbumIds ?? [];
  const downloadedSongIds = currentUser?.downloadedSongIds ?? [];

  // Cập nhật một phần thông tin của tài khoản đang đăng nhập
  const updateCurrentUser = (change: (user: User) => Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, ...change(u) } : u)));
  };

  const saveUser = (user: User) => {
    setUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.map((u) => (u.id === user.id ? user : u))
        : [...prev, user]
    );
    setCurrentUserId(user.id);
    onlineSession.current = true;
    loadPlaylists(user.id);
  };

  // Thay playlist của tài khoản bằng dữ liệu trên máy chủ
  const loadPlaylists = (userId: string) =>
    api.playlists
      .getUserPlaylists(userId)
      .then((res: any) => {
        const list: Playlist[] = (res?.data ?? []).map(mapDbPlaylist);
        setPlaylists((prev) => [...list, ...prev.filter((p) => p.ownerId !== userId)]);
      })
      .catch((err) => console.log('Không tải được playlist:', err));

  const updatePlaylist = (playlistId: string, change: (playlist: Playlist) => Playlist) =>
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? change(pl) : pl)));

  // Đăng nhập qua Backend API (mật khẩu được xác thực bằng bcrypt trên server)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.auth.login({ email, password });
      if (response?.success && response?.data) {
        // Token dùng cho các yêu cầu cần đăng nhập (thả tim, playlist, bình luận...)
        setAuthToken(response.token ?? null);
        saveUser(mapDbUser(response.data));
        return true;
      }
      return false;
    } catch (err) {
      // Máy chủ đã trả lời là sai thông tin: không được đăng nhập bằng dữ liệu trên máy
      if (isApiError(err)) return false;
      console.log('Login offline:', err);
      const user = users.find(
        (u) => u.email === normalizeEmail(email) && u.password === password
      );
      if (!user) return false;
      setAuthToken(null);
      onlineSession.current = false;
      setCurrentUserId(user.id);
      return true;
    }
  };

  // Đăng ký qua Backend API (mật khẩu được hash bằng bcrypt trên server)
  const signUp = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.auth.register({ name, email, password });
      if (response?.success && response?.data) {
        setAuthToken(response.token ?? null);
        saveUser(mapDbUser(response.data));
        return true;
      }
      return false;
    } catch (err) {
      // Ví dụ email đã được đăng ký trên máy chủ
      if (isApiError(err)) return false;
      console.log('SignUp offline:', err);
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
        likedAlbumIds: [],
        downloadedSongIds: [],
      };
      setUsers((prev) => [...prev, newUser]);
      setAuthToken(null);
      onlineSession.current = false;
      setCurrentUserId(newUser.id);
      return true;
    }
  };

  const logout = () => {
    setAuthToken(null);
    onlineSession.current = false;
    setCurrentUserId(null);
  };

  const subscribe = (plan: SubscriptionPlan) => {
    if (!currentUserId) return;
    const previousPlanId = currentUser?.planId ?? null;
    updateCurrentUser(() => ({ planId: plan.id }));
    syncOrRevert(api.auth.subscribe(currentUserId, plan.id), () =>
      updateCurrentUser(() => ({ planId: previousPlanId }))
    );
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
        updateCurrentUser(() => ({ name: dbUser.name, email: dbUser.email, phone: dbUser.phone || '' }));
        return true;
      }
      return false;
    } catch (err) {
      // Ví dụ email đã thuộc về tài khoản khác
      if (isApiError(err)) return false;
      console.log('UpdateProfile offline:', err);
      const normalizedEmail = normalizeEmail(email);
      if (users.some((u) => u.id !== currentUserId && u.email === normalizedEmail)) return false;
      updateCurrentUser(() => ({ name: name.trim(), email: normalizedEmail, phone: phone.trim() }));
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
      return !!response?.success;
    } catch (err) {
      // Mật khẩu hiện tại sai
      if (isApiError(err)) return false;
      console.log('ChangePassword offline:', err);
      if (currentUser?.password !== currentPassword) return false;
      updateCurrentUser(() => ({ password: newPassword }));
      return true;
    }
  };

  const toggleLikeSong = (songId: string) => {
    if (!currentUserId) return;
    const flip = () => updateCurrentUser((u) => ({ likedSongIds: toggleId(u.likedSongIds, songId) }));
    flip();
    syncOrRevert(api.auth.toggleLikeSong(currentUserId, songId), flip);
  };

  const toggleFollowArtist = (artistId: string) => {
    if (!currentUserId) return;
    const flip = () =>
      updateCurrentUser((u) => ({ followedArtistIds: toggleId(u.followedArtistIds, artistId) }));
    flip();
    syncOrRevert(api.auth.toggleFollowArtist(currentUserId, artistId), flip);
  };

  const createLocalPlaylist = (ownerId: string, title: string) => {
    const newPlaylist: Playlist = {
      id: `local-p${Date.now()}`,
      ownerId,
      title,
      description: 'Your new playlist',
      coverImage: DEFAULT_PLAYLIST_COVER,
      songIds: [],
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
  };

  const createPlaylist = async (title: string): Promise<string | null> => {
    if (!currentUserId) return 'Please log in to create a playlist.';
    const trimmedTitle = title.trim();
    const isDuplicate = userPlaylists.some(
      (playlist) => playlist.title.toLowerCase() === trimmedTitle.toLowerCase()
    );
    if (isDuplicate) return DUPLICATE_PLAYLIST_MESSAGE;
    if (!onlineSession.current) {
      createLocalPlaylist(currentUserId, trimmedTitle);
      return null;
    }
    try {
      const res: any = await api.playlists.create({ userId: currentUserId, title: trimmedTitle });
      if (!res?.data) return 'Could not create the playlist.';
      setPlaylists((prev) => [mapDbPlaylist(res.data), ...prev]);
      return null;
    } catch (err) {
      // Máy chủ từ chối (trùng tên, chưa phải VIP...): hiện đúng thông báo của máy chủ
      if (isApiError(err)) return err.message;
      createLocalPlaylist(currentUserId, trimmedTitle);
      return null;
    }
  };

  // Trả về false nếu bài đã có trong playlist
  const addSongToPlaylist = (playlistId: string, songId: string): boolean => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist || playlist.songIds.includes(songId)) return false;
    updatePlaylist(playlistId, (pl) => ({ ...pl, songIds: [...pl.songIds, songId] }));
    if (onlineSession.current) {
      syncOrRevert(api.playlists.addSong(playlistId, songId), () =>
        updatePlaylist(playlistId, (pl) => ({ ...pl, songIds: pl.songIds.filter((id) => id !== songId) }))
      );
    }
    return true;
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist || !playlist.songIds.includes(songId)) return;
    const previous = playlist.songIds;
    updatePlaylist(playlistId, (pl) => ({ ...pl, songIds: pl.songIds.filter((id) => id !== songId) }));
    if (onlineSession.current) {
      syncOrRevert(api.playlists.removeSong(playlistId, songId), () =>
        updatePlaylist(playlistId, (pl) => ({ ...pl, songIds: previous }))
      );
    }
  };

  const deletePlaylist = (playlistId: string) => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) return;
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    if (onlineSession.current) {
      syncOrRevert(api.playlists.delete(playlistId), () => setPlaylists((prev) => [playlist, ...prev]));
    }
  };

  const toggleLikeAlbum = (albumId: string) => {
    if (!currentUserId) return;
    const flip = () =>
      updateCurrentUser((u) => ({ likedAlbumIds: toggleId(u.likedAlbumIds ?? [], albumId) }));
    flip();
    syncOrRevert(api.auth.toggleLikeAlbum(currentUserId, albumId), flip);
  };

  const isAlbumLiked = (albumId: string) => likedAlbumIds.includes(albumId);

  const downloadSong = (songId: string) => {
    if (!currentUserId || downloadedSongIds.includes(songId)) return;
    updateCurrentUser((u) => ({ downloadedSongIds: [...(u.downloadedSongIds ?? []), songId] }));
    syncOrRevert(api.auth.downloadSong(currentUserId, songId), () =>
      updateCurrentUser((u) => ({
        downloadedSongIds: (u.downloadedSongIds ?? []).filter((id) => id !== songId),
      }))
    );
  };

  const downloadAllSongs = (songIds: string[]) => {
    songIds.forEach(downloadSong);
  };

  const isSongDownloaded = (songId: string) => downloadedSongIds.includes(songId);

  const reloadAccount = async () => {
    const userId = currentUserId;
    if (!userId || !onlineSession.current) return;
    try {
      const res: any = await api.auth.getProfile(userId);
      if (res?.data && userId === currentUserIdRef.current) {
        const fresh = mapDbUser(res.data);
        setUsers((prev) => prev.map((u) => (u.id === userId ? fresh : u)));
      }
    } catch (err) {
      console.log('Không tải lại được tài khoản:', err);
    }
    await loadPlaylists(userId);
  };

  const findUserIdByName = (name: string) => {
    const matched = users.filter((u) => u.name === name);
    return matched.length === 1 ? matched[0].id : null;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activePlan,
        isVip,
        userPlaylists,
        likedAlbumIds,
        downloadedSongIds,
        createPlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        deletePlaylist,
        toggleLikeAlbum,
        isAlbumLiked,
        downloadSong,
        downloadAllSongs,
        isSongDownloaded,
        reloadAccount,
        findUserIdByName,
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
