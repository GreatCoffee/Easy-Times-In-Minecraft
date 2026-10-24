#!/usr/bin/env node
/**
 * m-dig.js — M 批 F-15-F1 重建验证驱动（会话七 · 2026-10-21）
 *
 * 摆场（v2 几何）：1 宽 × 2 高封闭石廊（x=-43..-37 / y=100..101 / z=z_i，
 * 墙 z±1、顶 y=102、底 y=99）。
 *   - 半砖向量：目标砖在 y=101（头层），下方 y=100 放 stone 阻挡块（阻断寻路；
 *     僵尸眼→bot 眼射线在砖顶上方 0.18 通过 → 非狂化 canSee 成立；中心射线
 *     (眼→目标中心) 命中砖体）。
 *   - 整砖向量：目标块在 y=100（脚层）；腿射线命中；眼射线跨过块顶。
 * 僵尸在 x=-40.8（距块心 1.3 < 3.25 reach），bot 在 x=-38.5；攻击任务因
 * noPath + 超出近战 reach 而不启动 → dig 任务可运行。
 *
 * 用法：
 *   node m-dig.js --rounds "V1:12,V2:50" [--build 1] [--axe OBS] [--user ETIM_Harn04]
 *   时长单位 = 秒。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
}
const roundsSpec = arg('rounds', '');
const doBuild = arg('build', '0') === '1';
const axeKeys = (arg('axe', '') || '').split(',').filter(Boolean);
const user = arg('user', 'ETIM_Harn04');

const VECTORS = {
  V1:  { block: 'minecraft:stone_slab',        meta: 0, z: 242, y: 101, slab: true,  name: 'stone_slab STONE' },
  V2:  { block: 'minecraft:stone_slab',        meta: 1, z: 245, y: 101, slab: true,  name: 'stone_slab SAND' },
  V3:  { block: 'minecraft:stone_slab',        meta: 2, z: 248, y: 101, slab: true,  name: 'stone_slab WOOD' },
  V4:  { block: 'minecraft:double_stone_slab', meta: 0, z: 251, y: 100, slab: false, name: 'double_stone_slab STONE' },
  V5:  { block: 'minecraft:double_stone_slab', meta: 1, z: 254, y: 100, slab: false, name: 'double_stone_slab SAND' },
  V6:  { block: 'minecraft:wooden_slab',       meta: 0, z: 257, y: 101, slab: true,  name: 'wooden_slab' },
  V7:  { block: 'minecraft:double_wooden_slab',meta: 0, z: 260, y: 100, slab: false, name: 'double_wooden_slab' },
  V8:  { block: 'minecraft:obsidian',          meta: 0, z: 263, y: 100, slab: false, name: 'obsidian' },
  V9:  { block: 'minecraft:stone',             meta: 0, z: 266, y: 100, slab: false, name: 'stone' },
  SNOW:{ block: 'minecraft:snow',              meta: 0, z: 269, y: 100, slab: false, name: 'snow block (E-06)' },
  LOG: { block: 'minecraft:log',               meta: 0, z: 272, y: 100, slab: false, name: 'log (E-06)' },
  OBS: { block: 'minecraft:stone_slab',        meta: 1, z: 275, y: 101, slab: true,  name: 'sandstone slab + axe (observation)' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: user });
  let lastTime = null;
  bot.on('message', (msg) => {
    const s = msg.toString();
    const m = s.match(/time is (\d+)/i);
    if (m) lastTime = m[1];
  });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(2500);

  const cmd = async (c, w = 450) => {
    bot.chat(c.startsWith('/') ? c : '/' + c);
    await sleep(w);
  };

  await cmd(`/gamemode creative ${user}`);
  await cmd('/gamerule doMobSpawning false');
  await cmd('/gamerule doDaylightCycle false');
  await cmd('/gamerule doWeatherCycle false');
  await cmd('/difficulty normal');
  await cmd('/kill @e[type=!Player]', 1200);

  if (doBuild) {
    log('build', 'platform corridors');
    for (const key of Object.keys(VECTORS)) {
      const z = VECTORS[key].z;
      await cmd(`/fill -44 99 ${z - 1} -36 99 ${z + 1} minecraft:stone`, 250);
      await cmd(`/fill -44 102 ${z - 1} -36 102 ${z + 1} minecraft:stone`, 250);
      await cmd(`/fill -44 100 ${z - 1} -36 101 ${z - 1} minecraft:stone`, 250);
      await cmd(`/fill -44 100 ${z + 1} -36 101 ${z + 1} minecraft:stone`, 250);
      await cmd(`/fill -44 100 ${z - 1} -44 101 ${z + 1} minecraft:stone`, 250);
      await cmd(`/fill -36 100 ${z - 1} -36 101 ${z + 1} minecraft:stone`, 250);
      await cmd(`/fill -43 100 ${z} -37 101 ${z} minecraft:air`, 250);
    }
    log('build', 'done');
  }

  await cmd(`/tp ${user} -38.5 100 242.5`, 1500);
  await cmd(`/gamemode survival ${user}`);
  await cmd(`/effect ${user} resistance 255 4 true`);
  await cmd(`/effect ${user} regeneration 255 2 true`);
  await cmd('/kill @e[type=!Player]', 1200);

  const rounds = roundsSpec.split(',').filter(Boolean).map((s) => {
    const [key, dur] = s.split(':');
    return { key, sec: parseInt(dur, 10) };
  });

  for (const r of rounds) {
    const v = VECTORS[r.key];
    if (!v) throw new Error('unknown vector ' + r.key);
    const axe = axeKeys.includes(r.key);
    const held = axe ? '{id:"minecraft:iron_axe",Count:1b}' : '{}';
    log('round', `${r.key} ${v.name} z=${v.z} y=${v.y} axe=${axe} dur=${r.sec}s`);

    await cmd('/kill @e[type=!Player]', 1200);
    if (v.slab) {
      await cmd(`/setblock -40 100 ${v.z} minecraft:stone 0 replace`, 300);
      await cmd(`/setblock -40 101 ${v.z} ${v.block} ${v.meta} replace`, 300);
    } else {
      await cmd(`/setblock -40 100 ${v.z} ${v.block} ${v.meta} replace`, 300);
    }
    await cmd(`/tp ${user} -38.5 100 ${v.z + 0.5}`, 900);
    await cmd(`/effect ${user} resistance 255 4 true`, 300);
    await cmd('/time query gametime', 350);
    const startTick = lastTime;
    log('round', `${r.key} START tick=${startTick} ${new Date().toISOString()}`);

    await cmd(`/summon zombie -40.8 100 ${v.z + 0.5} {HandItems:[${held},{}],ArmorItems:[{},{},{},{}],CanPickUpLoot:0b,CustomName:"${r.key}",PersistenceRequired:0b}`, 500);
    await sleep(r.sec * 1000);

    await cmd('/time query gametime', 350);
    const endTick = lastTime;
    log('round', `${r.key} END tick=${endTick} ${new Date().toISOString()}`);
    await cmd(`/testforblock -40 ${v.y} ${v.z} ${v.block} ${v.meta}`, 450);
    await cmd('/kill @e[type=!Player]', 1200);
  }

  log('done', `rounds=${rounds.map((r) => r.key).join(',')}`);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('m-dig', 'FATAL:', e.message); process.exit(1); });
