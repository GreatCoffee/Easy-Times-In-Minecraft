#!/usr/bin/env node
/**
 * f9-gr-verify.js - W-B9 judged window (growth-rate family, HEAD d040dee).
 *
 * Contract (task book 2026-11-05, B-9 growth-rate):
 *   R0  boot face (Done, mixinFail 0, four new cfg defaults, 244 registered keys)
 *   R1  light lower bound: roofed wet plot -> growth gate light rows (blv<15, 15..15)
 *   R2  light restore: roof off -> gate rows stop, growth rate rows continue
 *   R3  composition chain: single wet plot, base=10.000, full numeric chain
 *   R4  proximity trio: isolated 0.500 / pair 0.750 / row-of-three 1.000
 *   R5  stem windows: pumpkin 0.6..1.0, melon 1.0..1.4, prox=none; swamp melon hum=1.200
 *   R6  desert shaft (y=63/64, temp=2.00): pumpkin rate-zero mod=0.00,
 *       melon tempMod=0.400, wheat tempMod=0.200
 *   R7  fertilize arm: fertilize row + growth rate fert=1.500 in the chain
 *   R8  master switch: off -> zero composition/gate rows on wet plot (dry gate alive),
 *       on -> composition rows resume
 *   R9  zero regression: dry gate rows, drought roll, 27 /etest tokens, channels
 *   R10 closure: 244 registered keys (file 246), farmDebugLog=false, rts=3, light 15/15, global 0.25
 *
 * Boots: b1 = R0/R1/R2/R3/R4/R5-plains/R7/R9/R10 (main)
 *        b2 = R8 off (growthRateR196=false)
 *        b3 = R8 on (restore)
 *        b4 = R6 desert + R5 swamp (far teleports, same seed world)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f9-gr-verify';
const WORLD = 'f9gr';
// the dev world's real seed (run/world/level.dat RandomSeed): the far staging
// columns below were scanned out of run/world's region files, so the fresh
// window world must regenerate the same biome map.
const SEED = '-2991855477586212903';
const A = 'ETIM_F7';
const FY = 99, CY = 100;
const WX = [160, 166, 172, 178, 186, 194, 200, 206];
const WZ = [782, 787, 792, 797, 803, 808];
// far staging columns (dev-world seed; verified by region scan of run/world).
// Crop sits at y=60 / farmland at y=59: getTemperature(pos) only cools above
// y=64, and at y<64 the noise term stays non-positive -> desert temp >= 2.00.
const DES = { x: -15, z: 282 };
const SWP = [{ x: 311, z: 220 }, { x: 315, z: 217 }];

const sleep = L.sleep;
const log = L.log;
let srv = null, bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], stops: [], arms: {} };
const since = (n) => srv.all.slice(n).map(L.strip);
const get = (l, k) => { const m = new RegExp('(?:^| )' + k + '=(\\S+)').exec(l); return m ? m[1] : null; };

function countCodeKeys() {
  const s = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const re = /config\.get(?:Boolean|Int|Float|String)\s*\(\s*"([A-Za-z0-9_]+)"/g;
  const set = new Set(); let m;
  while ((m = re.exec(s))) set.add(m[1]);
  return set.size;
}

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 350 : wait); }
async function rts(v) { srv.send('gamerule randomTickSpeed ' + v); await sleep(350); }
async function roll(x, y, z, p) {
  const f = srv.all.length;
  srv.send(`etest drought roll ${x} ${y} ${z} ${p === undefined ? '1.0' : p}`);
  await sleep(900);
  return since(f).filter((l) => /\[FarmLog\] drought/.test(l));
}
async function chat(cmdline, wait) {
  try { bot.chat('/' + cmdline); } catch (e) { log('chat', 'send failed ' + cmdline + ': ' + ((e && e.message) || e)); }
  await sleep(wait === undefined ? 700 : wait);
}

async function arena() {
  srv.send('fill 157 98 777 209 98 813 minecraft:stone 0');
  await sleep(1400);
  srv.send('fill 157 99 777 209 99 813 minecraft:farmland 7');
  await sleep(1400);
  srv.send('fill 157 100 777 209 110 813 minecraft:air 0');
  await sleep(1000);
  for (const x of WX) for (const z of WZ) srv.send(`setblock ${x} 99 ${z} minecraft:water 0 replace`);
  await sleep(1000);
  // R1/R2 roof patch: 3x3 wet wheat (all nine cells carry base=10)
  for (let x = 179; x <= 181; x++) for (let z = 794; z <= 796; z++) srv.send(`setblock ${x} ${CY} ${z} minecraft:wheat 2 replace`);
  for (const [x, z] of [[184, 800], [190, 800], [191, 800], [196, 800], [197, 800], [198, 800]]) {
    srv.send(`setblock ${x} ${CY} ${z} minecraft:wheat 2 replace`);
  }
  srv.send('setblock 186 100 806 minecraft:pumpkin_stem 2 replace');
  srv.send('setblock 192 100 806 minecraft:melon_stem 2 replace');
  await sleep(1000);
}
async function dryStrip() {
  srv.send('fill 147 98 797 151 98 803 minecraft:stone 0');
  await sleep(700);
  srv.send('fill 147 99 797 151 99 803 minecraft:farmland 0');
  await sleep(700);
  srv.send('fill 147 100 797 151 100 803 minecraft:wheat 2');
  await sleep(700);
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'growthRateR196', o.master ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'growthLightMin', '15');
  L.setCfgValue(L.CFG, 'growthLightMax', '15');
  L.setCfgValue(L.CFG, 'globalGrowthRateFactor', '0.25');
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n });
  if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b' + n);
  const b = {
    n,
    boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
  };
  ev.boots.push(b);
  log('boot' + n, b.boot + ' mixin=' + b.mixinFail);
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  await L.stage(srv, bot, { gamemode: 1, rts: 0, noPhysics: true, time: 6000 });
  await L.tp(srv, 184.5, 101, 795.5, { bot: A, wait: 1800 });
  return b;
}
async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const counts = L.rowCounts(srv.all.map(L.strip));
  const st = await srv.stop();
  const build = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  const rec = { n, exitCode: st.exitCode, exited: st.exited, build, counts };
  ev.stops.push(rec);
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + build);
  srv = null;
  return rec;
}

function parseRate(rows) {
  return rows.map((l) => ({
    raw: l, block: get(l, 'block'), family: get(l, 'family'), pos: get(l, 'pos'),
    base: get(l, 'base'), fert: get(l, 'fert'), temp: get(l, 'temp'), window: get(l, 'window'),
    tempMod: get(l, 'tempMod'), hum: get(l, 'hum'), prox: get(l, 'prox'),
    global: get(l, 'global'), rate: get(l, 'rate'),
  }));
}
function chain(r) {
  const base = Number(r.base), fert = r.fert === 'none' ? 1 : Number(r.fert);
  const tm = Number(r.tempMod), hum = Number(r.hum), g = Number(r.global);
  const px = r.prox === 'none' ? 1 : Number(r.prox);
  const calc = base * fert * tm * hum * g * px;
  return { calc, ok: Math.abs(calc - Number(r.rate)) <= 0.0025 };
}
function tempChain(r) {
  const t = Number(r.temp), lo = Number(r.window.split('..')[0]), hi = Number(r.window.split('..')[1]);
  const delta = t < lo ? lo - t : (t > hi ? t - hi : 0);
  const m = Math.max(1 - delta / 1.0, 0);
  return { calc: m, ok: Math.abs(m - Number(r.tempMod)) <= 0.006 }; // temp prints at 2dp
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(L.PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const kb = L.cfgKeys(L.CFG);
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: L.sha256(cfgBefore),
    fileKeys: Object.keys(kb).length, codeKeys: countCodeKeys(),
    values: { growthRateR196: kb.growthRateR196, growthLightMin: kb.growthLightMin, growthLightMax: kb.growthLightMax, globalGrowthRateFactor: kb.globalGrowthRateFactor, farmDebugLog: kb.farmDebugLog },
  };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',')
    + ' mk=' + ev.mk.ok + ' cfgCode=' + ev.cfgBefore.codeKeys + ' cfgFile=' + ev.cfgBefore.fileKeys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'level-seed', SEED), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ======================= boot 1 ======================= */
  await startBoot(1, { master: true });
  try {
    ev.arms.R0 = { cfg: { growthRateR196: L.cfgKeys(L.CFG).growthRateR196, growthLightMin: L.cfgKeys(L.CFG).growthLightMin, growthLightMax: L.cfgKeys(L.CFG).growthLightMax, globalGrowthRateFactor: L.cfgKeys(L.CFG).globalGrowthRateFactor } };
    await arena();

    /* ---------------- R1 light lower bound ---------------- */
    srv.send(`setblock 180 ${CY} 795 minecraft:wheat 2 replace`);
    srv.send('fill 177 102 792 183 102 798 minecraft:stone 0');
    await sleep(1200);
    await rts(60);
    let f = srv.all.length;
    await sleep(10000);
    const r1rows = since(f).filter((l) => /\[FarmLog\] growth gate light/.test(l) && /pos=17[89],100,79[456]|pos=18[01],100,79[456]/.test(l));
    ev.arms.R1 = {
      rows: r1rows.length,
      blv: [...new Set(r1rows.map((l) => get(l, 'blv')))].sort(),
      window: [...new Set(r1rows.map((l) => get(l, 'window')))].sort(),
      posSeen: [...new Set(r1rows.map((l) => get(l, 'pos')))].sort(),
      sample: r1rows.slice(0, 2),
      block: await L.testBlock(srv, 180, CY, 795, 'minecraft:wheat', 2),
    };
    log('R1', JSON.stringify({ rows: r1rows.length, blv: ev.arms.R1.blv, window: ev.arms.R1.window, pos: ev.arms.R1.posSeen.length, block: ev.arms.R1.block.ok }));
    await rts(0);

    /* ---------------- R2 light restore ---------------- */
    srv.send('fill 177 102 792 183 102 798 minecraft:air 0');
    await sleep(1000);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const r2 = since(f);
    const r2gate = r2.filter((l) => /\[FarmLog\] growth gate light/.test(l) && /pos=17[89],100,79[456]|pos=18[01],100,79[456]/.test(l));
    const r2rate = r2.filter((l) => /\[FarmLog\] growth rate/.test(l) && /pos=17[89],100,79[456]|pos=18[01],100,79[456]/.test(l));
    ev.arms.R2 = { gateRows: r2gate.length, rateRows: r2rate.length, rateSample: parseRate(r2rate.slice(0, 2)), block: await L.testBlock(srv, 180, CY, 795, 'minecraft:wheat') };
    log('R2', JSON.stringify({ gate: r2gate.length, rate: r2rate.length, block: ev.arms.R2.block.ok, sample: ev.arms.R2.rateSample[0] }));
    await rts(0);

    /* ---------------- R3/R4/R5-plains composition ---------------- */
    for (const [x, z] of [[184, 800], [190, 800], [191, 800], [196, 800], [197, 800], [198, 800]]) {
      srv.send(`setblock ${x} ${CY} ${z} minecraft:wheat 2 replace`);
    }
    srv.send('setblock 186 100 806 minecraft:pumpkin_stem 2 replace');
    srv.send('setblock 192 100 806 minecraft:melon_stem 2 replace');
    await sleep(900);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const rows34 = since(f).filter((l) => /\[FarmLog\] growth rate/.test(l));
    const p34 = parseRate(rows34);
    const at = (p) => p34.filter((r) => r.pos === p);
    const one = (p) => at(p)[0];
    ev.arms.R3 = { rows: at('184,100,800').length, sample: one('184,100,800'), chain: one('184,100,800') ? chain(one('184,100,800')) : null, tempChain: one('184,100,800') ? tempChain(one('184,100,800')) : null };
    ev.arms.R4 = {
      single: { pos: '184,100,800', rows: at('184,100,800').length, prox: [...new Set(at('184,100,800').map((r) => r.prox))] },
      pairA: { pos: '190,100,800', rows: at('190,100,800').length, prox: [...new Set(at('190,100,800').map((r) => r.prox))] },
      pairB: { pos: '191,100,800', rows: at('191,100,800').length, prox: [...new Set(at('191,100,800').map((r) => r.prox))] },
      rowA: { pos: '196,100,800', prox: [...new Set(at('196,100,800').map((r) => r.prox))] },
      rowB: { pos: '197,100,800', prox: [...new Set(at('197,100,800').map((r) => r.prox))] },
      rowC: { pos: '198,100,800', prox: [...new Set(at('198,100,800').map((r) => r.prox))] },
      chainAllOk: p34.filter((r) => r.block === 'minecraft:wheat').every((r) => chain(r).ok && tempChain(r).ok),
    };
    ev.arms.R5 = {
      pumpkin: { rows: at('186,100,806').length, family: [...new Set(at('186,100,806').map((r) => r.family))], window: [...new Set(at('186,100,806').map((r) => r.window))], prox: [...new Set(at('186,100,806').map((r) => r.prox))], hum: [...new Set(at('186,100,806').map((r) => r.hum))] },
      melon: { rows: at('192,100,806').length, family: [...new Set(at('192,100,806').map((r) => r.family))], window: [...new Set(at('192,100,806').map((r) => r.window))], prox: [...new Set(at('192,100,806').map((r) => r.prox))], hum: [...new Set(at('192,100,806').map((r) => r.hum))] },
      chainOk: p34.every((r) => chain(r).ok && tempChain(r).ok),
      sample: one('186,100,806') || one('192,100,806'),
    };
    log('R3', JSON.stringify({ rows: ev.arms.R3.rows, base: ev.arms.R3.sample && ev.arms.R3.sample.base, chain: ev.arms.R3.chain, temp: ev.arms.R3.tempChain, sample: ev.arms.R3.sample }));
    log('R4', JSON.stringify({ single: ev.arms.R4.single.prox, pair: [ev.arms.R4.pairA.prox, ev.arms.R4.pairB.prox], row: [ev.arms.R4.rowA.prox, ev.arms.R4.rowB.prox, ev.arms.R4.rowC.prox], chainAll: ev.arms.R4.chainAllOk }));
    log('R5-plains', JSON.stringify({ pumpkin: ev.arms.R5.pumpkin, melon: ev.arms.R5.melon }));
    await rts(0);

    /* ---------------- R7 fertilize arm (two plots; sampling guard) ---------------- */
    for (const x of [176, 177]) srv.send(`setblock ${x} ${CY} 800 minecraft:air 0 replace`);
    await cmd('gamemode 0 ' + A, 600);
    await cmd(`clear ${A}`, 500);
    await cmd(`give ${A} etim:manure 2`, 800);
    try { bot.setQuickBarSlot(0); } catch (e) { log('quickbar', (e && e.message) || e); }
    await L.tp(srv, 176.5, CY, 801.5, { bot: A, wait: 700 });
    let fertRows = [];
    for (const x of [176, 177]) {
      await L.lookAtTop(bot, x, FY, 800);
      const ff = srv.all.length;
      srv.send(`etest useblock ${x} ${FY} 800 ${A}`);
      await sleep(1600);
      fertRows = fertRows.concat(since(ff).filter((l) => /\[FarmLog\] fertilize|fertilized set/.test(l)));
    }
    await cmd('gamemode 1 ' + A, 500);
    for (const x of [176, 177]) srv.send(`setblock ${x} ${CY} 800 minecraft:wheat 2 replace`);
    await sleep(700);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const fr = parseRate(since(f).filter((l) => /\[FarmLog\] growth rate/.test(l) && ['176,100,800', '177,100,800'].includes(get(l, 'pos'))));
    ev.arms.R7 = {
      fertilizeRows: fertRows, rows: fr.length, sample: fr.slice(0, 2),
      fertValues: [...new Set(fr.map((r) => r.fert))],
      proxValues: [...new Set(fr.map((r) => r.pos + '=' + r.prox))],
      chainAllOk: fr.every((r) => chain(r).ok && tempChain(r).ok),
    };
    log('R7', JSON.stringify({ fertRows: fertRows.length, rows: fr.length, fert: ev.arms.R7.fertValues, chain: ev.arms.R7.chainAllOk, sample: fr[0] }));
    await rts(0);

    /* ---------------- R9 zero regression ---------------- */
    ev.arms.R9 = {};
    await dryStrip();
    await rts(60);
    f = srv.all.length;
    await sleep(10000);
    const rr9 = since(f);
    const dryGate = rr9.filter((l) => /\[FarmLog\] growth gate dry/.test(l));
    const dryGateWet = dryGate.filter((l) => {
      const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(l); if (!m) return false;
      const x = Number(m[1]), z = Number(m[3]);
      return x >= 157 && x <= 209 && z >= 777 && z <= 813;
    });
    ev.arms.R9.dryGate = { rows: dryGate.length, atStrip: dryGate.filter((l) => { const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(l); return m && Number(m[1]) >= 147 && Number(m[1]) <= 151 && Number(m[3]) >= 797 && Number(m[3]) <= 803; }).length, wetArena: dryGateWet.length, sample: dryGate[0] || null };
    await rts(0);
    await cmd('setblock 149 100 800 minecraft:wheat 3 replace', 500);
    const rollRows = await roll(149, 100, 800, '1.0');
    ev.arms.R9.roll = { rows: rollRows, parsed: rollRows.map((l) => ({ event: /drought event kind=(\w+)/.exec(l) ? /drought event kind=(\w+)/.exec(l)[1] : null, dead: /dead=(\S+)/.exec(l) ? /dead=(\S+)/.exec(l)[1] : null, age: /age=(-?\d+)/.exec(l) ? /age=(-?\d+)/.exec(l)[1] : null })) };
    log('R9-dry', JSON.stringify({ dryGate: ev.arms.R9.dryGate, roll: ev.arms.R9.roll.parsed }));

    // token smoke (27 = 25 top-level + bare + drought probe; drought roll is R9-2 above)
    await cmd('setblock 154 100 808 minecraft:stone 0 replace', 500);
    await cmd('summon minecraft:cow 154.5 100 810.5 {NoAI:1b,Silent:1b,PersistenceRequired:1b}', 700);
    await cmd(`give ${A} minecraft:iron_sword 1`, 600);
    await L.tp(srv, 155.5, CY, 808.5, { bot: A, wait: 900 });
    const tokens = [
      'etest hold minecraft:iron_sword', 'etest food 20 20', 'etest hunger 20 20',
      'etest health 20', 'etest level 5', 'etest debt 3',
      'etest enchant mainhand 3', 'etest enchantprobe mainhand',
      'etest blockprobe', 'etest hurt 2', 'etest attack @e[type=cow,limit=1]',
      'etest dig 154 100 808', 'etest useblock 154 100 808',
      'etest useitem', 'etest damage 1', 'etest quality fine', 'etest anvilwear 154 100 808',
      'etest release', 'etest hold etim:manure',
      'etest fishgate 6000', 'etest fishretract', 'etest fishprobe type 10',
      'etest arrowprobe recovery iron 1 10', 'etest livemano 8', 'etest chestio peek',
      'etest', 'etest drought probe 184 100 800',
    ];
    ev.arms.R9.tokens = [];
    for (const t of tokens) {
      const ff = srv.all.length;
      await chat(t, 720);
      ev.arms.R9.tokens.push({ cmd: t, lines: since(ff).filter((l) => /\[EtimTest\]|\[TestLog\]|Exception|Error|FAILED|Unknown command/.test(l)).slice(0, 4) });
    }
    ev.arms.R9.tokenCount = tokens.length;
    ev.arms.R9.tokenErrors = srv.all.map(L.strip).filter((l) => /\[TestLog\] step=\S+ player=\S+ FAILED=|java\.lang\.\w*Exception|java\.lang\.\w*Error|Unknown command/.test(l));
    ev.arms.R9.serverAlive = !srv.exited;
    ev.arms.R9.channels = L.rowCounts(srv.all.map(L.strip));
    ev.arms.R9.channelRows = {
      melee: srv.all.map(L.strip).filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: srv.all.map(L.strip).filter((l) => /\[MiningLog\]/.test(l)).length,
      butch: srv.all.map(L.strip).filter((l) => /\[ButchLog\]/.test(l)).length,
      arrow: srv.all.map(L.strip).filter((l) => /\[ArrowLog\]/.test(l)).length,
      cap: srv.all.map(L.strip).filter((l) => /\[CapLog\]/.test(l)).length,
      ench: srv.all.map(L.strip).filter((l) => /\[EnchantLog\]/.test(l)).length,
      damage: srv.all.map(L.strip).filter((l) => /\[DamageLog\]/.test(l)).length,
      food: srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).length,
      farm: srv.all.map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length,
    };
    ev.arms.R9.gateDryTotal = srv.all.map(L.strip).filter((l) => /growth gate dry block=/.test(l)).length;
    ev.arms.R9.rateTotal = srv.all.map(L.strip).filter((l) => /\[FarmLog\] growth rate/.test(l)).length;
    log('R9-token', 'n=' + tokens.length + ' errors=' + ev.arms.R9.tokenErrors.length + ' alive=' + ev.arms.R9.serverAlive + ' channels=' + JSON.stringify(ev.arms.R9.channelRows));

    /* ---------------- R10 cfg surface ---------------- */
    const k1 = L.cfgKeys(L.CFG);
    ev.arms.R10 = { codeKeys: countCodeKeys(), fileKeys: Object.keys(k1).length, values: { growthRateR196: k1.growthRateR196, growthLightMin: k1.growthLightMin, growthLightMax: k1.growthLightMax, globalGrowthRateFactor: k1.globalGrowthRateFactor } };
    log('R10', JSON.stringify(ev.arms.R10));

    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 2: master off ======================= */
  try {
    await startBoot(2, { master: false });
    await arena();
    await dryStrip();
    await rts(60);
    const f = srv.all.length;
    await sleep(18000);
    const rr = since(f);
    const wetRate = rr.filter((l) => /\[FarmLog\] growth rate/.test(l) && get(l, 'pos') === '184,100,800');
    const wetGate = rr.filter((l) => /\[FarmLog\] growth gate (light|rate-zero)/.test(l) && get(l, 'pos') === '184,100,800');
    const dryGate = rr.filter((l) => /\[FarmLog\] growth gate dry/.test(l) && (() => { const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(l); return m && Number(m[1]) >= 147 && Number(m[1]) <= 151; })());
    ev.arms.R8off = {
      wetRate: wetRate.length, wetGate: wetGate.length, dryGate: dryGate.length,
      blockAfter: await L.testBlock(srv, 184, CY, 800, 'minecraft:wheat'),
      age2Still: await L.testBlock(srv, 184, CY, 800, 'minecraft:wheat', 2),
      rateTotal: rr.filter((l) => /\[FarmLog\] growth rate/.test(l)).length,
      gateLightTotal: rr.filter((l) => /growth gate light/.test(l)).length,
      gateRateZeroTotal: rr.filter((l) => /growth gate rate-zero/.test(l)).length,
    };
    log('R8-off', JSON.stringify(ev.arms.R8off));
    await rts(3);
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 3: master on ======================= */
  try {
    await startBoot(3, { master: true });
    await arena();
    await rts(60);
    const f = srv.all.length;
    await sleep(12000);
    const rr = since(f);
    const rows = parseRate(rr.filter((l) => /\[FarmLog\] growth rate/.test(l) && get(l, 'pos') === '184,100,800'));
    ev.arms.R8on = {
      rows: rows.length, sample: rows.slice(0, 2),
      chainOk: rows.every((r) => chain(r).ok && tempChain(r).ok),
      rateTotal: rr.filter((l) => /\[FarmLog\] growth rate/.test(l)).length,
    };
    log('R8-on', JSON.stringify({ rows: rows.length, chain: ev.arms.R8on.chainOk, sample: rows[0] }));
    await rts(3);
    ev.stop3 = await stopBoot(3);
  } catch (e) {
    log('B3-FAIL', (e && e.stack) || e);
    ev.b3Error = String((e && e.stack) || e);
    try { if (srv) ev.stop3 = await stopBoot(3); } catch (e2) { ev.stop3Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 4: desert + swamp ======================= */
  try {
    await startBoot(4, { master: true });
    /* R6 desert shaft: farmland y=59, crop y=60 -> getTemperature(pos)=2.00.
       Three crop columns per arm (the random-tick sampler hits one block cell
       per section draw, so one crop is too thin for a 12 s window). */
    await L.tp(srv, DES.x + 0.5, 64, DES.z + 0.5, { bot: A, wait: 6000 });
    srv.send(`fill ${DES.x - 1} 60 ${DES.z - 1} ${DES.x + 1} 110 ${DES.z + 1} minecraft:air 0`);
    await sleep(900);
    srv.send(`fill ${DES.x - 1} 57 ${DES.z - 1} ${DES.x + 1} 58 ${DES.z + 1} minecraft:stone 0`);
    await sleep(700);
    srv.send(`fill ${DES.x - 1} 59 ${DES.z - 1} ${DES.x + 1} 59 ${DES.z + 1} minecraft:farmland 7`);
    await sleep(700);
    await cmd(`setblock ${DES.x + 1} 59 ${DES.z} minecraft:water 0 replace`, 400);
    const desCells = [[DES.x, DES.z], [DES.x - 1, DES.z], [DES.x, DES.z - 1]];
    const desSet = new Set(desCells.map(([x, z]) => x + ',60,' + z));
    for (const [x, z] of desCells) srv.send(`setblock ${x} 60 ${z} minecraft:pumpkin_stem 2 replace`);
    await sleep(700);
    await rts(60);
    let f = srv.all.length;
    await sleep(18000);
    const gz = since(f).filter((l) => /\[FarmLog\] growth gate rate-zero/.test(l) && /pumpkin_stem/.test(l) && desSet.has(get(l, 'pos')));
    ev.arms.R6 = { pumpkin: { rows: gz.length, sample: gz.slice(0, 3), block: await L.testBlock(srv, DES.x, 60, DES.z, 'minecraft:pumpkin_stem', 2) } };
    for (const [x, z] of desCells) srv.send(`setblock ${x} 60 ${z} minecraft:melon_stem 2 replace`);
    await sleep(700);
    f = srv.all.length;
    await sleep(15000);
    const mel = parseRate(since(f).filter((l) => /\[FarmLog\] growth rate/.test(l) && /melon_stem/.test(l) && desSet.has(get(l, 'pos'))));
    ev.arms.R6.melon = { rows: mel.length, sample: mel.slice(0, 3), chainOk: mel.every((r) => chain(r).ok && tempChain(r).ok) };
    for (const [x, z] of desCells) srv.send(`setblock ${x} 60 ${z} minecraft:wheat 2 replace`);
    await sleep(700);
    f = srv.all.length;
    await sleep(15000);
    const wh = parseRate(since(f).filter((l) => /\[FarmLog\] growth rate/.test(l) && /block=minecraft:wheat/.test(l) && desSet.has(get(l, 'pos'))));
    ev.arms.R6.wheat = { rows: wh.length, sample: wh.slice(0, 3), chainOk: wh.every((r) => chain(r).ok && tempChain(r).ok) };
    ev.arms.R6.gateAll = srv.all.map(L.strip).filter((l) => /growth gate rate-zero/.test(l)).slice(0, 4);
    log('R6', JSON.stringify({ pumpkin: { rows: ev.arms.R6.pumpkin.rows, block: ev.arms.R6.pumpkin.block.ok, sample: gz[0] }, melon: ev.arms.R6.melon.sample[0] || null, wheat: ev.arms.R6.wheat.sample[0] || null }));
    await rts(0);

    /* R5 swamp melon: hum=1.200. Sealed stone towers: an open 3x3 shaft at swamp
       level floods from the water table; the 1x1 sky chimney plus the sealed
       water pocket keeps the plot dry while staying lit. Two towers for sampling. */
    await L.tp(srv, SWP[0].x + 0.5, 70, SWP[0].z + 0.5, { bot: A, wait: 6000 });
    for (const s of SWP) {
      srv.send(`fill ${s.x - 1} 59 ${s.z - 1} ${s.x + 1} 105 ${s.z + 1} minecraft:stone 0`);
      await sleep(1100);
      srv.send(`fill ${s.x} 60 ${s.z} ${s.x} 105 ${s.z} minecraft:air 0`);
      await sleep(800);
      await cmd(`setblock ${s.x} 59 ${s.z} minecraft:farmland 7 replace`, 350);
      await cmd(`setblock ${s.x + 1} 59 ${s.z} minecraft:water 0 replace`, 350);
      await cmd(`setblock ${s.x} 60 ${s.z} minecraft:melon_stem 2 replace`, 600);
    }
    await rts(60);
    f = srv.all.length;
    await sleep(18000);
    const swSet = new Set(SWP.map((s) => s.x + ',60,' + s.z));
    const sw = parseRate(since(f).filter((l) => /\[FarmLog\] growth rate/.test(l) && /melon_stem/.test(l) && swSet.has(get(l, 'pos'))));
    ev.arms.R5swamp = { rows: sw.length, sample: sw.slice(0, 2), hum: [...new Set(sw.map((r) => r.hum))], family: [...new Set(sw.map((r) => r.family))], window: [...new Set(sw.map((r) => r.window))], chainOk: sw.every((r) => chain(r).ok && tempChain(r).ok) };
    log('R5-swamp', JSON.stringify(ev.arms.R5swamp));
    await rts(3);
    ev.stop4 = await stopBoot(4);
  } catch (e) {
    log('B4-FAIL', (e && e.stack) || e);
    ev.b4Error = String((e && e.stack) || e);
    try { if (srv) ev.stop4 = await stopBoot(4); } catch (e2) { ev.stop4Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= closure ======================= */
  try {
    L.setCfgValue(L.CFG, 'growthRateR196', 'true');
    L.setCfgValue(L.CFG, 'growthLightMin', '15');
    L.setCfgValue(L.CFG, 'growthLightMax', '15');
    L.setCfgValue(L.CFG, 'globalGrowthRateFactor', '0.25');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(), values: { growthRateR196: k.growthRateR196, growthLightMin: k.growthLightMin, growthLightMax: k.growthLightMax, globalGrowthRateFactor: k.globalGrowthRateFactor, farmDebugLog: k.farmDebugLog, foodDebugLog: k.foodDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'), allowFlight: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'allow-flight') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', L.PIN.head + '..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.readdirSync(path.join(L.ROOT, 'run')).filter((n) => /^f9/.test(n));
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  } catch (e) {
    log('CLOSE-FAIL', (e && e.stack) || e);
    ev.closeError = String((e && e.stack) || e);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
  }
  process.exit(0);
}

main().catch((e) => {
  log('FATAL', (e && e.stack) || e);
  process.exit(1);
});
