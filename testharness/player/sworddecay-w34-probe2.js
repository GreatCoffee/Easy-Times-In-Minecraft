#!/usr/bin/env node
/**
 * sworddecay-w34-probe2.js — W-34h 选择器面第二轮（类型名 vs 半径 vs 权限面三分）
 *
 * 第一轮已证：console 的 `@e[type=zombie]` 世界范围 "found nothing"（但同 console 的
 * `kill @e[type=!player]` 在开窗时确实杀掉了自然僵尸）⇒ 疑点集中在 `type=zombie` 名面
 * 与「假人作 sender」的权限/位置面。本轮一次 boot 内逐层取证：
 *   A 召唤后立刻 `/entitydata @e[type=!player,c=1] {}`（拿实体注册 id）
 *   B console `/testfor @e[type=!player]`（世界面、排除玩家）
 *   C 假人 chat `/testfor @e[type=!player,c=1]`（玩家作 sender 的权限/位置面）
 *   D `/etest attack @e[type=!player,c=1]`（无半径、反选面）
 *   E `/etest attack @e[type=zombie,c=1]`（类型名面）
 *   F 客户端实体表规模（mineflayer `bot.entities`）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'sworddecay-w34-probe2';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD_NAME = 'sworddecay34probe2';
const PORT = 25565;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]:\s*/, '');

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const propsBefore = fs.readFileSync(PROPS);
  const side = ['ops.json', 'usercache.json', 'usernamecache.json']
    .map((n) => [n, fs.readFileSync(path.join(ROOT, 'run', n))]);

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const out = [];
  try {
    if (!(await srv.ready)) throw new Error('no Done(');
    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: 'ETIM_W34Q' });
    await sleep(2000);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doTileDrops false');
    srv.send('difficulty 0');
    srv.send('op ETIM_W34Q');
    srv.send('gamemode 0 ETIM_W34Q');
    await sleep(1200);

    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y) + 8, bz = Math.floor(p0.z);
    for (const dx of [-1, 0, 1, 2]) {
      srv.send(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:dirt 0`);
      srv.send(`setblock ${bx + dx} ${by} ${bz} minecraft:air 0`);
      srv.send(`setblock ${bx + dx} ${by + 1} ${bz} minecraft:air 0`);
    }
    await sleep(800);
    srv.send(`tp ETIM_W34Q ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1600);
    const p1 = bot.entity.position;
    log('setup', `bot=(${p1.x},${p1.y},${p1.z}) platform=(${bx},${by},${bz})`);

    const marker = srv.all.length;
    console.log('=== A: summon + entitydata (console) ===');
    srv.send(`summon zombie ${bx + 1.5} ${by} ${bz + 0.5}`);
    await sleep(1200);
    srv.send('entitydata @e[type=!player,c=1] {}');
    await sleep(900);
    console.log('=== B: console testfor @e[type=!player] ===');
    srv.send('testfor @e[type=!player]');
    await sleep(700);
    console.log('=== C: bot chat testfor @e[type=!player,c=1] ===');
    bot.chat('/testfor @e[type=!player,c=1]');
    await sleep(1000);
    console.log('=== D: etest attack @e[type=!player,c=1] ===');
    srv.send('etest attack @e[type=!player,c=1] ETIM_W34Q');
    await sleep(1500);
    console.log('=== E: etest attack @e[type=zombie,c=1] ===');
    srv.send('etest attack @e[type=zombie,c=1] ETIM_W34Q');
    await sleep(1500);
    console.log('=== F: client entity table ===');
    const snap = Object.values(bot.entities)
      .filter((e) => e && e.id !== bot.entity.id)
      .map((e) => ({ id: e.id, name: e.name, type: e.type, dist: e.position ? +bot.entity.position.distanceTo(e.position).toFixed(2) : null }));
    log('client', 'size=' + Object.keys(bot.entities).length, JSON.stringify(snap));
    await sleep(600);
    for (const l of srv.all.slice(marker)) out.push(stripPrefix(l));
  } catch (e) {
    log('probe2', 'FATAL', e && e.stack ? e.stack : e);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1000);
    await srv.stop();
    fs.writeFileSync(path.join(OUT, TAG + '-segment.txt'), out.join('\n') + '\n', 'utf8');
    fs.writeFileSync(PROPS, propsBefore);
    for (const [n, buf] of side) fs.writeFileSync(path.join(ROOT, 'run', n), buf);
    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) fs.rmSync(worldDir, { recursive: true, force: true });
  }
  process.exit(0);
}

main().catch((e) => { log('boot', 'FATAL', e && e.stack ? e.stack : e); process.exit(1); });
