#!/usr/bin/env node
/**
 * uw-run.js — underworld 批验证窗 driver（W1~W10）。
 *
 * 判据正本：underworld 批任务书 §三（W1~W10）
 * 钉值：jar 670,023 B @ 2026-10-25 11:41:20｜SHA256 CC7D2374…｜commit 2b35b9a
 *
 * 用法：
 *   node testharness/player/uw-run.js env
 *   node testharness/player/uw-run.js w1        # 进出维度 + 冷却
 *   node testharness/player/uw-run.js w2        # 地形/群系/probe
 *   node testharness/player/uw-run.js w3w4 [sec=240]   # 自然生成窗（池/替换/modifier）
 *   node testharness/player/uw-run.js w5        # 三实体召唤面
 *   node testharness/player/uw-run.js w6        # 兵团
 *   node testharness/player/uw-run.js w7        # 箭面
 *   node testharness/player/uw-run.js w8        # 掉落/击杀
 *   node testharness/player/uw-run.js w10a      # stow 存档读回
 *   node testharness/player/uw-run.js w10b      # 时间门（退服/回服）
 *   node testharness/player/uw-run.js clean
 *
 * 判窗边界：/say UW|<win>|begin|end 落服务端日志，证据按标记行切片。
 * 纪律：实体/方块面一律 bot chat；RCON 只做无位置语义（time/gamerule/save-all/stop/entitydata/scoreboard）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'uw-driver.log');
const HOST = '127.0.0.1', MC_PORT = 25565, RCON_PORT = 25575, RCON_PASS = 'etim27';
/** 当前 bot 名（main 里由 UW_BOT 覆盖） */
let BOT_NAME = 'ETIM_Harn01';

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
const count = (t, re) => rows(t, re).length;
const trim = (l) => (l.length > 240 ? l.slice(0, 240) : l);
const RE = {
  dim: /\[DimLog\] /,
  spawn: /\[SpawnLog\] /,
  mob: /\[MobLog\] /,
  test: /\[TestLog\] /,
  frenzy: /\[AILog\] frenzy set /,
};

async function connectBot(username = 'ETIM_Harn01', settleMs = 2500) {
  const bot = await createHarnBot({ host: HOST, port: MC_PORT, username });
  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position && bot.entity.position.y > 0) return resolve();
    const t = setTimeout(resolve, 20000);
    bot.once('spawn', () => { clearTimeout(t); resolve(); });
  });
  await sleep(settleMs);
  return bot;
}

function makeChat(bot, pace = 320) {
  return async (cmd) => { bot.chat('/' + cmd); await sleep(pace); };
}

async function mark(bot, win, edge) {
  bot.chat(`/say UW|${win}|${edge}`);
  await sleep(420);
}

/** 站点准备：取服务端侧玩家坐标 → 开 15×6×15 空气房 + 石地板 → 回传环心 */
async function siteSetup(rcon, bot, chat) {
  const echo = String(await rcon.cmd(`tp ${BOT_NAME} ~ ~ ~`)).replace(/\u0000/g, '');
  const m = echo.match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  if (!m) { say('SITE tp echo unparsed:', echo.slice(0, 120)); }
  const px = m ? Math.floor(parseFloat(m[1])) : Math.floor(bot.entity.position.x);
  const py = m ? Math.floor(parseFloat(m[2])) : Math.floor(bot.entity.position.y);
  const pz = m ? Math.floor(parseFloat(m[3])) : Math.floor(bot.entity.position.z);
  await chat(`fill ${px - 7} ${py} ${pz - 7} ${px + 7} ${py + 5} ${pz + 7} minecraft:air`);
  await chat(`fill ${px - 7} ${py - 1} ${pz - 7} ${px + 7} ${py - 1} ${pz + 7} minecraft:stone`);
  await chat(`tp ${BOT_NAME} ${px + 0.5} ${py} ${pz + 0.5}`);
  await sleep(900);
  say(`SITE room ${px - 7},${py},${pz - 7} .. ${px + 7},${py + 5},${pz + 7} floor@${py - 1}; tp ${px + 0.5} ${py} ${pz + 0.5}`);
  return { bx: px, by: py, bz: pz };
}


