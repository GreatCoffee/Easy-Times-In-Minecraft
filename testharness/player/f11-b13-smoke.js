#!/usr/bin/env node
/**
 * f11-b13-smoke.js — B-13 (blight family) first smoke test.  W-B13 R0 preface.
 * Arena (lessons round 1): farmland layer TY FULLY water-backed (three water
 * rows at TY; spacing 8 <= the 9x2x9 waterNearbyR196 scan) so the B-6 moisture
 * decay face, the B-9 dry gate and the B-8 drought arm can NEVER eat the
 * plot — the blight arm must be the only claim on updateTick.
 * Boot-1 (blightR196=true):
 *   R1  bit-8 round-trip: set + probe (blighted=1) + testforblock meta 11;
 *       farmland probe -> seat=0.
 *   R2  F-C shape: probe (even on air it prints blv/p, b1 :5022) + tight-window
 *       covered roll (fresh seat, 300 ms — the dark crops pop anyway, so the
 *       seat is refreshed in-place) — p ratio (covered/open) >= 8.
 *   R3  F-B blood-moon roll (工装 dedicated-off): open hit (lightOk=1) within
 *       40 dice at p=0.25; covered rolls never SET (lightOk=0, dice order).
 *   R4  bone meal: blighted -> consumed exactly 1 (survival hotbar slot 0 of
 *       minecraft:dye meta 15), bit cleared (meta 3); unblighted OPEN cell ->
 *       NOT consumed (2 left), zero blight rows, age unchanged. (b1 神案:
 *       the hut seats pop in the dark, so R4b moved to an open edge cell.)
 *   R5  F-A random-tick window (rts=512): the inner open 3x3 (9 plants)
 *       seeded blighted -> dead1of64 rows + spread rows into the outer ring;
 *       mature age7 -> dead age6 -> etim:dead_crop testforblock.
 *   R5b noDrops (rts=3 clamped: the comparator must sit on a still field):
 *       break a blighted wheat -> src=noDrops row; fresh meta-3 readback ->
 *       destroy -> none (round-3 age=4 mystery instrumented with readbacks).
 *   R5c dead crop never random-ticks.
 * Boot-2 (blightR196=false): R6 vanilla regression — probe master=0, blitted
 *   crop sees ZERO blight tick rows at rts=512, vanilla bone meal GROWS on an
 *   OPEN cell (age 4..7) and consumes, vanilla drops (no noDrops row).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b13-smoke';
const WORLD = 'w-b13a';
const A = 'ETIM_F7';
const TY = 100;
const P0 = { x: 300, z: 840 }; // arena origin; farmland layer = TY, crops = TY+1

const OPEN = { x0: 303, z0: 843, n: 5 };  // open-sky 5x5 (water rows z=842 north / z=848 south)
const HUT = { x0: 310, z0: 849, n: 7 };   // walled hut 7x7 interior (dark; ring z 848/856 straddles water rows)
const OO = { x: 305, y: TY + 1, z: 845 }; // open centre crop
const CC = { x: 313, y: TY + 1, z: 852 }; // hut centre crop
// standing spots for the /etest useblock face: ETIMReachEvents denies the
// click beyond the R196 crop reach 2.75 (b1: '4.71 > 2.75'), so the bot
// stands two blocks away (dz=2, body-center dist ~2.1) inside the plots.
const OO_STAND = { x: 305, y: TY + 1, z: 847 };
const CC_STAND = { x: 313, y: TY + 1, z: 850 };

const sleep = L.sleep;
const log = L.log;
let srv = null;
let bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], stops: [], arms: {} };

const since = (n) => srv.all.slice(n).map(L.strip);
const nAt = () => srv.all.length;
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

function parseKV(line) {
  const o = {};
  const re = /(\w+)=([^\s]+)/g;
  let m;
  while ((m = re.exec(line))) o[m[1]] = m[2];
  return o;
}
const farmLines = (n) => since(n).filter((l) => /^\[FarmLog\]/.test(l));
const blightLines = (n) => farmLines(n).filter((l) => /\] blight /.test(l));

async function blight(op, pos, extra, wait) {
  const from = nAt();
  await cmd(`etest blight ${op} ${pos.x} ${pos.y} ${pos.z}${extra ? ' ' + extra : ''}`, wait || 900);
  const raw = farmLines(from);
  return { from, raw, objs: raw.map(parseKV) };
}
const findRow = (raw, sub) => raw.find((l) => l.includes(sub));
const keyOf = (p) => p.x + ',' + p.y + ',' + p.z;

async function probeAt(pos) {
  const r = await blight('probe', pos);
  const line = findRow(r.raw, 'blight probe');
  return { raw: r.raw, kv: line ? parseKV(line) : null };
}

/* bone meal (minecraft:dye 15) rides hotbar slot 0 in survival — the
 * f11-b12b-verify.js 馆例 (replaceitem + setQuickBarSlot). */
