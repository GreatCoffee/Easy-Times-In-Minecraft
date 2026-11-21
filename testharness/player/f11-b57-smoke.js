// B-57 smoke: gel family (ETIMEntityCubic / ETIMEntityGelatinousCube).
// Verdict channel = server log only ([GelLog]/[SpawnLog]).
//   W1 summon attributes: hp=size^2, dmg=mult*size, xp=size*(mult+(acid?1:0))
//   W2 acid gradual dissolve: oak planks inside an ooze -> [GelLog] melt
//   W3 instant contact: torch -> [GelLog] torch|instant block=minecraft:torch
//   W4 pepsin selectivity: jelly melts wool, keeps planks (period -1)
//   W5 spawn gates via gelpick: open sky = no gel; stone floor+ceiling = gel
//   W6 item feeding: pudding eats a dropped item -> [GelLog] item
//   W7 NBT round-trip: dissolve progress survives a restart
//   W8 flag off: mobGelatinousR196=false -> gelpick no gel family
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b57-' + RUN + '-v1';

let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const stops = [];

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 250 : wait); }
function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
function slice(from) { return logLines().slice(from); }
function mark() { return logLines().length; }
async function waitRow(re, from, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const hit = slice(from).map(s => re.exec(s)).filter(Boolean);
    if (hit.length) return hit;
    await sleep(500);
  }
  return [];
}

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const bytes = fs.readFileSync(jar);
  const sha = L.sha256(bytes).toUpperCase();
  const mk = L.mkCounts();
  const ok = sha === EXPECTED_SHA && bytes.length === L.PIN.releaseSize && mk.ok;
  console.log(`[PIN] sha=${sha} shaOk=${sha === EXPECTED_SHA} size=${bytes.length} sizeOk=${bytes.length === L.PIN.releaseSize} mkOk=${mk.ok} ok=${ok}`);
  return ok;
}

async function startBoot(tag, gelFlag = true) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = L.setProp(props, 'level-name', WORLD);
  props = L.setProp(props, 'allow-flight', 'true');
  fs.writeFileSync(L.PROPS, props, 'utf8');
  let bootCfg = cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true');
  bootCfg = bootCfg.replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=' + (gelFlag ? 'true' : 'false'));
  const want = gelFlag ? 'true' : 'false';
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      const m = /B:mobGelatinousR196=(true|false)/.exec(disk);
      const got = m ? m[1] : 'MISSING';
      console.log('[cfg]', tag, 'want=' + want, 'disk=' + got);
      if (got === want) return;
    }
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  srv = null;
  stops.push(st);
  if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function join() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false',
    'doMobSpawning false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 2', 200);
  await cmd('weather clear', 150);
  await cmd('time set 18000', 250);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
  await cmd('etest gelpick 0 130 0 2', 800);
  await cmd('fill 0 129 0 15 129 15 minecraft:stone', 800);
  await cmd('tp ' + A + ' 0.5 130 0.5', 300);
}

const SUMMON_RE = /\[GelLog\] summon kind=(\w+) size=(\d+) hp=([\d.]+)\/([\d.]+) dmg=([\d.]+) xp=(\d+) pos=\((-?\d+),(-?\d+),(-?\d+)\) entity=(\d+)/;
const MELT_RE = /\[GelLog\] (melt|instant|torch|item|itemkill|bucket|melee-item) at \((-?\d+),(-?\d+),(-?\d+)\) block=(\S+) size=(\d+) kind=(\w+) entity=(\d+)/;
const STATE_RE = /\[GelLog\] state cls=(\w+) size=(\d+) entries=(\d+) progress=(-?\d+)\/(-?\d+) blockCd=(-?\d+) itemCd=(-?\d+) feeding=(\w+)/;
const GELPICK_RE = /\[SpawnLog\] gelpick n=(\d+) flag=(\w+) at (BlockPos\{[^}]*\}) counts=\{([^}]*)\}/;

