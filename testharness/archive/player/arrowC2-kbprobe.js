#!/usr/bin/env node
/**
 * arrowC2-kbprobe.js — W16' 击退系数探针（plain / punch / 无伤 skip 三臂）
 *
 * 观测面：目标 mob（NoAI villager）的**存档 Motion**（ents 面 Health>0）。
 * 每臂命中后连拍 8 帧（~120ms/帧），对 |h| 做 log-linear 拟合求 t=0 初速 v0，
 * 以消除「命中→落盘」的 tick 偏移。判据：v0(punch) − v0(plain) ≈ 0.6。
 *
 * 附：tp @e 读服务端位置（不经存档）；存档 Pos 前后比对。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { execFileSync } = require('child_process');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const NBT = path.join(__dirname, 'arrowB-nbt.js');
const OUT = path.join(ROOT, 'build-logs', 'arrowC2-kbprobe.json');
const NAME = 'ETIM_Harn01';
const WORLD = 'arrowc2';
const GY = 4;
const TAG = String(Date.now() % 100000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const parseHit = (line) => {
  const m = /arrow hit target=(.+?) raw=([-\d.]+) mult=([-\d.]+) floor=([-\d.]+) crit=([01]) final=([-\d.]+)(?: skip=([\w-]+))?/.exec(line);
  if (!m) return null;
  return { target: m[1], raw: +m[2], mult: +m[3], floor: +m[4], crit: +m[5], final: +m[6], skip: m[7] || null };
};
const hits = (t) => rows(t, /arrow hit /).map(parseHit).filter(Boolean);
const ng = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toFixed(4));

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

/** log-linear 拟合：ln|h| = a + k t → v0 = e^a */
function fitV0(samples) {
  const pts = samples.filter((s) => s.horiz !== null && s.horiz > 1e-4);
  if (pts.length < 2) return { n: pts.length, v0: null, k: null };
  const xs = pts.map((s) => s.at);
  const ys = pts.map((s) => Math.log(s.horiz));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
  const k = den === 0 ? 0 : num / den;
  const a = my - k * mx;
  return { n, v0: Math.exp(a), k, halfMs: k === 0 ? null : Math.log(0.5) / k };
}

