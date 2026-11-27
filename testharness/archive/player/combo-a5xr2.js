/**
 * combo-a5xr2.js — run27 A5X-r2 + C4-c 合并定谳窗（主会话）
 *
 * 改正三处：
 *   ① re-entry 编排：P1 以 tp (1100,70,0) **收尾再 quit**——logout 落在远点，
 *      所有后续 join 都在动物 1024 半径外，wall 重置不再发生（A5X-r1 的 v2 教训）；
 *   ② C4「near」= **水谷内召唤**（自身格=水，扫描盒自含 dx0 —— A9A5 修 5×5→±1 的
 *      同款坑第二次）；
 *   ③ livestock-value 追踪行（每 1200t 全值读数）随新 build 上岗。
 *
 * P1: join → effect/gamerule → 雨重挂 → 池重建 → 召唤 near-cow(in water)/
 *     far-cow/near-sheep/A5组(cow, sheep, wolf, wild cat, tame cat)/fresh 鱿鱼
 *     → mark begin → **tp far → quit**（离线 600 s）
 * P2: rejoin（远点）→ mark end → 在场 180 s（kill-pass p@1100 触发 A5 kill 面）
 * P3: testfor 全族清点 → quit
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca';
const FAR = ['1100', '70', '0'];

function awaitReceipt(bot, patterns, ms) {
  return new Promise((resolve) => {
    const done = (r) => { clearTimeout(t); bot.off('message', h); resolve(r); };
    const texts = [];
    const t = setTimeout(() => done(texts), ms);
    const h = (msg) => { const x = String(msg || ''); if (patterns.some((re) => re.test(x))) texts.push(x); };
    bot.on('message', h);
  });
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark = (m) => { log('a5x2', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -60 68 232');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('a5x2', `base=(${bx},${by},${bz})`);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    '/weather rain 900',
    `/summon Cow ${bx + 4.5} ${by + 1.3} ${bz + 4.5}`,      // C4 near＝水谷内（自身格=水）
    `/summon Cow ${bx + 22.5} ${by + 1.2} ${bz + 2}`,       // C4 far（>扫描盒）
    `/summon Sheep ${bx + 4.5} ${by + 1.3} ${bz + 5.5}`,    // near 邻证
    `/summon Wolf ${bx - 0.5} ${by + 1.2} ${bz - 0.5}`,     // A5
    `/summon Ocelot ${bx + 1.5} ${by + 1.2} ${bz + 2.5}`,   // A9 野生
    `/summon Ocelot ${bx - 1.5} ${by + 1.2} ${bz + 2.5} {OwnerUUID:"${OWNER}"}`, // A9 驯服
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('a5x2', 'phase1 cmds sent');

  mark(`[HarnMark] A5X2 begin ts=${Date.now()} offline=600`);
  bot.chat(`/tp ETIM_Harn01 ${FAR.join(' ')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  // —— 离线窗 600 s（spawn chunk 迁移区 (−60,232) 恒 tick）
  await new Promise((r) => setTimeout(r, 600 * 1000));

  // —— 重入（join 落在远点＝上次 logout）
  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  const mark2 = (m) => { log('a5x2', m); bot2.chat('/say ' + m); };
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  mark2(`[HarnMark] A5X2 end ts=${Date.now()} mode=reentry`);
  await new Promise((r) => setTimeout(r, 180 * 1000));
  bot2.quit();
  await new Promise((r) => setTimeout(r, 2000));

  // —— P3 幸存清点（tp 到动物场定格）
  const bot3 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot3.entity && bot3.entity.position) return r(); bot3.once('move', r); setTimeout(r, 20000); });
  bot3.chat('/tp ETIM_Harn01 -60 68 232');
  await awaitReceipt(bot3, [/^Teleported /i], 8000);
  await new Promise((r) => setTimeout(r, 3000));
  for (const type of ['Cow', 'Sheep', 'Wolf', 'Ocelot', 'Squid']) {
    bot3.chat(`/testfor @e[type=${type}]`);
    await new Promise((r) => setTimeout(r, 700));
  }
  await awaitReceipt(bot3, [/Found|found nothing/], 6000);
  log('a5x2', 'phase3 done');
  bot3.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a5x2', 'FATAL:', e.message); process.exit(1); });
