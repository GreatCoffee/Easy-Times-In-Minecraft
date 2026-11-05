#!/usr/bin/env node
/**
 * f9-gr-smoke.js — growth-rate batch (B-9) main-session smoke (not a verdict run).
 * Faces: S1 daylight growth-rate rows (temp window numbers + prox 0.5/0.75/1.0
 * clusters), S2 roof freeze (light gate rows + blv values), S3 the gate rides the
 * stem host too (melon_stem under the roof), S4 bonus: natural dice advance watch.
 * The master-off face (growthRateR196=false) is a boot-time cfg — 判窗 double-boot
 * face, not in this smoke.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f9-gr-smoke';
const WORLD = 'f9gr';
// three clusters on wet farmland: single isolated / adjacent pair / a 3-line row
const AX = 186, AY = 100, AZ = 800;      // single isolated
const BX = 190, BZ = 800;                // pair 190 + 191
const CX = 194, CZ = 800;                // row 194..196

let ev = { tag: TAG, startedAt: new Date().toISOString(), logs: [] };
const get = (l, k) => {
  const m = l.match(new RegExp('(?:^| )' + k + '=(\\S+)'));
  return m ? m[1] : null;
};

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);

    // the arena keeps random-tick alive ONLY while a entity anchors it — join the bot
    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    await L.tp(srv, AX + 0.5, AY + 2, AZ - 5.5, { bot: bot.username, wait: 1500 });

    srv.send('time set 1000');
    srv.send('gamerule doDaylightCycle false');
    srv.send(`fill ${AX - 6} ${AY - 1} ${AZ - 3} ${CX + 6} ${AY - 1} ${AZ + 3} minecraft:farmland 7`);
    srv.send(`fill ${AX - 6} ${AY} ${AZ - 3} ${CX + 6} ${AY + 6} ${AZ + 3} minecraft:air 0`);
    await L.sleep(700);
    const spots = [
      [AX, AZ], [BX, BZ], [BX + 1, BZ], [CX, CZ], [CX + 1, CZ], [CX + 2, CZ],
    ];
    for (const [x, z] of spots) {
      srv.send(`setblock ${x} ${AY} ${z} minecraft:wheat 2`);
    }
    await L.sleep(500);
    srv.send('gamerule randomTickSpeed 40');
    const from1 = mark();
    await L.sleep(10000);
    const s1rows = rowsFrom(from1).filter((l) => /\[FarmLog\] growth rate/.test(l));
    const parsed = s1rows.map((l) => ({
      pos: get(l, 'pos'),
      base: get(l, 'base'),
      fert: get(l, 'fert'),
      temp: get(l, 'temp'),
      window: get(l, 'window'),
      tempMod: get(l, 'tempMod'),
      hum: get(l, 'hum'),
      prox: get(l, 'prox'),
      global: get(l, 'global'),
      rate: get(l, 'rate'),
    }));
    const atX = (x0) => parsed.filter((p) => p.pos && p.pos.startsWith(x0 + ',' + AY + ',' + AZ));
    ev.s1 = {
      rows: s1rows.length,
      sample: parsed.slice(0, 2),
      proxSingleAll: atX(AX).every((p) => p.prox === '0.500'),
      proxSingleN: atX(AX).length,
      proxPairAll: atX(BX).every((p) => p.prox === '0.750'),
      proxPairN: atX(BX).length,
      proxRowAll: atX(CX).every((p) => p.prox === '1.000'),
      proxRowN: atX(CX).length,
      globalAll: parsed.every((p) => p.global === '0.250'),
      tempsSeen: [...new Set(parsed.map((p) => p.temp + '@' + p.tempMod))],
    };
    L.log('S1 ' + JSON.stringify({
      rows: ev.s1.rows, proxSingle: ev.s1.proxSingleN + '/' + (ev.s1.proxSingleAll ? 'OK' : 'MIX'),
      proxPair: ev.s1.proxPairN + '/' + (ev.s1.proxPairAll ? 'OK' : 'MIX'),
      proxRow: ev.s1.proxRowN + '/' + (ev.s1.proxRowAll ? 'OK' : 'MIX'),
      global: ev.s1.globalAll, temps: ev.s1.tempsSeen,
    }));

    // --- S2: roof (7x9 stone at y+2) → sky channel blocked → light gate freezes
    srv.send(`fill ${AX - 6} ${AY + 2} ${AZ - 3} ${CX + 6} ${AY + 2} ${AZ + 3} minecraft:stone 0`);
    const from2 = mark();
    await L.sleep(6000);
    const s2rows = rowsFrom(from2).filter((l) => /\[FarmLog\] growth gate light/.test(l));
    const blvSeen = [...new Set(s2rows.map((l) => get(l, 'blv')))].filter(Boolean).sort();
    ev.s2 = { rows: s2rows.length, blv: blvSeen, sample: s2rows.slice(0, 1) };
    L.log('S2 ' + JSON.stringify({ rows: ev.s2.rows, blv: ev.s2.blv }));

    // --- S3: the stem host — melon stem staged INSIDE the roofed arena
    srv.send(`setblock ${CX + 4} ${AY} ${CZ} minecraft:melon_stem 2`);
    await L.sleep(500);
    const from3 = mark();
    await L.sleep(6000);
    const s3rows = rowsFrom(from3).filter((l) => /\[FarmLog\] growth gate light/.test(l)
      && /melon_stem/.test(l));
    ev.s3 = { rows: s3rows.length, sample: s3rows.slice(0, 1) };
    L.log('S3 ' + JSON.stringify({ rows: ev.s3.rows }));

    // --- S4: bonus watch — with rate ~0.75 at tempMod 1, any age upcrop in the
    // bundle proves the dice chain is alive (NOT a verdict face;unload error only).
    srv.send(`fill ${AX - 6} ${AY + 2} ${AZ - 3} ${CX + 6} ${AY + 2} ${AZ + 3} minecraft:air 0`);
    const from4 = mark();
    await L.sleep(20000);
    const s4rows = rowsFrom(from4).filter((l) => /gamerule|growth gate light|Successfully/.test(l));
    ev.s4 = {
      lightGateBack: s4rows.filter((l) => /growth gate light/.test(l)).length,
      note: 'roof removed — gate rows must resume then stop being the only freeze',
    };
    L.log('S4 ' + JSON.stringify({ gateRows: ev.s4.lightGateBack }));

    // --- cleanup: rts down, debug off, daylight restore (cfg master stays true)
    srv.send('gamerule randomTickSpeed 3');
    srv.send('gamerule doDaylightCycle true');
    await L.sleep(500);
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    await L.sleep(300);

    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('smoke-done', 'evidence written');
  } catch (e) {
    L.log('SMOKE-FAIL', e && e.stack || e.message || e);
    process.exitCode = 2;
  } finally {
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
