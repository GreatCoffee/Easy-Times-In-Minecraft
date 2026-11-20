// B-47 W6 — default-off natural window: mobSpawnR196=false, mobDebugLog=true
// (log switch stays on so an accidental gate row would still be visible).
// Same world/room as W5; 60 s natural window; expect zero gate rows.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w6';
const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function count(lines, re) { return lines.filter(s => re.test(s)).length; }

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  console.log(`[PIN] sha=${sha}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', 'w-b47v'), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true')
    .replace(/B:mobSpawnR196\s*=\s*(true|false)/, 'B:mobSpawnR196=false');
  note(`cfg mobSpawnR196=false / mobDebugLog=true injected`);
  fs.writeFileSync(L.CFG, cfg, 'utf8');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: `b47w6-${RUN}` });
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
  await cmd('fill -72 28 228 -48 35 252 minecraft:stone', 900);
  await cmd('fill -70 29 230 -50 34 250 minecraft:air', 900);
  await cmd(`tp ${A} -60 29 240`, 400);

  const from = srv.all.length;
  await sleep(60000);
  const lines = slice(from);

  const out = {
    creeperInfernal: count(lines, /\[SpawnLog\] creeper-gate infernal/),
    batHang: count(lines, /\[SpawnLog\] bat-hang/),
    ghastGate: count(lines, /ghast-gate/),
    spawnLogRows: count(lines, /\[SpawnLog\]/),
    anyGate: count(lines, /creeper-gate|bat-hang|ghast-gate/)
  };
  console.log('[W6]', JSON.stringify(out));

  try { bot.quit(); bot = null; await sleep(1500); } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = out.anyGate === 0;
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