(async () => {
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd('gamerule doDaylightCycle false');
  await rcon.cmd('time set 1000');
  await rcon.cmd('gamerule showDeathMessages true');

  const gametime = async () => {
    const m = String(await rcon.cmd('time query gametime', 8000)).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  };
  const inv = () => {
    try { return JSON.parse(execFileSync(process.execPath, [NBT, 'inv', WORLD, NAME], { encoding: 'utf8' }).trim().split('\n').pop()); }
    catch (e) { return { error: e.message }; }
  };
  const snapMob = (name) => {
    try {
      const arr = JSON.parse(execFileSync(process.execPath, [NBT, 'ents', WORLD, 'overworld', '104', '250', '5'], { encoding: 'utf8' }).trim().split('\n').pop());
      return arr.find((e) => String(e.CustomName) === name && typeof e.Health === 'number' && e.Health > 0) || null;
    } catch (e) { return null; }
  };
  const sample = async (name) => {
    const g0 = await gametime();
    await rcon.cmd('save-all', 30000);
    const e = snapMob(name);
    const g1 = await gametime();
    return { g0, g1, dt: (g0 !== null && g1 !== null) ? g1 - g0 : null,
      motion: e && e.Motion ? e.Motion : null,
      horiz: e && e.Motion ? Math.hypot(e.Motion[0], e.Motion[2]) : null,
      pos: e ? e.Pos : null, health: e ? e.Health : null };
  };
  const tpPos = async (name) => {
    const r = String(await rcon.cmd('tp @e[name=' + name + '] ~ ~ ~', 8000));
    const m = r.match(/to ([-\d.]+), ([-\d.]+), ([-\d.]+)/);
    return m ? [+m[1], +m[2], +m[3]] : r.slice(0, 60);
  };

  const results = [];
  /** mode: 'shot' 常规射击；'probe' 慢速探针箭（skip=slow，无伤害） */
  const arm = async (label, z, enchTag, mode) => {
    const name = 'KB' + label.replace(/[^A-Za-z]/g, '') + TAG;
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} ${z}.5`);
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await sleep(900);
    await rcon.cmd('kill @e[type=!player]');
    await sleep(500);
    await rcon.cmd('summon minecraft:villager 104.5 4 ' + z + '.5 {CustomName:"' + name + '",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b,ActiveEffects:[{Id:11b,Amplifier:4,Duration:9999,ShowParticles:0b}]}');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd('give ' + NAME + ' minecraft:bow 1' + (enchTag ? ' 0 ' + enchTag : ''));
    await rcon.cmd('give ' + NAME + ' etim:arrow_ancient_metal 8');
    await sleep(2200);
    await rcon.cmd('save-all', 30000);
    await sleep(1000);
    const invDump = inv();
    const bow = (invDump.Inventory || []).find((i) => i.id === 'minecraft:bow');
    const e0 = snapMob(name);
    say('[' + label + '] bow tag=' + JSON.stringify(bow ? bow.tag : null) + ' | e0=' + (e0 ? e0.Pos.map((v) => v.toFixed(2)).join(',') : 'NONE'));

    let hit = null;
    const off = logOffset();
    if (mode === 'probe') {
      await rcon.cmd('summon etim:metal_arrow 103.3 5.0 ' + (z + 0.5) + ' {CustomName:"' + name + 'Probe",Motion:[0.5,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}');
    } else {
      for (let attempt = 0; attempt < 2 && !hit; attempt++) {
        const aimY = [5.4, 5.1][attempt];
        await bot.lookAt(new Vec3(104.5, aimY, z + 0.5), true);
        await sleep(650);
        const bowItem = bot.inventory.items().find((i) => i.name === 'bow');
        if (!bowItem) { say('[' + label + '] ! no bow'); return { label, error: 'no bow' }; }
        await bot.equip(bowItem, 'hand');
        await sleep(600);
        bot.activateItem();
        await sleep(1600);
        bot.deactivateItem();
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
          hit = hits(logSince(off)).find((x) => x.target === name) || null;
          if (hit) break;
          await sleep(25);
        }
        say('[' + label + '] attempt#' + (attempt + 1) + ' hit=' + (hit ? 'raw=' + hit.raw + ' final=' + hit.final + (hit.skip ? ' skip=' + hit.skip : '') : 'NONE'));
      }
    }
    if (mode === 'probe') {
      const t0 = Date.now();
      while (Date.now() - t0 < 6000) {
        hit = hits(logSince(off)).find((x) => x.target === name) || null;
        if (hit) break;
        await sleep(25);
      }
      say('[' + label + '] probe hit=' + (hit ? 'raw=' + hit.raw + (hit.skip ? ' skip=' + hit.skip : '') : 'NONE'));
    }

    const samples = [];
    if (hit) {
      const tHit = Date.now();
      for (let i = 0; i < 5; i++) {
        if (i) await sleep(80);
        const s = await sample(name);
        s.at = Date.now() - tHit;
        samples.push(s);
        if (!s.motion) break;
      }
    }
    const srvPos = await tpPos(name);
    await sleep(1800);
    await rcon.cmd('save-all', 30000);
    await sleep(800);
    const e1 = snapMob(name);
    const disp = (e0 && e1) ? Math.hypot(e1.Pos[0] - e0.Pos[0], e1.Pos[2] - e0.Pos[2]) : null;
    samples.forEach((s, i) => say('[' + label + '] s' + i + ' at=' + s.at + ' dt=' + s.dt + ' Motion=[' +
      (s.motion ? s.motion.map((v) => v.toFixed(4)).join(',') : '-') + '] |h|=' + ng(s.horiz)));
    const fit = fitV0(samples);
    say('[' + label + '] 拟合 v0=' + ng(fit.v0) + ' k=' + ng(fit.k) + '/ms (n=' + fit.n + ')'
      + ' | tp位置=' + JSON.stringify(srvPos) + ' 存档终点=' + (e1 ? e1.Pos.map((v) => v.toFixed(2)).join(',') : 'NONE')
      + ' 位移=' + ng(disp) + ' health=' + (e1 ? Number(e1.Health).toFixed(2) : '-'));
    const r = { label, mode, enchTag: enchTag || null, bowTag: bow ? bow.tag : null, hit, samples, fit,
      srvPos, disp, health: e1 ? e1.Health : null };
    results.push(r);
    await rcon.cmd(`kill @e[name=${name}]`);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    return r;
  };

  const plain = await arm('plain', 250, null, 'shot');
  const punch = await arm('punch', 240, '{ench:[{id:49,lvl:1}]}', 'shot');
  const plain2 = await arm('plain2', 260, null, 'shot');
  const punch2 = await arm('punch2', 245, '{ench:[{id:49,lvl:1}]}', 'shot');

  const dv = (plain2.fit.v0 !== null && punch.fit.v0 !== null) ? (punch.fit.v0 - plain2.fit.v0) : null;
  const ratio = (plain2.fit.v0 && punch.fit.v0) ? punch.fit.v0 / plain2.fit.v0 : null;
  say('W16-kb 判值: v0(plain)=' + ng(plain.fit.v0) + ' v0(plain2)=' + ng(plain2.fit.v0)
    + ' v0(punch)=' + ng(punch.fit.v0) + ' v0(punch2)=' + ng(punch2.fit.v0)
    + ' Δ(punch-plain2)=' + ng(dv) + ' ratio=' + ng(ratio) + ' (期望 1+0.6/0.4=2.50)');

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');
  say('probe done -> ' + OUT);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
