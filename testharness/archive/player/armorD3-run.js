#!/usr/bin/env node
/**
 * armorD2-run.js — 批 D 复验窗 driver（会话七，2026-10-26）
 *
 * 相位（W1~W19，修正口径见 armorD-recheck 任务书 §三）：
 *   p0  通道/崩服 smoke（= W1 空手僵尸近战）
 *   w1  空手：prot armor=0.000 total=0.000；armorOut=max(raw,1)
 *   w2  皮革满套：armor=3.500
 *   w3  铜满套：armor=7.000
 *   w4  艾德曼满套 + 箭 raw≈9.0：armor=10.000，armorOut=1.000 级
 *   w5  艾德曼+保护 IV×4 + 箭 raw≈8.4：armor=15.000，armorOut∈{1.0,0.0}
 *   w6  10 格摔 + 羽落 IV：armor=15.000，armorOut=max(raw-15,1)
 *   w7  ①火里空手 armor=0.000；②火里皮革+火保护 IV×4 armor=3.500（C-2 修正）
 *   w8  TNT + 爆炸保护 IV×4：armor=材质+afterWear，src=explosion
 *   w9  抗性 II + 僵尸：potion=10.000，armorOut=max(raw-10,1)
 *   w10 starve（etest food 0）/ outOfWorld（void）：armorOut=raw 且无 prot 行
 *   w11 inWall 窒息（C-3 修正）：armor=0.000，armorOut=max(raw,1)
 *   w12 ①玩家铜 ← 箭；②僵尸铜 ← 箭：7.000 / 3.500（C-1 修正）
 *   w13 艾德曼 Unbreakable + 100 箭：0.000 率 ∈[0.20,0.55]
 *   w14 艾德曼+保护 IV Unbreakable + 100 箭：率 ∈[0.65,0.90]
 *   w15 铜满套 20 近战：Σ耐久差=Σwear；另加预损臂看 armor 下降（C-5 工装注记）
 *   w16 铜靴 max-1 + 其余满耐久：armor≈5.833
 *   w17 bot 打 longdead/guardian：natural=1.000/2.000；火伤 → 0.000（C-4 修正）
 *   w18 附魔金苹果 + 僵尸：absorption>0，armorOut=b+f
 *   w19 单独 boot（armorModelR196=false）另脚本
 *
 * 判据通道：latest.log 的 [DamageLog] dmg/prot 两行 + bot 背包元数据 + 存档离线 NBT。
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
const OUT = path.join(ROOT, 'build-logs', 'armorD3-report.json');
const NAME = 'ETIM_Harn01';
const WORLD = 'armorD';
const GY = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const rowsOf = (t, re) => t.split('\n').filter((l) => re.test(l));
const countOf = (t, re) => rowsOf(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);
const f3 = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toFixed(3));
/* A-3 修复后的统一判据（armorD-recheck2）：
 *   inIsRaw  = dmg 行 armorIn == raw（R196 拿到的是原始量，未吃 vanilla 乘法）；
 *   outIs    = armorOut ∈ { max(raw-total,1), 0.000 }（0 = 20% 全免骰，P=1-0.8^(delta+1)）。 */
const inIsRaw = (d) => !!d && Math.abs(d.armorIn - d.raw) < 0.0021;
const outIs = (d, total) => !!d && (Math.abs(d.armorOut - Math.max(d.raw - total, 1)) < 0.011 || d.armorOut === 0);

const parseDmg = (line) => {
  const m = /dmg target=(.+?)#(\d+) src=(\S+) raw=([-\d.]+) armorIn=([-\d.]+) armorOut=([-\d.]+) absorption=([-\d.]+) final=([-\d.]+)/.exec(line);
  return m ? { name: m[1], id: +m[2], src: m[3], raw: +m[4], armorIn: +m[5], armorOut: +m[6], absorption: +m[7], final: +m[8], line: line.trim() } : null;
};
const parseProt = (line) => {
  const m = /prot target=(.+?)#(\d+) src=(\S+) natural=([-\d.]+) armor=([-\d.]+) potion=([-\d.]+) total=([-\d.]+) piercing=([-\d.]+) wear=([-\d.]+)/.exec(line);
  return m ? { name: m[1], id: +m[2], src: m[3], natural: +m[4], armor: +m[5], potion: +m[6], total: +m[7], piercing: +m[8], wear: +m[9], line: line.trim() } : null;
};
const dmgs = (t) => rowsOf(t, /\[DamageLog\] dmg /).map(parseDmg).filter(Boolean);
const prots = (t) => rowsOf(t, /\[DamageLog\] prot /).map(parseProt).filter(Boolean);

const R = {};

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

const ARMOR_SLOT = { head: 'slot.armor.head', chest: 'slot.armor.chest', legs: 'slot.armor.legs', feet: 'slot.armor.feet' };
const SET = {
  leather: { head: 'minecraft:leather_helmet', chest: 'minecraft:leather_chestplate', legs: 'minecraft:leather_leggings', feet: 'minecraft:leather_boots' },
  copper: { head: 'etim:helmet_copper', chest: 'etim:chestplate_copper', legs: 'etim:leggings_copper', feet: 'etim:boots_copper' },
  adamantium: { head: 'etim:helmet_adamantium', chest: 'etim:chestplate_adamantium', legs: 'etim:leggings_adamantium', feet: 'etim:boots_adamantium' },
};
const PROT_IV = 'ench:[{id:0,lvl:4}]';
const FIRE_IV = 'ench:[{id:1,lvl:4}]';
const FEATHER_IV = 'ench:[{id:2,lvl:4}]';
const BLAST_IV = 'ench:[{id:3,lvl:4}]';
const UNBREAKABLE = 'Unbreakable:1b';

