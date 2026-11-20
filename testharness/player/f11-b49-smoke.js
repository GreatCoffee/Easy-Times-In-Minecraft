// B-49 smoke — R196 animal peer warning (census D :318). The command summons
// three cows, hits the first with a player-source hit and the EntityAnimal
// tail copies the attacker onto the two peers as their revenge target; the
// panic task then raises the flee flag. Server-log evidence only.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || 'EEF3C728C6453C01C737C56CAA34A262723B6A38797444EE546D1BE82A17A92F';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

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
  for (const [key, value] of [['mobDebugLog', 'true'], ['livestockNeedsR196', 'true'],
    ['mobStatsR196', 'true']]) {
    if (new RegExp(`B:${key}\\s*=`).test(cfg)) {
      cfg = cfg.replace(new RegExp(`B:${key}\\s*=\\s*(true|false)`), `B:${key}=${value}`);
    } else {
      cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
        `$1$2B:metalAnvilRepair=true$1$2B:${key}=${value}`);
    }
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
  for (const g of ['doMobSpawning false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('difficulty 0', 300);
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b49-${RUN}`, `w-b49s-${RUN}`);
  await stage();

  const bootLines = srv.all;
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W1: three cows in a row; hit the first — the two peers must carry revenge.
  const from1 = srv.all.length;
  await cmd('etest warnpeers -50 120 240', 900);
  const w1 = slice(from1);
  const warn = w1.find(s => /warnpeers src=EntityCow peers=2 attacker=\d+/.test(s)) || '';
  const probes = w1.filter(s => /warnpeers probe id=\d+ revenge=\d+/.test(s));
  const peerRevenge = probes.filter(s => !/revenge=0 /.test(s)).length;
  const peerIds = probes
    .filter(s => !/revenge=0 /.test(s) && !/dist=0\.00 /.test(s))
    .map(s => (s.match(/probe id=(\d+)/) || [])[1])
    .filter(Boolean);
  const w1ok = !!warn && probes.length === 3 && peerRevenge >= 2;

  // W2: the panic task turns the copied revenge target into the flee flag.
  await sleep(2500);
  const w2 = slice(from1);
  const panicStart = w2.filter(s => /panicflee src=cow start /.test(s));
  const peerPanic = peerIds.filter(id => panicStart.some(s => s.includes('#' + id))).length;
  const w2ok = peerIds.length >= 2 && peerPanic >= 2;

  const pass = pin.ok && mixinFail === 0 && w1ok && w2ok;
  console.log('[W1]', JSON.stringify({ peers: /peers=2/.test(warn), probes: probes.length, peerRevenge }));
  console.log('[W2]', JSON.stringify({ peers: peerIds.length, peerPanic }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