async function holdBonemeal(n) {
  await cmd(`clear ${A} minecraft:dye 15`, 500);
  await cmd('gamemode 0 ' + A, 700);
  await cmd(`replaceitem entity ${A} slot.hotbar.0 minecraft:dye 3 15`.replace(' 3 15', ` ${n} 15`), 700);
  await bot.setQuickBarSlot(0);
  await sleep(400);
}
async function drainBonemeal() {
  const from = nAt();
  srv.send(`clear ${A} minecraft:dye 15`);
  await sleep(700);
  const m = /(?:Removed|removing) (\d+) items?/.exec(since(from).join(' '));
  return m ? parseInt(m[1], 10) : 0;
}

async function useBonemealAt(pos) {
  await L.lookAtBlock(bot, pos.x, pos.y, pos.z);
  await sleep(280);
  const from = nAt();
  L.useBlock(srv, pos.x, pos.y, pos.z, A);
  await sleep(1000);
  return from;
}

async function blightCell(pos, val, wait) {
  srv.send(`etest blight set ${pos.x} ${pos.y} ${pos.z} ${val}`);
  await sleep(wait || 120);
}

/* crops sit on the water-backed farmland; hut interior 7x7 keeps walls+roof.
 * b1 post-mortem: the water rows fell out of the scan range (no support under
 * them — the arena air-fill left TY-1 open), the hut farmland went dry and the
 * 49 interior crops popped within seconds (growth rows =0, probe saw air). The
 * cobble support at TY-1 pins both the farmland and the water rows in place. */
