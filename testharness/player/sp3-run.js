#!/usr/bin/env node
/**
 * sp3-run.js — three-spider round driver (session 7).
 *
 * Sub-commands
 *   window <y40|y20> <seconds>   natural-spawn observation window in a sealed
 *                                dark room (V1 gate / V2 depth gate / V3 64)
 *   v4                            web-throw faces (Demon burning + BlackWidow)
 *   v5                            Phase evade/path teleports + non-trigger faces
 *   v6                            Demon melee effects + fire/lava immunity
 *   v7                            kill XP (8/15/10)
 *   v8                            TNT vs stone slab / wooden slab / double slab
 *                                / stone (negative control)
 *
 * Custom entities are never resolved on the mineflayer side (FML mod-entity
 * spawns do not map into minecraft-data): every attack goes through
 *   /etest attack <selector> <player>
 * which resolves the selector server-side against the player position and
 * feeds CPacketUseEntity(ATTACK) (TestDriver.feedAttack, [TestLog] line).
 *
 * Each phase emits [SP3] markers via /say; the driver slices the server log
 * itself and prints the counts it asserts on.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_LOG = path.join(ROOT, 'run', 'obfuscated-server', 'logs', 'latest.log');
const NAME = process.env.SP3_BOT || 'ETIM_Harn04';
const TAG = process.env.SP3_TAG || String(Date.now() % 1000000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = (v) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
const mark = (...a) => log('sp3', ...a);

const ROOM = {
  y40: { player: [200, 38, 200], tag: 'roomA-y38' },
  y20: { player: [200, 18, 200], tag: 'roomB-y18' },
};

// ---------------------------------------------------------------- log helpers
function readLog() {
  try { return fs.readFileSync(SERVER_LOG, 'utf8'); } catch (e) { return ''; }
}

function sliceLog(beginTag, endTag) {
  const lines = readLog().split(/\r?\n/);
  let b = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].includes(beginTag)) { b = i; break; }
  if (b < 0) return [];
  let e = lines.length - 1;
  for (let i = b + 1; i < lines.length; i++) if (lines[i].includes(endTag)) { e = i; break; }
  return lines.slice(b, e + 1);
}

const count = (lines, needle) => lines.reduce((n, l) => n + (l.includes(needle) ? 1 : 0), 0);
const grab = (lines, needle) => lines.filter((l) => l.includes(needle));
const logCount = (needle) => readLog().split(/\r?\n/).reduce((n, l) => n + (l.includes(needle) ? 1 : 0), 0);

/** y of an "at (x,y,z)" tail, or null */
function atY(line) {
  const m = /at \((-?\d+),(-?\d+),(-?\d+)\)/.exec(line);
  return m ? parseInt(m[2], 10) : null;
}

/** y-band breakdown of a line set (flat-world surface vs the two rooms) */
function bands(lines) {
  const out = { surface: 0, roomA_38_43: 0, roomB_18_23: 0, roofA_48: 0, other: 0, noCoord: 0 };
  for (const l of lines) {
    const y = atY(l);
    if (y === null) { out.noCoord++; continue; }
    if (y <= 10) out.surface++;
    else if (y >= 18 && y <= 25) out.roomB_18_23++;
    else if (y >= 38 && y <= 45) out.roomA_38_43++;
    else if (y >= 46 && y <= 49) out.roofA_48++;
    else out.other++;
  }
  return out;
}

// ---------------------------------------------------------------- bot helpers
async function cmd(bot, c, w = 300) {
  bot.chat(c.startsWith('/') ? c : '/' + c);
  log('cmd', c);
  await sleep(w);
}

async function cmdReply(bot, c, timeoutMs = 4000) {
  const done = new Promise((resolve) => {
    const to = setTimeout(() => { bot.removeListener('message', onMsg); resolve('(timeout)'); }, timeoutMs);
    function onMsg(m) { clearTimeout(to); bot.removeListener('message', onMsg); resolve(m.toString()); }
    bot.on('message', onMsg);
  });
  bot.chat(c.startsWith('/') ? c : '/' + c);
  const r = await done;
  log('cmd', `${c} -> ${r}`);
  return r;
}

