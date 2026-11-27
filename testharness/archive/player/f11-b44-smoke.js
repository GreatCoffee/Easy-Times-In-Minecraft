// B-44 smoke — R196 mining ooze (:90): forced entity window + 1% spawn chain.
// No client rendering; server log evidence only.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const BASE = { x: -60, y: 120, z: 240 };
const EXPECTED_SHA = '20133603061147B4A1DD411A83A2675685C6FDBC9850435016173B1FE3E89B19'; // b44-build1
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const ok = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 239
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 239
    && mk.manifest.mixins === 100 && mk.manifest.client === 10;
  console.log(`[PIN] sha=${sha} expected=${EXPECTED_SHA} shaOk=${sha === EXPECTED_SHA} ` +
    `mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},dual:${mk.refmapTmp.dual},` +
    `mixins:${mk.manifest.mixins},client:${mk.manifest.client}} ok=${ok}`);
  return { sha, ok: ok && sha === EXPECTED_SHA };
}

async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  // W2 uses the full predicate chain with a deterministic roll; product default stays 0.01.
  let cfg = cfgBefore;
  if (/miningOozeChance/.test(cfg)) {
    cfg = cfg.replace(/miningOozeChance\s*=\s*[0-9.]+/, 'miningOozeChance=1.0');
  } else {
    cfg = cfg.replace(/(\r?\n)(\s*)B:miningReform=true/,
      '$1$2B:miningReform=true$1$2F:miningOozeChance=1.0');
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 480000)) return;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function stage() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops true', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await L.tp(srv, BASE.x + 0.5, BASE.y, BASE.z + 8.5);
  await sleep(400);
}

async function cube() {
  await cmd('fill -62 120 236 -58 124 240 minecraft:stone', 500);
}

async function oozeExists() {
  await cmd('setblock -70 130 240 minecraft:air', 200);
  await cmd('execute @e[type=etim:ooze] ~ ~ ~ setblock -70 130 240 minecraft:redstone_block', 400);
  return (await L.testBlock(srv, -70, 130, 240, 'minecraft:redstone_block')).ok;
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b44-${RUN}`, `w-b44s-${RUN}`);
  await stage();

  const w0lines = srv.all;
  const recipes = has(w0lines, /\[TestLog\] gear recipes registered: 37 batch rows ok/);
  const mixinFail = w0lines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W1 forced spawn: exact R196 spawn call, entity must exist.
  const w1from = srv.all.length;
  await cmd(`etest ooze ${BASE.x} 122 240`, 600);
  await sleep(600);
  const w1lines = slice(w1from);
  const w1spawn = has(w1lines, /\[OozeLog\] spawn source=test/);
  const w1entity = await oozeExists();
  await cmd('kill @e[type=etim:ooze]', 400);

  // W2 full mining chain with chance forced to 1.0 (predicate + neighbour + spawn).
  let w2 = false, w2tries = 0;
  const w2from = srv.all.length;
  for (let i = 0; i < 48 && !w2; i++) {
    w2tries++;
    await cube();
    await cmd(`etest harvest ${BASE.x} 122 240 ${A}`, 500);
    await sleep(300);
    w2 = has(slice(w2from), /\[OozeLog\] spawn source=mining/);
    if (!w2) await cmd('kill @e[type=etim:ooze]', 200);
  }
  const w2lines = slice(w2from);
  const rolls = w2lines.filter(s => /\[OozeLog\] roll /.test(s)).length;
  const w2entity = w2 ? await oozeExists() : false;
  await cmd('kill @e[type=etim:ooze]', 300);

  // W3 negative: a non-tool block must not even roll.
  await cmd('setblock -64 120 240 minecraft:dirt', 250);
  const w3from = srv.all.length;
  await cmd(`etest harvest -64 120 240 ${A}`, 400);
  await sleep(300);
  const w3rolls = slice(w3from).filter(s => /\[OozeLog\] roll /.test(s)).length;
  const w3air = (await L.testBlock(srv, -64, 120, 240, 'minecraft:air')).ok;

  // W4 entity window: the forced/spawned ooze exists and accepts the NBT audit.
  const w4from = srv.all.length;
  await cmd(`summon etim:ooze ${BASE.x} 122 ${BASE.z + 2} {Size:0,NoAI:1b}`, 500);
  await sleep(400);
  const w4 = await oozeExists();
  const w4lines = slice(w4from);
  await cmd('kill @e[type=etim:ooze]', 300);

  const pass = pin.ok && recipes && mixinFail === 0 && w1spawn && w1entity && w2 && w2entity
    && w3rolls === 0 && w4;
  console.log('[W0]', JSON.stringify({ recipes, mixinFail }));
  console.log('[W1]', JSON.stringify({ spawn: w1spawn, entity: w1entity }));
  console.log('[W2]', JSON.stringify({ spawn: w2, tries: w2tries, rolls, entity: w2entity }));
  console.log('[W3]', JSON.stringify({ rolls: w3rolls, air: w3air }));
  console.log('[W4]', JSON.stringify({ entity: w4 }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
