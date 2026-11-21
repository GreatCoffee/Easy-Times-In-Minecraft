// gen-b24-verify.js — one-shot generator: f11-b24-smoke.js -> f11-b24-verify.js
// (W-arm verdicts + [PIN] stamps; DELETE after use — the B-21/B-23 convention)
'use strict';
const fs = require('fs');
const src = fs.readFileSync('player/f11-b24-smoke.js', 'utf8');
let t = src
  .replace(/f11-b24-smoke/g, 'f11-b24-verify')
  .replace(/w-b24a/g, 'w-b24v')
  .replace("const path = require('path');", "const path = require('path');\nconst crypto = require('crypto');")
  .replace("const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };",
    "const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };")
  .replace("async function stageArena() {",
    "function stampPin() {\n" +
    "  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');\n" +
    "  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();\n" +
    "  const mk = L.mkCounts();\n" +
    "  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };\n" +
    "  ev.pins.push(pin);\n" +
    "  console.log('[PIN] ' + JSON.stringify(pin));\n" +
    "  return pin;\n" +
    "}\n\n" +
    "async function stageArena() {")
  .replace("(async () => {\n  // ---------------- boot 1: flag on ----------------",
    "(async () => {\n  stampPin();\n  // ---------------- boot 1: flag on ----------------")
  .replace("  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');",
    "  ev.verdicts = {\n" +
    "    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \\(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',\n" +
    "    w1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',\n" +
    "    w2: ev.arms.a2.n >= 1 ? 'PASS' : 'FAIL',\n" +
    "    w3: ev.arms.b1.n === 0 ? 'PASS' : 'FAIL',\n" +
    "  };\n" +
    "  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');")
  .replace("  console.log('[out] ' + fsOut);",
    "  stampPin();\n  console.log('[out] ' + fsOut);");
fs.writeFileSync('player/f11-b24-verify.js', t, 'utf8');
console.log('verify written ' + t.length + ' B');
