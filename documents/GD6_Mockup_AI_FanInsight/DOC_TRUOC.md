# Giai đoạn 6 – Mockup AI Fan Insight (Gemini, bản 3)

- **index.html**: mở bằng trình duyệt. Gồm chức năng, sơ đồ luồng chạy của AI, màn hình, ví dụ dữ liệu gửi cho Gemini / kết quả nhận về, phần máy chủ và câu hỏi cần xác nhận.
- **man_hinh/**: ảnh PNG từng màn.
  - `S1`: Artist Studio – mục AI Fan Insight hết mờ.
  - `I1`: chưa có phân tích – nút Generate insight.
  - `I2`: đang phân tích – các bước máy chủ đang làm.
  - `I3`, `I4`: kết quả – tóm tắt, cảm xúc, chủ đề, bài nổi bật, gợi ý hành động.
  - `I5`: chưa đủ bình luận.
  - `I6`: bản tóm tắt cơ bản khi AI lỗi / chưa có API key.
  - `I7`: bảng giải thích cách hoạt động.
  - `I8`: hết 3 lượt miễn phí – mua thêm lượt.
  - `I9`: xác nhận thanh toán $3.
  - `I10`: thanh toán xong, tự chạy phân tích.
  - `00_TongQuan_toan_trang.png`: ảnh chụp toàn bộ trang.

Bản 3: kết quả tiếng Việt, mua thêm lượt $3, 1 câu nhận xét chung thay cho trích dẫn. Bản 2: đổi AI từ Claude sang Google Gemini (gói miễn phí), key `GEMINI_API_KEY_INSIGHT` trong `server/.env`. Đây chỉ là bản thiết kế, chưa có code.
