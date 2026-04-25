# Security Demo Extension

> **Công cụ demo giáo dục** cho môn Bảo mật và An toàn Thông tin.  
> Mô phỏng kịch bản Red Team (tấn công) và Blue Team (phòng thủ) thông qua Chrome extension.  
> **Chỉ hoạt động trên localhost — không bao giờ nhắm vào trang web thật.**

---

## Cấu trúc dự án

```
Extension_demo/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   ├── content-script.js  # Script inject vào trang web
│   └── src/
│       ├── content.ts
│       ├── popup.ts
│       └── background.ts
└── server/                 # Local Server (Node.js + Express)
    ├── src/
│   └── index.ts
    └── public/
        ├── dashboard.html  # Attack Dashboard
        └── demo.html       # Trang giả lập nạn nhân
```

---

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- Chrome, Edge hoặc Brave (Chromium-based)

---

## Cách chạy dự án

### Bước 1 — Cài dependencies cho server

```powershell
cd server
npm install
```

### Bước 2 — Khởi động Local Server

```powershell
npx ts-node src/index.ts
```

Server chạy tại `http://127.0.0.1:3000`. Giữ terminal này mở trong suốt quá trình demo.

### Bước 3 — Cài dependencies cho extension

Mở terminal mới:

```powershell
cd extension
npm install
```

### Bước 4 — Build extension

```powershell
npx tsc
```

### Bước 5 — Load extension vào Chrome

1. Mở Chrome, vào `chrome://extensions`
2. Bật **Developer mode** (toggle góc trên phải)
3. Click **Load unpacked**
4. Chọn thư mục `Extension_demo/extension`
5. Extension xuất hiện trong danh sách là thành công

---

## Demo Red Team (Tấn công)

Red Team minh họa cách một extension độc hại có thể đánh cắp thông tin đăng nhập mà người dùng không hay biết.

### Các bước demo

1. Mở **Attack Dashboard** tại `http://127.0.0.1:3000`
2. Mở tab mới, vào **Demo Page** tại `http://127.0.0.1:3000/demo.html`
3. Nhập username và password bất kỳ vào form đăng nhập
4. Chuyển sang tab Attack Dashboard — dữ liệu xuất hiện trong vòng 500ms

### Những gì xảy ra phía sau

| Bước | Mô tả |
|------|-------|
| Extension inject | Content script tự động chạy khi trang localhost được mở |
| Keylogging | Mỗi lần gõ phím vào ô password được ghi lại |
| Submit capture | Khi bấm "Đăng nhập", cả username lẫn password được gửi về server |
| Real-time update | Server đẩy dữ liệu qua SSE, dashboard cập nhật ngay lập tức |

### Điểm nhấn cho sinh viên

- Extension hoạt động **hoàn toàn ẩn** — không có UI nào xuất hiện trên trang nạn nhân
- URL vẫn là `http://` — HTTPS **không bảo vệ** bạn khỏi extension độc hại
- Dữ liệu bị đánh cắp **theo thời gian thực**, không cần đợi người dùng submit form

---

## Demo Blue Team (Phòng thủ)

Blue Team hướng dẫn cách nhận biết và phòng chống extension độc hại.

### Các bước demo

1. Click vào **icon extension** trên thanh toolbar Chrome
2. Popup hiện ra với 2 tab: **Quyền hạn** và **Phòng thủ**

### Tab Quyền hạn

Giải thích mức độ nguy hiểm của từng permission extension đang dùng:

| Permission | Mức độ | Ý nghĩa |
|------------|--------|---------|
| `<all_urls>` | 🔴 Cao | Đọc và thay đổi nội dung trên MỌI trang web |
| `scripting` | 🔴 Cao | Chèn và chạy JavaScript tùy ý vào trang web |
| `activeTab` | 🟡 Trung bình | Truy cập tab đang mở khi người dùng tương tác |
| `storage` | 🟡 Trung bình | Lưu trữ dữ liệu trên trình duyệt |

**Bài học rút ra** — Dấu hiệu nhận biết extension độc hại:
- Yêu cầu quyền `<all_urls>` hoặc `scripting` không cần thiết cho chức năng của nó
- Không có trên Chrome Web Store chính thức, được cài từ file `.crx`
- Số lượt cài đặt thấp, không có đánh giá, nhà phát triển ẩn danh
- Yêu cầu nhiều quyền hơn chức năng thực sự cần

### Tab Phòng thủ

Hướng dẫn bật **Enhanced Safe Browsing**:

1. Mở Chrome → gõ `chrome://settings/security` vào thanh địa chỉ
2. Tìm mục **Safe Browsing**
3. Chọn **Enhanced protection**

| Tiêu chí | Standard | Enhanced |
|----------|----------|----------|
| Kiểm tra URL | Danh sách cục bộ | Thời gian thực với Google |
| Phát hiện extension độc hại | Hạn chế | Cảnh báo trước khi cài |
| Mức độ bảo vệ | Trung bình | Cao hơn ~2x |

**Biện pháp phòng thủ bổ sung:**
- Chỉ cài extension từ Chrome Web Store chính thức
- Kiểm tra số lượt cài đặt và đánh giá trước khi cài
- Định kỳ vào `chrome://extensions` xóa extension không dùng
- Dùng Chrome profile riêng (không cài extension) cho tác vụ ngân hàng

### Toggle Active/Inactive

Trong popup, bấm nút **"Tắt Demo"** → keylogger dừng ngay lập tức → gõ password trên demo page → không có gì xuất hiện trên dashboard. Đây là điểm demo trực quan nhất cho Blue Team.

---

## Lưu ý quan trọng

> ⚠️ **Extension này chỉ dùng cho mục đích giáo dục.**  
> Không cài trên trình duyệt cá nhân dùng hàng ngày.  
> Toàn bộ dữ liệu chỉ lưu trong bộ nhớ RAM, mất khi server dừng.  
> Extension chỉ inject vào `http://localhost/*` và `http://127.0.0.1/*`.
