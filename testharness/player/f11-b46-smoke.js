// B-46 smoke — R196 deep/structure spawn gates (WorldServer:630-633, :650-653, :674-677).
// Server log evidence only: slime no-stone-above, revenant y<=44, bone-lord y<=32,
// plus the blood-moon-night bypass. The probe calls pickSpawn directly through
// /etest spawnpick, so it is independent of natural spawn timing.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '8E68EC033B80926FB0D1A4C3B287C29561D675F4034FB5CE8B47D5B591A3B843';
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
    && mk.manifest.mixins === 100 && mk.manifest.client === 10;
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
  await cmd('difficulty 0', 300);      // peaceful: no natural spawn noise in the gate log
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);
}

// Runs /etest spawnpick and returns the parsed summary line plus the raw window.
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
  await startBoot(`b46-${RUN}`, `w-b46s-${RUN}`);
  await stage();

  const bootLines = srv.all;
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W0/W1 columns are cleared so a random world seed cannot put stone above the
  // probe point and turn W0 into a false failure.
  await cmd('fill -50 120 240 -50 255 240 minecraft:air', 500);
  await cmd('fill -49 120 240 -49 255 240 minecraft:air', 500);

  // W0: open-sky surface — slime passes; no slime-gate rejection.
  const w0p = await pick(-50, 120, 240, 2000);
  const w0slime = count(w0p.summary, 'EntitySlime');
  const w0ok = w0slime > 0 && !has(w0p.lines, /slime-gate reject/);

  // W1: stone directly above the candidate — slime is rejected every time.
  await cmd('setblock -49 121 240 minecraft:stone', 300);
  const w1 = await pick(-49, 120, 240, 2000);
  const w1slime = count(w1.summary, 'EntitySlime');
  const w1ok = w1slime === 0 && has(w1.lines, /slime-gate reject stoneAbove/);

  // W2: y=60 above both thresholds on a normal night — revenant and bone lord rejected.
  const w2 = await pick(-48, 60, 240, 2000);
  const w2rev = count(w2.summary, 'ETIMEntityRevenant');
  const w2bone = count(w2.summary, 'ETIMEntityBoneLord');
  const w2ok = w2rev === 0 && w2bone === 0
    && has(w2.lines, /deep-gate reject cls=ETIMEntityRevenant/)
    && has(w2.lines, /deep-gate reject cls=ETIMEntityBoneLord/);

  // W3: y=20 below both thresholds — both pass.
  const w3 = await pick(-47, 20, 240, 2000);
  const w3rev = count(w3.summary, 'ETIMEntityRevenant');
  const w3bone = count(w3.summary, 'ETIMEntityBoneLord');
  const w3ok = w3rev > 0 && w3bone > 0;

  // W4: blood-moon night bypass at y=60 — the same two pass.
  await cmd('etest moon blood', 300);
  await cmd('etest totaltime 762000', 300);
  const w4 = await pick(-46, 60, 240, 2000);
  const w4rev = count(w4.summary, 'ETIMEntityRevenant');
  const w4bone = count(w4.summary, 'ETIMEntityBoneLord');
  const w4ok = w4rev > 0 && w4bone > 0 && !has(w4.lines, /deep-gate reject/);
  await cmd('etest moon none', 200);

  const pass = pin.ok && mixinFail === 0 && w0ok && w1ok && w2ok && w3ok && w4ok;
  console.log('[W0]', JSON.stringify({ slime: w0slime, reject: has(w0p.lines, /slime-gate reject/) }));
  console.log('[W1]', JSON.stringify({ slime: w1slime, reject: has(w1.lines, /slime-gate reject/) }));
  console.log('[W2]', JSON.stringify({ revenant: w2rev, boneLord: w2bone,
    deepRev: has(w2.lines, /deep-gate reject cls=ETIMEntityRevenant/),
    deepBone: has(w2.lines, /deep-gate reject cls=ETIMEntityBoneLord/) }));
  console.log('[W3]', JSON.stringify({ revenant: w3rev, boneLord: w3bone }));
  console.log('[W4]', JSON.stringify({ revenant: w4rev, boneLord: w4bone,
    deepReject: has(w4.lines, /deep-gate reject/) }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
