#!/usr/bin/env node
/**
 * f15-reg-chains — B-70TY 回归网第二轮（公共链通道窗口）。
 *
 * 由来：`REGRESSION.md` 在 B-70TW 后为 21/51，剩下 30 个 GAP 里这八条是每批都可能
 * 碰到的公共链。本窗口只断言「行在且关键字段对」，作为退化的第一道网：
 *
 *   W1 FishLog     `/etest fishgate` + `fishprobe` → gate token 行 + type 行
 *   W2 CraftingLog `/etest anvilplan` → anvilplan 行
 *   W3 IngestLog   `/etest food` + 手持熟牛肉右键 → start eating 行
 *   W4 FurnaceLog  注册期判据行（每次起服必打）
 *   W5 MeleeLog    附魔 stun 剑 + bot.attack → melee target 行
 *   W6 DeathLog    xp + kill → death orb dump / keepInventory 行
 *   W7 OreLog      tp 到未生成区块 → 逐矿逐区块行
 *
 * 判据只认服务端日志；不操作客户端。
 */
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-reg-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    difficulty: 1,
    tp: [4.5, 130, 6.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: false, doMobLoot: false,
      naturalRegeneration: true, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    fill: ['time set 18000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 132 15 minecraft:air'],
  },
  cfg: [
    'fishing:fishingDebugLog',
    'crafting:craftingDebugLog',
    'food:ingestDebugLog',
    'furnace:furnaceDebugLog',
    'combat:meleeDebugLog',
    'death:deathDebugLog',
  ],
});
const { cmd, mark, waitRow } = h;

const FISH_GATE_RE = /\[FishLog\] gate token=1 wt=(-?\d+)/;
const FISH_TYPE_RE = /\[FishLog\] type n=(\d+) cod=(\d+) salmon=(\d+)/;
const ANVIL_RE = /\[CraftingLog\] anvilplan player=(\S+) item=(\S+) kind=(\S+)/;
const INGEST_RE = /\[IngestLog\] (\S+) \(\d+\) (\S:[\w:]+) start eating/;
const FURNACE_RE = /\[FurnaceLog\] 8 judged smelting rows registered/;
const MELEE_RE = /\[MeleeLog\] melee target=(\S+) lvl_stun=(\d+) lvl_vamp=(\d+) lvl_disarm=(\d+)/;
const DEATH_RE = /\[DeathLog\] (\S+) \(\d+\) death (orb dump|keepInventory)/;
const ORE_RE = /\[OreLog\] ore=(\S+) chunk=\((-?\d+),(-?\d+)\)/;

const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

async function main() {
  h.stampPin();
  await h.boot(`f15-${RUN}-b1`);
  await h.join();

  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false, w7: false };

  // ---- W1: fishing gate + fish type (bot is the command sender) ----
  let from = mark();
  h.bot.chat('/etest fishgate 1000 0 0 false false 5');
  h.bot.chat('/etest fishprobe type 50');
  const gates = await waitRow(FISH_GATE_RE, from, 10000);
  const types = await waitRow(FISH_TYPE_RE, from, 10000);
  const t = lastOf(types);
  res.w1 = gates.length > 0 && !!t && +t[1] === 50 && (+t[2] + +t[3]) === 50;
  console.log('[W1]', JSON.stringify({ gateRows: gates.length, type: t && { n: +t[1], cod: +t[2], salmon: +t[3] }, pass: res.w1 }));

  // ---- W2: anvil plan row (console sender + explicit player) ----
  from = mark();
  await cmd(`etest anvilplan ${A} minecraft:iron_pickaxe`, 900);
  const anvils = await waitRow(ANVIL_RE, from, 8000);
  const an = lastOf(anvils);
  res.w2 = !!an && an[1] === A && an[2] === 'minecraft:iron_pickaxe';
  console.log('[W2]', JSON.stringify({ anvil: an && { player: an[1], item: an[2], kind: an[3] }, pass: res.w2 }));

  // ---- W3: ingest start-eating row (hold food, right-click) ----
  await cmd(`etest food 4 ${A}`, 400);
  await cmd(`etest hold minecraft:cooked_beef ${A}`, 400);
  from = mark();
  try { await h.bot.activateItem(); } catch (e) { /* older mineflayer name */ }
  const ingests = await waitRow(INGEST_RE, from, 8000);
  const ing = lastOf(ingests);
  res.w3 = !!ing && ing[1] === A;
  console.log('[W3]', JSON.stringify({ ingest: ing && { player: ing[1], item: ing[2] }, pass: res.w3 }));

  // ---- W4: furnace registration row (boot-time judgement channel) ----
  const furnace = await waitRow(FURNACE_RE, 0, 4000);
  res.w4 = furnace.length === 1;
  console.log('[W4]', JSON.stringify({ rows: furnace.length, pass: res.w4 }));

  // ---- W5: melee row needs a stun/vampiric/disarming weapon ----
  await cmd('summon minecraft:zombie 7.5 130 6.5 {NoAI:1b,PersistenceRequired:1b}', 600);
  await cmd(`etest hold minecraft:diamond_sword ${A}`, 400);
  await cmd(`etest enchant mainhand 1 stun ${A}`, 600);
  await cmd(`tp ${A} 6.2 130 6.5`, 600);
  from = mark();
  const zombie = Object.values(h.bot.entities).find((e) => e && e.name === 'zombie');
  if (!zombie) { console.log('[W5]', JSON.stringify({ error: 'no zombie entity in bot view', pass: false })); }
  else {
    try { h.bot.attack(zombie); } catch (e) { console.log('[W5]', JSON.stringify({ error: String(e), pass: false })); }
    const melee = await waitRow(MELEE_RE, from, 8000);
    const me = lastOf(melee);
    res.w5 = !!me && +me[2] >= 1;
    console.log('[W5]', JSON.stringify({ melee: me && { target: me[1], stun: +me[2] }, pass: res.w5 }));
  }

  // ---- W6: death row (xp + kill; keepInventory=false) ----
  await cmd(`xp 30 ${A}`, 400);
  from = mark();
  await cmd(`kill ${A}`, 600);
  const deaths = await waitRow(DEATH_RE, from, 10000);
  const de = lastOf(deaths);
  res.w6 = !!de && de[1] === A;
  console.log('[W6]', JSON.stringify({ death: de && { player: de[1], kind: de[2] }, rows: deaths.length, pass: res.w6 }));

  // ---- W7: ore gen rows on a fresh chunk ----
  await cmd(`tp ${A} 4000 80 4000`, 1000);
  from = mark();
  const ores = await waitRow(ORE_RE, from, 15000);
  res.w7 = ores.length > 0;
  console.log('[W7]', JSON.stringify({ oreRows: ores.length, sample: ores.slice(0, 3).map((r) => r[1]), pass: res.w7 }));

  await cmd('kill @e[type=!player]', 300);
  await h.stop();
  h.finish(res);
}

h.guard(main);