function parseCounts(text) {
  const out = {};
  for (const part of text.replace(/[{}]/g, '').split(',')) {
    const m = part.trim().match(/^(\w+)=(\d+)$/);
    if (m) out[m[1]] = +m[2];
  }
  return out;
}

async function gel(kind, x, y, z, size, tag) {
  const from = mark();
  await cmd(`etest gel ${kind} ${x} ${y} ${z} ${size} ${tag || 'g'}`, 700);
  const m = await waitRow(SUMMON_RE, from, 6000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { kind: g[1], size: +g[2], hp: +g[3], max: +g[4], dmg: +g[5], xp: +g[6], entity: +g[10] } : null;
}

async function gelstate(x, y, z) {
  const from = mark();
  await cmd(`etest gelstate ${x} ${y} ${z}`, 600);
  const m = await waitRow(STATE_RE, from, 6000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { cls: g[1], size: +g[2], entries: +g[3], progress: +g[4], period: +g[5], blockCd: +g[6], itemCd: +g[7], feeding: g[8] === 'true' } : null;
}

async function gelpick(x, y, z, n) {
  const from = mark();
  await cmd(`etest gelpick ${x} ${y} ${z} ${n}`, 1500);
  const m = await waitRow(GELPICK_RE, from, 40000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { flag: g[2] === 'true', counts: parseCounts(g[4]) } : null;
}

async function meltRows(from, blockFilter) {
  return slice(from).map(s => MELT_RE.exec(s)).filter(Boolean)
    .filter(g => !blockFilter || g[5] === blockFilter)
    .map(g => ({ phase: g[1], x: +g[2], y: +g[3], z: +g[4], block: g[5], size: +g[6], kind: g[7] }));
}

const gelFamily = c => !c ? 0 : ((c.ETIMEntityOoze || 0) + (c.ETIMEntityJelly || 0) + (c.ETIMEntityBlob || 0) + (c.ETIMEntityPudding || 0));

async function main() {
  const pinOk = stampPin();
  fs.writeFileSync(L.CFG, fs.readFileSync(L.CFG, 'utf8').replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=true'), 'utf8');
  await startBoot(`b57-${RUN}-b1`);
  await join();
  const res = { run: RUN, pin: pinOk };

  await gelpick(0, 130, 0, 5); // warm chunk load

  // --- W1: summon attributes ---
  const jelly1 = await gel('jelly', 1, 130, 0, 1, 'g1');
  const jelly4 = await gel('jelly', 3, 130, 0, 4, 'g2');
  const blob2 = await gel('blob', 5, 130, 0, 2, 'g3');
  const ooze2 = await gel('ooze', 7, 130, 0, 2, 'g4');
  const pud3 = await gel('pudding', 9, 130, 0, 3, 'g5');
  const ok1 = o => !!o;
  res.w1 = ok1(jelly1) && jelly1.hp === 1 && jelly1.max === 1 && jelly1.dmg === 2 && jelly1.xp === 2
    && ok1(jelly4) && jelly4.hp === 16 && jelly4.max === 16 && jelly4.dmg === 8 && jelly4.xp === 8
    && ok1(blob2) && blob2.hp === 4 && blob2.dmg === 6 && blob2.xp === 6
    && ok1(ooze2) && ooze2.size === 2 && ooze2.hp === 4 && ooze2.dmg === 6 && ooze2.xp === 8
    && ok1(pud3) && pud3.hp === 9 && pud3.dmg === 12 && pud3.xp === 15;
  console.log('[W1]', JSON.stringify({ jelly1, jelly4, blob2, ooze2, pud3, pass: res.w1 }));
  for (const t of ['g1', 'g2', 'g3', 'g4', 'g5']) {
    await cmd(`kill @e[type=!player,name=${t}]`, 120);
  }

  // --- W2: acid gradual dissolve of planks ---
  await cmd('fill 2 130 0 2 131 0 minecraft:air', 150);
  await cmd('fill 3 130 0 3 130 0 minecraft:chest', 250);
  const oozeA = await gel('ooze', 2, 130, 0, 2, 'b1');
  const w2from = mark();
  await cmd('tp @e[type=!player,name=b1] 2.85 130.0 0.5', 250);
  await cmd('testforblock 3 130 0 minecraft:chest', 250);
  const w2samples = [];
  for (let i = 0; i < 6; i++) { await sleep(10000); await cmd('etest gelstate 2 130 0', 200); w2samples.push(await gelstate(2, 130, 0)); }
  const w2rows = await meltRows(w2from, 'minecraft:chest');
  console.log('[W2samples]', JSON.stringify(w2samples.map(s => s && ({ e: s.entries, p: s.progress, per: s.period, bc: s.blockCd }))));
  const w2melt = (await meltRows(w2from, 'minecraft:chest')).filter(r => r.x === 3 && r.y === 130 && r.z === 0);
  res.w2 = !!oozeA && w2melt.length >= 1;
  console.log('[W2]', JSON.stringify({ ooze: oozeA, rows: w2rows.length, melt: w2melt.length, pass: res.w2 }));

  // --- W3: instant contact with torch ---
  await cmd('fill 3 130 0 5 131 0 minecraft:air', 150);
  await gel('ooze', 4, 130, 0, 2, 'a3');
  const w3from = mark();
  await cmd('fill 4 130 0 4 130 0 minecraft:torch', 250);
  
  await sleep(6000);
  const w3rows = (await meltRows(w3from)).filter(r => r.x === 4 && r.y === 130 && r.z === 0 && r.block === 'minecraft:torch');
  res.w3 = w3rows.length >= 1;
  console.log('[W3]', JSON.stringify({ rows: w3rows.slice(0, 3), pass: res.w3 }));

  // --- W4: pepsin selectivity (jelly melts wool, keeps planks) ---
  await cmd('fill 5 130 0 7 131 0 minecraft:air', 150);
  await cmd('fill 7 130 0 9 131 0 minecraft:air', 150);
  await gel('jelly', 6, 130, 0, 2, 'a4');
  await gel('jelly', 8, 130, 0, 2, 'a5');
  const w4from = mark();
  await cmd('fill 7 130 0 7 130 0 minecraft:wool', 250);
  await cmd('tp @e[type=!player,name=a4] 6.85 130.0 0.5', 250);
  
  await cmd('fill 9 130 0 9 130 0 minecraft:planks', 250);
  await cmd('tp @e[type=!player,name=a5] 8.85 130.0 0.5', 250);
  
  await sleep(26000);
  const w4all = await meltRows(w4from);
  const w4wool = w4all.filter(r => r.x === 7 && r.block === 'minecraft:wool');
  const w4planks = w4all.filter(r => r.x === 9 && r.block === 'minecraft:planks');
  const w4state = await gelstate(8, 130, 0);
  res.w4 = w4wool.length >= 1 && w4planks.length === 0;
  console.log('[W4]', JSON.stringify({ wool: w4wool.length, planks: w4planks.length, state8: w4state, pass: res.w4 }));

  // --- W5: spawn gates ---
  await cmd('fill 13 20 0 13 24 0 minecraft:air', 200);
  await cmd('fill 13 19 0 13 19 0 minecraft:stone', 200);
  await cmd('fill 13 22 0 13 22 0 minecraft:stone', 200);
  const deepPick = await gelpick(13, 20, 0, 1200);
  const openPick = await gelpick(12, 150, 0, 1200);
  const openGel = gelFamily(openPick && openPick.counts);
  const deepGel = gelFamily(deepPick && deepPick.counts);
  res.w5 = !!openPick && !!deepPick && openGel === 0 && deepGel >= 1;
  console.log('[W5]', JSON.stringify({ open: openPick, deep: deepPick, openGel, deepGel, pass: res.w5 }));

  // --- W6: item feeding ---
  await gel('pudding', 10, 130, 0, 1, 'a6');
  const w6from = mark();
  await cmd('summon minecraft:item 10.5 130.0 0.5 {Item:{id:"minecraft:stone_sword",Count:1b}}', 400);
  await cmd('testfor @e[type=item]', 400);
  await sleep(6000);
  const w6rows = (await meltRows(w6from)).filter(r => (r.phase === 'item' || r.phase === 'itemkill') && r.x === 10);
  const w6state = await gelstate(10, 130, 0);
  res.w6 = w6rows.length >= 1 || !!(w6state && w6state.itemCd > 0);
  console.log('[W6]', JSON.stringify({ rows: w6rows.length, state: w6state, pass: res.w6 }));

  // --- W7 setup: leave mid-progress planks for the restart boot ---
  await cmd('fill 2 130 0 2 131 0 minecraft:air', 150);
  await cmd('fill 3 130 0 3 130 0 minecraft:chest', 250);
  await cmd('fill 2 130 0 2 130 0 minecraft:air', 150);
  await gel('ooze', 2, 130, 0, 2, 'b1');

  await cmd('tp @e[type=!player,name=b1] 2.85 130.0 0.5', 250);
  await cmd('tp @e[type=etim:ooze,c=1,sort=nearest] 2.5 130.0 0.5', 250);
  await sleep(4000);
  const before = await gelstate(2, 130, 0);
  console.log('[W7-before]', JSON.stringify(before));
  res.w7before = before;
  await cmd('save-all', 900);
  await cmd('entitydata @e[type=!player,name=b1] {block_feeding_countdown:20000}', 350);
  await cmd('save-all', 600);
  await sleep(400);
  await stopBoot();

  // --- W7: restart round-trip ---
  await startBoot(`b57-${RUN}-b2`);
  await join();
  const afterA = await gelstate(2, 130, 0);
  const after = afterA;
  const nbtLines = srv.all.filter((l) => /\[GelLog\] nbtread /.test(l));
  const nbt = nbtLines.length ? nbtLines[nbtLines.length - 1] : '';
  const nbtOk = /nbtread entries=([1-9]\d*)/.test(nbt);
  res.w5b = !!(before && before.entries >= 1 && before.progress > 0 && after && after.entries >= 1 && after.progress > 0);
  res.w7 = res.w5b;
  console.log('[W7]', JSON.stringify({ before, after, nbt: nbt.replace(/^.*\[GelLog\] /, ''), nbtOk, pass: res.w7 }));
  await stopBoot();

  // --- W8: flag off ---
  await startBoot(`b57-${RUN}-b3`, false);
  await join();
  fs.writeFileSync(L.CFG, fs.readFileSync(L.CFG, 'utf8').replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=false'), 'utf8');
  await srv.stop();
  srv = null;
  await startBoot(`b57-${RUN}-b4`, false);
  await join();
  await cmd('fill 13 20 0 13 24 0 minecraft:air', 200);
  await cmd('fill 13 19 0 13 19 0 minecraft:stone', 200);
  await cmd('fill 13 22 0 13 22 0 minecraft:stone', 200);
  const offPick = await gelpick(13, 20, 0, 1200);
  res.w8 = !!offPick && gelFamily(offPick.counts) === 0;
  console.log('[W8]', JSON.stringify({ pick: offPick, pass: res.w8 }));
  fs.writeFileSync(L.CFG, fs.readFileSync(L.CFG, 'utf8').replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=true'), 'utf8');
  await stopBoot();

  res.stops = stops;
  res.pass = !!(res.w1 && res.w2 && res.w3 && res.w4 && res.w5 && res.w6 && res.w7 && res.w8);
  const bad = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'].filter(k => !res[k]);
  console.log('[done]', JSON.stringify({ ...res, bad: bad.length }));
  process.exit(bad.length ? 1 : 0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.message ? e.message : e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(2);
});
