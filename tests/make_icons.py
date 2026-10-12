"""Render the app icons from inline SVG with headless Chromium. Run: python3 tests/make_icons.py"""
from playwright.sync_api import sync_playwright
import os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'icons')
def svg(pad):
    # pad = fraction of canvas kept clear around the motif (maskable needs ~0.2)
    s = 512; inner = s * (1 - 2 * pad); o = s * pad; step = inner / 3; r = step * 0.26
    dots = []
    alpha = [[1, .55, .3], [.55, 1, .55], [.3, .55, None]]
    for row in range(3):
        for col in range(3):
            cx = o + step * (col + .5); cy = o + step * (row + .5)
            a = alpha[row][col]
            if a is None:
                w = step * 0.62
                dots.append(f'<rect x="{cx-w/2:.1f}" y="{cy-w/2:.1f}" width="{w:.1f}" height="{w:.1f}" rx="{w*.22:.1f}" fill="none" stroke="#9db8ff" stroke-width="{step*.07:.1f}" stroke-dasharray="{step*.13:.1f} {step*.09:.1f}"/>')
                dots.append(f'<text x="{cx:.1f}" y="{cy+step*.15:.1f}" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="{step*.44:.1f}" fill="#9db8ff" text-anchor="middle">?</text>')
            else:
                dots.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#ffffff" fill-opacity="{a}"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#2a4fae"/><stop offset=".55" stop-color="#13265a"/><stop offset="1" stop-color="#0a1224"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#g)"/>{''.join(dots)}</svg>'''
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, pad in [('icon-512.png', 512, .17), ('icon-192.png', 192, .17), ('apple-touch-icon.png', 180, .17), ('icon-maskable-512.png', 512, .25)]:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(f'<html><body style="margin:0">{svg(pad).replace("width=\"512\" height=\"512\"", f"width=\"{size}\" height=\"{size}\"")}</body></html>')
        pg.screenshot(path=os.path.join(ROOT, name), omit_background=False)
        pg.close()
    b.close()
print('icons written')
