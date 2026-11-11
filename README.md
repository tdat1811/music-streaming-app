# 🎵 Music Streaming App - Fullstack (React Native + Express + MongoDB)

> Đồ án môn học: **Phát triển ứng dụng trên thiết bị di động / Lập trình di động nâng cao**  
> Ứng dụng nghe nhạc trực tuyến đa nền tảng kiến trúc Client - Server hoàn chỉnh.

---

## ⚡ QUY TRÌNH KHỞI CHẠY BẮT BUỘC (CHẠY CÁI NÀO TRƯỚC / SAU?)

Do ứng dụng được xây dựng theo mô hình **Fullstack Client - Server** với cơ sở dữ liệu đám mây **MongoDB Atlas**, thứ tự khởi chạy bắt buộc như sau:

```
┌──────────────────────────────────────────────┐
│  BƯỚC 1: KHỞI CHẠY BACKEND SERVER (CỔNG 5000) │  👉  CHẠY TRƯỚC (TERMINAL 1)
│  (Kết nối MongoDB Atlas & cung cấp REST API)  │
└──────────────────────────────────────────────┘
                       ⬇️
┌──────────────────────────────────────────────┐
│  BƯỚC 2: KHỞI CHẠY FRONTEND APP (CỔNG 8081)  │  👉  CHẠY SAU (TERMINAL 2)
│  (Expo React Native gọi dữ liệu từ Backend)  │
└──────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Tại sao phải chạy Backend trước?**  
> Khi ứng dụng di động khởi động, màn hình Home, tìm kiếm, album và hồ sơ ca sĩ sẽ tự động gửi HTTP Request đến Backend (`http://localhost:5000/api`) để lấy dữ liệu bài hát, album và nghệ sĩ từ MongoDB.  
> Nếu bạn chạy Frontend trước khi Backend hoạt động, ứng dụng sẽ không thể tải dữ liệu thời gian thực và không thể kết nối tới cơ sở dữ liệu.

---

## 📋 Yêu cầu môi trường chuẩn bị trước

