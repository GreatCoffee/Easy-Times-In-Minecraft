#!/usr/bin/env node
/**
 * f11-b33-verify — B-33 MoveToTree 判窗驱动（会话七，gen 后待主会话发令执行）。
 *
 * 工装面全部沿用 f11-b33-smoke.js r1→r6 六轮钉死的结论：
 *   - bot 创造模式（r2 trap 3：SURVIVAL 会被着火僵尸近战点燃并反击，
 *     EntityAIZombieAttack(priority 2) 占 mutex 1 → 树座(priority 3) 饿死）；
 *   - 3×3 圆石栖塔（r5 一次性诊断定谳，用户批准：1/40 门活、扫描活、
 *     唯一死点＝bot 在 1×1 木柱顶 8 秒内滑落（mineflayer 客户端物理）；
 *     塔顶 footY=71 边距 1.5 格，r6 实测 95/95 样本 y=71 零滑落）；
 *   - pinBurner 位置钉扎（每 10s tp 一次，消 wander 距离未知数＋压 wander
 *     任务重占 mutex）；
 *   - 全部放置/testfor 走 console（srv.send）绝对坐标；
 *   - 清场用 void-drop（/kill 被 ETIM 伤害管线钳 final=138，杀不死 200HP
 *     NBT 僵尸——r2 trap 4）；
 *   - 着火僵尸 NBT `{Fire:20000,Attributes:[{Name:"generic.maxHealth",Base:200}],Health:200f}`
 *     （原版 20HP 在火伤 1/10t 下 ~10s 烧死）。
 *
 * 判窗世界 w-b33v（新，smoke 世界 w-b33a 状态已污染；props 归一化口径判，
 * 原始 hash 只记不判——1.12 Properties 时间戳注释行必漂，C-B31 第 1 条）。
 *
 * 判窗口径：
 *   W0 boot 卫生 = 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 exitCode=0 ∧ build=true
 *   W1 树面      = a1 start≥1 ∧ countdownSet≥1 ∧ roll(chance=0.01)≥1 ∧ probes≥1
 *                  （botpos 最低值只记不判：客户端侧遥测，非服务端日志判据）
 *   W2 火面      = a2 meltN≥1（igniteN 只记——Poisson 饥饿面，r4/r6 亦 0-2 行）
 *   W3 旗断      = b1 treeN===0 ∧ fireN===0（双面并判）
 *   W4 钉值      = 双 [PIN] 同 releaseSha＝06680A25…F1966A03（显式期望值）
 *                  ∧ mk.ok===true（MK 100/223/446／98+10）
 * 判据只认服务端日志（build-logs/<tag>-b{1,2}.out）。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b33-verify';
const WORLD = 'w-b33v';
const A = 'ETIM_F7';
const EXPECTED_SHA = '06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03';

const BOT_TOP = '-59.5 71 240.5';     // perch-tower top (footY=71)
const ZOMBIE_TREE = '-67 67 240';     // summon spot: 4 blocks west of the log column
const ZOMBIE_PIN = '-66.5 67 240.5';  // position pin: 3.5 west of the log column
const MELT_CELL = '-39.5 67 240.5';   // melt pen interior cell center (-40,240), NOT the wall column

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

/** props 归一化指纹：去掉 Java Properties 重写的时间戳注释行（1.12 每次保存
 *  都改写该行，原始 hash 必漂）；判据只认归一化值 + level-name 还原。 */
const TS_LINE = /^#\w{3} \w{3} +\d{1,2} \d{2}:\d{2}:\d{2} \w{3,4} \d{4}$/;
function sha256(txt) { return crypto.createHash('sha256').update(txt, 'utf8').digest('hex').toUpperCase(); }
function propsNorm(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop(); // 去尾空行
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

/** 判行过滤（与 f11-b33-smoke.js 同一套 face；' start '/' probe-in ' 带空格）。 */
const treeRows = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0);
const treeStarts = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0 && l.indexOf(' start ') >= 0);
const treeProbes = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0 && l.indexOf(' probe-in ') >= 0);
const fireRows = (lines) => lines.filter((l) => l.indexOf('[FireLog]') >= 0);
const fireRolls = (lines, chance) => lines.filter((l) => l.indexOf('[FireLog] roll') >= 0 && l.indexOf(' chance=' + chance + ' ') >= 0);
const fireCountdownSet = (lines) => lines.filter((l) => l.indexOf('[FireLog] countdown set=') >= 0);
const fireIgnite = (lines) => lines.filter((l) => l.indexOf('[FireLog] ignite ') >= 0);
const fireMelt = (lines) => lines.filter((l) => l.indexOf('[FireLog] melt ') >= 0);

