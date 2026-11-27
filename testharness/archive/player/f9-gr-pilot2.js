#!/usr/bin/env node
/**
 * f9-gr-pilot2.js - swamp high-humidity arm (sealed stone tower variant).
 * Open 3x3 shafts let swamp water pour in and kill the crop; the tower keeps
 * the 1x1 sky chimney dry: 3x3 stone 59..105 -> carve centre 60..105 -> farmland
 * 59 + sealed water pocket at (x+1,59,z) -> melon_stem 60.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f9-gr-pilot2';
const WORLD = 'f9gr';
const SEED = '-2991855477586212903';
const A = 'ETIM_F7';
const SWP = [{ x: 311, z: 220 }, { x: 315, z: 217 }];

let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const get = (l, k) => { const m = new RegExp('(?:^| )' + k + '=(\\S+)').exec(l); return m ? m[1] : null; };
async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 350 : wait); }
async function rts(v) { srv.send('gamerule randomTickSpeed ' + v); await sleep(350); }

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'level-seed', SEED), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 0, noPhysics: true, time: 6000 });
    await L.tp(srv, SWP[0].x + 0.5, 70, SWP[0].z + 0.5, { bot: A, wait: 6000 });
    for (const s of SWP) {
      srv.send(`fill ${s.x - 1} 59 ${s.z - 1} ${s.x + 1} 105 ${s.z + 1} minecraft:stone 0`);
      await sleep(1200);
      srv.send(`fill ${s.x} 60 ${s.z} ${s.x} 105 ${s.z} minecraft:air 0`);
      await sleep(900);
      await cmd(`setblock ${s.x} 59 ${s.z} minecraft:farmland 7 replace`, 350);
      await cmd(`setblock ${s.x + 1} 59 ${s.z} minecraft:water 0 replace`, 350);
      await cmd(`setblock ${s.x} 60 ${s.z} minecraft:melon_stem 2 replace`, 500);
    }
    await rts(60);
    const f = srv.all.length;
    await sleep(16000);
    ev.rows = since(f).filter((l) => /\[FarmLog\] growth rate/.test(l)).map((l) => ({
      pos: get(l, 'pos'), block: get(l, 'block'), family: get(l, 'family'), temp: get(l, 'temp'),
      window: get(l, 'window'), tempMod: get(l, 'tempMod'), hum: get(l, 'hum'), prox: get(l, 'prox'), rate: get(l, 'rate'),
    }));
    ev.perPos = SWP.map((s) => {
      const at = ev.rows.filter((r) => r.pos === `${s.x},60,${s.z}`);
      return { pos: `${s.x},60,${s.z}`, rows: at.length, hum: [...new Set(at.map((r) => r.hum))], sample: at[0] || null, block: null };
    });
    for (const p of ev.perPos) p.block = await L.testBlock(srv, Number(p.pos.split(',')[0]), 60, Number(p.pos.split(',')[2]), 'minecraft:melon_stem', 2);
    ev.moisture = since(f).filter((l) => /moisture (tick|chance)/.test(l)).slice(0, 4);
    L.log('SW', JSON.stringify({ rows: ev.rows.length, perPos: ev.perPos.map((p) => ({ pos: p.pos, rows: p.rows, hum: p.hum, block: p.block.ok })), sample: ev.perPos[0].sample }));
    await rts(0);
  } catch (e) {
    L.log('FAIL', (e && e.stack) || e);
    ev.error = String((e && e.stack) || e);
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
