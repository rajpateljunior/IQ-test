"""
End-to-end tests for IQ Test (Playwright + Chromium).
Serve the repo first:  python3 -m http.server 8765 --bind 127.0.0.1
Run:                   python3 tests/e2e.py [screenshot_dir]

Covers: full Quick Test with practice at iPhone/iPad sizes in portrait and
landscape, every Gym subtest with feedback, Daily Challenge, friend challenge
link round-trip, all 10 theme x mode combinations, save code export/import,
score sanity (perfect bot scores high, random bot scores low), layout overflow
checks, and offline reload through the service worker.
"""
import os, sys, json, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8765/'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'shots')
os.makedirs(OUT, exist_ok=True)
BOT = open(os.path.join(os.path.dirname(__file__), 'autoplay.js')).read()
FAIL = []
VIEWPORTS = {
    'iphone-portrait': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'iphone-landscape': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'iphoneSE-portrait': dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'ipad-portrait': dict(viewport={'width': 820, 'height': 1180}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'ipad-landscape': dict(viewport={'width': 1180, 'height': 820}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'desktop': dict(viewport={'width': 1280, 'height': 800}),
}

def fail(msg):
    print('  FAIL:', msg); FAIL.append(msg)

def open_app(browser, vp, scheme='dark', state=None, url=BASE):
    ctx = browser.new_context(color_scheme=scheme, **VIEWPORTS[vp])
    if state is not None:
        ctx.add_init_script(f"localStorage.setItem('iqtest.v1', {json.dumps(json.dumps(state))});")
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url)
    pg.wait_for_timeout(300)
    pg.evaluate(BOT)
    pg.evaluate('IQ.TIME_SCALE = 0.03')
    return ctx, pg, errs

def overflow_check(pg, label):
    """Run screen must fit: no horizontal overflow, and controls visible."""
    r = pg.evaluate('''() => {
        const b = document.querySelector('#run:not([hidden]) .runbody') || document.querySelector('#view');
        const vw = window.innerWidth;
        const wide = [...document.querySelectorAll('#run:not([hidden]) .runbody *, #view *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; }).map(e => e.className).slice(0, 3);
        const scroll = b ? b.scrollHeight - b.clientHeight : 0;
        return { wide, scroll, vw };
    }''')
    if r['wide']:
        fail(f'{label}: horizontal overflow {r["wide"]}')
    return r

def play(pg, acc=1.0, practice=False, shots=None, vp='', limit=4000, check_fit=True):
    seen = set()
    for _ in range(limit):
        st = pg.evaluate('__peek()')
        if st['kind'] == 'view':
            return True
        key = st['kind'] + '|' + st.get('lay', '') + '|' + st.get('sub', '')
        if key not in seen:
            seen.add(key)
            if st['kind'] in ('mc', 'span-input', 'corsi-input', 'coding-run', 'paired-recall', 'paired-study', 'subintro', 'testintro', 'feedback', 'gymsum'):
                if check_fit:
                    r = overflow_check(pg, f'{vp} {key}')
                    # actionable controls must be reachable without scrolling in test mode (except feedback which scrolls)
                    if st['kind'] == 'mc' and r['scroll'] > 4:
                        fail(f'{vp} {key}: needs {r["scroll"]}px of scrolling to reach Confirm')
                if shots:
                    name = f"{shots}-{st['kind']}-{st.get('lay','').replace(' ','_')}-{st.get('sub','').replace(' ','_')}.png"
                    pg.screenshot(path=os.path.join(OUT, name))
        pg.evaluate(f'__step({acc}, {str(practice).lower()})')
        pg.wait_for_timeout(25)
    fail(f'{vp}: playthrough did not finish')
    return False

def view_shot(pg, name, nav=None, arg=None):
    if nav:
        pg.evaluate(f'IQ.ui.go({json.dumps(nav)}{", " + json.dumps(arg) if arg is not None else ""})')
        pg.wait_for_timeout(150)
    overflow_check(pg, name)
    pg.screenshot(path=os.path.join(OUT, name + '.png'), full_page=True)

with sync_playwright() as p:
    br = p.chromium.launch()

    # 1. Full Quick Test with practice, every viewport
    for vp in VIEWPORTS:
        t0 = time.time()
        ctx, pg, errs = open_app(br, vp)
        pg.click('[data-act="quick"]')
        ok = play(pg, acc=1.0, practice=True, shots=f'qt-{vp}', vp=vp)
        rec = pg.evaluate('IQ.state.history.slice(-1)[0]')
        if not rec:
            fail(f'{vp}: no result saved')
        else:
            if rec['fse']['score'] < 125:
                fail(f'{vp}: perfect bot only scored {rec["fse"]["score"]}')
            if len(rec['idx']) != 8:
                fail(f'{vp}: expected 8 indices, got {list(rec["idx"].keys())}')
            print(f'{vp}: quick test done in {time.time()-t0:.1f}s, perfect bot FSE {rec["fse"]["score"]} ({rec["fse"]["lo"]}-{rec["fse"]["hi"]}), subs {rec["subs"]}')
        view_shot(pg, f'result-{vp}')
        if errs: fail(f'{vp}: console errors {errs[:3]}')
        ctx.close()

    # 2. Score sanity: random-guessing bot should land low
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    scores = []
    for i in range(3):
        pg.evaluate('IQ.ui.go("home")')
        pg.click('[data-act="quick"]')
        play(pg, acc=0.0, check_fit=False)
        scores.append(pg.evaluate('IQ.state.history.slice(-1)[0].fse.score'))
    print('always-wrong bot FSE:', scores)
    if max(scores) > 80: fail(f'always-wrong bot scored too high: {scores}')
    pg.evaluate('IQ.ui.go("home")')
    pg.click('[data-act="quick"]')
    play(pg, acc=0.6, check_fit=False)
    mid = pg.evaluate('IQ.state.history.slice(-1)[0].fse.score')
    print('60%-accuracy bot FSE:', mid)
    ctx.close()

    # 3. Every Gym subtest with feedback (portrait + landscape)
    for vp in ['iphone-portrait', 'iphone-landscape', 'ipad-landscape']:
        ctx, pg, errs = open_app(br, vp)
        subs = pg.evaluate('IQ.GYM_ORDER')
        for sid in subs:
            for lvl in ([1, 10] if vp == 'iphone-portrait' else [3]):
                pg.evaluate(f'void IQ.ui.startGym("{sid}", {lvl})')
                pg.wait_for_timeout(50)
                # stop at the summary to screenshot it, then go back
                seen_sum = False
                for _ in range(3000):
                    st = pg.evaluate('__peek()')
                    if st['kind'] == 'gymsum' and not seen_sum:
                        seen_sum = True
                        pg.screenshot(path=os.path.join(OUT, f'gym-{vp}-{sid}-L{lvl}-summary.png'))
                    if st['kind'] == 'view': break
                    if st['kind'] in ('mc', 'feedback', 'span-input', 'corsi-input', 'coding-run', 'paired-recall'):
                        k = f'gym-{vp}-{sid}-L{lvl}-{st["kind"]}.png'
                        if not os.path.exists(os.path.join(OUT, k)):
                            overflow_check(pg, k)
                            pg.screenshot(path=os.path.join(OUT, k))
                    pg.evaluate('__step(0.8, false)')
                    pg.wait_for_timeout(25)
                else:
                    fail(f'gym {sid} L{lvl} {vp} did not finish')
        gym = pg.evaluate('IQ.state.gym')
        if vp == 'iphone-portrait':
            played = [k for k, v in gym.items() if v['plays'] > 0]
            if len(played) != 10: fail(f'gym plays recorded only for {played}')
            print('gym records:', {k: (v['best'], v['lvl'], v['xp']) for k, v in gym.items()})
            view_shot(pg, 'gym-home-iphone', 'gym')
            view_shot(pg, 'gym-sub-iphone', 'gymsub', 'matrices')
        if errs: fail(f'gym {vp}: console errors {errs[:3]}')
        ctx.close()

    # 4. Daily challenge + streak + share text
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.click('[data-act="daily"]')
    play(pg, acc=0.9, practice=False, shots='daily', vp='daily')
    d = pg.evaluate('IQ.state.daily')
    if d['streak'] != 1 or not d['log']: fail(f'daily not recorded: {d}')
    view_shot(pg, 'daily-result')
    view_shot(pg, 'home-after-daily', 'home')
    if errs: fail(f'daily: console errors {errs[:3]}')
    # same daily puzzles for two different people
    subs1 = pg.evaluate('IQ.ui.dailySubs(IQ.today())')
    ctx.close()
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    if pg.evaluate('IQ.ui.dailySubs(IQ.today())') != subs1: fail('daily subtests differ between devices')
    ctx.close()

    # 5. Friend challenge round trip
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.evaluate("IQ.state.settings.name = 'Raj'; IQ.save()")
    pg.click('[data-act="quick"]')
    play(pg, acc=0.7, check_fit=False)
    link = pg.evaluate('IQ.ui.challengeLink(IQ.state.history.slice(-1)[0])')
    rec1 = pg.evaluate('IQ.state.history.slice(-1)[0]')
    ctx.close()
    ctx, pg, errs = open_app(br, 'iphone-portrait', url=link)
    view_shot(pg, 'challenge-landing')
    pg.click('[data-act="go"]')
    first_items = []
    play(pg, acc=1.0, check_fit=False)
    rec2 = pg.evaluate('IQ.state.history.slice(-1)[0]')
    if rec2['mode'] != 'challenge' or rec2['vs']['n'] != 'Raj' or rec2['vs']['f'] != rec1['fse']['score']:
        fail(f'challenge record wrong: {rec2.get("vs")}')
    if rec2['subs'] != rec1['subs'] or rec2['seed'] != rec1['seed']:
        fail('challenge did not reuse the same subtests/seed')
    view_shot(pg, 'challenge-result')
    print(f'challenge: Raj {rec1["fse"]["score"]} vs friend {rec2["fse"]["score"]}, wins={pg.evaluate("IQ.state.stats.wins")}')
    if errs: fail(f'challenge: console errors {errs[:3]}')

    # 6. Save code export/import
    code = pg.evaluate('IQ.exportCode()')
    n_hist = pg.evaluate('IQ.state.history.length')
    ctx.close()
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.evaluate(f'IQ.state = IQ.importCode({json.dumps(code)}); IQ.save()')
    pg.reload(); pg.wait_for_timeout(300)
    if pg.evaluate('IQ.state.history.length') != n_hist: fail('save code import lost history')
    # old/partial save (missing new fields) must still load
    pg.evaluate('''localStorage.setItem('iqtest.v1', JSON.stringify({v:1, history:[], settings:{theme:'plum'}}))''')
    pg.reload(); pg.wait_for_timeout(300)
    if pg.evaluate('IQ.state.settings.mode') != 'auto' or pg.evaluate("document.documentElement.dataset.theme") != 'plum':
        fail('partial save did not merge defaults')
    try:
        pg.evaluate("IQ.importCode('garbage')")
        fail('garbage save code accepted')
    except Exception:
        pass
    ctx.close()

    # 7. Every theme x mode on home, results, an item
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.click('[data-act="quick"]')
    play(pg, acc=0.8, check_fit=False)
    rid = pg.evaluate('IQ.state.history.slice(-1)[0].id')
    for th in ['navy', 'graphite', 'forest', 'plum', 'ember']:
        for mode in ['dark', 'light']:
            pg.evaluate(f"IQ.state.settings.theme='{th}'; IQ.state.settings.mode='{mode}'; IQ.applyTheme(); IQ.ui.go('home')")
            pg.wait_for_timeout(80)
            pg.screenshot(path=os.path.join(OUT, f'theme-{th}-{mode}-home.png'))
            pg.evaluate(f"IQ.ui.go('result', '{rid}')")
            pg.wait_for_timeout(80)
            pg.screenshot(path=os.path.join(OUT, f'theme-{th}-{mode}-result.png'), full_page=True)
    view_shot(pg, 'settings', 'settings')
    view_shot(pg, 'about', 'about')
    view_shot(pg, 'progress', 'progress')
    # contrast audit of text colours against their surfaces in every combo
    low = []
    for th in ['navy', 'graphite', 'forest', 'plum', 'ember']:
        for mode in ['dark', 'light']:
            pg.evaluate(f"IQ.state.settings.theme='{th}'; IQ.state.settings.mode='{mode}'; IQ.applyTheme()")
            res = pg.evaluate('''() => {
              const cs = getComputedStyle(document.documentElement);
              const hex = (v) => { v = v.trim(); const m = v.match(/^#([0-9a-f]{6})$/i); return m ? [0,2,4].map(i => parseInt(m[1].substr(i,2),16)) : null; };
              const L = (c) => { const a = c.map(x => { x /= 255; return x <= .03928 ? x/12.92 : ((x+.055)/1.055) ** 2.4; }); return .2126*a[0] + .7152*a[1] + .0722*a[2]; };
              const cr = (a, b) => { const x = L(hex(a)), y = L(hex(b)); return (Math.max(x,y) + .05) / (Math.min(x,y) + .05); };
              const v = (n) => cs.getPropertyValue(n);
              const pairs = [['--text','--surf',4.5],['--muted','--surf',4.5],['--muted','--bg',4.5],['--on-primary','--primary',4.5],['--primary','--surf',3],
                ...['FR','VS','WM','QR','PS','LM','CR','VK'].map(d => ['--d-'+d,'--surf',3])];
              return pairs.map(([a,b,min]) => [a,b,+cr(v(a),v(b)).toFixed(2),min]).filter(x => x[2] < x[3]);
            }''')
            for r in res: low.append((th, mode) + tuple(r))
    if low:
        for l in low: fail(f'low contrast {l}')
    else:
        print('contrast audit: all 10 theme/mode combos pass')
    ctx.close()

    # 8. Offline reload via service worker
    ctx = br.new_context(**VIEWPORTS['iphone-portrait'])
    pg = ctx.new_page()
    pg.goto(BASE)
    pg.evaluate('navigator.serviceWorker.ready')
    pg.wait_for_timeout(800)
    pg.reload(); pg.wait_for_timeout(500)  # now controlled by the SW
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(800)
    ok = pg.evaluate("!!document.querySelector('[data-act=\"quick\"]') && typeof IQ !== 'undefined'")
    if not ok: fail('offline reload did not render the app')
    pg.evaluate(BOT); pg.evaluate('IQ.TIME_SCALE = 0.03')
    pg.click('[data-act="quick"]')
    if not play(pg, acc=0.8, check_fit=False): fail('offline playthrough failed')
    print('offline reload + full offline test:', 'OK' if ok else 'FAILED')
    ctx.close()
    br.close()

print('\nRESULT:', 'ALL E2E CHECKS PASSED' if not FAIL else f'{len(FAIL)} FAILURES')
sys.exit(1 if FAIL else 0)
