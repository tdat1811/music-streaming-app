// src/services/api.ts
// Service kết nối RESTful API từ React Native tới Backend Express + MongoDB
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Địa chỉ server được chọn tự động:
// - Web: http://localhost:5000
// - Expo Go (điện thoại thật / máy ảo): dùng IP của máy tính đang chạy "npx expo start"
//   (lấy từ hostUri của Expo, VD 192.168.1.15:8081 -> http://192.168.1.15:5000)
// - Muốn chỉ định thủ công (VD chạy --tunnel hoặc server ở máy khác): đặt biến
//   EXPO_PUBLIC_API_URL=http://<ip>:5000 trong file .env ở thư mục gốc rồi chạy lại expo.
const SERVER_PORT = 5000;

const getServerOrigin = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '').replace(/\/api$/, '');
  if (Platform.OS === 'web') return `http://localhost:${SERVER_PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  // Không có hostUri (bản build riêng): máy ảo Android truy cập máy tính qua 10.0.2.2
  return `http://${host || '10.0.2.2'}:${SERVER_PORT}`;
};

export const SERVER_ORIGIN = getServerOrigin();
export const API_BASE_URL = `${SERVER_ORIGIN}/api`;

// Dữ liệu bài hát lưu đường dẫn dạng http://localhost:5000/audio/...
// Trên điện thoại "localhost" là chính điện thoại, nên đổi sang địa chỉ server thật.
export const resolveServerUrl = (url: string) =>
  url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, SERVER_ORIGIN);

// Máy chủ có phản hồi nhưng từ chối yêu cầu (sai mật khẩu, email trùng, không có quyền...)
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Không gửi được yêu cầu hoặc không đọc được phản hồi (máy chủ tắt, mất mạng)
export class NetworkError extends Error {
  constructor(message = 'Không kết nối được máy chủ') {
    super(message);
    this.name = 'NetworkError';
  }
}

export const isApiError = (err: unknown): err is ApiError => err instanceof ApiError;

// Token đăng nhập do máy chủ cấp (JWT). Chỉ giữ trong bộ nhớ khi app đang chạy.
let authToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Được gọi khi máy chủ báo token hết hạn hoặc không hợp lệ (để đăng xuất và về Log In)
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

const TOKEN_ERROR_CODES = ['TOKEN_MISSING', 'TOKEN_INVALID', 'TOKEN_EXPIRED'];