async function tp(bot, x, y, z, w = 700) { await cmd(bot, `/tp ${NAME} ${x} ${y} ${z}`, w); }
async function say(bot, tag) { return cmdReply(bot, `/say [SP3] ${tag}`, 2500); }

async function attack(bot, selector, w = 620) {
  return cmdReply(bot, `/etest attack ${selector} ${NAME}`, w);
}

// ---------------------------------------------------------------- phases
async function phaseWindow(bot, roomName, seconds) {
  const room = ROOM[roomName];
  if (!room) throw new Error('unknown room ' + roomName);
  await cmd(bot, '/gamemode 1');
  await tp(bot, ...room.player, 900);
  await sleep(1200);
  bot.entity.onGround = true;
  await say(bot, `${room.tag}-begin`);
  mark(`window ${roomName} begin at ${P(bot.entity.position)} for ${seconds}s`);

  const t0 = Date.now();
  let clears = 0;
  while ((Date.now() - t0) / 1000 < seconds) {
    await cmd(bot, '/kill @e[type=!Player]', 300);
    clears++;
    if (clears % 3 === 0) {
      await tp(bot, ...room.player, 450);
      mark(`t+${Math.round((Date.now() - t0) / 1000)}s pos=${P(bot.entity.position)} clears=${clears}`);
    }
    await sleep(9000);
  }
  await say(bot, `${room.tag}-end`);
  mark(`window ${roomName} end (clears=${clears})`);

  const lines = sliceLog(`[SP3] ${room.tag}-begin`, `[SP3] ${room.tag}-end`);
  const stats = {
    'blackwidow-gate reject': count(lines, 'blackwidow-gate reject'),
    'depth-gate reject': count(lines, 'depth-gate reject'),
    'depth-gate Demon': count(lines, 'depth-gate reject cls=ETIMEntityDemonSpider'),
    'depth-gate Phase': count(lines, 'depth-gate reject cls=ETIMEntityPhaseSpider'),
    'phase-max-attempts': count(lines, 'phase-max-attempts 64'),
    'accept BlackWidow': count(lines, 'accept ETIMEntityBlackWidowSpider'),
    'accept Demon': count(lines, 'accept ETIMEntityDemonSpider'),
    'accept Phase': count(lines, 'accept ETIMEntityPhaseSpider'),
    'accept all': count(lines, 'accept '),
    'reject moon-night': count(lines, 'reject moon-night'),
    'reject player-near': count(lines, 'reject player-near'),
    'reject close-player': count(lines, 'reject close-player'),
    'cap-block': count(lines, 'cap-block'),
    'density-skip': count(lines, 'density-skip'),
    'total lines': lines.length,
  };
  mark('--- window stats ---');
  for (const [k, v] of Object.entries(stats)) mark(`  ${k.padEnd(24)} ${v}`);
  // y-band breakdown per judged family
  for (const [label, needle] of [
    ['accept BlackWidow', 'accept ETIMEntityBlackWidowSpider'],
    ['accept Demon', 'accept ETIMEntityDemonSpider'],
    ['accept Phase', 'accept ETIMEntityPhaseSpider'],
    ['depth-gate', 'depth-gate reject'],
    ['blackwidow-gate', 'blackwidow-gate reject'],
    ['phase-max', 'phase-max-attempts'],
  ]) {
    const b = bands(grab(lines, needle));
    mark(`  bands ${label.padEnd(16)} surface=${b.surface} roomB18-23=${b.roomB_18_23} roomA38-43=${b.roomA_38_43} roofA44-49=${b.roofA_48} other=${b.other}`);
  }
  // depth-gate y sanity + gate reject value distribution
  const dgY = grab(lines, 'depth-gate reject').map(atY).filter((v) => v !== null);
  if (dgY.length) mark(`  depth-gate y range: min=${Math.min(...dgY)} max=${Math.max(...dgY)} (all must be > 32)`);
  const gateVal = grab(lines, 'blackwidow-gate reject').map((l) => parseFloat((/nextFloat=([0-9.]+)/.exec(l) || [])[1])).filter((v) => !isNaN(v));
  if (gateVal.length) mark(`  gate nextFloat: n=${gateVal.length} min=${Math.min(...gateVal)} max=${Math.max(...gateVal)} (rejects must be < 0.5)`);
  for (const [label, needle, n] of [
    ['accept samples', 'accept ETIMEntityBlackWidowSpider', 10],
    ['gate-reject samples', 'blackwidow-gate reject', 8],
    ['depth-gate samples', 'depth-gate reject', 8],
    ['phase-max samples', 'phase-max-attempts', 6],
    ['accept-demon samples', 'accept ETIMEntityDemonSpider', 6],
    ['accept-phase samples', 'accept ETIMEntityPhaseSpider', 6],
  ]) {
    const rows = grab(lines, needle).slice(0, n);
    if (!rows.length) continue;
    mark(`--- ${label} ---`);
    rows.forEach((l) => mark('  ' + l.replace(/^.*\[SpawnLog\] /, '')));
  }
  return stats;
}

