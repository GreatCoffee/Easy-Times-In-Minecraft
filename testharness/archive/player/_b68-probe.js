// W-B68 diagnostic (NOT evidence): why does /etest harvest (TryHarvestBlock)
// return false on vanilla crops but true on etim:onions? Places four crops on
// the same farmland row, harvests each, then tries /etest dig on a second row
// to separate "tryHarvestBlock refuses" from "block cannot be removed".
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'probe';
const A = 'ETIM_F7';
const WORLD = 'w-b68-probe';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function slice(from) { return srv.all.slice(from); }
function lastState(rows, x, y, z) {
  const re = new RegExp(`The block at ${x}, ${y}, ${z} is ([^(]+)\\(expected: Air\\)`);
  for (let i = rows.length - 1; i >= 0; i--) { const m = re.exec(rows[i]); if (m) return m[1].trim(); }
  for (let i = rows.length - 1; i >= 0; i--) {
    if (new RegExp(`Successfully found the block at ${x}, ${y}, ${z}`).test(rows[i])) return 'air';
  }
  return '?';
}
async function probe(x, y, z) {
  const at = srv.all.length;
  await cmd(`testforblock ${x} ${y} ${z} minecraft:air`, 250);
  return lastState(slice(at), x, y, z);
}
async function startBoot(tag, world) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore.replace(/B:farmDebugLog\s*=\s*(true|false)/, 'B:farmDebugLog=true');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 480000)) return;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
  }
  throw new Error('no Done(');
}

(async () => {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  console.log('[PIN] sha=' + L.sha256(fs.readFileSync(jar)).toUpperCase());
  await startBoot('b68-probe', WORLD);
  bot = await L.joinBot(srv, A);
  await cmd(`gamemode 0 ${A}`, 600);
  await cmd(`tp ${A} -60.5 131 240.5`, 600);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('time set 1000', 300);
  // flat stone floor + farmland row at z=240, crops at y=121
  await cmd('fill -64 118 236 -56 118 244 minecraft:stone', 800);
  await cmd('fill -64 119 236 -56 125 244 minecraft:air', 800);
  await cmd('fill -62 119 237 -58 119 243 minecraft:farmland 7', 800);
  await sleep(500);
  const crops = [
    [238, 'minecraft:carrots', 7],
    [239, 'minecraft:potatoes', 7],
    [240, 'minecraft:wheat', 7],
    [241, 'etim:onions', 7]
  ];
  for (const [z, name, meta] of crops) await cmd(`setblock -60 120 ${z} ${name} ${meta}`, 500);
  await sleep(800);
  const before = {};
  for (const [z] of crops) before[z] = await probe(-60, 120, z);
  console.log('[placed] ' + JSON.stringify(before));

  const harvest = {};
  for (const [z] of crops) {
    const at = srv.all.length;
    await cmd(`etest harvest -60 120 ${z} ${A}`, 1500);
    const rows = slice(at);
    harvest[z] = {
      result: (rows.map(s => /step=harvest pos=BlockPos\{x=-60, y=120, z=(\d+)\} result=(\w+)/.exec(s)).find(Boolean) || [])[2] || 'none',
      drops: rows.filter(s => /\[FarmLog\] rootcrop /.test(s)).map(s => s.replace(/^.*\[FarmLog\] /, '')),
      after: await probe(-60, 120, z)
    };
  }
  console.log('[harvest] ' + JSON.stringify(harvest));

  // dig face on a second row (z=242/243) to compare with tryHarvestBlock
  await cmd('fill -62 119 242 -58 119 243 minecraft:farmland 7', 700);
  for (const [z, name, meta] of [[242, 'minecraft:carrots', 7], [243, 'etim:onions', 7]]) {
    await cmd(`setblock -60 120 ${z} ${name} ${meta}`, 500);
  }
  await sleep(600);
  const dig = {};
  for (const z of [242, 243]) {
    const at = srv.all.length;
    await cmd(`etest dig -60 120 ${z} ${A}`, 2000);
    const rows = slice(at);
    dig[z] = {
      steps: rows.filter(s => /\[TestLog\] step=dig-/.test(s)).map(s => s.replace(/^.*\[TestLog\] /, '')),
      drops: rows.filter(s => /\[FarmLog\] rootcrop /.test(s)).map(s => s.replace(/^.*\[FarmLog\] /, '')),
      after: await probe(-60, 120, z)
    };
  }
  console.log('[dig] ' + JSON.stringify(dig));

  try { await srv.stop(60000); } catch (e) { /* noop */ }
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop] done');
  process.exit(0);
})().catch(e => { console.error('[ERR]', e && e.stack || e); process.exit(1); });
