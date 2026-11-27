#!/usr/bin/env node
/**
 * b5-wb-preflight.js — butchering 判窗 W-B 开窗前工装自检（不判分）：
 *   ① Health:1 的 /summon 是否真落到 1 HP（entitydata 读回）
 *   ② /etest attack 是否一刀致死 + [ButchLog] gate/family 两行是否成对
 *   ③ burning NBT 是否在死亡时仍 isBurning（burning=true）
 *   ④ 幼体 / doMobLoot=false 的 skip 行
 *   ⑤ spider kept（丝栈）/familyRemoved（眼栈）字段可读
 *   ⑥ 剪毛羊 wool=0
 *   ⑦ /etest enchant 4 级是否被拒（maxLevel=3 上限位）
 *   ⑧ cfg 首启 3 键落盘 + 非 combat 键逐键不变
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'b5-wb-preflight';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD = 'b5wbpre';
const BOT = 'ETIM_R5';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
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
  gate: /\[ButchLog\] gate entity=(\S+) child=(true|false) doMobLoot=(true|false)(.*)$/,
  cow: /\[ButchLog\] cow well=(\S+) lvl=(\d+) leather=(\d+) rB=(-?\d+) nudge=(\d+) beef=(\d+) burning=(true|false)/,
  sheep: /\[ButchLog\] sheep sheared=(true|false) burning=(true|false) color=(\d+) well=(\S+) lvl=(\d+) rB=(-?\d+) wool=(\d+) mutton=(\d+) leather=(\d+)/,
  horse: /\[ButchLog\] horse cls=(\S+) lvl=(\d+) n=(\d+) zeroed=(\d+) baseFlesh=(\d+) meat=(\d+) burning=(true|false)/,
  spider: /\[ButchLog\] spider recent=(true|false) lvl=(\d+) r3=(-?\d+) short=(true|false) eye=(\d+)/,
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, window: 'W-B 开窗前工装自检', startedAt: new Date().toISOString(), probes: {} };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith('10ac9d7');
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore), keys: Object.keys(cfgKeys(CFG)).length,
    hasButchering: /butchering/.test(cfgBefore.toString('utf8')) };
  const keysBefore = cfgKeys(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  /* W-B-CFG 首启：B5 三键此前未落盘（cfg 仍为 farm1 收口态），首启写入后读到值 */
  setCfg(CFG, 'butcheringDebugLog', 'true');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rows = (from) => srv.all.slice(from === undefined ? 0 : from).map(strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const idLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    const ids = idm ? idm[1].trim().split(/[ ]+/).map(Number) : null;
    ev.idsLine = idLine.slice(0, 160);
    ev.ids = ids;
    ev.butcheringId = ids && ids[ids.length - 1];
    log('boot', 'ids=' + JSON.stringify(ev.ids) + ' head=' + (ev.headOk ? 'OK' : 'MISMATCH'));

    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 0', 'doTileDrops true', 'naturalRegeneration false']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 2} ${bz - 8} ${bx + 8} ${by - 2} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 5} ${bz + 8} minecraft:air 0`);
    await sleep(2200);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 45`);
    await sleep(1400);

    const KX = bx + 1.5, KY = by, KZ = bz + 0.5;
    const stage = (nbt) => srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:knife_flint 1 0 ` + (nbt || '{Unbreakable:1b}'));
    const kill = async (tag, name, extra) => {
      srv.send(`summon ${name} ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tag}"]${extra || ''}}`);
      await sleep(450);
      const from = mark();
      srv.send(`entitydata @e[tag=${tag},c=1] {}`);
      await sleep(350);
      const dataRows = rows(from).filter((l) => /^Entity data:/.test(l));
      const hp = dataRows.length ? (/Health:\s*([\d.]+)/i.exec(dataRows[0]) || [])[1] : null;
      const from2 = mark();
      srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
      await sleep(900);
      const seg = rows(from2);
      const from3 = mark();
      srv.send(`testfor @e[tag=${tag}]`);
      await sleep(350);
      const after = rows(from3).join(' | ');
      return {
        hp: hp === undefined ? null : (hp === null ? null : +hp),
        entityData: (dataRows[0] || '').slice(0, 140),
        gate: seg.filter((l) => RE.gate.test(l)),
        family: seg.filter((l) => RE.cow.test(l) || RE.sheep.test(l) || RE.horse.test(l) || RE.spider.test(l)),
        testfor: after.slice(0, 120),
      };
    };

    stage();
    await sleep(400);
    ev.probes.cowHealth1 = await kill('p_cow', 'minecraft:cow');
    log('p1 cow', JSON.stringify(ev.probes.cowHealth1).slice(0, 500));

    /* 燃烧牛：Fire NBT（999 非 20 倍数 → 不会在召唤当 tick 立刻 fire 伤害）+ 攻击 */
    {
      const from = mark();
      srv.send(`summon minecraft:cow ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Fire:999s,Tags:["p_burn"]}`);
      await sleep(450);
      srv.send(`etest attack @e[tag=p_burn,c=1] ${BOT}`);
      await sleep(700);
      const seg = rows(from);
      const from2 = mark();
      srv.send(`testfor @e[type=item,r=6] {Item:{id:"minecraft:cooked_beef"}}`);
      await sleep(350);
      const cooked = rows(from2).join(' | ');
      srv.send(`kill @e[type=item]`);
      ev.probes.burningCow = { gate: seg.filter((l) => RE.gate.test(l)), family: seg.filter((l) => RE.cow.test(l)),
        cookedTestfor: cooked.slice(0, 140) };
      log('p2 burningCow', JSON.stringify(ev.probes.burningCow).slice(0, 400));
    }

    /* 幼体牛 */
    {
      const from = mark();
      srv.send(`summon minecraft:cow ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Age:-24000,Tags:["p_child"]}`);
      await sleep(450);
      srv.send(`etest attack @e[tag=p_child,c=1] ${BOT}`);
      await sleep(900);
      const seg = rows(from);
      ev.probes.childCow = { gate: seg.filter((l) => RE.gate.test(l)), family: seg.filter((l) => RE.cow.test(l)) };
      log('p3 child', JSON.stringify(ev.probes.childCow).slice(0, 400));
      srv.send('kill @e[type=cow]');
      await sleep(300);
    }

    /* doMobLoot=false */
    {
      srv.send('gamerule doMobLoot false');
      await sleep(300);
      const from = mark();
      srv.send(`summon minecraft:cow ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["p_noloot"]}`);
      await sleep(450);
      srv.send(`etest attack @e[tag=p_noloot,c=1] ${BOT}`);
      await sleep(900);
      const seg = rows(from);
      const from2 = mark();
      srv.send(`testfor @e[type=item,r=6]`);
      await sleep(350);
      ev.probes.noLoot = { gate: seg.filter((l) => RE.gate.test(l)), family: seg.filter((l) => RE.cow.test(l)),
        itemTestfor: rows(from2).join(' | ').slice(0, 120) };
      log('p4 noLoot', JSON.stringify(ev.probes.noLoot).slice(0, 400));
      srv.send('gamerule doMobLoot true');
      srv.send('kill @e[type=cow]');
      await sleep(300);
    }

    /* 蜘蛛（kept = 丝栈 / familyRemoved = 眼栈） */
    {
      const from = mark();
      srv.send(`summon minecraft:spider ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["p_sp"]}`);
      await sleep(450);
      srv.send(`etest attack @e[tag=p_sp,c=1] ${BOT}`);
      await sleep(900);
      const seg = rows(from);
      ev.probes.spider = { gate: seg.filter((l) => RE.gate.test(l)), family: seg.filter((l) => RE.spider.test(l)) };
      log('p5 spider', JSON.stringify(ev.probes.spider).slice(0, 400));
      srv.send('kill @e[type=item]');
    }

    /* 剪毛羊 */
    {
      const from = mark();
      srv.send(`summon minecraft:sheep ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Sheared:1b,Tags:["p_sheep"]}`);
      await sleep(450);
      srv.send(`etest attack @e[tag=p_sheep,c=1] ${BOT}`);
      await sleep(900);
      const seg = rows(from);
      ev.probes.shearedSheep = { gate: seg.filter((l) => RE.gate.test(l)), family: seg.filter((l) => RE.sheep.test(l)) };
      log('p6 shearedSheep', JSON.stringify(ev.probes.shearedSheep).slice(0, 400));
      srv.send('kill @e[type=item]');
    }

    /* maxLevel=3 上限位：4 级应被拒 */
    {
      srv.send(`clear ${BOT}`);
      stage('{Unbreakable:1b}');
      await sleep(400);
      const from = mark();
      srv.send(`etest enchant mainhand 3 butchering ${BOT}`);
      await sleep(400);
      srv.send(`etest enchant mainhand 4 butchering ${BOT}`);
      await sleep(400);
      const seg = rows(from);
      ev.probes.enchantRange = seg.filter((l) => /Enchanted|etest|Invalid|usage|error/i.test(l)).slice(0, 6);
      log('p7 enchantRange', JSON.stringify(ev.probes.enchantRange).slice(0, 400));
    }

    /* 载体门五探针（W-B1 预演） */
    {
      ev.probes.carrier = {};
      for (const item of ['etim:knife_flint', 'etim:dagger_copper', 'etim:sword_copper', 'etim:pickaxe_copper', 'etim:hoe_copper']) {
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
        await sleep(400);
        const from = mark();
        srv.send(`etest enchantprobe mainhand pool ${BOT}`);
        await sleep(900);
        const seg = rows(from);
        const row = seg.find((l) => /pool reg=.+butchering/.test(l)) || '';
        ev.probes.carrier[item] = row.slice(0, 160);
        log('p8 carrier', item + ' :: ' + row.slice(0, 120));
      }
    }

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    /* cfg 首启后读取（3 键应已落盘） */
    const cfgAfter = fs.readFileSync(CFG);
    const keysAfter = cfgKeys(CFG);
    const newKeys = Object.keys(keysAfter).filter((k) => !(k in keysBefore));
    const changed = Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]);
    ev.cfgFirstBoot = {
      bytes: cfgAfter.length, sha: sha256(cfgAfter), keys: Object.keys(keysAfter).length,
      newKeys, changed, butchering: {
        difficulty: keysAfter.butcheringDifficulty, maxLevel: keysAfter.butcheringMaxLevel, debugLog: keysAfter.butcheringDebugLog,
      },
    };
    if (keysAfter.butcheringDebugLog === 'true') setCfg(CFG, 'butcheringDebugLog', 'false');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