async function phaseV4(bot, seconds = 90) {
  await cmd(bot, '/gamemode 0');
  await cmd(bot, '/time set 1000');
  await tp(bot, 80, 135, 100, 900);
  await sleep(800);
  await say(bot, 'v4-begin');
  await cmd(bot, `/effect ${NAME} minecraft:resistance 9000 4 true`, 350);
  await cmd(bot, `/effect ${NAME} minecraft:fire_resistance 9000 0 true`, 350);
  await cmd(bot, `/effect ${NAME} minecraft:regeneration 9000 2 true`, 350);
  await cmd(bot, `/effect ${NAME} minecraft:saturation 9000 4 true`, 350);

  await cmdReply(bot, '/kill @e[type=!Player]', 900);
  // Demon thrower: burning=true, 200-tick cadence, num_webs=4
  await cmdReply(bot, '/summon etim:demon_spider 85 135 100 {num_webs:4b,PersistenceRequired:1b}', 1500);
  mark(`demon summoned; waiting ${seconds}s for web throws`);
  const t0 = Date.now();
  const fireCells = new Set();
  while ((Date.now() - t0) / 1000 < seconds) {
    await sleep(4000);
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -5; dz <= 5; dz++) {
          const p = bot.entity.position.offset(dx, dy, dz).floored();
          const b = bot.blockAt(p);
          if (b && b.name === 'fire') fireCells.add(`${p.x},${p.y},${p.z}`);
        }
      }
    }
    const feet = bot.blockAt(bot.entity.position.floored());
    if (feet && feet.name === 'web') await tp(bot, 80, 135, 100, 450);
  }
  mark(`fire cells observed near bot: ${fireCells.size} -> ${[...fireCells].slice(0, 8).join(' | ')}`);

  // BlackWidow thrower: burning=false, 500-tick cadence
  await cmdReply(bot, '/kill @e[type=!Player]', 800);
  await tp(bot, 80, 135, 100, 600);
  await cmdReply(bot, '/summon etim:black_widow_spider 85 135 100 {num_webs:4b,PersistenceRequired:1b}', 1500);
  const t1 = Date.now();
  while ((Date.now() - t1) / 1000 < 70) {
    await sleep(4000);
    const feet = bot.blockAt(bot.entity.position.floored());
    if (feet && feet.name === 'web') await tp(bot, 80, 135, 100, 450);
  }
  await say(bot, 'v4-end');
  await cmdReply(bot, '/kill @e[type=!Player]', 800);

  const lines = sliceLog('[SP3] v4-begin', '[SP3] v4-end');
  mark('--- v4 web-throw lines ---');
  const throws = grab(lines, 'web-throw');
  throws.forEach((l) => mark('  ' + l.replace(/^.*\[MobLog\] /, '')));
  mark(`web-throw total=${throws.length} burning-true=${count(lines, 'burning=true')} burning-false=${count(lines, 'burning=false')}`);
  mark(`web blocks at bot feet now: ${bot.blockAt(bot.entity.position.floored()) && bot.blockAt(bot.entity.position.floored()).name}`);
  return { throws: throws.length, burningTrue: count(lines, 'burning=true'), burningFalse: count(lines, 'burning=false'), fireCells: fireCells.size };
}

