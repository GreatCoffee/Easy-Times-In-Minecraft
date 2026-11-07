#!/usr/bin/env node
/**
 * f11-b18-w5c.js — B-18 W5c village face supplement (staging-corrected).
 *
 * Why this exists: the book's W5 staging cannot breed under 1.12 vanilla:
 *   1) `minecraft:oak_door` is not a 1.12 block id (the block is
 *      `minecraft:wooden_door`) — every setblock was rejected, so no door
 *      ever existed (verify run1/run2 logs show the chat error);
 *   2) even with doors, VillageCollection.addToNewDoorsList (:215-226) only
 *      registers a door when the sky-visibility counts differ on its two
 *      sides — an open-air door never registers;
 *   3) even registered, checkSufficientDoorsPresentForNewVillager
 *      (EntityAIVillagerMate :80-87) needs (int)(doors*0.35) > villagers;
 *      8 doors -> 2 < 4.
 * This arm keeps the judgment values identical and only fixes the staging:
 * 18 wooden_door columns + one-sided roof strips + 12 bread per villager
 * (slot.villager.0; EntityVillager.getIsWillingToMate :588-622 consumes 3).
 *
 * The face set under judgment is still src=villagerParent|villagerBirth.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b18-w5c';
const WORLD = 'w-b18v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const PAD = { x0: -76, z0: 238, x1: -68, z1: 244, y: 66 };

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
  srv = await startBoot();
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });

  // arena
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill ' + PAD.x0 + ' ' + (PAD.y + 1) + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + (PAD.y + 8) + ' ' + PAD.z1 + ' minecraft:air', 600);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 600);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);

  // 18 wooden_door columns (lower meta 0 / upper meta 8, facing east)
  const doorXs = [-76, -75, -74, -73, -72, -71, -70, -69, -68];
  for (const dx of doorXs) {
    await cmd('setblock ' + dx + ' 67 238 minecraft:wooden_door 0', 200);
    await cmd('setblock ' + dx + ' 68 238 minecraft:wooden_door 8', 200);
    await cmd('setblock ' + dx + ' 67 244 minecraft:wooden_door 0', 200);
    await cmd('setblock ' + dx + ' 68 244 minecraft:wooden_door 8', 200);
  }
  // one-sided roof: east half of each door row loses sky => doors register
  await cmd('fill -75 69 238 -63 69 238 minecraft:cobblestone', 400);
  await cmd('fill -75 69 244 -63 69 244 minecraft:cobblestone', 400);

  for (const [x, z] of [[-73.5, 240.5], [-70.5, 241.5], [-74.5, 242.5], [-69.5, 243.5]]) {
    await cmd('summon Villager ' + x + ' 67 ' + z + ' {NoAI:0b}', 500);
  }
  await cmd('replaceitem entity @e[type=Villager] slot.villager.0 minecraft:bread 12', 600);

  const k = srv.all.length;
  await sleep(130000);
  ev.arms.w5c = {
    parent: faceSrcOf(since(k), 'src=villagerParent').length,
    birth: faceSrcOf(since(k), 'src=villagerBirth').length,
    rows: faceSrcOf(since(k), 'src=villagerParent').concat(faceSrcOf(since(k), 'src=villagerBirth')),
  };
  ev.arms.w5csnap = await ageSnap();
  await cmd('kill @e[type=!player]', 700);

  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.verdicts.w5c = ev.arms.w5c.parent >= 1 && ev.arms.w5c.birth >= 1 ? 'PASS' : 'FAIL';
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
    parent: ev.arms.w5c.parent, birth: ev.arms.w5c.birth,
  }));
  setTimeout(() => process.exit(fails.length ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
