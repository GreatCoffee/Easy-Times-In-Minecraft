/**
 * combo-a9c.js — run27 A9C 定谳窗（A5 散养 kill + A9 野生/驯服 age 门 + water-seed 追踪
 *   + 结构清场与 fence 消歧）——主会话 driver
 *
 * 措置：
 *   1) /fill 空气清掉历史 fence 圈与池石圈（15-blocks 谜底=清场回执行数）
 *   2) A5 散养动物（cow/sheep/wolf 野生）放清场原点——动物墙三重齐入（1024 玩家
 *      远壁 + 无 fence + counter>2400）→ LOS 门（bot 1100 远，无视线）→ kill 行
 *   3) A9：野生豹猫 ×1（age 跨 2400 后链 kill）+ 驯服豹猫 ×1（tame-exempt 零行）
 *   4) 池水 + /summon 鱿鱼 + doMobSpawning 开——water-seed 追踪行看自然落池鱿鱼
 *
 * 标记：[HarnMark] A9C begin/end
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca';
const FAR = ['1100', '70', '0'];
const WAIT = 420;

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
  const mark = (m) => { log('a9c', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -65 66 241');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('a9c', `base=(${bx},${by},${bz})`);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    '/fill -72 65 250 -62 71 260 minecraft:air 0',                     // 清历史 fence 圈+池石圈
    '/testforblock -71 67 252 minecraft:oak_fence',                    // 消歧：应为 not found
    '/testforblock -63 67 251 minecraft:oak_fence',
    `/summon Ocelot ${bx + 1.5} ${by + 1.2} ${bz + 1}`,                // A9 野生
    `/summon Ocelot ${bx - 1.5} ${by + 1.2} ${bz + 1} {OwnerUUID:"${OWNER}"}`, // A9 驯服
    `/fill ${bx + 4} ${by + 1} ${bz + 4} ${bx + 8} ${by + 2} ${bz + 8} minecraft:stone 0 hollow`,
    `/fill ${bx + 5} ${by + 1} ${bz + 5} ${bx + 7} ${by + 2} ${bz + 7} minecraft:water`,
    `/summon Squid ${bx + 6} ${by + 1.5} ${bz + 6}`,                   // A1b 复验（/summon 面）
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }

  // A5 散养三候选（远离任何结构）
  const a5cmds = [
    '/tp ETIM_Harn01 -60 68 232',
    '/summon Cow -60.5 69.5 231.5',
    '/summon Sheep -59.5 69.5 233.5',
    '/summon Wolf -58.5 69.5 232.5',
  ];
  for (const c of a5cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  await awaitReceipt(bot, [/^Teleported /i], 8000);
  log('a9c', 'phase1 cmds sent');

  mark(`[HarnMark] A9C begin ts=${Date.now()} tp=${FAR.join(',')}`);
  bot.chat(`/tp ETIM_Harn01 ${FAR.join(' ')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);

  await new Promise((r) => setTimeout(r, WAIT * 1000));
  mark(`[HarnMark] A9C end ts=${Date.now()} stayed=${WAIT}s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  for (const type of ['Ocelot', 'Cow', 'Sheep', 'Wolf', 'Squid']) {
    bot2.chat(`/testfor @e[type=${type}]`);
    await new Promise((r) => setTimeout(r, 700));
  }
  await awaitReceipt(bot2, [/Found|found nothing/], 6000);
  log('a9c', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a9c', 'FATAL:', e.message); process.exit(1); });
