#!/usr/bin/env node
/**
 * f11-b35-verify — B-35（MoveToRepairItem）判窗驱动
 * （会话七执行，gen 后待主会话发令）。
 *
 * 工装面沿用 f11-b35-smoke.js r1→r4 钉死的结论：
 *   - bot = creative 旁观（gamemode 1，b33 定谳：creative 不被瞄准——骨架
 *     NearestAttackableTarget 走 disableDamage 门，不射 bot）；bot 停 -45.5。
 *   - hp<max 制造 = 素召唤（无 Health NBT，ETIM 骨架平衡表自设 max=6／雪人 4）
 *     ＋ wither I 4s（80t→−2 HP，undead 不可 instant_damage）→ sleep 5s。
 *   - 判行面（r2→r4 三轮钉死）：[AILog] repairseek src=<skeleton|snowman> start
 *     item=… hp=…/max=… dist=… entity=… ；[RepairLog] pickup src=… heal=… hp=…
 *     cooldown=400 item=…（item= shrink 前捕获）；reset cooldown=… targetDead=…。
 *   - 走臼（r4 骨架 dist=6.06／雪人 dist=3.71 双证）：item 召唤在骨架 3.5 格外
 *     → A* 非零路 → start → walk → 进盒拾取。
 *   - at-target 臂（r3 破案→b35-build3 产品修；W-B35 r1 又破案＝execute 落点后 mob
 *     漫游走开 5.49 格致时序不保证）→ v2＝1×1 圈栏锁位：mob 困死在 item 同格，
 *     dist≡0，roll 命中即 start(dist<1.0)＋即时拾取。
 *
 * 判窗世界 w-b35v（新，smoke 世界 w-b35a 已污染；props 归一化口径判，
 * 原始 hash 只记不判——1.12 Properties 时间戳注释行必漂，C-B31 第 1 条）。
 *
 * 判窗口径（六面）：
 *   W0 boot 卫生 = 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 exitCode=0 ∧ build=true ×2
 *   W1 骨架走臼   = a1 start≥1 ∧ pickup≥1（dist>1 面只记）
 *   W2 at-target  = a2 start(dist<1.0)≥1 ∧ pickup≥1（b35-build3 产品修的正判）
 *   W3 雪人走臼   = a3 pickup≥1（heal=2.00=max*0.5 面）
 *   W4 旗断双零   = b1 repairN=0 ∧ pickupN=0
 *   W5 钉值       = 双 [PIN] 同 releaseSha＝946E246D…9E48CC92E（显式期望值）
 *                   ∧ mk.ok===true（MK 100/228/456／98+10）
 * 判据只认服务端日志（build-logs/<tag>-b{1,2}.out）。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b35-verify';
const WORLD = 'w-b35v';
const A = 'ETIM_F7';
const EXPECTED_SHA = '946E246D073838E181486223967EBE9BEDEC64FA373EA0D466B23E69E48CC92E';

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const sha256 = L.sha256;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

/** props 归一化（b31/b33/b34/b35 smoke 同口径：去 # 注释行去空行 LF 连接取 sha256；raw 只记不判）。 */
function propsNorm(file) {
  const t = fs.readFileSync(file, 'utf8');
  return sha256(Buffer.from(t.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#')).join('\n'), 'utf8'));
}
function propsRaw(file) { return sha256(fs.readFileSync(file)); }
function propsLevel(file) {
  const m = /^level-name=(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : '(none)';
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

/** 场地：围墙台面（b33/b35 smoke 同形），bot creative 旁观。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500); // creative — 骨架 targetTasks 走 disableDamage 门，不瞄准 bot
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('weather clear', 400); // 雪人不淋雨
  await cmd('time set 18000', 300); // midnight — 夜间骨架不燃
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -45.5 67 240.5', 900); // 旁观位（r4 同款，距臂位 9-14 格不干扰拾取）
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await sleep(1000);
}

/** 判行过滤器：face 带空格（b31 定谳——"repairseek"/"pickup" 子串歧义教训）。 */
const seekRows = (lines) => lines.filter((l) => l.indexOf('[AILog] repairseek ') >= 0);
const seekStarts = (lines) => lines.filter((l) => l.indexOf('[AILog] repairseek ') >= 0 && l.indexOf(' start ') >= 0);
const pickupRows = (lines) => lines.filter((l) => l.indexOf('[RepairLog] pickup ') >= 0);
const pickBySrc = (lines, fam) => pickupRows(lines).filter((l) => l.indexOf(' src=' + fam + ' ') >= 0);
const startBySrc = (lines, fam) => seekStarts(lines).filter((l) => l.indexOf(' src=' + fam + ' ') >= 0);
const distOf = (l) => { const m = / dist=([0-9.]+)/.exec(l); return m ? parseFloat(m[1]) : -1; };

/** 素召唤 + wither 4s 低血化（r2→r4 钉死：undead 不可 instant_damage）。 */
async function makeLowHpMob(kind, x, z) {
  await cmd(`summon ${kind} ${x} 67 ${z}`, 900);
  await cmd(`effect @e[type=${kind}] minecraft:wither 4 0`, 500);
  await sleep(5000); // wither I 80t → −2 HP
  await cmd(`entitydata @e[type=${kind},c=1] {}`, 500); // 取证 hp/max（只记）
}

/** a1 — 骨架走臼臂：item 召在骨架 3.5 格东 → A* 非零路 → start → walk → 拾取。 */
async function skeletonWalkArm(k, waitMs) {
  await makeLowHpMob('skeleton', -60, 240);
  await cmd('summon item -56.5 67 240.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s,Age:-32768s}', 900);
  await sleep(waitMs || 60000);
  const rows = since(k);
  const starts = startBySrc(rows, 'skeleton');
  const picks = pickBySrc(rows, 'skeleton');
  return {
    n: starts.length, pickups: picks.length,
    dists: starts.map(distOf), heal: picks.map((l) => { const m = /heal=([0-9.]+)/.exec(l); return m ? m[1] : '?'; }),
    rows: starts.slice(0, 2).concat(picks.slice(0, 1)),
  };
}

/** a2 — at-target 臂（确定性 v2：1×1 圈栏锁位）。
 * W-B35 r1 破案：item 落点＝mob 当时站位，mob 在 roll 命中前漫游走开（r1 实测 6s 走 5.49 格）→
 * 「求值瞬间同格」时序不可保证。改圈栏：四墙 y67..68 围死中心格 (-62,240)＝-61.5 67 240.5，
 * mob 困在格内 dist≡0，1/40 roll 命中即 at-target start(dist<1.0)＋即时拾取。
 * 若圈栏内仍零 start(dist<1.0) → 才是产品面 bug（升 D 位）。
 */
async function atTargetArm(k, waitMs) {
  await cmd('fill -63 67 239 -61 68 239 minecraft:cobblestone', 700);
  await cmd('fill -63 67 241 -61 68 241 minecraft:cobblestone', 700);
  await cmd('fill -63 67 239 -63 68 241 minecraft:cobblestone', 700);
  await cmd('fill -61 67 239 -61 68 241 minecraft:cobblestone', 700);
  await cmd('summon skeleton -61.5 67 240.5', 900);
  await cmd('effect @e[type=skeleton] minecraft:wither 4 0', 500);
  await sleep(5000); // wither I 80t → −2 HP
  await cmd('entitydata @e[type=skeleton,c=1] {}', 500); // 取证（只记）
  await cmd('summon item -61.5 67 240.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s,Age:-32768s}', 900);
  await sleep(waitMs || 60000);
  const rows = since(k);
  const starts = startBySrc(rows, 'skeleton');
  const atTarget = starts.filter((l) => distOf(l) >= 0 && distOf(l) < 1.0);
  const picks = pickBySrc(rows, 'skeleton');
  return {
    n: starts.length, atN: atTarget.length, pickups: picks.length,
    dists: starts.map(distOf),
    rows: starts.slice(0, 2).concat(picks.slice(0, 1)),
  };
}

/** a3 — 雪人走臼臂（r4 回归）：item 召在雪人 3.5 格东。 */
async function snowmanWalkArm(k, waitMs) {
  await makeLowHpMob('snowman', -60, 240);
  await cmd('summon item -56.5 67 240.5 {Item:{id:"minecraft:snowball",Count:1b},PickupDelay:0s,Age:-32768s}', 900);
  await sleep(waitMs || 60000);
  const rows = since(k);
  const starts = startBySrc(rows, 'snowman');
  const picks = pickBySrc(rows, 'snowman');
  return {
    n: starts.length, pickups: picks.length,
    heal: picks.map((l) => { const m = /heal=([0-9.]+)/.exec(l); return m ? m[1] : '?'; }),
    rows: starts.slice(0, 2).concat(picks.slice(0, 1)),
  };
}

/** b1 — 旗断双零面（双 mob 双 item 30s，零判行零拾取）。 */
async function flagOffArm(k, waitMs) {
  await cmd('summon skeleton -60 67 240.5', 900);
  await cmd('summon item -56.5 67 240.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s,Age:-32768s}', 700);
  await cmd('summon snowman -60 67 243.5', 900);
  await cmd('summon item -56.5 67 243.5 {Item:{id:"minecraft:snowball",Count:1b},PickupDelay:0s,Age:-32768s}', 700);
  await sleep(waitMs || 30000);
  const rows = since(k);
  return { repairN: seekRows(rows).length, pickupN: pickupRows(rows).length };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开（a1 走臼 + a2 at-target + a3 雪人） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.a1 = await skeletonWalkArm(k);
    console.log('[a1]', JSON.stringify({ n: ev.arms.a1.n, pickups: ev.arms.a1.pickups, dists: ev.arms.a1.dists, heal: ev.arms.a1.heal }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await atTargetArm(k);
    console.log('[a2]', JSON.stringify({ n: ev.arms.a2.n, atN: ev.arms.a2.atN, pickups: ev.arms.a2.pickups, dists: ev.arms.a2.dists }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a3 = await snowmanWalkArm(k);
    console.log('[a3]', JSON.stringify({ n: ev.arms.a3.n, pickups: ev.arms.a3.pickups, heal: ev.arms.a3.heal }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗断（b1 双零） ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.b1 = await flagOffArm(k);
    console.log('[b1]', JSON.stringify(ev.arms.b1));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);

  stampPin();

  const a1 = ev.arms.a1 || {}, a2 = ev.arms.a2 || {}, a3 = ev.arms.a3 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1 = (a1.n || 0) >= 1 && (a1.pickups || 0) >= 1;
  const w2 = (a2.atN || 0) >= 1 && (a2.pickups || 0) >= 1; // at-target 臂＝b35-build3 产品修正判
  const w3 = (a3.pickups || 0) >= 1; // start 面由 a1/a2 同构证明；heal 面只记
  const w4 = (b1.repairN || 0) === 0 && (b1.pickupN || 0) === 0;
  const w5 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins[0].releaseSha === EXPECTED_SHA
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL',
    w3: w3 ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL', w5: w5 ? 'PASS' : 'FAIL',
    w2note: 'at-target arm = the b35-build3 product fix (standing on the item: A* null -> box intersect -> start(dist<1.0) + immediate pickup); deterministic via execute-at-skeleton-pos',
  };
  const bad = !(w0 && w1 && w2 && w3 && w4 && w5);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1n: a1.n, a1pickups: a1.pickups, a1dists: a1.dists, a1heal: a1.heal,
    a2n: a2.n, a2atN: a2.atN, a2pickups: a2.pickups, a2dists: a2.dists,
    a3n: a3.n, a3pickups: a3.pickups, a3heal: a3.heal,
    b1repair: b1.repairN, b1pickup: b1.pickupN,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, w3: ev.verdicts.w3, w4: ev.verdicts.w4, w5: ev.verdicts.w5,
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
