/**
 * kill-all-via-bot.js — 假玩家 op 通道全量 kill（会话七 · testharness/player）
 *
 * 用途：清偿 test 世界持久物群以达成 under-cap 前置（cap-block type=CREATURE < 11）。
 * 走 bot chat 面，不经 RCON（RCON kill 有 java.util.ConcurrentModificationException 前科）。
 * 选择器：@e[type=!player]（W2h 采样面：任务书九型 + 补测余项除 bat=3 全 0，
 * 而 cap-block CREATURE count 恒为 29 —— 种属未圈定，故按全量面清偿）。
 *
 * 用法：node kill-all-via-bot.js [host] [port] [username] [--selector "@e[type=!player]"]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';
let selector = '@e[type=!player]';
for (let i = 5; i < process.argv.length; i++) {
  if (process.argv[i] === '--selector') selector = process.argv[i + 1];
}

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => setTimeout(r, 1500));
  bot.chat(`/gamemode creative ${username}`);
  await new Promise((r) => setTimeout(r, 1200));
  log('killall', `sending /kill ${selector} via bot chat`);
  bot.chat(`/kill ${selector}`);
  // 回执观察窗（服务器 chat 回文量可能很大，仅计条数不打印全量）
  let replies = 0;
  const kinds = new Map();
  bot.on('message', (m) => {
    replies++;
    const t = m.toString();
    const mm = t.match(/^Killed ([A-Za-z ]+)$/);
    if (mm) kinds.set(mm[1], (kinds.get(mm[1]) || 0) + 1);
  });
  await new Promise((r) => setTimeout(r, 8000));
  log('killall', `chat replies=${replies}; Killed-kind tally: ${JSON.stringify([...kinds.entries()])}`);
  bot.quit();
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('killall', 'FATAL:', e.message); process.exit(1); });
