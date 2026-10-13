/**
 * combo-farm-reentry.js — run27 A5/A9 判终窗（farm 重入，主会话 2026-10-13）
 *
 * 前置：起服后空转 ≥5 min（无 join），spawn 永久区动物 counter 续涨过 2400。
 * 重入者=ETIM_Harn01（昨晚 tp-far(1100) 后健康退出，join 必落 1100 远点；
 * Harn07 昨晚死过，respawn 悬在出生点=farm 侧，禁用）。
 *
 * 链路：join(落1100) → 首条命令 /effect resistance（防 1100 点边缘物块窒息，
 * 昨晚 Harn07 在此点 3s 内无抗性死亡——命令先于窒息到达）→ mark begin
 * → 原地 180s（kill-pass 全量评估）→ mark end → tp ~ ~ ~ 亮牌坐标 → quit
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
  // 首条命令=防窒息（在第一 despawn pass 前抢救，与 respawn 无关）
  bot.chat('/effect ETIM_Harn01 minecraft:resistance 900000 254 true');
  await sleep(1500);

  const pos = await (async () => { bot.chat('/tp ETIM_Harn01 ~ ~ ~'); return await awaitTp(bot); })();
  log('a5fin', 'reentry position: ' + JSON.stringify(pos));

  bot.chat('/say [HarnMark] A5FIN begin ts=' + Date.now());
  await sleep(180 * 1000);
  bot.chat('/say [HarnMark] A5FIN end ts=' + Date.now() + ' stayed=180s');
  await sleep(2000);
  bot.quit();
  log('a5fin', 'done');
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('a5fin', 'FATAL:', e.message); process.exit(1); });
