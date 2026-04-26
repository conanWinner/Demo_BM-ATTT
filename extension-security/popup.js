// Security Analyzer — Popup Script
// Sử dụng chrome.management API để liệt kê và phân tích các extension đang cài

(function () {
  "use strict";

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      var target = document.getElementById('tab-' + btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Risk scoring logic
  function scoreExtension(ext) {
    var score = 0;
    var reasons = [];
    var perms = ext.permissions || [];
    var hostPerms = ext.hostPermissions || [];

    if (hostPerms.some(function (h) { return h === '<all_urls>' || h === '*://*/*'; })) {
      score += 40; reasons.push('<all_urls> (+40)');
    }
    if (perms.indexOf('scripting') !== -1) {
      score += 25; reasons.push('scripting (+25)');
    }
    if (hostPerms.length > 3 && !hostPerms.some(function (h) { return h === '<all_urls>'; })) {
      score += 10; reasons.push('host_permissions rộng (+10)');
    }
    if (perms.indexOf('storage') !== -1) {
      score += 10; reasons.push('storage (+10)');
    }
    if (ext.type === 'extension' && perms.indexOf('background') !== -1) {
      score += 10; reasons.push('background (+10)');
    }

    var level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    var levelText = score >= 70 ? 'HIGH RISK' : score >= 40 ? 'MEDIUM RISK' : 'LOW RISK';
    return { score: score, level: level, levelText: levelText, reasons: reasons };
  }

  function renderExtensions(extensions) {
    var container = document.getElementById('ext-list');
    if (!extensions || extensions.length === 0) {
      container.innerHTML = '<div style="color:#7090b0;font-size:12px;padding:20px;text-align:center;">Không tìm thấy extension nào.</div>';
      return;
    }

    // Filter out this extension itself and Chrome built-ins
    var filtered = extensions.filter(function (e) {
      return e.type === 'extension' && e.enabled && e.name !== 'Security Analyzer';
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="color:#4caf50;font-size:12px;padding:20px;text-align:center;">✅ Không phát hiện extension đáng ngờ nào khác.</div>';
      return;
    }

    container.innerHTML = '';
    filtered.forEach(function (ext) {
      var result = scoreExtension(ext);
      var item = document.createElement('div');
      item.className = 'ext-item' + (result.level === 'low' ? ' safe' : '');

      var badgeClass = result.level === 'high' ? 'badge-high' : result.level === 'medium' ? 'badge-high' : 'badge-low';
      var permsText = (ext.permissions || []).concat(ext.hostPermissions || []).slice(0, 4).join(', ');

      item.innerHTML = [
        '<div class="ext-name">' + ext.name + ' <span class="' + badgeClass + '">' + result.levelText + '</span></div>',
        '<div class="ext-score" style="color:' + (result.level === 'high' ? '#e94560' : result.level === 'medium' ? '#f0a500' : '#4caf50') + '">',
        'Risk Score: <strong>' + result.score + '/100</strong>',
        result.reasons.length ? ' — ' + result.reasons.join(', ') : '',
        '</div>',
        '<div class="ext-perms">Permissions: ' + (permsText || 'none') + '</div>'
      ].join('');

      container.appendChild(item);
    });
  }

  // Load extensions using chrome.management API
  if (typeof chrome !== 'undefined' && chrome.management) {
    chrome.management.getAll(function (extensions) {
      renderExtensions(extensions);
    });
  } else {
    document.getElementById('ext-list').innerHTML =
      '<div style="color:#f0a500;font-size:12px;padding:20px;text-align:center;">⚠ chrome.management API không khả dụng.<br/>Cần quyền "management" trong manifest.</div>';
  }
})();
