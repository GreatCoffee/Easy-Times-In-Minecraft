/**
 * a2-despawn.js — run27 A2「消散击杀」假玩家通道（会话七 · testharness/player）
 *
 * 依任务书：mineflayer 假玩家离开 ≥16 格 + 视线遮断（/tp 至地下或障碍后方），
 * 然后原地保持存活至窗口结束。`mob despawn kill counter=… distSq>256` 行的判读
 * 由主会话判读器读服务端 latest.log 完成——本脚本只负责动作与对齐标记。
 *
 * 前置（主会话措置，二选一）：
 *   - RCON/控制台先执行 `/op <username>`（/tp 需要权限级 2）；本脚本自动用
 *     「落点位置变化」做 op 探测，无 op 自动降级为「不 tp，仅标记 + 保持」。
 *
 * 用法：
 *   & D:\Documents\Softwares\Node\22.22.2\node.exe a2-despawn.js [host] [port] [username] [--tp x y z] [--wait SEC]
 * 默认：localhost 25565 ETIM_Harn01，wait 150s（任务书：每项窗口 ≥90s）
 * 判读对齐标记：进服后 `[HarnMark] A2 begin`，结束 `[HarnMark] A2 end`；
 * 有 op 时两条标记经 /say 落进服务端日志（latest.log 可 grep），无 op 仅 stdout。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

function parseArgs(argv) {
  const o = { host: 'localhost', port: 25565, username: 'ETIM_Harn01', wait: 150 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tp') {
      const [x, y, z] = argv.splice(i + 1, 3).map(Number);
      if ([x, y, z].some(v => Number.isNaN(v))) throw new Error('--tp needs x y z numbers');
      o.tp = [x, y, z]; i = i + 3;
    } else if (a === '--wait') { o.wait = Number(argv[i + 1]); i++; }
    else if (!o.hostSeen) { o.host = a; o.hostSeen = true; }
    else if (!o.portSeen) { o.port = Number(a); o.portSeen = true; }
    else { o.username = a; }
  }
  return o;
}

const fmt = (p) => p ? `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}` : '(unknown)';

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const bot = await createHarnBot({ host: o.host, port: o.port, username: o.username });
  const mark = (line, useSay) => { if (useSay) bot.chat(`/say ${line}`); log('a2', line); };

  // 等 spawn：登录后首个 position 更新（或 20s 兜底）
  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position) return resolve();
    bot.once('move', resolve);
    setTimeout(resolve, 20000);
  });
  log('a2', `spawned at ${fmt(bot.entity.position)}`);

  // op 探测：/tp 成功的判据 = 位置真的到了落点（±0.1）
  let hasOp = false;
  if (o.tp) {
    const [x, y, z] = o.tp;
    bot.chat(`/tp ${o.username} ${x} ${y} ${z}`);
    await new Promise((r) => setTimeout(r, 3000));
    const p = bot.entity && bot.entity.position;
    hasOp = !!p && Math.abs(p.x - x) < 0.1 && Math.abs(p.y - y) < 0.1 && Math.abs(p.z - z) < 0.1;
    log('a2', hasOp
      ? `tp OK，落点 ${fmt(p)}（≥16 格 + 视线遮断由落点保证）`
      : 'tp FAILED（无 op 或落点未到）— 降级：仅标记+保持，判读时须注明降级');
  }

  mark(`[HarnMark] A2 begin ts=${Date.now()} tp=${hasOp ? o.tp.join(',') : 'none'}`, hasOp);

  const heart = setInterval(() => {
    if (bot.entity) log('a2', `heartbeat pos=${fmt(bot.entity.position)} health=${bot.health} food=${bot.food}`);
  }, 15000);

  await new Promise((r) => setTimeout(r, o.wait * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A2 end ts=${Date.now()} stayed=${o.wait}s`, hasOp);
  bot.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a2', 'FATAL:', e.message); process.exit(1); });
