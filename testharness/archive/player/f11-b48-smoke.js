// B-48 smoke — R196 attribute small batch: skeleton speed 0.3, tame-sensitive
// wolf row (12/8 hp, 32/16 follow, 3 attack, 0.4 speed), and EntityAgeable
// addGrowth *5. Server-log evidence only.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '16E8FA88BF4329D977370B4BFF69606F25D22C09D8B020740B7D1E648C2ED277';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const countsOk = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 241
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 241
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
  for (const [key, value] of [['mobDebugLog', 'true'], ['farmDebugLog', 'true'],
    ['mobStatsR196', 'true'], ['livestockNeedsR196', 'true']]) {
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
  await startBoot(`b48-${RUN}`, `w-b48s-${RUN}`);
  await stage();

  const bootLines = srv.all;
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W1: skeleton row — R196 EntitySkeleton:33 speed 0.3 (vanilla 0.25).
  const from1 = srv.all.length;
  await cmd('summon minecraft:skeleton -50 120 240', 900);
  const w1 = slice(from1);
  const w1ok = has(w1, /mob stats movementSpeed=0\.3 .*entity=EntitySkeleton/);

  // W2: wild wolf — 8 hp / 16 follow / 3 attack / 0.4 speed.
  const from2 = srv.all.length;
  await cmd('etest wolf -40 120 240 false', 900);
  const w2 = slice(from2);
  const w2ok = has(w2, /wolf probe tamed=false hp=8\.0 max=8\.0 attack=3\.0 follow=16\.0 speed=0\.4/);

  // W3: tamed wolf — 12 hp / 32 follow / 3 attack / 0.4 speed.
  const from3 = srv.all.length;
  await cmd('etest wolf -30 120 240 true', 900);
  const w3 = slice(from3);
  const w3ok = has(w3, /wolf probe tamed=true hp=12\.0 max=12\.0 attack=3\.0 follow=32\.0 speed=0\.4/);

  // W4: addGrowth — R196 adds n*5 ticks, not 1.12's n*20.
  await cmd('summon minecraft:pig -55 120 240 {Age:-24000,NoAI:1b}', 700);
  const from4 = srv.all.length;
  await cmd('etest addgrowth 1', 700);
  const w4 = slice(from4);
  const w4row = w4.find(s => /addGrowth kind=EntityPig/.test(s)) || '';
  const w4m = w4row.match(/before=(-?\d+) after=(-?\d+)/);
  const w4delta = w4m ? Number(w4m[2]) - Number(w4m[1]) : null;
  const w4ok = w4delta === 5;

  const pass = pin.ok && mixinFail === 0 && w1ok && w2ok && w3ok && w4ok;
  console.log('[W1]', JSON.stringify({ speed: has(w1, /mob stats movementSpeed=0\.3/) }));
  console.log('[W2]', JSON.stringify({ wild: w2ok }));
  console.log('[W3]', JSON.stringify({ tamed: w3ok }));
  console.log('[W4]', JSON.stringify({ delta: w4delta }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
