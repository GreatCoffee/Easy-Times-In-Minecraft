/**
 * combo-a5x.js — run27 A5 定谳窗（setworldspawn + 离线增长 + 重入 kill）——主会话
 *
 * 判据源（会话五节奏终审 §2.3.3）：动物/豹猫 counter>2400 的唯一可达面 =
 * 玩家全下线（spawn chunk 仍 tick）的无界增长窗；重入后首个 kill-pass
 * （无围栏、>16、LOS 外）处决。本 driver 一次性给出：
 *   P1 join → gamerule/effect → /setworldspawn -60 68 232（spawn chunk 迁到
 *      散养场）→ 召唤 cow/sheep/wolf/野生豹猫/驯服豹猫（fence 零）→ fresh 鱿鱼
 *      ×1（pollution-fix 复验 restored=false）→ mark begin → quit
 *   （离线窗 480 s：spawn chunk tick，counter 冲 2400+；age 同步增长）
 *   P3 rejoin → mark end → /tp 1100 远 → 保持 120 s（kill-pass@1100）
 *   → phase3 幸存 testfor → quit
 * 判读（主会话）：A5 kill 行 entity=Cow/Sheep/Wolf（A5 PASS）；野生豹猫 kill
 *   行（A9 野生面 PASS）；驯服豹猫与 fresh 鱿鱼零行幸存（A9 驯服 + A1b fix）。
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
  const mark = (m) => { log('a5x', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -60 68 232');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('a5x', `base=(${bx},${by},${bz})`);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    `/setworldspawn ${bx} ${by} ${bz}`,                       // ★ spawn chunk 迁移（关键）
    `/summon Cow ${bx + 0.5} ${by + 1.2} ${bz + 0.5}`,
    `/summon Sheep ${bx - 1.5} ${by + 1.2} ${bz + 1}`,
    `/summon Wolf ${bx + 1.5} ${by + 1.2} ${bz - 1}`,
    `/summon Ocelot ${bx - 0.5} ${by + 1.2} ${bz + 2}`,       // A9 野生
    `/summon Ocelot ${bx + 1.5} ${by + 1.2} ${bz + 2.5} {OwnerUUID:"${OWNER}"}`, // A9 驯服
    `/fill ${bx + 3} ${by + 1} ${bz + 3} ${bx + 6} ${by + 2} ${bz + 6} minecraft:air 0`,
    `/summon Squid ${bx + 4.5} ${by} ${bz + 4.5}`,            // pollution-fix 复验（坑内水由雨/地形）
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('a5x', 'phase1 cmds sent');

  mark(`[HarnMark] A5X begin ts=${Date.now()} mode=offline-growth`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  // —— 离线窗（无玩家，spawn chunk tick）：counter/age 无界增长
  await new Promise((r) => setTimeout(r, 480 * 1000));

  // —— 重入：bot 在 1100 远（p 非空、distSq 巨大）→ 首个 kill-pass 处决 c>2400
  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark2 = (m) => { log('a5x', m); bot2.chat('/say ' + m); };
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  mark2(`[HarnMark] A5X end ts=${Date.now()} mode=reentry@${FAR.join(',')}`);
  bot2.chat('/gamerule doMobSpawning true');
  await new Promise((r) => setTimeout(r, 900));
  bot2.chat(`/tp ETIM_Harn01 ${FAR.join(' ')}`);
  await awaitReceipt(bot2, [/^Teleported /i, /commands\.tp\.success/], 10000);
  await new Promise((r) => setTimeout(r, 120 * 1000));
  bot2.quit();
  await new Promise((r) => setTimeout(r, 2000));

  // —— phase3 幸存 testfor（离窗场面）
  const bot3 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot3.entity && bot3.entity.position) return r(); bot3.once('move', r); setTimeout(r, 20000); });
  bot3.chat('/tp ETIM_Harn01 -60 68 232');
  await awaitReceipt(bot3, [/^Teleported /i], 8000);
  await new Promise((r) => setTimeout(r, 3000));
  for (const type of ['Cow', 'Sheep', 'Wolf', 'Ocelot', 'Squid']) {
    bot3.chat(`/testfor @e[type=${type}]`);
    await new Promise((r) => setTimeout(r, 700));
  }
  await awaitReceipt(bot3, [/Found|found nothing/], 6000);
  log('a5x', 'phase3 done');
  bot3.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a5x', 'FATAL:', e.message); process.exit(1); });
