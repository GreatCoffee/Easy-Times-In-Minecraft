#!/usr/bin/env node
/** f10-pg-diag.js — short diagnostic for the pen face: summon counts, entity
 *  survival tracking (10 s), /etest prod echo, bot.entities census. */
'use strict';
const fs = require('fs');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-diag';
const WORLD = 'f10pg';
const FX = 297, FZ = 847, TY = 100;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 1.5, TY + 4, FZ + 14.5, { bot: bot.username, wait: 1500 });

    // count what exists right now around the pen
    const whoIsThere = async (label) => {
      srv.send(`testfor @e[r=24,x=${FX + 6},${'y'}=${TY},${'z'}=${FZ + 6}]`);
      await L.sleep(900);
      const rows = rowsFrom(mark()).filter((l) => /Found|entities|matches/i.test(l));
      L.log(label, JSON.stringify(rows.slice(-1)));
      const k = Object.values(bot.entities || {}).filter((e) => e && e.name && /cow|sheep|chicken|pig/i.test(e.name)).map((e) => e.name + '#' + e.id + '@' + Math.round(e.position.x) + ',' + Math.round(e.position.y) + ',' + Math.round(e.position.z));
      L.log(label + ' [bot-view]', JSON.stringify(k));
    };
    await whoIsThere('pre-sweep');

    // kill every living thing in the pen area, then rebuild the flat
    srv.send(`kill @e[type=!player,r=20,x=${FX + 6},y=${TY + 1},z=${FZ + 6}]`);
    await L.sleep(1500);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
    srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
    srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
    for (const [x1, z1, x2, z2] of [
      [FX, FZ, FX + 12, FZ], [FX, FZ + 12, FX + 12, FZ + 12],
      [FX, FZ, FX, FZ + 12], [FX + 12, FZ, FX + 12, FZ + 12],
    ]) {
      srv.send(`fill ${x1} ${TY + 1} ${z1} ${x2} ${TY + 1} ${z2} minecraft:cobblestone 0`);
      srv.send(`fill ${x1} ${TY + 2} ${z1} ${x2} ${TY + 2} ${z2} minecraft:cobblestone 0`);
    }
    await L.sleep(1000);

    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b}`);
    srv.send(`summon minecraft:cow ${FX + 6.5} ${TY + 1} ${FZ + 4.5}`);  // no NoAI twin
    srv.send(`summon minecraft:sheep ${FX + 2.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b}`);
    await L.sleep(800);
    await whoIsThere('post-summon');
    for (let i = 1; i <= 10; i++) {
      await L.sleep(1000);
      const view = Object.values(bot.entities || {}).filter((e) => e && e.name && /cow|sheep/i.test(e.name)).map((e) => e.name + '#' + e.id);
      L.log('t+' + i + 's', JSON.stringify(view));
    }

    srv.send('etest prod radius=24');
    await L.sleep(900);
    L.log('prod-echo', JSON.stringify(rowsFrom(mark()).slice(-3)));

    srv.send('kill @e[type=!player,r=20,x=' + (FX + 6) + ',y=' + (TY + 1) + ',z=' + (FZ + 6) + ']');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    await L.sleep(300);
    L.log('diag-done', '');
  } catch (e) {
    L.log('DIAG-FAIL', e && e.stack || e.message || e);
    process.exitCode = 2;
  } finally {
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
