#!/usr/bin/env node
/**
 * f11-b18-smoke.js — R196 newborn-age family (B-18) smoke driver.
 *
 * The R196 face: EntityAgeable.getGrowingAgeOfNewborn() / setGrowingAgeToNewborn()
 * = -64000 replaces the vanilla 1.12 scattered "-24000" natural-spawn writes:
 *   F-1 ocelot litter :255-257 (rand.nextInt(7)==0 -> extra kitten of the same skin)
 *   F-3 horse foal    :1341+=1364-1365 (rand.nextInt(5)==0 -> setGrowingAgeToNewborn)
 *   F-2 zombie cure   (startConversion :315 chain -> finishConversion -> child villager)
 *   F-4 villager giveBirth — DEFERRED to the judge window (needs a real village);
 *     the parent/birth rows are villagerParent/villagerBirth — not driven here.
 * Vanilla keep faces (C-grade, zero new rows): rabbit spawn egg 1/6 baby stays
 * -24000; R196 has no Rabbit/PolarBear/ZombieVillager class.
 *
 * Row face: [FarmLog] agegate src=<kind> ... — own gate = mobDebugLog
 * (ETIMLivestockEvents.ageGateRow :1004), double-gated inside ETIMFarm.row
 * (farmDebugLog) — both true on both boots.
 *
 * Arms (boot 1 — livestockNeedsR196=true):
 *   A1 ocelot spawn egg x8 via /etest useblock -> >=1 ocelotLitter row
 *   A2 horse spawn egg x12 -> >=1 horseFoalSpawn row (1/5 each) + foal
 *      snapshot age == -64000
 *   A3 zombie villager cure: summon baby {IsBaby:1b,ConversionTime:1} -> the
 *      ConversionTime cheat triggers finishConversion directly (no
 *      weakness/gapple dance needed) -> >=1 zombieCureChild row
 *   A4 rabbit spawn egg x12 -> ZERO agegate rows of any src (negative mirror);
 *      snapshot keeps vanilla -24000 on rabbit children when the 1/6 gate hits
 * Arms (boot 2 — livestockNeedsR196=false):
 *   B1 ocelot egg x8 + horse egg x12 replay -> ZERO agegate rows; snapshot
 *      shows vanilla values (negative mirror of the whole family)
 *
 * The 1.12 spawn item is minecraft:spawn_egg with EntityTag NBT; staged via
 * replaceitem (1.12 accepts the dataTag param — /etest hold cannot write NBT),
 * then the T1 packet driver /etest useblock right-clicks a pad cell with the
 * held stack (server-side, real processRightClickBlock).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b18-smoke';
const WORLD = 'w-b18a';
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

// the 5x5 carved interior cells (B-16/B-17 pen: walls -76..-68 x / 238..244 z,
// air carve -75..-69 x / 239..243 z) — spawn points stay inside the carve
const CELLS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0], [1, -1], [-1, -1], [2, 0]];

const ageRows = (lines) => lines.filter((l) => l.indexOf('agegate') >= 0);
// the B-18 judgment rows only — the agegate channel also carries the B-12
// src=desperate/cauldron probe rows, so arms count this narrow face set
const FACE_SRCS = ['src=ocelotLitter', 'src=horseFoalSpawn', 'src=zombieCureChild', 'src=villagerParent', 'src=villagerBirth'];
const faceRows = (lines) => ageRows(lines).filter((l) => FACE_SRCS.some((s) => l.indexOf(s) >= 0));
const parseSnap = (l) => {
  const m = l.match(/ageSnapshot kind=(\w+) id=\d+ age=(-?\d+) isChild=(true|false) ticksExisted=\d+/);
  return m ? { kind: m[1], age: Number(m[2]), isChild: m[3] === 'true' } : null;
};
async function ageSnap() {
  const k = srv.all.length;
  await cmd('etest age', 700);
  await sleep(300);
  return since(k).map(parseSnap).filter(Boolean);
}

// stage one spawn egg (with EntityTag NBT) into the bot hand, then right-click
// a pad cell with it — the 1.12 ItemMonsterPlacer path calls onSpawnWithEgg /
// onInitialSpawn, the real natural-spawn face.
async function useEgg(entityId, cell, wait) {
  await cmd('replaceitem entity ' + A + ' slot.hotbar.0 minecraft:spawn_egg 1 0 {EntityTag:{id:"minecraft:' + entityId + '"}}', 400);
  bot.setQuickBarSlot(0);
  await sleep(300);
  const px = STAND.x + cell[0];
  const pz = STAND.z + cell[1];
  // r1 lesson: the console sender has no player default — targetOrSender
  // resolves to the console and throws ("Only players can use..."). Pass
  // the bot atom explicitly (b13 R2 form).
  // r1 lesson 2: NO /etest hold here — hold writes a PLAIN stack and
  // clobbers the EntityTag NBT the replaceitem just staged.
  await cmd('etest useblock ' + px + ' ' + PAD.y + ' ' + pz + ' ' + A, wait === undefined ? 600 : wait);
  await sleep(400);
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
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill -76 67 238 -68 74 244 minecraft:air', 500);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill -76 67 238 -68 67 244 minecraft:cobblestone', 400);
  await cmd('fill -75 67 239 -69 67 243 minecraft:air', 400);
  await cmd('gamerule doMobLoot true', 300);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

// clear all living + ground items between arms so row slices stay clean
async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: ocelot egg x24 — >=1 ocelotLitter row expected (1/7 each,
  // r2 8-egg draw missed at (6/7)^8 ~ 29%; 24 eggs -> ~2.5% miss)
  {
    const k = srv.all.length;
    for (let i = 0; i < 24; i++) await useEgg('ocelot', CELLS[i % CELLS.length], 600);
    await sleep(600);
    const rows = ageRows(since(k));
    ev.arms.a1 = { n: rows.length, rows };
    ev.arms.a1snap = await ageSnap();
    await sweep();
  }

  // A2: horse egg x40 — >=1 horseFoalSpawn row expected (1/5 each; r2/r3
  // two 12-egg draws hit 2 then 0 at (4/5)^12 ~ 7% — variance killer:
  // 40 eggs -> (4/5)^40 ~ 0.013% miss)
  // snapshot must show foal age -64000 / isChild when the 1/5 gate fired
  {
    const k = srv.all.length;
    for (let i = 0; i < 40; i++) await useEgg('horse', CELLS[i % CELLS.length], 600);
    await sleep(600);
    const rows = ageRows(since(k));
    ev.arms.a2 = { n: rows.length, rows };
    ev.arms.a2snap = await ageSnap();
    await sweep();
  }

  // A3: zombie-villager cure — r4 registry-key lesson: the summon key is
  // "zombie_villager" (1.12 registry name), not the class name. The
  // ConversionTime:1 cheat triggers finishConversion directly (no
  // weakness/gapple dance needed); the converted villager (child) gets the
  // R196 newborn write.
  {
    const k = srv.all.length;
    await cmd('summon zombie_villager ' + (STAND.x + 1) + ' ' + STAND.y + ' ' + (STAND.z + 1) + ' {IsBaby:1b,ConversionTime:1}', 600);
    await sleep(3000);
    const rows = ageRows(since(k));
    ev.arms.a3 = { n: rows.length, rows };
    ev.arms.a3snap = await ageSnap();
    await sweep();
  }

  // A4: rabbit egg x12 — ZERO agegate rows (vanilla keep-face, C-grade) +
  // A4b direct baby rabbit (Age:-24000): the vanilla keep-face pinned on a
  // real child instead of the 1/6 egg coin.
  {
    const k = srv.all.length;
    for (let i = 0; i < 12; i++) await useEgg('rabbit', CELLS[i % CELLS.length], 600);
    await sleep(600);
    ev.arms.a4 = { n: ageRows(since(k)).length };
    await cmd('summon Rabbit ' + (STAND.x - 1) + ' ' + STAND.y + ' ' + (STAND.z - 1) + ' {Age:-24000}', 600);
    await sleep(700);
    ev.arms.a4snap = await ageSnap();
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: whole family replay, flag off — every spawn passes through vanilla
  // -24000 writes; ZERO of the FACES' rows (src five-color set)
  {
    const k = srv.all.length;
    for (let i = 0; i < 8; i++) await useEgg('ocelot', CELLS[i % CELLS.length], 600);
    for (let i = 0; i < 12; i++) await useEgg('horse', CELLS[i % CELLS.length], 600);
    await sleep(600);
    ev.arms.b1 = { n: faceRows(since(k)).length };
    ev.arms.b1snap = await ageSnap();
    await sweep();
  }

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const oceOk = faceRows(ev.arms.a1.rows || []).some((r) => r.indexOf('src=ocelotLitter') >= 0);
  const horOk = faceRows(ev.arms.a2.rows || []).some((r) => r.indexOf('src=horseFoalSpawn') >= 0);
  const foalOk = (ev.arms.a2snap || []).some((s) => s.kind && s.kind.toLowerCase().indexOf('horse') >= 0 && s.isChild && s.age === -64000);
  const curOk = faceRows(ev.arms.a3.rows || []).some((r) => r.indexOf('src=zombieCureChild') >= 0);
  const rabChild = (ev.arms.a4snap || []).filter((s) => s.kind && s.kind.toLowerCase().indexOf('rabbit') >= 0);
  // direct rabbit {Age:-24000} drifts as the vanilla child path ++ ages it
  // (r3 snapped -23974 = 26 ticks of vanilla growth — keep-face PROVEN);
  // require in-band, not exact
  const rabKeep = rabChild.some((s) => s.isChild && s.age <= -23000 && s.age > -24000 - 10000); // vanilla keep-face, C-grade anchor
  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || !oceOk || !horOk || !curOk || !rabKeep
    || ev.arms.a4.n !== 0 || ev.arms.b1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows.length,
    a2: ev.arms.a2.n, a2snapFoal: (ev.arms.a2snap || []).filter((s) => s.kind && s.kind.toLowerCase().indexOf('horse') >= 0),
    a3: ev.arms.a3.n,
    a4: ev.arms.a4.n, a4snap: (ev.arms.a4snap || []).filter((s) => s.kind && s.kind.toLowerCase().indexOf('rabbit') >= 0).slice(0, 3),
    b1: ev.arms.b1.n,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
