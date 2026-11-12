#!/usr/bin/env node
/**
 * f11-b36-smoke — B-36（EntityAIAvoidFire）烟测驱动
 *
 * 工装面（b33/b34/b35 钉死结论全复用）：
 *   - bot = creative 旁观（gamemode 1）；doFireTick false（火不蔓延不灭，setblock fire 常驻）。
 *   - 素召唤（无 Health NBT）；动物/雪人不加血。
 *   - 判行面（B-36 落码钉死）：[AILog] avoidfire src=<animal|snowman> probe-in inv=… burning=… flag=… entity=…
 *     （1/16）；[AILog] avoidfire src=… start fires=<n> bestSq=<d> speed=1.0 entity=…（mobDebugLog 门，setPath 成功）。
 *   - R196 判值：shouldExecute 1/10 门×20 poll/s → start 频次高；座位＝EntityAnimal 全族＋雪人
 *     （R196 基类 ctor 面，无 kind 门）；1/16 探针行只在旗开 boot 出现。
 *
 * 四臂：a1 animal（cow+pig 召火旁）／a2 snowman（雪人召火旁）／b1 flag-off（cow+雪人 火旁 30s 全零）。
 * 判据 bad = !(w0 && w1 && w2 && b1 && w4)；a1 start 频次只记不设上限。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b36-smoke';
const WORLD = 'w-b36a';
const A = 'ETIM_F7';
const RUN = 'r1';

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, stopBoots: [] };
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

/** 场地：台面＋围墙＋火不蔓延＋夜（避免白天混入 flee-sun 竞争面）；bot creative 旁观。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300); // 火不蔓延不灭（常驻火源）
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('weather clear', 400);
  await cmd('time set 18000', 300); // midnight — 夜间动物不进 flee-sun 面
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -45.5 67 240.5', 900); // 旁观位
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await sleep(1000);
}

/** 判行过滤：face 带空格（b31 定谳教训）。 */
const avoidRows = (lines) => lines.filter((l) => l.indexOf('[AILog] avoidfire ') >= 0);
const avoidStarts = (lines) => lines.filter((l) => l.indexOf('[AILog] avoidfire ') >= 0 && l.indexOf(' start ') >= 0);
const bySrc = (lines, fam) => lines.filter((l) => l.indexOf(' src=' + fam + ' ') >= 0);

/** a1 — animal 臂：火 -60 67 240＋cow -58/pig -58 67 241（距火 2 格＝gate 8/2 内）。 */
async function animalArm(k, waitMs) {
  await cmd('setblock -60 67 240 minecraft:fire', 700);
  await cmd('summon cow -58.5 67 240.5', 900);
  await cmd('summon pig -58.5 67 241.5', 900);
  await sleep(waitMs || 60000);
  const rows = since(k);
  const starts = bySrc(avoidStarts(rows), 'animal');
  return {
    n: starts.length,
    probes: bySrc(avoidRows(rows), 'animal').filter((l) => l.indexOf(' probe-in ') >= 0).length,
    rows: starts.slice(0, 2),
  };
}

/** a2 — snowman 臂：火 -50 67 241＋雪人 -48 67 241.5（距火 2 格）。 */
async function snowmanArm(k, waitMs) {
  await cmd('setblock -50 67 241 minecraft:fire', 700);
  await cmd('summon snowman -48.5 67 241.5', 900);
  await sleep(waitMs || 60000);
  const rows = since(k);
  const starts = bySrc(avoidStarts(rows), 'snowman');
  return {
    n: starts.length,
    probes: bySrc(avoidRows(rows), 'snowman').filter((l) => l.indexOf(' probe-in ') >= 0).length,
    rows: starts.slice(0, 2),
  };
}

/** b1 — 旗断双零面（cow+雪人 火旁 30s）。 */
async function flagOffArm(k, waitMs) {
  await cmd('setblock -60 67 240 minecraft:fire', 700);
  await cmd('summon cow -58.5 67 240.5', 900);
  await cmd('summon snowman -58.5 67 241.5', 900);
  await sleep(waitMs || 30000);
  const rows = since(k);
  return { animalN: bySrc(avoidStarts(rows), 'animal').length, snowmanN: bySrc(avoidStarts(rows), 'snowman').length, total: avoidRows(rows).length };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开（a1 + a2） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.a1 = await animalArm(k);
    console.log('[a1]', JSON.stringify({ n: ev.arms.a1.n, probes: ev.arms.a1.probes, rows: ev.arms.a1.rows }));
    await cmd('kill @e[type=!player]', 600);
    await cmd('setblock -60 67 240 minecraft:air', 500); // 清 a1 火，防混入 a2 判面
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await snowmanArm(k);
    console.log('[a2]', JSON.stringify({ n: ev.arms.a2.n, probes: ev.arms.a2.probes, rows: ev.arms.a2.rows }));
    await cmd('kill @e[type=!player]', 600);
    await cmd('setblock -50 67 241 minecraft:air', 500);
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
    await cmd('setblock -60 67 240 minecraft:air', 500);
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);
  stampPin();

  const a1 = ev.arms.a1 || {}, a2 = ev.arms.a2 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1 = (a1.n || 0) >= 1 && (a1.probes || 0) >= 1;
  const w2 = (a2.n || 0) >= 1;
  const b1z = (b1.total || 0) === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = { w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL', b1: b1z ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL' };
  const bad = !(w0 && w1 && w2 && b1z && w4);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1n: a1.n, a1probes: a1.probes, a2n: a2.n, a2probes: a2.probes,
    b1animal: b1.animalN, b1snowman: b1.snowmanN, b1total: b1.total,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, b1: ev.verdicts.b1, w4: ev.verdicts.w4,
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