async function phaseV5(bot) {
  await cmd(bot, '/gamemode 1');
  await cmd(bot, '/time set 1000');
  await tp(bot, 80, 135, 100, 900);
  await cmd(bot, `/effect ${NAME} minecraft:resistance 9000 4 true`, 300);
  await cmd(bot, `/effect ${NAME} minecraft:regeneration 9000 2 true`, 300);
  await cmdReply(bot, '/kill @e[type=!Player]', 800);
  await cmdReply(bot, '/setblock 80 135 100 minecraft:air', 400);
  await cmdReply(bot, '/setblock 80 134 100 minecraft:stone', 400);
  await cmdReply(bot, '/fill 59 130 59 101 133 141 minecraft:stone', 12000);
  await say(bot, 'v5-begin');

  const SEL = `@e[name=SP3Phase_${TAG},r=9]`;
  // --- evade face: 4 evasions, re-plant the spider next to the bot each round
  await cmdReply(bot, `/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:"SP3Phase_${TAG}"}`, 1200);
  await sleep(1000);
  for (let i = 0; i < 14; i++) {
    await cmdReply(bot, `/tp @e[name=SP3Phase_${TAG},r=30] 81.5 135 100.5`, 500);
    await attack(bot, SEL, 700);
    await sleep(500);
  }
  mark('evade rounds done');

  // --- path face: 18 blocks away; survival so the phase acquires a target
  await cmd(bot, '/gamemode 0', 400);
  await tp(bot, 80, 135, 118, 700);
  await sleep(22000);

  await cmdReply(bot, '/gamemode 1', 400);
  // --- non-trigger faces -------------------------------------------------
  const evCount = () => readLog().split(/\r?\n/).reduce((n, l) => n + (l.includes('[MobLog] phase-teleport') && l.includes('kind=evade') ? 1 : 0), 0);
  const base = evCount();
  // fire: burn a fresh Phase (cap 20 HP so it survives long enough)
  await cmdReply(bot, `/summon etim:phase_spider 80 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:"SP3PhaseFire_${TAG}"}`, 1000);
  await cmdReply(bot, '/setblock 80 135 100 minecraft:fire', 600);
  await sleep(6000);
  const afterFire = evCount();
  // poison (DamageSource.MAGIC in 1.12)
  await cmdReply(bot, `/effect @e[name=SP3PhaseFire_${TAG},r=10] minecraft:poison 12 1`, 700);
  await sleep(5000);
  const afterPoison = evCount();
  // fall damage
  await cmdReply(bot, `/summon etim:phase_spider 80 142 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:"SP3PhaseFall_${TAG}"}`, 1000);
  await sleep(5000);
  const afterFall = evCount();

  await say(bot, 'v5-end');
  const lines = sliceLog('[SP3] v5-begin', '[SP3] v5-end');
  mark('--- v5 phase-teleport lines ---');
  grab(lines, 'phase-teleport').forEach((l) => mark('  ' + l.replace(/^.*\[MobLog\] /, '')));
  const evades = count(lines, 'kind=evade');
  const paths = count(lines, 'kind=path');
  const deltas = { fire: afterFire - base, poison: afterPoison - afterFire, fall: afterFall - afterPoison };
  mark(`evade=${evades} path=${paths} | non-trigger teleport deltas fire=${deltas.fire} poison=${deltas.poison} fall=${deltas.fall}`);
  mark(`evasions_left values: ${[...new Set(grab(lines, 'phase-teleport').map((l) => (/evasions_left=(-?\d+)/.exec(l) || [])[1]))].join(',')}`);
  await cmdReply(bot, '/kill @e[type=!Player]', 800);
  return { evades, paths, deltas };
}

