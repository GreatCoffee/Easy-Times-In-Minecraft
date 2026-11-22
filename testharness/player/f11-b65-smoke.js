// B-65 smoke: R196 food / vessel / coin faces (census F :149-:165).
// Verdict channel = server log ([FoodR196Log]).
//   W1 bowl family: 15 contents registered, R196 sat/nut rows, water/milk edges
//   W2 coin family: onCreated drains XP at the R196 value (copper 5 / gold 100)
//   W3 enchanted apple: weak villager-zombie cure starts (1 tick for meta 1)
//   W4 fire cooks raw food: dropped beef destroyed by fire becomes cooked beef
//   W5 vessel quenching: bowl of water hits a fire elemental for the bowl dose
//   W6 static: cfg key, registrations, mixin registration, assets/lang present
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b65-' + RUN + '-v1';

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
    await sleep(400);
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
  bootCfg = bootCfg.replace(/B:foodR196Extra=(true|false)/, 'B:foodR196Extra=true');
  bootCfg = bootCfg.replace(/B:foodModel=(true|false)/, 'B:foodModel=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'foodR196Extra=' + (/B:foodR196Extra=(true|false)/.exec(disk) || [])[1]);
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
  for (const g of ['doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
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

const BOWL_RE = /\[FoodR196Log\] bowlgive contents=(\S+) item=(\S+) sat=(\d+) nut=(\d+)/;
const COIN_RE = /\[FoodR196Log\] coin metal=(\S+) count=(\d+) xp_before=(-?\d+) xp_after=(-?\d+)/;
const APPLE_RE = /\[FoodR196Log\] applegold meta=(\d+) cured=(\S+) converting=(\S+)/;
const APPLE_CURE_RE = /\[FoodR196Log\] applegold cure meta=(\d+) ticks=(\d+)/;
const COOK_RE = /\[FoodR196Log\] firecook before=(\S+) after=(\S+) count=(\d+) alive=(\S+)/;
const DOUSE_RE = /\[FoodR196Log\] vesseldouse hit=(\S+) fire_hp=([\d.]+) held=(\S+)/;

const BOWLS = ['MUSHROOM_STEW', 'MILK', 'WATER', 'BEEF_STEW', 'CHICKEN_SOUP', 'VEGETABLE_SOUP',
  'ICE_CREAM', 'SALAD', 'CREAM_OF_MUSHROOM_SOUP', 'CREAM_OF_VEGETABLE_SOUP', 'PUMPKIN_SOUP',
  'MASHED_POTATO', 'SORBET', 'PORRIDGE', 'CEREAL'];

async function main() {
  const pinOk = stampPin();
  await startBoot(`b65-${RUN}-b1`);
  await join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 bowl family (15 contents) ----
  let from = mark();
  for (const c of BOWLS) await cmd(`execute ${A} ~ ~ ~ etest bowl ${c.toLowerCase()}`, 220);
  const bowlRows = await waitRow(BOWL_RE, from, 12000);
  const byContent = new Map(bowlRows.map(r => [r[1], r]));
  const beef = byContent.get('BEEF_STEW');
  const milk = byContent.get('MILK');
  const water = byContent.get('WATER');
  res.w1 = bowlRows.length >= 15
    && !!beef && +beef[3] === 16 && +beef[4] === 16
    && !!milk && +milk[3] === 0 && +milk[4] === 1
    && !!water && +water[3] === 0 && +water[4] === 0;
  console.log('[W1]', JSON.stringify({
    rows: bowlRows.length, beef: beef && [beef[2], +beef[3], +beef[4]],
    milk: milk && [milk[2], +milk[3], +milk[4]], water: water && [water[2], +water[3], +water[4]],
    pass: res.w1,
  }));

  // ---- W2 coin XP (copper 3 = -15, gold 1 = -100) ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest coin copper 3`, 500);
  const copper = lastOf(await waitRow(COIN_RE, from, 6000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest coin gold 1`, 500);
  const gold = lastOf(await waitRow(COIN_RE, from, 6000));
  const okCopper = !!copper && +copper[3] - +copper[4] === 15;
  const okGold = !!gold && +gold[3] - +gold[4] === 100;
  res.w2 = okCopper && okGold;
  console.log('[W2]', JSON.stringify({
    copper: copper && { before: +copper[3], after: +copper[4] },
    gold: gold && { before: +gold[3], after: +gold[4] }, pass: res.w2,
  }));

  // ---- W3 enchanted apple cure ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest applegold 1`, 900);
  const apple = lastOf(await waitRow(APPLE_RE, from, 8000));
  const cure = lastOf(await waitRow(APPLE_CURE_RE, from, 8000));
  res.w3 = !!apple && apple[1] === '1' && apple[2] === 'true' && apple[3] === 'true'
    && !!cure && cure[1] === '1' && +cure[2] === 1;
  console.log('[W3]', JSON.stringify({
    row: apple && { meta: apple[1], cured: apple[2], converting: apple[3] },
    cure: cure && { meta: cure[1], ticks: +cure[2] }, pass: res.w3,
  }));

  // ---- W4 fire cooks raw food ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest firecook`, 900);
  const cook = lastOf(await waitRow(COOK_RE, from, 8000));
  const cookRow = lastOf(await waitRow(/\[FoodR196Log\] firecook raw=(\S+) cooked=(\S+)/, from, 8000));
  res.w4 = !!cook && /beef/.test(cook[1]) && /cooked_beef/.test(cook[2])
    && +cook[3] === 3 && cook[4] === 'true' && !!cookRow;
  console.log('[W4]', JSON.stringify({
    before: cook && cook[1], after: cook && cook[2], count: cook && +cook[3],
    alive: cook && cook[4], hook: !!cookRow, pass: res.w4,
  }));

  // ---- W5 vessel quenching ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest vesseldouse`, 1200);
  const douse = lastOf(await waitRow(DOUSE_RE, from, 8000));
  res.w5 = !!douse && douse[1] === 'true' && +douse[2] < 20 && /bowl/.test(douse[3]);
  console.log('[W5]', JSON.stringify({
    hit: douse && douse[1], fireHp: douse && +douse[2], held: douse && douse[3], pass: res.w5,
  }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean foodR196Extra = true;/.test(cfg)
    && /getBoolean\("foodR196Extra"/.test(cfg);
  const mainSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const wireOk = /ETIMFoodItems\.register\(\)/.test(mainSrc)
    && /ETIMVesselEvents\.class/.test(mainSrc) && /ETIMAppleGoldEvents\.class/.test(mainSrc);
  const json = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8');
  const mixOk = /"MixinItemAppleGold"/.test(json) && /"MixinEntityZombieVillager"/.test(json);
  const tex = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim', 'textures', 'items');
  const texOk = BOWLS.every(c => fs.existsSync(path.join(tex, 'bowl_' + c.toLowerCase() + '.png')))
    && ['copper', 'silver', 'gold', 'ancient_metal', 'mithril', 'adamantium']
      .every(m => fs.existsSync(path.join(tex, 'coin_' + m + '.png')));
  const en = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim', 'lang', 'en_us.lang'), 'utf8');
  const langOk = /item\.etim\.bowl_beef_stew\.name=/.test(en) && /item\.etim\.coin_gold\.name=/.test(en);
  res.w6 = cfgOk && wireOk && mixOk && texOk && langOk;
  console.log('[W6]', JSON.stringify({ cfgOk, wireOk, mixOk, texOk, langOk, pass: res.w6 }));

  await stopBoot();
  const bad = Object.keys(res).filter(k => !res[k]);
  const out = {
    run: RUN, pin: pinOk, w1: res.w1, w2: res.w2, w3: res.w3, w4: res.w4, w5: res.w5, w6: res.w6,
    stops: stops.map(s => (s && s.exitCode === 0) ? 0 : 1).reduce((a, b) => a + b, 0),
    crashes: L.crashCount(), pass: pinOk && bad.length === 0, bad: bad.length, badKeys: bad,
  };
  console.log('[done] ' + JSON.stringify(out));
  process.exit(out.pass && out.stops === 0 ? 0 : 2);
}

main().catch(async (e) => {
  console.error('[fatal]', (e && e.stack) || e);
  try { await stopBoot(); } catch (x) { /* noop */ }
  process.exit(1);
});
