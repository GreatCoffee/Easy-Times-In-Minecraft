#!/usr/bin/env node
/**
 * f10-b2-pilot3.js — jump-lane v3: correct spawn cells (even x = low floor, the
 * odd columns are the one-high strips) + tempt bot alternating ends, with live
 * Pos tracking so we can see whether the chickens actually traverse (and hence
 * jump) instead of only counting the 1/40 drops.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-pilot3';
const WORLD = 'f10b2r';
const A = 'ETIM_F7';
const TY = 100;
const LANE = { x0: 330, x1: 344, z0: 845, z1: 847 };
let srv = null, bot = null;
const ev = { tag: TAG, track: [] };
const sleep = L.sleep;
const log = L.log;
const since = (n) => srv.all.slice(n).map(L.strip);

async function poss(sel) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(900);
  const out = [];
  for (const l of since(from)) {
    const p = /Pos:\[([^\]]+)\]/.exec(l);
    const id = /entitydata: .*?(\d+)/.exec(l);
    const m = /EntityChicken#(\d+)/.exec(l);
    if (p) out.push({ x: Number(p[1].split(',')[0]).toFixed(1), z: Number(p[1].split(',')[2]).toFixed(1) });
  }
  return out;
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, LANE.x0 + 2.5, TY + 1, LANE.z0 + 1.5, { bot: A, wait: 1500 });
    srv.send('kill @e[type=!player]');
    await sleep(1000);

    const { x0, x1, z0, z1 } = LANE;
    srv.send(`fill ${x0 - 2} ${TY - 4} ${z0 - 2} ${x1 + 2} ${TY + 10} ${z1 + 2} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${x0} ${TY - 1} ${z0} ${x1} ${TY - 1} ${z1} minecraft:dirt 0`);
    srv.send(`fill ${x0} ${TY} ${z0} ${x1} ${TY} ${z1} minecraft:grass 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z0 - 1} ${x1 + 1} ${TY + 3} ${z0 - 1} minecraft:cobblestone 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z1 + 1} ${x1 + 1} ${TY + 3} ${z1 + 1} minecraft:cobblestone 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z0} ${x0 - 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
    srv.send(`fill ${x1 + 1} ${TY + 1} ${z0} ${x1 + 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
    for (let x = x0 + 1; x <= x1 - 1; x += 2) {
      srv.send(`fill ${x} ${TY + 1} ${z0} ${x} ${TY + 1} ${z1} minecraft:stone 0`);
    }
    await sleep(1500);

    for (const dx of [2.5, 6.5, 10.5]) {   // even x -> the low floor cells
      srv.send(`summon minecraft:chicken ${x0 + dx} ${TY + 1} ${z0 + 1.5} {PersistenceRequired:1b}`);
    }
    await sleep(2500);
    srv.send(`etest prod ${A} 7 feather=2`);
    await sleep(800);
    srv.send(`clear ${A}`);
    await sleep(300);
    srv.send(`give ${A} minecraft:wheat_seeds 1`);
    await sleep(700);
    const seeds = bot.inventory.items().find((i) => i.name === 'wheat_seeds');
    await bot.equip(seeds, 'hand');
    await sleep(400);

    const sel = `@e[type=chicken,x=${x0 - 1},y=${TY - 1},z=${z0 - 1},dx=${x1 - x0 + 3},dy=5,dz=5]`;
    const from = srv.all.length;
    for (let c = 1; c <= 12; c++) {
      const toRight = c % 2 === 1;
      await L.tp(srv, (toRight ? x1 - 1.5 : x0 + 0.5), TY + 1, z0 + 1.5, { bot: A, wait: 9000 });
      const p = await poss(sel);
      ev.track.push({ c, pos: p });
      const jumps = since(from).filter((l) => /kind=feather jump=true/.test(l));
      log('c' + c, JSON.stringify({ pos: p, drops: jumps.length }));
      if (jumps.length >= 2) break;
    }
    ev.arms = { drops: since(from).filter((l) => /kind=feather jump=true/.test(l)).slice(0, 3) };
    log('RESULT', JSON.stringify({ drops: ev.arms.drops.length, track: ev.track }));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
