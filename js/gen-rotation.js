/* =====================================================================
   IQ Test — gen-rotation.js
   Mental Rotation. Easy levels use flat shapes turned on the page;
   harder levels use 3D block figures (Shepard–Metzler style). The
   wrong answers are mirror images (cannot be turned to match) or
   figures with a block moved. Every item is checked by computer:
   the correct option IS a rotation of the target; mirrors and
   altered figures are NOT.
   ===================================================================== */
'use strict';
(function () {
  /* ---------- 24 proper rotations of the cube (integer matrices) ---------- */
  const ROTS = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const sg = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) M[i][p[i]] = sg[i];
    const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    if (det === 1) ROTS.push(M);
  }
  const ap = (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
  const mul = (A, B) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
  const tr = (M) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => M[j][i]));
  const angleOf = (M) => Math.round((Math.acos(IQ.clamp((M[0][0] + M[1][1] + M[2][2] - 1) / 2, -1, 1)) * 180) / Math.PI);

  function norm(cubes) {
    const mn = [0, 1, 2].map((k) => Math.min(...cubes.map((c) => c[k])));
    return cubes.map((c) => [c[0] - mn[0], c[1] - mn[1], c[2] - mn[2]]).map((c) => c.join(',')).sort().join(';');
  }
  function canon(cubes) {
    let best = null;
    for (const R of ROTS) { const k = norm(cubes.map((c) => ap(R, c))); if (best === null || k < best) best = k; }
    return best;
  }
  const mirror = (cubes) => cubes.map((c) => [-c[0], c[1], c[2]]);
  const rot = (R, cubes) => cubes.map((c) => ap(R, c));

  /* Random block "snake": arms along perpendicular axes */
  function genSnake(rng, nCubes) {
    for (let t = 0; t < 200; t++) {
      const arms = 4;
      const lens = [];
      let rem = nCubes - 1;
      for (let i = 0; i < arms; i++) {
        const left = arms - i - 1;
        const l = i === arms - 1 ? rem : rng.int(1, Math.max(1, Math.min(4, rem - left)));
        lens.push(l); rem -= l;
      }
      if (rem !== 0 || lens.some((l) => l < 1 || l > 4)) continue;
      const pos = [0, 0, 0];
      const cubes = [pos.slice()];
      const occ = new Set([pos.join(',')]);
      let prevAxis = -1, ok = true;
      const axesUsed = new Set();
      for (const l of lens) {
        let axis;
        do { axis = rng.int(0, 2); } while (axis === prevAxis);
        const dir = rng.pick([1, -1]);
        for (let k = 0; k < l; k++) {
          pos[axis] += dir;
          const key = pos.join(',');
          if (occ.has(key)) { ok = false; break; }
          occ.add(key); cubes.push(pos.slice());
        }
        if (!ok) break;
        axesUsed.add(axis); prevAxis = axis;
      }
      if (!ok || axesUsed.size < 3) continue;
      if (canon(mirror(cubes)) === canon(cubes)) continue; // must be chiral
      return cubes;
    }
    return null;
  }
  /* Same figure with one end block moved somewhere else */
  function alterSnake(cubes, rng) {
    const occ = new Set(cubes.map((c) => c.join(',')));
    const base = canon(cubes), mir = canon(mirror(cubes));
    for (let t = 0; t < 80; t++) {
      const fromEnd = rng.chance(0.5);
      const body = fromEnd ? cubes.slice(0, -1) : cubes.slice(1);
      const anchor = fromEnd ? body[body.length - 1] : body[0];
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      const d = rng.pick(dirs);
      const np = [anchor[0] + d[0], anchor[1] + d[1], anchor[2] + d[2]];
      const removed = fromEnd ? cubes[cubes.length - 1] : cubes[0];
      if (occ.has(np.join(',')) && np.join(',') !== removed.join(',')) continue;
      if (np.join(',') === removed.join(',')) continue;
      const nc = fromEnd ? body.concat([np]) : [np].concat(body);
      const k = canon(nc);
      if (k === base || k === mir) continue;
      return nc;
    }
    return null;
  }

  /* ---------- 2D polyominoes ---------- */
  function genPoly(rng, n) {
    for (let t = 0; t < 200; t++) {
      const cells = [[0, 0]];
      const occ = new Set(['0,0']);
      while (cells.length < n) {
        const b = rng.pick(cells);
        const d = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const p = [b[0] + d[0], b[1] + d[1]];
        if (occ.has(p.join(','))) continue;
        occ.add(p.join(',')); cells.push(p);
      }
      if (canon2(mir2(cells)) === canon2(cells)) continue;
      return cells;
    }
    return null;
  }
  const rot2 = (cells, k) => cells.map(([x, y]) => { let p = [x, y]; for (let i = 0; i < k; i++) p = [-p[1], p[0]]; return p; });
  const mir2 = (cells) => cells.map(([x, y]) => [-x, y]);
  const norm2 = (cells) => { const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1])); return cells.map(([x, y]) => `${x - mx},${y - my}`).sort().join(';'); };
  const canon2 = (cells) => [0, 1, 2, 3].map((k) => norm2(rot2(cells, k))).sort()[0];
  function alterPoly(cells, rng) {
    const base = canon2(cells), mir = canon2(mir2(cells));
    for (let t = 0; t < 80; t++) {
      const i = rng.int(0, cells.length - 1);
      const rest = cells.filter((_, j) => j !== i);
      const occ = new Set(rest.map((c) => c.join(',')));
      const b = rng.pick(rest);
      const d = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const p = [b[0] + d[0], b[1] + d[1]];
      if (occ.has(p.join(',')) || p.join(',') === cells[i].join(',')) continue;
      const nc = rest.concat([p]);
      if (!connected2(nc)) continue;
      const k = canon2(nc);
      if (k === base || k === mir) continue;
      return nc;
    }
    return null;
  }
  function connected2(cells) {
    const set = new Set(cells.map((c) => c.join(',')));
    const seen = new Set([cells[0].join(',')]);
    const st = [cells[0]];
    while (st.length) {
      const [x, y] = st.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); }
      }
    }
    return seen.size === cells.length;
  }

  /* ---------- Difficulty catalogue (speculative calibration) ---------- */
  const LEVELS = [
    { id: '2d-a', b: -2.0, dim: 2, n: 5, mirrors: 1, alters: 2 },
    { id: '2d-b', b: -1.3, dim: 2, n: 6, mirrors: 3, alters: 0 },
    { id: '3d-a', b: -0.6, dim: 3, n: 7, mirrors: 1, alters: 2, ang: [90] },
    { id: '3d-b', b: 0.1, dim: 3, n: 8, mirrors: 2, alters: 1, ang: [90, 120] },
    { id: '3d-c', b: 0.8, dim: 3, n: 9, mirrors: 3, alters: 0, ang: [120, 180] },
    { id: '3d-d', b: 1.4, dim: 3, n: 10, mirrors: 2, alters: 1, ang: [120, 180], near: true },
  ];

  IQ.genRotation = function (rng, targetB) {
    const lv = LEVELS.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB))[0];
    for (let attempt = 0; attempt < 60; attempt++) {
      if (lv.dim === 2) {
        const P = genPoly(rng, lv.n);
        if (!P) continue;
        const k0 = rng.int(0, 3);
        const target = rot2(P, k0);
        const correct = rot2(P, (k0 + rng.int(1, 3)) % 4);
        const opts = [{ cells: correct, kind: 'same' }];
        for (let i = 0; i < lv.mirrors; i++) opts.push({ cells: rot2(mir2(P), rng.int(0, 3)), kind: 'mirror' });
        let failed = false;
        for (let i = 0; i < lv.alters; i++) { const a = alterPoly(P, rng); if (!a) { failed = true; break; } opts.push({ cells: rot2(a, rng.int(0, 3)), kind: 'altered' }); }
        if (failed) continue;
        // options must all look different from each other
        const keys = opts.map((o) => norm2(o.cells));
        if (new Set(keys).size !== keys.length) continue;
        const order = rng.shuffle([0, 1, 2, 3]);
        return {
          dim: 2, b: lv.b, a: 1.0, c: 0.25, timeLimit: 45,
          target, options: order.map((i) => opts[i]), answer: order.indexOf(0),
          explain: explainRot(order.map((i) => opts[i])),
        };
      }
      const S = genSnake(rng, lv.n);
      if (!S) continue;
      const R0 = rng.pick(ROTS);
      let R1, g = 0;
      do { R1 = rng.pick(ROTS); g++; } while ((R1 === R0 || !lv.ang.includes(angleOf(mul(R1, tr(R0))))) && g < 200);
      if (R1 === R0) continue;
      const opts = [{ cubes: rot(R1, S), kind: 'same' }];
      const M = mirror(S);
      for (let i = 0; i < lv.mirrors; i++) opts.push({ cubes: rot(rng.pick(ROTS), M), kind: 'mirror' });
      let failed = false;
      for (let i = 0; i < lv.alters; i++) {
        const a = alterSnake(S, rng);
        if (!a) { failed = true; break; }
        opts.push({ cubes: rot(rng.pick(ROTS), lv.near && rng.chance(0.5) ? mirror(a) : a), kind: 'altered' });
      }
      if (failed) continue;
      const keys = opts.map((o) => norm(o.cubes));
      if (new Set(keys).size !== keys.length) continue;
      const tk = norm(rot(R0, S));
      if (keys.includes(tk)) continue; // never show the target unchanged
      const order = rng.shuffle([0, 1, 2, 3]);
      return {
        dim: 3, b: lv.b, a: 1.0, c: 0.25, timeLimit: 60,
        target: rot(R0, S), options: order.map((i) => opts[i]), answer: order.indexOf(0),
        explain: explainRot(order.map((i) => opts[i])),
      };
    }
    throw new Error('rotation generation failed');
  };
  // exposed for automated tests
  IQ._rot = { canon, mirror, norm, canon2, mir2, norm2 };

  function explainRot(opts) {
    const L = 'ABCD';
    const same = opts.findIndex((o) => o.kind === 'same');
    const mirrors = opts.map((o, i) => (o.kind === 'mirror' ? L[i] : null)).filter(Boolean);
    const alt = opts.map((o, i) => (o.kind === 'altered' ? L[i] : null)).filter(Boolean);
    const out = [`${L[same]} is the same figure, just turned.`];
    if (mirrors.length) out.push(`${mirrors.join(' and ')} ${mirrors.length > 1 ? 'are mirror images' : 'is a mirror image'}: no amount of turning makes ${mirrors.length > 1 ? 'them' : 'it'} match without flipping.`);
    if (alt.length) out.push(`${alt.join(' and ')} ${alt.length > 1 ? 'have' : 'has'} a block in a different place.`);
    return out;
  }

  /* ---------- Rendering ---------- */
  const V = (() => { const v = [1.0, 1.32, 0.86]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const RIGHT = (() => { const r = cross([0, 0, 1], V); const l = Math.hypot(...r); return r.map((x) => x / l); })();
  const UP = cross(V, RIGHT);
  const P = (p) => [dot(p, RIGHT), -dot(p, UP)];
  const FACES = [
    { n: [1, 0, 0], q: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], cls: 'f-x' },
    { n: [0, 1, 0], q: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], cls: 'f-y' },
    { n: [0, 0, 1], q: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], cls: 'f-z' },
  ];
  function extent3(cubes) {
    const pts = [];
    cubes.forEach((c) => { for (let i = 0; i < 8; i++) pts.push(P([c[0] + (i & 1), c[1] + ((i >> 1) & 1), c[2] + ((i >> 2) & 1)])); });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }
  IQ.rotExtent = function (item) {
    const all = [item.target].concat(item.options.map((o) => (item.dim === 3 ? o.cubes : o.cells)));
    if (item.dim === 3) return Math.max(...all.map((c) => { const e = extent3(c); return Math.max(e.x1 - e.x0, e.y1 - e.y0); }));
    return Math.max(...all.map((c) => { const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]); return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1; }));
  };
  IQ.figureSVG = function (dim, shapeData, span) {
    if (dim === 2) {
      const xs = shapeData.map((p) => p[0]), ys = shapeData.map((p) => p[1]);
      const mx = Math.min(...xs), my = Math.min(...ys), w = Math.max(...xs) - mx + 1, h = Math.max(...ys) - my + 1;
      const u = 84 / Math.max(span, 3);
      const ox = 50 - (w * u) / 2, oy = 50 - (h * u) / 2;
      const r = shapeData.map(([x, y]) => `<rect x="${(ox + (x - mx) * u).toFixed(1)}" y="${(oy + (y - my) * u).toFixed(1)}" width="${u.toFixed(1)}" height="${u.toFixed(1)}" rx="2"/>`).join('');
      return `<svg viewBox="0 0 100 100" class="fig" aria-hidden="true"><g class="poly">${r}</g></svg>`;
    }
    const e = extent3(shapeData);
    const s = 88 / span;
    const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
    const tx = (p) => { const q = P(p); return `${(50 + (q[0] - cx) * s).toFixed(1)},${(50 + (q[1] - cy) * s).toFixed(1)}`; };
    const order = shapeData.slice().sort((a, b) => dot(a, V) - dot(b, V));
    const occ = new Set(shapeData.map((c) => c.join(',')));
    let out = '';
    for (const c of order) {
      for (const f of FACES) {
        const nb = [c[0] + f.n[0], c[1] + f.n[1], c[2] + f.n[2]].join(',');
        if (occ.has(nb)) continue; // hidden internal face
        out += `<polygon class="${f.cls}" points="${f.q.map((o) => tx([c[0] + o[0], c[1] + o[1], c[2] + o[2]])).join(' ')}"/>`;
      }
    }
    return `<svg viewBox="0 0 100 100" class="fig" aria-hidden="true"><g class="cubes" stroke-linejoin="round">${out}</g></svg>`;
  };
})();
