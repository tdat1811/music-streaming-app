# 🎵 Music Streaming App - Fullstack (React Native + Express + MongoDB)

Ứng dụng nghe nhạc trực tuyến (Music Streaming App) hoàn chỉnh gồm:
* **Frontend Mobile:** React Native, TypeScript, Expo SDK 58.
* **Backend RESTful API:** Node.js, Express, Mongoose, MongoDB Atlas.

---

## 📋 Yêu cầu môi trường trước khi chạy
1. **Node.js**: Phiên bản 18+ hoặc 20+ (Tải từ [nodejs.org](https://nodejs.org)).
2. **Git**: Đã cài đặt trên máy.
3. **Ứng dụng chạy thử:**
   * **Trên điện thoại thật:** Tải app **Expo Go** từ App Store (iOS) hoặc Google Play (Android).
   * **Trên máy tính:** Có thể chạy trên Trình duyệt Web (Chrome), Android Studio Emulator hoặc iOS Simulator.
4. **Database:** Tài khoản [MongoDB Atlas](https://cloud.mongodb.com) miễn phí (hoặc MongoDB cài cục bộ).

---

## 🚀 Hướng dẫn chạy dự án sau khi Clone từ GitHub

### BƯỚC 1: Clone dự án về máy tính
Mở Terminal / PowerShell và chạy:
```bash
git clone <LINK_REPO_GITHUB_CUA_BAN>
cd project
```

---

### BƯỚC 2: Khởi động Backend API Server (Node.js + MongoDB)

1. **Mở Terminal 1 và di chuyển vào thư mục `server`:**
   ```bash
   cd server
   npm install
   ```

2. **Tạo file cấu hình `.env`:**
   * Tạo một file mới tên là `.env` bên trong thư mục `server/`.
   * Dán nội dung sau vào (thay bằng chuỗi kết nối MongoDB Atlas của bạn):
     ```env
     PORT=5000
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/music_streaming_db?retryWrites=true&w=majority
     ```
     *(Nếu dùng MongoDB local trên máy tính, đặt là: `MONGODB_URI=mongodb://127.0.0.1:27017/music_streaming_db`)*

3. **Nạp dữ liệu mẫu ban đầu vào MongoDB (Chỉ cần chạy 1 lần đầu):**
   ```bash
   npm run seed
   ```
   *Khi thành công, màn hình sẽ báo: `✅ Nạp dữ liệu thành công 100% vào MongoDB!`*

4. **Khởi chạy Backend Server:**
   ```bash
   npm run dev
   ```
   *Server sẽ chạy tại `http://localhost:5000` (Kiểm tra bằng cách mở trình duyệt vào `http://localhost:5000/api/health`).*

---

### BƯỚC 3: Khởi động Ứng dụng di động (Frontend React Native)

1. **Mở Terminal 2** (giữ nguyên Terminal 1 đang chạy server):
   ```bash
   cd project
   npm install
   ```

2. **Cấu hình địa chỉ IP máy chủ API (Nếu test trên điện thoại thật):**
   * Mở file `src/services/api.ts`.
   * **Nếu chạy trên Web:** Giữ nguyên `http://localhost:5000/api`.
   * **Nếu chạy trên Máy ảo Android Studio:** Đổi thành `http://10.0.2.2:5000/api`.
   * **Nếu chạy trên Điện thoại thật qua Expo Go:** Đổi `localhost` thành địa chỉ IPv4 máy tính của bạn (VD: `http://192.168.1.15:5000/api` - xem bằng lệnh `ipconfig`).

3. **Khởi chạy Expo:**
   ```bash
   npx expo start
   ```

4. **Mở ứng dụng để trải nghiệm:**
   * **Nhấn phím `w`**: Mở trực tiếp trên Trình duyệt Web máy tính.
   * **Nhấn phím `a`**: Mở trên Máy ảo Android Emulator.
   * **Trên điện thoại thật**: Mở camera (iOS) hoặc mở app **Expo Go** (Android) quét mã QR hiển thị trên Terminal.

---

## 📱 Danh sách 13 Màn hình hoàn thiện
1. **Launch Screen**: Onboarding nghệ sĩ, logo Soundwave trắng, đăng ký/đăng nhập.
2. **Launch Screen - Premium**: Giới thiệu đặc quyền VIP, carousel tính năng vuốt ngang.
3. **Subscription Plans**: Bảng giá 3 gói cước ($12.99, $19.99, $6.99) & mô phỏng thanh toán VIP.
4. **Home**: Lời chào, Suggestions, Charts Top 50, Trending albums, Popular artists.
5. **Search Audio**: Ô tìm kiếm Autocomplete thời gian thực theo kho bài hát có thật.
6. **Search Results**: 4 tab phân loại (All, Tracks, Albums, Artists) & nút Follow toggle.
7. **Feed**: Bảng tin bài post nghệ sĩ, nghe nhạc trong post, đếm Like/Share realtime.
8. **Feed Comments**: Bottom sheet bình luận đa cấp lồng nhau, gửi comment realtime.
9. **My Library**: Tab Playlists, Liked Songs (bấm nghe trực tiếp), quản lý nghệ sĩ theo dõi.
10. **My Playlists**: Quản lý playlist cá nhân, nút nổi FAB (+) tạo playlist mới.
11. **Playlist Details / Album Details**: Bìa đĩa, thời lượng, Like/Share album, phát nhạc, Mini Player ghim đáy.
12. **Artist Profile**: Profile ca sĩ, bài hát hot, danh sách Album (bấm nghe trực tiếp), About bio.
13. **Play Audio**: Phát nhạc toàn màn hình, Waveform 36 cột tua nhạc, lặp 1 lần / lặp vô hạn, Download offline, Share, menu `...`.

---

## 🛠️ Công nghệ cốt lõi
* **Mobile App:** React Native, TypeScript, Expo SDK 58, expo-audio, expo-status-bar, SafeAreaView.
* **Backend:** Node.js, Express, Mongoose ODM, CORS, Dotenv, RESTful Architecture.
* **Database:** MongoDB Atlas (Cloud Cluster).
