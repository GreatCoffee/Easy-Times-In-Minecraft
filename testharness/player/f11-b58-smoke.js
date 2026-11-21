// B-58 smoke: gelatinous sphere item + throwable (R196 ItemGelatinousSphere /
// EntityGelatinousSphere). Verdict channel = server log ([GelLog]/[FoodLog]).
//   W1 item identity: /etest gelsphere 0..4 -> dmg 1/2/3/3/4, kind pepsin x3 + acid x2
//   W2 block contact: acid grass top -> dirt; grass side -> refused; leaves -> instant;
//      pepsin wool -> gradual (period 400, changed=false)
//   W3 entity damage + immunity matrix: zombie pepsin harmed, skeleton pepsin immune,
//      pudding acid immune
//   W4 drops carry subtype: size-1 jelly/blob/ooze/pudding -> sphere meta 1/2/3/4
//   W5 throw charge: survival right-click -> [GelLog] throw + [FoodLog] sphereThrowDrain,
//      one item consumed
//   W6 assets: 5 item models + 5 textures + 6 lang keys on disk
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b58-' + RUN + '-v1';

let bot = null, srv = null, propsBefore = null, cfgBefore = null;
const stops = [];

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 250 : wait); }
function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}
function slice(from) { return logLines().slice(from); }
function mark() { return logLines().length; }
async function waitRow(re, from, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const hit = slice(from).map(s => re.exec(s)).filter(Boolean);
    if (hit.length) return hit;
    await sleep(500);
  }
  return [];
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

async function startBoot(tag) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = L.setProp(props, 'level-name', WORLD);
  props = L.setProp(props, 'allow-flight', 'true');
  fs.writeFileSync(L.PROPS, props, 'utf8');
  let bootCfg = cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true');
  bootCfg = bootCfg.replace(/B:foodDebugLog=(true|false)/, 'B:foodDebugLog=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'foodDebugLog=' + (/B:foodDebugLog=(true|false)/.exec(disk) || [])[1]);
      return;
    }
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  srv = null;
  stops.push(st);
  if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function join() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  for (const g of ['doMobLoot true', 'doTileDrops false', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false',
    'doMobSpawning false']) {
    await cmd('gamerule ' + g, 150);
  }
  await cmd('difficulty 2', 200);
  await cmd('weather clear', 150);
  await cmd('time set 6000', 250);
  await cmd('fill 0 129 0 15 129 15 minecraft:stone', 800);
  await cmd('fill 0 130 0 15 133 15 minecraft:air', 400);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
}

const GIVE_RE = /\[GelLog\] give subtype=(\d+) count=(\d+) dmg=(\d+) kind=(\w+) player=(\S+)/;
const IMPACT_BLOCK_RE = /\[GelLog\] impact type=block subtype=(\d+) kind=(\w+) at \((-?\d+),(-?\d+),(-?\d+)\) face=(\w+) block=(\S+) period=(-?\d+) changed=(\w+) entity=(\d+)/;
const IMPACT_ENTITY_RE = /\[GelLog\] impact type=entity subtype=(\d+) kind=(\w+) dmg=([\d.]+) target=(\S+) immune=(\w+) dealt=([\d.]+) hp=([-\d.]+) entity=(\d+)/;
const THROW_RE = /\[GelLog\] throw subtype=(\d+) dmg=(\d+) kind=(\w+) hunger=([\d.]+) x=([-\d.]+) y=([-\d.]+) z=([-\d.]+) entity=(\d+)/;
const FOOD_RE = /\[FoodLog\]\s+\S+ \(\d+\) sphereThrowDrain base=([\d.]+) mod=([\d.]+) amount=([\d.]+) pool=([\d.]+)/;
const INV_RE = /\[GelLog\] inv 0=(\d+) 1=(\d+) 2=(\d+) 3=(\d+) 4=(\d+) player=(\S+)/;
const DROP_RE = /\[GelLog\] drop cls=(\S+) size=(\d+) wasRecentlyHit=(\w+) meta=(\d+) at \(([-\d.]+),([-\d.]+),([-\d.]+)\) entity=(\d+)/;

