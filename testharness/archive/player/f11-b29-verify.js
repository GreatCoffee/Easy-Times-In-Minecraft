#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b29-verify';
const WORLD = 'w-b29v';
const A = 'ETIM_F7';

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

// panic face row = the kernel start line, per-instance probe rows excluded
const panicRows = (lines) => lines.filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);
const aliveRows = (lines, name) => lines.filter((l) => l.indexOf('[' + name + '] BOOTALIVE') >= 0);

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

/**
 * r14-r16 定谳三修（全部照搬烟测终形）：①bot 先 tp 进场（玩家在场 =
 * chunk loaded），fill/summon 全部 /execute 相对 bot 坐标——绝对坐标链废弃；
 * ②selector 限幅键 = 1.12 原生 c=1（matchOneEntity 恰好一遇才返回，
 * limit=/sort= 是 1.13 键）；③punch 前先发 BOOTALIVE 活体探针，把
 * 「存活层破」与「匹配层破」切分，证词直接进日志。
 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 1, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('tp ' + A + ' -69.5 67 242.5', 700);
  await sleep(2000);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 minecraft:cobblestone', 700);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~ ~-5 ~5 ~4 ~5 minecraft:air', 700);
  await sleep(2500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('effect ' + A + ' minecraft:invisibility 1000000 0 true', 500);
  console.log('[botpos]', A, 'staged', JSON.stringify(bot.entity.position));
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

/**
 * bot left-clicks exactly ONE mob of the given type: BOOTALIVE probe, then
 * /etest attack @e[type=X,r=8,c=1] sent BY the bot (sender = bot position).
 */
async function punchMob(mobType) {
  const name = mobType.charAt(0).toUpperCase() + mobType.slice(1).toLowerCase();
  console.log('[botpos]', A, JSON.stringify(bot.entity.position));
  bot.chat('/execute @e[type=' + name + ',r=8] ~ ~ ~ say BOOTALIVE');
  await sleep(1200);
  bot.chat('/etest attack @e[type=' + name + ',r=8,c=1]');
  await sleep(1500);
  const touched = since(0).filter((l) => l.indexOf('step=attack') >= 0 && l.indexOf(' target=') >= 0 && l.indexOf(name + '#') >= 0).length;
  const missing = since(0).filter((l) => l.indexOf('step=attack') >= 0 && l.indexOf('NO_TARGET') >= 0).length;
  return { touched, missing };
}

/** per-arm summon via bot-relative coordinates (r14 shape) */
async function summonArm(mobType, xs, zs) {
  for (let i = 0; i < xs.length; i++) {
    await cmd('execute ' + A + ' ~ ~ ~ summon ' + mobType + ' ~' + (xs[i] + 70) + ' ~ ~-1', 500);
  }
  await sleep(1200);
}

const COW_XS = [-73, -71, -70, -75];

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

(async () => {
  stampPin();
  // B29: the panic/flee family seat (MixinEntityAnimal four-livestock removeIf
  // vanilla EntityAIPanic + MixinEntityWolf add-only). Two boots; the R196
  // seat rides only under livestockNeedsR196.
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: cow panic arm — 4 cows, punch ONE each arm; R196 cow 1.6F flee face
  // (non-panic branch) must start; 45 s window
  {
    const k = srv.all.length;
    await summonArm('cow', COW_XS);
    await sleep(1000);
    ev.arms.a1 = Object.assign(await punchMob('cow'), { alive: aliveRows(since(k), 'Cow').length });
    await sleep(45000);
    const rows = panicRows(since(k));
    ev.arms.a1.n = rows.length;
    ev.arms.a1.rows = rows.slice(0, 6);
    ev.arms.a1.probes = since(k).filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf('probe-in') >= 0).length;
    await sweep();
  }

  // A2: chicken panic arm — punch one; R196 chicken 1.3F+0.2F panic branch
  {
    const k = srv.all.length;
    await summonArm('chicken', COW_XS);
    await sleep(1000);
    ev.arms.a2 = Object.assign(await punchMob('chicken'), { alive: aliveRows(since(k), 'Chicken').length });
    await sleep(45000);
    const rows = panicRows(since(k));
    ev.arms.a2.n = rows.length;
    ev.arms.a2.rows = rows.slice(0, 6);
    ev.arms.a2.probes = since(k).filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf('probe-in') >= 0).length;
    await sweep();
  }

  // A3: wolf chance-0 arm — punch one; R196 EntityWolf :39 = 1.0F/0.0F:
  // the FLEE face still rides (revenge prints a start row at panic=false,
  // speed=1.0F), but the PANIC branch is chance-0 shut: zero panic=true
  // rows. The punch must be evidenced (finite DamageLog row).
  {
    const k = srv.all.length;
    await summonArm('wolf', [-73, -71]);
    await sleep(1000);
    ev.arms.a3 = Object.assign(await punchMob('wolf'), { alive: aliveRows(since(k), 'Wolf').length });
    await sleep(20000);
    const rows = panicRows(since(k));
    ev.arms.a3.n = rows.length;
    ev.arms.a3.rows = rows.slice(0, 6);
    ev.arms.a3.panicTrue = rows.filter((l) => l.indexOf('panic=true') >= 0).length;
    ev.arms.a3.probes = since(k).filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf('probe-in') >= 0).length;
    ev.arms.a3.hurtRows = since(k).filter((l) => l.indexOf('DamageLog') >= 0 && l.indexOf('target=Wolf') >= 0 && l.indexOf('outOfWorld') < 0).length;
    await sweep();
  }
  await stopBoot();

  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();
  // B1: whole-family replay flag off — vanilla seat keeps its shape; zero rows
  {
    const k = srv.all.length;
    await summonArm('cow', COW_XS);
    await sleep(1000);
    ev.arms.b1 = Object.assign(await punchMob('cow'), { alive: aliveRows(since(k), 'Cow').length });
    await sleep(20000);
    const rows = panicRows(since(k));
    ev.arms.b1.n = rows.length;
    ev.arms.b1.rows = rows.slice(0, 6);
    ev.arms.b1.probes = since(k).filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf('probe-in') >= 0).length;
    await sweep();
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad = ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
      || ev.arms.a1.n < 1 || ev.arms.a2.n < 1
      || ev.arms.a3.panicTrue !== 0 || ev.arms.a3.n < 1 || ev.arms.a3.hurtRows < 1
      || ev.arms.b1.n !== 0 || ev.arms.b1.probes !== 0;
  ev.verdicts = {
    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',
    w1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',
    w2: ev.arms.a2.n >= 1 ? 'PASS' : 'FAIL',
    w3: ev.arms.a3.panicTrue === 0 && ev.arms.a3.n >= 1 && ev.arms.a3.hurtRows >= 1 ? 'PASS' : 'FAIL',
    w4: ev.arms.b1.n === 0 && ev.arms.b1.probes === 0 ? 'PASS' : 'FAIL',
  };
  stampPin();
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes, a1alive: ev.arms.a1.alive,
    a2: ev.arms.a2.n, a2rows: ev.arms.a2.rows, a2probes: ev.arms.a2.probes, a2alive: ev.arms.a2.alive,
    a3: ev.arms.a3.n, a3probes: ev.arms.a3.probes, a3alive: ev.arms.a3.alive, a3hurt: ev.arms.a3.hurtRows, a3panicTrue: ev.arms.a3.panicTrue,
    b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
  setTimeout(() => process.exit(process.exitCode), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