async function windowed(bot, win, fn, tailMs = 400) {
  const off = logOffset();
  await mark(bot, win, 'begin');
  const r = await fn();
  await sleep(tailMs);
  await mark(bot, win, 'end');
  return { text: logSince(off), ret: r };
}

const posStr = (bot) => {
  const p = bot.entity && bot.entity.position;
  return p ? `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}` : '(none)';
};

/** 服务端日志面判维度：最后一条 [DimLog] enter/leave 谁更近 */
function serverInUnderworld() {
  try {
    const lines = fs.readFileSync(LOG, 'utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/\[DimLog\] enter player=/.test(lines[i])) return true;
      if (/\[DimLog\] leave player=/.test(lines[i])) return false;
    }
  } catch (e) {}
  return false;
}

/* ---------------------------------------------------------------- phases */

async function phaseEnv(rcon, bot) {
  const chat = makeChat(bot);
  const p = bot.entity.position;
  say('ENV bot pos:', posStr(bot), 'dim=' + (bot.game && bot.game.dimension), 'hp=' + bot.health);
  say('ENV gametime:', (await rcon.cmd('time query gametime')).replace(/\u0000/g, ''));
  say('ENV doMobSpawning:', (await rcon.cmd('gamerule doMobSpawning')).replace(/\u0000/g, ''));
  say('ENV difficulty:', (await rcon.cmd('difficulty')).replace(/\u0000/g, ''));
  say('ENV gamemode:', (await rcon.cmd('gamemode')).replace(/\u0000/g, ''));
  say('ENV world list:', (await rcon.cmd('worldborder get')).replace(/\u0000/g, ''));
  const under = await rcon.cmd('execute @e[type=etim:longdead] ~ ~ ~ say UW_LONGDEAD_AT');
  say('ENV longdead probe rc:', String(under).replace(/\u0000/g, '').slice(0, 80));
  const pos = await rcon.cmd('tp ETIM_Harn01 ~ ~ ~');
  say('ENV tp echo:', pos.replace(/\u0000/g, ''));
  await chat('me env');
}

/** W1 + W1b：进入（含 landing/visit）+ 连续两次 enter 冷却 */
async function phaseW1(rcon, bot) {
  const chat = makeChat(bot, 260);
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 3');
  await chat('effect @p saturation 9999 4');
  await chat('gamemode 0');
  await chat('difficulty 1');
  await chat('gamerule doMobSpawning true');
  await sleep(600);

  const w = await windowed(bot, 'w1', async () => {
    bot.chat('/etim dim enter');
    await sleep(120);
    bot.chat('/etim dim enter'); // W1b: 10 tick 冷却内的第二次
    await sleep(2500);
    return null;
  }, 600);
  const t = w.text;
  const enter = rows(t, /\[DimLog\] enter player=/);
  const landing = rows(t, /\[DimLog\] landing /);
  const visit = rows(t, /\[DimLog\] visit set /);
  const reject = rows(t, /\[DimLog\] enter-reject /);
  say('W1 enter rows:', enter.length, enter.slice(0, 2).map(trim));
  say('W1 landing rows:', landing.length, landing.slice(0, 2).map(trim));
  say('W1 visit rows:', visit.length, visit.slice(0, 2).map(trim));
  say('W1b reject rows:', reject.length, reject.slice(0, 3).map(trim));
  say('W1 bot pos after:', posStr(bot), 'dim=' + (bot.game && bot.game.dimension), 'hp=' + bot.health);

  // A-UW-1 回归：进入后 30 s 存活 + 0 CME（上次崩点 1 s 内）
  const off2 = logOffset();
  await sleep(28000);
  const t2 = logSince(off2);
  const cme = count(t2, /ConcurrentModificationException|Exception ticking world|placeMycelium/);
  const postfield = count(t2, /\[DimLog\] postfield /);
  const placed = count(t2, /\[DimLog\] mycelium placed=/);
  say('W1 survival 30s: cmeRows=' + cme + ' postfieldRebuilds=' + postfield + ' myceliumPlacedRows=' + placed);
  say('W1 survival 30s: botAlive=' + (bot.entity ? 'yes' : 'no') + ' hp=' + bot.health + ' pos=' + posStr(bot));
}

