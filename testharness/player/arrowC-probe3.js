const net = require('net');
const { execFileSync } = require('child_process');
const path = require('path');
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
  await rcon.cmd('tp ETIM_Harn01 100.5 4 60.5');
  await sleep(2000);
  for (const c of [
    'summon minecraft:skeleton 102.5 4 60.5 {CustomName:"HPTest1",NoAI:1b}',
    'summon minecraft:villager 104.5 4 60.5 {CustomName:"HPTest2",NoAI:1b}',
    'summon minecraft:cow 106.5 4 60.5 {CustomName:"HPTest3",NoAI:1b}',
    'summon minecraft:skeleton 108.5 4 60.5 {CustomName:"HPTest4",NoAI:1b}',
  ]) console.log('P ' + c.slice(0, 40) + ' -> ' + await rcon.cmd(c));
  await sleep(1500);
  await rcon.cmd('save-all');
  await sleep(2500);
  const raw = execFileSync(process.execPath, [path.join(__dirname, 'arrowB-nbt.js'), 'rect', 'arrowc1', 'overworld', '98', '58', '110', '62'], { encoding: 'utf8' }).trim();
  const list = JSON.parse(raw.split('\n').pop());
  list.filter((e) => /HPTest/.test(String(e.CustomName))).forEach((e) =>
    console.log('R ' + e.id + ' ' + e.CustomName + ' HP=' + e.Health + ' Pos=' + JSON.stringify(e.Pos)));
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
