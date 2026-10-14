/* =====================================================================
   IQ Test — update.js
   1) UPDATE BAR: when the app opens (and whenever it comes back to the
      front) it reads version.json from the internet, which the service
      worker never caches. If that names a different build than
      IQ.BUILD below, a bar says "New update available" with an Update
      button. It only shows on menus, never during a test. Tapping it
      saves, clears this app's cached files and reloads from the
      internet. Progress lives in localStorage, which is never touched.
   2) WHAT'S NEW: after an update, a popup lists the changes once.
   Offline, the check simply fails quietly.

   RELEASING: run  python3 tools/release.py <new-build>  which stamps
   the same build name into IQ.BUILD (here), version.json, the cache
   name in sw.js and the ?v= on every file in index.html. Then edit
   WHATS_NEW below. tests/version_check.js fails if they disagree.
   ===================================================================== */
'use strict';
(function () {
  IQ.BUILD = '2026.10.14a';
  // ===== Edit on every release (short lines, plain words) =====
  IQ.WHATS_NEW = [
    '<b>Answer keys:</b> every Quick Test, Daily Challenge and friend challenge now ends with an answer key. Tap any question to see the puzzle, your answer, the right answer and why.',
    '<b>Gym recap:</b> each Gym level ends with a list of every question you just played.',
    '<b>Updates:</b> when a new version is out, a “New update available” bar appears. Tap <b>Update</b> and your progress is kept.',
    'Answer keys start with tests taken from today. Older results don’t have one.',
  ];
  // ============================================================

  const SEEN_KEY = 'iqtest.version';
  const U = (IQ.updates = { ready: false, latest: null });

  U.check = async function () {
    if (!navigator.onLine && navigator.onLine !== undefined) return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j && j.build && j.build !== IQ.BUILD) { U.ready = true; U.latest = j.build; U.show(); }
    } catch (e) { /* offline or blocked: try again next time */ }
  };

  U.show = function () {
    let bar = document.getElementById('upd');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'upd';
      bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>${IQ.ui_icon('sparkle', 18)}<b>New update available</b></span><button class="btn primary" data-upd>Update</button>`;
      document.body.appendChild(bar);
      bar.querySelector('[data-upd]').addEventListener('click', () => { IQ.audio.play('tap'); U.apply(); });
    }
    bar.classList.add('show');
  };

  U.apply = async function () {
    const b = document.querySelector('[data-upd]');
    if (b) { b.disabled = true; b.textContent = 'Updating…'; }
    try { IQ.save(); } catch (e) { /* ignore */ }
    try {
      if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); }
      if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.filter((k) => k.startsWith('iqtest-')).map((k) => caches.delete(k))); }
    } catch (e) { /* ignore */ }
    location.replace(location.pathname + '?u=' + Date.now());
  };

  /* What's new: once per build, but not on a brand-new install */
  U.whatsNewDue = function () {
    let seen = null;
    try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { return false; }
    if (seen === IQ.BUILD) return false;
    const s = IQ.state;
    const used = s && (s.history.length || Object.keys(s.daily.log).length || Object.keys(s.gym).length);
    if (!used) { U.markSeen(); return false; }
    return true;
  };
  U.markSeen = () => { try { localStorage.setItem(SEEN_KEY, IQ.BUILD); } catch (e) { /* ignore */ } };
  U.whatsNew = function () {
    return IQ.ui.modal(`<h3>What’s new</h3><ul class="wn">${IQ.WHATS_NEW.map((l) => `<li>${l}</li>`).join('')}</ul>
      <p class="cap">Version ${IQ.BUILD} · your progress was kept</p>
      <button class="btn primary wide" data-v="ok">Got it</button>`, (el, close) => { el.querySelector('[data-v]').onclick = () => { IQ.audio.play('tap'); close(true); }; })
      .then(() => U.markSeen());
  };

  U.start = function () {
    // after tapping Update the address has ?u=...; tidy it so links and the Home Screen copy stay clean
    if (/[?&]u=\d+/.test(location.search)) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } }
    U.check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) U.check(); });
    if (U.whatsNewDue()) setTimeout(() => { if (!document.body.classList.contains('running')) U.whatsNew(); }, 500);
  };
})();
