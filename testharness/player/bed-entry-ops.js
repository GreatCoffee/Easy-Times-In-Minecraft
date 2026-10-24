#!/usr/bin/env node
/**
 * bed-entry slice harness (verdict slice bed-entry-verdict, commit 3a2c7f6).
 *
 * Channel discipline (testharness/player/README.md):
 *   - EVERY position-semantic command goes through the BOT CHAT face. RCON has
 *     no entity position, so /setblock /summon /fill from RCON resolve against
 *     the command source origin, never the bed. RCON stays gamerule / time set
 *     / testforblock / stop only.
 *   - This file NEVER clears hostiles before a right-click: the notSafe windows
 *     (W4) and the sentry window (W5) need the mobs to survive. The clear
 *     discipline for those windows is applied by the caller BEFORE connecting.
 *
 * Ops
 *   hut <bx> <by> <bz> [radius=3] [mat=minecraft:glass]
 *       solid ceiling at by+2 over radius (isOutdoors -> false / sheltered).
 *   block <x> <y> <z> <mat> [meta=0]     one setblock (0 = air clears)
 *   slab <bx> <by> <bz> <dx> <dz>        fill a floor slab at by-1 (stand floor)
 *   mob <type> <x> <y> <z> [nbt]         /summon
 *   cage <x> <y> <z> [mat=minecraft:glass]   sealed 3x3x3 shell (kills pathing)
 *   rc <bx> <by> <bz> [watch=6]          right-click the bed, watch isSleeping
 *   rcw <bx> <by> <bz> [watch=600] [delay=1200] [effect] [clickDelay=0]
 *       right-click the bed, then RE-CLICK on the first S->- transition
 *       (mobs/AI-02 G-3/G-4: the digging wake ejects the sleeper mid-dig and
 *       the refuse face only fires on a fresh right-click). Never sweeps.
 *       clickDelay holds the first click back by N ms so the caller can stage
 *       the revenge-target lock (a sleeper is force-woken by any damage, so the
 *       lock hit must land while the bot is awake). Pass an absolute file path
 *       as clickDelay's successor to gate the click on that file appearing
 *       instead (preferred for closed-loop staging).
 *   effect <name> [secs=30] [amp=1]      give self an effect
 *   eat [item=golden_carrot]           refill food+saturation (idling harness
 *       bots decay to food=0 and vanilla then refuses the bed with
 *       tile.bed.tooHungry before any ETIM bed face runs)
 *   info                                 time / pos / health / food readout
 *
 * Every op prints a machine-readable tail line so the caller can grep.
 */
'use strict';
// FML|HS handshake face (fmlbot.js): the server cross-checks the client mod
// list, so a raw mineflayer.createBot gets kicked with "requires FML/Forge".
const { createHarnBot } = require('./fmlbot');
const Vec3 = require('vec3').Vec3;

const argv = process.argv.slice(2);
const host = argv[0] || 'localhost';
const port = parseInt(argv[1] || '25565', 10);
const username = argv[2];
const op = argv[3];
const A = argv.slice(4);

