// B-50 smoke — R196 wide-mob four-offset placement (census D :234-265) and
// the equipped-mob despawn hold (:776). The wide probe builds an unspawned
// spider (width 1.4): open air must accept the centre, a stone block on the
// east face must force the -x retry, and walls on both sides must reject all
// five spots. The equipped probe reports the shared hasContainedItems gate.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '6A4B565BE6B31513F8E17D4C0BF0130304AB1643D908A04981EC434D95675E76';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const countsOk = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 242
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 242
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
  for (const [key, value] of [['mobDebugLog', 'true'], ['mobDespawnR196', 'true']]) {
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
  await cmd('tp ' + A + ' -60.5 120 240.5', 300);
  await cmd('fill -56 119 236 -44 126 244 air', 500);
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b50-${RUN}`, `w-b50s-${RUN}`);
  await stage();

  const bootLines = srv.all;
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W1: open air — the centre is accepted, no retry row.
  const from1 = srv.all.length;
  await cmd('etest wide -50 120 240', 700);
  const w1 = slice(from1);
  const openPlaced = (w1.find(s => /wide-probe placed=/.test(s)) || '').match(/placed=([^ ]+)/);
  const openRetry = has(w1, /wide-retry/);
  const w1ok = !!openPlaced && openPlaced[1] !== 'null' && !openRetry;

  // W2: a stone block on the east face makes the centre collide; the -x
  // offset is the first free spot.
  const from2 = srv.all.length;
  await cmd('setblock -49 120 240 minecraft:stone', 300);
  await cmd('setblock -49 121 240 minecraft:stone', 300);
  await cmd('etest wide -50 120 240', 700);
  const w2 = slice(from2);
  const retry = w2.find(s => /wide-retry/.test(s)) || '';
  const w2ok = /offset=-x/.test(retry) && /placed=-50\.00,120\.00,240\.50/.test(w2.join('\n'));

  // W3: walls on both x faces make all five spots collide.
  const from3 = srv.all.length;
  await cmd('setblock -51 120 240 minecraft:stone', 300);
  await cmd('setblock -51 121 240 minecraft:stone', 300);
  await cmd('etest wide -50 120 240', 700);
  const w3 = slice(from3);
  const reject = w3.find(s => /wide-gate reject/.test(s)) || '';
  const w3ok = /placed=null/.test(w3.join('\n')) && /wide-gate reject/.test(reject);

  // W4: equipped probe — sword true, bare false.
  const from4 = srv.all.length;
  await cmd('etest equipped -50 120 240 true', 500);
  await cmd('etest equipped -50 120 240 false', 500);
  const w4 = slice(from4).filter(s => /equipped-probe contained=/.test(s));
  const w4ok = w4.some(s => /contained=true/.test(s)) && w4.some(s => /contained=false/.test(s));

  // W5: an equipped zombie 60 blocks away in a sealed chamber. Its idle
  // counter passes 200, the kill distance is met, but the equipment gate must
  // hold it and emit the equipped wall row instead of a kill row.
  const from5 = srv.all.length;
  await cmd('difficulty 2', 300);
  await cmd('time set 18000', 300);
  await cmd('fill -61 119 179 -59 121 181 minecraft:stone', 400);
  await cmd('fill -60 120 180 -60 121 180 minecraft:air', 400);
  await cmd('summon zombie -59.5 120 180.5 {HandItems:[{id:"minecraft:iron_sword",Count:1b},{}],ArmorItems:[{},{},{},{id:"minecraft:iron_helmet",Count:1b}],CustomName:"b50eq"}', 600);
  await sleep(14000);
  const w5 = slice(from5);
  const equippedRows = w5.filter(s => /wall=equipped/.test(s)).length;
  const w5Kills = w5.filter(s => /\[AILog\] mob despawn kill/.test(s)).length;
  const w5ok = equippedRows >= 1 && w5Kills === 0;

  const pass = pin.ok && mixinFail === 0 && w1ok && w2ok && w3ok && w4ok && w5ok;
  console.log('[W1]', JSON.stringify({ placed: openPlaced ? openPlaced[1] : null, retry: openRetry }));
  console.log('[W2]', JSON.stringify({ offset: /offset=([^ ]+)/.exec(retry) ? /offset=([^ ]+)/.exec(retry)[1] : null }));
  console.log('[W3]', JSON.stringify({ rejected: !!reject }));
  console.log('[W4]', JSON.stringify({ rows: w4.length }));
  console.log('[W5]', JSON.stringify({ equipped: equippedRows, kills: w5Kills }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
