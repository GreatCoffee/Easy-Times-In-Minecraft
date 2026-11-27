/**
 * combo-a5nbt.js — run27 A5/A9 终定谳窗（NBT 种子版，主会话 2026-10-13）
 *
 * 依据（2026-10-13 仪窗三读数）：spare-tick 增长 ~0.4/s 使养场到 2400 需 ~100 min，
 * 改用 despawn_counter NBT 种子（A3 语义：readFromNBT 有键即入）直接入场。
 * 关键纪律：**召唤全程站在 >1024 远点**（(−60,232) 动物 ×1100+ 距离）——
 * 新实体首个 despawn pass：distSq>256 ✓ → canDespawn（c=2500 过墙 + wall null +
 * LOS 不可见）→ **kill 行当场落**。野猫的 age 门（ticksExisted>2400）走真实在线
 * 2~3 min（1.12 不持久化 ticksExisted，无法 NBT 种）。驯服猫=tamed 豁免=零 kill。
 *
 * 流程：join(落1100 阅坊) → resistance → tp ~ ~ ~ 亮牌 → 远点清场旧动物（r=64 of −60,65,232）
 *   → 远点召唤 7 种子（2 cow/sheep/wolf/pig= c2500；wild cat；tame cat Owner=Harn01）
 *   → mark begin → 等 300 s（野猫 age 过 2400）→ mark end → testfor 存活清点 → tp-far → quit
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const HARN01_UUID = '8b59d84a-bc34-3993-8e87-029a840f1dca';
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
  bot.chat('/effect ETIM_Harn01 minecraft:resistance 900000 254 true');
  await sleep(1200);
  bot.chat('/tp ETIM_Harn01 ~ ~ ~');
  const pos = await awaitTp(bot);
  log('a5nbt', 'reentry: ' + JSON.stringify(pos));

  // 远点清场旧动物（防止 id 混染，r=64 圆于 (−60,65,232)）
  const old = ['Cow', 'Sheep', 'Wolf', 'Pig', 'Ocelot', 'Chicken'];
  for (const tpe of old) {
    bot.chat(`/kill @e[type=${tpe},x=-60,y=65,z=232,r=64]`);
    await sleep(900);
  }
  log('a5nbt', 'old animals killed');

  // 远点召唤 7 种子（c=2500 种）
  const K = '2500';
  const seeds = [
    `/summon Cow -57.5 66 234.5 {despawn_counter:${K}}`,
    `/summon Cow -63.5 66 230.5 {despawn_counter:${K}}`,
    `/summon Sheep -60.5 66 236.5 {despawn_counter:${K}}`,
    `/summon Wolf -59.5 66 228.5 {despawn_counter:${K}}`,
    `/summon Pig -56.5 66 229.5 {despawn_counter:${K}}`,
    `/summon Chicken -62.5 66 233.5 {despawn_counter:${K}}`,
    `/summon Ocelot -65.5 66 236.5 {despawn_counter:${K}}`,          // 野生：age 门真实走
    `/summon Ocelot -64.5 66 228.5 {despawn_counter:${K},OwnerUUID:"${HARN01_UUID}"}`  // 驯服：豁免对照
  ];
  for (const c of seeds) { bot.chat(c); await sleep(1000); }
  log('a5nbt', 'seeded 8 (c=2500)');
  bot.chat('/say [HarnMark] A5NBT begin ts=' + Date.now());

  await sleep(300 * 1000);   // 野猫 age 门：2400+ ticks 真实在线
  bot.chat('/say [HarnMark] A5NBT end ts=' + Date.now() + ' stayed=300s');
  await sleep(2000);

  for (const tpe of ['Cow', 'Sheep', 'Wolf', 'Pig', 'Chicken', 'Ocelot']) {
    bot.chat(`/testfor @e[type=${tpe},x=-60,y=65,z=232,r=64]`);
    await sleep(800);
  }
  await sleep(3000);

  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  log('a5nbt', 'logout tp ok');
  await sleep(2000);
  bot.quit();
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('a5nbt', 'FATAL:', e.message); process.exit(1); });
