#!/usr/bin/env node
/**
 * mobv-run.js 閳?mob 閹电櫢绱橰evenant / BoneLord / B-SK-1閿涘鐛欑拠浣虹崶 W1-W10 driver閵? *
 * 閸掋倖宓佸┃鎰剁窗playground/audit/mob-revenant-bonelord-閽€鐣岀垳閹佃鏋?md 鎼傛稉鈧敍鍫濆灲閸婂吋顒滈張顒婄礆
 * 闁岸浜鹃敍姝擜ILog]閿涘潰obDebugLog閿? [MobLog]閿涘潰obEquipDebugLog閿? [SpawnLog]
 *       / [MiningLog] + RCON entitydata NBT + 閹靛瀵旈懓鎰畽 delta
 *
 * 閻劍纭堕敍? *   node testharness/player/mobv-run.js <phase> [...]
 *   phase: probe | w3 | w9 | w10 | w8 | w4 | w5 | w6 | w2 | env | clean
 *
 * 缁绢亜绶ラ敍姘吂閹撮顏粣妤€褰涢幙宥勭稊娑撳秶鏁遍張?driver 鐟欙妇顫敍娑欐拱 driver 閸欘亜浠?RCON + 閸嬪洣姹?
 * 閿涘潰ineflayer閿涘瞼鐡戞禒?RCON 閹稿洣鎶ら棃顫礆+ 閺冦儱绻旈崚銈堫嚢閵? */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'obfuscated', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'v9-driver.log');
const HOST = '127.0.0.1', RCON_PORT = 25575, RCON_PASS = 'etim27';
const MC_PORT = 25565;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString().slice(11, 23);
const outLines = [];
function say(...a) {
  const line = `[${ts()}] ` + a.join(' ');
  console.log(line);
  outLines.push(line);
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
          const id = this.buf.readInt32LE(4);
          const type = this.buf.readInt32LE(8);
          const body = this.buf.slice(12, 4 + size).toString('utf8');
          this.buf = this.buf.slice(4 + size);
          const w = this.waiters.shift();
          if (w) w({ id, type, body });
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
    if (r.id === -1) throw new Error('rcon auth failed');
    return r;
  }
  async cmd(c) {
    const r = await this._send(9, 2, c);
    return (r.body || '').trim();
  }
}

/* ------------------------------------------------------------------ bot */
async function connectBot(username) {
  const mineflayer = require('mineflayer');
  const forge = require('minecraft-protocol-forge');
  const mc = require('minecraft-protocol');
  const res = await mc.ping({ host: HOST, port: MC_PORT, version: '1.12.2' });
  const mods = (res.modinfo && res.modinfo.modList) || [];
  const bot = mineflayer.createBot({ host: HOST, port: MC_PORT, username, version: '1.12.2' });
  forge.forgeHandshake(bot._client, { forgeMods: mods });
  await new Promise((resolve, reject) => {
    bot.once('login', resolve);
    bot.once('error', (e) => reject(new Error('login: ' + e.message)));
    setTimeout(() => reject(new Error('login timeout 30s')), 30000);
  });
  await sleep(2500);
  return bot;
}