/** W2：probe（lookup/provider/biome/gen-probe）+ 玩家位置 */
async function phaseW2(rcon, bot) {
  const chat = makeChat(bot, 300);
  if (!serverInUnderworld()) {
    say('W2 not in underworld — entering first');
    await chat('etim dim enter');
    await sleep(2500);
  }
  say('W2 bot pos:', posStr(bot), 'dim=' + (bot.game && bot.game.dimension));
  const w = await windowed(bot, 'w2', async () => {
    await chat('etim dim probe');
    await sleep(1200);
  });
  const t = w.text;
  const keep = [
    'lookup', 'provider dim=-2', 'biomeProvider', 'biome probe', 'gen-probe',
  ];
  for (const k of keep) {
    const hit = rows(t, new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    say('W2 ' + k + ':', hit.length, hit.map(trim));
  }
  return w;
}

/** W3/W4：-2 自然生成窗（池行/替换/modifier/depth-bypass）——固定 180 s/窗，最多 3 窗 */
async function phaseW3W4(rcon, bot) {
  const sec = parseInt(process.argv[3] || '180', 10);
  const wins = parseInt(process.argv[4] || '1', 10);
  const chat = makeChat(bot, 300);
  if (!serverInUnderworld()) { await chat('etim dim enter'); await sleep(2500); }
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 3');
  await chat('effect @p saturation 9999 4');
  await chat('gamemode 0');
  await chat('difficulty 1');
  await chat('gamerule doMobSpawning true');
  say('W3W4 env: pos=' + posStr(bot) + ' sec/window=' + sec + ' windows=' + wins);
  const w = await windowed(bot, 'w3w4', async () => {
    for (let w = 0; w < wins; w++) {
      const end = Date.now() + sec * 1000;
      let tick = 0;
      while (Date.now() < end) {
        await sleep(20000);
        tick++;
        // 腾怪物上限：清非玩家实体（r=64，chat 面有位置语义）；掉落行进 W8 非玩家击杀样本
        await chat('kill @e[type=!player,r=64]');
        const t = logSince(logOffset() - 90000);
        say(`W3W4 w${w + 1} t=+${tick * 20}s`,
          'accept=' + count(t, /\[SpawnLog\] accept /),
          'sub=' + count(t, /substitute Longdead->Guardian/),
          'mod=' + count(t, /modifier dim=-2/),
          'poolGen=' + count(t, /pool dim=-2/));
      }
      if (w < wins - 1) await sleep(1500);
    }
  }, 900);
  const t = w.text;
  const accepts = rows(t, /\[SpawnLog\] accept /);
  const accLong = accepts.filter((l) => /accept ETIMEntityLongdead at/.test(l)).length;
  const accGuard = accepts.filter((l) => /accept ETIMEntityLongdeadGuardian at/.test(l)).length;
  const subs = rows(t, /substitute Longdead->Guardian/);
  const mods = rows(t, /modifier dim=-2/);
  const bypass = rows(t, /depth-bypass dim=-2/);
  const drops = rows(t, /\[MobLog\] longdead drop /);
  const nonPlayerDrops = drops.filter((l) => /hitByPlayer=false/.test(l)).length;
  say('W3 pool dim=-2 rows:', count(t, /pool dim=-2/), rows(t, /pool dim=-2/).slice(0, 2).map(trim));
  say('W3 pool underworld rows:', count(t, /pool underworld size=/));
  say('W3 accepts total:', accepts.length, 'longdead=' + accLong, 'guardian=' + accGuard,
    accepts.slice(0, 4).map(trim));
  say('W4 substitute rows:', subs.length, subs.slice(0, 3).map(trim));
  say('W4 ratio subs/(subs+longdeadAccept)=',
    subs.length + '/' + (subs.length + accLong),
    '=', ((subs.length + accLong) ? (subs.length / (subs.length + accLong)).toFixed(3) : 'n/a'));
  say('W4 modifier rows:', mods.length, mods.slice(0, 4).map(trim));
  say('W4 depth-bypass rows:', bypass.length, bypass.slice(0, 3).map(trim));
  say('W8-sample non-player drops (hitByPlayer=false):', nonPlayerDrops, 'of', drops.length);
}

/** W5：三实体裸召唤（走 onInitialSpawn 装备链） */
async function phaseW5(rcon, bot) {
  const chat = makeChat(bot, 320);
  await chat('effect @p resistance 9999 4');
  await chat('gamemode 0');
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=etim:longdead_guardian]');
  await chat('kill @e[type=etim:ancient_bone_lord]');
  await sleep(800);
  const { bx, by, bz } = await siteSetup(rcon, bot, chat);
  const w = await windowed(bot, 'w5', async () => {
    // 6 只 longdead（覆盖 melee/ranged 两骰面）
    for (let i = 0; i < 6; i++) {
      await chat(`summon etim:longdead ${bx + 5} ${by} ${bz + (i - 2)}`);
    }
    // 4 只 guardian（覆盖 ranged → stow 面）
    for (let i = 0; i < 4; i++) {
      await chat(`summon etim:longdead_guardian ${bx - 5} ${by} ${bz + (i - 1)}`);
    }
    await chat(`summon etim:ancient_bone_lord ${bx + 3} ${by} ${bz + 3}`);
    await sleep(3500);
  }, 800);
  const t = w.text;
  const groups = [
    ['longdead attr', /\[MobLog\] longdead attr /],
    ['longdead equip melee', /\[MobLog\] longdead equip type=melee /],
    ['longdead equip ranged', /\[MobLog\] longdead equip type=ranged /],
    ['ancient attr', /\[MobLog\] ancient attr /],
    ['ancient equip', /\[MobLog\] ancient equip /],
    ['guardian stow', /\[MobLog\] guardian stow /],
  ];
  for (const [n, re] of groups) {
    const hit = rows(t, re);
    say('W5 ' + n + ':', hit.length, hit.slice(0, 3).map(trim));
  }
  const all = rows(t, /\[MobLog\] longdead attr /).length;
  say('W5 summary: entities ok =', all > 0, ' equipRows=',
    count(t, /\[MobLog\] longdead equip /));
  return w;
}

