/* =====================================================================
   IQ Test — gen-series.js
   Number Series, Letter Series and (via gen-matrix.js) Shape Series.
   Each family has a difficulty b (speculative calibration). Every
   generated item is checked against simpler rules a person might try;
   if a simpler rule fits the visible terms but predicts a different
   answer, the item is thrown away.
   ===================================================================== */
'use strict';
(function () {
  const FAM = [];
  const add = (id, b, n, gen, text) => FAM.push({ id, b, n, gen, text });

  // n = how many terms are shown; gen returns full list of n+1 terms
  add('add', -2.3, 5, (r) => { const s = r.int(1, 30), k = r.int(2, 9); return { t: seq(6, (i) => s + i * k), why: `Add ${k} each time.` }; });
  add('sub', -2.1, 5, (r) => { const k = r.int(3, 9), s = r.int(6 * k, 99); return { t: seq(6, (i) => s - i * k), why: `Subtract ${k} each time.` }; });
  add('mul', -1.5, 5, (r) => { const k = r.pick([2, 2, 3]), s = r.int(1, k === 2 ? 6 : 4); return { t: seq(6, (i) => s * k ** i), why: `Multiply by ${k} each time.` }; });
  add('incdiff', -0.9, 5, (r) => {
    const s = r.int(1, 12), d0 = r.int(1, 4), inc = r.pick([1, 2]);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] + d0 + inc * i);
    return { t, why: `The amount added grows by ${inc} each time (+${d0}, +${d0 + inc}, +${d0 + 2 * inc} ...).` };
  });
  add('altops', -0.5, 6, (r) => {
    const a = r.int(3, 9), b = r.int(1, a - 1), s = r.int(5, 20);
    const t = [s]; for (let i = 0; i < 6; i++) t.push(t[i] + (i % 2 === 0 ? a : -b));
    return { t, why: `Alternate: add ${a}, then subtract ${b}.` };
  });
  add('interleave', -0.2, 6, (r) => {
    const a = r.int(1, 15), da = r.pick([2, 3, 4, 5]), b = r.int(20, 60), db = -r.pick([1, 2, 3, 4]);
    const t = []; for (let i = 0; i < 4; i++) { t.push(a + i * da); t.push(b + i * db); }
    return { t: t.slice(0, 7), why: `Two series are interleaved: every other number goes up by ${da}, the others go down by ${-db}.` };
  });
  add('squares', 0.2, 5, (r) => {
    const o = r.int(0, 3), c = r.pick([0, 0, 1, -1, 2, 3]);
    return { t: seq(6, (i) => (i + 1 + o) ** 2 + c), why: c === 0 ? 'These are square numbers.' : `Square numbers ${c > 0 ? 'plus ' + c : 'minus ' + -c}.` };
  });
  add('fib', 0.4, 5, (r) => {
    const a = r.int(1, 6), b = r.int(a, a + 5);
    const t = [a, b]; for (let i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]);
    return { t, why: 'Each number is the sum of the two before it.' };
  });
  add('muladd', 0.8, 5, (r) => {
    const opt = r.pick([[2, 1], [2, -1], [2, 2], [2, 3], [3, -1], [3, 1]]);
    const s = r.int(1, opt[0] === 3 ? 3 : 5);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] * opt[0] + opt[1]);
    return { t, why: `Multiply by ${opt[0]}, then ${opt[1] > 0 ? 'add ' + opt[1] : 'subtract ' + -opt[1]}.` };
  });
  add('diffgeo', 0.9, 5, (r) => {
    const s = r.int(1, 10), d0 = r.int(1, 3), k = r.pick([2, 3]);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] + d0 * k ** i);
    return { t, why: `The differences multiply by ${k} each time (+${d0}, +${d0 * k}, +${d0 * k * k} ...).` };
  });
  add('cubes', 1.1, 5, (r) => {
    const c = r.pick([0, 0, 1, -1, 2]);
    return { t: seq(6, (i) => (i + 1) ** 3 + c), why: c === 0 ? 'These are cube numbers (1x1x1, 2x2x2 ...).' : `Cube numbers ${c > 0 ? 'plus ' + c : 'minus ' + -c}.` };
  });
  add('addmul', 1.2, 6, (r) => {
    const a = r.int(1, 4), m = 2, s = r.int(1, 5);
    const t = [s]; for (let i = 0; i < 6; i++) t.push(i % 2 === 0 ? t[i] + a : t[i] * m);
    return { t, why: `Alternate: add ${a}, then multiply by ${m}.` };
  });
  add('factorial', 1.3, 5, (r) => {
    const s = r.int(1, 3);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] * (i + 2));
    return { t, why: 'Multiply by 2, then 3, then 4, and so on.' };
  });
  add('triangular', 1.5, 5, (r) => {
    const s = r.int(2, 12);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] + ((i + 1) * (i + 2)) / 2);
    return { t, why: 'The differences are 1, 3, 6, 10, 15 (each difference grows by one more than the last).' };
  });
  add('mixed', 1.6, 6, (r) => {
    const a = r.int(1, 9), da = r.pick([3, 4, 5]), b = r.pick([1, 2, 3]);
    const t = []; for (let i = 0; i < 4; i++) { t.push(a + i * da); t.push(b * 2 ** i); }
    return { t: t.slice(0, 7), why: `Two interleaved series: one adds ${da} each time, the other doubles.` };
  });
  add('trib', 1.8, 6, (r) => {
    const st = r.pick([[1, 1, 2], [1, 2, 3], [2, 2, 3], [1, 1, 1], [0, 1, 1]]);
    const t = st.slice(); for (let i = 3; i < 7; i++) t.push(t[i - 1] + t[i - 2] + t[i - 3]);
    return { t, why: 'Each number is the sum of the three before it.' };
  });
  add('dbl_plus_i', 2.1, 5, (r) => {
    const s = r.int(1, 4);
    const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] * 2 + i);
    return { t, why: 'Double the number, then add 0, 1, 2, 3 ... in turn.' };
  });

  // Letter families (A = 1 ... Z = 26)
  const LET = [];
  LET.push({ id: 'l_add', b: -1.6, n: 5, gen: (r) => { const k = r.int(2, 4), s = r.int(1, 26 - 5 * k); return { t: seq(6, (i) => s + i * k), why: `Skip ${k - 1} letter${k > 2 ? 's' : ''} each time (move ${k} along the alphabet).` }; } });
  LET.push({ id: 'l_inc', b: -0.2, n: 5, gen: (r) => { const s = r.int(1, 10); const t = [s]; for (let i = 0; i < 5; i++) t.push(t[i] + i + 1); return { t, why: 'Move 1, then 2, then 3 ... letters along the alphabet.' }; } });
  LET.push({ id: 'l_inter', b: 0.6, n: 6, gen: (r) => {
    const a = r.int(1, 6), da = r.pick([2, 3]), b = r.int(20, 26), db = -r.pick([1, 2]);
    const t = []; for (let i = 0; i < 4; i++) { t.push(a + i * da); t.push(b + i * db); }
    return { t: t.slice(0, 7), why: `Two interleaved series: one moves forward ${da} letters, the other moves back ${-db}.` };
  } });

  function seq(n, f) { const a = []; for (let i = 0; i < n; i++) a.push(f(i)); return a; }

  /* Simpler rules a person might try. Returns predictions that differ
     from `ans` given the visible terms v. */
  function altPredictions(v) {
    const P = new Set();
    const n = v.length;
    const d = v.map((x, i) => (i ? x - v[i - 1] : null)).slice(1);
    if (d.every((x) => x === d[0])) P.add(v[n - 1] + d[0]);
    if (v.every((x) => x !== 0)) {
      const q = v[1] / v[0];
      if (v.every((x, i) => !i || Math.abs(x / v[i - 1] - q) < 1e-9)) P.add(v[n - 1] * q);
    }
    const d2 = d.map((x, i) => (i ? x - d[i - 1] : null)).slice(1);
    if (d2.length >= 3 && d2.every((x) => x === d2[0])) P.add(v[n - 1] + d[d.length - 1] + d2[0]);
    if (n >= 6) {
      const ev = v.filter((_, i) => i % 2 === 0), od = v.filter((_, i) => i % 2 === 1);
      const ar = (s) => s.length >= 3 && s.every((x, i) => !i || x - s[i - 1] === s[1] - s[0]);
      if (ar(ev) && ar(od)) { const s = n % 2 === 0 ? ev : od; P.add(s[s.length - 1] + s[1] - s[0]); }
    }
    if (n >= 5 && v.every((x, i) => i < 2 || x === v[i - 1] + v[i - 2])) P.add(v[n - 1] + v[n - 2]);
    return P;
  }
  IQ._seriesAlt = altPredictions;

  function numDistractors(v, ans, rng) {
    const last = v[v.length - 1], prev = v[v.length - 2];
    const cand = [last + (last - prev), ans + 1, ans - 1, ans + 2, ans - 2, ans + (last - prev), ans - (ans - last) / 2,
      Math.round(ans * 1.1), Math.round(ans * 0.9), ans + 3, ans - 3, ans + 10, ans - 10];
    const out = [];
    for (const c of cand) {
      if (!Number.isInteger(c) || c === ans || out.includes(c)) continue;
      if (c < 0 && ans >= 0) continue;
      out.push(c);
    }
    // keep the naive "repeat the last step" lure, randomise the rest
    const keep = out.slice(0, 1);
    return keep.concat(rng.shuffle(out.slice(1))).slice(0, 5);
  }

  const letter = (n) => String.fromCharCode(64 + n);

  IQ.genSeries = function (rng, targetB) {
    // Shape series cover the easier half of the range
    const useShapes = targetB <= IQ.SHAPESERIES_MAX_B && rng.chance(0.3);
    if (useShapes) return IQ.genShapeSeries(rng, targetB);
    const all = FAM.map((f) => Object.assign({ kind: 'num' }, f)).concat(LET.map((f) => Object.assign({ kind: 'let' }, f)));
    const near = all.filter((f) => Math.abs(f.b - targetB) <= 0.35);
    const pool = near.length ? near : all.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB)).slice(0, 3);
    for (let attempt = 0; attempt < 60; attempt++) {
      const f = rng.pick(pool);
      const g = f.gen(rng);
      const vis = g.t.slice(0, f.n);
      const ans = g.t[f.n];
      if (f.kind === 'let' && g.t.some((x) => x < 1 || x > 26)) continue;
      if (f.kind === 'num' && (Math.abs(ans) > 9999 || vis.some((x) => Math.abs(x) > 9999))) continue;
      const alt = altPredictions(vis);
      alt.delete(ans);
      if (alt.size) continue; // a simpler rule disagrees: ambiguous, regenerate
      let opts;
      if (f.kind === 'let') {
        const ds = [ans + 1, ans - 1, ans + 2, ans - 2, vis[vis.length - 1] + (vis[vis.length - 1] - vis[vis.length - 2])]
          .filter((x, i, a) => x >= 1 && x <= 26 && x !== ans && a.indexOf(x) === i);
        if (ds.length < 5) { for (let x = 1; x <= 26 && ds.length < 5; x++) if (x !== ans && !ds.includes(x)) ds.push(x); }
        opts = [ans].concat(ds.slice(0, 5));
      } else {
        const ds = numDistractors(vis, ans, rng);
        if (ds.length < 5) continue;
        opts = [ans].concat(ds);
      }
      const order = rng.shuffle([0, 1, 2, 3, 4, 5]);
      const fmt = f.kind === 'let' ? letter : (x) => String(x);
      return {
        kind: f.kind, family: f.id, b: f.b, a: 1.2, c: 1 / 6, timeLimit: 60,
        terms: vis.map(fmt), options: order.map((i) => fmt(opts[i])), answer: order.indexOf(0),
        explain: [g.why, `So the next ${f.kind === 'let' ? 'letter' : 'number'} is ${fmt(ans)}.`],
      };
    }
    throw new Error('series generation failed');
  };
})();
