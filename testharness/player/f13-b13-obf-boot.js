#!/usr/bin/env node
/**
 * f13-b13-obf-boot.js — D-13-1 single-point proof: boot the OBFUSCATED
 * (production, srg-named) server with the release jar (prepareObfModsFolder
 * feeds it), count mixin failures, graceful stop.
 *
 * The B-13 MixinBlockCrops four Forge-patch targets (canGrow/canUseBonemeal
 * /grow/getDrops) ride remap=false — the dev windows prove nothing about the
 * srg face; THIS boot decides (W-B13 verdict D-13-1). Green = mixinFail 0:
 * those four carry no srg names at all (the round-1 AP error "Unable to
 * locate obfuscation mapping for @Inject target getDrops" is the AP-side
 * proof), so remap=false is the only valid mode.
 * Port gate + die-loud per C-12-7. Console plumbing = server-console.js.
 */
'use strict';
const L = require('./f7-wb-lib.js');

const sleep = L.sleep;
(async () => {
  const log = (tag, line) => console.log('[' + tag + '] ' + line);
  const failRe = /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i;

  for (let i = 0; i < 60; i++) {
    if (L.netstatListen(L.PORT) === 0) break;
    await sleep(5000);
  }
  if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting');

  const ev = { tag: 'b13-obf', started: new Date().toISOString(), mixinFailRows: [] };
  const srv = L.startServer({ root: L.ROOT, task: 'runObfServer', tag: 'b13-obf-boot' });

  const doneRow = await srv.waitFor(/Done \(/, 300000);
  if (doneRow) {
    ev.done = true;
    ev.boot = srv.all.find((l) => /Done \(/.test(l)).replace(/\s+/g, ' ').trim().slice(0, 140);
    ev.mixinFailRows = srv.all.filter((l) => failRe.test(l)).map((l) => l.trim().slice(0, 240));
    ev.cropBindProof = srv.all.filter((l) => /MixinBlockCrops|blight|registerAmbient|dead-plant carriers/i.test(l) && /INFO/.test(l))
      .slice(0, 12).map((l) => l.trim().slice(0, 200));
    log('boot', ev.boot + ' mixinFailRows=' + ev.mixinFailRows.length);
    const st = await srv.stop(90000);
    ev.stop = { exitCode: st.exitCode, exited: st.exited, buildOk: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) };
    log('stop', 'exit=' + ev.stop.exitCode + ' buildOk=' + ev.stop.buildOk);
  } else {
    ev.done = false;
    ev.error = 'obf boot never emitted Done( within 300 s';
    ev.tailish = srv.all.slice(-12).map((l) => l.slice(0, 160));
    ev.mixinFailRows = srv.all.filter((l) => failRe.test(l)).map((l) => l.trim().slice(0, 240));
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    log('boot', 'NO Done( — FAIL');
  }

  const fs = require('fs');
  const jsonPath = L.OUT ? require('path').join(L.OUT, 'b13-obf-boot.json')
    : require('path').join(L.ROOT, 'testharness', 'build-logs', 'b13-obf-boot.json');
  fs.writeFileSync(jsonPath, JSON.stringify(ev, null, 2));
  log('out', jsonPath);
  process.exitCode = ev.done && ev.mixinFailRows.length === 0 ? 0 : 2;
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
