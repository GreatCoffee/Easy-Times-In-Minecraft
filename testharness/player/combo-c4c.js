/**
 * combo-c4c.js — run27 C4-c 三牛定谳窗（主会话 2026-10-13）
 *
 * 依据 ETIMLivestockEvents.updateWellness 实码：
 *   near-water → +0.01/scan；isRainingAt(pos) → +0.001/scan；否则 −0.005/scan。
 * 三牛对照（每 100t 一扫 9/10 生效，livestock-value 每 1200t 全值行）：
 *   A＝水谷内（isNearWaterSource ✓，水值守高）；
 *   B＝雨淋露点（+0.001/scan 微升）；C＝屋檐石顶（−0.005/scan 速降）。
 * 判据：A≈1.00、B 上升轨迹、C 下降轨迹 → C4 PASS。
 *
 * 场地 (1200,68,1200)：距 A9 豹猫农场区 (−60,232) ≈1590 > 1024 = wall 零干犯；
 * bot 全程 farm-1024 外 ↔ A9 养殖计数不受此窗污染。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const TP_RE = /Teleported ETIM_Harn01 to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function awaitTp(bot, ms = 15000) {
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
  bot.chat('/tp ETIM_Harn01 1200 78 1200');   // 78 落点自然掉落（10 块以内无损）
  const pos = await awaitTp(bot);
  log('c4c', 'tp: ' + JSON.stringify(pos));

  const cmds = [
    '/gamerule doMobSpawning false',          // 判据面隔离，防自然怪混染
    '/weather rain 600',
    '/fill 1203 71 1203 1208 72 1208 minecraft:stone 0 hollow',   // 池圈
    '/fill 1204 71 1204 1207 72 1207 minecraft:water',            // 池水（A 谷内）
    '/fill 1207 71 1209 1212 74 1212 minecraft:cobblestone 0',    // C 牛石檐
    `/summon Cow 1205.5 70.3 1205.5 {Invulnerable:1b}`,           // A 水谷内
    `/summon Cow 1211.5 68.8 1202.5 {Invulnerable:1b}`,           // B 雨淋露点
    `/summon Cow 1209.5 68.8 1210.5 {Invulnerable:1b}`,           // C 檐下干点
    '/say [HarnMark] C4C begin ts=' + Date.now(),
  ];
  for (const c of cmds) { bot.chat(c); await sleep(1000); }
  log('c4c', 'deploy done, rain window 300s');

  await sleep(300 * 1000);
  bot.chat('/say [HarnMark] C4C end ts=' + Date.now() + ' stayed=300s');
  await sleep(2000);

  for (const tpe of ['Cow']) {
    bot.chat(`/testfor @e[type=${tpe},x=1200,y=68,z=1200,r=32]`);
    await sleep(900);
  }
  // 收尾回 1100（A9 判终窗重入位）
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await awaitTp(bot);
  await sleep(1500);
  bot.quit();
  log('c4c', 'done');
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('c4c', 'FATAL:', e.message); process.exit(1); });
