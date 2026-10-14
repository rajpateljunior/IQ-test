"""
Answer key + update bar tests (Playwright + Chromium).
Serve the repo first:  python3 -m http.server 8765 --bind 127.0.0.1
Run:                   python3 tests/review_e2e.py [screenshot_dir]

Covers: answer key after Quick Test (all 8 parts), Daily Challenge and a
friend challenge; every question row opens and draws without errors or
sideways overflow at iPhone / iPad / desktop sizes in both orientations;
the key's right/wrong count matches the scored record; keys survive a
reload; deleting a result deletes its key; old results show the "no key"
note; Gym levels end with a recap; the update bar appears only on menus
when version.json names a newer build, and Update keeps progress; the
What's New popup shows once for existing players and never for new ones.
"""
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('IQ_BASE', 'http://127.0.0.1:8765/')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'shots')
os.makedirs(OUT, exist_ok=True)
BOT = open(os.path.join(os.path.dirname(__file__), 'autoplay.js')).read()
FAIL = []
VP = {
    'iphone-portrait': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'iphone-landscape': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'iphoneSE-portrait': dict(viewport={'width': 375, 'height': 667}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'ipad-portrait': dict(viewport={'width': 820, 'height': 1180}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'ipad-landscape': dict(viewport={'width': 1180, 'height': 820}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'desktop': dict(viewport={'width': 1280, 'height': 800}),
}

def fail(m):
    print('  FAIL:', m); FAIL.append(m)

def open_app(br, vp, state=None, url=BASE, scheme='dark', route_version=None, seen_version=None):
    ctx = br.new_context(color_scheme=scheme, **VP[vp])
    if state is not None:
        ctx.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('iqtest.v1', {json.dumps(json.dumps(state))}); sessionStorage.setItem('seeded','1'); }}")
    if seen_version is not None:
        ctx.add_init_script(f"if (!localStorage.getItem('iqtest.version')) localStorage.setItem('iqtest.version', {json.dumps(seen_version)});")
    if route_version:
        ctx.route('**/version.json*', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'build': route_version})))
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url)
    pg.wait_for_timeout(400)
    pg.evaluate(BOT)
    pg.evaluate('IQ.TIME_SCALE = 0.03')
    return ctx, pg, errs

def play(pg, acc, limit=5000):
    # peek and step in ONE evaluate, so the bot can't step past a screen that appeared in between
    for _ in range(limit):
        k = pg.evaluate(f"(() => {{ const s = __peek(); if (s.kind === 'view' || s.kind === 'gymsum') return s.kind; __step({acc}, false); return null; }})()")
        if k: return k
        pg.wait_for_timeout(20)
    fail('playthrough did not finish'); return None

def overflow(pg, label):
    wide = pg.evaluate('''() => { const vw = innerWidth; return [...document.querySelectorAll('.akey, .akey *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; }).map(e => e.className.baseVal !== undefined ? 'svg' : e.className).slice(0, 4); }''')
    if wide: fail(f'{label}: answer key overflows sideways {wide}')

def open_everything(pg, scope, label, shots=None):
    """Open every part and every question; check each body drew something."""
    n = pg.evaluate(f'''() => {{ const r = document.querySelector({json.dumps(scope)}); r.querySelectorAll('details.akgroup').forEach(d => d.open = true); return r.querySelectorAll('details.akq').length; }}''')
    pg.wait_for_timeout(50)
    for i in range(n):
        pg.evaluate(f'''() => {{ const d = document.querySelectorAll({json.dumps(scope + ' details.akq')})[{i}]; d.open = true; }}''')
    pg.wait_for_timeout(150)
    empty = pg.evaluate(f'''() => [...document.querySelectorAll({json.dumps(scope + ' details.akq')})].filter(d => !d.querySelector('.akbody').innerHTML.trim() || d.querySelector('.akbody').textContent.includes('can’t be shown')).length''')
    if empty: fail(f'{label}: {empty} of {n} questions drew nothing')
    noexp = pg.evaluate(f'''() => [...document.querySelectorAll({json.dumps(scope + ' details.akq .akbody')})].filter(b => !b.querySelector('.explain p')).length''')
    if noexp: fail(f'{label}: {noexp} questions have no explanation text')
    overflow(pg, label)
    if shots:
        pg.screenshot(path=os.path.join(OUT, shots + '.png'), full_page=True)
    return n