async function buildFarm() {
  await L.stage(srv, bot, { gamemode: 1, noPhysics: true, rts: 3 });
  await L.tp(srv, P0.x + 6, TY + 5, P0.z + 6, { bot: A, wait: 1600 });
  await cmd('kill @e[type=!player]', 1200);
  // base layer + air pocket + water-backed farmland (farmland first, then the
  // three water rows — spacing 8, inside the 9x2x9 scan of every farmland)
  await cmd(`fill ${P0.x - 4} ${TY - 2} ${P0.z - 4} ${P0.x + 18} ${TY - 2} ${P0.z + 18} minecraft:cobblestone 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY - 1} ${P0.z - 4} ${P0.x + 18} ${TY + 5} ${P0.z + 18} minecraft:air 0`, 900);
  // support across the whole field at TY-1: the farmland and the water rows sit
  // on solid ground (water rows at z=842/848/854 stay put; Nutno no fall-out)
  await cmd(`fill ${P0.x - 4} ${TY - 1} ${P0.z - 4} ${P0.x + 18} ${TY - 1} ${P0.z + 18} minecraft:cobblestone 0`, 800);
  // farmland starts at moisture 7 (data 7): no dry-gate window before the
  // first moisture random tick lifts it — the blight arm owns updateTick AT ONCE
  await cmd(`fill ${P0.x - 4} ${TY} ${P0.z - 4} ${P0.x + 18} ${TY} ${P0.z + 18} minecraft:farmland 7`, 900);
  // water at crop-row level: z=842 (north of open), z=848 (between plots), z=856
  // (hut south row is 855 — every open/hut cell is within the ±4 scan)
  await cmd(`fill ${P0.x - 4} ${TY} 842 ${P0.x + 18} ${TY} 842 minecraft:water 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY} 848 ${P0.x + 18} ${TY} 848 minecraft:water 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY} 856 ${P0.x + 18} ${TY} 856 minecraft:water 0`, 700);
  // hut walls + roof over the 7x7 interior (ring rows z=848/856 straddle water)
  await cmd(`fill ${HUT.x0 - 1} ${TY + 1} ${HUT.z0 - 1} ${HUT.x0 + HUT.n} ${TY + 2} ${HUT.z0 + HUT.n} minecraft:cobblestone 0`, 800);
  await cmd(`fill ${HUT.x0} ${TY + 1} ${HUT.z0} ${HUT.x0 + HUT.n - 1} ${TY + 2} ${HUT.z0 + HUT.n - 1} minecraft:air 0`, 700);
  await cmd(`fill ${HUT.x0 - 1} ${TY + 3} ${HUT.z0 - 1} ${HUT.x0 + HUT.n} ${TY + 3} ${HUT.z0 + HUT.n} minecraft:cobblestone 0`, 800);
  // clear sky above the open plot
  await cmd(`fill ${OPEN.x0 - 1} ${TY + 1} ${OPEN.z0 - 1} ${OPEN.x0 + OPEN.n} ${TY + 5} ${OPEN.z0 + OPEN.n} minecraft:air 0`, 600);
  // place crops: all 25 open + all 49 hut cells
  const cells = [];
  for (let dx = 0; dx < OPEN.n; dx++) for (let dz = 0; dz < OPEN.n; dz++) {
    cells.push({ x: OPEN.x0 + dx, y: TY + 1, z: OPEN.z0 + dz, plot: 'O' });
  }
  for (let dx = 0; dx < HUT.n; dx++) for (let dz = 0; dz < HUT.n; dz++) {
    cells.push({ x: HUT.x0 + dx, y: TY + 1, z: HUT.z0 + dz, plot: 'C' });
  }
  for (const c of cells) await cmd(`setblock ${c.x} ${c.y} ${c.z} minecraft:wheat 3 0`, 90);
  return cells;
}

async function startBoot(n, blightFlag) {
  L.setCfgValue(L.CFG, 'blightR196', blightFlag ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'growthRateR196', 'true');
  let booted = false;
  for (let attempt = 1; attempt <= 3 && !booted; attempt++) {
    for (let i = 0; i < 60; i++) {
      if (L.netstatListen(L.PORT) === 0) break;
      await sleep(5000);
    }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate (b' + n + ') — aborting, no collide boot');
    srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n + (attempt > 1 ? '-r' + attempt : '') });
    booted = await srv.waitFor(/Done \(/, 480000);
    if (booted) break;
    const bindFail = srv.all.some((l) => /FAILED TO BIND TO PORT|Address already in use/.test(l));
    log('boot' + n, 'attempt ' + attempt + ' failed bind=' + bindFail);
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
    if (!bindFail) throw new Error('no Done( within 480s (b' + n + ' attempt ' + attempt + ')');
    await sleep(8000);
  }
  if (!srv || !booted) throw new Error('no boot b' + n);
  const b = {
    n,
    boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i.test(l)).length,
  };
  ev.boots.push(b);
  log('boot' + n, b.boot + ' mixinFail=' + b.mixinFail);
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  return b;
}

async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const st = await srv.stop();
  ev.stops.push({ n, exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) });
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + ev.stops[ev.stops.length - 1].build);
  srv = null;
}

