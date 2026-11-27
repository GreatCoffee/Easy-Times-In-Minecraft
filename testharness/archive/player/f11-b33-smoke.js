#!/usr/bin/env node
/**
 * f11-b33-smoke (r1) — B-33 MoveToTree face smoke.
 *
 * Arena: flat cobble platform (-69..-35 x, 235..245 z, top y66), a 5-log
 * column at (-63, 67..71, 240), bot perched on top (feet y72 -> footY 72,
 * which passes the R196 filter (footY > y+2 && < y+9) for the y67/68/69
 * logs). Burning zombies carry {Fire:20000} + maxHealth 200 (fire damage is
 * 1 HP / 10 t — vanilla HP would die in ~10 s, before the arm completes).
 *
 * Arms (boot 1, livestockNeedsR196=true, mobDebugLog=true):
 *   w1 tree  : zombie at (-67,67,240), 4 blocks west of the tree -> the 1/40
 *              roll + spiral scan + player filter + getPathToXYZ(final<2.0)
 *              chain must produce a `[AILog] tree … start` row and arm the
 *              countdown (`[FireLog] countdown set=100`).
 *   w2a sustain : the parked zombie keeps re-arming (1/40 re-poll) -> roll
 *              rows with `chance=0.01` keep flowing (the boosted branch).
 *   w2b drain : both zombies teleported to (-38/-40, 67, 240) — 23-25 blocks
 *              east of the tree, outside the 16-block spiral — countdown
 *              drains (<=100 t) -> roll rows switch to `chance=0.00125`.
 *   a3 melt  : EVIDENCE ONLY (not judged). Both zombies stand on full-snow
 *              blocks (minecraft:snow = BlockSnowBlock, melt table R196
 *              :15) -> `[FireLog] melt` rows as the spread roll lands and
 *              the dy==0 resting-block face melts the snow into 7 layers.
 *
 * Boot 2 (b1, flag off): same tree + burning zombie -> zero `[AILog] tree`
 * rows AND zero `[FireLog]` rows (the seat itself is flag-gated, so even
 * probe-in rows stay dark).
 *
 * All placement / tp / summon go through srv.send (console, absolute coords,
 * no radius selectors — B-31 r1 trap 3). The bot is only the perch target.
 *
 * r1 trap 1 (fixed here): the tree-top perch + `physicsEnabled=false` got the
 * bot kicked with `multiplayer.disconnect.flying` ~5 s after the tp (the
 * B-31 ground-level perch froze onGround=true and never tripped the float
 * check; at y72 the frozen flag still reads airborne). The perch therefore
 * keeps mineflayer physics ON so the bot lands and grounds itself — no
 * physics disable anywhere in this driver.
 *
 * r1 trap 2 (root cause of the w2a/w2b/a3 all-zero): after the kick there was
 * NO player online, so the arena chunks unloaded and every later summon/tp
 * ran on a frozen world — zombie3/zombie4 never ticked (zero probes, zero
 * roll rows, Fire preserved). r2 therefore (a) keeps the bot alive for the
 * whole boot, (b) gates every arm on a `testfor` bot check (guardBot), and
 * (c) walls the platform perimeter (2-high cobble) so a wandering burning
 * zombie can't stroll off an edge into the underground lake and extinguish
 * mid-arm (zombie#2624's roll rows died exactly when it walked into the lake
 * 15 s after the kick, before the kill command ended it at +60 s).
 *
 * r2 trap 3 (the w1 starve): the bot runs SURVIVAL (no gamemode in the boot
 * chain), so the burning zombie targeted and melee'd it
 * (rfg EntityZombie.attackEntityAsMob :314-324 sets the target on fire) ->
 * EntityAIZombieAttack (priority 2) held mutex 1 and the tree seat (priority
 * 3) starved at the goal-selector level: exactly one probe row on the tick
 * before the attack task armed, then 60 s of silence. r3 pins the bot to
 * CREATIVE in stageArena -> EntityAITarget :179-181 excludes
 * disableDamage players -> no target -> no attack task -> mutex free.
 *
 * r2 trap 4 (/kill is neutered): the ETIM damage pipeline clamps the /kill
 * Float.MAX raw into final=138 while the summoned zombie carries a 200-HP
 * NBT (DamageLog 13:04:35, EntityZombie#2687), so `kill @e[type=!player]`
 * r3 trap 5 (the melt pen jam, fixed in r4): the melt-arm tp used the
 * half-block coordinate -40.5 whose floor() IS the west wall column x=-41,
 * so the burner's own cell was cobblestone (never air) and the R196
 * spread loop took the non-air else branch (catch cobble -> melt table
 * false -> silent). The snow floor at y66 was never touched. r4 re-pins
 * the burner to the pen interior cell center (-39.5 67 240.5 =
 * cell (-40, 240), air, resting block = the snow floor).
 *
 * r4 instrument (tree-face hunt): the r3 tree zero survived the mutex fix
 * (168 probe rows, ~2688 shouldExecute calls, zero starts) while every
 * paper-traceable stage (1/40 odds, spiral scan leg reach, foot filter,
 * path <2.0) computes to success. Two unknowns remain: the wandering
 * zombie's actual distance to the tree, and the path/scan behaviour.
 * r4 therefore PINS the burner 3.5 blocks west of the log column every
 * 10 s (`tp @e[type=zombie] ZOMBIE_PIN`), removing the wander unknown and
 * suppressing wander-task mutex holds. If starts still never fire with
 * the zombie parked at a known-good spot, the failure face narrows to
 * woodAt/scan/path.
 *
 * r5 one-shot diagnostic (approved by the user, reverted after the run —
 * the release sha re-verified byte-identical 06680A25…F1966A03): diag1
 * gate-hit 90 rows (the 1/40 rand face ALIVE), diag2 candN=8 every call
 * (the spiral scan + the wood face ALIVE), diag3 696 rows ALL footY=67
 * (the bot was ON THE PAD at every sample — the player foot filter
 * rejected every candidate), diag4 zero (the path face never reached).
 * Verdict: the product code is innocent — the bot SLID OFF the 1x1 log
 * perch top within 8 s (mineflayer client physics; creative = no float
 * kick). r6 replaces the log-top perch with a 3x3 cobble perch tower
 * (the stack y67-69 + the 3x3 platform at y70, at (-59, 240), east of the
 * tree) giving the bot footY=71 and a 1.5-block edge margin, plus a 1 Hz
 * `[botpos] y=` stdout self-report to prove the perch holds.
 *
 * r5 side observation: the w2b/a3 burners 23+ blocks away also produced
 * diag2 candN=8 — the scan finds the NATURAL forest wood outside the pad;
 * those candidates were all foot-filtered too. The r6 tower at (-59, 240)
 * keeps the bot's horizontal distance to any natural candidate > 5.6
 * blocks (dx² > 32), so the far arms cannot accidentally qualify.
 * left the burner alive to pollute every later arm. r3 replaces the mob
 * sweep with a void drop: R196 Entity kills at posY < -64, and repeated
 * outOfWorld ticks finish whatever survives (sweepMobs).
 *
 * r2 trap 5 (a3 redesign): the r2 a3 placed full-snow blocks at two fixed
 * tiles, but the burners WANDER (they were on cobble when their win rolls
 * landed, so the resting-block melt face never saw snow -> 0 melt rows
 * despite 5 wins). r3 builds a 1x1 pen (3x3 cobble walls, full-snow floor)
 * and teleports every zombie inside, so the resting block is snow wherever
 * a win lands.
 */
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b33-smoke';
const WORLD = 'w-b33a';
const A = 'ETIM_F7';

