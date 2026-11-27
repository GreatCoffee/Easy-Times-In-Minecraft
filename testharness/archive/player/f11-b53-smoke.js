// B-53 smoke — pickup loop (food/repair/valuable), contained items, bat hang,
// livestock XP=0. Server log is the verdict channel; no client interaction.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
function slice(from) { return logLines().slice(from); }

function setCfgBool(cfg, key, value) {
  const re = new RegExp('B:' + key + '\\s*=\\s*(true|false)');
  if (re.test(cfg)) return cfg.replace(re, 'B:' + key + '=' + value);
  return cfg.replace(/(\r?\n)(\s*)B:mobDebugLog=(true|false)/,
    '$1$2B:mobDebugLog=$3$1$2B:' + key + '=' + value);
}

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const bytes = fs.readFileSync(jar);
  const sha = L.sha256(bytes).toUpperCase();
  const mk = L.mkCounts();
  const shaOk = sha === EXPECTED_SHA;
  const sizeOk = bytes.length === L.PIN.releaseSize;
  console.log(`[PIN] sha=${sha} expected=${EXPECTED_SHA} shaOk=${shaOk} size=${bytes.length} sizeOk=${sizeOk} ` +
    `mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},dual:${mk.refmapTmp.dual},` +
    `mixins:${mk.manifest.mixins},client:${mk.manifest.client}} mkOk=${mk.ok}`);
  return { sha, shaOk, sizeOk, mkOk: mk.ok, ok: shaOk && sizeOk && mk.ok };
}

async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore;
  for (const key of ['mobDebugLog', 'mobPickupR196', 'mobBatHangingR196', 'livestockXpR196']) {
    cfg = setCfgBool(cfg, key, 'true');
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
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
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
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doMobSpawning false', 'doMobLoot true', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 250);
  await cmd('time set 18000', 200);
  await cmd('tp ' + A + ' -50.5 120 240.5', 400);
  await cmd('fill -60 119 235 -30 119 250 minecraft:stone', 500);
  await cmd('fill -60 120 235 -30 124 250 minecraft:air', 500);
  await cmd('fill -60 125 238 -30 125 242 minecraft:stone', 400);
  await cmd('kill @e[type=!player]', 500);
  await cmd('kill @e[type=item]', 300);
}

