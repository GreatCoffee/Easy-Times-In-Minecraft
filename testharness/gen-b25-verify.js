// gen-b25-verify.js — one-shot generator: f11-b25-smoke.js -> f11-b25-verify.js
// (W-arm rename + [PIN] stamps + verdicts; DELETE after use — the B-23 convention)
'use strict';
const fs = require('fs');
const src = fs.readFileSync('player/f11-b25-smoke.js', 'utf8');
let t = src
  .replace(/f11-b25-smoke/g, 'f11-b25-verify')
  .replace(/w-b25a/g, 'w-b25v')
  .replace("const path = require('path');", "const path = require('path');\nconst crypto = require('crypto');")
  .replace('const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };',
    'const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };')
  .replace(/ev\.verdicts = \{[\s\S]*?\};\n\n/, '')
  .replace(/  const bad =[\s\S]*?;/, '')
  .replace('function summonPigman(',
    'function stampPin() {\n' +
    "  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');\n" +
    "  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();\n" +
    '  const mk = L.mkCounts();\n' +
    '  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };\n' +
    '  ev.pins.push(pin);\n' +
    "  console.log('[PIN] ' + JSON.stringify(pin));\n" +
    '  return pin;\n' +
    '}\n\n' +
    'function summonPigman(')
  .replace('(async () => {', '(async () => {\n  stampPin();')
  .replace("  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');",
    '  ev.verdicts = {\n' +
    "    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \\(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',\n" +
    "    w1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',\n" +
    "    w2: ev.arms.b1.n === 0 ? 'PASS' : 'FAIL',\n" +
    "    w3: 'REPORT',\n" +
    '  };\n' +
    "  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');")
  .replace('  process.exitCode = bad ? 2 : 0;', '')
  .replace(/  process\.exit\(/, '  stampPin();\n  process.exit(')
  .replace('  process.exit', '  process.exit');
fs.writeFileSync('player/f11-b25-verify.js', t, 'utf8');
console.log('verify written ' + t.length + ' B');