const BOT_TOP = '-59.5 71 240.5'; // r6: on the 3x3 cobble perch-tower top (footY=71)
const ZOMBIE_TREE = '-67 67 240';
const ZOMBIE_PIN = '-66.5 67 240.5'; // r4 position pin: 3.5 west of the log column
const MELT_CELL = '-39.5 67 240.5';  // r4: pen interior cell center (-40,240), NOT the wall column
const ZOMBIE_FAR1 = '-38 67 240';
const ZOMBIE_FAR2 = '-40 67 241';

const ev = { tag: TAG, run: 'r6', boots: [], arms: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

const treeRows = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0);
const treeStarts = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0 && l.indexOf(' start ') >= 0);
const treeProbes = (lines) => lines.filter((l) => l.indexOf('[AILog] tree') >= 0 && l.indexOf(' probe-in ') >= 0);
const fireRows = (lines) => lines.filter((l) => l.indexOf('[FireLog]') >= 0);
const fireRolls = (lines, chance) => lines.filter((l) => l.indexOf('[FireLog] roll') >= 0 && l.indexOf(' chance=' + chance + ' ') >= 0);
const fireCountdownSet = (lines) => lines.filter((l) => l.indexOf('[FireLog] countdown set=') >= 0);
const fireIgnite = (lines) => lines.filter((l) => l.indexOf('[FireLog] ignite ') >= 0);
const fireMelt = (lines) => lines.filter((l) => l.indexOf('[FireLog] melt ') >= 0);

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true });
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', world)
    : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
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
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
}

