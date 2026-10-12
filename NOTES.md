# IQ Test — NOTES

Durable memory for this game. Read before editing.

## What it is
An adult (18–60) IQ-style cognitive assessment PWA: serious test with a game feel. Clean, clinical look with colour. Plays on iPhone, iPad and desktop, fully offline, installable to the Home Screen.
Live: https://rajpateljunior.github.io/iq-test/ · Repo: `rajpateljunior/iq-test`

## Design decisions (Raj)
- Name: **IQ Test**. (Lumen rejected.)
- 8 ability domains, all included: Fluid Reasoning (FR), Visual-Spatial (VS), Working Memory (WM), Quantitative (QR), Processing Speed (PS), Learning & Memory (LM), Reflective Reasoning / "tricks" (CR), Verbal Knowledge (VK).
- Two core tests: **Quick Test** (5–10 min, one subtest per domain, live) and **Full Test** (15–20 min, ~16 subtests, two per domain, Phase 2, shown as "Coming soon").
- Every subtopic (37 subtests) eventually exists as a Gym mini-game. Built in phases.
- Results feel official ("Cognitive Profile Report", Full-Scale Estimate, index scores, 90% range, percentile, classification). One line under the score: "Estimated score, not clinically normed. See How It Works." Full explanation on the How it works tab.
- Verbal Knowledge is reported separately, outside the Full-Scale Estimate.
- Speed (PS) and Reflection (CR) are low-weight in the composite.
- Answer explanations only in the Gym, never after official tests.
- Replay hooks: Daily Challenge with streaks, friend challenge links (score + radar overlay), Gym levels/XP/ranks, practice streak, badges.
- 5 colour themes (Navy default, Graphite, Forest, Plum, Ember) × Auto/Light/Dark. Domain colours fixed across themes. Settings screen.
- A kids' version may come later as a separate game with its own scale.

## Architecture
No build step. `index.html` loads plain scripts sharing the global `IQ` namespace (split into files because the app is ~3,500 lines; easier for future edits):
- `js/core.js` — seeded RNG, IRT scoring (`IQ.posterior`, `IQ.indexScore`, `IQ.compositeScore`, `IQ.nextB`), save data + save codes, WebAudio sounds, themes, glyph generator, test hooks (`IQ.debug`, `IQ.TIME_SCALE`).
- `js/gen-matrix.js` — matrix puzzles + shape series + shared cell renderer. `js/gen-series.js` — number/letter series. `js/gen-rotation.js` — 2D/3D mental rotation. `js/gen-verbal.js` — vocabulary bank, quant word problems, reflection questions.
- `js/tasks.js` — interactive tasks: Digit Span, Corsi Blocks, Symbol Coding, Paired Associates.
- `js/subtests.js` — registry (`IQ.SUBTESTS`, `IQ.BY_DOMAIN`, quick-test order, icons). **Add Phase 2 subtests here.**
- `js/ui.js` — all screens and flows (home, test runner, results, daily, challenge, gym, progress, about, settings). `js/app.js` — boot, challenge links, SW registration.
- `styles.css` — theme tokens at top (`html[data-theme][data-mode]`), then components, then responsive rules (phone landscape puts question left, answers right).
- `sw.js` cache-first; **bump `CACHE` every release** and add any new file to `ASSETS`.
- Fonts: system font stack (SF Pro on Apple devices), so nothing to host and it works offline.

## Scoring model (speculative calibration, not normed)
- Each generated item has difficulty `b` on an adult ability scale (mean 0, SD 1), discrimination `a`, guessing `c = 1/options`. 3PL IRT, EAP with N(0,1) prior on a grid.
- Adaptive: first item at b = −0.8 (daily −0.4), then current estimate + 0.15 (`IQ.nextB`). Spans adapt length (max ±2 per step).
- Index score = 100 + 15 × EAP / sqrt(1 − postVar) (rescaled so population SD = 15). 90% range around the estimated true score.
- Full-Scale Estimate: joint posterior of correlated domains (ρ = 0.5), weights FR 1.5, VS 1, WM 1, QR 1, LM 0.75, PS 0.5, CR 0.5; VK excluded. Scores clamped 55–145.
- Difficulty sources: matrix rule count/type (Carpenter, Just & Shell 1990 — well-established direction, our numbers are our own), series family, rotation level, vocab rarity tiers, quant template. Approximate adult norms in tasks.js: forward span 6.6 (SD 1.2), backward 4.9 (1.3), Corsi 5.7 (1.1), coding 40 net/min (SD 9, touch-screen guess — speculative).
- Simulation (`tests/score_sim.js`, 3,000 simulated adults under the same model): FSE mean ≈ 101, SD ≈ 14.8, r = 0.94 with true ability, 90% range covers truth ≈ 92%. This validates the maths, **not** real-world accuracy.

