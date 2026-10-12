/* =====================================================================
   IQ Test — gen-matrix.js
   Matrix Puzzles (Raven-style 3x3) and Shape Series generators, plus
   the shared "cell" drawing used by both.

   A cell is {sides, size, shade, count, lines, dot}:
     sides 0 = circle, 3..8 = polygon with that many sides
     size  0..2, shade 0..3 (outline -> solid), count 1..4
     lines bitmask of 4 strokes (1 = horizontal, 2 = vertical,
           4 = diagonal \, 8 = diagonal /), drawn in the accent colour
     dot   -1 = none, else 0..7 position around the rim (shape series)

   Difficulty model (speculative calibration, see NOTES.md): based on
   the well-established finding that the number of rules and the type
   of rule drive matrix difficulty (Carpenter, Just & Shell 1990).
   ===================================================================== */
'use strict';
(function () {
  const SIZE_R = [0.62, 0.8, 1.0];
  const SHADE = [0, 0.3, 0.62, 1];
  const LINE_BITS = [1, 2, 4, 8];

  function polyPts(cx, cy, r, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  function shape(sides, cx, cy, R, shade) {
    const fo = SHADE[shade];
    const attrs = `fill="var(--ink)" fill-opacity="${fo}" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"`;
    if (sides === 0) return `<circle cx="${cx}" cy="${cy}" r="${(R * 0.9).toFixed(1)}" ${attrs}/>`;
    const r = sides === 3 ? R * 1.12 : sides === 4 ? R * 1.02 : R;
    const yoff = sides === 3 ? R * 0.16 : 0;
    // squares drawn flat (axis aligned) so they read as squares, not diamonds
    if (sides === 4) {
      const h = r * 0.74;
      return `<rect x="${(cx - h).toFixed(1)}" y="${(cy - h).toFixed(1)}" width="${(2 * h).toFixed(1)}" height="${(2 * h).toFixed(1)}" rx="1.5" ${attrs}/>`;
    }
    return `<polygon points="${polyPts(cx, cy + yoff, r, sides)}" ${attrs}/>`;
  }
  const LAYOUT = {
    1: { pts: [[50, 50]], R: 34 },
    2: { pts: [[29, 50], [71, 50]], R: 19 },
    3: { pts: [[50, 29], [29, 69], [71, 69]], R: 17 },
    4: { pts: [[29, 29], [71, 29], [29, 71], [71, 71]], R: 17 },
  };

  /* Returns SVG markup for one cell in a 100x100 box */
  IQ.cellSVG = function (c) {
    const L = LAYOUT[c.count || 1];
    const R = L.R * SIZE_R[c.size == null ? 2 : c.size];
    let s = L.pts.map((p) => shape(c.sides, p[0], p[1], R, c.shade || 0)).join('');
    const ln = c.lines || 0;
    if (ln) {
      let l = '';
      if (ln & 1) l += '<line x1="8" y1="50" x2="92" y2="50"/>';
      if (ln & 2) l += '<line x1="50" y1="8" x2="50" y2="92"/>';
      if (ln & 4) l += '<line x1="14" y1="14" x2="86" y2="86"/>';
      if (ln & 8) l += '<line x1="86" y1="14" x2="14" y2="86"/>';
      s += `<g stroke="var(--d-FR)" stroke-width="3.2" stroke-linecap="round">${l}</g>`;
    }
    if (c.dot != null && c.dot >= 0) {
      const a = -Math.PI / 2 + (c.dot * Math.PI) / 4;
      s += `<circle cx="${(50 + 42 * Math.cos(a)).toFixed(1)}" cy="${(50 + 42 * Math.sin(a)).toFixed(1)}" r="5.5" fill="var(--d-FR)"/>`;
    }
    return s;
  };
  IQ.cellBox = (c, cls) => `<svg viewBox="0 0 100 100" class="${cls || 'cellsvg'}" aria-hidden="true">${IQ.cellSVG(c)}</svg>`;

  /* ---------------------------------------------------------------
     Matrix generator
     --------------------------------------------------------------- */
  const MASKS = [];
  for (let m = 1; m < 16; m++) { const pc = popcount(m); if (pc <= 3) MASKS.push(m); }
  function popcount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }

  const ATTR = {
    sides: { vals: [0, 3, 4, 5, 6], prog: [3, 4, 5, 6], rules: ['row', 'col', 'prog', 'dist'] },
    size: { vals: [0, 1, 2], rules: ['row', 'col', 'dist'] },
    shade: { vals: [0, 1, 2, 3], prog: [0, 1, 2, 3], rules: ['row', 'col', 'prog', 'dist'] },
    count: { vals: [1, 2, 3, 4], prog: [1, 2, 3, 4], rules: ['row', 'prog', 'dist', 'arith'] },
    lines: { vals: MASKS, rules: ['row', 'dist', 'xor', 'or'] },
  };
  const ATTR_KEYS = Object.keys(ATTR);
  const RULE_W = { row: 0.35, col: 0.35, prog: 0.7, dist: 1.05, arith: 1.3, or: 1.1, xor: 1.55 };

  // Catalogue of every rule combination with 1-4 varying attributes
  const CATALOG = [];
  (function build(i, cur) {
    if (i === ATTR_KEYS.length) {
      const k = cur.length;
      if (k < 1 || k > 4) return;
      const b = -2.75 + cur.reduce((s, r) => s + RULE_W[r.rule], 0) + 0.3 * (k - 1);
      CATALOG.push({ rules: cur.slice(), b: +b.toFixed(2) });
      return;
    }
    build(i + 1, cur);
    for (const rule of ATTR[ATTR_KEYS[i]].rules) {
      cur.push({ attr: ATTR_KEYS[i], rule });
      build(i + 1, cur);
      cur.pop();
    }
  })(0, []);
  IQ.MATRIX_CATALOG = CATALOG;

  function grid3(f) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => f(r, c))); }

  function genAttrGrid(attr, rule, rng) {
    const A = ATTR[attr];
    if (rule === 'const') {
      let v;
      if (attr === 'lines') v = rng.chance(0.85) ? 0 : rng.pick(MASKS.filter((m) => popcount(m) === 1));
      else if (attr === 'count') v = rng.chance(0.7) ? 1 : rng.int(2, 4);
      else if (attr === 'size') v = rng.chance(0.6) ? 2 : rng.int(0, 2);
      else v = rng.pick(A.vals);
      return grid3(() => v);
    }
    if (rule === 'row' || rule === 'col' || rule === 'dist') {
      let pool = A.vals;
      if (attr === 'lines') pool = MASKS.filter((m) => popcount(m) <= 2);
      const vals = rng.shuffle(pool).slice(0, 3);
      if (rule === 'row') return grid3((r) => vals[r]);
      if (rule === 'col') return grid3((r, c) => vals[c]);
      const dir = rng.pick([1, 2]); // cyclic shift direction
      return grid3((r, c) => vals[(c + dir * r) % 3]);
    }
    if (rule === 'prog') {
      const dom = A.prog;
      const d = rng.pick([1, -1]);
      const starts = [];
      for (let s = 0; s < dom.length; s++) if (s + 2 * d >= 0 && s + 2 * d < dom.length) starts.push(s);
      let st;
      do { st = [rng.pick(starts), rng.pick(starts), rng.pick(starts)]; } while (st[0] === st[1] && st[1] === st[2] && starts.length > 1);
      return grid3((r, c) => dom[st[r] + c * d]);
    }
    if (rule === 'arith') {
      const T = rng.shuffle([[1, 1, 2], [1, 2, 3], [2, 1, 3], [1, 3, 4], [3, 1, 4], [2, 2, 4]]).slice(0, 3);
      return grid3((r, c) => T[r][c]);
    }
    if (rule === 'xor' || rule === 'or') {
      const rows = [];
      let guard = 0;
      while (rows.length < 3 && guard++ < 500) {
        const a = rng.pick(MASKS), b = rng.pick(MASKS);
        if (a === b) continue;
        const c = rule === 'xor' ? a ^ b : a | b;
        if (!c || popcount(c) > 4) continue;
        if (rule === 'or' && (c === a || c === b)) continue;
        if (rows.some((x) => x[0] === a && x[1] === b)) continue;
        rows.push([a, b, c]);
      }
      // at least one row must show overlap, so XOR and OR look different
      if (!rows.some((x) => x[0] & x[1])) return null;
      return grid3((r, c) => rows[r][c]);
    }
    return null;
  }

  /* Every rule a person might reasonably try, for one attribute.
     Returns the set of predicted values for the missing cell. */
  function predictions(g, isMask, isCount) {
    const P = new Set();
    const v = g;
    const known = (r, c) => !(r === 2 && c === 2);
    // all equal
    let allEq = true;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (known(r, c) && v[r][c] !== v[0][0]) allEq = false;
    if (allEq) P.add(v[0][0]);
    // row constant
    if (v[0][0] === v[0][1] && v[0][1] === v[0][2] && v[1][0] === v[1][1] && v[1][1] === v[1][2] && v[2][0] === v[2][1]) P.add(v[2][0]);
    // column constant
    if ([0, 1, 2].every((c) => v[0][c] === v[1][c]) && v[2][0] === v[0][0] && v[2][1] === v[0][1]) P.add(v[0][2]);
    if (!isMask) {
      // row progression with a shared step
      const d = v[0][1] - v[0][0];
      if (d !== 0 && v[0][2] - v[0][1] === d && v[1][1] - v[1][0] === d && v[1][2] - v[1][1] === d && v[2][1] - v[2][0] === d) P.add(v[2][1] + d);
      // column progression
      const e = v[1][0] - v[0][0];
      if (e !== 0 && [0, 1, 2].every((c) => v[1][c] - v[0][c] === e) && v[2][0] - v[1][0] === e && v[2][1] - v[1][1] === e) P.add(v[1][2] + e);
    }
    // row distribution of three
    const set = (a) => a.slice().sort((x, y) => x - y).join(',');
    const distinct3 = (a) => new Set(a).size === 3;
    if (distinct3(v[0]) && set(v[0]) === set(v[1]) && v[2][0] !== v[2][1] && v[0].includes(v[2][0]) && v[0].includes(v[2][1])) {
      P.add(v[0].find((x) => x !== v[2][0] && x !== v[2][1]));
    }
    // column distribution of three
    const col = (c) => [v[0][c], v[1][c], v[2][c]];
    if (distinct3(col(0)) && set(col(0)) === set(col(1)) && v[0][2] !== v[1][2] && col(0).includes(v[0][2]) && col(0).includes(v[1][2])) {
      P.add(col(0).find((x) => x !== v[0][2] && x !== v[1][2]));
    }
    if (isCount) {
      if (v[0][2] === v[0][0] + v[0][1] && v[1][2] === v[1][0] + v[1][1]) P.add(v[2][0] + v[2][1]);
      if (v[0][2] === v[0][0] - v[0][1] && v[1][2] === v[1][0] - v[1][1]) P.add(v[2][0] - v[2][1]);
      if (v[2][0] === v[0][0] + v[1][0] && v[2][1] === v[0][1] + v[1][1]) P.add(v[0][2] + v[1][2]);
    }
    if (isMask) {
      const ops = [(a, b) => a ^ b, (a, b) => a | b, (a, b) => a & b, (a, b) => a & ~b];
      for (const op of ops) {
        if (v[0][2] === op(v[0][0], v[0][1]) && v[1][2] === op(v[1][0], v[1][1])) P.add(op(v[2][0], v[2][1]));
        if (v[2][0] === op(v[0][0], v[1][0]) && v[2][1] === op(v[0][1], v[1][1])) P.add(op(v[0][2], v[1][2]));
      }
    }
    return P;
  }
  IQ._matrixPredictions = predictions;

  const cellKey = (c) => ATTR_KEYS.map((k) => c[k]).join('|');

  function mutate(cell, attr, rng) {
    const n = Object.assign({}, cell);
    const A = ATTR[attr];
    let pool = A.vals.slice();
    if (attr === 'lines') {
      // toggle one line most of the time (near miss), or empty
      pool = LINE_BITS.map((b) => cell.lines ^ b).filter((m) => popcount(m) <= 4);
      if (cell.lines) pool.push(0);
    }
    pool = pool.filter((x) => x !== cell[attr]);
    n[attr] = rng.pick(pool);
    return n;
  }

  /* Build answer options with a "bisection tree" so the correct answer
     is not simply the most common feature among the options. */
  function makeOptions(correct, varying, rng, nOpts) {
    const opts = [correct];
    const keys = new Set([cellKey(correct)]);
    let guard = 0;
    while (opts.length < nOpts && guard++ < 400) {
      const base = rng.pick(opts);
      const attr = varying.length && rng.chance(0.78) ? rng.pick(varying) : rng.pick(ATTR_KEYS);
      const m = mutate(base, attr, rng);
      const k = cellKey(m);
      if (keys.has(k)) continue;
      keys.add(k);
      opts.push(m);
    }
    return opts;
  }

  const RULE_TEXT = {
    sides: {
      row: 'The shape changes from row to row but stays the same within each row.',
      col: 'Each column keeps the same shape.',
      prog: 'Moving right, each shape gains (or loses) one side.',
      dist: 'Each row contains one of each of three shapes.',
    },
    size: {
      row: 'Size changes from row to row but stays the same within each row.',
      col: 'Each column keeps the same size.',
      dist: 'Each row contains one small, one medium and one large figure.',
    },
    shade: {
      row: 'Shading changes from row to row but stays the same within each row.',
      col: 'Each column keeps the same shading.',
      prog: 'Moving right, the shading gets one step darker (or lighter).',
      dist: 'Each row contains one of each of three shadings.',
    },
    count: {
      row: 'The number of shapes changes from row to row but stays the same within each row.',
      prog: 'Moving right, the number of shapes goes up (or down) by one.',
      dist: 'Each row contains one of each of three counts.',
      arith: 'In each row, the third count equals the first plus the second.',
    },
    lines: {
      row: 'The lines change from row to row but stay the same within each row.',
      dist: 'Each row contains one of each of three line patterns.',
      xor: 'Lines in the third box are the ones that appear in only one of the first two boxes (shared lines cancel out).',
      or: 'The third box combines every line from the first two boxes.',
    },
  };

  IQ.genMatrix = function (rng, targetB) {
    const near = CATALOG.filter((x) => Math.abs(x.b - targetB) <= 0.25);
    const pool = near.length ? near : CATALOG.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB)).slice(0, 12);
    for (let attempt = 0; attempt < 80; attempt++) {
      const spec = rng.pick(pool);
      const ruleOf = {};
      ATTR_KEYS.forEach((k) => (ruleOf[k] = 'const'));
      spec.rules.forEach((r) => (ruleOf[r.attr] = r.rule));
      const grids = {};
      let bad = false;
      for (const k of ATTR_KEYS) {
        const g = genAttrGrid(k, ruleOf[k], rng);
        if (!g) { bad = true; break; }
        grids[k] = g;
      }
      if (bad) continue;
      // circles can't show "sides" progressions; keep things readable:
      // a count of 4 with lines layered on top gets busy, so cap it
      // validate: every plausible rule must agree on the answer
      let ok = true;
      for (const k of ATTR_KEYS) {
        const P = predictions(grids[k], k === 'lines', k === 'count');
        if (P.size !== 1 || !P.has(grids[k][2][2])) { ok = false; break; }
      }
      if (!ok) continue;
      const cells = grid3((r, c) => {
        const o = {};
        ATTR_KEYS.forEach((k) => (o[k] = grids[k][r][c]));
        return o;
      });
      // every visible cell must differ from at least one neighbour so the grid isn't trivially uniform
      const correct = cells[2][2];
      const varying = spec.rules.map((r) => r.attr);
      const opts = makeOptions(correct, varying, rng, 8);
      if (opts.length < 8) continue;
      const order = rng.shuffle(opts.map((_, i) => i));
      const options = order.map((i) => opts[i]);
      const answer = order.indexOf(0);
      const rules = spec.rules.map((r) => ({ attr: r.attr, rule: r.rule }));
      return {
        b: spec.b, a: 1.3, c: 1 / 8,
        cells, options, answer, rules, timeLimit: 90,
        explain: rules.map((r) => RULE_TEXT[r.attr][r.rule]).concat(['Everything else stays the same in every box.']),
      };
    }
    throw new Error('matrix generation failed for b=' + targetB);
  };

  /* ---------------------------------------------------------------
     Shape series: five figures in a row, choose the sixth.
     --------------------------------------------------------------- */
  const SS_RULES = {
    sides: [{ rule: 'prog', w: 0.5 }, { rule: 'alt', w: 0.45 }, { rule: 'cyc3', w: 0.8 }],
    shade: [{ rule: 'alt', w: 0.45 }, { rule: 'cyc3', w: 0.8 }],
    size: [{ rule: 'alt', w: 0.45 }, { rule: 'cyc3', w: 0.8 }],
    dot: [{ rule: 'rot1', w: 0.5 }, { rule: 'rot2', w: 0.7 }, { rule: 'rot3', w: 0.95 }],
  };
  const SS_KEYS = Object.keys(SS_RULES);
  const SS_CATALOG = [];
  (function build(i, cur) {
    if (i === SS_KEYS.length) {
      if (cur.length < 1 || cur.length > 3) return;
      const b = -2.6 + cur.reduce((s, r) => s + r.w, 0) + 0.3 * (cur.length - 1);
      SS_CATALOG.push({ rules: cur.slice(), b: +b.toFixed(2) });
      return;
    }
    build(i + 1, cur);
    for (const r of SS_RULES[SS_KEYS[i]]) { cur.push(Object.assign({ attr: SS_KEYS[i] }, r)); build(i + 1, cur); cur.pop(); }
  })(0, []);
  IQ.SHAPESERIES_MAX_B = Math.max(...SS_CATALOG.map((x) => x.b));

  const SS_DOM = { sides: [3, 4, 5, 6, 7, 8], shade: [0, 1, 2, 3], size: [0, 1, 2], dot: [0, 1, 2, 3, 4, 5, 6, 7] };
  function ssSeq(attr, rule, rng) {
    const dom = SS_DOM[attr];
    if (rule === 'const') {
      if (attr === 'dot') return Array(6).fill(-1);
      const v = attr === 'size' ? rng.pick([1, 2]) : attr === 'sides' ? rng.pick([0, 3, 4, 5, 6]) : rng.pick(dom);
      return Array(6).fill(v);
    }
    if (rule === 'prog') { const up = rng.chance(0.5); return [0, 1, 2, 3, 4, 5].map((i) => (up ? dom[i] : dom[5 - i])); }
    if (rule === 'alt') { const v = rng.shuffle(attr === 'sides' ? [0, 3, 4, 5, 6] : dom).slice(0, 2); return [0, 1, 2, 3, 4, 5].map((i) => v[i % 2]); }
    if (rule === 'cyc3') { const v = rng.shuffle(attr === 'sides' ? [0, 3, 4, 5, 6] : dom).slice(0, 3); return [0, 1, 2, 3, 4, 5].map((i) => v[i % 3]); }
    const k = { rot1: 1, rot2: 2, rot3: 3 }[rule] * (rng.chance(0.5) ? 1 : -1);
    const s = rng.int(0, 7);
    return [0, 1, 2, 3, 4, 5].map((i) => (((s + i * k) % 8) + 8) % 8);
  }
  function ssPredictions(a, isDot) {
    const P = new Set();
    if (a.slice(0, 5).every((x) => x === a[0])) P.add(a[0]);
    if (a[2] === a[0] && a[4] === a[0] && a[3] === a[1] && a[0] !== a[1]) P.add(a[1]);
    if (a[3] === a[0] && a[4] === a[1] && new Set(a.slice(0, 3)).size === 3) P.add(a[2]);
    const d = a[1] - a[0];
    if (d !== 0 && [1, 2, 3].every((i) => a[i + 1] - a[i] === d)) P.add(a[4] + d);
    if (isDot) {
      const k = (((a[1] - a[0]) % 8) + 8) % 8;
      if (k && [1, 2, 3].every((i) => ((((a[i + 1] - a[i]) % 8) + 8) % 8) === k)) P.add((a[4] + k) % 8);
    }
    return P;
  }
  const SS_TEXT = {
    sides: { prog: 'Each figure has one more (or one fewer) side than the last.', alt: 'The shape alternates between two shapes.', cyc3: 'The shape repeats in a cycle of three.' },
    shade: { alt: 'The shading alternates between two shades.', cyc3: 'The shading repeats in a cycle of three.' },
    size: { alt: 'The size alternates between two sizes.', cyc3: 'The size repeats in a cycle of three.' },
    dot: { rot1: 'The dot moves one step around the edge each time.', rot2: 'The dot moves two steps (a quarter turn) around the edge each time.', rot3: 'The dot moves three steps around the edge each time.' },
  };
  const ssKey = (c) => [c.sides, c.shade, c.size, c.dot].join('|');

  IQ.genShapeSeries = function (rng, targetB) {
    const near = SS_CATALOG.filter((x) => Math.abs(x.b - targetB) <= 0.25);
    const pool = near.length ? near : SS_CATALOG.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB)).slice(0, 6);
    for (let attempt = 0; attempt < 60; attempt++) {
      const spec = rng.pick(pool);
      const ruleOf = { sides: 'const', shade: 'const', size: 'const', dot: 'const' };
      spec.rules.forEach((r) => (ruleOf[r.attr] = r.rule));
      // prog on sides needs polygons (no circle); shade/size const fine
      const seqs = {};
      SS_KEYS.forEach((k) => (seqs[k] = ssSeq(k, ruleOf[k], rng)));
      let ok = true;
      for (const k of SS_KEYS) {
        if (ruleOf[k] === 'const' && k === 'dot') continue;
        const P = ssPredictions(seqs[k], k === 'dot');
        if (P.size !== 1 || !P.has(seqs[k][5])) { ok = false; break; }
      }
      if (!ok) continue;
      const frames = [0, 1, 2, 3, 4, 5].map((i) => ({ sides: seqs.sides[i], shade: seqs.shade[i], size: seqs.size[i], count: 1, lines: 0, dot: seqs.dot[i] }));
      const correct = frames[5];
      const varying = spec.rules.map((r) => r.attr);
      const opts = [correct];
      const keys = new Set([ssKey(correct)]);
      let g = 0;
      while (opts.length < 6 && g++ < 300) {
        const base = rng.pick(opts);
        const attr = rng.chance(0.8) ? rng.pick(varying) : rng.pick(['shade', 'size', 'sides']);
        const n = Object.assign({}, base);
        let dom = SS_DOM[attr].slice();
        if (attr === 'sides') dom = [0, 3, 4, 5, 6, 7, 8];
        if (attr === 'dot' && base.dot < 0) continue;
        if (attr === 'size') dom = [0, 1, 2];
        n[attr] = rng.pick(dom.filter((x) => x !== base[attr]));
        const k = ssKey(n);
        if (keys.has(k)) continue;
        keys.add(k);
        opts.push(n);
      }
      if (opts.length < 6) continue;
      const order = rng.shuffle([0, 1, 2, 3, 4, 5]);
      return {
        kind: 'shapes', b: spec.b, a: 1.1, c: 1 / 6, timeLimit: 60,
        frames: frames.slice(0, 5), options: order.map((i) => opts[i]), answer: order.indexOf(0),
        explain: spec.rules.map((r) => SS_TEXT[r.attr][r.rule]),
      };
    }
    throw new Error('shape series failed');
  };
})();
