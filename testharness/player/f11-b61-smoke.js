// B-61 smoke: R196 EntityDireWolf + EntityHellhound (census D :69/:86/:115/:116/:241/:242).
// Verdict channel = server log ([BeastLog]/[SpawnLog]).
//   W1 attributes: /etest beast dire|hell -> hp/max/attack/speed/follow/xp/tamed rows
//   W2 taming: /etest beasttame 200 -> 200 rolls summed, aggro+fail+success==rolls,
//      plus the tamed row (24 hp / 5 attack / follow 32 through MixinEntityWolf)
//   W3 bite: hellhound bites under resistance IV -> 40% fire row (fire 1..8)
//   W4 immunity: beasthit hell fire -> applied=0 + hell immune; player -> applied=1
//   W5 gate: hellhound y<=32 allowed, high y rejected
//   W6 spawn rows: wolf base row + taiga/snowy dire rows present in the table source
//   W7 assets: 5 textures + lang keys + registration ids
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b61-' + RUN + '-v1';

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
function lastOf(rows) { return rows.length ? rows[rows.length - 1] : null; }

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
  bootCfg = bootCfg.replace(/B:livestockNeedsR196=(true|false)/, 'B:livestockNeedsR196=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'livestockNeedsR196=' + (/B:livestockNeedsR196=(true|false)/.exec(disk) || [])[1]);
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
  await cmd('tp ' + A + ' 0.5 130 0.5', 2000);
  await cmd('fill 0 129 0 15 129 15 minecraft:stone', 900);
  await cmd('fill 0 130 0 15 133 15 minecraft:air', 500);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
}

const PROBE_RE = /\[BeastLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) attack=([\d.]+) speed=([\d.]+) follow=([\d.]+) tamed=(true|false) xp=(\d+) entity=/;
const SPAWN_RE = /\[BeastLog\] spawn kind=(\w+) hp=([\d.]+) max=([\d.]+) attack=([\d.]+) speed=([\d.]+) follow=([\d.]+) (?:tamed=(true|false) )?xp=(\d+) entity=/;
const TAMESUM_RE = /\[BeastLog\] tamesum rolls=(\d+) aggro=(\d+) fail=(\d+) success=(\d+) level=(\d+) /;
const TAMEDROW_RE = /\[BeastLog\] tamedrow kind=direwolf hp=([\d.]+) max=([\d.]+) attack=([\d.]+) follow=([\d.]+) /;
const BITE_RE = /\[BeastLog\] bite kind=hellhound target=(\S+) fire=(\d+) hurt=(true|false) entity=/;
const IMMUNE_RE = /\[BeastLog\] hell immune aspect=fire source=(\S+) entity=/;
const HIT_RE = /\[BeastLog\] hit kind=(\w+) source=(\w+) found=(\d+) applied=(\d+) /;
const GATE_RE = /\[SpawnLog\] undeadgate cls=(\w+) allowed=(true|false) depth=(true|false) y=(-?\d+) blood=(true|false) freezing=(true|false) desert=(true|false) cfg=(true|false) at /;

