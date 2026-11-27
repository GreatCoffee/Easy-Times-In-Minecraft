// B-52 smoke — R196 ooze natural spawn (census D :282).
// The ooze gate is: overworld y<=32, stone floor, stone ceiling (blockTypeIsAbove).
// Each arm builds a controlled 3x3 cell and asks /etest spawnpick for 2000 picks.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '59F9AF83F6A95FE29293FB1CCC8CE41E11729903EF96C76DC6E9A3C2B6C956F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function slice(from) { return srv.all.slice(from); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const ok = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 242
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 242
    && mk.manifest.mixins === 101 && mk.manifest.client === 10;
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
  let cfg = cfgBefore;
  if (/B:mobDebugLog\s*=/.test(cfg)) {
    cfg = cfg.replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true');
  } else {
    cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
      '$1$2B:metalAnvilRepair=true$1$2B:mobDebugLog=true');
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
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
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
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doMobSpawning false', 'doMobLoot true', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 250);
  await cmd('time set 18000', 200);
  await cmd('tp ' + A + ' -50.5 120 240.5', 400);
  await cmd('kill @e[type=!player]', 500);
}

async function cell(x, y, z, floor, roof) {
  await cmd(`fill ${x - 1} ${y - 1} ${z - 1} ${x + 1} ${y - 1} ${z + 1} minecraft:${floor}`, 200);
  await cmd(`fill ${x - 1} ${y} ${z - 1} ${x + 1} ${y} ${z + 1} minecraft:air`, 200);
  await cmd(`fill ${x - 1} ${y + 1} ${z - 1} ${x + 1} ${y + 1} ${z + 1} minecraft:${roof}`, 250);
}

async function arm(name, x, y, z, floor, roof, expectOoze, expectGate) {
  await cell(x, y, z, floor, roof);
  const from = srv.all.length;
  await cmd(`etest spawnpick ${x} ${y} ${z} 2000`, 1800);
  const lines = slice(from);
  const summary = lines.find(s => /\[SpawnLog\] spawnpick n=2000/.test(s)) || '';
  const count = (summary.match(/EntityOoze=(\d+)/) || [])[1];
  const ooze = count == null ? 0 : Number(count);
  const gate = lines.filter(s => /\[SpawnLog\] ooze-gate reject/.test(s)).length;
  const ok = expectOoze(ooze) && expectGate(gate);
  console.log(`[${name}]`, JSON.stringify({ ooze, gate, ok, summary: summary.slice(0, 220) }));
  return ok;
}

async function main() {
  const tag = `b52s-${RUN}`;
  await startBoot(tag, `w-b52s-${RUN}`);
  const pin = await stampPin();
  await stage();

  // W1: y=20, stone floor + stone ceiling -> ooze accepted.
  const w1 = await arm('w1-deep-sandwich', -50, 20, 240, 'stone', 'stone', n => n > 0, g => g === 0);
  // W2: y=60, stone sandwich -> depth reject.
  const w2 = await arm('w2-shallow', -50, 60, 240, 'stone', 'stone', n => n === 0, g => g > 0);
  // W3: y=20, stone floor, glass roof -> stoneAbove false (glass breaks the scan).
  const w3 = await arm('w3-no-ceiling', -50, 20, 241, 'stone', 'glass', n => n === 0, g => g > 0);
  // W4: y=20, stone ceiling, no floor -> floor reject.
  const w4 = await arm('w4-no-floor', -50, 20, 242, 'air', 'stone', n => n === 0, g => g > 0);

  const st = await stopBoot();
  const pass = pin.ok && w1 && w2 && w3 && w4
    && st.exitCode === 0 && st.exited === true;
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, w1, w2, w3, w4, stop: st, pass }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(2);
});