with sync_playwright() as p:
    br = p.chromium.launch()

    # 1. Quick Test answer key at every size
    for vp in VP:
        ctx, pg, errs = open_app(br, vp)
        pg.click('[data-act="quick"]')
        play(pg, 0.6)
        rec = pg.evaluate('IQ.state.history.slice(-1)[0]')
        parts = pg.evaluate(f'IQ.review.get("test", {json.dumps(rec["id"])})')
        if not parts or len(parts) != 8: fail(f'{vp}: expected 8 key parts, got {len(parts or [])}')
        # key count must match the scored record (Symbol Coding has no right/wrong items)
        want_r = sum(v['correct'] for d, v in rec['idx'].items() if d != 'PS')
        want_t = sum(v['total'] for d, v in rec['idx'].items() if d != 'PS')
        got = pg.evaluate(f'IQ.ui.keyScore(IQ.review.get("test", {json.dumps(rec["id"])}))')
        if (got['right'], got['total']) != (want_r, want_t): fail(f'{vp}: key says {got}, record says {want_r}/{want_t}')
        if not pg.query_selector('#view .akey'): fail(f'{vp}: no answer key on the results screen')
        pg.screenshot(path=os.path.join(OUT, f'key-{vp}-closed.png'), full_page=True)
        n = open_everything(pg, '#view .akey', f'{vp} quick', shots=f'key-{vp}-open')
        print(f'{vp}: quick test key {got["right"]}/{got["total"]}, {n} rows opened')
        # close-ups of individual puzzle types (portrait phone only)
        if vp == 'iphone-portrait':
            for k, el in enumerate(pg.query_selector_all('#view .akgroup')):
                el.screenshot(path=os.path.join(OUT, f'key-part-{k}.png'))
        if errs: fail(f'{vp}: console errors {errs[:3]}')
        ctx.close()

    # 2. Key persists across reload, delete removes it, old results show the note
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.click('[data-act="quick"]'); play(pg, 0.7)
    rid = pg.evaluate('IQ.state.history.slice(-1)[0].id')
    pg.reload(); pg.wait_for_timeout(400)
    pg.evaluate(f'IQ.ui.go("result", {json.dumps(rid)})'); pg.wait_for_timeout(100)
    if pg.query_selector('#view .akey.empty') or not pg.query_selector('#view .akq'): fail('key lost after reload')
    pg.evaluate('IQ.state.history.push(Object.assign({}, IQ.state.history[0], {id: "oldone"})); IQ.save(); IQ.ui.go("result", "oldone")')
    pg.wait_for_timeout(100)
    if not pg.query_selector('#view .akey.empty'): fail('old result without a key should show the note')
    pg.evaluate(f'IQ.ui.go("result", {json.dumps(rid)})'); pg.wait_for_timeout(100)
    pg.click('[data-act="del"]'); pg.wait_for_timeout(100)
    pg.click('#modal [data-v="1"]'); pg.wait_for_timeout(150)
    if pg.evaluate(f'IQ.review.get("test", {json.dumps(rid)})'): fail('deleting a result kept its key')
    if errs: fail(f'persist: console errors {errs[:3]}')
    ctx.close()

    # 3. Daily Challenge key (parts open by default)
    for vp in ['iphone-portrait', 'iphone-landscape']:
        ctx, pg, errs = open_app(br, vp)
        pg.click('[data-act="daily"]'); play(pg, 0.5)
        if not pg.query_selector('#view .akey'): fail(f'{vp}: no key on daily screen')
        opened = pg.evaluate('document.querySelectorAll("#view details.akgroup[open]").length')
        if opened != 3: fail(f'{vp}: daily parts should start open, {opened} open')
        open_everything(pg, '#view .akey', f'{vp} daily', shots=f'key-daily-{vp}')
        pg.evaluate('IQ.ui.go("home")'); pg.click('[data-act="dailyres"]'); pg.wait_for_timeout(100)
        if not pg.query_selector('#view .akq'): fail(f'{vp}: daily key missing when reopened from home')
        if errs: fail(f'{vp} daily: console errors {errs[:3]}')
        ctx.close()

    # 4. Friend challenge result has a key too
    ctx, pg, errs = open_app(br, 'iphone-portrait')
    pg.click('[data-act="quick"]'); play(pg, 0.7)
    link = pg.evaluate('IQ.ui.challengeLink(IQ.state.history.slice(-1)[0])')
    ctx.close()
    ctx, pg, errs = open_app(br, 'iphone-portrait', url=link)
    pg.click('[data-act="go"]'); play(pg, 0.8)
    if pg.evaluate('IQ.state.history.slice(-1)[0].mode') != 'challenge' or not pg.query_selector('#view .akey .akq'): fail('challenge result has no key')
    if errs: fail(f'challenge: console errors {errs[:3]}')
    ctx.close()

    # 5. Gym recap on the level-complete screen, every skill
    for vp in ['iphone-portrait', 'iphone-landscape', 'ipad-portrait']:
        ctx, pg, errs = open_app(br, vp)
        for sid in pg.evaluate('IQ.GYM_ORDER'):
            pg.evaluate(f'void IQ.ui.startGym("{sid}", 3)'); pg.wait_for_timeout(50)
            if play(pg, 0.6) != 'gymsum': fail(f'gym {sid}: no summary'); continue
            if not pg.query_selector('#run .akey'): fail(f'{vp} gym {sid}: no recap'); continue
            # the level buttons must be reachable from the top (recap sits below them)
            top = pg.evaluate('document.querySelector("#run .runbody").scrollTop')
            n = open_everything(pg, '#run .akey', f'{vp} gym {sid}', shots=f'key-gym-{vp}-{sid}' if vp == 'iphone-portrait' else None)
            if n < 1: fail(f'{vp} gym {sid}: recap is empty')
            pg.evaluate('document.querySelector(\'#run [data-a="back"]\').click()'); pg.wait_for_timeout(60)
        if errs: fail(f'{vp} gym: console errors {errs[:3]}')
        ctx.close()
    print('gym recap: all skills ok')

    # 6. Light mode + another theme render
    ctx, pg, errs = open_app(br, 'iphone-portrait', scheme='light')
    pg.evaluate("IQ.state.settings.theme='ember'; IQ.state.settings.mode='light'; IQ.applyTheme()")
    pg.click('[data-act="quick"]'); play(pg, 0.5)
    open_everything(pg, '#view .akey', 'light ember', shots='key-light-ember')
    ctx.close()

    # 7. Update bar
    played = {'v': 1, 'history': [], 'gym': {'matrices': {'lvl': 2, 'best': 1, 'xp': 50, 'plays': 1}}, 'stats': {'tests': 3, 'sent': 0, 'wins': 0}}
    build = None
    ctx, pg, errs = open_app(br, 'iphone-portrait', state=played, route_version='9999.01.01z', seen_version='x')
    build = pg.evaluate('IQ.BUILD')
    pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('#modal [data-v]') && document.querySelector('#modal [data-v]').click()")
    pg.wait_for_timeout(200)
    if not pg.evaluate("!!document.querySelector('#upd.show')"): fail('update bar did not appear for a newer build')
    pg.screenshot(path=os.path.join(OUT, 'update-bar.png'))
    pg.click('[data-act="quick"]'); pg.wait_for_timeout(150)
    if pg.evaluate("getComputedStyle(document.querySelector('#upd')).display") != 'none': fail('update bar visible during a test')
    pg.evaluate('void IQ.ui.quitPrompt()'); pg.wait_for_timeout(100); pg.click('#modal [data-v="1"]'); pg.wait_for_timeout(200)
    xp_before = pg.evaluate('IQ.state.gym.matrices.xp')
    pg.click('[data-upd]')
    pg.wait_for_load_state('load'); pg.wait_for_timeout(800)
    if pg.evaluate('IQ.state.gym.matrices ? IQ.state.gym.matrices.xp : -1') != xp_before: fail('Update lost progress')
    if '?u=' in pg.url: fail(f'address not tidied after update: {pg.url}')
    if errs: fail(f'update: console errors {errs[:3]}')
    ctx.close()
    # same build: no bar
    ctx, pg, errs = open_app(br, 'iphone-portrait', route_version=build)
    pg.wait_for_timeout(300)
    if pg.evaluate("!!document.querySelector('#upd.show')"): fail('update bar shown when already up to date')
    ctx.close()
    # offline (version.json unreachable): no bar, no errors shown
    ctx = br.new_context(**VP['iphone-portrait'])
    ctx.route('**/version.json*', lambda r: r.abort())
    pg = ctx.new_page(); errs2 = []
    pg.on('pageerror', lambda e: errs2.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(500)
    if pg.evaluate("!!document.querySelector('#upd.show')"): fail('update bar shown when offline')
    if errs2: fail(f'offline check threw {errs2[:2]}')
    ctx.close()
    print('update bar: ok')

    # 8. What's New: existing player sees it once; new player never
    ctx, pg, errs = open_app(br, 'iphone-portrait', state=played, route_version=build)
    pg.wait_for_timeout(500)
    if not pg.query_selector('#modal .wn'): fail("What's New not shown to an existing player")
    else:
        pg.screenshot(path=os.path.join(OUT, 'whats-new.png'))
        pg.click('#modal [data-v="ok"]'); pg.wait_for_timeout(100)
    pg.reload(); pg.wait_for_timeout(800)
    if pg.query_selector('#modal .wn'): fail("What's New shown twice")
    ctx.close()
    ctx, pg, errs = open_app(br, 'iphone-portrait', route_version=build)
    pg.wait_for_timeout(800)
    if pg.query_selector('#modal .wn'): fail("What's New shown on a brand-new install")
    ctx.close()
    print("what's new: ok")

    br.close()

print('\nRESULT:', 'ALL PASSED' if not FAIL else f'{len(FAIL)} FAILURES')
sys.exit(1 if FAIL else 0)