async function gate(x, y, z, kind) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest beastgate ${kind} ${x} ${y} ${z}`, 400);
  const m = await waitRow(GATE_RE, from, 5000);
  const g = lastOf(m);
  return g ? { cls: g[1], allowed: g[2] === 'true', depth: g[3] === 'true', y: +g[4] } : null;
}

async function main() {
  const pinOk = stampPin();
  await startBoot(`b61-${RUN}-b1`);
  await join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false, w7: false };

  // ---- W1 attributes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest beast dire 4 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest beast hell 8 130 0`, 400);
  const probes = await waitRow(PROBE_RE, from, 8000);
  const spawns = await waitRow(SPAWN_RE, from, 8000);
  const pd = lastOf(probes.filter(r => r[1] === 'dire'));
  const ph = lastOf(probes.filter(r => r[1] === 'hell'));
  res.w1 = !!pd && !!ph
    && +pd[3] === 16 && +pd[4] === 5 && Math.abs(+pd[5] - 0.4) < 1e-6 && +pd[6] === 16 && pd[7] === 'false' && +pd[8] === 10
    && +ph[3] === 20 && +ph[4] === 4 && +ph[6] === 16 && ph[7] === 'false' && +ph[8] === 15;
  console.log('[W1]', JSON.stringify({
    dire: pd && { hp: +pd[2], max: +pd[3], attack: +pd[4], speed: +pd[5], follow: +pd[6], tamed: pd[7], xp: +pd[8] },
    hell: ph && { hp: +ph[2], max: +ph[3], attack: +ph[4], speed: +ph[5], follow: +ph[6], tamed: ph[7], xp: +ph[8] },
    spawnRows: spawns.length, pass: res.w1,
  }));
  await cmd('kill @e[type=!player]', 400);

  // ---- W2 taming table + the tamed attribute row ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest beasttame 200`, 1200);
  const sums = await waitRow(TAMESUM_RE, from, 8000);
  const tamedRows = await waitRow(TAMEDROW_RE, from, 8000);
  const sum = lastOf(sums);
  const tr = lastOf(tamedRows);
  res.w2 = !!sum && +sum[1] === 200 && (+sum[2] + +sum[3] + +sum[4]) === 200 && +sum[2] > 0 && +sum[4] > 0
    && !!tr && +tr[2] === 24 && +tr[3] === 5 && +tr[4] === 32;
  console.log('[W2]', JSON.stringify({
    sum: sum && { rolls: +sum[1], aggro: +sum[2], fail: +sum[3], success: +sum[4], level: +sum[5] },
    tamed: tr && { hp: +tr[1], max: +tr[2], attack: +tr[3], follow: +tr[4] }, pass: res.w2,
  }));

  // ---- W3 burning bite (creative players are invulnerable, so bite in survival) ----
  await cmd('gamemode 0 ' + A, 300);
  await cmd('effect ' + A + ' minecraft:resistance 600 3', 300);
  from = mark();
  await cmd('summon etim:hellhound 3.5 130 0.5', 400);
  await cmd('effect ' + A + ' minecraft:instant_health 1 19', 200);
  let b = null, rounds = 0;
  for (; rounds < 12 && !b; rounds++) {
    await cmd(`execute ${A} ~ ~ ~ etest beastbite hell 3`, 300);
    await cmd('effect ' + A + ' minecraft:instant_health 1 19', 200);
    b = lastOf(await waitRow(BITE_RE, from, 1200));
  }
  const bites = await waitRow(BITE_RE, from, 500);
  res.w3 = !!b && +b[2] >= 1 && +b[2] <= 8;
  console.log('[W3]', JSON.stringify({ rounds, biteRows: bites.length,
    bite: b && { target: b[1], fire: +b[2], hurt: b[3] }, pass: res.w3 }));
  await cmd('gamemode 1 ' + A, 300);

  // ---- W4 fire/lava immunity vs player damage ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest beasthit hell fire`, 500);
  const imm = await waitRow(IMMUNE_RE, from, 6000);
  const hitFire = lastOf(await waitRow(HIT_RE, from, 6000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest beasthit hell player`, 500);
  const hitPlayer = lastOf(await waitRow(HIT_RE, from, 6000));
  res.w4 = imm.length > 0 && !!hitFire && hitFire[2] === 'fire' && +hitFire[4] === 0
    && !!hitPlayer && +hitPlayer[4] === 1;
  console.log('[W4]', JSON.stringify({
    immuneRows: imm.length,
    fire: hitFire && { found: +hitFire[3], applied: +hitFire[4] },
    player: hitPlayer && { found: +hitPlayer[3], applied: +hitPlayer[4] }, pass: res.w4 }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('effect ' + A + ' minecraft:resistance 0 0', 300);

  // ---- W5 hellhound depth gate ----
  const low = await gate(0, 20, 0, 'hell');
  const high = await gate(0, 100, 0, 'hell');
  res.w5 = !!low && !!high && low.allowed === true && high.allowed === false
    && low.cls === 'ETIMEntityHellhound';
  console.log('[W5]', JSON.stringify({ low, high, pass: res.w5 }));

  // ---- W6 spawn rows in the table source ----
  const tables = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMSpawnTables.java'), 'utf8');
  const baseRow = /monster\.add\(entry\(ETIMEntityHellhound\.class, 10, 1, 1\)\)/.test(tables);
  const taigaRow = /entry\(ETIMEntityDireWolf\.class, 5, 1, 3\)/.test(tables);
  const snowyRow = /entry\(ETIMEntityDireWolf\.class, 1, 1, 3\)/.test(tables);
  const gateRow = /pos\.getY\(\) <= 32; \/\/ R196 WorldServer\.java:683-686/.test(tables);
  res.w6 = baseRow && taigaRow && snowyRow && gateRow;
  console.log('[W6]', JSON.stringify({ baseRow, taigaRow, snowyRow, gateRow, pass: res.w6 }));

  // ---- W7 assets + registration ----
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const texFiles = ['dire_wolf/neutral.png', 'dire_wolf/tame.png', 'dire_wolf/angry.png',
    'dire_wolf/collar.png', 'hellhound/hellhound.png'];
  const tex = texFiles.every(f => fs.existsSync(path.join(resRoot, 'textures', 'entity', f)));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = /^entity\.etim\.dire_wolf\.name=/m.test(en) && /^entity\.etim\.hellhound\.name=/m.test(en)
    && /^entity\.etim\.dire_wolf\.name=/m.test(zh) && /^entity\.etim\.hellhound\.name=/m.test(zh);
  const ents = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMMobEntities.java'), 'utf8');
  const reg = /"etim\.dire_wolf", 24/.test(ents) && /"etim\.hellhound", 25/.test(ents);
  res.w7 = tex && langs && reg;
  console.log('[W7]', JSON.stringify({ tex, langs, reg, pass: res.w7 }));

  await stopBoot();
  const bad = Object.keys(res).filter(k => !res[k]);
  const out = { run: RUN, pin: pinOk, w1: res.w1, w2: res.w2, w3: res.w3, w4: res.w4, w5: res.w5, w6: res.w6, w7: res.w7,
    stops: stops.map(s => (s && s.exitCode === 0) ? 0 : 1).reduce((a, b) => a + b, 0),
    crashes: L.crashCount(), pass: pinOk && bad.length === 0, bad: bad.length, badKeys: bad };
  console.log('[done] ' + JSON.stringify(out));
  process.exit(out.pass && out.stops === 0 ? 0 : 2);
}

main().catch(async (e) => {
  console.error('[fatal]', (e && e.stack) || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
