// Extension Popup — Blue Team UI
// Requirements: 1.5 — Browser compatibility check

if (typeof chrome === "undefined" || !chrome.storage) {
  const banner = document.createElement("div");
  banner.style.cssText = "background:#ff8800;color:#fff;text-align:center;padding:10px;font-weight:bold;font-size:12px;";
  banner.textContent = "⚠ Trình duyệt không tương thích. Chỉ hỗ trợ Chrome/Edge/Brave.";
  document.body.insertBefore(banner, document.body.firstChild);
}

const STORAGE_KEY = "active";

const demoStatus = document.getElementById("demoStatus") as HTMLSpanElement;
const toggleBtn = document.getElementById("toggleBtn") as HTMLButtonElement;
const protectionBar = document.getElementById("protectionBar") as HTMLDivElement;
const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const tabContents = document.querySelectorAll<HTMLDivElement>(".tab-content");

function updateUI(isActive: boolean): void {
  if (isActive) {
    // Attack mode — keylogger running
    demoStatus.textContent = "Demo Mode: Active 🔴";
    demoStatus.className = "active";
    toggleBtn.textContent = "Enable Protection Mode";
    toggleBtn.className = "btn-protect";
    protectionBar.className = "protection-bar mode-attack";
  } else {
    // Protection mode — keylogger stopped
    demoStatus.textContent = "Protection Mode: ON 🟢";
    demoStatus.className = "inactive";
    toggleBtn.textContent = "Disable Protection Mode";
    toggleBtn.className = "btn-attack";
    protectionBar.className = "protection-bar mode-protect";
  }
}

function loadState(): void {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const isActive: boolean = result[STORAGE_KEY] !== false;
    updateUI(isActive);
  });
}

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const current: boolean = result[STORAGE_KEY] !== false;
    const next = !current;
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
      updateUI(next);
    });
  });
});

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset["tab"];
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    const targetContent = document.getElementById(`tab-${targetTab}`);
    if (targetContent) targetContent.classList.add("active");
  });
});

if (typeof chrome !== "undefined" && chrome.storage) {
  loadState();
}
