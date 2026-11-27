// B-54 smoke: R196 chunk-populate world-gen spawn pass.
// Arms (verdict channel = server log only, no client interaction):
//   W1 bulk pass spawns animals (batch creature>0 at a land biome)
//   W2 horse 0.8 / wolf 0.5 group dice measured as a rate over bulk passes
//   W3 animals_spawned cap 4 rejects the 5th animal (batch capReject>0, wgstate=4)
//   W4 aquatic pass spawns squids and seeds idle -9600 (batch aquatic>0, aquaticSeeds>0)
//   W5 headroom predicate (wghead prevented=false -> true after a roof block)
//   W6 natural hook: new chunks populate through the mixin (hook dim=0 center=)
//   W7 animals_spawned NBT round-trip (set 3 -> restart -> 3)
//   W8 flag off: hook ... flag=false skip and probe skipped, zero spawn rows
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const W1WORLD = 'w-b54-' + RUN + '-v1';
const W2WORLD = 'w-b54-' + RUN + '-v2';

let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const stops = [];

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
  fs.writeFileSync(L.CFG, cfgWith(flags), 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(mobWorldGenSpawnR196|mobDebugLog)=\w+/g) || []).join(' ');
  console.log('[cfg]', world, eff);
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) return;
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
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 0', 200);
  await cmd('time set 1000', 200);
  await cmd('weather clear', 150);
  await cmd('tp ' + A + ' 0.5 120 0.5', 400);
  await cmd('kill @e[type=!player]', 500);
}

// ---------- helpers ----------
const PASS_RE = /\[WorldGenSpawnLog\] pass biome=(\S+) chunk=\((-?\d+),(-?\d+)\) chance=(\S+) creature_spawned=(\d+) aquatic_spawned=(\d+)/;
const BATCH_RE = /\[WorldGenSpawnLog\] batch at \((-?\d+),(-?\d+)\) biome=(\S+) repeat=(\d+) creature=(\d+) aquatic=(\d+) groups=(\d+) horsePick=(\d+) horseReject=(\d+) wolfPick=(\d+) wolfReject=(\d+) landReject=(\d+) capReject=(\d+) headroom=(\d+) aquaticSeeds=(\d+) cg=(\d+) ag=(\d+)/;

function parsePasses(rows) {
  return rows.map(s => PASS_RE.exec(s)).filter(Boolean).map(m => ({
    biome: m[1], cx: +m[2], cz: +m[3], chance: +m[4], creature: +m[5], aquatic: +m[6],
  }));
}
function parseBatch(rows) {
  const m = rows.map(s => BATCH_RE.exec(s)).filter(Boolean).pop();
  if (!m) return null;
  return {
    biome: m[3], repeat: +m[4], creature: +m[5], aquatic: +m[6], groups: +m[7],
    horsePick: +m[8], horseReject: +m[9], wolfPick: +m[10], wolfReject: +m[11],
    landReject: +m[12], capReject: +m[13], headroom: +m[14], aquaticSeeds: +m[15], cg: +m[16], ag: +m[17],
  };
}

async function wg(x, z, seed, repeat) {
  const from = logLines().length;
  await cmd(`etest wgspawn ${x} ${z} ${seed} ${repeat || 1}`, repeat && repeat > 1 ? 2500 : 800);
  const rows = slice(from);
  return { rows, batch: parseBatch(rows), passes: parsePasses(rows) };
}

async function biomeAt(x, z) {
  const from = logLines().length;
  await cmd(`etest wgbiome ${x} ${z}`, 250);
  const m = slice(from).map(s => /\[WorldGenSpawnLog\] biome at \(-?\d+,-?\d+\) = (\S+) creature=(\d+) aquatic=(\d+)/.exec(s)).filter(Boolean)[0];
  return m ? { biome: m[1], creature: +m[2], aquatic: +m[3] } : null;
}

const GRID = [];
for (const x of [0, 256, 512, 768, 1024, 1280, -256, -512, -768, -1024]) {
  for (const z of [0, 256, 512, -256, -512]) GRID.push([x, z]);
}

async function findBiome(test) {
  for (const [x, z] of GRID) {
    const b = await biomeAt(x, z);
    if (b && test(b)) return { x, z, ...b };
  }
  return null;
}

