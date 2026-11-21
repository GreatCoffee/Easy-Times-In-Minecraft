// W-B53 verify: pickup loop (food/repair/valuable), contained items NBT roundtrip,
// bat hang/release, livestock XP=0, plus flag-off negative arms (W6).
// Verdict channel = server log only. No client interaction.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'v1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '53D249CB5D073E76F2FCBB619013CCC07DB5E95AE73C9907FD5D407E7E3AC56F';
const W1WORLD = 'w-b53-verify-v1';
const W2WORLD = 'w-b53-verify-v2';

let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const stops = [];

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
function slice(from) { return logLines().slice(from); }
function linesFrom(from) { return logLines().slice(from); }

function setCfgBool(cfg, key, value) {
  const re = new RegExp('B:' + key + '\\s*=\\s*(true|false)');
  if (re.test(cfg)) return cfg.replace(re, 'B:' + key + '=' + value);
  return cfg.replace(/(\r?\n)(\s*)B:mobDebugLog=(true|false)/,
    '$1$2B:mobDebugLog=$3$1$2B:' + key + '=' + value);
}

function cfgWith(flags) {
  let cfg = cfgBefore;
  for (const [k, v] of Object.entries(flags)) cfg = setCfgBool(cfg, k, String(v));
  return cfg;
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

async function startBoot(tag, world, flags) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  const cfg = cfgWith(flags);
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(mobPickupR196|mobBatHangingR196|livestockXpR196|mobDebugLog|mobDespawnR196)=\w+/g) || []).join(' ');
  console.log('[cfg]', world, eff);
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

async function stopBoot(restore) {
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  srv = null;
  stops.push(st);
  if (restore) {
    if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
    if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  }
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
  await cmd('weather clear', 150);
  await cmd('tp ' + A + ' -50.5 120 240.5', 400);
  await cmd('fill -60 119 235 -30 119 250 minecraft:stone', 500);
  await cmd('fill -60 120 235 -30 124 250 minecraft:air', 500);
  await cmd('fill -60 125 238 -30 125 242 minecraft:stone', 400);
  await cmd('kill @e[type=!player]', 500);
  await cmd('kill @e[type=item]', 300);
}

