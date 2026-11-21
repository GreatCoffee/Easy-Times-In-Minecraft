// B-55 smoke: R196 bat family (vampire / nightwing / giant) + vision dimming.
// Verdict channel = server log only.
//   W1 summon attributes (health/max/damage/xp per kind)
//   W2 vampire chase + bite (bite row, bot loses health, vampire heals)
//   W3 nightwing aspect gate (iron -> immune aspect=none, silver -> hurt aspect=silver,
//      enchanted -> hurt aspect=magic)
//   W4 daylight kill (nightwing sun row) + dark regen path present
//   W5 vision dimming set/read + decay + NBT round-trip across a restart
//   W6 AMBIENT table depth gate (y=60 -> no vampire/nightwing, y=20 -> both,
//      blood moon -> both at y=60) via /etest batpick
//   W7 flag off: batpick at y=20 carries no family members
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b55-' + RUN + '-v1';

let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const stops = [];

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }
function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
function slice(from) { return logLines().slice(from); }
function mark() { return logLines().length; }
async function waitRow(re, from, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const rows = slice(from);
    const hit = rows.map(s => re.exec(s)).filter(Boolean);
    if (hit.length) return hit;
    await sleep(500);
  }
  return [];
}

function cfgWith(flags) {
  let cfg = cfgBefore;
  for (const [k, v] of Object.entries(flags)) {
    const re = new RegExp('B:' + k + '\\s*=\\s*(true|false)');
    cfg = re.test(cfg) ? cfg.replace(re, 'B:' + k + '=' + v)
      : cfg.replace(/(\r?\n)(\s*)B:mobDebugLog=(true|false)/,
        '$1$2B:mobDebugLog=$3$1$2B:' + k + '=' + v);
  }
  return cfg;
}

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const bytes = fs.readFileSync(jar);
  const sha = L.sha256(bytes).toUpperCase();
  const mk = L.mkCounts();
  const ok = sha === EXPECTED_SHA && bytes.length === L.PIN.releaseSize && mk.ok;
  console.log(`[PIN] sha=${sha} shaOk=${sha === EXPECTED_SHA} size=${bytes.length} sizeOk=${bytes.length === L.PIN.releaseSize} mkOk=${mk.ok} ok=${ok}`);
  return ok;
}

async function startBoot(tag, flags) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  fs.writeFileSync(L.CFG, cfgWith(flags), 'utf8');
  const eff = (fs.readFileSync(L.CFG, 'utf8').match(/B:(mobBatFamilyR196|mobDebugLog)=\w+/g) || []).join(' ');
  console.log('[cfg]', tag, eff);
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) return;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done( in 3 attempts');
}

async function stopBoot(restore) {
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  srv = null;
  stops.push(st);
  if (restore) {
    if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
    if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  }
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function stage() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 1', 200);
  await cmd('weather clear', 150);
  await cmd('time set 18000', 200);
  await cmd('tp ' + A + ' 0.5 120 0.5', 400);
  await cmd('etest batclear', 500);
  await cmd('kill @e[type=!player]', 500);
}

