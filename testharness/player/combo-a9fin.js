/**
 * combo-a9verdict.js — run27 A9-wild 判终窗（主会话 2026-10-13 晚）
 *
 * 前置：A9V2 猫 (−60,232) deploy@18:41，age 满速已 >2400 ✓；此后离线窗
 * counter 满速无界增长（无玩家窗=kill-pass 不评估）。
 * 判终协议（会话五 §2.3/§五）：回线即 p!=null → c≥200 门开 → 距离 1186>16 ✓
 * LOS 外 ✓ → 动物墙过墙（c>2400 ✓）→ ocelot age 过 2400 ✓ → **kill 行当场落**；
 * 驯服猫 A9T（tamed）时时豁免=零行对照。
 * 形态：join 落 1100（wall 不可及）→ resistance → mark begin → 300s → mark end
 * → tp 用户场 → testfor A9W/A9T 存活（namedtestfor）→ tp-far → quit
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const TP_RE = /Teleported ETIM_Harn01 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function awaitTp(bot, ms = 8000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { bot.off('message', h); resolve(null); }, ms);
    const h = (msg) => { const m = TP_RE.exec(String(msg || '')); if (m) { clearTimeout(t); bot.off('message', h); resolve(m[0]); } };
    bot.on('message', h);
  });
}
async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  bot.chat('/effect ETIM_Harn01 minecraft:resistance 900000 254 true');
  await sleep(1500);
  bot.chat('/tp ETIM_Harn01 ~ ~ ~');
  log('a9fin', 'join: ' + JSON.stringify(await awaitTp(bot)));
  bot.chat('/say [HarnMark] A9FIN begin ts=' + Date.now());

  await sleep(300 * 1000);
  bot.chat('/say [HarnMark] A9FIN end ts=' + Date.now() + ' stayed=300s');
  await sleep(2000);

  bot.chat('/testfor @e[type=Ocelot,name=A9W]');       // 野生：应已被 kill（found nothing）
  await sleep(900);
  bot.chat('/testfor @e[type=Ocelot,name=A9T]');       // 驯服：应存活
  await sleep(900);
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('a9fin', 'done');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('a9fin', 'FATAL:', e.message); process.exit(1); });
