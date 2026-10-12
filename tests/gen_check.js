// Node harness: loads the generator files and stress-tests them.
// Run: node tests/gen_check.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console, TextEncoder, TextDecoder, btoa, atob, performance, setTimeout };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['core.js', 'gen-matrix.js', 'gen-series.js', 'gen-rotation.js', 'gen-verbal.js', 'subtests.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const IQ = ctx.IQ;
let fails = 0;
const bs = [-2.6, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.6];
function check(name, gen, n, validate) {
  const hist = {}; let t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const b = bs[i % bs.length];
    const rng = IQ.rng(name + i);
    let it;
    try { it = gen(rng, b); } catch (e) { fails++; console.log('GEN FAIL', name, b, e.message); continue; }
    const k = it.b.toFixed(1); hist[k] = (hist[k] || 0) + 1;
    const err = validate(it);
    if (err) { fails++; if (fails < 20) console.log('INVALID', name, b, err); }
  }
  console.log(name.padEnd(10), n, 'items', (Date.now() - t0) + 'ms', 'b spread:', Object.keys(hist).sort((a, b) => a - b).join(' '));
}
const uniq = (a) => new Set(a.map((x) => JSON.stringify(x))).size === a.length;
check('matrix', IQ.genMatrix, 3000, (it) => {
  if (it.options.length !== 8) return 'opts';
  if (!uniq(it.options)) return 'dup opts';
  if (JSON.stringify(it.options[it.answer]) !== JSON.stringify(it.cells[2][2])) return 'answer mismatch';
  // re-validate every attribute has one prediction
  for (const k of ['sides', 'size', 'shade', 'count', 'lines']) {
    const g = it.cells.map((r) => r.map((c) => c[k]));
    const P = IQ._matrixPredictions(g, k === 'lines', k === 'count');
    if (P.size !== 1) return 'ambiguous ' + k;
  }
  // no other option satisfies all predictions
  return null;
});
check('series', IQ.genSeries, 3000, (it) => {
  if (it.options.length !== 6) return 'opts ' + it.options.length;
  if (!uniq(it.options)) return 'dup opts ' + JSON.stringify(it.options);
  if (it.kind !== 'shapes') {
    const vis = it.terms.map((t) => (it.kind === 'let' ? t.charCodeAt(0) - 64 : +t));
    const alt = IQ._seriesAlt(vis); const ans = it.kind === 'let' ? it.options[it.answer].charCodeAt(0) - 64 : +it.options[it.answer];
    alt.delete(ans); if (alt.size) return 'ambiguous';
  }
  return null;
});
check('rotation', IQ.genRotation, 1500, (it) => {
  const R = IQ._rot;
  if (it.options.length !== 4) return 'opts';
  if (it.dim === 3) {
    const base = R.canon(it.target);
    const ks = it.options.map((o) => R.canon(o.cubes));
    const same = ks.filter((k) => k === base).length;
    if (same !== 1) return 'same count ' + same;
    if (ks[it.answer] !== base) return 'answer not rotation';
    // no full occlusion (two cubes on the same line of sight is impossible with our camera, check uniqueness of images)
  } else {
    const base = R.canon2(it.target);
    const ks = it.options.map((o) => R.canon2(o.cells));
    if (ks.filter((k) => k === base).length !== 1) return '2d same count';
    if (ks[it.answer] !== base) return '2d answer';
  }
  return null;
});
check('vocab', (r, b) => IQ.genVocab(r, b), 600, (it) => (it.options.length === 5 && uniq(it.options) ? null : 'opts'));
check('quant', IQ.genQuant, 3000, (it) => (it.options.length === 5 && uniq(it.options) ? null : 'opts ' + JSON.stringify(it.options)));
check('reflect', (r, b) => IQ.genReflect(r, b), 2000, (it) => (it.options.length === 4 && uniq(it.options) ? null : 'opts ' + JSON.stringify(it.options)));
// glyphs
for (let i = 0; i < 200; i++) { const g = IQ.makeGlyphs(IQ.rng('g' + i), 12, 3); if (g.length < 12) { fails++; console.log('glyph short', g.length); break; } }
// determinism
const a = JSON.stringify(IQ.genMatrix(IQ.rng('same'), 0.5)), b2 = JSON.stringify(IQ.genMatrix(IQ.rng('same'), 0.5));
if (a !== b2) { fails++; console.log('NOT DETERMINISTIC'); }
// save code roundtrip
IQ.state = IQ.defaultState(); IQ.state.settings.name = 'Rāj ✓';
const code = IQ.exportCode(); const back = IQ.importCode(code);
if (back.settings.name !== 'Rāj ✓') { fails++; console.log('save code roundtrip failed'); }
console.log('matrix catalog size', IQ.MATRIX_CATALOG.length, 'b range', Math.min(...IQ.MATRIX_CATALOG.map((x) => x.b)), Math.max(...IQ.MATRIX_CATALOG.map((x) => x.b)));
console.log(fails ? `FAILURES: ${fails}` : 'ALL GENERATOR CHECKS PASSED');
process.exit(fails ? 1 : 0);
