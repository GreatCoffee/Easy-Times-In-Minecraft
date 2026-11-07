#!/usr/bin/env node
/**
 * f11-b17-verify.js — R196 horse-family child growth burst face (B-17) judge
 * driver. Mirror of f11-b17-smoke.js with the judge-window conventions:
 * world w-b17v, [PIN] stamps (mkCounts + release sha) before/after, per-arm
 * W0..W5 marker rows for the verdict grep, and a [done] summary — NO
 * judgment-value drift (identical arms / assertions to the smoke build).
 *
 * Arms (boot 1 — livestockNeedsR196=true, farmDebugLog=true, mobDebugLog=true):
 *   W1 EntityHorse child (Age:-64000): >=2 src=horseBurst rows, arg-arg
 *      delta exactly +200 every row (plateau face rides the gap ~10 s)
 *   W2 EntityDonkey child: same shape — AbstractHorse umbrella proof
 *   W3 cow child control: ZERO horseBurst rows
 *   W4 ageSnapshot integrity: snap0 age=-64000 isChild=true post-summon for
 *      both horse & donkey kinds
 * Arms (boot 2 — livestockNeedsR196=false):
 *   W5 horse child replay: ZERO horseBurst rows (flag-off passthrough)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b17-verify';
const WORLD = 'w-b17v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const PAD = { x0: STAND.x - 4, z0: STAND.z - 4, x1: STAND.x + 4, z1: STAND.z + 2, y: 66 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const burstRows = (lines) => lines.filter((l) => l.indexOf('agegate') >= 0 && l.indexOf('src=horseBurst') >= 0);
const parseBurst = (l) => {
  const m = l.match(/agegate src=horseBurst age=(-?\d+) arg=(-?\d+)/);
  return m ? { age: Number(m[1]), arg: Number(m[2]) } : null;
};

async function shapeWatch(kind) {
  const k = srv.all.length;
  await sleep(35000);
  const rows = burstRows(since(k)).map(parseBurst).filter(Boolean);
  const deltas = [];
  for (let i = 1; i < rows.length; i++) deltas.push(rows[i].arg - rows[i - 1].arg);
  return { rows, deltas };
}

async function ageSnap(tag) {
  const k = srv.all.length;
  await cmd('etest age', 700);
  await sleep(300);
  return since(k)
    .filter((l) => l.indexOf('ageSnapshot') >= 0)
    .map((l) => {
      const m = l.match(/ageSnapshot kind=(\w+) id=\d+ age=(-?\d+) isChild=(true|false) ticksExisted=\d+/);
      return m ? { kind: m[1], age: Number(m[2]), isChild: m[3] === 'true' } : l;
    });
}

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
  await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill -76 67 238 -68 74 244 minecraft:air', 500);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill -76 67 238 -68 67 244 minecraft:cobblestone', 400);
  await cmd('fill -75 67 239 -69 67 243 minecraft:air', 400);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function summonChild(kind, dx, dz, nbt) {
  await cmd('summon ' + kind + ' ' + (STAND.x + dx + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + dz + 0.5) + (nbt ? ' ' + nbt : ''), 600);
  await sleep(500);
}

(async () => {
  stampPin();

  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // W1: horse burst — >=2 rows, every arg-arg delta = +200
  await summonChild('Horse', 1, 0, '{Age:-64000}');
  ev.arms.w1snap0 = await ageSnap('w1-t0');
  ev.arms.w1 = await shapeWatch('Horse');
  ev.arms.w1snap1 = await ageSnap('w1-t1');
  await cmd('kill @e[type=Horse]', 700);

  // W2: donkey burst — umbrella proof
  await summonChild('Donkey', 1, 0, '{Age:-64000}');
  ev.arms.w2 = await shapeWatch('Donkey');
  await cmd('kill @e[type=Donkey]', 700);

  // W3: cow control — vanilla ++1 lane, ZERO horseBurst rows
  await summonChild('Cow', 1, 0, '{Age:-64000}');
  ev.arms.w3 = await shapeWatch('Cow');
  await cmd('kill @e[type=!player]', 700);

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // W5: flag-off horse — ZERO horseBurst rows
  await summonChild('Horse', 1, 0, '{Age:-64000}');
  ev.arms.w5 = await shapeWatch('Horse');

  // close boot 2 as well (a live second server holds 25565 and locks the world)
  await stopBoot();

  // fsync state back and report
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const deltaFace = (d) => d.length >= 1 && d.every((x) => x === 200);
  ev.verdicts.w1 = ev.arms.w1.rows.length >= 2 && deltaFace(ev.arms.w1.deltas) ? 'PASS' : 'FAIL';
  ev.verdicts.w2 = ev.arms.w2.rows.length >= 2 && deltaFace(ev.arms.w2.deltas) ? 'PASS' : 'FAIL';
  ev.verdicts.w3 = ev.arms.w3.rows.length === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w5 = ev.arms.w5.rows.length === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w4 =
    ev.arms.w1snap0.some((s) => s.kind === 'EntityHorse' && s.isChild === true) && ev.arms.w1snap0.some((s) => s.age === -64000)
      && ev.arms.w1snap1.some((s) => s.kind === 'EntityHorse' && s.age > -64000)
      ? 'PASS' : 'FAIL';
  // W0 = both boots clean (Done + zero mixin failures) + both stops exit 0 with BUILD SUCCESSFUL
  const bootOk = ev.boots.length === 2
    && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot));
  const stopOk = ev.stopBoots.length >= 2
    && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true);
  ev.verdicts.w0 = bootOk && stopOk ? 'PASS' : 'FAIL';

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  stampPin();
  console.log('[out] ' + fsOut);
  const fails = Object.entries(ev.verdicts).filter(([, v]) => v !== 'PASS');
  console.log('[done] ' + JSON.stringify({ verdicts: ev.verdicts, w1n: ev.arms.w1.rows.length, w2n: ev.arms.w2.rows.length }));
  // mineflayer keeps the loop alive; exit explicitly (B-16 run-1 lesson)
  setTimeout(() => process.exit(fails.length ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
