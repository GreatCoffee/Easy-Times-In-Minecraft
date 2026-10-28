#!/usr/bin/env node
/** uw2c-probe.js — 原始 chat 回包探针：看某格真是什么方块（含 dataValue 正反判） */
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: process.env.UW2C_NAME || 'ETIM_Harn01' });
  await sleep(4000);
  const out = [];
  b.on('message', (m) => out.push(m.toString()));
  const run = async (c, ms) => {
    const n = out.length;
    b.chat('/' + c);
    await sleep(ms || 900);
    console.log(c + '  ->  ' + out.slice(n).join(' | '));
  };
  console.log('pos=', JSON.stringify(b.entity.position));
  const [cx, cy, cz] = process.argv.slice(2).map(Number);
  const X = isNaN(cx) ? 897 : cx, Y = isNaN(cy) ? 214 : cy, Z = isNaN(cz) ? 898 : cz;
  console.log('probe cube around', X, Y, Z);
  await run(`testforblock ${X} ${Y} ${Z} etim:portal`);
  await run(`testforblock ${X} ${Y} ${Z} minecraft:portal`);
  for (let dy = -2; dy <= 3; dy++) {
    const row = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const n = out.length;
        b.chat(`/testforblock ${X + dx} ${Y + dy} ${Z + dz} etim:portal`);
        await sleep(160);
        const g = out.slice(n).join(' ');
        if (/Successfully found/.test(g)) row.push(`${dx},${dz}`);
      }
    }
    if (row.length) console.log('  portal hits at dy=' + dy + ': ' + row.join(' '));
  }
  // 输出若干格的实际方块名
  for (const [dx, dy, dz] of [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]]) {
    await run(`testforblock ${X + dx} ${Y + dy} ${Z + dz} minecraft:air`, 500);
  }
  b.quit(); setTimeout(() => process.exit(0), 700);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