const log = (tag, msg) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${tag}] ${msg}`);
const tail = (msg) => console.log(`RESULT ${msg}`);

if (!username || !op) {
  console.error('usage: bed-entry-ops.js <host> <port> <user> <op> [args]');
  process.exit(2);
}

let bot = null; // assigned in ready(); every op touches it only after spawn.

const chat = [];
bot_on_message();
function bot_on_message() { /* placeholder, bound in ready() */ }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ready() {
  bot = await createHarnBot({ host, port, username, version: '1.12.2' });
  bot.on('message', (msg) => {
    const s = msg.toString();
    chat.push(s);
  });
  await new Promise((r) => bot.once('spawn', r));
  log('bot', `spawn at ${bot.entity.position.x.toFixed(1)} ${bot.entity.position.y.toFixed(1)} ${bot.entity.position.z.toFixed(1)}`);
  await sleep(2500);
}

/** Wait for the chunk around (x,z) to actually be loaded server-side. */
async function settle(x, y, z) {
  try {
    for (let i = 0; i < 12; i++) {
      const b = bot.blockAt(new Vec3(x, y, z));
      if (b && b.name !== 'unknown') return b;
      await sleep(1500);
    }
  } catch (e) { /* fall through */ }
  return null;
}

async function main() {
  await ready();

  if (op === 'hut') {
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const r = parseInt(A[3] || '3', 10);
    const mat = A[4] || 'minecraft:glass';
    await settle(bx, by, bz);
    let n = 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        bot.chat(`/setblock ${bx + dx} ${by + 2} ${bz + dz} ${mat} 0 replace`);
        n++;
        if (n % 9 === 0) await sleep(400);
      }
    }
    await sleep(2500);
    // Report the precipitation-height face that isOutdoors keys on: read the
    // block under the bed plus the roof directly above the bed.
    log('hut', `roof ${mat} ${2 * r + 1}x${2 * r + 1} at y=${by + 2} (${n} setblocks)`);
    const roof = bot.blockAt(new Vec3(bx, by + 2, bz));
    const air1 = bot.blockAt(new Vec3(bx, by + 1, bz));
    log('hut', `roofBlock=${roof && roof.name} y+1=${air1 && air1.name}`);
    tail(`HUT mat=${mat} y=${by + 2} r=${r} roofBlock=${roof && roof.name} yPlus1=${air1 && air1.name}`);

  } else if (op === 'block') {
    const x = parseInt(A[0], 10), y = parseInt(A[1], 10), z = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:stone';
    const meta = A[4] || '0';
    await settle(x, y, z);
    bot.chat(`/setblock ${x} ${y} ${z} ${mat} ${meta} replace`);
    await sleep(2000);
    const b = bot.blockAt(new Vec3(x, y, z));
    log('block', `${mat}@${x},${y},${z} -> ${b && b.name} meta=${b && b.metadata}`);
    tail(`BLOCK ${mat}@${x},${y},${z} now=${b && b.name} meta=${b && b.metadata}`);

  } else if (op === 'slab') {
    // Stand floor: makes sure the bot has something to stand on after /fill.
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const dx = parseInt(A[3], 10), dz = parseInt(A[4], 10);
    await settle(bx, by, bz);
    bot.chat(`/fill ${bx - dx} ${by - 1} ${bz - dz} ${bx + dx} ${by - 1} ${bz + dz} minecraft:stone 0 replace`);
    await sleep(2000);
    log('slab', `floor filled at y=${by - 1}`);
    tail(`SLAB y=${by - 1}`);

  } else if (op === 'mob') {
    const type = A[0];
    const x = parseInt(A[1], 10), y = parseInt(A[2], 10), z = parseInt(A[3], 10);
    const nbt = A[4];
    await settle(x, y, z);
    bot.chat(`/summon ${type} ${x} ${y} ${z} ${nbt || ''}`.trim());
    await sleep(2000);
    tail(`MOB summoned ${type} at ${x},${y},${z}${nbt ? ' ' + nbt : ''}`);

  } else if (op === 'cage') {
    const x = parseInt(A[0], 10), y = parseInt(A[1], 10), z = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:glass';
    await settle(x, y, z);
    // sealed 3x3x3 shell centred on (x,y,z): walls + roof + floor
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dz === 0 && dy === 0) continue;
          bot.chat(`/setblock ${x + dx} ${y + dy} ${z + dz} ${mat} 0 replace`);
          await sleep(120);
        }
    await sleep(2000);
    log('cage', `sealed shell around ${x},${y},${z} (${mat})`);
    tail(`CAGE around ${x},${y},${z} mat=${mat}`);

  } else if (op === 'rc') {
    // Right-click the bed at (bx,by,bz) WITHOUT clearing hostiles.
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const watch = parseInt(A[3] || '6', 10);
    await settle(bx, by, bz);
    // Stand two blocks out on the +X/+Z diagonal of the foot block (never
    // inside a block, never closer than vanilla reach, never in the bed).
    const stand = [bx + 2.2, by, bz + 1.5];
    bot.chat(`/tp ${username} ${stand[0]} ${stand[1]} ${stand[2]}`);
    await sleep(2500);
    log('rc', `tp to ${stand.join(',')}; pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z}`);
    // Optional 6th arg 'sweep': kill hostiles around the BED after the tp, so
    // the sweep is centred on the bed rather than on wherever the bot spawned.
    // r=5 deliberately excludes the caged probe at z-6 (the C-face window keeps
    // its sealed zombie alive and only needs it unreachable).
    if (A[5] === 'sweep') {
      for (const t of ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'slime', 'zombie_pigman', 'silverfish']) {
        bot.chat(`/kill @e[type=${t},r=5]`);
        await sleep(200);
      }
      await sleep(1500);
      log('rc', 'bed-centred sweep done (r=5)');
    }
    const target = bot.blockAt(new Vec3(bx, by, bz));
    log('rc', `target block = ${target && target.name} meta=${target && target.metadata} pos=${bot.entity.position}`);
    // Optional 5th arg: apply an effect to self BEFORE the click. Effects die
    // with the connection, so this must live in the same process as the click.
    if (A[4] && A[4] !== '-' && A[4] !== 'none') {
      bot.chat(`/effect ${username} minecraft:${A[4]} 120 1`);
      await sleep(1500);
      log('rc', `effect ${A[4]} applied; bot.entity.effects=${JSON.stringify(bot.entity.effects)}`);
    } else {
      // Effects survive a relogin through player NBT and would keep winning the
      // gate-3 poisoned face over whatever this window is actually testing.
      bot.chat(`/effect ${username} minecraft:poison 0`);
      await sleep(1200);
      log('rc', `poison cleared; bot.entity.effects=${JSON.stringify(bot.entity.effects)}`);
    }
    let clicked = false;
    // Entity readout: the notSafe windows need proof the hostile was actually
    // present and alive at click time (a daylight-summoned zombie burns out).
    const near = [];
    for (const e of Object.values(bot.entities || {})) {
      const d = e.position.distanceTo(bot.entity.position);
      if (d <= 12 && e.type && e.type !== 'player' && e.type !== 'object') {
        near.push(`${e.type}@${e.position.x.toFixed(0)},${e.position.y.toFixed(0)},${e.position.z.toFixed(0)} d=${d.toFixed(1)} hp=${e.health !== undefined ? e.health.toFixed(0) : '?'}`);
      }
    }
    log('rc', `nearEntities(${near.length}): ${near.join(' | ') || 'none'}`);
    try {
      await bot.activateBlock(target);
      clicked = true;
      log('rc', 'activateBlock() issued');
    } catch (e) {
      log('rc', `activateBlock threw: ${e.message}`);
    }
    // Sampling: the sentry may eject within the same second, so sample at 250ms.
    const samples = [];
    for (let i = 0; i < watch * 4; i++) {
      await sleep(250);
      samples.push(bot.isSleeping ? 'S' : '-');
    }
    log('rc', `samples=${samples.join('')} finalSleeping=${bot.isSleeping} food=${bot.food} health=${bot.health}`);
    // Optional 7th arg 'wake': lie-side sentry window. After the sleep phase,
    // clear the sealed probe cage and summon a PATHABLE hostile next to the bed
    // while the sleeper is already fully asleep (sleepTimer>=100), so the row
    // must carry sleeper=true.
    if (A[6] === 'wake') {
      bot.chat(`/fill -67 67 239 -65 69 241 minecraft:air 0 replace`);
      await sleep(2000);
      log('rc', `asleep before summon=${bot.isSleeping}`);
      bot.chat('/summon zombie -66 68 241 {Invulnerable:1b}');
      const after = [];
      for (let i = 0; i < 40; i++) {
        await sleep(250);
        after.push(bot.isSleeping ? 'S' : '-');
      }
      log('rc', `postSummonSamples=${after.join('')} sleeping=${bot.isSleeping}`);
      log('rc', `bedMessages=[${chat.filter((c) => c.indexOf('tile.bed') >= 0 || c.indexOf('monsters') >= 0).join(' | ')}]`);
      tail(`WAKE preSleeping=true postSamples=${after.join('')} sleeping=${bot.isSleeping}`);
    }
    const beds = chat.filter((c) => c.indexOf('tile.bed') >= 0);
    log('rc', `bedMessages=[${beds.join(' | ')}]`);
    tail(`RC clicked=${clicked} samples=${samples.join('')} sleeping=${bot.isSleeping} bedMsgs=${beds.length} allMsgs=${JSON.stringify(chat)}`);

  } else if (op === 'rcw') {
    // mobs/AI-02 G-3/G-4 window: right-click the bed, then RE-CLICK inside the
    // SAME connection as soon as the sleeper is ejected (S->- transition).
    // G-4 needs it: the digging wake pops the bot out while the dig is still
    // running (digging face fires 1-2t after progress=0, the block only breaks
    // ~300t later), and PlayerBedEvents' refuse face only fires on a fresh
    // right-click. 'rc' clicks exactly once, so it cannot reach that state.
    // NEVER sweeps: the digging zombie must survive to the refuse face.
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const watch = parseInt(A[3] || '600', 10);
    const delay = parseInt(A[4] || '1200', 10);
    await settle(bx, by, bz);
    const stand = [bx + 2.2, by, bz + 1.5];
    bot.chat(`/tp ${username} ${stand[0]} ${stand[1]} ${stand[2]}`);
    await sleep(2500);
    log('rcw', `tp to ${stand.join(',')}; pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z}`);
    if (A[5] && A[5] !== '-' && A[5] !== 'none') {
      bot.chat(`/effect ${username} minecraft:${A[5]} 120 1`);
      await sleep(1500);
    } else {
      bot.chat(`/effect ${username} minecraft:poison 0`);
      await sleep(1200);
    }
    // Pre-click hold. mobs/AI-02 G-3: the target lock comes from
    // EntityLivingBase.attackEntityFrom -> setRevengeTarget(player) (300t/600t
    // memory, no EntitySenses.canSee involved), so the player MUST land a hit
    // while AWAKE -- EntityPlayer.attackEntityFrom calls wakeUpPlayer() on any
    // damage to a sleeper, which would eject the bot before the dig starts.
    // Hold the click so the caller can stage: zombie east of the wall (same
    // side, canSee + melee) -> lock -> /tp the zombie through the wall -> click.
    const clickDelay = parseInt(A[6] || '0', 10);
    // click gate (A[7] = absolute path, A[8] = timeout ms): block until the
    // caller CREATES the file, then click. Preferred over clickDelay whenever
    // the staging (revenge-target lock -> /tp through the wall) is closed-loop
    // and its duration is unknown -- a fixed delay either clicks before the
    // staging finishes or drops the 300t/600t target memory.
    const clickGateFile = A[7] || '';
    const clickTimeout = parseInt(A[8] || '180000', 10);
    if (clickGateFile) {
      const fs = require('fs');
      const t0 = Date.now();
      log('rcw', `click gate: waiting for ${clickGateFile} (timeout ${clickTimeout}ms)`);
      let healthAtGate = -1;
      while (!fs.existsSync(clickGateFile)) {
        if (Date.now() - t0 > clickTimeout) { log('rcw', 'click gate TIMEOUT - clicking anyway'); break; }
        if (bot.health !== healthAtGate) { healthAtGate = bot.health; log('rcw', `gate-wait health=${healthAtGate}`); }
        await sleep(250);
      }
      log('rcw', `click gate released after ${Date.now() - t0}ms health=${bot.health}`);
      // Re-issue the stand teleport and click IMMEDIATELY. Measured on
      // 72bb9e9/fe43c0e: a bed click issued ~2s after the /tp sleeps fine
      // (samples=SSS...), while the same click ~18s later is silently dropped
      // (samples all '-', finalSleeping=false, and NOT ONE tile.bed* /
      // bed-entry line on the server -- the use packet never resolved).
      // So the staging wait must end in a fresh tp, not a stale one.
      bot.chat(`/tp ${username} ${stand[0]} ${stand[1]} ${stand[2]}`);
      await sleep(2200);
      log('rcw', `re-tp after gate: pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z}`);
    } else if (clickDelay > 0) {
      log('rcw', `pre-click hold ${clickDelay}ms (HurtBy/revenge lock window)`);
      let held = 0;
      while (held < clickDelay) {
        await sleep(500);
        held += 500;
      }
      log('rcw', `pre-click hold done; health=${bot.health}`);
    }
    let target = bot.blockAt(new Vec3(bx, by, bz));
    log('rcw', `target block = ${target && target.name} meta=${target && target.metadata}`);
    const near = [];
    for (const e of Object.values(bot.entities || {})) {
      const d = e.position.distanceTo(bot.entity.position);
      if (d <= 12 && e.type && e.type !== 'player' && e.type !== 'object') {
        near.push(`${e.type}@${e.position.x.toFixed(0)},${e.position.y.toFixed(0)},${e.position.z.toFixed(0)} d=${d.toFixed(1)}`);
      }
    }
    log('rcw', `nearEntities(${near.length}): ${near.join(' | ') || 'none'}`);
    try {
      await bot.activateBlock(target);
      log('rcw', 'activateBlock() issued (click#1)');
    } catch (e) { log('rcw', `activateBlock threw: ${e.message}`); }
    const samples = [];
    let reclicks = 0, prev = bot.isSleeping, sawSleep = false;
    for (let i = 0; i < watch * 4; i++) {
      await sleep(250);
      const cur = bot.isSleeping;
      if (cur) sawSleep = true;
      samples.push(cur ? 'S' : '-');
      if (reclicks === 0 && sawSleep && prev === true && cur === false) {
        log('rcw', `wake detected at sample ${i}; re-clicking in ${delay}ms`);
        await sleep(delay);
        target = bot.blockAt(new Vec3(bx, by, bz));
        log('rcw', `reclick target = ${target && target.name} meta=${target && target.metadata}`);
        if (target && target.name !== 'air') {
          try {
            await bot.activateBlock(target);
            reclicks++;
            log('rcw', `activateBlock() issued (click#${reclicks + 1})`);
          } catch (e) { log('rcw', `reclick threw: ${e.message}`); }
        } else {
          log('rcw', 'BED GONE at re-click time (dig already broke it) - G-4 needs a surviving bed');
        }
      }
      prev = cur;
    }
    const beds = chat.filter((c) => c.indexOf('tile.bed') >= 0);
    log('rcw', `samples=${samples.join('')}`);
    log('rcw', `reclicks=${reclicks} finalSleeping=${bot.isSleeping} health=${bot.health}`);
    log('rcw', `bedMessages=[${beds.join(' | ')}]`);
    tail(`RCW reclicks=${reclicks} finalSleeping=${bot.isSleeping} sleepSamples=${samples.length} bedMsgs=${JSON.stringify(beds)}`);

  } else if (op === 'eat') {
    // Refill food+saturation. A long-lived harness bot idles for hours and its
    // Food level decays to 0; vanilla then refuses the bed with
    // tile.bed.tooHungry BEFORE any ETIM bed face runs, which silently turns
    // every sleep window into a no-op. Run this before any sleeping window.
    const item = A[0] || 'golden_carrot';
    bot.chat(`/effect ${username} minecraft:instant_health 1 20`);
    await sleep(1500);
    log('eat', `before food=${bot.food} health=${bot.health}`);
    bot.chat(`/give ${username} ${item} 64 0`);
    await sleep(2500);
    let rounds = 0;
    while (rounds < 12) {
      const it = (bot.inventory.items() || []).find((i) => i.name === item && i.count > 0);
      if (!it) { log('eat', `no ${item} left; inventory=[${(bot.inventory.items() || []).map((i) => `${i.name}x${i.count}`).join(',') || 'empty'}]`); break; }
      try {
        await bot.equip(it, 'hand');
        await sleep(400);
        await bot.consume();
        await sleep(1800);
      } catch (e) {
        log('eat', `consume threw: ${e.message}`);
        break;
      }
      rounds++;
      log('eat', `round ${rounds} food=${bot.food} health=${bot.health} left=${it.count}`);
    }
    log('eat', `after rounds=${rounds} food=${bot.food} health=${bot.health}`);
    log('eat', `chat=[${chat.slice(-6).join(' | ')}]`);
    tail(`EAT item=${item} rounds=${rounds} food=${bot.food} health=${bot.health}`);

  } else if (op === 'digwake') {
    // mobs/AI-02 v8 (B8 修正案) — DIGGING-FIRST, sleep inserted INTO the dig window.
    //   digwake <bx> <by> <bz> <watch> <reclickDelay> <attackGateFile> <clickGateFile>
    // One connection for the whole window (a relogin would drop the HurtBy target):
    //   1) connect + /tp to the stand slot
    //   2) wait for attackGate, then swing at the nearest mob  (HurtBy -> setRevengeTarget)
    //   3) wait for clickGate, re-/tp, click ~1.5s later (C8: a stale tp drops the use packet)
    //   4) sample isSleeping; on the first S->- transition re-click once (G-4 refuse face)
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const watch = parseInt(A[3] || '600', 10);
    const delay = parseInt(A[4] || '1200', 10);
    const attackGate = A[5] || '';
    const clickGate = A[6] || '';
    const fs = require('fs');
    await settle(bx, by, bz);
    const stand = [bx + 2.2, by, bz + 1.5];
    bot.chat(`/tp ${username} ${stand[0]} ${stand[1]} ${stand[2]}`);
    await sleep(2500);
    log('digwake', `tp to ${stand.join(',')}; pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z}`);
    if (attackGate) {
      const t0 = Date.now();
      while (!fs.existsSync(attackGate)) {
        if (Date.now() - t0 > 180000) { log('digwake', 'attack gate TIMEOUT'); break; }
        await sleep(200);
      }
      log('digwake', `attack gate released after ${Date.now() - t0}ms`);
      bot.chat(`/effect ${username} minecraft:poison 0`);
      for (let k = 0; k < 3; k++) {
        let best = null, bestD = 1e9;
        for (const e of Object.values(bot.entities || {})) {
          if (!e || !e.type || e.type === 'player' || e.type === 'object' || e.type === 'orb') continue;
          const d = e.position.distanceTo(bot.entity.position);
          if (d < bestD) { bestD = d; best = e; }
        }
        if (best && bestD <= 5) {
          try {
            // A12 fix (testharness side): mineflayer's bot.attack() only puts the
            // swing packet on the wire -- it does no aim handling (entities.js
            // attack()). With the bot's look vector left wherever the last /tp
            // put it, the server-side slab ray misses the mob and ETIM's reach
            // face denies the swing ("reach denied: etim.reach.deny_attack
            // 1.797e308 > 1.50"). Aim at the mob's mid-body FIRST, then swing,
            // and re-aim on every swing because the mob keeps moving.
            await bot.lookAt(best.position.offset(0, best.height * 0.5, 0), true);
            await sleep(150);
            bot.attack(best);
            log('digwake', `attack#${k + 1} -> ${best.type} d=${bestD.toFixed(2)} aimed=(${bot.entity.yaw.toFixed(2)},${bot.entity.pitch.toFixed(2)})`);
          } catch (e) { log('digwake', `attack threw: ${e.message}`); }
        } else {
          log('digwake', `no mob in reach (nearest=${bestD === 1e9 ? 'none' : bestD.toFixed(2)})`);
        }
        await sleep(650);
      }
    }
    if (clickGate) {
      const t1 = Date.now();
      while (!fs.existsSync(clickGate)) {
        if (Date.now() - t1 > 300000) { log('digwake', 'click gate TIMEOUT - clicking anyway'); break; }
        await sleep(200);
      }
      log('digwake', `click gate released after ${Date.now() - t1}ms`);
      bot.chat(`/tp ${username} ${stand[0]} ${stand[1]} ${stand[2]}`);
      await sleep(1500);
      log('digwake', `re-tp: pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z}`);
    }
    let target = bot.blockAt(new Vec3(bx, by, bz));
    log('digwake', `target block = ${target && target.name} meta=${target && target.metadata}`);
    try { await bot.activateBlock(target); log('digwake', 'activateBlock() issued (click#1)'); }
    catch (e) { log('digwake', `click threw: ${e.message}`); }
    const samples = [];
    let reclicks = 0, prev = bot.isSleeping, sawSleep = false;
    for (let i = 0; i < watch * 4; i++) {
      await sleep(250);
      const cur = bot.isSleeping;
      if (cur) sawSleep = true;
      samples.push(cur ? 'S' : '-');
      if (reclicks === 0 && sawSleep && prev === true && cur === false) {
        log('digwake', `wake detected at sample ${i}; re-clicking in ${delay}ms`);
        await sleep(delay);
        target = bot.blockAt(new Vec3(bx, by, bz));
        log('digwake', `reclick target = ${target && target.name} meta=${target && target.metadata}`);
        if (target && target.name !== 'air') {
          try { await bot.activateBlock(target); reclicks++; log('digwake', `activateBlock() issued (click#${reclicks + 1})`); }
          catch (e) { log('digwake', `reclick threw: ${e.message}`); }
        } else {
          log('digwake', 'BED GONE at re-click time');
        }
      }
      prev = cur;
    }
    const beds = chat.filter((c) => c.indexOf('tile.bed') >= 0);
    log('digwake', `samples=${samples.join('')}`);
    log('digwake', `reclicks=${reclicks} finalSleeping=${bot.isSleeping} health=${bot.health}`);
    log('digwake', `bedMessages=[${beds.join(' | ')}]`);
    tail(`DIGWAKE reclicks=${reclicks} finalSleeping=${bot.isSleeping} bedMsgs=${JSON.stringify(beds)}`);

  } else if (op === 'effect') {
    const name = A[0];
    const secs = parseInt(A[1] || '30', 10);
    const amp = parseInt(A[2] || '1', 10);
    bot.chat(`/effect ${username} minecraft:${name} ${secs} ${amp}`);
    await sleep(1500);
    tail(`EFFECT ${name} ${secs}s amp=${amp} active=${bot.entity && bot.entity.effects && bot.entity.effects[name] ? 'yes' : 'no'}`);

  } else if (op === 'cagebed') {
    // Minimal isOutdoors-killer rig: an 8-ring of solid blocks at bed level
    // (so no +-1 column is queried and no checkBlock flag is ever set) plus a
    // solid block right above the bed (so the y+1 recursion never starts). The
    // only precipitation query left is the bed column itself, which the roof
    // block must lift above the bed y.
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:stone';
    await settle(bx, by, bz);
    const cells = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        cells.push([bx + dx, by, bz + dz]);
      }
    cells.push([bx, by + 1, bz]);
    for (const c of cells) {
      bot.chat(`/setblock ${c[0]} ${c[1]} ${c[2]} ${mat} 0 replace`);
      await sleep(150);
    }
    await sleep(2000);
    const above = bot.blockAt(new Vec3(bx, by + 1, bz));
    log('cagebed', `${cells.length} blocks placed; above=${above && above.name}`);
    tail(`CAGEBED mat=${mat} cells=${cells.length} above=${above && above.name}`);

  } else if (op === 'pit') {
    // Sheltered-but-NOT-obstructed rig, built with two /fill commands so no
    // individual cell can be dropped by chat throttling.
    //   1) solid 5x5x3 stone block around the bed pair
    //   2) hollow a 1x2x2 pocket (foot+head, two levels) and drop the bed in
    // Result: every +-1/+-2 column the isOutdoors scan can reach is walled (so
    // no precipitation query and no checkBlock flag is ever set), the pocket has
    // two free levels above the bed (so gate-2 obstructed never fires), and the
    // y=70 roof lifts the bed column's precipitation height above both scan
    // levels.
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:stone';
    await settle(bx, by, bz);
    bot.chat(`/fill ${bx - 2} ${by} ${bz - 1} ${bx + 2} ${by + 2} ${bz + 2} ${mat} 0 replace`);
    await sleep(1500);
    bot.chat(`/fill ${bx} ${by} ${bz} ${bx} ${by + 1} ${bz + 1} minecraft:air 0 replace`);
    await sleep(1200);
    bot.chat(`/setblock ${bx} ${by} ${bz} minecraft:bed 0`);
    await sleep(600);
    bot.chat(`/setblock ${bx} ${by} ${bz + 1} minecraft:bed 8`);
    await sleep(2500);
    const foot = bot.blockAt(new Vec3(bx, by, bz));
    const head = bot.blockAt(new Vec3(bx, by, bz + 1));
    const up1 = bot.blockAt(new Vec3(bx, by + 1, bz + 1));
    const roof = bot.blockAt(new Vec3(bx, by + 2, bz + 1));
    log('pit', `foot=${foot && foot.name} head=${head && head.name} y+1=${up1 && up1.name} roof=${roof && roof.name}`);
    tail(`PIT foot=${foot && foot.name} head=${head && head.name} yPlus1=${up1 && up1.name} roof=${roof && roof.name}`);

  } else if (op === 'roof') {
    // Shelter rig, one /fill each so nothing can be dropped by chat throttling.
    //   1) clear the old pit box
    //   2) solid 7x7 ceiling at bed+2: every column isOutdoors can reach
    //      (dx,dz within +-3) then has precipitation height 71 > 68/69, so the
    //      whole scan returns false = sheltered, while the bed's four
    //      horizontal neighbours stay air (vanilla canSetOccupied) and nothing
    //      blocks the player from stepping in.
    //   3) re-place the bed (step 1 destroys it)
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:stone';
    await settle(bx, by, bz);
    bot.chat(`/fill ${bx - 2} ${by} ${bz - 1} ${bx + 2} ${by + 2} ${bz + 2} minecraft:air 0 replace`);
    await sleep(1500);
    // Anchor disambiguation (verdict A1 ruling): the scan anchor is the HEAD
    // cell (bz+1), and the scan reaches +-3 from it, so the ceiling must span
    // z = bz-3 .. bz+4 (not bz-3 .. bz+3) or column (bx, z+3) stays uncovered
    // and the (x, z+3) window keeps returning true.
    bot.chat(`/fill ${bx - 3} ${by + 2} ${bz - 3} ${bx + 3} ${by + 2} ${bz + 4} ${mat} 0 replace`);
    await sleep(1500);
    bot.chat(`/setblock ${bx} ${by} ${bz} minecraft:bed 0`);
    await sleep(600);
    bot.chat(`/setblock ${bx} ${by} ${bz + 1} minecraft:bed 8`);
    await sleep(2500);
    const foot = bot.blockAt(new Vec3(bx, by, bz));
    const head = bot.blockAt(new Vec3(bx, by, bz + 1));
    const up1 = bot.blockAt(new Vec3(bx, by + 1, bz + 1));
    const roof = bot.blockAt(new Vec3(bx, by + 2, bz + 1));
    log('roof', `foot=${foot && foot.name} head=${head && head.name} y+1=${up1 && up1.name} roof=${roof && roof.name}`);
    tail(`ROOF foot=${foot && foot.name} head=${head && head.name} yPlus1=${up1 && up1.name} roof=${roof && roof.name}`);

  } else if (op === 'pit') {
    // isOutdoors flips to false only when every column its scan can reach is
    // walled: an open-air bed always refuses because the neighbouring columns'
    // precipitation height (ground top + 1) equals the bed y, and
    // `precipHeight <= y` is true. A realistic enclosure (neighbours are walls)
    // is the face that flips �?that is what this rig builds.
    //   1) 5x5x3 solid shell over the bed pair
    //   2) hollow the 1x2x2 bed pocket (two free levels above the bed, so
    //      gate-2 obstructed stays quiet)
    //   3) hollow ONE standing slot at (bx+2, bz+1) �?that cell is +2 in x,
    //      gated behind a checkBlock flag that is never set, so hollowing it
    //      does not reopen the scan; it only gives the bot somewhere to stand
    //      inside vanilla's sleep distance (d^2 < 8) of the bed.
    //   4) re-place the bed
    const bx = parseInt(A[0], 10), by = parseInt(A[1], 10), bz = parseInt(A[2], 10);
    const mat = A[3] || 'minecraft:stone';
    await settle(bx, by, bz);
    bot.chat(`/fill ${bx - 2} ${by} ${bz - 1} ${bx + 2} ${by + 2} ${bz + 2} ${mat} 0 replace`);
    await sleep(1500);
    bot.chat(`/fill ${bx} ${by} ${bz} ${bx} ${by + 1} ${bz + 1} minecraft:air 0 replace`);
    await sleep(1000);
    bot.chat(`/fill ${bx + 2} ${by} ${bz + 1} ${bx + 2} ${by + 1} ${bz + 1} minecraft:air 0 replace`);
    await sleep(1000);
    bot.chat(`/setblock ${bx} ${by} ${bz} minecraft:bed 0`);
    await sleep(600);
    bot.chat(`/setblock ${bx} ${by} ${bz + 1} minecraft:bed 8`);
    await sleep(2500);
    const foot = bot.blockAt(new Vec3(bx, by, bz));
    const head = bot.blockAt(new Vec3(bx, by, bz + 1));
    const up1 = bot.blockAt(new Vec3(bx, by + 1, bz + 1));
    const roof = bot.blockAt(new Vec3(bx, by + 2, bz + 1));
    log('pit', `foot=${foot && foot.name} head=${head && head.name} y+1=${up1 && up1.name} roof=${roof && roof.name}`);
    tail(`PIT foot=${foot && foot.name} head=${head && head.name} yPlus1=${up1 && up1.name} roof=${roof && roof.name}`);

  } else if (op === 'fill2') {
    // One chat message, so no cell can be dropped by chat throttling.
    const x1 = parseInt(A[0], 10), y1 = parseInt(A[1], 10), z1 = parseInt(A[2], 10);
    const x2 = parseInt(A[3], 10), y2 = parseInt(A[4], 10), z2 = parseInt(A[5], 10);
    const mat = A[6] || 'minecraft:air';
    await settle(x1, y1, z1);
    bot.chat(`/fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${mat} 0 replace`);
    await sleep(2500);
    const b = bot.blockAt(new Vec3(x1, y1, z1));
    log('fill2', `${x1},${y1},${z1}..${x2},${y2},${z2} -> ${mat}; first cell now=${b && b.name}`);
    tail(`FILL2 ${mat} first=${b && b.name}`);

  } else if (op === 'mob') {
    const type = A[0];
    const x = parseInt(A[1], 10), y = parseInt(A[2], 10), z = parseInt(A[3], 10);
    const nbt = A[4];
    const killR = parseInt(A[5] || '14', 10);
    await settle(x, y, z);
    // Sweep first so a scenario never inherits the previous scenario's mob.
    for (const t of ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'slime', 'zombie_pigman', 'silverfish']) {
      bot.chat(`/kill @e[type=${t},r=${killR}]`);
      await sleep(200);
    }
    await sleep(1200);
    bot.chat(`/summon ${type} ${x} ${y} ${z} ${nbt || ''}`.trim());
    await sleep(2500);
    log('mob', `summoned ${type} at ${x},${y},${z} (swept r=${killR} first)`);
    tail(`MOB ${type} at ${x},${y},${z} swept=${killR}`);

  } else if (op === 'info') {
    log('info', `pos=${bot.entity.position.x} ${bot.entity.position.y} ${bot.entity.position.z} sleeping=${bot.isSleeping} food=${bot.food} health=${bot.health}`);
    tail(`INFO pos=${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)} sleeping=${bot.isSleeping}`);

  } else {
    tail(`UNKNOWN_OP ${op}`);
    process.exit(3);
  }

  // Give the server a beat to flush its log lines before the socket closes.
  await sleep(1500);
  process.exit(0);
}

main().catch((e) => { log('fatal', e.message); tail(`FATAL ${e.message}`); process.exit(1); });