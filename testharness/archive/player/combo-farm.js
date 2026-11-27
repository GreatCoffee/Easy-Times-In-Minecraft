/**
 * combo-farm.js — run27 A5 夜间农场（主会话 driver，2026-10-12 晚）
 *
 * 原理（A5X2 窗定谳后的正确编排）：
 *   · 永久 force-load 区=原世界出生点邻域（#15-24 猪 c=1818~1953 与
 *     Chicken#1277 c=2538 两批实证）；setworldspawn 迁移区(−60,232)不保留加载。
 *   · 无玩家窗：p==null → 不杀不 wall-重置，counter 纯涨（unbounded growth）。
 *   · 翌晨重入者必须与农场 >1024：Harn07 本轮 logout 落 1100-far，
 *     明晨 join 自动落 1100（wall 不可及），首个 despawn pass 即 kill。
 *
 * 流程：Harn07 首次进服（落在 world spawn）→ /tp ~ ~ ~ 获取真实出生坐标
 *   → 召唤 farm（cow×2/sheep/wolf/pig/野生豹猫/驯服豹猫=Owner Harn01）
 *   → /tp 1100 70 0 → quit（整夜服务器不停）
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const TP_RE = /Teleported ETIM_Harn07 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const HARN01_UUID = '8b59d84a-bc34-3993-8e87-029a840f1dca';

function awaitTp(bot, ms = 10000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { bot.off('message', h); resolve(null); }, ms);
    const h = (msg) => {
      const m = TP_RE.exec(String(msg || ''));
      if (m) { clearTimeout(t); bot.off('message', h); resolve({ x: +m[1], y: +m[2], z: +m[3], raw: m[0] }); }
    };
    bot.on('message', h);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn07' });
  // 首降（world spawn）——先等迟滞包落位，再 ~ ~ ~ 领坐标
  await sleep(12000);
  bot.chat('/tp ETIM_Harn07 ~ ~ ~');
  let spawn = await awaitTp(bot);
  if (!spawn) { await sleep(6000); bot.chat('/tp ETIM_Harn07 ~ ~ ~'); spawn = await awaitTp(bot); }
  log('farm', 'spawn receipt: ' + JSON.stringify(spawn));
  if (!spawn) { bot.quit(); throw new Error('no spawn coords'); }
  const sx = Math.floor(spawn.x), sy = Math.floor(spawn.y), sz = Math.floor(spawn.z);

  const cmds = [
    '/gamerule doMobSpawning true',
    `/summon Cow ${(sx + 2.5).toFixed(1)} ${sy + 2} ${(sz + 0.5).toFixed(1)}`,
    `/summon Cow ${(sx - 3.5).toFixed(1)} ${sy + 2} ${(sz + 1.5).toFixed(1)}`,
    `/summon Sheep ${(sx + 0.5).toFixed(1)} ${sy + 2} ${(sz - 2.5).toFixed(1)}`,
    `/summon Wolf ${(sx - 0.5).toFixed(1)} ${sy + 2} ${(sz + 2.5).toFixed(1)}`,
    `/summon Pig ${(sx + 5.5).toFixed(1)} ${sy + 2} ${(sz - 1.5).toFixed(1)}`,
    `/summon Ocelot ${(sx + 1.5).toFixed(1)} ${sy + 2} ${(sz + 5.5).toFixed(1)}`,
    `/summon Ocelot ${(sx - 5.5).toFixed(1)} ${sy + 2} ${(sz - 5.5).toFixed(1)} {OwnerUUID:"${HARN01_UUID}"}`,
  ];
  for (const c of cmds) { bot.chat(c); await sleep(900); }
  log('farm', 'farm cmds sent, taming-owner=harn01');
  bot.chat('/say [HarnMark] FARM begin ts=' + Date.now());
  await sleep(2000);

  // 关键收尾：tp-far → logout（明晨 join 落 1100，wall 永不可及）
  bot.chat('/tp ETIM_Harn07 1100 70 0');
  const tp = await awaitTp(bot);
  log('farm', 'logout tp: ' + JSON.stringify(tp));
  await sleep(3000);
  bot.quit();
  log('farm', 'done — server stays ON overnight');
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('farm', 'FATAL:', e.message); process.exit(1); });
