#!/usr/bin/env node
/**
 * sworddecay-w34-probe.js — W-34h 选择器面一次性排障（非判窗）
 *
 * 目的：`/etest attack @e[type=zombie,r=5,c=1]` 恒 NO_TARGET（列表空）。探针逐层取证：
 *   /testfor @e[type=zombie]           ← 类型面
 *   /testfor @e[type=zombie,c=1]       ← 类型+c
 *   /testfor @e[type=zombie,r=5]       ← 类型+半径
 *   /testfor @e[type=!player,r=5]      ← 反选面
 *   /entitydata @e[type=zombie,c=1] {} ← 实体确在
 *   /etest attack（四种选择器形态）    ← 真实到 TestDriver 的形态
 * 只读产品面；收口 props 与缓存整档还原 + 世界目录删。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'sworddecay-w34-probe';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD_NAME = 'sworddecay34probe';
const PORT = 25565;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
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
    const done = await srv.ready;
    if (!done) throw new Error('no Done(');
    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: 'ETIM_W34P' });
    await sleep(2000);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doTileDrops false');
    srv.send('difficulty 0');
    srv.send(`op ETIM_W34P`);
    srv.send(`gamemode 0 ETIM_W34P`);
    await sleep(1200);

    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y) + 8, bz = Math.floor(p0.z);
    for (const dx of [-1, 0, 1, 2]) {
      srv.send(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:dirt 0`);
      srv.send(`setblock ${bx + dx} ${by} ${bz} minecraft:air 0`);
      srv.send(`setblock ${bx + dx} ${by + 1} ${bz} minecraft:air 0`);
    }
    await sleep(800);
    srv.send(`tp ETIM_W34P ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1600);
    const p1 = bot.entity.position;
    log('setup', `bot=(${p1.x},${p1.y},${p1.z}) platform=(${bx},${by},${bz})`);

    const marker = srv.all.length;
    srv.send(`summon zombie ${bx + 1.5} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b}`);
    await sleep(1500);
    srv.send(`entitydata @e[type=zombie,c=1] {}`);
    await sleep(700);
    srv.send(`testfor @e[type=zombie]`);
    await sleep(500);
    srv.send(`testfor @e[type=zombie,c=1]`);
    await sleep(500);
    srv.send(`testfor @e[type=zombie,r=5]`);
    await sleep(500);
    srv.send(`testfor @e[type=!player,r=5]`);
    await sleep(500);
    srv.send(`testfor @e`);
    await sleep(700);
    for (const sel of ['@e[type=zombie,r=5,c=1]', '@e[type=zombie,r=5]', '@e[type=zombie,c=1]', '@e[type=!player,r=5,c=1]']) {
      srv.send(`etest attack ${sel} ETIM_W34P`);
      await sleep(1400);
    }
    await sleep(800);
    for (const l of srv.all.slice(marker)) out.push(stripPrefix(l));
  } catch (e) {
    log('probe', 'FATAL', e && e.stack ? e.stack : e);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1000);
    await srv.stop();
    fs.writeFileSync(path.join(OUT, TAG + '-segment.txt'), out.join('\n') + '\n', 'utf8');
    fs.writeFileSync(PROPS, propsBefore);
    for (const [n, buf] of side) fs.writeFileSync(path.join(ROOT, 'run', n), buf);
    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) fs.rmSync(worldDir, { recursive: true, force: true });
    console.log('--- segment ---');
    out.forEach((l) => console.log(l));
    console.log('props restored', sha256(fs.readFileSync(PROPS)) === sha256(propsBefore));
    console.log('world removed', !fs.existsSync(worldDir));
  }
  process.exit(0);
}

main().catch((e) => { log('boot', 'FATAL', e && e.stack ? e.stack : e); process.exit(1); });
