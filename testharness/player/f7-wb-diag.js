#!/usr/bin/env node
/** f7-wb-diag.js - one-boot diagnosis of the FarmLog gate + useblock path. */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-diag';
const WORLD = 'f7wb';
const AX = 186, AY = 100, AZ = 761;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    fs.copyFileSync(L.CFG, path.join(L.OUT, TAG + '-cfg-at-boot.txt'));
    const cfgLine = fs.readFileSync(L.CFG, 'utf8').split(/\r?\n/).find((l) => /farmDebugLog/.test(l));
    L.log('cfg-at-boot', cfgLine);
    L.log('rows-at-boot', JSON.stringify(L.rowCounts(srv.all)));
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 200, noPhysics: true });
    srv.send(`fill ${AX - 20} ${AY - 2} ${AZ - 20} ${AX + 20} ${AY - 2} ${AZ + 20} minecraft:stone 0`);
    srv.send(`fill ${AX - 20} ${AY - 1} ${AZ - 20} ${AX + 20} ${AY + 6} ${AZ + 20} minecraft:air 0`);
    await L.sleep(800);
    // dry wheat 3x3
    srv.send(`fill ${AX - 1} ${AY - 1} ${AZ - 1} ${AX + 1} ${AY - 1} ${AZ + 1} minecraft:farmland 0 replace`);
    srv.send(`fill ${AX - 1} ${AY} ${AZ - 1} ${AX + 1} ${AY} ${AZ + 1} minecraft:wheat 0 replace`);
    // tillage dirt + hoe
    srv.send(`setblock ${AX + 6} ${AY - 1} ${AZ} minecraft:dirt 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:hoe_copper 1 0`);
    srv.send(`etest enchant mainhand 5 fertility ${bot.username}`);
    await L.tp(srv, AX + 6.5, AY, AZ + 3.5, { bot: bot.username, wait: 800 });
    await L.lookAtTop(bot, AX + 6, AY - 1, AZ);
    const f1 = srv.all.length;
    L.useBlock(srv, AX + 6, AY - 1, AZ, bot.username);
    await L.sleep(1500);
    L.log('useblock-rows', JSON.stringify(srv.all.slice(f1).map(L.strip).filter((l) => /FarmLog|TestLog|EnchLog/.test(l))));
    await L.sleep(8000);
    const plains = srv.all.map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
    L.log('farmlog-total', plains.length);
    L.log('farmlog-sample', JSON.stringify(plains.slice(0, 12)));
    L.log('gate-dry', plains.filter((l) => /growth gate dry/.test(l)).length);
    L.log('tillage', plains.filter((l) => /fertility tillage/.test(l)).length);
    L.log('set', plains.filter((l) => /fertilized set/.test(l)).length);
    srv.send('gamerule randomTickSpeed 3');
    L.log('counts', JSON.stringify(L.rowCounts(srv.all)));
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) await srv.stop(); } catch (e) { /* noop */ }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    L.log('restored', 'level=' + L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'));
  }
  process.exit(0);
}
main().catch((e) => { L.log('FATAL', (e && e.stack) || e); process.exit(1); });
