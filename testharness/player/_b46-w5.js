// B-46 W5 — natural wiring arm: mobDebugLog=true, no /etest spawnpick at all.
// So any slime-gate / deep-gate row in this boot is a natural spawn-cycle rejection.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w5';
const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }
function count(lines, re) { return lines.filter(s => re.test(s)).length; }

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  console.log(`[PIN] sha=${sha} mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},` +
    `dual:${mk.refmapTmp.dual},mixins:${mk.manifest.mixins},client:${mk.manifest.client}}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', `w-b46s-${RUN}`), 'allow-flight', 'true'), 'utf8');
  const cfg = cfgBefore.replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true');
  note(`cfg mobDebugLog injected=${cfg !== cfgBefore}`);
  fs.writeFileSync(L.CFG, cfg, 'utf8');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: `b46w5-${RUN}` });
  note(`boot ok=${await srv.waitFor(/Done \(/, 480000)}`);

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  await cmd('difficulty 2', 300);
  await cmd('gamerule doMobSpawning true', 300);
  await cmd('gamerule doDaylightCycle false', 200);
  await cmd('time set 18000', 300);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 800);

  // Arm A: open-sky surface at night — natural monster rolls at y=120 must hit the deep gate.
  await cmd(`tp ${A} -50 120 240`, 400);
  const aFrom = srv.all.length;
  await sleep(150000);
  const aLines = slice(aFrom);
  const aDeep = aLines.filter(s => /deep-gate/.test(s)).map(s => s.trim());
  const aSlime = count(aLines, /slime-gate/);

  // Arm B: dark stone-roofed cave at y≈40 — natural slime rolls must hit the slime gate.
  await cmd('fill -62 38 232 -46 42 248 minecraft:stone', 700);
  await cmd('fill -60 39 234 -48 41 246 minecraft:air', 700);
  await cmd(`tp ${A} -54 39 240`, 400);
  await cmd('time set 18000', 200);
  const bFrom = srv.all.length;
  await sleep(150000);
  const bLines = slice(bFrom);
  const bSlime = bLines.filter(s => /slime-gate/.test(s)).map(s => s.trim());
  const bDeep = count(bLines, /deep-gate/);

  const allLines = srv.all;
  const probeRows = count(allLines, /\[SpawnLog\] spawnpick/);
  console.log('[W5]', JSON.stringify({
    armA_deepGate: aDeep.length, armA_slimeGate: aSlime,
    armB_slimeGate: bSlime.length, armB_deepGate: bDeep,
    spawnpickRows: probeRows,
    sampleDeep: aDeep.slice(0, 3), sampleSlime: bSlime.slice(0, 3)
  }));

  try { bot.quit(); bot = null; await sleep(1500); } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = aDeep.length >= 1 && bSlime.length >= 1 && probeRows === 0;
  console.log('[done]', JSON.stringify({ run: RUN, pass, bad: pass ? 0 : 1 }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (bot) bot.quit(); } catch (x) { /* noop */ }
  try { if (srv) console.log('[stop]', JSON.stringify(await srv.stop())); } catch (x) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (x) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (x) { /* noop */ }
  process.exit(1);
});
