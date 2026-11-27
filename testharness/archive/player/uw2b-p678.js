#!/usr/bin/env node
/**
 * uw2b-p678.js — WP6（成就）/ WP7（矿支 sweep）/ WP10（箭面）执行器
 * 判维：日志末态单源（enter to=-2 / leave to=0 / portal-place dim=X）。
 * 用法：node uw2b-p678.js <p6|p7|p10>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2b-state.json');
const NAME = 'ETIM_Harn01';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } };
const saveState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

function syncDim() {
  const t = logAll();
  let dim = 0;
  for (const l of t.split('\n')) {
    if (/\[DimLog\] enter player=.*to=-2/.test(l)) dim = -2;
    else if (/\[DimLog\] leave player=.*to=0/.test(l)) dim = 0;
    else { const m = l.match(/\[DimLog\] portal-place dim=(-?\d+)/); if (m) dim = Number(m[1]); }
  }
  return dim;
}

class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s = net.connect(25575, '127.0.0.1', () => res());
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
      const to = setTimeout(() => rej(new Error('rcon timeout: ' + b)), timeoutMs || 25000);
      this.q.push((x) => { clearTimeout(to); res(x); });
      this.s.write(this.pkt(id, t, b));
    });
  }
  async auth() { return this.send(1, 3, 'etim27'); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

(async () => {
  const phase = (process.argv[2] || 'p6').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(400); };
  const st = loadState();
  const probe = async (x, y, z, blk) => {
    const n0 = replies.length;
    bot.chat(`/testforblock ${x} ${y} ${z} ${blk}`);
    await sleep(340);
    const got = replies.slice(n0).join(' | ');
    if (/Successfully found/.test(got)) return { ok: true, actual: blk };
    const m = got.match(/is (.+?) \(expected/);
    return { ok: false, actual: m ? m[1] : '?' };
  };
  const pos = async () => {
    try {
      const echo = await rcon.cmd('tp ' + NAME + ' ~ ~ ~');
      const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
      return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
    } catch (e) { return null; }
  };
  const goto = async (want) => {
    const cur = syncDim();
    say('  syncDim=' + cur + ' want=' + want);
    if (cur === want) return true;
    for (let a = 0; a < 6; a++) {
      const off = logOffset();
      await chat(want === -2 ? 'etim dim enter' : 'etim dim leave');
      for (let i = 0; i < 12; i++) {
        await sleep(1500);
        const t = logSince(off);
        if (want === -2 && /enter player=.*to=-2/.test(t)) { say('  -> -2'); return true; }
        if (want === 0 && /leave player=.*to=0/.test(t)) { say('  -> 0'); return true; }
        if (/enter-reject/.test(t)) break;
      }
      say('  goto retry ' + (a + 1));
      await sleep(5000);
    }
    return false;
  };
  const stepAway = async () => {
    const p = await pos();
    if (!p) return null;
    await chat(`tp @p ${Math.floor(p.x) + 4}.5 ${Math.floor(p.y) + 1} ${Math.floor(p.z) + 4}.5`);
    await sleep(4000);
    return p;
  };
  const buffs = async (spawn) => {
    await chat('gamemode 0');
    await chat('effect @p clear');
    await chat('effect @p resistance 9999 4');
    await chat('effect @p regeneration 9999 4');
    await chat('effect @p saturation 9999 4');
    if (spawn !== undefined) await chat('gamerule doMobSpawning ' + spawn);
    await chat('difficulty 1');
    await sleep(400);
  };
  /** 在 (x,y,z) 开一个 3×3 的空气口袋 + y-1 石板，然后把玩家放进去 */
  const pocket = async (x, y, z) => {
    await chat(`fill ${x - 1} ${y + 1} ${z - 1} ${x + 1} ${y + 4} ${z + 1} minecraft:air`);
    await chat(`fill ${x - 1} ${y} ${z - 1} ${x + 1} ${y} ${z + 1} minecraft:stone`);
    await chat(`tp @p ${x + 0.5} ${y + 1} ${z + 0.5}`);
    await sleep(1800);
  };

  const ap = st.arrive || { x: -108, y: 218, z: 201 };
  const bx = Math.floor(ap.x), bz = Math.floor(ap.z);

  /* ---------------------------------------------------------------- WP6 */
  if (phase === 'p6') {
    await stepAway();
    await sleep(18000);
    if (!(await goto(-2))) { say('ABORT p6 enter'); process.exit(2); }
    await buffs(false);
    say('WP6 dim -2, start pos=' + JSON.stringify(await pos()));
    // 服务端侧（chat）扫 y=1..2：找「四邻任一是 mantle_or_core」的可挖块（先 y=1）
    let cand = null, mantleHits = 0, probes = 0;
    outer:
    for (const y of [1, 2]) {
      for (let dx = 0; dx < 14; dx++) {
        for (let dz = 0; dz < 14; dz++) {
          const x = bx + dx, z = bz + dz;
          probes++;
          const self = await probe(x, y, z, 'etim:mantle_or_core');
          if (self.ok) { mantleHits++; continue; }
          if (/bedrock|mantle/i.test(self.actual)) continue;
          for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
            probes++;
            if ((await probe(nx, y, nz, 'etim:mantle_or_core')).ok) {
              cand = { x, y, z, self: self.actual, mantleAt: nx + ',' + y + ',' + nz };
              break outer;
            }
          }
        }
      }
    }
    say('WP6 cand=' + JSON.stringify(cand) + ' mantleHits=' + mantleHits + ' probes=' + probes + ' dim=' + syncDim());
    if (!cand) { say('WP6 no candidate'); process.exit(3); }
    // 口袋：只清目标列上方与两侧，保留目标块与 mantle 邻块
    await chat(`fill ${cand.x} ${cand.y + 1} ${cand.z} ${cand.x} ${cand.y + 4} ${cand.z} minecraft:air`);
    await chat(`fill ${cand.x - 1} ${cand.y + 1} ${cand.z} ${cand.x - 1} ${cand.y + 3} ${cand.z} minecraft:air`);
    await chat(`fill ${cand.x} ${cand.y + 1} ${cand.z - 1} ${cand.x} ${cand.y + 3} ${cand.z - 1} minecraft:air`);
    await chat(`tp @p ${cand.x + 0.5} ${cand.y + 1} ${cand.z + 0.5}`);
    await sleep(1800);
    say('WP6 target=' + JSON.stringify(cand) + ' server=' + (await probe(cand.x, cand.y, cand.z, cand.self)).actual
      + ' pos=' + JSON.stringify(await pos()));
    const off = logOffset();
    try {
      await bot.lookAt(new Vec3(cand.x + 0.5, cand.y + 0.5, cand.z + 0.5), true);
      await sleep(500);
      const blk = bot.blockAt(new Vec3(cand.x, cand.y, cand.z));
      say('WP6 client view=' + (blk ? blk.name : 'null'));
      if (blk) await bot.dig(blk);
      else await bot.dig({ position: new Vec3(cand.x, cand.y, cand.z), name: cand.self });
    } catch (e) { say('WP6 dig err ' + e.message); }
    await sleep(3000);
    const t = logSince(off);
    const ach = rows(t, /achievement-portalToNether/);
    say('WP6 achievement rows=' + ach.length);
    ach.forEach((l) => say('   ' + cut(l.trim(), 200)));
    say('WP6 target now air? ' + (await probe(cand.x, cand.y, cand.z, 'minecraft:air')).ok);
    await chat('advancement test ' + NAME + ' etim:portal_to_nether');
    await sleep(1500);
    say('WP6 soe=' + count(t, /StackOverflowError/));
  }

  /* ---------------------------------------------------------------- WP7 + WP8 */
  if (phase === 'p7') {
    await stepAway();
    await sleep(18000);
    if (!(await goto(-2))) { say('ABORT p7 enter'); process.exit(2); }
    await buffs(true);
    const y0 = Math.floor(ap.y);
    say('WP7 sweep start pos=' + JSON.stringify(await pos()) + ' y0=' + y0 + ' dim=' + syncDim());
    const off = logOffset();
    for (let i = 0; i < 14; i++) {
      const tx = bx + 24 * (i + 1), tz = bz + 8 * ((i % 3) - 1);
      await chat(`fill ${tx - 1} ${y0 + 1} ${tz - 1} ${tx + 1} ${y0 + 3} ${tz + 1} minecraft:air`);
      await chat(`fill ${tx - 1} ${y0} ${tz - 1} ${tx + 1} ${y0} ${tz + 1} minecraft:stone`);
      await chat(`tp @p ${tx + 0.5} ${y0 + 1} ${tz + 0.5}`);
      await sleep(3000);
      const t = logSince(off);
      say('WP7 step ' + (i + 1) + ' gen=' + count(t, /gen chunk=/) + ' ore=' + count(t, /\[OreLog\] ore=/)
        + ' dungeon=' + count(t, /\[SpawnLog\] dungeon/) + ' soe=' + count(t, /StackOverflowError/));
    }
    await sleep(3000);
    const t = logSince(off);
    const chunks = new Set();
    rows(t, /\[OreLog\] ore=ore_adamantium dim=-2 chunk=\((-?\d+),(-?\d+)\)/).forEach((l) => {
      const m = l.match(/chunk=\((-?\d+),(-?\d+)\)/); if (m) chunks.add(m[1] + ',' + m[2]);
    });
    const adam = rows(t, /\[OreLog\] ore=ore_adamantium/);
    const rolls = new Set(adam.map((l) => (l.match(/rolls=(\d+)/) || [])[1]));
    const veins = adam.map((l) => Number((l.match(/veins=(\d+)/) || [])[1] || 0));
    const meanVeins = veins.length ? veins.reduce((a, b) => a + b, 0) / veins.length : 0;
    say('WP7 adamantium rows=' + adam.length + ' chunks=' + chunks.size + ' rollsSet={' + [...rolls].join(',') + '}'
      + ' veins/chunk=' + meanVeins.toFixed(2) + ' gen=' + count(t, /gen chunk=/));
    const dg = rows(t, /\[SpawnLog\] dungeon/);
    const guard = dg.filter((l) => /spawner=longdead_guardian/.test(l)).length;
    const chest = rows(t, /\[TestLog\] dungeon-chest/);
    const chest16 = chest.filter((l) => /rows=16/.test(l)).length;
    say('WP8 dungeon rows=' + dg.length + ' guardian=' + guard + ' ratio=' + (dg.length ? (guard / dg.length).toFixed(4) : 'n/a')
      + ' | chest rows=' + chest.length + ' rows=16 hits=' + chest16);
    const dchunks = new Set(dg.map((l) => {
      const m = l.match(/x=(-?\d+) y=(-?\d+) z=(-?\d+)/);
      return m ? (Math.floor(+m[1] / 16)) + ',' + (Math.floor(+m[3] / 16)) : '?';
    }));
    say('WP8 dungeon chunks=' + dchunks.size);
    dg.slice(0, 5).forEach((l) => say('   ' + cut(l.trim(), 200)));
    chest.slice(0, 3).forEach((l) => say('   ' + cut(l.trim(), 200)));
    say('WP7 soe=' + count(t, /StackOverflowError/) + ' watchdog=' + count(t, /watchdog|Timed out/i)
      + ' end pos=' + JSON.stringify(await pos()));
    // 全窗累计（本次 boot）
    const all = logAll();
    say('SESSION: gen=' + count(all, /gen chunk=/) + ' oreRows=' + count(all, /\[OreLog\] ore=/)
      + ' dungeon=' + count(all, /\[SpawnLog\] dungeon/) + ' chest=' + count(all, /\[TestLog\] dungeon-chest/)
      + ' soe=' + count(all, /StackOverflowError/) + ' crashReports?=' + count(all, /This crash report has been saved/));
  }

  /* ---------------------------------------------------------------- WP10 */
  if (phase === 'p10') {
    await stepAway();
    await sleep(18000);
    if (!(await goto(-2))) { say('ABORT p10 enter'); process.exit(2); }
    await buffs(true);
    const y0 = Math.floor(ap.y);
    const x0 = bx + 6, z0 = bz + 6;
    await chat(`fill ${x0 - 5} ${y0} ${z0 - 5} ${x0 + 5} ${y0 + 3} ${z0 + 5} minecraft:air`);
    await chat(`fill ${x0 - 5} ${y0 - 1} ${z0 - 5} ${x0 + 5} ${y0 - 1} ${z0 + 5} minecraft:stone`);
    await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
    await sleep(2000);
    say('WP10 platform pos=' + JSON.stringify(await pos()) + ' dim=' + syncDim());
    await chat('kill @e[type=etim:longdead]');
    await chat('kill @e[type=arrow,r=60]');
    await sleep(800);
    const off = logOffset();
    let ranged = false;
    for (let i = 0; i < 12 && !ranged; i++) {
      await chat('kill @e[type=etim:longdead]');
      await sleep(300);
      const o2 = logOffset();
      await chat(`summon etim:longdead ${x0 + 4.5} ${y0} ${z0 + 0.5}`);
      await sleep(1400);
      const tt = logSince(o2);
      ranged = /longdead equip type=ranged/.test(tt);
      say('WP10 try ' + (i + 1) + ' ranged=' + ranged + ' | '
        + rows(tt, /longdead equip/).map((l) => cut(l.trim(), 130)).join(' || '));
    }
    for (let i = 0; i < 25; i++) {
      await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
      await sleep(1200);
      if (count(logSince(off), /longdead arrow intended/) > 0) break;
    }
    const t = logSince(off);
    const ar = rows(t, /longdead arrow intended/);
    say('WP10 arrow intended rows=' + ar.length);
    ar.slice(0, 4).forEach((l) => say('   ' + cut(l.trim(), 190)));
    await sleep(4000);
    const off2 = logOffset();
    await chat('/execute @e[type=arrow,r=60] ~ ~ ~ say UW2B_ARROW_VANILLA');
    await sleep(1500);
    await chat('/execute @e[type=etim:arrow] ~ ~ ~ say UW2B_ETIM_ARROW');
    await sleep(1500);
    const t2 = logSince(off2);
    say('WP10 vanilla-arrow say rows=' + count(t2, /UW2B_ARROW_VANILLA/) + ' | etim:arrow rows=' + count(t2, /UW2B_ETIM_ARROW/));
    rows(t2, /UW2B_ARROW_VANILLA|Entity type 'etim:arrow' is invalid|UW2B_ETIM_ARROW/).slice(0, 4)
      .forEach((l) => say('   ' + cut(l.trim(), 170)));
    say('WP10 soe=' + count(t, /StackOverflowError/) + ' dim=' + syncDim() + ' pos=' + JSON.stringify(await pos()));
  }

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
