// one-shot verify-driver generator for B-27 — reads the smoke driver and
// produces the judge-window twin (W arms + stamps). Thin-layer pattern;
// DELETE after using.
'use strict';
const fs = require('fs');
let src = fs.readFileSync('player/f11-b27-smoke.js', 'utf8');
src = src.replace(/f11-b27-smoke/g, 'f11-b27-verify')
  .replace(/TAG = 'f11-b27-verify'/g, "TAG = 'f11-b27-verify'")
  .replace(/WORLD = 'w-b27a'/g, "WORLD = 'w-b27v'")
  .replace("const ev = { tag: TAG, boots: [], arms: {}, verdicts: {}, stopBoots: [] };",
    "const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };")
  .replace("(async () => {\n  // ---------------- boot 1: flag on ----------------",
    "stampPin();\n(async () => {\n  // ---------------- boot 1: flag on ----------------");
fs.writeFileSync('player/f11-b27-verify.js', src, 'utf8');
console.log('verify driver written (stampPin placeholder injected)');
