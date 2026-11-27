#!/usr/bin/env node
/**
 * f9-gr-pilot.js - W-B9 preflight v2 (NOT a judged boot).
 * Fixes from v1: the fresh window world MUST carry the dev world's seed
 * (-2991855477586212903) so the scanned desert/swamp columns line up; the
 * desert shaft sits at farmland y=59 / crop y=60 (getTemperature at y<=64 has
 * no height cooling, and y<64 keeps the noise term non-positive -> temp>=2.00).
 *   P1 wet-grid arena: base=10.000 + prox 0.5/0.75/1.0 + temp chain
 *   P2 3x3 roof patch: gate light fires, blv<15, window=15..15
 *   P3 fertilize-then-place (x2 plots): fertilize row + fert=1.500 rows
 *   P4 desert y=59/60: temp=2.00 -> pumpkin rate-zero, melon 0.400, wheat 0.200
 *   P5 swamp y=59/60: melon hum=1.200
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f9-gr-pilot';
const WORLD = 'f9gr';
const SEED = '-2991855477586212903';
const A = 'ETIM_F7';
const FY = 99, CY = 100;
const WX = [160, 166, 172, 178, 186, 194, 200, 206];
const WZ = [782, 787, 792, 797, 803, 808];
const DES = { x: -15, z: 282 };
const SWP = { x: 311, z: 220 };

let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const get = (l, k) => { const m = new RegExp('(?:^| )' + k + '=(\\S+)').exec(l); return m ? m[1] : null; };

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 350 : wait); }
async function rts(v) { srv.send('gamerule randomTickSpeed ' + v); await sleep(350); }
function rateRows(from, pos) {
  const rows = since(from).filter((l) => /\[FarmLog\] growth rate/.test(l));
  return { all: rows, at: pos ? rows.filter((l) => get(l, 'pos') === pos) : rows };
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
  for (let x = 179; x <= 181; x++) for (let z = 794; z <= 796; z++) srv.send(`setblock ${x} ${CY} ${z} minecraft:wheat 2 replace`);
  for (const [x, z] of [[184, 800], [190, 800], [191, 800], [196, 800], [197, 800], [198, 800]]) srv.send(`setblock ${x} ${CY} ${z} minecraft:wheat 2 replace`);
  srv.send('setblock 186 100 806 minecraft:pumpkin_stem 2 replace');
  srv.send('setblock 192 100 806 minecraft:melon_stem 2 replace');
  await sleep(1000);
}

function chain(r) {
  const base = Number(r.base), fert = r.fert === 'none' ? 1 : Number(r.fert);
  const tm = Number(r.tempMod), hum = Number(r.hum), g = Number(r.global);
  const px = r.prox === 'none' ? 1 : Number(r.prox);
  return Math.abs(base * fert * tm * hum * g * px - Number(r.rate)) <= 0.0025;
}
function tempChain(r) {
  const t = Number(r.temp), lo = Number(r.window.split('..')[0]), hi = Number(r.window.split('..')[1]);
  const d = t < lo ? lo - t : (t > hi ? t - hi : 0);
  return Math.abs(Math.max(1 - d, 0) - Number(r.tempMod)) <= 0.006;
}
const parse = (l) => ({
  block: get(l, 'block'), family: get(l, 'family'), pos: get(l, 'pos'), base: get(l, 'base'), fert: get(l, 'fert'),
  temp: get(l, 'temp'), window: get(l, 'window'), tempMod: get(l, 'tempMod'), hum: get(l, 'hum'),
  prox: get(l, 'prox'), global: get(l, 'global'), rate: get(l, 'rate'),
});

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'growthRateR196', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'level-seed', SEED), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException|MixinException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 0, noPhysics: true, time: 6000 });
    await L.tp(srv, 184.5, 101, 795.5, { bot: A, wait: 2000 });
    await arena();

    /* P1 composition + prox */
    await rts(60);
    let f = srv.all.length;
    await sleep(10000);
    const r1 = rateRows(f);
    const p = r1.all.map(parse);
    ev.arms.p1 = {
      rows: p.length,
      sample: p[0] || null,
      prox: [...new Set(p.map((r) => r.pos + '=' + r.prox))].sort(),
      temp: [...new Set(p.map((r) => r.temp))],
      base: [...new Set(p.map((r) => r.base))],
      chainOk: p.every((r) => chain(r) && tempChain(r)),
    };
    L.log('P1', JSON.stringify(ev.arms.p1));
    await rts(0);

    /* P2 roof patch */
    srv.send('fill 177 102 792 183 102 798 minecraft:stone 0');
    await sleep(1200);
    await rts(60);
    f = srv.all.length;
    await sleep(10000);
    const g = since(f).filter((l) => /\[FarmLog\] growth gate light/.test(l));
    ev.arms.p2 = { rows: g.length, blv: [...new Set(g.map((l) => get(l, 'blv')))].sort(), window: [...new Set(g.map((l) => get(l, 'window')))], sample: g.slice(0, 2), block: await L.testBlock(srv, 180, CY, 795, 'minecraft:wheat', 2) };
    L.log('P2', JSON.stringify({ rows: g.length, blv: ev.arms.p2.blv, window: ev.arms.p2.window, block: ev.arms.p2.block.ok }));
    await rts(0);
    srv.send('fill 177 102 792 183 102 798 minecraft:air 0');
    await sleep(800);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const after = since(f);
    ev.arms.p2b = {
      gateAfterRoofOff: after.filter((l) => /growth gate light/.test(l) && get(l, 'pos') === '180,100,795').length,
      rateAfterRoofOff: after.filter((l) => /growth rate/.test(l) && get(l, 'pos') === '180,100,795').length,
    };
    L.log('P2b', JSON.stringify(ev.arms.p2b));
    await rts(0);

    /* P3 fertilize two plots then plant */
    for (const x of [176, 177]) srv.send(`setblock ${x} ${CY} 800 minecraft:air 0 replace`);
    await cmd('gamemode 0 ' + A, 600);
    await cmd(`clear ${A}`, 500);
    await cmd(`give ${A} etim:manure 2`, 800);
    try { bot.setQuickBarSlot(0); } catch (e) { /* noop */ }
    await L.tp(srv, 176.5, CY, 801.5, { bot: A, wait: 700 });
    let frows = [];
    for (const x of [176, 177]) {
      await L.lookAtTop(bot, x, FY, 800);
      const ff = srv.all.length;
      srv.send(`etest useblock ${x} ${FY} 800 ${A}`);
      await sleep(1500);
      frows = frows.concat(since(ff).filter((l) => /\[FarmLog\] fertilize|fertilized set/.test(l)));
    }
    await cmd('gamemode 1 ' + A, 500);
    for (const x of [176, 177]) srv.send(`setblock ${x} ${CY} 800 minecraft:wheat 2 replace`);
    await sleep(700);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const fr = since(f).filter((l) => /\[FarmLog\] growth rate/.test(l) && ['176,100,800', '177,100,800'].includes(get(l, 'pos'))).map(parse);
    ev.arms.p3 = { fertRows: frows, rows: fr.length, fert: [...new Set(fr.map((r) => r.fert))], prox: [...new Set(fr.map((r) => r.pos + '=' + r.prox))], chainOk: fr.every((r) => chain(r) && tempChain(r)), sample: fr[0] || null };
    L.log('P3', JSON.stringify({ fertRows: frows.length, rows: fr.length, fert: ev.arms.p3.fert, chain: ev.arms.p3.chainOk, sample: fr[0] }));
    await rts(0);

    /* P4 desert y=59/60 */
    await L.tp(srv, DES.x + 0.5, 64, DES.z + 0.5, { bot: A, wait: 6000 });
    srv.send(`fill ${DES.x - 1} 60 ${DES.z - 1} ${DES.x + 1} 110 ${DES.z + 1} minecraft:air 0`);
    await sleep(900);
    srv.send(`fill ${DES.x - 1} 57 ${DES.z - 1} ${DES.x + 1} 59 ${DES.z + 1} minecraft:stone 0`);
    await sleep(900);
    await cmd(`setblock ${DES.x} 59 ${DES.z} minecraft:farmland 7 replace`, 400);
    await cmd(`setblock ${DES.x + 1} 59 ${DES.z} minecraft:water 0 replace`, 400);
    await cmd(`setblock ${DES.x} 60 ${DES.z} minecraft:pumpkin_stem 2 replace`, 700);
    await rts(60);
    f = srv.all.length;
    await sleep(14000);
    const gz = since(f).filter((l) => /\[FarmLog\] growth gate rate-zero/.test(l));
    const pz = since(f).filter((l) => /growth rate/.test(l) && get(l, 'pos') === `${DES.x},60,${DES.z}`).map(parse);
    ev.arms.p4p = { gate: gz.length, sample: gz.slice(0, 2), growth: pz.length, block: await L.testBlock(srv, DES.x, 60, DES.z, 'minecraft:pumpkin_stem', 2) };
    L.log('P4-pumpkin', JSON.stringify({ gate: gz.length, sample: gz[0] || null, growth: pz.length, block: ev.arms.p4p.block.ok }));

    srv.send(`setblock ${DES.x} 60 ${DES.z} minecraft:melon_stem 2 replace`);
    await sleep(700);
    f = srv.all.length;
    await sleep(12000);
    const mel = since(f).filter((l) => /growth rate/.test(l) && get(l, 'pos') === `${DES.x},60,${DES.z}`).map(parse);
    ev.arms.p4m = { rows: mel.length, sample: mel[0] || null, chainOk: mel.every((r) => chain(r)) };
    L.log('P4-melon', JSON.stringify(ev.arms.p4m));

    srv.send(`setblock ${DES.x} 60 ${DES.z} minecraft:wheat 2 replace`);
    await sleep(700);
    f = srv.all.length;
    await sleep(12000);
    const wh = since(f).filter((l) => /growth rate/.test(l) && get(l, 'pos') === `${DES.x},60,${DES.z}`).map(parse);
    ev.arms.p4w = { rows: wh.length, sample: wh[0] || null };
    L.log('P4-wheat', JSON.stringify(ev.arms.p4w));
    await rts(0);

    /* P5 swamp y=59/60 */
    await L.tp(srv, SWP.x + 0.5, 64, SWP.z + 0.5, { bot: A, wait: 6000 });
    srv.send(`fill ${SWP.x - 1} 60 ${SWP.z - 1} ${SWP.x + 1} 110 ${SWP.z + 1} minecraft:air 0`);
    await sleep(900);
    srv.send(`fill ${SWP.x - 1} 57 ${SWP.z - 1} ${SWP.x + 1} 59 ${SWP.z + 1} minecraft:stone 0`);
    await sleep(900);
    await cmd(`setblock ${SWP.x} 59 ${SWP.z} minecraft:farmland 7 replace`, 400);
    await cmd(`setblock ${SWP.x - 1} 59 ${SWP.z} minecraft:water 0 replace`, 400);
    await cmd(`setblock ${SWP.x} 60 ${SWP.z} minecraft:melon_stem 2 replace`, 700);
    await rts(60);
    f = srv.all.length;
    await sleep(12000);
    const sw = since(f).filter((l) => /growth rate/.test(l) && get(l, 'pos') === `${SWP.x},60,${SWP.z}`).map(parse);
    ev.arms.p5 = { rows: sw.length, sample: sw[0] || null, hum: [...new Set(sw.map((r) => r.hum))], chainOk: sw.every((r) => chain(r)) };
    L.log('P5', JSON.stringify(ev.arms.p5));
    await rts(0);
    ev.done = true;
  } catch (e) {
    L.log('PILOT-FAIL', (e && e.stack) || e);
    ev.error = String((e && e.stack) || e);
    process.exitCode = 2;
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