/** shared arena: pad y66, clear y67..71, gamerules, hard, night. Console-absolute only. */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  // r2 trap 3: creative bot -> disableDamage -> no mob target -> the attack
  // task (mutex 1) stays idle and the priority-3 tree seat gets its slot.
  await cmd('gamemode 1 ' + A, 400);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('time set 18000', 300);
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -60.5 67 240.5', 900); // stage spot clear of the tree column
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1200);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1200);
  // r2: 2-high perimeter walls so wandering burners can't leave the pad
  // (zombie#2624 wandered 2 blocks west into the lake and went dark at +15 s).
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 900);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 900);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 900);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 900);
  await protectBot();
  await sleep(1200);
}

/** /kill is neutered by the ETIM damage pipeline (r2 trap 4: Float.MAX raw
 *  -> final=138 vs the 200-HP NBT, zombie#2687 survived). Void-drop instead:
 *  R196 Entity kills at posY < -64, repeated outOfWorld ticks mop up. */
async function sweepMobs() {
  await cmd('tp @e[type=zombie] -70 -100 240', 500);
  await sleep(1800);
  await cmd('kill @e[type=!player]', 700); // item sweep
}

/** hard gate: the bot must stay online through every arm — a kick means the
 *  rest of the run would tick a frozen world (r1 trap 2). Throws to abort. */
async function guardBot() {
  if (!(await testforBot())) throw new Error('bot left mid-run (kicked?) — chunks would unload, aborting this boot');
}

async function protectBot() {
  await cmd(`effect ${A} minecraft:resistance 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:regeneration 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:absorption 9999 4 true`, 250);
}

/** five-log column at (-63, 67..71, 240) — BlockLog candidates in every
 *  spiral layer; the player filter qualifies for the y67/68/69 logs —
 *  PLUS a 3x3 cobble perch tower at (-59, y67-69 stack + y70 platform top):
 *  r5 diagnostic verdict (the 1/40 gate 90 hits, the scan candN=8, the foot
 *  filter footY=67 on all 696 rows, diag4 zero) — the tree face died because
 *  the bot SLID OFF the 1x1 log column top within 8 s of the perch tp
 *  (mineflayer client physics; creative = no float kick). The 3x3 top gives
 *  the bot footY=71 with a 1.5-block edge margin; the y67/68 candidates
 *  pass the foot filter (69 < 71 < 76/77) and the path lands 1 block from
 *  the column (<2.0). The tower sits east of the tree so it never blocks
 *  the zombie's west-east path. */
async function buildTree() {
  for (let y = 67; y <= 71; y++) {
    await cmd(`setblock -63 ${y} 240 minecraft:log 0`, 600);
  }
  await cmd('fill -59 67 240 -59 69 240 minecraft:cobblestone', 800);
  await cmd('fill -60 70 239 -58 70 241 minecraft:cobblestone', 800);
  await cmd('kill @e[type=!player]', 700);
}

/** burning zombie with 200 max HP (fire damage would kill vanilla HP in ~10 s). */
async function summonZombie(pos) {
  await cmd(`summon zombie ${pos} {Fire:20000,Attributes:[{Name:"generic.maxHealth",Base:200}],Health:200f}`, 900);
}

