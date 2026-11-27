#!/usr/bin/env node
/**
 * f7-wb-fm7.js - W-FM7 judged window (B-3 stage carrier + B-4 indoors gate).
 *
 * Fix HEAD 37e95ab. Contract (task book 2026-11-04):
 *   R1a red click arm stage chain (outdoor grass, 40 hands, replant on giant)
 *   R1b brown click arm 10 hands (indoor mycelium)
 *   R1c mycelium TOP arm 6 hands (2 cycles) + outdoor 1 hand (white-eat)
 *   R2  stage carrier: break/replant restarts at 0; save/reload keeps it
 *   R3  farm TOP spot + already-fertilized FAIL + miss-consumes-manure
 *   R4  closeout pins
 *
 * L0 is a PRE-ARM probe pair, not a judged point: it measures which legality
 * gate rejects the red arm, by letting vanilla drop an illegal mushroom on a
 * neighbour update (BlockBush.checkAndDropBlock -> canBlockStay).
 *   L0a alcove (no direct sky, sky-connected 3 blocks away at the same y)
 *   L0b open sky (control)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm7';
const WORLD = 'f7we';
const AY = 140;

// arm spots
const RB = { x: 166, y: AY, z: 700 };       // R1b brown click (indoor mycelium)
const RC = { x: 168, y: AY, z: 700 };       // R1c TOP indoor (mycelium at y-1)
const RR = { x: 164, y: AY, z: 700 };       // R2a break/replant reset
const RS = { x: 162, y: AY, z: 700 };       // R2b save/reload
const RA = { x: 197, y: AY, z: 700 };       // R1a alcove (R196-legal red niche)
const RO = { x: 186, y: AY, z: 700 };       // R1a open-sky control
const RT = { x: 212, y: AY, z: 700 };       // R1c outdoor TOP
const RF = { x: 206, y: AY - 1, z: 700 };   // R3 farmland

const PIN = {
  head: '37e95ab',
  rel: { bytes: 954594, sha: '01BAF6E2B1EDD5B5371193CFD216ED2FAFDE604A4279B01C2B07726D2267126B' },
  dev: { bytes: 935759, sha: 'F59C8714864F81EE307B4B8B8EFE246F5010D17F500844F91164C5CEA80042B8' },
  src: { bytes: 867944, sha: '146C945A54DE39CD8335DEC279B14D65B0780C0E20A7B1C5ECC47CD0661097B6' },
};

const sleep = L.sleep;
const log = L.log;

function parseFarm(rows) {
  return rows.map((raw) => {
    const o = { raw };
    let m = /kind=(red|brown)/.exec(raw); if (m) o.kind = m[1];
    m = /roll=([\d.]+|none)/.exec(raw); if (m) o.roll = m[1];
    m = /stage=(-?\d+)/.exec(raw); if (m) o.stage = Number(m[1]);
    o.giant = /giant=1/.test(raw);
    o.miss = /stage=-1/.test(raw);
    o.outdoor = /outdoor=1/.test(raw);
    o.chain = /chain=mycelium/.test(raw) ? 'mycelium' : (o.kind ? 'click' : 'other');
    return o;
  });
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [] };
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfg=' + ev.cfgBefore.keys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  /* ================= boot 1 ================= */
  let srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b1' });
  let bot = null;
  const who = L.BOT;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    const boot1 = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() };
    boot1.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    const idLine = srv.all.map(L.strip).find((l) => /\[EtimInit\].*ids=/.test(l)) || '';
    boot1.ids = (/ids=([\d\s]+)/.exec(idLine) || [])[1] ? (/ids=([\d\s]+)/.exec(idLine)[1].trim().split(/\s+/).map(Number)) : null;
    boot1.manureRegRows = srv.all.map(L.strip).filter((l) => /\[FarmLog\] manure reg/.test(l)).length;
    ev.boots.push(boot1);
    log('boot1', boot1.boot + ' mixin=' + boot1.mixinFail + ' ids=' + JSON.stringify(boot1.ids));

    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });

    /* ---- pad + room + plots ---- */
    await L.tp(srv, RB.x + 0.5, AY, RB.z + 2.5, { bot: who, wait: 2400 });
    srv.send(`fill 186 ${AY - 2} 688 216 ${AY - 2} 712 minecraft:stone 0`);
    await sleep(900);
    // indoor room: mycelium floor 161..171 x 695..705, walls, ceiling AY+16
    srv.send(`fill 161 ${AY - 1} 695 171 ${AY - 1} 705 minecraft:mycelium 0 replace`);
    srv.send(`fill 160 ${AY - 1} 694 160 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 172 ${AY - 1} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 694 172 ${AY + 16} 694 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 706 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY + 16} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 161 ${AY} 695 171 ${AY + 15} 705 minecraft:air 0`);
    // red open-sky plot
    srv.send(`fill 179 ${AY - 1} 693 193 ${AY - 1} 707 minecraft:grass 0 replace`);
    srv.send(`fill 179 ${AY} 693 193 ${AY + 19} 707 minecraft:air 0`);
    // outdoor mycelium TOP plot
    srv.send(`fill 209 ${AY - 1} 697 215 ${AY - 1} 703 minecraft:mycelium 0 replace`);
    srv.send(`fill 209 ${AY} 697 215 ${AY + 15} 703 minecraft:air 0`);
    // R196-legal red alcove: mushroom x=197, open column x=200 (3 away, inside
    // the 7x7 MITE isOutdoors box) => no direct sky, sky-connected, light ~12
    srv.send(`fill 193 ${AY - 1} 699 200 ${AY - 1} 701 minecraft:grass 0 replace`);
    srv.send(`fill 193 ${AY - 1} 699 193 ${AY + 3} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 699 199 ${AY + 2} 699 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 701 199 ${AY + 2} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY + 3} 699 199 ${AY + 3} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 700 199 ${AY + 2} 700 minecraft:air 0`);
    srv.send(`fill 200 ${AY} 699 200 ${AY + 8} 701 minecraft:air 0`);
    // R3 farmland spot
    srv.send(`fill 203 ${AY - 1} 697 209 ${AY - 1} 703 minecraft:dirt 0 replace`);
    await sleep(1500);

    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 64`);
    await sleep(1000);
    ev.heldStart = bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;

    /* ---- warm-up (C-11: first use after join/stage is dropped) ---- */
    srv.send(`setblock 170 ${AY - 1} 697 minecraft:dirt 0 replace`);
    srv.send(`setblock 170 ${AY} 697 minecraft:air 0 replace`);
    await sleep(400);
    await L.tp(srv, 170.5, AY, 699.5, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 170, AY - 1, 697);
    let from = srv.all.length;
    L.useBlock(srv, 170, AY - 1, 697, who);
    await sleep(700);
    ev.warmup = {
      useblocks: srv.all.slice(from).map(L.strip).filter((l) => /step=useblock/.test(l)).length,
      farmRows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length,
      held: bot.heldItem ? bot.heldItem.count : null,
    };
    log('warmup', JSON.stringify(ev.warmup));
    ev.zeroChannels = L.rowCounts(srv.all.map(L.strip));

    /* ---- L0 probe pair: which gate rejects the red arm?
       vanilla BlockBush.checkAndDropBlock drops a mushroom whose canBlockStay
       is false on the next neighbour update, so "survives a poke" ==
       canBlockStay true == getLight(pos) < 13. ---- */
    ev.L0 = {};
    // L0a alcove
    srv.send(`setblock ${RA.x} ${RA.y} ${RA.z} minecraft:red_mushroom 0 replace`);
    await sleep(500);
    srv.send(`setblock ${RA.x + 1} ${RA.y} ${RA.z} minecraft:stone 0 replace`); // face-adjacent poke
    await sleep(400);
    srv.send(`setblock ${RA.x + 1} ${RA.y} ${RA.z} minecraft:air 0 replace`);
    await sleep(400);
    ev.L0.alcove = {
      survives: (await L.testBlock(srv, RA.x, RA.y, RA.z, 'minecraft:red_mushroom')).ok,
    };
    // L0b open sky control
    srv.send(`setblock ${RO.x} ${RA.y} ${RA.z} minecraft:red_mushroom 0 replace`);
    await sleep(500);
    ev.L0.openRightAfterPlace = (await L.testBlock(srv, RO.x, RA.y, RA.z, 'minecraft:red_mushroom')).ok;
    srv.send(`setblock ${RO.x + 1} ${RA.y} ${RA.z} minecraft:stone 0 replace`);
    await sleep(400);
    srv.send(`setblock ${RO.x + 1} ${RA.y} ${RA.z} minecraft:air 0 replace`);
    await sleep(400);
    ev.L0.open = { survives: (await L.testBlock(srv, RO.x, RA.y, RA.z, 'minecraft:red_mushroom')).ok };
    log('L0', JSON.stringify(ev.L0));

    /* ================= R1a red click arm (40 hands, alcove) ================= */
    srv.send(`setblock ${RA.x} ${RA.y} ${RA.z} minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, RA.x + 2.5, AY, RA.z + 0.5, { bot: who, wait: 500 });
    from = srv.all.length;
    const t0 = Date.now();
    ev.R1a = { clicks: [], useblocks: 0, rows: [], giantSeen: 0, consumed: 0 };
    for (let i = 0; i < 40; i++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RA.x, RA.y, RA.z);
      L.useBlock(srv, RA.x, RA.y, RA.z, who);
      await sleep(330);
      const after = bot.heldItem ? bot.heldItem.count : 0;
      ev.R1a.clicks.push({ i: i + 1, before, after, delta: after - before });
    }
    // 3 more hands on the GRASS below the red mushroom (R196 ItemManure:50 entry)
    for (let i = 0; i < 3; i++) {
      await L.lookAtTop(bot, RA.x, RA.y - 1, RA.z);
      L.useBlock(srv, RA.x, RA.y - 1, RA.z, who);
      await sleep(330);
    }
    await sleep(800);
    {
      const lines = srv.all.slice(from).map(L.strip);
      ev.R1a.useblocks = lines.filter((l) => /step=useblock/.test(l)).length;
      ev.R1a.rows = parseFarm(lines.filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R1a.giantSeen = ev.R1a.rows.filter((r) => r.giant).length;
      ev.R1a.consumed = ev.R1a.clicks.filter((c) => c.delta === -1).length;
      ev.R1a.stillSmall = (await L.testBlock(srv, RA.x, RA.y, RA.z, 'minecraft:red_mushroom')).ok;
      ev.R1a.R1aSec = Math.round((Date.now() - t0) / 1000);
    }
    log('R1a', JSON.stringify({ useblocks: ev.R1a.useblocks, rows: ev.R1a.rows.length,
      giant: ev.R1a.giantSeen, consumed: ev.R1a.consumed, small: ev.R1a.stillSmall }));

    /* ---- R1a control: open-sky plot, 3 hands ---- */
    srv.send(`setblock ${RO.x} ${RA.y} ${RA.z} minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, RO.x + 0.5, AY, RO.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    ev.R1aOpen = { clicks: [] };
    for (let i = 0; i < 3; i++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RO.x, RA.y, RO.z);
      L.useBlock(srv, RO.x, RA.y, RO.z, who);
      await sleep(330);
      ev.R1aOpen.clicks.push({ i: i + 1, before, after: bot.heldItem ? bot.heldItem.count : 0 });
    }
    await sleep(600);
    ev.R1aOpen.rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
    log('R1a-open', JSON.stringify({ rows: ev.R1aOpen.rows.length, clicks: ev.R1aOpen.clicks }));

    /* ================= R1b brown click arm (10 hands) ================= */
    async function clearBrown(cx, cz) {
      srv.send(`fill ${cx - 3} ${AY} ${cz - 3} ${cx + 3} ${AY + 13} ${cz + 3} minecraft:air 0`);
      srv.send(`setblock ${cx} ${AY - 1} ${cz} minecraft:mycelium 0 replace`);
      srv.send(`setblock ${cx} ${AY} ${cz} minecraft:brown_mushroom 0 replace`);
      await sleep(450);
    }
    ev.R1b = { hands: [], rows: [] };
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 64`);
    await clearBrown(RB.x, RB.z);
    await L.tp(srv, RB.x + 0.5, AY, RB.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    for (let i = 0; i < 10; i++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RB.x, AY, RB.z);
      L.useBlock(srv, RB.x, AY, RB.z, who);
      await sleep(380);
      const after = bot.heldItem ? bot.heldItem.count : 0;
      const newRows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      const row = newRows[newRows.length - 1] || null;
      ev.R1b.hands.push({ i: i + 1, before, after, delta: after - before, row: row && row.raw, stage: row ? row.stage : null, giant: !!(row && row.giant), miss: !!(row && row.miss) });
      if (row && row.giant) {
        const ok = await L.testBlock(srv, RB.x, AY, RB.z, 'minecraft:brown_mushroom_block');
        ev.R1b.hands[ev.R1b.hands.length - 1].giantBlock = ok.ok;
        await clearBrown(RB.x, RB.z);
        await L.tp(srv, RB.x + 0.5, AY, RB.z + 2.0, { bot: who, wait: 300 });
      }
    }
    await sleep(600);
    ev.R1b.rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
    ev.R1b.hits = ev.R1b.rows.filter((r) => !r.miss).length;
    ev.R1b.misses = ev.R1b.rows.filter((r) => r.miss).length;
    ev.R1b.giantRows = ev.R1b.rows.filter((r) => r.giant).length;
    ev.R1b.missConsumed = ev.R1b.hands.filter((h) => h.miss && h.delta === -1).length;
    ev.R1b.stageSeq = ev.R1b.rows.map((r) => r.stage);
    log('R1b', JSON.stringify({ rows: ev.R1b.rows.length, hits: ev.R1b.hits, misses: ev.R1b.misses,
      giant: ev.R1b.giantRows, missConsumed: ev.R1b.missConsumed, seq: ev.R1b.stageSeq }));

    /* ================= R1c mycelium TOP arm ================= */
    async function clearTop(cx, cz) {
      srv.send(`fill ${cx - 3} ${AY} ${cz - 3} ${cx + 3} ${AY + 13} ${cz + 3} minecraft:air 0`);
      srv.send(`setblock ${cx} ${AY - 1} ${cz} minecraft:mycelium 0 replace`);
      srv.send(`setblock ${cx} ${AY} ${cz} minecraft:brown_mushroom 0 replace`);
      await sleep(450);
    }
    ev.R1c = { indoor: [], outdoor: [] };
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 64`);
    await clearTop(RC.x, RC.z);
    await L.tp(srv, RC.x + 0.5, AY, RC.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    for (let i = 0; i < 6; i++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RC.x, AY - 1, RC.z);
      L.useBlock(srv, RC.x, AY - 1, RC.z, who);
      await sleep(400);
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      const row = rows[rows.length - 1] || null;
      ev.R1c.indoor.push({ i: i + 1, before, after: bot.heldItem ? bot.heldItem.count : 0, row: row && row.raw, stage: row ? row.stage : null, giant: !!(row && row.giant) });
      if (row && row.giant) {
        const ok = await L.testBlock(srv, RC.x, AY, RC.z, 'minecraft:brown_mushroom_block');
        ev.R1c.indoor[ev.R1c.indoor.length - 1].giantBlock = ok.ok;
        await clearTop(RC.x, RC.z);
        await L.tp(srv, RC.x + 0.5, AY, RC.z + 2.0, { bot: who, wait: 300 });
      }
    }
    // L1 root-cause probe: Chunk.addTileEntity:882 drops a TE unless
    // block.hasTileEntity(state); the mushroom declares none, so testforblock
    // skips its NBT comparison entirely (CommandTestForBlock:81 gate). A bogus
    // key therefore "succeeds" <=> no TE is ever attached to the mushroom.
    ev.L1 = {
      bogusNbtAccepted: (await L.testBlock(srv, RC.x, AY, RC.z, 'minecraft:brown_mushroom', 0,
        '{EtimMushroomGrowth:999,EtimBogusKey:1b}')).ok,
      raw: (await L.testBlock(srv, RC.x, AY, RC.z, 'minecraft:brown_mushroom')).raw,
    };
    log('L1', JSON.stringify(ev.L1));

    // outdoor: 1 hand must white-eat (outdoor=1, stage frozen, mushroom survives)
    await clearTop(RT.x, RT.z);
    await L.tp(srv, RT.x + 0.5, AY, RT.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RT.x, AY - 1, RT.z);
      L.useBlock(srv, RT.x, AY - 1, RT.z, who);
      await sleep(700);
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R1c.outdoor.push({ i: 1, before, after: bot.heldItem ? bot.heldItem.count : 0, row: rows[0] && rows[0].raw, stage: rows[0] ? rows[0].stage : null, outdoor: !!(rows[0] && rows[0].outdoor) });
    }
    ev.R1c.outdoorSurvives = (await L.testBlock(srv, RT.x, AY, RT.z, 'minecraft:brown_mushroom')).ok;
    // stage-frozen proof: roof the plot at AY+14 (above the giant's y+13 reach)
    // so canSeeSky=false; if the outdoor hand had advanced the stage the next
    // rows would be 2/3 then giant, if frozen they must be 1/3,2/3,3/3.
    srv.send(`fill 209 ${AY + 14} 697 215 ${AY + 14} 703 minecraft:stone 0`);
    await sleep(500);
    from = srv.all.length;
    for (let i = 0; i < 3; i++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      await L.lookAtTop(bot, RT.x, AY - 1, RT.z);
      L.useBlock(srv, RT.x, AY - 1, RT.z, who);
      await sleep(450);
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      const row = rows[rows.length - 1] || null;
      ev.R1c.outdoor.push({ i: i + 2, before, after: bot.heldItem ? bot.heldItem.count : 0, row: row && row.raw, stage: row ? row.stage : null, giant: !!(row && row.giant), outdoor: !!(row && row.outdoor) });
    }
    ev.R1c.outdoorGiantBlock = (await L.testBlock(srv, RT.x, AY, RT.z, 'minecraft:brown_mushroom_block')).ok;
    log('R1c', JSON.stringify({ indoor: ev.R1c.indoor.map((r) => r.stage), outdoor: ev.R1c.outdoor.map((r) => ({ s: r.stage, o: r.outdoor })), survive: ev.R1c.outdoorSurvives }));

    /* ================= R2a break/replant resets the stage ================= */
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 16`);
    await clearTop(RR.x, RR.z);
    await L.tp(srv, RR.x + 0.5, AY, RR.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    ev.R2a = { before: [], afterReset: [] };
    for (let i = 0; i < 2; i++) {
      await L.lookAtTop(bot, RR.x, AY - 1, RR.z);
      L.useBlock(srv, RR.x, AY - 1, RR.z, who);
      await sleep(420);
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R2a.before.push(rows[rows.length - 1] && rows[rows.length - 1].raw);
    }
    // break (air) then replant: the TE must be gone with the block
    srv.send(`setblock ${RR.x} ${AY} ${RR.z} minecraft:air 0 replace`);
    await sleep(400);
    srv.send(`setblock ${RR.x} ${AY} ${RR.z} minecraft:brown_mushroom 0 replace`);
    await sleep(500);
    from = srv.all.length;
    await L.lookAtTop(bot, RR.x, AY - 1, RR.z);
    L.useBlock(srv, RR.x, AY - 1, RR.z, who);
    await sleep(500);
    {
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R2a.afterReset.push(rows[rows.length - 1] && rows[rows.length - 1].raw);
      ev.R2a.afterResetStage = rows[rows.length - 1] ? rows[rows.length - 1].stage : null;
    }
    log('R2a', JSON.stringify({ before: ev.R2a.before, after: ev.R2a.afterResetStage }));

    /* ================= R2b save the stage for the reload check ================= */
    await clearTop(RS.x, RS.z);
    await L.tp(srv, RS.x + 0.5, AY, RS.z + 2.0, { bot: who, wait: 500 });
    from = srv.all.length;
    await L.lookAtTop(bot, RS.x, AY - 1, RS.z);
    L.useBlock(srv, RS.x, AY - 1, RS.z, who);
    await sleep(600);
    {
      const rows = parseFarm(srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R2b = { bootStage: rows[rows.length - 1] ? rows[rows.length - 1].stage : null, before: rows[rows.length - 1] && rows[rows.length - 1].raw };
    }
    srv.send('save-all');
    await sleep(1500);
    log('R2b-before', JSON.stringify(ev.R2b));

    /* ================= R3 farm TOP spot ================= */
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 5`);
    srv.send(`setblock ${RF.x} ${RF.y} ${RF.z} minecraft:air 0 replace`);
    await sleep(250);
    srv.send(`setblock ${RF.x} ${RF.y} ${RF.z} minecraft:farmland 0 replace`);
    srv.send(`setblock ${RF.x} ${RF.y + 1} ${RF.z} minecraft:air 0 replace`);
    await sleep(700);
    await L.tp(srv, RF.x + 0.5, AY, RF.z + 2.0, { bot: who, wait: 600 });
    from = srv.all.length;
    const r3before = bot.heldItem ? bot.heldItem.count : 0;
    await L.lookAtTop(bot, RF.x, RF.y, RF.z);
    L.useBlock(srv, RF.x, RF.y, RF.z, who);
    await sleep(800);
    const r3after = bot.heldItem ? bot.heldItem.count : 0;
    const firstRows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
    from = srv.all.length;
    await L.lookAtTop(bot, RF.x, RF.y, RF.z);
    L.useBlock(srv, RF.x, RF.y, RF.z, who);
    await sleep(800);
    const secondRows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
    ev.R3 = {
      before: r3before, afterFirst: r3after, afterSecond: bot.heldItem ? bot.heldItem.count : 0,
      firstRows, secondRows,
      set: firstRows.filter((l) => /fertilized set .*value=true/.test(l)).length,
      soil: firstRows.filter((l) => /chain=farm soilEnrichment=1/.test(l)).length,
    };
    log('R3', JSON.stringify({ before: ev.R3.before, a1: ev.R3.afterFirst, a2: ev.R3.afterSecond,
      set: ev.R3.set, soil: ev.R3.soil, secondRows: secondRows.length }));

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop1 = await srv.stop();
    ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop1 = await srv.stop(); ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop1Error = String(e && e.message || e); }
  }

  /* ================= boot 2: reload window (R2b) ================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b2' });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( boot2');
    const boot2 = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() };
    boot2.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    ev.boots.push(boot2);
    log('boot2', boot2.boot + ' mixin=' + boot2.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, RS.x + 0.5, AY, RS.z + 2.5, { bot: who, wait: 2400 });
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 16`);
    // warm-up again (C-11)
    srv.send(`setblock 170 ${AY - 1} 697 minecraft:dirt 0 replace`);
    srv.send(`setblock 170 ${AY} 697 minecraft:air 0 replace`);
    await sleep(400);
    await L.tp(srv, 170.5, AY, 699.5, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 170, AY - 1, 697);
    let f2 = srv.all.length;
    L.useBlock(srv, 170, AY - 1, 697, who);
    await sleep(700);
    ev.reloadWarmup = { useblocks: srv.all.slice(f2).map(L.strip).filter((l) => /step=useblock/.test(l)).length,
      farmRows: srv.all.slice(f2).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length };
    // the saved mushroom must still be there, and one hand must read 2/3
    ev.R2b.survivesReload = (await L.testBlock(srv, RS.x, AY, RS.z, 'minecraft:brown_mushroom')).ok;
    await L.tp(srv, RS.x + 0.5, AY, RS.z + 2.0, { bot: who, wait: 600 });
    f2 = srv.all.length;
    await L.lookAtTop(bot, RS.x, AY - 1, RS.z);
    L.useBlock(srv, RS.x, AY - 1, RS.z, who);
    await sleep(700);
    {
      const rows = parseFarm(srv.all.slice(f2).map(L.strip).filter((l) => /\[FarmLog\] fertilize/.test(l)));
      ev.R2b.afterReload = rows[0] && rows[0].raw;
      ev.R2b.afterReloadStage = rows[0] ? rows[0].stage : null;
    }
    log('R2b-after', JSON.stringify(ev.R2b));
    ev.rowCounts2 = L.rowCounts(srv.all.map(L.strip));
    ev.stop2 = await srv.stop();
    ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop2 = await srv.stop(); ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop2Error = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
