#!/usr/bin/env node
/** f7-wb-diag5.js - item-use path: bone meal on wheat vs manure on mushroom vs manure on farmland. */
'use strict';
const fs = require('fs');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-diag5';
const WORLD = 'f7wb';
const AX = 186, AY = 100, AZ = 780;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, AX + 0.5, AY, AZ + 0.5, { bot: bot.username, wait: 1800 });
    srv.send(`fill ${AX - 10} ${AY - 2} ${AZ - 10} ${AX + 10} ${AY - 2} ${AZ + 10} minecraft:stone 0`);
    srv.send(`fill ${AX - 10} ${AY - 1} ${AZ - 10} ${AX + 10} ${AY + 6} ${AZ + 10} minecraft:air 0`);
    await L.sleep(1200);

    /* bone meal on wheat (vanilla onItemUse) */
    const W = { x: AX, y: AY - 1, z: AZ };
    srv.send(`setblock ${W.x} ${W.y} ${W.z} minecraft:farmland 7 replace`);
    srv.send(`setblock ${W.x} ${W.y + 1} ${W.z} minecraft:wheat 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand minecraft:dye 8 15`);
    await L.tp(srv, W.x + 0.5, W.y + 1, W.z + 3.5, { bot: bot.username, wait: 700 });
    await L.lookAtTop(bot, W.x, W.y + 1, W.z);
    let from = srv.all.length;
    L.useBlock(srv, W.x, W.y + 1, W.z, bot.username);
    await L.sleep(1000);
    L.log('bonemeal', JSON.stringify({ rows: srv.all.slice(from).map(L.strip).filter((l) => /TestLog|FarmLog/.test(l)),
      age: await L.testBlock(srv, W.x, W.y + 1, W.z, 'minecraft:wheat', 1), held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null }));

    /* manure on red mushroom on grass */
    const R = { x: AX + 4, y: AY - 1, z: AZ };
    srv.send(`setblock ${R.x} ${R.y} ${R.z} minecraft:grass 0 replace`);
    srv.send(`setblock ${R.x} ${R.y + 1} ${R.z} minecraft:red_mushroom 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, R.x + 0.5, R.y + 1, R.z + 3.5, { bot: bot.username, wait: 700 });
    await L.lookAtTop(bot, R.x, R.y + 1, R.z);
    from = srv.all.length;
    L.useBlock(srv, R.x, R.y + 1, R.z, bot.username);
    await L.sleep(1200);
    L.log('manure-red', JSON.stringify({ rows: srv.all.slice(from).map(L.strip).filter((l) => /TestLog|FarmLog/.test(l)),
      held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null }));

    /* manure on farmland again */
    const F = { x: AX + 8, y: AY - 1, z: AZ };
    srv.send(`setblock ${F.x} ${F.y} ${F.z} minecraft:farmland 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, F.x + 0.5, F.y + 1, F.z + 3.5, { bot: bot.username, wait: 700 });
    await L.lookAtTop(bot, F.x, F.y, F.z);
    from = srv.all.length;
    L.useBlock(srv, F.x, F.y, F.z, bot.username);
    await L.sleep(1200);
    L.log('manure-farm', JSON.stringify({ rows: srv.all.slice(from).map(L.strip).filter((l) => /TestLog|FarmLog/.test(l)),
      held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null }));

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
