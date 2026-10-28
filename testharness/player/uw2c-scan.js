#!/usr/bin/env node
/**
 * uw2c-scan.js — 区块列扫描：逐列 tp + /etim dim probe，找出含 portal 段的列
 * 用法：node uw2c-scan.js <cx> <cz> [harnName]
 */
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const cx = Number(process.argv[2] || 56), cz = Number(process.argv[3] || 56);
  const name = process.argv[4] || 'ETIM_Harn04';
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: name });
  await sleep(4000);
  const out = [];
  b.on('message', (m) => out.push(m.toString()));
  const hits = [];
  let n = 0;
  for (let x = cx * 16; x < cx * 16 + 16; x++) {
    for (let z = cz * 16; z < cz * 16 + 16; z++) {
      n++;
      const i0 = out.length;
      b.chat(`/tp @p ${x + 0.5} 120 ${z + 0.5}`);
      await sleep(320);
      b.chat('/etim dim probe');
      await sleep(620);
      const seg = out.slice(i0).join(' ');
      const m = seg.match(/gen-probe[^|]*/);
      if (m && /portal=/.test(m[0])) {
        hits.push({ x, z, seg: m[0] });
        console.log('HIT ' + x + ',' + z + ' :: ' + m[0].slice(0, 240));
      }
    }
    if (x % 4 === 0) console.log('progress chunk(' + cx + ',' + cz + ') x=' + x + ' cols=' + n);
  }
  console.log('SCAN DONE chunk(' + cx + ',' + cz + ') cols=' + n + ' hits=' + hits.length);
  if (!hits.length) console.log('NO PORTAL IN CHUNK(' + cx + ',' + cz + ')');
  b.quit(); setTimeout(() => process.exit(0), 700);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
