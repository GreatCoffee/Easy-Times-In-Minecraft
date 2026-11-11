#!/usr/bin/env node
/**
 * f11-b31-verify — B-31 BreakDoor 判窗驱动（会话七，gen 后待主会话发令执行）。
 *
 * 与 f11-b31-smoke.js 同一套已验证工装面（r2→r7 逐轮钉死）：
 *   - 全部放置/testfor/replaceitem 走 console（srv.send）绝对坐标，bcmd 全删；
 *   - 僵尸一律 `{CanBreakDoors:1b}`（r4 定谳：R196 开门位 = 1.12 navigator 的
 *     canOpenDoors，summon 重读 NBT 会把 mixin ctor 设的位抹掉；自然刷怪只有
 *     10% 中签，r2 的门面绿正是那 10%）；
 *   - bot 全程保护（resistance/regeneration/absorption IV）——栅栏门面
 *     ETIMEntityAIBreakDoor.java:188-191 额外要求 getAttackTarget() 是玩家，
 *     bot 一死整臂归零（r4 a2 四循环全 timeout 的直接原因）；
 *   - 栅栏门关门 = console testfor 轮询到僵尸 AABB 进入门前 0.7 格带才关；
 *     summon 必须放在轮询前一刻（r5/r6 先 summon 再花 3 s 装斧/传人，
 *     僵尸在轮询开始前就穿门而过，297 次轮询 0 命中）。
 *
 * 判窗世界 w-b31v（主会话 2026-11-10 批准），判窗口径：
 *   W0 boot 卫生 = 双 boot `Done (` ∧ mixinFail=0×2 ∧ 两次停服 exitCode=0 ∧ build=true
 *   W1 door 面    = n(start)≥1 ∧ progN≥1 ∧ breakN≥1 ∧ doorAir≥1   (testforblock y67 = air)
 *   W2 gate 面    = n(start)≥1 ∧ breakN≥1 ∧ gateAir≥1
 *   W3 旗断       = b1 n===0 ∧ b1 probes===0（probes 必须并判）
 *   W4 钉值       = 双 [PIN] 同 releaseSha ∧ mk.ok===true
 * 判据只认服务端日志（run/logs/latest.log 与 build-logs/<tag>-b{1,2}.out）。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b31-verify';
const WORLD = 'w-b31v';
const A = 'ETIM_F7';

const X_HOLE = -67, Y_LOW = 67, Y_HIGH = 68, Z_HOLE = 242;
const BOT_OUT = '-65.5 67 242.5';
const BOT_OUT_GATE = '-64.4 67 242.5';

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

/** props 归一化指纹：去掉 Java Properties 重写的时间戳注释行（`#Tue Nov 10 20:56:34 CST 2026`）。
 *  1.12 每次保存都会改写该行，原始 hash 必漂；判据只认归一化值 + level-name 还原。 */
const TS_LINE = /^#\w{3} \w{3} +\d{1,2} \d{2}:\d{2}:\d{2} \w{3,4} \d{4}$/;
function sha256(txt) { return crypto.createHash('sha256').update(txt, 'utf8').digest('hex').toUpperCase(); }
function propsNorm(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop(); // 去尾空行，与 r12 登记值同口径
  return sha256(lines.filter((l) => !TS_LINE.test(l)).join('\n'));
}
function propsRaw(file) { return sha256(fs.readFileSync(file, 'utf8')); }
function propsLevel(file) {
  const m = /^level-name=(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : null;
}

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

const bRows = (lines, face) => lines.filter((l) => l.indexOf('breakdoor') >= 0 && l.indexOf(' ' + face + ' ') >= 0);
const bProbes = (lines) => lines.filter((l) => l.indexOf('breakdoor') >= 0 && l.indexOf(' probe-in ') >= 0);
const digRows = (lines) => lines.filter((l) => l.indexOf('[SleepLog]') >= 0 && l.indexOf('dig-gate') >= 0);

/** 1.12 成功串 `Successfully found the block at -67, 67, 242`（逗号后带空格）。 */
async function airAt(x, y, z) {
  const from = srv.all.length;
  srv.send(`testforblock ${x} ${y} ${z} minecraft:air`);
  await sleep(700);
  const rows = srv.all.slice(from).map(L.strip);
  const want = `${x}, ${y}, ${z}`;
  const hit = rows.find((l) => /Successfully found the block/i.test(l) && l.indexOf(want) >= 0);
  return { air: hit ? 1 : 0, raw: (hit || rows[0] || '').slice(0, 200) };
}

/** 1.12 testfor 命中串形如 `<logger>: Found ETIM_F7`；未命中为 `Selector '…' found nothing`。 */
async function testforBox(sel) {
  // 成功判优先 + 150 ms + 重试（r7 定谳：70 ms 窗口会混入相邻命令的 found nothing，
  // 失败判优先会把真命中压成 false；日志有 Found ETIM_F7 而 JSON 读 false 即此病因）。
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = srv.all.length;
    srv.send('testfor ' + sel);
    await sleep(150);
    const rows = srv.all.slice(from).map(L.strip);
    // strip() 剥掉日志前缀后成功行是 `Found ETIM_F7`（无冒号）；大小写敏感以避免把
    // 失败串 `found nothing` 误判为命中。
    if (rows.some((l) => /^Found \S+/.test(l) || /: Found \S+/.test(l))) return true;
    if (rows.some((l) => /cannot be found|found nothing|No entity/i.test(l))) return false;
  }
  return false;
}

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk: L.mkCounts() };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
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

