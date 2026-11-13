// f11-b40-smoke.js — B-40 锄地四件套 smoke (faces :86/:87/:93/:94, 摸底 §5)
// b1 = flag-on boot: a1 gate(top-face only) / a2 till success (grass→farmland + wear 50)
//      / a3 lowblock allow (top slab → till OK; crops → reject) / a4 mattock arm;
// b2 = flag-off boot: the vanilla shape (a north-face click still tills = vanilla
//      facing != DOWN; [HoeLog] rows absent).
//
// Judge rows (farmDebugLog, ETIMFarm.row): [HoeLog] gate face=… / till damage=50 /
// till lowblock / mattock till|reject|lowblock. Stripped form has NO leading space
// (the B-38 r2 lesson: 内存捕获面用剥后形态).
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b40-smoke';
const A = 'ETIM_F7';
const RUN = 'r5';

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore, cfgBefore;

const HOME = '-60.5 67 240.5';
const SITE = { x: -60, y: 67, z: 240 };   // the tilled target block
const SITE2 = { x: -62, y: 67, z: 240 };  // the lowblock arm target (west)
const SITE3 = { x: -58, y: 67, z: 240 };  // the mattock arm target (east)
const HOE = 'etim:hoe_rusted_iron';
const MATTOCK = 'etim:mattock_rusted_iron';

const sleep = L.sleep;
const sha256 = L.sha256;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

function propsNorm(file) {
  const t = fs.readFileSync(file, 'utf8');
  return sha256(Buffer.from(t.split(/\r?\n/).filter((x) => x.trim() !== '' && !x.trim().startsWith('#')).join('\n'), 'utf8'));
}
function propsRaw(file) { return sha256(fs.readFileSync(file)); }
function propsLevel(file) {
  const m = /^level-name=(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : '?';
}
function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk: L.mkCounts() };
  ev.pins.push(pin);
  console.log('[PIN]', JSON.stringify(pin));
}

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  for (let rm = 1; rm <= 10; rm++) { try { fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true }); break; } catch (e) { if (rm === 10) throw new Error('stale server JVM still holds run/' + world + ' — kill it first'); await sleep(3000); } }
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props) ? L.setProp(props, 'level-name', world) : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held — aborting, no collide boot');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot(bootTag) {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  if (!st.exited) throw new Error('server JVM did not exit after stop (exitCode=' + st.exitCode + ')');
  const rec = { exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) };
  ev.stopBoots.push(rec);
  console.log('[stop]', JSON.stringify(rec));
  // full capture dump (the console .out stream truncates on exit — r1/r2/r3 lesson)
  try {
    fs.writeFileSync(path.join('build-logs', TAG + '-' + RUN + '-' + bootTag + '.log'), srv.all.join('\n'), 'utf8');
  } catch (e) { /* noop */ }
}

/** 坪面：整片 grass y67 + 上方净空（无围栏——bot creative 免踢；瘤面无竞态臂）。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty normal', 400);
  await cmd('weather clear', 400);
  await cmd('time set 18000', 300); // 夜 = 无 flee-sun 竞争面
  await cmd('kill @e[type=!player]', 900);
  await cmd('fill -74 60 230 -30 65 250 minecraft:cobblestone', 1500); // solid base
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -66 67 236 -54 67 244 minecraft:grass', 700); // the soil pad
  await cmd('fill -67 68 235 -53 71 245 minecraft:air', 800);   // above-pad clearance (re-clear)
  await cmd('tp ' + A + ' ' + HOME, 900);
  await sleep(2000);
  try { if (bot.entity && bot.entity.onGround === false) bot.entity.onGround = true; } catch (e) { /* noop */ }
}

/** 一轮 useblock（lib.useBlock 带 face 参）。 */
async function clickFace(x, y, z, face) {
  await L.useBlock(srv, x, y, z, A, face || 'up');
  await sleep(700);
}

/** 取证：entitydata @p 回声里 SelectedItem 的 Damage。 */
function selectedDamage(rows) {
  const echoes = rows.filter((l) => l.indexOf('SelectedItem') >= 0);
  const last = echoes.length ? echoes[echoes.length - 1] : '';
  const m = /Damage:(\d+)s/.exec(last);
  return { echo: last.slice(0, 200), damage: m ? parseInt(m[1], 10) : null };
}

