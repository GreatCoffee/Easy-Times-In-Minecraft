#!/usr/bin/env node
/** f7-wb-diag4.js - held-slot diagnosis for manure. */
'use strict';
const fs = require('fs');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-diag4';
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
    srv.send(`fill ${AX - 8} ${AY - 2} ${AZ - 8} ${AX + 8} ${AY - 2} ${AZ + 8} minecraft:stone 0`);
    srv.send(`fill ${AX - 8} ${AY - 1} ${AZ - 8} ${AX + 8} ${AY + 5} ${AZ + 8} minecraft:air 0`);
    await L.sleep(1200);
    srv.send(`setblock ${AX} ${AY - 1} ${AZ} minecraft:farmland 0 replace`);
    srv.send(`setblock ${AX + 3} ${AY - 1} ${AZ} minecraft:farmland 0 replace`);
    srv.send(`setblock ${AX + 6} ${AY - 1} ${AZ} minecraft:farmland 0 replace`);

    const tryVariant = async (label, giveCmds, x) => {
      for (const c of giveCmds) srv.send(c);
      await L.sleep(500);
      try { bot.setQuickBarSlot(0); } catch (e) { /* noop */ }
      await L.sleep(400);
      const from = srv.all.length;
      srv.send(`etest enchant mainhand 1 fertility ${bot.username}`);
      await L.sleep(500);
      await L.tp(srv, x + 0.5, AY, AZ + 3.5, { bot: bot.username, wait: 600 });
      await L.lookAtTop(bot, x, AY - 1, AZ);
      const f2 = srv.all.length;
      L.useBlock(srv, x, AY - 1, AZ, bot.username);
      await L.sleep(1100);
      const rows = srv.all.slice(f2).map(L.strip).filter((l) => /FarmLog|TestLog|EtimTest/.test(l));
      const ench = srv.all.slice(from).map(L.strip).filter((l) => /EtimTest|ench/.test(l));
      L.log(label, JSON.stringify({ ench: ench.slice(0, 2), rows, held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
        te: await L.testBlock(srv, x, AY - 1, AZ, 'minecraft:farmland', -1, '{EtimFertilized:1b}') }));
    };

    await tryVariant('A-hotbar0', [`replaceitem entity ${bot.username} slot.hotbar.0 etim:manure 5 0`], AX);
    await tryVariant('B-give', [`give ${bot.username} etim:manure 5`], AX + 3);
    await tryVariant('C-mainhand', [`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`], AX + 6);

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
