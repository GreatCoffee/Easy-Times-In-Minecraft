#!/usr/bin/env node
/**
 * reeds-w35-probe.js — W-35c 「+1 来源」单点对照（非判窗）
 *
 * 命题：锈剪破 reeds 的 dur Δ = 9（判窗实测），而 R196 判值应为 8（decay 1.0 × 0.08 × 100）。
 * 假设：多出的 1 来自 1.12 `ItemShears.onBlockDestroyed` 第一行 **无条件** `stack.damageItem(1, …)`，
 *       而 ETIMItemShearsRusted 的 override 先调 super 再叠 ETIM decay ⇒ 1 + 8。
 * 检验：`miningReform=false` 开窗（ETIM 衰减整段早退，`ETIMItemShearsRusted:117`）——
 *       此时破 reeds 若 dur Δ = **1** 且 0 条 tool decay 行，即直证 +1 属 vanilla super 行。
 * 收口：cfg/props/三缓存整档还原 + 世界目录删。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'reeds-w35-probe';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD_NAME = 'reeds35probe';
const PORT = 25565;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]:\s*/, '');

const RE = {
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)(?:\/(\d+))?/,
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  digStop: /\[TestLog\] step=dig-stop /,
  found: /Successfully found the block/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
};

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}

async function probe(srv, botName) {
  const from = srv.all.length;
  srv.send('etest blockprobe ' + botName);
  const line = await srv.waitFor(RE.probeDur, 6000, from);
  if (!line) return null;
  const m = RE.probeDur.exec(line);
  return { line: stripPrefix(line), held: m[2], damage: m[3] === '-' ? -1 : +m[3], max: m[4] ? +m[4] : -1 };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, phase: 'G-off', until: 'W-35c +1 source' };
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  const sideBefore = ['ops.json', 'usercache.json', 'usernamecache.json']
    .filter((n) => fs.existsSync(path.join(ROOT, 'run', n)))
    .map((n) => [n, fs.readFileSync(path.join(ROOT, 'run', n))]);

  // cfg：blockDebugLog=true（probe 面）+ miningReform=false（ETIM 衰减早退）
  let cfg = fs.readFileSync(CFG, 'utf8');
  if (!/B:blockDebugLog=false/.test(cfg)) throw new Error('cfg has no B:blockDebugLog=false');
  cfg = cfg.replace('B:blockDebugLog=false', 'B:blockDebugLog=true');
  if (!/B:miningReform=true/.test(cfg)) throw new Error('cfg has no B:miningReform=true');
  cfg = cfg.replace('B:miningReform=true', 'B:miningReform=false');
  fs.writeFileSync(CFG, cfg, 'utf8');
  ev.cfgEdit = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };

  let props = setProp(propsBefore.toString('utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(props)) props = setProp(props, 'spawn-protection', '0');
  else props = props.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, props, 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.ready)) throw new Error('no Done(');
    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: 'ETIM_W35P' });
    await sleep(2000);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send(`gamemode 0 ETIM_W35P`);
    srv.send(`effect ETIM_W35P clear`);
    srv.send(`etest food 6 6 ETIM_W35P`);
    srv.send(`etest level 0 ETIM_W35P`);
    await sleep(1400);

    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y) + 8, bz = Math.floor(p0.z);
    for (const dx of [-1, 0, 1, 2]) {
      srv.send(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:dirt 0`);
      srv.send(`setblock ${bx + dx} ${by} ${bz} minecraft:air 0`);
      srv.send(`setblock ${bx + dx} ${by + 1} ${bz} minecraft:air 0`);
    }
    await sleep(800);
    srv.send(`tp ETIM_W35P ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1600);
    const p1 = bot.entity.position;
    ev.pos = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };

    const BX = bx + 2, BY = by, BZ = bz, WX = BX - 1, SY = BY - 1;
    const steps = [
      `setblock ${BX} ${SY - 1} ${BZ} minecraft:stone 0`,
      `setblock ${WX} ${SY - 1} ${BZ} minecraft:stone 0`,
      `setblock ${WX - 1} ${SY} ${BZ} minecraft:stone 0`,
      `setblock ${WX} ${SY} ${BZ - 1} minecraft:stone 0`,
      `setblock ${WX} ${SY} ${BZ + 1} minecraft:stone 0`,
      `setblock ${BX} ${SY} ${BZ} minecraft:sand 0`,
      `setblock ${BX} ${BY} ${BZ} minecraft:air 0`,
      `setblock ${BX} ${BY + 1} ${BZ} minecraft:air 0`,
      `setblock ${WX} ${BY} ${BZ} minecraft:air 0`,
      `setblock ${WX} ${SY} ${BZ} minecraft:water 0`,
    ];
    for (const s of steps) { srv.send(s); await sleep(90); }
    await sleep(400);
    const setFrom = srv.all.length;
    srv.send(`setblock ${BX} ${BY} ${BZ} minecraft:reeds 0`);
    ev.placed = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
    await sleep(500);

    const holdFrom = srv.all.length;
    srv.send('etest hold etim:shears_rusted_iron ETIM_W35P');
    await sleep(700);
    ev.hold = await probe(srv, 'ETIM_W35P');

    const digFrom = srv.all.length;
    srv.send(`etest dig ${BX} ${BY} ${BZ} ETIM_W35P`);
    await srv.waitFor(RE.digStop, 15000, digFrom);
    await sleep(1600);
    ev.after = await probe(srv, 'ETIM_W35P');

    const tbFrom = srv.all.length;
    srv.send(`testforblock ${BX} ${BY} ${BZ} minecraft:air`);
    const tb = await srv.waitFor(/Successfully found the block|The block at/, 5000, tbFrom);
    ev.blockGone = !!tb && RE.found.test(tb);

    const seg = srv.all.slice(digFrom);
    ev.decayRows = seg.filter((l) => RE.decay.test(l)).map(stripPrefix);
    ev.denyRows = seg.filter((l) => /\[MiningLog\] mine deny/.test(l)).map(stripPrefix);
    ev.speedRows = seg.filter((l) => /\[MiningLog\] mine speed/.test(l)).map(stripPrefix);
    ev.durDelta = ev.hold && ev.after ? ev.after.damage - ev.hold.damage : null;
    ev.holdLine = ev.hold && ev.hold.line;
    ev.afterLine = ev.after && ev.after.line;
    ev.verdict = (ev.durDelta === 1 && ev.decayRows.length === 0 && ev.blockGone) ? 'PLUS_ONE_IS_VANILLA_SUPER' : 'UNEXPECTED';
  } catch (e) {
    ev.fatal = e && e.stack ? e.stack : String(e);
    log('probe', 'FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1000);
    ev.stop = await srv.stop();
    fs.writeFileSync(CFG, cfgBefore);
    fs.writeFileSync(PROPS, propsBefore);
    for (const [n, buf] of sideBefore) fs.writeFileSync(path.join(ROOT, 'run', n), buf);
    ev.cfgRestored = sha256(fs.readFileSync(CFG)) === sha256(cfgBefore);
    ev.propsRestored = sha256(fs.readFileSync(PROPS)) === sha256(propsBefore);
    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) fs.rmSync(worldDir, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(worldDir);
    // 证据最后落盘（含收口复核面，避免写到还原之前）
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log('probe', 'hold=' + ev.holdLine);
    log('probe', 'after=' + ev.afterLine);
    log('probe', 'durΔ=' + ev.durDelta + ' decayRows=' + ev.decayRows.length + ' gone=' + ev.blockGone);
    log('probe', 'cfgRestored=' + ev.cfgRestored + ' propsRestored=' + ev.propsRestored + ' worldRemoved=' + ev.worldRemoved);
    log('probe', 'VERDICT ' + ev.verdict);
  }
  process.exit(0);
}

main().catch((e) => { log('boot', 'FATAL', e && e.stack ? e.stack : e); process.exit(1); });
