#!/usr/bin/env node
/**
 * w7r3-run.js — mob 批三轮重验（仅 W7-R · C-1 v3）driver。
 *
 * 判据正本：三轮任务书（W7-R-a/b/c）
 * 钉值：jar 625,928 B @ 2026-10-25 00:45:12｜SHA256 872F9B57…｜commit bb26053
 *
 * 用法：
 *   node testharness/player/w7r3-run.js w7r3 [nSkel=6]
 *   node testharness/player/w7r3-run.js clean
 *
 * 受控面（C-2/C-3 规避在案）：
 *   - lord 由 RCON 每 0.9 s tp 钉在 (SITE.x+2.5, SITE.y, SITE.z)，防走失出 16 格盒 → 假静默
 *   - 目标切换用 creative（kill 会让假人从场地上空重生落回、被 lord 击杀 → 自污染）
 *   - 6 只 NoAI 骷髅按实时坐标环布 r=5，PersistenceRequired 防 troop-despawn 回收
 * 通道：[AILog] frenzy set（mobDebugLog）；判窗边界用 /say W7R3|<win>|begin|end 落服务端日志。
 * 纪律：实体面一律 chat；RCON 只跑无位置语义（time/gamerule/op）+ 钉 lord 的 tp（绝对坐标）。
 * 输出：build-logs/w7r3-driver.log（追加）+ 控制台。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'w5r', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'w7r3-driver.log');
const HOST = '127.0.0.1', MC_PORT = 25565, RCON_PORT = 25575, RCON_PASS = 'etim27';
/** 上两轮 W4/W5/W7 站址，保持可比 */
const SITE = { x: -65.5, y: 68, z: 255.5 };
/** lord 钉点（= 召唤点） */
const LORD = { x: Math.floor(SITE.x) + 2.5, y: SITE.y, z: SITE.z };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outLines = [];
function say(...a) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ` + a.join(' ');
  console.log(line);
  outLines.push(line);
  flush();
}
function flush() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.appendFileSync(OUT, outLines.join('\n') + (outLines.length ? '\n' : ''), 'utf8');
  outLines.length = 0;
}

/* ------------------------------------------------------------------ RCON */
class Rcon {
  constructor(host, port, pass) {
    this.host = host; this.port = port; this.pass = pass;
    this.buf = Buffer.alloc(0); this.waiters = []; this.sock = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.sock = net.connect(this.port, this.host, () => resolve());
      this.sock.on('error', reject);
      this.sock.on('data', (d) => {
        this.buf = Buffer.concat([this.buf, d]);
        for (;;) {
          if (this.buf.length < 4) break;
          const size = this.buf.readInt32LE(0);
          if (this.buf.length < size + 4) break;
          const body = this.buf.slice(12, 4 + size).toString('utf8');
          this.buf = this.buf.slice(4 + size);
          const w = this.waiters.shift();
          if (w) w({ body });
        }
      });
    });
  }
  _packet(id, type, body) {
    const b = Buffer.from(body, 'utf8');
    const payload = Buffer.alloc(10 + b.length);
    payload.writeInt32LE(id, 0); payload.writeInt32LE(type, 4);
    b.copy(payload, 8);
    const out = Buffer.alloc(4 + payload.length);
    out.writeInt32LE(payload.length, 0);
    payload.copy(out, 4);
    return out;
  }
  _send(id, type, body) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('rcon timeout: ' + body.slice(0, 60))), 30000);
      this.waiters.push((p) => { clearTimeout(t); resolve(p); });
      this.sock.write(this._packet(id, type, body));
    });
  }
  async auth() {
    const r = await this._send(1, 3, this.pass);
    if (r.body === '') throw new Error('rcon auth failed');
  }
  async cmd(c) {
    const r = await this._send(9, 2, c);
    return (r.body || '').trim();
  }
}

/* --------------------------------------------------------------- helpers */
function logOffset() { try { return fs.statSync(LOG).size; } catch (e) { return 0; } }
function logSince(off) {
  try { return fs.readFileSync(LOG).slice(off).toString('utf8'); } catch (e) { return ''; }
}
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const FRENZY = /\[AILog\] frenzy set /;
const tgtOf = (l) => (l.match(/target=(\S+)/) || [])[1] || '?';
function tally(list) {
  const m = {};
  for (const l of list) { const k = tgtOf(l); m[k] = (m[k] || 0) + 1; }
  return m;
}
/** 1 秒桶直方图（按服务端日志行首 [HH:MM:SS]） */
function perSecond(t, re) {
  const m = new Map();
  for (const l of rows(t, re)) {
    const ts = (l.match(/^\[(\d{2}:\d{2}:\d{2})/) || [])[1];
    if (!ts) continue;
    m.set(ts, (m.get(ts) || 0) + 1);
  }
  return [...m.entries()].sort();
}
const trim = (l) => (l.length > 220 ? l.slice(0, 220) : l);

/** lord 钉住：每 0.9 s RCON 绝对坐标 tp 回钉点（C-2 规避） */
function makePinner(rcon) {
  let running = false;
  let loop = null;
  return {
    start() {
      if (running) return;
      running = true;
      loop = (async () => {
        while (running) {
          try { await rcon.cmd(`tp @e[type=etim:bonelord,c=1] ${LORD.x} ${LORD.y} ${LORD.z}`); } catch (e) {}
          await sleep(900);
        }
      })();
    },
    async stop() {
      running = false;
      if (loop) { try { await loop; } catch (e) {} }
      loop = null;
    },
  };
}

/** 共同前置：清场 + 生存态 + 抗性 + 夜间 + 关自然生成 */
async function commonSetup(rcon, bot, chat) {
  await rcon.cmd('op ETIM_Harn01');
  await chat('kill ETIM_Harn01');
  await sleep(1000);
  bot.respawn();
  await sleep(2500);
  await chat('gamemode 0');
  await chat(`tp ETIM_Harn01 ${SITE.x} ${SITE.y} ${SITE.z}`);
  await sleep(2000);
  await chat('effect @p resistance 1800 4');
  await chat('effect @p regeneration 1800 3');
  await chat('effect @p saturation 1800 4');
  await chat('effect @p instant_health 1 4');
  await sleep(600);
  await chat('effect @p instant_health 1 4');
  await chat('difficulty 1');
  await chat('gamerule doMobSpawning false');
  await chat('gamerule doDaylightCycle false');
  await rcon.cmd('time set 18000');
  await chat('weather clear');
  await chat('kill @e[type=etim:bonelord]');
  await chat('kill @e[type=skeleton]');
  await chat('kill @e[type=zombie]');
  await sleep(800);
  const gt = await rcon.cmd('time query gametime');
  const n = parseInt((gt.match(/(\d+)/) || [])[1] || '0', 10);
  say('W7R3 gametime=' + n, 'day=' + Math.floor(n / 24000), 'tod=' + (n % 24000));
  const p = bot.entity.position;
  say('W7R3 bot pos:', `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`, 'hp=' + bot.health);
}

/* ---------------------------------------------------------------- phase */
async function phaseW7R3(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const mark = async (win, edge) => { bot.chat(`/say W7R3|${win}|${edge}`); await sleep(400); };

  await commonSetup(rcon, bot, chat);

  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  await chat(`summon etim:bonelord ${LORD.x} ${LORD.y} ${LORD.z} {num_troops_summoned:6b}`);
  say(`W7R3 setup: lord@(${LORD.x},${LORD.y},${LORD.z}) num=6, skeleton NoAI x${nSkel} r=5 around (${bx},${by},${bz}), target=ETIM_Harn01`);

  const pinner = makePinner(rcon);
  pinner.start();
  await sleep(8000);
  const view = Object.values(bot.entities).filter((e) => e !== bot.entity && e.name === 'skeleton'
    && e.position && e.position.distanceTo(bot.entity.position) < 24).length;
  say('W7R3 skeleton entities (client view, context only):', view);

  /* ---- W7-R-a：静默面，双窗各 10 s ---- */
  const win = async (name, sec) => {
    const off = logOffset();
    await mark(name, 'begin');
    await sleep(sec * 1000);
    await mark(name, 'end');
    const t = logSince(off);
    const fr = rows(t, FRENZY);
    say(`W7R3 ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tally(fr))}`);
    say(`W7R3 ${name} per-second: ` + perSecond(t, FRENZY).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 3).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tally(fr) };
  };

  const a1 = await win('a1', 10);
  const a2 = await win('a2', 10);
  say(`W7R3 a-face: a1=${a1.rows} a2=${a2.rows}（判据 0 行/窗；v1=60、v2=18-24）`);

  /* ---- W7-R-b：旁路面（creative 切目标 + 第二假人） ---- */
  const bot2 = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn03' });
  await sleep(2500);
  await chat('op ETIM_Harn03');
  await chat('gamemode 0 ETIM_Harn03');
  await chat('effect ETIM_Harn03 resistance 1800 4');
  await chat('effect ETIM_Harn03 regeneration 1800 3');
  await chat('effect ETIM_Harn03 instant_health 1 4');
  await chat(`tp ETIM_Harn03 ${LORD.x - 1} ${LORD.y} ${LORD.z + 1}`);
  await sleep(3000);
  say('W7R3 Harn03 client-side pos:', bot2.entity.position
    ? `${bot2.entity.position.x.toFixed(1)} ${bot2.entity.position.y.toFixed(1)} ${bot2.entity.position.z.toFixed(1)}` : '(none)');

  // b 转场：Harn01 原地转 creative → lord 目标失效（none）→ 重选 Harn03
  {
    const off = logOffset();
    await mark('b-trans', 'begin');
    bot.chat('/gamemode 1 ETIM_Harn01');
    const t0 = Date.now();
    let firstAnyMs = -1, firstH03Ms = -1;
    for (;;) {
      const t = logSince(off);
      const fr = rows(t, FRENZY);
      if (firstAnyMs < 0 && fr.length > 0) firstAnyMs = Date.now() - t0;
      if (firstH03Ms < 0 && fr.some((l) => tgtOf(l) === 'ETIM_Harn03')) firstH03Ms = Date.now() - t0;
      if ((firstAnyMs >= 0 && firstH03Ms >= 0) || Date.now() - t0 > 6000) break;
      await sleep(150);
    }
    await sleep(500);
    await mark('b-trans', 'end');
    const t = logSince(off);
    const fr = rows(t, FRENZY);
    say(`W7R3 b-trans: rows=${fr.length} targets=${JSON.stringify(tally(fr))}`
      + ` firstAny=${firstAnyMs}ms firstH03=${firstH03Ms}ms`);
    say('W7R3 b-trans per-second: ' + perSecond(t, FRENZY).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 8).map(trim).forEach((l) => say('  FR ' + l));
    const bTrans = { rows: fr.length, targets: tally(fr), firstAnyMs, firstH03Ms };
    const bSil = await win('b-silence', 10);
    say(`W7R3 b-face: trans=${JSON.stringify(bTrans.targets)} silence=${bSil.rows}`);
  }

  /* ---- W7-R-c：恢复面（目标清空，lord 钉住） ---- */
  {
    const off = logOffset();
    await mark('c-trans', 'begin');
    bot.chat('/gamemode 1 ETIM_Harn03');
    const t0 = Date.now();
    let firstNoneMs = -1;
    for (;;) {
      const t = logSince(off);
      const fr = rows(t, FRENZY);
      if (firstNoneMs < 0 && fr.some((l) => tgtOf(l) === 'none')) firstNoneMs = Date.now() - t0;
      if (firstNoneMs >= 0 || Date.now() - t0 > 6000) break;
      await sleep(150);
    }
    await sleep(1200);
    await mark('c-trans', 'end');
    const t = logSince(off);
    const fr = rows(t, FRENZY);
    say(`W7R3 c-trans: rows=${fr.length} targets=${JSON.stringify(tally(fr))} firstNone=${firstNoneMs}ms`);
    say('W7R3 c-trans per-second: ' + perSecond(t, FRENZY).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 6).map(trim).forEach((l) => say('  FR ' + l));
    const c1 = await win('c-sil-1', 10);
    const c2 = await win('c-sil-2', 10);
    say(`W7R3 c-face: trans=${JSON.stringify(tally(fr))} firstNone=${firstNoneMs}ms silence=${c1.rows}/${c2.rows}`);
  }

  /* ---- 补充探针（非判点）：lord 离场 >40 tick 后回归 → 真恢复面出行 ---- */
  {
    await pinner.stop();
    await sleep(300);
    await chat(`tp @e[type=etim:bonelord,c=1] ${LORD.x + 25} ${LORD.y} ${LORD.z}`);
    say('W7R3 resume-probe: lord moved +25 (no skeleton in 16 box) → wait 4 s');
    await sleep(4000);
    const off = logOffset();
    await mark('resume', 'begin');
    await chat(`tp @e[type=etim:bonelord,c=1] ${LORD.x} ${LORD.y} ${LORD.z}`);
    await sleep(3000);
    await mark('resume', 'end');
    const t = logSince(off);
    const fr = rows(t, FRENZY);
    say(`W7R3 resume-probe(3s): rows=${fr.length} targets=${JSON.stringify(tally(fr))}（非判点，验 gap>40 恢复面不被吞）`);
    say('W7R3 resume-probe per-second: ' + perSecond(t, FRENZY).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 6).map(trim).forEach((l) => say('  FR ' + l));
  }

  try { bot2.quit(); } catch (e) {}
}

/** 现场完整性探针（非判点，非破坏）：数场上骷髅 / lord 个数 + lord NBT */
async function phaseProbe3(rcon, bot) {
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(320); };
  const off = logOffset();
  await chat('execute @e[type=skeleton] ~ ~ ~ say PROBE3_SKEL');
  await chat('execute @e[type=etim:bonelord] ~ ~ ~ say PROBE3_LORD');
  await sleep(1200);
  const t = logSince(off);
  say('PROBE3 skeleton count (execute say lines):', rows(t, /PROBE3_SKEL/).length);
  say('PROBE3 bonelord count (execute say lines):', rows(t, /PROBE3_LORD/).length);
  rows(t, /PROBE3_(SKEL|LORD)/).slice(0, 8)
    .forEach((l) => say('  PB ' + trim(l)));
  const nbt = await rcon.cmd('entitydata @e[type=etim:bonelord,c=1] {}');
  say('PROBE3 bonelord NBT:', nbt.replace(/\u0000/g, '').slice(0, 300) || '(none)');
}

async function phaseClean(rcon, bot) {
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(250); };
  await chat('kill @e[type=etim:bonelord]');
  await chat('kill @e[type=skeleton]');
  await chat('kill @e[type=zombie]');
  await chat('gamerule doMobSpawning true');
  await chat('gamerule doDaylightCycle true');
  say('CLEAN done');
}

async function main() {
  const phase = process.argv[2] || 'w7r3';
  const bot = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn01' });
  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position && bot.entity.position.y > 0) return resolve();
    const t = setTimeout(resolve, 20000);
    bot.once('spawn', () => { clearTimeout(t); resolve(); });
  });
  await sleep(1500);
  const rcon = new Rcon(HOST, RCON_PORT, RCON_PASS);
  await rcon.connect();
  await rcon.auth();
  say('--- phase=' + phase + ' ---');
  try {
    if (phase === 'w7r3') await phaseW7R3(rcon, bot);
    else if (phase === 'probe3') await phaseProbe3(rcon, bot);
    else if (phase === 'clean') await phaseClean(rcon, bot);
    else throw new Error('unknown phase: ' + phase);
  } finally {
    try { bot.quit(); } catch (e) {}
    setTimeout(() => process.exit(0), 1200);
  }
}

main().catch((e) => { say('FATAL ' + (e && e.stack ? e.stack : e)); process.exit(1); });
