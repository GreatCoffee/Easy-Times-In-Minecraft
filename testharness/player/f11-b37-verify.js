#!/usr/bin/env node
/**
 * f11-b37-verify — W-B37 判窗驱动（SeekFiringPosition）
 *
 * 四窗（照 b31/b33/b34/b35/b36 verify 惯例）：
 *   W0 双 boot 干净（mixinFail=0 ＋ Done( ＋ stop {0,true,true}）。
 *   W1 a1 seek 臂：firingpos start（src=skeleton）≥1 且 probe-in ≥1（vantage 挡墙几何）。
 *   W2 b1 旗断面：firingpos 行 total=0。
 *   W3/W4 双 [PIN] 同 releaseSha（=EXPECTED_SHA，b37-build1）＋mk.ok ＋ propsNorm 起收同（raw 只记）＋level 还原。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b37-verify';
const WORLD = 'w-b37v';
const A = 'ETIM_F7';
const EXPECTED_SHA = '23B822B3AAD8099125C0E6D702CC1BEEFA68F49EC3E38672A2EDB50CD0DAA03E';

const SKELETON_HOME = '-61.5 67 240.5'; // 墙西钉扎位
const BOT_PERCH = '-57.5 67 240.5'; // 判窗室内

const ev = { run: 'verify', tag: TAG, pins: [], boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const sha256 = L.sha256;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

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
  props = /level-name=/.test(props) ? L.setProp(props, 'level-name', world) : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held — aborting, no collide boot');
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

async function stageArena(perch) {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('weather clear', 400);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' ' + perch, 900);
  await sleep(2000);
  try { if (bot.entity && bot.entity.onGround === false) bot.entity.onGround = true; } catch (e) { /* noop */ }
  await cmd('fill -74 60 230 -30 65 250 minecraft:cobblestone', 1500); // solid base under arena (r9 diag fix: void trials plunge 8 into air, die on pad underside)
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await sleep(1000);
  // 判窗室（r5 几何）：bot 封 3×3 石室，东面 1×1 窗 (-57,68,240)；骨架钉墙西 -61.5。
  await cmd('fill -59 66 239 -59 71 241 minecraft:cobblestone', 700); // west face
  await cmd('fill -57 66 239 -57 71 241 minecraft:cobblestone', 700); // east face
  await cmd('fill -59 66 239 -57 71 239 minecraft:cobblestone', 700); // south face
  await cmd('fill -59 66 241 -57 71 241 minecraft:cobblestone', 700); // north face
  await cmd('fill -59 71 239 -57 71 241 minecraft:cobblestone', 700); // roof
  await cmd('setblock -57 67 240 minecraft:air', 500); // east window lower course (r6 fix: center-point ray ≈67.96 hits y67 course)
  await cmd('setblock -57 68 240 minecraft:air', 500); // east window (eye-level)
  await cmd('tp ' + A + ' ' + perch, 900);
  await sleep(1500);
}

const fpRows = (lines) => lines.filter((l) => l.indexOf('[AILog] firingpos ') >= 0);
const fpStarts = (lines) => lines.filter((l) => l.indexOf('[AILog] firingpos ') >= 0 && l.indexOf(' start ') >= 0);
const bySrc = (lines, fam) => lines.filter((l) => l.indexOf(' src=' + fam + ' ') >= 0);

/** 钉扎：每 2s tp 骨架回墙西家位（防 wander 越室东行见 bot→stand fast 永锁，r3/r4 教训）。 */
async function pinSkeleton(waitMs) {
  const end = Date.now() + waitMs;
  while (Date.now() < end) {
    await cmd('tp @e[type=skeleton] ' + SKELETON_HOME, 2000);
  }
}

async function seekArm(k, waitMs) {
  await cmd('summon skeleton ' + SKELETON_HOME + ' {PersistenceRequired:1b}', 900);
  await cmd('replaceitem entity @e[type=skeleton] slot.weapon.mainhand minecraft:bow 1', 900);
  await pinSkeleton(waitMs || 60000);
  const rows = since(k);
  const starts = bySrc(fpStarts(rows), 'skeleton');
  return {
    n: starts.length,
    probes: bySrc(fpRows(rows), 'skeleton').filter((l) => l.indexOf(' probe-in ') >= 0).length,
    rows: starts.slice(0, 3),
  };
}

async function flagOffArm(k, waitMs) {
  await cmd('summon skeleton ' + SKELETON_HOME + ' {PersistenceRequired:1b}', 900);
  await cmd('replaceitem entity @e[type=skeleton] slot.weapon.mainhand minecraft:bow 1', 900);
  await pinSkeleton(waitMs || 30000);
  const rows = since(k);
  return { n: bySrc(fpStarts(rows), 'skeleton').length, total: bySrc(fpRows(rows), 'skeleton').length };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开（a1） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena(BOT_PERCH);

  {
    const k = srv.all.length;
    ev.arms.a1 = await seekArm(k);
    console.log('[a1]', JSON.stringify({ n: ev.arms.a1.n, probes: ev.arms.a1.probes, rows: ev.arms.a1.rows }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗断（b1） ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena(BOT_PERCH);

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

  const a1 = ev.arms.a1 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1 = (a1.n || 0) >= 1 && (a1.probes || 0) >= 1;
  const w2 = (b1.total || 0) === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins[0].releaseSha === EXPECTED_SHA
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  const propsOk = ev.propsNormBefore === ev.propsNormAfter && ev.propsLevelBefore === 'w-b30v' && ev.propsLevelAfter === 'w-b30v';
  ev.verdicts = { w0, w1, w2, w4, propsOk };
  const bad = !(w0 && w1 && w2 && w4 && propsOk);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1n: a1.n, a1probes: a1.probes, b1n: b1.n, b1total: b1.total,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: w0, w1: w1, w2: w2, w4: w4, propsOk: propsOk,
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
