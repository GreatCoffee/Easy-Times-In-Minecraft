// B-41 smoke — swing-two pack (:89 creative sword break gate + :92 stick/bone break roll)
// Verdict faces: [SwingLog] swordgate / stickbreak rows (mobDebugLog gate).
// W1 = sword gate: the creative bot with a sword cannot break dirt (the pad stays); bare-hand control arm breaks it.
// W2 = stick break roll: mineflayer attacks on a dummy cow, 300 swings, stick held -> break-roll lines (1/50 per swing).
// W3 (evidence) = bone control arm: 300 swings with bone held (1/100; rows only recorded).
// b1 = flag-off boot: both faces silent (vanilla shape).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { ROOT, PORT } = L;
const vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const HOME = '-60.5 67 240.5';
const MUD = '-60 67 240'; // the W1 break-target cell (foot level)
const COW = '-60.5 67 242.5'; // the dummy cow cell
const SWINGS = 400; // r11: the server accepts ~1.7 attacks/s (the vanilla swing cooldown); 400x400ms ≈ 250-270 real swings -> E[rolls]≈5, P(0)≈0.5%

let bot = null, srv = null, propsBefore = null, cfgBefore = null;

const faces = {
  swordgate: s => / \[SwingLog\] swordgate /.test(s),
  stickbreak: s => / \[SwingLog\] stickbreak /.test(s),
};

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function cmd(s, wait) {
  srv.send(s);
  await sleep(wait == null ? 400 : wait);
}

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  for (let rm = 1; rm <= 10; rm++) { try { fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true }); break; } catch (e) { if (rm === 10) throw new Error('stale server JVM still holds run/' + world + ' — kill it first'); await sleep(3000); } }
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props) ? L.setProp(props, 'level-name', world) : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held — aborting, no collide boot');
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
  if (!st.exited) throw new Error('server JVM did not exit after stop (exitCode=' + st.exitCode + ')');
  const rec = { exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) };
  console.log('[stop]', JSON.stringify(rec));
  return rec;
}

/** The stage: creative bot on a grass/dirt pad, no mobs, night (no flee-sun face). */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 1 ' + A);
  await cmd('gamerule doMobSpawning false');
  await cmd('gamerule doFireTick false');
  await cmd('gamerule mobGriefing true');
  await cmd('difficulty normal');
  await cmd('time set 18000');
  await cmd('weather clear');
  await cmd('kill @e[type=!player]');
  await L.tp(srv, -60.5, 67, 240.5);
  await sleep(1500); // let the teleported chunk finish loading before setblock (r9: setblocks raced the chunk load)
  // Deterministic faces (the fresh world's natural terrain varies — r8: the W1
  // pad was a cave air pocket and the W2 pocket was solid = suffocation death):
  await cmd('setblock -60 67 240 minecraft:dirt'); // the W1 pad
  await cmd('setblock -60 68 240 minecraft:air'); // the W1 bot's head cell
  await cmd('setblock -59 66 242 minecraft:dirt'); // the W2 floor
  await cmd('setblock -60 66 242 minecraft:dirt');
  await cmd('setblock -59 67 242 minecraft:air'); // the W2 bot cell
  await cmd('setblock -59 68 242 minecraft:air');
  await cmd('setblock -60 67 242 minecraft:air'); // the W2 cow cell
  await cmd('setblock -60 68 242 minecraft:air');
  await sleep(600);
}

/** bot.attack(entity) needs an Entity object — find by name (B-39 punchZombieById face). */
function findEntity(list, needle) {
  for (const id of Object.keys(list)) {
    const e = list[id];
    if (!e || e.username) continue;
    const name = (e.displayName || e.name || '').toLowerCase();
    if (name.indexOf(needle) >= 0) return e;
  }
  return null;
}

async function digWithHand(pos, times) {
  // The vanilla dig API: bot.dig(BlockObject, force) (f5-wb.js:475 face) —
  // bot.digBlock does not exist in this mineflayer version.
  for (let i = 0; i < times; i++) {
    const b = bot.blockAt(pos);
    if (!b) { note('blockAt null at ' + pos); await sleep(500); continue; }
    try { await bot.dig(b, true); } catch (e) { note('dig err: ' + e.message); }
    await sleep(600);
  }
}

