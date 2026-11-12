#!/usr/bin/env node
/**
 * f11-b35-smoke — B-35（MoveToRepairItem：skeleton bone / snowman snowball
 * 修理索拾臂）烟测驱动。
 *
 * 与 f11-b34-smoke.js 同一套已验证工装面（b31 r2→r12 / b33 r1→r6 / b34 r1→r4
 * 逐轮钉死）：全部放置/testfor 走 console 绝对坐标，bot 只当旁观目标面。
 *
 * 臂设计（摸底 §5，playground/audit/movetorepairitem-立项摸底.md）：
 *   - w1 skeleton 臂：低血骨架（Health:6f / max 20）＋ 地上骨头 item 距 1 格
 *     → 1/40 roll → repairseek start → 进盒拾取 → heal 10.00（max*0.5）
 *       ＋ cooldown=400；判据 start>=1 ∧ pickup>=1。
 *   - w2 snowman 臂：低血雪人（Health:2f / max 4）＋ 雪球 item →
 *     heal 2.00；判据 pickup>=1。
 *   - b1 旗断臂：双 mob＋双 item 各 30s → 判行/拾取全零。
 *   - 夜窗（time set 18000）＝骨架不燃；weather clear＝雪人不淋雨伤；
 *     bot creative＝不被瞄准（b33 定谳 EntityAITarget disableDamage 面）。
 *
 * 判据行（全服务端日志）：
 *   [AILog] repairseek src=skeleton|snowman start|reset — B-35 seek 面
 *   [RepairLog] pickup heal=… hp=… cooldown=400 item=… — B-35 拾取面
 *
 * bad = w1(start>=1 ∧ pickup>=1) ∧ w2(pickup>=1) ∧ b1 双零
 *       && mixinFail==0 x2；heal/hp 数值只记（数值面随 maxHealth 走）。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b35-smoke';
const RUN = 'r2';
const WORLD = 'w-b35a';
const A = 'ETIM_F7';

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const sha256 = L.sha256;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

/** props 归一化（b31/b33/b34 同口径：去 # 注释行去空行 LF 连接取 sha256；raw 只记不判）。 */
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

/** 场地：围墙台面（b33/b34 形）；bot creative（修理面不需要受击目标）。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500); // CREATIVE — the repair face needs no attack target
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('weather clear', 400); // 雪人淋雨伤面
  await cmd('time set 18000', 300); // midnight — 骨架日光燃面消失
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -60.5 67 240.5', 900);
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  // 2 高围墙四连（b33 r2 面：防 mob 走缘坠湖）
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await cmd('tp ' + A + ' -45.5 67 240.5', 700); // bot 挪离双 mob 位（旁观位）
}

/** 判行过滤器：face 带空格（b31 定谳——"breakdoor" 本身含 break 的教训）。 */
const seekRows = (lines) => lines.filter((l) => l.indexOf('AILog] repairseek ') >= 0);
const seekStarts = (lines) => lines.filter((l) => l.indexOf('AILog] repairseek ') >= 0 && l.indexOf(' start ') >= 0);
const pickups = (lines) => lines.filter((l) => l.indexOf('[RepairLog] pickup ') >= 0);
const bySrc = (lines, src) => {
  const s = ' src=' + src + ' ';
  return lines.filter((l) => l.indexOf(s) >= 0);
};

/** r2 — 素召唤（无 Health NBT，ETIM 健康管线会把 NBT Health 并进 max 致 hp==max，r1 破案）＋ wither I 4s 伤 2 HP＋entitydata 取证。 */
async function summonRepairPair(mob, x, z, itemId, ix) {
  await cmd(`summon ${mob} ${x} 67 ${z} {PersistenceRequired:1b}`, 900);
  await cmd(`entitydata @e[type=${mob},c=1] {}`, 900); // 取证A：满血态（Health/Attributes 真值）
  await cmd(`effect @e[type=${mob}] minecraft:wither 4 0`, 900); // wither I 4s＝80t → 2 伤 tick（2s/4s）
  await sleep(5000);
  await cmd(`entitydata @e[type=${mob},c=1] {}`, 900); // 取证B：低血态（hp<max 必真）
  await cmd(`summon item ${ix} 67 ${z} {Item:{id:"${itemId}",Count:1b},PickupDelay:0s,Age:-32768s}`, 900);
}

