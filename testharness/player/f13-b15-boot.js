#!/usr/bin/env node
/**
 * f13-b13-boot.js — blight batch (B-13) boot-only sanity driver.
 * One boot + mixinFail count + stop. No arms (the judgment window is
 * session-seven's). Port gate + 3 retries per the B-12b driver shape (条
 * 312 C-12-7: no two sessions share 25565 / the same run/).
 */
'use strict';
const L = require('./f7-wb-lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitPortFree(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (L.netstatListen(L.PORT) === 0) return true;
    await L.sleep(5000);
  }
  return false;
}

(async () => {
  const log = (tag, line) => console.log('[' + tag + '] ' + line);
  const ev = { boots: [], stops: [] };
  let srv = null;
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    await waitPortFree(240000);
    srv = await L.startServer({ root: L.ROOT, tag: 'b15boot' + (attempt > 1 ? '-r' + attempt : '') });
    const hit = await srv.waitFor(/Done \(/, 200000);
    if (hit) {
      const mixinFail = srv.all.filter((l) =>
        /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i.test(l)).length;
      ev.boots.push({
        boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
        mixinFail,
      });
      ok = true;
      log('boot', 'Done hit, mixinFail=' + mixinFail);
      // blight landing audit rows: the fresh boot should print the state-mapper
      // count client-side only (not here); server boot proves injections bound.
      const cropBind = srv.all.filter((l) => /BlockCrops|blight/i.test(l) && /fail|critical/i.test(l)).length;
      ev.cropBindTaint = cropBind;
      const st = await srv.stop();
      ev.stops.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) });
      srv = null;
      break;
    }
    const bindFail = srv.all.some((l) => /FAILED TO BIND TO PORT|Address already in use/.test(l));
    log('boot', 'attempt ' + attempt + ' failed bind=' + bindFail);
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
    if (!bindFail) throw new Error('no Done( within 200 s (attempt ' + attempt + ')');
    await sleep(8000);
  }
  ev.ok = ok;
  const fs = require('fs');
  const path = require('path');
  const out = path.join(L.ROOT, 'testharness', 'build-logs', 'f13-b15-boot.json');
  fs.writeFileSync(out, JSON.stringify(ev, null, 2));
  log('out', out);
  if (!ok) process.exitCode = 2;
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
