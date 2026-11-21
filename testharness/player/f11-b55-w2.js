// B-55 W2 focused probe: does the vampire acquire, chase and bite the bot?
// Verdict channel = server log only.  Run: RUN=w2a node f11-b55-w2.js
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');

const RUN = process.env.RUN || 'w2a';
const A = 'ETIM_F7';
const WORLD = 'w-b55w2-' + RUN + '-v1';

let bot = null, srv = null, cfgBefore = null;

function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }

async function main() {
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const cfg = cfgBefore
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true')
    .replace(/B:mobBatFamilyR196\s*=\s*(true|false)/, 'B:mobBatFamilyR196=true')
    .replace(/B:mobWorldGenSpawnR196\s*=\s*(true|false)/, 'B:mobWorldGenSpawnR196=false');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  const props = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(props, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');

  srv = await L.startServer({ root: L.ROOT, tag: 'b55w2' });
  if (!(await srv.waitFor(/Done \(/, 180000))) throw new Error('no Done(');

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 200);
  await cmd('weather clear', 150);
  await cmd('time set 18000', 200);
  await cmd('gamemode 0 ' + A, 300);
  await cmd('tp ' + A + ' 0.5 120 0.5', 400);
  await cmd('effect ' + A + ' minecraft:resistance 120 4 true', 200);
  const from = logLines().length;
  await cmd('etest bat vampire 0 120 6', 600);
  await sleep(45000);
  const rows = logLines().slice(from);
  const pick = re => rows.filter(s => re.test(s));
  const targets = pick(/\[BatMobLog\] vampire target/);
  const chases = pick(/\[BatMobLog\] chase/);
  const bites = pick(/\[BatMobLog\] bite/);
  const last = arr => arr.length ? arr[arr.length - 1] : null;
  console.log('[W2probe]', JSON.stringify({
    targets: targets.length, chases: chases.length, bites: bites.length,
    firstTarget: targets.length ? targets[0].split('] ').pop() : null,
    lastChase: last(chases) ? last(chases).split('] ').pop() : null,
    lastBite: last(bites) ? last(bites).split('] ').pop() : null,
    botHealth: (await (async () => (bot ? bot.health : null))())
  }));
  try { bot.quit(); } catch (e) { /* noop */ }
  const st = await srv.stop();
  console.log('[stop]', JSON.stringify(st));
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(L.PROPS, props, 'utf8');
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (bot) bot.quit(); } catch (_) { /* noop */ }
  try { if (srv) await srv.stop(); } catch (_) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (_) { /* noop */ }
  process.exit(1);
});
