// B-67 smoke: R196 explosion + block drop faces (census F :100-:104, :108-:113).
// Verdict channel = server log ([DropLog] / [ExplosionLog] / [BoomLog]).
//   W1 rewrite table: stone->cobblestone, cobble->gravel, brick->brick, coal->coal x9,
//      lapis->dye x9, planks->stick, wool->string, netherrack/glass -> nothing, dirt->dirt
//   W2 chance column: brick 1.5, coal/lapis 0.5 (R196 Block.java:1882-1918)
//   W3 drop spawn: delay=10 and position inside the block's selected box x0.5
//   W4 double radius: entitySize 4 hits a zombie for >0 and spooks a nearby cow
//   W5 flaming exploder: netherspawn ignition places fire
//   W6 static: cfg keys, mixin registration, helper classes
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b67-' + RUN + '-v1';

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
    await sleep(400);
  }
  return [];
}
function lastOf(rows) { return rows.length ? rows[rows.length - 1] : null; }

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
  let bootCfg = cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true');
  bootCfg = bootCfg.replace(/B:explosionR196=(true|false)/, 'B:explosionR196=true');
  bootCfg = bootCfg.replace(/B:dropR196=(true|false)/, 'B:dropR196=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'explosionR196=' + (/B:explosionR196=(true|false)/.exec(disk) || [])[1],
        'dropR196=' + (/B:dropR196=(true|false)/.exec(disk) || [])[1]);
      return;
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
  for (const g of ['doMobLoot false', 'doTileDrops true', 'doDaylightCycle false',
    'doFireTick true', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false',
    'doMobSpawning false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 2', 200);
  await cmd('weather clear', 150);
  await cmd('time set 6000', 250);
  await cmd('tp ' + A + ' 0.5 130 0.5', 2000);
  await cmd('fill 0 129 0 31 129 31 minecraft:stone', 900);
  await cmd('fill 0 130 0 31 133 31 minecraft:air', 500);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
}

const DROP_RE = /\[DropLog\] boomdrop block=(\S+) drop=(\S+) count=(\d+) chance=([\d.]+) x=(-?\d+) y=(-?\d+) z=(-?\d+)/;
const XP_RE = /\[DropLog\] xpcheck block=(\S+) base=(\d+) drops=(\d+) xp=(\d+) exempt=(true|false)/;
const SPAWN_RE = /\[DropLog\] spawn block=(\S+) item=(\S+) delay=(\d+) x=([-\d.]+) y=([-\d.]+) z=([-\d.]+)/;
const BOOMDROPSCMD_RE = /\[BoomLog\] boomdrops placed=(\d+)/;
const DMG_RE = /\[ExplosionLog\] dmg entity=(\S+) dist=([\d.]+) eff=([\d.]+) density=([\d.]+) damage=([\d.]+) sizef=([\d.]+)/;
const SPOOK_RE = /\[ExplosionLog\] spook entity=(\S+) until=(\d+)/;
const BOOMFIRE_RE = /\[BoomLog\] boomfire fire=(\d+)/;

