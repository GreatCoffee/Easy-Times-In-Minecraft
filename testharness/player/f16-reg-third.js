#!/usr/bin/env node
/**
 * f16-reg-third — B-70TZ 回归网第三轮（共用子系统通道窗口）。
 *
 * 由来：B-70TY 后 `REGRESSION.md` 为 29/51，本窗口再补 7 条「改一处波及一片」的通道：
 *
 *   W1 EnchantLog  `/etest enchantprobe feet mods|pool` → mods 行 + pool 行
 *   W2 WeatherLog  `/etest rain set 0.5` + `rain probe` → set/probe 行同值
 *   W3 EquipLog    boot 期 `durability reassert` + gear dump 行（equipDebugLog 门）
 *   W4 HoeLog      手持 `etim:mattock_iron` 右键泥土 → mattock till 行
 *   W5 PickupLog   生成僵尸，ticksExisted==20 → gate 行
 *   W6 SleepLog    夜晚放床并右键入睡，doDaylightCycle=false → sleep-skip 行
 *   W7 SwingLog    木棍 + 无敌盔甲架高频攻击 → stickbreak 行（1/50 概率，最多 400 次）
 *
 * 判据只认服务端日志；不操作客户端。
 */
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-reg3-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    difficulty: 1,
    tp: [4.5, 130, 6.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: true, doMobLoot: false,
      naturalRegeneration: true, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    fill: ['time set 14000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 133 15 minecraft:air'],
  },
  cfg: [
    'enchant:enchantDebugLog',
    'weather:weatherDebugLog',
    'metal:equipDebugLog',
    'farm:farmDebugLog',
    'mobs:mobDebugLog',
    'mobs:mobPickupR196',
    'mobs:livestockNeedsR196',
  ],
});
const { cmd, mark, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENCH_MODS_RE = /\[EnchantLog\] mods slot=feet lvl=(-?\d+) enchant=(\S+) hunger=(\S+) walk=(\S+)/;
const ENCH_POOL_RE = /\[EnchantLog\] pool slot=(\S+) budget=(\d+) size=(\d+) item=(\S+)/;
const RAIN_SET_RE = /\[WeatherLog\] rain set str=([\d.]+)/;
const RAIN_PROBE_RE = /\[WeatherLog\] rain probe rain=([\d.]+) thunder=([\d.]+)/;
const EQUIP_RE = /\[EquipLog\] durability reassert: (\d+) gear rows ok/;
const EQUIP_ROW_RE = /\[EquipLog\] gear item=(\S+) maxDamage=(-?\d+)/;
const HOE_RE = /\[HoeLog\] mattock (till pos=\S+|reject face=\S+|lowblock pos=\S+)/;
const PICKUP_RE = /\[PickupLog\] gate flag=(\S+) canPickUp=(\S+) cooldown=(\d+) entity=(\S+)/;
const SLEEP_RE = /\[SleepLog\] sleep-skip n\/a doDaylightCycle=false/;
const SWING_RE = /\[SwingLog\] stickbreak item=(\S+) chance=(\d+) entity=(\S+)/;

const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

async function main() {
  h.stampPin();
  await h.boot(`f16-${RUN}-b1`);
  const bootFrom = mark();
  await h.join();

  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false, w7: false };

  // ---- W1: enchant probe (mods face + pool face) ----
  let from = mark();
  await cmd(`etest enchantprobe feet mods ${A}`, 700);
  await cmd(`etest enchantprobe feet pool ${A}`, 700);
  const mods = await waitRow(ENCH_MODS_RE, from, 6000);
  const pools = await waitRow(ENCH_POOL_RE, from, 6000);
  const mo = lastOf(mods);
  const po = lastOf(pools);
  res.w1 = !!mo && !!po; // C-B70TZ-1: pool rows key on slot=0..N (not slot=feet) and carry no player field
  console.log('[W1]', JSON.stringify({
    mods: mo && { lvl: +mo[1], walk: mo[4] }, pool: po && { slot: po[1], budget: +po[2], size: +po[3] }, pass: res.w1,
  }));

  // ---- W2: weather set + probe (same value both sides) ----
  // C-B70TZ-2: `etest rain set` writes world.rainingStrength directly, but the ETIM
  // weather clock decays an unscheduled strength by ~0.01/tick (r3: set 0.5 -> probe
  // 0.0000 after 4 s). Probe inside the same couple of ticks instead of waiting for a
  // lerp: both commands are sent back to back with a minimal wait.
  from = mark();
  await cmd('etest rain set 0.5', 50);
  await cmd('etest rain probe', 50);
  await sleep(400);
  const sets = await waitRow(RAIN_SET_RE, from, 5000);
  const probes = await waitRow(RAIN_PROBE_RE, from, 5000);
  const se = lastOf(sets);
  const pr = lastOf(probes);
  res.w2 = !!se && !!pr && se[1] === '0.5000' && Math.abs(parseFloat(pr[1]) - 0.5) <= 0.02;
  console.log('[W2]', JSON.stringify({ set: se && se[1], probe: pr && pr[1], pass: res.w2 }));

  // ---- W3: equip boot rows (judged durability + dump) ----
  const reassert = await waitRow(EQUIP_RE, 0, 5000); // C-B70TZ-3: boot-time rows precede any mark()
  const gearRows = await waitRow(EQUIP_ROW_RE, 0, 5000);
  const re = lastOf(reassert);
  res.w3 = !!re && +re[1] >= 90 && gearRows.length >= 50;
  console.log('[W3]', JSON.stringify({ reassert: re && +re[1], gearRows: gearRows.length, pass: res.w3 }));

  // ---- W4: mattock till (farm row) ----
  await cmd('setblock 2 129 2 minecraft:dirt', 400);
  // C-B70TZ-4: there is no etim:mattock_iron — the iron tier id is mattock_rusted_iron.
  await cmd(`etest hold etim:mattock_rusted_iron ${A}`, 400);
  await cmd(`tp ${A} 2.5 130 3.5`, 500);
  from = mark();
  await cmd(`etest useblock 2 129 2 up ${A}`, 900);
  const hoes = await waitRow(HOE_RE, from, 6000);
  const hoe = lastOf(hoes);
  res.w4 = !!hoe;
  console.log('[W4]', JSON.stringify({ hoe: hoe && hoe[1], rows: hoes.length, pass: res.w4 }));

  // ---- W5: pickup gate row (ticksExisted == 20) ----
  from = mark();
  await cmd('summon minecraft:zombie 9.5 130 2.5 {NoAI:1b,PersistenceRequired:1b}', 400);
  const picks = await waitRow(PICKUP_RE, from, 12000);
  const pi = lastOf(picks);
  res.w5 = !!pi && pi[1] === 'true' && /Zombie/.test(pi[4]);
  console.log('[W5]', JSON.stringify({ gate: pi && { flag: pi[1], canPickUp: pi[2], entity: pi[4] }, rows: picks.length, pass: res.w5 }));

  // ---- W6: swing stick break (1/50 per hit; 400 attempts ≈ 99.97%) ----
  await cmd(`etest hold minecraft:stick ${A}`, 400);
  await cmd(`replaceitem entity ${A} slot.hotbar.1 minecraft:stick 64`, 400);
  // C-B70TZ-6c: the previous arms leave their zombies around, and
  // `Object.values(bot.entities).find(/zombie/)` picked a far one (deny_attack 4.90 > 2.00
  // in r4). Clear the field and keep only the target we summon, then bind by nearest.
  await cmd('kill @e[type=!player]', 300);
  const zombieCountBefore = Object.values(h.bot.entities).filter((e) => e && /zombie/.test(e.name || '')).length;
  // C-B70TZ-6: `ItemStack.hitEntity` only runs when the damage actually lands
  // (1.12 EntityPlayer.attackTargetEntityWithCurrentItem gates it on
  // attackEntityFrom returning true), so an Invulnerable target never rolls.
  // Use a big-HP, NoAI zombie and keep swinging.
  // C-B70TZ-6b: the ETIM reach gate measures eye -> target along the look ray with
  // reach 2.25; a target 3.4 blocks away is rejected with `deny_attack ... MAX` (r3).
  // Keep the target inside reach (1.1 blocks) so the swing actually reaches hitEntity.
  await cmd('summon minecraft:zombie 4.5 130 5.4 {NoAI:1b,PersistenceRequired:1b,Health:2000f,Attributes:[{Name:"generic.maxHealth",Base:2000}]}', 400);
  await cmd(`tp ${A} 4.5 130 4.2`, 500);
  from = mark();
  let swing = [];
  let tried = 0;
  for (let i = 0; i < 400 && swing.length === 0; i++) {
    const nearest = Object.values(h.bot.entities)
      .filter((e) => e && /zombie/.test(e.name || ''))
      .sort((a, b) => a.position.distanceTo(h.bot.entity.position) - b.position.distanceTo(h.bot.entity.position))[0];
    const stand = nearest;
    if (!stand) break;
    try {
      await h.bot.lookAt(stand.position.offset(0, 0.9, 0), true);
      await sleep(250); // look packet must land before the attack (entity ray reach)
      h.bot.attack(stand);
      tried++;
    } catch (e) { /* keep rolling */ }
    await sleep(80);
    if (i % 20 === 19) swing = await waitRow(SWING_RE, from, 1);
  }
  if (!swing.length) swing = await waitRow(SWING_RE, from, 800);
  const sw = lastOf(swing);
  res.w6 = !!sw && sw[1] === 'minecraft:stick' && +sw[2] === 50;
  console.log('[W6]', JSON.stringify({
    stickbreak: sw && { item: sw[1], chance: +sw[2] }, tried, pass: res.w6,
    linesSeen: logLines().filter((s) => s.indexOf('[SwingLog]') >= 0).length,
  }));

  // ---- W7: sleep skip row (bed at night + doDaylightCycle=false) ----
  await cmd('kill @e[type=!player]', 300);
  // C-B70TZ-5: 1.12 beds are metadata (0-3 foot facing, 8-11 head), not 1.13 blockstate.
  await cmd('setblock 13 130 2 minecraft:bed 0', 300);
  await cmd('setblock 13 130 3 minecraft:bed 8', 300);
  // C-B70TZ-7: a flat roof over a 7x7 window was still refused in r4 (`notSheltered`),
  // so build a genuinely enclosed pocket: walls on all four sides at y=130..131, roof at
  // y=132, interior x 11..15 / z 0..4 cleared. Only then can isOutdoors() see solid on
  // every one of its 49 probe columns.
  await cmd('fill 10 130 -1 10 131 5 minecraft:stone', 200);
  await cmd('fill 16 130 -1 16 131 5 minecraft:stone', 200);
  await cmd('fill 10 130 -1 16 131 -1 minecraft:stone', 200);
  await cmd('fill 10 130 5 16 131 5 minecraft:stone', 200);
  await cmd('fill 10 132 -1 16 132 5 minecraft:stone', 300);
  await cmd('fill 11 130 0 15 131 4 minecraft:air', 300);
  await cmd('setblock 13 130 2 minecraft:bed 0', 300);
  await cmd('setblock 13 130 3 minecraft:bed 8', 300);
  await cmd(`etest food 6 ${A}`, 400);
  await cmd(`tp ${A} 13.5 130 4.5`, 500);
  from = mark();
  await cmd(`etest useblock 13 130 2 up ${A}`, 900);
  let sleepy = await waitRow(SLEEP_RE, from, 15000);
  if (!sleepy.length) {
    // Retry once: the bed click can race the teleport / vanilla "monsters nearby".
    await cmd(`etest useblock 13 130 2 up ${A}`, 900);
    sleepy = await waitRow(SLEEP_RE, from, 15000);
  }
  res.w7 = sleepy.length > 0;
  console.log('[W7]', JSON.stringify({ sleepSkip: sleepy.length, pass: res.w7 }));

  await cmd('kill @e[type=!player]', 300);
  await h.stop();
  h.finish(res);
}

h.guard(main);
