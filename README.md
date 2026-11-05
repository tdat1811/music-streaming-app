# 🎵 Music Streaming App - React Native (Expo + TypeScript)

Ứng dụng nghe nhạc trực tuyến (Music Streaming App) được xây dựng bằng **React Native**, **TypeScript** và **Expo**, tái tạo chính xác 100% giao diện, bố cục, màu sắc và tài nguyên từ tài liệu thiết kế chuẩn.

---

## 📱 Danh sách 13 Màn hình đã hoàn thiện

Ứng dụng bao gồm đầy đủ **13 màn hình** theo đúng bộ tài nguyên mẫu:

1. **Launch Screen**: Màn hình chào mừng ban đầu với hình nền nghệ thuật, logo âm sóng và các nút đăng ký / đăng nhập.
2. **Launch Screen - Premium**: Màn hình giới thiệu gói Premium với hiệu ứng ánh sáng neon và chuyển trang carousel.
3. **Subscription Plans**: Bảng so sánh các gói cước thành viên (Premium \$12.99/tháng), checklist đặc quyền và nút đăng ký.
4. **Home - Audio Listing**: Trang chủ hiển thị lời chào theo tên người dùng, thanh tìm kiếm nhanh, các mục *Suggestions for you*, *Charts* (Top 50), *Trending albums*, *Popular artists*.
5. **Search Audio**: Màn hình tìm kiếm với từ khóa gợi ý và bàn phím mô phỏng theo mẫu.
6. **Audio Listing - Search Results**: Kết quả tìm kiếm với các tab phân loại (*All, Tracks, Albums, Artists*), thẻ nghệ sĩ có nút Follow và danh sách bài hát chi tiết.
7. **Feed - Audio Listing**: Bảng tin âm nhạc hiển thị bài đăng của nghệ sĩ với huy hiệu verified, hình ảnh đĩa/băng cassette và số liệu lượt nghe, tương tác.
8. **Feed - Comment on an Audio**: Bottom sheet hiển thị bình luận, các câu trả lời lồng nhau (@mention), nút like và thanh nhập bình luận kèm emoji.
9. **My Library**: Thư viện cá nhân với các tag (*Playlists, Songs, Albums, Artists*): playlist riêng của tài khoản, bài hát yêu thích và nghệ sĩ đang theo dõi.
10. **My Playlists**: Đã gộp vào tag *Playlists* của My Library, gồm danh sách playlist của tài khoản và nút nổi (FAB) tạo playlist mới.
11. **Playlist Details - Audio Listing**: Chi tiết danh sách phát (Top 50 Canada) kèm thanh phát nhạc thu nhỏ (**Mini Player Bar**) cố định phía trên thanh điều hướng.
12. **Artist Profile**: Trang thông tin nghệ sĩ (Ryan Young) với lượng người theo dõi, các ca khúc phổ biến nhất, album đã phát hành, phần giới thiệu ban nhạc (*About*) và các nghệ sĩ tương tự (*Fans also like*).
13. **Play an Audio**: Màn hình phát nhạc toàn màn hình với ảnh nền concert, visualizer sóng âm thanh (Audio Waveform), thanh thời lượng thực, các nút điều khiển phát nhạc và tương tác.

---

## 🛠️ Công nghệ sử dụng

- **React Native** (v0.88+)
- **TypeScript**
- **Expo** (SDK 58+)
- **@expo/vector-icons** (Ionicons, Feather, MaterialCommunityIcons)
- **react-native-safe-area-context**
- **StyleSheet** (Tối ưu giao diện chuẩn native)

---

## 📁 Cấu trúc thư mục dự án

