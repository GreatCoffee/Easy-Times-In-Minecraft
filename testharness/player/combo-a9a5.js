/**
 * combo-a9a5.js — run27 A1b 水栖 −9600 + A9 豹猫门（驯/野对比）+ A5 无墙动物 kill
 *   + blockAt 探针（解「15 blocks filled」receipt 计数谜）——主会话 driver
 *
 * 洞察（代码一手筆記）：
 * - ocelot 门入链（DespawnRules 头部 R196 :53-55 gate 修复后）：野生豹猫age>2400
 *   → 链 → bot 远（>16、无 LOS）→ kill 行；驯服由 tame-exempt 早退 → 零行。
 * - A5：动物无 fence（±16 无 BlockFence）时 closestPlayer(1024)=null 分支 →
 *   counter>2400 → LOS gate（bot 远）→ kill 行 entity=动物类。
 * - 15-blocks 谜：bot.blockAt 客户端块读 4 点（fence 圈角落/边/心/地面）直验。
 *
 * 标记：[HarnMark] A9A5 begin/end tp=-1100,70,0
 * 需要怪在场与 tick：bot 全程在线（tp 远处）；召唤均在出生区恒载圈附近。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca';
const FAR = ['1100', '70', '0'];

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
  const mark = (m) => { log('a9a5', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  // —— 块读探针（15-blocks 谜）
  try {
    const { Vec3 } = require('vec3');
    for (const [x, y, z] of [[-71, 67, 252], [-68, 67, 255], [-70, 66, 253], [-66, 69, 257], [-64, 67, 258]]) {
      const b = bot.blockAt(new Vec3(x, y, z));
      log('a9a5', `blockAt(${x},${y},${z}) = ${b ? b.name : '(null)'}`);
    }
  } catch (e) { log('a9a5', 'blockAt probe fail: ' + e.message); }

  // —— 出生点位置
  bot.chat('/tp ETIM_Harn01 -65 66 241');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2500));
  const p = bot.entity && bot.entity.position;
  if (!p) { log('a9a5', 'FATAL: no bot position'); process.exit(1); }
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('a9a5', `base pos=(${bx},${by},${bz})`);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    // A9: 野生 + 驯服豹猫（age<2400 → 门 hold 不杀；>2400 后链可杀野生侧）
    `/summon Ocelot ${bx + 1.5} ${by + 1.2} ${bz + 1}`,
    `/summon Ocelot ${bx - 1.5} ${by + 1.2} ${bz + 1} {OwnerUUID:"${OWNER}"}`,
    // A1b 水槽：石圈 2 层 hollow + 内注水 3×3×2，召唤鱿鱼
    `/fill ${bx + 4} ${by + 1} ${bz + 4} ${bx + 8} ${by + 2} ${bz + 8} minecraft:stone 0 hollow`,
    `/fill ${bx + 5} ${by + 1} ${bz + 5} ${bx + 7} ${by + 2} ${bz + 7} minecraft:water`,
    `/summon Squid ${bx + 6} ${by + 1.5} ${bz + 6}`,
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }

  // —— A5 无墙动物（距 fence ±16 外：出生区 (−60,68,235) 距最近 fence ≈21 格）
  const a5cmds = [
    '/tp ETIM_Harn01 -60 68 235',
    '/summon Cow -60.5 69.5 234.5',
    '/summon Sheep -59.5 69.5 236.5',
    '/summon Wolf -58.5 69.5 235.5',
  ];
  for (const c of a5cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  await awaitReceipt(bot, [/^Teleported /i], 8000);
  log('a9a5', 'phase1 cmds sent');

  mark(`[HarnMark] A9A5 begin ts=${Date.now()} tp=${FAR.join(',')}`);
  bot.chat(`/tp ETIM_Harn01 ${FAR.join(' ')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);
  log('a9a5', 'tp-far sent');

  const heart = setInterval(() => {
    if (bot.entity) log('a9a5', `heartbeat pos=${(bot.entity.position.x).toFixed(1)} ${(bot.entity.position.y || 0).toFixed(1)} ${(bot.entity.position.z || 0).toFixed(1)} health=${bot.health} food=${bot.food}`);
  }, 30000);
  await new Promise((r) => setTimeout(r, 480 * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A9A5 end ts=${Date.now()} stayed=480s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  // —— phase 3 rejoin & testfor survival set
  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  bot2.chat('/testfor @e[type=Ocelot]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Cow]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Sheep]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Squid]'); await new Promise((r) => setTimeout(r, 700));
  await awaitReceipt(bot2, [/Found|匹配/, /found nothing|没有匹配/], 6000);
  log('a9a5', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a9a5', 'FATAL:', e.message); process.exit(1); });
