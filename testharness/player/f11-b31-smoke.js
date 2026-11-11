#!/usr/bin/env node
/**
 * f11-b31-smoke (r2) — B-31 BreakDoor face smoke, console-absolute rewrite.
 *
 * r1 (2026-11-10 17:50-17:53) broke on three harness traps, all fixed here:
 *   1. bot stood INSIDE the pen (-69.5,67,242.5 = x -69..-68 interior) so the
 *      zombie never collided with the portal -> R196 :19 collidedHorizontally
 *      never true -> no start row, door or no door.
 *   2. `minecraft:oak_door` is not a 1.12.2 registry name -> `minecraft:wooden_door`
 *      (rfg Blocks.java L392 OAK_DOOR = getRegisteredBlock("wooden_door")).
 *   3. console `@e[...r=6]` resolves its radius at the console origin (world
 *      spawn) -> `found nothing` -> the axe was never equipped. Selectors must
 *      have no radius here (absolute console faces only).
 * All placement / testfor / replaceitem go through srv.send (console, absolute
 * coordinates). The bot is only a collide target and is teleported OUT of the
 * pen (east, x=-65.5) in every arm.
 *
 * Arms (mobDebugLog-gated [AILog] rows):
 *   a1 door  : wooden_door lower meta 0 + upper meta 8, iron-axe zombie,
 *              hard, 60 s (1920/6 = 320t ~ 16 s).
 *   a2 gate  : EVIDENCE ONLY (r12). 1.12 pathfinding treats a closed fence gate as
 *              FENCE (WalkNodeProcessor:498), so a walking zombie can never collide
 *              with one -> the gate branch is structurally unreachable here. Two
 *              cycles (close on approach / close inside the cell) keep the evidence.
 *              Not part of `bad`; see build-logs/f11-b31-gate-investigation.md.
 *   b1 flag off: livestockNeedsR196=false -> zero breakdoor rows (start+probe).
 *
 * Judge faces: start / progress / break (space-delimited faces; "breakdoor"
 * itself contains "break", so the face match always carries both spaces),
 * probes (1-in-16 diagnostic, never judged), doorAir/gateAir (console
 * testforblock of the walk layer y67 after the arm), digN ([SleepLog] dig-gate
 * heartbeat, diagnostic only).
 */
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b31-smoke';
const WORLD = 'w-b31a';
const A = 'ETIM_F7';

// pen geometry (absolute). Interior -71..-68 x, 240..243 z, walk layer y67..68.
const X_HOLE = -67, Y_LOW = 67, Y_HIGH = 68, Z_HOLE = 242;
const BOT_OUT = '-65.5 67 242.5';
// The gate arm needs a FARTHER stand-off: a zombie halts as soon as the bot is
// inside melee reach (~2.5 from the bot's centre), so at -65.5 it stopped at
// x≈-68.0 and hammered the bot *through* the open gate without ever touching
// the gate face at -67.3 (r5: 4/4 cycles `closedAtSec:"timeout"` + DamageLog
// final=0 while the 0.7 band never matched). At -64.4 the stop point lies east
// of the gate, so the zombie keeps walking into the cell and meets the closed
// gate instead of parking short of it.
const BOT_OUT_GATE = '-64.4 67 242.5';

