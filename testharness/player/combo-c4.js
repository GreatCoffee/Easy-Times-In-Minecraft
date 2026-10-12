/**
 * combo-c4.js — run27 C4 雨水回退 + water-seed 追踪（natural/summon 双面）——主会话 driver
 *
 * 措置：
 *   1) /weather rain 900（C4 前提）
 *   2) 池水（stone hollow + water）+ /summon 鱿鱼——watch summon 面 seed 追踪行
 *   3) 池边放 cow ×2 / sheep ×1（雨水回退判定材料——water 涨/稳 vs 无雨 −0.005/scan）
 *   4) doMobSpawning true——natural 落池鱿鱼若自然生则 seed 追踪行 restored= 面暴露
 * 标记：[HarnMark] C4A1B begin/end
 * 判读（主会话）：livestock water= 行的落值走向（雨中收窄）；water-seed restored= 行。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

function awaitReceipt(bot, patterns, ms) {
  return new Promise((resolve) => {
    const done = (r) => { clearTimeout(t); bot.off('message', h); resolve(r); };
    const texts = [];
    const t = setTimeout(() => done(texts), ms);
    const h = (msg) => { const x = String(msg || ''); if (patterns.some((re) => re.test(x))) texts.push(x); };
    bot.on('message', h);
  });
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark = (m) => { log('c4', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -65 66 241');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    '/fill -72 65 248 -62 71 258 minecraft:air 0',                     // 复清上次池区
    '/weather rain 900',
    `/fill ${bx + 4} ${by + 1} ${bz + 4} ${bx + 8} ${by + 2} ${bz + 8} minecraft:stone 0 hollow`,
    `/fill ${bx + 5} ${by + 1} ${bz + 5} ${bx + 7} ${by + 2} ${bz + 7} minecraft:water`,
    `/summon Squid ${bx + 6} ${by + 1.5} ${bz + 6}`,
    `/summon Cow ${bx + 10.5} ${by + 1.2} ${bz + 5}`,
    `/summon Cow ${bx - 10.5} ${by + 1.2} ${bz + 5}`,
    `/summon Sheep ${bx + 0.5} ${by + 1.2} ${bz - 6}`,
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('c4', 'phase1 cmds sent');

  mark(`[HarnMark] C4A1B begin ts=${Date.now()} tp=none`);
  bot.chat(`/tp ETIM_Harn01 1100 70 0`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);

  await new Promise((r) => setTimeout(r, 360 * 1000));
  mark(`[HarnMark] C4A1B end ts=${Date.now()} stayed=360s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  for (const type of ['Cow', 'Sheep', 'Squid']) {
    bot2.chat(`/testfor @e[type=${type}]`);
    await new Promise((r) => setTimeout(r, 700));
  }
  await awaitReceipt(bot2, [/Found|found nothing/], 5000);
  log('c4', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('c4', 'FATAL:', e.message); process.exit(1); });
