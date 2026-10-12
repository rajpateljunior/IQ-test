/* =====================================================================
   IQ Test — core.js
   Shared engine: seeded randomness, adaptive scoring (IRT), score
   scaling, save data, save codes, sound, themes and small helpers.
   Everything hangs off the global namespace window.IQ.
   ===================================================================== */
'use strict';
var IQ = (window.IQ = window.IQ || {});

(function () {
  /* ---------------------------------------------------------------
     Seeded random numbers (mulberry32). Same seed => same puzzles,
     which is what makes friend challenges and the daily test fair.
     --------------------------------------------------------------- */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  IQ.hash = hashStr;
  IQ.newSeed = () => (Math.floor(Math.random() * 4294967296) >>> 0);
  IQ.rng = function (seed) {
    const r = mulberry32(typeof seed === 'number' ? seed >>> 0 : hashStr(seed));
    return {
      next: r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
      /* weighted pick: items [{w, ...}] */
      weighted(items) {
        const total = items.reduce((s, x) => s + x.w, 0);
        let t = r() * total;
        for (const x of items) { if ((t -= x.w) <= 0) return x; }
        return items[items.length - 1];
      },
    };
  };

  /* ---------------------------------------------------------------
     Item response theory (3-parameter logistic).
     Every scored response is {a, b, c, x}:
       b = difficulty (ability units, adult mean 0, SD 1)
       a = discrimination, c = guessing floor (1 / number of options)
       x = 1 correct, 0 wrong
     Speed tasks instead add {mu, se}: a normal likelihood centred on
     the ability implied by the raw score.
     --------------------------------------------------------------- */
  const D = 1.7;
  IQ.p3pl = (t, it) => it.c + (1 - it.c) / (1 + Math.exp(-D * it.a * (t - it.b)));

  const GRID = [];
  for (let i = 0; i <= 160; i++) GRID.push(-4 + i * 0.05);

  /* Posterior over ability given responses, with a N(0,1) prior.
     Returns EAP estimate (theta) and posterior SD (sd). */
  IQ.posterior = function (responses) {
    const lw = GRID.map((t) => (-t * t) / 2);
    for (const r of responses || []) {
      if (r.mu != null) {
        for (let i = 0; i < GRID.length; i++) lw[i] += -((GRID[i] - r.mu) ** 2) / (2 * r.se * r.se);
      } else {
        for (let i = 0; i < GRID.length; i++) {
          const p = Math.min(1 - 1e-9, Math.max(1e-9, IQ.p3pl(GRID[i], r)));
          lw[i] += Math.log(r.x ? p : 1 - p);
        }
      }
    }
    const m = Math.max(...lw);
    let s = 0, mean = 0;
    const w = lw.map((v) => Math.exp(v - m));
    for (let i = 0; i < w.length; i++) { s += w[i]; mean += w[i] * GRID[i]; }
    mean /= s;
    let v2 = 0;
    for (let i = 0; i < w.length; i++) v2 += w[i] * (GRID[i] - mean) ** 2;
    return { theta: mean, sd: Math.sqrt(v2 / s), n: (responses || []).length };
  };

  /* ---------------------------------------------------------------
     Score scaling.
     The EAP estimate is pulled toward the average when there are few
     items, so on its own it would spread scores less than real tests.
     We divide by its expected population spread, sqrt(1 - postVar),
     so reported scores have mean 100 and SD 15 across the modelled
     adult population. The confidence range is built around the
     estimated true score (the way clinical tests report it), so the
     score can sit slightly off-centre within its range.
     --------------------------------------------------------------- */
  const clampScore = (x) => Math.round(Math.max(55, Math.min(145, x)));
  IQ.clampScore = clampScore;

  /* Adaptive rule shared by the app and the simulation tests:
     first item at startB, then aim slightly above the current estimate
     (multiple-choice guessing makes items most informative there). */
  IQ.nextB = function (responses, i, startB) {
    if (i === 0) return startB;
    return Math.max(-2.6, Math.min(2.6, IQ.posterior(responses).theta + 0.15));
  };
  const Z90 = 1.645;

  IQ.indexScore = function (post) {
    const s = Math.sqrt(Math.max(0.15, 1 - post.sd * post.sd));
    const rep = post.theta / s;
    return {
      score: clampScore(100 + 15 * rep),
      lo: clampScore(100 + 15 * (post.theta - Z90 * post.sd)),
      hi: clampScore(100 + 15 * (post.theta + Z90 * post.sd)),
      theta: +post.theta.toFixed(3),
      sd: +post.sd.toFixed(3),
      n: post.n || 0,
    };
  };

  /* Full-Scale Estimate weights. Verbal Knowledge (VK) is reported
     separately and is not part of the composite. Speed (PS) and
     Reflection (CR) count less: noisier on phones / adjacent to IQ. */
  IQ.WEIGHTS = { FR: 1.5, VS: 1, WM: 1, QR: 1, LM: 0.75, PS: 0.5, CR: 0.5 };
  IQ.RHO = 0.5; // assumed correlation between domain abilities

  /* Composite (Full-Scale) estimate. Each domain's result is turned
     back into its likelihood, then combined under a prior in which the
     domains correlate (RHO). The posterior of the weighted composite
     borrows strength across domains, which is what keeps extreme
     scores from being pulled too far toward 100. */
  function invert(M) {
    const n = M.length, A = M.map((r, i) => r.concat(r.map((_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      const d = A[c][c];
      for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map((r) => r.slice(n));
  }
  IQ.compositeScore = function (posts, weights) {
    weights = weights || IQ.WEIGHTS;
    const keys = Object.keys(weights).filter((k) => posts[k]);
    if (!keys.length) return null;
    const n = keys.length, R = IQ.RHO;
    const P = keys.map((_, i) => keys.map((__, j) => (i === j ? 1 : R)));
    const A = invert(P);
    const bvec = new Array(n).fill(0);
    keys.forEach((k, i) => {
      const v = Math.min(0.995, Math.max(1e-4, posts[k].sd * posts[k].sd));
      const prec = Math.max(1e-6, 1 / v - 1); // likelihood precision
      const mu = posts[k].theta / (1 - v); // likelihood mean
      A[i][i] += prec;
      bvec[i] = prec * mu;
    });
    const C = invert(A);
    const m = C.map((row) => row.reduce((s, x, j) => s + x * bvec[j], 0));
    const w = keys.map((k) => weights[k]);
    let num = 0, varc = 0, norm2 = 0;
    for (let i = 0; i < n; i++) {
      num += w[i] * m[i];
      for (let j = 0; j < n; j++) { varc += w[i] * w[j] * C[i][j]; norm2 += w[i] * w[j] * P[i][j]; }
    }
    const norm = Math.sqrt(norm2);
    const theta = num / norm, sd = Math.sqrt(Math.max(0, varc)) / norm;
    const rep = theta / Math.sqrt(Math.max(0.15, 1 - sd * sd));
    return {
      score: clampScore(100 + 15 * rep),
      lo: clampScore(100 + 15 * (theta - Z90 * sd)),
      hi: clampScore(100 + 15 * (theta + Z90 * sd)),
      theta: +theta.toFixed(3),
      sd: +sd.toFixed(3),
    };
  };

  /* Standard normal CDF (for percentiles). */
  IQ.phi = function (z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  IQ.percentile = (score) => {
    const p = IQ.phi((score - 100) / 15) * 100;
    return p > 99.5 ? '>99' : p < 0.5 ? '<1' : String(Math.round(p));
  };
  IQ.classify = function (s) {
    if (s >= 130) return 'Very High';
    if (s >= 120) return 'High';
    if (s >= 110) return 'High Average';
    if (s >= 90) return 'Average';
    if (s >= 80) return 'Low Average';
    if (s >= 70) return 'Low';
    return 'Very Low';
  };

  /* ---------------------------------------------------------------
     Domains (the 8 areas of ability). Colours live in CSS as
     --d-FR, --d-VS ... and stay fixed across themes.
     --------------------------------------------------------------- */
  IQ.DOMAINS = {
    FR: { name: 'Fluid Reasoning', short: 'Fluid', desc: 'Solving new problems by finding hidden rules and patterns.' },
    VS: { name: 'Visual-Spatial', short: 'Spatial', desc: 'Picturing shapes and turning them in your mind.' },
    WM: { name: 'Working Memory', short: 'Memory', desc: 'Holding information in mind while you use it.' },
    QR: { name: 'Quantitative Reasoning', short: 'Quant', desc: 'Reasoning with numbers, rates and proportions.' },
    PS: { name: 'Processing Speed', short: 'Speed', desc: 'Doing simple visual tasks quickly and accurately.' },
    LM: { name: 'Learning & Memory', short: 'Learning', desc: 'Learning new associations and recalling them.' },
    CR: { name: 'Reflective Reasoning', short: 'Reflection', desc: 'Catching the tempting wrong answer and checking it.' },
    VK: { name: 'Verbal Knowledge', short: 'Verbal', desc: 'Word knowledge built up through reading and learning.' },
  };
  IQ.DOMAIN_ORDER = ['FR', 'VS', 'WM', 'QR', 'PS', 'LM', 'CR', 'VK'];

  /* ---------------------------------------------------------------
     Dates (local time).
     --------------------------------------------------------------- */
  IQ.today = function (d) {
    d = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  IQ.dayDiff = function (a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]), tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((tb - ta) / 86400000);
  };
  IQ.LAUNCH = '2026-10-12';
  IQ.dailyNumber = (date) => IQ.dayDiff(IQ.LAUNCH, date || IQ.today()) + 1;
  IQ.fmtDate = function (ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ---------------------------------------------------------------
     Save data (localStorage). Version 1. New fields must always be
     optional so old save codes keep loading (see NOTES.md).
     --------------------------------------------------------------- */
  const KEY = 'iqtest.v1';
  IQ.SAVE_VERSION = 1;
  IQ.defaultState = () => ({
    v: 1,
    settings: { theme: 'navy', mode: 'auto', sound: true, name: '' },
    history: [], // finished tests, newest last
    gym: {}, // subtestId -> {lvl, best, xp, plays}
    daily: { last: null, streak: 0, bestStreak: 0, log: {} }, // log: date -> score
    practice: { last: null, streak: 0, bestStreak: 0 }, // any-activity streak
    seen: {}, // subtestId -> true once practice shown
    vocabSeen: [],
    badges: {}, // badgeId -> timestamp
    stats: { tests: 0, sent: 0, wins: 0 },
  });
  function deepMerge(base, add) {
    if (!add || typeof add !== 'object' || Array.isArray(add)) return add === undefined ? base : add;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const k of Object.keys(add)) {
      out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null
        ? deepMerge(base[k], add[k]) : add[k];
    }
    return out;
  }
  IQ.normalizeState = (raw) => deepMerge(IQ.defaultState(), raw || {});
  IQ.load = function () {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      IQ.state = IQ.normalizeState(raw);
    } catch (e) {
      IQ.state = IQ.defaultState();
    }
    return IQ.state;
  };
  IQ.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(IQ.state)); } catch (e) { /* storage full or blocked */ }
  };

  /* base64url of UTF-8 JSON */
  function b64e(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  IQ.b64e = b64e;
  IQ.b64d = b64d;

  IQ.exportCode = () => 'IQT1-' + b64e(JSON.stringify(IQ.state));
  IQ.importCode = function (code) {
    code = String(code || '').trim().replace(/\s+/g, '');
    const m = code.match(/^IQT(\d+)-(.+)$/);
    if (!m) throw new Error('That does not look like an IQ Test save code.');
    const data = JSON.parse(b64d(m[2]));
    if (!data || typeof data !== 'object' || !data.v) throw new Error('Save code is damaged.');
    if (data.v > IQ.SAVE_VERSION) throw new Error('This save code is from a newer version. Update the app first.');
    return IQ.normalizeState(data);
  };

  /* ---------------------------------------------------------------
     Sound (WebAudio, synthesized). iOS needs a tap first, and the
     iPhone silent switch mutes it.
     --------------------------------------------------------------- */
  IQ.audio = {
    ctx: null,
    unlock() {
      try {
        if (!this.ctx) {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return;
          this.ctx = new C();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* no audio */ }
    },
    tone(freq, dur, type, gain, delay) {
      const c = this.ctx;
      if (!c || !IQ.state || !IQ.state.settings.sound) return;
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    },
    play(name) {
      switch (name) {
        case 'tap': return this.tone(660, 0.05, 'sine', 0.04);
        case 'select': return this.tone(520, 0.06, 'triangle', 0.05);
        case 'confirm': return this.tone(740, 0.08, 'sine', 0.06);
        case 'correct': this.tone(660, 0.1, 'sine', 0.07); return this.tone(990, 0.14, 'sine', 0.07, 0.08);
        case 'wrong': return this.tone(220, 0.18, 'triangle', 0.07);
        case 'flash': return this.tone(880, 0.12, 'sine', 0.05);
        case 'start': this.tone(440, 0.08, 'sine', 0.06); return this.tone(660, 0.12, 'sine', 0.06, 0.09);
        case 'complete':
          [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.06, i * 0.1));
          return;
        case 'levelup':
          [587, 740, 880].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, i * 0.08));
          return;
      }
    },
  };

  /* ---------------------------------------------------------------
     Themes: 5 colour themes x light/dark/auto. All colours are CSS
     variables keyed off <html data-theme data-mode>.
     --------------------------------------------------------------- */
  IQ.THEMES = [
    { id: 'navy', name: 'Navy' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'forest', name: 'Forest' },
    { id: 'plum', name: 'Plum' },
    { id: 'ember', name: 'Ember' },
  ];
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  IQ.resolvedMode = function () {
    const m = (IQ.state && IQ.state.settings.mode) || 'auto';
    if (m === 'auto') return mql && !mql.matches ? 'light' : 'dark';
    return m;
  };
  IQ.applyTheme = function () {
    const el = document.documentElement;
    el.dataset.theme = (IQ.state && IQ.state.settings.theme) || 'navy';
    el.dataset.mode = IQ.resolvedMode();
    const bg = getComputedStyle(el).getPropertyValue('--bg').trim();
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute('content', bg);
  };
  if (mql && mql.addEventListener) mql.addEventListener('change', () => IQ.applyTheme());

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  IQ.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  IQ.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  IQ.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  IQ.fmtMoney = (x) => {
    const r = Math.round(x * 100) / 100;
    return '$' + (Number.isInteger(r) ? r.toLocaleString('en-US') : r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };
  /* Test hooks: automated tests read the current answer from here and
     speed up timers with TIME_SCALE. Normal play never changes these. */
  IQ.debug = {};
  IQ.TIME_SCALE = 1;
  IQ.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* Abstract glyphs on a 3x3 dot grid, used by Symbol Coding and
     Paired Associates. Returns arrays of strokes [[x1,y1,x2,y2],...]. */
  IQ.makeGlyphs = function (rng, n, minDiff) {
    minDiff = minDiff || 3;
    const out = [];
    const key = (e) => e.slice().sort().join(',');
    let guard = 0;
    while (out.length < n && guard++ < 5000) {
      const strokes = [];
      const used = new Set();
      let x = rng.int(0, 2), y = rng.int(0, 2);
      const len = rng.int(3, 4);
      let tries = 0;
      while (strokes.length < len && tries++ < 40) {
        const nx = x + rng.int(-1, 1), ny = y + rng.int(-1, 1);
        if (nx < 0 || nx > 2 || ny < 0 || ny > 2 || (nx === x && ny === y)) continue;
        const k = [x, y, nx, ny].join('') < [nx, ny, x, y].join('') ? `${x}${y}${nx}${ny}` : `${nx}${ny}${x}${y}`;
        if (used.has(k)) continue;
        used.add(k);
        strokes.push([x, y, nx, ny]);
        // sometimes jump to start a new stroke from a different dot
        if (rng.chance(0.25)) { x = rng.int(0, 2); y = rng.int(0, 2); } else { x = nx; y = ny; }
      }
      if (strokes.length < 3) continue;
      const ks = [...used];
      const ok = out.every((g) => {
        const other = new Set(g.keys);
        let diff = 0;
        ks.forEach((k) => { if (!other.has(k)) diff++; });
        g.keys.forEach((k) => { if (!used.has(k)) diff++; });
        return diff >= minDiff;
      });
      if (ok) out.push({ strokes, keys: ks, id: key(ks) });
    }
    return out;
  };
  IQ.glyphSVG = function (g, size, cls) {
    const p = (v) => 18 + v * 32;
    const lines = g.strokes.map((s) => `<line x1="${p(s[0])}" y1="${p(s[1])}" x2="${p(s[2])}" y2="${p(s[3])}"/>`).join('');
    return `<svg class="glyph ${cls || ''}" viewBox="0 0 100 100" width="${size || 48}" height="${size || 48}" aria-hidden="true"><g stroke="currentColor" stroke-width="9" stroke-linecap="round" fill="none">${lines}</g></svg>`;
  };
})();
