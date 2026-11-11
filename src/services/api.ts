// src/services/api.ts
// Service kết nối RESTful API từ React Native tới Backend Express + MongoDB

// LƯU Ý KHI CHẠY THỰC TẾ:
// - Nếu chạy trên Máy ảo Android (Android Emulator): dùng 'http://10.0.2.2:5000/api'
// - Nếu chạy trên Thiết bị thật (Expo Go trên điện thoại): dùng IP máy tính của bạn (VD: 'http://192.168.1.15:5000/api')
// - Nếu chạy trên Web: dùng 'http://localhost:5000/api'
export const API_BASE_URL = 'http://localhost:5000/api';

// Hàm gọi API tổng quát dùng fetch có sẵn trong React Native (không cần cài thêm thư viện)
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Lỗi kết nối máy chủ');
  }
  return json;
}

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
      request('/auth/subscribe', { method: 'POST', body: JSON.stringify({ userId, planId }) }),

    toggleLikeSong: (userId: string, songId: string) =>
      request('/auth/like-song', { method: 'POST', body: JSON.stringify({ userId, songId }) }),

    toggleFollowArtist: (userId: string, artistId: string) =>
      request('/auth/follow-artist', { method: 'POST', body: JSON.stringify({ userId, artistId }) }),

    toggleLikeAlbum: (userId: string, albumId: string) =>
      request('/auth/like-album', { method: 'POST', body: JSON.stringify({ userId, albumId }) }),

    downloadSong: (userId: string, songId: string) =>
      request('/auth/download-song', { method: 'POST', body: JSON.stringify({ userId, songId }) }),

    updateProfile: (data: { userId: string; name: string; email: string; phone: string }) =>
      request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

    changePassword: (data: { userId: string; currentPassword: string; newPassword: string }) =>
      request('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
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
    getUserPlaylists: (userId: string) => request(`/playlists/user/${userId}`),
    getById: (playlistId: string) => request(`/playlists/${playlistId}`),
    create: (data: { userId: string; title: string; description?: string }) =>
      request('/playlists/create', { method: 'POST', body: JSON.stringify(data) }),
    addSong: (playlistId: string, songId: string) =>
      request('/playlists/add-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    removeSong: (playlistId: string, songId: string) =>
      request('/playlists/remove-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    delete: (playlistId: string) =>
      request(`/playlists/${playlistId}`, { method: 'DELETE' }),
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
      request('/feed/posts/like', { method: 'POST', body: JSON.stringify({ postId, userId }) }),
    sharePost: (postId: string) =>
      request('/feed/posts/share', { method: 'POST', body: JSON.stringify({ postId }) }),
    getComments: (postId: string) =>
      request(`/feed/comments/${postId}`),
    addComment: (data: {
      postId: string;
      userName: string;
      userAvatar?: string;
      text: string;
      replyTarget?: { rootCommentId: string; userName: string };
    }) => request('/feed/comments', { method: 'POST', body: JSON.stringify(data) }),
    toggleCommentLike: (commentId: string, userId: string) =>
      request('/feed/comments/like', { method: 'POST', body: JSON.stringify({ commentId, userId }) }),
  },
};
