// B-51 W9 — flag-off arm for the R196 base-drop table.
// Same staging as the smoke driver (difficulty 1, doMobLoot true, debug log on),
// but livestockNeedsR196=false: three Creeper / Wolf / Chicken kills must yield
// zero [DropLog] base rows while /etest hit keeps proving the damage channel.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w9';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '5B6EF49CBAE026BC8174DF9CAA527C921E1AD1C3DDE2AED4C58EFF2CAF890514';
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
  for (const [key, value] of [['mobDebugLog', 'true'], ['livestockNeedsR196', 'false']]) {
    if (new RegExp(`B:${key}\\s*=`).test(cfg)) {
      cfg = cfg.replace(new RegExp(`B:${key}\\s*=\\s*(true|false)`), `B:${key}=${value}`);
    } else {
      cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
        `$1$2B:metalAnvilRepair=true$1$2B:${key}=${value}`);
    }
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(livestockNeedsR196|mobDebugLog)=\w+/g) || []).join(' ');
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
  await startBoot(`b51-${RUN}`, `w-b51s-${RUN}`);
  const pin = await stampPin();

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
  await cmd('time set 6000', 200);
  await cmd('tp ' + A + ' -50.5 120 240.5', 400);
  await cmd('kill @e[type=!player]', 500);

  const from = srv.all.length;
  const plan = [['creeper', 'creeper'], ['wolf', 'wolf'], ['chicken', 'chicken']];
  for (const [mob, type] of plan) {
    for (let i = 0; i < 3; i++) {
      await cmd(`summon ${mob} ${-52 + (i % 3)} 120 ${238 + plan.findIndex(p => p[0] === mob)} {NoAI:1b}`, 250);
    }
    for (let i = 0; i < 3; i++) {
      await cmd(`etest hit @e[type=${type},x=-51,y=120,z=239,r=12,c=1] 1000 ${A}`, 450);
    }
  }
  await sleep(2000);

  const lines = slice(from);
  const baseRows = lines.filter(s => /\[DropLog\] base class=/.test(s));
  const hits = lines.filter(s => /\[TestLog\] hit /.test(s)).length;
  const anyDropLog = lines.filter(s => /\[DropLog\]/.test(s)).length;
  const pass = pin.ok && baseRows.length === 0 && hits >= 3;
  console.log('[W9]', JSON.stringify({ base: baseRows.length, hits, anyDropLog }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
