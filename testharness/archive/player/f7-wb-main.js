#!/usr/bin/env node
/**
 * f7-wb-main.js - W-FM main window (instant faces + farm1 regression + W-FM-REG).
 * Covers W-FM1 (dry gate), W-FM4 (decay + entity lift), W-FM5/6 (bucket/bottle),
 * W-FM7 (manure farm/crops/mushrooms/mycelium), W-FM8 (trample order/immunity),
 * W-FM9 (farm1 regression), W-FM-REG (reg rows/ids).
 *
 * Harness lessons baked in:
 *  - TP to the arena BEFORE /fill (unloaded chunks reject fill).
 *  - ETIM reach: non-tool block use <= 2.75; stand 2.0 from the block.
 *  - bucket/bottle ride bot.activateItem (onItemRightClick ray) not block use.
 *  - trample rides a real fall (physics on); NoAI cows never fall.
 *  - FarmLog gate is farmDebugLog=true (set before boot).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-main';
const WORLD = 'f7wc';
const AY = 140;

const AREA = {
  dry: { x: 176, z: 751 },
  wet: { x: 196, z: 771 },
  bucket: { x: 176, z: 771 },
  bottle: { x: 176, z: 731 },
  manure: { x: 196, z: 731 },
  mushroom: { x: 206, z: 751 },
  room: { x: 166, z: 751 },
  trample: { x: 176, z: 711 },
  decay: { x: 196, z: 711 },
  farm1: { x: 156, z: 731 },
  pool: { x: 186, z: 761 },
};

const sleep = L.sleep;
const log = L.log;
const R = (s) => s.map(L.strip);

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), checks: {} };
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(L.PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const cfgBefore = fs.readFileSync(L.CFG);
  const keysBefore = L.cfgKeys(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  ev.cfgGated = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)) };
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfg=' + ev.cfgBefore.keys + ' keys');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    const idLine = srv.all.map(L.strip).find((l) => /\bids=/.test(l)) || '';
    ev.ids = { line: idLine.slice(0, 200), ids: (/\bids=([\d\s]+)/.exec(idLine) || [])[1] ? (/\bids=([\d\s]+)/.exec(idLine)[1].trim().split(/\s+/).map(Number)) : null };
    ev.manureRegRows = srv.all.map(L.strip).filter((l) => /\[FarmLog\] manure reg/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail + ' ids=' + JSON.stringify(ev.ids.ids) + ' manureReg=' + ev.manureRegRows);

    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    // arena load first
    await L.tp(srv, 186.5, AY, 761.5, { bot: bot.username, wait: 2500 });
    srv.send(`fill 150 ${AY - 2} 695 225 ${AY - 2} 790 minecraft:stone 0`);
    srv.send(`fill 150 ${AY - 1} 695 225 ${AY + 10} 790 minecraft:air 0`);
    await sleep(1800);
    const clearArea = async (x, z, r) => {
      srv.send(`fill ${x - r} ${AY - 1} ${z - r} ${x + r} ${AY + 9} ${z + r} minecraft:air 0`);
      await sleep(350);
    };
    await sleep(600);
    ev.arenaBiome = await bot.world.getBiome(new Vec3(186, 64, 761));
    log('arena', 'biome=' + ev.arenaBiome);
    const who = bot.username;
    const tf = (x, y, z, block, data, nbt) => L.testBlock(srv, x, y, z, block, data, nbt);
    const useAt = async (x, y, z) => {
      await L.tp(srv, x + 0.5, y + 1, z + 2.0, { bot: who, wait: 450 });
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(900);
    };

    /* ================= W-FM1 dry gate + wet control ================= */
    {
      await clearArea(AREA.dry.x, AREA.dry.z, 4);
      await clearArea(AREA.wet.x, AREA.wet.z, 5);
      srv.send(`fill ${AREA.dry.x - 1} ${AY - 1} ${AREA.dry.z - 1} ${AREA.dry.x + 1} ${AY - 1} ${AREA.dry.z + 1} minecraft:farmland 0 replace`);
      srv.send(`fill ${AREA.dry.x - 1} ${AY} ${AREA.dry.z - 1} ${AREA.dry.x + 1} ${AY} ${AREA.dry.z + 1} minecraft:wheat 0 replace`);
      srv.send(`fill ${AREA.wet.x - 1} ${AY - 1} ${AREA.wet.z - 1} ${AREA.wet.x + 1} ${AY - 1} ${AREA.wet.z + 1} minecraft:farmland 7 replace`);
      srv.send(`fill ${AREA.wet.x - 1} ${AY} ${AREA.wet.z - 1} ${AREA.wet.x + 1} ${AY} ${AREA.wet.z + 1} minecraft:wheat 0 replace`);
      srv.send('gamerule randomTickSpeed 30');
      const from = mark();
      await sleep(30000);
      srv.send(`fill ${AREA.wet.x - 1} ${AY - 1} ${AREA.wet.z - 1} ${AREA.wet.x + 1} ${AY - 1} ${AREA.wet.z + 1} minecraft:farmland 7 replace`);
      await sleep(32000);
      srv.send('gamerule randomTickSpeed 3');
      srv.send(`fill ${AREA.wet.x - 1} ${AY - 1} ${AREA.wet.z - 1} ${AREA.wet.x + 1} ${AY - 1} ${AREA.wet.z + 1} minecraft:farmland 7 replace`);
      await sleep(300);
      const rows = rowsFrom(from);
      ev.checks.dryGate = {
        gateRows: rows.filter((l) => /\[FarmLog\] growth gate dry/.test(l)).length,
        gateSample: rows.filter((l) => /\[FarmLog\] growth gate dry/.test(l)).slice(0, 4),
        dryAge0: await tf(AREA.dry.x, AY, AREA.dry.z, 'minecraft:wheat', 0),
        wetAge: await Promise.all([1, 2, 3, 4, 5, 6, 7].map((age) => tf(AREA.wet.x, AY, AREA.wet.z, 'minecraft:wheat', age))),
        dryFarm: await tf(AREA.dry.x, AY - 1, AREA.dry.z, 'minecraft:farmland', 0),
        wetFarm: await tf(AREA.wet.x, AY - 1, AREA.wet.z, 'minecraft:farmland', 7),
      };
      log('dryGate', JSON.stringify({ gate: ev.checks.dryGate.gateRows, dryAge0: ev.checks.dryGate.dryAge0.ok,
        wetAge: ev.checks.dryGate.wetAge.map((z) => z.ok), dryFarm: ev.checks.dryGate.dryFarm.ok, wetFarm: ev.checks.dryGate.wetFarm.ok }));
    }

    /* ================= W-FM5 bucket ================= */
    {
      const B = AREA.bucket;
      await L.tp(srv, B.x + 0.5, AY, B.z + 0.5, { bot: who, wait: 900 });
      srv.send(`fill ${B.x - 1} ${AY - 1} ${B.z - 1} ${B.x + 1} ${AY - 1} ${B.z + 1} minecraft:farmland 0 replace`);
      srv.send(`fill ${B.x - 1} ${AY} ${B.z - 1} ${B.x + 1} ${AY} ${B.z + 1} minecraft:air 0`);
      srv.send(`gamemode 0 ${who}`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand minecraft:water_bucket 1 0`);
      await L.tp(srv, B.x + 0.5, AY, B.z + 3.0, { bot: who, wait: 700 });
      await L.lookAtTop(bot, B.x, AY - 1, B.z);
      const from = mark();
      try { await bot.activateItem(); } catch (e) { log('bucket-act', e.message); }
      await sleep(1400);
      try { bot.deactivateItem(); } catch (e) { /* noop */ }
      const rows = rowsFrom(from);
      ev.checks.bucket = {
        rows: rows.filter((l) => /\[FarmLog\] fertilize src=bucket/.test(l)),
        held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
        aboveAir: await tf(B.x, AY, B.z, 'minecraft:air'),
        centerWet: await tf(B.x, AY - 1, B.z, 'minecraft:farmland', 7),
      };
      // all 9 wet via the row list / direct probes on the 4 corners
      ev.checks.bucket.corners = await Promise.all([
        tf(B.x - 1, AY - 1, B.z - 1, 'minecraft:farmland', 7),
        tf(B.x + 1, AY - 1, B.z - 1, 'minecraft:farmland', 7),
        tf(B.x - 1, AY - 1, B.z + 1, 'minecraft:farmland', 7),
        tf(B.x + 1, AY - 1, B.z + 1, 'minecraft:farmland', 7),
      ]);
      log('bucket', JSON.stringify({ cells: ev.checks.bucket.rows.map((l) => (/cells=(\d+)/.exec(l) || [])[1]),
        held: ev.checks.bucket.held, above: ev.checks.bucket.aboveAir.ok, center: ev.checks.bucket.centerWet.ok,
        corners: ev.checks.bucket.corners.map((z) => z.ok) }));
      // full-wet arm: replace with a new bucket, use again; expect no row + no consume
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand minecraft:water_bucket 1 0`);
      await sleep(400);
      const fw = mark();
      try { await bot.activateItem(); } catch (e) { /* noop */ }
      await sleep(1200);
      try { bot.deactivateItem(); } catch (e) { /* noop */ }
      ev.checks.bucketFull = {
        rows: rowsFrom(fw).filter((l) => /\[FarmLog\] fertilize src=bucket/.test(l)),
        held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
      };
      log('bucketFull', JSON.stringify({ rows: ev.checks.bucketFull.rows.length, held: ev.checks.bucketFull.held }));
    }

    /* ================= W-FM6 bottle ================= */
    {
      const P = AREA.bottle;
      await L.tp(srv, P.x + 0.5, AY, P.z + 0.5, { bot: who, wait: 900 });
      srv.send(`fill ${P.x - 1} ${AY - 1} ${P.z - 1} ${P.x + 1} ${AY - 1} ${P.z + 1} minecraft:farmland 0 replace`);
      srv.send(`fill ${P.x - 1} ${AY} ${P.z - 1} ${P.x + 1} ${AY} ${P.z + 1} minecraft:air 0`);
      srv.send(`gamemode 0 ${who}`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand minecraft:potion 1 0`);
      await L.tp(srv, P.x + 0.5, AY, P.z + 3.0, { bot: who, wait: 700 });
      await L.lookAtTop(bot, P.x, AY - 1, P.z);
      const from = mark();
      try { await bot.activateItem(); } catch (e) { log('bottle-act', e.message); }
      await sleep(1300);
      try { bot.deactivateItem(); } catch (e) { /* noop */ }
      ev.checks.bottle = {
        rows: rowsFrom(from).filter((l) => /\[FarmLog\] fertilize src=bottle/.test(l)),
        held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
        centerWet: await tf(P.x, AY - 1, P.z, 'minecraft:farmland', 7),
        aboveAir: await tf(P.x, AY, P.z, 'minecraft:air'),
      };
      log('bottle', JSON.stringify({ rows: ev.checks.bottle.rows.length, held: ev.checks.bottle.held,
        wet: ev.checks.bottle.centerWet.ok, above: ev.checks.bottle.aboveAir.ok }));
      // full-wet arm
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand minecraft:potion 1 0`);
      await sleep(400);
      const fw = mark();
      try { await bot.activateItem(); } catch (e) { /* noop */ }
      await sleep(1100);
      try { bot.deactivateItem(); } catch (e) { /* noop */ }
      ev.checks.bottleFull = {
        rows: rowsFrom(fw).filter((l) => /\[FarmLog\] fertilize src=bottle/.test(l)),
        held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
      };
      log('bottleFull', JSON.stringify({ rows: ev.checks.bottleFull.rows.length, held: ev.checks.bottleFull.held }));
    }

    /* ================= W-FM7 manure: farm top / second hit / crop recursion ================= */
    {
      const M = AREA.manure;
      await L.tp(srv, M.x + 0.5, AY, M.z + 0.5, { bot: who, wait: 900 });
      srv.send(`setblock ${M.x} ${AY - 1} ${M.z} minecraft:farmland 0 replace`);
      srv.send(`setblock ${M.x} ${AY} ${M.z} minecraft:air 0`);
      srv.send(`gamemode 0 ${who}`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 5 0`);
      await sleep(400);
      let from = mark();
      await useAt(M.x, AY - 1, M.z);
      ev.checks.manureFarm = {
        rows: rowsFrom(from).filter((l) => /\[FarmLog\]/.test(l)),
        held: bot.heldItem ? bot.heldItem.count : null,
        te: await tf(M.x, AY - 1, M.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}'),
      };
      from = mark();
      await useAt(M.x, AY - 1, M.z);
      ev.checks.manureFarmSecond = {
        rows: rowsFrom(from).filter((l) => /\[FarmLog\]/.test(l)),
        held: bot.heldItem ? bot.heldItem.count : null,
      };
      log('manureFarm', JSON.stringify({ rows: ev.checks.manureFarm.rows.length, held: ev.checks.manureFarm.held,
        te: ev.checks.manureFarm.te.ok, secondRows: ev.checks.manureFarmSecond.rows.length,
        secondHeld: ev.checks.manureFarmSecond.held }));

      // crop recursion: click wheat above a fresh farmland
      const C = { x: M.x + 3, z: M.z };
      srv.send(`setblock ${C.x} ${AY - 1} ${C.z} minecraft:farmland 0 replace`);
      srv.send(`setblock ${C.x} ${AY} ${C.z} minecraft:wheat 0 replace`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 5 0`);
      await sleep(400);
      from = mark();
      await useAt(C.x, AY, C.z);
      ev.checks.manureCrop = {
        rows: rowsFrom(from).filter((l) => /\[FarmLog\]/.test(l)),
        held: bot.heldItem ? bot.heldItem.count : null,
        te: await tf(C.x, AY - 1, C.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}'),
      };
      log('manureCrop', JSON.stringify({ rows: ev.checks.manureCrop.rows.length, held: ev.checks.manureCrop.held,
        te: ev.checks.manureCrop.te.ok }));
    }

    /* ================= W-FM7 red mushroom 200-roll arm ================= */
    {
      const M = AREA.mushroom;
      srv.send(`fill ${M.x - 14} ${AY - 2} ${M.z - 14} ${M.x + 14} ${AY - 2} ${M.z + 14} minecraft:grass 0`);
      srv.send(`fill ${M.x - 14} ${AY - 1} ${M.z - 14} ${M.x + 14} ${AY + 8} ${M.z + 14} minecraft:air 0`);
      srv.send('time set 18000');
      srv.send(`gamemode 1 ${who}`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`);
      await L.tp(srv, M.x + 0.5, AY, M.z + 2.0, { bot: who, wait: 700 });
      const rolls = { n: 0, pass: 0, fail: 0, giant: 0, rows: 0, refills: 0 };
      let from = mark();
      const RED_ROLLS = 0; // superseded by the dedicated f7-wb-red window
      for (let i = 0; i < RED_ROLLS; i++) {
        if (i % 55 === 0) {
          srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`);
          rolls.refills++;
          await sleep(300);
        }
        srv.send(`fill ${M.x - 4} ${AY} ${M.z - 4} ${M.x + 4} ${AY + 7} ${M.z + 4} minecraft:air 0`);
        srv.send(`setblock ${M.x} ${AY - 1} ${M.z} minecraft:grass 0 replace`);
        srv.send(`setblock ${M.x} ${AY} ${M.z} minecraft:red_mushroom 0 replace`);
        await L.tp(srv, M.x + 0.5, AY, M.z + 2.0, { bot: who, wait: 180 });
        await L.lookAtTop(bot, M.x, AY, M.z);
        L.useBlock(srv, M.x, AY, M.z, who);
        await sleep(240);
        const giant = await tf(M.x, AY, M.z, 'minecraft:red_mushroom_block');
        if (giant.ok) rolls.giant++;
        if (i % 20 === 19) log('red-roll', JSON.stringify({ i: i + 1, giant: rolls.giant }));
      }
      await sleep(1000);
      const rows = rowsFrom(from).filter((l) => /\[FarmLog\] fertilize src=manure kind=red/.test(l));
      for (const l of rows) {
        const m = /roll=([\d.]+)/.exec(l);
        if (!m) continue;
        const v = parseFloat(m[1]);
        rolls.n++;
        if (v < 0.5) rolls.pass++; else rolls.fail++;
      }
      rolls.rows = rows.length;
      ev.checks.redMushroom = { ...rolls, sample: rows.slice(0, 3), last: rows.slice(-2) };
      log('redMushroom', JSON.stringify({ n: rolls.n, pass: rolls.pass, fail: rolls.fail, giant: rolls.giant, refills: rolls.refills }));
    }

    /* ================= W-FM7 brown indoor + mycelium TOP ================= */
    {
      const R = AREA.room;
      await L.tp(srv, R.x + 0.5, AY, R.z + 0.5, { bot: who, wait: 1200 });
      srv.send(`fill ${R.x - 7} ${AY - 2} ${R.z - 7} ${R.x + 7} ${AY - 2} ${R.z + 7} minecraft:stone 0`);
      srv.send(`fill ${R.x - 7} ${AY - 1} ${R.z - 7} ${R.x + 7} ${AY - 1} ${R.z + 7} minecraft:mycelium 0`);
      srv.send(`fill ${R.x - 7} ${AY} ${R.z - 7} ${R.x + 7} ${AY + 6} ${R.z + 7} minecraft:air 0`);
      srv.send(`fill ${R.x - 7} ${AY + 7} ${R.z - 7} ${R.x + 7} ${AY + 7} ${R.z + 7} minecraft:stone 0`);
      srv.send(`fill ${R.x - 7} ${AY} ${R.z - 7} ${R.x - 7} ${AY + 7} ${R.z + 7} minecraft:stone 0`);
      srv.send(`fill ${R.x + 7} ${AY} ${R.z - 7} ${R.x + 7} ${AY + 7} ${R.z + 7} minecraft:stone 0`);
      srv.send(`fill ${R.x - 7} ${AY} ${R.z - 7} ${R.x + 7} ${AY + 7} ${R.z - 7} minecraft:stone 0`);
      srv.send(`fill ${R.x - 7} ${AY} ${R.z + 7} ${R.x + 7} ${AY + 7} ${R.z + 7} minecraft:stone 0`);
      srv.send('time set 18000');
      srv.send(`gamemode 1 ${who}`);
      await L.tp(srv, R.x + 0.5, AY, R.z + 0.5, { bot: who, wait: 900 });
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`);
      await sleep(300);
      const brown = { n: 0, pass: 0, fail: 0, giant: 0 };
      let from = mark();
      for (let i = 0; i < 40; i++) {
        if (i % 22 === 0) { srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`); await sleep(250); }
        srv.send(`fill ${R.x - 4} ${AY} ${R.z - 4} ${R.x + 4} ${AY + 5} ${R.z + 4} minecraft:air 0`);
        srv.send(`setblock ${R.x} ${AY - 1} ${R.z} minecraft:mycelium 0 replace`);
        srv.send(`setblock ${R.x} ${AY} ${R.z} minecraft:brown_mushroom 0 replace`);
        await L.tp(srv, R.x + 0.5, AY, R.z + 2.0, { bot: who, wait: 160 });
        await L.lookAtTop(bot, R.x, AY, R.z);
        L.useBlock(srv, R.x, AY, R.z, who);
        await sleep(230);
        if ((await tf(R.x, AY, R.z, 'minecraft:brown_mushroom_block')).ok) brown.giant++;
      }
      await sleep(800);
      const rows = rowsFrom(from).filter((l) => /\[FarmLog\] fertilize src=manure kind=brown/.test(l));
      for (const l of rows) { const m = /roll=([\d.]+)/.exec(l); if (!m) continue; brown.n++; if (parseFloat(m[1]) < 0.5) brown.pass++; else brown.fail++; }
      ev.checks.brownMushroom = { ...brown, rows: rows.length, sample: rows.slice(0, 3) };
      log('brownMushroom', JSON.stringify({ n: brown.n, pass: brown.pass, fail: brown.fail, giant: brown.giant }));

      // mycelium TOP + brown above
      const my = { n: 0, giant: 0, rows: 0 };
      from = mark();
      for (let i = 0; i < 40; i++) {
        if (i % 22 === 0) { srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`); await sleep(250); }
        srv.send(`fill ${R.x - 4} ${AY + 1} ${R.z - 4} ${R.x + 4} ${AY + 6} ${R.z + 4} minecraft:air 0`);
        srv.send(`setblock ${R.x} ${AY - 1} ${R.z} minecraft:mycelium 0 replace`);
        srv.send(`setblock ${R.x} ${AY} ${R.z} minecraft:brown_mushroom 0 replace`);
        await L.tp(srv, R.x + 0.5, AY, R.z + 2.0, { bot: who, wait: 160 });
        await L.lookAtTop(bot, R.x, AY - 1, R.z);
        L.useBlock(srv, R.x, AY - 1, R.z, who);
        await sleep(230);
        if ((await tf(R.x, AY, R.z, 'minecraft:brown_mushroom_block')).ok) my.giant++;
      }
      await sleep(800);
      my.rows = rowsFrom(from).filter((l) => /\[FarmLog\] fertilize src=manure chain=mycelium/.test(l)).length;
      ev.checks.myceliumTop = my;
      log('myceliumTop', JSON.stringify(my));
    }

    /* ================= W-FM8 trample ================= */
    {
      const base = AREA.trample;
      await L.tp(srv, base.x + 5.5, AY, base.z + 0.5, { bot: who, wait: 1200 });
      await clearArea(base.x + 5, base.z, 10);
      const spots = [
        { x: base.x, z: base.z, wet: 7, fert: false, crop: true, name: 'wet' },
        { x: base.x + 5, z: base.z, wet: 0, fert: true, crop: true, name: 'fert' },
        { x: base.x + 10, z: base.z, wet: 0, fert: false, crop: false, name: 'dry' },
      ];
      for (const s of spots) {
        if (s.fert) srv.send(`setblock ${s.x} ${AY - 1} ${s.z} minecraft:farmland ${s.wet} replace {EtimFertilized:1b}`);
        else srv.send(`setblock ${s.x} ${AY - 1} ${s.z} minecraft:farmland ${s.wet} replace`);
        if (s.crop) srv.send(`setblock ${s.x} ${AY} ${s.z} minecraft:wheat 7 replace`);
        else srv.send(`setblock ${s.x} ${AY} ${s.z} minecraft:air 0 replace`);
      }
      await sleep(600);
      srv.send(`gamemode 0 ${who}`);
      ev.checks.trample = [];
      for (const s of spots) {
        await L.tp(srv, s.x + 0.5, AY + 6, s.z + 0.5, { bot: who, wait: 250 });
        try { bot.physics.enabled = true; } catch (e) { /* noop */ }
        await sleep(2400);
        try { bot.physics.enabled = false; } catch (e) { /* noop */ }
        const rows = srv.all.map(L.strip).filter((l) => new RegExp('\\[FarmLog\\] trample .*pos=' + s.x + ',' + (AY - 1) + ',' + s.z).test(l));
        ev.checks.trample.push({
          name: s.name, rows: rows.slice(-3),
          blockFarm: await tf(s.x, AY - 1, s.z, 'minecraft:farmland'),
          blockDirt: await tf(s.x, AY - 1, s.z, 'minecraft:dirt'),
          cropAir: s.crop ? await tf(s.x, AY, s.z, 'minecraft:air') : null,
        });
        log('trample-' + s.name, JSON.stringify({ rows: rows.slice(-2), farm: ev.checks.trample[ev.checks.trample.length - 1].blockFarm.ok,
          dirt: ev.checks.trample[ev.checks.trample.length - 1].blockDirt.ok,
          cropAir: ev.checks.trample[ev.checks.trample.length - 1].cropAir && ev.checks.trample[ev.checks.trample.length - 1].cropAir.ok }));
      }
    }

    /* ================= W-FM4 decay + 3x3 crop shield + entity lift ================= */
    {
      const D = AREA.decay;
      await L.tp(srv, D.x + 0.5, AY, D.z + 0.5, { bot: who, wait: 1200 });
      await clearArea(D.x + 3, D.z, 8);
      srv.send(`setblock ${D.x} ${AY - 1} ${D.z} minecraft:farmland 0 replace`);
      srv.send(`setblock ${D.x} ${AY} ${D.z} minecraft:air 0 replace`);
      srv.send(`setblock ${D.x + 5} ${AY - 1} ${D.z} minecraft:farmland 0 replace`);
      srv.send(`setblock ${D.x + 6} ${AY} ${D.z} minecraft:wheat 0 replace`);
      srv.send(`summon minecraft:item ${D.x + 0.5} ${AY - 0.1} ${D.z + 0.5} {Item:{id:"minecraft:stone",Count:1b},NoGravity:1b,PickupDelay:32767,Age:-32768}`);
      await sleep(600);
      const liftBefore = await tfSel(srv, D.x, AY, D.z);
      srv.send('gamerule randomTickSpeed 30');
      await sleep(70000);
      srv.send('gamerule randomTickSpeed 3');
      ev.checks.decay = {
        decayRows: srv.all.map(L.strip).filter((l) => /\[FarmLog\] moisture decay pos=/.test(l)).slice(-8),
        blockDirt: await tf(D.x, AY - 1, D.z, 'minecraft:dirt'),
        shieldFarm: await tf(D.x + 5, AY - 1, D.z, 'minecraft:farmland', 0),
        shieldCrop: await tf(D.x + 6, AY, D.z, 'minecraft:wheat'),
        liftBefore,
        liftAfter: await tfSel(srv, D.x, AY, D.z),
      };
      log('decay', JSON.stringify({ dirt: ev.checks.decay.blockDirt.ok, shield: ev.checks.decay.shieldFarm.ok,
        liftBefore: liftBefore.ok, liftAfter: ev.checks.decay.liftAfter.ok }));
    }

    /* ================= zero-channel snapshot (before the farm1 harvest / pool probe) ================= */
    ev.zeroChannels = L.rowCounts(srv.all.map(L.strip));
    log('zeroChannels', JSON.stringify(ev.zeroChannels));

    /* ================= W-FM9 farm1 regression ================= */
    {
      const F = AREA.farm1;
      await L.tp(srv, F.x + 6.5, AY, F.z + 0.5, { bot: who, wait: 1200 });
      await clearArea(F.x + 6, F.z, 12);
      // fertility tillage
      srv.send(`setblock ${F.x} ${AY - 1} ${F.z} minecraft:dirt 0 replace`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:hoe_copper 1 0`);
      srv.send(`etest enchant mainhand 5 fertility ${who}`);
      await sleep(600);
      let from = mark();
      await L.tp(srv, F.x + 0.5, AY, F.z + 2.0, { bot: who, wait: 500 });
      await L.lookAtTop(bot, F.x, AY - 1, F.z);
      L.useBlock(srv, F.x, AY - 1, F.z, who);
      await sleep(1200);
      ev.checks.tillage = { rows: rowsFrom(from).filter((l) => /\[FarmLog\] fertility tillage|\[FarmLog\] fertilized set/.test(l)),
        block: await tf(F.x, AY - 1, F.z, 'minecraft:farmland') };
      log('tillage', JSON.stringify({ rows: ev.checks.tillage.rows.length, block: ev.checks.tillage.block.ok }));

      // harvesting
      srv.send(`setblock ${F.x + 5} ${AY - 1} ${F.z} minecraft:farmland 7 replace`);
      srv.send(`setblock ${F.x + 5} ${AY} ${F.z} minecraft:wheat 7 replace`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:scythe_copper 1 0`);
      srv.send(`etest enchant mainhand 5 harvesting ${who}`);
      await sleep(600);
      await L.tp(srv, F.x + 5.5, AY, F.z + 2.0, { bot: who, wait: 500 });
      from = mark();
      srv.send(`etest dig ${F.x + 5} ${AY} ${F.z} ${who}`);
      await sleep(3500);
      ev.checks.harvest = { rows: rowsFrom(from).filter((l) => /\[FarmLog\] harvesting/.test(l)),
        blockAir: await tf(F.x + 5, AY, F.z, 'minecraft:air') };
      log('harvest', JSON.stringify({ rows: ev.checks.harvest.rows.length, air: ev.checks.harvest.blockAir.ok }));

      // growth x1.5 on fertilized farmland
      srv.send(`fill ${F.x + 10} ${AY - 1} ${F.z - 1} ${F.x + 12} ${AY - 1} ${F.z + 1} minecraft:farmland 7 replace {EtimFertilized:1b}`);
      srv.send(`fill ${F.x + 10} ${AY} ${F.z - 1} ${F.x + 12} ${AY} ${F.z + 1} minecraft:wheat 0 replace`);
      await sleep(600);
      srv.send('gamerule randomTickSpeed 200');
      from = mark();
      await sleep(14000);
      srv.send('gamerule randomTickSpeed 3');
      const grows = rowsFrom(from).filter((l) => /\[FarmLog\] growth pos=/.test(l));
      const ratios = grows.map((l) => parseFloat((/ratio=([\d.]+)/.exec(l) || [])[1])).filter((x) => !isNaN(x));
      ev.checks.growth = { rows: grows.length, ratios: [...new Set(ratios)], sample: grows.slice(0, 3) };
      log('growth', JSON.stringify({ rows: grows.length, ratios: ev.checks.growth.ratios }));
    }

    /* ================= W-FM-REG: pool reg rows + ids ================= */
    {
      srv.send(`clear ${who}`);
      srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:sword_copper 1 0`);
      await sleep(400);
      const from = mark();
      srv.send(`etest enchantprobe mainhand pool ${who}`);
      await sleep(1200);
      const regs = {};
      let regCount = 0;
      for (const l of rowsFrom(from)) {
        const m = /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?) rw=(\d+) rwindow=(.*?) \[server\]/.exec(l);
        if (m) { regCount++; regs[m[1]] = l; }
      }
      let prev = null;
      try {
        const prevLines = fs.readFileSync(path.join(L.OUT, 'd1-wb-main.out'), 'utf8').split(/\r?\n/)
          .map(L.strip).filter((l) => /\[EnchantLog\] pool reg=/.test(l));
        const pm = {};
        for (const l of prevLines) { const m = /pool reg=(\S+) /.exec(l); if (m && !pm[m[1]]) pm[m[1]] = l; }
        let same = 0; const diff = [];
        for (const [k, v] of Object.entries(regs)) { if (pm[k] === v) same++; else diff.push(k); }
        prev = { same, total: Object.keys(regs).length, prevTotal: Object.keys(pm).length, diffs: diff.slice(0, 6) };
      } catch (e) { prev = { error: String(e.message) }; }
      ev.checks.reg = { rows: regCount, etimRows: Object.keys(regs).filter((k) => k.startsWith('etim:')).length,
        prev, ids: ev.ids.ids, manureReg: ev.manureRegRows };
      log('reg', JSON.stringify({ rows: regCount, etim: ev.checks.reg.etimRows, prev }));
    }

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    const keysAfter = L.cfgKeys(L.CFG);
    ev.cfgAfter.changed = Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]);
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)),
      untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)),
      level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src'), mk: L.mkCounts() };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}

async function tfSel(srv, x, y, z) {
  const from = srv.all.length;
  srv.send(`testfor @e[type=item,x=${x},y=${y},z=${z},dx=1,dy=1,dz=1]`);
  await sleep(420);
  const rows = srv.all.slice(from).map(L.strip);
  return { ok: rows.some((l) => /Found entity|found entity|The entity was found/i.test(l)), raw: rows.filter((l) => /entity|Found/i.test(l)).slice(-1)[0] || '' };
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
