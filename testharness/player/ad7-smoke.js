/**
 * ad7-smoke.js — 批 E / AD-7 落码后最小冒烟（主会话）
 *
 * 目的：落码后只验「注册 + 载体门 + 曲线 + 载体解析」四条通道的日志行是否存在，
 * 不做 W1~W12 完整判定（那是验证窗）。全部判定读服务端 latest.log 的
 * [EtimInit]/[EnchantLog] 行，本脚本只负责发命令。
 *
 * 用法：node ad7-smoke.js [host] [port] [username]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const HOST = process.argv[2] || 'localhost';
const PORT = Number(process.argv[3] || 25565);
const USER = process.argv[4] || 'ETIM_Harn01';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host: HOST, port: PORT, username: USER });
  await sleep(1500);
  const cmds = [
    '/gamemode 1',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:pickaxe_copper 1`,
    '/etest enchant mainhand 3 piercing',
    '/etest enchantprobe mainhand melee',
    '/etest enchantprobe mainhand arrow',
    '/etest enchantprobe mainhand thrown',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:war_hammer_copper 1`,
    '/etest enchantprobe mainhand melee',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:axe_copper 1`,
    '/etest enchantprobe mainhand melee',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:shovel_copper 1`,
    '/etest enchantprobe mainhand melee',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:sword_copper 1`,
    '/etest enchantprobe mainhand melee',
    `/replaceitem entity ${USER} slot.weapon.mainhand etim:battle_axe_copper 1`,
    '/etest enchantprobe mainhand melee',
    `/replaceitem entity ${USER} slot.weapon.mainhand minecraft:iron_pickaxe 1`,
    '/etest enchantprobe mainhand melee',
    '/say [HarnMark] AD7 smoke end',
  ];
  for (const c of cmds) {
    log('cmd', c);
    bot.chat(c);
    await sleep(700);
  }
  await sleep(1000);
  bot.quit();
  await sleep(500);
  process.exit(0);
}

main().catch((e) => { console.error('SMOKE ERR:', e.message); process.exit(1); });
