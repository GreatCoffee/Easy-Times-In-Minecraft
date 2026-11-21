#!/usr/bin/env node
/** f7-wb-diag3.js - manure onItemUse face diagnosis (crop recursion vs farmland top vs bot.activateBlock). */
'use strict';
const fs = require('fs');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-diag3';
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
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true });
    await L.tp(srv, AX + 0.5, AY, AZ + 0.5, { bot: bot.username, wait: 1800 });
    srv.send(`fill ${AX - 10} ${AY - 2} ${AZ - 10} ${AX + 10} ${AY - 2} ${AZ + 10} minecraft:stone 0`);
    srv.send(`fill ${AX - 10} ${AY - 1} ${AZ - 10} ${AX + 10} ${AY + 5} ${AZ + 10} minecraft:air 0`);
    await L.sleep(1200);

    /* crop recursion arm */
    const C = { x: AX, y: AY - 1, z: AZ };
    srv.send(`setblock ${C.x} ${C.y} ${C.z} minecraft:farmland 0 replace`);
    srv.send(`setblock ${C.x} ${C.y + 1} ${C.z} minecraft:wheat 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, C.x + 0.5, C.y + 1, C.z + 3.5, { bot: bot.username, wait: 900 });
    await L.lookAtTop(bot, C.x, C.y + 1, C.z);
    let from = srv.all.length;
    L.useBlock(srv, C.x, C.y + 1, C.z, bot.username);
    await L.sleep(1200);
    L.log('crop-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog/.test(l))));
    L.log('crop-te', JSON.stringify(await L.testBlock(srv, C.x, C.y, C.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}')));
    L.log('held-crop', bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null);

    /* farm top arm via etest useblock */
    const F = { x: AX + 3, y: AY - 1, z: AZ };
    srv.send(`setblock ${F.x} ${F.y} ${F.z} minecraft:farmland 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, F.x + 0.5, F.y + 1, F.z + 3.5, { bot: bot.username, wait: 900 });
    await L.lookAtTop(bot, F.x, F.y, F.z);
    from = srv.all.length;
    L.useBlock(srv, F.x, F.y, F.z, bot.username);
    await L.sleep(1200);
    L.log('farm-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog/.test(l))));
    L.log('farm-te', JSON.stringify(await L.testBlock(srv, F.x, F.y, F.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}')));
    L.log('held-farm', bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null);

    /* farm top arm via bot.activateBlock (direction=UP) */
    const G = { x: AX + 6, y: AY - 1, z: AZ };
    srv.send(`setblock ${G.x} ${G.y} ${G.z} minecraft:farmland 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, G.x + 0.5, G.y + 1, G.z + 3.5, { bot: bot.username, wait: 900 });
    const block = bot.blockAt(new Vec3(G.x, G.y, G.z));
    from = srv.all.length;
    try { await bot.activateBlock(block); } catch (e) { L.log('activate-block', e.message); }
    await L.sleep(1200);
    L.log('activate-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog/.test(l))));
    L.log('activate-te', JSON.stringify(await L.testBlock(srv, G.x, G.y, G.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}')));
    L.log('held-activate', bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null);

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
