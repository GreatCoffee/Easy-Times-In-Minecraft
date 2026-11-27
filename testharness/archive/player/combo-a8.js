/**
 * combo-a8.js — run27 A8 局外物件免测 + A9 豹猫/狼驯服对比 + A5 动物无墙 kill（主会话）
 *
 * 两相驱动（单进程）：
 *   P1 join → effect resistance → tp 世界出生区 → 召唤
 *      VillagerGolem / Villager / Wolf / Wolf{OwnerUUID} / Ocelot / Ocelot{OwnerUUID}
 *      → testfor 基线 ×4（回执）→ mark begin → tp (1100, 70, 0)（>1024 格外）
 *      → wait 420s（动物墙走 fence 分支；野生豹猫/狼走链路 kill=A9/A5）→ mark end → quit
 *   P2 等 30s → P3 rejoin → testfor 幸存面（缓离动物仍应全在；野生消失）→ quit
 *
 * op 判据与服务端回执同会话七口径。判读（主会话）：
 *   A8 = 零 kill 行 for VillagerGolem/Villager/OwnerUUID Wolf/Ocelot；
 *   A9 = 野生 Ocelot kill 行（驯服豁免对照）；
 *   A5 = 无围栏动物 counter>2400 kill 行（1024 玩家=bot 在 1100 外）。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca'; // ETIM_Harn01 offline UUID

const P1_CMDS = [
  '/gamerule doMobSpawning true',
  '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
  '/tp ETIM_Harn01 -66 66 241',
  '/tp ETIM_Harn01 ' + FAR.join(' '),   // ★ 本轮漏发的 far tp 已补：bot 立即到 1100 格外
  '/testfor @e[type=VillagerGolem]',
  '/testfor @e[type=Villager]',
  '/testfor @e[type=Wolf]',
  '/testfor @e[type=Ocelot]',
];
const FAR = ['1100', '70', '0'];
const NAMES = ['EntityIronGolem', 'EntityVillager', 'EntityWolf', 'EntityOcelot'];

function awaitReceipt(bot, patterns, ms) {
  return new Promise((resolve) => {
    const done = (r) => { clearTimeout(t); bot.off('message', h); resolve(r); };
    const texts = [];
    const t = setTimeout(() => done(texts), ms);
    const h = (msg) => {
      const text = String(msg || '');
      if (patterns.some((re) => re.test(text))) texts.push(text);
    };
    bot.on('message', h);
  });
}

async function main() {
  // ------------------------------------------------ phase 1
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark = (m) => { log('a8', m); bot.chat('/say ' + m); };
  const sp = (bot.spawnPoint && bot.spawnPoint.x !== undefined) ? bot.spawnPoint : null;
  log('a8', 'world spawnPoint=' + (sp ? `${sp.x.toFixed(1)} ${sp.y.toFixed(1)} ${sp.z.toFixed(1)}` : '(unknown)'));

  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });
  for (const c of P1_CMDS) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('a8', 'phase1 cmds sent');

  mark(`[HarnMark] A8 begin ts=${Date.now()} tp=${FAR.join(',')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);
  log('a8', 'tp-far receipt seen (or timeout)');

  const heart = setInterval(() => {
    if (bot.entity) log('a8', `heartbeat pos=${(bot.entity.position.x).toFixed(1)} ${(bot.entity.position.y || 0).toFixed(1)} ${(bot.entity.position.z || 0).toFixed(1)} health=${bot.health} food=${bot.food}`);
  }, 30000);
  await new Promise((r) => setTimeout(r, 420 * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A8 end ts=${Date.now()} stayed=420s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  // ------------------------------------------------ phase 3: rejoin & testfor survival
  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  bot2.chat('/gamerule doMobSpawning true');
  await new Promise((r) => setTimeout(r, 900));
  log('a8', 'phase3 rejoin — testfor survival receipts:');
  for (const type of ['VillagerGolem', 'Villager', 'Wolf', 'Ocelot']) {
    bot2.chat(`/testfor @e[type=${type}]`);
    await new Promise((r) => setTimeout(r, 700));
  }
  await awaitReceipt(bot2, [/Found|匹配/, /Does not match|没有匹配|测试失败/], 6000);
  log('a8', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a8', 'FATAL:', e.message); process.exit(1); });
