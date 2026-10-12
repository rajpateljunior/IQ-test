/* Test bot injected by tests/e2e.py. __peek() describes the current
   screen; __step(acc) performs one action, answering correctly with
   probability acc. Reads answers from IQ.debug (set by the app). */
(function () {
  const q = (s, el) => (el || document).querySelector(s);
  const qa = (s, el) => [...(el || document).querySelectorAll(s)];
  const R = () => Math.random();
  window.__peek = function () {
    const run = q('#run');
    if (run.hidden) {
      const v = q('#view');
      return { kind: 'view', html: v.firstElementChild ? v.firstElementChild.className : '' };
    }
    const b = q('#run .runbody');
    const sub = (q('#run .rt-name') || {}).textContent || '';
    if (q('[data-a]', b)) return { kind: 'gymsum', sub };
    if (q('[data-next]', b)) return { kind: 'feedback', sub };
    if (q('.spinner', b) || q('.donecheck', b)) return { kind: 'wait', sub };
    if (b.classList.contains('mc')) {
      const lay = [...b.classList].filter((c) => c.startsWith('lay-') || c === 'figseq').join(' ');
      return { kind: 'mc', lay, sub };
    }
    if (b.classList.contains('span')) return { kind: q('.keypad.disabled', b) ? 'span-show' : 'span-input', sub };
    if (b.classList.contains('corsi')) return { kind: q('.board.locked', b) ? 'corsi-show' : 'corsi-input', sub };
    if (b.classList.contains('coding')) return { kind: q('[data-go]', b) ? 'coding-start' : q('.keypad.disabled', b) ? 'coding-done' : 'coding-run', sub };
    if (b.classList.contains('paired')) return { kind: q('.pa-opts', b) ? 'paired-recall' : 'paired-study', sub };
    if (q('.sublist', b)) return { kind: 'testintro', sub };
    if (q('[data-p]', b)) return { kind: 'subintro', sub };
    if (q('[data-go]', b)) return { kind: 'go', sub };
    return { kind: 'unknown', sub, cls: b.className };
  };
  window.__step = function (acc, practice) {
    const st = window.__peek();
    const b = q('#run .runbody');
    const right = R() < acc;
    switch (st.kind) {
      case 'testintro': case 'go': case 'coding-start': q('[data-go]', b).click(); break;
      case 'subintro': (practice ? q('[data-p]', b) : q('[data-go]', b)).click(); break;
      case 'feedback': q('[data-next]', b).click(); break;
      case 'gymsum': q('[data-a="back"]', b).click(); break;
      case 'mc': {
        const it = IQ.debug.item;
        const opts = qa('.opt', b);
        let i = it.answer;
        if (!right) { const wrong = opts.map((_, k) => k).filter((k) => k !== it.answer); i = wrong[Math.floor(R() * wrong.length)]; }
        opts[i].click();
        q('[data-confirm]', b).click();
        break;
      }
      case 'span-input': {
        let t = IQ.debug.span.slice();
        if (!right) t[0] = (t[0] + 1) % 10;
        t.forEach((d) => q(`[data-k="${d}"]`, b).click());
        break;
      }
      case 'corsi-input': {
        let t = IQ.debug.corsi.slice();
        if (!right && t.length > 1) [t[0], t[1]] = [t[1], t[0]];
        const blks = qa('.blk', b);
        t.forEach((i) => blks[i].click());
        break;
      }
      case 'coding-run': {
        const k = right ? IQ.debug.coding : (IQ.debug.coding % 9) + 1;
        q(`[data-k="${k}"]`, b).click();
        break;
      }
      case 'paired-study': { const g = q('[data-go]', b); if (g) g.click(); break; }
      case 'paired-recall': {
        const w = IQ.debug.paired;
        const opts = qa('[data-w]', b);
        const pick = right ? opts.find((o) => o.dataset.w === w) : opts.find((o) => o.dataset.w !== w);
        pick.click();
        break;
      }
    }
    return st;
  };
})();
