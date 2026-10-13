/**
 * combo-a9farm.js — run27 A9-wild 养殖窗（主会话 2026-10-13 晚）
 *
 * 会话五终审：A9-wild 可达面 = 离线窗同涨（c 稀疏~0.4/s + age 满速率）+ 回线全条件
 * → kill。种子路不可行（age>2400 前首 pass 即 false → seed 被 reroll 吃）。
 *
 * 本窗：远点（1100）召唤野生+驯服豹猫各 1 至 (−60,232) 农场区，立即退出——
 * 之后服务器保持运行（禁 boot：boot 抹 ticksExisted），~100 min 空转期由 C4 等
 * 邻窗填充（这些窗也禁 join farm 1024 内），回线判终窗最后收 A9-wild kill 行 +
 * 驯猫零行。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const TP_RE = /Teleported ETIM_Harn01 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function awaitTp(bot, ms = 8000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { bot.off('message', h); resolve(null); }, ms);
    const h = (msg) => {
      const m = TP_RE.exec(String(msg || ''));
      if (m) { clearTimeout(t); bot.off('message', h); resolve({ x: +m[1], y: +m[2], z: +m[3] }); }
    };
    bot.on('message', h);
  });
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  bot.chat('/effect ETIM_Harn01 minecraft:resistance 900000 254 true');
  await sleep(1200);
  bot.chat('/tp ETIM_Harn01 ~ ~ ~');
  const pos = await awaitTp(bot);
  log('a9farm', 'join at: ' + JSON.stringify(pos));

  // 野生豹猫（无 Owner → wild；age 从 0 满速涨）。无 despawn_counter 种。
  bot.chat('/summon Ocelot -61.5 66 240.5');
  await sleep(1200);
  // 驯服豹猫（Sitting 防 follow）——对照组零行源
  bot.chat('/summon Ocelot -60.5 66 238.5 {OwnerUUID:"8b59d84a-bc34-3993-8e87-029a840f1dca",Sitting:1b}');
  await sleep(1200);

  bot.chat('/say [HarnMark] A9FARM deploy ts=' + Date.now());
  await sleep(1500);
  // 收尾 logout 保持 1100 远点
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('a9farm', 'deployed; farm window starts (no boot, no farm-join until verdict)');
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('a9farm', 'FATAL:', e.message); process.exit(1); });