async function phaseV6(bot) {
  await cmd(bot, '/gamemode 0');
  await cmd(bot, '/time set 1000');
  await tp(bot, 80, 135, 100, 900);
  await cmdReply(bot, '/kill @e[type=!Player]', 800);
  const effects = [];
  bot._client.on('entity_effect', (p) => {
    if (bot.entity && p.entityId === bot.entity.id) effects.push({ id: p.effectId, amp: p.amplifier, dur: p.duration });
  });
  await say(bot, 'v6-begin');
  await cmd(bot, `/effect ${NAME} minecraft:resistance 9000 4 true`, 300);
  await cmd(bot, `/effect ${NAME} minecraft:regeneration 9000 3 true`, 300);

  // melee face: summon adjacent, let the Demon hit the bot
  await cmdReply(bot, '/summon etim:demon_spider 82.5 135 100.5 {num_webs:0b,PersistenceRequired:1b}', 1200);
  await sleep(12000);
  mark('--- v6 bot effect packets ---');
  effects.forEach((e) => mark(`  id=${e.id} amp=${e.amp} dur=${e.dur}`));
  const poison = effects.filter((e) => e.id === 19);
  const slow = effects.filter((e) => e.id === 2);
  mark(`poison packets=${poison.length} (dur=${poison.map((e) => e.dur).join('/')}, amp=${poison.map((e) => e.amp).join('/')})`);
  mark(`slowness packets=${slow.length} (dur=${slow.map((e) => e.dur).join('/')}, amp=${slow.map((e) => e.amp).join('/')})`);
  const botHurt = bot.health;

  // fire/lava immunity: drop a fresh Demon into the lava basin and testfor it
  await cmdReply(bot, '/kill @e[type=!Player]', 700);
  await tp(bot, 92, 135, 138, 700);
  await cmdReply(bot, `/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b,CustomName:"SP3DemonLava_${TAG}"}`, 1200);
  await cmdReply(bot, `/tp @e[name=SP3DemonLava_${TAG},r=30] 90.5 135 130.5`, 600);
  await sleep(8000);
  const aliveLava = await cmdReply(bot, `/testfor @e[name=SP3DemonLava_${TAG},r=8]`, 900);
  const lavaPre = bot.blockAt(new Vec3(90, 135, 130));
  mark(`lava immunity: testfor reply="${aliveLava}" basinBlock=${lavaPre && lavaPre.name}`);
  // fire immunity: set the demon alight directly
  await cmdReply(bot, '/setblock 92 135 138 minecraft:fire', 500);
  await cmdReply(bot, `/tp @e[name=SP3DemonLava_${TAG},r=30] 92.5 135 138.5`, 800);
  await sleep(4000);
  const aliveFire = await cmdReply(bot, `/testfor @e[name=SP3DemonLava_${TAG},r=12]`, 900);
  mark(`fire testfor reply="${aliveFire}"`);

  await say(bot, 'v6-end');
  await cmdReply(bot, '/setblock 92 135 138 minecraft:air', 300);
  await cmdReply(bot, '/kill @e[type=!Player]', 800);
  return { poison, slow, aliveLava, aliveFire, botHurt };
}

