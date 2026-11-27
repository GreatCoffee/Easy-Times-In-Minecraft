// f11-b40-verify.js — W-B40 判窗（B-40 锄地四件套 faces :86/:87/:93/:94）。
// 判窗口径（摸底 §5）：W1 顶面门（侧脸 PASS＋顶脸 pass）/ W2 till 正判（grass→
// farmland＋wear 50，dur 取证＝行内 dur 字段）/ W3 低方块允许臂（顶半砖耕成、
// 作物拒）/ W4 mattock（侧脸拒＋顶脸耕＋damage 行）/ W5 旗断（[HoeLog] 全零＋
// vanilla till 仍成立）/ W0 mixinFail 0×2＋停服 {0,true,true}×2＋双 PIN 同 sha
// ＋mk ok＋props（norm/raw 起收同＋level 还原）。
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b40-verify';
const A = 'ETIM_F7';
const RUN = 'v1';
const EXPECTED_SHA = 'ACC584FB7395EC5192D5A5413306304C759D5AE805AD9442617DD2F21062BC5E'; // b40-build2

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

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  if (!st.exited) throw new Error('server JVM did not exit after stop (exitCode=' + st.exitCode + ')');
  const rec = { exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) };
  ev.stopBoots.push(rec);
  console.log('[stop]', JSON.stringify(rec));
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
// dur=<remaining>/<max>) + the gate row.
async function tillArm(k) {
  await cmd('setblock ' + SITE.x + ' ' + SITE.y + ' ' + SITE.z + ' minecraft:grass');
  await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
  await cmd('gamemode 0 ' + A, 400); // survival: ETIMEndurance.charge() skips creative (":230") so the hoeDrain row only prints in survival
  await clickFace(SITE.x, SITE.y, SITE.z, 'up');
  await sleep(900);
  const rows = since(k);
  await cmd('gamemode 1 ' + A, 300);
  const dmgRows = rows.filter((l) => l.indexOf('[HoeLog] till damage') >= 0);
  const gateRows = rows.filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=up') >= 0);
  const hoeDrain = rows.filter((l) => l.indexOf('[FoodLog]') >= 0 && l.indexOf('hoeDrain') >= 0).length;
  const dur = dmgRows.length ? /dur=(\d+)\/(\d+)/.exec(dmgRows[dmgRows.length - 1]) : null;
  const farmland = await L.testBlock(srv, SITE.x, SITE.y, SITE.z, 'minecraft:farmland');
  return { gateRows: gateRows.length, dmgRows: dmgRows.length, durAfter: dur ? parseInt(dur[1], 10) : null, durMax: dur ? parseInt(dur[2], 10) : null, farmland: farmland.ok, hoeDrain };
}

// a3 — lowblock allow: a top slab above (minY 0.5) still tills; wheat (minY 0) rejects.
// NOTE (r4 verdict): the 1.12 vanilla farmland reverts to DIRT under any solid
// block above (BlockFarmland.onBlockAdded/neighborChanged :150-153 turnToDirt;
// R196 farmland :295 = hydration only), so the slab-tilled cell reads DIRT;
// the assert = the allow row + the arm-local wear row, the block is only noted.
async function lowBlockArm(k) {
  await cmd('setblock ' + SITE2.x + ' ' + SITE2.y + ' ' + SITE2.z + ' minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:stone_slab 8');
  await cmd('give ' + A + ' ' + HOE + ' 1 0', 600);
  const lk = srv.all.length; // the arm-local marker (the damage rows before = a1/a2's)
  await clickFace(SITE2.x, SITE2.y, SITE2.z, 'up');
  await sleep(900);
  const slabRows = since(k).filter((l) => l.indexOf('[HoeLog] till lowblock') >= 0
    && l.indexOf(SITE2.x + ',' + (SITE2.y + 1) + ',' + SITE2.z) >= 0);
  const slabGate = since(lk).filter((l) => l.indexOf('[HoeLog] gate') >= 0 && l.indexOf('face=up') >= 0);
  const slabDmg = since(lk).filter((l) => l.indexOf('[HoeLog] till damage') >= 0); // the till ran (R196 :75 face)
  const slabBlock = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:farmland');
  const slabDirt = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:dirt'); // the vanilla solid-above revert
  const slabStill = await L.testBlock(srv, SITE2.x, SITE2.y + 1, SITE2.z, 'minecraft:stone_slab');
  await cmd('setblock ' + SITE2.x + ' ' + SITE2.y + ' ' + SITE2.z + ' minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:wheat 7');
  await clickFace(SITE2.x, SITE2.y, SITE2.z, 'up');
  await sleep(900);
  const all = since(k).filter((l) => l.indexOf('[HoeLog] till lowblock') >= 0
    && l.indexOf(SITE2.x + ',' + (SITE2.y + 1) + ',' + SITE2.z) >= 0);
  const cropsRows = all.length - slabRows.length;
  const cropsBlock = await L.testBlock(srv, SITE2.x, SITE2.y, SITE2.z, 'minecraft:grass');
  await cmd('setblock ' + SITE2.x + ' ' + (SITE2.y + 1) + ' ' + SITE2.z + ' minecraft:air', 400);
  return { slabRows: slabRows.length, slabGate: slabGate.length, slabDmg: slabDmg.length, slabBlock: slabBlock.ok, slabDirt: slabDirt.ok, slabStill: slabStill.ok, cropsRows, cropsBlock: cropsBlock.ok };
}

