const net = require('net');
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() { return new Promise((res, rej) => { this.s = net.connect(25575, '127.0.0.1', () => res()); this.s.on('error', rej); this.s.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]); for (;;) { if (this.buf.length < 4) break; const n = this.buf.readInt32LE(0); if (this.buf.length < n + 4) break; const body = this.buf.slice(12, 4 + n).toString('utf8'); this.buf = this.buf.slice(4 + n); const w = this.q.shift(); if (w) w(body); } }); }); }
  pkt(id, t, b) { const bb = Buffer.from(b, 'utf8'); const pl = Buffer.alloc(10 + bb.length); pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8); const o = Buffer.alloc(4 + pl.length); o.writeInt32LE(pl.length, 0); pl.copy(o, 4); return o; }
  send(id, t, b) { return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout ' + b)), 20000); this.q.push((x) => { clearTimeout(to); res(x); }); this.s.write(this.pkt(id, t, b)); }); }
  async auth() { return this.send(1, 3, 'etim27'); }
  async cmd(c) { return String(await this.send(9, 2, c) || '').replace(/\u0000/g, '').trim(); }
}
const out = (k, v) => console.log('PROBE ' + k + ' -> ' + String(v).slice(0, 160));
(async () => {
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  await sleep(2500);
  await rcon.cmd('tp ETIM_Harn01 100.5 4 100.5');
  await sleep(2500);
  for (const [k, c] of [
    ['golem-plain', 'summon minecraft:iron_golem 104.5 4 101.5'],
    ['golem-noai', 'summon minecraft:iron_golem 106.5 4 101.5 {NoAI:1b}'],
    ['golem-name', 'summon minecraft:iron_golem 108.5 4 101.5 {CustomName:"G3"}'],
    ['golem-full', 'summon minecraft:iron_golem 110.5 4 101.5 {CustomName:"G4",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}'],
    ['zombie-full', 'summon minecraft:zombie 104.5 4 103.5 {CustomName:"Z1",NoAI:1b,PersistenceRequired:1b,Silent:1b}'],
    ['villager-full', 'summon minecraft:villager 106.5 4 103.5 {CustomName:"V1",NoAI:1b,PersistenceRequired:1b}'],
    ['longdead-full', 'summon etim:longdead 108.5 4 103.5 {CustomName:"L1",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}'],
    ['guardian-full', 'summon etim:longdead_guardian 110.5 4 103.5 {CustomName:"GU1",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}'],
    ['bonelord-full', 'summon etim:bonelord 112.5 4 103.5 {CustomName:"BL1",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}'],
    ['revenant-full', 'summon etim:revenant 114.5 4 103.5 {CustomName:"R1",NoAI:1b,PersistenceRequired:1b}'],
    ['enderman-full', 'summon minecraft:enderman 104.5 4 105.5 {CustomName:"E1",NoAI:1b,Silent:1b,PersistenceRequired:1b}'],
    ['skeleton-full', 'summon minecraft:skeleton 106.5 4 105.5 {CustomName:"S1",NoAI:1b,PersistenceRequired:1b}'],
    ['skeleton-golem-attr', 'summon minecraft:skeleton 108.5 4 105.5 {NoAI:1b}'],
  ]) {
    out(k, await rcon.cmd(c));
    await sleep(250);
  }
  await sleep(800);
  out('entities', await rcon.cmd('execute @e[type=!player] ~ ~ ~ say E'));
  for (const t of ['iron_golem', 'zombie', 'villager', 'etim:longdead', 'etim:longdead_guardian', 'etim:bonelord', 'etim:revenant', 'enderman', 'skeleton']) {
    out('testfor ' + t, await rcon.cmd('testfor @e[type=' + t + ']'));
  }
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
