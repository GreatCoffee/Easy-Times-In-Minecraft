/**
 * combo-a8b.js — run27 A8B 修正轮（A8 免死 + A9 豹猫/狼驯服 + A5 动物无墙 kill）
 * 修正自 combo-a8 首轮教训：golem 用 villager_golem/iron_golem 双试；召唤摊开在
 * bot 已验证可站的平地（-63..-66, y66, 240-243）；far tp 放入命令列；标记 A8B。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca';
const FAR = ['1100', '70', '0'];

const P1_CMDS = [
  '/gamerule doMobSpawning true',
  '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
  '/summon Villager -65 66.5 240',          // ★ A8B 修复验证：豁免帽后的 villager 应回 in-view hold 行，零 kill 行
  '/testfor @e[type=Villager]',
  '/testfor @e[type=villager_golem]',
  '/tp ETIM_Harn01 ' + FAR.join(' '),
];

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
  const mark = (m) => { log('a8b', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  for (const c of P1_CMDS) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('a8b', 'p1 cmds sent');
  mark(`[HarnMark] A8B begin ts=${Date.now()} tp=${FAR.join(',')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);

  const heart = setInterval(() => {
    if (bot.entity) log('a8b', `heartbeat pos=${(bot.entity.position.x).toFixed(1)} ${(bot.entity.position.y || 0).toFixed(1)} ${(bot.entity.position.z || 0).toFixed(1)} health=${bot.health} food=${bot.food}`);
  }, 30000);
  await new Promise((r) => setTimeout(r, 420 * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A8B end ts=${Date.now()} stayed=420s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  // ---- phase 3 rejoin & testfor survival set
  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  bot2.chat('/testfor @e[type=Villager]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=villager_golem]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Wolf]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Ocelot]'); await new Promise((r) => setTimeout(r, 700));
  await awaitReceipt(bot2, [/Found|匹配/, /found nothing|没有匹配/], 6000);
  log('a8b', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a8b', 'FATAL:', e.message); process.exit(1); });
