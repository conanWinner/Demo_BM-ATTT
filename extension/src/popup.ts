// Extension Popup — Blue Team UI
// Handles: tab switching, Demo Mode toggle (Active/Inactive)
// Requirements: 1.5 — Browser compatibility check

// Show incompatibility warning if Chrome APIs are not available
if (typeof chrome === "undefined" || !chrome.storage) {
  const incompatBanner = document.createElement("div");
  incompatBanner.id = "incompatibility-banner";
  incompatBanner.style.cssText =
    "background:#ff8800;color:#fff;text-align:center;padding:10px 12px;font-weight:bold;font-size:12px;";
  incompatBanner.textContent =
    "⚠ Trình duyệt không tương thích. Extension này chỉ hoạt động trên Chrome, Edge hoặc Brave (Chromium-based).";
  document.body.insertBefore(incompatBanner, document.body.firstChild);
}

const STORAGE_KEY = "active";

// --- DOM references ---
const demoStatus = document.getElementById("demoStatus") as HTMLSpanElement;
const toggleBtn = document.getElementById("toggleBtn") as HTMLButtonElement;
const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const tabContents = document.querySelectorAll<HTMLDivElement>(".tab-content");

// --- Helpers ---

function updateUI(isActive: boolean): void {
  if (isActive) {
    demoStatus.textContent = "Demo Mode: Active";
    demoStatus.className = "active";
    toggleBtn.textContent = "Tắt Demo";
    toggleBtn.className = "inactive"; // button shows action to take (deactivate)
  } else {
    demoStatus.textContent = "Demo Mode: Inactive";
    demoStatus.className = "inactive";
    toggleBtn.textContent = "Bật Demo";
    toggleBtn.className = "active"; // button shows action to take (activate)
  }
}

// --- Load current state from chrome.storage.local ---

function loadState(): void {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    // Default to true (Active) if key not set
    const isActive: boolean = result[STORAGE_KEY] !== false;
    updateUI(isActive);
  });
}

// --- Toggle button handler ---

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const current: boolean = result[STORAGE_KEY] !== false;
    const next = !current;
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
      updateUI(next);
    });
  });
});

// --- Tab switching ---

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset["tab"];

    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");

    const targetContent = document.getElementById(`tab-${targetTab}`);
    if (targetContent) {
      targetContent.classList.add("active");
    }
  });
});

// --- Init ---
if (typeof chrome !== "undefined" && chrome.storage) {
  loadState();
}
