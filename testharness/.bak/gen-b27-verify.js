'use strict';
// f11-b27-verify generator: read the smoke driver, transform to the judge twin.
const fs = require('fs');
const p = 'D:/OpenCodeWorkspace/Easy Times In Minecraft/git-workspace/etim/testharness/player/';
let s = fs.readFileSync(p + 'f11-b27-smoke.js', 'utf8');
let edits = 0;
// 1) tag / world renames
s = s.replace(/f11-b27-smoke/g, 'f11-b27-verify');
s = s.replace(/WORLD = 'w-b27a'/, "WORLD = 'w-b27v'");
// 2) crypto import + verdicts decl
{
  const a = "const fs = require('fs');";
  if (s.includes(a)) { s = s.replace(a, a + "\nconst crypto = require('crypto');"); edits++; }
}
{
  const a = "const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };";
  if (s.includes(a)) {
    s = s.replace(a, "const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };");
    edits++;
  }
}
// 3) stampPin helper (insert before stageArena)
{
  const a = "async function stageArena() {";
  const fn = [
    "function stampPin() {",
    "  const jar = path.join('..', 'build', 'libs', 'etim-1.0.0.jar');",
    "  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();",
    "  const mk = L.mkCounts();",
    "  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };",
    "  ev.pins.push(pin);",
    "  console.log('[PIN] ' + JSON.stringify(pin));",
    "}",
    "",
    "async function stageArena() {",
  ].join('\n');
  if (s.includes(a)) { s = s.replace(a, fn); edits++; }
}
// 4) pin stamps at both boots
{
  const a = "  srv = await startBoot(TAG + '-b1', WORLD, {";
  if (s.includes(a)) { s = s.replace(a, "  stampPin();\n  srv = await startBoot(TAG + '-b1', WORLD, {"); edits++; }
}
{
  const a = "  srv = await startBoot(TAG + '-b2', WORLD, {";
  if (s.includes(a)) { s = s.replace(a, "  stampPin();\n  srv = await startBoot(TAG + '-b2', WORLD, {"); edits++; }
}
// 5) verdict block + closing stamp at the report tail
{
  const a = "  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');";
  if (s.includes(a)) {
    s = s.replace(a, [
      "  ev.verdicts = {",
      "    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \\(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',",
      "    w1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',",
      "    w2: ev.arms.a2.n >= 1 ? 'PASS' : 'FAIL',",
      "    w3: ev.arms.a3.n === 0 ? 'PASS' : 'FAIL',",
      "    w4: ev.arms.b1.n === 0 && ev.arms.b1.probes === 0 ? 'PASS' : 'FAIL',",
      "  };",
      "  stampPin();",
      "  console.log('[verdicts] ' + JSON.stringify(ev.verdicts));",
      "  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');",
    ].join('\n'));
    edits++;
  }
}
fs.writeFileSync(p + 'f11-b27-verify.js', s, 'utf8');
console.log('verify stamped, edits=' + edits + ', bytes=' + s.length);
