/**
 * combo-c4e.js — run27 C4-e 三牛定谳窗（平台版，主会话 2026-10-13 晚）
 *
 * C4D 判读教训：1200 场地自然地形坑洞+自带湖泊 → 三牛全部近水/进洞，判据面失效。
 * 修法=抬石平台保证地形可控：平台 y=72（15×11）；DA=平台田 tank 内（近水命中）；
 * DB=平台露天站立（vanilla 站立位 canSeeSky ✓）；DC=檐下石盖（heightMap 顶遮→rainingAt=false）。
 * 判据（raincheck+value 双行）：DA nearWater=true hold 1.00；DB nearWater=false &
 *   rainingAt=true 微升(+0.001/scan)；DC rainingAt=false → −0.005/scan 下降。
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
  log('c4e', 'tp: ' + JSON.stringify(await awaitTp(bot)));

  const cmds = [
    '/gamerule doMobSpawning false',
    '/weather rain 600',
    // 清场旧段
    '/kill @e[type=Cow,x=1200,y=60,z=1200,r=48]',
    // 平台（石实心，5 高差避坑）
    '/fill 1198 72 1198 1216 72 1210 minecraft:cobblestone',
    // DA 水田：平台上的 tank（ring hollow + water 内）
    '/fill 1201 73 1200 1206 75 1205 minecraft:stone 0 hollow',
    '/fill 1202 73 1201 1205 75 1204 minecraft:water',
    // DC 檐：石实心两层（heightMap 顶罩 DC 柱）
    '/fill 1209 75 1200 1213 76 1204 minecraft:cobblestone',
    // 三牛（平台顶站立）
    '/summon Cow 1203.5 73.3 1202.5 {Invulnerable:1b,CustomName:"C4E_DA"}',
    '/summon Cow 1207.5 73.3 1208.5 {Invulnerable:1b,CustomName:"C4E_DB"}',
    '/summon Cow 1210.5 73.3 1201.5 {Invulnerable:1b,CustomName:"C4E_DC"}',
    '/say [HarnMark] C4E begin ts=' + Date.now(),
  ];
  for (const c of cmds) { bot.chat(c); await sleep(1000); }
  log('c4e', 'deploy done');

  await sleep(300 * 1000);
  bot.chat('/say [HarnMark] C4E end ts=' + Date.now() + ' stayed=300s');
  await sleep(2000);
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('c4e', 'done — offline starts');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('c4e', 'FATAL:', e.message); process.exit(1); });
