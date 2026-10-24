/**
 * kill-via-bot.js — 假玩家 op 通道执行 kill（会话七 · testharness/player）
 *
 * W2g 清偿面：RCON kill 在 test27 触发 java.util.ConcurrentModificationException
 * （server 主线程，18:59:46 在案）——本件改走假玩家 op 通道的 chat 命令面，
 * 不经 RCON。四类清偿后等待回稳即退场（余量核验由外部 testfor/read 承担）。
 *
 * 用法：node kill-via-bot.js [host] [port] [username]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => setTimeout(r, 1500));
  bot.chat(`/gamemode creative ${username}`);
  const types = ['cow', 'pig', 'sheep', 'chicken'];
  for (const t of types) {
    bot.chat(`/kill @e[type=${t}]`);
    log('kill', `sent /kill @e[type=${t}] via bot chat`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  // 回执观察窗
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  await new Promise((r) => setTimeout(r, 6000));
  log('kill', `replies seen: ${replies.length}`);
  bot.quit();
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('kill', 'FATAL:', e.message); process.exit(1); });
