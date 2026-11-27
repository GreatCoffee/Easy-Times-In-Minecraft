// B-56 smoke: audit debts #2 (WoodSpider structure gate) and #3 (R196
// isBlockSolidStandardFormCube headroom predicate).
// Verdict channel = server log only.
//   W1 blockcube: stone/glass -> true, slab/snow_layer -> false
//   W2 wspick at an open column: no WoodSpider, woodspider-gate reject rows
//   W3 wspick inside a built wood+leaf structure: WoodSpider accepted
//   W4 natural arm: night spawn pass around the structure accepts WoodSpider
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b56-' + RUN + '-v1';

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

async function startBoot(tag) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = L.setProp(props, 'level-name', WORLD);
  props = L.setProp(props, 'allow-flight', 'true');
  fs.writeFileSync(L.PROPS, props, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true'), 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) return;
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
    'doMobSpawning true']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 2', 200);
  await cmd('weather clear', 150);
  await cmd('time set 18000', 250);
  await cmd('tp ' + A + ' 0.5 121 0.5', 600);
}

const BLOCKCUBE_RE = /\[BlockLog\] solidcube at BlockPos\{[^}]*\} block=(\S+) fullCube=(\w+) moves=(\w+) result=(\w+)/;
const WSPICK_RE = /\[SpawnLog\] wspick n=(\d+) at (BlockPos\{[^}]*\}) counts=\{([^}]*)\}/;
const WS_REJECT_RE = /\[SpawnLog\] woodspider-gate reject sky=(\w+) leafAbove=(\w+) logAbove=(\w+) woodNear=(\w+) leafNear=(\w+)/;
const ACCEPT_RE = /\[SpawnLog\] accept .*ETIMEntityWoodSpider/;

function parseCounts(text) {
  const out = {};
  for (const part of text.replace(/[{}]/g, '').split(',')) {
    const m = part.trim().match(/^(\w+)=(\d+)$/);
    if (m) out[m[1]] = +m[2];
  }
  return out;
}

async function blockcube(x, y, z) {
  const from = mark();
  await cmd(`etest blockcube ${x} ${y} ${z}`, 600);
  const m = await waitRow(BLOCKCUBE_RE, from, 5000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { block: g[1], fullCube: g[2], moves: g[3], result: g[4] === 'true' } : null;
}

async function wspick(x, y, z, n) {
  const from = mark();
  await cmd(`etest wspick ${x} ${y} ${z} ${n}`, 1200);
  const m = await waitRow(WSPICK_RE, from, 30000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { counts: parseCounts(g[3]) } : null;
}

async function main() {
  const pinOk = stampPin();
  await startBoot(`b56-${RUN}-b1`);
  await join();
  const res = { run: RUN, pin: pinOk };

  // --- W1: headroom predicate ---
  await wspick(0, 120, 0, 5);
  await cmd('fill 10 121 0 10 121 0 minecraft:stone', 200);
  await cmd('fill 11 121 0 11 121 0 minecraft:glass', 200);
  await cmd('fill 12 121 0 12 121 0 minecraft:stone_slab', 200);
  await cmd('fill 13 120 0 13 120 0 minecraft:stone', 200);
  await cmd('fill 13 121 0 13 121 0 minecraft:snow_layer', 200);
  await cmd('fill 14 121 0 14 121 0 minecraft:glass_pane', 200);
  const stone = await blockcube(10, 121, 0);
  const glass = await blockcube(11, 121, 0);
  const slab = await blockcube(12, 121, 0);
  const snow = await blockcube(13, 121, 0);
  const pane = await blockcube(14, 121, 0);
  const blk = (o, id) => !!o && o.block === id;
  res.w1 = blk(stone, 'minecraft:stone') && stone.result && blk(glass, 'minecraft:glass') && glass.result
    && blk(slab, 'minecraft:stone_slab') && !slab.result && blk(snow, 'minecraft:snow_layer') && !snow.result
    && blk(pane, 'minecraft:glass_pane') && !pane.result;
  console.log('[W1]', JSON.stringify({ stone, glass, slab, snow, pane, pass: res.w1 }));

  // --- W2: open column -> no wood spider, gate reject rows ---
  await cmd('fill 0 119 0 0 119 0 minecraft:grass', 200);
  let from = mark();
  const open = await wspick(0, 120, 0, 300);
  const rejects = slice(from).map(s => WS_REJECT_RE.exec(s)).filter(Boolean);
  res.w2 = !!open && (open.counts.ETIMEntityWoodSpider || 0) === 0 && rejects.length >= 1;
  console.log('[W2]', JSON.stringify({ counts: open && open.counts, rejects: rejects.length,
    last: rejects.length ? rejects[rejects.length - 1].slice(1) : null, pass: res.w2 }));

  // --- W3: built wood+leaf structure -> accepted ---
  await cmd('fill -19 119 -19 -7 119 -7 minecraft:grass', 400);
  await cmd('fill -19 120 -19 -7 127 -7 minecraft:air', 400);
  await cmd('fill -10 120 -10 -10 122 -10 minecraft:log', 300);
  await cmd('fill -16 125 -16 -6 126 -6 minecraft:leaves', 500);
  from = mark();
  const forest = await wspick(-11, 120, -11, 400);
  const acc = slice(from).map(s => WS_REJECT_RE.exec(s)).filter(Boolean);
  res.w3 = !!forest && (forest.counts.ETIMEntityWoodSpider || 0) > 0;
  console.log('[W3]', JSON.stringify({ counts: forest && forest.counts, rejects: acc.length, pass: res.w3 }));

  // --- W4: natural spawn arm ---
  await cmd(`tp ${A} -11.5 120 -11.5`, 600);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 500);
  from = mark();
  let naturals = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    await sleep(5000);
    naturals = slice(from).map(s => ACCEPT_RE.exec(s)).filter(Boolean);
    if (naturals.length >= 2) break;
  }
  res.w4 = naturals.length >= 1;
  console.log('[W4]', JSON.stringify({ naturals: naturals.length, pass: res.w4 }));

  res.stops = stops;
  res.pass = res.w1 && res.w2 && res.w3 && res.w4 && pinOk && stops.every(s => s.exitCode === 0 && s.exited);
  res.bad = ['w1', 'w2', 'w3', 'w4'].filter(k => !res[k]).length + (pinOk ? 0 : 1);
  await stopBoot();
  res.stops = stops;
  res.pass = res.w1 && res.w2 && res.w3 && res.w4 && pinOk && stops.every(s => s.exitCode === 0 && s.exited);
  res.bad = ['w1', 'w2', 'w3', 'w4'].filter(k => !res[k]).length + (pinOk ? 0 : 1);
  console.log('[done]', JSON.stringify(res));
}

main().then(() => process.exit(0)).catch(e => { console.error('[fatal]', e && e.stack || e); process.exit(1); });
