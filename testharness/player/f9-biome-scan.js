#!/usr/bin/env node
/**
 * f9-biome-scan.js - offline region scan for a target biome (desert=2 by default).
 * Reads .mca headers + zlib-inflated chunk NBT, pulls Level/Biomes (256 bytes,
 * one per block column in 1.12) and reports hit columns + a "safe" spot whose
 * 5x5 column neighbourhood is all target biome.
 *
 * usage: node f9-biome-scan.js <worldDir> [biomeId] [maxReport]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readNbt(buf) {
  let p = 0;
  function u1() { return buf[p++]; }
  function i1() { const v = buf.readInt8(p); p += 1; return v; }
  function i2() { const v = buf.readInt16BE(p); p += 2; return v; }
  function i4() { const v = buf.readInt32BE(p); p += 4; return v; }
  function i8() { const v = buf.readBigInt64BE(p); p += 8; return v; }
  function f4() { const v = buf.readFloatBE(p); p += 4; return v; }
  function f8() { const v = buf.readDoubleBE(p); p += 8; return v; }
  function str() { const n = buf.readUInt16BE(p); p += 2; const s = buf.toString('utf8', p, p + n); p += n; return s; }
  function payload(type) {
    switch (type) {
      case 1: return i1();
      case 2: return i2();
      case 3: return i4();
      case 4: return i8();
      case 5: return f4();
      case 6: return f8();
      case 7: { const n = i4(); const v = buf.subarray(p, p + n); p += n; return v; }
      case 8: return str();
      case 9: { const et = u1(); const n = i4(); const a = []; for (let i = 0; i < n; i++) a.push(payload(et)); return a; }
      case 10: { const o = {}; for (;;) { const t = u1(); if (t === 0) break; const name = str(); o[name] = payload(t); } return o; }
      case 11: { const n = i4(); const a = []; for (let i = 0; i < n; i++) a.push(i4()); return a; }
      case 12: { const n = i4(); const a = []; for (let i = 0; i < n; i++) a.push(i8()); return a; }
      default: throw new Error('bad tag type ' + type + ' @' + p);
    }
  }
  const type = u1();
  if (type !== 10) throw new Error('root not compound');
  str();
  return payload(10);
}

function main() {
  const dir = path.resolve(process.argv[2] || 'run/world');
  const target = Number(process.argv[3] || 2);
  const maxReport = Number(process.argv[4] || 8);
  const rd = path.join(dir, 'region');
  if (!fs.existsSync(rd)) { console.log('no region dir: ' + rd); process.exit(1); }
  const files = fs.readdirSync(rd).filter((f) => f.endsWith('.mca'));
  let chunks = 0, hits = 0;
  const counts = {};
  const map = new Map(); // "x,z" -> biome id
  for (const f of files) {
    const m = /^r\.(-?\d+)\.(-?\d+)\.mca$/.exec(f);
    if (!m) continue;
    const rx = Number(m[1]), rz = Number(m[2]);
    const buf = fs.readFileSync(path.join(rd, f));
    for (let ci = 0; ci < 1024; ci++) {
      const o = buf.readUIntBE(ci * 4, 3);
      const sz = buf.readUIntBE(ci * 4 + 3, 1);
      if (!o || !sz) continue;
      const start = o * 4096;
      if (start + 5 > buf.length) continue;
      const len = buf.readInt32BE(start);
      if (len <= 0 || start + 4 + len > buf.length) continue;
      const comp = buf[start + 4];
      let raw;
      try { raw = comp === 1 ? zlib.inflateRawSync(buf.subarray(start + 5, start + 4 + len)) : zlib.inflateSync(buf.subarray(start + 5, start + 4 + len)); }
      catch (e) { continue; }
      let nbt;
      try { nbt = readNbt(raw); } catch (e) { continue; }
      chunks++;
      const lvl = nbt.Level || nbt;
      const biomes = lvl.Biomes;
      if (!biomes || !biomes.length) continue;
      const cx = rx * 32 + (ci % 32), cz = rz * 32 + Math.floor(ci / 32);
      for (let i = 0; i < 256; i++) {
        const id = biomes[i];
        counts[id] = (counts[id] || 0) + 1;
        const bx = cx * 16 + (i % 16), bz = cz * 16 + Math.floor(i / 16);
        map.set(bx + ',' + bz, id);
        if (id === target) hits++;
      }
    }
  }
  const safe = [];
  for (const [key, id] of map) {
    if (id !== target) continue;
    const [x, z] = key.split(',').map(Number);
    let ok = true;
    for (let dx = -2; dx <= 2 && ok; dx++) {
      for (let dz = -2; dz <= 2 && ok; dz++) {
        if (map.get((x + dx) + ',' + (z + dz)) !== target) ok = false;
      }
    }
    if (ok) {
      // prefer spots near origin for cheap chunk travel
      safe.push({ x, z, d: Math.abs(x) + Math.abs(z) });
    }
  }
  safe.sort((a, b) => a.d - b.d);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(JSON.stringify({
    dir, target, files: files.length, chunks, hits,
    topBiomes: top.map(([id, n]) => ({ id: Number(id), n })),
    safe5x5: safe.slice(0, maxReport),
    safeCount: safe.length,
  }, null, 1));
}

main();