/** r4 position pin: park every burner on a known cell and hold it there.
 *  Removes the wander-distance unknown from the tree face and stops the
 *  wander task from re-arming while we wait for the 1/40 roll. */
async function pinBurner(x, y, z, times, intervalMs) {
  for (let i = 0; i < times; i++) {
    await cmd('tp @e[type=zombie] ' + x + ' ' + y + ' ' + z, 600);
    await sleep(intervalMs);
  }
}

/** r6: 1 Hz bot-altitude self-report on stdout (driver-side, no server log
 *  noise) — proves whether the bot holds the perch-tower top (y≈71) or
 *  falls back to the pad (y=67) during the tree arms. */
function watchBotY(ms) {
  const t = setInterval(() => {
    if (bot && bot.entity && bot.entity.position) {
      const y = Math.round(bot.entity.position.y * 10) / 10;
      console.log('[botpos] y=' + y + ' ground=' + bot.entity.onGround);
    }
  }, ms);
  return () => clearInterval(t);
}

/** perch the bot on the tree top. Physics stays ON: the bot must land and
 *  ground itself or the vanilla float check kicks it (~5 s, r1 trap). */
async function perchBot() {
  await cmd('tp ' + A + ' ' + BOT_TOP, 600);
  await protectBot();
  await sleep(2500); // landing settle
  if (bot && bot.entity) bot.entity.onGround = true; // nudge the client flag
}

async function treeArm(k) {
  await buildTree();
  await perchBot();
  const stopWatch = watchBotY(1000);
  try {
    await summonZombie(ZOMBIE_TREE);
    await pinBurner(-66.5, 67, 240.5, 5, 10000); // r4: park 3.5 blocks west of the log
  } finally {
    stopWatch();
  }
  const rows = since(k);
  return {
    n: treeStarts(rows).length,
    probes: treeProbes(rows).length,
    countdownSet: fireCountdownSet(rows).length,
    roll001: fireRolls(rows, '0.01').length,
    roll00125: fireRolls(rows, '0.00125').length,
    igniteN: fireIgnite(rows).length, meltN: fireMelt(rows).length,
    rows: treeStarts(rows).slice(0, 3).concat(fireCountdownSet(rows).slice(0, 2)),
    botAlive: await testforBot(),
  };
}

async function sustainArm(k) {
  // the parked zombie keeps rolling its 1/40 re-poll next to the tree
  const stopWatch = watchBotY(1000);
  try {
    await pinBurner(-66.5, 67, 240.5, 4, 10000); // r4: same pin, 45s window
  } finally {
    stopWatch();
  }
  const rows = since(k);
  return {
    roll001: fireRolls(rows, '0.01').length,
    roll00125: fireRolls(rows, '0.00125').length,
    countdownSet: fireCountdownSet(rows).length,
    treeN: treeStarts(rows).length,
    samples: fireRolls(rows, '0.01').slice(0, 2),
  };
}

async function drainArm(k) {
  await cmd('tp @e[type=zombie] ' + ZOMBIE_FAR1, 600);
  await summonZombie(ZOMBIE_FAR2); // second burner for window width
  await sleep(90000);
  const rows = since(k);
  return {
    roll00125: fireRolls(rows, '0.00125').length,
    roll001: fireRolls(rows, '0.01').length,
    countdownSet: fireCountdownSet(rows).length,
    samples: fireRolls(rows, '0.00125').slice(0, 2),
  };
}

