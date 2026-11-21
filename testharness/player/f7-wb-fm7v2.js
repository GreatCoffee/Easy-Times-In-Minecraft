#!/usr/bin/env node
/**
 * f7-wb-fm7v2.js - W-FM7v2 judged window (A-1/A-2 fix chain, HEAD 3b54ca1).
 *
 * Contract (task book 2026-11-04):
 *   R1a red click arm, legal shaded-but-flooded spot, 20 hands
 *   R1b brown click arm indoor, 10 hands
 *   R1c mycelium TOP arm indoor 6 hands (2 giant cycles) + outdoor 1 hand white-eat
 *   R1d grass TOP under a red mushroom (B-1 entrance)
 *   R2  stage carrier: break/replant resets; save/reload keeps the stage
 *   R3  farm TOP spot + already-fertilized FAIL
 *   R4  closeout pins
 *
 * Boots: b1 red arms + R3 + R2b plant/save; b2 indoor arms + R2a; b3 reload check.
 *
 * Geometry (pilot-proven): a 5x5 stone roof at AY+14 shades only the red
 * legal column; the open neighbours at distance 3 keep the R196 7x7 flood
 * alive (isOutdoors true) while canSeeSky is false; the giant's own space
 * check stops at AY+13 so the roof never blocks it.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm7v2';
const WORLD = 'f7w2j';
const AY = 140;
const GY = 139;
const PAD = 138;
const ROOFY = 154;

const SP = {
  red: { x: 196, z: 700 },
  redOpen: { x: 216, z: 700 },
  redNoFlood: { x: 204, z: 690 },
  brownIn: { x: 162, z: 700 },
  topIn: { x: 170, z: 700 },
  topOut: { x: 212, z: 700 },
  r2a: { x: 178, z: 700 },
  r2b: { x: 162, z: 692 },
  farm: { x: 206, z: 700 },
};

const PIN = {
  head: '3b54ca1',
  rel: { bytes: 957686, sha: '806D2AAC335AF98D478D1A30CDBD0A98ECB3388739339EE1FA6657D4BB0EBA70' },
  dev: { bytes: 938828, sha: '29B3499E35C54AB96DF50940364BDDE1C18DDE0605B6A57B6BF6BF43701E95EB' },
  src: { bytes: 870596, sha: 'E1A1A86C4779F127A6F2B599C1234D8C5B4807B4DCE0DAEB774BBF3A984F16AB' },
};

const sleep = L.sleep;
const log = L.log;
const who = L.BOT;

let srv = null;
let bot = null;

function parseFarm(rows) {
  return rows.map((raw) => {
    const o = { raw };
    let m = /kind=(red|brown)/.exec(raw); if (m) o.kind = m[1];
    m = /roll=([\d.]+|none)/.exec(raw); if (m) o.roll = m[1];
    m = /stage=(-?\d+)/.exec(raw); if (m) o.stage = Number(m[1]);
    o.giant = /giant=1/.test(raw);
    o.giantFailed = /giant=failed/.test(raw);
    o.miss = /stage=-1/.test(raw);
    o.outdoor = /outdoor=1/.test(raw);
    o.deny = /gate=deny/.test(raw);
    return o;
  });
}

async function existsAt(x, y, z, block) {
  for (let a = 0; a < 2; a++) {
    const r = await L.testBlock(srv, x, y, z, block);
    if (r.ok) return true;
    await sleep(500);
  }
  return false;
}
async function warmAt(x, y, z) {
  await L.lookAtTop(bot, x, y, z);
  L.useBlock(srv, x, y, z, who);
  await sleep(520);
}
/** one judged hand; retries only when no [TestLog] step=useblock appeared */
async function handAt(x, y, z, block) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const from = srv.all.length;
    const before = bot.heldItem ? bot.heldItem.count : null;
    await L.lookAtTop(bot, x, y, z);
    L.useBlock(srv, x, y, z, who);
    await sleep(780);
    const after = bot.heldItem ? bot.heldItem.count : null;
    const lines = srv.all.slice(from).map(L.strip);
    const rows = lines.filter((l) => /\[FarmLog\]/.test(l));
    const useblocks = lines.filter((l) => /step=useblock/.test(l)).length;
    if (rows.length || useblocks > 0) {
      return { before, after, delta: before === null || after === null ? null : after - before, rows, useblocks, attempts: attempt + 1 };
    }
    if (await existsAt(x, y, z, block)) continue; // packet lost while the block was there
    return { before, after, delta: null, rows: [], useblocks: 0, attempts: attempt + 1, missing: true };
  }
  return { before: null, after: null, delta: null, rows: [], useblocks: 0, attempts: 3 };
}
/** clear a grown giant, replant the small mushroom, step back in */
async function clearGiantAt(x, y, z, block, footY, backZ) {
  await L.tp(srv, x + 0.5, footY, z + 8.5, { bot: who, wait: 520 });
  srv.send(`fill ${x - 3} ${AY} ${z - 3} ${x + 3} 153 ${z + 3} minecraft:air 0`);
  await sleep(650);
  srv.send(`setblock ${x} ${y} ${z} ${block} 0 replace`);
  await sleep(650);
  await L.tp(srv, x + 0.5, footY, z + backZ, { bot: who, wait: 820 });
  await warmAt(x, PAD, z);
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], arms: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src') };
  ev.mk = L.mkCounts();
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfg=' + ev.cfgBefore.keys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  /* ======================= boot 1 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b1' });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    const b1 = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() };
    b1.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    const idLine = srv.all.map(L.strip).find((l) => /\[EtimInit\].*ids=/.test(l)) || '';
    b1.ids = (/ids=([\d\s]+)/.exec(idLine) || [])[1] ? (/ids=([\d\s]+)/.exec(idLine)[1].trim().split(/\s+/).map(Number)) : null;
    ev.boots.push(b1);
    log('boot1', b1.boot + ' mixin=' + b1.mixinFail);

    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });

    /* ---- build ---- */
    await L.tp(srv, 170.5, GY, 700.5, { bot: who, wait: 2600 });
    srv.send(`fill 150 ${PAD} 680 230 ${PAD} 720 minecraft:stone 0`);
    srv.send(`fill 158 ${GY} 688 184 ${GY} 712 minecraft:mycelium 0`);
    srv.send(`fill 157 ${GY} 687 157 156 713 minecraft:stone 0`);
    srv.send(`fill 185 ${GY} 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 687 185 156 687 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 713 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 156 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 158 ${AY} 688 184 155 712 minecraft:air 0`);
    srv.send(`setblock ${SP.red.x} ${GY} ${SP.red.z} minecraft:grass 0 replace`);
    srv.send(`fill ${SP.red.x - 2} ${ROOFY} ${SP.red.z - 2} ${SP.red.x + 2} ${ROOFY} ${SP.red.z + 2} minecraft:stone 0`);
    srv.send(`setblock ${SP.redOpen.x} ${GY} ${SP.redOpen.z} minecraft:grass 0 replace`);
    srv.send(`setblock ${SP.redNoFlood.x} ${GY} ${SP.redNoFlood.z} minecraft:grass 0 replace`);
    srv.send(`fill ${SP.redNoFlood.x - 4} ${ROOFY} ${SP.redNoFlood.z - 4} ${SP.redNoFlood.x + 4} ${ROOFY} ${SP.redNoFlood.z + 4} minecraft:stone 0`);
    srv.send(`setblock ${SP.topOut.x} ${GY} ${SP.topOut.z} minecraft:mycelium 0 replace`);
    srv.send(`fill ${SP.topOut.x - 2} ${ROOFY} ${SP.topOut.z - 2} ${SP.topOut.x + 2} ${ROOFY} ${SP.topOut.z + 2} minecraft:stone 0`);
    await sleep(4500);

    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 64`);
    await sleep(2500);
    ev.heldStart = bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;

    /* ================= R1a red click arm (20 hands) ================= */
    srv.send(`setblock ${SP.red.x} ${AY} ${SP.red.z} minecraft:red_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.red.x + 0.5, GY, SP.red.z + 2.5, { bot: who, wait: 1400 });
    await warmAt(SP.red.x, PAD, SP.red.z);
    ev.arms.R1a = { hands: [], rows: [], giants: 0, replants: 0, lost: 0, retries: 0 };
    for (let i = 0; i < 20; i++) {
      const h = await handAt(SP.red.x, AY, SP.red.z, 'minecraft:red_mushroom');
      if (h.missing) {
        srv.send(`setblock ${SP.red.x} ${AY} ${SP.red.z} minecraft:red_mushroom 0 replace`);
        await sleep(650);
        (await existsAt(SP.red.x, AY, SP.red.z, 'minecraft:red_mushroom')) ? ev.arms.R1a.replants++ : ev.arms.R1a.lost++;
        await warmAt(SP.red.x, PAD, SP.red.z);
        i--;
        continue;
      }
      ev.arms.R1a.hands.push({ i: i + 1, delta: h.delta, attempts: h.attempts, rows: h.rows });
      for (const r of h.rows) ev.arms.R1a.rows.push(r);
      if (h.attempts > 1) ev.arms.R1a.retries += h.attempts - 1;
      if (parseFarm(h.rows).some((r) => r.giant)) {
        ev.arms.R1a.giants++;
        ev.arms.R1a.hands[ev.arms.R1a.hands.length - 1].giantBlock =
          await existsAt(SP.red.x, AY, SP.red.z, 'minecraft:red_mushroom_block');
        await clearGiantAt(SP.red.x, AY, SP.red.z, 'minecraft:red_mushroom', GY, 2.5);
        ev.arms.R1a.replants++;
      }
    }
    log('R1a', JSON.stringify({ hands: ev.arms.R1a.hands.length, rows: ev.arms.R1a.rows.length,
      giants: ev.arms.R1a.giants, replants: ev.arms.R1a.replants, retries: ev.arms.R1a.retries,
      lost: ev.arms.R1a.lost, seq: parseFarm(ev.arms.R1a.rows).map((o) => (o.miss ? -1 : (o.giant ? 'G' : o.stage))) }));

    /* ---- R1a controls ---- */
    srv.send(`setblock ${SP.redOpen.x} ${AY} ${SP.redOpen.z} minecraft:red_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.redOpen.x + 0.5, GY, SP.redOpen.z + 2.5, { bot: who, wait: 1100 });
    await warmAt(SP.redOpen.x, PAD, SP.redOpen.z);
    ev.arms.R1aOpen = await handAt(SP.redOpen.x, AY, SP.redOpen.z, 'minecraft:red_mushroom');
    srv.send(`setblock ${SP.redNoFlood.x} ${AY} ${SP.redNoFlood.z} minecraft:red_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.redNoFlood.x + 0.5, GY, SP.redNoFlood.z + 2.5, { bot: who, wait: 1100 });
    await warmAt(SP.redNoFlood.x, PAD, SP.redNoFlood.z);
    ev.arms.R1aNoFlood = await handAt(SP.redNoFlood.x, AY, SP.redNoFlood.z, 'minecraft:red_mushroom');
    log('R1a-ctl', JSON.stringify({ open: ev.arms.R1aOpen.rows, noFlood: ev.arms.R1aNoFlood.rows }));

    /* ================= R1d grass TOP under red (B-1) ================= */
    srv.send(`setblock ${SP.red.x} ${AY} ${SP.red.z} minecraft:red_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.red.x + 0.5, GY, SP.red.z + 1.5, { bot: who, wait: 1100 });
    await warmAt(SP.red.x, PAD, SP.red.z);
    ev.arms.R1d = await handAt(SP.red.x, GY, SP.red.z, 'minecraft:red_mushroom');
    log('R1d', JSON.stringify({ delta: ev.arms.R1d.delta, rows: ev.arms.R1d.rows }));

    /* ================= R1c outdoor white-eat ================= */
    srv.send(`setblock ${SP.topOut.x} ${AY} ${SP.topOut.z} minecraft:brown_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.topOut.x + 0.5, GY, SP.topOut.z + 1.5, { bot: who, wait: 1100 });
    await warmAt(SP.topOut.x, PAD, SP.topOut.z);
    ev.arms.R1cOut = await handAt(SP.topOut.x, GY, SP.topOut.z, 'minecraft:brown_mushroom');
    ev.arms.R1cOut.survives = await existsAt(SP.topOut.x, AY, SP.topOut.z, 'minecraft:brown_mushroom');
    log('R1c-out', JSON.stringify({ delta: ev.arms.R1cOut.delta, rows: ev.arms.R1cOut.rows, live: ev.arms.R1cOut.survives }));

    /* ================= R3 farm spot ================= */
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 8`);
    await sleep(1400);
    srv.send(`setblock ${SP.farm.x} ${GY} ${SP.farm.z} minecraft:air 0 replace`);
    await sleep(350);
    srv.send(`setblock ${SP.farm.x} ${GY} ${SP.farm.z} minecraft:farmland 0 replace`);
    srv.send(`setblock ${SP.farm.x} ${AY} ${SP.farm.z} minecraft:air 0 replace`);
    await sleep(800);
    await L.tp(srv, SP.farm.x + 0.5, GY, SP.farm.z + 2.5, { bot: who, wait: 1100 });
    await warmAt(SP.farm.x, PAD, SP.farm.z);
    ev.arms.R3 = { first: await handAt(SP.farm.x, GY, SP.farm.z, 'minecraft:farmland'), second: await handAt(SP.farm.x, GY, SP.farm.z, 'minecraft:farmland') };
    log('R3', JSON.stringify({ d1: ev.arms.R3.first.delta, d2: ev.arms.R3.second.delta,
      first: ev.arms.R3.first.rows, second: ev.arms.R3.second.rows }));

    /* ================= R2b plant + save for the reload check ================= */
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 16`);
    await sleep(1400);
    srv.send(`setblock ${SP.r2b.x} ${AY} ${SP.r2b.z} minecraft:brown_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.r2b.x + 0.5, AY, SP.r2b.z + 1.5, { bot: who, wait: 1100 });
    await warmAt(SP.r2b.x, PAD, SP.r2b.z);
    ev.arms.R2b = { before: await handAt(SP.r2b.x, GY, SP.r2b.z, 'minecraft:brown_mushroom') };
    srv.send('save-all');
    await sleep(1800);
    log('R2b-save', JSON.stringify(ev.arms.R2b.before.rows));

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop1 = await srv.stop();
    ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop1 = await srv.stop(); ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop1Error = String(e && e.message || e); }
  }

  /* ======================= boot 2 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b2' });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( boot2');
    const b2 = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length };
    ev.boots.push(b2);
    log('boot2', b2.boot + ' mixin=' + b2.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, 170.5, AY, 700.5, { bot: who, wait: 2600 });
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 64`);
    await sleep(2500);

    /* ================= R1b brown click arm (10 hands) ================= */
    srv.send(`setblock ${SP.brownIn.x} ${AY} ${SP.brownIn.z} minecraft:brown_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.brownIn.x + 0.5, AY, SP.brownIn.z + 2.5, { bot: who, wait: 1400 });
    await warmAt(SP.brownIn.x, PAD, SP.brownIn.z);
    ev.arms.R1b = { hands: [], rows: [], giants: 0, replants: 0, retries: 0, lost: 0 };
    for (let i = 0; i < 10; i++) {
      const h = await handAt(SP.brownIn.x, AY, SP.brownIn.z, 'minecraft:brown_mushroom');
      if (h.missing) {
        srv.send(`setblock ${SP.brownIn.x} ${AY} ${SP.brownIn.z} minecraft:brown_mushroom 0 replace`);
        await sleep(650);
        (await existsAt(SP.brownIn.x, AY, SP.brownIn.z, 'minecraft:brown_mushroom')) ? ev.arms.R1b.replants++ : ev.arms.R1b.lost++;
        await warmAt(SP.brownIn.x, PAD, SP.brownIn.z);
        i--;
        continue;
      }
      ev.arms.R1b.hands.push({ i: i + 1, delta: h.delta, attempts: h.attempts, rows: h.rows });
      for (const r of h.rows) ev.arms.R1b.rows.push(r);
      if (h.attempts > 1) ev.arms.R1b.retries += h.attempts - 1;
      if (parseFarm(h.rows).some((r) => r.giant)) {
        ev.arms.R1b.giants++;
        ev.arms.R1b.hands[ev.arms.R1b.hands.length - 1].giantBlock =
          await existsAt(SP.brownIn.x, AY, SP.brownIn.z, 'minecraft:brown_mushroom_block');
        await clearGiantAt(SP.brownIn.x, AY, SP.brownIn.z, 'minecraft:brown_mushroom', AY, 2.5);
        ev.arms.R1b.replants++;
      }
    }
    log('R1b', JSON.stringify({ rows: ev.arms.R1b.rows.length, giants: ev.arms.R1b.giants,
      replants: ev.arms.R1b.replants, retries: ev.arms.R1b.retries, lost: ev.arms.R1b.lost,
      seq: parseFarm(ev.arms.R1b.rows).map((o) => (o.miss ? -1 : (o.giant ? 'G' : o.stage))) }));

    /* ================= R1c mycelium TOP indoor (6 hands) ================= */
    srv.send(`setblock ${SP.topIn.x} ${AY} ${SP.topIn.z} minecraft:brown_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.topIn.x + 0.5, AY, SP.topIn.z + 1.5, { bot: who, wait: 1400 });
    await warmAt(SP.topIn.x, PAD, SP.topIn.z);
    ev.arms.R1cIn = { hands: [], rows: [], giants: 0, replants: 0, retries: 0, lost: 0 };
    for (let i = 0; i < 6; i++) {
      const h = await handAt(SP.topIn.x, GY, SP.topIn.z, 'minecraft:brown_mushroom');
      if (h.missing) {
        srv.send(`setblock ${SP.topIn.x} ${AY} ${SP.topIn.z} minecraft:brown_mushroom 0 replace`);
        await sleep(650);
        (await existsAt(SP.topIn.x, AY, SP.topIn.z, 'minecraft:brown_mushroom')) ? ev.arms.R1cIn.replants++ : ev.arms.R1cIn.lost++;
        await warmAt(SP.topIn.x, PAD, SP.topIn.z);
        i--;
        continue;
      }
      ev.arms.R1cIn.hands.push({ i: i + 1, delta: h.delta, attempts: h.attempts, rows: h.rows });
      for (const r of h.rows) ev.arms.R1cIn.rows.push(r);
      if (h.attempts > 1) ev.arms.R1cIn.retries += h.attempts - 1;
      if (parseFarm(h.rows).some((r) => r.giant)) {
        ev.arms.R1cIn.giants++;
        ev.arms.R1cIn.hands[ev.arms.R1cIn.hands.length - 1].giantBlock =
          await existsAt(SP.topIn.x, AY, SP.topIn.z, 'minecraft:brown_mushroom_block');
        await clearGiantAt(SP.topIn.x, AY, SP.topIn.z, 'minecraft:brown_mushroom', AY, 2.5);
        ev.arms.R1cIn.replants++;
        await L.tp(srv, SP.topIn.x + 0.5, AY, SP.topIn.z + 1.5, { bot: who, wait: 850 });
        await warmAt(SP.topIn.x, PAD, SP.topIn.z);
      }
    }
    log('R1c-in', JSON.stringify({ seq: parseFarm(ev.arms.R1cIn.rows).map((o) => (o.giant ? 'G' : o.stage)),
      giants: ev.arms.R1cIn.giants, replants: ev.arms.R1cIn.replants, retries: ev.arms.R1cIn.retries, lost: ev.arms.R1cIn.lost }));

    /* ================= R2a break/replant resets ================= */
    srv.send(`setblock ${SP.r2a.x} ${AY} ${SP.r2a.z} minecraft:brown_mushroom 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.r2a.x + 0.5, AY, SP.r2a.z + 1.5, { bot: who, wait: 1100 });
    await warmAt(SP.r2a.x, PAD, SP.r2a.z);
    ev.arms.R2a = { before: [] };
    for (let i = 0; i < 2; i++) ev.arms.R2a.before.push(await handAt(SP.r2a.x, GY, SP.r2a.z, 'minecraft:brown_mushroom'));
    srv.send(`setblock ${SP.r2a.x} ${AY} ${SP.r2a.z} minecraft:air 0 replace`);
    await sleep(650);
    srv.send(`setblock ${SP.r2a.x} ${AY} ${SP.r2a.z} minecraft:brown_mushroom 0 replace`);
    await sleep(750);
    await warmAt(SP.r2a.x, PAD, SP.r2a.z);
    ev.arms.R2a.afterReset = await handAt(SP.r2a.x, GY, SP.r2a.z, 'minecraft:brown_mushroom');
    log('R2a', JSON.stringify({ before: ev.arms.R2a.before.map((h) => h.rows), after: ev.arms.R2a.afterReset.rows }));

    ev.rowCounts2 = L.rowCounts(srv.all.map(L.strip));
    ev.stop2 = await srv.stop();
    ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop2 = await srv.stop(); ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop2Error = String(e && e.message || e); }
  }

  /* ======================= boot 3: reload check ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b3' });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( boot3');
    const b3 = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length };
    ev.boots.push(b3);
    log('boot3', b3.boot + ' mixin=' + b3.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, SP.r2b.x + 0.5, AY, SP.r2b.z + 1.5, { bot: who, wait: 2600 });
    srv.send(`clear ${who}`); srv.send(`give ${who} etim:manure 16`);
    await sleep(2200);
    ev.arms.R2b.survivesReload = await L.testBlock(srv, SP.r2b.x, AY, SP.r2b.z, 'minecraft:brown_mushroom');
    await warmAt(SP.r2b.x, PAD, SP.r2b.z);
    ev.arms.R2b.afterReload = await handAt(SP.r2b.x, GY, SP.r2b.z, 'minecraft:brown_mushroom');
    log('R2b-reload', JSON.stringify({ survives: ev.arms.R2b.survivesReload.ok, rows: ev.arms.R2b.afterReload.rows }));

    ev.rowCounts3 = L.rowCounts(srv.all.map(L.strip));
    ev.stop3 = await srv.stop();
    ev.build3 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop3 = await srv.stop(); ev.build3 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop3Error = String(e && e.message || e); }
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
