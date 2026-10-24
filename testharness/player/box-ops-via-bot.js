/**
 * box-ops-via-bot.js — 假玩家 op 通道的箱域操作（会话七 · testharness/player）
 *
 * W3a2/b2/c2 工步件：密度门判据 6 贴边制造 + eval/skip 行取证。
 *
 * 通道纪律：RCON kill 在 test27 触发 java.util.ConcurrentModificationException
 * （server 主线程，18:59:46 在案）——本件一律走假玩家 op 通道的 chat 命令面，
 * 不经 RCON。与 kill-via-bot.js 的区别：类型不限四动物，且支持半径与 summon。
 *
 * 用法：
 *   node box-ops-via-bot.js <host> <port> <user> kill-box <types-csv> <radius>
 *   node box-ops-via-bot.js <host> <port> <user> summon <type> <x> <y> <z> <count>
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';
const op = process.argv[5];

async function main() {
  const bot = await createHarnBot({ host, port, username });
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  await new Promise((r) => setTimeout(r, 1200));
  bot.chat(`/gamemode creative ${username}`);

  if (op === 'kill-box') {
    const types = (process.argv[6] || 'zombie').split(',');
    const radius = process.argv[7] || '32';
    for (const t of types) {
      bot.chat(`/kill @e[type=${t},r=${radius}]`);
      log('box', `sent /kill @e[type=${t},r=${radius}] via bot chat`);
      await new Promise((r) => setTimeout(r, 1400));
    }
  } else if (op === 'test') {
    // RCON testfor's r= is anchored to a position-less sender (origin), so
    // the reliable radius face is the bot chat channel: the bot IS an entity
    // at a real position, and /testfor replies "Found N entities" to chat.
    const cmd = process.argv[6] || 'testfor @e[r=32]';
    bot.chat(`/${cmd}`);
    log('box', `sent /${cmd} via bot chat`);
  } else if (op === 'summon') {
    const type = process.argv[6];
    const x = process.argv[7];
    const y = process.argv[8];
    const z = process.argv[9];
    const count = parseInt(process.argv[10] || '1', 10);
    const nbt = process.argv[11] || '';
    const holdSec = parseInt(process.argv[12] || '0', 10);
    for (let i = 0; i < count; ++i) {
      bot.chat(`/summon ${type} ${x} ${y} ${z}${nbt ? ' ' + nbt : ''}`);
      await new Promise((r) => setTimeout(r, 500));
    }
    log('box', `sent ${count}× /summon ${type} ${x} ${y} ${z}${nbt ? ' ' + nbt : ''} via bot chat`);
    if (holdSec > 0) {
      log('box', `holding connection ${holdSec}s for density-gate sampling`);
      await new Promise((r) => setTimeout(r, holdSec * 1000));
    }
  } else {
    log('box', `FATAL: unknown op "${op}"`);
    process.exit(2);
  }

  await new Promise((r) => setTimeout(r, 6000));
  const interesting = replies.filter((r) =>
    /summon|Unable|Killed|No entity|Unknown|Could not|Found|error/i.test(r));
  log('box', `replies seen: ${replies.length}  interesting: ${interesting.length}`);
  for (const r of interesting.slice(0, 16)) log('box', 'reply:', r);
  bot.quit();
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('box', 'FATAL:', e.message); process.exit(1); });