## Data tables
- Matrix rule weights/catalogue: `gen-matrix.js` (`RULE_W`, `CATALOG`). Shape series: `SS_RULES`.
- Series families and b: `gen-series.js` (`FAM`, `LET`).
- Rotation levels: `gen-rotation.js` (`LEVELS`).
- Vocabulary: `gen-verbal.js` `VOCAB` (6 levels × 16 words; `VOCAB_B`). Quant templates `Q`, reflection templates `CR`.
- Gym: level L → b = −2.5 + 0.5(L−1); spans/Corsi/pairs add length per level; coding goal 18 + 3L in 60 s. Clear = ≥ 2/3 correct.
- Badges and ranks: top of `ui.js`.

## Save format (version 1)
localStorage key `iqtest.v1`. Save code = `IQT1-` + base64url(JSON). Fields: `settings{theme,mode,sound,name}`, `history[]` (≤100 records: id, ts, mode, seed, subs, fse{score,lo,hi,theta,sd}, idx{domain: score,lo,hi,subs,correct,total,log}, vs), `gym{id:{lvl,best,xp,plays}}`, `daily{last,streak,bestStreak,log{date:{score,subs,idx}}}`, `practice{last,streak,bestStreak}`, `seen{}`, `vocabSeen[]`, `badges{}`, `stats{tests,sent,wins}`.
Loading deep-merges onto defaults, so new optional fields are backward compatible. Never rename/remove fields; bump `SAVE_VERSION` only for breaking changes and migrate in `normalizeState`.
Challenge link: `#ch=` + base64url `{v:1, s:seed, n:name, subs, f:fse, i:{domain:score}}`.

## Tests (run before every push)
- `node tests/gen_check.js` — 3,000+ items per generator: unique, unambiguous answers (every plausible rule checked), deterministic seeds, save-code round trip.
- `node tests/score_sim.js` — scoring calibration.
- `python3 -m http.server 8765 --bind 127.0.0.1` then `python3 tests/e2e.py` — bot plays full tests at iPhone/iPhone SE/iPad portrait+landscape/desktop, every Gym skill at L1 and L10, daily, challenge round trip, save import, all 10 theme contrast checks, offline reload.
- `python3 tests/make_icons.py` regenerates icons (design: glowing lightbulb with "IQ" inside, on deep blue; changed 2026-10-12 from the dot-matrix "?" icon).

## Known issues / untested
- **Untested on a real device:** iPhone feel, iOS audio, Home Screen install, offline on iOS, landscape safe areas, share sheet.
- Timed parts keep running if the app is backgrounded mid-question (Symbol Coding pauses; others don't). A test in progress is lost if iOS closes the app.
- Score scale is modelled, not normed. Speed norms are a guess for touch screens.
- Adaptive tests mean friends see the same puzzles only while they answer the same way.
- Vocabulary bank is finite (96 words); repeats after heavy use.

## Ideas / Phase 2
- Full Test (16 parts) with two subtests per domain.
- Remaining 27 subtests: odd-one-out, analogies, syllogisms, figure weights, rule discovery (WCST), Tower of London; block design, paper folding, hidden figures, assembly, cube counting; letter-number sequencing, n-back, mental arithmetic span; symbol search, cancellation, trail making, reaction time, Stroop; similarities, general knowledge, comprehension; estimation/number sense; story recall; insight riddles, remote associates, Wonderlic-style mixed speed round.
- Optional spoken digits for Digit Span; per-item review after tests (opt-in, marked as affecting retest accuracy).