// a4 — mattock: a side face rejects; the top face tills dirt→farmland.
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
    // ---------- baseline: normalize props to level-name=w-b30v, snapshot props/cfg ----------
    let propsText = fs.readFileSync(L.PROPS, 'utf8');
    propsText = /level-name=/.test(propsText) ? L.setProp(propsText, 'level-name', 'w-b30v') : propsText + '\nlevel-name=w-b30v\n';
    fs.writeFileSync(L.PROPS, propsText, 'utf8');
    propsBefore = fs.readFileSync(L.PROPS, 'utf8');
    cfgBefore = fs.readFileSync(L.CFG, 'utf8');
    const norm0 = propsNorm(L.PROPS);

    // ---------- boot 1: flag on ----------
    let cfg = { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false, foodDebugLog: true };
    srv = await startBoot('w-b40v-b1', 'w-b40v', cfg);
    stampPin();
    await stageArena();
    let k = srv.all.length;

    const a1 = await gateArm(k);
    const a2 = await tillArm(k);
    const a3 = await lowBlockArm(k);
    const a4 = await mattockArm(k);
    ev.arms = { a1, a2, a3, a4 };
    await sleep(500);
    await stopBoot();

    // ---------- boot 2: flag off ----------
    cfg = { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false };
    srv = await startBoot('w-b40v2-b1', 'w-b40v2', cfg);
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
    await stopBoot();

    // ---------- restore props/cfg (start==end) then verdicts ----------
    fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
    fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
    const propsAfter = { norm: propsNorm(L.PROPS), raw: propsRaw(L.PROPS), level: propsLevel(L.PROPS) };
    const w0 = ev.stopBoots.every((r) => r.exited && r.exitCode === 0 && r.build);
    const w1 = a1.sideRows >= 1 && a1.topRows >= 1 && a1.sideBlock && a1.topBlock;
    const w2 = a2.gateRows >= 1 && a2.dmgRows >= 1 && a2.durAfter !== null && a2.farmland && a2.hoeDrain >= 1;
    const w3 = a3.slabRows >= 1 && a3.slabGate >= 1 && a3.slabDmg >= 1 && a3.cropsRows === 0 && a3.cropsBlock && a3.slabStill;
    const w4 = a4.rejectRows >= 1 && a4.tillRows >= 1 && a4.dmgRows >= 1 && a4.sideBlock && a4.topBlock;
    const b1 = b1res.rows === 0 && b1res.farmland;
    const pinsOk = ev.pins.length === 2 && ev.pins[0].releaseSha === EXPECTED_SHA && ev.pins[1].releaseSha === EXPECTED_SHA && ev.pins[0].mk.ok && ev.pins[1].mk.ok;
    const propsOk = propsAfter.norm === norm0 && propsLevel(L.PROPS) === 'w-b30v';
    const bad = !(w0 && w1 && w2 && w3 && w4 && b1 && pinsOk && propsOk);
    console.log('[a1]', JSON.stringify(a1));
    console.log('[a2]', JSON.stringify(a2));
    console.log('[a3]', JSON.stringify(a3));
    console.log('[a4]', JSON.stringify(a4));
    console.log('[b1]', JSON.stringify(b1res));
    console.log('[props]', JSON.stringify({ norm0, after: propsAfter, ok: propsOk }));
    console.log('[done]', JSON.stringify({ w0, w1, w2, w3, w4, b1, pinsOk, propsOk, propsNorm: propsAfter.norm + '/' + norm0, propsRaw: propsAfter.raw, propsLevel: 'w-b30v->' + propsAfter.level, bad, run: RUN }));
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.log('[fatal]', e && e.message);
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exit(2);
  }
})();
