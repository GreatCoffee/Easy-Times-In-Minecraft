#!/usr/bin/env node
'use strict';
const { createHarnBot } = require('./fmlbot');
const { Vec3 } = require('vec3');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: (process.argv[2] || 'ETIM_Harn07') });
  await sleep(4000);
  console.log('pos=', JSON.stringify(b.entity.position), 'columns=', Object.keys(b.world.columns || {}).length);
  const cx = Math.floor(b.entity.position.x), cz = Math.floor(b.entity.position.z);
  for (const y of [0, 1, 2, 3, 4, 5, 60, 120, 125, 126, 130]) {
    const blk = b.blockAt(new Vec3(cx, y, cz));
    console.log('y=' + y + ' -> ' + (blk ? blk.name + ' (' + blk.type + ')' : 'null'));
  }
  let mantle = 0, tot = 0, nulls = 0; const names = {};
  const cands = [];
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (const y of [1, 2, 3, 4, 5]) {
    const blk = b.blockAt(new Vec3(cx + dx, y, cz + dz)); tot++;
    if (!blk) { nulls++; continue; }
    names[blk.name] = (names[blk.name] || 0) + 1;
    if (/mantle/.test(blk.name)) mantle++;
    if (cands.length < 8 && !/mantle/.test(blk.name)) {
      const nb = [[cx + dx + 1, cz + dz], [cx + dx - 1, cz + dz], [cx + dx, cz + dz + 1], [cx + dx, cz + dz - 1]]
        .map(([nx, nz]) => b.blockAt(new Vec3(nx, y, nz)));
      if (nb.some((x) => x && /mantle/.test(x.name))) cands.push({ x: cx + dx, y, z: cz + dz, self: blk.name });
    }
  }
  console.log('scan tot=' + tot + ' nulls=' + nulls + ' mantle=' + mantle);
  console.log('names=', JSON.stringify(names).slice(0, 400));
  console.log('cands=', JSON.stringify(cands));
  // 另取 chunk 内其它列的 y=1 采样
  const col = [];
  for (let dx = 0; dx < 16; dx += 3) for (let dz = 0; dz < 16; dz += 3) {
    const bx = (cx >> 4 << 4) + dx, bz = (cz >> 4 << 4) + dz;
    const a = b.blockAt(new Vec3(bx, 1, bz)), c = b.blockAt(new Vec3(bx, 2, bz));
    col.push(dx + ',' + dz + ':' + (a ? a.name : 'null') + '/' + (c ? c.name : 'null'));
  }
  console.log('chunk column y1/y2:', col.join(' | '));
  b.quit(); setTimeout(() => process.exit(0), 600);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
