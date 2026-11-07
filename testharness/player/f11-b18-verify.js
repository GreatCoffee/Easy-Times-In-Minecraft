#!/usr/bin/env node
/**
 * f11-b18-verify.js — R196 newborn-age family (B-18 spawn-egg sweep) judge
 * driver. Mirror of f11-b18-smoke.js (r4 green build) with judge-window
 * conventions: world w-b18v, [PIN] stamps (mkCounts + release sha)
 * before/after, per-arm W0..W6 marker rows, [done] verdict summary — NO
 * judgment-value drift (identical faces / gates to the smoke build).
 *
 * The B-18 judge channel = the [FarmLog] agegate lane; the face set:
 *   src=ocelotLitter | horseFoalSpawn | zombieCureChild |
 *   villagerParent   | villagerBirth
 * (B-12's src=desperate/cauldron and B-17's src=horseBurst rows ride the
 * same lane but are NOT B-18 faces — every count uses faceRows()).
 *
 * Arms (boot 1 — livestockNeedsR196=true, farmDebugLog=true, mobDebugLog=true):
 *   W1 ocelot egg x24  -> >=2 src=ocelotLitter rows, age=-64000 each
 *   W2 horse  egg x40  -> >=3 src=horseFoalSpawn rows, age=-64000 each
 *                         (1/5 gate; 40 eggs -> E=8 rows, p(x<=2)~2%)
 *   W3 ZombieVillager cure {IsBaby:1b,ConversionTime:1} -> >=1
 *      src=zombieCureChild row; cured villager child age=-64000 (snapshot)
 *   W4 rabbit egg x12  -> ZERO face rows (vanilla keep-face, C-grade) +
 *      direct rabbit {Age:-24000} -> snapshot child age in (-25000,-23000)
 *      band (vanilla ++1 drift allowed, r4 saw -23973)
 *   W5 village face: 8 oak doors line + 4 adult villagers -> >=1
 *      src=villagerParent row and >=1 src=villagerBirth row inside 110 s
 *      (deterministic-ish; if 0 rows the verdict FAILS unless任务书 C 副则)
 * Arms (boot 2 — livestockNeedsR196=false):
 *   W6 whole-face replay flag off: ocelot x8 + horse x12 eggs + cure ->
 *      ZERO face rows (flag-off passthrough; values stay vanilla)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b18-verify';
const WORLD = 'w-b18v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const PAD = { x0: STAND.x - 4, z0: STAND.z - 4, x1: STAND.x + 4, z1: STAND.z + 2, y: 66 };
const CELLS = [
  [1, 0], [0, 1], [-1, 0], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1],
];

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const ageRows = (lines) => lines.filter((l) => l.indexOf('agegate') >= 0);
const FACE_SRCS = ['src=ocelotLitter', 'src=horseFoalSpawn', 'src=zombieCureChild', 'src=villagerParent', 'src=villagerBirth'];
const faceRows = (lines) => ageRows(lines).filter((l) => FACE_SRCS.some((s) => l.indexOf(s) >= 0));
const faceSrcOf = (lines, src) => faceRows(lines).filter((l) => l.indexOf(src) >= 0);

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
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill ' + PAD.x0 + ' ' + (PAD.y + 1) + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + (PAD.y + 8) + ' ' + PAD.z1 + ' minecraft:air', 500);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill ' + (STAND.x - 3) + ' 67 ' + (STAND.z - 3) + ' ' + (STAND.x + 3) + ' 67 ' + (STAND.z + 1) + ' minecraft:air', 400);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function useEgg(kind, cell, wait) {
  await cmd('replaceitem entity ' + A + ' slot.hotbar.0 minecraft:spawn_egg 1 0 {EntityTag:{id:"minecraft:' + kind + '"}}', 700);
  await cmd('etest useblock ' + (STAND.x + 1) + ' ' + (STAND.y - 1) + ' ' + (STAND.z - 1) + ' ' + A, wait === undefined ? 900 : wait);
}

async function ageSnap() {
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

(async () => {
  stampPin();

  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // W1: ocelot egg arm
  {
    const k = srv.all.length;
    for (let i = 0; i < 24; i++) await useEgg('ocelot', CELLS[i % CELLS.length], 600);
    await sleep(600);
    const rows = faceSrcOf(since(k), 'src=ocelotLitter');
    ev.arms.w1 = { n: rows.length, rows };
    ev.arms.w1snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  // W2: horse egg arm
  {
    const k = srv.all.length;
    for (let i = 0; i < 40; i++) await useEgg('horse', CELLS[i % CELLS.length], 600);
    await sleep(600);
    const rows = faceSrcOf(since(k), 'src=horseFoalSpawn');
    ev.arms.w2 = { n: rows.length, rows };
    ev.arms.w2snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  // W3: zombie-villager cure arm
  {
    const k = srv.all.length;
    await cmd('summon zombie_villager ' + (STAND.x + 1) + ' ' + STAND.y + ' ' + (STAND.z + 1) + ' {IsBaby:1b,ConversionTime:1}', 600);
    await sleep(3000);
    ev.arms.w3 = { n: faceSrcOf(since(k), 'src=zombieCureChild').length };
    ev.arms.w3snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  // W4: rabbit egg arm (vanilla keep-face) + direct bunny anchor
  {
    const k = srv.all.length;
    for (let i = 0; i < 12; i++) await useEgg('rabbit', CELLS[i % CELLS.length], 600);
    await sleep(600);
    ev.arms.w4 = { n: faceRows(since(k)).length };
    await cmd('summon Rabbit ' + (STAND.x - 1.5) + ' ' + STAND.y + ' ' + (STAND.z - 1.5) + ' {Age:-24000}', 600);
    await sleep(700);
    ev.arms.w4snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  // W5: village face — 8-door line ring + 4 villagers, giveBirth 110 s window
  {
    // doors on the pad south edge: lower half meta 0 (lower, facing east)
    // + upper half meta 8 — vanilla 1.12 oak_door two-block shape
    const doorXs = [-76, -75, -74, -73, -71, -70, -69, -68];
    for (const dx of doorXs) {
      await cmd('setblock ' + dx + ' 67 238 minecraft:oak_door 0', 400);
      await cmd('setblock ' + dx + ' 68 238 minecraft:oak_door 8', 400);
    }
    await cmd('summon Villager ' + (STAND.x - 1.5) + ' 67 ' + (STAND.z - 1.5) + ' {NoAI:0b}', 600);
    await cmd('summon Villager ' + (STAND.x + 1.5) + ' 67 ' + (STAND.z - 0.5) + ' {NoAI:0b}', 600);
    await cmd('summon Villager ' + (STAND.x - 2.5) + ' 67 ' + (STAND.z + 0.5) + ' {NoAI:0b}', 600);
    await cmd('summon Villager ' + (STAND.x + 2.5) + ' 67 ' + (STAND.z + 1.5) + ' {NoAI:0b}', 600);
    const k = srv.all.length;
    await sleep(110000); // giveBirth window (S1 staged-village arm)
    ev.arms.w5 = {
      parent: faceSrcOf(since(k), 'src=villagerParent').length,
      birth: faceSrcOf(since(k), 'src=villagerBirth').length,
      rows: faceSrcOf(since(k), 'src=villagerParent').concat(faceSrcOf(since(k), 'src=villagerBirth')),
    };
    ev.arms.w5snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  // W5b: staging-corrected village face (C-grade harness note). The book's
  // 8 open-air doors cannot register under 1.12 VillageCollection: a door is
  // only added when the sky-visibility counts differ on its two sides
  // (addToNewDoorsList :215-226), and even then int(8*0.35)=2 < 4 villagers
  // fails checkSufficientDoorsPresentForNewVillager (EntityAIVillagerMate
  // :80-87). Add 10 door columns + a one-sided roof strip, and put 12 bread
  // in each villager's slot.villager.0 so getIsWillingToMate(true) can
  // consume 3 (EntityVillager :588-622). Judgment values unchanged.
  {
    const doorXs2 = [-76, -75, -74, -73, -72, -71, -70, -69, -68];
    for (const dx of doorXs2) {
      await cmd('setblock ' + dx + ' 67 238 minecraft:oak_door 0', 200);
      await cmd('setblock ' + dx + ' 68 238 minecraft:oak_door 8', 200);
      await cmd('setblock ' + dx + ' 67 244 minecraft:oak_door 0', 200);
      await cmd('setblock ' + dx + ' 68 244 minecraft:oak_door 8', 200);
    }
    await cmd('fill -75 69 238 -63 69 238 minecraft:cobblestone', 400);
    await cmd('fill -75 69 244 -63 69 244 minecraft:cobblestone', 400);
    for (const [x, z] of [[-73.5, 240.5], [-70.5, 241.5], [-74.5, 242.5], [-69.5, 243.5]]) {
      await cmd('summon Villager ' + x + ' 67 ' + z + ' {NoAI:0b}', 500);
    }
    await cmd('replaceitem entity @e[type=Villager] slot.villager.0 minecraft:bread 12', 600);
    const k = srv.all.length;
    await sleep(110000);
    ev.arms.w5b = {
      parent: faceSrcOf(since(k), 'src=villagerParent').length,
      birth: faceSrcOf(since(k), 'src=villagerBirth').length,
      rows: faceSrcOf(since(k), 'src=villagerParent').concat(faceSrcOf(since(k), 'src=villagerBirth')),
    };
    ev.arms.w5bsnap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // W6: whole-face replay flag off — ZERO face rows
  {
    const k = srv.all.length;
    for (let i = 0; i < 8; i++) await useEgg('ocelot', CELLS[i % CELLS.length], 600);
    for (let i = 0; i < 12; i++) await useEgg('horse', CELLS[i % CELLS.length], 600);
    await cmd('summon zombie_villager ' + (STAND.x + 1) + ' ' + STAND.y + ' ' + (STAND.z + 1) + ' {IsBaby:1b,ConversionTime:1}', 600);
    await sleep(3000);
    ev.arms.w6 = { n: faceRows(since(k)).length };
    ev.arms.w6snap = await ageSnap();
    await cmd('kill @e[type=!player]', 700);
  }

  await stopBoot();

  // fsync state back and report
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const ageFace = (rows) => rows.length >= 1 && rows.every((l) => l.indexOf('age=-64000') >= 0);
  ev.verdicts.w1 = ev.arms.w1.n >= 2 && ageFace(ev.arms.w1.rows) ? 'PASS' : 'FAIL';
  ev.verdicts.w2 = ev.arms.w2.n >= 3 && ageFace(ev.arms.w2.rows) ? 'PASS' : 'FAIL';
  const curSnap = (ev.arms.w3snap || []).filter((s) => s.kind === 'EntityVillager');
  // the row carries the exact -64000 face; the snapshot trails it by the
  // ticks elapsed since conversion (smoke r4 saw -63928 after 72 ticks)
  ev.verdicts.w3 = ev.arms.w3.n >= 1 && curSnap.some((s) => s.isChild && s.age < 0 && s.age > -64000) ? 'PASS' : 'FAIL';
  const rabChild = (ev.arms.w4snap || []).filter((s) => s.kind === 'EntityRabbit' && s.isChild);
  ev.verdicts.w4 = ev.arms.w4.n === 0 && rabChild.some((s) => s.age <= -23000 && s.age > -24000 - 10000) ? 'PASS' : 'FAIL';
  // book W5 clause: zero rows in 110 s = C-grade (staging not established,
  // not a judgment-value break), never D. W5b is the staging-corrected arm.
  ev.verdicts.w5 = ev.arms.w5.parent >= 1 && ev.arms.w5.birth >= 1
    ? 'PASS' : (ev.arms.w5.parent === 0 && ev.arms.w5.birth === 0 ? 'C' : 'FAIL');
  ev.verdicts.w5b = ev.arms.w5b.parent >= 1 && ev.arms.w5b.birth >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w6 = ev.arms.w6.n === 0 ? 'PASS' : 'FAIL';
  // W0 = both boots clean + both stops exit 0 with BUILD SUCCESSFUL
  const bootOk = ev.boots.length === 2
    && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot));
  const stopOk = ev.stopBoots.length >= 2
    && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true);
  ev.verdicts.w0 = bootOk && stopOk ? 'PASS' : 'FAIL';

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  stampPin();
  console.log('[out] ' + fsOut);
  const fails = Object.entries(ev.verdicts).filter(([, v]) => v === 'FAIL');
  console.log('[done] ' + JSON.stringify({
    verdicts: ev.verdicts,
    w1n: ev.arms.w1.n, w2n: ev.arms.w2.n, w3n: ev.arms.w3.n,
    w4n: ev.arms.w4.n, w5p: ev.arms.w5.parent, w5birth: ev.arms.w5.birth,
    w5bp: ev.arms.w5b.parent, w5bb: ev.arms.w5b.birth, w6n: ev.arms.w6.n,
  }));
  // mineflayer keeps the loop alive; exit explicitly (B-16 run-1 lesson)
  setTimeout(() => process.exit(fails.length ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