async function give(subtype, count) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest gelsphere ${subtype} ${count || 1}`, 400);
  const m = await waitRow(GIVE_RE, from, 5000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { subtype: +g[1], count: +g[2], dmg: +g[3], kind: g[4] } : null;
}

async function hitBlock(subtype, x, y, z, face) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest gelhit block ${subtype} ${x} ${y} ${z} ${face || 'up'}`, 600);
  const m = await waitRow(IMPACT_BLOCK_RE, from, 5000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { subtype: +g[1], kind: g[2], x: +g[3], y: +g[4], z: +g[5], face: g[6], block: g[7], period: +g[8], changed: g[9] === 'true' } : null;
}

async function hitEntity(subtype) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest gelhit entity ${subtype}`, 600);
  const m = await waitRow(IMPACT_ENTITY_RE, from, 5000);
  const g = m.length ? m[m.length - 1] : null;
  return g ? { subtype: +g[1], kind: g[2], dmg: +g[3], target: g[4], immune: g[5] === 'true', dealt: +g[6] } : null;
}

async function invSphere() {
  // 1.12 modded item stacks are opaque to mineflayer's inventory model (it renders
  // them as unknown ids), so the count comes from the server-side [GelLog] inv row.
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest gelinv`, 500);
  const m = await waitRow(INV_RE, from, 6000);
  if (!m.length) return {};
  const g = m[m.length - 1];
  return { '0': +g[1], '1': +g[2], '2': +g[3], '3': +g[4], '4': +g[5] };
}

