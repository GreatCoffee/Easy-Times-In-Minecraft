/** ad10s-diag2.js — 甲胄服务端真值诊断：staging → save-all → playerdata NBT 读四槽 */
'use strict';
const L = require('./ad10s-lib');
const { createHarnBot } = require('./fmlbot');
const { readArmor } = require('./ad7e-nbt');
const P = 'ETIM_Harn01';

(async () => {
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: P });
  for (let i = 0; i < 60 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(2500);
  await L.rcon(`gamemode 0 ${P}`);
  await L.sleep(300);
  for (const s of ['head', 'chest', 'legs', 'feet']) {
    const item = { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate', legs: 'minecraft:iron_leggings', feet: 'minecraft:iron_boots' }[s];
    console.log(s, '=>', await L.rcon(`replaceitem entity ${P} slot.armor.${s} ${item} 1 0 {Unbreakable:1b}`));
  }
  await L.sleep(500);
  await L.rcon('save-all');
  await L.sleep(1500);
  console.log('playerdata armor:', JSON.stringify(readArmor(P)));

  // second: without Unbreakable
  for (const s of ['head', 'chest', 'legs', 'feet']) {
    const item = { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate', legs: 'minecraft:iron_leggings', feet: 'minecraft:iron_boots' }[s];
    await L.rcon(`replaceitem entity ${P} slot.armor.${s} ${item} 1`);
  }
  await L.sleep(500);
  await L.rcon('save-all');
  await L.sleep(1500);
  console.log('playerdata armor (no tag):', JSON.stringify(readArmor(P)));

  const off = L.logOffset();
  await L.rcon(`etest hurt 4 generic ${P}`);
  await L.waitLog(/\[TestLog\] step=hurt/, off, 3000);
  await L.sleep(300);
  console.log(L.logSince(off).split('\n').filter((l) => /DamageLog/.test(l)).join('\n'));

  bot.quit();
  await L.sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