async function main() {
  const pinOk = stampPin();
  await startBoot(`b67-${RUN}-b1`);
  await join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 explosion rewrite table ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest boomdrops`, 1500);
  const dropRows = await waitRow(DROP_RE, from, 12000);
  const placed = lastOf(await waitRow(BOOMDROPSCMD_RE, from, 8000));
  const spawns = await waitRow(SPAWN_RE, from, 12000);
  const byBlock = new Map();
  for (const r of dropRows) {
    if (!byBlock.has(r[1])) byBlock.set(r[1], []);
    byBlock.get(r[1]).push(r);
  }
  const dropOf = b => (byBlock.get(b) || []).map(r => r[2]);
  const countOf = b => (byBlock.get(b) || []).reduce((a, r) => a + (+r[3]), 0);
  const has = (b, item) => dropOf(b).indexOf(item) >= 0;
  res.w1 = !!placed && +placed[1] === 10
    && has('minecraft:stone', 'minecraft:cobblestone')
    && has('minecraft:cobblestone', 'minecraft:gravel')
    && has('minecraft:brick_block', 'minecraft:brick')
    && has('minecraft:coal_block', 'minecraft:coal') && countOf('minecraft:coal_block') >= 1
    && countOf('minecraft:coal_block') <= 9
    && has('minecraft:lapis_block', 'minecraft:dye') && countOf('minecraft:lapis_block') >= 1
    && countOf('minecraft:lapis_block') <= 9
    && has('minecraft:planks', 'minecraft:stick')
    && has('minecraft:wool', 'minecraft:string')
    && dropOf('minecraft:netherrack').length === 0
    && dropOf('minecraft:glass').length === 0
    && has('minecraft:dirt', 'minecraft:dirt');
  console.log('[W1]', JSON.stringify({
    placed: placed && +placed[1],
    stone: dropOf('minecraft:stone'), cobble: dropOf('minecraft:cobblestone'),
    brick: dropOf('minecraft:brick_block'),
    coal: countOf('minecraft:coal_block'), lapis: countOf('minecraft:lapis_block'),
    planks: dropOf('minecraft:planks'), wool: dropOf('minecraft:wool'),
    netherrack: dropOf('minecraft:netherrack'), glass: dropOf('minecraft:glass'),
    dirt: dropOf('minecraft:dirt'), pass: res.w1,
  }));

  // ---- W2 table chance column ----
  const brickRow = lastOf(byBlock.get('minecraft:brick_block') || []);
  const coalRow = lastOf(byBlock.get('minecraft:coal_block') || []);
  const lapisRow = lastOf(byBlock.get('minecraft:lapis_block') || []);
  const xpRows = await waitRow(XP_RE, from, 4000);
  const xpMap = new Map(xpRows.map(r => [r[1], r]));
  const lapisXp = xpMap.get('minecraft:lapis_block');
  const stoneXp = xpMap.get('minecraft:stone');
  res.w2 = !!brickRow && Math.abs(+brickRow[4] - 1.5) < 0.001
    && !!coalRow && Math.abs(+coalRow[4] - 0.5) < 0.001
    && !!lapisRow && Math.abs(+lapisRow[4] - 0.5) < 0.001
    && !!lapisXp && lapisXp[5] === 'true' && +lapisXp[4] === 0
    && !!stoneXp && stoneXp[5] === 'false' && +stoneXp[4] === +stoneXp[2] * +stoneXp[3];
  console.log('[W2]', JSON.stringify({
    brickChance: brickRow && +brickRow[4],
    lapisXp: lapisXp && { xp: +lapisXp[4], exempt: lapisXp[5] },
    stoneXp: stoneXp && { base: +stoneXp[2], drops: +stoneXp[3], xp: +stoneXp[4] },
    coalChance: coalRow && +coalRow[4],
    lapisChance: lapisRow && +lapisRow[4], pass: res.w2,
  }));

  // ---- W3 spawn delay + selected-box x0.5 position ----
  let delayOk = spawns.length > 0;
  let posOk = spawns.length > 0;
  for (const s of spawns) {
    if (+s[3] !== 10) delayOk = false;
    // full blocks: box 0..1 scaled 0.5 around the centre -> 0.25..0.75
    const dx = +s[4] - Math.floor(+s[4]);
    const dz = +s[6] - Math.floor(+s[6]);
    if (dx < 0.24 || dx > 0.76 || dz < 0.24 || dz > 0.76) posOk = false;
  }
  res.w3 = delayOk && posOk;
  console.log('[W3]', JSON.stringify({ spawns: spawns.length, delayOk, posOk, pass: res.w3 }));

  // ---- W4 double radius damage + livestock spook ----
  await cmd('summon minecraft:zombie 4.5 130 0.5 {NoAI:1b}', 400);
  await cmd('summon minecraft:cow 4.5 130 2.5 {NoAI:1b}', 400);
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest boom 2 4 0`, 1500);
  const dmg = lastOf(await waitRow(DMG_RE, from, 10000));
  const spook = lastOf(await waitRow(SPOOK_RE, from, 10000));
  res.w4 = !!dmg && +dmg[5] > 0 && Math.abs(+dmg[6] - 4) < 0.01 && !!spook;
  console.log('[W4]', JSON.stringify({
    damage: dmg && +dmg[5], sizef: dmg && +dmg[6], spook: !!spook, pass: res.w4,
  }));

  // ---- W5 flaming exploder ignition ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest boomfire`, 1500);
  const fire = lastOf(await waitRow(BOOMFIRE_RE, from, 10000));
  res.w5 = !!fire && +fire[1] > 0;
  console.log('[W5]', JSON.stringify({ fire: fire && +fire[1], pass: res.w5 }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean explosionR196 = true;/.test(cfg)
    && /public static boolean dropR196 = true;/.test(cfg)
    && /getBoolean\("explosionR196"/.test(cfg)
    && /getBoolean\("dropR196"/.test(cfg);
  const json = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8');
  const mixOk = /"MixinExplosion"/.test(json)
    && fs.existsSync(path.join(root, 'mixins', 'MixinExplosion.java'));
  const helpOk = fs.existsSync(path.join(root, 'world', 'ETIMExplosion.java'))
    && fs.existsSync(path.join(root, 'world', 'ETIMExplosionDuck.java'))
    && fs.existsSync(path.join(root, 'item', 'ETIMBlockDrops.java'));
  res.w6 = cfgOk && mixOk && helpOk;
  console.log('[W6]', JSON.stringify({ cfgOk, mixOk, helpOk, pass: res.w6 }));

  await stopBoot();
  const bad = Object.keys(res).filter(k => !res[k]);
  const out = {
    run: RUN, pin: pinOk, w1: res.w1, w2: res.w2, w3: res.w3, w4: res.w4, w5: res.w5, w6: res.w6,
    stops: stops.map(s => (s && s.exitCode === 0) ? 0 : 1).reduce((a, b) => a + b, 0),
    crashes: L.crashCount(), pass: pinOk && bad.length === 0, bad: bad.length, badKeys: bad,
  };
  console.log('[done] ' + JSON.stringify(out));
  process.exit(out.pass && out.stops === 0 ? 0 : 2);
}

main().catch(async (e) => {
  console.error('[fatal]', (e && e.stack) || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
