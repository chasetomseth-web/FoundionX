(function () {
  'use strict';

  // ─── Configuration ─────────────────────────────────────────────────────────
  var API_URL = window.__VISITOR_API_URL || 'http://localhost:4000';
  var HEARTBEAT_INTERVAL = 15000; // 15 seconds
  var SESSION_KEY = '__visitor_session_id';

  // ─── Generate anonymous session ID ─────────────────────────────────────────
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ─── Get or create session ID ──────────────────────────────────────────────
  function getSessionId() {
    var stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    var id = generateUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  }

  var SESSION_ID = getSessionId();
  var heartbeatTimer = null;

  // ─── Send event to API ─────────────────────────────────────────────────────
  function sendEvent(type, extraData) {
    var payload = {
      anonymous_id: SESSION_ID,
      type: type,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata: extraData || {},
    };

    // Use sendBeacon for reliability on page unload
    if (type === 'session_end' && navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(API_URL + '/event', blob);
    } else {
      fetch(API_URL + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
        // Silently fail — don't break the page
      });
    }
  }

  // ─── Track identify (email capture) ────────────────────────────────────────
  window.__identifyVisitor = function (email) {
    var payload = {
      session_id: SESSION_ID,
      email: email,
    };

    fetch(API_URL + '/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () {
      // Silently fail
    });
  };

  // ─── Heartbeat (keeps session alive) ───────────────────────────────────────
  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(function () {
      sendEvent('page_view', { heartbeat: true });
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // ─── Page lifecycle ────────────────────────────────────────────────────────
  function onPageLoad() {
    sendEvent('session_start');
    sendEvent('page_view');
    startHeartbeat();
  }

  function onPageUnload() {
    stopHeartbeat();
    sendEvent('session_end');
  }

  // ─── History API tracking (SPA navigation) ─────────────────────────────────
  var lastUrl = window.location.href;
  function checkUrlChange() {
    var currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      sendEvent('page_view', { navigation: 'spa' });
    }
  }

  // Patch pushState/replaceState for SPA routing
  (function () {
    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      checkUrlChange();
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      checkUrlChange();
    };
  })();

  window.addEventListener('popstate', checkUrlChange);

  // ─── Initialize ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageLoad);
  } else {
    onPageLoad();
  }

  window.addEventListener('beforeunload', onPageUnload);
  window.addEventListener('pagehide', onPageUnload);

  // Expose for debugging
  window.__visitorSessionId = SESSION_ID;
})();