#!/usr/bin/env node
/**
 * re-bot.js — R-E 批（面5 / 面10）判据窗驱动。
 *
 * Ops
 *   sh <cmd...>           作为 bot 发一条命令（命令输出打到 stdout 的 [chat] 行）
 *   dig <x> <y> <z> <maxMs> [sx sy sz]
 *                         先 tp 到站位，对目标方块发 block_dig start，每 50ms 补 arm_animation
 *                         并轮询 blockAt 直到 air；打印真·服务端破坏耗时
 *   idle <ms>             挂机
 *   tp <x> <y> <z>        /tp 自身
 *
 * RE_PRE 环境变量：登录后按 ';' 切分的预备命令（/clear、/give、/gamemode…）。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const Vec3 = require('vec3').Vec3;

const argv = process.argv.slice(2);
const host = argv[0] || 'localhost';
const port = parseInt(argv[1] || '25565', 10);
const username = argv[2] || 'ETIM_Harn04';
const op = argv[3];
const A = argv.slice(4);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1500);

  if (process.env.RE_PRE) {
    for (const c of process.env.RE_PRE.split(';').map((s) => s.trim()).filter(Boolean)) {
      bot.chat(c.startsWith('/') ? c : '/' + c);
      await sleep(600);
    }
    await sleep(800);
  }

  if (op === 'sh') {
    const cmd = A.join(' ');
    const replies = [];
    const h = (m) => replies.push(String(m));
    bot.on('message', h);
    bot.chat(cmd.startsWith('/') ? cmd : '/' + cmd);
    await sleep(2500);
    bot.off('message', h);
    console.log('RESULT SH cmd=' + cmd + ' replies=' + JSON.stringify(replies));
  } else if (op === 'tp') {
    bot.chat(`/tp ${username} ${A[0]} ${A[1]} ${A[2]}`);
    await sleep(2000);
    console.log('RESULT TP pos=' + JSON.stringify(bot.entity.position));
  } else if (op === 'idle') {
    await sleep(parseInt(A[0] || '5000', 10));
    console.log('RESULT IDLE pos=' + JSON.stringify(bot.entity.position));
  } else if (op === 'dig') {
    const x = parseInt(A[0], 10), y = parseInt(A[1], 10), z = parseInt(A[2], 10);
    const maxMs = parseInt(A[3] || '60000', 10);
    const pos = { x, y, z };
    if (A.length >= 7) {
      bot.chat(`/tp ${username} ${A[4]} ${A[5]} ${A[6]}`);
      await sleep(2200);
    }
    try { await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true); } catch (e) { /* ignore */ }
    try { bot.setQuickBarSlot(0); } catch (e) { /* ignore */ }
    await sleep(400);
    const before = bot.blockAt(new Vec3(x, y, z));
    console.log(`[dig] held=${bot.heldItem && bot.heldItem.name} target=(${x},${y},${z}) before=${before && before.name}`);
    const t0 = Date.now();
    bot._client.write('block_dig', { status: 0, location: pos, face: 1 });
    let broke = false;
    while (Date.now() - t0 < maxMs) {
      if (process.env.RE_REDIG === '1') {
        try { bot._client.write('block_dig', { status: 0, location: pos, face: 1 }); } catch (e) { /* ignore */ }
      }
      try { bot._client.write('arm_animation', { animation: 1 }); } catch (e) { /* ignore */ }
      await sleep(50);
      const b = bot.blockAt(new Vec3(x, y, z));
      if (!b || b.name === 'air') { broke = true; break; }
    }
    const ms = Date.now() - t0;
    try { bot._client.write('block_dig', { status: 2, location: pos, face: 1 }); } catch (e) { /* ignore */ }
    console.log(`RESULT DIG target=(${x},${y},${z}) held=${bot.heldItem && bot.heldItem.name} broke=${broke} ms=${ms} ticks~=${(ms / 50).toFixed(1)} before=${before && before.name}`);
  } else {
    console.error('unknown op');
  }
  try { bot.quit(); } catch (e) { /* ignore */ }
  setTimeout(() => process.exit(0), 800);
}

main().catch((e) => { log('re-bot', 'FATAL:', e.message); process.exit(1); });
