/**
 * B-38 drop-face pack — smoke driver (drop tables + massive-fall flag +
 * equipment rules). Verbatim scaffolding of f11-b37-smoke.js (boot/stop/
 * stageArena/props/stampPin/W0..W4).
 *
 * Arms (boot 1, flag ON):
 *   a1 — skeleton arm: a wither skeleton is killed by /kill (void source =
 *        the console kill face, NOT recentlyHit); the verdict:
 *        a killed NORMAL skeleton (also /kill, non-player) must NOT emit a
 *        rare drop and must not have an equipment face crash; the wither
 *        coal roll = nextInt(3+0)-1 → non-negative 0..1 = 2/3 chance ≥1
 *        coal; bone roll = nextInt(3) → 2/3 ≥1 bone; the R196 flag OFF =
 *        the vanilla loot table falls a bone (1.12 skeleton loot) instead.
 *        Judgement rows: [DropLog] skeleton / [DropLog] equip.
 *   a2 — zombie arm: a zombie killed while wearing a leather cap + holding
 *        a stick (via replaceitem) — the equipment rules must fire and the
 *        stick must drop per the R196 hand arm (recentlyHit=false → the
 *        5% hand roll); the zombie table = the rotten flesh roll.
 *        Judgement rows: [DropLog] zombie / [DropLog] equip.
 *   a3 — massive-fall arm: a zombie is teleported to fall from y 40 blocks
 *        (y107 → y67 pad) — the fall damage ≥ maxHealth*0.5 sets the flag
 *        → the few-items mercy gate (0.1 roll) usually skips the rotten
 *        flesh + the rare chain; evidence = the [DropLog] fewitems gate
 *        flag=true row (the row is emitted every death, so the FACE is
 *        always observable; the skip outcome is the roll).
 * Boot 2 (flag OFF): b1 — the same zombie arm, 30s: zero [DropLog] rows.
 * W4 — double [PIN] (same release sha) + mk.ok (101/236/472/99/10).
 *
 * The floor loot is asserted server-side: every death row is paired with
 * the [DropLog] rows; the dropped item entities are killed/cleaned by the
 * kill @e sweep between arms (the kill also re-runs their drop faces —
 * covered by the arm-end sweeps AFTER the row capture).
 */
'use strict';
process.chdir(__dirname + '/..'); // run from testharness root

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b38-smoke';
const WORLD = 'w-b38a';
const A = 'ETIM_F7';
const RUN = 'r5';

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore, cfgBefore;

const HOME = '-60.5 67 240.5';   // 中心钉扎位（台面中部，距围墙 ≥4 格）
const FALL_TOP = '-60.5 110 240.5'; // a3 空中坠落位（y110 → 台面 y67 落差 43）

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
  fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true });
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
  const rec = { exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) };
  ev.stopBoots.push(rec);
  console.log('[stop]', JSON.stringify(rec));
}

/** 台面：solid base + 摔落面垫层（y66 平台），围墙防走缘坠落（B-33 教训）。 */
async function stageArena(perch) {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty normal', 400); // normal+ 供掉落判（和平无死亡掉落面）
  await cmd('weather clear', 400);
  await cmd('time set 18000', 300); // 夜 = skeleton 不燃/无 flee-sun 竞争
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' ' + perch, 900);
  await sleep(2000);
  try {
    if (bot.entity && bot.entity.onGround === false) {
      bot.entity.onGround = true; // 落定 nudge（B-33 先例）
    }
  } catch (e) { /* noop */ }
  await cmd('fill -74 60 230 -30 65 250 minecraft:cobblestone', 1500); // solid base under arena
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 71 235 -35 71 245 minecraft:cobblestone', 700); // 摔落顶盖防出界（a3 坠落收集面）
  await sleep(1000);
  await cmd('tp ' + A + ' ' + perch, 900); // air 清后重新落位
  await sleep(1500);
}

/** 判行过滤：face 带空格（b31 定谳教训）。 */
const dropRows = (lines) => lines.filter((l) => l.indexOf('[DropLog] ') >= 0);
const gateRows = (lines) => lines.filter((l) => l.indexOf('[DropLog] fewitems gate ') >= 0);
const skelRows = (lines) => lines.filter((l) => l.indexOf('[DropLog] skeleton ') >= 0);
const zombRows = (lines) => lines.filter((l) => l.indexOf('[DropLog] zombie ') >= 0);
const equipRows = (lines) => lines.filter((l) => l.indexOf('[DropLog] equip ') >= 0);

/** a1 — 骷髅臂：凋灵骨架 /kill（非玩家击杀＝非 recentlyHit）→ 煤/骨 roll + 装备面。 */
async function skeletonArm(k) {
  // NOTE (r5 fix): CommandSummon (rfg :91-100,119-122) skips onInitialSpawn whenever ANY NBT tag is
  // given (flag=true), so an NBT summon spawns an EMPTY-HANDED wither skeleton and the [DropLog] equip
  // face never fires. Summon with NO tag (flag=false) -> onInitialSpawn -> vanilla mainhand sword
  // (EntityWitherSkeleton :86-89 via AbstractSkeleton :177-181) -> the equip face prints.
  await cmd('summon wither_skeleton ' + HOME, 900);
  await sleep(1000);
  await cmd('kill @e[type=wither_skeleton]', 600); // 非 recentlyHit 面吃完煤/骨 roll
  await sleep(1500);
  const rows = since(k);
  const skel = skelRows(rows);
  const gate = gateRows(rows);
  const equ = equipRows(rows);
  return {
    skel: skel.length,
    skelRows: skel.slice(0, 3),
    gateFlag: gate.filter((l) => l.indexOf(' flag=true ') >= 0).length,
    equip: equ.length,
    equipRows: equ.slice(0, 3),
  };
}