1. **Node.js**: Phiên bản 18+ hoặc 20+ (Tải từ [nodejs.org](https://nodejs.org)).
2. **Git**: Đã cài đặt trên máy.
3. **Môi trường chạy thử App Mobile**:
   * **Cách 1 (Nhanh nhất & dễ nhất):** Trình duyệt Web (Chrome, Edge) trên máy tính.
   * **Cách 2:** Máy ảo Android Studio (Android Emulator).
   * **Cách 3:** Điện thoại thật: Tải ứng dụng **Expo Go** từ Google Play (Android) hoặc App Store (iOS).

---

## 🚀 HƯỚNG DẪN CHI TIẾT CÁC BƯỚC KHỞI CHẠY

### 💻 BƯỚC 1: Khởi động Backend API Server (CHẠY TRƯỚC)

Mở **Terminal 1** (PowerShell hoặc Command Prompt) tại thư mục dự án và thực hiện:

#### 1.1. Di chuyển vào thư mục `server` và cài đặt thư viện:
```bash
cd server
npm install
```

#### 1.2. Kiểm tra file cấu hình môi trường `.env`:
File `server/.env` đã được cấu hình sẵn chuỗi kết nối tới cụm đám mây **MongoDB Atlas**:
```env
PORT=5000
MONGODB_URI=mongodb+srv://tiendat20051812_db_user:5ZN6gQZDQ4AAED78@musicappcluster.fyekgni.mongodb.net/music_streaming_db?retryWrites=true&w=majority
```
*(Nếu bạn muốn sử dụng MongoDB cục bộ trên máy tính của mình, thay đổi thành: `MONGODB_URI=mongodb://127.0.0.1:27017/music_streaming_db`)*

#### 1.3. Nạp dữ liệu mẫu vào MongoDB (Chỉ cần chạy 1 lần đầu):
Lệnh này sẽ tự động nạp 52 bài hát, 12 album, 12 ca sĩ, 8 bảng xếp hạng, và tài khoản mẫu vào database:
```bash
npm run seed
```
*Khi thành công, terminal sẽ báo: `✅ Nạp dữ liệu thành công 100% vào MongoDB!`*

#### 1.4. Khởi động Backend Server:
```bash
npm run dev
```
Khi chạy thành công, màn hình sẽ thông báo:
```text
🚀 Server is running on port 5000
✅ Kết nối MongoDB Atlas thành công!
📡 Sẵn sàng phục vụ API tại http://localhost:5000/api
```
👉 **GIỮ NGUYÊN TERMINAL 1 ĐỂ SERVER TIẾP TỤC CHẠY.**

---

### 📱 BƯỚC 2: Khởi động Frontend React Native App (CHẠY SAU)

Mở một **Terminal 2 MỚI** (tuyệt đối không tắt Terminal 1 đang chạy server) và thực hiện:

#### 2.1. Đứng tại thư mục gốc của dự án (`project`) và cài đặt thư viện:
```bash
cd project
npm install
```

#### 2.2. Kiểm tra cấu hình địa chỉ IP máy chủ API (`src/services/api.ts`):
Mở file `src/services/api.ts`, dòng số 8:
* **Nếu chạy trên Trình duyệt Web (Mặc định):**
  ```typescript
  export const API_BASE_URL = 'http://localhost:5000/api';
  ```
* **Nếu chạy trên Máy ảo Android Studio Emulator:**
  ```typescript
  export const API_BASE_URL = 'http://10.0.2.2:5000/api';
  ```
* **Nếu chạy trên Điện thoại thật qua app Expo Go:**
  Đổi `localhost` thành địa chỉ IPv4 máy tính của bạn trong mạng WiFi chung (kiểm tra bằng lệnh `ipconfig` trên Windows, ví dụ: `192.168.1.15`):
  ```typescript
  export const API_BASE_URL = 'http://192.168.1.15:5000/api';
  ```

#### 2.3. Khởi chạy Expo:
```bash
npx expo start
```

#### 2.4. Mở ứng dụng để trải nghiệm:
* **Nhấn phím `w` trên bàn phím:** Tự động mở ứng dụng trên Trình duyệt Web máy tính (Khuyên dùng - giao diện trực quan, âm thanh phát tức thì).
* **Nhấn phím `a` trên bàn phím:** Mở trên Máy ảo Android Studio.
* **Trên điện thoại thật:** Mở camera (iPhone) hoặc mở app **Expo Go** (Android) quét mã QR hiển thị trên Terminal.

---

### 🔍 BƯỚC 3: Dấu hiệu nhận biết ứng dụng đã kết nối Database thành công

1. **Huy hiệu kết nối (Badge Live):**
   * Ngay tại trang chủ **Home**, dưới lời chào và tên người dùng sẽ xuất hiện chấm tròn xanh lá kèm dòng chữ: **`MongoDB Atlas Live`**.
2. **Kiểm tra tính năng xem tất cả (See all):**
   * Bấm **See all** tại mục **Top Charts** ➔ Mở danh sách toàn bộ 8 Charts ➔ Bấm vào bảng xếp hạng sẽ mở chi tiết danh sách bài hát từ DB.
   * Bấm **See all** tại mục **Trending albums** ➔ Mở danh sách 12 Album xu hướng.
   * Bấm **See all** tại mục **Popular artists** ➔ Mở danh sách 12 Ca sĩ (The Weeknd, Taylor Swift, Sơn Tùng M-TP, Vũ.,...).
3. **Tính năng tìm kiếm theo ID trên MongoDB Atlas:**
   * Tại danh sách nghệ sĩ, gõ ID (ví dụ: `art5` hoặc `art1`) và bấm nút **"Tìm ID"** ➔ Ứng dụng sẽ gửi truy vấn trực tiếp lên MongoDB và mở ngay hồ sơ của Sơn Tùng M-TP hoặc The Weeknd mà không bị chớp hay giật.
4. **Tìm kiếm thời gian thực (Autocomplete):**
   * Vào thanh Search, gõ từ khóa ➔ Danh sách gợi ý từ khóa tự động được lấy trực tiếp từ database MongoDB.

---

## 👥 BẢNG PHÂN CÔNG CÔNG VIỆC TRONG ĐỒ ÁN

### 👤 THÀNH VIÊN 1: Bộ máy phát nhạc, Trang chủ, Tìm kiếm, Bảng xếp hạng & Hồ sơ ca sĩ (Tiến độ: 100%)
* **`HomeScreen.tsx`**: Trang chủ tích hợp 4 khối dữ liệu động từ MongoDB (Suggestions, Charts, Albums, Artists), huy hiệu MongoDB Atlas Live, liên kết điều hướng và phát nhạc trực tiếp.
* **`ChartsListScreen.tsx`**: Màn hình danh sách Top Charts kết nối API MongoDB (`/api/charts`), liên kết sang Playlist Details.
* **`AlbumsListScreen.tsx`**: Màn hình danh sách Trending Albums kết nối API MongoDB (`/api/albums`), liên kết sang Playlist Details.
* **`ArtistsListScreen.tsx`**: Màn hình danh sách Popular Artists kết nối API MongoDB (`/api/artists`), tích hợp tính năng **Tìm kiếm trực tiếp theo ID** trên MongoDB Atlas.
* **`ArtistProfileScreen.tsx`**: Trang hồ sơ ca sĩ chi tiết (tiểu sử About, danh sách bài hát hot, danh sách album, mục Fans also like) kèm bộ đệm chuyển trang mượt mà không chớp tắt.
* **`SearchAudioScreen.tsx`**: Ô tìm kiếm Autocomplete thời gian thực nạp từ khóa gợi ý từ database.
* **`SearchResultsScreen.tsx`**: Bộ lọc 4 tab (All, Tracks, Albums, Artists) lọc trực tiếp từ MongoDB.
* **`PlaylistDetailsScreen.tsx`**: Chi tiết album và bảng xếp hạng, nạp danh sách bài hát theo mảng ID từ MongoDB.
* **`PlayAudioScreen.tsx` & Audio Engine**: Bộ máy âm thanh toàn cục (`AudioPlayerContext`), thanh Mini Player ghim đáy, sóng âm Waveform 36 cột hỗ trợ tua nhạc, lặp bài, xáo bài.
* **Backend & Database**: Thiết kế Schema Mongoose, viết Controller/Routes RESTful API và nạp 52 bài hát, 12 album, 12 ca sĩ, 8 chart lên MongoDB Atlas.

### 👤 THÀNH VIÊN 2: Luồng Khởi động, Gói cước Premium, Mạng xã hội & Quản lý Thư viện
* **`LaunchScreen.tsx` & `LaunchScreenPremium.tsx`**: Màn hình chào mừng onboarding và giới thiệu các đặc quyền gói cước.
* **`SubscriptionPlansScreen.tsx`**: Bảng giá các gói cước VIP ($12.99, $19.99, $6.99) và mô phỏng kích hoạt tài khoản Premium.
* **`FeedScreen.tsx` & `FeedCommentsScreen.tsx`**: Bảng tin bài viết của nghệ sĩ, nghe nhạc trong bài post, tương tác Like/Share, bình luận đa cấp lồng nhau (Nested comments).
* **`MyLibraryScreen.tsx` & `MyPlaylistsScreen.tsx`**: Quản lý thư viện cá nhân, danh sách bài hát đã thích (Liked Songs), danh sách nghệ sĩ theo dõi, tạo playlist mới với nút nổi FAB (+).

---

## 📱 DANH SÁCH 16 MÀN HÌNH HOÀN THIỆN CỦA ỨNG DỤNG

1. **Launch Screen**: Màn hình chào mừng ban đầu, đăng ký / đăng nhập.
2. **Launch Screen - Premium**: Giới thiệu đặc quyền VIP dạng thẻ trượt.
3. **Subscription Plans**: Bảng chọn gói cước và mô phỏng thanh toán.
4. **Home**: Trang chủ tổng hợp Suggestions, Charts, Albums, Artists.
5. **Top Charts List**: Danh sách tất cả các bảng xếp hạng âm nhạc quốc tế và Việt Nam.
6. **Trending Albums List**: Danh sách tất cả các album đang thịnh hành.
7. **Popular Artists List**: Danh sách tất cả nghệ sĩ kèm chức năng tra cứu theo ID.
8. **Artist Profile**: Hồ sơ chi tiết ca sĩ, tiểu sử, bài hát hot, album và nghệ sĩ tương tự.
9. **Search Audio**: Ô tìm kiếm và gợi ý từ khóa tự động (Autocomplete) theo thời gian thực.
10. **Search Results**: Kết quả tìm kiếm phân loại 4 tab (All, Tracks, Albums, Artists).
11. **Playlist / Album Details**: Danh sách bài hát chi tiết trong playlist, album, chart.
12. **Play Audio (Full Player)**: Trình phát nhạc toàn màn hình, sóng âm Waveform 36 cột, lặp bài, xáo bài.
13. **Feed**: Bảng tin âm nhạc và bài đăng của nghệ sĩ.
14. **Feed Comments**: Bottom sheet thảo luận và bình luận lồng nhau.
15. **My Library**: Thư viện cá nhân (Liked Songs, Nghệ sĩ theo dõi).
16. **My Playlists**: Quản lý các danh sách phát cá nhân và tạo mới.

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

* **Frontend:** React Native, TypeScript, Expo SDK 58, expo-status-bar, SafeAreaView, Vector Icons.
* **Backend:** Node.js, Express.js, Mongoose ODM, CORS, Dotenv.
* **Database:** MongoDB Atlas (Cloud Cluster 24/7).
* **Audio Engine:** Kiến trúc Web Audio Context / React Native Audio State mô phỏng thời gian thực.
