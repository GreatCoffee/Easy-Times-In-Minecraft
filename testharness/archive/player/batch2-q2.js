#!/usr/bin/env node
/**
 * batch2-q2.js — Q-6 follow-up: (a) inventory/NBT dump without an open window
 * (mineflayer's bot.inventory is stale while a container window is open), and
 * (b) the melee level-modifier line with a NoAI zombie overlapping the bot
 * (the bare-hand reach is 1.25 and the first attempt sat 1.82 away -> denied).
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = 'ETIM_Harn04';
const STAND = { x: -39.5, y: 79, z: 242.5 };

let msgs = [];
async function cmd(bot, c, wait = 700) {
  console.log('[cmd]', c);
  bot.chat(c.startsWith('/') ? c : '/' + c);
  await sleep(wait);
}
async function state(bot, tag) {
  msgs = [];
  bot.chat('/state');
  await sleep(1500);
  console.log('[state:' + tag + ']', msgs.find((s) => s.includes('total=')) || '(none)');
}
function dump(bot, tag) {
  const list = bot.inventory.items();
  console.log('[inv-dump:' + tag + '] n=' + list.length);
  for (const i of list) console.log('   slot=' + i.slot + ' id=' + i.type + ' name=' + i.name + ' x' + i.count + ' nbt=' + (i.nbt ? JSON.stringify(i.nbt) : 'none'));
}

async function attack(bot, tag) {
  const pos = bot.entity.position;
  await cmd(bot, '/summon Zombie ' + pos.x.toFixed(2) + ' ' + pos.y.toFixed(2) + ' ' + pos.z.toFixed(2) + ' {CustomName:"' + tag + '",NoAI:1b}', 1400);
  let z = bot.nearestEntity((e) => e && e.name === 'zombie');
  if (!z) { await sleep(1200); z = bot.nearestEntity((e) => e && e.name === 'zombie'); }
  if (!z) { console.log('[Q6:' + tag + '] NO ZOMBIE'); return; }
  console.log('[Q6:' + tag + '] zombie id=' + z.id + ' pos=' + z.position + ' bot=' + pos);
  await bot.lookAt(z.position.offset(0, 1.2, 0), true);
  await sleep(700);
  await bot.attack(z);
  await sleep(1000);
  console.log('[Q6:' + tag + '] attack sent');
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: BOT });
  bot.on('message', (m) => { const s = m.toString(); msgs.push(s); console.log('[chat]', s); });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1500);

  dump(bot, 'login');

  await cmd(bot, '/gamemode survival', 600);
  await cmd(bot, '/tp ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 1200);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 9999 4 true', 400);
  await cmd(bot, '/etest food 6 6', 500);

  await cmd(bot, '/etest debt 10', 800);
  await attack(bot, 'Q6A');
  await state(bot, 'Q6-debt');

  await cmd(bot, '/xp 10L', 800);
  await attack(bot, 'Q6B');
  await state(bot, 'Q6-pos');

  dump(bot, 'end');
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('batch2-q2', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