// ---------- boot 1 ----------
async function boot1(pin) {
  await startBoot(`b54-${RUN}-b1`, W1WORLD, { mobDebugLog: true, mobWorldGenSpawnR196: true });
  await stage();

  // W2 dice rates: plains carries horse, taiga/forest carries wolf
  const plains = await findBiome(b => /plains$/.test(b.biome) && b.creature > 0);

  // W1 bulk pass on open grass (a forest column is usually a tree trunk, which
  // R196 rejects the same way, so plains is the honest land arm)
  let w1 = { land: !!plains, batch: null };
  if (plains) {
    await cmd(`etest wgstate ${plains.x} ${plains.z} 0`, 300);
    const r = await wg(plains.x, plains.z, 9001, 60);
    w1.batch = r.batch;
  }
  console.log('[W1]', JSON.stringify(w1));
  let w2 = { plains: false, horse: null, wolf: null };
  if (plains) {
    await cmd(`etest wgstate ${plains.x} ${plains.z} 0`, 300);
    const r = await wg(plains.x, plains.z, 7001, 4000);
    w2.plains = true;
    w2.horse = r.batch && {
      picks: r.batch.horsePick, rejects: r.batch.horseReject,
      raw: r.batch.horseReject + '/' + r.batch.horsePick,
      rejectRate: r.batch.horsePick ? +(r.batch.horseReject / r.batch.horsePick).toFixed(3) : null,
    };
  }
  const wolfB = await findBiome(b => /(taiga|forest)$/.test(b.biome) && b.creature > 0);
  if (wolfB) {
    await cmd(`etest wgstate ${wolfB.x} ${wolfB.z} 0`, 300);
    const r = await wg(wolfB.x, wolfB.z, 8001, 4000);
    w2.wolf = r.batch && {
      biome: wolfB.biome, picks: r.batch.wolfPick, rejects: r.batch.wolfReject,
      raw: r.batch.wolfReject + '/' + r.batch.wolfPick,
      rejectRate: r.batch.wolfPick ? +(r.batch.wolfReject / r.batch.wolfPick).toFixed(3) : null,
    };
  }
  console.log('[W2]', JSON.stringify(w2));

  // W3 animal cap
  let w3 = { staged: 0, spawns: 0, capRejects: 0, animals: -1 };
  if (plains) {
    await cmd(`etest wgstate ${plains.x} ${plains.z} 0`, 300);
    const r = await wg(plains.x, plains.z, 9101, 400);
    w3.spawns = r.batch ? r.batch.creature : 0;
    w3.capRejects = r.batch ? r.batch.capReject : 0;
    const from = logLines().length;
    await cmd(`etest wgstate ${plains.x} ${plains.z}`, 500);
    const st = slice(from).map(t => /animals=(\d+)/.exec(t)).filter(Boolean)[0];
    w3.animals = st ? +st[1] : -1;
  }
  console.log('[W3]', JSON.stringify(w3));

  // W4 aquatic
  const water = await findBiome(b => /(ocean)$/.test(b.biome)) || await findBiome(b => /(river)$/.test(b.biome));
  let w4 = { water: !!water };
  if (water) {
    w4.batch = (await wg(water.x, water.z, 9901, 400)).batch;
  }
  console.log('[W4]', JSON.stringify(w4));

  // W5 headroom predicate
  await cmd('fill 200 119 200 200 119 200 minecraft:stone', 300);
  await cmd('fill 200 120 200 200 126 200 minecraft:air', 300);
  let from = logLines().length;
  await cmd('etest wghead 200 120 200', 400);
  const headOpen = slice(from).some(t => /headroom at BlockPos\{x=200, y=120, z=200\} blocksHigh=\d+ prevented=false/.test(t));
  await cmd('setblock 200 121 200 minecraft:stone', 300);
  from = logLines().length;
  await cmd('etest wghead 200 120 200', 400);
  const headBlocked = slice(from).some(t => /headroom at BlockPos\{x=200, y=120, z=200\} blocksHigh=\d+ prevented=true/.test(t));
  const w5 = { headOpen, headBlocked };
  console.log('[W5]', JSON.stringify(w5));

  // W6 natural hook on fresh chunks
  from = logLines().length;
  await cmd('tp ' + A + ' 4000.5 140 4000.5', 1200);
  await sleep(6000);
  const hooks = slice(from).filter(t => /\[WorldGenSpawnLog\] hook dim=0 center=/.test(t));
  const natAnimal = slice(from).filter(t => /\[WorldGenSpawnLog\] spawn type=CREATURE cls=Entity(Sheep|Pig|Cow|Chicken|Wolf|Horse|Ocelot)\b/.test(t));
  const natAquatic = slice(from).filter(t => /\[WorldGenSpawnLog\] spawn type=WATER_CREATURE/.test(t));
  const w6 = { hooks: hooks.length, animals: natAnimal.length, aquatics: natAquatic.length,
    sample: (natAnimal[0] || '').slice(0, 160) };
  console.log('[W6]', JSON.stringify(w6));

  // stage the NBT round-trip counter
  const stageX = plains ? plains.x : 0, stageZ = plains ? plains.z : 0;
  await cmd(`etest wgstate ${stageX} ${stageZ} 3`, 400);
  await cmd('save-all flush', 2500);
  return { pin, w1, w2, w3, w4, w5, w6, stage: { x: stageX, z: stageZ } };
}

