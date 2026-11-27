#!/usr/bin/env node
/**
 * f11-b16-verify.js — B-16 (chicken num_feathers) judgment-window driver.
 * Written by the master session for session 7 to execute — same arm shape as
 * f11-b16-smoke.js (r12 form, fast arrow volley) but: separate world w-b16v,
 * strict per-arm verdicts (W0..W5) printed beside the evidence lines, and
 * the A4 hurt face additionally checks the F-2 row field semantics
 * (source=arrow / points>=1 / rolls face / meter decay face).
 *
 * Arms:
 *   W0  both boots: Done( + mixinFail=0 + clean stop + BUILD SUCCESSFUL
 *   W1  A1 well death row: src=death well=true burning=false meat=raw
 *       droppedFeathers==feathers==meter, vanillaRemoved>=1, sweep raw=1
 *   W2  A2 starving death row: well=false meat=none, feathers self-match,
 *       sweep raw=0 cooked=0
 *   W3  A3 burn+well row meat=cooked droppedFeathers=0 + A3b burn+starve
 *       row meat=none droppedFeathers=0 (+ dry sweeps both)
 *   W4  A4 arrow hurt rows: src=hurt rowCount>=1, droppedSum>=1, every row
 *       source=arrow, points>=1, and rows>=2 across chickens (meter face)
 *   W5  B1 flag off: zero featherDrop rows across a death + hurt replay
 *       (loot vanilla carries: sweep on a flag-off death = raw+feathers
 *       untouched, recorded as evidence only)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b16-verify';
const WORLD = 'w-b16v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const PAD = { x0: STAND.x - 4, z0: STAND.z - 4, x1: STAND.x + 4, z1: STAND.z + 2, y: 66 };

const ev = { tag: TAG, boots: [], arms: {}, verdict: {}, stopBoots: [] };
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

// (mirrors smoke — keep the arena geometry IDENTICAL so arm coordinates stay
// cross-comparable with the r12 smoke round)
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: false });
  await cmd('gamerule doMobLoot true', 400);
  await cmd('kill @e[type=!player]', 600);
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

  // W1: A1 well death
  let k = srv.all.length;
  await summonChicken(-3, -3);
  await prod('probe=1 feathers=3 food=1.0 water=1.0');
  await cmd('kill @e[type=Chicken]', 900);
  const a1 = fRows(since(k)).map(parseRow);
  ev.arms.a1 = { rowCount: a1.length, row: a1[0] || null, rows: a1.slice(0, 2),
    probeRows: since(k).filter((l) => l.indexOf('[AILog] navprobe') >= 0).length,
    sweep: await sweep() };

  // W2: A2 starving death
  k = srv.all.length;
  await summonChicken(-3, -3);
  await prod('feathers=2 food=0.0 water=0.0');
  await cmd('kill @e[type=Chicken]', 900);
  const a2 = fRows(since(k)).map(parseRow);
  ev.arms.a2 = { rowCount: a2.length, row: a2[0] || null, rows: a2.slice(0, 2), sweep: await sweep() };

  // W3: A3 burn+well / A3b burn+starving (SE interior corner — z-offsets >0
  // leave the carve and die to inWall instead of fire: r7 lesson)
  k = srv.all.length;
  await summonChicken(2, -3, '{Fire:32767s}');
  await prod('feathers=5 food=1.0 water=1.0');
  await sleep(12000);
  const a3 = fRows(since(k)).map(parseRow);
  ev.arms.a3 = { rowCount: a3.length, row: a3[0] || null, rows: a3.slice(0, 2), sweep: await sweep() };

  k = srv.all.length;
  await summonChicken(2, -3, '{Fire:32767s}');
  await prod('feathers=4 food=0.0 water=0.0');
  await sleep(12000);
  const a3b = fRows(since(k)).map(parseRow);
  ev.arms.a3b = { rowCount: a3b.length, row: a3b[0] || null, rows: a3b.slice(0, 2), sweep: await sweep() };

  // W4: A4 arrow hurt rows (fast volley — mirror of smoke r13: motion 1.2
  // => raw dmg ceil(2.4)=3 non-lethal first hit; lane z=241.5, one block off
  // the bot axis; droppedSum counts only src=hurt rows)
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
  ev.arms.a4 = { rowCount: a4.filter((r) => r.src === 'hurt').length, droppedSum, rows: a4.slice(0, 4) };
  // hard face: the bot must never take an arrow (task book §三 硬禁面)
  ev.arms.hard = { botShot1: since(k).filter((l) => /ETIM_F7 was shot/.test(l)).length };

  const b1Boot = ev.boots[0];
  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockProductionR196: false, farmDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // W5: flag-off replay — death + arrow hurt, zero featherDrop rows;
  // the sweep on the death face is evidence that vanilla loot survives.
  k = srv.all.length;
  // spectator: no item pickup (the vanilla loot sweep must stay a real positive
  // control) and no arrow self-hit. Run 3: tp to y=71 fell back down -> pickup.
  await cmd('gamemode 3 ' + A, 500);
  await summonChicken(1, 0);
  await prod('feathers=3 food=1.0 water=1.0');
  await cmd('kill @e[type=Chicken]', 900);
  const b1DeathSweep = await sweep();
  await summonChicken(2, -1);           // lane z=241.5 (one block off the bot axis)
  await prod('feathers=6 food=1.0 water=1.0');
  for (let i = 0; i < 12; i++) {
    srv.send('summon Arrow -74.9 67.5 241.5 {Motion:[2.5,-0.02,0.0]}');
    await sleep(40);
  }
  await sleep(1500);
  ev.arms.b1 = { rowCount: fRows(since(k)).length, deathSweep: b1DeathSweep,
    botShot2: since(k).filter((l) => /ETIM_F7 was shot/.test(l)).length };

  // stop boot 2 as well (run 2 left the second server listening on 25565)
  await stopBoot();

  // fsync state back and report
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  // ---- verdicts (strict face per arm) ----
  // session 7 (W-B16 run 1): a1/a2/a3/a3b are the parsed row ARRAYS, so the
  // old `row(a) => a.row || {}` read `[].row` and every strict face on those
  // arms scored ✗ despite correct rows. Read arr[0] for arrays, keep .row for
  // the ev.arms shapes.
  const row = (a) => (Array.isArray(a) ? (a[0] || {}) : (a.row || {}));
  ev.verdict.W0 = (b1Boot.mixinFail === 0 && ev.boots[1].mixinFail === 0
    && ev.stopBoots.length >= 2
    && ev.stopBoots.every((s) => s.exited === true && s.exitCode === 0 && s.build === true)) ? '✓' : '✗';
  ev.verdict.W1 = (a1.length === 1
    && row(a1).src === 'death'
    && row(a1).well === 'true' && row(a1).burning === 'false'
    && row(a1).meat === 'raw'
    && Number(row(a1).feathers) >= 1
    && String(row(a1).meter) === String(row(a1).feathers)
    && Number(row(a1).vanillaRemoved) >= 1
    && row(a1).droppedFeathers === String(row(a1).feathers)
    && ev.arms.a1.sweep.raw === 1 && ev.arms.a1.sweep.cooked === 0
    && ev.arms.a1.sweep.feather >= 1) ? '✓' : '✗';
  ev.verdict.W2 = (a2.length === 1
    && row(a2).src === 'death' && row(a2).well === 'false'
    && row(a2).meat === 'none'
    && Number(row(a2).feathers) >= 1
    && String(row(a2).meter) === String(row(a2).feathers)
    && row(a2).droppedFeathers === String(row(a2).feathers)
    && ev.arms.a2.sweep.raw === 0 && ev.arms.a2.sweep.cooked === 0
    && ev.arms.a2.sweep.feather >= 1) ? '✓' : '✗';
  ev.verdict.W3 = (a3.length === 1
    && row(a3).src === 'death' && row(a3).burning === 'true'
    && row(a3).meat === 'cooked' && row(a3).droppedFeathers === '0'
    && a3b.length === 1
    && row(a3b).burning === 'true' && row(a3b).well === 'false'
    && row(a3b).meat === 'none' && row(a3b).droppedFeathers === '0'
    && ev.arms.a3.sweep.cooked === 1 && ev.arms.a3.sweep.raw === 0 && ev.arms.a3.sweep.feather === 0
    && ev.arms.a3b.sweep.cooked === 0 && ev.arms.a3b.sweep.raw === 0 && ev.arms.a3b.sweep.feather === 0) ? '✓' : '✗';
  const hurtRows = a4.filter((r) => r.src === 'hurt' && r.source === 'arrow');
  ev.verdict.W4 = (hurtRows.length >= 1 && droppedSum >= 1
    && hurtRows.every((r) => r.source === 'arrow' && Number(r.points) >= 1)
    && hurtRows.length >= 2 && ev.arms.hard.botShot1 === 0) ? '✓' : '✗';
  ev.verdict.W5 = (ev.arms.b1.rowCount === 0 && ev.boots[1].mixinFail === 0
    && ev.arms.b1.botShot2 === 0) ? '✓' : '✗';
  ev.verdict.ok = Object.values(ev.verdict).every((v) => v === '✓') ? true : false;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[verdict] ' + JSON.stringify(ev.verdict));
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.row, a1s: ev.arms.a1.sweep,
    a2: ev.arms.a2.row, a2s: ev.arms.a2.sweep,
    a3: ev.arms.a3.row, a3s: ev.arms.a3.sweep,
    a3b: ev.arms.a3b.row, a3bs: ev.arms.a3b.sweep,
    a4c: ev.arms.a4.rowCount, a4: ev.arms.a4.rows, dropped: droppedSum,
    b1: ev.arms.b1.rowCount, b1s: ev.arms.b1.deathSweep,
  }));
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  // mineflayer's socket keeps the loop alive; exit explicitly so the shell
  // wrapper does not have to kill a finished run (W-B16 run 1 hit this).
  setTimeout(() => process.exit(ev.verdict.ok ? 0 : 2), 800);
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  setTimeout(() => process.exit(1), 300);
});
