#!/usr/bin/env node
// uw-inv.js — 背包判据：/clear <player> <item> 0 0 的计数回执（不改库存）
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const name = process.env.UW_BOT || 'ETIM_Harn07';
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: name });
  await sleep(3000);
  const cmds = [
    `clear ${name} etim:arrow_ancient_metal 0 0`,
    `clear ${name} minecraft:arrow 0 0`,
    `clear ${name} minecraft:bone 0 0`,
  ];
  for (const c of cmds) { bot.chat('/' + c); await sleep(900); }
  await sleep(1200);
  // 全库存快照（mineflayer 视角）
  const items = bot.inventory.items().map((i) => `${i.name}#id${i.type}x${i.count}`);
  console.log('INV=', items.join(', ') || '(empty)');
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
