#!/usr/bin/env node
/**
 * f11-b30-smoke.js — R196 wander-back family (B-30: EntityAIWanderBackToSpawnPoint)
 * smoke driver. B-29 shape: two boots (flag on / flag off), driver-managed
 * world, [AILog] wanderback rows are the face; [FarmLog] row NOT the face.
 *
 * R196 faces (EntityAIWanderBackToSpawnPoint :1-22 verbatim):
 *   shouldExecute :10-14 — nextInt(40)<=0 && !(distSq < 64.0)  (8 blocks² gate)
 *   getMovementPath :13-16 — findPathTowardXYZ(spawn 16 steps)
 *   continueExecuting :17-19 — distSq < 64.0 ? false : super
 *
 * R196 seat (ctor): EntityWitch :46 — addTask(3, WanderBack, 1.0F)
 *   (only lib mob with this AI; EntityLivestock :19-24 has NONE).
 * Spawn memory carrier:
 *   R196 World.spawnEntityInWorld :1993-1995 = floor(x/y/z) on first join.
 *   Carrier = our ETIMLivestock IState spawnX/Y/Z + spawnSet latch
 *   (written once on first EntityJoinWorldEvent join; chunk-reload joins
 *   do NOT re-pin — R196 World NBT spawn_x/y/z shape, Entity :1846/:1896).
 *
 * Arms (boot 1 flag on):
 *   A1 witch arm: 4 witches on pad -> tp 23 blocks away (distSq>=64)
 *      -> 60 s window -> >=1 wanderback start
 *   A2 memo arm: 1 witch at ~-3 ~ ~-1 (floor spawn = -70 67 241), tp 25 x / -9 z
 *      -> 60 s window -> >=1 start AND row spawn= field = -70 67 241
 * Arms (boot 2 flag off): B1 same shape -> ZERO wanderback rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b30-smoke';
const WORLD = 'w-b30a';
const A = 'ETIM_F7';
const SPAWN_CELL = 'spawn=(-70,67,241)'; // r1 实锤行形（括号+逗号；driver 常量曾少括号=假阴）

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
/** bot-side command send — the execution position is the BOT's feet
 *  (console has no in-world position: relative coords resolve against
 *  the console, which broke the r1-r4 face break in B-16). */
const bcmd = async (line, wait) => { bot.chat('/' + line); await sleep(wait === undefined ? 400 : wait); };

const wRows = (lines) => lines.filter((l) => l.indexOf('wanderback') >= 0 && l.indexOf(' start ') >= 0);
const wProbes = (lines) => lines.filter((l) => l.indexOf('wanderback') >= 0 && l.indexOf(' probe-in ') >= 0);

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

async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 3, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('tp ' + A + ' -69.5 67 242.5', 700);
  await sleep(2500);
  // B-29 r14 fix carried: bot on-pad FIRST, then everything executes relative
  // to its feet (chunk load + correct resolution both ride the bot face).
  await bcmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 minecraft:cobblestone', 700);
  await bcmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~ ~-5 ~5 ~4 ~5 minecraft:air', 700);
  // r2 教训：tp 落点（~23 东）是 raw fresh 地形——不可走地面把回家路堵死
  // （path=false 全场）。r3 修 = pad 外再铺一条东向走廊（x +5..+35, z
  // bot±2），tp 全部落走廊上，回家路全程铺面。
  await bcmd('execute ' + A + ' ~ ~ ~ fill ~5 ~-1 ~-2 ~35 ~-1 ~2 minecraft:cobblestone', 700);
  await bcmd('execute ' + A + ' ~ ~ ~ fill ~5 ~ ~-2 ~35 ~4 ~2 minecraft:air', 700);
  await sleep(2500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('effect ' + A + ' minecraft:invisibility 1000000 0 true', 500);
  console.log('[botpos]', A, 'staged', JSON.stringify(bot.entity.position));
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

/** The witch arm bodies share one shape: summon witches on the pad (the
 *  join world event pins the spawn memo), then push them out past the
 *  8-block radius with a bot-side relative tp, then hold the observation
 *  window — [AILog] wanderback rows are the judged face. */
async function witchArm(layout) {
  for (const dx of [-73, -71, -70, -75]) {
    await cmd('execute ' + A + ' ~ ~ ~ summon witch ~' + (dx + 70) + ' ~ ~-1', 500);
  }
  await sleep(1500);
  await bcmd(layout);
  await sleep(1000);
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: 4 witches -> tp 23 east (telport lands on the corridor) -> 60 s window
  {
    const k = srv.all.length;
    await witchArm('tp @e[type=witch,r=24] ~23 ~ ~');
    await sleep(60000);
    const rows = wRows(since(k));
    const pathTrue = rows.filter((l) => l.indexOf('path=true') >= 0).length;
    ev.arms.a1 = { n: rows.length, pathTrue: pathTrue, rows: rows.slice(0, 6), probes: wProbes(since(k)).length };
    await sweep();
  }

  // A2: memo arm — tp onto the corridor, judge the spawn= memo face.
  {
    const k = srv.all.length;
    await witchArm('tp @e[type=witch,r=24] ~12 ~ ~');
    await sleep(60000);
    const rows = wRows(since(k));
    const memoRows = rows.filter((l) => l.indexOf(SPAWN_CELL) >= 0);
    ev.arms.a2 = { n: rows.length, memoN: memoRows.length, rows: rows.slice(0, 6), probes: wProbes(since(k)).length };
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: flag-off replay — zero wanderback rows (no mixin seat at all)
  {
    const k = srv.all.length;
    await witchArm('tp @e[type=witch,r=24] ~23 ~ ~');
    await sleep(50000);
    ev.arms.b1 = { n: wRows(since(k)).length, probes: wProbes(since(k)).length };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.n < 1 || ev.arms.a1.pathTrue < 1   // r2 假绿教训：光数行不够，path 真行必须 ≥1
    || ev.arms.a2.memoN < 1
    || ev.arms.b1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1pathTrue: ev.arms.a1.pathTrue, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2memo: ev.arms.a2.memoN, a2rows: ev.arms.a2.rows, a2probes: ev.arms.a2.probes,
    b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
