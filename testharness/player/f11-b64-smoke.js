// B-64 smoke: R196 Item.java base faces (census F :142/:143/:149/:150).
// Verdict channel = server log ([ItemLog]).
//   W1 stack table: /etest itemstack -> stick 32, flint/reeds/quartz 16, paper 64,
//      cake 8, cauldron 4, pie 8, book 1, bucket 1, dirt 16, sword 1, ETIM pins 16
//   W2 melt math: /etest melt <count> <ticks> <temp> -> snowball + ice lose items
//   W3 melt wiring: MixinEntityItem drop arm + PlayerTickEvent inventory arm + cfg
//   W4 vine placement: /etest vineplace north -> vineplace row + placed stone
//   W5 config/wiring: three cfg keys, ETIMItemStacks.apply() wired after init
//   W6 source parity: default-16 ctor injection, R196 table, snow/ice classification
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || L.PIN.releaseSha;
const WORLD = 'w-b64-' + RUN + '-v1';

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
  bootCfg = bootCfg.replace(/B:itemsStack16R196=(true|false)/, 'B:itemsStack16R196=true');
  bootCfg = bootCfg.replace(/B:itemsMeltR196=(true|false)/, 'B:itemsMeltR196=true');
  bootCfg = bootCfg.replace(/B:itemsVinePlaceR196=(true|false)/, 'B:itemsVinePlaceR196=true');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await sleep(5000);
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    fs.writeFileSync(L.CFG, bootCfg, 'utf8');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 180000)) {
      const disk = fs.readFileSync(L.CFG, 'utf8');
      console.log('[cfg]', tag,
        'mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(disk) || [])[1],
        'itemsStack16R196=' + (/B:itemsStack16R196=(true|false)/.exec(disk) || [])[1],
        'itemsMeltR196=' + (/B:itemsMeltR196=(true|false)/.exec(disk) || [])[1],
        'itemsVinePlaceR196=' + (/B:itemsVinePlaceR196=(true|false)/.exec(disk) || [])[1]);
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

const STACK_RE = /\[ItemLog\] stack stick=(\d+) flint=(\d+) reeds=(\d+) paper=(\d+) quartz=(\d+) cake=(\d+) cauldron=(\d+) pie=(\d+) book=(\d+) bucket=(\d+) dirt=(\d+) sword=(\d+) etim16=(\d+)/;
const MELT_RE = /\[ItemLog\] meltdev kind=(\w+) count=(\d+) ticks=(\d+) temp=([\d.]+)(?: chance=([\d.]+))? lost=(\d+) left=(\d+)/;
const VINE_RE = /\[ItemLog\] vineplace face=(\w+) block=(\S+) at (-?\d+), (-?\d+), (-?\d+)/;
const VINECMD_RE = /\[ItemLog\] vineplacecmd face=(\w+) placed=(\S+) at (-?\d+), (-?\d+), (-?\d+)/;

async function main() {
  const pinOk = stampPin();
  await startBoot(`b64-${RUN}-b1`);
  await join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 stack table ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest itemstack`, 700);
  const st = lastOf(await waitRow(STACK_RE, from, 6000));
  const want = [32, 16, 16, 64, 16, 8, 4, 8, 1, 1, 16, 1];
  res.w1 = !!st && want.every((v, i) => +st[i + 1] === v) && +st[13] >= 1;
  console.log('[W1]', JSON.stringify({
    row: st ? st.slice(1, 14).map(Number) : null, want, etim16: st ? +st[13] : null, pass: res.w1,
  }));

  // ---- W2 melt math (snowball + ice, 200 items x 200 ticks at 20.0) ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest melt 200 200 20`, 2500);
  const melts = await waitRow(MELT_RE, from, 8000);
  const snow = lastOf(melts.filter(r => r[1] === 'snowball'));
  const ice = lastOf(melts.filter(r => r[1] === 'ice'));
  const okSnow = !!snow && +snow[6] > 0 && +snow[7] === 200 - +snow[6];
  const okIce = !!ice && +ice[6] > 0 && +ice[7] === 200 - +ice[6];
  res.w2 = okSnow && okIce && Math.abs(+snow[5] - 0.0019) < 1e-9;
  console.log('[W2]', JSON.stringify({
    snow: snow && { chance: +snow[5], lost: +snow[6], left: +snow[7] },
    ice: ice && { lost: +ice[6], left: +ice[7] }, pass: res.w2,
  }));

  // ---- W3 melt wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const itemSrc = fs.readFileSync(path.join(root, 'mixins', 'MixinEntityItem.java'), 'utf8');
  const meltSrc = fs.readFileSync(path.join(root, 'item', 'ETIMItemMelt.java'), 'utf8');
  const dropHook = /etim\$meltTick/.test(itemSrc) && /ETIMItemMelt\.tickDropped/.test(itemSrc);
  const invHook = /@SubscribeEvent/.test(meltSrc) && /PlayerTickEvent/.test(meltSrc)
    && /meltSlots/.test(meltSrc);
  const tempRule = /isBurning\(\) \? 20\.0F/.test(meltSrc);
  res.w3 = dropHook && invHook && tempRule;
  console.log('[W3]', JSON.stringify({ dropHook, invHook, tempRule, pass: res.w3 }));

  // ---- W4 vine placement ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest vineplace north`, 900);
  const vine = lastOf(await waitRow(VINE_RE, from, 6000));
  const vineCmd = lastOf(await waitRow(VINECMD_RE, from, 6000));
  res.w4 = !!vine && vine[1] === 'north' && /stone/.test(vine[2])
    && !!vineCmd && vineCmd[2] === 'minecraft:stone';
  console.log('[W4]', JSON.stringify({
    vineplace: vine && { face: vine[1], block: vine[2], at: `${vine[3]},${vine[4]},${vine[5]}` },
    cmd: vineCmd && { face: vineCmd[1], placed: vineCmd[2] }, pass: res.w4,
  }));

  // ---- W5 cfg + wiring ----
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean itemsStack16R196 = true;/.test(cfg)
    && /public static boolean itemsMeltR196 = true;/.test(cfg)
    && /public static boolean itemsVinePlaceR196 = true;/.test(cfg)
    && /getBoolean\("itemsStack16R196"/.test(cfg)
    && /getBoolean\("itemsMeltR196"/.test(cfg)
    && /getBoolean\("itemsVinePlaceR196"/.test(cfg);
  const mainSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const wireOk = /ETIMItemMelt\.class/.test(mainSrc) && /ETIMVinePlace\.class/.test(mainSrc)
    && /ETIMItemStacks\.apply\(\)/.test(mainSrc);
  res.w5 = cfgOk && wireOk;
  console.log('[W5]', JSON.stringify({ cfgOk, wireOk, pass: res.w5 }));

  // ---- W6 source parity ----
  const mixItem = fs.readFileSync(path.join(root, 'mixins', 'MixinItem.java'), 'utf8');
  const default16 = /method = "<init>"/.test(mixItem) && /setMaxStackSize\(16\)/.test(mixItem);
  const stacksSrc = fs.readFileSync(path.join(root, 'item', 'ETIMItemStacks.java'), 'utf8');
  const tableOk = /set\(Items\.STICK, 32\)/.test(stacksSrc) && /set\(Items\.PAPER, 64\)/.test(stacksSrc)
    && /set\(Items\.QUARTZ, 16\)/.test(stacksSrc) && /set\(Items\.CAULDRON, 4\)/.test(stacksSrc);
  const sortOk = /Items\.SNOWBALL/.test(meltSrc) && /Blocks\.PACKED_ICE/.test(meltSrc)
    && /Blocks\.FROSTED_ICE/.test(meltSrc);
  res.w6 = default16 && tableOk && sortOk;
  console.log('[W6]', JSON.stringify({ default16, tableOk, sortOk, pass: res.w6 }));

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
