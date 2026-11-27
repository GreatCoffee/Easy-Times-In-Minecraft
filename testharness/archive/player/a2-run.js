#!/usr/bin/env node
/**
 * a2-run.js — A-2 单点回归 driver（会话七自建，不改产品面）
 *
 *   r1 : 退化叠位面（tp @p @e 贴身后攻击）×6，每击后 time query gametime 计时；
 *        随后 30 s 存活观测（watchdog / CME 计数）
 *   r3 : 非退化面（~1.0 格正视 lookAt 攻击）×3，deny 行 dx/dz 须为真实轴值
 *   r4 : 装备面（持剑攻击）×3，deny 行须为 0，且目标 HP 真减（证明 weak-strike 分支被跳过）
 *
 * 判决源：run/uw/logs/latest.log（按 /say A2|<phase>|begin|end 切片）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw', 'logs', 'latest.log');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

class Rcon {
  constructor(host, port, pw) { this.host = host; this.port = port; this.pw = pw; this.buf = Buffer.alloc(0); this.q = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s = net.connect(this.port, this.host, () => res());
      this.s.on('error', rej);
      this.s.on('data', (d) => {
        this.buf = Buffer.concat([this.buf, d]);
        for (;;) {
          if (this.buf.length < 4) break;
          const n = this.buf.readInt32LE(0);
          if (this.buf.length < n + 4) break;
          const body = this.buf.slice(12, 4 + n).toString('utf8');
          this.buf = this.buf.slice(4 + n);
          const w = this.q.shift();
          if (w) w(body);
        }
      });
    });
  }
  pkt(id, t, b) {
    const bb = Buffer.from(b, 'utf8');
    const pl = Buffer.alloc(10 + bb.length);
    pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8);
    const o = Buffer.alloc(4 + pl.length);
    o.writeInt32LE(pl.length, 0); pl.copy(o, 4);
    return o;
  }
  send(id, t, b, timeoutMs) {
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('rcon timeout(' + timeoutMs + 'ms): ' + b)), timeoutMs || 15000);
      this.q.push((x) => { clearTimeout(to); res(x); });
      this.s.write(this.pkt(id, t, b));
    });
  }
  async auth() { return this.send(1, 3, this.pw); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (off) => { try { return fs.readFileSync(LOG).slice(off).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;

function makeChat(bot, gap) {
  return async (cmd) => { bot.chat('/' + cmd); await sleep(gap || 320); };
}

function posStr(bot) {
  const p = bot.entity && bot.entity.position;
  return p ? `${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}` : '(none)';
}

async function serverPos(rcon, name, bot) {
  let echo = '';
  try { echo = await rcon.cmd('tp ' + name + ' ~ ~ ~'); } catch (e) { echo = 'RCON_ERR:' + e.message; }
  say('serverPos echo:', JSON.stringify(String(echo).slice(0, 120)));
  const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  if (!m) {
    const p = bot && bot.entity && bot.entity.position;
    if (!p) return null;
    say('serverPos fallback -> bot client pos');
    return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z), fx: p.x, fy: p.y, fz: p.z };
  }
  return { x: Math.floor(parseFloat(m[1])), y: Math.floor(parseFloat(m[2])), z: Math.floor(parseFloat(m[3])),
    fx: parseFloat(m[1]), fy: parseFloat(m[2]), fz: parseFloat(m[3]) };
}

async function siteSetup(rcon, bot, chat, name) {
  const p = await serverPos(rcon, name, bot);
  const px = p.x, py = p.y, pz = p.z;
  await chat(`fill ${px - 8} ${py} ${pz - 8} ${px + 8} ${py + 5} ${pz + 8} minecraft:air`);
  await chat(`fill ${px - 8} ${py - 1} ${pz - 8} ${px + 8} ${py - 1} ${pz + 8} minecraft:stone`);
  await chat(`tp ${name} ${px + 0.5} ${py} ${pz + 0.5}`);
  await sleep(700);
  say(`SITE room ${px - 8},${py},${pz - 8}..${px + 8},${py + 5},${pz + 8}; player ${px + 0.5} ${py} ${pz + 0.5}`);
  return { px, py, pz };
}

const NONLIVING = new Set(['item', 'arrow', 'spectral_arrow', 'tipped_arrow', 'experience_orb', 'xp_orb',
  'item_frame', 'painting', 'boat', 'minecart', 'fishing_bobber']);
const livingNear = (bot, r) => Object.values(bot.entities).filter((e) => e !== bot.entity && !e.username
  && e.position && !NONLIVING.has(e.name)
  && e.position.distanceTo(bot.entity.position) < (r || 4));

const hpOf = async (rcon, type) => {
  const s = await rcon.cmd(`entitydata @e[type=${type},c=1] {}`);
  const m = String(s).match(/Health:([\d.]+)/);
  return m ? m[1] : 'n/a(' + String(s).slice(0, 40) + ')';
};

(async () => {
  const phase = (process.argv[2] || 'r1').toLowerCase();
  const rcon = new Rcon('127.0.0.1', 25575, 'etim27');
  await rcon.connect();
  await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  const NAME = 'ETIM_Harn01';
  await sleep(3500);
  const chat = makeChat(bot, 320);

  await chat('gamemode 0');
  await chat('gamerule doMobSpawning false');
  await chat('difficulty 1');
  await chat('effect @p clear');
  await chat('effect @p regeneration 9999 3');
  await chat('effect @p resistance 9999 4');
  await chat('clear @p');
  const { px, py, pz } = await siteSetup(rcon, bot, chat, NAME);
  await chat('kill @e[type=!player]');
  await sleep(700);
  say(phase, 'bot', NAME, 'pos', posStr(bot), 'hp', bot.health);

  const mark = (tag) => { bot.chat('A2|' + tag + '|begin'); return sleep(250).then(() => logOffset()); };
  const unmark = async (tag) => { bot.chat('A2|' + tag + '|end'); await sleep(600); };

  if (phase === 'r1') {
    const off = await mark('r1');
    // 关键：/kill 会走 dropFewItems → 站在落点的假人会拾到骨头/箭，手里有 ItemTool/骨
    // 会让 isHoldingItemThatPreventsHandDamage 命中，弱击分支被整体跳过（探针缺口）。
    // 关掉落 + 清掉落物 + 选定空槽，保证每击都是徒手。
    await chat('gamerule doMobLoot false');
    await chat('gamerule doTileDrops false');
    await chat('kill @e[type=item]');
    await chat('clear @p');
    try { bot.setQuickBarSlot(8); } catch (e) { say('slot set failed', e.message); }
    await sleep(600);
    say('R1 pre: heldItem=' + (bot.heldItem ? bot.heldItem.name : '(empty)'));
    const results = [];
    const sent = [];
    const origWrite = bot._client.write.bind(bot._client);
    bot._client.write = (name, params) => {
      if (name === 'use_entity') sent.push(params);
      return origWrite(name, params);
    };
    for (let i = 1; i <= 6; i++) {
      await chat('kill @e[type=etim:longdead]');
      await chat(`summon etim:longdead ${px + 2.5} ${py} ${pz + 0.5}`);
      await sleep(900);
      // 叠位：把玩家 tp 到怪身上（dx=dz=0，A-2 原配方）
      await chat(`tp @p @e[type=etim:longdead,c=1]`);
      await sleep(200);
      const near = livingNear(bot, 4);
      const ring = near.map((e) => `${e.name || '(noname)'}#${e.id}@${e.position.distanceTo(bot.entity.position).toFixed(3)}`);
      const i0 = logOffset();
      const nPkt = sent.length;
      const t0 = Date.now();
      for (const e of near) { try { bot.attack(e); } catch (err) { say('ATTACK_ERR', err.message); } }
      const pkts = sent.slice(nPkt).map((p) => `id=${p.target}/mouse=${p.mouse}`);
      let echo = '', rtt = -1, err = '';
      try {
        echo = await rcon.cmd('time query gametime', 12000);
        rtt = Date.now() - t0;
      } catch (e) { err = e.message; rtt = Date.now() - t0; }
      await sleep(400);
      const t = logSince(i0);
      const deny = rows(t, /weakStrike deny/).map((l) => (l.match(/dx=[-\d.eE]+ dz=[-\d.eE]+/) || ['(no axis)'])[0]);
      const reach = rows(t, /reach denied/).length;
      results.push({ i, near: near.length, ring, rtt, echo, err, deny, pkts, reach });
      say(`R1 atk${i}: near=${near.length} ring=${ring.join('|') || '(none)'} held=${bot.heldItem ? bot.heldItem.name : '(empty)'} pkts=${JSON.stringify(pkts)}`
        + ` rtt=${rtt}ms echo='${echo}' deny=${JSON.stringify(deny)} reachDenied=${reach}${err ? ' ERR=' + err : ''}`);
      await sleep(500);
    }
    // 30 s 存活观测
    const s0 = logOffset();
    say('R1 survival: 30s watch start');
    await sleep(30000);
    const t = logSince(s0);
    const alive = await rcon.cmd('time query gametime', 8000).catch((e) => 'TIMEOUT:' + e.message);
    say('R1 survival 30s: watchdog=' + count(t, /Watching Server|ServerHangWatchdog/)
      + ' CME=' + count(t, /ConcurrentModificationException/)
      + ' tickTimeout=' + count(t, /tick took|Exception ticking world/)
      + " aliveEcho='" + alive + "'");
    const tall = logSince(off);
    const all = rows(tall, /weakStrike deny/);
    say('R1 window totals: attacks=' + results.length
      + ' denyRows=' + all.length
      + ' denyDegenerate=' + all.filter((l) => /dx=0\.01 dz=0\.01/.test(l)).length
      + ' denyReal=' + all.filter((l) => !/dx=0\.01 dz=0\.01/.test(l)).length);
    say('R1 deny rows:', all.map((l) => l.trim().slice(0, 170)));
    await unmark('r1');
  }

  if (phase === 'r3') {
    const off = await mark('r3');
    await chat('gamerule doMobLoot false');
    await chat('kill @e[type=item]');
    await chat('clear @p');
    try { bot.setQuickBarSlot(8); } catch (e) {}
    await sleep(600);
    say('R3 pre: heldItem=' + (bot.heldItem ? bot.heldItem.name : '(empty)'));
    const out = [];
    for (let i = 1; i <= 3; i++) {
      await chat('kill @e[type=etim:longdead]');
      await chat(`tp @p ${px + 0.5} ${py} ${pz + 0.5}`);
      await sleep(250);
      await chat(`summon etim:longdead ${px + 1.6} ${py} ${pz + 0.5}`);
      await sleep(1200);
      const near = livingNear(bot, 4);
      const tgt = near[0];
      if (tgt) {
        // 正视目标中心，保证 reach 射线命中（mineflayer 默认不 lookAt）
        try { await bot.lookAt(tgt.position.offset(0, (tgt.height || 1.8) * 0.55, 0), true); } catch (e) { say('LOOK_ERR', e.message); }
        await sleep(220);
      }
      const dist = tgt ? tgt.position.distanceTo(bot.entity.position).toFixed(3) : 'n/a';
      const i0 = logOffset();
      const t0 = Date.now();
      for (const e of near) { try { bot.attack(e); } catch (err) { say('ATTACK_ERR', err.message); } }
      const echo = await rcon.cmd('time query gametime', 12000).catch(() => 'TIMEOUT');
      await sleep(500);
      const t = logSince(i0);
      const deny = rows(t, /weakStrike deny/).map((l) => (l.match(/dx=[-\d.eE]+ dz=[-\d.eE]+/) || ['(no axis)'])[0]);
      const reachDeny = rows(t, /reach denied/).map((l) => l.trim().slice(0, 110));
      out.push({ i, dist, deny, reachDeny });
      say(`R3 atk${i}: dist=${dist} rtt=${Date.now() - t0}ms echo='${echo}' deny=${JSON.stringify(deny)} reachDeny=${JSON.stringify(reachDeny)}`);
    }
    const all = rows(logSince(off), /weakStrike deny/);
    say('R3 totals: denyRows=' + all.length
      + ' fixedLiteral=' + all.filter((l) => /dx=0\.01 dz=0\.01/.test(l)).length
      + ' realAxis=' + all.filter((l) => !/dx=0\.01 dz=0\.01/.test(l)).length);
    await unmark('r3');
  }

  if (phase === 'r3b') {
    // 非退化带的定点样本：NoAI 怪定在 +1.1 格，正视攻击 → 距离落在 0.8~1.2
    const off = await mark('r3b');
    await chat('gamerule doMobLoot false');
    await chat('kill @e[type=item]');
    await chat('clear @p');
    try { bot.setQuickBarSlot(8); } catch (e) {}
    await sleep(600);
    const out = [];
    for (let i = 1; i <= 3; i++) {
      await chat('kill @e[type=etim:longdead]');
      await chat('tp @p ' + (px + 0.5) + ' ' + py + ' ' + (pz + 0.5));
      await sleep(300);
      await chat('summon etim:longdead ' + (px + 1.6) + ' ' + py + ' ' + (pz + 0.5) + ' {NoAI:1b}');
      await sleep(900);
      const near = livingNear(bot, 4);
      const tgt = near[0];
      if (tgt) { try { await bot.lookAt(tgt.position.offset(0, (tgt.height || 1.8) * 0.55, 0), true); } catch (e) {} await sleep(200); }
      const dist = tgt ? tgt.position.distanceTo(bot.entity.position).toFixed(3) : 'n/a';
      const i0 = logOffset();
      const t0 = Date.now();
      for (const e of near) { try { bot.attack(e); } catch (err) { say('ATTACK_ERR', err.message); } }
      const echo = await rcon.cmd('time query gametime', 12000).catch(() => 'TIMEOUT');
      await sleep(500);
      const t = logSince(i0);
      const deny = rows(t, /weakStrike deny/).map((l) => (l.match(/dx=[-\d.eE]+ dz=[-\d.eE]+/) || ['(no axis)'])[0]);
      const reachDeny = rows(t, /reach denied/).length;
      out.push({ dist, deny });
      say('R3b atk' + i + ': dist=' + dist + ' rtt=' + (Date.now() - t0) + 'ms echo=' + echo + ' deny=' + JSON.stringify(deny) + ' reachDenied=' + reachDeny);
    }
    const all = rows(logSince(off), /weakStrike deny/);
    say('R3b totals: denyRows=' + all.length + ' fixedLiteral=' + all.filter((l) => /dx=0\.01 dz=0\.01/.test(l)).length + ' realAxis=' + all.filter((l) => !/dx=0\.01 dz=0\.01/.test(l)).length);
    await unmark('r3b');
  }
  if (phase === 'r3c') {
    // 非退化带定点：召在 +3 格，轮询等怪走到 0.8~1.2 再正视攻击
    const off = await mark('r3c');
    await chat('gamerule doMobLoot false');
    await chat('kill @e[type=item]');
    await chat('clear @p');
    try { bot.setQuickBarSlot(8); } catch (e) {}
    await sleep(600);
    const out = [];
    for (let i = 1; i <= 3; i++) {
      await chat('kill @e[type=etim:longdead]');
      await chat('tp @p ' + (px + 0.5) + ' ' + py + ' ' + (pz + 0.5));
      await sleep(300);
      await chat('summon etim:longdead ' + (px + 3.5) + ' ' + py + ' ' + (pz + 0.5));
      let tgt = null, band = false;
      for (let k = 0; k < 30; k++) {
        await sleep(200);
        const near = livingNear(bot, 6);
        if (!near.length) continue;
        tgt = near[0];
        const d = tgt.position.distanceTo(bot.entity.position);
        if (d >= 0.8 && d <= 1.2) { band = true; break; }
      }
      if (!tgt) { say('R3c atk' + i + ': no target'); continue; }
      try { await bot.lookAt(tgt.position.offset(0, (tgt.height || 1.8) * 0.55, 0), true); } catch (e) {}
      await sleep(150);
      const dist = tgt.position.distanceTo(bot.entity.position).toFixed(3);
      const i0 = logOffset();
      const t0 = Date.now();
      const near2 = livingNear(bot, 6);
      for (const e of near2) { try { bot.attack(e); } catch (err) { say('ATTACK_ERR', err.message); } }
      const echo = await rcon.cmd('time query gametime', 12000).catch(() => 'TIMEOUT');
      await sleep(450);
      const t = logSince(i0);
      const deny = rows(t, /weakStrike deny/).map((l) => (l.match(/dx=[-\d.eE]+ dz=[-\d.eE]+/) || ['(no axis)'])[0]);
      const reachDeny = rows(t, /reach denied/).length;
      out.push({ dist, band, deny });
      say('R3c atk' + i + ': dist=' + dist + ' inBand=' + band + ' rtt=' + (Date.now() - t0) + 'ms echo=' + echo + ' deny=' + JSON.stringify(deny) + ' reachDenied=' + reachDeny);
    }
    const all = rows(logSince(off), /weakStrike deny/);
    say('R3c totals: denyRows=' + all.length + ' fixedLiteral=' + all.filter((l) => /dx=0\.01 dz=0\.01/.test(l)).length + ' realAxis=' + all.filter((l) => !/dx=0\.01 dz=0\.01/.test(l)).length);
    await unmark('r3c');
  }

  if (phase === 'r4') {
    const off = await mark('r4');
    await chat('gamerule doMobLoot false');
    await chat('kill @e[type=item]');
    await chat('clear @p');
    await sleep(400);
    await chat('give @p minecraft:iron_sword');
    await sleep(900);
    try {
      const sword = bot.inventory.items().find((i) => /iron_sword/.test(i.name || ''));
      if (sword) { await bot.equip(sword, 'hand'); await sleep(600); }
      say('R4 equipped:', sword ? sword.name : '(none)');
    } catch (e) { say('R4 equip failed:', e.message); }
    const out = [];
    for (let i = 1; i <= 3; i++) {
      await chat('kill @e[type=etim:longdead]');
      await chat(`summon etim:longdead ${px + 1.2} ${py} ${pz + 0.5}`);
      await sleep(1000);
      const hp0 = await hpOf(rcon, 'etim:longdead');
      const near = livingNear(bot, 4);
      const tgt = near[0];
      if (tgt) { try { await bot.lookAt(tgt.position.offset(0, (tgt.height || 1.8) * 0.55, 0), true); } catch (e) {} await sleep(200); }
      const i0 = logOffset();
      for (const e of near) { try { bot.attack(e); } catch (err) { say('ATTACK_ERR', err.message); } }
      await sleep(900);
      const hp1 = await hpOf(rcon, 'etim:longdead');
      const t = logSince(i0);
      const deny = rows(t, /weakStrike deny/).length;
      const reachDeny = rows(t, /reach denied/).length;
      out.push({ i, hp0, hp1, deny, reachDeny });
      say(`R4 atk${i}: hpBefore=${hp0} hpAfter=${hp1} denyRows=${deny} reachDenied=${reachDeny}`);
    }
    const all = rows(logSince(off), /weakStrike deny/);
    say('R4 totals: attacks=' + out.length + ' denyRows=' + all.length
      + ' damaged=' + out.filter((o) => o.hp0 !== o.hp1).length);
    await unmark('r4');
  }

  await chat('kill @e[type=etim:longdead]');
  await chat('effect @p clear');
  await sleep(600);
  bot.quit();
  setTimeout(() => process.exit(0), 900);
})().catch(async (e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
