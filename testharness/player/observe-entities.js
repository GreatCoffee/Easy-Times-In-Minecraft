/**
 * observe-entities.js — 实体 spawn/gone 事件流观察器（会话七 · testharness/player，备器）
 *
 * 供 A5（动物年龄墙）与 A10 反测（vanilla 128 格直杀）的观察项连读：假玩家
 * 进服后在 N 秒窗口内统计 entitySpawn/entityGone 事件流，按实体类计数 +
 * 存活时长，stdout 逐秒序列——不落盘（主会话判读器吃 latest.log，此件是
 * 对照观察面）。
 *
 * 用法：
 *   & D:\Documents\Softwares\Node\22.22.2\node.exe observe-entities.js [host] [port] [username] [--wait SEC]
 * 默认：localhost 25565 ETIM_Harn01，wait 60s
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

function parseArgs(argv) {
  const o = { host: 'localhost', port: 25565, username: 'ETIM_Harn01', wait: 60 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wait') { o.wait = Number(argv[i + 1]); i++; }
    else if (!o.hostSeen) { o.host = a; o.hostSeen = true; }
    else if (!o.portSeen) { o.port = Number(a); o.portSeen = true; }
    else { o.username = a; }
  }
  return o;
}

// 实体类名：mineflayer 的 entity.name 是 lowercase registry 名（如 'zombie'），
// 缺失时退回 displayName / type
const keyOf = (e) => e.name || e.displayName || e.type || 'unknown';

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const bot = await createHarnBot({ host: o.host, port: o.port, username: o.username });

  const spawnedCount = {};   // kind → 累计 spawn 次数
  const goneCount = {};      // kind → 累计 gone 次数
  const alive = new Map();   // uuid → { kind, bornAt }
  const types = new Map();   // kind → 当前在场数

  bot.on('entitySpawn', (e) => {
    const k = keyOf(e);
    spawnedCount[k] = (spawnedCount[k] || 0) + 1;
    types.set(k, (types.get(k) || 0) + 1);
    alive.set(e.uuid || e.id, { kind: k, bornAt: Date.now() });
    log('obs', `spawn kind=${k} id=${String(e.id)} pos=${e.position ? `${e.position.x.toFixed(0)},${e.position.y.toFixed(0)},${e.position.z.toFixed(0)}` : '?'}`);
  });

  bot.on('entityGone', (e) => {
    const k = keyOf(e);
    goneCount[k] = (goneCount[k] || 0) + 1;
    types.set(k, Math.max(0, (types.get(k) || 0) - 1));
    const a = alive.get(e.uuid || e.id);
    const life = a ? ((Date.now() - a.bornAt) / 1000).toFixed(1) + 's' : '?';
    if (a) alive.set(e.uuid || e.id, undefined);
    log('obs', `gone   kind=${k} id=${String(e.id)} life=${life}`);
  });

  // 逐秒序列：窗口秒数 + 在场 kind 汇总
  const total = Object.values(spawnedCount).reduce((a, b) => a + b, 0);
  const end = Date.now() + o.wait * 1000;
  const tick = setInterval(() => {
    const inView = [...types.entries()].filter(([, n]) => n > 0).map(([k, n]) => `${k}x${n}`).join(' ');
    log('obs', `t=${Math.round((o.wait * 1000 - (end - Date.now())) / 1000)}s in-view=[${inView || '∅'}] spawnedTotal=${total}`);
  }, 1000);

  await new Promise((r) => setTimeout(r, o.wait * 1000));
  clearInterval(tick);

  log('obs', '=== 窗口总结 ===');
  log('obs', `spawned: ${JSON.stringify(spawnedCount)}`);
  log('obs', `gone:    ${JSON.stringify(goneCount)}`);
  log('obs', `left:    ${[...types.entries()].filter(([, n]) => n > 0).map(([k, n]) => `${k}x${n}`).join(' ') || '∅'}`);
  bot.on('end', () => setTimeout(() => process.exit(0), 500));
  setTimeout(() => process.exit(1), (o.wait + 15) * 1000); // quit 挂 guard
  bot.quit();
  setTimeout(() => process.exit(0), 1000);
}

main().catch((e) => { log('obs', 'FATAL:', e.message); process.exit(1); });
