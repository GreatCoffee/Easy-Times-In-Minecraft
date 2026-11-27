/**
 * B-39 is-smart face — verify driver (judgment window for 会话七).
 * Verbatim scaffolding of f11-b38-verify.js (boot/stop/stageArena/props/
 * stampPin/W0..W4). WORLD = w-b39v. Arms mirror f11-b39-smoke.js:
 *   W1 — a1 seed/NBT face: revenant probe is_smart:1b (deterministic) +
 *        ≥4 plain rounds carrying the is_smart key (the :221 write face).
 *   W2 — a2 player-hit upgrade: a plain (0b) zombie punched by the bot
 *        survives -> the post echo reads is_smart:1b (R196 :100).
 *   W3 — a3 dig-gate consumption: the a2 smart bare-handed zombie behind
 *        the windowless room -> [SleepLog] bed-dig rows ≥1.
 *   b1 — flag-off boot: NO is_smart key in any echo + zero bed-dig rows.
 *   W4 — double [PIN] same sha (b39-build3 CB45F788…) + mk.ok
 *        (101/239/478, 99+10).
 * props: norm FA0B6FAB… judged start==end; raw 35EBC027… judged
 * start==end; level-name restored to w-b30v.
 */
'use strict';
process.chdir(__dirname + '/..'); // run from testharness root

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'w-b39v';
const WORLD = 'w-b39v';
const A = 'ETIM_F7';
const RUN = 'v1';
const EXPECTED_SHA = 'CB45F788E88E18FD1860FD86F9D0359E880389D840DCC375078768681C3DD859'; // b39-build3 (diag lines + mixins debug.export reverted)

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore, cfgBefore;

const HOME = '-60.5 67 240.5';
const BOT_PUNCH = '-58.5 67 240.5';
const ROOM_CELL = '-60.5 67 238.5'; // r21: x must be -60.5 = the cell center; -61.5 was the west wall column's center (inWall death in survival)
const ROOM_ZOMBIE = '-61.5 67 240.5';

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
  for (let rm = 1; rm <= 10; rm++) { try { fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true }); break; } catch (e) { if (rm === 10) throw new Error('stale server JVM still holds run/' + world + ' — kill it first'); await sleep(3000); } } // r11 C-level: wait out a lingering JVM before deleting the world
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

async function stageArena(perch) {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A, 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty normal', 400);
  await cmd('weather clear', 400);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' ' + perch, 900);
  await sleep(2000);
  try {
    if (bot.entity && bot.entity.onGround === false) {
      bot.entity.onGround = true;
    }
  } catch (e) { /* noop */ }
  await cmd('fill -74 60 230 -30 65 250 minecraft:cobblestone', 1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await sleep(1000);
  await cmd('tp ' + A + ' ' + perch, 900);
  await sleep(1500);
}

async function buildRoom() {
  await cmd('fill -62 67 237 -60 69 237 minecraft:dirt', 500);
  await cmd('fill -62 67 239 -60 69 239 minecraft:dirt', 500);
  await cmd('fill -62 67 237 -62 69 239 minecraft:dirt', 500);
  await cmd('fill -60 67 237 -60 69 239 minecraft:dirt', 500);
  await cmd('fill -62 70 237 -60 70 239 minecraft:cobblestone', 500);
  // r13 fix: north/south pocket cells are fresh-world terrain (seed-dependent) — seal them with dirt so the dig face is deterministic
  await cmd('fill -61 67 237 -61 69 237 minecraft:dirt', 900); // north pocket cell
  await cmd('fill -61 67 239 -61 69 239 minecraft:dirt', 900); // south pocket cell = the dig face the smart zombie chews
  await cmd('setblock -61 67 238 minecraft:air', 400);
  await cmd('setblock -61 68 238 minecraft:air', 400);
  await cmd('setblock -61 69 238 minecraft:air', 400);
  await sleep(500);
}

const smartEcho = (lines) => lines.filter((l) => l.indexOf('is_smart:') >= 0);
const bedDigRows = (lines) => lines.filter((l) => l.indexOf('[SleepLog] bed-dig ') >= 0);
const orGateRows = (lines) => lines.filter((l) => l.indexOf('[SleepLog] dig-gate ') >= 0 && l.indexOf(' gate=orGate') >= 0);

async function oneSeedRound(k, mob) {
  await cmd('summon ' + mob + ' ' + HOME, 900);
  await sleep(800);
  await cmd('entitydata @e[type=' + (mob.indexOf(':') >= 0 ? 'etim:revenant' : 'zombie') + ',c=1] {}', 800);
  await sleep(800);
  const rows = since(k);
  const echoes = smartEcho(rows);
  const last = echoes.length ? echoes[echoes.length - 1] : '';
  await cmd('kill @e[type=!player]', 600);
  await sleep(1200);
  return { key: echoes.length > 0, smart: /is_smart:1b/.test(last), echo: last.slice(0, 160) };
}