// ---------- main ----------
async function main() {
  const pin = await stampPin();
  const r1 = await boot1(pin);
  await stopBoot(false);

  // ---------- boot 2: W7 NBT round-trip ----------
  await startBoot(`b54-${RUN}-b2`, W1WORLD, { mobDebugLog: true, mobWorldGenSpawnR196: true });
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd(`etest wgstate ${r1.stage.x} ${r1.stage.z}`, 800);
  const w7row = logLines().map(t => /\[WorldGenSpawnLog\] state chunk=\((-?\d+),(-?\d+)\) animals=(\d+)/.exec(t)).filter(Boolean).pop();
  const w7 = { animals: w7row ? +w7row[3] : -1 };
  console.log('[W7]', JSON.stringify(w7));
  await stopBoot(false);

  // ---------- boot 3: W8 flag off ----------
  await startBoot(`b54-${RUN}-b3`, W2WORLD, { mobDebugLog: true, mobWorldGenSpawnR196: false });
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  await cmd('gamerule doMobSpawning false', 200);
  let from = logLines().length;
  await cmd('tp ' + A + ' 4000.5 140 4000.5', 1200);
  await sleep(6000);
  const skipHooks = slice(from).filter(t => /\[WorldGenSpawnLog\] hook dim=0 flag=false skip/.test(t));
  const hookLines = slice(from).filter(t => /\[WorldGenSpawnLog\] hook dim=0 center=/.test(t)).length;
  from = logLines().length;
  await cmd('etest wgspawn 0 0 5', 600);
  const skipProbe = slice(from).filter(t => /skipped flag=false/.test(t)).length;
  const offSpawns = slice(from).filter(t => /\[WorldGenSpawnLog\] (spawn|batch)/.test(t)).length;
  const w8 = { skipHooks: skipHooks.length, hookLines, skipProbe, spawns: offSpawns };
  console.log('[W8]', JSON.stringify(w8));
  await stopBoot(true);

  const horseRate = r1.w2.horse && r1.w2.horse.rejectRate;
  const wolfRate = r1.w2.wolf && r1.w2.wolf.rejectRate;
  const pass =
    pin.ok
    && r1.w1.land && r1.w1.batch && r1.w1.batch.creature >= 1
    && r1.w2.plains && r1.w2.horse && r1.w2.horse.picks >= 20
    && horseRate >= 0.5 && horseRate <= 0.95
    && r1.w2.wolf && r1.w2.wolf.picks >= 20 && wolfRate >= 0.3 && wolfRate <= 0.7
    && r1.w3.capRejects >= 1 && r1.w3.animals === 4 && r1.w3.spawns >= 1
    && r1.w4.water && r1.w4.batch && r1.w4.batch.aquatic >= 1 && r1.w4.batch.aquaticSeeds >= 1
    && r1.w5.headOpen && r1.w5.headBlocked
    && r1.w6.hooks >= 1 && r1.w6.animals >= 3
    && w7.animals === 3
    && w8.skipHooks >= 1 && w8.hookLines === 0 && w8.skipProbe >= 1 && w8.spawns === 0
    && stops.every(s => s.exitCode === 0 && s.exited === true);

  console.log('[done]', JSON.stringify({
    run: RUN, pin: pin.ok,
    w1: r1.w1.batch && { creature: r1.w1.batch.creature, groups: r1.w1.batch.groups, biome: r1.w1.batch.biome },
    w2: r1.w2, w3: r1.w3,
    w4: r1.w4.batch && { aquatic: r1.w4.batch.aquatic, seeds: r1.w4.batch.aquaticSeeds, biome: r1.w4.batch.biome },
    w5: r1.w5, w6: r1.w6,
    w7: w7.animals, w8,
    stops, pass,
  }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (srv) await stopBoot(true); } catch (x) { /* noop */ }
  process.exit(2);
});
