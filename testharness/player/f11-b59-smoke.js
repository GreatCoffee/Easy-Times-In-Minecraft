// B-59 smoke: surface undead trio (R196 EntityGhoul / EntityWight / EntityShadow
// + WorldServer:604-612 blood-moon surface set). Verdict channel = server log
// ([UndeadLog]/[SpawnLog]), never client render.
//   W1 attributes: /etest undead -> follow 40, attack 5.0, max 20, xp 10,
//      speed 0.28/0.25/0.23, undead false/true/true
//   W2 wight immunity: player damage refused (killed=0) + [UndeadLog] wight immune;
//      magic damage lands (killed=1) and the drop face answers with hit=false
//   W3 shadow sun: night spawn alive -> day spawn dies to [UndeadLog] sunlight,
//      while ghoul/wight survive
//   W4 torch snuff: night shadow alone next to a torch, player > 4 blocks ->
//      [UndeadLog] shadow snuff
//   W5 ghoul slow: survival player adjacent -> [UndeadLog] ghoul slow ticks=50 amp=5
//   W6 undead gate: high y rejected, y<=48 / y<=32 rows, blood moon reopens
//   W7 assets + cfg: 3 textures, 3 lang keys per locale, mobUndeadSurfaceR196=true
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b59-' + RUN + '-v1';

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
  // Chunk 0,0 is not the spawn chunk of this world: teleport first so fill's
  // isBlockLoaded gate passes (r1 saw "Cannot place blocks outside of the world").
  await cmd('tp ' + A + ' 0.5 130 0.5', 2000);
  await cmd('fill 0 129 0 15 129 15 minecraft:stone', 900);
  await cmd('fill 0 130 0 15 133 15 minecraft:air', 500);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
}

const PROBE_RE = /\[UndeadLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) follow=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(\d+) undead=(true|false) at /;
const SPAWN_RE = /\[UndeadLog\] spawn kind=(\w+) hp=([\d.]+) follow=([\d.]+) attack=([\d.]+) xp=(\d+) undead=(true|false) entity=/;
const IMMUNE_RE = /\[UndeadLog\] wight immune aspect=(\w+) source=(\S+) entity=/;
const WIGHTKILL_RE = /\[UndeadLog\] wightkill player=(\S+) source=(\w+) found=(\d+) killed=(\d+)/;
const DROP_RE = /\[UndeadLog\] wight drop flesh=(true|false) nugget=(true|false) hit=(true|false) rare_roll=(-?\d+) looting=(\d+) entity=/;
const INFO_RE = /\[UndeadLog\] info kind=(\w+) alive=(true|false) hp=([\d.]+) max=([\d.]+) sun=(true|false) entity=/;
const INFO_TOTAL_RE = /\[UndeadLog\] info total ghoul=(\d+) wight=(\d+) shadow=(\d+) player=/;
const SNUFF_RE = /\[UndeadLog\] shadow snuff pos=BlockPos\{x=(-?\d+), y=(-?\d+), z=(-?\d+)\} kind=(\S+) entity=/;
const SLOW_RE = /\[UndeadLog\] ghoul slow target=(\S+) ticks=(\d+) amp=(\d+) lost=(true|false) entity=/;
const GATE_RE = /\[SpawnLog\] undeadgate cls=(\w+) allowed=(true|false) depth=(true|false) y=(-?\d+) blood=(true|false) freezing=(true|false) desert=(true|false) cfg=(true|false) at /;

async function gate(x, y, z, kind) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undeadgate ${x} ${y} ${z} ${kind}`, 400);
  const m = await waitRow(GATE_RE, from, 5000);
  const g = lastOf(m);
  return g ? { cls: g[1], allowed: g[2] === 'true', depth: g[3] === 'true', y: +g[4],
    blood: g[5] === 'true', freezing: g[6] === 'true', desert: g[7] === 'true' } : null;
}

async function info() {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undeadinfo`, 500);
  const rows = await waitRow(INFO_RE, from, 6000);
  const tot = await waitRow(INFO_TOTAL_RE, from, 2000);
  const t = lastOf(tot);
  return {
    rows: rows.map(r => ({ kind: r[1], alive: r[2] === 'true', hp: +r[3], sun: r[5] === 'true' })),
    total: t ? { ghoul: +t[1], wight: +t[2], shadow: +t[3] } : null,
  };
}

