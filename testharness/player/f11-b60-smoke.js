// B-60 smoke: R196 EntityInvisibleStalker + EntityAISeekLitTorch
// (census D :245/:261). Verdict channel = server log ([StalkerLog]/[UndeadLog]/
// [SpawnLog]); the 5% ghost model is client-side and the F3+B acceptance is
// judged by the server flag (invisible=false) that RenderManager gates on.
//   W1 attributes: /etest stalker -> follow 40, attack 4.0, max 20, xp 10,
//      speed 0.23, undead=false, invisible=false
//   W2 torch snuff: stalker alone next to a torch, player > 4 blocks ->
//      [UndeadLog] stalker snuff pos=8,130,1 kind=minecraft:torch
//   W3 seek lit torch: three lanes, 1/200 roll -> [StalkerLog] seek row
//   W4 gate: y<=40 allowed, high y rejected (no blood/biome flag in R196)
//   W5 F3+B: spawn rows must keep invisible=false (RenderManager:408 draw gate)
//   W6 assets: wight texture + lang keys + cfg key present
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b60-' + RUN + '-v1';

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
  bootCfg = bootCfg.replace(/B:mobUndeadSurfaceR196=(true|false)/, 'B:mobUndeadSurfaceR196=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'mobUndeadSurfaceR196=' + (/B:mobUndeadSurfaceR196=(true|false)/.exec(disk) || [])[1]);
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

const PROBE_RE = /\[UndeadLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) follow=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(\d+) undead=(true|false) at /;
const SPAWN_RE = /\[StalkerLog\] spawn kind=stalker hp=([\d.]+) max=([\d.]+) follow=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(\d+) undead=(true|false) invisible=(true|false) entity=/;
const SNUFF_RE = /\[UndeadLog\] stalker snuff pos=BlockPos\{x=(-?\d+), y=(-?\d+), z=(-?\d+)\} kind=(\S+) entity=/;
const SEEK_RE = /\[StalkerLog\] seek cls=(\S+) torch=BlockPos\{x=(-?\d+), y=(-?\d+), z=(-?\d+)\} dist=(\d+) entity=/;
const GATE_RE = /\[SpawnLog\] undeadgate cls=(\w+) allowed=(true|false) depth=(true|false) y=(-?\d+) blood=(true|false) freezing=(true|false) desert=(true|false) cfg=(true|false) at /;

async function gate(x, y, z, kind) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undeadgate ${x} ${y} ${z} ${kind}`, 400);
  const m = await waitRow(GATE_RE, from, 5000);
  const g = lastOf(m);
  return g ? { cls: g[1], allowed: g[2] === 'true', depth: g[3] === 'true', y: +g[4],
    cfg: g[8] === 'true' } : null;
}

async function main() {
  const pinOk = stampPin();
  await startBoot(`b60-${RUN}-b1`);
  await join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 attributes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest stalker 4 130 0`, 500);
  const probes = await waitRow(PROBE_RE, from, 8000);
  const spawns = await waitRow(SPAWN_RE, from, 8000);
  const p = lastOf(probes.filter(r => r[1] === 'stalker'));
  const sp = lastOf(spawns);
  res.w1 = !!p && +p[3] === 20 && +p[4] === 40 && +p[5] === 4 && Math.abs(+p[6] - 0.23) < 1e-6
    && +p[7] === 10 && p[8] === 'false';
  console.log('[W1]', JSON.stringify({
    probe: p && { kind: p[1], hp: +p[2], max: +p[3], follow: +p[4], attack: +p[5], speed: +p[6], xp: +p[7], undead: p[8] },
    spawn: sp && { max: +sp[2], follow: +sp[3], attack: +sp[4], speed: +sp[5], xp: +sp[6], undead: sp[7], invisible: sp[8] },
    pass: res.w1,
  }));
  await cmd('kill @e[type=!player]', 400);

  // ---- W2 torch snuff next to the stalker ----
  from = mark();
  await cmd('summon etim:invisible_stalker 8.5 130 0.5', 400);
  await cmd('setblock 8 130 1 minecraft:torch', 400);
  const snuff = await waitRow(SNUFF_RE, from, 8000);
  const s = lastOf(snuff);
  res.w2 = !!s && s[1] === '8' && s[2] === '130' && s[3] === '1' && s[4].indexOf('torch') >= 0;
  console.log('[W2]', JSON.stringify({
    snuff: s && { pos: s[1] + ',' + s[2] + ',' + s[3], kind: s[4] }, pass: res.w2,
  }));
  await cmd('kill @e[type=!player]', 400);

  // ---- W3 seek lit torch (1/200 per tick, three lanes) ----
  await cmd('tp ' + A + ' 60.5 130 60.5', 600);
  from = mark();
  for (const z of [2, 6, 10]) {
    await cmd(`summon etim:invisible_stalker 0.5 130 ${z + 0.5}`, 200);
    await cmd(`setblock 12 130 ${z} minecraft:torch`, 200);
  }
  const seek = await waitRow(SEEK_RE, from, 45000);
  const sk = lastOf(seek);
  res.w3 = !!sk;
  console.log('[W3]', JSON.stringify({
    seek: sk && { cls: sk[1], torch: sk[2] + ',' + sk[3] + ',' + sk[4], dist: +sk[5] }, pass: res.w3,
  }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('fill 11 130 1 13 130 11 minecraft:air', 300);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);

  // ---- W4 gate: depth row only for the stalker ----
  const low = await gate(0, 20, 0, 'stalker');
  const high = await gate(0, 100, 0, 'stalker');
  res.w4 = !!low && !!high && low.allowed === true && high.allowed === false
    && low.cls === 'ETIMEntityInvisibleStalker';
  console.log('[W4]', JSON.stringify({ low, high, pass: res.w4 }));

  // ---- W5 F3+B precondition: never flagged invisible ----
  const invRows = spawns.filter(r => r[8] === 'false');
  res.w5 = spawns.length > 0 && invRows.length === spawns.length;
  console.log('[W5]', JSON.stringify({ spawnRows: spawns.length, invisibleFalse: invRows.length, pass: res.w5 }));

  // ---- W6 assets + cfg key ----
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const tex = fs.existsSync(path.join(resRoot, 'textures', 'entity', 'wight.png'));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = /^entity\.etim\.invisible_stalker\.name=/m.test(en)
    && /^entity\.etim\.invisible_stalker\.name=/m.test(zh);
  const cfgKey = Object.prototype.hasOwnProperty.call(L.cfgKeys(L.CFG), 'mobUndeadSurfaceR196');
  res.w6 = tex && langs && cfgKey;
  console.log('[W6]', JSON.stringify({ tex, langs, cfgKey, pass: res.w6 }));

  await stopBoot();
  const bad = Object.keys(res).filter(k => !res[k]);
  const out = { run: RUN, pin: pinOk, w1: res.w1, w2: res.w2, w3: res.w3, w4: res.w4, w5: res.w5, w6: res.w6,
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
