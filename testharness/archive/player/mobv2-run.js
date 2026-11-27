#!/usr/bin/env node
/**
 * mobv2-run.js — mob 批重验窗 driver（A-MOB-1 修后：W5-R / W4-R / W7-R）。
 *
 * 判据正本：playground/audit/mob-revenant-bonelord-落码批文.md §一（沿用上轮判据）
 * 钉值：jar 625,906 B @ 2026-10-24 23:51:32｜SHA256 BB00ACFA…｜commit c553002
 *
 * 用法：
 *   node testharness/player/mobv2-run.js env
 *   node testharness/player/mobv2-run.js w5r [nLords=6] [waitSec=150]
 *   node testharness/player/mobv2-run.js w7r [nSkel=6] [winSec=10] [wins=2]
 *   node testharness/player/mobv2-run.js clean
 *
 * 通道：[AILog]（mobDebugLog）/ [MobLog]（mobEquipDebugLog）/ 崩溃报告。
 * 纪律：实体/方块面一律 chat 命令；RCON 只跑无位置语义（time/gamerule/difficulty/weather/op）。
 * 输出：build-logs/w5r-driver.log（追加）+ 控制台。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'w5r', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'w5r-driver.log');
const HOST = '127.0.0.1', MC_PORT = 25565, RCON_PORT = 25575, RCON_PASS = 'etim27';
/** 上轮 W4/W5 站址（mob-revenant-bonelord-verdict.md W4 判行 (-63..-67,68,254..256)），保持可比 */
const SITE = { x: -65.5, y: 68, z: 255.5 };

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
function count(t, needle) {
  let n = 0, i = 0;
  while ((i = t.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
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

/* ---------------------------------------------------------------- phases */
async function phaseEnv(rcon, bot) {
  const gt = await rcon.cmd('time query gametime');
  say('ENV gametime:', gt.replace(/\u0000/g, ''));
  say('ENV doMobSpawning:', (await rcon.cmd('gamerule doMobSpawning')).replace(/\u0000/g, ''));
  say('ENV doDaylightCycle:', (await rcon.cmd('gamerule doDaylightCycle')).replace(/\u0000/g, ''));
  const p = bot.entity.position;
  say('ENV bot pos:', `${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`, 'health=' + bot.health);
  say('ENV entities(client view):', Object.values(bot.entities)
    .filter((e) => e !== bot.entity && e.position && e.position.distanceTo(p) < 40)
    .map((e) => e.name).slice(0, 20).join(',') || '(none)');
}

/** 共同前置：清场 + 生存态 + 抗性 + 夜间 + 关自然生成 */
async function commonSetup(rcon, bot, chat, tag) {
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
  await rcon.cmd('time set 18000');           // 午夜（避开骷髅日燃）
  await chat('weather clear');
  await chat('kill @e[type=etim:bonelord]');
  await chat('kill @e[type=skeleton]');
  await chat('kill @e[type=zombie]');
  await sleep(800);
  const gt = await rcon.cmd('time query gametime');
  const n = parseInt((gt.match(/(\d+)/) || [])[1] || '0', 10);
  say(tag, 'gametime=' + n, 'day=' + Math.floor(n / 24000), 'tod=' + (n % 24000));
  say(tag, 'bot pos:', `${bot.entity.position.x.toFixed(1)} ${bot.entity.position.y.toFixed(1)} ${bot.entity.position.z.toFixed(1)}`,
    'hp=' + bot.health);
  return n;
}

async function phaseW5R(rcon, bot) {
  const nLords = parseInt(process.argv[3] || '6', 10);
  const waitSec = parseInt(process.argv[4] || '150', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(280); };
  await commonSetup(rcon, bot, chat, 'W5R');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  say(`[HarnMark] W5R begin pos=${bx},${by},${bz} lords=${nLords} wait=${waitSec}s`);
  const off = logOffset();
  // 环形 6 lord（沿用上轮 W4/W5 协议：r=3，裸召唤，不挂 NBT）
  for (let i = 0; i < nLords; i++) {
    const ang = (i / nLords) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 3), z = bz + Math.round(Math.sin(ang) * 3);
    await chat(`summon etim:bonelord ${x}.5 ${by} ${z}.5`);
    await sleep(120);
  }
  for (let s = 15; s <= waitSec; s += 15) {
    await sleep(15000);
    const t = logSince(off);
    say(`W5R t+${s}s summon=${count(t, 'bonelord summon')} gate=${count(t, 'troop type2 gate')}`
      + ` gateOk=${count(t, 'troop type2 gate pathOk=true')} troop=${count(t, 'mob troop equip')}`
      + ` frenzy=${count(t, 'frenzy set')} hp=${bot.health}`);
    await chat('effect @p instant_health 1 4');
  }
  const t = logSince(off);
  const summons = rows(t, /bonelord summon/);
  const nums = summons.map((l) => parseInt((l.match(/num=(\d+)/) || [])[1], 10)).filter((x) => !isNaN(x));
  const types = rows(t, /mob troop equip/).map((l) => (l.match(/type=(\d)/) || [])[1]);
  const dist = types.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
  const gate = rows(t, /troop type2 gate/);
  const gateOk = gate.filter((l) => /pathOk=true/.test(l)).length;
  const gateNo = gate.filter((l) => /pathOk=false/.test(l)).length;
  say('W5R summon rows', summons.length, '| num seq', JSON.stringify(nums.slice(0, 60)), '| max=' + Math.max(0, ...nums));
  say('W5R type dist', JSON.stringify(dist), 'n=' + types.length);
  say('W5R gate rows', gate.length, 'pathOk=true', gateOk, 'pathOk=false', gateNo);
  say('W5R hold=summoned rows', count(t, 'hold=summoned reset=-9600'),
    '| persistence rows', count(t, 'bonelord persistence'));
  say('W5R frenzy rows', count(t, 'frenzy set'), '| frenzy/sec',
    (count(t, 'frenzy set') / waitSec).toFixed(2));
  rows(t, /bonelord summon/).slice(0, 5).map(trim).forEach((l) => say('  SUM ' + l));
  rows(t, /troop type2 gate/).slice(0, 6).map(trim).forEach((l) => say('  GATE ' + l));
  rows(t, /mob troop equip/).slice(0, 8).map(trim).forEach((l) => say('  EQ ' + l));
  rows(t, /type=2/).slice(0, 8).map(trim).forEach((l) => say('  EQ2 ' + l));
  rows(t, /hold=summoned reset=-9600/).slice(0, 3).map(trim).forEach((l) => say('  HOLD ' + l));
  rows(t, /bonelord persistence/).slice(0, 2).map(trim).forEach((l) => say('  PERS ' + l));
  say(`[HarnMark] W5R end summon=${summons.length} type2=${dist['2'] || 0} gateOk=${gateOk}`);

  // 收尾留证：lord 的 num NBT 面（对照召唤行）
  const nd = await rcon.cmd('entitydata @e[type=etim:bonelord,c=1] {}');
  say('W5R lord NBT num field:', (nd.match(/num_troops_summoned:(-?\d+)b/) || [])[1] || '(absent)');
}

async function phaseW7R(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const winSec = parseInt(process.argv[4] || '10', 10);
  const wins = parseInt(process.argv[5] || '2', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(280); };
  await commonSetup(rcon, bot, chat, 'W7R');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  // lord：num=6 封顶 → 不再召唤兵团（控制 S 恒定；lord 自身装备面不在本项判据内）
  await chat(`summon etim:bonelord ${bx + 3}.5 ${by} ${bz + 0}.5 {num_troops_summoned:6b}`);
  // 6 只 NoAI 骷髅：固定 S，不被推挤漂出 lord 的 16 格管理盒
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  say(`W7R setup: lord@(${bx + 3},${by},${bz}) num=6, skeleton NoAI x${nSkel} r=5, wait 8s stabilize`);
  await sleep(8000);
  const skelView = Object.values(bot.entities)
    .filter((e) => e !== bot.entity && e.name === 'skeleton'
      && e.position && e.position.distanceTo(bot.entity.position) < 24).length;
  say('W7R skeleton entities (client view, context only):', skelView);
  for (let w = 1; w <= wins; w++) {
    const off = logOffset();
    say(`[HarnMark] W7R win${w} begin`);
    await sleep(winSec * 1000);
    say(`[HarnMark] W7R win${w} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const hist = perSecond(t, /frenzy set/);
    say(`W7R win${w}: frenzy rows=${fr.length} in ${winSec}s (rate=${(fr.length / winSec).toFixed(2)}/s,`
      + ` perSkeleton=${(fr.length / nSkel).toFixed(2)})`);
    say(`W7R win${w} per-second:`, hist.map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    await chat('effect @p instant_health 1 4');
  }
}

/** 站点探针：tp 到指定坐标，读落点/血量稳定性（站址选择用，不入判据） */
async function phaseTp(rcon, bot) {
  const [x, y, z] = process.argv.slice(3, 6).map(Number);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(260); };
  await rcon.cmd('op ETIM_Harn01');
  await chat(`tp ETIM_Harn01 ${x} ${y} ${z}`);
  for (const t of [2, 4, 6]) {
    await sleep(2000);
    const p = bot.entity.position;
    say(`TP t+${t}s pos=${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} hp=${bot.health}`
      + ` onGround=${bot.entity.onGround}`);
  }
  say('TP entities:', Object.values(bot.entities)
    .filter((e) => e !== bot.entity && e.position && e.position.distanceTo(bot.entity.position) < 24)
    .map((e) => e.name).slice(0, 25).join(',') || '(none)');
}

/** W7-R v2（C-1 40 tick 抑制窗）：静态面 / 换目标旁路 / 目标清空恢复面 */
async function phaseW7R2(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const win = async (name, sec) => {
    const off = logOffset();
    say(`[HarnMark] W7R2 ${name} begin`);
    await sleep(sec * 1000);
    say(`[HarnMark] W7R2 ${name} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const hist = perSecond(t, /frenzy set/);
    const tg = {};
    for (const l of fr) {
      const m = l.match(/target=(\S+)/);
      const k = m ? m[1] : '?';
      tg[k] = (tg[k] || 0) + 1;
    }
    say(`W7R2 ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tg)}`);
    say(`W7R2 ${name} per-second: ` + hist.map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 3).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  };

  await commonSetup(rcon, bot, chat, 'W7R2');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  const lx = bx + 3, lz = bz;
  // lord：num=6 封顶 → 不召兵团（S 恒定）；NoAI 骷髅固定在 lord 的 16 格管理盒内
  await chat(`summon etim:bonelord ${lx}.5 ${by} ${lz}.5 {num_troops_summoned:6b}`);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  say(`W7R2 setup: lord@(${lx},${by},${lz}) num=6, skeleton NoAI x${nSkel} r=5, target=ETIM_Harn01, wait 8s`);
  await sleep(8000);
  const view = Object.values(bot.entities).filter((e) => e !== bot.entity && e.name === 'skeleton'
    && e.position && e.position.distanceTo(bot.entity.position) < 24).length;
  say('W7R2 skeleton entities (client view, context only):', view);

  const a1 = await win('a1', 10);
  const a2 = await win('a2', 10);
  say(`W7R2 a-face: a1=${a1.rows} a2=${a2.rows}（判据 0 行/窗；上轮 60 行/窗）`);

  // b：第二假人贴近 lord（更近）→ 目标变更 → 每骷髅 1 行即时，随后静默
  const bot2 = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn03' });
  await sleep(2000);
  const offB = logOffset();
  await chat('gamemode 0 ETIM_Harn03');
  await chat('effect @a resistance 1800 4');
  await chat('effect @a regeneration 1800 3');
  await chat('effect @a instant_health 1 4');
  await chat(`tp ETIM_Harn03 ${lx + 1}.5 ${by} ${lz}.5`);
  await sleep(5000);
  {
    const t = logSince(offB);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const m = l.match(/target=(\S+)/); const k = m ? m[1] : '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2 b-trans(5s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
  }
  const bSil = await win('b-silence', 10);

  // c：两名假人同时移出 16 格（仍留在加载范围 ~30 格，保证 lord 继续 tick）→ target=none 恢复面
  const offC = logOffset();
  await chat(`tp ETIM_Harn03 ${lx + 30}.5 ${by} ${lz}.5`);
  await chat(`tp ETIM_Harn01 ${bx - 30}.5 ${by} ${bz}.5`);
  await sleep(5000);
  {
    const t = logSince(offC);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const m = l.match(/target=(\S+)/); const k = m ? m[1] : '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2 c-trans(5s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
  }
  const cSil = await win('c-silence', 10);
  say(`W7R2 b-face: trans=${JSON.stringify(bSil.targets)} silence=${bSil.rows}`);
  say(`W7R2 c-face: trans 已记上方 | silence=${cSil.rows}`);
  try { bot2.quit(); } catch (e) {}
}

/** W7-R v2b：目标变更/清空改用 kill（避开假人 tp 的客户端回拉） */
async function phaseW7R2b(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const win = async (name, sec) => {
    const off = logOffset();
    say(`[HarnMark] W7R2b ${name} begin`);
    await sleep(sec * 1000);
    say(`[HarnMark] W7R2b ${name} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const hist = perSecond(t, /frenzy set/);
    const tg = {};
    for (const l of fr) {
      const m = l.match(/target=(\S+)/);
      const k = m ? m[1] : '?';
      tg[k] = (tg[k] || 0) + 1;
    }
    say(`W7R2b ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tg)}`);
    say(`W7R2b ${name} per-second: ` + hist.map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 3).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  };

  await commonSetup(rcon, bot, chat, 'W7R2b');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  const lx = bx + 3, lz = bz;
  await chat(`summon etim:bonelord ${lx}.5 ${by} ${lz}.5 {num_troops_summoned:6b}`);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  say(`W7R2b setup: lord@(${lx},${by},${lz}) num=6, skeleton NoAI x${nSkel} r=5, target=ETIM_Harn01, wait 8s`);
  await sleep(8000);

  const a1 = await win('a1', 10);
  const a2 = await win('a2', 10);
  say(`W7R2b a-face: a1=${a1.rows} a2=${a2.rows}（判据 0 行/窗）`);

  // b：第二假人贴 lord（RCON 绝对坐标 tp），随后 kill 当前目标 Harn01 → lord 重选 Harn03
  const bot2 = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn03' });
  await sleep(2500);
  await rcon.cmd('gamemode 0 ETIM_Harn03');
  await rcon.cmd('effect ETIM_Harn03 resistance 1800 4');
  await rcon.cmd('effect ETIM_Harn03 regeneration 1800 3');
  await rcon.cmd('effect ETIM_Harn03 instant_health 1 4');
  await rcon.cmd(`tp ETIM_Harn03 ${lx + 1} ${by} ${lz}`);
  await sleep(3000);
  say('W7R2b Harn03 client-side pos:', bot2.entity.position ? `${bot2.entity.position.x.toFixed(1)} ${bot2.entity.position.y.toFixed(1)} ${bot2.entity.position.z.toFixed(1)}` : '(none)');
  const bTrans = await (async () => {
    const off = logOffset();
    say('[HarnMark] W7R2b b-trans begin');
    await rcon.cmd('kill ETIM_Harn01');
    await sleep(6000);
    say('[HarnMark] W7R2b b-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const m = l.match(/target=(\S+)/); const k = m ? m[1] : '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2b b-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  })();
  const bSil = await win('b-silence', 10);

  // c：kill Harn03 → 场上无目标 → target=none 恢复面 + 静默窗
  const cTrans = await (async () => {
    const off = logOffset();
    say('[HarnMark] W7R2b c-trans begin');
    await rcon.cmd('kill ETIM_Harn03');
    await sleep(6000);
    say('[HarnMark] W7R2b c-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const m = l.match(/target=(\S+)/); const k = m ? m[1] : '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2b c-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  })();
  const cSil = await win('c-silence', 10);
  say(`W7R2b summary: a1=${a1.rows} a2=${a2.rows} | b-trans=${JSON.stringify(bTrans.targets)} b-silence=${bSil.rows}`
    + ` | c-trans=${JSON.stringify(cTrans.targets)} c-silence=${cSil.rows}`);
  try { bot2.quit(); } catch (e) {}
}

/** W7-R v2c：目标变更/清空全部走 RCON 绝对坐标 tp（kill 会触发重生落回场内，弃用） */
async function phaseW7R2c(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const dst = (l) => (l.match(/target=(\S+)/) || [])[1] || '?';
  const countWin = async (name, sec) => {
    const off = logOffset();
    say(`[HarnMark] W7R2c ${name} begin`);
    await sleep(sec * 1000);
    say(`[HarnMark] W7R2c ${name} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = dst(l); tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2c ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tg)}`);
    say(`W7R2c ${name} per-second: ` + perSecond(t, /frenzy set/).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 3).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  };

  await commonSetup(rcon, bot, chat, 'W7R2c');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  const lx = bx + 3, lz = bz;
  await chat(`summon etim:bonelord ${lx}.5 ${by} ${lz}.5 {num_troops_summoned:6b}`);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  say(`W7R2c setup: lord@(${lx},${by},${lz}) num=6, skeleton NoAI x${nSkel} r=5, target=ETIM_Harn01, wait 8s`);
  await sleep(8000);

  const a1 = await countWin('a1', 10);
  const a2 = await countWin('a2', 10);
  say(`W7R2c a-face: a1=${a1.rows} a2=${a2.rows}（判据 0 行/窗；上轮 60 行/窗）`);

  // b：Harn03 进 1 格 → 再把 Harn01 tp 出 16 格 → lord 重选 Harn03（RCON 绝对坐标）
  const bot2 = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn03' });
  await sleep(2500);
  await rcon.cmd('gamemode 0 ETIM_Harn03');
  await rcon.cmd('effect ETIM_Harn03 resistance 1800 4');
  await rcon.cmd('effect ETIM_Harn03 regeneration 1800 3');
  await rcon.cmd('effect ETIM_Harn03 instant_health 1 4');
  await rcon.cmd(`tp ETIM_Harn03 ${lx + 1} ${by} ${lz}`);
  await sleep(3000);
  say('W7R2c Harn03 pos:', bot2.entity.position ? `${bot2.entity.position.x.toFixed(1)} ${bot2.entity.position.y.toFixed(1)} ${bot2.entity.position.z.toFixed(1)}` : '(none)');
  {
    const off = logOffset();
    say('[HarnMark] W7R2c b-trans begin');
    await rcon.cmd(`tp ETIM_Harn01 ${bx - 30} ${by} ${bz}`);
    await sleep(6000);
    say('[HarnMark] W7R2c b-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = dst(l); tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2c b-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    say('W7R2c Harn01 pos after tp:', bot.entity.position ? `${bot.entity.position.x.toFixed(1)} ${bot.entity.position.y.toFixed(1)} ${bot.entity.position.z.toFixed(1)}` : '(none)');
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
  }
  const bSil = await countWin('b-silence', 10);

  // c：Harn03 也 tp 出 16 格 → 场上无目标
  {
    const off = logOffset();
    say('[HarnMark] W7R2c c-trans begin');
    await rcon.cmd(`tp ETIM_Harn03 ${lx + 30} ${by} ${lz}`);
    await sleep(6000);
    say('[HarnMark] W7R2c c-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = dst(l); tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2c c-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
  }
  const cSil = await countWin('c-silence', 10);
  say(`W7R2c summary: a1=${a1.rows} a2=${a2.rows} | b-silence=${bSil.rows} ${JSON.stringify(bSil.targets)}`
    + ` | c-silence=${cSil.rows} ${JSON.stringify(cSil.targets)}`);
  try { bot2.quit(); } catch (e) {}
}

/** 现场探针：确认 lord / 骷髅是否仍在，并回收计数（破坏性，仅收尾用） */
async function phaseProbe2(rcon, bot) {
  await rcon.cmd('op ETIM_Harn01');
  await rcon.cmd(`tp ETIM_Harn01 ${SITE.x} ${SITE.y} ${SITE.z}`);
  await sleep(4000);
  const lord = await rcon.cmd('entitydata @e[type=etim:bonelord,c=1] {}');
  say('PROBE2 bonelord NBT:', lord.replace(/\u0000/g, '').slice(0, 300) || '(none)');
  const sk = await rcon.cmd('entitydata @e[type=skeleton,c=1] {}');
  say('PROBE2 skeleton NBT:', sk.replace(/\u0000/g, '').slice(0, 300) || '(none)');
  const k1 = await rcon.cmd('kill @e[type=skeleton]');
  say('PROBE2 kill skeletons:', k1.replace(/\u0000/g, ''));
  const k2 = await rcon.cmd('kill @e[type=etim:bonelord]');
  say('PROBE2 kill bonelords:', k2.replace(/\u0000/g, ''));
}

/** W7-R v2d：用 creative 切换作目标失效（假人留在原地当 tick 锚，避免 lord 走失/重生落回） */
async function phaseW7R2d(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const countWin = async (name, sec) => {
    const off = logOffset();
    say(`[HarnMark] W7R2d ${name} begin`);
    await sleep(sec * 1000);
    say(`[HarnMark] W7R2d ${name} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = (l.match(/target=(\S+)/) || [])[1] || '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2d ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tg)}`);
    say(`W7R2d ${name} per-second: ` + perSecond(t, /frenzy set/).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  };

  await commonSetup(rcon, bot, chat, 'W7R2d');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  const lx = bx + 3, lz = bz;
  await chat(`summon etim:bonelord ${lx}.5 ${by} ${lz}.5 {num_troops_summoned:6b}`);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  say(`W7R2d setup: lord@(${lx},${by},${lz}) num=6, skeleton NoAI x${nSkel} r=5, target=ETIM_Harn01, wait 8s`);
  await sleep(8000);
  const a0 = await countWin('a0-control', 10);

  const bot2 = await createHarnBot({ host: HOST, port: MC_PORT, username: 'ETIM_Harn03' });
  await sleep(2500);
  await rcon.cmd('gamemode 0 ETIM_Harn03');
  await rcon.cmd('effect ETIM_Harn03 resistance 1800 4');
  await rcon.cmd('effect ETIM_Harn03 regeneration 1800 3');
  await rcon.cmd(`tp ETIM_Harn03 ${lx + 1} ${by} ${lz}`);
  await sleep(3000);
  say('W7R2d Harn03 pos:', bot2.entity.position ? `${bot2.entity.position.x.toFixed(1)} ${bot2.entity.position.y.toFixed(1)} ${bot2.entity.position.z.toFixed(1)}` : '(none)');

  // b：Harn01 转 creative（原地）→ 目标失效 → lord 应重选 Harn03
  const bTrans = await (async () => {
    const off = logOffset();
    say('[HarnMark] W7R2d b-trans begin');
    await rcon.cmd('gamemode 1 ETIM_Harn01');
    await sleep(6000);
    say('[HarnMark] W7R2d b-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = (l.match(/target=(\S+)/) || [])[1] || '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2d b-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  })();
  const bSil = await countWin('b-silence', 10);

  // c：Harn03 也转 creative → 无有效目标
  const cTrans = await (async () => {
    const off = logOffset();
    say('[HarnMark] W7R2d c-trans begin');
    await rcon.cmd('gamemode 1 ETIM_Harn03');
    await sleep(6000);
    say('[HarnMark] W7R2d c-trans end');
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = (l.match(/target=(\S+)/) || [])[1] || '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2d c-trans(6s): rows=${fr.length} targets=${JSON.stringify(tg)}`);
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  })();
  const cSil = await countWin('c-silence', 10);
  say(`W7R2d summary: a0=${a0.rows} | b-trans=${JSON.stringify(bTrans.targets)} b-silence=${bSil.rows}`
    + ` | c-trans=${JSON.stringify(cTrans.targets)} c-silence=${cSil.rows}`);
  try { bot2.quit(); } catch (e) {}
}

/** W7-R v2e：c 面（无目标）把 lord 定时 tp 回原位，排除「lord 走失出 16 格」的干扰 */
async function phaseW7R2e(rcon, bot) {
  const nSkel = parseInt(process.argv[3] || '6', 10);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
  const holdWin = async (name, sec) => {
    const off = logOffset();
    say(`[HarnMark] W7R2e ${name} begin`);
    const end = Date.now() + sec * 1000;
    while (Date.now() < end) {
      await rcon.cmd(`tp @e[type=etim:bonelord,c=1] ${Math.floor(SITE.x) + 2.5} ${SITE.y} ${SITE.z}`);
      await sleep(900);
    }
    say(`[HarnMark] W7R2e ${name} end`);
    const t = logSince(off);
    const fr = rows(t, /frenzy set/);
    const tg = {};
    for (const l of fr) { const k = (l.match(/target=(\S+)/) || [])[1] || '?'; tg[k] = (tg[k] || 0) + 1; }
    say(`W7R2e ${name}: rows=${fr.length} in ${sec}s targets=${JSON.stringify(tg)}`);
    say(`W7R2e ${name} per-second: ` + perSecond(t, /frenzy set/).map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 4).map(trim).forEach((l) => say('  FR ' + l));
    return { rows: fr.length, targets: tg };
  };

  await commonSetup(rcon, bot, chat, 'W7R2e');
  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  for (let i = 0; i < nSkel; i++) {
    const ang = (i / nSkel) * Math.PI * 2;
    const x = bx + Math.round(Math.cos(ang) * 5), z = bz + Math.round(Math.sin(ang) * 5);
    await chat(`summon minecraft:skeleton ${x}.5 ${by} ${z}.5 {NoAI:1b,PersistenceRequired:1b}`);
  }
  await chat(`summon etim:bonelord ${Math.floor(SITE.x) + 2.5} ${by} ${SITE.z} {num_troops_summoned:6b}`);
  say('W7R2e setup: lord held at (+2,0), skeleton NoAI x' + nSkel + ' r=5, target=ETIM_Harn01, wait 8s');
  await sleep(8000);

  // c 面：把唯一存活目标转 creative（目标清空），lord 由定时 tp 钉在原位
  await rcon.cmd('gamemode 1 ETIM_Harn01');
  await sleep(1500);
  const c1 = await holdWin('c1', 10);
  const c2 = await holdWin('c2', 10);
  say(`W7R2e c-face: c1=${c1.rows} c2=${c2.rows} （判据 0 行/窗）`);
  await rcon.cmd('gamemode 0 ETIM_Harn01');
}

async function phaseClean(rcon, bot) {
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(250); };
  await chat('kill @e[type=etim:bonelord]');
  await chat('kill @e[type=skeleton]');
  await chat('kill @e[type=zombie]');
  await chat('gamerule doMobSpawning true');
  say('CLEAN done');
}

async function main() {
  const phase = process.argv[2] || 'env';
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
    if (phase === 'env') await phaseEnv(rcon, bot);
    else if (phase === 'w5r') await phaseW5R(rcon, bot);
    else if (phase === 'w7r') await phaseW7R(rcon, bot);
    else if (phase === 'w7r2') await phaseW7R2(rcon, bot);
    else if (phase === 'w7r2b') await phaseW7R2b(rcon, bot);
    else if (phase === 'w7r2c') await phaseW7R2c(rcon, bot);
    else if (phase === 'probe2') await phaseProbe2(rcon, bot);
    else if (phase === 'w7r2d') await phaseW7R2d(rcon, bot);
    else if (phase === 'w7r2e') await phaseW7R2e(rcon, bot);
    else if (phase === 'clean') await phaseClean(rcon, bot);
    else if (phase === 'tp') await phaseTp(rcon, bot);
    else throw new Error('unknown phase: ' + phase);
  } finally {
    try { bot.quit(); } catch (e) {}
    setTimeout(() => process.exit(0), 1200);
  }
}

main().catch((e) => { say('FATAL: ' + (e && e.stack || e)); process.exit(1); });
