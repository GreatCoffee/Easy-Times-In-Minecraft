// B-48 W5 — default-off arm: mobStatsR196=false + livestockNeedsR196=false.
// Expect: (1) zero [AILog] mob stats rows for a summoned skeleton;
//         (2) tamed wolf falls back to vanilla 20/20 hp, attack 4.0, follow 16.0, speed 0.3;
//         (3) addgrowth 1 => vanilla +20 ticks (not R196's +5).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }

function setCfg(cfg, key, value) {
  const re = new RegExp(`B:${key}\\s*=\\s*(true|false)`);
  return re.test(cfg) ? cfg.replace(re, `B:${key}=${value}`) : cfg;
}

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  console.log(`[PIN] sha=${sha} size=${fs.statSync(jar).size}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', 'w-b48s-w5'), 'allow-flight', 'true'), 'utf8');
  let cfg = setCfg(setCfg(cfgBefore, 'mobStatsR196', 'false'), 'livestockNeedsR196', 'false');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  note(`cfg injected: mobStatsR196=false livestockNeedsR196=false`);

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: 'b48w5' });
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
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);

  // 1) skeleton -> expect zero mob-stats rows
  const f1 = srv.all.length;
  await cmd('summon minecraft:skeleton -50 120 240', 1500);
  const l1 = slice(f1);
  const statsRows = l1.filter(s => /\[AILog\] mob stats/.test(s)).map(s => s.trim());
  const speed3 = l1.filter(s => /movementSpeed=0\.3/.test(s)).length;

  // 2) tamed wolf -> expect vanilla row
  const f2 = srv.all.length;
  await cmd('etest wolf -40 120 240 true', 1200);
  const l2 = slice(f2);
  const wolfRow = (l2.find(s => /wolf probe/.test(s)) || '').trim();
  // Numeric parse: float speed prints as 0.30000001192092896, and a wolf tamed via the
  // probe keeps its pre-tame 8.0 health while maxHealth jumps to the vanilla 20.0.
  const wm = wolfRow.match(/hp=([\d.]+) max=([\d.]+) attack=([\d.]+) follow=([\d.]+) speed=([\d.eE+-]+)/);
  const wv = wm ? { hp: Number(wm[1]), max: Number(wm[2]), attack: Number(wm[3]), follow: Number(wm[4]), speed: Number(wm[5]) } : null;
  const wolfVanilla = !!wv && wv.max === 20 && wv.attack === 4 && wv.follow === 16 && Math.abs(wv.speed - 0.3) < 1e-3;

  // 3) addgrowth -> expect +20
  await cmd('summon minecraft:pig -55 120 240 {Age:-24000,NoAI:1b}', 800);
  const f3 = srv.all.length;
  await cmd('etest addgrowth 1', 900);
  const l3 = slice(f3);
  const growRow = (l3.find(s => /addGrowth kind=EntityPig/.test(s)) || '').trim();
  const m = growRow.match(/before=(-?\d+) after=(-?\d+)/);
  const delta = m ? Number(m[2]) - Number(m[1]) : null;

  console.log('[W5]', JSON.stringify({
    mobStatsRows: statsRows.length, speed03Rows: speed3,
    wolfRow, wolfParsed: wv, wolfVanilla, growRow, growDelta: delta,
    pass: statsRows.length === 0 && speed3 === 0 && wolfVanilla && delta === 20
  }));
  if (statsRows.length) console.log('[W5-sample]', JSON.stringify(statsRows.slice(0, 3)));

  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = statsRows.length === 0 && speed3 === 0 && wolfVanilla && delta === 20;
  console.log('[done]', JSON.stringify({ run: 'w5', pass, bad: pass ? 0 : 1 }));
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