/** w1 — skeleton 臂：低血骨架 ＋ 骨头（距 1 格）→ repairseek start → pickup heal 10。 */
async function skeletonArm(k, waitMs) {
  await summonRepairPair('skeleton', '-60', '240.5', 'minecraft:bone', '-59.5');
  await sleep(waitMs || 40000);
  const rows = since(k);
  const starts = bySrc(seekStarts(rows), 'skeleton');
  const picks = bySrc(pickups(rows), 'skeleton');
  return {
    n: starts.length,
    pickups: picks.length,
    heal: picks.map((l) => / heal=([-\d.]+)/.exec(l)).filter(Boolean).map((m) => m[1]).slice(0, 3),
    hp: picks.map((l) => / hp=([-\d.]+)/.exec(l)).filter(Boolean).map((m) => m[1]).slice(0, 3),
    rows: starts.slice(0, 2).concat(picks.slice(0, 2)),
  };
}

/** w2 — snowman 臂：低血雪人 ＋ 雪球 → pickup heal 2。 */
async function snowmanArm(k, waitMs) {
  await summonRepairPair('snowman', '-55', '240.5', 'minecraft:snowball', '-54.5');
  await sleep(waitMs || 40000);
  const rows = since(k);
  const starts = bySrc(seekStarts(rows), 'snowman');
  const picks = bySrc(pickups(rows), 'snowman');
  return {
    n: starts.length,
    pickups: picks.length,
    heal: picks.map((l) => / heal=([-\d.]+)/.exec(l)).filter(Boolean).map((m) => m[1]).slice(0, 3),
    hp: picks.map((l) => / hp=([-\d.]+)/.exec(l)).filter(Boolean).map((m) => m[1]).slice(0, 3),
    rows: starts.slice(0, 2).concat(picks.slice(0, 2)),
  };
}

/** b1 — 旗断臂：双 mob ＋ 双 item 各 30s，判行/拾取全零。 */
async function flagOffArm(k, waitMs) {
  await summonRepairPair('skeleton', '-60', '240.5', 'minecraft:bone', '-59.5');
  await summonRepairPair('snowman', '-55', '240.5', 'minecraft:snowball', '-54.5');
  await sleep(waitMs || 30000);
  const rows = since(k);
  return {
    skelN: bySrc(seekRows(rows), 'skeleton').length,
    snowN: bySrc(seekRows(rows), 'snowman').length,
    pickupN: pickups(rows).length,
  };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开（w1 skeleton + w2 snowman） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.w1 = await skeletonArm(k);
    console.log('[w1]', JSON.stringify({ n: ev.arms.w1.n, pickups: ev.arms.w1.pickups, heal: ev.arms.w1.heal, hp: ev.arms.w1.hp }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.w2 = await snowmanArm(k);
    console.log('[w2]', JSON.stringify({ n: ev.arms.w2.n, pickups: ev.arms.w2.pickups, heal: ev.arms.w2.heal, hp: ev.arms.w2.hp }));
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

  const w1 = ev.arms.w1 || {}, w2 = ev.arms.w2 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1ok = (w1.n || 0) >= 1 && (w1.pickups || 0) >= 1;
  const w2ok = (w2.pickups || 0) >= 1;
  const b1ok = (b1.skelN || 0) === 0 && (b1.snowN || 0) === 0 && (b1.pickupN || 0) === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: w0 ? 'PASS' : 'FAIL', w1: w1ok ? 'PASS' : 'FAIL', w2: w2ok ? 'PASS' : 'FAIL',
    b1: b1ok ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',
  };
  const bad = !(w0 && w1ok && w2ok && b1ok && w4);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    w1n: w1.n, w1pickups: w1.pickups, w1heal: w1.heal, w1hp: w1.hp,
    w2n: w2.n, w2pickups: w2.pickups, w2heal: w2.heal, w2hp: w2.hp,
    b1skel: b1.skelN, b1snow: b1.snowN, b1pickups: b1.pickupN,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, b1: ev.verdicts.b1, w4: ev.verdicts.w4,
    propsNorm: `${ev.propsNormBefore}/${ev.propsNormAfter}`,
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
