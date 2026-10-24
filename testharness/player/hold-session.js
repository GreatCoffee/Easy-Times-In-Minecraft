/**
 * hold-session.js — 假玩家长驻在线（会话七 · testharness/player）
 *
 * 用途：T1/T3 spawn-cycle 判读需要「假玩家持续在线」（无玩家=冻结面
 * findChunksForSpawning 不执行，[SpawnLog] 零行是预期）。进场后长驻 N 秒，
 * 心跳留位，可选gamemode/tp/say 程序件，到点退出。
 *
 * 用法：
 *   & D:\Documents\Softwares\Node\22.22.2\node.exe hold-session.js [host] [port] [username]
 *         [--hold SEC] [--heart SEC] [--gamemode 0|1|2|3] [--tp x y z]
 * 默认：localhost 25565 Harn01/03/04 按 username 传，hold 1800s，heart 30s
 * 标记：`[HarnMark] HOLD begin/end`（op 时 /say 落服务端日志供对齐）
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

function parseArgs(argv) {
  const o = { host: 'localhost', port: 25565, hold: 1800, heart: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hold') { o.hold = Number(argv[i + 1]); i++; }
    else if (a === '--heart') { o.heart = Number(argv[i + 1]); i++; }
    else if (a === '--gamemode') { o.gamemode = argv[i + 1]; i++; }
    else if (a === '--tp') {
      const v = argv.splice(i + 1, 3).map(String);
      if (v.length !== 3) throw new Error('--tp needs x y z');
      o.tp = v;
    }
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
  const mark = (line, useSay) => { log('hold', line); if (useSay) bot.chat(`/say ${line}`); };
  const say = (m) => { try { bot.chat(m); } catch { /* quiet */ } };

  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position) return resolve();
    bot.once('move', resolve);
    setTimeout(resolve, 20000);
  });
  log('hold', `spawned at ${fmt(bot.entity.position)}`);

  // op 时序程序件：gamemode → tp → 均以服务端回执确认但不作判据（本件只保在线）
  if (o.gamemode) say(`/gamemode ${o.gamemode} ${o.username}`);
  if (o.tp) say(`/tp ${o.username} ${o.tp.join(' ')}`);

  mark(`[HarnMark] HOLD begin ts=${Date.now()} hold=${o.hold}s gm=${o.gamemode || 'keep'}`, !!o.gamemode || !!o.tp);

  const heart = setInterval(() => {
    if (bot.entity) log('hold', `heartbeat pos=${fmt(bot.entity.position)} health=${bot.health} food=${bot.food} gamemode=${bot.game && bot.game.gameMode}`);
  }, o.heart * 1000);

  // 死亡自动重生（保持在线人数 +1，避免空窗）
  bot.on('death', () => setTimeout(() => { try { bot._client.write('client_command', { payload: 0 }); } catch (e) { log('hold', 'respawn fail:', e.message); } }, 1000));

  const guard = setTimeout(() => { log('hold', 'HARD EXIT (quit hang guard)'); process.exit(1); }, (o.hold + 20) * 1000);
  await new Promise((r) => setTimeout(r, o.hold * 1000));
  clearInterval(heart);
  clearTimeout(guard);
  const user = o.gamemode ? !!o.tp : false;
  mark(`[HarnMark] HOLD end ts=${Date.now()} stayed=${o.hold}s`, user);
  bot.quit();
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('hold', 'FATAL:', e.message); process.exit(1); });