/* --------------------------------------------------------------- helpers */
function logOffset() { try { return fs.statSync(LOG).size; } catch (e) { return 0; } }
function logSince(off) {
  try { return fs.readFileSync(LOG).slice(off).toString('utf8'); } catch (e) { return ''; }
}
function rows(t, re) { return t.split('\n').filter((l) => re.test(l)); }
function count(t, needle) {
  let n = 0, i = 0;
  while ((i = t.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}
/** parse entitydata NBT string into {attr:{}, armor:[], hand:[], ...} */
function parseNbt(s) {
  const pick = (re) => { const m = s.match(re); return m ? m[1] : null; };
  const attrs = {};
  // vanilla NBT printing is alphabetical: {Base:30.0d,Name:"generic.maxHealth"}
  const attrRe = /\{Base:([-\d.E]+)d?,Name:"generic\.([a-zA-Z_]+)"\}/g;
  let m;
  while ((m = attrRe.exec(s))) attrs[m[2]] = parseFloat(m[1]);
  const items = (key) => {
    const i = s.indexOf(key + ':[');
    if (i < 0) return [];
    let depth = 0, j = i + key.length + 1;
    const start = j;
    for (; j < s.length; j++) {
      if (s[j] === '[') depth++;
      else if (s[j] === ']') { depth--; if (depth === 0) break; }
    }
    const seg = s.slice(start + 1, j);
    const arr = [];
    const itRe = /\{([^{}]*)\}/g;
    let mm;
    while ((mm = itRe.exec(seg))) {
      const body = mm[1];
      const id = (body.match(/id:"([^"]+)"/) || [])[1] || '';
      const cnt = (body.match(/Count:(\d+)b?/) || [])[1] || '0';
      arr.push(id ? `${id}x${cnt}` : '');
    }
    return arr;
  };
  return {
    attrs,
    health: pick(/Health:([-\d.]+)f?/),
    armor: items('ArmorItems'),
    hand: items('HandItems'),
    num: pick(/num_troops_summoned:(-?\d+)b/),
    persist: /PersistenceRequired:1b/.test(s),
    id: pick(/Id:"([^"]+)"/),
    entityId: pick(/"[Ee]ntity[Ii]d":(\d+)/) || pick(/EntityId:(\d+)/),
  };
}

/* ------------------------------------------------------------------ main */
async function main() {
  const phase = process.argv[2] || 'probe';
  const rcon = new Rcon(HOST, RCON_PORT, RCON_PASS);
  await rcon.connect();
  await rcon.auth();
  say(`=== PHASE ${phase} @ ${new Date().toISOString()} ===`);

  let bot = null;
  const login = async (name) => {
    bot = await connectBot(name || 'ETIM_Harn07');
    say('bot login', bot.username, 'pos', bot.entity.position, 'health=' + bot.health);
    // clean respawn (a dead/ghost bot ignores interaction packets 鈥?the smoke
    // driver's kill+respawn face; without it W8/W10 dig packets vanish)
    try { await rcon.cmd(`kill ${bot.username}`); } catch (e) {}
    await sleep(900);
    try { bot.respawn(); } catch (e) { say('respawn err', e.message); }
    await sleep(2200);
    say('after respawn', 'pos', bot.entity.position, 'health=' + bot.health, 'gameMode=' + (bot.game && bot.game.gameMode));
    const arena = process.env.ARENA;
    if (arena) {
      say('tp', await rcon.cmd(`tp ${bot.username} ${arena}`));
      await sleep(2200);
      const p = bot.entity.position;
      say('arena pos', `x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} z=${p.z.toFixed(2)}`,
        'below=' + (bot.blockAt(p.offset(0, -1, 0)) || {}).name,
        'feet=' + (bot.blockAt(p.offset(0, 0, 0)) || {}).name,
        'head=' + (bot.blockAt(p.offset(0, 1, 0)) || {}).name);
    }
    return bot;
  };

  try {
    if (phase === 'probe') {
      await login();
      const p = bot.entity.position;
      say('pos', `x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} z=${p.z.toFixed(2)}`);
      for (const [dx, dy, dz] of [[0, -1, 0], [0, -2, 0], [2, -1, 0], [-2, -1, 0], [0, -1, 2], [0, -1, -2], [0, 0, 0], [0, 1, 0], [0, 2, 0]]) {
        const b = bot.blockAt(p.offset(dx, dy, dz));
        say(`block(${dx},${dy},${dz})`, b ? `${b.name}@${b.position.y}` : 'null');
      }
      say('gamemode', await rcon.cmd('gamemode'), '| time', await rcon.cmd('time query daytime'));
    } else if (phase === 'env') {
      say('list', await rcon.cmd('list'));
      say('time', await rcon.cmd('time query daytime'), '| gametime', await rcon.cmd('time query gametime'));
      say('difficulty', await rcon.cmd('difficulty'));
      say('counts', await rcon.cmd('testfor @e[type=etim:revenant]'), '|', await rcon.cmd('testfor @e[type=etim:bonelord]'));
    } else if (phase === 'clean') {
      for (const t of ['etim:revenant', 'etim:bonelord', 'Skeleton', 'Zombie', 'zombie_villager', 'zombie_pigman', 'Creeper', 'Spider']) {
        const r = await rcon.cmd(`kill @e[type=${t}]`); say('kill', t, '->', r);
      }
    } else if (phase === 'w3raw') {
      await login();
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      const lines = [];
      const cases = [
        ['plain', ''],
        ['tags', ' {Tags:["c1"]}'],
        ['persist', ' {PersistenceRequired:1b}'],
        ['tags+persist', ' {Tags:["c3"],PersistenceRequired:1b}'],
        ['customname', ' {Tags:["c4"],CustomName:"zz"}'],
      ];
      for (const [name, nbt] of cases) {
        await rcon.cmd('kill @e[type=etim:revenant]');
        await sleep(250);
        const off = logOffset();
        const r = await rcon.cmd(`summon etim:revenant ${bx + 1}.5 ${by} ${bz + 1}.5${nbt}`);
        await sleep(900);
        const raw = await rcon.cmd(`entitydata @e[type=etim:revenant,c=1] {}`);
        const n = parseNbt(raw);
        const t = logSince(off);
        const equipRows = rows(t, /mob lord equip/);
        lines.push(`### ${name} : ${nbt || '(no nbt)'}\nRESULT ${r}\nHAND ${JSON.stringify(n.hand)} ARMOR ${JSON.stringify(n.armor)}\nROWS ${equipRows.map((l) => l.trim()).join('\n') || '(none)'}`);
        say('CASE', name, '| hand=' + JSON.stringify(n.hand), '| armor=' + JSON.stringify(n.armor), '| equipRows=' + equipRows.length, '| tags=' + (raw.match(/Tags:(\[[^\]]*\])/) || [])[1], '| persist=' + n.persist);
      }
      fs.writeFileSync(path.join(ROOT, 'build-logs', 'v9-w3-raw-nbt.txt'), lines.join('\n\n'), 'utf8');
      say('raw NBT dumped');
    } else if (phase === 'w3') {
      // W3 鐟佸懎顦棃顫窗day>=20閿涘牊鏋?闁裤倛顢戦崗銉ユ簚閿涘绱濆В蹇曡 N=24閿涘BT + [MobLog] 閸欏苯鍨?
      say('time set 500000 ->', await rcon.cmd('time set 500000'), '| daytime', await rcon.cmd('time query daytime'));
      await login();
      const off = logOffset();
      const base = bot.entity.position;
      const bx = Math.floor(base.x), by = Math.floor(base.y), bz = Math.floor(base.z);
      say('arena', `${bx} ${by} ${bz}`);
      const N = parseInt(process.argv[3] || '24', 10);
      const stats = { revenant: { weapon: {}, armorFull: 0, armorBad: 0, nbt: [] }, bonelord: { weapon: {}, armorFull: 0, armorBad: 0, nbt: [] } };
      for (const kind of ['revenant', 'bonelord']) {
        for (let i = 0; i < N; i++) {
          await rcon.cmd(`kill @e[type=etim:${kind}]`);
          await sleep(90);
          const sum = await rcon.cmd(`summon etim:${kind} ${bx + 1}.5 ${by} ${bz + 1}.5`);
          await sleep(180);
          const nbtRaw = await rcon.cmd(`entitydata @e[type=etim:${kind},c=1] {}`);
          if (i === 0) say('RAW', kind, 'sum=' + sum, '| nbt=' + nbtRaw.slice(0, 500));
          const n = parseNbt(nbtRaw);
          const hand = n.hand[0] || 'EMPTY';
          const w = hand.replace(/^etim:/, '').replace(/x\d+$/, '');
          stats[kind].weapon[w] = (stats[kind].weapon[w] || 0) + 1;
          const armorSlots = n.armor.filter((x) => x).length;
          const full = armorSlots === 4;
          if (full) stats[kind].armorFull++; else { stats[kind].armorBad++; say('ARMOR-INCOMPLETE', kind, JSON.stringify(n.armor)); }
          stats[kind].nbt.push({ hand, armor: n.armor, attrs: n.attrs, health: n.health });
          if (i < 3) say('sample', kind, 'hand=' + hand, 'armor=' + JSON.stringify(n.armor), 'hp=' + n.health, 'atk=' + n.attrs.attackDamage, 'maxhp=' + n.attrs.maxHealth);
        }
        say('W3', kind, 'weapon dist', JSON.stringify(stats[kind].weapon), 'armorFull', stats[kind].armorFull, '/', N);
        const attrs = stats[kind].nbt.map((x) => `atk=${x.attrs.attackDamage},hp=${x.attrs.maxHealth}`);
        const uniq = [...new Set(attrs)];
        say('W3', kind, 'attr uniq', JSON.stringify(uniq));
      }
      // [MobLog] rows for the window
      const t = logSince(off);
      const lordRows = rows(t, /mob lord equip/);
      const byKind = {};
      lordRows.forEach((l) => {
        const k = /revenant/.test(l) ? 'revenant' : 'bonelord';
        const w = (l.match(/weapon=([^ ]+)/) || [])[1] || '?';
        byKind[k] = byKind[k] || {};
        byKind[k][w] = (byKind[k][w] || 0) + 1;
      });
      say('W3 [MobLog] rows', lordRows.length, JSON.stringify(byKind));
    } else if (phase === 'w9') {
      await login();
      const p = bot.entity.position;
      const bx = Math.floor(p.x) + 3, by = Math.floor(p.y), bz = Math.floor(p.z);
      const off = logOffset();
      // pigman 鑴?
      for (let i = 0; i < 6; i++) {
        await rcon.cmd(`summon minecraft:zombie_pigman ${bx}.5 ${by} ${bz}.5 {Tags:["w9p${i}"]}`);
        await sleep(250);
        const n = parseNbt(await rcon.cmd(`entitydata @e[tag=w9p${i},c=1] {}`));
        say('W9 pigman', i, 'atk=' + n.attrs.attackDamage, 'follow=' + n.attrs.followRange, 'armor=' + n.attrs.armor, 'hp=' + n.health);
        await rcon.cmd(`kill @e[tag=w9p${i}]`);
      }
      await sleep(500);
      const pigRows = rows(logSince(off), /mob stats/);
      say('W9 stats rows', pigRows.length);
      pigRows.slice(0, 12).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // ETIM lords attribute face
      for (const kind of ['revenant', 'bonelord']) {
        const tag = 'w9' + kind[0];
        await rcon.cmd(`summon etim:${kind} ${bx}.5 ${by} ${bz}.5 {Tags:["${tag}"]}`);
        await sleep(300);
        const n = parseNbt(await rcon.cmd(`entitydata @e[tag=${tag},c=1] {}`));
        say('W9', kind, 'atk=' + n.attrs.attackDamage, 'maxhp=' + n.attrs.maxHealth, 'hp=' + n.health, 'follow=' + n.attrs.followRange, 'speed=' + n.attrs.movementSpeed);
        await rcon.cmd(`kill @e[tag=${tag}]`);
      }
      await sleep(400);
      const etimRows = rows(logSince(off), /mob stats/).filter((l) => /Revenant|BoneLord/.test(l));
      say('W9 etim stats rows (expect 0)', etimRows.length);
      etimRows.slice(0, 5).forEach((l) => say('   ' + l.trim()));
    } else if (phase === 'w10') {
      // 鏉戞皯鍍靛案杞戒綋琛岋細summon 璧?chat锛堟湇鍔＄绾跨▼锛岄伩鍏?RCON 绾跨▼骞跺彂鏀瑰疄浣撹〃鐨?CME锛?      bot = await connectBot('ETIM_Harn01');
      const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(240); };
      await rcon.cmd('op ETIM_Harn01');
      await chat('kill ETIM_Harn01');
      await sleep(900);
      bot.respawn();
      await sleep(2200);
      await chat('gamemode 1');
      await chat('time set 506000');
      await chat('kill @e[type=zombie_villager]');
      await sleep(500);
      const p = bot.entity.position;
      const bx = Math.floor(p.x) + 2, by = Math.floor(p.y), bz = Math.floor(p.z);
      const N = parseInt(process.argv[3] || '200', 10);
      const off = logOffset();
      for (let i = 0; i < N; i++) {
        await chat(`summon minecraft:zombie_villager ${bx}.5 ${by} ${bz}.5`);
        await chat('kill @e[type=zombie_villager]');
        if (i % 50 === 0) say('w10 progress', i);
      }
      await sleep(1200);
      const t = logSince(off);
      const weaponRows = rows(t, /\[MobLog\] mob weapon/);
      const villager = weaponRows.filter((l) => /villager=true/.test(l));
      const scythe = villager.filter((l) => /scythe_rusted_iron/.test(l));
      const items = {};
      villager.forEach((l) => { const m = l.match(/item=([^ ]+)/); if (m) items[m[1]] = (items[m[1]] || 0) + 1; });
      say('W10 summons', N, 'weaponRows', weaponRows.length, 'villagerRows', villager.length, 'scytheRows', scythe.length);
      say('W10 villager item dist', JSON.stringify(items));
      scythe.slice(0, 3).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      const armorRows = rows(t, /\[MobLog\] mob armor/);
      say('W10 armorRows', armorRows.length);
      await chat('gamemode 0');

    } else if (phase === 'w8') {
      await login();
      await sleep(1600);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      say('arena', `${bx} ${by} ${bz}`);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('effect ETIM_Harn07 saturation 600 6');
      await rcon.cmd('effect ETIM_Harn07 resistance 600 4');
      // plot 6x3: middle row water (hydration), other rows farmland + mature wheat
      const px0 = bx + 2, pz0 = bz - 1;
      await rcon.cmd('kill @e[type=!Player,r=48]');
      await rcon.cmd('time set 506000');
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      for (let dx = 0; dx < 6; dx++) {
        for (let dz = 0; dz < 3; dz++) {
          const x = px0 + dx, z = pz0 + dz;
          if (dz === 1) {
            await rcon.cmd(`setblock ${x} ${by - 1} ${z} minecraft:water 0 replace`);
            await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:air 0 replace`);
          } else {
            await rcon.cmd(`setblock ${x} ${by - 1} ${z} minecraft:farmland 7 replace`);
            await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:wheat 7 replace`);
          }
          await rcon.cmd(`setblock ${x} ${by + 1} ${z} minecraft:air 0 replace`);
        }
      }
      await sleep(600);
      await rcon.cmd('clear ETIM_Harn07');
      await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      await sleep(800);
      const scythe = bot.inventory.items().find((it) => it.name === 'unknown' || /scythe/.test(it.name));
      if (!scythe) { say('W8 FATAL no scythe in inventory', JSON.stringify(bot.inventory.items().map((i) => i.name))); }
      else {
        await bot.equip(scythe, 'hand');
        await sleep(300);
        const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        let dug = 0;
        const off = logOffset();
        for (let dx = 0; dx < 6; dx++) {
          for (const dz of [0, 2]) {
            const blk = bot.blockAt(new (require('vec3').Vec3)(px0 + dx, by, pz0 + dz));
            if (!blk || blk.name !== 'wheat') { say('W8 skip', dx, dz, blk ? blk.name : 'null'); continue; }
            try { await bot.dig(blk); dug++; } catch (e) { say('W8 dig fail', dx, dz, e.message); }
            await sleep(200);
          }
        }
        await sleep(900);
        const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        say('W8 scythe durability', d0, '->', d1, 'delta=' + (d1 - d0), 'dug=' + dug, '(expect 12 plants x 2 = 24)');
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
        const off2 = logOffset();
        // negative control: pickaxe on fresh wheat
        await rcon.cmd('give ETIM_Harn07 minecraft:iron_pickaxe 1 0');
        for (let dx = 0; dx < 2; dx++) {
          await rcon.cmd(`setblock ${px0 - 2 + dx} ${by - 1} ${pz0 + 1} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${px0 - 2 + dx} ${by} ${pz0 + 1} minecraft:wheat 7 replace`);
        }
        await sleep(600);
        const pick = bot.inventory.items().find((it) => it.name === 'iron_pickaxe');
        if (pick) {
          await bot.equip(pick, 'hand');
          await sleep(200);
          const p0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
          for (let dx = 0; dx < 2; dx++) {
            const b = bot.blockAt(new (require('vec3').Vec3)(px0 - 2 + dx, by, pz0 + 1));
            if (b && b.name === 'wheat') { try { await bot.dig(b); } catch (e) { say('W8 pick dig fail', e.message); } }
            await sleep(200);
          }
          await sleep(600);
          const p1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
          say('W8 negative pickaxe durability', p0, '->', p1, 'delta=' + (p1 - p0), '(expect 0)');
        } else say('W8 no pickaxe');
        await sleep(400);
        const t = logSince(off);
        rows(t, /tool decay/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
    } else if (phase === 'w8probe') {
      await login();
      await sleep(1200);
      say('bot.game', JSON.stringify(bot.game && { gameMode: bot.game.gameMode, dimension: bot.game.dimension }));
      say('gamemode-cmd', await rcon.cmd('gamemode 0 ETIM_Harn07'));
      await sleep(400);
      say('bot.game2', JSON.stringify({ gameMode: bot.game.gameMode }));
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      say('pos', `${bx} ${by} ${bz}`);
      await rcon.cmd('clear ETIM_Harn07');
      for (const [dx, dz, name] of [[2, 0, 'stone'], [2, 1, 'wheat'], [2, -1, 'tallgrass']]) {
        const x = bx + dx, y = by, z = bz + dz;
        if (name === 'stone') {
          say('setblock', await rcon.cmd(`setblock ${x} ${y} ${z} minecraft:stone 0 replace`));
        } else if (name === 'wheat') {
          await rcon.cmd(`setblock ${x} ${y - 1} ${z} minecraft:farmland 7 replace`);
          say('setblock', await rcon.cmd(`setblock ${x} ${y} ${z} minecraft:wheat 7 replace`));
        } else {
          await rcon.cmd(`setblock ${x} ${y - 1} ${z} minecraft:grass replace`);
          say('setblock', await rcon.cmd(`setblock ${x} ${y} ${z} minecraft:tallgrass 1 replace`));
        }
        await sleep(400);
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        say('client-block', `${name} at ${x},${y},${z} => ${blk ? blk.name : 'null'} (hardness=${blk ? blk.hardness : '?'})`);
      }
      // scythe: tallgrass then wheat
      const giveScythe = await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      const givePick = await rcon.cmd('give ETIM_Harn07 minecraft:diamond_pickaxe 1 0');
      say('give', giveScythe, '|', givePick);
      await sleep(800);
      say('inventory', JSON.stringify(bot.inventory.items().map((i) => `${i.name} type=${i.type}`)));
      const scythe = bot.inventory.items().find((i) => i.name === 'unknown');
      const pick = bot.inventory.items().find((i) => i.name === 'diamond_pickaxe');
      const digOne = async (item, x, y, z, label) => {
        if (!item) { say(label, 'no item'); return; }
        await bot.equip(item, 'hand');
        await sleep(250);
        const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        const off = logOffset();
        const b = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        say(label, 'target=' + (b ? b.name : 'null'), 'held=' + (bot.heldItem ? bot.heldItem.name : 'none'), 'dmg0=' + d0);
        try { await bot.dig(b); } catch (e) { say(label, 'dig err', e.message); }
        await sleep(900);
        const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        say(label, 'delta=' + (d1 - d0), 'server-block=' + (await rcon.cmd(`testforblock ${x} ${y} ${z} minecraft:${label === 'stone' ? 'stone' : label}`)));
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      };
      if (scythe) {
        await digOne(scythe, bx + 2, by, bz - 1, 'tallgrass');
        await rcon.cmd(`setblock ${bx + 2} ${by - 1} ${bz - 1} minecraft:farmland 7 replace`);
        await rcon.cmd(`setblock ${bx + 2} ${by} ${bz - 1} minecraft:wheat 7 replace`);
        await sleep(300);
        await digOne(scythe, bx + 2, by, bz - 1, 'wheat');
      }
      if (pick) await digOne(pick, bx + 2, by, bz, 'stone');
      // attack-decay discriminator: isDamageable() gate face
      await rcon.cmd(`summon minecraft:zombie ${bx + 2}.5 ${by} ${bz + 2}.5`);
      await sleep(500);
      if (scythe) {
        await bot.equip(scythe, 'hand');
        await sleep(250);
        const off = logOffset();
        const zom = bot.nearestEntity((e) => e.type === 'mob' && e.name === 'zombie');
        say('attack target', zom ? `${zom.name}@${zom.position}` : 'none');
        try { if (zom) await bot.attack(zom); } catch (e) { say('attack err', e.message); }
        await sleep(900);
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
      await rcon.cmd('kill @e[type=zombie]');
    } else if (phase === 'w8dig') {
      await login();
      await sleep(1200);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      await rcon.cmd('clear ETIM_Harn07');
      await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      await sleep(700);
      const scythe = bot.inventory.items()[0];
      say('items', JSON.stringify(bot.inventory.items().map((i) => `${i.name}/${i.type}`)));
      await bot.equip(scythe, 'hand');
      await sleep(300);
      // build 4 wheat plants in a row at feet level
      const pts = [];
      for (let i = 0; i < 4; i++) {
        const x = bx + 2, y = by, z = bz + i - 1;
        await rcon.cmd(`setblock ${x} ${y - 1} ${z} minecraft:farmland 7 replace`);
        await rcon.cmd(`setblock ${x} ${y} ${z} minecraft:wheat 7 replace`);
        pts.push([x, y, z]);
      }
      await sleep(500);
      // extra cases: tallgrass on grass, wheat on dirt
      const extra = [];
      await rcon.cmd(`setblock ${bx + 3} ${by - 1} ${bz + 2} minecraft:grass 0 replace`);
      await rcon.cmd(`setblock ${bx + 3} ${by} ${bz + 2} minecraft:tallgrass 1 replace`);
      extra.push(['tallgrass', bx + 3, by, bz + 2]);
      await rcon.cmd(`setblock ${bx + 4} ${by - 1} ${bz + 2} minecraft:dirt 0 replace`);
      await rcon.cmd(`setblock ${bx + 4} ${by} ${bz + 2} minecraft:wheat 7 replace`);
      extra.push(['wheat-on-dirt', bx + 4, by, bz + 2]);
      await sleep(400);
      const digAt = async (label, x, y, z, testBlock) => {
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        say('target', label, `${x},${y},${z}`, blk ? blk.name : 'null');
        const off = logOffset();
        bot._client.write('block_dig', { status: 0, location: { x, y, z }, face: 1 });
        await sleep(900);
        bot._client.write('block_dig', { status: 2, location: { x, y, z }, face: 1 });
        await sleep(400);
        const still = await rcon.cmd(`testforblock ${x} ${y} ${z} ${testBlock}`);
        say('after', label, '| server:', still);
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      };
      for (const [x, y, z] of pts) await digAt('wheat-farmland', x, y, z, 'minecraft:wheat');
      for (const [label, x, y, z] of extra) await digAt(label, x, y, z, label === 'tallgrass' ? 'minecraft:tallgrass' : 'minecraft:wheat');
    } else if (phase === 'w8crop') {
      await login();
      await sleep(1200);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('clear ETIM_Harn07');
      await rcon.cmd('time set 506000');
      await rcon.cmd('kill @e[type=!Player,r=48]');
      const px0 = bx + 2, pz0 = bz - 2;
      const rowsDef = [['carrots', 'minecraft:carrots'], ['potatoes', 'minecraft:potatoes'], ['beetroots', 'minecraft:beetroots']];
      // water channel at dz=1
      for (let dx = 0; dx < 6; dx++) {
        await rcon.cmd(`setblock ${px0 + dx} ${by - 1} ${pz0 + 1} minecraft:water 0 replace`);
        await rcon.cmd(`setblock ${px0 + dx} ${by} ${pz0 + 1} minecraft:air 0 replace`);
      }
      for (const [name, blockId] of rowsDef) {
        const dz = name === 'carrots' ? 0 : 2;
        for (let dx = 0; dx < 4; dx++) {
          await rcon.cmd(`setblock ${px0 + dx} ${by - 1} ${pz0 + dz} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${px0 + dx} ${by} ${pz0 + dz} ${blockId} 7 replace`);
        }
        // a second row for each crop type stacked in x
        for (let dx = 0; dx < 4; dx++) {
          await rcon.cmd(`setblock ${px0 + dx} ${by - 1} ${pz0 + 3 + rowsDef.findIndex((r) => r[0] === name)} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${px0 + dx} ${by} ${pz0 + 3 + rowsDef.findIndex((r) => r[0] === name)} ${blockId} 7 replace`);
        }
      }
      await sleep(800);
      await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      await sleep(700);
      const scythe = bot.inventory.items()[0];
      say('items', JSON.stringify(bot.inventory.items().map((i) => `${i.name}/${i.type}`)));
      await bot.equip(scythe, 'hand');
      await sleep(300);
      say('held', bot.heldItem ? `${bot.heldItem.name}/${bot.heldItem.type} dmg=${bot.heldItem.durabilityUsed}` : 'none');
      const cases = [];
      for (const [name] of rowsDef) {
        cases.push([name, name === 'carrots' ? pz0 : pz0 + 2]);
        cases.push([name + '-row2', pz0 + 3 + rowsDef.findIndex((r) => r[0] === name)]);
      }
      for (const [label, z] of cases) {
        const x = px0 + 1, y = by;
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        const off = logOffset();
        const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        say('case', label, `(${x},${y},${z})`, 'client=' + (blk ? blk.name : 'null'));
        bot._client.write('block_dig', { status: 0, location: { x, y, z }, face: 1 });
        await sleep(500);
        bot._client.write('block_dig', { status: 2, location: { x, y, z }, face: 1 });
        await sleep(500);
        say('  result', await rcon.cmd(`testforblock ${x} ${y} ${z} ${label.startsWith('carrots') ? 'minecraft:carrots' : label.startsWith('potatoes') ? 'minecraft:potatoes' : 'minecraft:beetroots'}`),
          'dmg=' + (bot.heldItem ? bot.heldItem.durabilityUsed : '?') + ' (was ' + d0 + ')');
        rows(logSince(off), /tool decay|mine speed|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
      // attack-decay discriminator (isDamageable gate face)
      await rcon.cmd(`summon minecraft:zombie ${px0 + 3}.5 ${by} ${pz0 + 5}.5`);
      await sleep(600);
      await bot.equip(scythe, 'hand');
      await sleep(300);
      const offA = logOffset();
      const zom = bot.nearestEntity((e) => e.type === 'mob');
      say('attack-target', zom ? `${zom.name}` : 'none');
      try { if (zom) await bot.attack(zom); } catch (e) { say('attack err', e.message); }
      await sleep(800);
      rows(logSince(offA), /tool decay/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      await rcon.cmd('kill @e[type=zombie]');
      // empty hand negative control on a fresh potato
      await rcon.cmd(`setblock ${px0 + 2} ${by - 1} ${pz0 + 2} minecraft:farmland 7 replace`);
      await rcon.cmd(`setblock ${px0 + 2} ${by} ${pz0 + 2} minecraft:potatoes 7 replace`);
      await sleep(300);
      await bot.unequip('hand');
      await sleep(300);
      const offE = logOffset();
      bot._client.write('block_dig', { status: 0, location: { x: px0 + 2, y: by, z: pz0 + 2 }, face: 1 });
      await sleep(500);
      bot._client.write('block_dig', { status: 2, location: { x: px0 + 2, y: by, z: pz0 + 2 }, face: 1 });
      await sleep(500);
      say('empty-hand result', await rcon.cmd(`testforblock ${px0 + 2} ${by} ${pz0 + 2} minecraft:potatoes`));
      rows(logSince(offE), /tool decay|mine speed|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
    } else if (phase === 'w8atk') {
      await login();
      await sleep(1200);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('clear ETIM_Harn07');
      const px = bx + 1, pz = bz;
      for (let i = 0; i < 4; i++) {
        await rcon.cmd(`summon minecraft:zombie ${px}.5 ${by} ${pz}.5`);
        await sleep(400);
      }
      await sleep(500);
      for (const [label, itemCmd, itemName] of [
        ['scythe', 'give ETIM_Harn07 etim:scythe_rusted_iron 1 0', 'unknown'],
        ['pickaxe', 'give ETIM_Harn07 minecraft:iron_pickaxe 1 0', 'iron_pickaxe'],
      ]) {
        await rcon.cmd(itemCmd);
        await sleep(600);
        const it = bot.inventory.items().find((i) => i.name === itemName);
        if (!it) { say(label, 'not in inventory'); continue; }
        await bot.equip(it, 'hand');
        await sleep(250);
        const zom = bot.nearestEntity((e) => e.type === 'mob');
        say(label, 'target', zom ? zom.name + '@' + zom.position.distanceTo(bot.entity.position).toFixed(2) : 'none');
        const off = logOffset();
        try { if (zom) await bot.attack(zom); } catch (e) { say('attack err', e.message); }
        await sleep(700);
        rows(logSince(off), /tool decay/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
      await rcon.cmd('kill @e[type=zombie]');
    } else if (phase === 'w8tool') {
      await login();
      await sleep(1200);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('time set 506000');
      await rcon.cmd('kill @e[type=!Player,r=48]');
      const px0 = bx + 2, pz0 = bz - 2;
      // water + 4 crop types in separate rows
      for (let dx = 0; dx < 8; dx++) {
        await rcon.cmd(`setblock ${px0 + dx} ${by - 1} ${pz0 + 1} minecraft:water 0 replace`);
        await rcon.cmd(`setblock ${px0 + dx} ${by} ${pz0 + 1} minecraft:air 0 replace`);
      }
      const cropRows = [['minecraft:wheat', pz0], ['minecraft:carrots', pz0 + 2], ['minecraft:potatoes', pz0 + 3], ['minecraft:beetroots', pz0 + 4]];
      for (const [id, z] of cropRows) {
        for (let dx = 0; dx < 6; dx++) {
          await rcon.cmd(`setblock ${px0 + dx} ${by - 1} ${z} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${px0 + dx} ${by} ${z} ${id} 7 replace`);
        }
      }
      await sleep(700);
      const tools = [
        ['iron_axe', 'minecraft:iron_axe 1 0', 'wheat'],
        ['wooden_shovel', 'minecraft:wooden_shovel 1 0', 'wheat'],
        ['iron_pickaxe', 'minecraft:iron_pickaxe 1 0', 'wheat'],
      ];
      for (const [name, give, crop] of tools) {
        await rcon.cmd(`give ETIM_Harn07 ${give}`);
        await sleep(500);
        const it = bot.inventory.items().find((i) => i.name === name);
        if (!it) { say(name, 'missing'); continue; }
        await bot.equip(it, 'hand');
        await sleep(250);
        const z = cropRows.find((c) => c[0].endsWith(crop))[1];
        const x = px0 + 1, y = by;
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        const off = logOffset();
        bot._client.write('block_dig', { status: 0, location: { x, y, z }, face: 1 });
        await sleep(400);
        bot._client.write('block_dig', { status: 2, location: { x, y, z }, face: 1 });
        await sleep(400);
        say(name, 'on', crop, 'client=' + (blk ? blk.name : 'null'), '|', await rcon.cmd(`testforblock ${x} ${y} ${z} ${crop === 'wheat' ? 'minecraft:wheat' : 'minecraft:' + crop}`));
        rows(logSince(off), /tool decay/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
    } else if (phase === 'w8mix') {
      await login();
      await sleep(1200);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('clear ETIM_Harn07');
      await rcon.cmd('time set 506000');
      await rcon.cmd('kill @e[type=!Player,r=48]');
      // case A: wheat on STONE (smoke geometry)
      const ax = bx + 2, az = bz + 2;
      await rcon.cmd(`setblock ${ax} ${by - 1} ${az} minecraft:stone 0 replace`);
      await rcon.cmd(`setblock ${ax} ${by} ${az} minecraft:wheat 7 replace`);
      // case B: wheat on hydrated FARMLAND
      const bx2 = bx + 3, bz2 = bz - 2;
      for (let dx = -1; dx <= 1; dx++) {
        await rcon.cmd(`setblock ${bx2 + dx} ${by - 1} ${bz2 + 2} minecraft:water 0 replace`);
        await rcon.cmd(`setblock ${bx2 + dx} ${by - 1} ${bz2} minecraft:farmland 7 replace`);
        await rcon.cmd(`setblock ${bx2 + dx} ${by} ${bz2} minecraft:wheat 7 replace`);
      }
      await sleep(700);
      await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      await sleep(600);
      const scythe = bot.inventory.items()[0];
      await bot.equip(scythe, 'hand');
      await sleep(300);
      for (const [label, x, z] of [['wheat-on-stone', ax, az], ['wheat-on-farmland', bx2, bz2], ['wheat-on-farmland2', bx2 + 1, bz2]]) {
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, by, z));
        const off = logOffset();
        say('case', label, `${x},${by},${z}`, 'client=' + (blk ? blk.name : 'null'));
        bot._client.write('block_dig', { status: 0, location: { x, y: by, z }, face: 1 });
        await sleep(500);
        bot._client.write('block_dig', { status: 2, location: { x, y: by, z }, face: 1 });
        await sleep(500);
        say('  after', await rcon.cmd(`testforblock ${x} ${by} ${z} minecraft:wheat`));
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
    } else if (phase === 'w8final') {
      await login();
      await sleep(1000);
      await rcon.cmd('gamemode 0 ETIM_Harn07');
      await rcon.cmd('time set 506000');
      await rcon.cmd('kill @e[type=!Player,r=64]');
      // dedicated platform, far from the fragmented showcase
      await rcon.cmd('fill -62 100 28 -44 100 46 minecraft:stone 0 replace');
      await rcon.cmd('fill -62 101 28 -44 104 46 minecraft:air 0 replace');
      say('tp', await rcon.cmd('tp ETIM_Harn07 -53 101 37'));
      await sleep(2500);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      say('arena', `${bx} ${by} ${bz}`, 'onGround=' + bot.entity.onGround, 'below=' + (bot.blockAt(p.offset(0, -1, 0)) || {}).name);
      // water channel at z=bz, farmland rows at bz-1 and bz+1
      for (let dx = -4; dx <= 4; dx++) {
        await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:water 0 replace`);
        for (const dz of [-1, 1]) {
          await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${bx + dx} ${by} ${bz + dz} minecraft:wheat 7 replace`);
        }
        await rcon.cmd(`setblock ${bx + dx} ${by} ${bz} minecraft:air 0 replace`);
      }
      await sleep(800);
      await rcon.cmd('clear ETIM_Harn07');
      await rcon.cmd('give ETIM_Harn07 etim:scythe_rusted_iron 1 0');
      await sleep(800);
      const scythe = bot.inventory.items()[0];
      say('scythe', scythe ? `${scythe.name}/${scythe.type}` : 'none');
      await bot.equip(scythe, 'hand');
      await sleep(400);
      say('held', bot.heldItem ? `${bot.heldItem.name}/${bot.heldItem.type} dmg=${bot.heldItem.durabilityUsed}` : 'none', 'onGround=' + bot.entity.onGround);
      const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      const off = logOffset();
      let ok = 0, fail = 0;
      for (const dz of [-1, 1]) {
        for (let dx = -4; dx <= 4; dx++) {
          const blk = bot.blockAt(new (require('vec3').Vec3)(bx + dx, by, bz + dz));
          if (!blk || blk.name !== 'wheat') { continue; }
          try { await bot.dig(blk); ok++; } catch (e) { fail++; }
          await sleep(220);
        }
      }
      await sleep(1000);
      const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      say('W8 scythe', d0, '->', d1, 'delta=' + (d1 - d0), `dug=${ok} fail=${fail}`, '(expect 18 plants x 2 = 36)');
      rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // per-plant check: 3 more plants, one at a time with a row each
      const off2 = logOffset();
      for (let i = 0; i < 3; i++) {
        const x = bx + 2 + i, z = bz - 1;
        await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:wheat 7 replace`);
        await sleep(200);
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, by, z));
        const dd0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
        try { await bot.dig(blk); } catch (e) { say('dig err', e.message); }
        await sleep(400);
        say('  plant', i, 'dmg', dd0, '->', bot.heldItem ? bot.heldItem.durabilityUsed : '?', 'server:', await rcon.cmd(`testforblock ${x} ${by} ${z} minecraft:wheat`));
      }
      say('W8 rows (dedup suppresses identical values)', rows(logSince(off2), /tool decay/).length);
      rows(logSince(off2), /tool decay/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // negative control: sword on wheat (non-effective tool -> str gate -> loss 0)
      await rcon.cmd('give ETIM_Harn07 minecraft:iron_sword 1 0');
      await sleep(500);
      const sword = bot.inventory.items().find((i) => i.name === 'iron_sword');
      if (sword) {
        await bot.equip(sword, 'hand');
        await sleep(300);
        const off3 = logOffset();
        for (let i = 0; i < 2; i++) {
          const x = bx - 2 + i, z = bz + 1;
          await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:wheat 7 replace`);
          await sleep(200);
          const blk = bot.blockAt(new (require('vec3').Vec3)(x, by, z));
          try { await bot.dig(blk); } catch (e) {}
          await sleep(400);
        }
        say('negative sword rows:');
        rows(logSince(off3), /tool decay|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
    } else if (phase === 'w8smoke') {
      // 涓撶敤骞冲彴锛堣繙绂荤鐗囧寲灞曠ず鍙帮級+ kill/respawn + tp 閲嶈瘯锛岀洿鍒板鎴风钀戒綅涓€鑷?
      bot = await connectBot('ETIM_Harn01');
      say('login', bot.username, 'pos', bot.entity.position, 'health=' + bot.health);
      await rcon.cmd('kill ETIM_Harn01');
      await sleep(1000);
      bot.respawn();
      await sleep(3000);
      for (const t of ['etim:revenant', 'etim:bonelord', 'Skeleton', 'Zombie', 'Creeper', 'Spider']) { try { await rcon.cmd(`kill @e[type=${t}]`); } catch (e) {} }
      await rcon.cmd('gamemode 0 ETIM_Harn01');
      await rcon.cmd('effect ETIM_Harn01 resistance 1200 4');
      await rcon.cmd('effect ETIM_Harn01 regeneration 1200 3');
      await rcon.cmd('effect ETIM_Harn01 saturation 1200 6');
      await rcon.cmd('time set 506000');
      const PX = -53, PY = 100, PZ = 37;
      say('fill', await rcon.cmd('fill -60 100 30 -46 100 44 minecraft:stone 0 replace'));
      say('clear', await rcon.cmd('fill -60 101 30 -46 103 44 minecraft:air 0 replace'));
      for (let i = 0; i < 5; i++) {
        await rcon.cmd(`tp ETIM_Harn01 ${PX + 0.5} 101 ${PZ + 0.5}`);
        await sleep(2500);
        const q = bot.entity.position;
        say('tp try', i, `x=${q.x.toFixed(1)} y=${q.y.toFixed(1)} z=${q.z.toFixed(1)}`, 'onGround=' + bot.entity.onGround);
        if (Math.abs(q.x - (PX + 0.5)) < 2 && Math.abs(q.z - (PZ + 0.5)) < 2 && Math.abs(q.y - 101) < 2) break;
      }
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      say('arena', `${bx} ${by} ${bz}`, 'below=' + (bot.blockAt(p.offset(0, -1, 0)) || {}).name, 'onGround=' + bot.entity.onGround);
      // water row at bz, farmland rows at bz-1 / bz+1; 9 plants per row
      for (let dx = -4; dx <= 4; dx++) {
        await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:water 0 replace`);
        await rcon.cmd(`setblock ${bx + dx} ${by} ${bz} minecraft:air 0 replace`);
        for (const dz of [-1, 1]) {
          await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:farmland 7 replace`);
          await rcon.cmd(`setblock ${bx + dx} ${by} ${bz + dz} minecraft:wheat 7 replace`);
          await rcon.cmd(`setblock ${bx + dx} ${by + 1} ${bz + dz} minecraft:air 0 replace`);
        }
      }
      await sleep(800);
      const seen = bot.blockAt(new (require('vec3').Vec3)(bx + 1, by, bz - 1));
      say('client sees', seen ? seen.name : 'null');
      await rcon.cmd('clear ETIM_Harn01');
      await rcon.cmd('give ETIM_Harn01 etim:scythe_rusted_iron 1 0');
      await sleep(900);
      const sc = bot.inventory.items().find((i) => i.name === 'unknown');
      if (!sc) { say('no scythe', JSON.stringify(bot.inventory.items().map((i) => i.name))); return; }
      await bot.equip(sc, 'hand');
      await sleep(400);
      const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      const off = logOffset();
      let dug = 0;
      for (const dz of [-1, 1]) {
        for (let dx = -4; dx <= 4; dx++) {
          const blk = bot.blockAt(new (require('vec3').Vec3)(bx + dx, by, bz + dz));
          if (!blk || blk.name !== 'wheat') { continue; }
          try { await bot.dig(blk); dug++; } catch (e) { say('dig err', e.message); }
          await sleep(200);
        }
      }
      await sleep(1000);
      const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      say('W8 scythe', d0, '->', d1, 'delta=' + (d1 - d0), 'dug=' + dug, '(expect 18 x 2 = 36)');
      rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // negative: sword then empty hand on fresh wheat
      await rcon.cmd('give ETIM_Harn01 minecraft:iron_sword 1 0');
      await sleep(600);
      const sw = bot.inventory.items().find((i) => i.name === 'iron_sword');
      if (sw) {
        await bot.equip(sw, 'hand');
        await sleep(300);
        const off3 = logOffset();
        for (let dx = 0; dx < 2; dx++) {
          const x = bx + dx, z = bz + 1;
          await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:wheat 7 replace`);
          await sleep(250);
          const blk = bot.blockAt(new (require('vec3').Vec3)(x, by, z));
          try { await bot.dig(blk); } catch (e) {}
          await sleep(350);
        }
        say('negative sword:');
        rows(logSince(off3), /tool decay|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
      await bot.unequip('hand');
      await sleep(400);
      const off4 = logOffset();
      for (let dx = 3; dx < 5; dx++) {
        const x = bx + dx, z = bz + 1;
        await rcon.cmd(`setblock ${x} ${by} ${z} minecraft:wheat 7 replace`);
        await sleep(250);
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, by, z));
        try { await bot.dig(blk); } catch (e) {}
        await sleep(350);
      }
      say('negative empty-hand:');
      rows(logSince(off4), /tool decay|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
    } else if (phase === 'w8ab') {
      bot = await connectBot('ETIM_Harn01');
      await rcon.cmd('kill ETIM_Harn01');
      await sleep(900);
      bot.respawn();
      await sleep(2500);
      await rcon.cmd('gamemode 0 ETIM_Harn01');
      await rcon.cmd('effect ETIM_Harn01 resistance 900 4');
      await rcon.cmd('effect ETIM_Harn01 regeneration 900 3');
      await rcon.cmd('time set 506000');
      await rcon.cmd('tp ETIM_Harn01 -30 101 12');
      await sleep(3000);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      say('pos', `${bx} ${by} ${bz}`, 'onGround=' + bot.entity.onGround, 'below=' + (bot.blockAt(p.offset(0, -1, 0)) || {}).name);
      await rcon.cmd('clear ETIM_Harn01');
      await rcon.cmd('give ETIM_Harn01 etim:scythe_rusted_iron 1 0');
      await sleep(800);
      const sc = bot.inventory.items().find((i) => i.name === 'unknown');
      await bot.equip(sc, 'hand');
      await sleep(300);
      const digFast = async (x, y, z, label) => {
        const blk = bot.blockAt(new (require('vec3').Vec3)(x, y, z));
        const off = logOffset();
        say('case', label, `${x},${y},${z}`, 'client=' + (blk ? blk.name : 'null'));
        if (!blk || blk.name !== 'wheat') { say('  no wheat to dig'); return; }
        try { await bot.dig(blk); } catch (e) { say('  dig err', e.message); }
        await sleep(500);
        say('  server:', await rcon.cmd(`testforblock ${x} ${y} ${z} minecraft:wheat`));
        rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      };
      // A: wheat on stone (smoke geometry, pops after a tick)
      await rcon.cmd(`setblock ${bx + 2} ${by} ${bz} minecraft:wheat 7 replace`);
      await sleep(150);
      await digFast(bx + 2, by, bz, 'A-wheat-on-stone');
      // B: wheat on hydrated farmland
      for (let dx = 1; dx <= 3; dx++) {
        await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz + 3} minecraft:water 0 replace`);
        await rcon.cmd(`setblock ${bx + dx} ${by - 1} ${bz + 2} minecraft:farmland 7 replace`);
        await rcon.cmd(`setblock ${bx + dx} ${by} ${bz + 2} minecraft:wheat 7 replace`);
      }
      await sleep(400);
      await digFast(bx + 1, by, bz + 2, 'B-wheat-on-farmland');
      await digFast(bx + 2, by, bz + 2, 'B2-wheat-on-farmland');
    } else if (phase === 'w8s3') {
      bot = await connectBot('ETIM_Harn01');
      await rcon.cmd('kill ETIM_Harn01');
      await sleep(1000);
      bot.respawn();
      await sleep(3000);
      await rcon.cmd('gamemode 0 ETIM_Harn01');
      await rcon.cmd('effect ETIM_Harn01 resistance 900 4');
      await rcon.cmd('effect ETIM_Harn01 regeneration 900 3');
      await rcon.cmd('time set 506000');
      await rcon.cmd('tp ETIM_Harn01 -29.5 101 12.5');
      await sleep(2500);
      for (const it of bot.inventory.items()) { try { await bot.tossStack(it); } catch (e) {} }
      await rcon.cmd('give ETIM_Harn01 etim:scythe_rusted_iron 1 0');
      await sleep(1500);
      const sc = bot.inventory.items().find((i) => i.name === 'unknown');
      say('scythe', sc ? `type=${sc.type} dmg=${sc.durabilityUsed}` : 'MISSING');
      await bot.equip(sc, 'hand');
      await sleep(500);
      const p = bot.entity.position;
      say('pos', `x=${p.x} y=${p.y} z=${p.z}`, 'onGround=' + bot.entity.onGround);
      const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      const off = logOffset();
      const spots = [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]];
      let dug = 0;
      for (const [dx, dz] of spots) {
        const wx = Math.floor(p.x) + dx, wy = Math.floor(p.y), wz = Math.floor(p.z) + dz;
        const r = await rcon.cmd(`setblock ${wx} ${wy} ${wz} minecraft:wheat 7 replace`);
        await sleep(120);
        const b = bot.blockAt(bot.entity.position.offset(dx, 0, dz));
        if (b && b.name === 'wheat') { try { await bot.dig(b); dug++; } catch (e) { say('dig err', e.message); } }
        else say('not-visible', dx, dz, b ? b.name : 'null', '| setblock:', r);
        await sleep(150);
      }
      await sleep(1200);
      const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      say('W8 S3 scythe', d0, '->', d1, 'delta=' + (d1 - d0), 'dug=' + dug, '(expect 10 x 2 = 20)');
      rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // second batch: another 10 on a fresh row (dedup check for repeated 2s)
      const off2 = logOffset();
      const d2a = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      let dug2 = 0;
      for (const [dx, dz] of spots) {
        const wx = Math.floor(p.x) + dx, wy = Math.floor(p.y), wz = Math.floor(p.z) + 2 + dz;
        await rcon.cmd(`setblock ${wx} ${wy} ${wz} minecraft:wheat 7 replace`);
        await sleep(120);
        const b = bot.blockAt(bot.entity.position.offset(dx, 2, dz));
        if (b && b.name === 'wheat') { try { await bot.dig(b); dug2++; } catch (e) {} }
        await sleep(150);
      }
      await sleep(1200);
      const d2b = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      say('W8 S3 batch2', d2a, '->', d2b, 'delta=' + (d2b - d2a), 'dug=' + dug2);
      say('batch2 rows:', rows(logSince(off2), /tool decay/).length);
    } else if (phase === 'w8chat') {
      bot = await connectBot('ETIM_Harn01');
      const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(300); };
      await rcon.cmd('op ETIM_Harn01');
      await sleep(300);
      await chat('kill ETIM_Harn01');
      await sleep(1200);
      bot.respawn();
      await sleep(3000);
      await chat('gamerule doMobSpawning false');
      await chat('kill @e[type=!Player]');
      await chat('gamemode 0');
      await chat('effect @p resistance 1800 4');
      await chat('effect @p regeneration 1800 3');
      await chat('time set 506000');
      const p0 = bot.entity.position;
      say('start pos', `x=${p0.x.toFixed(1)} y=${p0.y.toFixed(1)} z=${p0.z.toFixed(1)}`);
      const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
      await chat(`fill ${bx - 5} ${by - 1} ${bz} ${bx + 5} ${by - 1} ${bz} minecraft:water 0 replace`);
      for (const dz of [-1, 1]) {
        await chat(`fill ${bx - 5} ${by - 1} ${bz + dz} ${bx + 5} ${by - 1} ${bz + dz} minecraft:farmland 7 replace`);
        await chat(`fill ${bx - 5} ${by} ${bz + dz} ${bx + 5} ${by} ${bz + dz} minecraft:wheat 7 replace`);
      }
      await chat(`fill ${bx - 5} ${by} ${bz} ${bx + 5} ${by} ${bz} minecraft:air 0 replace`);
      await sleep(900);
      const chk = bot.blockAt(new (require('vec3').Vec3)(bx + 1, by, bz - 1));
      say('client check (bx+1,by,bz-1) =', chk ? chk.name : 'null');
      await chat('clear');
      await chat('give @p etim:scythe_rusted_iron 1 0');
      await sleep(1200);
      const sc = bot.inventory.items().find((i) => i.name === 'unknown');
      say('scythe', sc ? `type=${sc.type} dmg=${sc.durabilityUsed}` : 'MISSING ' + JSON.stringify(bot.inventory.items().map((i) => i.name)));
      await bot.equip(sc, 'hand');
      await sleep(400);
      const d0 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      const off = logOffset();
      let dug = 0, skipped = 0;
      for (const dz of [-1, 1]) {
        for (let dx = -5; dx <= 5; dx++) {
          const blk = bot.blockAt(new (require('vec3').Vec3)(bx + dx, by, bz + dz));
          if (!blk || blk.name !== 'wheat') { skipped++; continue; }
          try { await bot.dig(blk); dug++; } catch (e) { say('dig err', e.message); }
          await sleep(180);
        }
      }
      await sleep(1200);
      const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
      say('W8 chat scythe', d0, '->', d1, 'delta=' + (d1 - d0), `dug=${dug} skipped=${skipped}`, '(expect 22 x 2 = 44)');
      rows(logSince(off), /tool decay|mine speed/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // negative: sword then empty hand
      await chat('give @p minecraft:iron_sword 1 0');
      await sleep(900);
      const sw = bot.inventory.items().find((i) => i.name === 'iron_sword');
      if (sw) {
        await bot.equip(sw, 'hand');
        await sleep(300);
        const o3 = logOffset();
        for (let dx = 0; dx < 2; dx++) {
          await chat(`setblock ${bx + dx} ${by} ${bz + 1} minecraft:wheat 7 replace`);
          const blk = bot.blockAt(new (require('vec3').Vec3)(bx + dx, by, bz + 1));
          if (blk && blk.name === 'wheat') { try { await bot.dig(blk); } catch (e) {} }
          await sleep(300);
        }
        say('sword rows:'); rows(logSince(o3), /tool decay|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      }
      await bot.unequip('hand');
      await sleep(300);
      const o4 = logOffset();
      for (let dx = 3; dx < 5; dx++) {
        await chat(`setblock ${bx + dx} ${by} ${bz + 1} minecraft:wheat 7 replace`);
        const blk = bot.blockAt(new (require('vec3').Vec3)(bx + dx, by, bz + 1));
        if (blk && blk.name === 'wheat') { try { await bot.dig(blk); } catch (e) {} }
        await sleep(300);
      }
      say('empty-hand rows:'); rows(logSince(o4), /tool decay|mine deny/).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      await chat('gamerule doMobSpawning true');
    } else if (phase === 'w4') {
      bot = await connectBot('ETIM_Harn01');
      const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(280); };
      await rcon.cmd('op ETIM_Harn01');
      await chat('kill ETIM_Harn01');
      await sleep(1000);
      bot.respawn();
      await sleep(2500);
      await chat('gamemode 0');
      await chat('effect @p resistance 1800 4');
      await chat('effect @p regeneration 1800 3');
      await chat('effect @p saturation 1800 4');
      await chat('time set 520000');
      await chat('kill @e[type=etim:bonelord]');
      await chat('kill @e[type=Skeleton]');
      await chat('kill @e[type=zombie]');
      await sleep(600);
      const p = bot.entity.position;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      const nLords = parseInt(process.argv[3] || '6', 10);
      const waitSec = parseInt(process.argv[4] || '150', 10);
      const off = logOffset();
      for (let i = 0; i < nLords; i++) {
        const ang = (i / nLords) * Math.PI * 2;
        const x = bx + Math.round(Math.cos(ang) * 3), z = bz + Math.round(Math.sin(ang) * 3);
        await chat(`summon etim:bonelord ${x}.5 ${by} ${z}.5`);
        await sleep(120);
      }
      say('W4 summoned', nLords, 'lords at', `${bx},${by},${bz}`, 'wait', waitSec + 's');
      for (let s = 0; s < waitSec; s += 15) {
        await sleep(15000);
        const t = logSince(off);
        say('W4 t+' + (s + 15) + 's summon=' + count(t, 'bonelord summon')
          + ' hold=' + count(t, 'hold=summoned reset=-9600')
          + ' troopType=' + count(t, 'mob troop equip')
          + ' frenzy=' + count(t, 'frenzy set')
          + ' persistence=' + count(t, 'bonelord persistence')
          + ' hp=' + bot.health);
        await chat('effect @p instant_health 1 4');
      }
      const t = logSince(off);
      say('W4 summon rows', count(t, 'bonelord summon'));
      rows(t, /bonelord summon/).slice(0, 6).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      const nums = rows(t, /bonelord summon/).map((l) => parseInt((l.match(/num=(\d+)/) || [])[1], 10)).filter((x) => !isNaN(x));
      say('W4 num seq', JSON.stringify(nums.slice(0, 40)), 'max=' + Math.max(0, ...nums));
      say('W4 hold=summoned rows', count(t, 'hold=summoned reset=-9600'), '| persistence rows', count(t, 'bonelord persistence'));
      const types = rows(t, /mob troop equip/).map((l) => (l.match(/type=(\d)/) || [])[1]);
      const dist = types.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
      say('W5 troop type dist', JSON.stringify(dist), 'n=' + types.length);
      rows(t, /type=2/).slice(0, 4).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      say('W7 frenzy rows', count(t, 'frenzy set'));
      rows(t, /frenzy set/).slice(0, 3).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      // W6: 鏉€鎺夌帺瀹剁洰鏍?鈫?鍏靛洟 target 娓呯┖ 鈫?0.05 鍒嗘敮 / counter 绠＄悊闈?      const off6 = logOffset();
      say('W6 kill bot to clear troop targets');
      await chat('kill @p');
      await sleep(1200);
      const w6sec = parseInt(process.argv[5] || '120', 10);
      for (let s = 0; s < w6sec; s += 30) {
        await sleep(30000);
        const t6 = logSince(off6);
        say('W6 t+' + (s + 30) + 's killMAX=' + count(t6, 'mob despawn kill counter=2147483647')
          + ' killAny=' + count(t6, 'mob despawn kill counter=')
          + ' holds=' + count(t6, 'mob despawn hold='));
      }
      const t6 = logSince(off6);
      rows(t6, /mob despawn kill counter=/).slice(0, 6).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      if (bot.health <= 0) { bot.respawn(); await sleep(2000); }
      await rcon.cmd('op ETIM_Harn01');
      await chat('tp ETIM_Harn01 -29.5 101 12.5');
      await sleep(1500);
      const nd = await rcon.cmd('entitydata @e[tag=w6lord,c=1] {}');
      say('W6 lord NBT num field:', (nd.match(/num_troops_summoned:(-?\d+)b/) || [])[1] || '(none/absent)');

    } else if (phase === 'w6') {
      // W6 涓撻」锛歭ord 鎸佷箙鍖?鈫?6 鍏靛洟 鈫?鐩爣娑堝け 鈫?绠＄悊闈?kill(MAX_VALUE) + num--
      bot = await connectBot('ETIM_Harn01');
      const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(260); };
      await rcon.cmd('op ETIM_Harn01');
      await chat('kill ETIM_Harn01');
      await sleep(900);
      bot.respawn();
      await sleep(2500);
      await chat('gamemode 0');
      await chat('effect @p resistance 1800 4');
      await chat('effect @p regeneration 1800 3');
      await chat('tp ETIM_Harn01 -71.5 69 249.5');
      await sleep(2500);
      await chat('time set 520000');
      await chat('kill @e[type=etim:bonelord]');
      await chat('kill @e[type=Skeleton]');
      await sleep(600);
      const p = bot.entity.position;
      say('W6 bot pos', `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`, 'onGround=' + bot.entity.onGround, 'below=' + (bot.blockAt(p.offset(0, -1, 0)) || {}).name);
      const bx = Math.floor(p.x) + 3, by = Math.floor(p.y), bz = Math.floor(p.z);
      await chat(`summon etim:bonelord ${bx}.5 ${by} ${bz}.5 {Tags:["w6lord"]}`);
      await sleep(600);
      await chat('entitydata @e[tag=w6lord,c=1] {PersistenceRequired:1b}');
      const readNum = async () => {
        const s = await rcon.cmd('entitydata @e[tag=w6lord,c=1] {}');
        const m = s.match(/num_troops_summoned:(-?\d+)b/);
        return m ? m[1] : (s.includes('found nothing') ? 'lord-gone' : '0/absent');
      };
      const off = logOffset();
      for (let i = 0; i < 6; i++) {
        await sleep(15000);
        say('W6 fill t+' + (i + 1) * 15 + 's num=' + (await readNum()) + ' summon=' + count(logSince(off), 'bonelord summon'));
        await chat('effect @p instant_health 1 4');
      }
      const numBefore = await readNum();
      say('W6 num before target loss =', numBefore);
      const off6 = logOffset();
      await chat('kill @p');
      await sleep(1500);
      for (let i = 0; i < 6; i++) {
        await sleep(30000);
        const t6 = logSince(off6);
        say('W6 t+' + (i + 1) * 30 + 's num=' + (await readNum())
          + ' killMAX=' + count(t6, 'mob despawn kill counter=2147483647')
          + ' killAny=' + count(t6, 'mob despawn kill counter='));
      }
      say('W6 num after =', await readNum());

    } else if (phase === 'w2') {
      // W2 鑷劧鐢熸垚闈細澶滈棿 + 鍛ㄦ湡娓呮€紙chat锛屾湇鍔＄绾跨▼锛変繚 cap 鍛ㄨ浆
      const minutes = parseFloat(process.argv[3] || '12');
      bot = await connectBot('ETIM_Harn01');
      const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(200); };
      await rcon.cmd('op ETIM_Harn01');
      await chat('kill ETIM_Harn01');
      await sleep(900);
      bot.respawn();
      await sleep(2500);
      await chat('gamemode 0');
      await chat('effect @p resistance 1800 4');
      await chat('effect @p regeneration 1800 3');
      await chat('gamerule doMobSpawning true');
      await chat('time set 18000');
      await chat('kill @e[type=!Player]');
      const p = bot.entity.position;
      say('W2 arena', `${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)}`);
      const off = logOffset();
      const t0 = Date.now();
      let cycle = 0, timeAdded = 0;
      while (Date.now() - t0 < minutes * 60000) {
        await sleep(5000);
        cycle++;
        await chat('kill @e[type=!Player]');
        await chat('time set 18000');
        timeAdded += 24000;
        if (cycle % 12 === 0) {
          const t = logSince(off);
          say('W2 t+' + Math.round((Date.now() - t0) / 1000) + 's accept=' + count(t, '[SpawnLog] accept')
            + ' rev=' + count(t, 'accept ETIMEntityRevenant') + ' lord=' + count(t, 'accept ETIMEntityBoneLord')
            + ' capRev=' + count(t, 'cap-class ETIMEntityRevenant') + ' capLord=' + count(t, 'cap-class ETIMEntityBoneLord')
            + ' hp=' + bot.health);
        }
      }
      const t = logSince(off);
      say('W2 window', Math.round((Date.now() - t0) / 1000) + 's real', 'timeSetTicks=' + timeAdded);
      say('W2 accepts total', count(t, '[SpawnLog] accept'));
      say('W2 revenant accepts', count(t, 'accept ETIMEntityRevenant'));
      say('W2 bonelord accepts', count(t, 'accept ETIMEntityBoneLord'));
      say('W2 cap-class revenant', count(t, 'cap-class ETIMEntityRevenant'));
      say('W2 cap-class bonelord', count(t, 'cap-class ETIMEntityBoneLord'));
      rows(t, /accept ETIMEntity(Revenant|BoneLord)/).slice(0, 8).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      rows(t, /cap-class ETIMEntity(Revenant|BoneLord)/).slice(0, 4).forEach((l) => say('   ' + l.slice(l.indexOf('[')).trim()));
      const chunks = rows(t, /accept ETIMEntity(Revenant|BoneLord)/).map((l) => {
        const m = l.match(/at \((-?\d+),(-?\d+),(-?\d+)\)/);
        const cls = (l.match(/accept (ETIMEntity\w+)/) || [])[1];
        return m ? `${cls}@${Math.floor(+m[1] / 16)},${Math.floor(+m[3] / 16)}` : '';
      });
      const dupes = chunks.filter((c, i) => chunks.indexOf(c) !== i);
      say('W2 accept chunk keys', JSON.stringify([...new Set(chunks)]), 'dupes=' + JSON.stringify([...new Set(dupes)]));
      // W10 鑷劧闈細鏉戞皯鍍靛案姝﹀櫒琛岋紙闀跨獥鏈轰細闈級
      const vrows = rows(t, /mob weapon.*villager=true/);
      say('W10 natural villager rows', vrows.length, '| scythe rows', vrows.filter((l) => /scythe/.test(l)).length);

      say('unknown phase', phase);
    }
  } catch (e) {
    say('FATAL', e.stack || e.message);
  } finally {
    flush();
    try { if (bot) bot.quit(); } catch (e) {}
    try { rcon.sock.destroy(); } catch (e) {}
    process.exit(0);
  }
}

main();
