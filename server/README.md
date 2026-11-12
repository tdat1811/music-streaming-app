# 🎵 Music Streaming App - RESTful API Backend (Express + MongoDB)

Hệ thống Backend RESTful API hoàn chỉnh kết nối cơ sở dữ liệu **MongoDB** phục vụ ứng dụng nghe nhạc di động React Native.

---

## 🚀 Hướng dẫn cài đặt và khởi chạy nhanh

### Bước 1: Mở Terminal và vào thư mục `server`
```bash
cd d:\mobile\project\server
```

### Bước 2: Cài đặt các thư viện cần thiết
```bash
npm install
```
*(Các thư viện gồm: `express`, `mongoose`, `cors`, `dotenv`, và `nodemon` cho môi trường phát triển)*

### Bước 3: Cấu hình kết nối MongoDB
Mở file `.env` trong thư mục `server/`:
* **Nếu bạn cài MongoDB trên máy tính (Local):**
  ```env
  PORT=5000
  MONGODB_URI=mongodb://127.0.0.1:27017/music_streaming_db
  ```
* **Nếu bạn dùng MongoDB Atlas Cloud (Khuyên dùng - Miễn phí không cần cài gì):**
  ```env
  PORT=5000
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/music_streaming_db?retryWrites=true&w=majority
  ```
* **Khoá ký token đăng nhập (JWT)** — thêm vào cùng file `.env`, mỗi máy tự đặt một chuỗi ngẫu nhiên và không đưa lên git:
  ```env
  JWT_SECRET=<chuỗi ngẫu nhiên, VD tạo bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
  JWT_EXPIRES_IN=7d   # (tuỳ chọn) thời hạn token, mặc định 7 ngày
  ```
  Nếu thiếu `JWT_SECRET`, server vẫn chạy với khoá tạm thời, nhưng mỗi lần khởi động lại server mọi người phải đăng nhập lại.

### Bước 4: Nạp toàn bộ dữ liệu mẫu (Seed Data)
Chạy lệnh sau để tự động khởi tạo dữ liệu ban đầu (Bài hát, Ca sĩ, Album, Playlist, Bình luận, Người dùng):
```bash
npm run seed
```
Khi chạy xong, terminal sẽ báo: `✅ Nạp dữ liệu thành công 100% vào MongoDB!`

### Bước 5: Chạy máy chủ API Server
* **Chạy thông thường:**
  ```bash
  npm start
  ```
* **Hoặc chạy chế độ phát triển (tự động reload khi sửa code):**
  ```bash
  npm run dev
  ```
Terminal sẽ thông báo:
```
🚀 Music Streaming API Server is running on port 5000
🔗 Local URL: http://localhost:5000/api/health
✅ MongoDB Connected: 127.0.0.1/music_streaming_db
```

---

## 📡 Danh sách các RESTful API Endpoints

### 1. Kiểm tra trạng thái hệ thống
* `GET /api/health` ➔ Kiểm tra server có hoạt động không.

### 2. Xác thực & Tài khoản (`/api/auth`)
* `POST /api/auth/register` ➔ Đăng ký tài khoản mới (`name`, `email`, `password`).
* `POST /api/auth/login` ➔ Đăng nhập (`email`, `password`).
* `GET  /api/auth/profile/:userId` ➔ Lấy thông tin tài khoản, danh sách bài thích, nghệ sĩ theo dõi.
* `POST /api/auth/subscribe` ➔ Mua gói VIP Premium (`userId`, `planId`).
* `POST /api/auth/like-song` ➔ Thả tim / Bỏ thích bài hát (`userId`, `songId`).
* `POST /api/auth/follow-artist` ➔ Theo dõi / Bỏ theo dõi ca sĩ (`userId`, `artistId`).
* `POST /api/auth/like-album` ➔ Thả tim / Bỏ thích Album (`userId`, `albumId`).
* `POST /api/auth/download-song` ➔ Lưu bài hát nghe offline (`userId`, `songId`).

### 3. Bài hát (`/api/songs`)
* `GET  /api/songs` ➔ Lấy toàn bộ bài hát.
* `GET  /api/songs/suggestions` ➔ Lấy bài hát mục "Suggestions for you".
* `GET  /api/songs/search?q=keyword` ➔ Tìm kiếm bài hát và gợi ý Autocomplete theo từ khóa.
* `GET  /api/songs/:id` ➔ Lấy chi tiết bài hát theo ID.
* `POST /api/songs/by-ids` ➔ Lấy danh sách bài hát theo mảng IDs `{ ids: ['s1', 's2'] }`.

### 4. Album (`/api/albums`)
* `GET  /api/albums` ➔ Lấy toàn bộ Album.
* `GET  /api/albums/trending` ➔ Lấy Album thịnh hành trang chủ.
* `GET  /api/albums/:id` ➔ Lấy chi tiết Album và kèm toàn bộ bài hát trong album.
* `GET  /api/albums/artist/:artistName` ➔ Lấy danh sách Album của nghệ sĩ.

### 5. Nghệ sĩ (`/api/artists`)
* `GET  /api/artists` ➔ Lấy toàn bộ nghệ sĩ.
* `GET  /api/artists/popular` ➔ Lấy danh sách nghệ sĩ phổ biến.
* `GET  /api/artists/:id` ➔ Lấy chi tiết hồ sơ nghệ sĩ (Bio, bài hát nổi bật, Album, nghệ sĩ liên quan).

### 6. Danh sách phát cá nhân (`/api/playlists`)
* `GET    /api/playlists/user/:userId` ➔ Lấy các Playlist của User.
* `GET    /api/playlists/:id` ➔ Lấy chi tiết Playlist và danh sách bài hát.
* `POST   /api/playlists/create` ➔ Tạo Playlist mới (`userId`, `title`, `description`).
* `POST   /api/playlists/add-song` ➔ Thêm bài hát vào Playlist (`playlistId`, `songId`).
* `POST   /api/playlists/remove-song` ➔ Xóa bài hát khỏi Playlist (`playlistId`, `songId`).
* `DELETE /api/playlists/:id` ➔ Xóa Playlist.

### 7. Bảng xếp hạng (`/api/charts`)
* `GET /api/charts` ➔ Lấy danh sách BXH (Top 50 Canada, Global, Trending).
* `GET /api/charts/:id` ➔ Lấy chi tiết BXH và danh sách bài hát bên trong.

### 8. Bảng tin Feed & Bình luận (`/api/feed`)
* `GET  /api/feed/posts` ➔ Lấy danh sách bài post bảng tin.
* `POST /api/feed/posts/like` ➔ Thả tim bài viết Feed (`postId`, `userId`).
* `POST /api/feed/posts/share` ➔ Tăng số lượt chia sẻ (`postId`).
* `GET  /api/feed/comments/:postId` ➔ Lấy bình luận lồng nhau theo bài post.
* `POST /api/feed/comments` ➔ Gửi bình luận mới hoặc phản hồi (`postId`, `userName`, `text`, `replyTarget`).
* `POST /api/feed/comments/like` ➔ Thả tim bình luận (`commentId`, `userId`).

---

## 📱 Kết nối từ React Native
Trong thư mục React Native của bạn đã có sẵn file service: [src/services/api.ts](file:///d:/mobile/project/src/services/api.ts).
Bạn chỉ cần import và gọi trực tiếp:
```typescript
import { api } from '../services/api';

// Ví dụ: Lấy danh sách bài hát gợi ý
const data = await api.songs.getSuggestions();

// Ví dụ: Đăng nhập
const res = await api.auth.login({ email: 'ashley@example.com', password: '123' });
```