/** W6：ancient_bone_lord 追玩家 ≥20 tick → 兵团 type 行 */
async function phaseW6(rcon, bot) {
  const chat = makeChat(bot, 320);
  await chat('effect @p resistance 9999 4');
  await chat('gamemode 0');
  await chat('kill @e[type=etim:ancient_bone_lord]');
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=skeleton]');
  await sleep(800);
  const { bx, by, bz } = await siteSetup(rcon, bot, chat);
  const w = await windowed(bot, 'w6', async () => {
    await chat(`summon etim:ancient_bone_lord ${bx + 4} ${by} ${bz}`);
    const end = Date.now() + 90000;
    while (Date.now() < end) {
      await sleep(15000);
      const t = logSince(logOffset() - 60000);
      if (count(t, /\[MobLog\] bonelord troop class=/) > 0) break;
    }
  }, 800);
  const t = w.text;
  const troop = rows(t, /\[MobLog\] bonelord troop class=/);
  say('W6 troop rows:', troop.length, troop.slice(0, 6).map(trim));
  const skeletonClass = troop.filter((l) => /class=EntitySkeleton\b/.test(l));
  say('W6 EntitySkeleton rows:', skeletonClass.length);
  const nbt = await rcon.cmd('entitydata @e[type=etim:ancient_bone_lord,c=1] {}');
  say('W6 ancient NBT:', String(nbt).replace(/\u0000/g, '').slice(0, 200));
  return w;
}

/** W7：ranged longdead 开火 → arrow 行 */
async function phaseW7(rcon, bot) {
  const chat = makeChat(bot, 320);
  await chat('effect @p resistance 9999 4');
  await chat('gamemode 0');
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=etim:longdead_guardian]');
  await sleep(800);
  const { bx, by, bz } = await siteSetup(rcon, bot, chat);
  const w = await windowed(bot, 'w7', async () => {
    // 一次召 4 只，等 ranged 面开火（50% 骰面）
    for (let i = 0; i < 4; i++) await chat(`summon etim:longdead ${bx + 5} ${by} ${bz + (i - 2)}`);
    const end = Date.now() + 45000;
    while (Date.now() < end) {
      await sleep(5000);
      const t = logSince(logOffset() - 30000);
      if (count(t, /\[MobLog\] longdead arrow intended=/) > 0) break;
    }
  }, 800);
  const t = w.text;
  const arrows = rows(t, /\[MobLog\] longdead arrow intended=/);
  say('W7 arrow rows:', arrows.length, arrows.slice(0, 4).map(trim));
  const equip = rows(t, /\[MobLog\] longdead equip type=ranged /);
  say('W7 ranged equip rows:', equip.length, equip.slice(0, 2).map(trim));
  return w;
}

