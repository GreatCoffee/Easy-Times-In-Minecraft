// B-49 W3 — flag-off arm: livestockNeedsR196=false, mobDebugLog=true (so the absence
// of rows is meaningful). Fire /etest warnpeers and watch 60 s: expect zero
// [AILog] warnpeers rows and zero [AILog] panicflee src=cow rows.
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
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', 'w-b49s-w3'), 'allow-flight', 'true'), 'utf8');
  const cfg = cfgBefore
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true')
    .replace(/B:livestockNeedsR196\s*=\s*(true|false)/, 'B:livestockNeedsR196=false');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  note('cfg injected: livestockNeedsR196=false mobDebugLog=true');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: 'b49w3' });
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

  const from = srv.all.length;
  await cmd('etest warnpeers -50 120 240', 900);
  // Positive control for the log channel: the same boot must still emit some
  // [AILog] traffic from other AI faces (e.g. outofwater probes), otherwise a
  // silent log channel would make "zero rows" vacuous.
  const ctlFrom = srv.all.length;
  await sleep(60000);
  const lines = slice(from);
  const ctlLines = slice(ctlFrom);

  const warnRows = lines.filter(s => /\[AILog\] warnpeers src=EntityCow/.test(s)).map(s => s.trim());
  const probeRows = lines.filter(s => /\[AILog\] warnpeers probe id=/.test(s)).map(s => s.trim());
  const panicRows = lines.filter(s => /\[AILog\] panicflee src=cow start/.test(s)).map(s => s.trim());
  // The probe command itself prints one row per peer regardless of the flag; the
  // product face is the "warnpeers src=EntityCow peers=2" summary plus the peer
  // revenge copy. Only those two are judged.
  const peerRevenge = probeRows.filter(s => !/revenge=0 /.test(s) && !/dist=0\.00 /.test(s)).length;
  const anyAI = lines.filter(s => /\[AILog\]/.test(s)).length;
  const ctlAI = ctlLines.filter(s => /\[AILog\]/.test(s)).length;
  const cowSpawn = lines.filter(s => /Object successfully summoned|Summoned new Cow/.test(s)).length;

  // Summon one cow as a channel canary: if any [AILog] face still logs in this
  // boot, the channel is alive and the zero-rows result is meaningful.
  const canaryFrom = srv.all.length;
  await cmd('summon minecraft:cow -48 120 240', 2500);
  const canaryAI = slice(canaryFrom).filter(s => /\[AILog\]/.test(s)).length;

  const out = {
    warnSummaryRows: warnRows.length, probeRows: probeRows.length, peerRevenge,
    panicStartRows: panicRows.length,
    anyAIrows: anyAI, windowControlAIrows: ctlAI, canaryAIrows: canaryAI, cowSpawnRows: cowSpawn
  };
  const pass = warnRows.length === 0 && peerRevenge === 0 && panicRows.length === 0;
  console.log('[W3]', JSON.stringify({ ...out, pass }));
  if (warnRows.length) console.log('[W3-sample-warn]', JSON.stringify(warnRows.slice(0, 3)));
  if (panicRows.length) console.log('[W3-sample-panic]', JSON.stringify(panicRows.slice(0, 3)));

  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  console.log('[done]', JSON.stringify({ run: 'w3', pass, bad: pass ? 0 : 1 }));
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
