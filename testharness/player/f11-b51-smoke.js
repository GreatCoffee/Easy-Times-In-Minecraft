// B-51 smoke — R196 base drops for the non-butchering families (census D
// :159/:160/:170). Each arm summons NoAI mobs and kills them with a
// player-source hit (/etest hit), then counts the [DropLog] base rows.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '5B6EF49CBAE026BC8174DF9CAA527C921E1AD1C3DDE2AED4C58EFF2CAF890514';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function slice(from) { return srv.all.slice(from); }
function count(lines, re) { return lines.filter(s => re.test(s)).length; }

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
  await cmd('time set 6000', 200);
  await cmd('tp ' + A + ' -50.5 120 240.5', 400);
  await cmd('kill @e[type=!player]', 500);
}

async function arm(mob, type, n, expect) {
  const from = srv.all.length;
  for (let i = 0; i < n; i++) {
    await cmd(`summon ${mob} ${-52 + (i % 3)} 120 ${238 + Math.floor(i / 3)} {NoAI:1b}`, 250);
  }
  for (let i = 0; i < n; i++) {
    await cmd(`etest hit @e[type=${type},x=-51,y=120,z=239,r=12,c=1] 1000 ${A}`, 450);
  }
  await sleep(800);
  const lines = slice(from);
  const rows = lines.filter(s => /\[DropLog\] base class=/.test(s));
  const ok = expect(rows.length, rows);
  console.log(`[${mob}]`, JSON.stringify({ rows: rows.length, ok }));
  return ok;
}

async function main() {
  const tag = `b51s-${RUN}`;
  await startBoot(tag, `w-b51s-${RUN}`);
  const pin = await stampPin();
  await stage();

  const w1 = await arm('creeper', 'creeper', 8, n => n >= 1 && n <= 24);
  const w2 = await arm('enderman', 'enderman', 6, n => n >= 1);
  const w3 = await arm('zombie_pigman', 'zombie_pigman', 6, n => n >= 1);
  const w4 = await arm('wolf', 'wolf', 3, n => n === 3);
  const w5 = await arm('squid', 'squid', 2, n => n === 2);
  const w6 = await arm('ocelot', 'ocelot', 2, n => n === 0);
  const w7 = await arm('ghast', 'ghast', 3, n => n >= 1);
  const w8 = await arm('chicken', 'chicken', 4, n => n >= 1);

  const st = await stopBoot();
  const pass = pin.ok && w1 && w2 && w3 && w4 && w5 && w6 && w7 && w8
    && st.exitCode === 0 && st.exited === true;
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, w1, w2, w3, w4, w5, w6, w7, w8, stop: st, pass }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('FATAL', e && e.stack || e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
