#!/usr/bin/env node
/**
 * re-death.js — 面10 四场景驱动（[DeathLog] 为判据通道）。
 *
 * 场景：
 *   A sub-1 死：/etest level 0 → /kill → 期望 settle = 0−20 = −20（floor −800）
 *   B ≥1 级死：/etest level 5 → /kill → 期望 settle = stale（沿用上次 respawnTotal）
 *   C keepInventory：gamerule true → /kill → 期望 xp 原样（settle 不跑）
 *   D 球捡回：deathXpOrbs=true → 死点 orb = total/3 → tp 回死点捡回
 *
 * 每个场景在 [DeathLog] 基线之后执行；/state 回执打到 stdout。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(2000);

  bot.on('death', () => { log('death', 'DIED'); setTimeout(() => { try { bot._client.write('client_command', { actionId: 0 }); } catch (e) {} }, 1200); });

  const replies = [];
  bot.on('message', (m) => replies.push(String(m)));
  const cmd = async (c, wait = 900) => { bot.chat(c.startsWith('/') ? c : '/' + c); await sleep(wait); };

  async function state(tag) {
    replies.length = 0;
    await cmd('/state', 1600);
    const out = replies.filter((x) => /total=|饱和|营养|饥饿|死亡|deathXp|经验/.test(x));
    console.log(`STATE[${tag}] ` + JSON.stringify(out));
  }

  async function die(tag, pre, post) {
    await pre();
    await state(tag + '-before');
    const pos = bot.entity.position.clone();
    await cmd(`/kill ${username}`, 1200);
    await sleep(6000);
    await state(tag + '-after');
    if (post) await post(pos);
    return pos;
  }

  // A sub-1
  await die('A', async () => { await cmd('/gamerule keepInventory false'); await cmd('/etest level 0'); });

  // B ≥1（总量 > 20）
  await die('B', async () => { await cmd('/etest level 5'); });

  // C keepInventory
  await die('C', async () => { await cmd('/gamerule keepInventory true'); await cmd('/etest level 5'); },
    async () => { await cmd('/gamerule keepInventory false'); });

  // D orbs：高等级死 → orb=total/3 → tp 回死点捡回
  const deathPos = await die('D', async () => { await cmd('/etest level 10'); });
  await cmd(`/tp ${username} ${deathPos.x} ${deathPos.y} ${deathPos.z}`, 1500);
  await sleep(4000);
  await sleep(3000);
  await state('D-pickup');

  console.log('RESULT DEATH-SEQ done');
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
}

main().catch((e) => { log('re-death', 'FATAL:', e.message); process.exit(1); });