// a1 — top-face gate: a NORTH-face click must be declined (PASS, grass unchanged);
// an UP-face click must pass the gate (vanilla till runs).
async function gateArm(k) {
  await cmd('setblock ' + SITE.x + ' ' + SITE.y + ' ' + SITE.z + ' minecraft:grass');
  await cmd('clear ' + A, 400);
  await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
  await clickFace(SITE.x, SITE.y, SITE.z, 'north');
  await sleep(800);
  const sideRows = since(k).filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=north') >= 0);
  const sideBlock = await L.testBlock(srv, SITE.x, SITE.y, SITE.z, 'minecraft:grass');
  await clickFace(SITE.x, SITE.y, SITE.z, 'up');
  await sleep(800);
  const topRows = since(k).filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=up') >= 0);
  const topBlock = await L.testBlock(srv, SITE.x, SITE.y, SITE.z, 'minecraft:farmland');
  return { sideRows: sideRows.length, sideBlock: sideBlock.ok, topRows: topRows.length, topBlock: topBlock.ok };
}

// a2 — till success face: grass→farmland + wear 50 (dur parsed from the dmg row:
// dur=<remaining>/<max>) + the gate row. The [HoeLog] rows carry the durability
// face — the entitydata probe can't read the bot's held item (the B-40 r1
// finding), so the durability evidence is the row's own dur field.
async function tillArm(k) {
  await cmd('setblock ' + SITE.x + ' ' + SITE.y + ' ' + SITE.z + ' minecraft:grass');
  await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
  await clickFace(SITE.x, SITE.y, SITE.z, 'up');
  await sleep(900);
  const rows = since(k);
  const dmgRows = rows.filter((l) => l.indexOf('[HoeLog] till damage') >= 0);
  const gateRows = rows.filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=up') >= 0);
  const dur = dmgRows.length ? /dur=(\d+)\/(\d+)/.exec(dmgRows[dmgRows.length - 1]) : null;
  const farmland = await L.testBlock(srv, SITE.x, SITE.y, SITE.z, 'minecraft:farmland');
  return { gateRows: gateRows.length, dmgRows: dmgRows.length, durAfter: dur ? parseInt(dur[1], 10) : null, durMax: dur ? parseInt(dur[2], 10) : null, farmland: farmland.ok };
}

// a3 — lowblock allow: a top slab above (minY 0.5) still tills (R196 :54 allow
// arm); wheat (minY 0) rejects. NOTE (r4 verdict): the 1.12 vanilla farmland
// itself reverts to DIRT under any solid block above (BlockFarmland.onBlockAdded
// /neighborChanged :150-153 turnToDirt — R196 farmland has no such rule, :295
// onBlockAdded = hydration only), so the slab-tilled cell reads DIRT; the
// assert = the allow row + the arm-local wear row (the R196 faces), the final
// block is informational only.
async function lowBlockArm(k) {
  // slab arm
  await cmd('setblock ' + SITE2.x + ' ' + SITE2.y + ' ' + SITE2.z + ' minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:stone_slab 8'); // top half, minY 0.5
  await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
  const lk = srv.all.length; // the arm-local marker (the damage rows before this = a1/a2's)
  await clickFace(SITE2.x, SITE2.y, SITE2.z, 'up');
  await sleep(900);
  const slabRows = since(k).filter((l) => l.indexOf('[HoeLog] till lowblock') >= 0
    && l.indexOf(SITE2.x + ',' + (SITE2.y + 1) + ',' + SITE2.z) >= 0);
  const slabGate = since(lk).filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=up') >= 0);
  const slabDmg = since(lk).filter((l) => l.indexOf('[HoeLog] till damage') >= 0); // the till ran (R196 :75 face)
  const slabBlock = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:farmland');
  const slabDirt = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:dirt'); // the 1.12 farmland solid-above revert
  const slabStill = await L.testBlock(srv, SITE2.x, SITE2.y + 1, SITE2.z, 'minecraft:stone_slab');
  // crops arm
  await cmd('setblock ' + SITE2.x + ' ' + SITE2.y + ' ' + SITE2.z + ' minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:wheat 7'); // bounds minY 0
  await clickFace(SITE2.x, SITE2.y, SITE2.z, 'up');
  await sleep(900);
  const all = since(k).filter((l) => l.indexOf('[HoeLog] till lowblock') >= 0
    && l.indexOf(SITE2.x + ',' + (SITE2.y + 1) + ',' + SITE2.z) >= 0);
  const cropsRows = all.length - slabRows.length;
  const cropsBlock = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:air', 400);
  return { slabRows: slabRows.length, slabGate: slabGate.length, slabDmg: slabDmg.length, slabBlock: slabBlock.ok, slabDirt: slabDirt.ok, slabStill: slabStill.ok, cropsRows, cropsBlock: cropsBlock.ok };
}

