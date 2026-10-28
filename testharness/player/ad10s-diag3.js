/** ad10s-diag3.js 鈥?婧愰棬璇婃柇锛歮ob 婧愶紙causeMobDamage锛夋槸鍚﹁蛋鎶ょ敳姝?+ 鏍兼尅鍑忓崐 */
'use strict';
const L = require('./ad10s-lib');
const { createHarnBot } = require('./fmlbot');
const P = 'ETIM_Harn01';

(async () => {
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: P });
  for (let i = 0; i < 60 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(2000);
  await L.rcon(`gamemode 0 ${P}`);
  await L.rcon(`etest health 20 ${P}`);
  await L.sleep(300);
  for (const s of ['head', 'chest', 'legs', 'feet']) {
    const item = { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate', legs: 'minecraft:iron_leggings', feet: 'minecraft:iron_boots' }[s];
    await L.rcon(`replaceitem entity ${P} slot.armor.${s} ${item} 1`);
  }
  await L.rcon('kill @e[type=minecraft:zombie]');
  await L.sleep(300);
  const pos = bot.entity.position;
  await L.rcon(`summon minecraft:zombie ${(pos.x + 1.5).toFixed(2)} ${pos.y.toFixed(2)} ${(pos.z + 0.5).toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b}`);
  await L.sleep(500);

  let off = L.logOffset();
  await L.rcon(`etest hurt @e[type=minecraft:zombie,limit=1] 16 ${P}`);
  await L.waitLog(/\[TestLog\] step=hurt/, off, 4000);
  await L.sleep(300);
  console.log('--- 鏈尅 mob 16 ---');
  console.log(L.logSince(off).split('\n').filter((l) => /DamageLog|TestLog|BlockLog/.test(l)).join('\n'));

  await L.rcon(`etest health 20 ${P}`);
  await L.sleep(400);
  await L.rcon(`etest hold etim:sword_copper ${P}`);
  await L.sleep(200);
  await L.rcon(`etest useitem ${P}`);
  await L.sleep(400);
  off = L.logOffset();
  await L.rcon(`etest blockprobe ${P}`);
  await L.sleep(300);
  console.log('--- state before hurt ---');
  console.log(L.logSince(off).split('\n').filter((l) => /state|gate/.test(l)).join('\n'));

  await L.sleep(500);
  off = L.logOffset();
  await L.rcon(`etest hurt @e[type=minecraft:zombie,limit=1] 16 ${P}`);
  await L.waitLog(/\[TestLog\] step=hurt/, off, 4000);
  await L.sleep(300);
  console.log('--- 鏍兼尅 mob 16 ---');
  console.log(L.logSince(off).split('\n').filter((l) => /DamageLog|TestLog|BlockLog/.test(l)).join('\n'));

  await L.rcon('kill @e[type=minecraft:zombie]');
  bot.quit();
  await L.sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });

