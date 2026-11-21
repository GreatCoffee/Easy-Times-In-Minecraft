// r12 同步：verify 驱动的栅栏门臂改「证据臂」+ W2 判结构性不可达（裁定 A）。
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'f11-b31-verify.js');
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf('async function gateArm(k) {');
const end = s.indexOf('async function flagOffArm(k) {');
if (start < 0 || end < 0 || end <= start) throw new Error('gateArm block not found');

const newGate = `async function gateArm(k) {
  await buildPen();
  const cycles = [];
  // W2 判为结构性不可达（主会话裁定 A，2026-11-10）：1.12 pathfinding 把关着的栅栏门
  // 当 FENCE（WalkNodeProcessor:498），僵尸的 path 永远算不进该格 ⇒ 停住 ⇒ 没有
  // collidedHorizontally，doorInteractShouldExecute() 第一关就过不了。r10（进门前一格关）
  // 与 r11（关进身体里，inCellAtClose=true）各四循环均 0 start，证据留档
  // build-logs/f11-b31-gate-investigation.md。本臂只采两档证据，不计入 bad。
  const extra = [0, 300];
  for (let cycle = 0; cycle < extra.length; cycle++) {
    await cmd('kill @e[type=!player]', 600);
    await cmd(\`setblock \${X_HOLE} \${Y_LOW} \${Z_HOLE} minecraft:fence_gate 4\`, 500); // 开：path 才穿门
    await cmd('tp ' + A + ' ' + BOT_OUT_GATE, 400);
    await protectBot();
    const t0 = Date.now();
    await cmd('summon zombie -70 67 242 {CanBreakDoors:1b}', 100); // summon 后立刻进轮询
    let detectedAt = null;
    while (Date.now() - t0 < 9000) {
      if (await testforBox('@e[type=zombie,x=-68,y=67,z=242,dx=1,dy=1,dz=1]')) {
        detectedAt = ((Date.now() - t0) / 1000).toFixed(2);
        break;
      }
      await sleep(20);
    }
    let inCellAtClose = null;
    if (detectedAt !== null) {
      await sleep(extra[cycle]);
      inCellAtClose = await testforBox('@e[type=zombie,x=-67,y=67,z=242,dx=1,dy=1,dz=1]');
    }
    await cmd(\`setblock \${X_HOLE} \${Y_LOW} \${Z_HOLE} minecraft:fence_gate 0\`, 250); // 关：本该逼它撞
    const closedAtSec = ((Date.now() - t0) / 1000).toFixed(2);
    await sleep(25000);
    const cyc = { cycle, extraMs: extra[cycle], detectedAtSec: detectedAt, inCellAtClose, closedAtSec, startN: bRows(since(k), 'start').length };
    cycles.push(cyc);
    if (cyc.startN > 0) { cyc.note = 'start observed'; break; }
    await cmd('kill @e[type=!player]', 500);
  }
  const rows = since(k);
  const air = await airAt(X_HOLE, Y_LOW, Z_HOLE);
  return {
    n: bRows(rows, 'start').length, breakN: bRows(rows, 'break').length,
    rows: bRows(rows, 'start').slice(0, 3).concat(bRows(rows, 'break').slice(0, 3)),
    probes: bProbes(rows).length, digN: digRows(rows).length,
    gateAir: air.air, airRaw: air.raw, gateCycles: cycles,
    note: 'structural-unreachable: closed fence gate is FENCE for 1.12 pathfinding (WalkNodeProcessor:498)',
    diag: {
      zombieAlive: await testforBox('@e[type=zombie]'),
      zombieAtGate: await testforBox('@e[type=zombie,x=-68,y=67,z=242,dx=1,dy=1,dz=1]'),
      botAlive: await testforBox(\`@e[type=player,name=\${A}]\`),
    },
  };
}

`;

s = s.slice(0, start) + newGate + s.slice(end);

s = s.replace("  const w2 = a2.n >= 1 && a2.breakN >= 1 && a2.gateAir >= 1;",
  "  // W2：结构性不可达（裁定 A）——只核证据留存，不判 PASS/FAIL。\n  const w2 = 'N/A';");
s = s.replace("    w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL',\n    w3: w3 ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',",
  "    w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2,\n    w3: w3 ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',\n    w2note: 'structural-unreachable (fence gate = FENCE in 1.12 pathfinding); evidence: a2.gateCycles + build-logs/f11-b31-gate-investigation.md',");
s = s.replace('const bad = !(w0 && w1 && w2 && w3 && w4);', 'const bad = !(w0 && w1 && w3 && w4);');

fs.writeFileSync(p, s, 'utf8');
console.log('verify patched bytes=' + s.length);
