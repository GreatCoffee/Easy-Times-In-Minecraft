// B-47 smoke — R196 spawn details: infernal creeper replacement, ghast
// 48-block retry gate, and the one-coin bat ceiling hang.
// Server-log evidence only; the direct probes call the same helpers the
// product path uses, independent of natural spawn timing.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '8B1F811F0312794E3777289EDC62CE89C7644E7FBA5A6754DA10D7A1EE720C54';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const countsOk = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 239
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 239
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
  if (/B:mobDebugLog\s*=/.test(cfg)) {
    cfg = cfg.replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true');
  } else {
    cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
      '$1$2B:metalAnvilRepair=true$1$2B:mobDebugLog=true');
  }
  if (/B:mobSpawnR196\s*=/.test(cfg)) {
    cfg = cfg.replace(/B:mobSpawnR196\s*=\s*(true|false)/, 'B:mobSpawnR196=true');
  } else {
    cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
      '$1$2B:metalAnvilRepair=true$1$2B:mobSpawnR196=true');
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
  await cmd('difficulty 0', 300);
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);
}

async function pick(x, y, z, n) {
  const from = srv.all.length;
  await cmd(`etest spawnpick ${x} ${y} ${z} ${n}`, 1400);
  const lines = slice(from);
  const summary = lines.find(s => s.includes('[SpawnLog] spawnpick')) || '';
  return { lines, summary };
}
function count(summary, name) {
  const m = summary.match(new RegExp(name + '=(\\d+)'));
  return m ? Number(m[1]) : 0;
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b47-${RUN}`, `w-b47s-${RUN}`);
  await stage();

  const bootLines = srv.all;
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W0: deep candidate — infernal replacement passes the depth/coin gate.
  const w0p = await pick(-50, 20, 240, 4000);
  const w0inf = count(w0p.summary, 'ETIMEntityInfernalCreeper');
  const w0ok = w0inf > 0 && has(w0p.lines, /creeper-gate infernal/);

  // W1: surface candidate — y is far above the 40-die depth branch, so no
  // infernal creeper may be produced.
  const w1 = await pick(-49, 120, 240, 4000);
  const w1inf = count(w1.summary, 'ETIMEntityInfernalCreeper');
  const w1ok = w1inf === 0 && !has(w1.lines, /creeper-gate infernal/);

  // W2: ghast 48-block player veto — near the bot true, far away false.
  const from2 = srv.all.length;
  await cmd('etest ghastgate -60 120 240', 500);
  await cmd('etest ghastgate -60 120 300', 500);
  const w2 = slice(from2);
  const w2ok = has(w2, /ghastgate player=true/) && has(w2, /ghastgate player=false/);

  // W3: bat ceiling hang — a stone ceiling 5 blocks up must hang; open sky
  // must leave the bat unhung.
  await cmd('fill -61 121 239 -59 124 241 minecraft:air', 500);
  await cmd('setblock -60 125 240 minecraft:stone', 400);
  const from3 = srv.all.length;
  await cmd('etest hangbat -60 120 240', 500);
  const w3a = slice(from3);
  await cmd('setblock -60 125 240 minecraft:air', 400);
  const from3b = srv.all.length;
  await cmd('etest hangbat -60 120 240', 500);
  const w3b = slice(from3b);
  const w3ok = has(w3a, /hangbat ok=true/) && has(w3b, /hangbat ok=false/);

  // W4: the infernal entity itself carries radius 6, fire immunity and +2
  // natural defense.
  await cmd('kill @e[type=etim:infernal_creeper]', 300);
  const from4 = srv.all.length;
  await cmd('etest infernal -50 120 240', 700);
  const w4 = slice(from4);
  const w4ok = has(w4, /infernal spawn .*radius=6 fireImmune=true defense=2\.0/);

  const pass = pin.ok && mixinFail === 0 && w0ok && w1ok && w2ok && w3ok && w4ok;
  console.log('[W0]', JSON.stringify({ infernal: w0inf, gate: has(w0p.lines, /creeper-gate infernal/) }));
  console.log('[W1]', JSON.stringify({ infernal: w1inf, gate: has(w1.lines, /creeper-gate infernal/) }));
  console.log('[W2]', JSON.stringify({ near: has(w2, /ghastgate player=true/),
    far: has(w2, /ghastgate player=false/) }));
  console.log('[W3]', JSON.stringify({ ceiling: has(w3a, /hangbat ok=true/),
    open: has(w3b, /hangbat ok=false/) }));
  console.log('[W4]', JSON.stringify({ radius: /radius=6/.test(w4.join('\n')),
    immune: /fireImmune=true/.test(w4.join('\n')) }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
