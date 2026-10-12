/* =====================================================================
   IQ Test — tasks.js
   Interactive (non multiple-choice) subtests:
     Digit Span (forward + backward), Corsi Blocks, Symbol Coding,
     Paired Associates.
   Each task is async run(ctx) and resolves to
     { responses: [...IRT responses], log: [1,0,...], correct, total, detail }
   ctx (built in ui.js) gives: host, mode, n, level, feedback, rng(tag),
     progress(i, n), check() (throws if the user quit), wait(ms).

   Norms used for scoring are approximate adult values and are a
   speculative calibration (see NOTES.md):
     forward digit span mean 6.6 (SD 1.2), backward 4.9 (SD 1.3),
     Corsi span mean 5.7 (SD 1.1), coding 40 net per minute (SD 9).
   ===================================================================== */
'use strict';
(function () {
  IQ.tasks = {};
  const $ = (sel, el) => (el || document).querySelector(sel);
  const NORM = { f: [6.6, 1.2], b: [4.9, 1.3], corsi: [5.7, 1.1] };

  function onceClick(el) {
    return new Promise((res) => el.addEventListener('click', () => { IQ.audio.play('tap'); res(); }, { once: true }));
  }
  function digitsSeq(rng, len) {
    const out = [];
    while (out.length < len) {
      const d = rng.int(0, 9);
      const n = out.length;
      if (n && out[n - 1] === d) continue; // no immediate repeats
      if (n >= 2 && out[n - 1] - out[n - 2] === d - out[n - 1] && Math.abs(d - out[n - 1]) === 1) continue; // no 3-runs like 4-5-6
      out.push(d);
    }
    return out;
  }
  IQ.tasks._nextLen = (...a) => nextLen(...a);
  function nextLen(responses, norm, start, prev, lo, hi) {
    if (!responses.length) return start;
    const post = IQ.posterior(responses);
    let L = Math.round(norm[0] + norm[1] * post.theta);
    L = IQ.clamp(L, prev - 2, prev + 2);
    return IQ.clamp(L, lo, hi);
  }
  function card(host, html) {
    host.className = 'runbody center';
    host.innerHTML = `<div class="taskcard">${html}</div>`;
    return host.firstElementChild;
  }

  /* -------------------------- Digit Span -------------------------- */
  IQ.tasks.digitspan = async function (ctx) {
    const host = ctx.host;
    const responses = [], log = [];
    let blocks;
    if (ctx.mode === 'practice') blocks = [{ dir: 'f', n: 1, fixed: 3 }, { dir: 'b', n: 1, fixed: 3 }];
    else if (ctx.mode === 'gym') blocks = [{ dir: 'f', n: 3, fixed: Math.min(12, ctx.level + 3) }, { dir: 'b', n: 3, fixed: Math.min(11, ctx.level + 2) }];
    else if (ctx.mode === 'daily') blocks = [{ dir: 'f', n: 3 }, { dir: 'b', n: 2 }];
    else blocks = [{ dir: 'f', n: ctx.n || 4 }, { dir: 'b', n: ctx.n || 4 }];
    const total = blocks.reduce((s, b) => s + b.n, 0);
    let done = 0;
    for (const blk of blocks) {
      const resp = [];
      const c = card(host, `
        <div class="bigicon">${blk.dir === 'f' ? '1 → 9' : '9 ← 1'}</div>
        <h2>${blk.dir === 'f' ? 'Same order' : 'Reverse order'}</h2>
        <p>${blk.dir === 'f' ? 'Digits appear one at a time. Then type them <b>in the same order</b>.' : 'Now type the digits <b>backwards</b>, starting with the last one you saw.'}</p>
        <button class="btn primary wide" data-go>Start</button>`);
      await onceClick($('[data-go]', c));
      ctx.check();
      let prev = blk.dir === 'f' ? 5 : 4;
      for (let t = 0; t < blk.n; t++) {
        ctx.check();
        ctx.progress(done, total);
        const len = blk.fixed || nextLen(resp, NORM[blk.dir], blk.dir === 'f' ? 5 : 4, prev, 2, 10);
        prev = len;
        const seq = digitsSeq(ctx.rng(`ds|${blk.dir}|${t}|${len}`), len);
        const ok = await spanTrial(ctx, seq, blk.dir);
        const it = { a: 1.5, b: (len - NORM[blk.dir][0]) / NORM[blk.dir][1], c: 0, x: ok ? 1 : 0 };
        resp.push(it); responses.push(it); log.push(ok ? 1 : 0);
        done++;
      }
    }
    ctx.progress(total, total);
    return { responses, log, correct: log.reduce((a, b) => a + b, 0), total: log.length };
  };

  async function spanTrial(ctx, seq, dir) {
    const host = ctx.host;
    host.className = 'runbody span';
    host.innerHTML = `
      <div class="span-top"><div class="span-label">${dir === 'f' ? 'Same order' : 'Reverse order'} · ${seq.length} digits</div></div>
      <div class="span-display" aria-live="polite"><span class="digit"></span></div>
      <div class="span-entry"></div>
      <div class="keypad disabled">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="key" data-k="${d}">${d}</button>`).join('')}
        <button class="key ghost" data-k="del" aria-label="Delete">⌫</button><button class="key" data-k="0">0</button><button class="key ghost" data-k="clr">Clear</button></div>`;
    const disp = $('.digit', host), entry = $('.span-entry', host), pad = $('.keypad', host);
    disp.textContent = '•';
    disp.classList.add('ready');
    await ctx.wait(900);
    disp.classList.remove('ready');
    for (const d of seq) {
      ctx.check();
      disp.textContent = d;
      disp.classList.add('on');
      IQ.audio.play('flash');
      await ctx.wait(850);
      disp.classList.remove('on');
      disp.textContent = '';
      await ctx.wait(220);
    }
    disp.textContent = dir === 'f' ? 'Type them in order' : 'Type them backwards';
    disp.classList.add('prompt');
    pad.classList.remove('disabled');
    const target = dir === 'f' ? seq : seq.slice().reverse();
    IQ.debug.span = target;
    const typed = [];
    const draw = () => {
      entry.innerHTML = Array.from({ length: seq.length }, (_, i) => `<span class="slot ${i < typed.length ? 'filled' : ''}">${i < typed.length ? typed[i] : ''}</span>`).join('');
    };
    draw();
    const ok = await new Promise((res) => {
      const press = (k) => {
        if (k === 'del') typed.pop();
        else if (k === 'clr') typed.length = 0;
        else if (typed.length < seq.length) typed.push(+k);
        IQ.audio.play('tap');
        draw();
        if (typed.length === seq.length) { cleanup(); setTimeout(() => res(typed.every((d, i) => d === target[i])), 250); }
      };
      const onClick = (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); };
      const onKey = (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
      const cleanup = () => { pad.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); pad.classList.add('disabled'); };
      pad.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      ctx.onAbort(cleanup);
    });
    if (ctx.feedback) {
      entry.classList.add(ok ? 'good' : 'bad');
      disp.textContent = ok ? 'Correct' : `Answer: ${target.join(' ')}`;
      IQ.audio.play(ok ? 'correct' : 'wrong');
      await ctx.wait(ok ? 900 : 1900);
    } else await ctx.wait(250);
    return ok;
  }

  /* -------------------------- Corsi Blocks -------------------------- */
  // Fixed, irregular 9-block layout (percent of board), like the original board
  const CORSI_POS = [[10, 66], [28, 10], [40, 46], [62, 26], [80, 6], [80, 50], [56, 74], [8, 30], [80, 82]];
  IQ.tasks.corsi = async function (ctx) {
    const host = ctx.host;
    const responses = [], log = [];
    const n = ctx.mode === 'practice' ? 1 : ctx.mode === 'gym' ? 6 : ctx.mode === 'daily' ? 4 : ctx.n || 6;
    let prev = 4;
    for (let t = 0; t < n; t++) {
      ctx.check();
      ctx.progress(t, n);
      const len = ctx.mode === 'practice' ? 3 : ctx.mode === 'gym' ? Math.min(9, ctx.level + 2) : nextLen(responses, NORM.corsi, 4, prev, 2, 9);
      prev = len;
      const rng = ctx.rng(`corsi|${t}|${len}`);
      const seq = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, len);
      const ok = await corsiTrial(ctx, seq);
      const it = { a: 1.4, b: (len - NORM.corsi[0]) / NORM.corsi[1], c: 0, x: ok ? 1 : 0 };
      responses.push(it); log.push(ok ? 1 : 0);
    }
    ctx.progress(n, n);
    return { responses, log, correct: log.reduce((a, b) => a + b, 0), total: n };
  };
  async function corsiTrial(ctx, seq) {
    const host = ctx.host;
    host.className = 'runbody corsi';
    host.innerHTML = `
      <div class="span-top"><div class="span-label corsi-msg">Watch the blocks · ${seq.length}</div></div>
      <div class="board">${CORSI_POS.map((p, i) => `<button class="blk" data-b="${i}" style="left:${p[0]}%;top:${p[1]}%" aria-label="Block ${i + 1}"></button>`).join('')}</div>
      <div class="span-entry"></div>`;
    const board = $('.board', host), msg = $('.corsi-msg', host), entry = $('.span-entry', host);
    const blocks = [...host.querySelectorAll('.blk')];
    board.classList.add('locked');
    await ctx.wait(800);
    for (const i of seq) {
      ctx.check();
      blocks[i].classList.add('lit');
      IQ.audio.play('flash');
      await ctx.wait(650);
      blocks[i].classList.remove('lit');
      await ctx.wait(260);
    }
    msg.textContent = 'Now tap them in the same order';
    IQ.debug.corsi = seq;
    board.classList.remove('locked');
    const taps = [];
    const draw = () => (entry.innerHTML = Array.from({ length: seq.length }, (_, i) => `<span class="slot dot ${i < taps.length ? 'filled' : ''}"></span>`).join(''));
    draw();
    const ok = await new Promise((res) => {
      const onClick = (e) => {
        const b = e.target.closest('.blk');
        if (!b || taps.length >= seq.length) return;
        const i = +b.dataset.b;
        taps.push(i);
        b.classList.add('tap');
        setTimeout(() => b.classList.remove('tap'), 220);
        IQ.audio.play('tap');
        draw();
        if (taps.length === seq.length) { board.removeEventListener('click', onClick); board.classList.add('locked'); setTimeout(() => res(taps.every((x, k) => x === seq[k])), 300); }
      };
      board.addEventListener('click', onClick);
      ctx.onAbort(() => board.removeEventListener('click', onClick));
    });
    if (ctx.feedback) {
      msg.textContent = ok ? 'Correct' : 'Not quite: here is the sequence';
      IQ.audio.play(ok ? 'correct' : 'wrong');
      if (!ok) {
        await ctx.wait(500);
        for (const [k, i] of seq.entries()) { blocks[i].classList.add('lit'); blocks[i].textContent = k + 1; await ctx.wait(450); blocks[i].classList.remove('lit'); }
        await ctx.wait(900);
      } else await ctx.wait(800);
    } else await ctx.wait(250);
    return ok;
  }

  /* -------------------------- Symbol Coding -------------------------- */
  IQ.tasks.coding = async function (ctx) {
    const host = ctx.host;
    const rng = ctx.rng('coding');
    const glyphs = IQ.makeGlyphs(rng, 9, 3);
    const practice = ctx.mode === 'practice';
    const dur = ctx.mode === 'daily' ? 45 : 60;
    const target = ctx.mode === 'gym' ? 18 + 3 * ctx.level : null;
    host.className = 'runbody coding';
    host.innerHTML = `
      <div class="code-key">${glyphs.map((g, i) => `<div class="kcell">${IQ.glyphSVG(g, 30)}<b>${i + 1}</b></div>`).join('')}</div>
      <div class="code-mid">
        <div class="code-stim">${''}</div>
        <div class="code-status">${practice ? 'Practice: find the symbol in the key and tap its number' : `Tap <b>Start</b>, then go as fast as you can for ${dur} seconds`}</div>
      </div>
      <div class="timerbar big ${practice ? 'hidden' : ''}"><i></i></div>
      <div class="keypad nine">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="key" data-k="${d}">${d}</button>`).join('')}</div>
      ${practice ? '' : '<button class="btn primary wide startbtn" data-go>Start</button>'}`;
    const stim = $('.code-stim', host), status = $('.code-status', host), pad = $('.keypad', host), bar = $('.timerbar i', host);
    let cur = -1, correct = 0, errors = 0, shown = 0;
    const next = () => {
      let k;
      do { k = rng.int(0, 8); } while (k === cur);
      cur = k; shown++;
      IQ.debug.coding = k + 1;
      stim.innerHTML = IQ.glyphSVG(glyphs[k], 92, 'stim');
      stim.classList.remove('pop'); void stim.offsetWidth; stim.classList.add('pop');
    };
    if (!practice) {
      pad.classList.add('disabled');
      await onceClick($('[data-go]', host));
      ctx.check();
      $('[data-go]', host).remove();
      pad.classList.remove('disabled');
      status.innerHTML = '&nbsp;';
    }
    next();
    const limit = practice ? 6 : Infinity;
    await new Promise((res) => {
      let elapsed = 0, last = performance.now(), paused = false, raf = 0, finished = false;
      const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); cleanup(); res(); };
      const tick = (now) => {
        if (!paused) elapsed += (now - last) / 1000 / IQ.TIME_SCALE;
        last = now;
        if (!practice) {
          bar.style.transform = `scaleX(${Math.max(0, 1 - elapsed / dur)})`;
          if (elapsed >= dur) return finish();
        }
        raf = requestAnimationFrame(tick);
      };
      const vis = () => { paused = document.hidden; last = performance.now(); };
      const press = (k) => {
        const good = k === cur + 1;
        if (good) correct++; else errors++;
        const b = pad.querySelector(`[data-k="${k}"]`);
        if (b) { b.classList.add(good ? 'hit' : 'miss'); setTimeout(() => b.classList.remove('hit', 'miss'), 160); }
        if (practice) {
          IQ.audio.play(good ? 'correct' : 'wrong');
          status.textContent = good ? 'Correct' : `That symbol is ${cur + 1}`;
          if (!good) return; // must get it right to continue
          if (correct >= limit) return finish();
        } else IQ.audio.play('tap');
        next();
      };
      const onClick = (e) => { const b = e.target.closest('[data-k]'); if (b) press(+b.dataset.k); };
      const onKey = (e) => { if (/^[1-9]$/.test(e.key)) press(+e.key); };
      const cleanup = () => { pad.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', vis); pad.classList.add('disabled'); };
      pad.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', vis);
      ctx.onAbort(finish);
      raf = requestAnimationFrame(tick);
    });
    ctx.check();
    const net = Math.max(0, correct - errors);
    if (practice) return { responses: [], log: [], correct, total: correct, detail: { net } };
    const perMin = (net * 60) / dur;
    const mu = IQ.clamp((perMin - 40) / 9, -3.5, 3.5);
    stim.innerHTML = `<div class="code-done"><b>${correct}</b> correct${errors ? ` · ${errors} wrong` : ''}</div>`;
    status.textContent = target ? (net >= target ? `Goal reached (${target})` : `Goal was ${target}`) : 'Time';
    IQ.audio.play('complete');
    await ctx.wait(1300);
    // gym pass/fail uses a single "item"
    const log = target ? [net >= target ? 1 : 0] : [1];
    return { responses: [{ mu, se: 0.45 }], log, correct, total: correct + errors, detail: { net, errors, perMin: Math.round(perMin), target } };
  };

  /* -------------------------- Paired Associates -------------------------- */
  const WORDS = ['river', 'lamp', 'coin', 'horse', 'cloud', 'apple', 'bridge', 'candle', 'mirror', 'garden', 'needle', 'ladder',
    'pillow', 'rocket', 'violin', 'anchor', 'basket', 'castle', 'feather', 'hammer', 'island', 'jacket', 'kettle', 'lemon'];
  const pairB = (k) => -1.6 + 0.38 * (k - 4);
  IQ.tasks.paired = async function (ctx) {
    const responses = [], log = [];
    let rounds;
    if (ctx.mode === 'practice') rounds = [3];
    else if (ctx.mode === 'gym') rounds = [Math.min(12, ctx.level + 3)];
    else if (ctx.mode === 'daily') rounds = [5];
    else rounds = [4, null];
    const totalItems = rounds.reduce((s, r) => s + (r || 6), 0);
    let done = 0;
    for (let ri = 0; ri < rounds.length; ri++) {
      let k = rounds[ri];
      if (k == null) {
        const th = IQ.posterior(responses).theta;
        k = th > 0.3 ? 8 : th < -0.6 ? 5 : 6;
      }
      const rng = ctx.rng(`pa|${ri}|${k}`);
      const glyphs = IQ.makeGlyphs(rng, k, 3);
      const words = rng.shuffle(WORDS).slice(0, k);
      const pairs = glyphs.map((g, i) => ({ g, w: words[i] }));
      // study
      ctx.check();
      ctx.progress(done, totalItems);
      const studyMs = Math.round((2200 * k + 2000) * (ctx.mode === 'practice' ? 1.5 : 1) * IQ.TIME_SCALE);
      const host = ctx.host;
      host.className = 'runbody paired';
      host.innerHTML = `
        <div class="span-top"><div class="span-label">Learn these ${k} pairs</div></div>
        <div class="pair-grid n${k}">${pairs.map((p) => `<div class="pair">${IQ.glyphSVG(p.g, 40)}<span>${p.w}</span></div>`).join('')}</div>
        <div class="timerbar"><i></i></div>
        <button class="btn ghost wide" data-go>I'm ready</button>`;
      const bar = $('.timerbar i', host);
      bar.style.transition = `transform ${studyMs}ms linear`;
      requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.transform = 'scaleX(0)')));
      await Promise.race([new Promise((r) => setTimeout(r, studyMs)), onceClick($('[data-go]', host))]);
      ctx.check();
      // recall in shuffled order
      const order = rng.shuffle(pairs.map((_, i) => i));
      for (const idx of order) {
        ctx.check();
        ctx.progress(done, totalItems);
        const p = pairs[idx];
        const optWords = rng.shuffle(words);
        IQ.debug.paired = p.w;
        host.className = 'runbody paired';
        host.innerHTML = `
          <div class="span-top"><div class="span-label">Which word went with this symbol?</div></div>
          <div class="pa-stim">${IQ.glyphSVG(p.g, 96)}</div>
          <div class="opts c2 pa-opts">${optWords.map((w) => `<button class="opt txt" data-w="${w}">${w}</button>`).join('')}</div>`;
        const choice = await new Promise((res) => {
          const box = $('.pa-opts', host);
          const h = (e) => { const b = e.target.closest('[data-w]'); if (!b) return; box.removeEventListener('click', h); res(b); };
          box.addEventListener('click', h);
          ctx.onAbort(() => box.removeEventListener('click', h));
        });
        const ok = choice.dataset.w === p.w;
        IQ.audio.play(ctx.feedback ? (ok ? 'correct' : 'wrong') : 'select');
        choice.classList.add('sel');
        if (ctx.feedback) {
          choice.classList.add(ok ? 'right' : 'wrong');
          if (!ok) host.querySelector(`[data-w="${p.w}"]`).classList.add('right');
          await ctx.wait(ok ? 600 : 1300);
        } else await ctx.wait(180);
        const it = { a: 1.0, b: pairB(k), c: 1 / k, x: ok ? 1 : 0 };
        responses.push(it); log.push(ok ? 1 : 0);
        done++;
      }
    }
    ctx.progress(totalItems, totalItems);
    return { responses, log, correct: log.reduce((a, b) => a + b, 0), total: log.length };
  };
})();
