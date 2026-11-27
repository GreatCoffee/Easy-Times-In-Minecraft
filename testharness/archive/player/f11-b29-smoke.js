#!/usr/bin/env node
/**
 * f11-b29-smoke.js — R196 panicflee family (B-29: EntityAIFleeAttackerOrPanic)
 * smoke driver. B-28 shape: two boots (flag on / flag off), driver-managed
 * world, [AILog] panicflee rows are the face; [FarmLog] row NOT the face.
 *
 * R196 faces (EntityAIFleeAttackerOrPanic :1-100 verbatim):
 *   shouldExecute :24-28 — considerFleeing() + (has_decided_to_flee || isPanicking())
 *   isPanicking() — burn or spook flips the state + countdown=next(100)+100
 *   startExecuting :81-89 — !is_done_panicking && nextFloat < chance -> startPanicking
 *   updateTask :92-99 — burning re-triggers; countdown->0 -> done; stuck/noPath resets
 *   continueExecuting :101-104 — no !stuck&&!noPath (unlike B-19 港式)
 *   getMovementSpeed :106-109 — +0.2F when panicking
 *
 * R196 seat table (per the R196 ctors):
 *   Cow :17 speed=1.6F chance=0.5F (prio 1)
 *   Pig :28 speed=1.4F chance=0.5F
 *   Sheep :43 speed=1.4F chance=0.5F
 *   Chicken :22 speed=1.3F chance=0.75F
 *   Wolf :39 speed=1.0F chance=0.0F — the CHANCE-0 face: the roll NEVER
 *      re-triggers, but the flee/burn faces ride the same arm.
 * 1.12 vanilla: every animal has EntityAIPanic (prio 1 speed 1.6F-ish);
 * REMOVE-IF face under the flag = the R196 seat owns the slot.
 *
 * Arms (boot 1 flag on):
 *   A1 cow punch: 4 cows on pad, bot creative-punches each; the hurt arm
 *      sets the flee face -> panicflee start rows   >=1 panic start
 *   A2 chicken arm: 4 chickens -> same shape       >=1
 *   A3 wolf arm: wolves punch -> chance-0 = the flee face ONLY (revenge)
 *      -> >=1 start with speed 1.0F face
 * Arms (boot 2 flag off): B1 replay punch cows ->  ZERO panic rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b29-smoke';
const WORLD = 'w-b29a';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 68, z: 242 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const panicRows = (lines) => lines.filter((l) => l.indexOf('panicflee') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);

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
  await L.stage(srv, bot, { gamemode: 1, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  // r14 修位：r1-r13 病灶 = fill/summon 都用绝对坐标打在「bot 还没到场」的
  // 半加载/未生成 chunk 上，mob summon 完秒落 void（b1.out DamageLog 全
  // outOfWorld，fine=0）。改法 = ①bot 先 tp 到 pad（玩家在场 = chunk 被
  // 玩家态持续加载）②fill/summon 全部以 bot 脚下为原点相对执行（execute
  // <bot> ~ ~ ~ ...），绝对坐标链整个废弃。
  await cmd('tp ' + A + ' -69.5 67 242.5', 700);
  await sleep(2500);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 minecraft:cobblestone', 700);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~ ~-5 ~5 ~4 ~5 minecraft:air', 700);
  await sleep(2500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('effect ' + A + ' minecraft:invisibility 1000000 0 true', 500);
  console.log('[botpos]', A, 'staged', JSON.stringify(bot.entity.position));
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

/**
 * bot left-clicks the mob — the 1.12 attack token face
 * (/etest attack <selector> [player] — r1 全零破案：'etest punch' 是幻 token
 * —— CommandDevTest 只有 hurt/attack 两 case；改打了 TestDriver.attack =
 * CPacketUseEntity 的玩家左键路径).
 */
async function punchMob(mobType) {
  // r13: the selector runs against the SENDER's position — the console
  // sender has no pad-side position, so @e[...] from the console never
  // lands a target. The BOT is the sender-side fix: it sends the command
  // itself from the pad bank (mobs within radius 8 of ITS feet).
  const name = mobType.charAt(0).toUpperCase() + mobType.slice(1).toLowerCase();
  // r15: alive-vs-selector 定谳探针 —— bot 先广播 BOOTALIVE（半径 8 内
  // 每个活体 echo 一行），echo 行数 >0 即 mob 存活且在圈内 → NO_TARGET
  // 就是引擎匹配层破；echo =0 则是存活层破（mob 不在场）。
  console.log('[botpos]', A, JSON.stringify(bot.entity.position));
  bot.chat('/execute @e[type=' + name + ',r=8] ~ ~ ~ say BOOTALIVE');
  await sleep(1200);
  bot.chat('/etest attack @e[type=' + name + ',r=8,c=1]');
  await sleep(1500);
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: cow panic arm — 4 cows, one punch each; 45 s观察窗
  {
    const k = srv.all.length;
    for (let i = 0; i < 4; i++) {
      const dx = [-73, -71, -70, -75][i];
      await cmd('execute ' + A + ' ~ ~ ~ summon cow ~' + (dx + 70) + ' ~ ~-1', 500);
    }
    await sleep(1200);
    await punchMob('cow');
    await sleep(45000);
    const rows = panicRows(since(k));
    ev.arms.a1 = { n: rows.length, rows: rows.slice(0, 6), probes: since(k).filter((l) => l.indexOf('probe-in') >= 0).length };
    await sweep();
  }

  // A2: chicken panic arm — 4 chickens, one punch each; 45 s窗
  {
    const k = srv.all.length;
    for (let i = 0; i < 4; i++) {
      const dx = [-73, -71, -70, -75][i];
      await cmd('execute ' + A + ' ~ ~ ~ summon chicken ~' + (dx + 70) + ' ~ ~-1', 500);
    }
    await sleep(1200);
    await punchMob('chicken');
    await sleep(45000);
    const rows = panicRows(since(k));
    ev.arms.a2 = { n: rows.length, rows: rows.slice(0, 6), probes: since(k).filter((l) => l.indexOf('probe-in') >= 0).length };
    await sweep();
  }

  // A3: wolf chance-0 arm — 2 wolves, punch; revenge flee face ONLY
  {
    const k = srv.all.length;
    for (let i = 0; i < 2; i++) {
      const dx = [-73, -71][i];
      await cmd('execute ' + A + ' ~ ~ ~ summon wolf ~' + (dx + 70) + ' ~ ~-1', 500);
    }
    await sleep(1200);
    await punchMob('wolf');
    await sleep(45000);
    const rows = panicRows(since(k));
    ev.arms.a3 = { n: rows.length, rows: rows.slice(0, 6), probes: since(k).filter((l) => l.indexOf('probe-in') >= 0).length };
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: whole-family replay flag off — zero panic rows (the vanilla seat keeps its shape)
  {
    const k = srv.all.length;
    for (let i = 0; i < 4; i++) {
      const dx = [-73, -71, -70, -75][i];
      await cmd('execute ' + A + ' ~ ~ ~ summon cow ~' + (dx + 70) + ' ~ ~-1', 500);
    }
    await sleep(1200);
    await punchMob('cow');
    await sleep(40000);
    ev.arms.b1 = { n: panicRows(since(k)).length, probes: since(k).filter((l) => l.indexOf('probe-in') >= 0).length };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.n < 1 || ev.arms.a2.n < 1 || ev.arms.a3.n < 1 || ev.arms.b1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2rows: ev.arms.a2.rows, a2probes: ev.arms.a2.probes,
    a3: ev.arms.a3.n, a3rows: ev.arms.a3.rows, a3probes: ev.arms.a3.probes,
    b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
