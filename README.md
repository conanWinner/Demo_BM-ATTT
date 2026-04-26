# Demo Bảo Mật & An Toàn Thông Tin

> Dự án demo giáo dục mô phỏng kịch bản tấn công và phòng thủ thông qua Chrome Extension.  
> **Chỉ hoạt động trên localhost — không nhắm vào trang web thật.**

---

## Mô hình bảo mật

Dự án tách biệt hoàn toàn 2 vai trò:

```
🔴 ATTACKER                          🔵 DEFENDER
extension-malicious/                 extension-security/
  └── content.js                       └── detector.js
      (ẩn, không UI)                       (cảnh báo, phân tích)
         │                                        │
         │ inject vào Demo Page                   │ inject vào Demo Page
         ↓                                        ↓
    Keylog username                        Security Warning Banner
    + password                             Risk Score Analysis
         │
         │ POST /capture
         ↓
    Attack Dashboard
    (http://localhost:3000)
```

> **Insight cốt lõi:** Không có cơ chế nào trong trình duyệt có thể bảo vệ người dùng khỏi một extension mà họ đã cấp quyền toàn diện. Phòng thủ phải đến từ **nhận thức** và **công cụ giám sát bổ sung**.

---

## Cấu trúc dự án

```
Demo_BM-ATTT/
├── extension-malicious/     # 🔴 Red Team — Extension độc hại
│   ├── manifest.json        # Khai báo <all_urls>, scripting
│   ├── background.js
│   └── content.js           # Keylogger ẩn, không UI, không cảnh báo
│
├── extension-security/      # 🔵 Blue Team — Security Analyzer
│   ├── manifest.json        # Chỉ xin quyền localhost + management
│   ├── detector.js          # Phát hiện password field, hiển thị warning
│   ├── popup.html           # UI phân tích rủi ro
│   └── popup.js             # Risk scoring, chrome.management API
│
└── server/                  # Local Server (Node.js + Express)
    ├── src/
    │   └── index.ts         # API server, SSE
    └── public/
        ├── dashboard.html   # Attack Dashboard — hiển thị dữ liệu bị đánh cắp
        └── demo.html        # Trang giả lập nạn nhân (VietBank)
```

---

## Yêu cầu

- Node.js >= 18
- Chrome, Edge hoặc Brave (Chromium-based)

---

## Cách chạy

### 1. Khởi động Local Server

```powershell
cd server
npm install
npx ts-node src/index.ts
```

Server chạy tại `http://127.0.0.1:3000`. Giữ terminal này mở trong suốt demo.

### 2. Load extension vào Chrome

Mở Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked**:

| Extension | Thư mục cần chọn |
|-----------|-----------------|
| 🔴 Malicious (Red Team) | `extension-malicious/` |
| 🔵 Security Analyzer (Blue Team) | `extension-security/` |

---

## Demo Red Team — Tấn công

**Mục tiêu:** Minh họa extension độc hại hoạt động hoàn toàn ẩn, đánh cắp thông tin đăng nhập mà người dùng không hay biết.

### Các bước

1. Mở **Attack Dashboard**: `http://127.0.0.1:3000`
2. Mở tab mới: `http://127.0.0.1:3000/demo.html`
3. Nhập username và password bất kỳ → bấm **Đăng nhập**
4. Chuyển sang Attack Dashboard → dữ liệu xuất hiện trong vòng 500ms

### Điểm nhấn

| Đặc điểm | Mô tả |
|----------|-------|
| Hoàn toàn ẩn | Không có UI, không cảnh báo, không dấu hiệu nào trên trang nạn nhân |
| Real-time | Dữ liệu xuất hiện ngay khi gõ từng ký tự |
| HTTP không bảo vệ | URL `http://` không ngăn được extension đọc input |
| Capture đầy đủ | Ghi lại cả username lẫn password khi submit |

### Tại sao nguy hiểm?

Extension `extension-malicious` được đặt tên là **"VietBank Helper"** — trông như một tiện ích hợp lệ. Nó xin quyền `<all_urls>` và `scripting`, đủ để đọc mọi thứ bạn gõ trên bất kỳ trang web nào.

---

## Demo Blue Team — Phòng thủ

**Mục tiêu:** Minh họa cách một security extension độc lập có thể phát hiện và cảnh báo về extension độc hại.

### Các bước

1. Mở `http://127.0.0.1:3000/demo.html`
2. Security Analyzer tự động hiển thị **warning banner** màu xanh trên trang
3. Click vào **icon Security Analyzer** trên toolbar Chrome để mở popup phân tích

### Tính năng Security Analyzer

**Tab Extensions — Phân tích extension đang cài:**
- Liệt kê tất cả extension đang hoạt động
- Tự động chấm điểm rủi ro từng extension
- Phát hiện "VietBank Helper" với điểm **95/100 HIGH RISK**

**Tab Risk Score — Bảng điểm chi tiết:**

| Permission | Điểm rủi ro |
|------------|-------------|
| `<all_urls>` host permission | +40 |
| `scripting` | +25 |
| host_permissions rộng | +10 |
| `storage` | +10 |
| background service worker | +10 |
| **Tổng** | **95/100** |

**Tab Least Privilege — So sánh mức quyền:**

| Chế độ | Host Permission | Rủi ro |
|--------|----------------|--------|
| ✅ Minimal (đúng chuẩn) | `http://127.0.0.1:3000/*` | THẤP |
| ⚠️ Extended | `http://localhost/*` | THẤP |
| � Dangerous (đang dùng) | `<all_urls>` | CAO |

> **Principle of Least Privilege:** Extension chỉ cần quyền trên `localhost:3000` để demo, nhưng đang xin quyền trên toàn bộ internet — đây là dấu hiệu điển hình của extension độc hại.

**Tab Phòng thủ — Hướng dẫn thực tế:**
- Bật Enhanced Safe Browsing: `chrome://settings/security`
- So sánh Standard vs Enhanced protection
- Các biện pháp phòng thủ bổ sung

### Security Warning Banner

Khi mở trang có password field, Security Analyzer hiển thị banner:

```
🛡️ Security Analyzer — Warning
This page contains a password field.
Any installed extension with <all_urls> permission can silently read this input.
● Sensitive field detected: Yes | Advice: Check chrome://extensions
```

---

## Sự khác biệt giữa 2 extension

| | extension-malicious � | extension-security 🔵 |
|--|----------------------|----------------------|
| Vai trò | Attacker | Defender |
| UI | Không có | Popup + Warning Banner |
| Mục đích | Đánh cắp dữ liệu | Phân tích & cảnh báo |
| Host permission | `<all_urls>` | `localhost` only |
| Hoạt động | Ẩn hoàn toàn | Minh bạch với người dùng |
| Thực tế | Extension độc hại thật | Security tool / AV extension |

---

## Lưu ý

> ⚠️ **Chỉ dùng cho mục đích giáo dục.**  
> Không cài `extension-malicious` trên trình duyệt cá nhân dùng hàng ngày.  
> Toàn bộ dữ liệu chỉ lưu trong RAM, mất khi server dừng.