async function phaseV7(bot) {
  await cmd(bot, '/gamemode 0');
  await cmd(bot, '/time set 1000');
  await tp(bot, 80, 135, 100, 900);
  const total = async () => {
    const msgs = [];
    const onMsg = (m) => msgs.push(m.toString());
    bot.on('message', onMsg);
    bot.chat('/state');
    await sleep(1300);
    bot.removeListener('message', onMsg);
    const m = /total=(-?\d+)/.exec(msgs.join(' '));
    return m ? parseInt(m[1], 10) : null;
  };
  await say(bot, 'v7-begin');
  await cmd(bot, `/effect ${NAME} minecraft:resistance 9000 4 true`, 300);
  await cmdReply(bot, '/etest hold minecraft:diamond_sword', 600);

  const results = [];
  const species = [
    ['black_widow_spider', '{num_webs:0b,PersistenceRequired:1b}', 8, 'SP3XpWidow'],
    ['demon_spider', '{num_webs:0b,PersistenceRequired:1b}', 15, 'SP3XpDemon'],
    ['phase_spider', '{max_num_evasions:0b,num_evasions:0b,PersistenceRequired:1b}', 10, 'SP3XpPhase'],
  ];
  for (const [type, nbt, want, cname] of species) {
    await cmdReply(bot, '/kill @e[type=!Player]', 700);
    await tp(bot, 80, 135, 100, 600);
    await sleep(900);
    const before = await total();
    const fullNbt = nbt.replace(/}$/, `,CustomName:"${cname}_${TAG}"}`);
    await cmdReply(bot, `/summon etim:${type} 81.4 135 100.5 ${fullNbt}`, 900);
    await sleep(1200);
    const sel = `@e[name=${cname}_${TAG},r=6]`;
    const testSel = `@e[name=${cname}_${TAG},r=6]`;
    let hits = 0;
    for (let k = 0; k < 14; k++) {
      await cmdReply(bot, `/tp ${testSel} 81.4 135 100.5`, 260);
      // ETIM melee reach gate measures the eye ray vs the target box: aim first
      await bot.lookAt(new Vec3(81.4, 135.35, 100.5), true);
      await sleep(160);
      const r = await attack(bot, sel, 420);
      if (r.includes('NO_TARGET')) break;
      hits++;
      const found = await cmdReply(bot, `/testfor ${testSel}`, 300);
      if (found.includes('found nothing')) break;
      await sleep(700);
    }
    await sleep(4200);
    const after = await total();
    const delta = before !== null && after !== null ? after - before : null;
    mark(`xp ${type}: before=${before} after=${after} delta=${delta} want=${want} hits=${hits}`);
    results.push({ type, before, after, delta, want, hits });
  }
  await say(bot, 'v7-end');
  return results;
}

/**
 * glow — replace the flat-world surface layer (y=4) with glowstone over the
 * room ring, so the daylight surface stops being a spawn surface (block light
 * 15 fails EntityMob.isValidLightLevel's `i <= rand(8)`). Keeps every spawn
 * attempt for the sealed dark rooms. Disposable flat world: harness terrain
 * edit, jar untouched.
 */
async function phaseGlow(bot, block = 'minecraft:glass', zr = null) {
  await cmd(bot, '/gamemode 1');
  await tp(bot, 200, 60, 200, 900);
  await sleep(1500);
  const bands = zr ? [zr] : [[64, 154], [155, 245], [246, 336]];
  for (const [z0, z1] of bands) {
    await cmdReply(bot, `/fill 64 4 ${z0} 336 4 ${z1} ${block}`, 45000);
  }
  // verify a surface cell is lit and un-spawnable-looking
  const p = bot.blockAt(new Vec3(200, 4, 200));
  mark(`glowstone slab check (200,4,200)=${p && p.name}`);
  const above = bot.blockAt(new Vec3(200, 5, 200));
  mark(`surface cell (200,5,200)=${above && above.name} light=${above && above.light} skyLight=${above && above.skyLight}`);
}

