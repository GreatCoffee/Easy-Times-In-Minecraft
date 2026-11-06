#!/usr/bin/env node
/** f11-b13-probe.js — minimal double-check of the R6 vanilla-grow mystery:
 *  boot (blightR196=false), place FRESH wheat age3, readback, bone meal use,
 *  then dump probe + every testforblock meta. Single boot, no arena. */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b13-probe';
const WORLD = 'w-b13p';
const A = 'ETIM_F7';
const TY = 100;
const sleep = L.sleep;
const log = L.log;
let srv = null;
let bot = null;

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'blightR196', 'false');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');

  for (let i = 0; i < 60; i++) {
    if (L.netstatListen(L.PORT) === 0) break;
    await sleep(5000);
  }
  if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const booted = await srv.waitFor(/Done \(/, 480000);
  if (!booted) throw new Error('no boot');
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }

  const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
  const since = (n) => srv.all.slice(n).map(L.strip);

  await L.stage(srv, bot, { gamemode: 1, noPhysics: true, rts: 3 });
  const pos = { x: 310, y: 101, z: 850 };
  // tp FIRST: a fresh world has no generated chunks — fill/setblock before a
  // tp all die with "Cannot place blocks outside of the world" (r3 evidence).
  await L.tp(srv, pos.x, pos.y + 5, pos.z, { bot: A, wait: 2000 });
  await cmd(`kill @e[type=!player]`, 800);
  await cmd(`fill 300 99 840 320 99 860 minecraft:cobblestone 0`, 600);
  await cmd(`fill 300 100 840 320 106 860 minecraft:air 0`, 600);
  await cmd(`fill 300 100 840 320 100 860 minecraft:farmland 7`, 700);
  await cmd(`tp ${A} 302 103 846`, 800);
  await cmd(`setblock ${pos.x} ${pos.y} ${pos.z} minecraft:wheat 3 0`, 500);

  const test = async (meta) => (await L.testBlock(srv, pos.x, pos.y, pos.z, 'minecraft:wheat', meta)).ok;
  const probe = async () => {
    const from = srv.all.length;
    await cmd(`etest blight probe ${pos.x} ${pos.y} ${pos.z}`, 800);
    return since(from).find((l) => /\] blight probe /.test(l)) || 'NO PROBE ROW';
  };

  log('t0', 'fresh meta3=' + await test(3));
  log('probe0', await probe());

  // bone meal: survival, hotbar slot 0
  await cmd(`clear ${A} minecraft:dye 15`, 500);
  await cmd('gamemode 0 ' + A, 600);
  await cmd(`replaceitem entity ${A} slot.hotbar.0 minecraft:dye 1 15`, 700);
  await bot.setQuickBarSlot(0);
  await sleep(300);
  await L.tp(srv, pos.x, pos.y, pos.z + 2, { bot: A, wait: 1500 });

  log('t1', 'grow1 meta4=' + await test(4) + ' meta5=' + await test(5) + ' meta6=' + await test(6) + ' meta7=' + await test(7));
  log('t1wheat3', await test(3) + '');

  const fromU = srv.all.length;
  await L.lookAtBlock(bot, pos.x, pos.y, pos.z);
  await sleep(300);
  L.useBlock(srv, pos.x, pos.y, pos.z, A);
  await sleep(1200);
  log('t2', useRows(since(fromU)));
  function useRows(rows) {
    const out = [];
    for (const r of rows) {
      if (/reach denied|Bone Meal|driv|useblock|Cleared|no items|data value|Successfully/.test(r)) out.push(r.trim().slice(0, 160));
    }
    return out.join(' || ');
  }

  for (let m = 3; m <= 7; m++) log('t2 meta' + m, 'found=' + await test(m));
  log('probe1', await probe());
  log('t3', 'readback testfor 13=' + await L.testBlock(srv, pos.x, pos.y, pos.z, 'minecraft:wheat', 13).then((r) => r.ok));
  log('probe2', await probe());

  await cmd('stop', 1200);
  await srv.waitFor(/Stopping the server|BUILD (SUCCESSFUL|FAILED)/, 60000).catch(() => { });
  try { await srv.stop(30000); } catch (e) { /* noop */ }
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  log('done', 'probe complete');
})().catch((e) => { console.error('[f11-b13-probe] FATAL', e && e.stack || e); process.exitCode = 1; });
