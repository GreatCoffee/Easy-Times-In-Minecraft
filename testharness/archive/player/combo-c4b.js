/**
 * combo-c4b.js — run27 C4 专窗（雨中固定位置双牛对照）——主会话 driver
 *   near 牛 = 池边 3 格内（water 扫描盒可及）；far 牛 = x+16（扫描盒不可及）
 *   /weather rain 600 全程；watch: near water→1.00/稳 vs far −0.005/scan 递减
 * 标记：[HarnMark] C4B begin/end
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

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
  const mark = (m) => { log('c4b', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -60 68 232');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('c4b', `base=(${bx},${by},${bz})`);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    '/fill -74 65 230 -64 71 242 minecraft:air 0',            // 清上轮池区
    '/weather rain 600',
    `/fill ${bx + 3} ${by + 1} ${bz + 3} ${bx + 6} ${by + 2} ${bz + 6} minecraft:stone 0 hollow`,
    `/fill ${bx + 4} ${by + 1} ${bz + 4} ${bx + 5} ${by + 2} ${bz + 5} minecraft:water`,
    `/summon Cow ${bx + 1.5} ${by + 1.2} ${bz + 4.5}`,        // near（池边 2~3 格 → 扫描盒±1 内有水）
    `/summon Cow ${bx + 17.5} ${by + 1.2} ${bz + 4.5}`,       // far（> 扫描盒）
    `/summon Sheep ${bx + 2.5} ${by + 1.2} ${bz + 0.5}`,      // near 辅证
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('c4b', 'phase1 cmds sent');
  bot.chat(`/say [HarnMark] C4B begin ts=${Date.now()}`);

  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/i], 10000);

  await new Promise((r) => setTimeout(r, 300 * 1000));
  bot.chat(`/say [HarnMark] C4B end ts=${Date.now()} stayed=300s`);
  bot.quit();
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('c4b', 'FATAL:', e.message); process.exit(1); });