const ev = { tag: TAG, run: 'r12', boots: [], arms: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

const bRows = (lines, face) => lines.filter((l) => l.indexOf('breakdoor') >= 0 && l.indexOf(' ' + face + ' ') >= 0);
const bProbes = (lines) => lines.filter((l) => l.indexOf('breakdoor') >= 0 && l.indexOf(' probe-in ') >= 0);
const digRows = (lines) => lines.filter((l) => l.indexOf('[SleepLog]') >= 0 && l.indexOf('dig-gate') >= 0);

/** console testforblock of the walk layer; 1 = air (portal gone), 0 = still blocked.
 *  r2 bug: 1.12 prints `Successfully found the block at -67, 67, 242` (spaces after the
 *  commas) — the match must carry that spacing or every air hit reads 0. */
async function airAt(x, y, z) {
  const from = srv.all.length;
  srv.send(`testforblock ${x} ${y} ${z} minecraft:air`);
  await sleep(700);
  const rows = srv.all.slice(from).map(L.strip);
  const want = `${x}, ${y}, ${z}`;
  const hit = rows.find((l) => /Successfully found the block/i.test(l) && l.indexOf(want) >= 0);
  return { air: hit ? 1 : 0, raw: (hit || rows[0] || '').slice(0, 200) };
}

/** console testfor with an absolute AABB — success = a `Found …` reply, never `cannot be found`. */
async function testforBox(sel) {
  // 1.12 成功串 = `<logger>: Found ETIM_F7`，失败串 = `Selector '…' found nothing`。
  // r7 定谳两处口径错：①只 sleep 70 ms，回显常落后一到两拍，窗口里混入相邻命令的
  // found nothing；②失败判优先 ⇒ 真命中也被压成 false（r7 日志 20:14:05 有两条
  // Found ETIM_F7，JSON 的 selftest 却双双 false）。改为成功判优先 + 150 ms + 重试一次。
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = srv.all.length;
    srv.send('testfor ' + sel);
    await sleep(150);
    const rows = srv.all.slice(from).map(L.strip);
    // strip() 会剥掉 `<时间> [线程/INFO] [logger]: ` 前缀，成功行由此变成 `Found ETIM_F7`
    // （没有冒号）——r8 用 `/: Found /` 因此全判 false。成功判必须大小写敏感：`/i` 会把
    // 失败串 `found nothing` 也当成命中。
    if (rows.some((l) => /^Found \S+/.test(l) || /: Found \S+/.test(l))) return true;
    if (rows.some((l) => /cannot be found|found nothing|No entity/i.test(l))) return false;
  }
  return false;
}

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true });
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', world)
    : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
}

/** shared arena: pad y66, clear y67..71, gamerules, hard, night. Console-absolute only. */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  // gamerules FIRST, then the sweep: r3 let three wild zombies spawn in the gap
  // between the kill and `doMobSpawning false`, which polluted the probe counts
  // and the replaceitem selector.
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -69.5 67 242.5', 900);
  await sleep(1500);
  await cmd('fill -74 66 237 -64 66 247 minecraft:cobblestone', 1000);
  await cmd('fill -74 67 237 -64 71 247 minecraft:air', 1000);
  await protectBot();
  ev.selftest = {
    boxBot: await testforBox(`@e[type=player,name=${A},x=-70,y=66,z=241,dx=8,dy=4,dz=4]`),
    plainBot: await testforBox(`@e[type=player,name=${A}]`),
  };
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await sleep(1200);
}

/**
 * Keep the stand-in player alive. This is load-bearing for the gate arm:
 * `ETIMEntityAIBreakDoor.doorInteractShouldExecute()` (ETIMEntityAIBreakDoor.java:188-191)
 * additionally requires `entity.getAttackTarget() instanceof EntityPlayer`, so a
 * dead (respawned-at-spawn) bot silently zeroes the whole arm (r4 gate 0/4 cycles).
 * Resistance V alone is NOT enough: an iron-axe zombie on hard deals raw=19.5 and
 * ETIM's armor floor lets final=1.0 through every hit ([DamageLog] prot potion=25
 * total=25 / dmg final=1.000), which kills a 20 HP bot in ~30 s.
 */
async function protectBot() {
  await cmd(`effect ${A} minecraft:resistance 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:regeneration 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:absorption 9999 4 true`, 250);
}

