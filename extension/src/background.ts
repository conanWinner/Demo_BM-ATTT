/**
 * Background Service Worker (Manifest V3)
 * Minimal service worker — no active logic needed for this demo.
 * Requirements: 1.1, 1.5
 */

// Browser compatibility check — Requirements: 1.5
// In a Manifest V3 service worker, `chrome` should always be defined in Chromium.
// This guard is a safety net in case the script somehow runs in a non-Chromium context.
if (typeof chrome === "undefined" || !chrome.storage || !chrome.scripting) {
  console.warn(
    "[Security Demo Extension] Trình duyệt không tương thích. Extension này chỉ hoạt động trên các trình duyệt Chromium-based (Chrome, Edge, Brave). Vui lòng sử dụng Chrome phiên bản mới nhất."
  );
}

export {};
