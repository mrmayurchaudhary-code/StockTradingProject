'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS ALERTS MANAGER
   Simulates & manages notifications for breakout triggers.
   ============================================================ */

window.BreakoutKingsAlerts = (() => {

  let _alerts = [];

  const init = () => {
    _alerts = JSON.parse(localStorage.getItem('bk_alerts_history') || '[]');
    renderLogs();
    
    // Wire UI Config handlers
    document.getElementById('bk_alert_telegram')?.addEventListener('change', (e) => {
      const el = document.getElementById('bk_telegram_config');
      if (el) el.style.display = e.target.checked ? 'flex' : 'none';
    });
    
    document.getElementById('bk_alert_email')?.addEventListener('change', (e) => {
      const el = document.getElementById('bk_email_config');
      if (el) el.style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('bk_clear_alerts_btn')?.addEventListener('click', () => {
      _alerts = [];
      localStorage.setItem('bk_alerts_history', '[]');
      renderLogs();
      if (window.AppState && typeof window.AppState.toast === 'function') {
        window.AppState.toast('Alerts log cleared', 'info');
      }
    });
  };

  const processScanResult = (result) => {
    if (!result) return;
    
    const { symbol, score, volRatio, price, category, details } = result;
    const timeStr = new Date().toLocaleTimeString();

    // Check triggers
    // 1. Breakout King (Score >= 85)
    if (score >= 85) {
      triggerAlert({
        id: `king-${symbol}-${Date.now()}`,
        symbol,
        type: 'king',
        title: '👑 Breakout King Detected!',
        body: `${symbol} scored ${score}/100 and classified as a Breakout King! Price: ₹${price.toFixed(2)}, Vol Ratio: ${volRatio.toFixed(1)}x.`,
        timestamp: timeStr
      });
    }

    // 2. New 50-Day Breakout
    else if (details.breakout50d) {
      triggerAlert({
        id: `brk-${symbol}-${Date.now()}`,
        symbol,
        type: 'king', // Use king class for styling
        title: '🚀 50-Day Breakout',
        body: `${symbol} broke above its previous 50-Day High of ₹${result.high50d.toFixed(2)}! Close: ₹${price.toFixed(2)}.`,
        timestamp: timeStr
      });
    }

    // 3. Volume Ratio > 3
    if (volRatio > 3) {
      triggerAlert({
        id: `vol-${symbol}-${Date.now()}`,
        symbol,
        type: 'vol',
        title: '🔥 Volume Explosion',
        body: `${symbol} volume expanded to ${volRatio.toFixed(1)}x its 20-day average! Close: ₹${price.toFixed(2)}.`,
        timestamp: timeStr
      });
    }
  };

  const triggerAlert = (alert) => {
    // Prevent duplicate alerts in the current list
    if (_alerts.some(a => a.symbol === alert.symbol && a.title === alert.title)) return;

    _alerts.unshift(alert);
    if (_alerts.length > 50) _alerts.pop(); // Cap history at 50
    localStorage.setItem('bk_alerts_history', JSON.stringify(_alerts));
    renderLogs();

    // Dispatch via active channels
    const inapp = document.getElementById('bk_alert_inapp')?.checked;
    const telegram = document.getElementById('bk_alert_telegram')?.checked;
    const email = document.getElementById('bk_alert_email')?.checked;
    const push = document.getElementById('bk_alert_push')?.checked;

    if (inapp && window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast(`${alert.title}: ${alert.symbol}`, 'warning');
      window.AppState.addNotification('warning', alert.title, `${alert.symbol} — ${alert.body}`);
    }

    if (telegram) {
      const token = document.getElementById('bk_tg_token')?.value;
      const chatid = document.getElementById('bk_tg_chatid')?.value;
      sendTelegramAlert(alert, token, chatid);
    }

    if (email) {
      const emailAddr = document.getElementById('bk_email_address')?.value;
      sendEmailAlert(alert, emailAddr);
    }

    if (push) {
      sendPushNotification(alert);
    }
  };

  const sendTelegramAlert = (alert, token, chatid) => {
    const text = `*${alert.title}*\n${alert.body}\nTimestamp: ${alert.timestamp}`;
    if (!token || !chatid) {
      console.warn(`[BreakoutKings] Telegram not configured for ${alert.symbol}`);
      return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatid,
        text: text,
        parse_mode: 'Markdown'
      })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[BreakoutKings] Telegram alert sent for ${alert.symbol}`);
    })
    .catch(err => {
      console.error(`[BreakoutKings] Telegram send failed:`, err);
    });
  };

  const sendEmailAlert = (alert, emailAddr) => {
    if (!emailAddr) {
      console.warn(`[BreakoutKings] Email recipient address not provided`);
      return;
    }
    // Simulate SMTP delivery logs
    console.log(`[BreakoutKings] ✉️ Simulating SMTP delivery to ${emailAddr}:
Subject: ${alert.title} for ${alert.symbol}
Body: ${alert.body} (Sent via Samadhan Mailer Service)`);
  };

  const sendPushNotification = (alert) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: `${alert.symbol} — ${alert.body}`,
        icon: '/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(alert.title, {
            body: `${alert.symbol} — ${alert.body}`
          });
        }
      });
    }
  };

  const renderLogs = () => {
    const container = document.getElementById('bk_alerts_log');
    if (!container) return;
    
    if (_alerts.length === 0) {
      container.innerHTML = `<div class="bk-log-empty">No alerts triggered yet. Deploy scan to detect breakout setups.</div>`;
      return;
    }

    container.innerHTML = _alerts.map(a => {
      const typeClass = a.type || 'king';
      return `<div class="bk-alert-item ${typeClass}">
        <div class="bk-alert-header">
          <span style="color:var(--text-primary);">${FMT.escHtml(a.title)}</span>
          <span class="bk-alert-time">${FMT.escHtml(a.timestamp)}</span>
        </div>
        <div class="bk-alert-body">${FMT.escHtml(a.body)}</div>
      </div>`;
    }).join('');
  };

  return {
    init,
    processScanResult,
    triggerAlert
  };

})();