// Hàm gọi API tổng quát dùng fetch có sẵn trong React Native (không cần cài thêm thư viện)
async function request<T>(endpoint: string, options: RequestInit = {}, withAuth = false): Promise<T> {
  // Chưa có phiên với máy chủ (đăng nhập bằng dữ liệu trên máy khi server tắt):
  // coi như không kết nối được để app giữ thay đổi trên máy như chế độ offline.
  if (withAuth && !authToken) throw new NetworkError('Chưa đăng nhập với máy chủ');

  const url = `${API_BASE_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(withAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new NetworkError();
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    // Phản hồi không phải JSON
  }
  if (!response.ok) {
    if (withAuth && response.status === 401 && TOKEN_ERROR_CODES.includes(json?.code)) {
      authToken = null;
      onSessionExpired?.();
    }
    throw new ApiError(json?.message || `Máy chủ trả lỗi ${response.status}`, response.status);
  }
  if (json === null) throw new NetworkError('Phản hồi từ máy chủ không hợp lệ');
  return json;
}

// Gọi API cần đăng nhập: tự gắn header "Authorization: Bearer <token>"
const authRequest = <T>(endpoint: string, options: RequestInit = {}) => request<T>(endpoint, options, true);

export const api = {
  // 1. Kiểm tra trạng thái Server
  checkHealth: () => request<{ status: string; message: string }>('/health'),

  // 2. Authentication & Tài khoản
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    getProfile: (userId: string) =>
      request(`/auth/profile/${userId}`),

    subscribe: (userId: string, planId: string) =>
      authRequest('/auth/subscribe', { method: 'POST', body: JSON.stringify({ userId, planId }) }),

    toggleLikeSong: (userId: string, songId: string) =>
      authRequest('/auth/like-song', { method: 'POST', body: JSON.stringify({ userId, songId }) }),

    toggleFollowArtist: (userId: string, artistId: string) =>
      authRequest('/auth/follow-artist', { method: 'POST', body: JSON.stringify({ userId, artistId }) }),

    toggleLikeAlbum: (userId: string, albumId: string) =>
      authRequest('/auth/like-album', { method: 'POST', body: JSON.stringify({ userId, albumId }) }),

    downloadSong: (userId: string, songId: string) =>
      authRequest('/auth/download-song', { method: 'POST', body: JSON.stringify({ userId, songId }) }),

    updateProfile: (data: { userId: string; name: string; email: string; phone: string }) =>
      authRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

    changePassword: (data: { userId: string; currentPassword: string; newPassword: string }) =>
      authRequest('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // 3. Bài hát (Songs)
  songs: {
    getAll: () => request('/songs'),
    getSuggestions: () => request('/songs/suggestions'),
    getById: (songId: string) => request(`/songs/${songId}`),
    getByIds: (ids: string[]) =>
      request('/songs/by-ids', { method: 'POST', body: JSON.stringify({ ids }) }),
    search: (query: string) =>
      request(`/songs/search?q=${encodeURIComponent(query)}`),
  },

  // 4. Albums
  albums: {
    getAll: () => request('/albums'),
    getTrending: () => request('/albums/trending'),
    getById: (albumId: string) => request(`/albums/${albumId}`),
    getByArtist: (artistName: string) => request(`/albums/artist/${encodeURIComponent(artistName)}`),
  },

  // 5. Nghệ sĩ (Artists)
  artists: {
    getAll: () => request('/artists'),
    getPopular: () => request('/artists/popular'),
    getById: (artistId: string) => request(`/artists/${artistId}`),
  },

  // 6. Playlists
  playlists: {
    getUserPlaylists: (userId: string) => authRequest(`/playlists/user/${userId}`),
    getById: (playlistId: string) => request(`/playlists/${playlistId}`),
    create: (data: { userId: string; title: string; description?: string }) =>
      authRequest('/playlists/create', { method: 'POST', body: JSON.stringify(data) }),
    addSong: (playlistId: string, songId: string) =>
      authRequest('/playlists/add-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    removeSong: (playlistId: string, songId: string) =>
      authRequest('/playlists/remove-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    delete: (playlistId: string) =>
      authRequest(`/playlists/${playlistId}`, { method: 'DELETE' }),
  },

  // 7. Bảng xếp hạng (Charts)
  charts: {
    getAll: () => request('/charts'),
    getById: (chartId: string) => request(`/charts/${chartId}`),
  },

  // 8. Bảng tin (Feed) & Bình luận
  feed: {
    getPosts: () => request('/feed/posts'),
    togglePostLike: (postId: string, userId: string) =>
      authRequest('/feed/posts/like', { method: 'POST', body: JSON.stringify({ postId, userId }) }),
    sharePost: (postId: string) =>
      authRequest('/feed/posts/share', { method: 'POST', body: JSON.stringify({ postId }) }),
    getComments: (postId: string) =>
      request(`/feed/comments/${postId}`),
    addComment: (data: {
      postId: string;
      userName: string;
      userAvatar?: string;
      text: string;
      // commentId: bình luận đang được trả lời (gốc hoặc một câu trả lời) để gửi thông báo đúng người
      replyTarget?: { rootCommentId: string; userName: string; commentId?: string };
    }) => authRequest('/feed/comments', { method: 'POST', body: JSON.stringify(data) }),
    toggleCommentLike: (commentId: string, userId: string) =>
      authRequest('/feed/comments/like', { method: 'POST', body: JSON.stringify({ commentId, userId }) }),
  },

  // 9. Thông báo (có người trả lời bình luận của mình)
  notifications: {
    getMine: () => authRequest('/notifications'),
    markRead: (notificationId: string) =>
      authRequest(`/notifications/${notificationId}/read`, { method: 'POST' }),
    markAllRead: () => authRequest('/notifications/read-all', { method: 'POST' }),
  },
};
