#!/usr/bin/env node
/**
 * f11-b17-smoke.js — R196 horse-family child growth burst face (B-17) smoke
 * driver. One flat world, two boots (flag on / flag off). The R196 face is
 * EntityAgeable.onLivingUpdate :81-84: a horse-kind CHILD does NOT take the
 * shared per-tick ++1 write — on the anti-clustering anchor
 * getTicksExistedWithOffset() % 200 == 0 (ticksExisted + entityId*47,
 * Entity.java:315-317) it takes ONE burst write of min(age + 200, 0) and
 * nothing on the other 199 ticks. Mean rate equals vanilla (the ledger's
 * "±10×" tag was a misreading), so the smoke checks the SHAPE, not the
 * mean: plateaus (0-delta polls between anchors) + ~200 jumps (an anchor
 * lands inside one poll gap).
 *
 * Arms (boot 1 — livestockNeedsR196=true, farmDebugLog=true):
 *   A1 EntityHorse child (Age:-64000): 25 s of 1-s Age polls — deltas in
 *      {0, +200..}; >=1 [FarmLog] agegate src=horseBurst row in-window
 *   A2 EntityDonkey child: same shape — the AbstractHorse umbrella proof
 *   A3 cow child control: deltas ~+20/s (vanilla ++1 path visually), 0
 *      horseBurst rows in-window (cow rides the non-horse else-branch)
 * Arms (boot 2 — livestockNeedsR196=false):
 *   B1 horse child replay: deltas ~+20/s, no plateau no jump, 0 rows
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b17-smoke';
const WORLD = 'w-b17a';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const PAD = { x0: STAND.x - 4, z0: STAND.z - 4, x1: STAND.x + 4, z1: STAND.z + 2, y: 66 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
const bc = async (line, wait) => { bot.chat('/' + line); await sleep(wait === undefined ? 700 : wait); };

const burstRows = (lines) => lines.filter((l) => l.indexOf('agegate') >= 0 && l.indexOf('src=horseBurst') >= 0);
const parseBurst = (l) => {
  const m = l.match(/agegate src=horseBurst age=(-?\d+) arg=(-?\d+)/);
  return m ? { age: Number(m[1]), arg: Number(m[2]) } : null;
};
// B-17 r2 lesson: /data get has NO chat feedback in 1.12 (the merge into a
// [chat] event never happens; the command reply goes back to the stdin
// console only), so per-second Age polling can never be parsed by a
// driver. The shape proof rides the burst rows themselves: the agegate row
// prints age=(pre) and arg=(post) per burst write — consecutive row pairs
// give the +200 jumps and the row timestamps give the ~10 s plateau gaps.
async function shapeWatch(kind) {
  const k = srv.all.length;
  await sleep(35000);
  const rows = burstRows(since(k)).map(parseBurst).filter(Boolean);
  const deltas = [];
  for (let i = 1; i < rows.length; i++) deltas.push(rows[i].arg - rows[i - 1].arg);
  return { rows, deltas };
}

// B-17 r6 lesson: the redirect body never runs AND the entrance-guard row
// prints zero — resolve blind with the /etest age snapshot: capture the
// ageSnapshot rows right after summoning and again at the window's end.
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

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join('run', world), { recursive: true, force: true });
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
  // the B-16 pen: interior air clear + pad plane + 1-high cobble ring with
  // a carved 5x5 middle — big mobs cannot leave, nothing falls off.
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

// shape watch: sample Age every ~1 s for 25 s, return deltas + burst rows

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: EntityHorse child — burst rows: >=2, every arg-arg delta = +200
  // r4 lesson: the 1.12 summon/selector name is the REGISTRY key, not the
  // class name — "EntityHorse" -> minecraft:entityhorse = invalid and the
  // summon is skipped outright; "Cow" passes because its registry key is
  // literally cow. Horse family keys: horse / donkey / skeleton_horse /
  // zombie_horse.
  await summonChild('Horse', 1, 0, '{Age:-64000,Type:0}');
  ev.arms.a1snap0 = await ageSnap('a1-t0');
  ev.arms.a1 = await shapeWatch('Horse');
  ev.arms.a1snap1 = await ageSnap('a1-t1');
  await cmd('kill @e[type=Horse]', 700);

  // A2: EntityDonkey child — the AbstractHorse umbrella proof
  await summonChild('Donkey', 1, 0, '{Age:-64000}');
  ev.arms.a2snap0 = await ageSnap('a2-t0');
  ev.arms.a2 = await shapeWatch('Donkey');
  await cmd('kill @e[type=Donkey]', 700);

  // A3: cow child control — vanilla ++1 lane, ZERO horseBurst rows
  await summonChild('Cow', 1, 0, '{Age:-64000}');
  ev.arms.a3 = await shapeWatch('Cow');
  await cmd('kill @e[type=!player]', 700);

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: flag-off horse — vanilla ++1 per tick, ZERO horseBurst rows
  await summonChild('Horse', 1, 0, '{Age:-64000}');
  ev.arms.b1 = await shapeWatch('Horse');

  // fsync state back and report
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const jumpFace = (d) => d.length >= 1 && d.every((x) => x >= 1 && x <= 200);
  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.rows.length < 2 || !(jumpFace(ev.arms.a1.deltas) && ev.arms.a1.deltas.every((x) => x === 200))
    || ev.arms.a2.rows.length < 2 || !(jumpFace(ev.arms.a2.deltas) && ev.arms.a2.deltas.every((x) => x === 200))
    || ev.arms.a3.rows.length !== 0
    || ev.arms.b1.rows.length !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: { n: ev.arms.a1.rows.length, rows: ev.arms.a1.rows, deltas: ev.arms.a1.deltas },
    a2: { n: ev.arms.a2.rows.length, deltas: ev.arms.a2.deltas },
    a3: { n: ev.arms.a3.rows.length },
    b1: { n: ev.arms.b1.rows.length },
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
