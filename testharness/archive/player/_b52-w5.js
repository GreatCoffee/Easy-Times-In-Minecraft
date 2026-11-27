// B-52 W5 — flag-off arm for the R196 natural-spawn cascade.
// mobSpawnR196=false + mobDebugLog=true, doMobSpawning true, night: a deep stone
// sandwich cell is left to the natural spawner for 90 s. Expect zero [SpawnLog]
// rows of any kind. A follow-up /etest spawnpick at the same cell records the
// table's own Ooze count (it calls ETIMSpawnTables directly and therefore
// bypasses the switch) plus a live-entity count from the bot view.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w5';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF';
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
  for (const [key, value] of [['mobDebugLog', 'true'], ['mobSpawnR196', 'false']]) {
    if (new RegExp(`B:${key}\\s*=`).test(cfg)) {
      cfg = cfg.replace(new RegExp(`B:${key}\\s*=\\s*(true|false)`), `B:${key}=${value}`);
    } else {
      cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
        `$1$2B:metalAnvilRepair=true$1$2B:${key}=${value}`);
    }
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(mobSpawnR196|mobDebugLog)=\w+/g) || []).join(' ');
  console.log('[cfg]', eff);
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

async function main() {
  await startBoot(`b52-${RUN}`, `w-b52-${RUN}`);
  const pin = await stampPin();

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doTileDrops false', 'doDaylightCycle false', 'doFireTick false',
    'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false', 'doMobLoot true',
    'doMobSpawning true']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 250);
  await cmd('time set 18000', 200);
  await cmd('tp ' + A + ' -50.5 22 240.5', 400);
  await cmd('kill @e[type=!player]', 500);

  // Deep stone sandwich (W1 geometry) big enough for natural attempts.
  await cmd('fill -56 19 234 -44 19 246 minecraft:stone', 400);
  await cmd('fill -56 20 234 -44 22 246 minecraft:air', 400);
  await cmd('fill -56 23 234 -44 23 246 minecraft:stone', 400);
  await cmd('tp ' + A + ' -50.5 20 240.5', 300);

  const from = srv.all.length;
  await sleep(90000);
  const window = slice(from);
  const spawnRows = window.filter(s => /\[SpawnLog\]/.test(s)).length;
  const oozeRows = window.filter(s => /ooze-gate|ETIMEntityOoze/.test(s)).length;
  let mobs = 0;
  try {
    mobs = Object.values(bot.entities || {}).filter(e => e && e.type === 'mob').length;
  } catch (e) { mobs = -1; }

  // Table-side probe: pickSpawn is called directly, so it bypasses the switch.
  const from2 = srv.all.length;
  await cmd('etest spawnpick -50 20 240 2000', 1800);
  const probe = slice(from2).find(s => /spawnpick n=2000/.test(s)) || '';
  const pickOoze = Number((probe.match(/ETIMEntityOoze=(\d+)/) || [])[1] || 0);
  const pickGate = slice(from2).filter(s => /ooze-gate reject/.test(s)).length;

  const pass = pin.ok && spawnRows === 0;
  console.log('[W5]', JSON.stringify({ spawnRows, oozeRows, mobs, pickOoze, pickGate }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
