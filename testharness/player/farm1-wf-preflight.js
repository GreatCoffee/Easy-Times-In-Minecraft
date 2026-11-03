#!/usr/bin/env node
/**
 * farm1-wf-preflight.js — farm1 批（B4：fertility / harvesting）W-F **预飞**（非判据窗）
 *
 * 两 boot：
 *   Boot A = cfg 首启面（farm 类目 8 键首落，gate 尚为默认 false）＋运行时 ids
 *            ＋载体门 7 臂（[EnchantLog] pool reg，零门控）。
 *   Boot B = farmDebugLog=true 后的机械自核（纪律 9）：
 *            a. /fill 带 TE NBT（{EtimFertilized:1b}）直造施肥耕地 → growth/clear 行；
 *            b. /etest useblock 耕地（L5 沃肥锄）→ tillage 行 + fertilized set 行；
 *            c. /etest dig 收成熟小麦（镰 + harvesting）→ harvesting 行；
 *            d. 踩踏链：施肥地 deny 行 / 普通耕地 allow 行 + 变泥（testforblock 判块）；
 *            e. 粗泥 B-3 臂：锄成功落 DIRT ⇒ tillage 行 0；
 *            f. vanilla iron_hoe 收割臂（发现位：收割 roll 只在 ETIM 三类 onBlockDestroyed 上）。
 *
 * 收尾：cfg 留 farm 首启态、farmDebugLog 回 false；props/world 回填。
 *
 * 用法：node farm1-wf-preflight.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-preflight';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD = 'farm1wfp';
const PORT = 25565;
const BOT = 'ETIM_FF';

const FARM8 = ['fertilityDifficulty', 'harvestingDifficulty', 'fertilityMaxLevel',
  'harvestingMaxLevel', 'fertilizedGrowthFactor', 'fertilizedConsumeDivisor',
  'harvestingYieldFactor', 'farmDebugLog'];
const FARM_DEFAULTS = {
  fertilityDifficulty: '10', harvestingDifficulty: '10', fertilityMaxLevel: '5',
  harvestingMaxLevel: '5', fertilizedGrowthFactor: '1.5', fertilizedConsumeDivisor: '256',
  harvestingYieldFactor: '0.5', farmDebugLog: 'false',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}
function setCfgValue(file, key, value) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + key + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg has no key ' + key);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + value), 'utf8');
}
function cfgKeys(file) {
  const t = fs.readFileSync(file, 'utf8');
  const out = {};
  for (const line of t.split(/\r?\n/)) {
    const m = /^    [A-Z]:(\w+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const RE = {
  done: /Done \(/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  till: /\[FarmLog\] fertility tillage lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  harvest: /\[FarmLog\] fertility harvest tool=(\S+) crop=(\S+) lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  set: /\[FarmLog\] fertilized set pos=([-\d,]+) value=(true|false)/,
  clear: /\[FarmLog\] fertilized clear pos=([-\d,]+) roll=(\d+) divisor=(\d+) cleared=(true|false)/,
  growth: /\[FarmLog\] growth pos=([-\d,]+) value=([\d.]+) base=([\d.]+) ratio=([\d.]+) factor=([\d.]+)/,
  deny: /\[FarmLog\] fertilized trample-deny pos=([-\d,]+) entity=(.+?)\s*\[server\]/,
  allow: /\[FarmLog\] trample allow pos=([-\d,]+) fertilized=false entity=(.+?)\s*\[server\]/,
  hrow: /\[FarmLog\] harvesting crop=(\S+) lvl=(\d+) fraction=([\d.]+) factor=([\d.]+) base=(\d+) extra=(\d+) pos=([-\d,]+)/,
};

async function joinBot(srv) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      return await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
    } catch (e) {
      lastErr = e;
      log('bot', `connect attempt ${attempt} failed: ${(e && e.message) || e}`);
      await sleep(2500);
    }
  }
  throw lastErr || new Error('bot connect failed');
}

async function stageWorld(srv, bot) {
  srv.send(`op ${BOT}`);
  await sleep(900);
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
    'keepInventory true', 'mobGriefing true', 'naturalRegeneration false']) srv.send('gamerule ' + g);
  srv.send('difficulty 2');
  srv.send('time set 6000');
  srv.send('weather clear');
  srv.send(`gamemode 0 ${BOT}`);
  srv.send(`etest food 20 20 ${BOT}`);
  srv.send(`etest health 20 ${BOT}`);
  await sleep(900);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, window: 'W-F 预飞（非判据）', startedAt: new Date().toISOString(), boots: [] };
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore), keys: Object.keys(cfgKeys(CFG)).length };
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  /* ===================== Boot A：cfg 首启面 + ids + 载体门 ===================== */
  {
    const srv = await startServer({ root: ROOT, tag: TAG });
    let bot = null;
    try {
      const done = await srv.waitFor(RE.done, 480000);
      if (!done) throw new Error('no boot A');
      ev.boots.push({ phase: 'A', ready: strip(done).trim() });
      log('boot-A', strip(done).slice(0, 60));

      const k = cfgKeys(CFG);
      ev.cfgAfterBoot = {
        bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
        keyCount: Object.keys(k).length,
        farmMissing: FARM8.filter((x) => !(x in k)),
        values: Object.fromEntries(FARM8.map((x) => [x, k[x] === undefined ? null : k[x]])),
        hasFarmCategory: /^farm \{/m.test(fs.readFileSync(CFG, 'utf8')),
      };
      ev.cfgAfterBoot.defaultsMatch = FARM8.every((x) => ev.cfgAfterBoot.values[x] === FARM_DEFAULTS[x]);
      fs.copyFileSync(CFG, path.join(OUT, TAG + '-cfg.firststart'));
      log('cfg', JSON.stringify({ bytes: ev.cfgAfterBoot.bytes, keys: ev.cfgAfterBoot.keyCount,
        farmMissing: ev.cfgAfterBoot.farmMissing, category: ev.cfgAfterBoot.hasFarmCategory,
        defaults: ev.cfgAfterBoot.defaultsMatch }));
      log('cfg', JSON.stringify(ev.cfgAfterBoot.values));

      ev.idsLines = srv.all.filter((l) => /\[EtimInit\] enchant/.test(l)).map(strip);
      const idm = /ids=([\d\s]+)/.exec(ev.idsLines.find((l) => /\bids=/.test(l)) || '');
      ev.ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
      log('ids', JSON.stringify(ev.ids));

      bot = await joinBot(srv);
      try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
      try { bot.physics.enabled = false; } catch (e) { /* noop */ }
      await stageWorld(srv, bot);

      ev.t1 = [];
      const arms = [
        ['etim:hoe_copper', 'hoe_copper'], ['minecraft:iron_hoe', 'iron_hoe'],
        ['etim:scythe_copper', 'scythe_copper'], ['etim:mattock_copper', 'mattock_copper'],
        ['etim:pickaxe_copper', 'pickaxe_copper'], ['etim:sword_copper', 'sword_copper'],
        ['etim:shovel_copper', 'shovel_copper'],
      ];
      for (const [item, id] of arms) {
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
        await sleep(420);
        const from = srv.all.length;
        srv.send(`etest enchantprobe mainhand pool ${BOT}`);
        await sleep(800);
        const regs = {};
        for (const raw of srv.all.slice(from)) {
          const m = RE.reg.exec(raw);
          if (m) regs[m[1]] = { table: m[4] === 'true', window: m[6].trim(), id: +m[2], weight: +m[3] };
        }
        const row = { id, item, regCount: Object.keys(regs).length,
          fertility: regs['etim:fertility'] || null, harvesting: regs['etim:harvesting'] || null };
        ev.t1.push(row);
        log('probe', `${id}: regs=${row.regCount} fert=${row.fertility && row.fertility.table} harv=${row.harvesting && row.harvesting.table}`);
      }
    } finally {
      try { if (bot) bot.quit(); } catch (e) { /* noop */ }
      const stop = await srv.stop();
      ev.boots[0].stop = stop;
      ev.boots[0].buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    }
  }

  /* ===================== Boot B：机械自核（gate=true） ===================== */
  setCfgValue(CFG, 'farmDebugLog', 'true');
  ev.cfgGated = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  {
    const srv = await startServer({ root: ROOT, tag: TAG + '-mech' });
    let bot = null;
    try {
      const done = await srv.waitFor(RE.done, 480000);
      if (!done) throw new Error('no boot B');
      ev.boots.push({ phase: 'B', ready: strip(done).trim() });
      log('boot-B', strip(done).slice(0, 60));

      bot = await joinBot(srv);
      try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
      try { bot.physics.enabled = false; } catch (e) { /* noop */ }
      await stageWorld(srv, bot);

      const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
      const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
      ev.arena = { bx, by, bz };
      srv.send(`fill ${bx - 10} ${by - 1} ${bz - 10} ${bx + 14} ${by - 1} ${bz + 10} minecraft:stone 0`);
      srv.send(`fill ${bx - 10} ${by} ${bz - 10} ${bx + 14} ${by + 4} ${bz + 10} minecraft:air 0`);
      await sleep(2200);
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(1400);
      log('arena', JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(bot.entity && bot.entity.position));

      const stage = (item, count, meta, nbt) => srv.send(nbt
        ? `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count} ${meta} ${nbt}`
        : `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count} ${meta}`);
      const rowsSince = (from) => srv.all.slice(from).map(strip);
      const count = (from, re) => srv.all.slice(from).filter((l) => re.test(l)).length;
      const tf = async (x, y, z, block, state) => {
        const from = srv.all.length;
        srv.send(state ? `testforblock ${x} ${y} ${z} ${block} ${state}` : `testforblock ${x} ${y} ${z} ${block}`);
        await sleep(450);
        return rowsSince(from).filter((l) => /Successfully found|The block at|failed|is not/i.test(l)).join(' | ');
      };

      /* a) /fill 带 TE NBT 直造施肥耕地 → growth/clear 行 */
      ev.fillTe = {};
      const gx = bx + 4, gz = bz - 1;
      srv.send(`fill ${gx} ${by - 1} ${gz} ${gx + 2} ${by - 1} ${gz + 2} minecraft:farmland 7 replace {EtimFertilized:1b}`);
      await sleep(600);
      ev.fillTe.block = await tf(gx, by - 1, gz, 'minecraft:farmland');
      srv.send(`fill ${gx} ${by} ${gz} ${gx + 2} ${by} ${gz + 2} minecraft:wheat 0`);
      srv.send('gamerule randomTickSpeed 200');
      await sleep(600);
      const gFrom = srv.all.length;
      await sleep(12000);
      ev.fillTe.growthRows = count(gFrom, RE.growth);
      ev.fillTe.consumeRows = count(gFrom, RE.clear);
      ev.fillTe.sample = rowsSince(gFrom).filter((l) => RE.growth.test(l) || RE.clear.test(l)).slice(0, 6);
      log('fillTe', JSON.stringify({ block: ev.fillTe.block, growth: ev.fillTe.growthRows, consume: ev.fillTe.consumeRows }));
      log('fillTe', JSON.stringify(ev.fillTe.sample));
      srv.send('gamerule randomTickSpeed 3');

      /* b) useblock 耕地（L5 沃肥锄） */
      ev.till = {};
      const tp1 = { x: bx + 1, y: by, z: bz };
      srv.send(`setblock ${tp1.x} ${tp1.y} ${tp1.z} minecraft:dirt 0`);
      srv.send(`clear ${BOT}`);
      stage('etim:hoe_copper', 1, 0, null);
      srv.send(`etest enchant mainhand 5 fertility ${BOT}`);
      await sleep(700);
      const tillFrom = srv.all.length;
      srv.send(`etest useblock ${tp1.x} ${tp1.y} ${tp1.z} ${BOT}`);
      await sleep(1800);
      ev.till = {
        rows: rowsSince(tillFrom).filter((l) => RE.till.test(l)),
        sets: rowsSince(tillFrom).filter((l) => RE.set.test(l)),
        block: await tf(tp1.x, tp1.y, tp1.z, 'minecraft:farmland'),
        reachDenied: rowsSince(tillFrom).filter((l) => /reach denied/.test(l)),
      };
      log('till', JSON.stringify(ev.till));

      /* c) dig 收小麦（镰 + harvesting） */
      ev.harvest = {};
      const hp = { x: bx + 1, y: by, z: bz };
      srv.send(`setblock ${hp.x} ${hp.y - 1} ${hp.z} minecraft:farmland 7`);
      srv.send(`setblock ${hp.x} ${hp.y} ${hp.z} minecraft:wheat 7`);
      srv.send(`clear ${BOT}`);
      stage('etim:scythe_copper', 1, 0, null);
      srv.send(`etest enchant mainhand 5 harvesting ${BOT}`);
      await sleep(700);
      const hFrom = srv.all.length;
      srv.send(`etest dig ${hp.x} ${hp.y} ${hp.z} ${BOT}`);
      await sleep(3000);
      ev.harvest = {
        rows: rowsSince(hFrom).filter((l) => RE.hrow.test(l)),
        fertRows: rowsSince(hFrom).filter((l) => RE.harvest.test(l)),
        blockAfter: await tf(hp.x, hp.y, hp.z, 'minecraft:air'),
        raw: rowsSince(hFrom).filter((l) => /TestLog\] step=dig|harvesting|reach/.test(l)).slice(0, 5),
      };
      log('harvest', JSON.stringify(ev.harvest));

      /* d) 踩踏链 */
      const denyPos = { x: bx + 2, y: by - 1, z: bz + 3 };
      const allowPos = { x: bx + 4, y: by - 1, z: bz + 3 };
      srv.send(`setblock ${denyPos.x} ${denyPos.y} ${denyPos.z} minecraft:farmland  replace {EtimFertilized:1b}`);
      srv.send(`setblock ${allowPos.x} ${allowPos.y} ${allowPos.z} minecraft:farmland 7`);
      await sleep(700);
      const trFrom = srv.all.length;
      srv.send(`summon minecraft:cow ${denyPos.x + 0.5} ${by + 3} ${denyPos.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tfc1"]}`);
      srv.send(`summon minecraft:cow ${allowPos.x + 0.5} ${by + 3} ${allowPos.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tfc2"]}`);
      await sleep(4000);
      ev.trample = {
        deny: rowsSince(trFrom).filter((l) => RE.deny.test(l)),
        allow: rowsSince(trFrom).filter((l) => RE.allow.test(l)),
        denyBlock: await tf(denyPos.x, denyPos.y, denyPos.z, 'minecraft:farmland'),
        allowBlock: await tf(allowPos.x, allowPos.y, allowPos.z, 'minecraft:dirt'),
        other: rowsSince(trFrom).filter((l) => /FarmLog/.test(l)).slice(0, 8),
      };
      log('trample', JSON.stringify(ev.trample));
      srv.send('kill @e[type=cow]');

      /* e) 粗泥 B-3 臂 */
      const cd = { x: bx - 2, y: by, z: bz };
      srv.send(`setblock ${cd.x} ${cd.y} ${cd.z} minecraft:dirt 1`);
      srv.send(`clear ${BOT}`);
      stage('etim:hoe_copper', 1, 0, null);
      srv.send(`etest enchant mainhand 5 fertility ${BOT}`);
      await sleep(600);
      const cdFrom = srv.all.length;
      srv.send(`etest useblock ${cd.x} ${cd.y} ${cd.z} ${BOT}`);
      await sleep(1600);
      ev.coarse = {
        tillRows: rowsSince(cdFrom).filter((l) => RE.till.test(l)),
        block: await tf(cd.x, cd.y, cd.z, 'minecraft:dirt'),
        raw: rowsSince(cdFrom).filter((l) => /TestLog|FarmLog|reach/.test(l)).slice(0, 5),
      };
      log('coarse', JSON.stringify(ev.coarse));

      /* f) vanilla iron_hoe 收割臂（发现位） */
      const vp = { x: bx - 1, y: by, z: bz + 1 };
      srv.send(`setblock ${vp.x} ${vp.y - 1} ${vp.z} minecraft:farmland 7`);
      srv.send(`setblock ${vp.x} ${vp.y} ${vp.z} minecraft:carrots 7`);
      srv.send(`clear ${BOT}`);
      stage('minecraft:iron_hoe', 1, 0, null);
      srv.send(`etest enchant mainhand 5 fertility ${BOT}`);
      await sleep(700);
      const vFrom = srv.all.length;
      srv.send(`etest dig ${vp.x} ${vp.y} ${vp.z} ${BOT}`);
      await sleep(2800);
      ev.vanillaHoeHarvest = {
        fertRows: rowsSince(vFrom).filter((l) => RE.harvest.test(l)),
        blockAfter: await tf(vp.x, vp.y, vp.z, 'minecraft:air'),
        raw: rowsSince(vFrom).filter((l) => /FarmLog|TestLog|MiningLog/.test(l)).slice(0, 6),
      };
      log('vanillaHoe', JSON.stringify(ev.vanillaHoeHarvest));

      ev.rowCounts = {
        farm: srv.all.filter((l) => /\[FarmLog\]/.test(l)).length,
        enchant: srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length,
        mining: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
        melee: srv.all.filter((l) => /\[MeleeLog\]/.test(l)).length,
      };
      log('counts', JSON.stringify(ev.rowCounts));
    } finally {
      try { if (bot) bot.quit(); } catch (e) { /* noop */ }
      const stop = await srv.stop();
      ev.boots[1].stop = stop;
      ev.boots[1].buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    }
  }

  /* ===================== 收尾 ===================== */
  setCfgValue(CFG, 'farmDebugLog', 'false');
  fs.writeFileSync(PROPS, propsBefore);
  ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  ev.cfgClose.keys = Object.keys(cfgKeys(CFG)).length;
  const d = path.join(ROOT, 'run', WORLD);
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  ev.worldRemoved = !fs.existsSync(d);
  ev.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
  log('done', 'evidence=' + path.join(OUT, TAG + '-evidence.json'));
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