async function seedArm(k) {
  const rev = await oneSeedRound(k, 'etim:revenant');
  const rounds = [];
  for (let i = 0; i < 6; i++) {
    rounds.push(await oneSeedRound(k, 'zombie'));
  }
  return {
    revKey: rev.key, revSmart: rev.smart, revEcho: rev.echo,
    keys: rounds.filter((r) => r.key).length,
    smartCount: rounds.filter((r) => r.smart).length,
    rounds: rounds.map((r) => r.smart ? 1 : 0),
  };
}

let ZOMBIE_EID = null; // remembered so the dig-window punch can fire a raw use_entity packet

async function botPunch() {
  const bx = -58.5, by = 67, bz = 240.5;
  let target = null;
  for (const id of Object.keys(bot.entities)) {
    const e = bot.entities[id];
    if (!e || !e.position) continue;
    const name = (e.username ? 'player:' + e.username : (e.displayName || e.name || '')).toLowerCase();
    if (name.indexOf('zombie') < 0) continue;
    const dx = e.position.x - bx, dy = e.position.y - by, dz = e.position.z - bz;
    if (dx * dx + dy * dy + dz * dz <= 16) { target = e; break; }
  }
  if (!target) throw new Error('botPunch: no zombie entity within reach');
  ZOMBIE_EID = target.id;
  for (let i = 0; i < 2; i++) {
    await bot.lookAt(target.position.offset(0, 1.4, 0));
    await sleep(300);
    bot.attack(target);
    await sleep(800);
  }
}

async function punchZombieById() {
  // r18: punch by any known zombie handle, else by the remembered id — the entity map can lose the mob mid-window
  let target = null;
  for (const id of Object.keys(bot.entities)) {
    const e = bot.entities[id];
    if (!e || e.username) continue;
    const name = (e.displayName || e.name || '').toLowerCase();
    if (name.indexOf('zombie') < 0) continue;
    target = e; break;
  }
  if (target) {
    await bot.lookAt(target.position.offset(0, 1.4, 0));
    await sleep(200);
    bot.attack(target);
    await sleep(600);
    return;
  }
  if (ZOMBIE_EID) {
    bot._client.write('use_entity', { target: ZOMBIE_EID, mouse: 1, sneaking: false });
    bot._client.write('arm_animation', {});
    await sleep(600);
    return;
  }
  throw new Error('punchZombieById: no zombie entity and no remembered id');
}

async function hitUpgradeArm(k) {
  let pre = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await cmd('kill @e[type=!player]', 600);
    await sleep(800);
    const kk = srv.all.length;
    await cmd('summon zombie ' + HOME, 900);
    await sleep(800);
    await cmd('entitydata @e[type=zombie,c=1] {}', 800);
    await sleep(800);
    const rows = since(kk);
    const echoes = smartEcho(rows);
    const last = echoes.length ? echoes[echoes.length - 1] : '';
    pre = { smart: /is_smart:1b/.test(last), echo: last.slice(0, 160) };
    if (!pre.smart) break;
  }
  if (!pre || pre.smart) throw new Error('hitUpgradeArm: could not get a plain (0b) zombie in 3 rounds');
  const kp = srv.all.length;
  await botPunch();
  await sleep(2500);
  await cmd('entitydata @e[type=zombie,c=1] {}', 800);
  await sleep(800);
  const rows = since(kp);
  const postEchoes = smartEcho(rows);
  const post = postEchoes.length ? postEchoes[postEchoes.length - 1] : '';
  return { preEcho: pre.echo, flipped: /is_smart:1b/.test(post), postEcho: post.slice(0, 160) };
}

