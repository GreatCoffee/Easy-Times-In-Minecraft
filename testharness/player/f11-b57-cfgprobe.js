// cfg flag probe: force mobGelatinousR196=true, boot, check /etest gelpick flag
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');
const L2 = L;

const WORLD = 'w-b57-cfgprobe-v1';

function val(text, key) {
  const m = new RegExp(key + '=(true|false)').exec(text);
  return m ? m[1] : 'MISSING';
}

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  const cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  let bootCfg = cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true');
  bootCfg = bootCfg.replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=true');
  fs.writeFileSync(L.CFG, bootCfg, 'utf8');
  console.log('[cfg] before=', val(cfgBefore, 'B:mobGelatinousR196'), 'written=', val(bootCfg, 'B:mobGelatinousR196'), 'disk=', val(fs.readFileSync(L.CFG, 'utf8'), 'B:mobGelatinousR196'));

  const srv = await L.startServer({ root: L.ROOT, tag: 'b57-cfgprobe' });
  const ok = await srv.waitFor(/Done \(/, 180000);
  console.log('[boot] done=', ok, 'diskAfterBoot=', val(fs.readFileSync(L.CFG, 'utf8'), 'B:mobGelatinousR196'));
  await L.sleep(1500);
  await srv.send('/etest gelpick 12 150 0 5');
  await L.sleep(2500);
  const lines = (srv.all || []).filter((l) => /gelpick/.test(l));
  lines.slice(-3).forEach((l) => console.log('[line]', l.trim()));

  await srv.stop(30000);
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  console.log('[cfg] restored=', val(fs.readFileSync(L.CFG, 'utf8'), 'B:mobGelatinousR196'));
  process.exit(0);
})().catch((e) => { console.error('[fatal]', e && e.stack || e); process.exit(1); });
