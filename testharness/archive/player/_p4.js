// r12 定稿补丁：W2 改判「结构性不可达」（主会话 2026-11-10 21:1x 裁定 A），
// 栅栏门臂保留 2 循环做证据采集，但不再计入 bad；protectBot 去掉 1.12 不存在的 attribute。
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'f11-b31-smoke.js');
let s = fs.readFileSync(p, 'utf8');
const before = s;

s = s.replace("run: 'r11'", "run: 'r12'");
s = s.replace("  await cmd(`attribute ${A} generic.maxHealth base set 1024`, 300);\n", '');
s = s.replace('const extra = [0, 100, 200, 300];', 'const extra = [0, 300];');
s = s.replace("  for (let cycle = 0; cycle < 4; cycle++) {\n    await cmd('kill @e[type=!player]', 600);\n    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 4`, 500);",
  "  for (let cycle = 0; cycle < extra.length; cycle++) {\n    await cmd('kill @e[type=!player]', 600);\n    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 4`, 500);");
s = s.replace("    || !(a2.n >= 1 && a2.breakN >= 1 && a2.gateAir >= 1)\n", '');
s = s.replace("  const a1 = ev.arms.a1, a2 = ev.arms.a2, b1 = ev.arms.b1;",
  "  const a1 = ev.arms.a1, a2 = ev.arms.a2, b1 = ev.arms.b1;\n  // W2 判为结构性不可达（裁定 A，2026-11-10）：1.12 里关着的栅栏门在 WalkNodeProcessor:498\n  // 是 FENCE，僵尸的 path 永远算不进去 ⇒ 停住 ⇒ 没有 collidedHorizontally；r10/r11 已用\n  // 「进门前一格关」「关进身体里」两种手法证明，均 0 start。本臂只留证据，不计 bad。\n  a2.note = 'structural-unreachable: closed fence gate is FENCE for 1.12 pathfinding (WalkNodeProcessor:498); see build-logs/f11-b31-gate-investigation.md';");
s = s.replace("    a2: a2.n, a2break: a2.breakN, a2air: a2.gateAir, a2rearm: a2.rearmCycles,",
  "    a2: a2.n, a2break: a2.breakN, a2air: a2.gateAir, a2note: 'structural-unreachable',");
s = s.replace(' *   a2 gate  : fence_gate opened (meta 4) so the path routes, closed (meta 0)\n *              800 ms later to force the collide (stale path); 30 s window\n *              (480/6 = 80t ~ 4 s), re-armed up to 3 cycles if no start row.',
  ' *   a2 gate  : EVIDENCE ONLY (r12). 1.12 pathfinding treats a closed fence gate as\n *              FENCE (WalkNodeProcessor:498), so a walking zombie can never collide\n *              with one -> the gate branch is structurally unreachable here. Two\n *              cycles (close on approach / close inside the cell) keep the evidence.\n *              Not part of `bad`; see build-logs/f11-b31-gate-investigation.md.');
s = s.replace(' * f11-b31-smoke (r2) �� B-31 BreakDoor face smoke, console-absolute rewrite.',
  ' * f11-b31-smoke (r12) — B-31 BreakDoor face smoke, console-absolute rewrite.');

if (s === before) throw new Error('no change applied');
fs.writeFileSync(p, s, 'utf8');
console.log('patched; run=' + (/run: 'r\d+'/.exec(s) || ['?'])[0] + ' bytes=' + s.length);