/** five wall fills (18/18/12/6/3) + clear the walk-layer hole. */
async function buildPen() {
  const walls = [
    `fill -72 67 239 -67 69 239 minecraft:cobblestone`,
    `fill -72 67 244 -67 69 244 minecraft:cobblestone`,
    `fill -72 67 239 -72 69 244 minecraft:cobblestone`,
    `fill -67 67 239 -67 69 241 minecraft:cobblestone`,
    `fill -67 67 243 -67 69 244 minecraft:cobblestone`,
  ];
  for (const w of walls) await cmd(w, 700);
  await cmd(`fill ${X_HOLE} ${Y_LOW} ${Z_HOLE} ${X_HOLE} ${Y_HIGH} ${Z_HOLE} minecraft:air`, 600);
  await cmd('kill @e[type=!player]', 700); // stray spawns would break the one-zombie selector
}

/** summon + axe (no-radius selector) + fan the bot out east of the pen.
 *  `{CanBreakDoors:1b}` is load-bearing: the R196 seat's door capability is the
 *  1.12 navigator flag (`setBreakDoors(true)`, mixin ctor :77), but a summoned
 *  zombie re-reads NBT `CanBreakDoors` (false by default -> the flag is wiped)
 *  and a natural spawn rolls it at 10% (EntityZombie spawn table). r2's door
 *  win was that 10% roll; r3 rolled none across four chickens. */
async function armZombie(botPos) {
  await cmd('summon zombie -70 67 242 {CanBreakDoors:1b}', 900);
  await cmd('replaceitem entity @e[type=zombie] slot.weapon.mainhand minecraft:iron_axe 1', 600);
  await cmd('tp ' + A + ' ' + (botPos || BOT_OUT), 600);
  await protectBot();
}