async function main() {
  const pinOk = stampPin();
  await startBoot(`b58-${RUN}-b1`);
  await join();
  const res = { run: RUN, pin: pinOk };

  // --- W1: item identity rows ---
  const gives = [];
  for (let s = 0; s <= 4; s++) gives.push(await give(s, 1));
  res.w1 = gives.length === 5 && gives.every(Boolean)
    && gives.map(g => g.dmg).join(',') === '1,2,3,3,4'
    && gives.map(g => g.kind).join(',') === 'pepsin,pepsin,pepsin,acid,acid';
  console.log('[W1]', JSON.stringify({ gives, pass: res.w1 }));

  // --- W2: block contact faces ---
  await cmd('fill 2 130 0 6 133 0 minecraft:air', 200);
  await cmd('setblock 3 130 0 minecraft:grass', 300);
  const grassTop = await hitBlock(4, 3, 130, 0, 'up');
  await cmd('setblock 3 130 0 minecraft:grass', 300);
  const grassSide = await hitBlock(4, 3, 130, 0, 'north');
  await cmd('setblock 4 130 0 minecraft:leaves', 300);
  const leaves = await hitBlock(4, 4, 130, 0, 'up');
  await cmd('setblock 5 130 0 minecraft:wool', 300);
  const wool = await hitBlock(1, 5, 130, 0, 'up');
  res.w2 = !!grassTop && grassTop.changed && grassTop.block === 'minecraft:dirt'
    && !!grassSide && !grassSide.changed
    && !!leaves && leaves.changed
    && !!wool && !wool.changed && wool.period === 400;
  console.log('[W2]', JSON.stringify({ grassTop, grassSide, leaves, wool, pass: res.w2 }));

  // --- W3: entity damage + immunity matrix ---
  await cmd('fill 2 130 0 9 133 2 minecraft:air', 200);
  await cmd('summon minecraft:zombie 2.5 130 0.5', 500);
  await cmd('tp ' + A + ' 2.5 130 0.5', 400);
  const zombie = await hitEntity(1);
  await cmd('kill @e[type=zombie]', 400);
  await cmd('summon minecraft:skeleton 2.5 130 1.5', 500);
  const skeleton = await hitEntity(1);
  await cmd('kill @e[type=skeleton]', 400);
  await cmd('etest gel pudding 2 130 1 1 dt', 700);
  await cmd('tp ' + A + ' 2.5 130 1.5', 400);
  const pudding = await hitEntity(4);
  await cmd('kill @e[type=!player]', 400);
  res.w3 = !!zombie && !zombie.immune && zombie.dealt === 3
    && !!skeleton && skeleton.immune && skeleton.dealt === 0
    && !!pudding && pudding.immune && pudding.dealt === 0;
  console.log('[W3]', JSON.stringify({ zombie, skeleton, pudding, pass: res.w3 }));

  // --- W4: drops carry the family subtype ---
  // Judgment source = the server-side [GelLog] drop row emitted by the real
  // dropFewItems face (size-1 only). Bot pickup is deliberately not the判据:
  // 1.12 modded stacks are opaque to mineflayer and pickup distance adds noise.
  await cmd('fill 2 130 0 9 133 2 minecraft:air', 200);
  await cmd('tp ' + A + ' 5.5 130 0.5', 400);
  await cmd('clear ' + A, 400);
  await cmd('gamemode 0 ' + A, 400);
  const drops = [];
  const families = [['jelly', 'ETIMEntityJelly', 1], ['blob', 'ETIMEntityBlob', 2],
    ['ooze', 'ETIMEntityOoze', 3], ['pudding', 'ETIMEntityPudding', 4]];
  for (const [kind, cls, meta] of families) {
    await cmd(`etest gel ${kind} 5 130 0 1 d${meta}`, 700);
    await sleep(700);
    const from = mark();
    await cmd(`etest gelkill @e[type=!player,name=d${meta}] ${A}`, 500);
    const rows = await waitRow(DROP_RE, from, 6000);
    const d = rows.length ? rows[rows.length - 1] : null;
    drops.push({ kind, meta, expect: cls, cls: d && d[1], size: d && +d[2], hit: d && d[3] === 'true', dropMeta: d && +d[4] });
    await sleep(400);
  }
  // R196 getDropItemId only answers for size 1 — a size-2 cube must stay silent.
  await cmd('etest gel jelly 5 130 0 2 d9', 700);
  await sleep(700);
  const fromBig = mark();
  await cmd(`etest gelkill @e[type=!player,name=d9] ${A}`, 500);
  const bigRows = await waitRow(DROP_RE, fromBig, 2500);
  res.w4 = drops.length === 4 && drops.every(d => d.cls === d.expect && d.dropMeta === d.meta
    && d.size === 1)
    && bigRows.length === 0;
  await cmd('kill @e[type=!player]', 300);
  await cmd('gamemode 1 ' + A, 300);
  console.log('[W4]', JSON.stringify({ drops, bigDropRows: bigRows.length, pass: res.w4 }));

  // --- W5: survival throw charges hunger + consumes one item ---
  await cmd('gamemode 0 ' + A, 400);
  await cmd('tp ' + A + ' 0.5 130 0.5', 400);
  await cmd('clear ' + A, 400);
  await give(0, 3);
  await cmd(`execute ${A} ~ ~ ~ etest gelhold`, 500);
  await sleep(500);
  const before = await invSphere();
  const throwFrom = mark();
  await bot.setQuickBarSlot(0);
  await bot.activateItem();
  await sleep(1200);
  const throwRows = await waitRow(THROW_RE, throwFrom, 6000);
  // The [FoodLog] row is written by ETIMFoodStats before the [GelLog] throw row in
  // the same tick, so a byte offset captured at mark() can land after it — scan the
  // whole boot log instead (the tag is unique to this arm).
  const foodRows = await waitRow(FOOD_RE, 0, 1000);
  const after = await invSphere();
  const t = throwRows.length ? throwRows[throwRows.length - 1] : null;
  const f = foodRows.length ? foodRows[foodRows.length - 1] : null;
  const consumed = (before['0'] || 0) - (after['0'] || 0);
  res.w5 = !!t && +t[4] === 0.25 && !!f && Math.abs(+f[1] - 0.25) < 1e-6 && consumed === 1;
  console.log('[W5]', JSON.stringify({ throwRow: t && t[0], foodRow: f && f[0], before, after, consumed, pass: res.w5 }));

  // --- W6: assets on disk ---
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const names = ['green', 'ochre', 'crimson', 'gray', 'black'];
  const models = names.every(n => fs.existsSync(path.join(resRoot, 'models', 'item', `gelatinous_sphere_${n}.json`)));
  const tex = names.every(n => fs.existsSync(path.join(resRoot, 'textures', 'items', `gelatinous_sphere_${n}.png`)));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = names.every(n => en.includes(`item.etim.gelatinous_sphere.${n}.name=`))
    && en.includes('item.etim.tooltip.missileDamage=')
    && zh.includes('item.etim.tooltip.missileDamage=');
  res.w6 = models && tex && langs;
  console.log('[W6]', JSON.stringify({ models, tex, langs, pass: res.w6 }));

  await cmd('gamemode 1 ' + A, 200);
  await cmd('kill @e[type=!player]', 200);
  res.stops = stops.length;
  await stopBoot();

  const keys = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
  res.pass = !!res.pin && keys.every(k => res[k]);
  const bad = keys.filter(k => !res[k]);
  console.log('[done]', JSON.stringify({ ...res, bad: bad.length }));
  process.exit(bad.length ? 1 : 0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.message ? e.message : e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(2);
});
