#!/usr/bin/env node
/**
 * uw2c-col.js — 列段探针：tp 到指定列 → /etim dim probe → 读 [DimLog] gen-probe 段
 * 用法：node uw2c-col.js x1,z1 x2,z2 ...
 */
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: process.env.UW2C_NAME || 'ETIM_Harn01' });
  await sleep(4000);
  const out = [];
  b.on('message', (m) => out.push(m.toString()));
  const run = async (c, ms) => { const n = out.length; b.chat('/' + c); await sleep(ms || 1200); return out.slice(n).join(' | '); };
  console.log('pos=', JSON.stringify(b.entity.position));
  const cols = process.argv.slice(2);
  for (const col of cols) {
    const [x, z] = col.split(',').map(Number);
    await run(`tp @p ${x + 0.5} 120 ${z + 0.5}`, 900);
    const seg = await run('etim dim probe', 1400);
    const m = seg.match(/gen-probe[^|]*/);
    console.log('col ' + x + ',' + z + ' -> ' + (m ? m[0] : seg.slice(0, 200)));
    const portals = m ? [...m[0].matchAll(/portal=(\d+)\.\.(\d+)/g)].map((g) => g[1] + '..' + g[2]) : [];
    if (portals.length) console.log('   PORTAL segments: ' + portals.join(' '));
  }
  b.quit(); setTimeout(() => process.exit(0), 700);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
