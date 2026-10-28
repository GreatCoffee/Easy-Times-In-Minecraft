const { execFileSync } = require('child_process');
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

(async () => {
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  await sleep(2500);
  console.log('bot pos', JSON.stringify(bot.entity.position));
  console.log('tp  ->', await rcon.cmd('tp ETIM_Harn01 100.5 4 100.5'));
  await sleep(2500);
  console.log('pos2', JSON.stringify(bot.entity.position));
  console.log('block@bot-1', await rcon.cmd('testforblock 100 3 100 minecraft:grass'));
  console.log('block@bot+0', await rcon.cmd('testforblock 100 4 100 minecraft:air'));
  console.log('summon golem ->', await rcon.cmd('summon minecraft:iron_golem 104.5 4 100.5 {CustomName:"W1Golem",NoAI:1b,PersistenceRequired:1b}'));
  await sleep(1500);
  console.log('testfor golem ->', await rcon.cmd('testfor @e[type=iron_golem]'));
  console.log('summon cow ->', await rcon.cmd('summon minecraft:cow 106.5 4 100.5'));
  await sleep(1200);
  console.log('testfor cow ->', await rcon.cmd('testfor @e[type=cow]'));
  console.log('summon arrow ->', await rcon.cmd('summon etim:metal_arrow 103.5 5.2 100.5 {CustomName:"T1",Motion:[1.0,0.0,0.0],arrow_item_id:"etim:arrow_copper"}'));
  await sleep(1200);
  console.log('testfor arrow ->', await rcon.cmd('testfor @e[type=etim:metal_arrow]'));
  console.log('entitydata ->', await rcon.cmd('entitydata @e[name=T1] {Motion:[1.1,0.0,0.0]}'));
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
