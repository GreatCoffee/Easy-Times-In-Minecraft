/**
 * bed-ops.js — 床位探测 / 放置 / 入睡 / 起身（会话七 · testharness/player）
 *
 * sleep-01 判据窗工步件。操作面：假玩家实体（mineflayer），不走 RCON
 * ——位置语义命令一律 bot chat 面（见 README 通道纪律）。
 *
 * 用法：
 *   node bed-ops.js <host> <port> <user> find [radius]
 *   node bed-ops.js <host> <port> <user> place <x> <y> <z>
 *   node bed-ops.js <host> <port> <user> sleep <x> <y> <z> [staySec]
 *   node bed-ops.js <host> <port> <user> wake
 *
 * 约定：所有 op 先 /gamemode 由调用方设好；place 需要背包有床并已装备到主手。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';
const op = process.argv[5];

async function waitSpawn(bot) {
  await new Promise((resolve) => {
    if (bot.entity && bot.entity.position) return resolve();
    bot.once('move', resolve);
    setTimeout(resolve, 20000);
  });
}

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await waitSpawn(bot);
  try { await bot.waitForChunksToLoad(); log('bed', 'chunks loaded'); } catch (e) { log('bed', 'chunk wait:', e.message); }
  log('bed', `online at ${bot.entity.position.x.toFixed(1)} ${bot.entity.position.y.toFixed(1)} ${bot.entity.position.z.toFixed(1)} gamemode=${bot.game && bot.game.gameMode}`);

  if (op === 'find') {
    const radius = parseInt(process.argv[9] || '48', 10);
    if (process.argv[6] !== undefined) {
      const tx = Number(process.argv[6]);
      const ty = Number(process.argv[7]);
      const tz = Number(process.argv[8]);
      bot.chat(`/tp ${username} ${tx} ${ty} ${tz}`);
      await new Promise((r) => setTimeout(r, 3500));
      log('bed', `teleported to ${tx} ${ty} ${tz}; position ${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)}`);
    }
    log('bed', `scanning beds within ${radius} blocks…`);
    if (process.argv[6] !== undefined) {
      const Vec3 = require('vec3').Vec3;
      for (const [dx, dy, dz] of [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 0, -1], [1, 0, 0]]) {
        const b = bot.blockAt(new Vec3(Number(process.argv[6]) + dx, Number(process.argv[7]) + dy, Number(process.argv[8]) + dz));
        log('bed', `probe ${dx},${dy},${dz} → ${b ? b.name : 'null'}`);
      }
    }
    let found = null;
    try {
      found = await bot.findBlock((b) => {
        const n = b && b.name ? String(b.name) : '';
        return n.includes('bed');
      }, radius);
    } catch (e) {
      log('bed', 'scan error:', e.message);
    }
    if (found) {
      log('bed', `BED FOUND name=${found.name} at ${found.position.x} ${found.position.y} ${found.position.z}`);
    } else {
      log('bed', `NO BED within ${radius}`);
    }
  } else if (op === 'place') {
    const x = Number(process.argv[6]);
    const y = Number(process.argv[7]);
    const z = Number(process.argv[8]);
    bot.chat(`/tp ${username} ${x} ${y} ${z + 2}`);
    await new Promise((r) => setTimeout(r, 3000));
    log('bed', `teleported near ${x} ${y} ${z}; position now ${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)}`);
    // Bed occupies two blocks in 1.12; aim at the floor block so the bed lands on top.
    const Vec3 = require('vec3').Vec3;
    const floor = bot.blockAt(new Vec3(x, y - 1, z));
    if (!floor) { log('bed', 'FATAL: floor block not loaded'); process.exit(1); }
    log('bed', `floor=${floor.name} at ${x} ${y - 1} ${z}; ensuring a bed in inventory`);
    let bedItem = bot.inventory.items().find((i) => i.name && String(i.name).includes('bed'));
    if (!bedItem) {
      bot.chat(`/give ${username} minecraft:red_bed 3`);
      log('bed', 'issued /give red_bed 3 (op self-serve); waiting for inventory sync');
      for (let i = 0; i < 12 && !bedItem; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        bedItem = bot.inventory.items().find((it) => it.name && String(it.name).includes('bed'));
      }
    }
    if (!bedItem) {
      log('bed', 'FATAL: no bed in inventory after /give');
      process.exit(1);
    }
    log('bed', `bed in inventory: ${bedItem.name} x${bedItem.count}`);
    if (!bedItem) { log('bed', 'FATAL: no bed in inventory'); process.exit(1); }
    await bot.equip(bedItem, 'hand');
    log('bed', `equipped ${bedItem.name}; activating block`);
    try {
      await bot.activateBlock(bot.blockAt(new Vec3(x, y, z)) || floor);
      log('bed', 'activateBlock issued');
    } catch (e) {
      log('bed', 'place error:', e.message);
    }
    await new Promise((r) => setTimeout(r, 1500));
    const check = await bot.findBlock((b) => b && b.name && String(b.name).includes('bed'), 8);
    log('bed', check ? `PLACED name=${check.name} at ${check.position.x} ${check.position.y} ${check.position.z}` : 'PLACE NOT CONFIRMED');
  } else if (op === 'sleep') {
    // 裁决「共通面」: ETIM 回血门依赖 nutrition（nutrition==0 → 无 heal）。
    // Do NOT bypass with gamemode creative — feed the bot first so the heal
    // line is running. consume() must never block (observed hang), so it is
    // raced against a timeout.
    const x = Number(process.argv[6]);
    const y = Number(process.argv[7]);
    const z = Number(process.argv[8]);
    const staySec = parseInt(process.argv[9] || '30', 10);
    // Stand next to the bed foot, then look at the bed and use it.
    bot.chat(`/tp ${username} ${x + 2} ${y} ${z + 2}`);
    await new Promise((r) => setTimeout(r, 3500));
    const Vec3 = require('vec3').Vec3;
    // Prefer the chunk-cached lookup; fall back to a coordinate read when the
    // world cache lags a server-side /setblock (床可能由 RCON 放置).
    let bed = bot.blockAt(new Vec3(x, y, z));
    if (!bed || !String(bed.name).includes('bed')) {
      try { await bot.waitForChunksToLoad(); bed = bot.blockAt(new Vec3(x, y, z)); } catch (e) { /* retry below */ }
    }
    if (!bed || !String(bed.name).includes('bed')) {
      bed = await bot.findBlock((b) => b && b.name && String(b.name).includes('bed'), 8);
    }
    if (!bed) { log('bed', 'FATAL: no bed nearby to sleep in'); process.exit(1); }
    log('bed', `bed at ${bed.position.x} ${bed.position.y} ${bed.position.z}; calling bot.sleep()`);
    try {
      // 批文前置4: vanilla trySleepInBed :1697-1701 has an 8x5x8 NOT_SAFE
      // hostile check around the BED. Clear the bed neighbourhood, then wait
      // 3s (clearance window) before lying down — the gap between a separate
      // kill-box run and this connect is long enough for respawn.
      bot.chat(`/kill @e[type=zombie,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=skeleton,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=creeper,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=spider,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=enderman,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=witch,r=10]`); await new Promise((r) => setTimeout(r, 400));
      bot.chat(`/kill @e[type=slime,r=10]`); await new Promise((r) => setTimeout(r, 400));
      log('bed', 'bed neighbourhood cleared; waiting 3s clearance window');
      await new Promise((r) => setTimeout(r, 3000));
      // ensure food > 0 first (裁决共通面): nutrition==0 blocks the heal line
      // ensure food > 0 first (裁决共通面): nutrition==0 blocks the heal line
      for (let f = 0; f < 10 && bot.food === 0; f++) {
        bot.chat(`/give ${username} minecraft:cooked_beef 8`);
        await new Promise((r) => setTimeout(r, 1400));
        const beef = bot.inventory.items().find((i) => i.name && String(i.name).includes('beef'));
        if (beef) {
          await bot.equip(beef, 'hand');
          await Promise.race([
            bot.consume().catch(() => {}),
            new Promise((r) => setTimeout(r, 2500)),
          ]);
        }
        await new Promise((r) => setTimeout(r, 800));
        log('bed', `feeding… bot.food=${bot.food} health=${bot.health}`);
      }
      log('bed', `pre-sleep food=${bot.food} health=${bot.health}`);
      await bot.sleep(bed);
      log('bed', `sleep() returned; isSleeping=${bot.isSleeping}`);
    } catch (e) {
      log('bed', 'sleep error:', e.message);
    }
    for (let i = 0; i < staySec; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (i % 5 === 0 || i === staySec - 1) {
        log('bed', `t+${i + 1}s isSleeping=${bot.isSleeping} pos=${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)} food=${bot.food} health=${bot.health}`);
      }
    }
    log('bed', `stay done; final isSleeping=${bot.isSleeping}`);
  } else if (op === 'starve') {
    // W5: drive nutrition to 0 (isStarving) then right-click the bed.
    // survival (gamemode 0) is required — creative does not drain hunger.
    const x = Number(process.argv[6]);
    const y = Number(process.argv[7]);
    const z = Number(process.argv[8]);
    const target = parseInt(process.argv[9] || '0', 10);
    const dry = process.argv[10] === 'dry';
    bot.chat(`/gamemode survival ${username}`);
    await new Promise((r) => setTimeout(r, 3500));
    // Server-authoritative sync: bot.food/health read 0 right after login.
    // Wait until food is actually non-zero, else the feed branch misfires.
    for (let s = 0; s < 10 && bot.food === 0; s++) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    log('bed', `survival mode; food after sync = ${bot.food} health=${bot.health}`);
    if (bot.food < target && bot.food > 0) {
      log('bed', `food ${bot.food} < target ${target} — feeding up`);
      let guardE = 0;
      while (bot.food < target && guardE < 90) {
        bot.chat(`/give ${username} minecraft:cooked_beef 8`);
        await new Promise((r) => setTimeout(r, 1500));
        const beef = bot.inventory.items().find((i) => i.name && String(i.name).includes('beef'));
        if (beef) {
          try {
            await bot.equip(beef, 'hand');
            bot.consume().catch(() => {});
          } catch (e) { log('bed', 'consume error:', e.message); }
        }
        await new Promise((r) => setTimeout(r, 800));
        guardE += 2.3;
        log('bed', `feeding… bot.food=${bot.food} (${Math.round(guardE)}s)`);
        if (bot.food >= target) break;
      }
      log('bed', `feed result: bot.food=${bot.food} health=${bot.health}`);
    }
    log('bed', `draining hunger to ${target} (bot.food now ${bot.food})`);
    let guard = 0;
    while (bot.food > target && guard < 480) {
      bot.chat(`/effect give ${username} minecraft:hunger 255 255`);
      await new Promise((r) => setTimeout(r, 1500));
      guard += 1.5;
      if (guard % 15 < 1.5) log('bed', `draining… bot.food=${bot.food} health=${bot.health} (${Math.round(guard)}s)`);
    }
    log('bed', `drain result: bot.food=${bot.food} health=${bot.health} after ${guard}s`);
    if (dry) {
      log('bed', `DRY MODE: drained to ${bot.food} without touching the bed; quitting`);
      bot.quit();
      setTimeout(() => process.exit(0), 1000);
      return;
    }
    bot.chat(`/tp ${username} ${x + 2} ${y} ${z + 2}`);
    await new Promise((r) => setTimeout(r, 2500));
    const Vec3 = require('vec3').Vec3;
    const bed = bot.blockAt(new Vec3(x, y, z));
    if (!bed || !String(bed.name).includes('bed')) { log('bed', 'FATAL: bed not found at target'); process.exit(1); }
    log('bed', `right-clicking bed at ${x} ${y} ${z} while starving (bot.food=${bot.food})`);
    try {
      await bot.activateBlock(bed);
      log('bed', 'activateBlock on bed issued');
    } catch (e) {
      log('bed', 'bed click error:', e.message);
    }
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const msgs = [];
      bot.on('message', () => {});
      log('bed', `t+${i + 1}s isSleeping=${bot.isSleeping} food=${bot.food} health=${bot.health}`);
    }
  } else if (op === 'burn') {
    // W6 段一 (裁决两段式): hunger effect only drains SATIATION, so the bot
    // must MOVE to burn satiation first. Sprint + jump + strafe until food
    // (nutrition) drops. Prints a trail so the caller can read the slope.
    const seconds = parseInt(process.argv[6] || '300', 10);
    bot.chat(`/gamemode survival ${username}`);
    await new Promise((r) => setTimeout(r, 3000));
    log('bed', `burn start: food=${bot.food} health=${bot.health} for ${seconds}s (sprint+jump)`);
    bot.chat(`/effect give ${username} minecraft:hunger 255 255`);
    const startFood = bot.food;
    let ticks = 0;
    const iv = setInterval(() => {
      try {
        bot.setControlState('forward', true);
        bot.setControlState('jump', true);
        if (ticks % 4 === 0) bot.look(bot.entity.yaw + (Math.random() * 2 - 1) * 1.6, 0);
        if (ticks % 6 === 3) bot.setControlState('sprint', true);
        bot.chat(`/effect give ${username} minecraft:hunger 255 255`);
      } catch (e) { /* ignore */ }
      ticks++;
    }, 250);
    for (let s = 0; s < seconds; s += 15) {
      await new Promise((r) => setTimeout(r, 15000));
      log('bed', `burn t+${s + 15}s food=${bot.food} health=${bot.health} startFood=${startFood}`);
      if (bot.health <= 0) { log('bed', 'DIED during burn — aborting'); break; }
    }
    clearInterval(iv);
    try { bot.setControlState('forward', false); bot.setControlState('jump', false); bot.setControlState('sprint', false); } catch (e) { /* ignore */ }
    log('bed', `burn done: food=${bot.food} health=${bot.health} startFood=${startFood}`);
  } else if (op === 'wake') {
    try {
      await bot.wake();
      log('bed', `wake() returned; isSleeping=${bot.isSleeping}`);
    } catch (e) {
      log('bed', 'wake error:', e.message);
    }
  } else {
    log('bed', `FATAL: unknown op "${op}"`);
    process.exit(2);
  }

  bot.quit();
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('bed', 'FATAL:', e.message); process.exit(1); });