/**
 * rooms — rebuilds both observation rooms 49x49 with three spawn floors each
 * (base layers 38/41/44 and 18/21/24) so the y-sampling hits a valid floor
 * three times per room instead of once.
 */
async function phaseRooms(bot) {
  await cmd(bot, '/gamemode 1');
  await tp(bot, 200, 60, 200, 900);
  await sleep(1200);
  // room A: shell 36..47, air 38..45, floors at 40 and 43 -> bases 38/41/44
  await cmdReply(bot, '/fill 176 36 176 224 47 224 minecraft:stone', 20000);
  await cmdReply(bot, '/fill 177 38 177 223 45 223 minecraft:air', 15000);
  await cmdReply(bot, '/fill 177 40 177 223 40 223 minecraft:stone', 8000);
  await cmdReply(bot, '/fill 177 43 177 223 43 223 minecraft:stone', 8000);
  // room B: shell 16..27, air 18..25, floors at 20 and 23 -> bases 18/21/24
  await cmdReply(bot, '/fill 176 16 176 224 27 224 minecraft:stone', 20000);
  await cmdReply(bot, '/fill 177 18 177 223 25 223 minecraft:air', 15000);
  await cmdReply(bot, '/fill 177 20 177 223 20 223 minecraft:stone', 8000);
  await cmdReply(bot, '/fill 177 23 177 223 23 223 minecraft:stone', 8000);
  for (const [label, x, y, z, want] of [
    ['A base38', 200, 38, 200, 'air'], ['A floor40', 200, 40, 200, 'stone'],
    ['A base41', 200, 41, 200, 'air'], ['A floor43', 200, 43, 200, 'stone'],
    ['A base44', 200, 44, 200, 'air'], ['A roof46', 200, 46, 200, 'stone'],
    ['B base18', 200, 18, 200, 'air'], ['B floor20', 200, 20, 200, 'stone'],
    ['B base21', 200, 21, 200, 'air'], ['B floor23', 200, 23, 200, 'stone'],
    ['B base24', 200, 24, 200, 'air'], ['B roof26', 200, 26, 200, 'stone'],
  ]) {
    const b = bot.blockAt(new Vec3(x, y, z));
    mark(`rooms verify ${label} (${x},${y},${z}) = ${b && b.name} (want ${want}) ${b && b.name === want ? 'OK' : 'MISMATCH'}`);
  }
}

/** v6b — lava/fire immunity only (basin built on the spot, arena chunks loaded). */
async function phaseV6b(bot) {
  await cmd(bot, '/gamemode 1');
  await tp(bot, 80, 140, 100, 900);
  await sleep(800);
  const tag = 'SP3Demon_' + TAG;
  await cmdReply(bot, '/fill 88 135 128 92 137 132 minecraft:stone', 9000);
  await cmdReply(bot, '/fill 89 135 129 91 136 131 minecraft:air', 3000);
  await cmdReply(bot, '/setblock 90 135 130 minecraft:lava', 800);
  await cmdReply(bot, '/kill @e[type=!Player]', 900);
  await say(bot, 'v6b-begin');
  // lava face
  await cmdReply(bot, `/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b,CustomName:"${tag}"}`, 1200);
  await cmdReply(bot, `/tp @e[name=${tag},r=30] 90.5 135 130.5`, 600);
  await tp(bot, 86, 136, 128, 700);
  await sleep(9000);
  const aliveLava = await cmdReply(bot, `/testfor @e[name=${tag},r=40]`, 900);
  const basin = bot.blockAt(new Vec3(90, 135, 130));
  mark(`lava face: testfor="${aliveLava}" basin=${basin && basin.name}`);
  // fire face: a fresh demon dropped into a fire block
  await cmdReply(bot, '/setblock 92 135 138 minecraft:fire', 500);
  await cmdReply(bot, `/tp @e[name=${tag},r=30] 92.5 135 138.5`, 700);
  const at = bot.blockAt(new Vec3(92, 135, 138));
  await sleep(6000);
  const aliveFire = await cmdReply(bot, `/testfor @e[name=${tag},r=40]`, 900);
  mark(`fire face: blockAt=(92,135,138)=${at && at.name} testfor="${aliveFire}"`);
  await say(bot, 'v6b-end');
  await cmdReply(bot, '/setblock 92 135 138 minecraft:air', 300);
  await cmdReply(bot, `/kill @e[name=${tag},r=30]`, 700);
  return { aliveLava, aliveFire };
}

