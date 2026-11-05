#!/usr/bin/env node
/**
 * f8-dr-smoke.js — drought-death batch (B-8) main-session smoke (not a verdict run).
 * Faces: S1 immature→dead_crop (age parity), S2 mature→drop1+air, S3 water exempt,
 * S4 moist skip, S5 stem→dead_stem, S6 natural-lane dead block stays frozen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f8-dr-smoke';
const WORLD = 'f8db';
const AX = 186, AY = 100, AZ = 790;

let ev = { tag: TAG, startedAt: new Date().toISOString(), logs: [] };

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);

    bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    await L.tp(srv, AX + 0.5, AY, AZ + 0.5, { bot: bot.username, wait: 1500 });

    const A = { x: AX, y: AY - 1, z: AZ };
    srv.send(`fill ${AX - 12} ${AY} ${AZ - 12} ${AX + 12} ${AY + 8} ${AZ + 12} minecraft:air 0`);
    srv.send(`fill ${AX - 12} ${AY - 1} ${AZ - 12} ${AX + 12} ${AY - 1} ${AZ + 12} minecraft:stone 0`);
    await L.sleep(800);

    const droughtRoll = async (x, y, z, p) => {
      const from = mark();
      srv.send(`etest drought roll ${x} ${y} ${z} ${p}`);
      await L.sleep(700);
      return rowsFrom(from).filter((l) => /\[FarmLog\] drought/.test(l));
    };

    // --- S1: dry farmland + immature wheat age 3 → dead_crop age 3
    srv.send(`setblock ${A.x} ${A.y} ${A.z} minecraft:farmland 0`);
    srv.send(`setblock ${A.x} ${A.y + 1} ${A.z} minecraft:wheat 3`);
    await L.sleep(500);
    ev.s1 = { rows: await droughtRoll(A.x, A.y + 1, A.z, '1.0'),
      block: await L.testBlock(srv, A.x, A.y + 1, A.z, 'etim:dead_crop', 3) };
    L.log('S1', JSON.stringify(ev.s1));

    // --- S2: mature wheat age 7 → drop wheat#1 + air (drop face carried by the log row; the spawned item is verified by the block going air + kill check below)
    srv.send(`setblock ${A.x} ${A.y} ${A.z} minecraft:farmland 0`);
    await L.sleep(300);
    srv.send(`setblock ${A.x} ${A.y + 1} ${A.z} minecraft:wheat 7`);
    await L.sleep(500);
    const from2 = mark();
    ev.s2 = { rows: await droughtRoll(A.x, A.y + 1, A.z, '1.0'),
      block: await L.testBlock(srv, A.x, A.y + 1, A.z, 'minecraft:air') };
    srv.send('kill @e[type=item]');
    await L.sleep(400);
    ev.s2.itemsAround = rowsFrom(from2).filter((l) => /Kill|removed|entities/i.test(l)).slice(0, 2);
    L.log('S2', JSON.stringify(ev.s2));

    // --- S3: dry farmland but water 3 blocks away → skip-water
    const W = { x: A.x + 4, y: A.y, z: A.z };
    srv.send(`setblock ${A.x} ${A.y} ${A.z} minecraft:farmland 0`);
    srv.send(`setblock ${W.x} ${W.y} ${W.z} minecraft:water 0`);
    srv.send(`setblock ${A.x} ${A.y + 1} ${A.z} minecraft:wheat 2`);
    await L.sleep(500);
    ev.s3 = { rows: await droughtRoll(A.x, A.y + 1, A.z, '1.0'),
      block: await L.testBlock(srv, A.x, A.y + 1, A.z, 'minecraft:wheat', 2) };
    srv.send(`setblock ${W.x} ${W.y} ${W.z} minecraft:air 0`);
    await L.sleep(400);
    L.log('S3', JSON.stringify(ev.s3));

    // --- S4: moist farmland → skip-not-dry (freeze face, no drought roll)
    srv.send(`setblock ${A.x} ${A.y} ${A.z} minecraft:farmland 7`);
    srv.send(`setblock ${A.x} ${A.y + 1} ${A.z} minecraft:wheat 2`);
    await L.sleep(500);
    ev.s4 = { rows: await droughtRoll(A.x, A.y + 1, A.z, '1.0'),
      block: await L.testBlock(srv, A.x, A.y + 1, A.z, 'minecraft:wheat', 2) };
    L.log('S4', JSON.stringify(ev.s4));

    // --- S5: dry farmland + pumpkin stem age 4 → dead_stem age 4 (D-2 乙 carrier)
    srv.send(`setblock ${A.x} ${A.y} ${A.z} minecraft:farmland 0`);
    srv.send(`setblock ${A.x} ${A.y + 1} ${A.z} minecraft:pumpkin_stem 4`);
    await L.sleep(500);
    ev.s5 = { rows: await droughtRoll(A.x, A.y + 1, A.z, '1.0'),
      block: await L.testBlock(srv, A.x, A.y + 1, A.z, 'etim:dead_stem', 4) };
    L.log('S5', JSON.stringify(ev.s5));

    // --- S6: dead blocks stay frozen — force 300 natural random ticks by rts burst near the arena
    srv.send(`gamerule randomTickSpeed 50`);
    const before = mark();
    await L.sleep(9000);
    const rowsS6 = rowsFrom(before).filter((l) => /\[FarmLog\] (growth|drought)/.test(l));
    ev.s6 = { deadFrozenRows: rowsS6.filter((l) => /dead_crop|dead_stem/.test(l)).length,
      gateRows: rowsS6.filter((l) => /growth gate dry/.test(l)).length, rows: rowsS6.slice(0, 5) };
    srv.send('gamerule randomTickSpeed 3');
    L.log('S6', JSON.stringify({ deadFrozen: ev.s6.deadFrozenRows, gates: ev.s6.gateRows }));

    const verdictBody = JSON.stringify(ev, null, 1);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), verdictBody, 'utf8');
    L.log('smoke-done', 'evidence written');
  } catch (e) {
    L.log('SMOKE-FAIL', e && e.stack || e.message || e);
    process.exitCode = 2;
  } finally {
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (e) { L.log('stop-err', e.message); }
  }
}
main();
