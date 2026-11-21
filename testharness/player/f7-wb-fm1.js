#!/usr/bin/env node
/**
 * f7-wb-fm1.js - W-FM1 single-point regression (B-1 修·甲, fix HEAD adb2f38).
 *
 * R1: mycelium TOP + brown mushroom above, manure right-click x40.
 *     The 0.5 roll is GONE (R196 BlockMycelium.fertilize has none); the row
 *     is now `fertilize src=manure chain=mycelium roll=none`. With enough
 *     clearance every roll must produce a giant (deterministic face).
 *     Clearance rule (WorldGenBigMushroom): 7x7 column, j up to y+1+i with
 *     i in 4..6 and the 1/12 x2 => y+13; trunk from y. So 7x7x14 air above
 *     the mushroom, inside a ceilinged room (indoor face).
 * R2: red mushroom 20 rolls (0.5 unchanged, roll field still present,
 *     giant <=> pass) + farm TOP one click (fertilized set + soilEnrichment).
 * R3: closeout pins.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm1';
const WORLD = 'f7wd';
const AY = 140;
const MX = 166, MZ = 700;   // mycelium room
const RX = 186, RZ = 700;   // red mushroom plot (outdoor)
const FX = 206, FZ = 700;   // farmland pickle

const PIN2 = {
  head: 'adb2f38',
  rel: { bytes: 952595, sha: 'C5C3A1521C285FF7AB6063F169D277B25192C57269D979957AF516438DB43157' },
  dev: { bytes: 933791, sha: '97EA46174213CA973AE263EE0303CFA068D0083C98CBC3ED953D3763FC4711B8' },
  src: { bytes: 865859, sha: '8AB0EEC570A2C71B96B023E082C2B5C032AB98E25E1BC37806A0BD853FB9AC44' },
};

const sleep = L.sleep;
const log = L.log;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), rolls: [], red: [], farm: null };
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN2.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN2.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN2.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN2.src, 'src') };
  ev.mk = L.mkCounts();
  const cfgBefore = fs.readFileSync(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfg=' + ev.cfgBefore.keys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    const idLine = srv.all.map(L.strip).find((l) => /\[EtimInit\].*ids=/.test(l)) || '';
    ev.ids = (/ids=([\d\s]+)/.exec(idLine) || [])[1] ? (/ids=([\d\s]+)/.exec(idLine)[1].trim().split(/\s+/).map(Number)) : null;
    ev.manureRegRows = srv.all.map(L.strip).filter((l) => /\[FarmLog\] manure reg/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail + ' ids=' + JSON.stringify(ev.ids));

    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true, time: 18000 });
    const who = bot.username;

    // ---- pad + room + red plot + farm spot (all after a TP to load chunks) ----
    await L.tp(srv, MX + 0.5, AY, MZ + 0.5, { bot: who, wait: 2400 });
    srv.send(`fill 154 ${AY - 2} 688 218 ${AY - 2} 712 minecraft:stone 0`);
    await sleep(900);
    // room shell 13x13, interior 11x11 (161..171 / 695..705), ceiling AY+16
    srv.send(`fill 161 ${AY - 1} 695 171 ${AY - 1} 705 minecraft:mycelium 0 replace`);
    srv.send(`fill 160 ${AY - 1} 694 160 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 172 ${AY - 1} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 694 172 ${AY + 16} 694 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 706 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY + 16} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 161 ${AY} 695 171 ${AY + 15} 705 minecraft:air 0`);
    // red plot: grass pad, open sky, 17+ clear
    srv.send(`fill 179 ${AY - 1} 693 193 ${AY - 1} 707 minecraft:grass 0 replace`);
    srv.send(`fill 179 ${AY} 693 193 ${AY + 19} 707 minecraft:air 0`);
    await sleep(1200);

    ev.checks = {};
    ev.zeroChannels = L.rowCounts(srv.all.map(L.strip));

    /* ================= R1 mycelium TOP x40 ================= */
    // warm-up: the very FIRST item-use after join/stage is dropped by the packet
    // path (run 1: 40 useblock vs 39 rows, held 5->5 on roll 1). Absorb it on a
    // DIRT block (unhandled => PASS, no FarmLog row, no consumption) at the same
    // spot so all 40 judged rolls are live.
    srv.send(`gamemode 0 ${who}`);
    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 5`);
    srv.send(`setblock ${MX} ${AY - 1} ${MZ} minecraft:dirt 0 replace`);
    srv.send(`setblock ${MX} ${AY} ${MZ} minecraft:air 0 replace`);
    await sleep(900);
    await L.tp(srv, MX + 0.5, AY, MZ + 2.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, MX, AY - 1, MZ);
    const warmFrom = srv.all.length;
    L.useBlock(srv, MX, AY - 1, MZ, who);
    await sleep(700);
    ev.warmup = {
      useblocks: srv.all.slice(warmFrom).map(L.strip).filter((l) => /step=useblock/.test(l)).length,
      farmRows: srv.all.slice(warmFrom).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length,
      held: bot.heldItem ? bot.heldItem.count : null,
    };
    log('warmup', JSON.stringify(ev.warmup));
    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 5`);
    await sleep(900);
    ev.heldStart = bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
    L.log('R1-start', 'held=' + JSON.stringify(ev.heldStart));

    let from = srv.all.length;
    const t0 = Date.now();
    for (let i = 0; i < 40; i++) {
      if (!bot.heldItem || bot.heldItem.count <= 0) {
        srv.send(`clear ${who}`);
        srv.send(`give ${who} etim:manure 5`);
        await sleep(650);
      }
      const before = bot.heldItem ? bot.heldItem.count : 0;
      srv.send(`fill ${MX - 3} ${AY} ${MZ - 3} ${MX + 3} ${AY + 13} ${MZ + 3} minecraft:air 0`);
      srv.send(`setblock ${MX} ${AY - 1} ${MZ} minecraft:mycelium 0 replace`);
      srv.send(`setblock ${MX} ${AY} ${MZ} minecraft:brown_mushroom 0 replace`);
      await L.tp(srv, MX + 0.5, AY, MZ + 2.0, { bot: who, wait: 150 });
      await L.lookAtTop(bot, MX, AY - 1, MZ);
      L.useBlock(srv, MX, AY - 1, MZ, who);
      await sleep(330);
      const giant = await L.testBlock(srv, MX, AY, MZ, 'minecraft:brown_mushroom_block');
      const after = bot.heldItem ? bot.heldItem.count : 0;
      ev.rolls.push({ i: i + 1, before, after, delta: after - before, giant: giant.ok, raw: giant.ok ? '' : giant.raw.slice(0, 90) });
      if ((i + 1) % 10 === 0) log('R1', JSON.stringify({ i: i + 1, giant: ev.rolls.filter((r) => r.giant).length, sec: Math.round((Date.now() - t0) / 1000) }));
    }
    await sleep(900);
    const myRows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize src=manure chain=mycelium/.test(l));
    ev.myRows = myRows;
    ev.myRowCount = myRows.length;
    ev.myRowRollNone = myRows.filter((l) => /roll=none/.test(l)).length;
    ev.myRowNoRollField = myRows.filter((l) => !/roll=/.test(l)).length;
    ev.giantCount = ev.rolls.filter((r) => r.giant).length;
    ev.deltas = ev.rolls.map((r) => r.delta);
    ev.deltaMinusOne = ev.deltas.filter((d) => d === -1).length;
    ev.heldEnd = bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
    ev.R1sec = Math.round((Date.now() - t0) / 1000);
    log('R1', JSON.stringify({ rows: ev.myRowCount, rollNone: ev.myRowRollNone, noRollField: ev.myRowNoRollField,
      giant: ev.giantCount, delta1: ev.deltaMinusOne, deltas: ev.deltas.slice(0, 8), sec: ev.R1sec }));
    if (ev.giantCount < 40) log('R1-fails', JSON.stringify(ev.rolls.filter((r) => !r.giant)));

    /* ================= R2a red mushroom x20 (0.5 unchanged) ================= */
    srv.send(`gamemode 1 ${who}`);
    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 16`);
    await sleep(700);
    from = srv.all.length;
    const t1 = Date.now();
    for (let i = 0; i < 20; i++) {
      srv.send(`fill ${RX - 3} ${AY} ${RZ - 3} ${RX + 3} ${AY + 16} ${RZ + 3} minecraft:air 0`);
      srv.send(`setblock ${RX} ${AY - 1} ${RZ} minecraft:grass 0 replace`);
      srv.send(`setblock ${RX} ${AY} ${RZ} minecraft:red_mushroom 0 replace`);
      await L.tp(srv, RX + 0.5, AY, RZ + 2.0, { bot: who, wait: 150 });
      await L.lookAtTop(bot, RX, AY, RZ);
      L.useBlock(srv, RX, AY, RZ, who);
      await sleep(300);
      const giant = await L.testBlock(srv, RX, AY, RZ, 'minecraft:red_mushroom_block');
      ev.red.push({ i: i + 1, giant: giant.ok });
    }
    await sleep(800);
    const redRows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize src=manure kind=red/.test(l));
    const redRolls = redRows.map((l) => parseFloat((/roll=([\d.]+)/.exec(l) || [])[1])).filter((x) => !isNaN(x));
    ev.redRows = redRows;
    ev.redRowCount = redRows.length;
    ev.redPass = redRolls.filter((v) => v < 0.5).length;
    ev.redFail = redRolls.filter((v) => v >= 0.5).length;
    ev.redGiant = ev.red.filter((r) => r.giant).length;
    ev.redPairOK = ev.redGiant === ev.redPass;
    ev.R2redSec = Math.round((Date.now() - t1) / 1000);
    log('R2-red', JSON.stringify({ rows: ev.redRowCount, pass: ev.redPass, fail: ev.redFail, giant: ev.redGiant, pair: ev.redPairOK }));

    /* ================= R2b farm TOP one click ================= */
    srv.send(`gamemode 0 ${who}`);
    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 5`);
    srv.send(`setblock ${FX} ${AY - 1} ${FZ} minecraft:air 0 replace`);
    srv.send(`setblock ${FX} ${AY - 1} ${FZ} minecraft:farmland 0 replace`);
    srv.send(`setblock ${FX} ${AY} ${FZ} minecraft:air 0 replace`);
    await sleep(800);
    const beforeFarm = bot.heldItem ? bot.heldItem.count : 0;
    from = srv.all.length;
    await L.tp(srv, FX + 0.5, AY, FZ + 2.0, { bot: who, wait: 600 });
    await L.lookAtTop(bot, FX, AY - 1, FZ);
    L.useBlock(srv, FX, AY - 1, FZ, who);
    await sleep(900);
    const farmRows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
    ev.farm = {
      before: beforeFarm,
      after: bot.heldItem ? bot.heldItem.count : 0,
      rows: farmRows,
      set: farmRows.filter((l) => /fertilized set .*value=true/.test(l)).length,
      soil: farmRows.filter((l) => /fertilize src=manure chain=farm soilEnrichment=1/.test(l)).length,
      te: await L.testBlock(srv, FX, AY - 1, FZ, 'minecraft:farmland', -1, '{EtimFertilized:1b}'),
    };
    log('R2-farm', JSON.stringify({ before: ev.farm.before, after: ev.farm.after, set: ev.farm.set, soil: ev.farm.soil, te: ev.farm.te.ok }));

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, PIN2.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN2.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN2.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
