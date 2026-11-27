#!/usr/bin/env node
/**
 * f11-b16-smoke.js — R196 chicken num_feathers batch (B-16) smoke driver.
 * One flat world, two boots (flag on / flag off). The F-1 death arm
 * recomposes the LivingDropsEvent capture list (R196 EntityChicken
 * dropFewItems :127-142 — meter × feather + well meat / burning cooked);
 * the F-2 hurt arm rolls 0.2F per damage point (1.12 LivingHurtEvent,
 * exclusion list :166-171). Judgment rows: [FarmLog] featherDrop
 * src=death|hurt … (ETIMFarm.row ⇒ farmDebugLog gate).
 *
 * Arms (boot 1 — livestockProductionR196=true):
 *   A1  well death: feathers=3, food/water=1 → src=death row,
 *       well=true burning=false vanillaRemoved>=1 feathers=3 meat=raw
 *   A2  starving death: feathers=2, food=0 water=0 → meat=none well=false
 *   A3  burning death: {Fire:32767s} chicken → src=death burning=true
 *       well=true meat=cooked (feather branch skipped verbatim)
 *   A4  hurt arm: 6 chickens feathers=6 hp=12, hand punches ~54 rolls →
 *       >=1 src=hurt row with dropped>=1 and meter decrement shown
 * Arms (boot 2 — livestockProductionR196=false):
 *   B1  death + hurt replay → ZERO featherDrop rows (vanilla carries)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b16-smoke';
const WORLD = 'w-b16a';
const A = 'ETIM_F7';
// r1-r3 lesson: (240,121,240) is 55 blocks above the etim27 terrain in the
// fresh world - the bot AND every chicken fell off the invisible spot within
// 1 s, the prod AABB found nothing (= kinds(0) all four barrels), while
// kill @e (world-wide) still hit. The arena now sits on the bot's natural
// login ground (-72.5, 67, 242.5) with a cobble pad poured at y=66 so the
// summons stand INSIDE the prod radius on solid ground.
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
const fRows = (lines) => lines.filter((l) => l.indexOf('featherDrop') >= 0);
const parseRow = (l) => {
  const g = {};
  for (const m of l.matchAll(/([a-zA-Z]+)=([\w.\-]+)/g)) g[m[1]] = m[2];
  return g;
};

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
  // noPhysics:false — gamemode 0 + frozen physics = the server flying-kick
  // the bot an A2 in r1; with physics live the bot stands on the ground.
  await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: false });
  await cmd('gamerule doMobLoot true', 400);   // stage pins it false — the F-1 face needs the loot chain
  await cmd('kill @e[type=!player]', 600);
  // arena build, in order: interior+overhead air clear (the fresh-world
  // terrain must not shade the pad: a chicken walking off the pad edge into
  // a neighbouring hill = inWall suffocation = 28 hurt-spam rows, r4),
  // then the pad plane, then a 1-high cobble ring on the pad border (y=67)
  // carved open in the middle = a 5x5 pen the chickens cannot leave.
  await cmd('fill -76 67 238 -68 74 244 minecraft:air', 500);
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' ' + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill -76 67 238 -68 67 244 minecraft:cobblestone', 400);
  await cmd('fill -75 67 239 -69 67 243 minecraft:air', 400);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function summonChicken(dx, dz, nbt) {
  await cmd('summon Chicken ' + (STAND.x + dx + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + dz + 0.5) + (nbt ? ' ' + nbt : ''), 600);
  await sleep(500);
}

async function prod(args) { await bc('etest prod ' + args, 600); }

// ground sweep — kill every item entity and count the kill replies by class:
// a hard physical proof of exactly what the chicken dropped (row fields only
// prove the meter arithmetic; the sweep proves the floor items).
async function sweep() {
  const k = srv.all.length;
  await cmd('kill @e[type=item]', 700);
  const reps = since(k).join(' ');
  return {
    feather: (reps.match(/Killed item\.item\.feather/g) || []).length,
    raw: (reps.match(/Killed item\.item\.chickenRaw/g) || []).length,
    cooked: (reps.match(/Killed item\.item\.chickenCooked/g) || []).length,
  };
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { farmDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: well death — the meter composes n feathers + raw meat (n>=1: the
  // 1/40 jump face may have burned a couple of meter feathers — the meter
  // echo in the row must self-match, not the preset).
  let k = srv.all.length;
  await summonChicken(-3, -3);
  // probe face: one [AILog] navprobe row per AABB hit — separates hits-empty
  // from get()==null for the kinds(0) mystery.
  await prod('probe=1 feathers=3 food=1.0 water=1.0');
  await cmd('kill @e[type=Chicken]', 900);
  const a1 = fRows(since(k)).map(parseRow);
  ev.arms.a1 = { rowCount: a1.length, row: a1[0] || null,
    probeRows: since(k).filter((l) => l.indexOf('[AILog] navprobe') >= 0).length,
    sweep: await sweep() };

  // A2: starving death — well=false, no meat, feathers still the meter
  k = srv.all.length;
  await summonChicken(-3, -3);
  await prod('feathers=2 food=0.0 water=0.0');
  await cmd('kill @e[type=Chicken]', 900);
  const a2 = fRows(since(k)).map(parseRow);
  ev.arms.a2 = { rowCount: a2.length, row: a2[0] || null, sweep: await sweep() };

  // A3: burning death — cooked meat only, feather branch skipped verbatim
  // (+2,-3) = interior SE corner: z-offsets >0 land outside the carve
  // (z=243+ is the cobble ring) and the chicken dies to inWall suiting
  // instead of the fire arm (r7's src=hurt inWall row grab).
  k = srv.all.length;
  await summonChicken(2, -3, '{Fire:32767s}');
  await prod('feathers=5 food=1.0 water=1.0');
  await sleep(12000);
  const a3 = fRows(since(k)).map(parseRow);
  ev.arms.a3 = { rowCount: a3.length, row: a3[0] || null, sweep: await sweep() };

  // A3b: burning + starving = the R196 empty hand (burn skips the feather
  // loop AND well=false closes the meat face): row meat=none burning=true
  // well=false and the sweep proves not one floor item survived.
  k = srv.all.length;
  await summonChicken(2, -3, '{Fire:32767s}');
  await prod('feathers=4 food=0.0 water=0.0');
  await sleep(12000);
  const a3b = fRows(since(k)).map(parseRow);
  ev.arms.a3b = { rowCount: a3b.length, row: a3b[0] || null, sweep: await sweep() };

  // A4: hurt arm — F-2 needs a non-fire/non-magic/non-drown physical hit on
  // a live chicken. Server-side arrows (DamageSource.ARROW). History burned
  // six smoke rounds: bot-punch r5 reach deny / r6-r7 weak-strike deny /
  // r8 both after the stick flip; slow arrows r9-r11 (wall clip / overfly
  // arc / panic-dodge); r12 revealed the last two faces — 1.12 damage is
  // ceil(motion.length * 2.0) so motion 2.5 = raw 6 > chicken hp 4 = EVERY
  // hit lethal (F-2's own R196 exclusion eats the rows, hurt count 0), AND
  // the leftover arrows fly through and shoot the bot (bot flees, later
  // volleys' prod finds kinds(0)). Fixed pair: motion 1.2 => raw 3
  // (non-lethal first hit, points=3 rolls; the follow-up hit on hp~1 kills
  // as the death face — both faces wanted), and the whole firing lane sits
  // on z=241.5, one block off the bot axis (242.5) so no stray arrow
  // grazes the bot at all.
  k = srv.all.length;
  let a4 = [];
  let droppedSum = 0;
  for (let volley = 0; volley < 3; volley++) {
    for (let i = 0; i < 6; i++) {
      srv.send('summon Chicken ' + (STAND.x - 2 + 0.5) + ' ' + STAND.y + ' ' + (STAND.z - 1));
      await sleep(60);
    }
    await sleep(900);
    await prod('feathers=6 food=1.0 water=1.0');
    for (let i = 0; i < 12; i++) {
      srv.send('summon Arrow -74.9 67.5 241.5 {Motion:[1.2,-0.02,0.0]}');
      await sleep(40);
    }
    await sleep(1500);
    a4 = fRows(since(k)).map(parseRow);
    droppedSum = a4.filter((r) => r.src === 'hurt')
      .reduce((s, r) => s + (Number(r.dropped) || 0), 0);
    if (droppedSum > 0) break;
  }
  ev.arms.a4 = { rowCount: a4.filter((r) => r.src === 'hurt').length, droppedSum, rows: a4.slice(0, 3) };

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockProductionR196: false, farmDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: flag-off replay — vanilla carries, zero featherDrop rows
  k = srv.all.length;
  await summonChicken(1, 0);
  await prod('feathers=3 food=1.0 water=1.0');
  await cmd('kill @e[type=Chicken]', 900);
  await summonChicken(2, 2);
  await prod('feathers=3 hp=12.0 food=1.0 water=1.0');
  for (let i = 0; i < 4; i++) {
    const near = Object.values(bot.entities).filter((e) => e && e !== bot.entity && e.name === 'chicken'
      && e.position && e.position.distanceTo(bot.entity.position) < 5);
    for (const e of near) { try { bot.attack(e); } catch (err) { /* noop */ } }
    await sleep(950);
  }
  ev.arms.b1 = { rowCount: fRows(since(k)).length };

  // fsync state back and report
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }
  const bad = ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.rowCount !== 1
    || !ev.arms.a1.row || ev.arms.a1.row.src !== 'death'
    || ev.arms.a1.row.well !== 'true' || ev.arms.a1.row.burning !== 'false'
    || ev.arms.a1.row.meat !== 'raw'
    || Number(ev.arms.a1.row.feathers) < 1
    || String(ev.arms.a1.row.meter) !== ev.arms.a1.row.feathers
    || Number(ev.arms.a1.row.vanillaRemoved) < 1
    || ev.arms.a1.row.droppedFeathers !== ev.arms.a1.row.feathers
    || ev.arms.a1.sweep.feather < 1   // sweep tolerates the drift/pickup race: the exact count face is droppedFeathers on the row
    || ev.arms.a1.sweep.raw !== 1 || ev.arms.a1.sweep.cooked !== 0
    || ev.arms.a2.rowCount !== 1
    || !ev.arms.a2.row || ev.arms.a2.row.well !== 'false' || ev.arms.a2.row.meat !== 'none'
    || Number(ev.arms.a2.row.feathers) < 1
    || String(ev.arms.a2.row.meter) !== ev.arms.a2.row.feathers
    || ev.arms.a2.row.droppedFeathers !== ev.arms.a2.row.feathers
    || ev.arms.a2.sweep.feather < 1   // same drift/pickup tolerance as a1s
    || ev.arms.a2.sweep.raw !== 0 || ev.arms.a2.sweep.cooked !== 0
    || ev.arms.a3.rowCount !== 1
    || !ev.arms.a3.row || ev.arms.a3.row.burning !== 'true' || ev.arms.a3.row.meat !== 'cooked'
    || ev.arms.a3.row.droppedFeathers !== '0'
    || ev.arms.a3.sweep.feather !== 0 || ev.arms.a3.sweep.cooked !== 1 || ev.arms.a3.sweep.raw !== 0
    || ev.arms.a3b.rowCount !== 1
    || !ev.arms.a3b.row || ev.arms.a3b.row.burning !== 'true' || ev.arms.a3b.row.well !== 'false'
    || ev.arms.a3b.row.meat !== 'none' || ev.arms.a3b.row.droppedFeathers !== '0'
    || ev.arms.a3b.sweep.feather !== 0 || ev.arms.a3b.sweep.raw !== 0 || ev.arms.a3b.sweep.cooked !== 0
    || ev.arms.a4.rowCount < 1 || ev.arms.a4.droppedSum < 1
    || ev.arms.b1.rowCount !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({ a1: ev.arms.a1.row, a1s: ev.arms.a1.sweep, a2: ev.arms.a2.row, a2s: ev.arms.a2.sweep, a3: ev.arms.a3.row, a3s: ev.arms.a3.sweep, a3b: ev.arms.a3b.row, a3bs: ev.arms.a3b.sweep, a4c: ev.arms.a4.rowCount, dropped: ev.arms.a4.droppedSum, b1: ev.arms.b1.rowCount }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