/** W8：玩家击杀 longdead → drop 行（hitByPlayer=true）+ 背包/落地箭 */
async function phaseW8(rcon, bot) {
  const chat = makeChat(bot, 320);
  await chat('effect @p resistance 9999 4');
  await chat('effect @p saturation 9999 4');
  await chat('effect @p strength 9999 10');
  await chat('gamemode 0');
  await chat('give @p minecraft:iron_sword');
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=etim:longdead_guardian]');
  await sleep(800);
  // 持剑：ETIM reach 1.5+0.75=2.25，且 ItemTool 使 weak-strike 分支整体跳过
  try {
    const sword = bot.inventory.items().find((i) => /sword/.test(i.name || ''));
    if (sword) await bot.equip(sword, 'hand');
  } catch (e) { say('W8 equip failed:', e.message); }
  const { bx, by, bz } = await siteSetup(rcon, bot, chat);

  const w = await windowed(bot, 'w8', async () => {
    const NONLIVING = new Set(['item', 'arrow', 'spectral_arrow', 'tipped_arrow', 'experience_orb', 'xp_orb', 'item_frame', 'painting', 'boat', 'minecart']);
    const living = () => Object.values(bot.entities)
      .filter((e) => e !== bot.entity && !e.username && e.position && !NONLIVING.has(e.name)
        && e.position.distanceTo(bot.entity.position) < 6);
    for (let round = 0; round < 6; round++) {
      for (let i = 0; i < 3; i++) await chat(`summon etim:longdead ${bx + 2} ${by} ${bz + (i - 1)}`);
      await sleep(1200);
      for (let i = 0; i < 30; i++) {
        // 持剑 + 饱和（A-2 规避：weak-strike 分支不触发，重叠安全）；贴身后再打
        await chat('tp @p @e[type=etim:longdead,c=1]');
        await sleep(300);
        const targets = living();
        if (!targets.length) { await sleep(300); continue; }
        for (const e of targets) { try { bot.attack(e); } catch (err) { say('W8 attack err:', err.message); } }
        await sleep(400);
        if (!living().length) break;
      }
      say(`W8 round ${round + 1}: clientLivingNear=${living().length}`);
      await sleep(800);
    }
    // 兜底：若玩家击杀未成立，改为「先打一下再命令回收」（recentlyHit 面）
    const t0 = logSince(logOffset() - 600000);
    if (count(t0, /longdead drop .*hitByPlayer=true/) === 0) {
      say('W8 fallback: no hitByPlayer=true yet -> hit-then-command-kill');
      for (let i = 0; i < 3; i++) await chat(`summon etim:longdead ${bx + 2} ${by} ${bz + (i - 1)}`);
      await sleep(1200);
      await sleep(300);
      for (const e of Object.values(bot.entities)) {
        if (e !== bot.entity && !e.username && e.position && !NONLIVING.has(e.name)
          && e.position.distanceTo(bot.entity.position) < 6) {
          try { bot.attack(e); } catch (err) {}
        }
      }
      await sleep(400);
      await chat('kill @e[type=etim:longdead]');
      await chat('kill @e[type=etim:longdead_guardian]');
      await sleep(1200);
    }
    // 收掉落：传送到最近的 item 实体上触发拾取
    for (let i = 0; i < 8; i++) {
      await chat('tp @p @e[type=item,c=1]');
      await sleep(400);
    }
    await sleep(1200);
  }, 900);

  const t = w.text;
  const drops = rows(t, /\[MobLog\] longdead drop /);
  const player = drops.filter((l) => /hitByPlayer=true/.test(l));
  const nonPlayer = drops.filter((l) => /hitByPlayer=false/.test(l));
  const num = (l, k) => parseInt((l.match(new RegExp(k + '=(\\d+)')) || [])[1] || '0', 10);
  const stat = (arr) => ({
    n: arr.length,
    arrowsSum: arr.reduce((a, l) => a + num(l, 'arrows'), 0),
    bonesSum: arr.reduce((a, l) => a + num(l, 'bones'), 0),
    arrowsGt0: arr.filter((l) => num(l, 'arrows') > 0).length,
    bonesGt0: arr.filter((l) => num(l, 'bones') > 0).length,
  });
  say('W8 drop rows:', drops.length, 'playerKill=' + player.length, 'nonPlayer=' + nonPlayer.length);
  say('W8 playerKill stat:', JSON.stringify(stat(player)));
  say('W8 nonPlayer stat:', JSON.stringify(stat(nonPlayer)));
  say('W8 playerKill samples:', player.slice(0, 4).map(trim));
  try {
    const items = bot.inventory.items().map((i) => `${i.name}#${i.type}x${i.count}`);
    say('W8 inventory:', items.join(', ') || '(empty)');
  } catch (e) { say('W8 inventory read failed:', e.message); }
  const arrowEnts = await rcon.cmd('execute @e[type=arrow] ~ ~ ~ say UW_ARROW_VANILLA');
  say('W8 arrow(type=arrow) probe rc:', String(arrowEnts).replace(/\u0000/g, '').slice(0, 60));
  const tail = logSince(logOffset() - 8000);
  say('W8 UW_ARROW_VANILLA rows:', count(tail, /UW_ARROW_VANILLA/));
  // 背包实物核对（clear … 0 0 只数不删）
  await chat('clear @p etim:arrow_ancient_metal 0 0');
  await sleep(900);
  return w;
}

