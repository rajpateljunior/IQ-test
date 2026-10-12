/* =====================================================================
   IQ Test — app.js
   Boot: load save, apply theme, build the shell, handle challenge
   links (#ch=...), register the service worker for offline play.
   ===================================================================== */
'use strict';
(function () {
  IQ.load();
  IQ.applyTheme();
  IQ.ui.mount();
  IQ.applyTheme();

  const ch = IQ.ui.parseChallenge(location.hash);
  if (ch) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    IQ.ui.go('challenge', ch);
  } else {
    IQ.ui.go('home');
  }
  window.addEventListener('hashchange', () => {
    const c = IQ.ui.parseChallenge(location.hash);
    if (c && !document.body.classList.contains('running')) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
      IQ.ui.go('challenge', c);
    }
  });

  // iOS: unlock audio on the first touch anywhere
  const unlock = () => { IQ.audio.unlock(); document.removeEventListener('touchstart', unlock); };
  document.addEventListener('touchstart', unlock, { passive: true });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