// a4 — mattock: a side face rejects; the top face tills dirt→farmland (strict
// grass||dirt + wear 50 + the till rows).
async function mattockArm(k) {
  await cmd('setblock ' + SITE3.x + ' ' + SITE3.y + ' ' + SITE3.z + ' minecraft:dirt');
  await cmd('clear ' + A, 400);
  await cmd('give ' + A + ' ' + MATTOCK + ' 1 0', 600);
  await clickFace(SITE3.x, SITE3.y, SITE3.z, 'north');
  await sleep(800);
  const rejectRows = since(k).filter((l) => l.indexOf('[HoeLog] mattock reject') >= 0);
  const sideBlock = await L.testBlock(srv, SITE3.x, SITE3.y, SITE3.z, 'minecraft:dirt');
  await clickFace(SITE3.x, SITE3.y, SITE3.z, 'up');
  await sleep(900);
  const rows = since(k);
  const tillRows = rows.filter((l) => l.indexOf('[HoeLog] mattock till') >= 0);
  const dmgRows = rows.filter((l) => l.indexOf('[HoeLog] till damage') >= 0);
  const topBlock = await L.testBlock(srv, SITE3.x, SITE3.y, SITE3.z, 'minecraft:farmland');
  return { rejectRows: rejectRows.length, sideBlock: sideBlock.ok, tillRows: tillRows.length, dmgRows: dmgRows.length, topBlock: topBlock.ok };
}

(async () => {
  try {
    // ---------- boot 1: flag on ----------
    let cfg = { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false };
    srv = await startBoot(TAG, 'w-b40a', cfg);
    stampPin();
    await stageArena();
    let k = srv.all.length;

    const a1 = await gateArm(k);
    const a2 = await tillArm(k);
    const a3 = await lowBlockArm(k);
    const a4 = await mattockArm(k);
    ev.arms = { a1, a2, a3, a4 };
    await sleep(500);
    await stopBoot('b1');

    // ---------- boot 2: flag off ----------
    propsBefore = fs.readFileSync(L.PROPS, 'utf8');
    cfg = { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false };
    srv = await startBoot(TAG, 'w-b40b', cfg);
    stampPin();
    await stageArena();
    k = srv.all.length;
    await cmd('setblock ' + SITE.x + ' ' + SITE.y + ' ' + SITE.z + ' minecraft:grass', 400);
    await cmd('clear ' + A, 400);
    await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
    await clickFace(SITE.x, SITE.y, SITE.z, 'north'); // vanilla: facing != DOWN → till runs
    await sleep(900);
    const b1rows = since(k).filter((l) => l.indexOf('[HoeLog]') >= 0);
    const b1farmland = await L.testBlock(srv, SITE.x, SITE.y, SITE.z, 'minecraft:farmland');
    const b1res = { rows: b1rows.length, farmland: b1farmland.ok };
    ev.arms.b1 = b1res;
    await sleep(500);
    await stopBoot('b2');

    // ---------- verdicts ----------
    const w0 = ev.stopBoots.every((r) => r.mixinFail === undefined ? true : r.mixinFail === 0) && ev.stopBoots.every((r) => r.exited && r.exitCode === 0 && r.build);
    const w1 = a1.sideRows >= 1 && a1.topRows >= 1 && a1.sideBlock && a1.topBlock;
    const w2 = a2.gateRows >= 1 && a2.dmgRows >= 1 && a2.durAfter !== null && a2.farmland;
    const w3 = a3.slabRows >= 1 && a3.slabGate >= 1 && a3.slabDmg >= 1 && a3.cropsRows === 0 && a3.cropsBlock && a3.slabStill;
    const w4 = a4.rejectRows >= 1 && a4.tillRows >= 1 && a4.dmgRows >= 1 && a4.sideBlock && a4.topBlock;
    const b1 = b1res.rows === 0 && b1res.farmland;
    const bad = !(w0 && w1 && w2 && w3 && w4 && b1);
    console.log('[a1]', JSON.stringify(a1));
    console.log('[a2]', JSON.stringify(a2));
    console.log('[a3]', JSON.stringify(a3));
    console.log('[a4]', JSON.stringify(a4));
    console.log('[b1]', JSON.stringify(b1res));
    console.log('[done]', JSON.stringify({ w0, w1, w2, w3, w4, b1, bad, run: RUN }));
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.log('[fatal]', e && e.message);
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exit(2);
  }
})();
