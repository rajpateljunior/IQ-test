"""Render the app icons from inline SVG with headless Chromium. Run: python3 tests/make_icons.py
Design: glowing lightbulb with "IQ" inside, on the app's deep-blue background."""
from playwright.sync_api import sync_playwright
import math
import os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'icons')

def svg(pad):
    # pad = fraction of canvas kept clear around the motif (maskable needs ~0.25)
    # Motif is drawn in a 400x400 box centred on (256,256), then scaled to fit the safe zone.
    scale = (1 - 2 * pad) * 512 / 400
    cx, cy = 256, 232  # bulb centre
    rays = []
    for ang in range(-180, 1, 30):  # upper half-circle of rays
        a = math.radians(ang)
        x1, y1 = cx + 146 * math.cos(a), cy + 146 * math.sin(a)
        x2, y2 = cx + 180 * math.cos(a), cy + 180 * math.sin(a)
        rays.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>
<radialGradient id="bg" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#2a4fae"/><stop offset=".55" stop-color="#13265a"/><stop offset="1" stop-color="#0a1224"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd86b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd86b" stop-opacity="0"/></radialGradient>
<linearGradient id="bulb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset="1" stop-color="#ffb02e"/></linearGradient>
</defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g transform="translate(256 256) scale({scale:.4f}) translate(-256 -256)">
<circle cx="{cx}" cy="{cy}" r="200" fill="url(#glow)"/>
<g stroke="#ffd86b" stroke-width="14" stroke-linecap="round" fill="none">{''.join(rays)}</g>
<g fill="url(#bulb)">
<circle cx="{cx}" cy="{cy}" r="120"/>
<polygon points="204,318 308,318 294,376 218,376"/>
</g>
<g fill="#9db8ff">
<rect x="212" y="376" width="88" height="18" rx="9"/>
<rect x="222" y="398" width="68" height="18" rx="9"/>
<rect x="238" y="420" width="36" height="14" rx="7"/>
</g>
<text x="{cx}" y="{cy + 44}" font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" font-weight="900" font-size="132" letter-spacing="-4" fill="#0a1224" text-anchor="middle">IQ</text>
</g>
</svg>'''

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, pad in [('icon-512-v2.png', 512, .12), ('icon-192-v2.png', 192, .12), ('apple-touch-icon-v2.png', 180, .12), ('icon-maskable-512-v2.png', 512, .22)]:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(f'<html><body style="margin:0;background:#0a1224">{svg(pad).replace("width=\"512\" height=\"512\" viewBox", f"width=\"{size}\" height=\"{size}\" viewBox", 1)}</body></html>')
        pg.screenshot(path=os.path.join(ROOT, name), omit_background=False)
        pg.close()
    b.close()
print('icons written')