```text
├── app/
│   ├── Navigation.tsx                  # Điều hướng chính giữa các màn hình & lưu lịch sử
│   └── screens/                        # 13 màn hình giao diện
│       ├── LaunchScreen.tsx
│       ├── LaunchScreenPremium.tsx
│       ├── SubscriptionPlansScreen.tsx
│       ├── HomeScreen.tsx
│       ├── SearchAudioScreen.tsx
│       ├── SearchResultsScreen.tsx
│       ├── FeedScreen.tsx
│       ├── FeedCommentsScreen.tsx
│       ├── MyLibraryScreen.tsx
│       ├── PlaylistDetailsScreen.tsx
│       ├── ArtistProfileScreen.tsx
│       └── PlayAudioScreen.tsx
├── src/
│   ├── components/
│   │   ├── BottomTabBar.tsx            # Thanh điều hướng dưới đáy (Home, Search, Feed, Library)
│   │   ├── MiniPlayer.tsx              # Thanh phát nhạc thu nhỏ
│   │   ├── SongItem.tsx                # Component hàng bài hát tái sử dụng
│   │   └── ScreenSwitcher.tsx          # Menu nổi chuyển nhanh trực tiếp đến 13 màn hình
│   ├── constants/
│   │   ├── images.ts                   # Định nghĩa và import toàn bộ hình ảnh
│   │   └── theme.ts                    # Bảng màu, typography và khoảng cách dùng chung
│   └── data/
│       └── musicData.ts                # Dữ liệu mẫu (bài hát, album, nghệ sĩ, bình luận)
├── assets/images/                      # Toàn bộ tài nguyên ảnh trích xuất từ mẫu
├── App.tsx                             # Điểm khởi chạy ứng dụng
├── .gitignore                          # Đã cấu hình bỏ qua node_modules, build & file rác
└── package.json
```

---

## 🚀 Hướng dẫn cài đặt và khởi chạy

### 1. Yêu cầu môi trường
- Đã cài đặt **Node.js** (khuyến nghị phiên bản 18+ hoặc 20+).
- Đã cài đặt ứng dụng **Expo Go** trên điện thoại (tải từ Google Play hoặc App Store) nếu muốn chạy thử trên thiết bị thật.

### 2. Cài đặt dependencies
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 3. Khởi chạy ứng dụng
Khởi động Expo Development Server:
```bash
npx expo start
```

Sau khi terminal hiển thị mã QR:
- **Trên điện thoại Android/iOS thật**: Mở ứng dụng **Expo Go** và quét mã QR trên màn hình terminal.
- **Trên Android Emulator**: Nhấn phím `a` trên bàn phím.
- **Trên iOS Simulator (macOS)**: Nhấn phím `i` trên bàn phím.
- **Trên trình duyệt Web**: Nhấn phím `w` trên bàn phím.

---

## ⚡ Tiện ích kiểm thử: Trình chuyển màn hình nhanh (Screen Switcher)

Để tiện cho việc chấm điểm và review từng giao diện:
- Mọi màn hình đều có các nút chuyển trang tự nhiên theo luồng người dùng (bấm bài hát ra màn Play, bấm nghệ sĩ ra Profile, bấm bình luận ra Bottom Sheet,...).
- Đồng thời, ở góc dưới màn hình luôn có nút nổi **`Screens (13)`**. Bạn chỉ cần bấm vào nút này là có thể chọn và mở ngay lập tức bất kỳ màn hình nào trong số 13 màn hình mẫu.

---

## 📤 Hướng dẫn đẩy mã nguồn lên GitHub

Dự án đã được cấu hình sẵn file `.gitignore` để tự động loại bỏ các thư mục nặng như `node_modules/`, `.expo/`, và các file nén không cần thiết.

Để đưa dự án lên một kho lưu trữ GitHub mới:

1. **Tạo repository mới trên GitHub** (ví dụ đặt tên là `music-stream-app`, để chế độ Public hoặc Private tùy ý, **không** tick chọn tạo sẵn README hay .gitignore).
2. **Khởi tạo và commit code tại thư mục dự án**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete 13 screens for music streaming app"
   ```
3. **Liên kết với repository GitHub vừa tạo và đẩy lên**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
   git push -u origin main
   ```
*(Thay `<tai-khoan-cua-ban>` và `<ten-repo>` bằng đường dẫn thực tế trên GitHub của bạn).*
