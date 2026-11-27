#!/usr/bin/env node
/**
 * f14-reg-core — B-70TW 回归核心窗口（DamageLog / TestLog / MiningLog）。
 *
 * 由来：`REGRESSION.md` 里这三个通道此前只有 GAP（16/51），而它们是后续每一批
 * 都会碰的公共链（伤害入口、玩家击杀探针、挖掘 str）。本窗口只断言「行在且
 * 关键字段对」，不比整行文本，作为退化的第一道网。
 *
 * 判臂：
 *   W1 玩家源击杀 → `[TestLog] hit player=… amount=5` + ≥1 条 `[DamageLog] dmg … raw=5.000`
 *   W2 石镐挖石   → `[MiningLog] mine speed item=minecraft:iron_pickaxe block=stone`
 *   W3 二次击杀 10 → `[DamageLog] … raw=10.000`（值级对位，防「行在但数变」）
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
    difficulty: 2,
    tp: [4.5, 130, 6.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: true, doMobLoot: false,
      naturalRegeneration: false, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    // C-B70TW-1: 夜（time 18000）—— r1 在日光下召唤的僵尸每 tick 受 onFire 1.000，
    // 会在 W1 的 8 s 等待里烧死，物证被 [DamageLog] dmg src=onFire 噪声淹没。
    fill: ['time set 18000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 132 15 minecraft:air'],
  },
  cfg: ['combat:damageDebugLog', 'metal:miningDebugLog'],
});
const { cmd, mark, waitRow } = h;

const HIT_RE = /\[TestLog\] hit player=(\S+) target=(\S+) amount=([\d.]+)/;
const DMG_RE = /\[DamageLog\] dmg target=(\S+) src=(\S+) raw=([\d.]+) armorIn=([\d.-]+) armorOut=([\d.-]+) absorption=([\d.-]+) final=([\d.]+)/;
const MINE_RE = /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([\d.]+)/;

const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

async function main() {
  h.stampPin();
  await h.boot(`f14-${RUN}-b1`);
  await h.join();

  const res = { w1: false, w2: false, w3: false };

  // ---- W1: player-source hit -> TestLog + DamageLog ----
  await cmd('summon minecraft:zombie 6.5 130 6.5 {NoAI:1b,PersistenceRequired:1b}', 600);
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest hit @e[type=zombie,c=1] 5 ${A}`, 900);
  const hits = await waitRow(HIT_RE, from, 8000);
  const dmgs = await waitRow(DMG_RE, from, 8000);
  const hit = lastOf(hits);
  const d5 = dmgs.filter((r) => +r[3] === 5);
  res.w1 = !!hit && hit[1] === A && /^EntityZombie/.test(hit[2]) && +hit[3] === 5 && d5.length > 0;
  console.log('[W1]', JSON.stringify({
    hit: hit && { player: hit[1], target: hit[2], amount: +hit[3] },
    dmgRows: dmgs.length, raw5: d5.length, pass: res.w1,
  }));

  // ---- W2: dig stone with a pickaxe -> MiningLog mine speed ----
  await cmd(`replaceitem entity ${A} slot.weapon.mainhand minecraft:iron_pickaxe`, 500);
  await cmd(`tp ${A} 4.5 130 3.2`, 600);
  from = mark();
  await cmd(`etest dig 4 129 2 ${A}`, 3000);
  const mine = await waitRow(MINE_RE, from, 10000);
  const m = lastOf(mine);
  res.w2 = !!m && m[1] === 'minecraft:iron_pickaxe' && m[2] === 'stone' && +m[3] > 0;
  console.log('[W2]', JSON.stringify({
    mine: m && { item: m[1], block: m[2], str: +m[3] }, rows: mine.length, pass: res.w2,
  }));

  // ---- W3: value check on the same channel (5 -> 10) ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest hit @e[type=zombie,c=1] 10 ${A}`, 900);
  const dmgs2 = await waitRow(DMG_RE, from, 8000);
  const d10 = dmgs2.filter((r) => +r[3] === 10);
  res.w3 = d10.length > 0;
  console.log('[W3]', JSON.stringify({ raw10: d10.length, rows: dmgs2.length, pass: res.w3 }));

  await cmd('kill @e[type=!player]', 300);
  await h.stop();
  h.finish(res);
}

h.guard(main);