async function meltArm(k) {
  // evidence arm (not judged): a 1x1 pen -- 3x3 cobble walls on a full-snow
  // floor -- with every burner teleported inside. r2 trap 5: snow placed at
  // two fixed tiles went silent because the zombies were WANDERING (they
  // stood on cobble when their win rolls landed). Here the resting block is
  // snow wherever a win lands; the dy==0 melt face turns the full block
  // into 7 snow layers and the embedded burner then melts the layers.
  await cmd('fill -41 66 239 -39 66 241 minecraft:snow', 900);
  await cmd('fill -41 67 239 -41 68 241 minecraft:cobblestone', 700);
  await cmd('fill -39 67 239 -39 68 241 minecraft:cobblestone', 700);
  await cmd('fill -41 67 239 -39 68 239 minecraft:cobblestone', 700);
  await cmd('fill -41 67 241 -39 68 241 minecraft:cobblestone', 700);
  await cmd('tp @e[type=zombie] ' + MELT_CELL, 600); // r4 trap 5 fix: interior cell center
  await pinBurner(-39.5, 67, 240.5, 8, 10000);       // keep the burner on the snow
  const rows = since(k);
  return {
    meltN: fireMelt(rows).length,
    roll00125: fireRolls(rows, '0.00125').length,
    samples: fireMelt(rows).slice(0, 3),
  };
}

async function testforBot() {
  const from = srv.all.length;
  srv.send(`testfor @e[type=player,name=${A}]`);
  await sleep(400);
  const rows = srv.all.slice(from).map(L.strip);
  return rows.some((l) => /^Found \S+/.test(l) || /: Found \S+/.test(l));
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.w1 = await treeArm(k);
    console.log('[w1]', JSON.stringify({ n: ev.arms.w1.n, probes: ev.arms.w1.probes, cd: ev.arms.w1.countdownSet, r001: ev.arms.w1.roll001, r00125: ev.arms.w1.roll00125 }));
    await guardBot();
    await sweepMobs();
  }
  {
    const k = srv.all.length;
    await buildTree();
    await perchBot();
    await summonZombie(ZOMBIE_TREE);
    await sleep(3000);
    ev.arms.w2a = await sustainArm(k);
    console.log('[w2a]', JSON.stringify({ r001: ev.arms.w2a.roll001, r00125: ev.arms.w2a.roll00125, cd: ev.arms.w2a.countdownSet, tree: ev.arms.w2a.treeN }));
    await guardBot();
  }
  {
    const k = srv.all.length;
    ev.arms.w2b = await drainArm(k);
    console.log('[w2b]', JSON.stringify({ r00125: ev.arms.w2b.roll00125, r001: ev.arms.w2b.roll001, cd: ev.arms.w2b.countdownSet }));
    await guardBot();
  }
  {
    const k = srv.all.length;
    ev.arms.a3 = await meltArm(k);
    console.log('[a3]', JSON.stringify({ melt: ev.arms.a3.meltN, r00125: ev.arms.a3.roll00125 }));
    await guardBot();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  {
    const k = srv.all.length;
    await buildTree();
    await perchBot();
    await summonZombie(ZOMBIE_TREE);
    await sleep(30000);
    const rows = since(k);
    ev.arms.b1 = {
      treeN: treeRows(rows).length,
      fireN: fireRows(rows).length,
    };
    console.log('[b1]', JSON.stringify({ tree: ev.arms.b1.treeN, fire: ev.arms.b1.fireN }));
    await sweepMobs();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const w1 = ev.arms.w1, w2a = ev.arms.w2a, w2b = ev.arms.w2b, a3 = ev.arms.a3, b1 = ev.arms.b1;
  a3.note = 'evidence-only: the melt face rides the same per-tick roll as W2b (0.00125), Poisson-hungry in a 90 s window';
  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || !(w1.n >= 1 && w1.countdownSet >= 1 && w1.roll001 >= 1)
    || !(w2a.roll001 >= 1)
    || !(w2b.roll00125 >= 1)
    || !(b1.treeN === 0 && b1.fireN === 0);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    w1: w1.n, w1cd: w1.countdownSet, w1r001: w1.roll001,
    w2ar001: w2a.roll001,
    w2br00125: w2b.roll00125,
    a3melt: a3.meltN,
    b1tree: b1.treeN, b1fire: b1.fireN,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    bad: bad ? 1 : 0,
  }));
  process.exitCode = bad ? 2 : 0;
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal]', e);
  try { if (srv) await srv.stop(); } catch (e2) { /* noop */ }
  try { if (bot) bot.quit(); } catch (e2) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e2) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e2) { /* noop */ }
  process.exit(1);
});
