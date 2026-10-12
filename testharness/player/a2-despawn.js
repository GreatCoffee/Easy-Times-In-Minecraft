/**
 * a2-despawn.js — run27 A2「消散击杀」假玩家通道（会话七 · testharness/player）
 *
 * 依任务书：mineflayer 假玩家离开 ≥16 格 + 视线遮断（/tp 至地下或障碍后方），
 * 然后原地保持存活至窗口结束。`mob despawn kill counter=… distSq>256` 行的判读
 * 由主会话判读器读服务端 latest.log 完成——本脚本只负责动作与对齐标记。
 *
 * op/tp 判定（修订·台账 185）：**以服务端系统 chat 回执为唯一凭据**——
 * 匹配 translate `commands.tp.success.*`（文本 /Teleported/）或拒绝文案；
 * 不再依赖 entity.position（位置包可能迟到 >9s，首帧停 0,0,0）。
 * 回执成功 → [HarnMark] begin/end 走 /say 落进服务端 latest.log。
 *
 * 用法：
 *   & D:\Documents\Softwares\Node\22.22.2\node.exe a2-despawn.js [host] [port] [username] [--tp x y z | --tp-rel dx dy dz] [--wait SEC]
 * 默认：localhost 25565 ETIM_Harn01，wait 150s（任务书：每项窗口 ≥90s）
 * 判读对齐标记：`[HarnMark] A2 begin ts=… tp=…` → `[HarnMark] A2 end ts=… stayed=…s`
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

function parseArgs(argv) {
  const o = { host: 'localhost', port: 25565, username: 'ETIM_Harn01', wait: 150 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tp') {
      const v = argv.splice(i + 1, 3).map(Number);
      if (v.some(x => Number.isNaN(x))) throw new Error('--tp needs x y z numbers');
      o.tp = v; o.tpRel = false; // splice 已移除 flag 后 3 值，循环自然 ++ 正落下一个 token
    } else if (a === '--tp-rel') {
      const v = argv.splice(i + 1, 3).map(String); // 支持 ~
      if (v.length !== 3) throw new Error('--tp-rel needs dx dy dz');
      o.tp = v; o.tpRel = true;
    } else if (a === '--wait') { o.wait = Number(argv[i + 1]); i++; }
    else if (!o.hostSeen) { o.host = a; o.hostSeen = true; }
    else if (!o.portSeen) { o.port = Number(a); o.portSeen = true; }
    else { o.username = a; }
  }
  return o;
}

/** 等服务端对 /tp 的下一个回执（成功/拒绝/未知），10s 兜底超时 */
function awaitTpReceipt(bot) {
  return new Promise((resolve) => {
    const done = (result) => { clearTimeout(timer); off(); resolve(result); };
    const timer = setTimeout(() => done({ kind: 'timeout' }), 10000);
    const handler = (msg) => {
      const json = (msg && msg.json) || null;
      const translate = (msg && msg.translate) || (json && json.translate) || '';
      const text = msg.toString();
      if (/^commands\.tp\.success/.test(translate)) return done({ kind: 'ok', text, translate, json });
      if (/^Teleported /i.test(text)) return done({ kind: 'ok', text, translate, json });
      if (/permission to use this command|Unknown command/i.test(text)) return done({ kind: 'denied', text });
    };
    bot.on('message', handler);
    const off = () => bot.off('message', handler);
  });
}

const fmt = (p) => p ? `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}` : '(unknown)';

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const bot = await createHarnBot({ host: o.host, port: o.port, username: o.username });
  const mark = (line, useSay) => { log('a2', line); if (useSay) bot.chat(`/say ${line}`); };

  // 等 spawn：登录后首个 position 更新（或 20s 兜底）——仅作参考展示，不是任何判定凭据
  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position) return resolve();
    bot.once('move', resolve);
    setTimeout(resolve, 20000);
  });
  log('a2', `spawned (client-side view) at ${fmt(bot.entity.position)}`);

  // /tp 判定：以服务端回执为凭据
  let hasOp = false, tpText = 'none';
  if (o.tp) {
    const target = o.tpRel ? o.tp.join(' ') : o.tp.join(' ');
    bot.chat(`/tp ${o.username} ${target}`);
    const receipt = await awaitTpReceipt(bot);
    hasOp = receipt.kind === 'ok';
    if (hasOp) tpText = `${o.tp.join(',')}（回执：${receipt.text}）`;
    log('a2', hasOp
      ? `tp OK（服务端回执凭据）${tpText}——≥16 格 + 视线遮断由落点保证`
      : `tp ${receipt.kind}（回执：${receipt.text || '(no receipt)'}）— 降级：仅标记+保持，判读时须注明降级`);
  }

  mark(`[HarnMark] A2 begin ts=${Date.now()} tp=${hasOp ? o.tp.join(',') : 'none'}`, hasOp);

  const heart = setInterval(() => {
    if (bot.entity) log('a2', `heartbeat pos=${fmt(bot.entity.position)} health=${bot.health} food=${bot.food}`);
  }, 15000);

  // 连接断开后速断；总保险：wait+15s 无论挂在哪里（已知 bot.quit() 有挂起案例，台账 185 后续）都强退
  bot.on('end', () => setTimeout(() => process.exit(0), 500));
  setTimeout(() => { log('a2', 'HARD EXIT (quit hang guard)'); process.exit(1); }, (o.wait + 15) * 1000);

  await new Promise((r) => setTimeout(r, o.wait * 1000));
  clearInterval(heart);
  mark(`[HarnMark] A2 end ts=${Date.now()} stayed=${o.wait}s`, hasOp);
  bot.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('a2', 'FATAL:', e.message); process.exit(1); });
