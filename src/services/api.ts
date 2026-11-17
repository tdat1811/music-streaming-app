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

// Dữ liệu bài hát lưu đường dẫn dạng http://localhost:5000/audio/... hoặc đường dẫn tương đối
// /audio/..., /covers/... (file nghệ sĩ tải lên). Trên điện thoại "localhost" là chính điện thoại,
// nên đổi sang địa chỉ server thật.
export const isServerRelativeUrl = (url: string) => /^\/(audio|covers|avatars)\//.test(url);
export const resolveServerUrl = (url: string) =>
  isServerRelativeUrl(url)
    ? `${SERVER_ORIGIN}${url}`
    : url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, SERVER_ORIGIN);

// Máy chủ có phản hồi nhưng từ chối yêu cầu (sai mật khẩu, email trùng, không có quyền...)
export class ApiError extends Error {
  status: number;
  // Mã lỗi máy chủ (VD NAME_TAKEN, PENDING_EXISTS) và lỗi theo từng trường của form
  code?: string;
  errors?: Record<string, string>;
  // Toàn bộ phản hồi lỗi (VD AI Assistant: chat, userMessage, quota, suggestedModel)
  body?: any;
  constructor(message: string, status: number, code?: string, errors?: Record<string, string>, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.body = body;
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

// Lời nhắn khi tài khoản bị khoá (màn đăng nhập L2)
export const SUPPORT_EMAIL = 'support@musicstream.app';
export const lockedNotice = (message?: string) =>
  `${message || 'This account has been locked.'} If you think this is a mistake, contact ${SUPPORT_EMAIL}.`;

// Token đăng nhập do máy chủ cấp (JWT). Chỉ giữ trong bộ nhớ khi app đang chạy.
let authToken: string | null = null;
let onSessionExpired: ((message?: string) => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Được gọi khi máy chủ báo token hết hạn / không hợp lệ, hoặc tài khoản vừa bị khoá
// (để đăng xuất và về Log In; message = lý do hiện ở màn đăng nhập)
export const setSessionExpiredHandler = (handler: ((message?: string) => void) | null) => {
  onSessionExpired = handler;
};

const TOKEN_ERROR_CODES = ['TOKEN_MISSING', 'TOKEN_INVALID', 'TOKEN_EXPIRED'];

// Hàm gọi API tổng quát dùng fetch có sẵn trong React Native (không cần cài thêm thư viện)
async function request<T>(endpoint: string, options: RequestInit = {}, withAuth = false): Promise<T> {
  // Chưa có phiên với máy chủ (đăng nhập bằng dữ liệu trên máy khi server tắt):
  // coi như không kết nối được để app giữ thay đổi trên máy như chế độ offline.
  if (withAuth && !authToken) throw new NetworkError('Chưa đăng nhập với máy chủ');

  const url = `${API_BASE_URL}${endpoint}`;
  // Gửi file (FormData): để trình duyệt / React Native tự đặt Content-Type kèm boundary
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
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
    // Tài khoản bị khoá trong lúc đang dùng app (giai đoạn 5): đăng xuất, báo lý do
    if (json?.code === 'ACCOUNT_LOCKED' && authToken) {
      authToken = null;
      onSessionExpired?.(lockedNotice(json.message));
    }
    throw new ApiError(json?.message || `Máy chủ trả lỗi ${response.status}`, response.status, json?.code, json?.errors, json);
  }
  if (json === null) throw new NetworkError('Phản hồi từ máy chủ không hợp lệ');
  return json;
}

// Gửi form có file kèm tiến trình tải lên (0–1). fetch không báo tiến trình nên dùng XMLHttpRequest
// (chạy được cả trên web lẫn React Native). Lỗi trả về giống request(): ApiError / NetworkError.
export function uploadWithProgress<T>(endpoint: string, form: FormData, onProgress?: (ratio: number) => void): Promise<T> {
  if (!authToken) return Promise.reject(new NetworkError('Chưa đăng nhập với máy chủ'));
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new NetworkError());
    xhr.onload = () => {
      let json: any = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // không phải JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && json) {
        resolve(json);
        return;
      }
      if (xhr.status === 401 && TOKEN_ERROR_CODES.includes(json?.code)) {
        authToken = null;
        onSessionExpired?.();
      }
      reject(new ApiError(json?.message || `Máy chủ trả lỗi ${xhr.status}`, xhr.status, json?.code, json?.errors));
    };
    xhr.send(form);
  });
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

    forgotPassword: (data: { email: string; newPassword: string }) =>
      request<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Chỉ xem được hồ sơ của chính mình nên cần token
    getProfile: (userId: string) =>
      authRequest(`/auth/profile/${userId}`),

    subscribe: (userId: string, planId: string) =>
      authRequest('/auth/subscribe', { method: 'POST', body: JSON.stringify({ userId, planId }) }),

    // Ví (VNĐ): nạp tiền qua MoMo (giả lập) – tối thiểu 10.000đ
    depositMoMo: (amount: number, momoPhone: string) =>
      authRequest<any>('/auth/deposit-momo', { method: 'POST', body: JSON.stringify({ amount, momoPhone }) }),

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
    // Ghi nhận 1 lượt nghe kèm nguồn (bấm phát từ màn nào). Đã đăng nhập thì gửi token để máy chủ
    // biết người nghe (đếm người nghe, không tính lượt nghe của chính nghệ sĩ); khách vẫn gọi được.
    recordPlay: (songId: string, source?: string) =>
      request<{ success: boolean; plays: number; counted?: boolean }>(`/songs/${encodeURIComponent(songId)}/play`, {
        method: 'POST',
        body: JSON.stringify({ source: source || 'other' }),
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      }),
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
    getById: (playlistId: string) => authRequest(`/playlists/${playlistId}`),
    create: (data: { userId: string; title: string; description?: string }) =>
      authRequest('/playlists/create', { method: 'POST', body: JSON.stringify(data) }),
    addSong: (playlistId: string, songId: string) =>
      authRequest('/playlists/add-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    removeSong: (playlistId: string, songId: string) =>
      authRequest('/playlists/remove-song', { method: 'POST', body: JSON.stringify({ playlistId, songId }) }),
    rename: (playlistId: string, title: string) =>
      authRequest(`/playlists/${playlistId}`, { method: 'PUT', body: JSON.stringify({ title }) }),
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
    // Gửi kèm token nếu có (máy chủ dùng để lọc tab Following)
    getPosts: () => request('/feed/posts'),
    // Nghệ sĩ đăng / sửa / xoá bài của chính mình
    createPost: (data: { content: string; songId: string | null }) =>
      authRequest<any>('/feed/posts', { method: 'POST', body: JSON.stringify(data) }),
    updatePost: (postId: string, data: { content: string; songId: string | null }) =>
      authRequest<any>(`/feed/posts/${encodeURIComponent(postId)}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePost: (postId: string) => authRequest<any>(`/feed/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' }),
    togglePostLike: (postId: string, userId: string) =>
      authRequest('/feed/posts/like', { method: 'POST', body: JSON.stringify({ postId, userId }) }),
    // Khách cũng chia sẻ được nên không cần token
    sharePost: (postId: string) =>
      request('/feed/posts/share', { method: 'POST', body: JSON.stringify({ postId }) }),
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

  // 9. Đăng ký làm nghệ sĩ (người nghe)
  artistRequests: {
    create: (data: {
      stageName: string;
      genres: string[];
      bio: string;
      socialLinks: string[];
      avatarImage: string;
      agree: boolean;
    }) => authRequest<any>('/artist-requests', { method: 'POST', body: JSON.stringify(data) }),
    getMine: () => authRequest<any>('/artist-requests/me'),
    cancelMine: () => authRequest<any>('/artist-requests/me', { method: 'DELETE' }),
    // form: FormData có trường "avatar"
    uploadAvatar: (form: FormData) =>
      authRequest<{ success: boolean; avatarImage: string }>('/artist-requests/avatar', { method: 'POST', body: form }),
  },

  // 13. Lịch sử thanh toán của chính mình (giai đoạn 6)
  payments: {
    list: () => authRequest<any>('/payments'),
  },

  // 12. Trang nghệ sĩ / bài hát đang bị ẩn (công khai, giai đoạn 5)
  moderation: {
    hidden: () => request<any>('/moderation/hidden'),
  },

  // 11. Báo cáo vi phạm (người nghe, giai đoạn 5)
  reports: {
    create: (data: { targetType: 'song' | 'post' | 'comment'; targetId: string; reason: string; details?: string }) =>
      authRequest<any>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  },

  // 10. Quản trị (chỉ tài khoản admin; máy chủ kiểm tra quyền ở từng API)
  admin: {
    // ---- Tab Manage (giai đoạn 5) ----
    listUsers: (p: { q?: string; filter?: string; page?: number }) =>
      authRequest<any>(`/admin/manage/users?q=${encodeURIComponent(p.q ?? '')}&filter=${p.filter ?? 'all'}&page=${p.page ?? 1}`),
    getUser: (id: string) => authRequest<any>(`/admin/manage/users/${encodeURIComponent(id)}`),
    lockUser: (id: string, data: { rule: string; note?: string }) =>
      authRequest<any>(`/admin/manage/users/${encodeURIComponent(id)}/lock`, { method: 'POST', body: JSON.stringify(data) }),
    unlockUser: (id: string) => authRequest<any>(`/admin/manage/users/${encodeURIComponent(id)}/unlock`, { method: 'POST' }),
    changeRole: (id: string, role: 'listener' | 'admin') =>
      authRequest<any>(`/admin/manage/users/${encodeURIComponent(id)}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
    revokeViolation: (id: string) => authRequest<any>(`/admin/manage/violations/${encodeURIComponent(id)}/revoke`, { method: 'POST' }),
    listArtists: (p: { q?: string; filter?: string; page?: number }) =>
      authRequest<any>(`/admin/manage/artists?q=${encodeURIComponent(p.q ?? '')}&filter=${p.filter ?? 'all'}&page=${p.page ?? 1}`),
    getArtist: (id: string) => authRequest<any>(`/admin/manage/artists/${encodeURIComponent(id)}`),
    setVerified: (id: string, verified: boolean) =>
      authRequest<any>(`/admin/manage/artists/${encodeURIComponent(id)}/verified`, { method: 'POST', body: JSON.stringify({ verified }) }),
    hideArtist: (id: string, data: { rule: string; note?: string }) =>
      authRequest<any>(`/admin/manage/artists/${encodeURIComponent(id)}/hide`, { method: 'POST', body: JSON.stringify(data) }),
    unhideArtist: (id: string) => authRequest<any>(`/admin/manage/artists/${encodeURIComponent(id)}/unhide`, { method: 'POST' }),
    removeContent: (type: string, id: string, data: { rule: string; note?: string }) =>
      authRequest<any>(`/admin/manage/content/${type}/${encodeURIComponent(id)}/remove`, { method: 'POST', body: JSON.stringify(data) }),
    listReports: (p: { status?: string; type?: string }) =>
      authRequest<any>(`/admin/manage/reports?status=${p.status ?? 'open'}${p.type ? `&type=${p.type}` : ''}`),
    getReport: (type: string, id: string) => authRequest<any>(`/admin/manage/reports/${type}/${encodeURIComponent(id)}`),
    dismissReports: (type: string, id: string) =>
      authRequest<any>(`/admin/manage/reports/${type}/${encodeURIComponent(id)}/dismiss`, { method: 'POST' }),

    getSummary: () => authRequest<any>('/admin/summary'),
    // Lịch sử duyệt / từ chối của chính admin đang đăng nhập
    getMyReviews: () => authRequest<any>('/admin/my-reviews'),
    listRequests: (params: { status: string; q?: string; page?: number }) =>
      authRequest<any>(
        `/admin/artist-requests?status=${encodeURIComponent(params.status)}&q=${encodeURIComponent(params.q ?? '')}&page=${params.page ?? 1}`
      ),
    getRequest: (id: string) => authRequest<any>(`/admin/artist-requests/${encodeURIComponent(id)}`),
    approve: (id: string, verified: boolean) =>
      authRequest<any>(`/admin/artist-requests/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ verified }),
      }),
    reject: (id: string, reason: string, note: string) =>
      authRequest<any>(`/admin/artist-requests/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, note }),
      }),
  },

  // 12. Artist Studio (chỉ tài khoản nghệ sĩ; máy chủ kiểm tra quyền và chủ sở hữu)
  studio: {
    getOverview: (tz?: number) => authRequest<any>(`/studio/overview${tz === undefined ? '' : `?tz=${tz}`}`),
    // Thống kê (giai đoạn 4): range = '7' | '30' | 'all'; tz = phút lệch so với UTC của máy
    getStats: (range: string, tz: number) => authRequest<any>(`/studio/stats?range=${encodeURIComponent(range)}&tz=${tz}`),
    // AI Fan Insight (giai đoạn 6): bản mới nhất ≤ 24 giờ / một bản theo id (bấm "View full report" trong chat)
    getInsight: (tz: number) => authRequest<any>(`/studio/insights?tz=${tz}`),
    getInsightById: (id: string) => authRequest<any>(`/studio/insights/${encodeURIComponent(id)}`),
    // AI Assistant (giai đoạn 6b): chat hỏi đáp + phân tích fan, 20 tin miễn phí / ngày
    assistant: {
      listChats: (tz: number) => authRequest<any>(`/studio/assistant/chats?tz=${tz}`),
      models: () => authRequest<any>('/studio/assistant/models'),
      getChat: (id: string) => authRequest<any>(`/studio/assistant/chats/${encodeURIComponent(id)}`),
      updateChat: (id: string, body: { model?: string; title?: string }) =>
        authRequest<any>(`/studio/assistant/chats/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
      deleteChat: (id: string) => authRequest<any>(`/studio/assistant/chats/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      // Không có chatId → tạo cuộc trò chuyện mới (model mặc định Auto)
      send: (body: { chatId?: string | null; text: string; model?: string }, tz: number) =>
        authRequest<any>(`/studio/assistant/messages?tz=${tz}`, { method: 'POST', body: JSON.stringify(body) }),
      retry: (chatId: string, messageId: string, tz: number) =>
        authRequest<any>(`/studio/assistant/chats/${encodeURIComponent(chatId)}/retry?tz=${tz}`, { method: 'POST', body: JSON.stringify({ messageId }) }),
      basicSummary: (chatId: string, tz: number) =>
        authRequest<any>(`/studio/assistant/chats/${encodeURIComponent(chatId)}/basic-summary?tz=${tz}`, { method: 'POST' }),
      purchase: (tz: number) => authRequest<any>(`/studio/assistant/purchase?tz=${tz}`, { method: 'POST' }),
    },
    getSongStats: (songId: string, range: string, tz: number) =>
      authRequest<any>(`/studio/stats/songs/${encodeURIComponent(songId)}?range=${encodeURIComponent(range)}&tz=${tz}`),
    // form: audio (bắt buộc), cover, title, genre, description, status
    uploadSong: (form: FormData, onProgress?: (ratio: number) => void) => uploadWithProgress<any>('/studio/songs', form, onProgress),
    // form: image -> trả về { image: '/covers/...' }
    uploadImage: (form: FormData) => authRequest<{ success: boolean; image: string }>('/studio/images', { method: 'POST', body: form }),
    getSongs: (status?: string) => authRequest<any>(`/studio/songs${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    getSong: (id: string) => authRequest<any>(`/studio/songs/${encodeURIComponent(id)}`),
    updateSong: (id: string, data: Record<string, unknown>) =>
      authRequest<any>(`/studio/songs/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
    setSongStatus: (id: string, status: string) =>
      authRequest<any>(`/studio/songs/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    deleteSong: (id: string) => authRequest<any>(`/studio/songs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getAlbums: () => authRequest<any>('/studio/albums'),
    getAlbum: (id: string) => authRequest<any>(`/studio/albums/${encodeURIComponent(id)}`),
    saveAlbum: (id: string | null, data: Record<string, unknown>) =>
      authRequest<any>(id ? `/studio/albums/${encodeURIComponent(id)}` : '/studio/albums', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteAlbum: (id: string) => authRequest<any>(`/studio/albums/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    getProfile: () => authRequest<any>('/studio/profile'),
    updateProfile: (data: Record<string, unknown>) => authRequest<any>('/studio/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // 11. Thông báo (có người trả lời bình luận, kết quả đăng ký nghệ sĩ)
  notifications: {
    getMine: () => authRequest('/notifications'),
    markRead: (notificationId: string) =>
      authRequest(`/notifications/${notificationId}/read`, { method: 'POST' }),
    markAllRead: () => authRequest('/notifications/read-all', { method: 'POST' }),
  },

  // 10. AI Music Assistant (Gợi ý nhạc & Trò chuyện theo tâm trạng)
  ai: {
    getMoods: () =>
      request<{
        success: boolean;
        data: Array<{
          id: string;
          label: string;
          emoji: string;
          description: string;
          prompt: string;
        }>;
        welcomeMessage: string;
      }>('/ai/moods'),

    chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) =>
      request<{
        success: boolean;
        data: {
          reply: string;
          mood: string;
          moodLabel: string;
          recommendedSongs: any[];
          suggestedPrompts: string[];
        };
      }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
  },
};
