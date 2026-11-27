#!/usr/bin/env node
/**
 * f10-pg-b11-nav.js v3 — B-11 walk-face debug probe: FULL pen staging (like
 * the smoke drivers — the earlier nav runs summoned on bare terrain and the
 * cow dropped 37 blocks to the plains floor), then cow + far wheat + a
 * 12-sample probe timeline: navprobe=1 rows (nav path state), anchored
 * testfor (existence), and the mineflayer position track + the AI reset
 * rows. Non-verdict debug run, ~90 s.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-b11-nav';
const WORLD = 'f10pgb11nav';
const FX = 297, FZ = 847, TY = 100;
const COW_X = FX + 3.5, COW_Z = FZ + 4.5;
const FAR_X = FX + 8.9, FAR_Z = FZ + 2.9;
let ev = { tag: TAG, startedAt: new Date().toISOString() };

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    if (ev.mixinFail) throw new Error('mixin fail');

    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 1800 });
    srv.send('kill @e[type=!player]');
    await L.sleep(1200);
    srv.send('gamerule randomTickSpeed 0');
    // the pen — same shape as the smoke drivers v5
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
    await L.sleep(900);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
    srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
    await L.sleep(900);
    srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 1} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 1} ${FZ + 1} ${FX + 11} ${TY + 1} ${FZ + 11} minecraft:air 0`);
    srv.send(`fill ${FX} ${TY + 2} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 2} ${FZ + 1} ${FX + 11} ${TY + 2} ${FZ + 11} minecraft:air 0`);
    await L.sleep(1200);
    srv.send(`summon minecraft:cow ${COW_X} ${TY + 1} ${COW_Z}`);
    await L.sleep(2500);
    srv.send(`etest prod ${L.BOT} 6 water=0.0 food=0.3 hp=10.0`);
    await L.sleep(800);
    srv.send(`time set noon`);
    srv.send(`summon minecraft:item ${FAR_X} ${TY + 1} ${FAR_Z} {Item:{id:"minecraft:wheat",Count:1b}}`);
    await L.sleep(2500);
    for (let i = 0; i < 12; i++) {
      srv.send(`etest prod ${L.BOT} 8 probe=1`);
      await L.sleep(1500);
      const cow = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow');
      ev['t' + i] = cow && cow.position ? [cow.position.x.toFixed(1), cow.position.z.toFixed(1)].join(',') : 'gone';
      const item = Object.values(bot.entities || {}).find((e) => e && e.name === 'item' && e.displayName
        && JSON.stringify(e.meta && e.meta[8] || '').indexOf('wheat') > -1);
      L.log('t' + i, 'cow=' + ev['t' + i] + (item && item.position ? ' item='
        + [item.position.x.toFixed(1), item.position.z.toFixed(1)].join(',') : ''));
      await L.sleep(2500);
    }
    ev.ok = true;
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('probe-done', 'evidence written');
  } catch (e) {
    ev.error = (e && e.stack) || e.message || String(e);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('PROBE-FAIL', ev.error);
    process.exitCode = 2;
  } finally {
    srv.send('gamerule randomTickSpeed 3');
    srv.send('gamerule doDaylightCycle true');
    await L.sleep(400);
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    await L.sleep(300);
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
