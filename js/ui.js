/* =====================================================================
   IQ Test — ui.js
   Screens and flows: Home, Quick Test, Daily Challenge, Friend
   Challenge, Results report, Practice Gym, Progress, How It Works,
   Settings. Rendering is plain template strings into #view (tabs) or
   #run (full-screen test runner).
   ===================================================================== */
'use strict';
(function () {
  const ui = (IQ.ui = {});
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const S = () => IQ.state;
  const icon = (n, s) => IQ.ui_icon(n, s);
  const esc = IQ.esc;
  const dc = (d) => `var(--d-${d})`;

  /* ================= Shell ================= */
  ui.mount = function () {
    document.body.innerHTML = `
      <div class="app">
        <header class="topbar">
          <button class="brand" data-nav="home" aria-label="Home">${ui.logo(28)}<span>IQ Test</span></button>
          <button class="iconbtn" data-nav="settings" aria-label="Settings">${icon('gear')}</button>
        </header>
        <main id="view" class="view" tabindex="-1"></main>
        <nav class="tabbar" aria-label="Main">
          <button data-nav="home">${icon('home')}<span>Test</span></button>
          <button data-nav="gym">${icon('gym')}<span>Gym</span></button>
          <button data-nav="progress">${icon('history')}<span>Progress</span></button>
          <button data-nav="about">${icon('info')}<span>How it works</span></button>
        </nav>
      </div>
      <section id="run" class="run" hidden>
        <div class="runbar">
          <button class="iconbtn" data-quit aria-label="Quit">${icon('close')}</button>
          <div class="runtitle"><i class="ddot"></i><div><b class="rt-name"></b><small class="rt-part"></small></div></div>
          <div class="rt-count"></div>
          <div class="rt-progress"><i></i></div>
        </div>
        <div class="runbody"></div>
      </section>
      <div id="toast" role="status" aria-live="polite"></div>
      <div id="modal"></div>`;
    document.addEventListener('click', (e) => {
      IQ.audio.unlock();
      const n = e.target.closest('[data-nav]');
      if (n) { e.preventDefault(); IQ.audio.play('tap'); ui.go(n.dataset.nav); }
    });
    $('[data-quit]').addEventListener('click', ui.quitPrompt);
  };

  ui.logo = (s) => `<svg class="logo" viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--primary)"/>
      <g fill="var(--on-primary)"><circle cx="9.5" cy="9.5" r="2.6"/><circle cx="16" cy="9.5" r="2.6" opacity=".55"/><circle cx="22.5" cy="9.5" r="2.6" opacity=".3"/>
      <circle cx="9.5" cy="16" r="2.6" opacity=".55"/><circle cx="16" cy="16" r="2.6"/><circle cx="22.5" cy="16" r="2.6" opacity=".55"/>
      <circle cx="9.5" cy="22.5" r="2.6" opacity=".3"/><circle cx="16" cy="22.5" r="2.6" opacity=".55"/></g>
      <rect x="19.6" y="19.6" width="5.8" height="5.8" rx="1.6" fill="none" stroke="var(--on-primary)" stroke-width="1.6" stroke-dasharray="2 1.4"/></svg>`;

  let current = 'home';
  ui.go = function (name, arg) {
    current = name;
    const v = $('#view');
    $$('.tabbar [data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === (SCREENS[name] && SCREENS[name].tab || name)));
    const scr = SCREENS[name] || SCREENS.home;
    v.innerHTML = scr.render(arg);
    v.onclick = null;
    if (scr.bind) scr.bind(v, arg);
    window.scrollTo(0, 0);
  };
  ui.refresh = () => ui.go(current);

  /* ================= Toast & modal ================= */
  let toastT;
  ui.toast = function (msg, kind) {
    const t = $('#toast');
    t.innerHTML = `<div class="toast ${kind || ''}">${msg}</div>`;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  };
  ui.modal = function (html, bind) {
    const m = $('#modal');
    m.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    m.classList.add('open');
    return new Promise((res) => {
      const close = (v) => { m.classList.remove('open'); m.innerHTML = ''; res(v); };
      m.querySelector('.scrim').onclick = () => close(null);
      if (bind) bind(m.querySelector('.sheet'), close);
    });
  };
  ui.confirm = (title, text, ok, danger) => ui.modal(`<h3>${title}</h3><p>${text}</p>
      <div class="row2"><button class="btn ghost" data-v="0">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-v="1">${ok || 'OK'}</button></div>`,
  (el, close) => el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => close(b.dataset.v === '1'))));

  ui.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove(); return ok;
    }
  };
  ui.share = async function (data) {
    if (navigator.share) {
      try { await navigator.share(data); return true; } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    const ok = await ui.copy([data.text, data.url].filter(Boolean).join('\n'));
    ui.toast(ok ? 'Copied to clipboard' : 'Could not copy');
    return ok;
  };

  /* ================= Streaks, XP, badges ================= */
  function bump(obj) {
    const t = IQ.today();
    if (obj.last === t) return;
    obj.streak = obj.last && IQ.dayDiff(obj.last, t) === 1 ? (obj.streak || 0) + 1 : 1;
    obj.last = t;
    obj.bestStreak = Math.max(obj.bestStreak || 0, obj.streak);
  }
  const liveStreak = (obj) => (obj.last && IQ.dayDiff(obj.last, IQ.today()) <= 1 ? obj.streak : 0);
  IQ.BADGES = [
    { id: 'first', name: 'First Report', desc: 'Complete a Quick Test', test: (s) => s.stats.tests >= 1 },
    { id: 'daily1', name: 'Daily Mind', desc: 'Finish a Daily Challenge', test: (s) => Object.keys(s.daily.log).length >= 1 },
    { id: 'streak3', name: 'On a Roll', desc: 'Daily streak of 3', test: (s) => s.daily.bestStreak >= 3 },
    { id: 'streak7', name: 'Week Strong', desc: 'Daily streak of 7', test: (s) => s.daily.bestStreak >= 7 },
    { id: 'streak30', name: 'Unbroken', desc: 'Daily streak of 30', test: (s) => s.daily.bestStreak >= 30 },
    { id: 'gym5', name: 'Trained', desc: 'Clear level 5 of any Gym skill', test: (s) => Object.values(s.gym).some((g) => g.best >= 5) },
    { id: 'gym10', name: 'Peak Form', desc: 'Clear level 10 of any Gym skill', test: (s) => Object.values(s.gym).some((g) => g.best >= 10) },
    { id: 'allgym', name: 'Well Rounded', desc: 'Practise all 10 Gym skills', test: (s) => IQ.GYM_ORDER.every((id) => s.gym[id] && s.gym[id].plays > 0) },
    { id: 's120', name: 'High Range', desc: 'Full-Scale Estimate of 120+', test: (s) => s.history.some((h) => h.fse && h.fse.score >= 120) },
    { id: 's130', name: 'Very High Range', desc: 'Full-Scale Estimate of 130+', test: (s) => s.history.some((h) => h.fse && h.fse.score >= 130) },
    { id: 'sent', name: 'Challenger', desc: 'Send a friend challenge', test: (s) => s.stats.sent >= 1 },
    { id: 'win', name: 'Rival', desc: 'Beat a friend’s challenge', test: (s) => s.stats.wins >= 1 },
  ];
  function checkBadges() {
    const s = S();
    const fresh = IQ.BADGES.filter((b) => !s.badges[b.id] && b.test(s));
    fresh.forEach((b) => (s.badges[b.id] = Date.now()));
    if (fresh.length) { IQ.save(); setTimeout(() => ui.toast(`${icon('star', 16)} Badge earned: <b>${fresh.map((b) => b.name).join(', ')}</b>`, 'gold'), 600); }
  }
  ui.checkBadges = checkBadges;
  const RANKS = [[0, 'Novice'], [200, 'Apprentice'], [600, 'Adept'], [1500, 'Expert'], [3000, 'Master'], [6000, 'Grandmaster']];
  const totalXP = () => Object.values(S().gym).reduce((s, g) => s + (g.xp || 0), 0);
  const rankOf = (xp) => { let r = RANKS[0]; RANKS.forEach((x) => { if (xp >= x[0]) r = x; }); const nx = RANKS.find((x) => x[0] > xp); return { name: r[1], next: nx ? nx[0] : null, base: r[0] }; };

  /* ================= Charts ================= */
  const sx = (score) => ((IQ.clamp(score, 55, 145) - 55) / 90) * 100;
  ui.radar = function (vals, overlay, size) {
    const keys = IQ.DOMAIN_ORDER;
    const W = 340, H = 300, cx = W / 2, cy = H / 2 + 4, R = 104;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    const pt = (i, s) => { const r = (R * (IQ.clamp(s, 55, 145) - 55)) / 90; return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]; };
    let g = '';
    [70, 85, 100, 115, 130, 145].forEach((s) => {
      const p = keys.map((_, i) => pt(i, s).map((v) => v.toFixed(1)).join(',')).join(' ');
      g += `<polygon points="${p}" class="${s === 100 ? 'ring mid' : 'ring'}"/>`;
    });
    keys.forEach((k, i) => { const [x, y] = pt(i, 145); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="spoke"/>`; });
    const poly = (v, cls) => {
      const pts = keys.map((k, i) => (v[k] != null ? pt(i, v[k]) : pt(i, 100)));
      return `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" class="${cls}"/>`;
    };
    if (overlay) g += poly(overlay, 'area vs');
    g += poly(vals, 'area');
    keys.forEach((k, i) => { if (vals[k] == null) return; const [x, y] = pt(i, vals[k]); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${dc(k)}" class="vtx"/>`; });
    keys.forEach((k, i) => {
      const [x, y] = pt(i, 163);
      const a = Math.cos(ang(i));
      const anchor = Math.abs(a) < 0.2 ? 'middle' : a > 0 ? 'start' : 'end';
      g += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" class="rlabel" fill="${dc(k)}">${IQ.DOMAINS[k].short}${k === 'VK' ? '*' : ''}</text>`;
      if (vals[k] != null) g += `<text x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}" text-anchor="${anchor}" class="rval">${vals[k]}${overlay && overlay[k] != null ? ` · ${overlay[k]}` : ''}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H + 14}" class="radar" style="max-width:${size || 420}px" role="img" aria-label="Ability profile chart">${g}</svg>`;
  };
  ui.bell = function (score) {
    const W = 320, H = 92, x = (s) => 10 + ((s - 55) / 90) * (W - 20);
    const y = (s) => H - 18 - 64 * Math.exp(-(((s - 100) / 15) ** 2) / 2);
    let d = '', fill = `M${x(55)},${H - 18}`;
    for (let s = 55; s <= 145; s += 1) { d += `${s === 55 ? 'M' : 'L'}${x(s).toFixed(1)},${y(s).toFixed(1)}`; if (s <= score) fill += `L${x(s).toFixed(1)},${y(s).toFixed(1)}`; }
    fill += `L${x(score).toFixed(1)},${H - 18}Z`;
    const ticks = [70, 85, 100, 115, 130].map((s) => `<line x1="${x(s)}" x2="${x(s)}" y1="${H - 18}" y2="${H - 14}" class="tick"/><text x="${x(s)}" y="${H - 3}" class="tlab" text-anchor="middle">${s}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="bell" aria-hidden="true"><path d="${fill}" class="bfill"/><path d="${d}" class="bline"/><line x1="10" x2="${W - 10}" y1="${H - 18}" y2="${H - 18}" class="base"/>${ticks}
      <line x1="${x(score)}" x2="${x(score)}" y1="${y(score) - 8}" y2="${H - 18}" class="marker"/><circle cx="${x(score)}" cy="${y(score) - 8}" r="4" class="mdot"/></svg>`;
  };
  ui.lineChart = function (pts) {
    const W = 340, H = 150, pad = 26;
    const n = pts.length;
    const ys = pts.map((p) => p.v);
    const lo = Math.min(85, ...ys) - 5, hi = Math.max(115, ...ys) + 5;
    const X = (i) => pad + (n === 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (n - 1));
    const Y = (v) => 12 + ((hi - v) * (H - 40)) / (hi - lo);
    const grid = [lo + 5, 100, hi - 5].map((v) => `<line x1="${pad}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" class="g"/><text x="${pad - 6}" y="${Y(v) + 4}" text-anchor="end" class="tl">${Math.round(v)}</text>`).join('');
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4" class="d"/>`).join('');
    const labs = pts.map((p, i) => (i === 0 || i === n - 1 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="${n === 1 ? 'middle' : i ? 'end' : 'start'}" class="tl">${p.l}</text>` : '')).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="linechart" role="img" aria-label="Score history">${grid}<path d="${path}" class="p"/>${dots}${labs}</svg>`;
  };
  function rangeBar(sc, d, vs) {
    return `<div class="ibar"><span class="mid"></span><span class="band" style="left:${sx(sc.lo)}%;width:${Math.max(1.5, sx(sc.hi) - sx(sc.lo))}%;background:${dc(d)}"></span>
      ${vs != null ? `<span class="pt vs" style="left:${sx(vs)}%"></span>` : ''}<span class="pt" style="left:${sx(sc.score)}%;background:${dc(d)}"></span></div>`;
  }

  /* ================= Test runner plumbing ================= */
  const ABORT = { abort: true };
  let RUN = null;
  function newRun() {
    let rej;
    const p = new Promise((_, r) => (rej = r));
    p.catch(() => {});
    RUN = { aborted: false, fns: [], p, abort() { if (this.aborted) return; this.aborted = true; this.fns.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); rej(ABORT); } };
  }
  const race = (pr) => Promise.race([pr, RUN.p]);
  function enterRun() { $('#run').hidden = false; document.body.classList.add('running'); window.scrollTo(0, 0); }
  function exitRun() { $('#run').hidden = true; document.body.classList.remove('running'); }
  function runbar(o) {
    const r = $('#run');
    if (o.name != null) $('.rt-name', r).textContent = o.name;
    if (o.part != null) $('.rt-part', r).textContent = o.part;
    if (o.domain) $('.ddot', r).style.background = dc(o.domain);
    $('.ddot', r).style.visibility = o.domain === null ? 'hidden' : '';
    if (o.count != null) $('.rt-count', r).textContent = o.count;
    if (o.frac != null) $('.rt-progress i', r).style.transform = `scaleX(${o.frac})`;
  }
  ui.quitPrompt = async function () {
    if (!RUN || RUN.aborted) return;
    const ok = await ui.confirm('Quit?', RUN.kind === 'gym' ? 'This practice round will not be saved.' : 'Answers so far in this test will be lost.', 'Quit', true);
    if (ok && RUN) RUN.abort();
  };
  function makeCtx(o) {
    const host = $('#run .runbody');
    return Object.assign({
      host,
      rng: (tag) => IQ.rng(`${o.seed}|${o.subId}|${tag}`),
      check() { if (RUN.aborted) throw ABORT; },
      wait: (ms) => new Promise((r) => setTimeout(r, ms * IQ.TIME_SCALE)),
      onAbort(f) { RUN.fns.push(f); },
      progress(i, n) { runbar({ frac: n ? i / n : 0, count: n ? `${Math.min(i + 1, n)}/${n}` : '' }); },
    }, o);
  }
  const onceBtn = (el) => new Promise((r) => el.addEventListener('click', () => { IQ.audio.play('tap'); r(); }, { once: true }));
  function runHost() { return $('#run .runbody'); }
  function screenCard(html, cls) {
    const host = runHost();
    host.className = 'runbody center ' + (cls || '');
    host.innerHTML = `<div class="taskcard">${html}</div>`;
    host.scrollTop = 0;
    return host.firstElementChild;
  }

  /* ---------- multiple-choice item ---------- */
  function mcItem(mod, item, ctx) {
    return new Promise((resolve) => {
      const host = ctx.host;
      const lay = mod.layout(item);
      const oc = typeof mod.optClass === 'function' ? mod.optClass(item) : mod.optClass;
      const cols = item.options.length === 4 && mod.cols === 4 ? 2 : mod.cols;
      host.className = 'runbody mc ' + lay;
      host.innerHTML = `<div class="stem">${mod.stem(item)}</div>
        <div class="opts c${cols} n${item.options.length}" role="radiogroup" aria-label="Answer options">${item.options.map((_, i) => `<button class="opt ${oc}" data-i="${i}" role="radio" aria-checked="false">${mod.opt(item, i)}</button>`).join('')}</div>
        <div class="actions"><div class="itimer" hidden><i></i><span></span></div><button class="btn primary wide" data-confirm disabled>Confirm</button></div>`;
      host.scrollTop = 0;
      IQ.debug.item = item;
      const opts = $$('.opt', host), btn = $('[data-confirm]', host);
      const t0 = performance.now();
      let sel = -1, done = false, timer = null;
      const select = (i) => { if (done) return; sel = i; opts.forEach((o, j) => { o.classList.toggle('sel', j === i); o.setAttribute('aria-checked', String(j === i)); }); btn.disabled = false; IQ.audio.play('select'); };
      const finish = (choice, timedOut) => { if (done) return; done = true; clearInterval(timer); document.removeEventListener('keydown', onKey); resolve({ choice, timedOut, ms: Math.round(performance.now() - t0) }); };
      $('.opts', host).addEventListener('click', (e) => { const b = e.target.closest('.opt'); if (b) select(+b.dataset.i); });
      btn.addEventListener('click', () => { if (sel >= 0) { IQ.audio.play('confirm'); finish(sel, false); } });
      const onKey = (e) => {
        if (e.metaKey || e.ctrlKey) return;
        const k = e.key;
        if (/^[1-8]$/.test(k) && +k <= opts.length) select(+k - 1);
        else if (/^[a-h]$/i.test(k) && k.toLowerCase().charCodeAt(0) - 97 < opts.length) select(k.toLowerCase().charCodeAt(0) - 97);
        else if (k === 'Enter' && sel >= 0) btn.click();
      };
      document.addEventListener('keydown', onKey);
      if (item.timeLimit && ctx.mode !== 'gym') {
        const tl = item.timeLimit * 1000, tEl = $('.itimer', host);
        timer = setInterval(() => {
          const left = tl - (performance.now() - t0);
          if (left <= 15000) { tEl.hidden = false; $('i', tEl).style.transform = `scaleX(${Math.max(0, left / 15000)})`; $('span', tEl).textContent = Math.max(0, Math.ceil(left / 1000)) + 's'; }
          if (left <= 0) finish(sel, true);
        }, 200);
      }
      ctx.onAbort(() => { clearInterval(timer); document.removeEventListener('keydown', onKey); });
    });
  }
  async function mcFeedback(item, ans, ctx) {
    const host = ctx.host;
    const opts = $$('.opt', host);
    const ok = ans.choice === item.answer;
    opts[item.answer].classList.add('right');
    if (ans.choice >= 0 && !ok) opts[ans.choice].classList.add('wrong');
    opts.forEach((o) => (o.disabled = true));
    IQ.audio.play(ok ? 'correct' : 'wrong');
    const act = $('.actions', host);
    act.innerHTML = `<div class="explain ${ok ? 'ok' : 'no'}"><b>${ok ? 'Correct' : ans.timedOut && ans.choice < 0 ? 'Out of time' : 'Not quite'}</b>${item.explain.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <button class="btn primary wide" data-next>Next</button>`;
    const nb = $('[data-next]', act);
    nb.focus({ preventScroll: true });
    const k = (e) => { if (e.key === 'Enter') nb.click(); };
    document.addEventListener('keydown', k);
    ctx.onAbort(() => document.removeEventListener('keydown', k));
    act.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    await onceBtn(nb);
    document.removeEventListener('keydown', k);
  }
  async function runMC(mod, ctx) {
    const responses = [], log = [];
    const n = ctx.n || mod.testN;
    const avoid = new Set(mod.id === 'vocab' ? S().vocabSeen : []);
    for (let i = 0; i < n; i++) {
      ctx.check();
      let b;
      if (ctx.mode === 'gym') b = IQ.levelB(ctx.level);
      else if (ctx.mode === 'practice') b = -2.2;
      else b = IQ.nextB(responses, i, ctx.startB);
      const item = mod.gen(ctx.rng(`${i}|${Math.round(b * 4)}`), b, avoid);
      if (item.id) avoid.add(item.id);
      ctx.progress(i, n);
      const ans = await mcItem(mod, item, ctx);
      ctx.check();
      const x = ans.choice === item.answer ? 1 : 0;
      responses.push({ a: item.a, b: item.b, c: item.c, x });
      log.push(x);
      if (ctx.feedback) await mcFeedback(item, ans, ctx);
    }
    if (mod.id === 'vocab' && ctx.mode !== 'practice') {
      S().vocabSeen = [...avoid].slice(-80);
    }
    ctx.progress(n, n);
    return { responses, log, correct: log.reduce((a, b) => a + b, 0), total: n };
  }
  const runSub = (mod, ctx) => (mod.kind === 'mc' ? runMC(mod, ctx) : mod.run(ctx));

  /* ================= Test flow (Quick / Daily / Challenge) ================= */
  ui.pickSubs = function (seed, domains) {
    const rng = IQ.rng(seed + '|subs');
    return domains.map((d) => rng.pick(IQ.BY_DOMAIN[d]));
  };
  ui.startQuick = function (challenge) {
    const seed = challenge ? challenge.s : IQ.newSeed();
    const subs = challenge && challenge.subs ? challenge.subs.filter((id) => IQ.SUBTESTS[id]) : ui.pickSubs(seed, IQ.QUICK_ORDER);
    return runTest({ mode: challenge ? 'challenge' : 'quick', seed, subs, challenge });
  };
  ui.dailySubs = function (date) {
    const rng = IQ.rng('daily|' + date);
    const doms = rng.shuffle(['FR', 'VS', 'WM', 'QR', 'PS', 'LM', 'CR', 'VK']).slice(0, 3);
    doms.sort((a, b) => IQ.QUICK_ORDER.indexOf(a) - IQ.QUICK_ORDER.indexOf(b));
    return doms.map((d) => rng.pick(IQ.BY_DOMAIN[d]));
  };
  ui.startDaily = function () {
    const date = IQ.today();
    return runTest({ mode: 'daily', seed: IQ.hash('daily|' + date), subs: ui.dailySubs(date), date });
  };

  async function runTest(cfg) {
    newRun();
    RUN.kind = cfg.mode;
    enterRun();
    try {
      await testIntro(cfg);
      const results = {};
      for (let k = 0; k < cfg.subs.length; k++) {
        const id = cfg.subs[k], mod = IQ.SUBTESTS[id];
        const part = `Part ${k + 1} of ${cfg.subs.length}`;
        runbar({ name: mod.name, part, domain: mod.domain, frac: 0, count: '' });
        const wantPractice = await subIntro(mod, part);
        if (wantPractice) {
          runbar({ part: 'Practice (not scored)' });
          await race(runSub(mod, makeCtx({ mode: 'practice', seed: IQ.newSeed(), subId: id, n: 1, feedback: true })));
          S().seen[id] = true; IQ.save();
          const c = screenCard(`<div class="bigicon" style="color:${dc(mod.domain)}">${IQ.icon(mod.icon, 44)}</div><h2>Ready for the real thing?</h2>
            <p>From here on answers count, and you won’t see whether they’re right.</p><button class="btn primary wide" data-go>Start ${esc(mod.name)}</button>`);
          await race(onceBtn($('[data-go]', c)));
          runbar({ part });
        }
        const daily = cfg.mode === 'daily';
        const ctx = makeCtx({ mode: daily ? 'daily' : 'test', seed: cfg.seed, subId: id, n: daily ? mod.dailyN : mod.testN, startB: daily ? -0.4 : -0.8, feedback: false });
        results[id] = await race(runSub(mod, ctx));
        if (k < cfg.subs.length - 1) {
          screenCard(`<div class="donecheck">${icon('check', 40)}</div><h2>Part ${k + 1} complete</h2><p class="muted">Next: ${esc(IQ.SUBTESTS[cfg.subs[k + 1]].name)}</p>`, 'fade');
          IQ.audio.play('confirm');
          await race(new Promise((r) => setTimeout(r, 1100 * IQ.TIME_SCALE)));
        }
      }
      IQ.audio.play('complete');
      screenCard(`<div class="spinner"></div><h2>Scoring your results</h2><p class="muted">Building your cognitive profile…</p>`);
      await race(new Promise((r) => setTimeout(r, 1200 * IQ.TIME_SCALE)));
      exitRun();
      RUN = null;
      finishTest(cfg, results);
    } catch (e) {
      exitRun();
      RUN = null;
      if (e !== ABORT) { console.error(e); ui.toast('Something went wrong. The test was stopped.'); }
      ui.go('home');
    }
  }

  function testIntro(cfg) {
    const daily = cfg.mode === 'daily';
    const mins = daily ? 'about 3 minutes' : 'about 9 minutes';
    const title = daily ? `Daily Challenge #${IQ.dailyNumber(cfg.date)}` : cfg.mode === 'challenge' ? `${esc(cfg.challenge.n || 'A friend')}’s challenge` : 'Quick Test';
    runbar({ name: title, part: daily ? '3 short parts' : `${cfg.subs.length} parts`, domain: null, frac: 0, count: '' });
    const c = screenCard(`
      <div class="eyebrow">${daily ? 'Today’s puzzles are the same for everyone' : 'Cognitive assessment'}</div>
      <h2>${title}</h2>
      ${cfg.mode === 'challenge' ? `<p>${esc(cfg.challenge.n || 'Your friend')} scored <b>${cfg.challenge.f}</b>. You’ll get the same parts and the same puzzle set.</p>` : ''}
      <ul class="sublist">${cfg.subs.map((id) => { const m = IQ.SUBTESTS[id]; return `<li><i class="ddot" style="background:${dc(m.domain)}"></i><span>${esc(m.name)}</span><small>${IQ.DOMAINS[m.domain].short}</small></li>`; }).join('')}</ul>
      <ul class="tips">
        <li>${icon('calendar', 18)}<span>Takes ${mins}. Find a quiet spot.</span></li>
        <li>${IQ.icon('calc', 18)}<span>No pen, paper or calculator.</span></li>
        <li>${icon('sparkle', 18)}<span>Questions adapt to you, so some will feel hard. That’s expected.</span></li>
      </ul>
      <button class="btn primary wide big" data-go>Begin</button>`);
    return race(onceBtn($('[data-go]', c)));
  }
  async function subIntro(mod, part) {
    const seen = S().seen[mod.id];
    const c = screenCard(`
      <div class="domtag" style="--c:${dc(mod.domain)}"><i></i>${IQ.DOMAINS[mod.domain].name}</div>
      <div class="bigicon" style="color:${dc(mod.domain)}">${IQ.icon(mod.icon, 44)}</div>
      <h2>${esc(mod.name)}</h2>
      <p class="lead">${esc(mod.blurb)}</p>
      <ul class="howto">${mod.howto.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      ${mod.timed ? '<p class="note">This part is timed. Speed counts.</p>' : ''}
      ${seen ? `<div class="row2"><button class="btn ghost" data-p>Practice first</button><button class="btn primary" data-go>Start</button></div>`
    : `<button class="btn primary wide" data-p>Try a practice question</button><button class="btn link" data-go>Skip practice</button>`}`);
    runbar({ part });
    return race(new Promise((res) => {
      $('[data-p]', c).addEventListener('click', () => { IQ.audio.play('tap'); res(true); });
      $('[data-go]', c).addEventListener('click', () => { IQ.audio.play('start'); res(false); });
    }));
  }

  function buildRecord(cfg, results) {
    const dom = {};
    for (const id of cfg.subs) {
      const r = results[id];
      if (!r) continue;
      const d = IQ.SUBTESTS[id].domain;
      dom[d] = dom[d] || { resp: [], subs: [], correct: 0, total: 0, log: [] };
      dom[d].resp.push(...r.responses);
      dom[d].subs.push(id);
      dom[d].correct += r.correct; dom[d].total += r.total;
      dom[d].log.push(...r.log);
      if (r.detail) dom[d].detail = r.detail;
    }
    const posts = {}, idx = {};
    for (const d of Object.keys(dom)) {
      posts[d] = IQ.posterior(dom[d].resp);
      idx[d] = Object.assign(IQ.indexScore(posts[d]), { subs: dom[d].subs, correct: dom[d].correct, total: dom[d].total, log: dom[d].log });
      if (dom[d].detail) idx[d].detail = dom[d].detail;
    }
    let fse;
    if (cfg.mode === 'daily') { const w = {}; Object.keys(posts).forEach((d) => (w[d] = 1)); fse = IQ.compositeScore(posts, w); }
    else fse = IQ.compositeScore(posts);
    return { id: IQ.uid(), ts: Date.now(), mode: cfg.mode, seed: cfg.seed, subs: cfg.subs, fse, idx,
      vs: cfg.challenge ? { n: cfg.challenge.n || 'Friend', f: cfg.challenge.f, i: cfg.challenge.i || {} } : null };
  }
  function finishTest(cfg, results) {
    const rec = buildRecord(cfg, results);
    const s = S();
    bump(s.practice);
    if (cfg.mode === 'daily') {
      s.daily.log[cfg.date] = { score: rec.fse.score, subs: rec.subs, idx: Object.fromEntries(Object.entries(rec.idx).map(([d, v]) => [d, { score: v.score, log: v.log }])) };
      if (s.daily.last !== cfg.date) bump(s.daily);
      // keep the log a sensible size
      const days = Object.keys(s.daily.log).sort();
      while (days.length > 120) delete s.daily.log[days.shift()];
      IQ.save(); checkBadges();
      ui.go('daily', cfg.date);
      return;
    }
    s.history.push(rec);
    if (s.history.length > 100) s.history.shift();
    s.stats.tests++;
    if (rec.vs && rec.fse.score > rec.vs.f) s.stats.wins++;
    IQ.save(); checkBadges();
    ui.go('result', rec.id);
  }

  /* ================= Gym flow ================= */
  ui.gymRec = (id) => (S().gym[id] = S().gym[id] || { lvl: 1, best: 0, xp: 0, plays: 0 });
  ui.startGym = async function (id, level) {
    const mod = IQ.SUBTESTS[id];
    newRun();
    RUN.kind = 'gym';
    enterRun();
    runbar({ name: mod.name, part: `Gym · Level ${level}`, domain: mod.domain, frac: 0, count: '' });
    try {
      if (!S().seen[id]) {
        const c = screenCard(`<div class="bigicon" style="color:${dc(mod.domain)}">${IQ.icon(mod.icon, 44)}</div><h2>${esc(mod.name)}</h2><p class="lead">${esc(mod.blurb)}</p>
          <ul class="howto">${mod.howto.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><button class="btn primary wide" data-go>Start level ${level}</button>`);
        await race(onceBtn($('[data-go]', c)));
        S().seen[id] = true;
      }
      const ctx = makeCtx({ mode: 'gym', seed: IQ.newSeed(), subId: id, level, n: mod.gymN || 6, feedback: true });
      const r = await race(runSub(mod, ctx));
      const g = ui.gymRec(id);
      const acc = r.log.length ? r.log.reduce((a, b) => a + b, 0) / r.log.length : 0;
      const pass = id === 'coding' ? r.log[0] === 1 : acc >= 0.66;
      const xp = (id === 'coding' ? (r.detail ? r.detail.net : 0) : r.correct * 10) + (pass ? 25 : 0);
      const rank0 = rankOf(totalXP()).name;
      g.plays++; g.xp += xp;
      let leveled = false;
      if (pass && level > g.best) { g.best = level; }
      if (pass && level < 10 && level + 1 > g.lvl) { g.lvl = level + 1; leveled = true; }
      bump(S().practice);
      IQ.save();
      checkBadges();
      const rank1 = rankOf(totalXP()).name;
      IQ.audio.play(pass ? 'levelup' : 'complete');
      const score = id === 'coding'
        ? `<div class="bigscore">${r.detail.net}</div><p class="muted">net correct · goal ${r.detail.target}</p>`
        : `<div class="bigscore">${r.correct}<small>/${r.total}</small></div><p class="muted">correct</p>`;
      const c = screenCard(`
        <div class="domtag" style="--c:${dc(mod.domain)}"><i></i>${esc(mod.name)} · Level ${level}</div>
        ${score}
        <h2>${pass ? (level === 10 ? 'Level 10 cleared. Peak form.' : leveled ? `Level ${level} cleared!` : 'Cleared!') : 'Not this time'}</h2>
        <p>${pass ? (leveled ? `Level ${level + 1} is now unlocked.` : 'Nice work.') : id === 'coding' ? `Reach ${r.detail.target} to clear this level.` : 'Get at least two thirds right to clear the level.'}</p>
        <div class="xpgain">+${xp} XP${rank1 !== rank0 ? ` · New rank: <b>${rank1}</b>` : ''}</div>
        <div class="stack">
          ${pass && level < 10 ? `<button class="btn primary wide" data-a="next">Play level ${level + 1}</button>` : ''}
          <button class="btn ${pass && level < 10 ? 'ghost' : 'primary'} wide" data-a="again">Play level ${level} again</button>
          <button class="btn link" data-a="back">Back to Gym</button>
        </div>`);
      const a = await race(new Promise((res) => $$('[data-a]', c).forEach((b) => b.addEventListener('click', () => { IQ.audio.play('tap'); res(b.dataset.a); }))));
      exitRun(); RUN = null;
      if (a === 'next') return ui.startGym(id, level + 1);
      if (a === 'again') return ui.startGym(id, level);
      ui.go('gymsub', id);
    } catch (e) {
      exitRun(); RUN = null;
      if (e !== ABORT) { console.error(e); ui.toast('Something went wrong.'); }
      ui.go('gymsub', id);
    }
  };

  /* ================= Challenges ================= */
  ui.challengeLink = function (rec) {
    const i = {};
    Object.entries(rec.idx).forEach(([d, v]) => (i[d] = v.score));
    const data = { v: 1, s: rec.seed, n: S().settings.name || '', subs: rec.subs, f: rec.fse.score, i };
    const base = location.href.split('#')[0].split('?')[0];
    return base + '#ch=' + IQ.b64e(JSON.stringify(data));
  };
  ui.parseChallenge = function (hash) {
    const m = String(hash || '').match(/ch=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try {
      const d = JSON.parse(IQ.b64d(m[1]));
      if (!d || d.v !== 1 || typeof d.s !== 'number' || typeof d.f !== 'number') return null;
      d.n = String(d.n || '').slice(0, 24);
      return d;
    } catch (e) { return null; }
  };
  async function askName() {
    if (S().settings.name) return S().settings.name;
    const v = await ui.modal(`<h3>Your name</h3><p>Shown to friends when they open your challenge.</p>
      <input class="field" maxlength="24" placeholder="e.g. Raj" data-name autocomplete="nickname">
      <div class="row2"><button class="btn ghost" data-v="skip">Skip</button><button class="btn primary" data-v="ok">Save</button></div>`, (el, close) => {
      const inp = $('[data-name]', el);
      setTimeout(() => inp.focus(), 50);
      el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => close(b.dataset.v === 'ok' ? inp.value.trim() : '')));
    });
    if (v) { S().settings.name = v.slice(0, 24); IQ.save(); }
    return v || '';
  }
  ui.sendChallenge = async function (rec) {
    await askName();
    const url = ui.challengeLink(rec);
    const who = S().settings.name || 'I';
    const ok = await ui.share({ title: 'IQ Test challenge', text: `${who} scored ${rec.fse.score} on the IQ Test. Can you beat it? Same puzzles, same test.`, url });
    if (ok !== false) { S().stats.sent++; IQ.save(); checkBadges(); }
  };

  /* ================= Screens ================= */
  const SCREENS = {};

  SCREENS.home = {
    render() {
      const s = S();
      const last = s.history[s.history.length - 1];
      const today = IQ.today();
      const dlog = s.daily.log[today];
      const dsubs = ui.dailySubs(today);
      const ds = liveStreak(s.daily);
      const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);
      const standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
      let hideInstall = false;
      try { hideInstall = localStorage.getItem('iqtest.hideInstall') === '1'; } catch (e) { /* ignore */ }
      return `
      <section class="hero card">
        <div class="eyebrow">Cognitive assessment</div>
        <h1>Quick Test</h1>
        <p class="lead">8 parts · about 9 minutes · one for each ability area</p>
        <div class="domstrip">${IQ.QUICK_ORDER.map((d) => `<span style="--c:${dc(d)}"><i></i>${IQ.DOMAINS[d].short}</span>`).join('')}</div>
        <button class="btn primary big wide" data-act="quick">${icon('play', 18)} Begin Quick Test</button>
      </section>

      <section class="card soon">
        <div><b>Full Test</b><small>16 parts · 15–20 minutes · narrower score range</small></div>
        <span class="chip">Coming soon</span>
      </section>

      <section class="card daily ${dlog ? 'done' : ''}">
        <div class="daily-head">
          <div><div class="eyebrow">${icon('calendar', 14)} Daily Challenge #${IQ.dailyNumber(today)}</div>
          <b>${dsubs.map((id) => IQ.SUBTESTS[id].name).join(' · ')}</b><small>3 short parts · about 3 minutes · same puzzles for everyone today</small></div>
          <div class="streak ${ds ? 'on' : ''}" title="Daily streak">${icon('flame', 18)}<b>${ds}</b></div>
        </div>
        ${dlog ? `<div class="daily-done"><div><span class="muted">Today’s score</span><b>${dlog.score}</b></div><button class="btn ghost" data-act="dailyres">View &amp; share</button></div>`
    : `<button class="btn primary wide" data-act="daily">Play today’s challenge</button>`}
      </section>

      ${last ? `<section class="card lastres" data-act="last">
        <div class="lr-l"><div class="eyebrow">Latest report · ${IQ.fmtDate(last.ts)}</div><div class="lr-score">${last.fse.score}</div><div class="muted">${IQ.classify(last.fse.score)} · range ${last.fse.lo}–${last.fse.hi}</div></div>
        <div class="lr-r">${ui.radar(Object.fromEntries(Object.entries(last.idx).map(([d, v]) => [d, v.score])), null, 150)}</div>
      </section>
      <div class="row2"><button class="btn ghost" data-act="challenge">${icon('share', 18)} Challenge a friend</button><button class="btn ghost" data-nav="progress">${icon('history', 18)} All results</button></div>` : ''}

      <section class="card gymteaser" data-nav="gym">
        <div><div class="eyebrow">Practice Gym</div><b>10 skills · 10 levels each</b><small>Explanations after every answer. Practice doesn’t change your test scores.</small></div>
        <span class="chev">${icon('chevron')}</span>
      </section>

      ${ios && !standalone && !hideInstall ? `<section class="card install">
        <b>Install on your Home Screen</b>
        <ol><li>Tap <b>Share</b> ${icon('share', 16)} in Safari’s toolbar.</li><li>Tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. It then works offline.</li></ol>
        <button class="btn link" data-act="hideinstall">Hide this</button>
      </section>` : ''}`;
    },
    bind(v) {
      v.onclick = (e) => {
        const a = e.target.closest('[data-act]');
        if (!a) return;
        IQ.audio.play('tap');
        const s = S();
        switch (a.dataset.act) {
          case 'quick': return ui.startQuick();
          case 'daily': return ui.startDaily();
          case 'dailyres': return ui.go('daily', IQ.today());
          case 'last': return ui.go('result', s.history[s.history.length - 1].id);
          case 'challenge': return ui.sendChallenge(s.history[s.history.length - 1]);
          case 'hideinstall': try { localStorage.setItem('iqtest.hideInstall', '1'); } catch (er) { /* ignore */ } return ui.refresh();
        }
      };
    },
  };

  SCREENS.result = {
    tab: 'progress',
    render(id) {
      const s = S();
      const rec = s.history.find((h) => h.id === id) || s.history[s.history.length - 1];
      if (!rec) return '<p class="muted">No result.</p>';
      SCREENS.result._rec = rec;
      const f = rec.fse;
      const vals = {}, vsv = rec.vs ? rec.vs.i : null;
      Object.entries(rec.idx).forEach(([d, v]) => (vals[d] = v.score));
      const core = IQ.DOMAIN_ORDER.filter((d) => d !== 'VK' && rec.idx[d]);
      const row = (d) => {
        const v = rec.idx[d];
        const subNames = v.subs.map((id2) => IQ.SUBTESTS[id2] ? IQ.SUBTESTS[id2].name : id2).join(', ');
        const det = d === 'PS' && v.detail ? `${v.detail.perMin} per minute` : `${v.correct}/${v.total} correct`;
        return `<div class="irow"><div class="iname"><i class="ddot" style="background:${dc(d)}"></i><div><b>${IQ.DOMAINS[d].name}</b><small>${esc(subNames)} · ${det}</small></div></div>
          <div class="iscore"><b>${v.score}</b><small>${v.lo}–${v.hi}</small></div>${rangeBar(v, d, vsv ? vsv[d] : null)}</div>`;
      };
      const vk = rec.idx.VK;
      const win = rec.vs ? f.score - rec.vs.f : 0;
      return `
      <div class="report">
        <div class="rephead"><button class="iconbtn" data-nav="progress" aria-label="Back">${icon('back')}</button>
          <div><div class="eyebrow">Cognitive Profile Report</div><div class="muted">${rec.mode === 'challenge' ? 'Friend challenge' : 'Quick Test'} · ${IQ.fmtDate(rec.ts)}</div></div></div>
        <section class="card fse">
          <div class="fse-label">Full-Scale Estimate</div>
          <div class="fse-score">${f.score}</div>
          <div class="fse-class">${IQ.classify(f.score)}</div>
          <div class="fse-ci">90% confidence range <b>${f.lo}–${f.hi}</b> · Percentile <b>${IQ.percentile(f.score)}</b></div>
          ${ui.bell(f.score)}
          <div class="fse-note">Estimated score, not clinically normed. <button class="btn link inline" data-nav="about">See How It Works</button></div>
        </section>
        ${rec.vs ? `<section class="card vsbox ${win > 0 ? 'win' : win < 0 ? 'lose' : 'tie'}">
          <div class="vs-side"><small>You</small><b>${f.score}</b></div>
          <div class="vs-mid">${win > 0 ? 'You win' : win < 0 ? `${esc(rec.vs.n)} wins` : 'Tie'}<small>${win ? `by ${Math.abs(win)}` : ''}</small></div>
          <div class="vs-side"><small>${esc(rec.vs.n)}</small><b>${rec.vs.f}</b></div>
        </section>` : ''}
        <section class="card">
          <h3>Ability profile</h3>
          ${ui.radar(vals, vsv)}
          <p class="cap">${rec.vs ? `Solid shape: you. Dashed: ${esc(rec.vs.n)}. ` : ''}*Verbal is shown for reference; it is not part of the Full-Scale Estimate.</p>
        </section>
        <section class="card">
          <h3>Index scores</h3>
          <div class="iscale"><span>55</span><span>70</span><span>85</span><span>100</span><span>115</span><span>130</span><span>145</span></div>
          ${core.map(row).join('')}
          <p class="cap">Bars show the 90% confidence range. Short parts give wider ranges.</p>
        </section>
        ${vk ? `<section class="card"><h3>Verbal Knowledge Index</h3><p class="cap">Reported separately because word knowledge depends on language and schooling.</p>${row('VK')}</section>` : ''}
        <section class="card strengths">${strengths(rec)}</section>
        <div class="stack">
          <button class="btn primary wide" data-act="challenge">${icon('share', 18)} Challenge a friend</button>
          <button class="btn ghost wide" data-nav="gym">Practise in the Gym</button>
          <button class="btn link" data-act="del">Delete this result</button>
        </div>
      </div>`;
    },
    bind(v) {
      v.onclick = async (e) => {
        const a = e.target.closest('[data-act]');
        if (!a) return;
        const rec = SCREENS.result._rec;
        if (a.dataset.act === 'challenge') ui.sendChallenge(rec);
        if (a.dataset.act === 'del' && (await ui.confirm('Delete result?', 'This removes it from your history on this device.', 'Delete', true))) {
          S().history = S().history.filter((h) => h.id !== rec.id); IQ.save(); ui.go('progress');
        }
      };
    },
  };
  function strengths(rec) {
    const core = IQ.DOMAIN_ORDER.filter((d) => d !== 'VK' && rec.idx[d]);
    const sorted = core.slice().sort((a, b) => rec.idx[b].score - rec.idx[a].score);
    const top = sorted[0], low = sorted[sorted.length - 1];
    const spread = rec.idx[top].score - rec.idx[low].score;
    // Only call something a strength if the ranges don't overlap much
    const real = rec.idx[top].lo > rec.idx[low].hi - 5;
    return `<h3>Reading your profile</h3>
      <p>Your highest index was <b style="color:${dc(top)}">${IQ.DOMAINS[top].name}</b> (${rec.idx[top].score}) and your lowest was <b style="color:${dc(low)}">${IQ.DOMAINS[low].name}</b> (${rec.idx[low].score}).
      ${real ? `A gap of ${spread} points with little overlap suggests a genuine relative strength.` : 'Their confidence ranges overlap, so treat the difference as uncertain.'}</p>
      <p class="cap">Each index comes from one short part. The Full-Scale Estimate is more reliable than any single index.</p>`;
  }

  SCREENS.daily = {
    render(date) {
      date = date || IQ.today();
      const d = S().daily.log[date];
      if (!d) return SCREENS.home.render();
      const ds = liveStreak(S().daily);
      return `
      <div class="report">
        <div class="rephead"><button class="iconbtn" data-nav="home" aria-label="Back">${icon('back')}</button>
          <div><div class="eyebrow">Daily Challenge #${IQ.dailyNumber(date)}</div><div class="muted">${IQ.fmtDate(new Date(date + 'T12:00:00').getTime())}</div></div></div>
        <section class="card fse">
          <div class="fse-label">Daily score</div>
          <div class="fse-score">${d.score}</div>
          <div class="fse-class">${IQ.classify(d.score)}</div>
          <div class="streakbig ${ds ? 'on' : ''}">${icon('flame', 22)} <b>${ds}</b> day streak</div>
        </section>
        <section class="card">
          ${d.subs.map((id) => { const m = IQ.SUBTESTS[id]; const v = d.idx[m.domain]; return `<div class="drow"><i class="ddot" style="background:${dc(m.domain)}"></i><b>${esc(m.name)}</b><span class="sq">${(v.log || []).map((x) => `<i class="${x ? 'y' : 'n'}"></i>`).join('')}</span><span class="dscore">${v.score}</span></div>`; }).join('')}
          <p class="cap">Three short parts give a rough score. The Quick Test is more accurate.</p>
        </section>
        <div class="stack"><button class="btn primary wide" data-act="share">${icon('share', 18)} Share result</button><button class="btn ghost wide" data-nav="home">Done</button></div>
      </div>`;
    },
    bind(v, date) {
      date = date || IQ.today();
      v.onclick = (e) => {
        const a = e.target.closest('[data-act="share"]');
        if (!a) return;
        const d = S().daily.log[date];
        const lines = d.subs.map((id) => { const m = IQ.SUBTESTS[id]; return (d.idx[m.domain].log || []).map((x) => (x ? '🟩' : '⬛')).join('') + ' ' + m.name; });
        ui.share({ title: 'IQ Test Daily', text: `IQ Test Daily #${IQ.dailyNumber(date)} · ${d.score}\n${lines.join('\n')}`, url: location.href.split('#')[0] });
      };
    },
  };

  SCREENS.challenge = {
    tab: 'home',
    render(ch) {
      return `<section class="card hero chal">
        <div class="eyebrow">${icon('trophy', 14)} Friend challenge</div>
        <h1>${esc(ch.n || 'A friend')} challenged you</h1>
        <div class="chal-score"><small>Score to beat</small><b>${ch.f}</b><span>${IQ.classify(ch.f)}</span></div>
        <p class="lead">Same 8 parts, same puzzle set, about 9 minutes. Afterwards you’ll see both profiles side by side.</p>
        <button class="btn primary big wide" data-act="go">${icon('play', 18)} Accept challenge</button>
        <button class="btn link" data-nav="home">Not now</button>
      </section>`;
    },
    bind(v, ch) { v.onclick = (e) => { if (e.target.closest('[data-act="go"]')) { IQ.audio.play('start'); ui.startQuick(ch); } }; },
  };

  SCREENS.gym = {
    render() {
      const xp = totalXP(), rk = rankOf(xp);
      const ps = liveStreak(S().practice);
      const pct = rk.next ? ((xp - rk.base) / (rk.next - rk.base)) * 100 : 100;
      return `
      <div class="pagehead"><h1>Practice Gym</h1><p class="muted">Train each skill with instant feedback. Gym sessions never change your test scores.</p></div>
      <section class="card rankcard">
        <div><div class="eyebrow">Rank</div><b class="rank">${rk.name}</b><small>${xp} XP${rk.next ? ` · ${rk.next - xp} to next rank` : ''}</small><div class="xpbar"><i style="width:${pct}%"></i></div></div>
        <div class="streak ${ps ? 'on' : ''}" title="Practice streak">${icon('flame', 18)}<b>${ps}</b></div>
      </section>
      <div class="gymgrid">${IQ.GYM_ORDER.map((id) => {
        const m = IQ.SUBTESTS[id], g = S().gym[id] || { lvl: 1, best: 0 };
        return `<button class="gtile" data-sub="${id}" style="--c:${dc(m.domain)}">
          <span class="gicon">${IQ.icon(m.icon, 26)}</span>
          <span class="gname">${esc(m.name)}</span>
          <span class="gdom">${IQ.DOMAINS[m.domain].short}</span>
          <span class="glv"><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < g.best ? 'on' : ''}"></i>`).join('')}</span><small>${g.best ? `Level ${g.best} cleared` : 'Not started'}</small></span>
        </button>`;
      }).join('')}</div>`;
    },
    bind(v) { v.onclick = (e) => { const t = e.target.closest('[data-sub]'); if (t) { IQ.audio.play('tap'); ui.go('gymsub', t.dataset.sub); } }; },
  };

  SCREENS.gymsub = {
    tab: 'gym',
    render(id) {
      const m = IQ.SUBTESTS[id], g = ui.gymRec(id);
      return `
      <div class="rephead"><button class="iconbtn" data-nav="gym" aria-label="Back">${icon('back')}</button><div><div class="eyebrow">Practice Gym</div></div></div>
      <section class="card gymdetail" style="--c:${dc(m.domain)}">
        <div class="domtag" style="--c:${dc(m.domain)}"><i></i>${IQ.DOMAINS[m.domain].name}</div>
        <div class="bigicon" style="color:${dc(m.domain)}">${IQ.icon(m.icon, 44)}</div>
        <h2>${esc(m.name)}</h2>
        <p class="lead">${esc(m.blurb)}</p>
        <ul class="howto">${m.howto.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <div class="levels">${Array.from({ length: 10 }, (_, i) => {
          const L = i + 1, locked = L > g.lvl, cleared = L <= g.best;
          return `<button class="lvl ${cleared ? 'cleared' : ''} ${locked ? 'locked' : ''} ${L === Math.min(g.lvl, 10) ? 'cur' : ''}" data-l="${L}" ${locked ? 'disabled' : ''} aria-label="Level ${L}${locked ? ' locked' : ''}">${locked ? icon('lock', 14) : L}</button>`;
        }).join('')}</div>
        <p class="cap">${levelHint(id)}</p>
        <button class="btn primary wide big" data-l="${Math.min(g.lvl, 10)}">${icon('play', 18)} Play level ${Math.min(g.lvl, 10)}</button>
        <div class="gstats"><span><b>${g.plays}</b> sessions</span><span><b>${g.xp}</b> XP</span><span><b>${g.best}</b> best level</span></div>
      </section>`;
    },
    bind(v, id) { v.onclick = (e) => { const b = e.target.closest('[data-l]'); if (b && !b.disabled) { IQ.audio.play('start'); ui.startGym(id, +b.dataset.l); } }; },
  };
  function levelHint(id) {
    switch (id) {
      case 'digitspan': return 'Each level adds a digit. Clear it by getting 4 of 6 sequences right.';
      case 'corsi': return 'Each level adds a block to the sequence. Clear it with 4 of 6 right.';
      case 'coding': return 'Each level raises the goal for 60 seconds of matching.';
      case 'paired': return 'Each level adds one more pair to learn. Clear it with two thirds right.';
      default: return 'Each level is harder. Clear it by getting at least two thirds right.';
    }
  }

  SCREENS.progress = {
    render() {
      const s = S();
      const hist = s.history.slice().reverse();
      const best = s.history.reduce((m, h) => Math.max(m, h.fse ? h.fse.score : 0), 0);
      const days = [];
      for (let i = 27; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(IQ.today(d)); }
      return `
      <div class="pagehead"><h1>Progress</h1></div>
      <div class="stats4">
        <div class="stat"><b>${s.stats.tests}</b><small>tests taken</small></div>
        <div class="stat"><b>${best || '–'}</b><small>best estimate</small></div>
        <div class="stat"><b>${liveStreak(s.daily)}</b><small>daily streak</small></div>
        <div class="stat"><b>${s.daily.bestStreak || 0}</b><small>best streak</small></div>
      </div>
      ${s.history.length ? `<section class="card"><h3>Full-Scale Estimate over time</h3>${ui.lineChart(s.history.slice(-20).map((h) => ({ v: h.fse.score, l: new Date(h.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })))}
        <p class="cap">Scores usually rise a few points on retakes from practice alone. Waiting a few weeks gives a fairer comparison.</p></section>` : ''}
      <section class="card"><h3>Results</h3>
        ${hist.length ? `<div class="hlist">${hist.map((h) => `<button class="hrow" data-id="${h.id}"><div><b>${h.fse.score}</b><small>${IQ.classify(h.fse.score)}</small></div><div class="hmeta">${h.mode === 'challenge' ? `vs ${esc(h.vs.n)} (${h.vs.f})` : 'Quick Test'}<small>${IQ.fmtDate(h.ts)}</small></div>${icon('chevron', 18)}</button>`).join('')}</div>`
    : `<p class="muted">No tests yet. Your reports will appear here.</p><button class="btn primary wide" data-nav="home">Take the Quick Test</button>`}
      </section>
      <section class="card"><h3>Daily challenge · last 4 weeks</h3>
        <div class="cal">${days.map((d) => { const r = s.daily.log[d]; return `<span class="cday ${r ? 'on' : ''} ${d === IQ.today() ? 'today' : ''}" title="${d}${r ? ': ' + r.score : ''}">${r ? r.score : ''}</span>`; }).join('')}</div>
      </section>
      <section class="card"><h3>Badges</h3>
        <div class="badges">${IQ.BADGES.map((b) => `<div class="badge ${s.badges[b.id] ? 'got' : ''}">${icon(s.badges[b.id] ? 'star' : 'lock', 20)}<b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
      </section>`;
    },
    bind(v) { v.onclick = (e) => { const r = e.target.closest('[data-id]'); if (r) { IQ.audio.play('tap'); ui.go('result', r.dataset.id); } }; },
  };

  SCREENS.about = {
    render() {
      return `
      <div class="pagehead"><h1>How it works</h1><p class="muted">What this test measures, how scores are calculated, and what they can and can’t tell you.</p></div>
      <section class="card notice">
        <h3>The short version</h3>
        <p>IQ Test gives an <b>estimated</b> score on the familiar IQ scale (average 100, most adults between 85 and 115). It uses the same kinds of tasks as professional tests, but it has <b>not been normed</b>: we have not tested thousands of representative adults to calibrate it. Treat your score as an informed estimate for interest and self-comparison, not a clinical result.</p>
      </section>
      <section class="card"><h3>What it measures</h3>
        <p>Modern intelligence tests are built on the Cattell–Horn–Carroll model, which splits ability into broad areas that all correlate with a general factor (“g”). This app covers eight of them:</p>
        <div class="domlist">${IQ.DOMAIN_ORDER.map((d) => `<div class="dl"><i class="ddot" style="background:${dc(d)}"></i><div><b>${IQ.DOMAINS[d].name}</b><small>${IQ.DOMAINS[d].desc} ${IQ.BY_DOMAIN[d].map((id) => IQ.SUBTESTS[id].name).join(' · ')}</small></div></div>`).join('')}</div>
      </section>
      <section class="card"><h3>How the score is calculated</h3>
        <ol class="steps">
          <li><b>Adaptive questions.</b> Every puzzle is generated fresh with a known difficulty. Get one right and the next is harder; miss one and it eases off. This finds your level quickly.</li>
          <li><b>Ability estimate.</b> After each part, a statistical model (item response theory) estimates where your ability sits on an adult scale, and how uncertain that estimate is.</li>
          <li><b>Index scores.</b> Each area becomes an index score: 100 is the modelled adult average and every 15 points is one standard deviation.</li>
          <li><b>Full-Scale Estimate.</b> The indices are combined, weighted toward the strongest measures of general reasoning. Processing Speed and Reflective Reasoning count for less: speed on a phone depends partly on the device, and reflection questions measure a related but separate skill. Verbal Knowledge is reported separately because it depends on language and schooling.</li>
          <li><b>Confidence range.</b> The 90% range shows where your true score probably lies. It is centred on the estimated true score, so the headline number can sit slightly off-centre, as on professional reports.</li>
        </ol>
      </section>
      <section class="card"><h3>Reading your score</h3>
        <table class="ctable"><tr><th>Score</th><th>Description</th><th>Adults in range</th></tr>
          <tr><td>130+</td><td>Very High</td><td>~2%</td></tr><tr><td>120–129</td><td>High</td><td>~7%</td></tr><tr><td>110–119</td><td>High Average</td><td>~16%</td></tr>
          <tr><td>90–109</td><td>Average</td><td>~50%</td></tr><tr><td>80–89</td><td>Low Average</td><td>~16%</td></tr><tr><td>70–79</td><td>Low</td><td>~7%</td></tr><tr><td>Below 70</td><td>Very Low</td><td>~2%</td></tr></table>
        <p class="cap">Percentages follow the normal curve that IQ scales are built on.</p>
      </section>
      <section class="card"><h3>Limits you should know</h3>
        <ul class="lim">
          <li><b>Not normed.</b> Puzzle difficulties come from published research on what makes these tasks hard, tuned by computer simulation. A real norming study would be needed to make the scale exact.</li>
          <li><b>Not a diagnosis.</b> This cannot identify learning disabilities, giftedness or any medical condition. Only a qualified psychologist can do that with a supervised test.</li>
          <li><b>Practice effects.</b> Retaking soon after usually raises scores by a few points without any real change in ability.</li>
          <li><b>Conditions matter.</b> Tiredness, distraction, screen size and touch delay all affect results, especially on timed parts.</li>
          <li><b>Built for adults.</b> The scale assumes an adult (roughly 18–60). Scores for children or older adults are not meaningful here.</li>
          <li><b>Practice doesn’t make you smarter.</b> Gym levels improve with practice, but research finds little evidence that brain training raises general intelligence. Enjoy it as training for these specific skills.</li>
        </ul>
      </section>
      <section class="card"><h3>Your data</h3>
        <p>Everything stays on this device. There are no accounts and nothing is sent anywhere. Challenge links carry only your name, your scores and the test’s puzzle seed. To move to another device, use the save code in Settings.</p>
      </section>
      <p class="cap center">IQ Test · Phase 1 · save format v${IQ.SAVE_VERSION}</p>`;
    },
  };

  SCREENS.settings = {
    tab: 'none',
    render() {
      const st = S().settings;
      const PREV = { navy: ['#0a1224', '#5b8cff', '#eef2f9', '#2a56d6'], graphite: ['#0e0f12', '#e2e5ea', '#f1f2f4', '#22262d'], forest: ['#07130e', '#34d399', '#edf5f0', '#15803d'], plum: ['#110a1b', '#c084fc', '#f5f0fb', '#7e22ce'], ember: ['#160b09', '#fb7a5c', '#faf1ed', '#b83a1d'] };
      const dark = IQ.resolvedMode() === 'dark';
      return `
      <div class="pagehead"><h1>Settings</h1></div>
      <section class="card"><h3>Colour theme</h3>
        <div class="swatches">${IQ.THEMES.map((t) => { const p = PREV[t.id]; return `<button class="swatch ${st.theme === t.id ? 'on' : ''}" data-theme="${t.id}" aria-pressed="${st.theme === t.id}">
          <span class="sw" style="background:${dark ? p[0] : p[2]}"><i style="background:${dark ? p[1] : p[3]}"></i></span><span>${t.name}</span></button>`; }).join('')}</div>
      </section>
      <section class="card"><h3>Appearance</h3>
        <div class="seg">${['auto', 'light', 'dark'].map((m) => `<button data-mode="${m}" class="${st.mode === m ? 'on' : ''}">${m === 'auto' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}</button>`).join('')}</div>
        <p class="cap">Auto follows your device’s light or dark setting.</p>
      </section>
      <section class="card">
        <label class="toggle"><span><b>Sound</b><small>Soft clicks and chimes. The iPhone silent switch mutes them.</small></span><input type="checkbox" data-sound ${st.sound ? 'checked' : ''}><i></i></label>
        <label class="fieldrow"><span><b>Your name</b><small>Shown on challenges you send.</small></span><input class="field" maxlength="24" data-name value="${esc(st.name)}" placeholder="Optional" autocomplete="nickname"></label>
      </section>
      <section class="card"><h3>Move to another device</h3>
        <p class="cap">Copy your save code, then paste it into IQ Test on the other device.</p>
        <div class="row2"><button class="btn ghost" data-act="export">${icon('copy', 18)} Copy save code</button><button class="btn ghost" data-act="import">Load save code</button></div>
      </section>
      <section class="card"><button class="btn danger wide" data-act="reset">Reset all data</button></section>`;
    },
    bind(v) {
      v.onclick = async (e) => {
        const t = e.target.closest('[data-theme]'), m = e.target.closest('[data-mode]'), a = e.target.closest('[data-act]');
        const st = S().settings;
        if (t) { st.theme = t.dataset.theme; IQ.save(); IQ.applyTheme(); IQ.audio.play('select'); ui.refresh(); }
        if (m) { st.mode = m.dataset.mode; IQ.save(); IQ.applyTheme(); IQ.audio.play('select'); ui.refresh(); }
        if (!a) return;
        if (a.dataset.act === 'export') { const ok = await ui.copy(IQ.exportCode()); ui.toast(ok ? 'Save code copied. Paste it into IQ Test on your other device.' : 'Could not copy'); }
        if (a.dataset.act === 'import') {
          const code = await ui.modal(`<h3>Load save code</h3><p>This replaces the progress on this device.</p><textarea class="field" rows="4" data-code placeholder="IQT1-…"></textarea>
            <div class="row2"><button class="btn ghost" data-v="0">Cancel</button><button class="btn primary" data-v="1">Load</button></div>`,
          (el, close) => el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => close(b.dataset.v === '1' ? $('[data-code]', el).value : null))));
          if (code) {
            try { IQ.state = IQ.importCode(code); IQ.save(); IQ.applyTheme(); ui.toast('Progress loaded'); ui.go('home'); } catch (er) { ui.toast(esc(er.message), 'bad'); }
          }
        }
        if (a.dataset.act === 'reset' && (await ui.confirm('Reset everything?', 'Deletes all results, Gym progress, streaks and badges on this device. This cannot be undone.', 'Reset', true))) {
          IQ.state = IQ.defaultState(); IQ.save(); IQ.applyTheme(); ui.toast('All data reset'); ui.go('home');
        }
      };
      $('[data-sound]', v).onchange = (e) => { S().settings.sound = e.target.checked; IQ.save(); IQ.audio.unlock(); IQ.audio.play('confirm'); };
      $('[data-name]', v).onchange = (e) => { S().settings.name = e.target.value.trim().slice(0, 24); IQ.save(); ui.toast('Name saved'); };
    },
  };
})();
