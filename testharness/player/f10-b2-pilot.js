#!/usr/bin/env node
/**
 * f10-b2-pilot.js — W-B10b2 preflight (NOT judged). De-risks:
 *   P1 natural-AI chicken jump feathers (1/40 per hop) in a stepped yard
 *   P2 natural-AI sheep eatGrassBonus row on a grass yard
 *   P3 the /clear <player> <item> -1 0 count-only probe semantics
 *   P4 R10 far-cell readback timing (chunk unloaded until tp -> ticksExisted<100
 *      -> first 100-tick wellness pass cannot run before the dump)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-pilot';
const WORLD = 'f10b2p';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
const JUMP = { x: 330, z: 845 };
const SHEEPY = { x: 330, z: 858 };
const CELL = { x: 120, y: 120, z: 847 };

let srv = null, bot = null;
const ev = { tag: TAG, started: new Date().toISOString(), arms: {}, boots: [] };
const sleep = L.sleep;
const log = L.log;
const since = (n) => srv.all.slice(n).map(L.strip);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function dump(sel) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(950);
  const rows = since(from);
  const out = [];
  for (const l of rows) {
    const cap = /"etim:livestock":\{([^}]*)\}/.exec(l);
    if (!cap) continue;
    const kv = {};
    for (const part of cap[1].split(',')) { const i = part.indexOf(':'); if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1); }
    out.push({
      food: kv.food, water: kv.water, freedom: kv.freedom,
      prod: kv.productionCounter === undefined ? null : Number(kv.productionCounter),
      milk: kv.milk === undefined ? null : Number(kv.milk),
      num: kv.numFeathers === undefined ? null : Number(kv.numFeathers),
      max: kv.maxNumFeathers === undefined ? null : Number(kv.maxNumFeathers),
      health: (/Health:([\d.]+)f/.exec(l) || [])[1],
      inLove: (/InLove:(-?\d+)/.exec(l) || [])[1],
      age: (/Age:(-?\d+)/.exec(l) || [])[1],
    });
  }
  return out;
}
/** count-only inventory probe: `/clear <p> <item> -1 0` (metadata -1, maxCount 0). */
async function invCount(item) {
  const from = srv.all.length;
  srv.send(`clear ${A} minecraft:${item} -1 0`);
  await sleep(450);
  const rows = since(from).join(' | ');
  const m = /has (\d+) matching item|Found (\d+) matching/i.exec(rows);
  return { n: m ? Number(m[1] || m[2]) : (/(No items|failure)/i.test(rows) ? 0 : null), raw: rows.slice(0, 220) };
}
function yard(name, x0, z0, opts) {
  const o = opts || {};
  const x1 = x0 + 8, z1 = z0 + 8;
  srv.send(`fill ${x0 - 1} ${TY - 4} ${z0 - 1} ${x1 + 1} ${TY + 12} ${z1 + 1} minecraft:air 0`);
  srv.send(`fill ${x0} ${TY - 1} ${z0} ${x1} ${TY - 1} ${z1} minecraft:dirt 0`);
  srv.send(`fill ${x0} ${TY} ${z0} ${x1} ${TY} ${z1} minecraft:grass 0`);
  srv.send(`fill ${x0} ${TY + 1} ${z0} ${x1} ${TY + 2} ${z1} minecraft:cobblestone 0`);
  srv.send(`fill ${x0 + 1} ${TY + 1} ${z0 + 1} ${x1 - 1} ${TY + 2} ${z1 - 1} minecraft:air 0`);
  if (o.steps) {
    for (let x = x0 + 1; x <= x1 - 1; x += 2) {
      for (let z = z0 + 1; z <= z1 - 1; z += 2) {
        srv.send(`setblock ${x} ${TY + 1} ${z} minecraft:stone 0`);
      }
    }
  }
  log('yard', name + ' @ ' + x0 + ',' + z0);
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ---------------- boot 1 ---------------- */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b1' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boots.push({ n: 1, boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim(), mixinFail: srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length });
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 1800 });
    srv.send('kill @e[type=!player]');
    await sleep(1200);

    yard('pen', FX, FZ, { steps: false });
    yard('jump', JUMP.x, JUMP.z, { steps: true });
    yard('sheepy', SHEEPY.x, SHEEPY.z, { steps: false });
    await sleep(1200);

    // natural AI (no NoAI) in their yards; the sheep yard is pure grass
    srv.send(`summon minecraft:chicken ${JUMP.x + 2.5} ${TY + 1} ${JUMP.z + 2.5} {PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${JUMP.x + 5.5} ${TY + 1} ${JUMP.z + 5.5} {PersistenceRequired:1b}`);
    srv.send(`summon minecraft:sheep ${SHEEPY.x + 2.5} ${TY + 1} ${SHEEPY.z + 2.5} {PersistenceRequired:1b}`);
    srv.send(`summon minecraft:sheep ${SHEEPY.x + 5.5} ${TY + 1} ${SHEEPY.z + 5.5} {PersistenceRequired:1b}`);
    await sleep(3000);

    const fromN = srv.all.length;
    const deadline = Date.now() + 170000;
    let jumps = [], grass = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      const rows = since(fromN);
      jumps = rows.filter((l) => /kind=feather jump=true/.test(l));
      grass = rows.filter((l) => /grass src=sheep/.test(l));
      if (jumps.length && grass.length) break;
    }
    ev.arms.P1 = { jumps: jumps.length, sample: jumps.slice(0, 3) };
    ev.arms.P2 = { grass: grass.length, sample: grass.slice(0, 3) };
    log('P1', JSON.stringify(ev.arms.P1));
    log('P2', JSON.stringify(ev.arms.P2));

    // P3 /clear probe semantics on a dummy stack
    srv.send(`give ${A} minecraft:dirt 5`);
    await sleep(700);
    ev.arms.P3 = { five: await invCount('dirt') };
    srv.send(`clear ${A} minecraft:dirt`);
    await sleep(500);
    ev.arms.P3.after = await invCount('dirt');
    log('P3', JSON.stringify(ev.arms.P3));

    // P4 far cell: build + summon + seed + dump, then stop fast
    await L.tp(srv, CELL.x + 0.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 1500 });
    srv.send(`fill ${CELL.x - 4} ${CELL.y - 4} ${CELL.z - 4} ${CELL.x + 12} ${CELL.y + 8} ${CELL.z + 6} minecraft:air 0`);
    await sleep(700);
    for (const [dx, dz] of [[0, 0], [6, 0]]) {
      srv.send(`fill ${CELL.x + dx - 1} ${CELL.y - 1} ${CELL.z + dz - 1} ${CELL.x + dx + 1} ${CELL.y - 1} ${CELL.z + dz + 1} minecraft:stone 0`);
      srv.send(`fill ${CELL.x + dx - 2} ${CELL.y} ${CELL.z + dz - 2} ${CELL.x + dx + 2} ${CELL.y + 2} ${CELL.z + dz + 2} minecraft:cobblestone 0`);
      srv.send(`fill ${CELL.x + dx - 1} ${CELL.y} ${CELL.z + dz - 1} ${CELL.x + dx + 1} ${CELL.y + 1} ${CELL.z + dz + 1} minecraft:air 0`);
    }
    await sleep(700);
    srv.send(`summon minecraft:cow ${CELL.x + 0.5} ${CELL.y} ${CELL.z + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${CELL.x + 6.5} ${CELL.y} ${CELL.z + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(800);
    const selC = `@e[type=cow,x=${CELL.x - 2},y=${CELL.y - 2},z=${CELL.z - 2},dx=12,dy=5,dz=6]`;
    const selH = `@e[type=chicken,x=${CELL.x - 2},y=${CELL.y - 2},z=${CELL.z - 2},dx=12,dy=5,dz=6]`;
    srv.send(`etest prod ${A} 2 water=0.3 food=0.4 hp=3.0 counter=42 milk=60`);
    await sleep(600);
    await L.tp(srv, CELL.x + 6.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 400 });
    srv.send(`etest prod ${A} 2 water=0.3 food=0.4 hp=3.0 counter=17 feather=1`);
    await sleep(600);
    ev.arms.P4 = { preCow: await dump(selC), preChick: await dump(selH), seedRows: since(fromN).filter((l) => /\[FarmLog\] prod /.test(l)).slice(-2) };
    log('P4-pre', JSON.stringify(ev.arms.P4));
  } catch (e) {
    ev.error1 = (e && e.stack) || String(e);
    log('B1-FAIL', ev.error1);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    ev.stop1 = await srv.stop().catch((e) => ({ err: e.message }));
    srv = null;
  }

  /* ---------------- boot 2: R10 readback ---------------- */
  try {
    srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b2' });
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b2');
    ev.boots.push({ n: 2, boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim(), mixinFail: srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length });
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.tp(srv, CELL.x + 0.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 500 });
    const selC = `@e[type=cow,x=${CELL.x - 2},y=${CELL.y - 2},z=${CELL.z - 2},dx=12,dy=5,dz=6]`;
    const selH = `@e[type=chicken,x=${CELL.x - 2},y=${CELL.y - 2},z=${CELL.z - 2},dx=12,dy=5,dz=6]`;
    const t0 = Date.now();
    ev.arms.P4.postCow = await dump(selC);
    ev.arms.P4.postChick = await dump(selH);
    ev.arms.P4.ms = Date.now() - t0;
    log('P4-post', JSON.stringify({ cow: ev.arms.P4.postCow, chick: ev.arms.P4.postChick, ms: ev.arms.P4.ms }));
    ev.ok = true;
  } catch (e) {
    ev.error2 = (e && e.stack) || String(e);
    log('B2-FAIL', ev.error2);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    if (srv) { ev.stop2 = await srv.stop().catch((e) => ({ err: e.message })); srv = null; }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
