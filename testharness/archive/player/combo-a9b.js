/**
 * combo-a9b.js — run27 短验窗（种子修复 + ocelot 门一次性插桩）——主会话 driver
 *
 * 预期（修复后）：
 *   1) 每只猫一条 ocelot-gate 追踪行（tamed/age/counter@首pass）——证明门触达
 *   2) 野生豹猫 age>2400（120s）后走链 kill 行
 *   3) 驯服豹猫零 kill 行（tame-exempt）
 *   4) 鱿鱼（水槽）−9600 种子生效 → 全程无 kill 行 + testfor 幸存
 * 标记：[HarnMark] A9B begin/end
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const OWNER = '8b59d84a-bc34-3993-8e87-029a840f1dca';
const FAR = ['1100', '70', '0'];
const WAIT = 240;

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
  const mark = (m) => { log('a9b', m); bot.chat('/say ' + m); };
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 20000); });

  bot.chat('/tp ETIM_Harn01 -65 66 241');
  await awaitReceipt(bot, [/^Teleported /i], 10000);
  await new Promise((r) => setTimeout(r, 2000));
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);

  const cmds = [
    '/gamerule doMobSpawning true',
    '/effect ETIM_Harn01 minecraft:resistance 900000 254 true',
    `/summon Ocelot ${bx + 1.5} ${by + 1.2} ${bz + 1}`,
    `/summon Ocelot ${bx - 1.5} ${by + 1.2} ${bz + 1} {OwnerUUID:"${OWNER}"}`,
    `/fill ${bx + 4} ${by + 1} ${bz + 4} ${bx + 8} ${by + 2} ${bz + 8} minecraft:stone 0 hollow`,
    `/fill ${bx + 5} ${by + 1} ${bz + 5} ${bx + 7} ${by + 2} ${bz + 7} minecraft:water`,
    `/summon Squid ${bx + 6} ${by + 1.5} ${bz + 6}`,
  ];
  for (const c of cmds) { bot.chat(c); await new Promise((r) => setTimeout(r, 900)); }
  log('a9b', 'phase1 cmds sent');

  mark(`[HarnMark] A9B begin ts=${Date.now()} tp=${FAR.join(',')}`);
  bot.chat(`/tp ETIM_Harn01 ${FAR.join(' ')}`);
  await awaitReceipt(bot, [/^Teleported /i, /commands\.tp\.success/], 10000);

  await new Promise((r) => setTimeout(r, WAIT * 1000));
  mark(`[HarnMark] A9B end ts=${Date.now()} stayed=${WAIT}s`);
  bot.quit();
  await new Promise((r) => setTimeout(r, 3000));

  const bot2 = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await new Promise((r) => { if (bot2.entity && bot2.entity.position) return r(); bot2.once('move', r); setTimeout(r, 20000); });
  bot2.chat('/testfor @e[type=Ocelot]'); await new Promise((r) => setTimeout(r, 700));
  bot2.chat('/testfor @e[type=Squid,x=-100,r=64]'); await new Promise((r) => setTimeout(r, 700));
  await awaitReceipt(bot2, [/Found|found nothing/], 5000);
  log('a9b', 'phase3 done');
  bot2.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a9b', 'FATAL:', e.message); process.exit(1); });
