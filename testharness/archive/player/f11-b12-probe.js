#!/usr/bin/env node
/**
 * f11-b12-probe.js — focused probe for the B-12 egg damage face (NOT the judged
 * window): does the ModifyArg on EntityEgg.onImpact reach a living target, and
 * can the player be hit at all?  P1 pig (3 eggs) / P2 player vertical (3 eggs)
 * / P3 player horizontal (3 eggs).  Reads [DamageLog] dmg src=thrown rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b12-probe';
const WORLD = 'w-b12p';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };
const PIG = { x: 300.5, z: 851.5 };
const BOTP = { x: 304.5, z: 855.5 };
const sleep = L.sleep;
const log = L.log;
let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const since = (n) => srv.all.slice(n).map(L.strip);
const boxAt = (type, x0, y0, z0, dx, dy, dz) =>
  `@e[type=${type},x=${Math.floor(x0)},y=${Math.floor(y0)},z=${Math.floor(z0)},dx=${Math.ceil(dx)},dy=${Math.ceil(dy)},dz=${Math.ceil(dz)}]`;

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function dumpHealth(type, spot) {
  const from = srv.all.length;
  srv.send(`execute ${boxAt(type, spot.x - 2, TY - 1, spot.z - 2, 5, 7, 5)} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(950);
  const rows = since(from);
  return rows.filter((l) => /\{.*\}/.test(l)).map((l) => ({
    health: (/[,{]Health:([\d.]+)f/.exec(l) || [])[1],
    pos: ((/Pos:\[([^\]]+)\]/.exec(l) || [])[1] || '').split(',').map((s) => Math.round(parseFloat(s))).join(','),
  }));
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'livestockNeedsR196', 'true');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'damageDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException|Critical injection failure/.test(l)).length;
    log('boot', ev.boot + ' mixinFail=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 1600 });
    srv.send('kill @e[type=!player]');
    await sleep(1400);
    srv.send(`fill ${PEN.x} ${TY - 1} ${PEN.z} ${PEN.x + 12} ${TY + 2} ${PEN.z + 12} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${PEN.x} ${TY - 1} ${PEN.z} ${PEN.x + 12} ${TY - 1} ${PEN.z + 12} minecraft:dirt 0`);
    srv.send(`fill ${PEN.x} ${TY} ${PEN.z} ${PEN.x + 12} ${TY} ${PEN.z + 12} minecraft:grass 0`);
    await sleep(900);

    /* P1: pig target, vertical drop */
    srv.send(`summon minecraft:pig ${PIG.x} ${TY + 1} ${PIG.z} {PersistenceRequired:1b}`);
    await sleep(1800);
    ev.arms.P1 = { before: await dumpHealth('pig', PIG), shots: [] };
    for (let i = 0; i < 3; i++) {
      srv.send(`tp @e[type=pig,x=298,y=${TY - 1},z=849,dx=6,dy=7,dz=6] ${PIG.x} ${TY + 1} ${PIG.z}`);
      await sleep(350);
      const from = srv.all.length;
      srv.send(`summon minecraft:egg ${PIG.x} ${TY + 3} ${PIG.z} {Motion:[0.0d,-0.6d,0.0d]}`);
      await sleep(1500);
      ev.arms.P1.shots.push(since(from).filter((l) => /\[DamageLog\] dmg/.test(l)));
    }
    ev.arms.P1.after = await dumpHealth('pig', PIG);
    log('P1', JSON.stringify({ before: ev.arms.P1.before, after: ev.arms.P1.after, shots: ev.arms.P1.shots.map((s) => s.map((x) => x.slice(0, 150))) }));

    /* P2: player target, vertical drop (survival) */
    await L.tp(srv, BOTP.x, TY + 1, BOTP.z, { bot: A, wait: 800 });
    await cmd(`gamemode 0 ${A}`, 800);
    ev.arms.P2 = { shots: [] };
    for (let i = 0; i < 3; i++) {
      await cmd(`effect ${A} minecraft:instant_health 1 10`, 450);
      const from = srv.all.length;
      srv.send(`execute ${A} ~ ~ ~ summon minecraft:egg ~ ~3 ~ {Motion:[0.0d,-0.6d,0.0d]}`);
      await sleep(1500);
      ev.arms.P2.shots.push(since(from).filter((l) => /\[DamageLog\] dmg/.test(l)));
    }
    log('P2', JSON.stringify(ev.arms.P2.shots.map((s) => s.map((x) => x.slice(0, 150)))));

    /* P3: player target, horizontal throw (survival) */
    ev.arms.P3 = { shots: [] };
    for (let i = 0; i < 3; i++) {
      await cmd(`effect ${A} minecraft:instant_health 1 10`, 450);
      const from = srv.all.length;
      srv.send(`summon minecraft:egg ${BOTP.x} ${TY + 1.4} ${BOTP.z - 2.5} {Motion:[0.0d,0.12d,0.5d]}`);
      await sleep(1500);
      ev.arms.P3.shots.push(since(from).filter((l) => /\[DamageLog\] dmg|thrown|attacked/i.test(l)));
    }
    await cmd(`gamemode 1 ${A}`, 500);
    log('P3', JSON.stringify(ev.arms.P3.shots.map((s) => s.map((x) => x.slice(0, 150)))));
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { log('stop-err', e.message); }
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    process.exit(0);
  }
})();
