/* =====================================================================
   IQ Test — review.js
   The answer key shown after every Quick Test, Daily Challenge, friend
   challenge and Gym level. Data comes from each subtest's `review`
   list (see tasks.js and runMC in ui.js) and is stored by IQ.review.

   Layout: one card. Each part (subtest) is a collapsible group with its
   score and a row of right/wrong squares. Inside, each question is its
   own tap-to-expand row; opening it draws the puzzle again, marks your
   answer and the right one, and shows a short explanation.
   Bodies are drawn only when opened, so long keys stay fast.
   ===================================================================== */
'use strict';
(function () {
  const ui = IQ.ui;
  const esc = IQ.esc;
  const L = 'ABCDEFGH';
  const dc = (d) => `var(--d-${d})`;
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const digs = (a) => a.join(' ');
  const glyph = (strokes, size) => IQ.glyphSVG({ strokes }, size);

  /* ---- right / wrong for one entry (null = not a right/wrong item) ---- */
  function isRight(e) {
    switch (e.t) {
      case 'mc': return e.ch === e.it.answer;
      case 'span': return same(e.typed, e.dir === 'f' ? e.seq : e.seq.slice().reverse());
      case 'corsi': return same(e.taps, e.seq);
      case 'pair': return e.ch === e.w;
      default: return null;
    }
  }
  ui.keyScore = function (parts) {
    let right = 0, total = 0;
    parts.forEach((p) => p.items.forEach((e) => { const r = isRight(e); if (r !== null) { total++; if (r) right++; } }));
    return { right, total };
  };

  const level = (b) => (b < -1.2 ? 'Easy' : b < -0.2 ? 'Medium' : b < 0.8 ? 'Hard' : 'Very hard');
  function label(sub, e) {
    if (e.t === 'span') return `${e.dir === 'f' ? 'Same order' : 'Reverse order'} · ${e.seq.length} digits`;
    if (e.t === 'corsi') return `${e.seq.length} blocks`;
    if (e.t === 'pair') return `<span class="akg">${glyph(e.g, 22)}</span> Symbol from ${e.k} pairs`;
    if (e.t === 'coding') return `Speed round · ${e.correct} right, ${e.errors} wrong`;
    const it = e.it;
    const short = (t) => esc(t.length > 46 ? t.slice(0, 44).trim() + '…' : t);
    switch (sub) {
      case 'matrices': return '3×3 pattern';
      case 'series': return it.kind === 'shapes' ? 'Shape sequence' : esc(it.terms.join(', ')) + ', ?';
      case 'rotation': return it.dim === 3 ? '3D block figure' : 'Flat figure';
      case 'vocab': return `<b>${esc(it.word)}</b>`;
      default: return short(it.text || '');
    }
  }
  const tagOf = (sub, e) => (e.t === 'mc' ? level(e.it.b) : '');

  /* ---- the card ---- */
  ui.answerKey = function (parts, opts) {
    opts = opts || {};
    if (!parts || !parts.length) {
      return `<section class="card akey empty"><h3>Answer key</h3><p class="cap">${opts.missing || 'No answer key was saved for this one. Keys are kept for tests taken since the October 2026 update (your 30 most recent tests and 60 most recent Daily Challenges).'}</p></section>`;
    }
    const sc = ui.keyScore(parts);
    let qn = 0;
    const groups = parts.map((p, pi) => {
      const mod = IQ.SUBTESTS[p.sub];
      if (!mod) return '';
      const marks = p.items.map(isRight);
      const r = marks.filter((x) => x === true).length, n = marks.filter((x) => x !== null).length;
      const rows = p.items.map((e, ei) => {
        const ok = marks[ei];
        if (ok !== null) qn++;
        const cls = ok === null ? 'info' : ok ? 'ok' : 'no';
        const mark = ok === null ? 'i' : ok ? '✓' : '✗';
        const tag = tagOf(p.sub, e);
        return `<details class="akq ${cls}" data-p="${pi}" data-e="${ei}">
          <summary><span class="akm" aria-label="${ok === null ? 'Summary' : ok ? 'Correct' : 'Incorrect'}">${mark}</span>
            <span class="akn">${ok === null ? '' : 'Q' + qn}</span><span class="akl">${label(p.sub, e)}</span>${tag ? `<small class="aktag">${tag}</small>` : ''}<span class="akc" aria-hidden="true"></span></summary>
          <div class="akbody"></div></details>`;
      }).join('');
      return `<details class="akgroup" ${opts.open ? 'open' : ''} style="--c:${dc(mod.domain)}">
        <summary><i class="ddot"></i><b>${esc(mod.name)}</b><span class="sq">${marks.map((x) => `<i class="${x === null ? '' : x ? 'y' : 'n'}"></i>`).join('')}</span>
          <span class="akgs">${p.sub === 'coding' && p.items[0] ? `${p.items[0].net} net` : `${r}/${n}`}</span><span class="akc" aria-hidden="true"></span></summary>
        <div class="akitems">${rows || '<p class="cap">Nothing recorded for this part.</p>'}</div></details>`;
    }).join('');
    return `<section class="card akey">
      <div class="akhead"><h3>Answer key</h3><span class="akscore"><b>${sc.right}</b>/${sc.total} correct</span></div>
      <p class="cap">${opts.open ? 'Tap a question' : 'Tap a part, then a question'} to see the puzzle, your answer, the right answer and why.</p>
      ${groups}</section>`;
  };

  /* Draw a question body when its row is first opened. `toggle` doesn't bubble, so listen in the capture phase. */
  ui.bindAnswerKey = function (root, parts) {
    if (!root || !parts) return;
    root.addEventListener('toggle', (ev) => {
      const d = ev.target;
      if (!d.classList || !d.open) return;
      if (d.classList.contains('akgroup')) { IQ.audio.play('tap'); return; }
      if (!d.classList.contains('akq')) return;
      IQ.audio.play('tap');
      const body = d.querySelector('.akbody');
      if (body.dataset.done) return;
      const p = parts[+d.dataset.p], e = p && p.items[+d.dataset.e];
      try { body.innerHTML = e ? renderBody(p.sub, e) : ''; } catch (er) { console.error(er); body.innerHTML = '<p class="cap">This question can’t be shown.</p>'; }
      body.dataset.done = '1';
    }, true);
  };

  function verdict(ok, extra) {
    return `<b>${ok ? 'Correct' : extra || 'Incorrect'}</b>`;
  }

  function renderBody(sub, e) {
    switch (e.t) {
      case 'mc': return mcBody(sub, e);
      case 'span': return spanBody(e);
      case 'corsi': return corsiBody(e);
      case 'pair': return pairBody(e);
      case 'coding': return codingBody(e);
    }
    return '';
  }

  /* ---- multiple choice: redraw the puzzle with the original drawing code ---- */
  function mcBody(sub, e) {
    const mod = IQ.SUBTESTS[sub], it = e.it;
    const ok = e.ch === it.answer;
    const oc = typeof mod.optClass === 'function' ? mod.optClass(it) : mod.optClass;
    const cols = it.options.length === 4 && mod.cols === 4 ? 2 : mod.cols;
    const isFig = /\bfig\b/.test(oc);
    const hasLabel = /olabel/.test(mod.opt(it, 0));
    const valueOf = (i) => (typeof it.options[i] === 'string' || typeof it.options[i] === 'number' ? String(it.options[i]) : null);
    const name = (i) => { const v = valueOf(i); return hasLabel ? `${L[i]}${v != null ? ` (${esc(v)})` : ''}` : v != null ? esc(v) : L[i]; };
    const opts = it.options.map((_, i) => {
      const cls = i === it.answer ? 'right' : i === e.ch ? 'wrong' : 'dim';
      const flag = i === it.answer ? '<span class="rvflag ok">Answer</span>' : i === e.ch ? '<span class="rvflag no">You</span>' : '';
      return `<div class="opt ${oc} ${cls}">${isFig && !hasLabel ? `<span class="rvl">${L[i]}</span>` : ''}${mod.opt(it, i)}${flag}</div>`;
    }).join('');
    const yours = e.ch >= 0 ? name(e.ch) : 'none';
    const head = ok ? verdict(true) : verdict(false, e.to && e.ch < 0 ? 'Out of time' : 'Incorrect');
    return `<div class="rv-stem ${mod.layout(it)}"><div class="stem">${mod.stem(it)}</div></div>
      <div class="opts c${cols} n${it.options.length} rv-opts">${opts}</div>
      <div class="explain ${ok ? 'ok' : 'no'}">${head}<p class="rvans">Your answer: <b class="${ok ? 'good' : 'bad'}">${yours}</b> · Right answer: <b class="good">${name(it.answer)}</b></p>${(it.explain || []).map((x) => `<p>${esc(x)}</p>`).join('')}</div>`;
  }

  /* ---- Digit Span ---- */
  function spanBody(e) {
    const target = e.dir === 'f' ? e.seq : e.seq.slice().reverse();
    const ok = same(e.typed, target);
    const typed = e.typed.map((d, i) => `<i class="${d === target[i] ? 'y' : 'n'}">${d}</i>`).join('');
    const hits = e.typed.filter((d, i) => d === target[i]).length;
    const why = e.dir === 'f'
      ? `In the same order, the digits are ${digs(e.seq)}.`
      : `Reverse order means reading from the last digit back to the first, so ${digs(e.seq)} becomes ${digs(target)}.`;
    const more = ok ? '' : `<p>${hits} of ${target.length} digits were in the right place (shown in green above).</p>`;
    return `<div class="rvgrid">
        <div class="rvline"><small>Shown</small><span class="digs">${digs(e.seq)}</span></div>
        <div class="rvline"><small>Right answer${e.dir === 'b' ? ' (reversed)' : ''}</small><span class="digs good">${digs(target)}</span></div>
        <div class="rvline"><small>You typed</small><span class="digs mine">${typed || '—'}</span></div>
      </div>
      <div class="explain ${ok ? 'ok' : 'no'}">${verdict(ok)}<p>${why}</p>${more}</div>`;
  }

  /* ---- Corsi Blocks: two mini boards ---- */
  function board(pos, nums, cls) {
    return `<div class="mboard">${pos.map((p, i) => {
      const n = nums[i];
      return `<span class="mblk ${n ? 'on ' + (cls[i] || '') : ''}" style="left:${p[0]}%;top:${p[1]}%">${n || ''}</span>`;
    }).join('')}</div>`;
  }
  function corsiBody(e) {
    const POS = IQ.tasks.CORSI_POS;
    const ok = same(e.taps, e.seq);
    const right = {}, mine = {}, mcls = {};
    e.seq.forEach((b, k) => (right[b] = String(k + 1)));
    e.taps.forEach((b, k) => {
      mine[b] = mine[b] ? mine[b] + ',' + (k + 1) : String(k + 1);
      if (e.seq[k] !== b) mcls[b] = 'bad'; else if (!mcls[b]) mcls[b] = 'good';
    });
    let first = e.taps.findIndex((b, k) => b !== e.seq[k]);
    const why = ok
      ? `You tapped all ${e.seq.length} blocks in the order they lit up.`
      : first === 0
        ? 'Your first tap was off. The sequence started at the block marked 1 on the left board; follow the numbers from there.'
        : `Your first ${first} tap${first === 1 ? ' was' : 's were'} right. Tap ${first + 1} should have been the block marked ${first + 1} on the left board.`;
    return `<div class="mboards"><div><small>Order they lit up</small>${board(POS, right, {})}</div><div><small>Your taps</small>${board(POS, mine, mcls)}</div></div>
      <div class="explain ${ok ? 'ok' : 'no'}">${verdict(ok)}<p>${why}</p></div>`;
  }

  /* ---- Paired Associates ---- */
  function pairBody(e) {
    const ok = e.ch === e.w;
    return `<div class="rvpair"><div class="pa-stim">${glyph(e.g, 72)}</div>
        <div class="rvgrid"><div class="rvline"><small>Was paired with</small><span class="pw good">${esc(e.w)}</span></div>
        <div class="rvline"><small>You chose</small><span class="pw ${ok ? 'good' : 'bad'}">${esc(e.ch)}</span></div></div></div>
      <div class="explain ${ok ? 'ok' : 'no'}">${verdict(ok)}<p>You studied ${e.k} symbol–word pairs. This symbol went with “${esc(e.w)}”.</p></div>`;
  }

  /* ---- Symbol Coding: no single right answer, so show the tally and any mistakes ---- */
  function codingBody(e) {
    const miss = e.miss && e.miss.length
      ? `<div class="rvmiss"><small>Your mistakes${e.errors > e.miss.length ? ` (first ${e.miss.length})` : ''}</small>${e.miss.map(([k, p]) => `<span>${glyph(e.glyphs[k], 30)}<b class="good">${k + 1}</b><i class="bad">you tapped ${p}</i></span>`).join('')}</div>`
      : '<p class="cap">No mistakes. Every tap matched the key.</p>';
    return `<div class="code-key rvkey">${e.glyphs.map((g, i) => `<div class="kcell">${glyph(g, 26)}<b>${i + 1}</b></div>`).join('')}</div>
      <div class="rvstats"><span><b>${e.correct}</b>right</span><span><b>${e.errors}</b>wrong</span><span><b>${e.net}</b>net score</span><span><b>${e.perMin}</b>per minute</span></div>
      ${miss}
      <div class="explain">${'<b>How it’s scored</b>'}<p>Your score is right taps minus wrong taps: ${e.correct} − ${e.errors} = ${e.net} in ${e.dur} seconds.${e.target ? ` The goal for this level was ${e.target}.` : ''}</p>
      <p>Each wrong tap cancels a right one, so accuracy matters as much as speed. Around 40 per minute is our rough guess at a typical adult pace on a touch screen.</p></div>`;
  }
})();