// ---------- arms ----------
async function armFood() {
  const from = logLines().length;
  await cmd('summon minecraft:zombie -52.5 120 240.5 {PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}', 300);
  await cmd('summon minecraft:item -52.5 120 240.5 {Item:{id:"minecraft:porkchop",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const pick = slice(from).filter(s => /\[PickupLog\] src=food/.test(s));
  const itemLeft = linesFrom(from).some(s => /cannot be found/i.test(s)) === false;
  const rec = {
    n: pick.length,
    porkchop: pick.some(s => /item=minecraft:porkchop/.test(s)),
    cooldown: pick.some(s => /cooldown=400/.test(s)),
    contained0: pick.some(s => /contained=0/.test(s)),
    sample: (pick[0] || '').slice(0, 240),
  };
  return rec;
}

async function armRepair() {
  const from = logLines().length;
  await cmd('summon minecraft:skeleton -47.5 120 240.5 {PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}', 300);
  await cmd('etest hit @e[type=skeleton,c=1] 4 ETIM_F7', 600);
  await cmd('summon minecraft:item -47.5 120 240.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const pick = slice(from).filter(s => /\[PickupLog\] src=repair/.test(s));
  const m = pick[0] && pick[0].match(/hpBefore=([\d.]+) hpAfter=([\d.]+)/);
  return {
    n: pick.length,
    bone: pick.some(s => /item=minecraft:bone/.test(s)),
    heal: !!m && Number(m[2]) > Number(m[1]),
    sample: (pick[0] || '').slice(0, 240),
  };
}

async function armValuable(persist) {
  const from = logLines().length;
  const tag = persist ? '{PersistenceRequired:1b,CanPickUpLoot:1b,NoAI:1b}' : '{CanPickUpLoot:1b,NoAI:1b}';
  await cmd(`summon minecraft:zombie_pigman -42.5 120 240.5 ${tag}`, 300);
  await cmd('replaceitem entity @e[type=zombie_pigman,c=1] slot.weapon.mainhand minecraft:air', 300);
  await cmd('summon minecraft:item -42.5 120 240.5 {Item:{id:"minecraft:gold_ingot",Count:1b},PickupDelay:0s}', 300);
  await sleep(2500);
  const pick = slice(from).filter(s => /\[PickupLog\] src=valuable/.test(s));
  return {
    n: pick.length,
    gold: pick.some(s => /item=minecraft:gold_ingot/.test(s)),
    contained1: pick.some(s => /contained=1/.test(s)),
    cooldown40: pick.some(s => /cooldown=40/.test(s)),
    sample: (pick[0] || '').slice(0, 240),
  };
}

async function armValuableDrop() {
  const from = logLines().length;
  await cmd('etest hit @e[type=zombie_pigman,c=1] 1000 ETIM_F7', 2000);
  await sleep(500);
  const drop = slice(from).filter(s => /\[DropLog\] contained item=minecraft:gold_ingot/.test(s));
  return { n: drop.length, sample: (drop[0] || '').slice(0, 240) };
}

async function armBat() {
  const from = logLines().length;
  await cmd('summon minecraft:bat -37.5 124.1 240.5 {BatFlags:1b}', 500);
  await sleep(2500);
  const hang = slice(from).filter(s => /\[BatLog\] hang blockY=125/.test(s));
  const from2 = logLines().length;
  await cmd('etest hit @e[type=bat,c=1] 1 ETIM_F7', 600);
  await sleep(1500);
  const rel = slice(from2).filter(s => /\[BatLog\] release blockY=125/.test(s));
  return { hang: hang.length, release: rel.length, sample: (hang[0] || '').slice(0, 240) };
}

async function armXp() {
  const animals = [['cow', 'minecraft:cow', -52.5], ['pig', 'minecraft:pig', -47.5],
    ['sheep', 'minecraft:sheep', -42.5], ['chicken', 'minecraft:chicken', -37.5]];
  for (const [, type, x] of animals) await cmd(`summon ${type} ${x} 120 245.5 {PersistenceRequired:1b}`, 300);
  await sleep(1500);
  const out = {};
  for (const [kind] of animals) {
    const from = logLines().length;
    await cmd(`etest hit @e[type=${kind},c=1] 1000 ETIM_F7`, 900);
    await sleep(300);
    const hit = slice(from).filter(s => new RegExp(`\\[FarmLog\\] xp kind=${kind} value=0`).test(s));
    const bad = slice(from).filter(s => new RegExp(`\\[FarmLog\\] xp kind=${kind} value=[1-9]`).test(s));
    out[kind] = { zero: hit.length, nonzero: bad.length, sample: (hit[0] || '').slice(0, 200) };
  }
  return out;
}

async function main() {
  // ---------- boot 1: W1-W5 (flags on) ----------
  await startBoot(`b53v-${RUN}-b1`, W1WORLD, {
    mobPickupR196: true, mobBatHangingR196: true, livestockXpR196: true, mobDebugLog: true, mobDespawnR196: true,
  });
  const pin = await stampPin();
  await stage();

  const w1 = await armFood();
  console.log('[W1]', JSON.stringify(w1));
  const w2 = await armRepair();
  console.log('[W2]', JSON.stringify(w2));
  const w3 = await armValuable(true);
  console.log('[W3-pick]', JSON.stringify(w3));
  const w3drop = await armValuableDrop();
  console.log('[W3-drop]', JSON.stringify(w3drop));
  const w4 = await armBat();
  console.log('[W4]', JSON.stringify(w4));
  const w5 = await armXp();
  console.log('[W5]', JSON.stringify(w5));
  const w5ok = Object.values(w5).every(o => o.zero >= 1 && o.nonzero === 0);
  await stopBoot(false);

  // ---------- boot 2: W6 flags off ----------
  await startBoot(`b53v-${RUN}-b2`, W2WORLD, {
    mobPickupR196: false, mobBatHangingR196: false, livestockXpR196: false, mobDebugLog: true, mobDespawnR196: true,
  });
  await stage();
  let from = logLines().length;
  await armFood();
  await armRepair();
  await armValuable(true);
  const w6pick = slice(from).filter(s => /\[PickupLog\]/.test(s)).length;
  const w6xp = await armXp();
  const w6xpRows = Object.values(w6xp).reduce((a, o) => a + o.zero + o.nonzero, 0);
  const w6bat = await armBat();
  console.log('[W6]', JSON.stringify({ pickup: w6pick, xp: w6xp, xpRows: w6xpRows, batHang: w6bat.hang, batRelease: w6bat.release }));
  await stopBoot(false);

  // ---------- boot 3: W7 part 1 (flags on, world v2) ----------
  await startBoot(`b53v-${RUN}-b3`, W2WORLD, {
    mobPickupR196: true, mobBatHangingR196: true, livestockXpR196: true, mobDebugLog: true, mobDespawnR196: true,
  });
  await stage();
  const w7pick = await armValuable(false);
  console.log('[W7-pick]', JSON.stringify(w7pick));
  await cmd('save-all', 1200);
  await stopBoot(false);

  // ---------- boot 4: W7 part 2 (post-restart drop) ----------
  await startBoot(`b53v-${RUN}-b4`, W2WORLD, {
    mobPickupR196: true, mobBatHangingR196: true, livestockXpR196: true, mobDebugLog: true, mobDespawnR196: true,
  });
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 400);
  await cmd('gamemode 1 ' + A, 200);
  await cmd('difficulty 1', 200);
  await cmd('tp ' + A + ' -42.5 120 241.5', 800);
  const alive = logLines().filter(s => /zombie_pigman/i.test(s)).length;
  const w7drop = await armValuableDrop();
  console.log('[W7-drop]', JSON.stringify({ ...w7drop, aliveRows: alive }));

  const st4 = await stopBoot(true);

  const pass =
    pin.ok && w1.n >= 1 && w1.porkchop && w1.cooldown && w1.contained0
    && w2.n >= 1 && w2.bone && w2.heal
    && w3.n >= 1 && w3.gold && w3.contained1 && w3drop.n >= 1
    && w4.hang >= 1 && w4.release >= 1
    && w5ok
    && w6pick === 0 && w6xpRows === 0 && w6bat.hang === 0
    && w7pick.n >= 1 && w7pick.contained1 && w7drop.n >= 1
    && stops.every(s => s.exitCode === 0 && s.exited === true);

  console.log('[done]', JSON.stringify({
    run: RUN, pin: pin.ok,
    w1: w1.n, w2: w2.n, w3: w3.n, w3drop: w3drop.n,
    w4hang: w4.hang, w4rel: w4.release,
    w5ok, w6pick, w6xpRows, w6bat: w6bat.hang,
    w7pick: w7pick.n, w7cont: w7pick.contained1, w7drop: w7drop.n,
    stops, pass,
  }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (srv) await stopBoot(true); } catch (x) { /* noop */ }
  process.exit(2);
});