const SUMMON_RE = /\[BatMobLog\] summon kind=(\w+) pos=\((-?\d+),(-?\d+),(-?\d+)\) health=([\d.]+) max=([\d.]+) damage=([-\d.]+) xp=(\d+) cls=(\w+)/;
const BITE_RE = /\[BatMobLog\] bite cls=(\w+) target=(\S+) dealt=([\d.]+) healed=([\d.]+) feed_cd=(\d+) entity=[^\n]*[/#](\d+)/;
const NY_IMMUNE_RE = /\[BatMobLog\] nightwing immune aspect=(\w+) source=(\S+) entity=[^\n]*[/#](\d+)/;
const NY_HURT_RE = /\[BatMobLog\] nightwing hurt aspect=(\w+) amount=([\d.]+) hurt=(\w+) entity=[^\n]*[/#](\d+)/;
const NY_SUN_RE = /\[BatMobLog\] nightwing hurt aspect=sunlight amount=[\d.]+ hurt=true/;
const DIM_RE = /\[BatMobLog\] dim (probe|read) value=([\d.]+) player=(\S+)/;
const BATPICK_RE = /\[SpawnLog\] batpick n=(\d+) at (BlockPos\{[^}]*\}) counts=(\{[^}]*\})/;

async function summon(kind, x, y, z) {
  const from = mark();
  await cmd(`etest bat ${kind} ${x} ${y} ${z}`, 800);
  const m = await waitRow(SUMMON_RE, from, 5000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { kind: g[1], x: +g[2], y: +g[3], z: +g[4], health: +g[5], max: +g[6], damage: +g[7], xp: +g[8], cls: g[9] } : null;
}

function parseCounts(text) {
  const out = {};
  for (const part of text.replace(/[{}]/g, '').split(',')) {
    const m = part.trim().match(/^(\w+)=(\d+)$/);
    if (m) out[m[1]] = +m[2];
  }
  return out;
}

async function batpick(x, y, z, n) {
  const from = mark();
  await cmd(`etest batpick ${x} ${y} ${z} ${n}`, 1200);
  const m = await waitRow(BATPICK_RE, from, 20000);
  if (!m.length) return null;
  const g = m[m.length - 1];
  return { n: +g[1], counts: parseCounts(g[3]) };
}

async function boot1(pinOk) {
  await startBoot(`b55-${RUN}-b1`, { mobDebugLog: true, mobBatFamilyR196: true });
  await stage();

  // W1 attributes
  const vamp = await summon('vampire', 2, 120, 2);
  const wing = await summon('nightwing', 2, 120, 0);
  const giant = await summon('giant', 2, 120, -2);
  const w1 = !!(vamp && wing && giant)
    && vamp.health === 3 && vamp.max === 3 && vamp.damage === 1 && vamp.xp === 5
    && giant.health === 6 && giant.max === 6 && giant.damage === 2 && giant.xp === 10
    && wing.health === 3 && wing.max === 3 && wing.xp === 10;
  console.log('[W1]', JSON.stringify({ vamp, wing, giant, pass: w1 }));

  // W2 vampire chase + bite
  await cmd('etest batclear', 400);
  await cmd('kill @e[type=!player]', 400);
  await cmd('gamemode 0 ' + A, 300);
  await cmd('tp ' + A + ' 0.5 120 0.5', 400);
  // R196 bite is 1.0 damage; pump max health so 45s of bites cannot kill the bot
  await cmd('attribute ' + A + ' minecraft:generic.maxHealth base set 100', 300);
  await cmd('effect ' + A + ' minecraft:instant_health 5 10 true', 300);
  const hpBefore = bot ? bot.health : null;
  let from = mark();
  await cmd('etest bat vampire 0 120 6', 600);
  const bites = await waitRow(BITE_RE, from, 45000);
  const hpAfter = bot ? bot.health : null;
  const lastBite = bites.length ? bites[bites.length - 1] : null;
  const dealt = lastBite ? +lastBite[3] : 0;
  const healed = lastBite ? +lastBite[4] : 0;
  const feedCd = lastBite ? +lastBite[5] : -1;
  // R196 feed protocol: one bite lands, the bat heals by the amount it dealt and
  // then locks itself out of hunting players for 1200 ticks.
  const w2 = bites.length >= 1 && dealt > 0 && healed > 0 && feedCd === 1200
    && hpBefore != null && hpAfter != null && hpAfter < hpBefore;
  console.log('[W2]', JSON.stringify({ bites: bites.length, dealt, healed, feedCd,
    hpBefore, hpAfter, last: lastBite ? lastBite[0] : null, pass: w2 }));

  // W3 aspect gate
  await cmd('etest batclear', 400);
  await cmd('kill @e[type=!player]', 400);
  await cmd('gamemode 1 ' + A, 300);
  const hitArm = async (item, expect) => {
    await cmd('etest batclear', 300);
    await cmd('kill @e[type=!player]', 400);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + item, 300);
    await cmd('etest bat nightwing 0 120 5', 700);
    const f = mark();
    await cmd('etest hit @e[type=etim:nightwing,c=1] 1 ETIM_F7', 900);
    const imm = await waitRow(NY_IMMUNE_RE, f, 4000);
    const hurt = await waitRow(NY_HURT_RE, f, 2000);
    const aspect = imm.length ? 'immune:' + imm[0][1] : (hurt.length ? 'hurt:' + hurt[0][1] : 'none-seen');
    return { expect, aspect, ok: aspect === expect };
  };
  const a3none = await hitArm('minecraft:iron_sword', 'immune:none');
  const a3silver = await hitArm('etim:sword_silver', 'hurt:silver');
  const a3magic = await hitArm('minecraft:diamond_sword 1 0 {ench:[{id:16,lvl:1}]}', 'hurt:magic');
  const w3 = a3none.ok && a3silver.ok && a3magic.ok;
  console.log('[W3]', JSON.stringify({ none: a3none, silver: a3silver, magic: a3magic, pass: w3 }));

  // W4 daylight kill
  await cmd('etest batclear', 300);
  await cmd('kill @e[type=!player]', 400);
  await cmd('time set 6000', 300);
  from = mark();
  await cmd('etest bat nightwing 0 150 0', 700);
  const sun = await waitRow(NY_SUN_RE, from, 8000);
  const w4 = sun.length > 0;
  console.log('[W4]', JSON.stringify({ sunRows: sun.length, pass: w4 }));

  // W5 dim set / read / decay
  await cmd('time set 18000', 300);
  from = mark();
  await cmd('etest dim 1.5 ETIM_F7', 400);
  const setRow = await waitRow(DIM_RE, from, 3000);
  from = mark();
  await cmd('etest dim read ETIM_F7', 400);
  const readRow = await waitRow(DIM_RE, from, 3000);
  const setVal = setRow.length ? +setRow[0][2] : -1;
  const readVal = readRow.length ? +readRow[0][2] : -1;
  const w5a = setVal === 1.5 && readVal > 0 && readVal <= 1.5;
  // leave 1.0 in place for the restart round-trip
  await cmd('etest dimhold 1.5 ETIM_F7', 400);
  console.log('[W5]', JSON.stringify({ setVal, readVal, pass: w5a }));

  // W6 AMBIENT depth gate + blood moon
  const p60 = await batpick(0, 60, 0, 400);
  const p20 = await batpick(0, 20, 0, 400);
  await cmd('etest moon blood', 300);
  await cmd('etest totaltime 762000', 400);
  const p60blood = await batpick(0, 60, 0, 400);
  await cmd('etest moon none', 300);
  const fam = c => !!(c.EntityVampireBat || c.ETIMEntityVampireBat || c.EntityNightwing || c.ETIMEntityNightwing);
  const w6 = !!p60 && !!p20 && !!p60blood
    && !fam(p60.counts) && fam(p20.counts) && fam(p60blood.counts);
  console.log('[W6]', JSON.stringify({ p60, p20, p60blood, pass: w6 }));

  await stopBoot(false);
  return { pinOk, w1, w2, w3, w4, w5: w5a, w6 };
}

async function boot2(r1) {
  await startBoot(`b55-${RUN}-b2`, { mobDebugLog: true, mobBatFamilyR196: true });
  await stage();
  const from = mark();
  await cmd('etest dim read ETIM_F7', 700);
  const read = await waitRow(DIM_RE, from, 5000);
  const restored = read.length ? +read[0][2] : -1;
  const w5b = restored > 0.05 && restored <= 1.5; // 1.0 held at shutdown and decayed after restart: >0 proves NBT persisted
  await cmd('etest dim 0 ETIM_F7', 300);
  await stopBoot(false);
  console.log('[W5b]', JSON.stringify({ restored, pass: w5b }));

  // W7 flag off
  await startBoot(`b55-${RUN}-b3`, { mobDebugLog: true, mobBatFamilyR196: false });
  await stage();
  const off = await batpick(0, 20, 0, 400);
  const fam = c => !!(c.EntityVampireBat || c.ETIMEntityVampireBat || c.EntityNightwing || c.ETIMEntityNightwing);
  const w7 = !!off && !fam(off.counts) && (off.counts.EntityBat || 0) > 0;
  console.log('[W7]', JSON.stringify({ counts: off && off.counts, pass: w7 }));
  await stopBoot(true);
  return { w5b, w7 };
}

(async () => {
  let bad = 0;
  try {
    const pinOk = stampPin();
    if (!pinOk) bad++;
    const r1 = await boot1(pinOk);
    const r2 = await boot2(r1);
    for (const [k, v] of Object.entries(r1)) if (typeof v === 'boolean' && !v) bad++;
    for (const [k, v] of Object.entries(r2)) if (typeof v === 'boolean' && !v) bad++;
    console.log('[done]', JSON.stringify({ run: RUN, pin: pinOk, ...r1, ...r2, pass: bad === 0, bad, stops }));
  } catch (e) {
    console.log('[fatal]', e && e.stack || e);
    try { if (srv) await stopBoot(true); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
