// W-B52b diagnostic (NOT evidence): why does the natural pipeline never return
// an ooze? Reuses the w-b52-w5c hall. Probes the table directly at the exact
// spawn-position coordinates the natural spawner would use, then watches a
// short natural window for any ooze accept / colliding / wide reject rows.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w5d';
const A = 'ETIM_F7';
const WORLD = 'w-b52-w5c';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function slice(from) { return srv.all.slice(from); }
function countOoze(rows) {
  const row = rows.find(s => /spawnpick n=2000/.test(s)) || '';
  return { ooze: Number((row.match(/ETIMEntityOoze=(\d+)/) || [])[1] || 0), row: row.replace(/^.*\[SpawnLog\] /, '').slice(0, 240) };
}
async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  console.log(`[PIN] sha=${sha} mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},mixins:${mk.manifest.mixins}}`);
  return sha;
}
async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore;
  for (const [key, value] of [['mobDebugLog', 'true'], ['mobSpawnR196', 'true']]) {
    cfg = cfg.replace(new RegExp(`B:${key}\\s*=\\s*(true|false)`), `B:${key}=${value}`);
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 480000)) return;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done(');
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
  await startBoot(`b52-${RUN}`, WORLD);
  await stampPin();
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  await cmd('difficulty 1', 250);
  await cmd('time set 18000', 200);
  await cmd('tp ' + A + ' -50.5 20 240.5', 600);
  await cmd('kill @e[type=!player]', 600);

  const probes = [];
  for (const p of ['-50 21 300', '-50 21 330', '-50 16 300', '-50 20 240']) {
    const from = srv.all.length;
    await cmd('etest spawnpick ' + p + ' 2000', 1600);
    const r = countOoze(slice(from));
    probes.push({ pos: p, ooze: r.ooze });
    console.log('[probe]', p, 'ooze=' + r.ooze, '|', r.row.slice(0, 150));
  }

  const start = srv.all.length;
  await sleep(60000);
  const win = slice(start);
  const pick = re => win.filter(s => re.test(s)).length;
  console.log('[natural]', JSON.stringify({
    accept: pick(/\[SpawnLog\] accept /),
    acceptOoze: pick(/\[SpawnLog\] accept .*Ooze/),
    oozeGate: pick(/ooze-gate reject/),
    oozeGateAllTrue: pick(/ooze-gate reject depth=true floor=true stoneAbove=true/),
    colliding: pick(/reject colliding/),
    collidingOoze: pick(/reject colliding ETIMEntityOoze/),
    spawnpick: pick(/spawnpick /),
  }));
  const st = await stopBoot();
  console.log('[done]', JSON.stringify({ probes, stop: st }));
  process.exit(0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