async function testforBot() {
  const from = srv.all.length;
  srv.send(`testfor @e[type=player,name=${A}]`);
  await sleep(400);
  const rows = srv.all.slice(from).map(L.strip);
  return rows.some((l) => /^Found \S+/.test(l) || /: Found \S+/.test(l));
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

/** 共用场地：创造 bot＋gamerule＋hard＋夜＋y66 台面＋清 y67..71＋2 高围墙。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  // r2 trap 3：创造 → disableDamage → 无目标 → 攻击任务不占 mutex 1 → 树座得槽
  await cmd('gamemode 1 ' + A, 400);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -60.5 67 240.5', 900); // 树柱与塔柱之间的空位
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1200);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1200);
  // r2：2 高围墙防走缘坠湖灭火
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 900);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 900);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 900);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 900);
  await protectBot();
  await sleep(1200);
}

/** 清场＝void-drop：tp 出界（R196 posY<-64 杀）＋kill 扫物品。 */
async function sweepMobs() {
  await cmd('tp @e[type=zombie] -70 -100 240', 500);
  await sleep(1800);
  await cmd('kill @e[type=!player]', 700); // item sweep
}

/** 硬门：bot 必须全程在线——被踢＝无人在线＝区块卸载＝冻结世界（r1 trap 2）。 */
async function guardBot() {
  if (!(await testforBot())) throw new Error('bot left mid-run (kicked?) — chunks would unload, aborting this boot');
}

async function protectBot() {
  await cmd(`effect ${A} minecraft:resistance 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:regeneration 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:absorption 9999 4 true`, 250);
}

/** 五连木柱 (-63,67..71,240)（BlockLog 候选）＋3×3 圆石栖塔 (-59,67..69 柱＋
 *  y70 平台)。塔东置不挡僵尸西东路。r5 诊断定谳＋r6 实证见头注。 */
async function buildTree() {
  for (let y = 67; y <= 71; y++) {
    await cmd(`setblock -63 ${y} 240 minecraft:log 0`, 600);
  }
  await cmd('fill -59 67 240 -59 69 240 minecraft:cobblestone', 800);
  await cmd('fill -60 70 239 -58 70 241 minecraft:cobblestone', 800);
  await cmd('kill @e[type=!player]', 700);
}

/** 着火僵尸：200 max HP（原版 20HP 火伤 ~10s 烧死）。 */
async function summonZombie(pos) {
  await cmd(`summon zombie ${pos} {Fire:20000,Attributes:[{Name:"generic.maxHealth",Base:200}],Health:200f}`, 900);
}

/** r4 位置钉扎：钉死 burner，消 wander 距离未知数＋压 wander 任务占 mutex。 */
async function pinBurner(x, y, z, times, intervalMs) {
  for (let i = 0; i < times; i++) {
    await cmd('tp @e[type=zombie] ' + x + ' ' + y + ' ' + z, 600);
    await sleep(intervalMs);
  }
}

/** r6：1Hz bot 高度自报（stdout 驱动侧，不进服务端日志）；sink 收集样本供
 *  botposMinY 记录（只记不判——客户端侧遥测）。 */
function watchBotY(ms, sink) {
  const t = setInterval(() => {
    if (bot && bot.entity && bot.entity.position) {
      const y = bot.entity.position.y;
      if (sink) sink.push(Math.round(y));
      console.log('[botpos] y=' + y.toFixed(1) + ' ground=' + (bot.entity.onGround ? 1 : 0));
    }
  }, ms);
  return () => clearInterval(t);
}

async function perchBot() {
  await cmd('tp ' + A + ' ' + BOT_TOP, 600);
  await protectBot();
  await sleep(2500); // landing settle
  if (bot && bot.entity) bot.entity.onGround = true; // nudge the client flag
}

/** melt 证据笔：3×3 雪地板＋2 高围墙 1×1 内格（r3 trap 5 修：tp 半格坐标
 *  floor 后撞墙柱＝burner 自格圆石＝melt 表 false 静默——tp 内格中心）。 */
async function buildMeltPen() {
  await cmd('fill -41 66 239 -39 66 241 minecraft:snow', 900);
  await cmd('fill -41 67 239 -41 68 241 minecraft:cobblestone', 700);
  await cmd('fill -39 67 239 -39 68 241 minecraft:cobblestone', 700);
  await cmd('fill -41 67 239 -39 68 239 minecraft:cobblestone', 700);
  await cmd('fill -41 67 241 -39 68 241 minecraft:cobblestone', 700);
}

/** W1 树面臂：树＋塔＋bot 栖塔顶＋着火僵尸钉扎树西 3.5 格，50s 窗。 */
async function treeArm(k) {
  await buildTree();
  await perchBot();
  await summonZombie(ZOMBIE_TREE);
  const ys = [];
  const stopWatch = watchBotY(1000, ys);
  try {
    await pinBurner(-66.5, 67, 240.5, 5, 10000);
  } finally { stopWatch(); }
  await guardBot();
  const rows = since(k);
  return {
    n: treeStarts(rows).length,
    probes: treeProbes(rows).length,
    countdownSet: fireCountdownSet(rows).length,
    roll001: fireRolls(rows, '0.01').length,
    roll00125: fireRolls(rows, '0.00125').length,
    igniteN: fireIgnite(rows).length, meltN: fireMelt(rows).length,
    botposMinY: ys.length ? Math.min.apply(null, ys) : null,
    rows: treeStarts(rows).slice(0, 3).concat(fireCountdownSet(rows).slice(0, 2)).concat(fireRolls(rows, '0.01').slice(0, 2)),
  };
}

/** W2 火面臂：melt 笔＋着火僵尸钉入内格（resting block＝雪），80s 窗。 */
async function meltArm(k) {
  await buildMeltPen();
  await summonZombie(MELT_CELL);
  await pinBurner(-39.5, 67, 240.5, 8, 10000);
  await guardBot();
  const rows = since(k);
  return {
    meltN: fireMelt(rows).length,
    roll00125: fireRolls(rows, '0.00125').length,
    roll001: fireRolls(rows, '0.01').length,
    igniteN: fireIgnite(rows).length,
    samples: fireMelt(rows).slice(0, 3),
  };
}

/** W3 旗断臂：旗关 boot 里同一树面 30s，tree/fire 双面必须全零。 */
async function flagOffArm(k) {
  await buildTree();
  await perchBot();
  await summonZombie(ZOMBIE_TREE);
  await sleep(30000);
  const rows = since(k);
  return {
    treeN: treeRows(rows).length,
    fireN: fireRows(rows).length,
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
    ev.arms.a1 = await treeArm(k);
    console.log('[a1]', JSON.stringify({ n: ev.arms.a1.n, cd: ev.arms.a1.countdownSet, r001: ev.arms.a1.roll001, probes: ev.arms.a1.probes, botposMin: ev.arms.a1.botposMinY }));
    await sweepMobs();
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await meltArm(k);
    console.log('[a2]', JSON.stringify({ melt: ev.arms.a2.meltN, r00125: ev.arms.a2.roll00125, ignite: ev.arms.a2.igniteN }));
    await sweepMobs();
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
    console.log('[b1]', JSON.stringify({ tree: ev.arms.b1.treeN, fire: ev.arms.b1.fireN }));
    await sweepMobs();
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
  const w1 = a1.n >= 1 && a1.countdownSet >= 1 && a1.roll001 >= 1 && a1.probes >= 1;
  const w2 = a2.meltN >= 1;
  const w3 = b1.treeN === 0 && b1.fireN === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins[0].releaseSha === EXPECTED_SHA
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL',
    w3: w3 ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',
  };
  const bad = !(w0 && w1 && w2 && w3 && w4);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1n: a1.n, a1cd: a1.countdownSet, a1r001: a1.roll001, a1probes: a1.probes, a1botposMin: a1.botposMinY,
    a2melt: a2.meltN, a2r00125: a2.roll00125, a2ignite: a2.igniteN,
    b1tree: b1.treeN, b1fire: b1.fireN,
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
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
