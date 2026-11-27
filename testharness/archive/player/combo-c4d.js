/**
 * combo-c4d.js — run27 C4-d 三牛定谳窗命名版（CustomName 防混染 + raincheck 仪行）
 *   C4DA=水谷内 / C4DB=雨淋露点 / C4DC=檐下干点 — (1200,68,1200) 远点（离猫场 ≥1500）
 *   要点：C 檐改为两层实体石顶+依然空心侧面；召唤后立即 /testfor 名字锁定 id
 * 判据（value 行 + raincheck 行）：DA≈1.00 hold；DB 1.00/rainingAt=true 路径；
 *   DC rainingAt=false → −0.005/scan 下降轨迹。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const TP_RE = /Teleported ETIM_Harn01 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function awaitTp(bot, ms = 15000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { bot.off('message', h); resolve(null); }, ms);
    const h = (msg) => { const m = TP_RE.exec(String(msg || '')); if (m) { clearTimeout(t); bot.off('message', h); resolve(m[0]); } };
    bot.on('message', h);
  });
}
async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  bot.chat('/effect ETIM_Harn01 minecraft:resistance 900000 254 true');
  await sleep(1200);
  bot.chat('/tp ETIM_Harn01 1200 78 1200');
  log('c4d', 'tp: ' + JSON.stringify(await awaitTp(bot)));

  const cmds = [
    '/gamerule doMobSpawning false',
    '/weather rain 600',
    '/fill 1203 71 1203 1208 72 1208 minecraft:stone 0 hollow',
    '/fill 1204 71 1204 1207 72 1207 minecraft:water',
    '/fill 1207 71 1209 1212 75 1212 minecraft:cobblestone',      // C 檐（实心两层起跳，heightMap 顶=76）
    `/summon Cow 1205.5 70.3 1205.5 {Invulnerable:1b,CustomName:"C4DA"}`,
    `/summon Cow 1211.5 68.8 1202.5 {Invulnerable:1b,CustomName:"C4DB"}`,
    `/summon Cow 1209.5 68.8 1210.5 {Invulnerable:1b,CustomName:"C4DC"}`,
    '/testfor @e[type=Cow,x=1200,y=68,z=1200,r=32]',
    '/say [HarnMark] C4D begin ts=' + Date.now(),
  ];
  for (const c of cmds) { bot.chat(c); await sleep(1000); }
  log('c4d', 'deploy done');

  await sleep(300 * 1000);
  bot.chat('/say [HarnMark] C4D end ts=' + Date.now() + ' stayed=300s');
  await sleep(2000);
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('c4d', 'done — offline window starts (A9 cats grow)');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('c4d', 'FATAL:', e.message); process.exit(1); });
