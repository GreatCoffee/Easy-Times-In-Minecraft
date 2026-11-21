// W-B52b — positive arm: natural ooze spawning with the R196 cascade ON.
// One boot, two 180 s windows in fresh rooms. Evidence is the natural spawner
// path only: [SpawnLog] rows emitted by ETIMSpawnCycle plus /testfor on
// etim:ooze. /etest spawnpick is never called (it bypasses the switch).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w5b';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF';
const WORLD = `w-b52-${RUN}`;
const BOT_POS = '-50.5 20 240.5';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function slice(from) { return srv.all.slice(from); }

function stat(src) {
  const pick = re => src.filter(s => re.test(s)).length;
  return {
    spawnRows: pick(/\[SpawnLog\]/),
    accept: pick(/\[SpawnLog\] accept /),
    acceptOoze: pick(/\[SpawnLog\] accept .*Ooze/),
    oozeGate: pick(/ooze-gate reject/),
    slimeGate: pick(/slime-gate reject/),
    creeperGate: pick(/creeper-gate infernal/),
    capBlock: pick(/cap-block/),
    spawnpick: pick(/spawnpick /),
  };
}

// /testfor with a marker so stale rows can never be read.
async function probe(sel) {
  const mark = `zz${Date.now() % 100000}zz`;
  const from = srv.all.length;
  srv.send('say ' + mark);
  await sleep(120);
  srv.send('testfor ' + sel);
  await sleep(220);
  const win = srv.all.slice(from);
  const at = win.findIndex(s => s.indexOf(mark) >= 0);
  const tail = at >= 0 ? win.slice(at + 1) : win;
  const hit = tail.find(s => /Found /.test(s) && !/cannot be found/i.test(s)) || '';
  const miss = tail.find(s => /cannot be found|cannot be found|found nothing/i.test(s)) || '';
  return { found: !!hit, raw: (hit || miss || '').slice(-160) };
}

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const ok = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 242
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
  for (const [key, value] of [['mobDebugLog', 'true'], ['mobSpawnR196', 'true']]) {
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

function roomCmds(x0, y0, z0) {
  return [
    `fill ${x0 - 2} ${y0} ${z0 - 2} ${x0 + 2} ${y0} ${z0 + 2} minecraft:stone`,
    `fill ${x0 - 2} ${y0 + 1} ${z0 - 2} ${x0 + 2} ${y0 + 3} ${z0 + 2} minecraft:air`,
    `fill ${x0 - 2} ${y0 + 4} ${z0 - 2} ${x0 + 2} ${y0 + 4} ${z0 + 2} minecraft:stone`,
  ];
}

async function runWindow(name, rooms) {
  for (const r of rooms) { for (const c of roomCmds(r[0], r[1], r[2])) { await cmd(c, 250); } }
  const start = srv.all.length;
  const t0 = Date.now();
  let firstHit = null, firstRaw = '';
  for (let i = 0; i < 36; i++) {
    await sleep(5000);
    const p = await probe('@e[type=etim:ooze]');
    if (p.found && !firstHit) { firstHit = ((Date.now() - t0) / 1000).toFixed(1); firstRaw = p.raw; }
    if (i % 6 === 5) console.log(`[hb] ${name} t=${((Date.now() - t0) / 1000) | 0}s ooze=${p.found}`);
  }
  const win = slice(start);
  const s = stat(win);
  const oozeAlive = await probe('@e[type=etim:ooze]');
  const out = { name, rooms: rooms.map(r => r.join(',')), firstHit, firstRaw, oozeAlive: oozeAlive.found, ...s };
  console.log(`[W] ${name} ` + JSON.stringify(out));
  return out;
}

async function main() {
  await startBoot(`b52-${RUN}`, WORLD);
  const pin = await stampPin();

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doTileDrops true', 'doDaylightCycle false', 'doFireTick false',
    'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false',
    'doMobLoot true', 'doMobSpawning true']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 250);
  await cmd('time set 18000', 200);
  await cmd('weather clear', 200);
  await cmd('tp ' + A + ' ' + BOT_POS, 600);
  await cmd('kill @e[type=!player]', 600);

  const w1 = await runWindow('win1', [[-50, 20, 280], [-56, 20, 280], [-44, 20, 280], [-50, 26, 280]]);
  const w2 = await runWindow('win2', [[-50, 20, 200], [-56, 20, 200], [-44, 20, 200], [-50, 26, 200]]);

  const positive = w1.firstHit !== null || w2.firstHit !== null || w1.acceptOoze > 0 || w2.acceptOoze > 0;
  console.log('[W5B]', JSON.stringify({ positive, win1: w1, win2: w2 }));
  const st = await stopBoot();
  const pass = pin.ok && positive;
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, positive, bad: pass ? 0 : 0, stop: st }));
  process.exit(0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
