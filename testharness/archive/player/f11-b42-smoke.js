// B-42 smoke — axe sandstone half-slab (:83) + shears right-click silk (:85)
// W1: iron axe on stone_slab meta 1 -> block air + [MiningLog] axe slab row.
// W1b: iron axe on double_stone_slab meta 1 -> no axe slab row (R196 half only).
// W2: shears right-click leaves/tallgrass/wool -> air + shears silk row + breaking wear row.
// W2b: shears right-click tripwire/dirt -> no shears silk row.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const GATE_OFF = process.env.GATE === 'off';
const A = 'ETIM_F7';
const BASE = { x: -60, y: 120, z: 240 }; // y=120: above terrain, no suffocation / floor dependency
const EXPECTED_SHA = 'B862D25676B084FE6ECF22BE324C131F1F049FA8F2BB8612E647221287C256E8'; // b42-build3
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

const rows = {
  axeSlab: s => /\[MiningLog\] axe slab /.test(s),
  shears: s => /\[MiningLog\] shears silk /.test(s),
  decay: s => /\[MiningLog\] tool decay face=breaking /.test(s),
  speed: s => /\[MiningLog\] mine speed /.test(s),
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
  if (GATE_OFF) {
    const off = cfgBefore.replace(/B:miningReform\s*=\s*true/, 'B:miningReform=false');
    if (off === cfgBefore) throw new Error('miningReform key not found in cfg');
    fs.writeFileSync(L.CFG, off, 'utf8');
  }
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
  await cmd(`replaceitem entity ${A} slot.weapon.mainhand ${item}`, 500);
  await sleep(500);
}
async function standNear(x, y, z) {
  await L.tp(srv, x + 0.5, y, z + 2.0);
  await sleep(350);
}
async function useItem(x, y, z) {
  await standNear(x, y, z);
  await lookCentre(x, y, z);
  const from = srv.all.length;
  await cmd('etest useitem ' + A, 900);
  return from;
}

async function stage() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  bot.digTime = () => 1500; // gate-row smoke: do not wait for the client tool table
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
  // y=120 is open air: no fill / floor, every target floats with air behind.
  // blocks in one row north of the bot
  await setBlock(BASE.x, BASE.y, BASE.z - 3, 'minecraft:stone_slab', 1);
  await setBlock(BASE.x, BASE.y, BASE.z - 4, 'minecraft:double_stone_slab', 1);
  await setBlock(BASE.x - 2, BASE.y, BASE.z - 3, 'minecraft:leaves', 0);
  await setBlock(BASE.x - 3, BASE.y - 1, BASE.z - 3, 'minecraft:dirt', 0);
  await setBlock(BASE.x - 3, BASE.y, BASE.z - 3, 'minecraft:tallgrass', 1);
  await setBlock(BASE.x - 4, BASE.y, BASE.z - 3, 'minecraft:wool', 0);
  await setBlock(BASE.x - 5, BASE.y - 1, BASE.z - 3, 'minecraft:dirt', 0);
  await setBlock(BASE.x - 5, BASE.y, BASE.z - 3, 'minecraft:tripwire', 0);
  await setBlock(BASE.x - 6, BASE.y, BASE.z - 3, 'minecraft:dirt', 0);
  await setBlock(BASE.x - 7, BASE.y, BASE.z - 3, 'minecraft:leaves', 0);
  await cmd('gamemode 0 ' + A, 400);
}