/** a2 — 僵尸臂：持木棍＋皮帽僵尸 /kill → 腐肉 roll + 装备面（手持 5% 面＝非 recent 恒可能）。 */
async function zombieArm(k) {
  await cmd('summon zombie ' + HOME + ' {PersistenceRequired:1b,HandItems:[{id:"minecraft:stick",Count:1b},{}],ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b}]}', 900);
  await sleep(1000);
  await cmd('kill @e[type=zombie]', 600);
  await sleep(1500);
  const rows = since(k);
  const zomb = zombRows(rows);
  const equ = equipRows(rows);
  return {
    zomb: zomb.length,
    zombRows: zomb.slice(0, 3),
    equip: equ.length,
    equipRows: equ.slice(0, 3),
  };
}

/** a3 — 摔落臂：tp y110 → 坠回台面 → fall 伤害 ≥ maxHealth*0.5 置旗 → fewitems gate flag=true 行。 */
async function fallArm(k) {
  await cmd('summon zombie ' + FALL_TOP + ' {PersistenceRequired:1b}', 900);
  await sleep(4000); // 坠落 43 格 ≈ (43-3)*1 dmg = 40 ≥ maxHealth*0.5 → 旗必置
  const rows = since(k);
  const gate = gateRows(rows);
  return {
    gateFlag: gate.filter((l) => l.indexOf(' flag=true ') >= 0).length,
    gateRows: gate.slice(0, 3),
  };
}

/** b1 — 旗断面（同 a2 几何，30s 全零）。 */
async function flagOffArm(k) {
  await cmd('summon zombie ' + HOME + ' {PersistenceRequired:1b,HandItems:[{id:"minecraft:stick",Count:1b},{}],ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b}]}', 900);
  await sleep(1000);
  await cmd('kill @e[type=zombie]', 600);
  await sleep(1500);
  const rows = since(k);
  return { total: dropRows(rows).length };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开（a1/a2/a3） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena(HOME);

  {
    const k = srv.all.length;
    ev.arms.a1 = await skeletonArm(k);
    console.log('[a1]', JSON.stringify({ skel: ev.arms.a1.skel, gateFlag: ev.arms.a1.gateFlag, equip: ev.arms.a1.equip, skelRows: ev.arms.a1.skelRows, equipRows: ev.arms.a1.equipRows }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await zombieArm(k);
    console.log('[a2]', JSON.stringify({ zomb: ev.arms.a2.zomb, equip: ev.arms.a2.equip, zombRows: ev.arms.a2.zombRows, equipRows: ev.arms.a2.equipRows }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a3 = await fallArm(k);
    console.log('[a3]', JSON.stringify(ev.arms.a3));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗断（b1） ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena(HOME);

  {
    const k = srv.all.length;
    ev.arms.b1 = await flagOffArm(k);
    console.log('[b1]', JSON.stringify(ev.arms.b1));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);
  stampPin();

  const a1 = ev.arms.a1 || {}, a2 = ev.arms.a2 || {}, a3 = ev.arms.a3 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 2 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1 = (a1.skel || 0) >= 1 && (a1.equip || 0) >= 1;
  const w2 = (a2.zomb || 0) >= 1 && (a2.equip || 0) >= 1;
  const w3 = (a3.gateFlag || 0) >= 1;
  const b1z = (b1.total || 0) === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = { w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL', w3: w3 ? 'PASS' : 'FAIL', b1: b1z ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL' };
  const bad = !(w0 && w1 && w2 && w3 && b1z && w4);

  console.log('[done]', JSON.stringify({
    a1skel: a1.skel || 0, a1gate: a1.gateFlag || 0, a1equip: a1.equip || 0,
    a2zomb: a2.zomb || 0, a2equip: a2.equip || 0,
    a3gate: a3.gateFlag || 0,
    b1total: b1.total || 0,
    stop: ev.stopBoots.map((s) => [s.exitCode, s.build, s.propsRestored === false ? false : true]),
    w0: w0, w1: w1, w2: w2, w3: w3, b1: b1z, w4: w4,
    propsNorm: ev.propsNormBefore + '/' + ev.propsNormAfter,
    propsRaw: ev.propsRawBefore + '/' + ev.propsRawAfter,
    propsLevel: ev.propsLevelBefore + '->' + ev.propsLevelAfter,
    bad: bad ? 1 : 0,
  }));
  process.exitCode = bad ? 1 : 0;
})().catch((e) => {
  console.log('[fatal]', e && e.stack || String(e));
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e2) {}
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e2) {}
  process.exit(1);
});
