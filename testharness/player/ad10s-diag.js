/** ad10s-diag.js — 临时诊断（会话七）：甲胄 staging 与 use 态保活 */
'use strict';
const L = require('./ad10s-lib');
const { createHarnBot } = require('./fmlbot');
const P = 'ETIM_Harn01';

(async () => {
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: P });
  for (let i = 0; i < 60 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(1500);
  await L.rcon(`gamemode 0 ${P}`);
  await L.rcon(`etest health 20 ${P}`);
  await L.sleep(300);

  console.log('--- armor stage ---');
  for (const s of ['head', 'chest', 'legs', 'feet']) {
    const item = { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate', legs: 'minecraft:iron_leggings', feet: 'minecraft:iron_boots' }[s];
    console.log(s, '=>', await L.rcon(`replaceitem entity ${P} slot.armor.${s} ${item} 1 0 {Unbreakable:1b}`));
  }
  await L.sleep(300);
  console.log('client armor slots', JSON.stringify([5, 6, 7, 8].map((i) => {
    const it = bot.inventory.slots[i];
    return it ? { name: it.name, dmg: it.durabilityUsed } : null;
  })));

  let off = L.logOffset();
  await L.rcon(`etest hurt 4 generic ${P}`);
  await L.waitLog(/\[TestLog\] step=hurt/, off, 3000);
  await L.sleep(200);
  console.log('--- after hurt 4 (immediate after staging) ---');
  console.log(L.logSince(off).split('\n').filter((l) => /DamageLog|TestLog/.test(l)).join('\n'));

  await L.rcon(`etest health 20 ${P}`);
  await L.sleep(1000);
  off = L.logOffset();
  await L.rcon(`etest hurt 4 generic ${P}`);
  await L.waitLog(/\[TestLog\] step=hurt/, off, 3000);
  await L.sleep(200);
  console.log('--- after hurt 4 (1s later) ---');
  console.log(L.logSince(off).split('\n').filter((l) => /DamageLog|TestLog/.test(l)).join('\n'));

  console.log('--- use state persistence: hold shield + useitem ---');
  await L.rcon(`etest hold minecraft:shield ${P}`);
  await L.sleep(200);
  await L.rcon(`etest useitem ${P}`);
  await L.sleep(200);
  for (const ms of [0, 500, 1500]) {
    await L.sleep(ms);
    const o = L.logOffset();
    await L.rcon(`etest blockprobe ${P}`);
    await L.sleep(300);
    const st = L.parsers.state(L.logSince(o))[0];
    console.log(`  +${ms}ms state:`, st ? st.line : 'n/a');
  }

  bot.quit();
  await L.sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
