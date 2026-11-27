#!/usr/bin/env node
/**
 * f17-reg-fourth — B-70UA 回归网第四轮（共用子系统通道窗口）。
 *
 * 由來：B-70TZ 后 `REGRESSION.md` 为 36/51，本窗口再补 6 条「改一处波及一片」的通道：
 *
 *   W1 BlockLog   `/etest blockcube <x y z>` → 石面 result=true / 空气 result=false
 *   W2 CapLog     `/xp add … 10 levels` → lvl/cap/prevBase/heal 行（playerCapDebugLog 门）
 *   W3 MobLog     带等级攻击僵尸 → level-modifier lvl/melee bonus 行（mobDebugLog 门）
 *   W4 DimLog     boot 期 `worlds=` + `portal block registered` 行（underworldDebugLog 门）
 *   W5 ButchLog   击杀牛 → cow well/lvl/leather 行（butcheringDebugLog 门）
 *   W6 SkillLog   `/etest skills <player> <mask>` → set 行 + get 行（无门，命令自带）
 *
 * 判据只认服务端日志；不操作客户端。
 */
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-reg4-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    difficulty: 1,
    tp: [4.5, 130, 6.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: true, doMobLoot: true,
      naturalRegeneration: true, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    fill: ['time set 1000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 133 15 minecraft:air'],
  },
  cfg: [
    'combat:blockDebugLog',
    'playercaps:playerCapDebugLog', // C-B70UA-1: the cfg section header is `playercaps` (lowercase)
    'mobs:mobDebugLog',
    'mobs:underworldDebugLog',
    'combat:butcheringDebugLog',
  ],
});
const { cmd, mark, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// C-B70UA-2: the position field is `BlockPos{x=3, y=129, z=3}` — it contains spaces,
// so `at (\S+)` never matched (r2 W1 rows=0 against real rows).
const CUBE_RE = /\[BlockLog\] solidcube at (BlockPos\{[^}]*\}) block=(\S+) fullCube=(\S+) moves=(\S+) result=(\S+)/;
const CAP_RE = /\[CapLog\] lvl=(-?\d+) cap=(-?\d+) prevBase=([\d.]+) healthBefore=([\d.]+) heal=([\d.]+) healthAfter=([\d.]+)/;
const MOB_RE = /\[MobLog\] level-modifier lvl=(-?\d+) melee bonus=([\d.]+)/;
const DIM_WORLDS_RE = /\[DimLog\] worlds=\[([^\]]*)\]/;
const DIM_PORTAL_RE = /\[DimLog\] portal block registered/;
const BUTCH_RE = /\[ButchLog\] cow well=(\S+) lvl=(-?\d+) leather=(-?\d+)/;
const SKILL_SET_RE = /\[SkillLog\] set player=(\S+) mask=(\d+)/;
const SKILL_GET_RE = /\[SkillLog\] get player=(\S+) mask=(\d+)/;

const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