/** W10a：guardian stowed NBT 存档读回（save-all → 离开 → 重回） */
async function phaseW10a(rcon, bot) {
  const chat = makeChat(bot, 320);
  await chat('gamemode 0');
  await chat('kill @e[type=etim:longdead_guardian]');
  await sleep(600);
  const { bx, by, bz } = await siteSetup(rcon, bot, chat);

  const w = await windowed(bot, 'w10a', async () => {
    let stowFound = false;
    for (let attempt = 0; attempt < 8 && !stowFound; attempt++) {
      await chat(`summon etim:longdead_guardian ${bx + 3} ${by} ${bz}`);
      await sleep(1200);
      const t = logSince(logOffset() - 8000);
      stowFound = count(t, /guardian stow item=dagger_ancient_metal/) > 0;
      say(`W10a attempt ${attempt + 1}: stowFound=${stowFound}`);
      if (!stowFound) await chat('kill @e[type=etim:longdead_guardian]');
    }
    const before = await rcon.cmd('entitydata @e[type=etim:longdead_guardian,c=1] {}');
    say('W10a BEFORE NBT:', String(before).replace(/\u0000/g, '').slice(0, 400));
    await rcon.cmd('save-all');
    await sleep(1200);
    await chat('etim dim leave');
    await sleep(6000);
    await chat('etim dim enter');
    await sleep(5000);
    const after = await rcon.cmd('entitydata @e[type=etim:longdead_guardian,c=1] {}');
    say('W10a AFTER NBT:', String(after).replace(/\u0000/g, '').slice(0, 400));
    say('W10a stowed before/after:',
      /stowed_item_stack/.test(String(before)), '/', /stowed_item_stack/.test(String(after)));
  }, 800);
  const t = w.text;
  say('W10a visit rows in window:', count(t, /\[DimLog\] visit set /));
  say('W10a leave/enter rows:', rows(t, /\[DimLog\] (leave|enter) player=/).map(trim).slice(0, 4));
  return w;
}

