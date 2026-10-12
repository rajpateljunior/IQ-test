/* =====================================================================
   IQ Test — subtests.js
   Registry of the Phase 1 subtests: what they are called, which domain
   they score, how many items each mode uses, how to draw them.
   Multiple-choice subtests provide gen/stem/opt/layout; interactive
   ones provide run (see tasks.js).
   To add a subtest in Phase 2: add an entry here, add it to
   IQ.BY_DOMAIN, and (if interactive) a task in tasks.js.
   ===================================================================== */
'use strict';
(function () {
  const L = 'ABCDEFGH';
  const fig = (svg) => svg;

  IQ.SUBTESTS = {
    matrices: {
      id: 'matrices', domain: 'FR', name: 'Matrix Puzzles', icon: 'grid',
      blurb: 'Find the tile that completes the 3×3 pattern.',
      howto: ['Each row follows the same hidden rules (shape, shading, size, number, lines).', 'Work out the rules from the first two rows, then pick the tile that completes the third.'],
      kind: 'mc', testN: 4, dailyN: 3, gymN: 6,
      gen: (rng, b) => IQ.genMatrix(rng, b),
      layout: () => 'lay-matrix',
      stem: (it) => `<div class="grid3">${it.cells.flat().map((c, i) => i === 8
        ? '<div class="mcell missing"><span>?</span></div>'
        : `<div class="mcell">${IQ.cellBox(c)}</div>`).join('')}</div>`,
      opt: (it, i) => fig(IQ.cellBox(it.options[i])),
      optClass: 'fig', cols: 4,
    },
    series: {
      id: 'series', domain: 'FR', name: 'Series', icon: 'series',
      blurb: 'What comes next in the number, letter or shape sequence?',
      howto: ['Find the rule that links each step to the next.', 'Some series mix two patterns, so look at every other item too.'],
      kind: 'mc', testN: 5, dailyN: 3, gymN: 6,
      gen: (rng, b) => IQ.genSeries(rng, b),
      layout: (it) => (it.kind === 'shapes' ? 'lay-seq figseq' : 'lay-seq'),
      stem: (it) => it.kind === 'shapes'
        ? `<div class="seqrow shapes">${it.frames.map((c) => `<div class="sq">${IQ.cellBox(c)}</div>`).join('')}<div class="sq missing"><span>?</span></div></div>`
        : `<div class="seqrow ${it.kind === 'let' ? 'letters' : ''}">${it.terms.map((t) => `<span class="term">${t}</span>`).join('<span class="comma"></span>')}<span class="comma"></span><span class="term missing">?</span></div>`,
      opt: (it, i) => (it.kind === 'shapes' ? IQ.cellBox(it.options[i]) : `<span class="num">${it.options[i]}</span>`),
      optClass: (it) => (it.kind === 'shapes' ? 'fig' : 'txt num'), cols: 3,
    },
    rotation: {
      id: 'rotation', domain: 'VS', name: 'Mental Rotation', icon: 'cube',
      blurb: 'Which figure is the same object, only turned?',
      howto: ['One option is the target figure turned to a new angle.', 'Watch out: mirror images look very similar but can’t be turned to match.'],
      kind: 'mc', testN: 6, dailyN: 3, gymN: 6,
      gen: (rng, b) => IQ.genRotation(rng, b),
      layout: () => 'lay-fig',
      stem: (it) => { it._span = IQ.rotExtent(it); return `<div class="target"><div class="tlabel">Target</div>${IQ.figureSVG(it.dim, it.target, it._span)}</div>`; },
      opt: (it, i) => `<span class="olabel">${L[i]}</span>${IQ.figureSVG(it.dim, it.dim === 3 ? it.options[i].cubes : it.options[i].cells, it._span || IQ.rotExtent(it))}`,
      optClass: 'fig rot', cols: 2,
    },
    digitspan: {
      id: 'digitspan', domain: 'WM', name: 'Digit Span', icon: 'digits',
      blurb: 'Remember a string of digits, then type it forwards and backwards.',
      howto: ['Digits flash one at a time. Hold them in mind.', 'First type them in the same order, then in reverse.'],
      kind: 'task', run: (ctx) => IQ.tasks.digitspan(ctx), testN: 4,
    },
    corsi: {
      id: 'corsi', domain: 'WM', name: 'Corsi Blocks', icon: 'blocks',
      blurb: 'Watch blocks light up, then tap them in the same order.',
      howto: ['Blocks light up one after another.', 'Tap the same blocks in the same order. Sequences get longer.'],
      kind: 'task', run: (ctx) => IQ.tasks.corsi(ctx), testN: 6,
    },
    coding: {
      id: 'coding', domain: 'PS', name: 'Symbol Coding', icon: 'code',
      blurb: 'Match symbols to numbers as fast as you can.',
      howto: ['A key shows which number goes with each symbol.', 'Tap the number for the symbol in the middle. Speed and accuracy both count.'],
      kind: 'task', run: (ctx) => IQ.tasks.coding(ctx), timed: true,
    },
    vocab: {
      id: 'vocab', domain: 'VK', name: 'Vocabulary', icon: 'book',
      blurb: 'Choose the meaning closest to the word.',
      howto: ['Pick the option closest in meaning.', 'If you are unsure, make your best guess.'],
      kind: 'mc', testN: 7, dailyN: 3, gymN: 6,
      gen: (rng, b, avoid) => IQ.genVocab(rng, b, avoid),
      layout: () => 'lay-text',
      stem: (it) => `<div class="qtext"><div class="qsub">${it.prompt}</div><div class="qword">${IQ.esc(it.word)}</div></div>`,
      opt: (it, i) => `<span class="olabel">${L[i]}</span><span>${IQ.esc(it.options[i])}</span>`,
      optClass: 'txt', cols: 1,
    },
    quant: {
      id: 'quant', domain: 'QR', name: 'Quantitative Problems', icon: 'calc',
      blurb: 'Short word problems. No calculator, no paper.',
      howto: ['Work each problem out in your head.', 'Estimate first, then check which option fits.'],
      kind: 'mc', testN: 4, dailyN: 3, gymN: 6,
      gen: (rng, b) => IQ.genQuant(rng, b),
      layout: () => 'lay-text',
      stem: (it) => `<div class="qtext"><div class="qpara">${IQ.esc(it.text)}</div></div>`,
      opt: (it, i) => `<span class="olabel">${L[i]}</span><span>${IQ.esc(it.options[i])}</span>`,
      optClass: 'txt', cols: 1,
    },
    paired: {
      id: 'paired', domain: 'LM', name: 'Paired Associates', icon: 'pairs',
      blurb: 'Learn symbol–word pairs, then recall them.',
      howto: ['Study each symbol and the word beside it.', 'Then you will see a symbol and choose its word.'],
      kind: 'task', run: (ctx) => IQ.tasks.paired(ctx),
    },
    reflect: {
      id: 'reflect', domain: 'CR', name: 'Reflection Questions', icon: 'bulb',
      blurb: 'Questions with a tempting wrong answer. Think twice.',
      howto: ['Each question has an answer that feels right but isn’t.', 'Take a moment to check before you choose.'],
      kind: 'mc', testN: 3, dailyN: 2, gymN: 5,
      gen: (rng, b, avoid) => IQ.genReflect(rng, b, avoid),
      layout: () => 'lay-text',
      stem: (it) => `<div class="qtext"><div class="qpara">${IQ.esc(it.text)}</div></div>`,
      opt: (it, i) => `<span class="olabel">${L[i]}</span><span>${IQ.esc(it.options[i])}</span>`,
      optClass: 'txt', cols: 1,
    },
  };

  IQ.BY_DOMAIN = {
    FR: ['matrices', 'series'], VS: ['rotation'], WM: ['digitspan', 'corsi'], QR: ['quant'],
    PS: ['coding'], LM: ['paired'], CR: ['reflect'], VK: ['vocab'],
  };
  // Order subtests are given in during the Quick Test
  IQ.QUICK_ORDER = ['FR', 'WM', 'VS', 'QR', 'PS', 'LM', 'VK', 'CR'];
  IQ.GYM_ORDER = ['matrices', 'series', 'rotation', 'digitspan', 'corsi', 'quant', 'coding', 'paired', 'reflect', 'vocab'];
  IQ.levelB = (L) => -2.5 + 0.5 * (L - 1);

  /* Small line icons for tiles (drawn in code, currentColor) */
  const ICONS = {
    grid: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><path d="M17 17.5h3M18.5 16v3" />',
    series: '<circle cx="4" cy="12" r="1.6"/><circle cx="9" cy="12" r="2.2"/><circle cx="15" cy="12" r="2.8"/><path d="M20 9.5v5M17.5 12h5"/>',
    cube: '<path d="M12 3l7 4v8l-7 4-7-4V7z"/><path d="M12 11l7-4M12 11L5 7M12 11v8"/>',
    digits: '<path d="M4 8l2-1.5V17M10 8.5a2 2 0 1 1 3.5 1.3L10 17h4M17.5 7.5h3l-2 3a2.5 2.5 0 1 1-2 4"/>',
    blocks: '<rect x="3" y="5" width="5" height="5" rx="1"/><rect x="14" y="3" width="5" height="5" rx="1"/><rect x="9" y="12" width="5" height="5" rx="1"/><rect x="16" y="15" width="5" height="5" rx="1"/>',
    code: '<path d="M5 5l3 3M8 5L5 8"/><path d="M15 5h4M17 3v4"/><rect x="4" y="14" width="5" height="5" rx="1"/><path d="M14 19l2.5-5 2.5 5"/>',
    book: '<path d="M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8-.5V19c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5z"/><path d="M12 6v13.5"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8.5 12h1M12 12h1M15 12h1M8.5 16h1M12 16h1M15 16h1"/>',
    pairs: '<path d="M4 7l3 3 3-3M4 14h6"/><path d="M14 8h6M14 15h6"/><path d="M11.5 7.5h1M11.5 14.5h1"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  };
  IQ.icon = (name, size) => `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* App UI icons */
  const UI = {
    home: '<path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19.5z"/>',
    gym: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    history: '<path d="M4 19V5M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    flame: '<path d="M12 21c4 0 7-2.7 7-6.6 0-3-1.8-5.3-3.6-7.1-.4 1.6-1.3 2.8-2.6 3.4.2-3.1-1.2-5.9-3.8-7.7.2 2.9-1.4 4.7-3 6.5C4.8 11.2 5 13 5 14.4 5 18.3 8 21 12 21z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  };
  IQ.ui_icon = (name, size) => `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[name] || ''}</svg>`;
})();
