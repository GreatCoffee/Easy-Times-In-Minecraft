#!/usr/bin/env node
/**
 * f10-pg-smoke.js — produceGoods batch (B-10) main-session smoke (not a verdict run).
 * Faces: S1 milking serve + deny (bot bucket → activateEntity; the R196 full-meter
 * serve 然后空表 deny), S2 meter re-seed + second serve, S3 natural counter growth +
 * egg gate from seeded counters (natural 1/20 cadence watch), S4 the step pump
 * (deterministic rolls through produceGoods — feather overflow drop + egg rows),
 * S5 value-trace readouts (milk/counter/feathers columns on well livestock).
 * The master-off face (livestockProductionR196=false, vanilla egg lane + infinite
 * milk) is a boot-time cfg — 判窗 double-boot face, not in this smoke.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-smoke';
const WORLD = 'f10pg';
const FX = 297, FZ = 847, TY = 100;   // pen floor top face at TY, 13x13
let ev = { tag: TAG, startedAt: new Date().toISOString(), logs: [] };

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');   // [FarmLog] milk/prod rows ride this gate
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);

    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 1500 });

    // ---- pen: the diag2-verified layered rebuild — whole-region clear first,
    // floor, then per-layer cobble ring + interior air refill (the flat
    // single-pass air fill left stale wall blocks around the feet: inWall arm)
    srv.send('gamerule randomTickSpeed 3');
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

    // ---- livestock (NoAI station plumes, spaced > 4.5 so crowd boxes stay clean)
    const guardFrom = mark();  // inWall damage rows are logged the FIRST ticks
    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 8.5} ${TY + 1} ${FZ + 2.5} {NoAI:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 9.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b}`);
    srv.send(`summon minecraft:sheep ${FX + 2.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b}`);
    srv.send(`summon minecraft:pig ${FX + 9.5} ${TY + 1} ${FZ + 6.5} {NoAI:1b}`);
    await L.sleep(3000);
    // inWall guard — the pen must hold them free; a suffocation arm aborts
    const wallRows = rowsFrom(guardFrom).filter((l) => /inWall/.test(l));
    ev.pen = { inWallRows: wallRows.length, sample: wallRows.slice(0, 2) };
    if (wallRows.length) throw new Error('pen animals suffocating (inWall) — staging broken');
    const botView = Object.values(bot.entities || {}).filter((e) => e && e.name
      && /cow|sheep|chicken|pig/i.test(e.name)).map((e) => e.name + '#' + e.id);
    ev.pen.entities = botView;
    if (botView.filter((n) => /cow/.test(n)).length < 1) throw new Error('no cow in pen');
    L.log('pen', JSON.stringify(ev.pen.entities) + ' inWall=' + wallRows.length);

    const pick = (need) => bot.inventory.items().find((i) => i.name === need);
    const equ = async (name) => {
      const it = pick(name);
      if (!it) throw new Error('no ' + name + ' in bot inv');
      await bot.equip(it, 'hand');
      await L.sleep(400);
    };
    const cowFace = () => Object.values(bot.entities || {}).find((e) => e && e.name === 'cow'
      && e.position && e.position.distanceTo(bot.entity.position) < 3);
    if (!cowFace()) {
      // park next to the pen cow — the reach gate cuts interaction at 2.75
      const cow = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow');
      if (cow) {
        await L.tp(srv, cow.position.x + 1.1, cow.position.y, cow.position.z + 1.0, { bot: bot.username, wait: 900 });
      }
    }

    // ---- S1: serve (meter starts 100) then deny (meter 0) — the bot stands
    // next to the cow: the ETIM reach gate denies entity interact > 2.75 blocks
    srv.send(`give ${L.BOT} minecraft:bucket 1`);
    await L.sleep(600);
    await equ('bucket');
    const cow1 = cowFace();
    if (!cow1) throw new Error('cow not in bot sight');
    ev.s1 = {};
    const from1 = mark();
    await bot.activateEntity(cow1);
    await L.sleep(1200);
    let r = rowsFrom(from1).filter((l) => /milk src=cow/.test(l));
    ev.s1.serveRow = r.find((l) => /serve/.test(l)) || '';
    ev.s1.denyEarly = r.filter((l) => /deny/.test(l)).length;
    await L.sleep(400);
    ev.s1.handAfterServe = (bot.heldItem || {}).name || null;

    const from2 = mark();
    await bot.activateEntity(cow1);
    await L.sleep(1200);
    r = rowsFrom(from2).filter((l) => /milk src=cow/.test(l));
    ev.s1.denyRow = r.find((l) => /deny/.test(l)) || '';
    await L.sleep(400);
    ev.s1.handAfterDeny = (bot.heldItem || {}).name || null;
    L.log('S1 ' + JSON.stringify({ serve: ev.s1.serveRow.slice(0, 160), deny: ev.s1.denyRow.slice(0, 160), handServe: ev.s1.handAfterServe, handDeny: ev.s1.handAfterDeny }));

    // ---- S2: reseed milk=100 → serve again (prod via the bot as the sender —
    // console-sender /etest state commands have no player radius face)
    srv.send(`etest prod ${L.BOT} milk=100`);
    await L.sleep(800);
    srv.send(`give ${L.BOT} minecraft:bucket 1`);
    await L.sleep(600);
    await equ('bucket');
    const from3 = mark();
    await bot.activateEntity(cowFace() || cow1);
    await L.sleep(1200);
    r = rowsFrom(from3).filter((l) => /milk src=cow/.test(l));
    ev.s2 = { serveRow2: r.find((l) => /serve/.test(l)) || '', handAfterServe2: (bot.heldItem || {}).name || null };
    L.log('S2 ' + JSON.stringify({ serve2: ev.s2.serveRow2.slice(0, 160), hand: ev.s2.handAfterServe2 }));

    // ---- S4: step pump on the chickens — counters in, deterministic rolls out.
    // The egg gate (counter 200, 1/20) clears its counter on success; the
    // feather gate (counter 100, 1/500) needs a SEPARATE low-counter seed
    // or the R196 order (feater first) starves it behind the egg face.
    const from4 = mark();
    srv.send(`etest prod ${L.BOT} 12 counter=200 feather=2 step=600`);
    await L.sleep(2500);
    r = rowsFrom(from4).filter((l) => /\[AILog\] production/.test(l) || /\[FarmLog\] prod /.test(l));
    ev.s4 = {
      prodCmd: r.find((l) => /\[FarmLog\] prod /.test(l)) || '',
      eggs: r.filter((l) => /kind=egg/.test(l)).length,
      featherDrops: r.filter((l) => /kind=feather drop=1/.test(l)).length,
      featherGrows: r.filter((l) => /kind=feather grew=true/.test(l)).length,
      sample: r.slice(0, 3),
    };
    L.log('S4 ' + JSON.stringify({ eggs: ev.s4.eggs, fd: ev.s4.featherDrops, fg: ev.s4.featherGrows }));

    // ---- S5: the feather pump — counter held at the 100 gate (feather-first
    // order means a counter=200 seed clears on the egg face before the
    // 1/500 feather arm can win; a fresh seed each command keeps one chick
    // on the feather arm). num=max(2/2) ⇒ gainFeather overflows → drop 1.
    const from6 = mark();
    srv.send(`etest prod ${L.BOT} 12 counter=100 feather=2 step=2000`);
    await L.sleep(3500);
    r = rowsFrom(from6).filter((l) => /\[AILog\] production/.test(l));
    ev.s5 = {
      featherDrops: r.filter((l) => /kind=feather drop=1/.test(l)).length,
      sample: r.slice(0, 2),
    };
    L.log('S5 ' + JSON.stringify({ fd: ev.s5.featherDrops }));

    // ---- S3: natural gate — seed counters, wait out the 1/20 cadence
    srv.send(`etest prod ${L.BOT} 12 counter=200`);
    const from5 = mark();
    const deadline = Date.now() + 330000;
    let eggRows = 0;
    let lastTick = mark();
    while (Date.now() < deadline) {
      await L.sleep(15000);
      const chunk = rowsFrom(lastTick);
      lastTick = mark();
      eggRows += chunk.filter((l) => /\[AILog\] production/.test(l) && /kind=egg/.test(l)).length;
      if (eggRows >= 1) break;
    }
    const vm = rowsFrom(from5).filter((l) => /\[AILog\] livestock-value/.test(l));
    ev.s3 = {
      eggRows,
      valueSample: vm.filter((l) => /EntityCow|EntitySheep/.test(l)).slice(-4).map((l) => l.slice(0, 220)),
      sheepZero: vm.filter((l) => /EntitySheep/.test(l)).every((l) => / counter=0 /.test(l)),
      cowCounterGrow: vm.filter((l) => /EntityCow/.test(l)).map((l) => (l.match(/counter=(\d+)/) || [])[1]).filter(Boolean),
    };
    L.log('S3 ' + JSON.stringify({ eggRows: ev.s3.eggRows, sheepZero: ev.s3.sheepZero, cowCounter: ev.s3.cowCounterGrow }));

    // ---- cleanup
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    await L.sleep(300);
    ev.ok = true;
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('smoke-done', 'evidence written');
  } catch (e) {
    ev.error = (e && e.stack) || e.message || String(e);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('SMOKE-FAIL', ev.error);
    process.exitCode = 2;
  } finally {
    // cleanup: debug flags off (cfg master livestockProductionR196 stays true)
    srv.send('gamerule randomTickSpeed 3');
    srv.send('gamerule doDaylightCycle true');
    await L.sleep(500);
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    await L.sleep(300);
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