async function digConsumeArm(k) {
  await buildRoom();
  // r20: eye-level glass in the south wall = the sight scan keeps the bot targeted through the wall;
  // no punch loop needed and the bot (survival, unreachable: 1.43 swing < 2.0 gap) never gets knocked back.
  await cmd('setblock -61 68 239 minecraft:air', 900); // r21 verdict: vanilla canEntityBeSeen rayTraceBlocks hits glass (BlockBreakable isCollidable=true + FULL_BLOCK_AABB, Block.java:644-647) = mobs cannot see through glass; 1x1 air eye-hole at y68 = sight clear + zombie 1.95 tall cannot path through = wall stays dig-visible.
  await cmd('tp ' + A + ' ' + ROOM_CELL, 900);
  await sleep(1500);
  await cmd('gamemode 0 ' + A, 600); // survival = targetable through the glass
  const kg = srv.all.length;
  await sleep(1500);
  if (/suffocated|was slain/.test(since(kg).join('\n'))) throw new Error('digConsumeArm: bot died sealing in');
  await cmd('tp @e[type=zombie] ' + ROOM_ZOMBIE, 900); // park the a2 zombie (already flipped smart) at the dig face
  const kr = srv.all.length;
  for (let cyc = 1; cyc <= 12; cyc++) {
    await cmd('tp @e[type=zombie] ' + ROOM_ZOMBIE, 900); // re-pin the zombie at the dig face
    await sleep(10000);
  }
  const rows = since(kr);
  const bed = bedDigRows(rows);
  const orGate = orGateRows(rows);
  await cmd('gamemode 1 ' + A, 600); // restore creative (the dig may have opened the wall)
  return { bed: bed.length, bedRows: bed.slice(0, 3), orGate: orGate.length };
}

async function flagOffArm(k) {
  const rev = await oneSeedRound(k, 'etim:revenant');
  const plain = await oneSeedRound(k, 'zombie');
  await buildRoom();
  await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:iron_sword 1', 900); // r16 v3: sword reach 1.5+0.75+0.25=2.5 reaches the zombie through the wall (cfg is boot-time, no runtime writes)
  await cmd('tp ' + A + ' ' + ROOM_CELL, 900);
  await sleep(1500);
  const kr = srv.all.length;
  await cmd('summon zombie ' + ROOM_ZOMBIE + ' {PersistenceRequired:1b}', 900);
  await sleep(15000);
  const rows = since(kr);
  return { revKey: rev.key, plainKey: plain.key, bed: bedDigRows(rows).length, orGate: orGateRows(rows).length };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开 ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena(HOME);

  {
    const k = srv.all.length;
    ev.arms.a1 = await seedArm(k);
    console.log('[a1]', JSON.stringify({ revKey: ev.arms.a1.revKey, revSmart: ev.arms.a1.revSmart, keys: ev.arms.a1.keys, smartCount: ev.arms.a1.smartCount, rounds: ev.arms.a1.rounds }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.a2 = await hitUpgradeArm(k);
    console.log('[a2]', JSON.stringify({ flipped: ev.arms.a2.flipped, preEcho: ev.arms.a2.preEcho, postEcho: ev.arms.a2.postEcho }));
  }
  {
    const k = srv.all.length;
    ev.arms.a3 = await digConsumeArm(k);
    console.log('[a3]', JSON.stringify({ bed: ev.arms.a3.bed, orGate: ev.arms.a3.orGate, bedRows: ev.arms.a3.bedRows }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗断 ----------------
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
  const w1 = (a1.revKey ? 1 : 0) >= 1 && (a1.revSmart ? 1 : 0) >= 1 && (a1.keys || 0) >= 1;
  const w2 = (a2.flipped ? 1 : 0) >= 1;
  const w3 = (a3.bed || 0) >= 1;
  const b1z = !b1.revKey && !b1.plainKey && (b1.bed || 0) === 0;
  const w4 = ev.pins.length === 2
    && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins[0].releaseSha === EXPECTED_SHA
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  const propsOk = ev.propsNormBefore === ev.propsNormAfter
    && ev.propsRawBefore === ev.propsRawAfter
    && ev.propsLevelAfter === 'w-b30v';
  ev.verdicts = { w0: w0 ? 'PASS' : 'FAIL', w1: w1 ? 'PASS' : 'FAIL', w2: w2 ? 'PASS' : 'FAIL', w3: w3 ? 'PASS' : 'FAIL', b1: b1z ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL', props: propsOk ? 'PASS' : 'FAIL' };
  const bad = !(w0 && w1 && w2 && w3 && b1z && w4 && propsOk);

  console.log('[done]', JSON.stringify({
    a1revSmart: a1.revSmart ? 1 : 0, a1keys: a1.keys || 0, a1smart: a1.smartCount || 0,
    a2flip: a2.flipped ? 1 : 0,
    a3bed: a3.bed || 0, a3orGate: a3.orGate || 0,
    b1keys: (b1.revKey ? 1 : 0) + (b1.plainKey ? 1 : 0), b1bed: b1.bed || 0,
    stop: ev.stopBoots.map((s) => [s.exitCode, s.build]),
    w0: w0, w1: w1, w2: w2, w3: w3, b1: b1z, w4: w4, propsOk: propsOk,
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
