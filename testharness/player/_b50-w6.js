// B-50 W6 — flag-off arm for the equipped-mob despawn hold (negative evidence).
// Same sealed chamber, same equipped zombie, same 14 s wait as the smoke W5 arm;
// the only difference is mobDespawnR196=false (mobDebugLog stays true so the
// channel is provably alive).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w6';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '6A4B565BE6B31513F8E17D4C0BF0130304AB1643D908A04981EC434D95675E76';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const countsOk = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 242
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 242
    && mk.manifest.mixins === 101 && mk.manifest.client === 10;
  console.log(`[PIN] sha=${sha} expected=${EXPECTED_SHA} shaOk=${sha === EXPECTED_SHA} ` +
    `mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},dual:${mk.refmapTmp.dual},` +
    `mixins:${mk.manifest.mixins},client:${mk.manifest.client}} ok=${countsOk}`);
  return { sha, ok: countsOk && sha === EXPECTED_SHA };
}

async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore;
  for (const [key, value] of [['mobDebugLog', 'true'], ['mobDespawnR196', 'false']]) {
    if (new RegExp(`B:${key}\\s*=`).test(cfg)) {
      cfg = cfg.replace(new RegExp(`B:${key}\\s*=\\s*(true|false)`), `B:${key}=${value}`);
    } else {
      cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
        `$1$2B:metalAnvilRepair=true$1$2B:${key}=${value}`);
    }
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(mobDebugLog|mobDespawnR196)=\w+/g) || []).join(' ');
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
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b50-${RUN}`, `w-b50s-${RUN}`);
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd('tp ' + A + ' -60.5 120 240.5', 300);
  await cmd('fill -56 119 236 -44 126 244 air', 500);

  // Channel-alive probe (flag-independent, prints one row per call).
  const fromProbe = srv.all.length;
  await cmd('etest equipped -50 120 240 true', 500);
  const probeRows = slice(fromProbe).filter(s => /equipped-probe contained=/.test(s)).length;

  // Identical geometry to smoke W5.
  const from5 = srv.all.length;
  await cmd('difficulty 2', 300);
  await cmd('time set 18000', 300);
  await cmd('fill -61 119 179 -59 121 181 minecraft:stone', 400);
  await cmd('fill -60 120 180 -60 121 180 minecraft:air', 400);
  await cmd('summon zombie -59.5 120 180.5 {HandItems:[{id:"minecraft:iron_sword",Count:1b},{}],ArmorItems:[{},{},{},{id:"minecraft:iron_helmet",Count:1b}],CustomName:"b50eq"}', 600);
  await sleep(14000);
  const w6 = slice(from5);
  const wall = w6.filter(s => /wall=equipped/.test(s)).length;
  const kills = w6.filter(s => /\[AILog\] mob despawn kill/.test(s)).length;
  const anyDespawn = w6.filter(s => /\[AILog\] mob despawn /.test(s)).length;
  const pass = pin.ok && wall === 0 && probeRows >= 1;
  console.log('[W6]', JSON.stringify({ wall, kills, anyDespawn, probeRows }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
