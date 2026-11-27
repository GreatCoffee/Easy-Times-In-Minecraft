/**
 * combo-a9deploy2.js — A9 养殖 v2 重放（CustomName 命名，既有 id 混染面一次封死）
 *   W=A9W(野生,无 Owner) / T=A9T(驯服,Owner=Harn01,Sitting) — (−60,232) 农场区
 *   join→resistance→清 r=32 旧猫→召唤→mark→tp-far→quit（logout 1100）
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const TP_RE = /Teleported ETIM_Harn01 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const HARN01 = '8b59d84a-bc34-3993-8e87-029a840f1dca';
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
  await sleep(1200);
  bot.chat('/tp ETIM_Harn01 ~ ~ ~');
  log('a9v2', 'join: ' + JSON.stringify(await awaitTp(bot)));
  bot.chat('/kill @e[type=Ocelot,x=-60,y=65,z=232,r=32]');
  await sleep(1200);
  bot.chat('/summon Ocelot -61.5 66 240.5 {CustomName:"A9W"}');
  await sleep(1200);
  bot.chat('/summon Ocelot -60.5 66 238.5 {CustomName:"A9T",OwnerUUID:"' + HARN01 + '",Sitting:1b}');
  await sleep(1200);
  bot.chat('/say [HarnMark] A9V2 deploy ts=' + Date.now());
  await sleep(1500);
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1200);
  bot.quit();
  log('a9v2', 'deployed');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('a9v2', 'FATAL:', e.message); process.exit(1); });