async function phaseV8(bot) {
  await cmd(bot, '/gamemode 1');
  await cmd(bot, '/time set 1000');
  await tp(bot, 95, 135, 100, 900);
  await say(bot, 'v8-begin');

  const lanes = [
    [64, 'minecraft:stone_slab', 5],
    [72, 'minecraft:stone', 5],
    [80, 'minecraft:stone_slab', 4],
    [88, 'minecraft:stone', 4],
    [96, 'minecraft:double_stone_slab', 5],
    [104, 'minecraft:wooden_slab', 5],
    [112, 'minecraft:stone_slab', 6],
    [120, 'minecraft:stone', 6],
  ];
  for (const [z, block, d] of lanes) {
    await cmdReply(bot, `/setblock ${65 + d} 135 ${z} ${block} 0`, 350);
    await cmdReply(bot, `/setblock ${65 + d + 1} 135 ${z} minecraft:air`, 300);
    await cmdReply(bot, `/setblock 65 135 ${z} minecraft:air`, 300);
    const pre = bot.blockAt(new Vec3(65 + d, 135, z));
    mark(`lane z=${z} ${block} d=${d} pre=${pre && pre.name}`);
  }
  const results = [];
  for (const [z, block, d] of lanes) {
    await cmdReply(bot, `/summon tnt 65.5 135 ${z}.5 {Fuse:40}`, 700);
    await sleep(3500);
    const after = bot.blockAt(new Vec3(65 + d, 135, z));
    const name = after ? after.name : 'null';
    const destroyed = !(name === 'stone_slab' || name === 'stone' || name === 'wooden_slab' || name === 'double_stone_slab');
    mark(`blast z=${z} ${block} d=${d} after=${name} destroyed=${destroyed}`);
    results.push({ z, block, d, after: name, destroyed });
  }
  await say(bot, 'v8-end');
  return results;
}

// ---------------------------------------------------------------- main
(async () => {
  const mode = process.argv[2];
  const bot = await createHarnBot({ username: NAME });
  bot.on('kicked', (r) => log('bot', 'KICKED', JSON.stringify(r)));
  try {
    if (mode === 'window') {
      await phaseWindow(bot, process.argv[3], parseInt(process.argv[4] || '180', 10));
    } else if (mode === 'v4') {
      await phaseV4(bot, parseInt(process.argv[3] || '90', 10));
    } else if (mode === 'v5') {
      await phaseV5(bot);
    } else if (mode === 'v6') {
      await phaseV6(bot);
    } else if (mode === 'v6b') {
      await phaseV6b(bot);
    } else if (mode === 'v7') {
      await phaseV7(bot);
    } else if (mode === 'v8') {
      await phaseV8(bot);
    } else if (mode === 'rooms') {
      await phaseRooms(bot);
    } else if (mode === 'glow') {
      await phaseGlow(bot, process.argv[3] || 'minecraft:glass', process.argv[4] ? [parseInt(process.argv[4],10), parseInt(process.argv[5],10)] : null);
    } else {
      throw new Error('unknown mode: ' + mode);
    }
  } finally {
    try { bot.quit(); } catch (e) { /* ignore */ }
    await sleep(600);
    process.exit(0);
  }
})().catch((e) => { console.error('FATAL', e && e.stack || e); process.exit(1); });
