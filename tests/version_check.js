// Fails if the build name differs between update.js, version.json, sw.js and index.html,
// or if index.html loads a file the service worker doesn't cache. Run: node tests/version_check.js
const fs = require('fs'), path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const b = R('js/update.js').match(/IQ\.BUILD = '([^']+)'/)[1];
const errs = [];
if (JSON.parse(R('version.json')).build !== b) errs.push('version.json');
if (!R('sw.js').includes(`const CACHE = 'iqtest-${b}'`)) errs.push('sw.js CACHE');
const html = R('index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))(\?v=([^"]+))?"/g)];
refs.forEach((m) => { if (m[3] !== b) errs.push('index.html ?v on ' + m[1]); });
const sw = R('sw.js');
refs.forEach((m) => { if (!sw.includes(`'./${m[1]}'`)) errs.push('sw.js ASSETS missing ' + m[1]); });
if (errs.length) { console.log('VERSION MISMATCH (build ' + b + '):', errs.join(', ')); process.exit(1); }
console.log('version check ok:', b, '·', refs.length, 'files');
