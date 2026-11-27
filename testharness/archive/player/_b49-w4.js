// B-49 W4 — B-48 regression with flags on: skeleton speed 0.3, wolf 8/8/3/16/0.4 and
// 12/12/3/32/0.4, addGrowth delta 5.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  console.log(`[PIN] sha=${sha} size=${fs.statSync(jar).size} mtime=${fs.statSync(jar).mtime.toISOString()}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', 'w-b49s-w4'), 'allow-flight', 'true'), 'utf8');
  const cfg = cfgBefore
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true')
    .replace(/B:livestockNeedsR196\s*=\s*(true|false)/, 'B:livestockNeedsR196=true')
    .replace(/B:mobStatsR196\s*=\s*(true|false)/, 'B:mobStatsR196=true')
    .replace(/B:farmDebugLog\s*=\s*(true|false)/, 'B:farmDebugLog=true');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  note('cfg injected: mobDebugLog=true livestockNeedsR196=true mobStatsR196=true farmDebugLog=true');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: 'b49w4' });
  note(`boot ok=${await srv.waitFor(/Done \(/, 480000)}`);

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops false', 'doDaylightCycle false', 'doFireTick false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('difficulty 0', 300);
  await cmd('time set 6000', 200);
  await cmd('kill @e[type=!player]', 600);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);

  // skeleton speed 0.3
  const f1 = srv.all.length;
  await cmd('summon minecraft:skeleton -50 120 240', 1600);
  const l1 = slice(f1);
  const skelRow = (l1.find(s => /mob stats movementSpeed=0\.3 .*entity=EntitySkeleton/.test(s)) || '').trim();

  // wolf wild / tamed
  const f2 = srv.all.length;
  await cmd('etest wolf -40 120 240 false', 1200);
  const wildRow = (slice(f2).find(s => /wolf probe tamed=false/.test(s)) || '').trim();
  const f3 = srv.all.length;
  await cmd('etest wolf -30 120 240 true', 1200);
  const tameRow = (slice(f3).find(s => /wolf probe tamed=true/.test(s)) || '').trim();

  // addGrowth delta
  await cmd('summon minecraft:pig -55 120 240 {Age:-24000,NoAI:1b}', 800);
  const f4 = srv.all.length;
  await cmd('etest addgrowth 1', 900);
  const growRow = (slice(f4).find(s => /addGrowth kind=EntityPig/.test(s)) || '').trim();
  const m = growRow.match(/before=(-?\d+) after=(-?\d+)/);
  const delta = m ? Number(m[2]) - Number(m[1]) : null;

  const skelOk = !!skelRow;
  const wildOk = /tamed=false hp=8\.0 max=8\.0 attack=3\.0 follow=16\.0 speed=0\.4/.test(wildRow);
  const tameOk = /tamed=true hp=12\.0 max=12\.0 attack=3\.0 follow=32\.0 speed=0\.4/.test(tameRow);
  const growOk = delta === 5;

  console.log('[W4]', JSON.stringify({
    skelOk, wildOk, tameOk, growDelta: delta, growOk,
    skelRow, wildRow, tameRow, growRow,
    pass: skelOk && wildOk && tameOk && growOk
  }));

  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = skelOk && wildOk && tameOk && growOk;
  console.log('[done]', JSON.stringify({ run: 'w4', pass, bad: pass ? 0 : 1 }));
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