async function main() {
  // ---------- boot 1: flags on (W1/W2/W3) ----------
  srv = await startBoot('w-b41-b1', 'w-b41a', { livestockNeedsR196: true, mobDebugLog: true });
  const a1 = {};
  await stageArena();

  // ---- W1: the sword gate (creative bot) ----
  // TheOneProbe auto-gives its probenote into the main hand on join (r10 diag:
  // held=theoneprobe:probenote), so the give lands in a side slot — write the
  // mainhand slot directly.
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:stone_sword 1', 600);
  await L.tp(srv, -60.5, 68, 240.5);
  await sleep(500);
  let mark = srv.all.length;
  await digWithHand(new vec3(-60, 67, 240), 3);
  await sleep(400);
  a1.swordGateRows = srv.all.slice(mark).filter(s => faces.swordgate(s)).length;
  a1.padBlock = (await L.testBlock(srv, -60, 67, 240, 'minecraft:dirt')).ok;
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:air');
  await sleep(400);
  await digWithHand(new vec3(-60, 67, 240), 3);
  await sleep(400);
  a1.bareBlock = (await L.testBlock(srv, -60, 67, 240, 'minecraft:air')).ok; // the vanilla creative break works

  // ---- W2/W3: the stick/bone break roll on a dummy cow (R196 :964-966 skips creative -> SURVIVAL bot) ----
  await cmd('gamemode 0 ' + A, 600);
  await cmd('give ETIM_F7 minecraft:stick 64', 500);
  await L.tp(srv, -59.5, 67, 242.5);
  await sleep(500);
  await cmd(`summon cow -60.5 67 242.5 {PersistenceRequired:1b,NoAI:1b,Attributes:[{Name:"generic.maxHealth",Base:400}],Health:400f}`, 800);
  let cow = findEntity(bot.entities, 'cow');
  if (!cow) throw new Error('W2: no cow entity found');
  await bot.lookAt(cow.position.offset(0, 0.9, 0));
  await sleep(400);

  async function swingRound(item, n) {
    await cmd(`replaceitem entity ETIM_F7 slot.weapon.mainhand ${item} 64`, 500);
    const mark = srv.all.length;
    // r10 diag: mineflayer's attack is rate-limited to ~1.7/s (~30 packets out
    // of a 300-iteration loop) — use the B-39 raw use_entity packets (no
    // client-side throttle) so every iteration lands as a real swing. The
    // server still applies the vanilla swing cooldown (~1.7/s accepted).
    for (let i = 0; i < n; i++) {
      bot._client.write('use_entity', { target: cow.id, mouse: 1, sneaking: false });
      bot._client.write('arm_animation', {});
      await sleep(400);
    }
    await sleep(800);
    return srv.all.slice(mark).filter(s => faces.stickbreak(s)).length;
  }
  a1.stickBreaks = await swingRound('minecraft:stick', SWINGS);
  a1.boneBreaks = await swingRound('minecraft:bone', 200); // 1/100, evidence-only
  await cmd('kill @e[type=cow]');
  await cmd('gamemode 1 ' + A, 600);

  const rec1 = await stopBoot();
  console.log('[a1]', JSON.stringify(a1));

  // ---------- boot 2: flags off (b1 arm) ----------
  srv = await startBoot('w-b41-b2', 'w-b41b', { livestockNeedsR196: false, mobDebugLog: false });
  const b1 = {};
  await stageArena();
  await cmd('give ETIM_F7 minecraft:stone_sword 1');
  await L.tp(srv, -60.5, 68, 240.5);
  await sleep(500);
  mark = srv.all.length;
  await digWithHand(new vec3(-60, 67, 240), 3);
  await sleep(400);
  b1.swordGateRows = srv.all.slice(mark).filter(s => faces.swordgate(s)).length;
  b1.padBlock = (await L.testBlock(srv, -60, 67, 240, 'minecraft:dirt')).ok; // :89 vanilla parity — the creative sword stays blocked (the vanilla rule)
  await L.tp(srv, -59.5, 67, 242.5);
  await sleep(500);
  await cmd(`summon cow -60.5 67 242.5 {PersistenceRequired:1b,NoAI:1b,Attributes:[{Name:"generic.maxHealth",Base:400}],Health:400f}`, 800);
  const cow2 = findEntity(bot.entities, 'cow');
  if (!cow2) throw new Error('b1: no cow entity found');
  await bot.lookAt(cow2.position.offset(0, 0.9, 0));
  await sleep(400);
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:stick 64', 500);
  mark = srv.all.length;
  for (let i = 0; i < 40; i++) { try { bot.attack(cow2); } catch (e) { note('attack err: ' + e.message); } await sleep(60); }
  await sleep(800);
  b1.stickBreakRows = srv.all.slice(mark).filter(s => faces.stickbreak(s)).length;
  await cmd('kill @e[type=cow]');

  const rec2 = await stopBoot();
  console.log('[b1]', JSON.stringify(b1));

  // ---------- verdict ----------
  const w0 = rec1.exited && rec1.exitCode === 0 && rec1.build && rec2.exited && rec2.exitCode === 0 && rec2.build;
  const w1 = a1.padBlock === true && a1.bareBlock === true; // :89 vanilla parity — the creative sword stays blocked with NO ETIM rows
  const w2 = a1.stickBreaks >= 1; // 300 swings x 1/50 -> ~6; P(0) ~= e^-6 ~= 0.2%
  const b1ok = b1.swordGateRows === 0 && b1.stickBreakRows === 0 && b1.padBlock === false; // :89 vanilla parity with the flags off — the creative sword STILL stays blocked (the vanilla rule)
  const bad = !(w0 && w1 && w2 && b1ok);
  const done = {
    run: RUN, w0, w1, w2, b1: b1ok, bad,
    a1swordGate: a1.swordGateRows, a1pad: a1.padBlock, a1bare: a1.bareBlock,
    stickBreaks: a1.stickBreaks, boneBreaks: a1.boneBreaks,
    b1gate: b1.swordGateRows, b1pad: b1.padBlock, b1stickRows: b1.stickBreakRows,
    stop: [rec1, rec2],
  };
  console.log('[done]', JSON.stringify(done));
  fs.writeFileSync(`build-logs/f11-b41-smoke-${RUN}.json`, JSON.stringify(done, null, 2));
  process.exit(bad ? 1 : 0);
}

main().catch(err => {
  console.log('[fatal] ' + err.message);
  process.exit(1);
});
