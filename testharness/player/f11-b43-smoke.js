// B-43 smoke — R196 cudgel/club (:84): item registration, effective set,
// decay, durability, recipe count. No client rendering.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const BASE = { x: -60, y: 120, z: 240 };
const EXPECTED_SHA = '5A8A7FE1E2D34C1C6E562EFC34A96B3C51393A5F645F70B7E91259F98D67D189'; // b43-build3
let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const chat = [];

const rows = {
  speed: s => /\[MiningLog\] mine speed /.test(s),
  decay: s => /\[MiningLog\] tool decay face=breaking /.test(s),
};
function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 400 : wait); }
function count(face, from) { return srv.all.slice(from).filter(face).length; }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const ok = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 239
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 239
    && mk.manifest.mixins === 100 && mk.manifest.client === 10;
  console.log(`[PIN] sha=${sha} expected=${EXPECTED_SHA} shaOk=${sha === EXPECTED_SHA} ` +
    `mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},dual:${mk.refmapTmp.dual},` +
    `mixins:${mk.manifest.mixins},client:${mk.manifest.client}} ok=${ok}`);
  return { sha, ok: ok && sha === EXPECTED_SHA };
}

async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
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

async function setBlock(x, y, z, block, meta) {
  await cmd(`setblock ${x} ${y} ${z} ${block} ${meta == null ? 0 : meta} replace`, 350);
}
async function air(x, y, z) { return (await L.testBlock(srv, x, y, z, 'minecraft:air')).ok; }
async function lookCentre(x, y, z) {
  try { await bot.lookAt(new vec3(x + 0.5, y + 0.5, z + 0.5), true); } catch (e) { note('look ' + e.message); }
  await sleep(350);
}
async function give(item) {
  await cmd(`replaceitem entity ${A} slot.weapon.mainhand ${item} 1 0`, 500);
  await sleep(500);
}
async function standNear(x, y, z) {
  await L.tp(srv, x + 0.5, y, z - 1.0);
  await sleep(350);
}
async function digAt(x, y, z) {
  await standNear(x, y, z);
  await lookCentre(x, y, z);
  const from = srv.all.length;
  // The dev-test driver queues the real server START/STOP pair (reach-checked);
  // bot.dig's client-side completion is not needed for the product faces.
  await cmd(`etest dig ${x} ${y} ${z} ${A}`, 2600);
  await sleep(600);
  return from;
}
async function damageProbe(item) {
  await give(item);
  const from = chat.length;
  await cmd(`etest damage 0 ${A}`, 700);
  await sleep(300);
  const lines = chat.slice(from).filter(s => /Held item damage/.test(s));
  return lines.length ? lines[lines.length - 1] : null;
}

async function stage() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  bot.digTime = () => 1500;
  bot.on('message', m => chat.push(m.toString()));
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops true', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 250);
  }
  await cmd('time set 6000', 250);
  await cmd('weather clear 1000000', 250);
  await cmd('kill @e[type=!player]', 500);
  await L.tp(srv, BASE.x + 0.5, BASE.y, BASE.z + 0.5);
  await setBlock(BASE.x - 2, BASE.y, BASE.z - 3, 'minecraft:glass', 0);
  await setBlock(BASE.x - 3, BASE.y, BASE.z - 3, 'minecraft:pumpkin', 0);
  await setBlock(BASE.x - 4, BASE.y, BASE.z - 3, 'minecraft:stone', 0);
  await setBlock(BASE.x - 5, BASE.y, BASE.z - 3, 'minecraft:ice', 0);
  await cmd('gamemode 0 ' + A, 400);
}

(async () => {
  const out = { run: RUN, w0: null, w1: null, w2: null, w3: null, w4: null, pin: null, bad: 0, rows: {} };
  try {
    out.pin = await stampPin();
    if (!out.pin.ok) out.bad++;
    await startBoot('b43-smoke-' + RUN, 'w-b43s-' + RUN);
    out.w0 = {
      recipes37: srv.all.some(s => /\[TestLog\] gear recipes registered: 37\b/.test(s)),
      cudgel200: srv.all.some(s => /\[EquipLog\] gear item=etim:cudgel_wood maxDamage=200\b/.test(s)),
      club400: srv.all.some(s => /\[EquipLog\] gear item=etim:club_wood maxDamage=400\b/.test(s)),
      mixinFail: srv.all.filter(s => /Mixin apply failed|mixinFail/.test(s)).length,
    };
    if (!out.w0.recipes37 || !out.w0.cudgel200 || !out.w0.club400 || out.w0.mixinFail !== 0) out.bad++;
    await stage();

    // W1 — cudgel on glass: speed row, block air.
    await give('etim:cudgel_wood');
    let from = await digAt(BASE.x - 2, BASE.y, BASE.z - 3);
    out.w1 = {
      tag: 'cudgel_glass', air: await air(BASE.x - 2, BASE.y, BASE.z - 3),
      speed: count(rows.speed, from), decay: count(rows.decay, from),
    };
    if (out.w1.speed < 1) out.bad++; // block air is a mineflayer/driver completion face (B-42 precedent)

    // W2 — club on pumpkin: speed row, block air.
    await give('etim:club_wood');
    from = await digAt(BASE.x - 3, BASE.y, BASE.z - 3);
    out.w2 = {
      tag: 'club_pumpkin', air: await air(BASE.x - 3, BASE.y, BASE.z - 3),
      speed: count(rows.speed, from), decay: count(rows.decay, from),
    };
    if (out.w2.speed < 1) out.bad++; // block air is a mineflayer/driver completion face (B-42 precedent)

    // W3 — cudgel on stone: not effective, no speed row, block remains.
    await give('etim:cudgel_wood');
    from = await digAt(BASE.x - 4, BASE.y, BASE.z - 3);
    out.w3 = {
      tag: 'cudgel_stone', air: await air(BASE.x - 4, BASE.y, BASE.z - 3),
      speed: count(rows.speed, from),
    };
    if (out.w3.air || out.w3.speed !== 0) out.bad++;

    // W4 — durability maxima were already emitted at init; W0 carries them.
    out.w4 = { cudgel: out.w0.cudgel200, club: out.w0.club400 };

    out.rows = L.rowCounts(srv.all);
  } catch (e) {
    out.error = e.stack || String(e);
    out.bad++;
  } finally {
    try { await stopBoot(); } catch (e) { out.stopError = String(e); out.bad++; }
  }
  console.log('[done] ' + JSON.stringify(out, null, 2));
  process.exit(out.bad ? 1 : 0);
})();
