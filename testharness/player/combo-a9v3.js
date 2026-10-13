/**
 * combo-a9v3.js — run27 A9-wild 正面 kill 证明窗（entitydata 补种路线）
 *
 * 依据（台账 197）：离线窗 0 tick（双引擎等效）→「离线增长」不可达；
 *   age 门活性已证（#2287 gate 行）；c 门活性已证（A5NBT 牛 #2249 kill）；
 *   本窗用 /entitydata 在 age>2400 后补种 c=2500 → 双门齐会 → kill 行 =
 *   测试书 A9「tick>2400 后走链 kill」的正面实证（驯服猫零行对照）。
 * Invulnerable:1b 防溺死（A9V2 猫疑似溺死旧池水）——despawn kill 走 setDead
 *   直调不经伤害管线，Invulnerable 不拦截 ✓。
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
  log('a9v3', 'join: ' + JSON.stringify(await awaitTp(bot)));

  const cmds = [
    '/kill @e[type=Ocelot,x=-60,y=65,z=232,r=48]',                                   // 清场（老猫 #85/88/102 一并）
    '/summon Ocelot -66.5 67 226.5 {Invulnerable:1b}',                               // 野生（age 从 0 满速长）
    '/summon Ocelot -65.5 67 228.5 {Invulnerable:1b,OwnerUUID:"' + HARN01 + '",Sitting:1b}',  // 驯服对照
    '/say [HarnMark] A9V3 begin ts=' + Date.now(),
  ];
  for (const c of cmds) { bot.chat(c); await sleep(1100); }
  log('a9v3', 'deployed, online wait 150s for age>2400');

  await sleep(150 * 1000);
  // age>2400 ✓（150s=3000t）→ 补种 c=2500（双猫同种，驯猫豁免不受影响）
  bot.chat('/entitydata @e[type=Ocelot,x=-66,y=65,z=226,r=12] {despawn_counter:2500,Health:10f}');
  await sleep(2000);
  bot.chat('/say [HarnMark] A9V3 seeded ts=' + Date.now());

  await sleep(60 * 1000);
  bot.chat('/say [HarnMark] A9V3 end ts=' + Date.now());
  await sleep(2000);
  bot.chat('/testfor @e[type=Ocelot,x=-66,y=65,z=226,r=12]');   // 应只剩驯猫（野生已被 kill）
  await sleep(1000);
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('a9v3', 'done');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('a9v3', 'FATAL:', e.message); process.exit(1); });
