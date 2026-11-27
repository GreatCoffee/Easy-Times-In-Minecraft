#!/usr/bin/env node
/** batch2-q3.js — Q-6 positive control: fresh zombie, attack the NEW entity id. */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = 'ETIM_Harn04';

async function cmd(bot, c, w = 700) { console.log('[cmd]', c); bot.chat(c.startsWith('/') ? c : '/' + c); await sleep(w); }

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: BOT });
  bot.on('message', (m) => console.log('[chat]', m.toString()));
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1200);
  await cmd(bot, '/gamemode survival', 500);
  await cmd(bot, '/tp -39.5 79 242.5', 1000);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 9999 4 true', 400);
  await cmd(bot, '/xp 10L', 800);

  const before = new Set(Object.keys(bot.entities).map(Number));
  const pos = bot.entity.position;
  console.log('[bot] pos=' + pos + ' entities=' + before.size);
  await cmd(bot, '/summon Zombie ' + pos.x.toFixed(2) + ' ' + (pos.y + 0.2).toFixed(2) + ' ' + pos.z.toFixed(2) + ' {CustomName:"Q6POS",NoAI:1b}', 1600);

  let target = null;
  for (let i = 0; i < 10; i++) {
    for (const e of Object.values(bot.entities)) {
      if (e && e.name === 'zombie' && !before.has(e.id)) { target = e; break; }
    }
    if (target) break;
    await sleep(300);
  }
  console.log('[target] ' + (target ? ('id=' + target.id + ' pos=' + target.position) : 'NONE'));
  if (target) {
    await bot.lookAt(target.position.offset(0, 1.2, 0), true);
    await sleep(600);
    await bot.attack(target);
    await sleep(1200);
    console.log('[attack] sent to ' + target.id);
  }
  await sleep(1000);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1000);
}
main().catch((e) => { log('q3', 'FATAL', e && e.stack ? e.stack : e); process.exit(1); });