async function main() {
  const cfgBefore = fs.readFileSync(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  fs.writeFileSync(L.PROPS, L.setProp(
    L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD),
    'allow-flight', 'true'), 'utf8'); // no flying kick for the noPhysics bot
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ================= boot 1: blightR196=true ================= */
  await startBoot(1, true);
  try {
    const cells = await buildFarm();
    // pop-watch (round-3 post-mortem): the hut crops pop in the dark — the
    // canBlockStay/isLegalAt gate is R196-MATCHING (BlockCrops:171-175 vs
    // BlockPlant:45-48), NOT a B-13 defect. The open control stays alive.
    ev.hutWatch = {};
    await sleep(4000);
    ev.hutWatch.t4 = {
      cc: (await L.testBlock(srv, CC.x, CC.y, CC.z, 'minecraft:wheat')).ok,
      oo: (await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat')).ok,
    };
    await sleep(4000);
    ev.hutWatch.t8 = {
      cc: (await L.testBlock(srv, CC.x, CC.y, CC.z, 'minecraft:wheat')).ok,
      oo: (await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat')).ok,
    };
    log('watch', 'cc@4s=' + ev.hutWatch.t4.cc + ' cc@8s=' + ev.hutWatch.t8.cc
      + ' oo@4s=' + ev.hutWatch.t4.oo + ' oo@8s=' + ev.hutWatch.t8.oo
      + ' (hut pop expected: false/false; open: true/true)');

    /* ---- R1: set bit + probe + meta round-trip ---- */
    {
      const arm = (ev.arms.R1 = {});
      arm.probeBefore = (await probeAt(OO)).kv;
      await blightCell(OO, 1, 900);
      arm.probeAfter = (await probeAt(OO)).kv;
      arm.meta11 = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
      arm.metaBare = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 3);
      arm.noSeat = await blight('set', { x: OO.x, y: TY, z: OO.z }, '1'); // farmland below
      arm.noSeatRow = findRow(arm.noSeat.raw, '->skip');
      log('R1', 'before=' + (arm.probeBefore && arm.probeBefore.blighted)
        + ' after=' + (arm.probeAfter && arm.probeAfter.blighted)
        + ' meta11=' + arm.meta11.ok + ' skip=' + !!arm.noSeatRow);
    }

    /* ---- R2: F-C shape (p ratio open vs covered) ---- */
    {
      const arm = (ev.arms.R2 = {});
      arm.probeOpen = (await probeAt(OO)).kv;
      arm.probeCovered = (await probeAt(CC)).kv; // prints blv/p even on air
      // covered roll inside a tight window: the R2 seat is refreshed in-place
      // (round-2/3 神案 — the dark crops pop on the placement cascade; a fresh
      // setblock sees no neighbor update, so the seat survives until its own
      // slow random tick; on a pop race the row reads skip-not-seat, info only)
      await cmd(`setblock ${CC.x} ${CC.y} ${CC.z} minecraft:wheat 3 0`, 150);
      const rc = await blight('roll', CC, null, 300);
      const rcLine = findRow(rc.raw, 'blight roll');
      arm.rollCovered = rcLine ? parseKV(rcLine) : null;
      const roLine = findRow((await blight('roll', OO)).raw, 'src=forceLowLight');
      arm.rollOpen = roLine ? parseKV(roLine) : null;
      const pOpen = arm.rollOpen ? parseFloat(arm.rollOpen.p)
        : parseFloat(arm.probeOpen && arm.probeOpen.lowLightP);
      const pCovered = (arm.rollCovered && arm.rollCovered.p !== undefined
        && arm.rollCovered.p !== null)
        ? parseFloat(arm.rollCovered.p)
        : parseFloat(arm.probeCovered && arm.probeCovered.lowLightP);
      arm.pOpen = pOpen;
      arm.pCovered = pCovered;
      arm.ratio = pOpen > 0 ? pCovered / pOpen : null;
      log('R2', 'blv=' + (arm.probeOpen && arm.probeOpen.blv) + '/' + (arm.probeCovered && arm.probeCovered.blv)
        + ' p=' + pOpen + '/' + pCovered + ' ratio=' + arm.ratio);
    }

    /* ---- R3: F-B blood-moon roll (工装 dedicated-off) ---- */
    {
      const arm = (ev.arms.R3 = {});
      let hitOpen = null; let tries = 0;
      for (let i = 0; i < 40 && !hitOpen; i++) {
        const r = await blight('roll', OO, '1');
        tries++;
        const line = findRow(r.raw, 'src=forceBloodMoon');
        const kv = line ? parseKV(line) : null;
        if (kv && kv.hit === '1') hitOpen = kv;
      }
      arm.rollOpenHit = hitOpen;
      arm.triesToHit = tries;
      let coverHit = null;
      for (let i = 0; i < 20 && !coverHit; i++) {
        const r = await blight('roll', CC, '1');
        const line = findRow(r.raw, 'src=forceBloodMoon');
        const kv = line ? parseKV(line) : null;
        if (kv && kv.hit === '1') coverHit = kv;
      }
      arm.rollCoveredHitNoSet = coverHit;
      arm.coveredProbeAfter = (await probeAt(CC)).kv;
      log('R3', 'openHit=' + (hitOpen && hitOpen.hit) + ' lightOk=' + (hitOpen && hitOpen.lightOk)
        + ' tries=' + tries
        + ' coveredBlightedAfter=' + (arm.coveredProbeAfter && arm.coveredProbeAfter.blighted));
    }

    /* ---- R4: bone meal unblight / deny ---- */
    {
      const arm = (ev.arms.R4 = {});
      // R4a — blighted open crop: 3 given, one use -> exactly 1 consumed
      await holdBonemeal(3);
      await L.tp(srv, OO_STAND.x, OO_STAND.y, OO_STAND.z, { bot: A, wait: 1600 });
      const fromA = await useBonemealAt(OO);
      arm.unblightRows = farmLines(fromA).filter((l) => /blight src=unblight/.test(l)).map(parseKV);
      arm.leftAfterUse = await drainBonemeal(); // 3-1 = 2
      arm.probeAfter = (await probeAt(OO)).kv;
      arm.metaBareAfter = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 3);
      log('R4a', 'unblightRows=' + arm.unblightRows.length
        + ' left(2 expected)=' + arm.leftAfterUse
        + ' blightedAfter=' + (arm.probeAfter && arm.probeAfter.blighted)
        + ' metaBare=' + arm.metaBareAfter.ok);
      // R4b — deny face: bone meal on a NON-blighted crop is not consumed.
      // b1/b2 神案: the hut seats pop in the dark (canBlockStay face) — the
      // deny seat is an OPEN edge cell (x=304,z=843; not an R5 inner seat).
      const RD = { x: 304, y: TY + 1, z: 843 };
      const RD_STAND = { x: 304, y: TY + 1, z: 845 };
      await holdBonemeal(2);
      await L.tp(srv, RD_STAND.x, RD_STAND.y, RD_STAND.z, { bot: A, wait: 1600 });
      const fromB = await useBonemealAt(RD);
      arm.denyBlightRows = farmLines(fromB).filter((l) => /blight src=/.test(l)).length;
      arm.deniedMetaBare = await L.testBlock(srv, RD.x, RD.y, RD.z, 'minecraft:wheat', 3);
      arm.leftAfterDeny = await drainBonemeal(); // 2 given, none consumed -> 2
      log('R4b', 'left(2 expected)=' + arm.leftAfterDeny
        + ' blightRowsDuring=' + arm.denyBlightRows
        + ' metaStill3=' + arm.deniedMetaBare.ok);
    }

    /* ---- R5: F-A random-tick window (death + spread + live F-C) ---- */
    {
      const arm = (ev.arms.R5 = {});
      await cmd('gamerule randomTickSpeed 512', 500);
      // seed blight ONLY on the inner open 3x3 (9 plants) — the spread pool
      // is the outer open ring (16) + the hut interior (49 fresh seeds):
      // round-3 神案 (seeded 66/70 left no unblit neighbours → spread==0)
      // capture the basline BEFORE seeding: spread fires DURING the seeding
      // window too (first blit dies within a second and its spread begins),
      // so from5 placed after the loop drops those rows (the r4 evidence).
      arm.seeded = 0;
      const from5 = nAt();
      for (const c of cells) {
        const inner = (c.plot === 'O')
          && c.x >= OPEN.x0 + 1 && c.x <= OPEN.x0 + 3
          && c.z >= OPEN.z0 + 1 && c.z <= OPEN.z0 + 3;
        if (inner) { await blightCell(c, 1, 90); arm.seeded++; }
        else await sleep(60);
      }
      await sleep(20000);
      const raw5 = blightLines(from5);
      arm.deadRows = raw5.filter((l) => /dead1of64/.test(l)).map(parseKV);
      arm.spreadRows = raw5.filter((l) => /src=spread/.test(l)).map(parseKV);
      arm.lowLightRows = raw5.filter((l) => /src=lowLight/.test(l)).map(parseKV);
      arm.spreadTargets = Array.from(new Set(arm.spreadRows.map((r) => r.to)));
      // mature face: fresh age7 -> blight -> dead age6 -> etim:dead_crop
      const M = { x: 304, y: TY + 1, z: 844 };
      await cmd(`setblock ${M.x} ${M.y} ${M.z} minecraft:wheat 7 0`, 400);
      await blightCell(M, 1, 900);
      let mDead = null;
      const fromM = nAt();
      for (let i = 0; i < 40 && !mDead; i++) {
        await sleep(1000);
        const rows = blightLines(fromM).filter((l) => /dead1of64/.test(l)).map(parseKV);
        mDead = rows.find((r) => r.pos === keyOf(M));
      }
      arm.matureDead = mDead;
      arm.matureDeadBlock = await L.testBlock(srv, M.x, M.y, M.z, 'etim:dead_crop');
      log('R5', 'seeded=' + arm.seeded + ' dead=' + arm.deadRows.length
        + ' spread=' + arm.spreadRows.length + ' spreadTargets=' + arm.spreadTargets.length
        + ' lowLight=' + arm.lowLightRows.length
        + ' matureDead=' + (mDead ? 'age' + mDead.age + '->' + mDead['dead.age'] + ' dead_crop=' + arm.matureDeadBlock.ok : 'none'));
    }

    /* ---- R5b: noDrops on a blighted crop break ---- */
    {
      const arm = (ev.arms.R5b = {});
      const B = { x: 304, y: TY + 1, z: 846 }; // an interior plot cell
      // rts clamped FIRST: the comparator must sit on a still field (round-3
      // 神案 — at rts=512 a fresh wheat grew to age4 between setblock and
      // destroy and poisoned the healthy baseline)
      await cmd('gamerule randomTickSpeed 3', 500);
      // fresh blighted crop (R5 deaths consumed many cells; be deterministic)
      await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:wheat 3 0`, 400);
      arm.freshMeta3 = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 3);
      await blightCell(B, 1, 900);
      arm.blitReadback = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 11);
      await cmd('kill @e[type=item]', 400);
      const fromB = nAt();
      await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:air 0 destroy`, 700);
      arm.noDropsRows = blightLines(fromB).filter((l) => /src=noDrops/.test(l)).map(parseKV);
      // healthy comparator: fresh wheat -> readback -> probe -> destroy -> NO row
      await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:wheat 3 0`, 400);
      arm.healthyReadback = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 3);
      arm.healthyProbe = (await probeAt(B)).kv; // blit=0 expected (race check)
      const fromN = nAt();
      await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:air 0 destroy`, 700);
      arm.healthyNoDropsRows = blightLines(fromN).filter((l) => /src=noDrops/.test(l)).length;
      log('R5b', 'noDropsRows=' + arm.noDropsRows.length
        + ' fresh=' + arm.freshMeta3.ok + ' blitReadback=' + arm.blitReadback.ok
        + ' healthyReadback=' + arm.healthyReadback.ok
        + ' healthyProbeBlit=' + (arm.healthyProbe && arm.healthyProbe.blighted)
        + ' healthyNoDrops=' + arm.healthyNoDropsRows);
    }

    /* ---- R5c: the dead crop never random-ticks ---- */
    {
      const arm = (ev.arms.R5c = {});
      const fromC = nAt();
      await sleep(4000);
      arm.deadTickRows = blightLines(fromC).filter((l) => /dead_crop|src=dead/.test(l)).length;
      log('R5c', 'deadTickRows=' + arm.deadTickRows);
    }
  } finally {
    await stopBoot(1);
  }

  /* ================= boot 2: blightR196=false ================= */
  await startBoot(2, false);
  try {
    const cells = await buildFarm();
    const arm = (ev.arms.R6 = {});
    arm.probeMaster = (await probeAt(OO)).kv;
    // the 工装 set still lands (container carries bit 8 regardless of flag)
    await blightCell(OO, 1, 900);
    arm.blittedMeta11 = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
    void cells;
    await cmd('gamerule randomTickSpeed 512', 500);
    const from6 = nAt();
    await sleep(8000);
    arm.tickBlightRows = blightLines(from6).length;
    await cmd('gamerule randomTickSpeed 3', 400);
    // vanilla bone-meal growth on an unblighted OPEN crop (the hut crops pop
    // in the dark — b1 :5022 — G must be a seat that stands until the use
    // lands; the R6 seed row = open cell (306,845), stand dz=2 within reach)
    const G = { x: 306, y: TY + 1, z: 845 };
    const G_STAND = { x: 306, y: TY + 1, z: 847 };
    await cmd(`setblock ${G.x} ${G.y} ${G.z} minecraft:wheat 3 0`, 400);
    await holdBonemeal(1);
    await L.tp(srv, G_STAND.x, G_STAND.y, G_STAND.z, { bot: A, wait: 1600 });
    await useBonemealAt(G);
    let grew = false; let grownAge = null;
    for (let d = 4; d <= 7 && !grew; d++) {
      const t = await L.testBlock(srv, G.x, G.y, G.z, 'minecraft:wheat', d);
      if (t.ok) { grew = true; grownAge = d; }
    }
    arm.leftAfterVanillaUse = await drainBonemeal(); // consumed -> 0
    arm.vanillaGrow = { grew, grownAge };
    // vanilla drops: breaking the (blitted) wheat drops — no noDrops row
    await cmd('kill @e[type=item]', 400);
    const fromD = nAt();
    await cmd(`setblock ${OO.x} ${OO.y} ${OO.z} minecraft:air 0 destroy`, 700);
    arm.noDropsRows = blightLines(fromD).filter((l) => /src=noDrops/.test(l)).length;
    log('R6', 'master=' + (arm.probeMaster && arm.probeMaster.master)
      + ' blittedMeta11=' + arm.blittedMeta11.ok
      + ' tickBlightRows=' + arm.tickBlightRows
      + ' vanillaGrow=' + grew + '(age ' + grownAge + ') leftAfterUse=' + arm.leftAfterVanillaUse
      + ' noDropsRows=' + arm.noDropsRows);
  } finally {
    await stopBoot(2);
  }

  /* restore props/cfg so the judgment window starts from the same shape */
  try {
    fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
    fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  } catch (e) { /* noop */ }

  ev.finishedAt = new Date().toISOString();
  const out = path.join(L.OUT, TAG + '.json');
  fs.writeFileSync(out, JSON.stringify(ev, null, 2), 'utf8');
  log('done', 'ev -> ' + out);
}

main().catch((e) => {
  console.error('[f11-b13-smoke] FATAL', e);
  process.exitCode = 1;
});
