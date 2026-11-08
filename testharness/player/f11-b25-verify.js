#!/usr/bin/env node
/**
 * f11-b25-verify.js — R196 lava-egress arm (B-25: EntityAIGetOutOfLava,
 * seated on the 1.12 nether pigman) smoke driver. Judge conventions from
 * the B-19..B-24 line: two boots (flag on / flag off), driver-managed
 * world, cfg gates (livestockNeedsR196/farmDebugLog/mobDebugLog true;
 * mobDespawnR196 false — the B-19 r5 lesson), [done] summary JSON.
 *
 * Arms:
 *   B1 (boot 1): build a 4x4 lava pool (floor y66, lava y67..68) on the
 *      studio pad, summon 4 pigmen INTO the lava, 60 s window -> >=1
 *      outoflava start row (the AI's=ejection to the solid bank).
 *   B2 (boot 2, flag off): same pool, 3 pigmen, 40 s -> ZERO outoflava
 *      rows (also zero probe rows — the flag gate sits before the probe).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b25-verify';
const WORLD = 'w-b25v';
const A = 'ETIM_F7';
const POOL = { x0: -74, x1: -71, z0: 240, z1: 243, y0: 67, y1: 68, floor: 66 };
const STAND = { x: -69, y: 68, z: 242 }; // dry bank east of the pool

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const lavaRows = (lines) => lines.filter((l) => l.indexOf('outoflava') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
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

async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 3, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  // the studio pad (B-19..B-24 pattern)
  await cmd('fill -78 66 238 -67 66 249 minecraft:cobblestone', 500);
  await cmd('fill -78 67 238 -67 70 249 minecraft:air', 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function buildLavaPool() {
  await cmd('kill @e[type=!player]', 500);
  await cmd('fill ' + POOL.x0 + ' 67 ' + POOL.z0 + ' ' + POOL.x1 + ' 70 ' + POOL.z1 + ' minecraft:air', 500);
  await cmd('fill ' + POOL.x0 + ' ' + POOL.floor + ' ' + POOL.z0 + ' ' + POOL.x1 + ' ' + POOL.floor + ' ' + POOL.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill ' + POOL.x0 + ' ' + POOL.y0 + ' ' + POOL.z0 + ' ' + POOL.x1 + ' ' + POOL.y1 + ' ' + POOL.z1 + ' minecraft:lava', 700);
  await sleep(600);
}

async function summonPigmen(n, wait) {
  for (let i = 0; i < n; i++) {
    const dx = (i % 2 === 0 ? 1 : -1) * (i % 3 === 0 ? 0 : 1);
    const dz = i - 2;
    await cmd('summon zombie_pigman ' + (POOL.x0 + 1 + dx + 0.5) + ' ' + (POOL.y0 + 1) + ' ' + (STAND.z + dz + 0.5), wait === undefined ? 600 : wait);
  }
}

async function sweep() {
  await cmd('kill @e[type=!player]', 600);
  await sleep(400);
}

(async () => {
  stampPin();
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, {
    livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // B1: pigmen in the lava pool -> egress rows
  {
    await buildLavaPool();
    const k = srv.all.length;
    await summonPigmen(5);
    await sleep(100000);
    const rows = lavaRows(since(k));
    ev.arms.b1 = { n: rows.length, rows: rows.slice(0, 6) };
    ev.arms.b1probes = since(k).filter((l) => l.indexOf('outoflava') >= 0 && l.indexOf(' probe-in ') >= 0).length;
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, {
    livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B2: same pool, flag off — zero rows
  {
    await buildLavaPool();
    const k = srv.all.length;
    await summonPigmen(3);
    await sleep(40000);
    ev.arms.b2 = {
      n: lavaRows(since(k)).length,
      probes: since(k).filter((l) => l.indexOf('outoflava') >= 0 && l.indexOf(' probe-in ') >= 0).length,
    };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }



  ev.verdicts = {
    w0: ev.boots.length === 2 && ev.stopBoots.length === 2
      && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
      && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',
    w1: ev.arms.b1.n >= 1 ? 'PASS' : 'FAIL',
    w2: ev.arms.b2.n === 0 && ev.arms.b2.probes === 0 ? 'PASS' : 'FAIL',
    w3: 'REPORT',
  };
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);

  console.log('[done] ' + JSON.stringify({
    b1: ev.arms.b1.n, b1rows: ev.arms.b1.rows, b1probes: ev.arms.b1probes,
    b2: ev.arms.b2.n, b2probes: ev.arms.b2.probes,
  }));
  // mineflayer keeps the loop alive; exit explicitly (B-16 run-1 lesson)
  setTimeout(() => process.exit(Object.values(ev.verdicts).some((v) => v === 'FAIL') ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) bot.quit(); } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(30000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 800);
});