(async () => {
  const phase = (process.argv[2] || 'all').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  say('bot up pos=' + (bot.entity ? bot.entity.position.toString() : '-'));
  const run = (p) => phase === 'all' || phase === p;

  /* ---------- 基础原语 ---------- */
  const equip = async (setName, opts) => {
    const o = opts || {};
    for (const part of ['head', 'chest', 'legs', 'feet']) {
      const item = SET[setName] ? SET[setName][part] : (o.item || 'minecraft:air');
      let nbt = o.ench || '';
      if (o.perEnch && o.perEnch[part]) nbt = o.perEnch[part];
      const dmg = (o.damage && o.damage[part]) || 0;
      const tag = [nbt, o.unbreakable ? UNBREAKABLE : ''].filter(Boolean).join(',');
      const cmd = `replaceitem entity ${NAME} ${ARMOR_SLOT[part]} ${item} 1 ${dmg}` + (tag ? ' {' + tag + '}' : '');
      await rcon.cmd(cmd, 8000);
    }
  };
  const clearArmor = async () => {
    for (const part of ['head', 'chest', 'legs', 'feet']) {
      await rcon.cmd(`replaceitem entity ${NAME} ${ARMOR_SLOT[part]} minecraft:air`, 8000);
    }
  };
  const heal = async () => { await rcon.cmd(`etest health 20 ${NAME}`, 8000); };
  const clearFx = async () => { await rcon.cmd(`effect ${NAME} clear`, 8000); };
  const tp = async (x, y, z) => {
    if (bot.health <= 0 || !bot.entity) {
      say('   (bot dead → respawn)');
      try { bot.respawn(); } catch (e) {}
      await sleep(2600);
    }
    await rcon.cmd(`tp ${NAME} ${x} ${y} ${z}`, 8000);
  };
  const killZombies = async () => { await rcon.cmd('kill @e[type=minecraft:zombie]', 8000); };
  const killArrows = async () => { await rcon.cmd('kill @e[type=etim:metal_arrow]', 8000); };
  const summonZombie = async (x, y, z, tag, extra) => {
    const name = tag || 'ZD';
    // 默认戴皮头盔：1.12 亡灵白天会被晒燃，燃着的僵尸命中会把玩家点燃（onFire 行污染 W15 磨损面）
    const helmet = /ArmorItems/.test(extra || '') ? '' : ',ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b}]';
    const nbt = `{CustomName:"${name}",CustomNameVisible:0b,PersistenceRequired:1b` + helmet + (extra ? ',' + extra : '') + '}';
    return cut(String(await rcon.cmd(`summon minecraft:zombie ${x} ${y} ${z} ${nbt}`, 8000)), 90);
  };
  /** 近战等待：等 n 条 target 的 prot 行（或超时） */
  const waitMelee = async (off, n, timeoutMs) => {
    const t0 = Date.now();
    for (;;) {
      const t = logSince(off);
      const p = prots(t).filter((x) => x.name === NAME);
      const d = dmgs(t).filter((x) => x.name === NAME);
      if (Math.min(p.length, d.length) >= n) return { prot: p, dmg: d };
      if (Date.now() - t0 > (timeoutMs || 25000)) return { prot: p, dmg: d };
      await sleep(200);
    }
  };
  /** 召一支飞行箭（+X 方向），返回命中行 */
  const shootArrow = async (z, speed, x0, y0, timeoutMs) => {
    const off = logOffset();
    await rcon.cmd(`summon etim:metal_arrow ${x0} ${y0} ${z} {Motion:[${speed},0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}`, 8000);
    const t0 = Date.now();
    for (;;) {
      const t = logSince(off);
      const p = prots(t).filter((x) => x.name === NAME);
      const d = dmgs(t).filter((x) => x.name === NAME);
      if (Math.min(p.length, d.length) >= 1) return { prot: p[0], dmg: d[0] };
      if (Date.now() - t0 > (timeoutMs || 12000)) return { prot: p[0] || null, dmg: d[0] || null };
      await sleep(60);
    }
  };
  /** bot 背包 armor 槽耐久（5..8 = head/chest/legs/feet） */
  const armorDur = () => {
    const out = {};
    const map = { head: 5, chest: 6, legs: 7, feet: 8 };
    for (const [part, slot] of Object.entries(map)) {
      const it = bot.inventory.slots[slot];
      out[part] = it ? { name: it.name, damage: it.durabilityUsed, max: it.maxDurability } : null;
    }
    return out;
  };
  const invNbt = () => {
    try {
      const raw = execFileSync(process.execPath, [NBT, 'inv', WORLD, NAME], { encoding: 'utf8' }).trim();
      return JSON.parse(raw.split('\n').pop());
    } catch (e) { return { error: e.message }; }
  };
  const savePrev = () => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return {}; } };
  const save = () => fs.writeFileSync(OUT, JSON.stringify(Object.assign(savePrev(), R), null, 2), 'utf8');

  /* ---------- 开窗基线 ---------- */
  await rcon.cmd(`gamemode 0 ${NAME}`, 8000);
  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd('gamerule doDaylightCycle false');
  await rcon.cmd('gamerule keepInventory true');
  await rcon.cmd('gamerule naturalRegeneration false');
  await rcon.cmd('gamerule showDeathMessages true');
  await rcon.cmd('time set 1000');
  // difficulty=2（normal）：1.12 EntityPlayer.attackEntityFrom 对 mob 源做
  // easy 缩放 amount/2+1（zombie 5.0 → 3.5 非整数），normal 不缩放 → raw=5.000 整数。
  await rcon.cmd('difficulty 2');
  // 玩家生命上限 = capAtLevel0(6) + level/5*2，capMaximum=20 → level 35 起满 20。
  await rcon.cmd(`etest level 40 ${NAME}`, 8000);
  await rcon.cmd('kill @e[type=!player]');
  await sleep(1200);
  await rcon.cmd(`etest health 20 ${NAME}`, 8000);
  await sleep(600);
  R.env = { level: await rcon.cmd(`etest level 40 ${NAME}`, 6000), diff: await rcon.cmd('difficulty', 6000), hp: bot.health };
  say('env: ' + JSON.stringify(R.env));
  const ensureAlive = async (x, y, z) => {
    if (bot.health <= 0 || !bot.entity) {
      say('   (bot dead → respawn)');
      try { bot.respawn(); } catch (e) {}
      await sleep(2500);
    }
    await tp(x, y, z);
    await heal();
    await sleep(300);
  };

  /* ================================ p0 / W1 空手 ================================ */
  if (run('p0') || run('w1')) {
    say("=========== W1 空手（兼 P-1/P-2 通道 smoke）===========");
    await tp(100.5, GY, 100.5);
    await clearArmor(); await clearFx(); await heal();
    await sleep(1200);
    const off = logOffset();
    const h0 = bot.health;
    say('   summon -> ' + await summonZombie(103.5, GY, 100.5, 'W1Z'));
    const got = await waitMelee(off, 2, 22000);
    got.prot.forEach((x) => say('W1 prot ' + cut(x.line, 210)));
    got.dmg.forEach((x) => say('W1 dmg  ' + cut(x.line, 210)));
    const h1 = bot.health;
    await killZombies();
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && p.armor === 0 && p.total === 0 && !!d && Math.abs(d.armorOut - Math.max(d.raw, 1)) < 0.002 && inIsRaw(d)
      && Math.abs((h0 - h1) - got.dmg.reduce((a, x) => a + x.final, 0)) < 0.35;
    say('W1 判值: armor=' + (p ? f3(p.armor) : '-') + ' total=' + (p ? f3(p.total) : '-')
      + ' armorIn=' + (d ? f3(d.armorIn) : '-') + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' raw=' + (d ? f3(d.raw) : '-')
      + ' hp ' + h0 + '->' + h1 + ' prot行=' + got.prot.length + ' dmg行=' + got.dmg.length + ' -> ' + ok);
    R.w1 = { ok: !!ok, prot: got.prot, dmg: got.dmg, hp: [h0, h1] };
    R.p1p2 = { rows: got.prot.length + got.dmg.length, crash: countOf(logAll(), /NoClassDefFoundError|Critical injection failure/) };
    save();
  }

  /* ================================ W2 皮革 ================================ */
  if (run('w2')) {
    say('=========== W2 皮革满套 ===========');
    await tp(100.5, GY, 104.5); await clearFx(); await heal();
    await equip('leather');
    await sleep(1400);
    const off = logOffset();
    await summonZombie(103.5, GY, 104.5, 'W2Z');
    const got = await waitMelee(off, 1, 22000);
    got.prot.forEach((x) => say('W2 prot ' + cut(x.line, 210)));
    got.dmg.forEach((x) => say('W2 dmg  ' + cut(x.line, 210)));
    await killZombies();
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && Math.abs(p.armor - 3.5) < 0.002 && inIsRaw(d) && !!d && Math.abs(d.armorOut - Math.max(d.raw - p.total, 1)) < 0.01;
    say('W2 判值: armor=' + (p ? f3(p.armor) : '-') + ' total=' + (p ? f3(p.total) : '-')
      + ' raw=' + (d ? f3(d.raw) : '-') + ' armorIn=' + (d ? f3(d.armorIn) : '-') + ' armorOut=' + (d ? f3(d.armorOut) : '-')
      + ' 期望 max(raw-3.5,1)=' + (d ? f3(Math.max(d.raw - 3.5, 1)) : '-') + ' -> ' + ok);
    R.w2 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    save();
  }

  /* ================================ W3 铜 ================================ */
  if (run('w3')) {
    say('=========== W3 铜满套 ===========');
    await tp(100.5, GY, 108.5); await clearFx(); await heal();
    await equip('copper');
    await sleep(1400);
    const off = logOffset();
    await summonZombie(103.5, GY, 108.5, 'W3Z');
    const got = await waitMelee(off, 1, 22000);
    got.prot.forEach((x) => say('W3 prot ' + cut(x.line, 210)));
    got.dmg.forEach((x) => say('W3 dmg  ' + cut(x.line, 210)));
    await killZombies();
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && Math.abs(p.armor - 7.0) < 0.002 && inIsRaw(d) && outIs(d, p ? p.total : 7.0);
    say('W3 判值: armor=' + (p ? f3(p.armor) : '-') + ' total=' + (p ? f3(p.total) : '-')
      + ' raw=' + (d ? f3(d.raw) : '-') + ' armorIn=' + (d ? f3(d.armorIn) : '-')
      + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' -> ' + ok);
    R.w3 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    save();
  }

  /* ================================ W4 艾德曼 + 箭 ================================ */
  if (run('w4')) {
    say("=========== W4 艾德曼满套 + 箭 raw≈9.0 ===========");
    await tp(100.5, GY, 140.5); await clearFx(); await heal();
    await equip('adamantium');
    await sleep(1400);
    const all = [];
    for (let i = 0; i < 3; i++) {
      const r = await shootArrow(140.5, 3.65, 98.5, 5.0);
      if (r.prot) say('W4[' + i + '] prot ' + cut(r.prot.line, 210));
      if (r.dmg) say('W4[' + i + '] dmg  ' + cut(r.dmg.line, 210));
      all.push(r);
      await sleep(700);
    }
    const p = all.map((r) => r.prot).filter(Boolean)[0];
    const outs = all.map((r) => r.dmg).filter(Boolean).map((d) => d.armorOut);
    const ok = !!p && Math.abs(p.armor - 10.0) < 0.002 && outs.length >= 2
      && all.map((r) => r.dmg).filter(Boolean).every(inIsRaw)
      && outs.every((v) => Math.abs(v - 1.0) < 0.01 || v === 0);
    say('W4 判值: armor=' + (p ? f3(p.armor) : '-') + ' armorIn列=[' + all.map((r) => r.dmg).filter(Boolean).map((d) => f3(d.armorIn)).join(',')
      + '] armorOut列=[' + outs.map(f3).join(',') + ']（期望 1.000 级，骰可 0.000）-> ' + ok);
    R.w4 = { ok: !!ok, prot: p, outs, all };
    save();
  }

  /* ================================ W5 艾德曼+保护 IV ================================ */
  if (run('w5')) {
    say('=========== W5 艾德曼 + 保护 IV ×4 + 箭 ===========');
    await tp(100.5, GY, 144.5); await clearFx(); await heal();
    await equip('adamantium', { ench: PROT_IV });
    await sleep(1400);
    const res = [];
    for (let i = 0; i < 4; i++) {
      const r = await shootArrow(144.5, 3.4, 98.5, 5.0);
      if (r.prot) say('W5[' + i + '] prot ' + cut(r.prot.line, 200));
      if (r.dmg) say('W5[' + i + '] dmg  ' + cut(r.dmg.line, 200));
      res.push(r);
      await sleep(700);
    }
    const p = res.map((r) => r.prot).filter(Boolean)[0];
    const outs = res.map((r) => r.dmg).filter(Boolean).map((d) => d.armorOut);
    const ok = !!p && Math.abs(p.armor - 15.0) < 0.002 && outs.length >= 3
      && res.map((r) => r.dmg).filter(Boolean).every(inIsRaw)
      && outs.every((v) => Math.abs(v - 1.0) < 0.01 || v === 0);
    say('W5 判值: armor=' + (p ? f3(p.armor) : '-') + ' total=' + (p ? f3(p.total) : '-')
      + ' armorIn列=[' + res.map((r) => r.dmg).filter(Boolean).map((d) => f3(d.armorIn)).join(',')
      + '] armorOut列=[' + outs.map(f3).join(',') + '] -> ' + ok);
    R.w5 = { ok: !!ok, prot: p, outs, all: res };
    save();
  }

  /* ================================ W6 摔落 + 羽落 ================================ */
  if (run('w6')) {
    say('=========== W6 10 格摔落 + 羽落 IV（4 次）===========');
    await tp(100.5, GY, 170.5); await clearFx(); await heal();
    await equip('adamantium', { perEnch: { feet: FEATHER_IV } });
    await sleep(1200);
    const falls = [];
    for (let i = 0; i < 4; i++) {
      const off = logOffset();
      await tp(100.5, 14, 170.5);
      const t0 = Date.now();
      let got = { prot: [], dmg: [] };
      for (;;) {
        const t = logSince(off);
        got = { prot: prots(t).filter((x) => x.name === NAME && x.src === 'fall'), dmg: dmgs(t).filter((x) => x.name === NAME && x.src === 'fall') };
        if (got.prot.length && got.dmg.length) break;
        if (Date.now() - t0 > 12000) break;
        await sleep(200);
      }
      got.prot.slice(0, 1).forEach((x) => say('W6[' + i + '] prot ' + cut(x.line, 200)));
      got.dmg.slice(0, 1).forEach((x) => say('W6[' + i + '] dmg  ' + cut(x.line, 200)));
      falls.push({ prot: got.prot[0] || null, dmg: got.dmg[0] || null });
      await tp(100.5, GY, 170.5); await heal();
      await sleep(600);
    }
    const armors = falls.map((f) => f.prot).filter(Boolean).map((p) => p.armor);
    const outs = falls.map((f) => f.dmg).filter(Boolean).map((d) => d.armorOut);
    const raws = falls.map((f) => f.dmg).filter(Boolean).map((d) => d.raw);
    const ok = armors.length >= 3 && armors.every((v) => Math.abs(v - 15.0) < 0.002)
      && falls.map((f) => f.dmg).filter(Boolean).every(inIsRaw)
      && outs.every((v) => Math.abs(v - 1.0) < 0.01 || v === 0);
    say('W6 判值: armor列=[' + armors.map(f3).join(',') + '] raw列=[' + raws.map(f3).join(',')
      + '] armorIn列=[' + falls.map((f) => f.dmg).filter(Boolean).map((d) => f3(d.armorIn)).join(',')
      + '] armorOut列=[' + outs.map(f3).join(',') + ']（max(raw-15,1)=1.000；骰 P(0)=87% 亦合法）-> ' + ok);
    R.w6 = { ok: !!ok, falls };
    await heal();
    save();
  }

  /* ================================ W7 火 ================================ */
  if (run('w7')) {
    say('=========== W7 火（①空手 ②皮革+火保护 IV）===========');
    await tp(100.5, GY, 178.5); await clearFx(); await heal();
    await clearArmor();
    await rcon.cmd('setblock 100 3 178 minecraft:netherrack', 8000);
    await rcon.cmd('setblock 100 4 178 minecraft:fire', 8000);
    await sleep(600);
    let off = logOffset();
    let t0 = Date.now(), got = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got = { prot: prots(t).filter((x) => x.src === 'inFire' && x.name === NAME), dmg: dmgs(t).filter((x) => x.src === 'inFire' && x.name === NAME) };
      if (got.prot.length >= 2) break;
      if (Date.now() - t0 > 20000) break;
      await sleep(250);
    }
    got.prot.slice(0, 2).forEach((x) => say('W7① prot ' + cut(x.line, 210)));
    got.dmg.slice(0, 2).forEach((x) => say('W7① dmg  ' + cut(x.line, 210)));
    const p1 = got.prot[0];
    const ok1 = !!p1 && p1.armor === 0 && inIsRaw(got.dmg[0]) && Math.abs(got.dmg[0].armorOut - Math.max(got.dmg[0].raw, 1)) < 0.01;
    say('W7① 判值: armor=' + (p1 ? f3(p1.armor) : '-') + ' raw=' + (got.dmg[0] ? f3(got.dmg[0].raw) : '-')
      + ' armorIn=' + (got.dmg[0] ? f3(got.dmg[0].armorIn) : '-')
      + ' armorOut=' + (got.dmg[0] ? f3(got.dmg[0].armorOut) : '-') + ' -> ' + ok1);
    R.w7a = { ok: !!ok1, prot: got.prot.slice(0, 3), dmg: got.dmg.slice(0, 3) };

    await tp(100.5, GY, 178.5); await heal();
    await equip('leather', { ench: FIRE_IV });
    await sleep(1200);
    off = logOffset();
    t0 = Date.now();
    let got2 = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got2 = { prot: prots(t).filter((x) => x.src === 'inFire' && x.name === NAME), dmg: dmgs(t).filter((x) => x.src === 'inFire' && x.name === NAME) };
      if (got2.prot.length >= 3) break;
      if (Date.now() - t0 > 25000) break;
      await sleep(250);
    }
    got2.prot.slice(0, 3).forEach((x) => say('W7② prot ' + cut(x.line, 210)));
    got2.dmg.slice(0, 3).forEach((x) => say('W7② dmg  ' + cut(x.line, 210)));
    const p2 = got2.prot[0];
    const ok2 = !!p2 && Math.abs(p2.armor - 3.5) < 0.002 && got2.dmg.filter(Boolean).every(inIsRaw);
    say('W7② 判值: armor=' + (p2 ? f3(p2.armor) : '-') + '（C-2 修正口径 3.500）total=' + (p2 ? f3(p2.total) : '-')
      + ' armorIn列=[' + got2.dmg.filter(Boolean).map((d) => f3(d.armorIn)).join(',')
      + '] armorOut列=[' + got2.dmg.filter(Boolean).map((d) => f3(d.armorOut)).join(',') + '] -> ' + ok2);
    R.w7b = { ok: !!ok2, prot: got2.prot.slice(0, 4), dmg: got2.dmg.slice(0, 4) };
    await rcon.cmd('setblock 100 4 178 minecraft:air', 8000);
    await rcon.cmd(`effect ${NAME} clear`, 8000);
    await heal();
    save();
  }

  /* ================================ W8 TNT ================================ */
  if (run('w8')) {
    say('=========== W8 TNT + 爆炸保护 IV ×4 ===========');
    // 用 z=198.5 的干净台面（z=182 上一轮已被炸出弹坑，TNT 落坑会让 raw 掉到 8.0）
    await tp(100.5, GY, 198.5); await clearFx(); await heal();
    await equip('adamantium', { ench: BLAST_IV });
    for (const zz of [198]) {
      for (let xx = 99; xx <= 104; xx++) await rcon.cmd(`setblock ${xx} 3 ${zz} minecraft:stone`, 8000);
    }
    await sleep(1200);
    const off = logOffset();
    await rcon.cmd('summon minecraft:tnt 102.5 4 198.5 {Fuse:30}', 8000);
    const t0 = Date.now();
    let got = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got = { prot: prots(t).filter((x) => x.src.indexOf('explosion') === 0 && x.name === NAME), dmg: dmgs(t).filter((x) => x.src.indexOf('explosion') === 0 && x.name === NAME) };
      if (got.prot.length && got.dmg.length) break;
      if (Date.now() - t0 > 15000) break;
      await sleep(200);
    }
    got.prot.slice(0, 2).forEach((x) => say('W8 prot ' + cut(x.line, 210)));
    got.dmg.slice(0, 2).forEach((x) => say('W8 dmg  ' + cut(x.line, 210)));
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && !!d && d.src.indexOf('explosion') === 0 && p.armor >= 10 && p.armor <= 20.001
      && inIsRaw(d) && outIs(d, p ? p.total : 20.0);
    say('W8 判值: src=' + (d ? d.src : '-') + ' armor=' + (p ? f3(p.armor) : '-') + ' total=' + (p ? f3(p.total) : '-')
      + ' raw=' + (d ? f3(d.raw) : '-') + ' armorIn=' + (d ? f3(d.armorIn) : '-')
      + ' armorOut=' + (d ? f3(d.armorOut) : '-') + '（真减法期望 max(raw−total,1)）-> ' + ok);
    R.w8 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    await heal();
    save();
  }

  /* ================================ W9 抗性 II ================================ */
  if (run('w9')) {
    say('=========== W9 抗性 II + 僵尸 ===========');
    await tp(100.5, GY, 112.5); await clearFx(); await heal();
    await clearArmor();
    await rcon.cmd(`effect ${NAME} resistance 9999 1`, 8000); // amplifier 1 = level II
    await sleep(1200);
    const off = logOffset();
    await summonZombie(103.5, GY, 112.5, 'W9Z');
    const got = await waitMelee(off, 1, 22000);
    got.prot.forEach((x) => say('W9 prot ' + cut(x.line, 210)));
    got.dmg.forEach((x) => say('W9 dmg  ' + cut(x.line, 210)));
    await killZombies();
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && Math.abs(p.potion - 10.0) < 0.002 && inIsRaw(d) && outIs(d, p ? p.total : 10.0);
    say('W9 判值: potion=' + (p ? f3(p.potion) : '-') + ' armor=' + (p ? f3(p.armor) : '-')
      + ' raw=' + (d ? f3(d.raw) : '-') + ' armorIn=' + (d ? f3(d.armorIn) : '-')
      + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' -> ' + ok);
    R.w9 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    await clearFx();
    save();
  }

  /* ================================ W10 starve / outOfWorld ================================ */
  if (run('w10')) {
    say('=========== W10 starve / outOfWorld（absolute：无 prot 行）===========');
    await tp(100.5, GY, 174.5); await clearFx(); await heal();
    await clearArmor();
    await sleep(1200);
    let off = logOffset();
    await rcon.cmd(`etest food 0 0 ${NAME}`, 8000);
    const t0 = Date.now();
    let got = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got = { prot: prots(t), dmg: dmgs(t).filter((x) => x.src === 'starve' && x.name === NAME) };
      if (got.dmg.length) break;
      if (Date.now() - t0 > 40000) break;
      await sleep(500);
    }
    got.dmg.slice(0, 3).forEach((x) => say('W10 starve dmg ' + cut(x.line, 210)));
    const sp = prots(logSince(off)).filter((x) => x.src === 'starve');
    const sd = got.dmg[0];
    const okS = !!sd && Math.abs(sd.armorOut - sd.raw) < 0.002 && inIsRaw(sd) && sp.length === 0;
    say('W10 starve 判值: dmg行=' + got.dmg.length + ' prot行(starve)=' + sp.length
      + ' armorOut=' + (sd ? f3(sd.armorOut) : '-') + ' raw=' + (sd ? f3(sd.raw) : '-') + ' -> ' + okS);
    await rcon.cmd(`etest food 20 20 ${NAME}`, 8000);
    await heal();

    off = logOffset();
    await tp(100.5, -70, 174.5);
    await sleep(400);
    await tp(100.5, GY, 174.5);
    const t1 = Date.now();
    let ow = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      ow = { prot: prots(t).filter((x) => x.src === 'outOfWorld'), dmg: dmgs(t).filter((x) => x.src === 'outOfWorld' && x.name === NAME) };
      if (ow.dmg.length) break;
      if (Date.now() - t1 > 15000) break;
      await sleep(250);
    }
    ow.dmg.slice(0, 3).forEach((x) => say('W10 outOfWorld dmg ' + cut(x.line, 210)));
    const od = ow.dmg[0];
    const okO = !!od && Math.abs(od.armorOut - od.raw) < 0.002 && inIsRaw(od) && ow.prot.length === 0;
    say('W10 void 判值: dmg行=' + ow.dmg.length + ' prot行=' + ow.prot.length
      + ' armorOut=' + (od ? f3(od.armorOut) : '-') + ' raw=' + (od ? f3(od.raw) : '-') + ' -> ' + okO);
    R.w10 = { ok: (!!okS && !!okO), starve: { ok: !!okS, dmg: got.dmg, prot: sp }, void: { ok: !!okO, dmg: ow.dmg, prot: ow.prot },
      note: 'starve 走 ETIMFoodStats（/etest food 0 0）；outOfWorld 走 void tp（y=-70）' };
    await heal();
    save();
  }

  /* ================================ W11 inWall ================================ */
  if (run('w11')) {
    say('=========== W11 inWall 窒息（C-3 修正口径）===========');
    await tp(100.5, GY, 186.5); await clearFx(); await heal();
    await clearArmor();
    const off = logOffset(); // 窒息行在方块落位当 tick 就出，offset 必须先取
    await rcon.cmd('setblock 100 4 186 minecraft:stone', 8000);
    await rcon.cmd('setblock 100 5 186 minecraft:stone', 8000);
    await sleep(600);
    const t0 = Date.now();
    let got = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got = { prot: prots(t).filter((x) => x.src === 'inWall' && x.name === NAME), dmg: dmgs(t).filter((x) => x.src === 'inWall' && x.name === NAME) };
      if (got.prot.length && got.dmg.length) break;
      if (Date.now() - t0 > 12000) break;
      await sleep(200);
    }
    got.prot.slice(0, 3).forEach((x) => say('W11 prot ' + cut(x.line, 210)));
    got.dmg.slice(0, 3).forEach((x) => say('W11 dmg  ' + cut(x.line, 210)));
    await rcon.cmd('setblock 100 4 186 minecraft:air', 8000);
    await rcon.cmd('setblock 100 5 186 minecraft:air', 8000);
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && p.armor === 0 && inIsRaw(d) && !!d && Math.abs(d.armorOut - Math.max(d.raw, 1)) < 0.01;
    say('W11 判值: src=' + (d ? d.src : '-') + ' armor=' + (p ? f3(p.armor) : '-') + ' raw=' + (d ? f3(d.raw) : '-')
      + ' armorIn=' + (d ? f3(d.armorIn) : '-') + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' -> ' + ok);
    R.w11 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    await heal();
    save();
  }

  /* ================================ W12 两路对账 ================================ */
  if (run('w12')) {
    say('=========== W12 玩家路 vs 怪路（C-1 修正口径 7.000 / 3.500）===========');
    await tp(100.5, GY, 156.5); await clearFx(); await heal();
    await equip('copper');
    await sleep(1200);
    const a = await shootArrow(156.5, 3.4, 98.5, 5.0);
    if (a.prot) say('W12a(player) prot ' + cut(a.prot.line, 210));
    if (a.dmg) say('W12a(player) dmg  ' + cut(a.dmg.line, 210));

    // 怪路：僵尸穿满套铜，站到 163.5
    await killZombies();
    await sleep(800);
    const armorNbt = 'ArmorItems:[{id:"etim:boots_copper",Count:1b},{id:"etim:leggings_copper",Count:1b},{id:"etim:chestplate_copper",Count:1b},{id:"etim:helmet_copper",Count:1b}],NoAI:1b,Silent:1b';
    const zr = await summonZombie(104.5, GY, 163.5, 'W12Z', armorNbt);
    say('   summon zombie -> ' + zr);
    await sleep(1500);
    const off = logOffset();
    await rcon.cmd('summon etim:metal_arrow 102.5 5.0 163.5 {Motion:[3.4,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}', 8000);
    const t0 = Date.now();
    let b = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      b = { prot: prots(t).filter((x) => x.name === 'W12Z'), dmg: dmgs(t).filter((x) => x.name === 'W12Z') };
      if (b.prot.length && b.dmg.length) break;
      if (Date.now() - t0 > 12000) break;
      await sleep(150);
    }
    b.prot.forEach((x) => say('W12b(zombie) prot ' + cut(x.line, 210)));
    b.dmg.forEach((x) => say('W12b(zombie) dmg  ' + cut(x.line, 210)));
    const pa = a.prot, pb = b.prot[0];
    const bd = b.dmg[0] || null;
    const ok = !!pa && Math.abs(pa.armor - 7.0) < 0.002 && !!pb && Math.abs(pb.armor - 3.5) < 0.002
      && inIsRaw(a.dmg) && outIs(a.dmg, 7.0)
      && inIsRaw(bd) && !!bd && Math.abs(bd.armorOut - Math.max(bd.raw - 3.5, 1)) < 0.011;
    say('W12 判值: 玩家路 armor=' + (pa ? f3(pa.armor) : '-') + ' armorOut=' + (a.dmg ? f3(a.dmg.armorOut) : '-')
      + ' armorIn=' + (a.dmg ? f3(a.dmg.armorIn) : '-')
      + ' | 怪路 armor=' + (pb ? f3(pb.armor) : '-') + ' armorOut=' + (bd ? f3(bd.armorOut) : '-')
      + ' armorIn=' + (bd ? f3(bd.armorIn) : '-')
      + '（raw 各自=' + (a.dmg ? f3(a.dmg.raw) : '-') + '/' + (bd ? f3(bd.raw) : '-') + '；怪路无骰，期望 5.000）-> ' + ok);
    R.w12 = { ok: !!ok, player: { prot: pa, dmg: a.dmg }, mob: { prot: pb, dmg: b.dmg[0] || null } };
    await killZombies();
    save();
  }

  /* ================================ W13 / W14 骰 ================================ */
  if (run('w13') || run('w14')) {
    const arms = [];
    if (run('w13')) arms.push({ tag: 'W13', ench: null, armor: 10.0, p: 0.36 });
    if (run('w14')) arms.push({ tag: 'W14', ench: PROT_IV, armor: 15.0, p: 0.79 });
    for (const arm of arms) {
      say('=========== ' + arm.tag + ' 骰面 100 次（armor=' + arm.armor + '，raw≈8.4）===========');
      const z = arm.tag === 'W13' ? 148.5 : 152.5;
      await tp(100.5, GY, z); await clearFx(); await heal();
      await equip('adamantium', { ench: arm.ench, unbreakable: true });
      await sleep(1500);
      const samples = [];
      const t0 = Date.now();
      for (let i = 0; i < 100; i++) {
        // 每发前回位：箭击退会让假人漂移（mineflayer 物理吃速度包），否则后半程大量空放
        await tp(100.5, GY, z);
        const r = await shootArrow(z, 3.4, 98.5, 5.0, 4000);
        if (r.dmg && r.prot) samples.push({ i, raw: r.dmg.raw, armorIn: r.dmg.armorIn, armor: r.prot.armor, armorOut: r.dmg.armorOut, final: r.dmg.final });
        if (i % 5 === 4) await heal();
        if (i % 10 === 9) await killArrows();
        if (i % 20 === 19) say('   ...' + (i + 1) + '/100 累计样本=' + samples.length);
        // 1.15s > maxHurtResistantTime(20 tick)：否则被无敌窗拒收（无行，非漏测）
        await sleep(1150);
      }
      await killArrows();
      const valid = samples.filter((s) => s.raw >= 8.0 && s.raw < 9.0 && Math.abs(s.armor - arm.armor) < 0.002);
      const rawMismatch = valid.filter((s) => Math.abs(s.armorIn - s.raw) > 0.0021).length;
      const zeros = valid.filter((s) => s.armorOut === 0).length;
      const rate = valid.length ? zeros / valid.length : 0;
      const ok = valid.length >= 95 && rawMismatch === 0 && rate >= (arm.tag === 'W13' ? 0.20 : 0.65) && rate <= (arm.tag === 'W13' ? 0.55 : 0.90);
      say(arm.tag + ' 判值: 有效样本=' + valid.length + '/100 零伤=' + zeros + ' 率=' + rate.toFixed(3)
        + '（理论 ' + arm.p + '，带 [' + (arm.tag === 'W13' ? '0.20,0.55' : '0.65,0.90') + ']）'
        + ' armorIn≠raw 样本=' + rawMismatch
        + ' raw带=[' + f3(Math.min.apply(null, valid.map((s) => s.raw))) + ',' + f3(Math.max.apply(null, valid.map((s) => s.raw))) + ')'
        + ' 耗时=' + Math.round((Date.now() - t0) / 1000) + 's -> ' + ok);
      R[arm.tag.toLowerCase()] = { ok: !!ok, valid: valid.length, zeros, rate, rawMismatch, samples, armor: arm.armor };
      save();
    }
  }

  /* ================================ W15 磨损 ================================ */
  if (run('w15')) {
    say('=========== W15 铜满套 20 近战：Σ耐久差 = Σwear ===========');
    /* 臂 A：满耐久 20 击（僵尸攻击力压到 2.0，避免铜件打穿） */
    await tp(100.5, GY, 116.5); await clearFx(); await heal();
    await equip('copper');
    await sleep(1500);
    const d0 = armorDur();
    const nbt0 = invNbt();
    say('   dur0(bot)=' + JSON.stringify(d0));
    const off = logOffset();
    await summonZombie(103.5, GY, 116.5, 'W15Z');
    await sleep(900);
    // 把僵尸攻击力钉成整数 2.0（EntityJoinWorld 会先写 5.0；entitydata 在其后落盘）
    await rcon.cmd('entitydata @e[name=W15Z,c=1] {Attributes:[{Name:"generic.attackDamage",Base:2.0d}]}', 8000);
    await sleep(600);
    const t0 = Date.now();
    let got = { prot: [], dmg: [] };
    let healedAt = 0;
    for (;;) {
      const t = logSince(off);
      got = {
        prot: prots(t).filter((x) => x.name === NAME && x.src === 'mob'),
        dmg: dmgs(t).filter((x) => x.name === NAME && x.src === 'mob' && x.raw >= 1.99)
      };
      if (got.dmg.length >= 20 && got.prot.length >= 20) break;
      if (got.dmg.length >= healedAt + 5) { healedAt = got.dmg.length; await heal(); }
      if (Date.now() - t0 > 240000) break;
      await sleep(400);
    }
    await killZombies();
    await sleep(2000); // 停手后再读耐久，避免最后一击漏计
    const d1 = armorDur();
    const nbt1 = invNbt();
    const clean = got.prot.filter((p, i) => got.dmg[i] && got.dmg[i].raw >= 1.99);
    const sumWear = clean.reduce((a, x) => a + x.wear, 0);
    const sumDelta = ['head', 'chest', 'legs', 'feet'].reduce((a, k) => {
      const a0 = d0[k], a1 = d1[k];
      if (!a0) return a;
      if (!a1) return a + (a0.max - a0.damage); // 打穿（件消失）→ 剩余全部计入消耗
      return a + (a1.damage - a0.damage);
    }, 0);
    const armors = got.prot.map((x) => x.armor);
    // R196 wear = (int)min(wearBase=7.0, raw=2.0) = 2 点/击，唯一磨损写手（@Redirect 退役后 vanilla 体不执行）
    const expectedWear = got.dmg.filter((d) => d.raw >= 1.99).reduce((a, d) => a + Math.floor(Math.min(7.0, d.raw)), 0);
    const okA = got.prot.length >= 20 && Math.abs(sumDelta - sumWear) < 0.001 && Math.abs(sumWear - expectedWear) < 0.001;
    say('W15A 判值: 行数=' + got.prot.length + ' Σwear=' + f3(sumWear) + ' Σ耐久差(bot元数据)=' + sumDelta
      + ' 期望(Σ(int)min(7,raw))=' + expectedWear
      + ' armor值列=[' + armors.map((v, i) => (i < 3 || i > armors.length - 3 ? f3(v) : '…')).join(',') + '] -> ' + okA);
    say('   dur1(bot)=' + JSON.stringify(d1));
    R.w15a = { ok: !!okA, rows: got.prot.length, sumWear, sumDelta, armorSeq: armors, dur0: d0, dur1: d1,
      nbt0: nbt0 && nbt0.Inventory ? nbt0.Inventory.filter((i) => i.Slot >= 100) : nbt0,
      nbt1: nbt1 && nbt1.Inventory ? nbt1.Inventory.filter((i) => i.Slot >= 100) : nbt1 };

    /* 臂 B：预损到 ~55%（看 armor 随耐久下降） */
    say('   --- W15B 预损臂（每件 ~55% 损）---');
    await tp(100.5, GY, 120.5); await heal();
    await equip('copper', { damage: { head: 22, chest: 35, legs: 31, feet: 18 } });
    await sleep(1500);
    const off2 = logOffset();
    await summonZombie(103.5, GY, 120.5, 'W15Z2');
    await sleep(900);
    await rcon.cmd('entitydata @e[name=W15Z2,c=1] {Attributes:[{Name:"generic.attackDamage",Base:2.0d}]}', 8000);
    await sleep(600);
    const t2 = Date.now();
    let got2 = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off2);
      got2 = { prot: prots(t).filter((x) => x.name === NAME), dmg: dmgs(t).filter((x) => x.name === NAME) };
      if (Math.min(got2.prot.length, got2.dmg.length) >= 5) break;
      if (Date.now() - t2 > 40000) break;
      await sleep(400);
    }
    await killZombies();
    const seq = got2.prot.map((x) => x.armor);
    const okB = seq.length >= 5 && seq[seq.length - 1] < seq[0] - 0.0005;
    say('W15B 判值: armor 序列=[' + seq.map(f3).join(',') + '] 单调下降=' + (seq.length ? (seq[seq.length - 1] < seq[0]) : false) + ' -> ' + okB);
    R.w15b = { ok: !!okB, armorSeq: seq, prot: got2.prot, dmg: got2.dmg };
    save();
  }

  /* ================================ W16 铜靴 max-1 ================================ */
  if (run('w16')) {
    say('=========== W16 铜靴 damage=max-1 ===========');
    await tp(100.5, GY, 124.5); await clearFx(); await heal();
    await equip('copper', { damage: { feet: 31 } }); // 铜靴 maxDamage=32 → 31 = max-1
    await sleep(1400);
    const off = logOffset();
    await summonZombie(103.5, GY, 124.5, 'W16Z');
    const got = await waitMelee(off, 1, 22000);
    got.prot.forEach((x) => say('W16 prot ' + cut(x.line, 210)));
    got.dmg.forEach((x) => say('W16 dmg  ' + cut(x.line, 210)));
    await killZombies();
    const p = got.prot[0], d = got.dmg[0];
    const ok = !!p && Math.abs(p.armor - 5.8333) < 0.01 && inIsRaw(d) && outIs(d, p ? p.total : 5.8333);
    say('W16 判值: armor=' + (p ? f3(p.armor) : '-') + '（期望 5.833）total=' + (p ? f3(p.total) : '-')
      + ' raw=' + (d ? f3(d.raw) : '-') + ' armorIn=' + (d ? f3(d.armorIn) : '-')
      + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' -> ' + ok);
    R.w16 = { ok: !!ok, prot: got.prot, dmg: got.dmg };
    save();
  }

  /* ================================ W17 自然甲 ================================ */
  if (run('w17')) {
    say('=========== W17 longdead/guardian 自然甲（C-4 修正：怪为目标）===========');
    for (const arm of [{ tag: 'longdead', mob: 'etim:longdead', expect: 1.0, z: 190.5 }, { tag: 'guardian', mob: 'etim:longdead_guardian', expect: 2.0, z: 194.5 }]) {
      // bot 站到弹道侧旁（z+2.5），别挡住 98.5→104.5 的 +X 箭线
      await tp(100.5, GY, arm.z + 2.5); await clearFx(); await heal();
      await clearArmor();
      await killZombies();
      await rcon.cmd(`kill @e[type=${arm.mob}]`, 8000);
      await sleep(600);
      const off = logOffset();
      await rcon.cmd(`summon ${arm.mob} 104.5 ${GY} ${arm.z} {CustomName:"W17${arm.tag}",CustomNameVisible:0b,PersistenceRequired:1b,NoAI:1b,Silent:1b,ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b}]}`, 8000);
      await sleep(1200);
      await rcon.cmd(`summon etim:metal_arrow 98.5 5.0 ${arm.z} {Motion:[3.4,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}`, 8000);
      const t0 = Date.now();
      let got = { prot: [], dmg: [] };
      for (;;) {
        const t = logSince(off);
        got = { prot: prots(t).filter((x) => x.name === 'W17' + arm.tag && x.src === 'arrow'), dmg: dmgs(t).filter((x) => x.name === 'W17' + arm.tag && x.src === 'arrow') };
        if (got.prot.length && got.dmg.length) break;
        if (Date.now() - t0 > 12000) break;
        await sleep(150);
      }
      got.prot.forEach((x) => say('W17[' + arm.tag + '] prot ' + cut(x.line, 210)));
      got.dmg.forEach((x) => say('W17[' + arm.tag + '] dmg  ' + cut(x.line, 210)));
      const p = got.prot[0];
      const pd = got.dmg[0];
      const okNatural = !!p && Math.abs(p.natural - arm.expect) < 0.002 && inIsRaw(pd);
      /* 火源 → natural=0.000 */
      await rcon.cmd(`entitydata @e[name=W17${arm.tag},c=1] {Fire:200s}`, 8000);
      const off2 = logOffset();
      const t1 = Date.now();
      let fire = { prot: [], dmg: [] };
      for (;;) {
        const t = logSince(off2);
        fire = { prot: prots(t).filter((x) => (x.src === 'onFire' || x.src === 'inFire') && x.name === 'W17' + arm.tag), dmg: dmgs(t).filter((x) => (x.src === 'onFire' || x.src === 'inFire') && x.name === 'W17' + arm.tag) };
        if (fire.prot.length) break;
        if (Date.now() - t1 > 12000) break;
        await sleep(200);
      }
      fire.prot.slice(0, 2).forEach((x) => say('W17[' + arm.tag + '] fire prot ' + cut(x.line, 210)));
      const pf = fire.prot[0];
      const okFire = !!pf && pf.natural === 0 && pf.armor === 0;
      say('W17[' + arm.tag + '] 判值: natural=' + (p ? f3(p.natural) : '-') + '（期望 ' + arm.expect + '）'
        + ' | 火源 natural=' + (pf ? f3(pf.natural) : '-') + ' armor=' + (pf ? f3(pf.armor) : '-') + ' -> ' + (okNatural && okFire));
      R['w17_' + arm.tag] = { ok: !!(okNatural && okFire), natural: p, fire: fire.prot, dmg: got.dmg, dmgFire: fire.dmg };
      await rcon.cmd(`kill @e[type=${arm.mob}]`, 8000);
      save();
    }
  }

  /* ================================ W18 吸收 ================================ */
  if (run('w18')) {
    say('=========== W18 附魔金苹果（吸收）+ 僵尸 ===========');
    await tp(100.5, GY, 128.5); await clearFx(); await heal();
    await clearArmor();
    await rcon.cmd(`clear ${NAME}`, 8000);
    await rcon.cmd(`give ${NAME} minecraft:golden_apple 1 1`, 8000);
    await sleep(1200);
    const apple = bot.inventory.items().find((i) => i.name === 'golden_apple');
    say('   apple=' + (apple ? apple.name + '/' + apple.metadata : 'NONE'));
    if (apple) {
      await bot.equip(apple, 'hand');
      await sleep(600);
      try { await bot.consume(); } catch (e) { say('   consume err ' + e.message); }
      await sleep(1200);
      say('   after eat health=' + bot.health + ' absorption=' + (bot.entity && bot.entity.absorption !== undefined ? bot.entity.absorption : 'n/a'));
    }
    await heal();
    await sleep(600);
    const off = logOffset();
    await summonZombie(103.5, GY, 128.5, 'W18Z');
    const t0 = Date.now();
    let got = { prot: [], dmg: [] };
    for (;;) {
      const t = logSince(off);
      got = { prot: prots(t).filter((x) => x.name === NAME), dmg: dmgs(t).filter((x) => x.name === NAME) };
      // 20% 全免骰会让 armorOut=0（吸收面不可见），取到 ≥3 次命中再判，挑 absorption>0 的一条
      if (got.dmg.length >= 3) break;
      if (Date.now() - t0 > 30000) break;
      await sleep(250);
    }
    await killZombies();
    got.dmg.slice(0, 4).forEach((x) => say('W18 dmg  ' + cut(x.line, 210)));
    got.prot.slice(0, 4).forEach((x) => say('W18 prot ' + cut(x.line, 210)));
    const good = got.dmg.filter((x) => x.absorption > 0 && Math.abs(x.armorOut - (x.absorption + x.final)) < 0.002)[0];
    const d = good || got.dmg[0];
    const ok = !!good && inIsRaw(good);
    say('W18 判值: 命中=' + got.dmg.length + ' 非零吸收样本=' + got.dmg.filter((x) => x.absorption > 0).length
      + ' | armorIn=' + (d ? f3(d.armorIn) : '-') + ' raw=' + (d ? f3(d.raw) : '-')
      + ' armorOut=' + (d ? f3(d.armorOut) : '-') + ' absorption=' + (d ? f3(d.absorption) : '-')
      + ' final=' + (d ? f3(d.final) : '-') + ' 恒等式=' + (d ? f3(d.absorption + d.final) : '-') + ' -> ' + ok);
    R.w18 = { ok: !!ok, dmg: got.dmg, prot: got.prot };
    save();
  }

  /* ================================ W19 model-off 回归 ================================ */
  if (run('w19')) {
    say('=========== W19 armorModelR196=false 重打 W4 场景 ===========');
    await tp(100.5, GY, 160.5); await clearFx(); await heal();
    await equip('adamantium');
    await sleep(1400);
    const dur0 = armorDur();
    const off = logOffset();
    const r = await shootArrow(160.5, 3.65, 98.5, 5.0, 12000);
    await sleep(1200);
    const dur1 = armorDur();
    const wearDelta = ['head', 'chest', 'legs', 'feet'].reduce((a, k) => {
      const a0 = dur0[k], a1 = dur1[k];
      if (!a0) return a;
      if (!a1) return a + (a0.max - a0.damage);
      return a + (a1.damage - a0.damage);
    }, 0);
    const since = logSince(off);
    const p = prots(since).filter((x) => x.name === NAME);
    const d = dmgs(since).filter((x) => x.name === NAME);
    d.slice(0, 2).forEach((x) => say('W19 dmg  ' + cut(x.line, 210)));
    p.slice(0, 2).forEach((x) => say('W19 prot ' + cut(x.line, 210)));
    const dd = d[0];
    // model-off 面（D-36）：@RETURN 审计行拿到的 `damage` 参数已被 vanilla 体就地改写，
    // 故 armorIn 列 = vanilla 乘法结果（armorIn==armorOut），不是原始量 —— 这是审计列语义，
    // 不是行为缺陷；行为判据是 armorOut=7.140 + 无 prot 行 + vanilla per-piece wear 发生。
    const ok = !!dd && Math.abs(dd.armorOut - 7.140) < 0.02 && p.length === 0 && wearDelta > 0
      && Math.abs(dd.armorIn - dd.armorOut) < 0.0021;
    say('W19 判值: dmg行=' + d.length + ' prot行=' + p.length + ' raw=' + (dd ? f3(dd.raw) : '-')
      + ' armorIn=' + (dd ? f3(dd.armorIn) : '-')
      + ' armorOut=' + (dd ? f3(dd.armorOut) : '-') + '（vanilla 乘法期望 7.140；无 prot 行）'
      + ' | vanilla per-piece wear Δ=' + wearDelta + '（model-off 应 >0）'
      + ' | armorIn==armorOut=' + (dd ? Math.abs(dd.armorIn - dd.armorOut) < 0.0021 : false) + ' -> ' + ok);
    R.w19 = { ok: !!ok, dmg: d, prot: p, wearDelta, dur0, dur1 };
    save();
  }

  /* -------------------------------------------------------------- 全窗统计 */
  const all = logAll();
  const c = (re) => countOf(all, re);
  const allDmg = dmgs(all);
  const badIn = allDmg.filter((x) => Math.abs(x.armorIn - x.raw) > 0.0021);
  say('全窗 [DamageLog]: dmg=' + c(/\[DamageLog\] dmg /) + ' prot=' + c(/\[DamageLog\] prot /));
  say('[A-3 判据] armorIn==raw: ' + (allDmg.length - badIn.length) + '/' + allDmg.length
    + ' 不符=' + badIn.length + (badIn.length ? ' 首例: ' + cut(badIn[0].line, 180) : ''));
  say('崩面: soe=' + c(/StackOverflowError/) + ' crashSaved=' + c(/This crash report has been saved/)
    + ' noclassdef=' + c(/NoClassDefFoundError/) + ' injection=' + c(/Critical injection failure/)
    + ' watchdog=' + c(/watchdog|Timed out/i) + ' internalErr=' + c(/Internal server error/));
  R.a3invariant = { dmgRows: allDmg.length, bad: badIn.length, badSample: badIn.slice(0, 3).map((x) => x.line) };
  say('report -> ' + OUT);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
