/* =====================================================================
   IQ Test — gen-verbal.js
   Vocabulary (Verbal Knowledge), Quantitative Reasoning word problems
   and Reflection questions (Cognitive-Reflection-style lures).
   ===================================================================== */
'use strict';
(function () {
  /* ---------------------------------------------------------------
     Vocabulary bank. 6 levels x 16 words. Format:
     [word, correct meaning, 4 wrong options]. Level difficulty b is a
     speculative calibration based on word rarity.
     --------------------------------------------------------------- */
  const VOCAB = [
    // Level 1
    [['rapid', 'quick', 'silent', 'heavy', 'ancient', 'empty'],
      ['begin', 'start', 'finish', 'borrow', 'hide', 'worry'],
      ['enormous', 'huge', 'narrow', 'gentle', 'quiet', 'ripe'],
      ['purchase', 'buy', 'sell', 'carry', 'fold', 'wish'],
      ['fragile', 'breakable', 'sturdy', 'sticky', 'loud', 'distant'],
      ['vanish', 'disappear', 'appear', 'shout', 'gather', 'explode'],
      ['courageous', 'brave', 'timid', 'clumsy', 'polite', 'hungry'],
      ['weary', 'tired', 'eager', 'angry', 'wet', 'proud'],
      ['accurate', 'correct', 'rough', 'likely', 'vague', 'swift'],
      ['assist', 'help', 'hinder', 'follow', 'refuse', 'warn'],
      ['damp', 'moist', 'dry', 'cold', 'dark', 'stale'],
      ['ancient', 'very old', 'brand-new', 'noisy', 'foreign', 'sacred'],
      ['brief', 'short', 'dull', 'harsh', 'steady', 'private'],
      ['conceal', 'hide', 'reveal', 'polish', 'attach', 'break'],
      ['timid', 'shy', 'bold', 'cruel', 'lazy', 'wise'],
      ['grateful', 'thankful', 'jealous', 'careless', 'nervous', 'sleepy']],
    // Level 2
    [['abundant', 'plentiful', 'scarce', 'hidden', 'fragile', 'recent'],
      ['candid', 'frank', 'sly', 'gloomy', 'rigid', 'tender'],
      ['diligent', 'hardworking', 'idle', 'clever', 'honest', 'gentle'],
      ['hostile', 'unfriendly', 'welcoming', 'crowded', 'nervous', 'sudden'],
      ['mimic', 'imitate', 'ignore', 'praise', 'punish', 'deliver'],
      ['obsolete', 'outdated', 'modern', 'expensive', 'useful', 'fragrant'],
      ['placid', 'calm', 'stormy', 'bright', 'shallow', 'solid'],
      ['reluctant', 'unwilling', 'eager', 'ashamed', 'unable', 'curious'],
      ['tedious', 'boring', 'thrilling', 'difficult', 'careful', 'fragrant'],
      ['vivid', 'bright and clear', 'faded', 'ancient', 'smooth', 'quiet'],
      ['frugal', 'thrifty', 'wasteful', 'greedy', 'honest', 'generous'],
      ['lenient', 'permissive', 'strict', 'lazy', 'curious', 'fierce'],
      ['ominous', 'threatening', 'hopeful', 'ordinary', 'delicious', 'peaceful'],
      ['prudent', 'wise and careful', 'reckless', 'wealthy', 'proud', 'sleepy'],
      ['sincere', 'genuine', 'fake', 'rude', 'distant', 'wary'],
      ['trivial', 'unimportant', 'crucial', 'ancient', 'curious', 'rare']],
    // Level 3
    [['ambiguous', 'unclear', 'obvious', 'ancient', 'joyful', 'violent'],
      ['benevolent', 'kind', 'cruel', 'wealthy', 'wise', 'nervous'],
      ['cryptic', 'mysterious', 'plain', 'angry', 'rapid', 'chilly'],
      ['deter', 'discourage', 'encourage', 'deliver', 'decorate', 'examine'],
      ['eloquent', 'well-spoken', 'mute', 'elderly', 'ugly', 'wealthy'],
      ['fervent', 'passionate', 'indifferent', 'careful', 'foolish', 'fragile'],
      ['gregarious', 'sociable', 'solitary', 'greedy', 'gigantic', 'gentle'],
      ['impartial', 'unbiased', 'prejudiced', 'incomplete', 'impatient', 'important'],
      ['lucid', 'clear', 'murky', 'lucky', 'lazy', 'loud'],
      ['meticulous', 'thorough', 'sloppy', 'timid', 'cheerful', 'brief'],
      ['novice', 'beginner', 'expert', 'novelist', 'neighbor', 'servant'],
      ['obstinate', 'stubborn', 'flexible', 'obvious', 'cheerful', 'fragile'],
      ['pragmatic', 'practical', 'idealistic', 'talkative', 'pretty', 'ancient'],
      ['resilient', 'able to recover', 'brittle', 'stubborn', 'rare', 'silent'],
      ['scrutinize', 'examine closely', 'ignore', 'scratch', 'admire', 'scatter'],
      ['volatile', 'unstable', 'steady', 'valuable', 'invisible', 'quiet']],
    // Level 4
    [['acquiesce', 'comply', 'resist', 'inquire', 'acquire', 'complain'],
      ['cajole', 'coax', 'scold', 'cage', 'applaud', 'mock'],
      ['disparage', 'belittle', 'praise', 'separate', 'despair', 'disappear'],
      ['ebullient', 'exuberant', 'sullen', 'cautious', 'wealthy', 'clumsy'],
      ['fastidious', 'very particular', 'careless', 'speedy', 'generous', 'fearful'],
      ['garrulous', 'talkative', 'silent', 'grumpy', 'gigantic', 'gullible'],
      ['innocuous', 'harmless', 'toxic', 'hidden', 'noisy', 'essential'],
      ['laconic', 'using few words', 'wordy', 'lazy', 'cheerful', 'bitter'],
      ['magnanimous', 'generous', 'petty', 'magnetic', 'enormous', 'anxious'],
      ['nefarious', 'wicked', 'virtuous', 'nervous', 'famous', 'careless'],
      ['obfuscate', 'confuse', 'clarify', 'obey', 'decorate', 'exaggerate'],
      ['parsimonious', 'stingy', 'lavish', 'cheerful', 'pious', 'sleepy'],
      ['recalcitrant', 'uncooperative', 'obedient', 'recurring', 'cautious', 'reclusive'],
      ['sanguine', 'optimistic', 'gloomy', 'angry', 'sickly', 'secretive'],
      ['taciturn', 'uncommunicative', 'chatty', 'tactful', 'cruel', 'hasty'],
      ['venerate', 'revere', 'despise', 'ventilate', 'imitate', 'overrate']],
    // Level 5
    [['abstruse', 'hard to understand', 'obvious', 'rude', 'absent', 'abrupt'],
      ['bellicose', 'warlike', 'peaceful', 'beautiful', 'bloated', 'jovial'],
      ['capricious', 'unpredictable', 'steady', 'captive', 'generous', 'precious'],
      ['deleterious', 'harmful', 'beneficial', 'delicious', 'deliberate', 'tedious'],
      ['equivocate', 'speak evasively', 'clarify', 'equalize', 'celebrate', 'accelerate'],
      ['fatuous', 'foolish', 'sensible', 'faithful', 'fragrant', 'ferocious'],
      ['inchoate', 'undeveloped', 'finished', 'enchanted', 'noisy', 'ancient'],
      ['insipid', 'bland', 'flavorful', 'insulting', 'inspiring', 'intrepid'],
      ['lachrymose', 'tearful', 'cheerful', 'lazy', 'lucky', 'luminous'],
      ['mendacious', 'dishonest', 'truthful', 'repaired', 'mindful', 'generous'],
      ['obsequious', 'servile', 'domineering', 'obvious', 'sequential', 'outspoken'],
      ['pellucid', 'transparently clear', 'murky', 'polite', 'prickly', 'perilous'],
      ['perfidious', 'treacherous', 'loyal', 'perfect', 'perfumed', 'pious'],
      ['quixotic', 'unrealistically idealistic', 'pragmatic', 'quick', 'quiet', 'toxic'],
      ['recondite', 'obscure', 'well known', 'reconciled', 'recurring', 'relaxed'],
      ['truculent', 'aggressive', 'gentle', 'truthful', 'tired', 'transparent']],
    // Level 6
    [['apocryphal', 'of doubtful authenticity', 'verified', 'catastrophic', 'prophetic', 'ancient'],
      ['callow', 'inexperienced', 'mature', 'cold', 'callous', 'hollow'],
      ['defenestrate', 'throw out of a window', 'build a fence', 'cut down trees', 'open a shutter', 'declare war'],
      ['eleemosynary', 'charitable', 'selfish', 'elementary', 'mournful', 'poetic'],
      ['fulminate', 'protest loudly', 'whisper approval', 'shine brightly', 'fill completely', 'ferment slowly'],
      ['hirsute', 'hairy', 'bald', 'hurried', 'hoarse', 'hired'],
      ['ineffable', 'too great for words', 'describable', 'ineffective', 'unbearable', 'unavoidable'],
      ['limpid', 'clear', 'cloudy', 'limping', 'lazy', 'sticky'],
      ['mellifluous', 'sweet-sounding', 'harsh', 'many-colored', 'overflowing', 'sluggish'],
      ['nugatory', 'of no value', 'essential', 'nutritious', 'sweet', 'mandatory'],
      ['otiose', 'serving no purpose', 'useful', 'odorous', 'oily', 'ornate'],
      ['pusillanimous', 'cowardly', 'brave', 'puzzling', 'generous', 'pious'],
      ['sesquipedalian', 'using long words', 'concise', 'very tall', 'half-finished', 'centuries old'],
      ['tergiversate', 'keep changing sides', 'stay firm', 'travel widely', 'terminate', 'argue fiercely'],
      ['vituperative', 'harshly abusive', 'complimentary', 'lively', 'vegetarian', 'virtuous'],
      ['xenial', 'hospitable to guests', 'hostile', 'foreign', 'yellowish', 'ancient']],
  ];
  const VOCAB_B = [-2.2, -1.3, -0.4, 0.4, 1.2, 2.0];
  IQ.VOCAB = VOCAB;

  IQ.genVocab = function (rng, targetB, avoid) {
    avoid = avoid || new Set();
    const lv = VOCAB_B.map((b, i) => ({ i, d: Math.abs(b - targetB) })).sort((a, b) => a.d - b.d)[0].i;
    let pool = VOCAB[lv].map((w, j) => ({ w, id: `${lv}.${j}` })).filter((x) => !avoid.has(x.id));
    if (!pool.length) pool = VOCAB[lv].map((w, j) => ({ w, id: `${lv}.${j}` }));
    const pick = rng.pick(pool);
    const [word, right, ...wrong] = pick.w;
    const opts = [right].concat(wrong);
    const order = rng.shuffle([0, 1, 2, 3, 4]);
    return {
      id: pick.id, b: VOCAB_B[lv], a: 1.2, c: 0.2, timeLimit: 30,
      word, prompt: 'Which is closest in meaning to', options: order.map((i) => opts[i]), answer: order.indexOf(0),
      explain: [`“${cap(word)}” means ${right}.`],
    };
  };
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  /* ---------------------------------------------------------------
     Quantitative reasoning: templated word problems with randomised
     numbers and contexts. Distractors are the common mistakes.
     --------------------------------------------------------------- */
  const NAMES = ['Maya', 'Leo', 'Priya', 'Sam', 'Aisha', 'Noah', 'Elena', 'Omar', 'Grace', 'Ravi', 'Zoe', 'Daniel', 'Mei', 'Jonah', 'Sofia', 'Kofi'];
  const Q = [];
  const q = (id, b, f) => Q.push({ id, b, f });

  q('total', -2.2, (r) => {
    const item = r.pick([['notebook', 'notebooks'], ['coffee', 'coffees'], ['ticket', 'tickets'], ['plant', 'plants']]);
    const p = r.pick([3, 4, 6, 7, 8, 9, 12]), n = r.int(3, 9);
    const ans = p * n;
    return { text: `One ${item[0]} costs $${p}. How much do ${n} ${item[1]} cost?`, ans, fmt: '$', d: [ans + p, ans - p, p + n, ans + 10], why: `${n} × $${p} = $${ans}.` };
  });
  q('change', -1.7, (r) => {
    const a = r.int(4, 19) + r.pick([0, 0.5, 0.25, 0.75]), b = r.int(3, 15) + r.pick([0, 0.5, 0.25]);
    const pay = Math.ceil((a + b) / 10) * 10 + r.pick([0, 10]);
    const ans = +(pay - a - b).toFixed(2);
    if (ans <= 0.5) return null;
    return { text: `${r.pick(NAMES)} buys lunch for ${IQ.fmtMoney(a)} and a drink for ${IQ.fmtMoney(b)}, paying with $${pay}. How much change?`, ans, fmt: '$', d: [ans + 1, ans - 1, +(ans + 0.5).toFixed(2), +(pay - a).toFixed(2)], why: `${IQ.fmtMoney(a)} + ${IQ.fmtMoney(b)} = ${IQ.fmtMoney(a + b)}; $${pay} − ${IQ.fmtMoney(a + b)} = ${IQ.fmtMoney(ans)}.` };
  });
  q('pctof', -1.1, (r) => {
    const p = r.pick([10, 20, 25, 30, 40, 75]), n = r.pick([40, 60, 80, 120, 160, 240, 360]);
    const ans = (p * n) / 100;
    if (!Number.isInteger(ans)) return null;
    return { text: `What is ${p}% of ${n}?`, ans, fmt: '', d: [ans * 2, ans + 10, n - ans, ans / 2], why: `${p}% of ${n} = ${p}/100 × ${n} = ${ans}.` };
  });
  q('discount', -0.6, (r) => {
    const p = r.pick([15, 20, 25, 30, 35, 40]), n = r.pick([40, 60, 80, 120, 140, 160, 200]);
    const off = (p * n) / 100;
    if (!Number.isInteger(off)) return null;
    const ans = n - off;
    return { text: `A jacket normally costs $${n}. It is ${p}% off. What is the sale price?`, ans, fmt: '$', d: [off, n - p, ans - 10, ans + 5], why: `${p}% of $${n} is $${off}; $${n} − $${off} = $${ans}.` };
  });
  q('speed', -0.3, (r) => {
    const v = r.pick([40, 45, 60, 72, 80, 90]), t = r.pick([2, 3, 4]), t2 = r.pick([1.5, 2.5, 5, 6, 0.5]);
    const ans = v * t2;
    if (!Number.isInteger(ans)) return null;
    return { text: `A train travels ${v * t} km in ${t} hours. At the same speed, how far does it travel in ${t2} hours?`, ans, fmt: ' km', d: [v * t + v, v * t2 * t, ans + v / 2, Math.round((v * t) / t2)], why: `Speed = ${v * t} ÷ ${t} = ${v} km per hour; ${v} × ${t2} = ${ans} km.` };
  });
  q('ratio', 0.1, (r) => {
    const a = r.int(1, 4), b = r.int(a + 1, 7), unit = r.pick([10, 12, 15, 20, 25, 30]);
    const tot = (a + b) * unit;
    const ans = a * unit;
    const nm = r.shuffle(NAMES).slice(0, 2);
    return { text: `${nm[0]} and ${nm[1]} share $${tot} in the ratio ${a}:${b}. How much does ${nm[0]} get?`, ans, fmt: '$', d: [b * unit, tot / 2, Math.round(tot / a), tot - a * b], why: `${a} + ${b} = ${a + b} parts, so one part is $${tot} ÷ ${a + b} = $${unit}. ${nm[0]} gets ${a} × $${unit} = $${ans}.` };
  });
  q('average', 0.4, (r) => {
    const A = r.int(70, 82), B = A + r.pick([2, 3, 4]);
    const ans = 5 * B - 4 * A;
    if (ans > 100) return null;
    return { text: `${r.pick(NAMES)} has an average of ${A} on 4 tests. What score on the 5th test raises the average to exactly ${B}?`, ans, fmt: '', d: [B, B + (B - A), ans - 4, 2 * B - A], why: `New total needed: 5 × ${B} = ${5 * B}. Current total: 4 × ${A} = ${4 * A}. ${5 * B} − ${4 * A} = ${ans}.` };
  });
  q('meet', 0.6, (r) => {
    const v1 = r.pick([40, 50, 60, 70]), v2 = r.pick([50, 60, 80, 90]), t = r.pick([1.5, 2, 2.5, 3]);
    const d = (v1 + v2) * t;
    if (!Number.isInteger(d)) return null;
    return { text: `Two cars start ${d} km apart and drive toward each other, one at ${v1} km/h and one at ${v2} km/h. How many hours until they meet?`, ans: t, fmt: ' h', d: [t * 2, +(d / v2).toFixed(1), +(t + 0.5).toFixed(1), +(d / (v2 - v1 || 10)).toFixed(1)], why: `They close the gap at ${v1} + ${v2} = ${v1 + v2} km/h; ${d} ÷ ${v1 + v2} = ${t} hours.` };
  });
  q('work', 0.9, (r) => {
    const pr = r.pick([[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [20, 30], [6, 3]]);
    const ans = (pr[0] * pr[1]) / (pr[0] + pr[1]);
    return { text: `One pump fills a tank in ${pr[0]} hours; another fills it in ${pr[1]} hours. Working together, how many hours do they take?`, ans, fmt: ' h', d: [(pr[0] + pr[1]) / 2, pr[0] + pr[1], Math.abs(pr[1] - pr[0]), Math.min(...pr) / 2], why: `Together they fill 1/${pr[0]} + 1/${pr[1]} = 1/${ans} of the tank per hour, so ${ans} hours.` };
  });
  q('revpct', 1.1, (r) => {
    const p = r.pick([20, 25, 50]), orig = r.pick([40, 60, 80, 120, 160, 200]);
    const now = orig * (1 + p / 100);
    if (!Number.isInteger(now)) return null;
    return { text: `After a ${p}% price increase, a lamp costs $${now}. What did it cost before the increase?`, ans: orig, fmt: '$', d: [Math.round(now * (1 - p / 100)), now - p, Math.round(now / (1 + p / 100) + 5), now], why: `New price = old × ${1 + p / 100}. Old = $${now} ÷ ${1 + p / 100} = $${orig}. (Taking ${p}% off $${now} gives the wrong answer.)` };
  });
  q('updown', 1.3, (r) => {
    const p = r.pick([10, 20, 30, 40, 50]);
    const net = -(p * p) / 100;
    const show = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x) + '%';
    return { text: `A price goes up ${p}%, then the new price goes down ${p}%. What is the overall change?`, ans: show(net), raw: true, opts: [show(net), '0%', show(-net), show(-p / 2), show(-p)], why: `Up ${p}% multiplies by ${1 + p / 100}; down ${p}% multiplies by ${1 - p / 100}. ${1 + p / 100} × ${1 - p / 100} = ${(1 - (p * p) / 10000).toFixed(2)}, a change of ${show(net)}.` };
  });
  q('ages', 1.6, (r) => {
    const cfg = r.pick([[3, 2], [4, 3], [5, 3], [4, 2]]);
    const [k, m] = cfg;
    const n = r.pick([2, 3, 4, 5, 6]);
    const B = (n * (m - 1)) / (k - m);
    if (!Number.isInteger(B) || B < 3 || B > 30) return null;
    const nm = r.shuffle(NAMES).slice(0, 2);
    return { text: `${nm[0]} is ${k} times as old as ${nm[1]}. In ${n} years, ${nm[0]} will be ${m} times as old as ${nm[1]}. How old is ${nm[1]} now?`, ans: B, fmt: '', d: [B + n, k * B, B * 2, n], why: `Let ${nm[1]} be x. Then ${k}x + ${n} = ${m}(x + ${n}), so ${k - m}x = ${n * (m - 1)} and x = ${B}. Check: ${k * B} + ${n} = ${k * B + n} and ${m} × ${B + n} = ${m * (B + n)}.` };
  });
  q('mixture', 1.9, (r) => {
    const cfg = r.pick([[10, 20, 2, 3], [20, 50, 2, 1], [10, 30, 3, 1], [15, 45, 1, 2], [20, 60, 3, 1]]);
    const [a, b, x, y] = cfg;
    const ans = (a * x + b * y) / (x + y);
    if (!Number.isInteger(ans)) return null;
    return { text: `You mix ${x} litres of a ${a}% juice drink with ${y} litres of a ${b}% juice drink. What percent juice is the mix?`, ans: ans + '%', raw: true, opts: [ans + '%', (a + b) / 2 + '%', a + b + '%', ans + 3 + '%', ans - 4 + '%'], why: `Juice: ${x} × ${a}% + ${y} × ${b}% = ${(a * x + b * y) / 100} litres in ${x + y} litres = ${ans}%.` };
  });
  q('dilute', 2.2, (r) => {
    const cfg = r.pick([[10, 40, 20], [12, 50, 30], [20, 30, 20], [6, 50, 30], [8, 25, 20]]);
    const [L, p1, p2] = cfg;
    const total = (L * p1) / p2;
    const ans = total - L;
    if (!Number.isInteger(ans) || ans <= 0) return null;
    return { text: `A ${L}-litre tank of cleaner is ${p1}% concentrate. How many litres of water must be added to make it ${p2}% concentrate?`, ans, fmt: ' L', d: [p1 - p2, total, Math.round(L * (p1 - p2) / 100), ans * 2], why: `Concentrate stays at ${(L * p1) / 100} L. For that to be ${p2}%, the total must be ${(L * p1) / 100} ÷ ${p2 / 100} = ${total} L, so add ${ans} L of water.` };
  });

  function fmtVal(v, f) {
    if (f === '$') return IQ.fmtMoney(v);
    const s = Number.isInteger(v) ? String(v) : String(+v.toFixed(2));
    return s + (f || '');
  }

  IQ.genQuant = function (rng, targetB) {
    const pool0 = Q.filter((x) => Math.abs(x.b - targetB) <= 0.4);
    const pool = pool0.length ? pool0 : Q.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB)).slice(0, 2);
    for (let t = 0; t < 80; t++) {
      const T = rng.pick(pool);
      const g = T.f(rng);
      if (!g) continue;
      let opts;
      if (g.raw) opts = g.opts;
      else {
        const vals = [g.ans];
        for (const d of g.d) if (d > 0 && !vals.some((v) => Math.abs(v - d) < 1e-9)) vals.push(d);
        // fill if any distractors collided
        let k = 1;
        while (vals.length < 5 && k < 20) { const c = g.ans + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Number.isInteger(g.ans) ? 1 : 0.5); if (c > 0 && !vals.includes(c)) vals.push(c); k++; }
        opts = vals.slice(0, 5).map((v) => fmtVal(v, g.fmt));
      }
      if (new Set(opts).size !== 5) continue;
      const order = rng.shuffle([0, 1, 2, 3, 4]);
      return {
        id: T.id, b: T.b, a: 1.2, c: 0.2, timeLimit: 90,
        text: g.text, options: order.map((i) => opts[i]), answer: order.indexOf(0), explain: [g.why],
      };
    }
    throw new Error('quant generation failed');
  };

  /* ---------------------------------------------------------------
     Reflection questions: each has an intuitive lure. Numbers and
     contexts are randomised so the famous versions aren't memorised.
     b values are speculative calibrations (classic bat-and-ball is
     missed by a majority of adults in published studies).
     --------------------------------------------------------------- */
  const CR = [];
  const cr = (id, b, f) => CR.push({ id, b, f });
  cr('batball', 0.9, (r) => {
    const pair = r.pick([['notebook', 'pen'], ['sandwich', 'cookie'], ['racket', 'ball'], ['book', 'bookmark']]);
    const small = r.pick([5, 10, 15, 20, 25]), diff = r.pick([100, 200, 50]);
    const tot = 2 * small + diff;
    const c = (x) => (x < 100 ? `${x}¢` : IQ.fmtMoney(x / 100));
    return { text: `A ${pair[0]} and a ${pair[1]} cost ${c(tot)} in total. The ${pair[0]} costs ${c(diff)} more than the ${pair[1]}. How much does the ${pair[1]} cost?`, opts: [c(small), c(tot - diff), c(small + diff), c(Math.round(small / 2))], why: `If the ${pair[1]} costs ${c(small)}, the ${pair[0]} costs ${c(small + diff)}, and together that is ${c(tot)}. The tempting answer, ${c(tot - diff)}, would make the total ${c(2 * (tot - diff) + diff)}.` };
  });
  cr('machines', 0.4, (r) => {
    const ctx = r.pick([['chefs', 'pizzas'], ['printers', 'posters'], ['machines', 'widgets'], ['bakers', 'cakes']]);
    const n = r.pick([3, 4, 5, 6]), t = r.pick([n, 10, 12, 15]), m = r.pick([60, 100, 20, 30].filter((x) => x !== n));
    return { text: `If ${n} ${ctx[0]} take ${t} minutes to make ${n} ${ctx[1]}, how long would ${m} ${ctx[0]} take to make ${m} ${ctx[1]}?`, opts: [`${t} minutes`, `${Math.round((t * m) / n)} minutes`, `${m} minutes`, `${Math.max(1, Math.round(t / 2))} minutes`].filter((v, i, a) => a.indexOf(v) === i), why: `Each one makes one item in ${t} minutes, working at the same time. More of them working together still take ${t} minutes.` };
  });
  cr('lily', 0.3, (r) => {
    const N = r.pick([24, 32, 36, 40, 48]), frac = r.pick([['half', 1], ['a quarter', 2]]);
    const thing = r.pick(['A patch of algae on a pond', 'A patch of lily pads', 'Mould on a loaf of bread']);
    const what = thing.includes('bread') ? 'the loaf' : 'the pond';
    return { text: `${thing} doubles in size every day. It takes ${N} days to cover ${what}. How many days does it take to cover ${frac[0]} of ${what}?`, opts: [`${N - frac[1]} days`, `${frac[1] === 1 ? N / 2 : N / 4} days`, `${N - 1 - frac[1] * 2} days`, `${frac[1] === 1 ? N / 2 + 1 : N / 2} days`].filter((v, i, a) => a.indexOf(v) === i), why: `Work backwards: one day before it is full it is half covered${frac[1] === 2 ? ', and two days before it is a quarter covered' : ''}. So ${N - frac[1]} days.` };
  });
  cr('race', -0.3, (r) => {
    const p = r.pick([2, 3, 5]);
    const ord = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    return { text: `In a race, you overtake the runner in ${ord(p)} place. What place are you in now?`, opts: [ord(p), ord(p - 1), ord(p + 1), 'Last'], why: `You take their position: ${ord(p)}. The runner ahead of them is still ahead of you.` };
  });
  cr('daughters', -0.5, (r) => {
    const set = r.pick([['April', 'May', 'June'], ['Penny', 'Nickel', 'Dime'], ['Monday', 'Tuesday', 'Wednesday']]);
    const nm = r.pick(['Emily', 'Hannah', 'Chloe', 'Ruby']);
    return { text: `${nm}'s mother has three daughters. Two of them are named ${set[0]} and ${set[1]}. What is the name of the third daughter?`, opts: [nm, set[2], 'Not enough information', 'Julia'], why: `The question tells you: the mother is ${nm}'s mother, so ${nm} is the third daughter.` };
  });
  cr('sheep', -0.9, (r) => {
    const n = r.int(12, 19), k = r.int(4, 9);
    return { text: `A farmer had ${n} sheep. All but ${k} ran away. How many sheep are left?`, opts: [String(k), String(n - k), String(n), '0'], why: `"All but ${k}" means ${k} did not run away.` };
  });
  cr('stock', 0.7, (r) => {
    const a = r.pick([40, 50, 60]), st = 10;
    return { text: `You buy a painting for $${a}, sell it for $${a + st}, buy it back for $${a + 2 * st}, and sell it again for $${a + 3 * st}. How much money did you make overall?`, opts: [`$${2 * st}`, `$${st}`, `$${3 * st}`, '$0'], why: `Money in: $${a} + $${a + 2 * st} = $${2 * a + 2 * st}. Money out: $${a + st} + $${a + 3 * st} = $${2 * a + 4 * st}. Profit = $${2 * st}.` };
  });
  cr('avgspeed', 1.2, (r) => {
    const pr = r.pick([[60, 40, 48], [30, 60, 40], [20, 30, 24], [45, 90, 60], [36, 45, 40]]);
    return { text: `You drive to a town at ${pr[0]} km/h and return along the same road at ${pr[1]} km/h. What is your average speed for the whole trip?`, opts: [`${pr[2]} km/h`, `${(pr[0] + pr[1]) / 2} km/h`, `${Math.max(pr[0], pr[1])} km/h`, `${pr[0] + pr[1]} km/h`], why: `You spend longer at the slower speed, so the average is below the midpoint. For a distance d each way: total time = d/${pr[0]} + d/${pr[1]}; average = 2d ÷ total time = ${pr[2]} km/h.` };
  });
  cr('socks', 0.5, (r) => {
    const b = r.int(8, 14), w = r.int(6, 12);
    return { text: `A drawer has ${b} black socks and ${w} white socks. In the dark, how many socks must you take out to be sure you have a matching pair?`, opts: ['3', '2', String(b + 1), String(w + 1)].filter((v, i, a) => a.indexOf(v) === i), why: `With only two colours, any 3 socks must include two of the same colour.` };
  });
  cr('coin', -0.1, (r) => {
    const n = r.int(4, 7);
    return { text: `A fair coin lands heads ${n} times in a row. What is the chance it lands heads on the next toss?`, opts: ['1 in 2', 'Less than 1 in 2', 'More than 1 in 2', `1 in ${2 ** (n + 1)}`], why: `A fair coin has no memory: every toss is 1 in 2.` };
  });
  cr('hole', 0.0, (r) => {
    const s = r.pick([2, 3, 4]);
    return { text: `How much soil is in a hole that is ${s} m wide, ${s} m long and ${s} m deep?`, opts: ['None', `${s ** 3} cubic metres`, `${s * 3} cubic metres`, `${s ** 2} cubic metres`], why: `It's a hole: the soil has been dug out.` };
  });
  cr('updown', 1.0, (r) => {
    const p = r.pick([20, 50]);
    return { text: `A shop raises a price by ${p}% and later lowers the new price by ${p}%. Compared with the original, the final price is:`, opts: ['Lower', 'The same', 'Higher', 'It depends on the price'], why: `The ${p}% cut is taken from a bigger number, so it removes more than the rise added. Overall it is ${100 - (100 + p) * (1 - p / 100)}% lower.` };
  });

  IQ.genReflect = function (rng, targetB, avoid) {
    avoid = avoid || new Set();
    const sorted = CR.slice().sort((a, b) => Math.abs(a.b - targetB) - Math.abs(b.b - targetB));
    const fresh = sorted.filter((x) => !avoid.has(x.id));
    const pool = (fresh.length ? fresh : sorted).slice(0, 3);
    for (let t = 0; t < 40; t++) {
      const T = rng.pick(pool);
      const g = T.f(rng);
      if (!g || g.opts.length < 4 || new Set(g.opts).size !== g.opts.length) continue;
      const order = rng.shuffle([0, 1, 2, 3]);
      return { id: T.id, b: T.b, a: 0.9, c: 0.25, timeLimit: 75, text: g.text, options: order.map((i) => g.opts[i]), answer: order.indexOf(0), explain: [g.why] };
    }
    throw new Error('reflect generation failed');
  };
})();