async function main() {
  const tag = `b53-${RUN}`;
  await startBoot(tag, `w-b53-${RUN}`);
  const pin = await stampPin();
  await stage();

  // W1 zombie: food branch (undead gets no heal).
  const from1 = logLines().length;
  await cmd('summon minecraft:zombie -52.5 120 240.5 {PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}', 300);
  await cmd('summon minecraft:item -52.5 120 240.5 {Item:{id:"minecraft:porkchop",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const w1Lines = slice(from1);
  const w1Pick = w1Lines.filter(s => /\[PickupLog\] src=food/.test(s));
  const w1 = w1Pick.length >= 1 && /item=minecraft:porkchop/.test(w1Pick[0]);
  console.log('[w1-food]', JSON.stringify({ lines: w1Pick.length, sample: (w1Pick[0] || '').slice(0, 220), ok: w1 }));

  // W2 skeleton: repair branch (bone heals 50% max health).
  const from2 = logLines().length;
  await cmd('summon minecraft:skeleton -47.5 120 240.5 {PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}', 300);
  await cmd('etest hit @e[type=skeleton,c=1] 4 ETIM_F7', 500);
  await cmd('summon minecraft:item -47.5 120 240.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const w2Lines = slice(from2);
  const w2Pick = w2Lines.filter(s => /\[PickupLog\] src=repair/.test(s));
  let w2Heal = false;
  if (w2Pick[0]) {
    const m = w2Pick[0].match(/hpBefore=([\d.]+) hpAfter=([\d.]+)/);
    w2Heal = !!m && Number(m[2]) > Number(m[1]);
  }
  const w2 = w2Pick.length >= 1 && /item=minecraft:bone/.test(w2Pick[0]) && w2Heal;
  console.log('[w2-repair]', JSON.stringify({ lines: w2Pick.length, heal: w2Heal, sample: (w2Pick[0] || '').slice(0, 220), ok: w2 }));

  // W3 pigman: valuable branch + contained_items death drop.
  const from3 = logLines().length;
  await cmd('summon minecraft:zombie_pigman -42.5 120 240.5 {PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}', 300);
  await cmd('replaceitem entity @e[type=zombie_pigman,c=1] slot.weapon.mainhand minecraft:air', 300);
  await cmd('summon minecraft:item -42.5 120 240.5 {Item:{id:"minecraft:gold_ingot",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const w3Lines1 = slice(from3);
  const w3Pick = w3Lines1.filter(s => /\[PickupLog\] src=valuable/.test(s));
  const w3Contained = w3Pick.length >= 1 && /contained=1/.test(w3Pick[0]) && /item=minecraft:gold_ingot/.test(w3Pick[0]);
  const from3b = logLines().length;
  await cmd('etest hit @e[type=zombie_pigman,c=1] 1000 ETIM_F7', 1500);
  const w3Lines2 = slice(from3b);
  const w3Drop = w3Lines2.filter(s => /\[DropLog\] contained item=minecraft:gold_ingot/.test(s));
  const w3 = w3Contained && w3Drop.length >= 1;
  console.log('[w3-valuable]', JSON.stringify({
    pick: w3Pick.length, contained: w3Contained, drop: w3Drop.length,
    sample: (w3Pick[0] || '').slice(0, 220), ok: w3,
  }));

  // W4 bat: R196 hang then hurt release.
  const from4 = logLines().length;
  await cmd('summon minecraft:bat -37.5 124.1 240.5 {BatFlags:1b}', 500);
  await sleep(2500);
  const w4Lines1 = slice(from4);
  const w4Hang = w4Lines1.filter(s => /\[BatLog\] hang blockY=125/.test(s));
  const from4b = logLines().length;
  await cmd('etest hit @e[type=bat,c=1] 1 ETIM_F7', 500);
  await sleep(1500);
  const w4Lines2 = slice(from4b);
  const w4Release = w4Lines2.filter(s => /\[BatLog\] release blockY=125/.test(s));
  const w4 = w4Hang.length >= 1 && w4Release.length >= 1;
  console.log('[w4-bat]', JSON.stringify({
    hang: w4Hang.length, release: w4Release.length,
    sample: (w4Hang[0] || '').slice(0, 220), ok: w4,
  }));

  // W5 livestock XP=0.
  const animals = [['cow', 'minecraft:cow', -52.5], ['pig', 'minecraft:pig', -47.5],
    ['sheep', 'minecraft:sheep', -42.5], ['chicken', 'minecraft:chicken', -37.5]];
  for (const [, type, x] of animals) {
    await cmd(`summon ${type} ${x} 120 245.5 {PersistenceRequired:1b}`, 300);
  }
  await sleep(1500);
  const w5 = {};
  for (const [kind] of animals) {
    const from = logLines().length;
    await cmd(`etest hit @e[type=${kind},c=1] 1000 ETIM_F7`, 900);
    await sleep(300);
    const lines = slice(from).filter(s => new RegExp(`\\[FarmLog\\] xp kind=${kind} value=0`).test(s));
    w5[kind] = lines.length >= 1;
    if (lines[0]) console.log(`[w5-${kind}]`, lines[0].slice(0, 220));
  }
  const w5ok = Object.values(w5).every(Boolean);
  console.log('[w5-xp]', JSON.stringify({ ...w5, ok: w5ok }));

  const st = await stopBoot();
  const pass = pin.ok && w1 && w2 && w3 && w4 && w5ok
    && st.exitCode === 0 && st.exited === true;
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, w1, w2, w3, w4, w5: w5ok, stop: st, pass }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(2);
});
