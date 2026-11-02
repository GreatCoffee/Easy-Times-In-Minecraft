#!/usr/bin/env node
/**
 * melee1-we2-preflight.js — melee1 批（B2 三条）W-E2 **预飞**（非判据窗）
 *
 * 目的（三条）：
 *   1) cfg 首启落位观测：因上批收口把 run/config/etim.cfg 回填到 32,095 钉值，
 *      本批 14 新键 + 上批 17 键共 31 键在**本 boot** 才首落 —— T-CFG 首启面在此收。
 *   2) 工装假设核验：实体类型（zombie/skeleton/cow…）、HandItems NBT 持械、
 *      entitydata 读取、/etest attack 面、enchantprobe 新三条表列。
 *   3) 为判据窗（第 2 boot）备 cfg：本 boot 后 14 键已在文件中，判据窗只需改
 *      meleeDebugLog=true。
 *
 * 用法：node melee1-we2-preflight.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'melee1-we2-preflight';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD = 'melee1we2p';
const PORT = 25565;
const BOT = 'ETIM_PF';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
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

const MELEE14 = ['stunDifficulty', 'vampiricDifficulty', 'disarmingDifficulty',
  'stunMaxLevel', 'vampiricMaxLevel', 'disarmingMaxLevel', 'stunChanceDivisor',
  'stunDurationPerLevel', 'stunAmplifierPerLevel', 'vampiricChanceDivisor',
  'vampiricTransferFactor', 'vampiricMinTransfer', 'disarmLockTicks', 'meleeDebugLog'];
const ENCH17 = ['speedDifficulty', 'regenerationDifficulty', 'quicknessDifficulty',
  'trueFlightDifficulty', 'poisonDifficulty', 'speedMaxLevel', 'regenerationMaxLevel',
  'quicknessMaxLevel', 'trueFlightMaxLevel', 'poisonMaxLevel', 'speedPerLevel',
  'regenerationPerLevel', 'quicknessTicksReduction', 'trueFlightBonusLevels',
  'poisonDurationBase', 'poisonDurationSpan', 'poisonPotionIconIndex'];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore), keys: Object.keys(cfgKeys(CFG)).length };

  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    const done = await srv.waitFor(/Done \(/, 420000);
    if (!done) throw new Error('no boot');
    log('boot', strip(done).slice(0, 60));

    /* 1) cfg 首启面 */
    const k = cfgKeys(CFG);
    ev.cfgAfterBoot = {
      bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      keyCount: Object.keys(k).length,
      meleeMissing: MELEE14.filter((x) => !(x in k)),
      enchMissing: ENCH17.filter((x) => !(x in k)),
      values: Object.fromEntries(MELEE14.map((x) => [x, k[x] === undefined ? null : k[x]])),
    };
    fs.copyFileSync(CFG, path.join(OUT, TAG + '-cfg.afterboot'));
    log('cfg', JSON.stringify({ bytes: ev.cfgAfterBoot.bytes, keys: ev.cfgAfterBoot.keyCount,
      meleeMissing: ev.cfgAfterBoot.meleeMissing, enchMissing: ev.cfgAfterBoot.enchMissing }));
    log('cfg', JSON.stringify(ev.cfgAfterBoot.values));

    /* 2) 附魔 ids */
    ev.enchantIds = srv.all.filter((l) => /\[EtimInit\] enchant/.test(l)).map(strip);
    log('ids', ev.enchantIds.join(' || '));
    const idLine = ev.enchantIds.find((l) => /\bids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    ev.ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    log('ids parsed', JSON.stringify(ev.ids));

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule keepInventory true');
    srv.send('gamerule mobGriefing true');
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    await sleep(600);

    /* 3) 场地（出生点基准） */
    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    for (let dx = -5; dx <= 6; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        srv.send(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:stone 0`);
        for (let dy = 0; dy < 4; dy++) srv.send(`setblock ${bx + dx} ${by + dy} ${bz + dz} minecraft:air 0`);
      }
    }
    await sleep(2500);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1400);
    log('arena', JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(bot.entity && bot.entity.position));

    /* 4) 实体类型探针 */
    const subs = {};
    for (const e of ['zombie', 'skeleton', 'cow', 'pig', 'sheep', 'villager', 'iron_golem']) {
      const from = srv.all.length;
      srv.send(`summon minecraft:${e} ${bx + 5} ${by} ${bz + 5}`);
      await sleep(500);
      const seg = srv.all.slice(from).map(strip);
      subs[e] = seg.find((l) => /Summoned|Cannot summon|invalid|failed/.test(l)) || seg.find((l) => l.trim()) || '(no reply)';
      log('summon', e + ' -> ' + subs[e]);
    }
    ev.summon = subs;

    /* 5) NBT 持械 + entitydata 读面 */
    srv.send(`summon minecraft:zombie ${bx + 3} ${by} ${bz} {NoAI:1b,Silent:1b,PersistenceRequired:1b,CanPickUpLoot:1b,HandItems:[{id:"minecraft:iron_sword",Count:1b},{}],Tags:["pfz"]}`);
    await sleep(700);
    const readTag = async (sel, tag, ms = 900) => {
      const from = srv.all.length;
      srv.send(`entitydata ${sel} ${tag}`);
      await sleep(ms);
      return srv.all.slice(from).map(strip).filter((l) => l.trim() && !/harness/.test(l)).join(' | ');
    };
    ev.zombieHand = await readTag('@e[tag=pfz,limit=1]', 'HandItems');
    ev.zombieLockBefore = await readTag('@e[tag=pfz,limit=1]', 'ETIMDisarmTicks');
    log('nbt', 'HandItems -> ' + ev.zombieHand);
    log('nbt', 'ETIMDisarmTicks(missing face) -> ' + ev.zombieLockBefore);

    /* 6) 载体门探针（新三条） */
    const probe = async (slot, item, nbt) => {
      srv.send(`clear ${BOT}`);
      srv.send(nbt
        ? `replaceitem entity ${BOT} slot.${slot} ${item} 1 0 ${nbt}`
        : `replaceitem entity ${BOT} slot.${slot} ${item} 1 0`);
      await sleep(450);
      const from = srv.all.length;
      srv.send(`etest enchantprobe mainhand pool ${BOT}`);
      await sleep(700);
      const seg = srv.all.slice(from).map(strip);
      const pick = (n) => seg.find((l) => l.includes('pool reg=etim:' + n + ' ')) || null;
      const out = { slot, item, stun: pick('stun'), vampiric: pick('vampiric'), disarming: pick('disarming'),
        pool: seg.filter((l) => /EnchantLog\] pool slot|pool-e/.test(l)).length,
        regs: seg.filter((l) => /pool reg=/.test(l)).length };
      log('probe', `${item}: regs=${out.regs} stun=${/table=true/.test(out.stun || '')} vamp=${/table=true/.test(out.vampiric || '')} disarm=${/table=true/.test(out.disarming || '')}`);
      return out;
    };
    ev.probes = [];
    ev.probes.push(await probe('weapon.mainhand', 'etim:war_hammer_copper'));
    ev.probes.push(await probe('weapon.mainhand', 'minecraft:iron_pickaxe'));
    ev.probes.push(await probe('weapon.mainhand', 'minecraft:iron_sword'));
    ev.probes.push(await probe('weapon.mainhand', 'etim:dagger_copper'));
    ev.probes.push(await probe('weapon.mainhand', 'etim:sword_silver'));
    ev.probes.push(await probe('weapon.mainhand', 'etim:scythe_copper'));
    if (ev.ids && ev.ids.length >= 8) {
      const stunId = ev.ids[5];
      ev.probes.push(await probe('weapon.mainhand', 'etim:war_hammer_copper', `{ench:[{id:${stunId},lvl:5}]}`));
    }

    /* 7) /etest attack 面（门关 ⇒ 无 MeleeLog；看 TestLog target） */
    srv.send(`summon minecraft:cow ${bx + 2} ${by} ${bz + 2} {NoAI:1b,Silent:1b,Attributes:[{Name:"generic.maxHealth",Base:1000.0}],Health:1000.0f,Tags:["pfcow"]}`);
    await sleep(700);
    const from = srv.all.length;
    srv.send(`etest attack @e[tag=pfcow,limit=1] ${BOT}`);
    await sleep(1200);
    ev.attackFace = srv.all.slice(from).map(strip).filter((l) => /TestLog|MeleeLog/.test(l));
    log('attack', JSON.stringify(ev.attackFace));

    /* 8) 行计数 */
    ev.rowCounts = {
      melee: srv.all.filter((l) => /\[MeleeLog\]/.test(l)).length,
      enchant: srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length,
      mining: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('done', 'evidence ' + (path.join(OUT, TAG + '-evidence.json')));
  }
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