async function main() {
  h.stampPin();
  await h.boot(`f17-${RUN}-b1`);
  await h.join();

  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1: BlockLog (solid-form cube carrier) ----
  let from = mark();
  await cmd('etest blockcube 3 129 3', 300);  // stone platform
  await cmd('etest blockcube 3 130 3', 300);  // air above it
  await sleep(400);
  const cubes = await waitRow(CUBE_RE, from, 5000);
  const stoneCube = cubes.find((r) => r[2] === 'minecraft:stone');
  const airCube = cubes.find((r) => r[2] === 'minecraft:air');
  res.w1 = !!stoneCube && stoneCube[5] === 'true' && !!airCube && airCube[5] === 'false';
  console.log('[W1]', JSON.stringify({
    stone: stoneCube && { fullCube: stoneCube[3], moves: stoneCube[4], result: stoneCube[5] },
    air: airCube && { fullCube: airCube[3], moves: airCube[4], result: airCube[5] },
    rows: cubes.length, pass: res.w1,
  }));

  // ---- W2: CapLog (level-driven health/food cap) ----
  from = mark();
  // C-B70UA-3: 1.12 has no `/xp add <player> <n> levels` (r2: `'add' is not a valid number`);
  // the vanilla form is `/xp <amount>L <player>`. Levels drive both CapLog and the
  // MobLog level modifier, so W2/W3 share this arm's outcome.
  await cmd(`xp 10L ${A}`, 400);
  await sleep(1200);
  const caps = await waitRow(CAP_RE, from, 8000);
  const cap = lastOf(caps);
  res.w2 = !!cap && +cap[1] >= 5 && +cap[2] > parseFloat(cap[3]);
  console.log('[W2]', JSON.stringify({
    row: cap && { lvl: +cap[1], cap: +cap[2], prevBase: +cap[3], heal: +cap[5] },
    rows: caps.length, pass: res.w2,
  }));

  // ---- W3: MobLog (level-scaled melee modifier) ----
  from = mark();
  await cmd('summon minecraft:zombie 6.5 130 2.5 {NoAI:1b,PersistenceRequired:1b,Health:40f}', 400);
  await sleep(400);
  await cmd(`etest hit @e[type=minecraft:zombie,c=1] 5 ${A}`, 900);
  await sleep(600);
  const mobs = await waitRow(MOB_RE, from, 8000);
  const mob = lastOf(mobs);
  res.w3 = !!mob && +mob[1] > 0 && parseFloat(mob[2]) > 1.0;
  console.log('[W3]', JSON.stringify({ row: mob && { lvl: +mob[1], bonus: +mob[2] }, rows: mobs.length, pass: res.w3 }));

  // ---- W4: DimLog (boot-time dimension rows) ----
  // Boot rows precede any mark(); read the whole log.
  const dimWorlds = await waitRow(DIM_WORLDS_RE, 0, 5000);
  const dimPortal = await waitRow(DIM_PORTAL_RE, 0, 5000);
  const dw = lastOf(dimWorlds);
  res.w4 = !!dw && dimPortal.length > 0 && dw[1].split(',').length >= 2;
  console.log('[W4]', JSON.stringify({ worlds: dw && dw[1], portal: dimPortal.length, pass: res.w4 }));

  // ---- W5: ButchLog (family kill row) ----
  from = mark();
  await cmd('kill @e[type=minecraft:zombie]', 300);
  await cmd('summon minecraft:cow 9.5 130 2.5 {NoAI:1b,PersistenceRequired:1b}', 400);
  await sleep(400);
  await cmd(`etest hit @e[type=minecraft:cow,c=1] 100 ${A}`, 900);
  await sleep(800);
  const butch = await waitRow(BUTCH_RE, from, 8000);
  const bc = lastOf(butch);
  res.w5 = !!bc && bc[1] === 'true' && +bc[2] >= 0;
  console.log('[W5]', JSON.stringify({ row: bc && { well: bc[1], lvl: +bc[2], leather: +bc[3] }, rows: butch.length, pass: res.w5 }));

  // ---- W6: SkillLog (set + get round trip) ----
  from = mark();
  await cmd(`etest skills ${A} 3`, 400);
  await cmd(`etest skills ${A}`, 400);
  await sleep(400);
  const skillSet = await waitRow(SKILL_SET_RE, from, 5000);
  const skillGet = await waitRow(SKILL_GET_RE, from, 5000);
  const ss = lastOf(skillSet);
  const sg = lastOf(skillGet);
  res.w6 = !!ss && ss[1] === A && ss[2] === '3' && !!sg && sg[2] === '3';
  console.log('[W6]', JSON.stringify({
    set: ss && { player: ss[1], mask: +ss[2] }, get: sg && { mask: +sg[2] }, pass: res.w6,
  }));

  await cmd('kill @e[type=!player]', 300);
  await h.stop();
  h.finish(res);
}

h.guard(main);