async function main() {
  const pinOk = stampPin();
  await startBoot(`b59-${RUN}-b1`);
  await join();
  const res = { run: RUN, pin: pinOk };

  // --- W1: attribute probe rows ---
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undead 4 130 0`, 900);
  const probes = (await waitRow(PROBE_RE, from, 6000)).map(r => ({
    kind: r[1], hp: +r[2], max: +r[3], follow: +r[4], attack: +r[5], speed: +r[6], xp: +r[7], undead: r[8] === 'true',
  }));
  const byKind = k => probes.find(p => p.kind === k);
  const g = byKind('ghoul'), w = byKind('wight'), s = byKind('shadow');
  const spawns = (await waitRow(SPAWN_RE, from, 4000)).map(r => r[1]);
  res.w1 = !!g && !!w && !!s
    && [g, w, s].every(p => p.max === 20 && p.follow === 40 && p.attack === 5 && p.xp === 10)
    && g.speed === 0.28 && w.speed === 0.25 && s.speed === 0.23
    && g.undead === false && w.undead === true && s.undead === true
    && spawns.includes('ghoul') && spawns.includes('wight') && spawns.includes('shadow');
  console.log('[W1]', JSON.stringify({ probes, spawns, pass: res.w1 }));

  // --- W2: wight immunity + magic kill + drop face ---
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest wightkill player`, 500);
  const wkPlayer = lastOf(await waitRow(WIGHTKILL_RE, from, 6000));
  const immune = lastOf(await waitRow(IMMUNE_RE, from, 2000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest wightkill magic`, 600);
  const wkMagic = lastOf(await waitRow(WIGHTKILL_RE, from, 6000));
  const drop = lastOf(await waitRow(DROP_RE, from, 4000));
  res.w2 = !!wkPlayer && +wkPlayer[3] >= 1 && +wkPlayer[4] === 0
    && !!immune && immune[1] === 'none'
    && !!wkMagic && +wkMagic[4] >= 1
    && !!drop && drop[3] === 'false';
  console.log('[W2]', JSON.stringify({
    playerKill: wkPlayer && { found: +wkPlayer[3], killed: +wkPlayer[4] },
    immune: immune && { aspect: immune[1], source: immune[2] },
    magicKill: wkMagic && { found: +wkMagic[3], killed: +wkMagic[4] },
    drop: drop && { flesh: drop[1], nugget: drop[2], hit: drop[3], roll: +drop[4] },
    pass: res.w2,
  }));

  // --- W3: shadow sunlight death survives the night, dies at day ---
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest undeadkill magic', 400);
  await cmd('time set 18000', 300);
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undead 4 130 0`, 900);
  await sleep(1500);
  const night = await info();
  await cmd('time set 6000', 400);
  await sleep(2500);
  const day = await info();
  res.w3 = !!night.total && night.total.shadow >= 1
    && !!day.total && day.total.shadow === 0 && day.total.ghoul >= 1 && day.total.wight >= 1;
  console.log('[W3]', JSON.stringify({ night, day, pass: res.w3 }));

  // --- W4: torch snuff (player > 4 blocks away, recentlyHit == 0) ---
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest undeadkill magic', 400);
  await cmd('time set 18000', 300);
  await cmd('tp ' + A + ' 0.5 130 0.5', 400);
  await cmd('fill 7 130 0 9 132 2 minecraft:air', 200);
  from = mark();
  await cmd('summon etim:shadow 8.5 130 0.5', 800);
  await cmd('setblock 8 130 1 minecraft:torch', 400);
  await sleep(4000);
  const snuff = lastOf(await waitRow(SNUFF_RE, from, 6000));
  res.w4 = !!snuff && snuff[1] === '8' && snuff[2] === '130' && snuff[3] === '1' && snuff[4].indexOf('torch') >= 0;
  console.log('[W4]', JSON.stringify({ snuff: snuff && { pos: snuff[1] + ',' + snuff[2] + ',' + snuff[3], kind: snuff[4] }, pass: res.w4 }));

  // --- W5: ghoul melee applies R196 slowness 50t amp5 ---
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest undeadkill magic', 400);
  await cmd('gamemode 0 ' + A, 400);
  await cmd('effect ' + A + ' minecraft:instant_health 1 19', 300);
  await cmd('fill 0 130 0 6 133 6 minecraft:air', 200);
  await cmd('summon etim:ghoul 1.5 130 0.5', 700);
  from = mark();
  let slow = null;
  {
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      const hit = slice(from).map(s => SLOW_RE.exec(s)).filter(Boolean);
      if (hit.length) { slow = hit[hit.length - 1]; break; }
      await cmd('effect ' + A + ' minecraft:instant_health 1 19', 150);
    }
  }
  await cmd('gamemode 1 ' + A, 300);
  await cmd('kill @e[type=!player]', 300);
  res.w5 = !!slow && slow[1] === A && +slow[2] === 50 && +slow[3] === 5 && slow[4] === 'true';
  console.log('[W5]', JSON.stringify({ slow: slow && { ticks: +slow[2], amp: +slow[3], lost: slow[4] }, pass: res.w5 }));

  // --- W6: spawn gate rows ---
  await cmd('etest moon none', 300);
  await cmd('time set 6000', 300);
  await cmd('etest totaltime 1000', 300);
  const highGhoul = await gate(0, 100, 0, 'ghoul');
  const highWight = await gate(0, 100, 0, 'wight');
  const highShadow = await gate(0, 100, 0, 'shadow');
  const midGhoul = await gate(0, 40, 0, 'ghoul');
  const midWight = await gate(0, 40, 0, 'wight');
  const midShadow = await gate(0, 40, 0, 'shadow');
  const lowShadow = await gate(0, 20, 0, 'shadow');
  await cmd('etest moon blood', 300);
  await cmd('time set 18000', 300);
  await cmd('etest totaltime 14000', 300);
  const bloodGhoul = await gate(0, 100, 0, 'ghoul');
  const bloodWight = await gate(0, 100, 0, 'wight');
  const bloodShadow = await gate(0, 100, 0, 'shadow');
  await cmd('etest moon none', 300);
  res.w6 = !!highGhoul && !highGhoul.allowed && highGhoul.depth
    && !!highWight && !highWight.allowed
    && !!highShadow && !highShadow.allowed
    && !!midGhoul && midGhoul.allowed
    && !!midWight && midWight.allowed
    && !!midShadow && !midShadow.allowed
    && !!lowShadow && lowShadow.allowed
    && !!bloodGhoul && bloodGhoul.allowed && bloodGhoul.blood
    && !!bloodWight && !bloodWight.allowed && bloodWight.blood && !bloodWight.freezing
    && !!bloodShadow && !bloodShadow.allowed && bloodShadow.blood && !bloodShadow.desert;
  console.log('[W6]', JSON.stringify({ highGhoul, highWight, highShadow, midGhoul, midWight, midShadow,
    lowShadow, bloodGhoul, bloodWight, bloodShadow, pass: res.w6 }));

  // --- W7: assets + config on disk ---
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const tex = ['ghoul', 'wight', 'shadow'].every(n =>
    fs.existsSync(path.join(resRoot, 'textures', 'entity', n + '.png')));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = ['ghoul', 'wight', 'shadow'].every(n =>
    en.includes(`entity.etim.${n}.name=`) && zh.includes(`entity.etim.${n}.name=`));
  const cfgDisk = fs.readFileSync(L.CFG, 'utf8');
  const cfgKey = /B:mobUndeadSurfaceR196=true/.test(cfgDisk);
  res.w7 = tex && langs && cfgKey;
  console.log('[W7]', JSON.stringify({ tex, langs, cfgKey, pass: res.w7 }));

  await cmd('gamemode 1 ' + A, 200);
  await cmd('kill @e[type=!player]', 200);
  res.stops = stops.length;
  res.crashes = L.crashCount();
  await stopBoot();

  const keys = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];
  res.pass = !!res.pin && keys.every(k => res[k]) && res.crashes === 0;
  const bad = keys.filter(k => !res[k]).concat(res.pin ? [] : ['pin']);
  console.log('[done]', JSON.stringify({ ...res, bad: bad.length, badKeys: bad }));
  process.exit(bad.length ? 1 : 0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.message ? e.message : e);
  try { if (srv) await stopBoot(); } catch (x) { /* noop */ }
  process.exit(2);
});
