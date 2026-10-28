/** ad7e-armorcheck.js — 甲胄 staging 诊断（会话七临时工装）：逐槽 replaceitem 回执 + 存档 NBT 复核 */
'use strict';
const L = require('./ad7e-lib');
const { createHarnBot } = require('./fmlbot');
const { readArmor } = require('./ad7e-nbt');

const TGT = process.env.AD7E_TGT || 'ETIM_Harn03';

(async () => {
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: TGT });
  for (let i = 0; i < 40 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(2000);
  console.log('pos', bot.entity && bot.entity.position.toString(), 'health', bot.health);
  const cmds = [
    'replaceitem entity ' + TGT + ' slot.armor.head minecraft:air',
    'replaceitem entity ' + TGT + ' slot.armor.chest minecraft:iron_chestplate 1 0 {Unbreakable:1b}',
    'replaceitem entity ' + TGT + ' slot.armor.legs minecraft:iron_leggings 1 0 {Unbreakable:1b}',
    'replaceitem entity ' + TGT + ' slot.armor.feet minecraft:air',
  ];
  for (const c of cmds) console.log(c, '=>', await L.rcon(c));
  await L.sleep(500);
  console.log('client slots', JSON.stringify([5, 6, 7, 8].map((s) => {
    const it = bot.inventory.slots[s];
    return it ? { name: it.name, dur: it.durabilityUsed, max: it.maxDurability } : null;
  })));
  await L.rcon('save-all');
  await L.sleep(1500);
  console.log('nbt', JSON.stringify(readArmor(TGT)));
  bot.quit();
  await L.sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
