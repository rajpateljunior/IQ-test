// Scoring simulation: simulated adults with known true abilities take the
// Quick Test using the real generators, adaptive rule and scoring code.
// Checks: scores average ~100 with SD ~15, track true ability, and the
// 90% range contains the true score about 90% of the time.
// Run: node tests/score_sim.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, TextEncoder, TextDecoder, btoa, atob, performance, setTimeout };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['core.js', 'gen-matrix.js', 'gen-series.js', 'gen-rotation.js', 'gen-verbal.js', 'tasks.js', 'subtests.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const IQ = ctx.IQ;
let seed = 12345; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const R = IQ.RHO, W = IQ.WEIGHTS;
const NORM = { f: [6.6, 1.2], b: [4.9, 1.3], corsi: [5.7, 1.1] };

function simSub(id, th, rng) {
  const m = IQ.SUBTESTS[id]; const resp = [];
  const answer = (it) => { const x = rand() < IQ.p3pl(th, it) ? 1 : 0; resp.push(Object.assign({}, it, { x })); };
  if (m.kind === 'mc') {
    for (let i = 0; i < m.testN; i++) {
      const b = IQ.nextB(resp, i, -0.8);
      const it = m.gen(IQ.rng(rng + i), b, new Set());
      answer({ a: it.a, b: it.b, c: it.c });
    }
  } else if (id === 'digitspan') {
    for (const dir of ['f', 'b']) {
      const r2 = []; let prev = dir === 'f' ? 5 : 4;
      for (let t = 0; t < 4; t++) {
        const L = IQ.tasks._nextLen(r2, NORM[dir], dir === 'f' ? 5 : 4, prev, 2, 10); prev = L;
        const it = { a: 1.5, b: (L - NORM[dir][0]) / NORM[dir][1], c: 0 };
        const x = rand() < IQ.p3pl(th, it) ? 1 : 0; const o = Object.assign({}, it, { x }); r2.push(o); resp.push(o);
      }
    }
  } else if (id === 'corsi') {
    let prev = 4;
    for (let t = 0; t < 6; t++) { const L = IQ.tasks._nextLen(resp, NORM.corsi, 4, prev, 2, 9); prev = L; answer({ a: 1.4, b: (L - 5.7) / 1.1, c: 0 }); }
  } else if (id === 'coding') {
    resp.push({ mu: th + 0.45 * gauss(), se: 0.45 });
  } else if (id === 'paired') {
    for (let i = 0; i < 4; i++) answer({ a: 1, b: -1.6, c: 0.25 });
    const t2 = IQ.posterior(resp).theta; const k = t2 > 0.3 ? 8 : t2 < -0.6 ? 5 : 6;
    for (let i = 0; i < k; i++) answer({ a: 1, b: -1.6 + 0.38 * (k - 4), c: 1 / k });
  }
  return resp;
}
const N = +(process.argv[2] || 4000);
const doms = ['FR', 'VS', 'WM', 'QR', 'PS', 'LM', 'CR', 'VK'];
const out = []; let cover = 0, coverIdx = 0, nIdx = 0;
const perDom = {}; doms.forEach((d) => (perDom[d] = []));
for (let n = 0; n < N; n++) {
  // one-factor model: each domain = sqrt(R)*g + sqrt(1-R)*specific
  const g = gauss(); const th = {};
  doms.forEach((d) => (th[d] = Math.sqrt(R) * g + Math.sqrt(1 - R) * gauss()));
  const subs = IQ.QUICK_ORDER.map((d) => IQ.BY_DOMAIN[d][n % IQ.BY_DOMAIN[d].length]);
  const posts = {};
  subs.forEach((id) => { const d = IQ.SUBTESTS[id].domain; posts[d] = IQ.posterior(simSub(id, th[d], 'p' + n + id)); });
  const fse = IQ.compositeScore(posts);
  // true composite in score units
  let num = 0, sw = 0, sw2 = 0; Object.keys(W).forEach((k) => { num += W[k] * th[k]; sw += W[k]; sw2 += W[k] ** 2; });
  const trueC = 100 + 15 * num / Math.sqrt(sw2 * (1 - R) + R * sw * sw);
  if (trueC >= fse.lo - 0.5 && trueC <= fse.hi + 0.5) cover++;
  doms.forEach((d) => { const s = IQ.indexScore(posts[d]); perDom[d].push([s.score, 100 + 15 * th[d]]); nIdx++; if (100 + 15 * th[d] >= s.lo - .5 && 100 + 15 * th[d] <= s.hi + .5) coverIdx++; });
  out.push([fse.score, trueC, fse.hi - fse.lo]);
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0; a.forEach((x, i) => (s += (x - ma) * (b[i] - mb))); return s / a.length / sd(a) / sd(b); };
const est = out.map((o) => o[0]), tru = out.map((o) => o[1]);
console.log(`Simulated adults: ${N}`);
console.log(`Full-Scale Estimate: mean ${mean(est).toFixed(1)}, SD ${sd(est).toFixed(1)} (target 100 / 15)`);
console.log(`Correlation with true ability: ${corr(est, tru).toFixed(3)}`);
console.log(`Mean width of 90% range: ${mean(out.map((o) => o[2])).toFixed(1)} points`);
console.log(`90% range contains true score: ${(100 * cover / N).toFixed(1)}%`);
console.log(`Index 90% ranges contain true index: ${(100 * coverIdx / nIdx).toFixed(1)}%`);
doms.forEach((d) => { const a = perDom[d]; console.log(`  ${d}: mean ${mean(a.map((x) => x[0])).toFixed(1)} SD ${sd(a.map((x) => x[0])).toFixed(1)} r=${corr(a.map((x) => x[0]), a.map((x) => x[1])).toFixed(2)}`); });
// a few fixed people
for (const t of [-2, -1, 0, 1, 2]) {
  const rs = [];
  for (let k = 0; k < 300; k++) {
    const posts = {};
    IQ.QUICK_ORDER.forEach((d, j) => { const id = IQ.BY_DOMAIN[d][k % IQ.BY_DOMAIN[d].length]; posts[d] = IQ.posterior(simSub(id, t, 'f' + t + k + id)); });
    rs.push(IQ.compositeScore(posts).score);
  }
  let sw = 0, sw2 = 0; Object.values(W).forEach((w) => { sw += w; sw2 += w * w; });
  const tc = 100 + 15 * t * sw / Math.sqrt(sw2 * (1 - R) + R * sw * sw);
  console.log(`Person at ${t >= 0 ? '+' : ''}${t} SD in every area (true FSE ${tc.toFixed(0)}): mean estimate ${mean(rs).toFixed(1)}, SD ${sd(rs).toFixed(1)}`);
}
const ok = Math.abs(mean(est) - 100) < 3 && Math.abs(sd(est) - 15) < 2.5 && corr(est, tru) > 0.85 && cover / N > 0.82;
console.log(ok ? 'SCORING SIMULATION PASSED' : 'SCORING SIMULATION OUT OF TOLERANCE');
process.exit(ok ? 0 : 1);
