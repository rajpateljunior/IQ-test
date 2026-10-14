#!/usr/bin/env python3
"""Stamp a new build name everywhere it must match, so installed copies update.
Usage: python3 tools/release.py 2026.10.15a
Updates: js/update.js (IQ.BUILD), version.json, sw.js (CACHE), index.html (?v= tags).
Remember to edit IQ.WHATS_NEW in js/update.js too."""
import re, sys, json, os
root = os.path.join(os.path.dirname(__file__), '..')
b = sys.argv[1]
assert re.fullmatch(r'[0-9A-Za-z.\-]+', b), 'build name: letters, digits, dots, dashes'
def sub(path, pat, rep, count=1):
    p = os.path.join(root, path); s = open(p).read()
    s2, n = re.subn(pat, rep, s)
    assert n >= count, f'{path}: pattern not found'
    open(p, 'w').write(s2)
sub('js/update.js', r"IQ\.BUILD = '[^']*'", f"IQ.BUILD = '{b}'")
sub('sw.js', r"const CACHE = 'iqtest-[^']*'", f"const CACHE = 'iqtest-{b}'")
sub('index.html', r'\?v=[0-9A-Za-z.\-]+"', f'?v={b}"', 2)
open(os.path.join(root, 'version.json'), 'w').write(json.dumps({'build': b}) + '\n')
print('Stamped build', b)
