/**
 * Security Extension — Detector Content Script
 * Phát hiện password field và hiển thị cảnh báo Blue Team.
 * Đây là vai trò của defender — hoàn toàn tách biệt với attacker.
 */
(function () {
  "use strict";

  const passwordField = document.querySelector('input[type="password"]');
  if (!passwordField) return;

  // Inject security warning banner
  if (document.getElementById('__secanalyzer_banner__')) return;

  const banner = document.createElement('div');
  banner.id = '__secanalyzer_banner__';
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
    'background:#0a1628', 'border-bottom:3px solid #1565c0',
    'color:#e0e0e0', 'font-family:monospace', 'font-size:13px',
    'padding:10px 16px', 'display:flex', 'align-items:flex-start',
    'gap:12px', 'box-shadow:0 2px 12px rgba(0,0,0,0.6)'
  ].join(';');

  banner.innerHTML = `
    <span style="font-size:20px;flex-shrink:0;margin-top:2px;">🛡️</span>
    <div style="flex:1;">
      <strong style="color:#64b5f6;font-size:14px;">Security Analyzer — Warning</strong><br/>
      This page contains a <strong>password field</strong>.
      Any installed extension with <code>&lt;all_urls&gt;</code> permission can silently read this input.<br/>
      <span style="color:#f0a500;">
        ● Sensitive field detected: <strong>Yes</strong> &nbsp;|&nbsp;
        Advice: Check <code>chrome://extensions</code> and remove unknown extensions before entering credentials.
      </span>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;">✕</button>
  `;

  document.body.appendChild(banner);
})();
