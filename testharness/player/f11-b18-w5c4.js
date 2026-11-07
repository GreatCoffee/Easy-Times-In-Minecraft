#!/usr/bin/env node
/**
 * f11-b18-w5c4.js — B-18 village face, instrumented probe.
 *
 * w5c3 proved the staging is now factually correct: villages.dat showed
 *   doors=18, PopSize=2, Tick=3600, Radius=32, noBreedTicks(MTick)=0
 * so checkSufficientDoorsPresentForNewVillager() is 2 < int(18*0.35)=6 -> true,
 * isMatingSeason() -> true. Still zero giveBirth. This arm replays the same
 * geometry with the two villagers adjacent (2 blocks apart) and reads their
 * NBT through /entitydata to find the remaining gate:
 *   Willing:1b  -> getIsWillingToMate(true) succeeded (food consumed)
 *   Inventory   -> bread 12 means the food branch never ran
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b18-w5c4';
const WORLD = 'w-b18v';
const A = 'ETIM_F7';
const STAND = { x: -78, y: 67, z: 240 };
const PAD = { x0: -82, x1: -62, z0: 226, z1: 254, y: 66 };
const V1 = { x: -75.5, z: 239.5 };
const V2 = { x: -75.5, z: 241.5 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
const faceSrcOf = (lines, src) => lines.filter((l) => l.indexOf('agegate') >= 0 && l.indexOf(src) >= 0);

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk: L.mkCounts() };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

async function startBoot() {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true });
  let props = propsBefore;
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', WORLD)
    : props + '\nlevel-name=' + WORLD + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  for (const [k, v] of Object.entries({ livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true })) {
    L.setCfgValue(L.CFG, k, v);
  }
  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate');
  const s = await L.startServer({ root: L.ROOT, tag: TAG + '-b1' });
  const done = await s.waitFor(/Done \(/, 480000);
  if (!done) { try { await s.stop(30000); } catch (e) { /* noop */ } throw new Error('no Done( in 480s'); }
  return s;
}

async function probe(label) {
  const k = srv.all.length;
  await cmd('entitydata @e[type=Villager,name=V1] Willing', 500);
  await cmd('entitydata @e[type=Villager,name=V1] Inventory', 500);
  await cmd('entitydata @e[type=Villager,name=V2] Willing', 500);
  await cmd('entitydata @e[type=Villager,name=V2] Inventory', 500);
  await cmd('etest age', 700);
  await sleep(400);
  const out = since(k).filter((l) => /Entity data|ageSnapshot|Unknown|error|That entity/i.test(l));
  console.log('[probe ' + label + ']');
  out.forEach((l) => console.log('   ' + l.slice(0, 220)));
  return out;
}

(async () => {
  stampPin();
  srv = await startBoot();
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });

  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill ' + PAD.x0 + ' 67 ' + PAD.z0 + ' ' + PAD.x1 + ' 90 ' + PAD.z1 + ' minecraft:air', 900);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 900);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);

  for (let z = 232; z <= 249; z++) {
    await cmd('setblock -73 67 ' + z + ' minecraft:wooden_door 0', 180);
    await cmd('setblock -73 68 ' + z + ' minecraft:wooden_door 8', 180);
  }
  await cmd('fill -72 69 232 -66 69 249 minecraft:cobblestone', 600);
  await cmd('fill -71 67 232 -71 68 249 minecraft:cobblestone', 600);

  await cmd('summon Villager ' + V1.x + ' 67 ' + V1.z + ' {NoAI:0b,CustomName:V1}', 500);
  await cmd('summon Villager ' + V2.x + ' 67 ' + V2.z + ' {NoAI:0b,CustomName:V2}', 500);
  await cmd('replaceitem entity @e[type=Villager] slot.villager.0 minecraft:bread 12', 600);

  const k = srv.all.length;
  await sleep(45000);
  ev.arms.p1 = await probe('t=45s');
  await sleep(45000);
  ev.arms.p2 = await probe('t=90s');
  await sleep(60000);
  ev.arms.p3 = await probe('t=150s');

  ev.arms.w5c4 = {
    parent: faceSrcOf(since(k), 'src=villagerParent').length,
    birth: faceSrcOf(since(k), 'src=villagerBirth').length,
    rows: faceSrcOf(since(k), 'src=villagerParent').concat(faceSrcOf(since(k), 'src=villagerBirth')),
  };
  await cmd('kill @e[type=!player]', 700);

  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.verdicts.w5c4 = ev.arms.w5c4.parent >= 1 && ev.arms.w5c4.birth >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w0 = ev.boots.length === 1 && ev.boots[0].mixinFail === 0 && /Done \(/.test(ev.boots[0].boot)
    && ev.stopBoots.length === 1 && ev.stopBoots[0].exited === true && ev.stopBoots[0].exitCode === 0 && ev.stopBoots[0].build === true
    ? 'PASS' : 'FAIL';

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  stampPin();
  console.log('[out] ' + fsOut);
  const fails = Object.entries(ev.verdicts).filter(([, v]) => v === 'FAIL');
  console.log('[done] ' + JSON.stringify({
    verdicts: ev.verdicts,
    parent: ev.arms.w5c4.parent, birth: ev.arms.w5c4.birth,
  }));
  setTimeout(() => process.exit(fails.length ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
