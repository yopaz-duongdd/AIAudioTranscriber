# Trình Ghi Âm và Chuyển Đổi Giọng Nói AI (AI Audio Transcriber)

Đây là một ứng dụng web đơn giản được xây dựng bằng Vue.js 3 và API Google Gemini để thực hiện việc chuyển đổi giọng nói thành văn bản trong thời gian thực. Người dùng có thể nói vào microphone và xem bản ghi văn bản xuất hiện ngay lập tức trên màn hình.

## ✨ Tính năng

- **Chuyển đổi thời gian thực**: Sử dụng API Gemini Live để nhận dạng và chuyển đổi giọng nói ngay khi bạn đang nói.
- **Giao diện tối giản**: Giao diện người dùng sạch sẽ, hiện đại với một nút duy nhất để bắt đầu và dừng ghi âm.
- **Phản hồi trực quan**: Cung cấp trạng thái rõ ràng (ví dụ: "Đang nghe...", "Đang kết nối...") và hiệu ứng động để người dùng biết ứng dụng đang hoạt động.
- **Quản lý bản ghi**: Dễ dàng sao chép toàn bộ nội dung bản ghi vào clipboard hoặc xóa nó chỉ bằng một cú nhấp chuột.
- **Thiết kế đáp ứng (Responsive)**: Hoạt động tốt trên cả máy tính để bàn và thiết bị di động.
- **Không cần cài đặt**: Chạy trực tiếp trên trình duyệt mà không cần bước build phức tạp.

## 🛠️ Công nghệ sử dụng

- **Frontend**: [Vue.js 3](https://vuejs.org/) (thông qua CDN)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (thông qua CDN)
- **API**: [Google Gemini API](https://ai.google.dev/docs/gemini_api_overview) (`@google/genai`)
- **Audio Processing**: Web Audio API

## 🚀 Cài đặt và Chạy

Ứng dụng này được thiết kế để chạy mà không cần quá trình build phức tạp.

**Yêu cầu:**

1.  Một **API Key** từ Google AI Studio.
2.  Một trình duyệt web hiện đại hỗ trợ Web Audio API (Chrome, Firefox, Edge, Safari).

**Các bước để chạy:**

1.  **Thiết lập API Key:**
    Ứng dụng này được cấu hình để đọc API Key từ biến môi trường `process.env.API_KEY`. Khi chạy trong các môi trường được hỗ trợ như Google AI Studio, key này sẽ được tự động cung cấp.

2.  **Mở ứng dụng:**
    Bạn chỉ cần mở file `index.html` trong trình duyệt của mình. Để có trải nghiệm tốt nhất và tránh các vấn đề tiềm ẩn liên quan đến CORS, bạn nên phục vụ các file này thông qua một máy chủ web cục bộ.

## 📁 Cấu trúc File

```
.
├── index.html          # File HTML chính, chứa cấu trúc và điểm gắn kết cho Vue
├── index.js            # Logic chính của ứng dụng Vue.js
├── utils/
│   └── audio.js        # Các hàm tiện ích để xử lý dữ liệu âm thanh
└── readme.md           # File này
```

---

Được phát triển bởi **Duongdd**.