/** W10b：时间门（per-world 标志）——spectator(ghost) → frozen；回生存 → resumed；另测全服离线 */
async function phaseW10b(rcon, bot) {
  const chat = makeChat(bot, 300);
  if (!serverInUnderworld()) { await chat('etim dim enter'); await sleep(2500); }
  // A 段：spectator（ghost 玩家）→ shouldProgress=false → frozen 边沿
  const a = await windowed(bot, 'w10b-a', async () => {
    await chat('gamemode 3');
    await sleep(4000);
  }, 600);
  const frozen = rows(a.text, /\[DimLog\] time frozen dim=-2/);
  const resumedA = rows(a.text, /\[DimLog\] time resumed dim=-2/);
  say('W10b A(spectator): frozen=' + frozen.length, frozen.slice(0, 2).map(trim), '| resumed=' + resumedA.length);

  // B 段：回生存 → resumed 边沿
  const b = await windowed(bot, 'w10b-b', async () => {
    await chat('gamemode 0');
    await sleep(4000);
  }, 600);
  const resumed = rows(b.text, /\[DimLog\] time resumed dim=-2/);
  const frozenB = rows(b.text, /\[DimLog\] time frozen dim=-2/);
  say('W10b B(survival): resumed=' + resumed.length, resumed.slice(0, 2).map(trim), '| frozen=' + frozenB.length);

  // C 段：全服离线（0 玩家）——观测 -2 是否 tick 出 frozen 边沿（登记用，不计判）
  const off = logOffset();
  say('W10b C: bot quit 8s (0 players server-wide)');
  try { bot.quit(); } catch (e) {}
  await sleep(8000);
  const tDown = logSince(off);
  const frozenC = rows(tDown, /\[DimLog\] time frozen dim=-2/);
  say('W10b C(offline): frozen=' + frozenC.length, frozenC.slice(0, 2).map(trim));

  const off2 = logOffset();
  const bot2 = await connectBot(BOT_NAME, 3000);
  await sleep(4000);
  const tUp = logSince(off2);
  const resumedD = rows(tUp, /\[DimLog\] time resumed dim=-2/);
  say('W10b D(rejoin): resumed=' + resumedD.length, resumedD.slice(0, 3).map(trim));
  say('W10b bot2 pos:', posStr(bot2));
  try { bot2.quit(); } catch (e) {}
  return { frozen: frozen.length, resumed: resumed.length, frozenC: frozenC.length, resumedD: resumedD.length };
}

async function phaseClean(rcon, bot) {
  const chat = makeChat(bot, 250);
  for (const t of ['etim:longdead', 'etim:longdead_guardian', 'etim:ancient_bone_lord', 'arrow', 'tipped_arrow', 'item']) {
    await chat(`kill @e[type=${t}]`);
  }
  await chat('gamerule doMobSpawning true');
  await chat('gamemode 0');
  say('CLEAN done');
}

/* ------------------------------------------------------------------ main */
async function main() {
  const phase = process.argv[2] || 'env';
  const needBot = phase !== 'rcon';
  BOT_NAME = process.env.UW_BOT || 'ETIM_Harn01';
  const rcon = new Rcon(HOST, RCON_PORT, RCON_PASS);
  await rcon.connect();
  await rcon.auth();
  say('--- phase=' + phase + ' bot=' + BOT_NAME + ' ---');
  let bot = null;
  try {
    if (needBot) bot = await connectBot(BOT_NAME);
    if (phase === 'env') await phaseEnv(rcon, bot);
    else if (phase === 'w1') await phaseW1(rcon, bot);
    else if (phase === 'w2') await phaseW2(rcon, bot);
    else if (phase === 'w3w4') await phaseW3W4(rcon, bot);
    else if (phase === 'w5') await phaseW5(rcon, bot);
    else if (phase === 'w6') await phaseW6(rcon, bot);
    else if (phase === 'w7') await phaseW7(rcon, bot);
    else if (phase === 'w8') await phaseW8(rcon, bot);
    else if (phase === 'w10a') await phaseW10a(rcon, bot);
    else if (phase === 'w10b') await phaseW10b(rcon, bot);
    else if (phase === 'clean') await phaseClean(rcon, bot);
    else throw new Error('unknown phase: ' + phase);
  } finally {
    if (bot) { try { bot.quit(); } catch (e) {} }
    try { rcon.sock.end(); } catch (e) {}
    setTimeout(() => process.exit(0), 1200);
  }
}

main().catch((e) => { say('FATAL ' + (e && e.stack ? e.stack : e)); process.exit(1); });
