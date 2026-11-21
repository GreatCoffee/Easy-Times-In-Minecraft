// fix-b25-verify-stamp.js — inject the missing stampPin() into f11-b25-verify.js
'use strict';
const fs = require('fs');
const p = 'player/f11-b25-verify.js';
let s = fs.readFileSync(p, 'utf8');
if (!/function stampPin\(/.test(s)) {
  const anchor = 'async function startBoot(tag, world, cfg) {';
  const fn = [
    'function stampPin() {',
    "  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');",
    "  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();",
    '  const mk = L.mkCounts();',
    '  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };',
    '  ev.pins.push(pin);',
    "  console.log('[PIN] ' + JSON.stringify(pin));",
    '  return pin;',
    '}',
    '',
  ].join('\n');
  s = s.replace(anchor, fn + anchor);
  // also add the closing [done]-adjacent stamp right before process.exit
  if (!/stampPin\(\);\s*process\.exit/m.test(s)) {
    s = s.replace(/(\n\s*)(process\.exit\()/, '$1stampPin();\n$2');
  }
  fs.writeFileSync(p, s, 'utf8');
  console.log('stampPin fn inserted + closing stamp');
} else {
  console.log('already present');
}