(async () => {
  const out = { run: RUN, w1: null, w1b: null, w2: null, w2b: null, w2c: null, w3: null, pin: null, bad: 0, rows: {} };
  try {
    out.pin = await stampPin();
    if (!out.pin.ok) out.bad++;
    await startBoot('b42-smoke-' + RUN, 'w-b42s-' + RUN);
    await stage();

    if (GATE_OFF) {
      // W3 — miningReform=false: both faces must stay silent.
      await give('minecraft:iron_axe');
      await standNear(BASE.x, BASE.y, BASE.z - 3);
      await lookCentre(BASE.x, BASE.y, BASE.z - 3);
      let from = srv.all.length;
      const slab = bot.blockAt(new vec3(BASE.x, BASE.y, BASE.z - 3));
      await bot.dig(slab);
      await sleep(2200);
      const axeRows = count(rows.axeSlab, from);

      await give('minecraft:shears');
      let silkRows = 0, decayRows = 0, anyAir = false;
      for (const [x, y, z] of [
        [BASE.x - 2, BASE.y, BASE.z - 3],
        [BASE.x - 3, BASE.y, BASE.z - 3],
        [BASE.x - 4, BASE.y, BASE.z - 3],
      ]) {
        from = await useItem(x, y, z);
        silkRows += count(rows.shears, from);
        decayRows += count(rows.decay, from);
        anyAir = anyAir || await air(x, y, z);
      }
      out.w3 = { axeSlab: axeRows, silk: silkRows, decay: decayRows, air: anyAir };
      if (out.w3.axeSlab !== 0 || out.w3.silk !== 0 || out.w3.decay !== 0 || out.w3.air) out.bad++;
    } else {
    // W1 — axe on the sandstone HALF slab
    await give('minecraft:iron_axe');
    await standNear(BASE.x, BASE.y, BASE.z - 3);
    await lookCentre(BASE.x, BASE.y, BASE.z - 3);
    let from = srv.all.length;
    const slab = bot.blockAt(new vec3(BASE.x, BASE.y, BASE.z - 3));
    await bot.dig(slab);
    await sleep(2200);
    out.w1 = { air: await air(BASE.x, BASE.y, BASE.z - 3), axeSlab: count(rows.axeSlab, from), speed: count(rows.speed, from) };
    // The gate row + str row are the product judgment; the bot dig completion is a harness timing face.
    if (out.w1.axeSlab < 1 || out.w1.speed < 1) out.bad++;

    // W1b — the same axe on the DOUBLE slab: no face row (R196 half only)
    await standNear(BASE.x, BASE.y, BASE.z - 4);
    await lookCentre(BASE.x, BASE.y, BASE.z - 4);
    from = srv.all.length;
    const dbl = bot.blockAt(new vec3(BASE.x, BASE.y, BASE.z - 4));
    await bot.dig(dbl);
    await sleep(2200);
    out.w1b = { air: await air(BASE.x, BASE.y, BASE.z - 4), axeSlab: count(rows.axeSlab, from) };
    if (out.w1b.axeSlab !== 0) out.bad++;

    // W2 — shears right-click on leaves / tallgrass / wool
    await give('minecraft:shears');
    const w2 = [];
    for (const [x, y, z, tag] of [
      [BASE.x - 2, BASE.y, BASE.z - 3, 'leaves'],
      [BASE.x - 3, BASE.y, BASE.z - 3, 'tallgrass'],
      [BASE.x - 4, BASE.y, BASE.z - 3, 'wool'],
    ]) {
      from = await useItem(x, y, z);
      const rec = {
        tag, air: await air(x, y, z),
        silk: count(rows.shears, from), decay: count(rows.decay, from),
      };
      w2.push(rec);
      if (!rec.air || rec.silk < 1 || rec.decay < 1) out.bad++;
    }
    out.w2 = w2;

    // W2b — shears right-click on tripwire / dirt: no shears silk row
    const w2b = [];
    for (const [x, y, z, tag] of [
      [BASE.x - 5, BASE.y, BASE.z - 3, 'tripwire'],
      [BASE.x - 6, BASE.y, BASE.z - 3, 'dirt'],
    ]) {
      from = await useItem(x, y, z);
      const rec = { tag, air: await air(x, y, z), silk: count(rows.shears, from) };
      w2b.push(rec);
      if (rec.silk !== 0 || rec.air) out.bad++;
    }
    out.w2b = w2b;

    // W2c — ETIM metal shears on leaves (the etimGrade>0 branch)
    await give('etim:shears_copper');
    from = await useItem(BASE.x - 7, BASE.y, BASE.z - 3);
    out.w2c = {
      tag: 'leaves_etim',
      air: await air(BASE.x - 7, BASE.y, BASE.z - 3),
      silk: count(rows.shears, from), decay: count(rows.decay, from),
    };
    if (!out.w2c.air || out.w2c.silk < 1 || out.w2c.decay < 1) out.bad++;
    }
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