async function doorArm(k) {
  await buildPen();
  await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:wooden_door 0`, 700);
  await cmd(`setblock ${X_HOLE} ${Y_HIGH} ${Z_HOLE} minecraft:wooden_door 8`, 700);
  await armZombie();
  await sleep(60000);
  const rows = since(k);
  const startRows = bRows(rows, 'start');
  const progRows = bRows(rows, 'progress');
  const breakRows = bRows(rows, 'break');
  const air = await airAt(X_HOLE, Y_LOW, Z_HOLE);
  return {
    n: startRows.length, progN: progRows.length, breakN: breakRows.length,
    rows: startRows.slice(0, 3).concat(progRows.slice(0, 2)).concat(breakRows.slice(0, 2)),
    probes: bProbes(rows).length, digN: digRows(rows).length,
    doorAir: air.air, airRaw: air.raw,
  };
}

async function gateArm(k) {
  await buildPen();
  const cycles = [];
  // r10 未成：门一直开、等僵尸走进「门前一格」x∈[-68,-67] 就关门，四循环 closedAtSec
  // = 3.13/1.62/3.12/1.25 s，仍 0 start、0 伤害、probes=43 —— 说明**关门那一刻它离门面
  // 还有余量**，关门后 EntityAIAttackMelee 的 repath 立刻失败（关门栏门 = FENCE，见
  // WalkNodeProcessor:498），它原地停住，不产生 collidedHorizontally。
  // r11 改「埋进格子再关」：检测到进格后**再多等 0/100/200/300 ms**，让关门那一下正好落在
  // 它已经跨进门格 x∈[-67,-66] 的瞬间 —— 关门 = 实心块塞进它身体，游戏把它挤出并置
  // collidedHorizontally，同时 path 尚未作废，这是 1.12 里唯一能让关门栏门「被撞到」的时机。
  const extra = [0, 300];
  for (let cycle = 0; cycle < extra.length; cycle++) {
    await cmd('kill @e[type=!player]', 600);
    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 4`, 500); // open -> path routes
    await cmd('tp ' + A + ' ' + BOT_OUT_GATE, 400);
    await protectBot();
    const t0 = Date.now();
    await cmd('summon zombie -70 67 242 {CanBreakDoors:1b}', 100);
    let closedAt = null;
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
    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 0`, 250); // closed -> collide
    closedAt = ((Date.now() - t0) / 1000).toFixed(2);
    await sleep(25000);
    const rowsNow = since(k);
    const cyc = { cycle, extraMs: extra[cycle], detectedAtSec: detectedAt, inCellAtClose, closedAtSec: closedAt, startN: bRows(rowsNow, 'start').length };
    cycles.push(cyc);
    if (cyc.startN > 0) { cyc.note = 'start observed'; break; }
    await cmd('kill @e[type=!player]', 500);
  }
  const rows = since(k);
  const startRows = bRows(rows, 'start');
  const breakRows = bRows(rows, 'break');
  const air = await airAt(X_HOLE, Y_LOW, Z_HOLE);
  const zombieAlive = await testforBox('@e[type=zombie]');
  const zombieAtGate = await testforBox('@e[type=zombie,x=-68,y=67,z=242,dx=1,dy=1,dz=1]');
  const botAlive = await testforBox(`@e[type=player,name=${A}]`);
  return {
    n: startRows.length, breakN: breakRows.length,
    rows: startRows.slice(0, 3).concat(breakRows.slice(0, 3)),
    probes: bProbes(rows).length, digN: digRows(rows).length,
    gateAir: air.air, airRaw: air.raw, gateCycles: cycles,
    diag: { zombieAlive, zombieAtGate, botAlive },
  };
}
async function flagOffArm(k) {
  await buildPen();
  await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:wooden_door 0`, 700);
  await cmd(`setblock ${X_HOLE} ${Y_HIGH} ${Z_HOLE} minecraft:wooden_door 8`, 700);
  await armZombie();
  await sleep(30000);
  const rows = since(k);
  return {
    n: bRows(rows, 'start').length + bRows(rows, 'break').length,
    probes: bProbes(rows).length, digN: digRows(rows).length,
  };
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.a1 = await doorArm(k);
    console.log('[a1]', JSON.stringify({ n: ev.arms.a1.n, prog: ev.arms.a1.progN, brk: ev.arms.a1.breakN, probes: ev.arms.a1.probes, air: ev.arms.a1.doorAir }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await gateArm(k);
    console.log('[a2]', JSON.stringify({ n: ev.arms.a2.n, brk: ev.arms.a2.breakN, probes: ev.arms.a2.probes, air: ev.arms.a2.gateAir, rearm: ev.arms.a2.rearmCycles }));
    await cmd('kill @e[type=!player]', 600);
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.b1 = await flagOffArm(k);
    console.log('[b1]', JSON.stringify({ n: ev.arms.b1.n, probes: ev.arms.b1.probes }));
    await cmd('kill @e[type=!player]', 600);
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const a1 = ev.arms.a1, a2 = ev.arms.a2, b1 = ev.arms.b1;
  // W2 判为结构性不可达（裁定 A，2026-11-10）：1.12 里关着的栅栏门在 WalkNodeProcessor:498
  // 是 FENCE，僵尸的 path 永远算不进去 ⇒ 停住 ⇒ 没有 collidedHorizontally；r10/r11 已用
  // 「进门前一格关」「关进身体里」两种手法证明，均 0 start。本臂只留证据，不计 bad。
  a2.note = 'structural-unreachable: closed fence gate is FENCE for 1.12 pathfinding (WalkNodeProcessor:498); see build-logs/f11-b31-gate-investigation.md';
  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || !(a1.n >= 1 && a1.progN >= 1 && a1.breakN >= 1 && a1.doorAir >= 1)
    || !(b1.n === 0 && b1.probes === 0);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1: a1.n, a1prog: a1.progN, a1break: a1.breakN, a1air: a1.doorAir,
    a2: a2.n, a2break: a2.breakN, a2air: a2.gateAir, a2note: 'structural-unreachable',
    b1: b1.n, b1probes: b1.probes,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    bad: bad ? 1 : 0,
  }));
  process.exitCode = bad ? 2 : 0;
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch((e) => { console.error('[fatal]', e); process.exit(1); });