/** 场地：先 gamerule（防野怪），再扫场、tp、铺 y66 台面与清空 y67..71。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
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

/** bot 保命：栅栏门面要 getAttackTarget()=玩家，bot 一死整臂归零。
 *  注意 1.12 没有 /attribute（r5 实测 Unknown command），只能靠药水。
 *  铁斧僵尸在 hard 下 raw=19.5，resist V 仍漏 final=1.0/击（[DamageLog] 口径），
 *  故 regen IV 兜底回血。 */
async function protectBot() {
  await cmd(`effect ${A} minecraft:resistance 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:regeneration 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:absorption 9999 4 true`, 250);
}

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
  await cmd('kill @e[type=!player]', 700); // 野怪会破坏 @e[type=zombie] 单选
}

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
  const air = await airAt(X_HOLE, Y_LOW, Z_HOLE);
  return {
    n: bRows(rows, 'start').length, progN: bRows(rows, 'progress').length,
    breakN: bRows(rows, 'break').length,
    rows: bRows(rows, 'start').slice(0, 3).concat(bRows(rows, 'progress').slice(0, 2)).concat(bRows(rows, 'break').slice(0, 2)),
    probes: bProbes(rows).length, digN: digRows(rows).length,
    doorAir: air.air, airRaw: air.raw,
  };
}

async function gateArm(k) {
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
    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 4`, 500); // 开：path 才穿门
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
    await cmd(`setblock ${X_HOLE} ${Y_LOW} ${Z_HOLE} minecraft:fence_gate 0`, 250); // 关：本该逼它撞
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
      botAlive: await testforBox(`@e[type=player,name=${A}]`),
    },
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
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开 ----------------
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
    console.log('[a2]', JSON.stringify({ n: ev.arms.a2.n, brk: ev.arms.a2.breakN, probes: ev.arms.a2.probes, air: ev.arms.a2.gateAir, cycles: ev.arms.a2.gateCycles }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗断 ----------------
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

  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);

  stampPin();

  const a1 = ev.arms.a1, a2 = ev.arms.a2, b1 = ev.arms.b1;
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1 = a1.n >= 1 && a1.progN >= 1 && a1.breakN >= 1 && a1.doorAir >= 1;
  // W2：结构性不可达（裁定 A）——只核证据留存，不判 PASS/FAIL。
  const w2 = 'N/A';
  const w3 = b1.n === 0 && b1.probes === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2,
    w3: w3 ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',
    w2note: 'structural-unreachable (fence gate = FENCE in 1.12 pathfinding); evidence: a2.gateCycles + build-logs/f11-b31-gate-investigation.md',
  };
  const bad = !(w0 && w1 && w3 && w4);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1: a1.n, a1prog: a1.progN, a1break: a1.breakN, a1air: a1.doorAir,
    a2: a2.n, a2break: a2.breakN, a2air: a2.gateAir,
    b1: b1.n, b1probes: b1.probes,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, w3: ev.verdicts.w3, w4: ev.verdicts.w4,
    propsNorm: `${ev.propsNormBefore}/${ev.propsNormAfter}`,
    propsRaw: `${ev.propsRawBefore}/${ev.propsRawAfter}`,
    propsLevel: `${ev.propsLevelBefore}->${ev.propsLevelAfter}`,
    bad: bad ? 1 : 0,
  }));
  process.exitCode = bad ? 2 : 0;
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
