#!/usr/bin/env node
/**
 * uw2c-region.js — 最小 Anvil/NBT 读取器：按 block id 在 DIM-2 区域里找 portal
 * 用法：node uw2c-region.js calib | scan <cx> <cz> <id>
 *   calib: 读区块 (-7,13) 的 (-108,219,209) 与 (-108,218,209) 得 portal / obsidian id
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const DIMDIR = process.env.UW2C_DIM || 'DIM-2';
const DIR = path.join(__dirname, '..', '..', 'run', 'uw2', 'uwtest2', DIMDIR, 'region');

function readChunk(regionFile, cx, cz) {
  const file = path.join(DIR, regionFile);
  if (!fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  const idx = (cx & 31) + (cz & 31) * 32;
  const ent = b.readUInt32BE(idx * 4);
  const off = (ent >>> 8) * 4096;
  if (!off) return null;
  const len = b.readUInt32BE(off);
  const type = b.readUInt8(off + 4);
  let data = b.slice(off + 5, off + 4 + len);
  if (type === 2) data = zlib.inflateSync(data);
  else if (type === 1) data = zlib.gunzipSync(data);
  else return null;
  return parseNbt(data);
}

function parseNbt(buf) {
  let p = 0;
  const rd = (n) => { const v = buf.slice(p, p + n); p += n; return v; };
  const rs = () => { const n = buf.readUInt16BE(p); p += 2; const s = buf.slice(p, p + n).toString('utf8'); p += n; return s; };
  function tag(type) {
    switch (type) {
      case 1: { const v = buf.readInt8(p); p += 1; return v; }
      case 2: { const v = buf.readInt16BE(p); p += 2; return v; }
      case 3: { const v = buf.readInt32BE(p); p += 4; return v; }
      case 4: { const v = Number(buf.readBigInt64BE(p)); p += 8; return v; }
      case 5: { const v = buf.readFloatBE(p); p += 4; return v; }
      case 6: { const v = buf.readDoubleBE(p); p += 8; return v; }
      case 7: { const n = buf.readInt32BE(p); p += 4; const v = rd(n); return v; }
      case 8: return rs();
      case 9: {
        const et = buf.readUInt8(p); p += 1;
        const n = buf.readInt32BE(p); p += 4;
        const arr = [];
        for (let i = 0; i < n; i++) arr.push(tag(et));
        return arr;
      }
      case 10: {
        const o = {};
        for (;;) {
          const t = buf.readUInt8(p); p += 1;
          if (t === 0) break;
          const name = rs();
          o[name] = tag(t);
        }
        return o;
      }
      case 11: { const n = buf.readInt32BE(p); p += 4; const a = []; for (let i = 0; i < n; i++) { a.push(buf.readInt32BE(p)); p += 4; } return a; }
      case 12: { const n = buf.readInt32BE(p); p += 4; const a = []; for (let i = 0; i < n; i++) { a.push(Number(buf.readBigInt64BE(p))); p += 8; } return a; }
      default: throw new Error('bad tag ' + type + ' at ' + p);
    }
  }
  const t = buf.readUInt8(p); p += 1;
  const name = rs();
  return tag(t);
}

function blockId(chunk, x, y, z) {
  const secs = (chunk.Level && chunk.Level.Sections) || [];
  const sy = y >> 4;
  const sec = secs.find((s) => s.Y === sy);
  if (!sec || !sec.Blocks) return null;
  const i = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
  return sec.Blocks[i];
}

const mode = process.argv[2] || 'calib';
if (mode === 'calib') {
  const c = readChunk('r.-1.0.mca', -7, 13);
  console.log('chunk(-7,13) loaded=' + !!c);
  console.log('  (-108,219,209) id=' + blockId(c, -108 & 15, 219, 209 & 15));
  console.log('  (-108,218,209) id=' + blockId(c, -108 & 15, 218, 209 & 15));
  console.log('  (-108,220,209) id=' + blockId(c, -108 & 15, 220, 209 & 15));
  console.log('  (-107,219,209) id=' + blockId(c, -107 & 15, 219, 209 & 15));
}
if (mode === 'col') {
  const bx = Number(process.argv[3]), bz = Number(process.argv[4]);
  const cx = bx >> 4, cz = bz >> 4;
  const reg = 'r.' + (cx >> 5) + '.' + (cz >> 5) + '.mca';
  const c = readChunk(reg, cx, cz);
  if (!c) { console.log('chunk missing ' + reg + ' ' + cx + ',' + cz); process.exit(0); }
  const out = [];
  let prev = null, start = 0;
  for (let y = 0; y < 256; y++) {
    const id = blockId(c, bx & 15, y, bz & 15);
    if (id !== prev) { if (prev !== null) out.push(prev + '=' + start + '..' + (y - 1)); prev = id; start = y; }
  }
  out.push(prev + '=' + start + '..255');
  console.log('col(' + bx + ',' + bz + ') ' + out.join(' '));
}

if (mode === 'scan') {
  const cx = Number(process.argv[3]), cz = Number(process.argv[4]), want = Number(process.argv[5]);
  const reg = 'r.' + (cx >> 5) + '.' + (cz >> 5) + '.mca';
  let hits = 0;
  for (let dx = 0; dx < 32; dx++) for (let dz = 0; dz < 32; dz++) {
    const x = (cx >> 5) * 32 + dx, z = (cz >> 5) * 32 + dz;
    const c = readChunk(reg, x, z);
    if (!c || !c.Level) continue;
    for (const sec of (c.Level.Sections || [])) {
      if (!sec.Blocks) continue;
      const sy = sec.Y;
      for (let i = 0; i < 4096; i++) {
        if (sec.Blocks[i] === want) {
          const lx = i & 15, lz = (i >> 4) & 15, y = (sy << 4) | (i >> 8);
          hits++;
          console.log('HIT block=(' + (x * 16 + lx) + ',' + y + ',' + (z * 16 + lz) + ')');
        }
      }
    }
  }
  console.log('scan done ' + reg + ' hits=' + hits);
}
