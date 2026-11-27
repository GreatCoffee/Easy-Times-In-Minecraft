/**
 * combo-a4c2.js — run27 A4 动物三重墙 + C2 牛吃草 合并编排（主会话临时 driver）
 *
 * 与 a2-despawn.js（会话七 · 回执凭据版）互不影响；本文件只做主会话合并窗口：
 *   1) /gamerule doMobSpawning true（保证生物在场）
 *   2) /effect ETIM_Harn01 resistance 254（bot 免疫，含窒息）
 *   3) 围栏圈（hollow）+ 草方块地面 + /summon 牛×2 羊×2 猪×1
 *   4) /tp 离圈 ~55 格（op 判据=服务端回执，同会话七修订口径）
 *   5) mark begin/end 走 /say（服务端 latest.log 可 grep）+ 15s heartbeat
 *
 * 判读（主会话）：hold=animal-player-or-fence 行、livestock ate grass 行、
 * 圈内生物零 kill 行。标记：[HarnMark] A4C2 begin/end。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const CMDS = [
  '/gamerule doMobSpawning true',
  '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
  '/fill -71 67 252 -64 69 258 minecraft:oak_fence 0 hollow',
  '/fill -70 66 253 -65 66 257 minecraft:grass 0 replace',
  '/summon cow -67.5 68 255.5',
  '/summon cow -66.5 68 254.5',
  '/summon sheep -68.5 68 256.5',
  '/summon sheep -66 68 253',
  '/summon pig -68 68 254',
];
const TP = ['-20', '75', '200']; // 离圈心 (-67.5,67,255.5) ≈55 格（≥16 达标，1024 半径内）
const WAIT = 300;

function awaitTpReceipt(bot) {
  return new Promise((resolve) => {
    const done = (r) => { clearTimeout(t); bot.off('message', h); resolve(r); };
    const t = setTimeout(() => done({ kind: 'timeout' }), 10000);
    const h = (msg) => {
      const translate = (msg && msg.translate) || (msg && msg.json && msg.json.translate) || '';
      const text = String(msg || '');
      if (/^commands\.tp\.success/.test(translate)) return done({ kind: 'ok', text });
      if (/^Teleported /i.test(text)) return done({ kind: 'ok', text });
      if (/permission to use|Unknown command/i.test(text)) return done({ kind: 'denied', text });
    };
    bot.on('message', h);
  });
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark = (line) => { log('a4c2', line); bot.chat(`/say ${line}`); };

  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  let ops = 0, fails = 0;
  for (const c of CMDS) {
    bot.chat(c);
    await new Promise((r) => setTimeout(r, 900));
    if (/^\/(tp|fill|summon|effect|gamerule)/.test(c)) log('a4c2', `cmd> ${c}`);
  }
  log('a4c2', 'cmds sent');

  bot.chat(`/tp ETIM_Harn01 ${TP.join(' ')}`);
  const receipt = await awaitTpReceipt(bot);
  log('a4c2', receipt.kind === 'ok' ? `tp OK（回执：${receipt.text}）` : `tp ${receipt.kind}（回执：${receipt.text || '-'}）`);

  mark(`[HarnMark] A4C2 begin ts=${Date.now()} tp=${TP.join(',')}`);
  const heart = setInterval(() => {
    if (bot.entity) log('a4c2', `heartbeat pos=${(bot.entity.position.x).toFixed(1)} ${(bot.entity.position.y || 0).toFixed(1)} ${(bot.entity.position.z || 0).toFixed(1)} health=${bot.health} food=${bot.food}`);
  }, 15000);
  await new Promise((r) => setTimeout(r, WAIT * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A4C2 end ts=${Date.now()} stayed=${WAIT}s`);
  bot.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a4c2', 'FATAL:', e.message); process.exit(1); });
