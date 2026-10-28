#!/usr/bin/env node
/**
 * arrowB-nbt.js — 存档级实体 NBT 读取（1.12 无 /data，实体读数走存档）
 *
 * 用法：
 *   node arrowB-nbt.js chunk <world> <dim> <cx> <cz>
 *   node arrowB-nbt.js find  <world> <dim> <x> <z> <rChunks>
 *   node arrowB-nbt.js keys  <world> <dim> <cx> <cz>       # 原始键清单
 *
 * dim: overworld | DIM-2 | DIM-1 | DIM1
 * 只认 type=etim:metal_arrow 的实体，打印八键对账面。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [mode, world, dim, a1, a2, a3, a4] = process.argv.slice(2);
if (!mode || !world) {
  console.log('usage: arrowB-nbt.js chunk|find|keys <world> <dim> <cx> <cz> | find <world> <dim> <x> <z> <r>');
  process.exit(2);
}
const dimDir = (!dim || dim === 'overworld' || dim === '-') ? '' : dim;
const WROOT = path.join(__dirname, '..', '..', 'run', 'uw2', world, dimDir, 'region');

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
      case 7: { const n = buf.readInt32BE(p); p += 4; return rd(n); }
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
  rs();
  return tag(t);
}

function readChunk(cx, cz) {
  const reg = 'r.' + (cx >> 5) + '.' + (cz >> 5) + '.mca';
  const file = path.join(WROOT, reg);
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

const num = (v, d) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(d === undefined ? 3 : d)) : String(v));
const vec = (v) => (Array.isArray(v) ? '[' + v.map((x) => num(x)).join(',') + ']' : String(v));

function arrowRow(e) {
  const keys = ['arrow_item_id', 'launcher_was_enchanted', 'shot_by_dispenser', 'pickup', 'damage', 'inGround', 'Motion', 'Pos', 'TicksInGround', 'CustomName'];
  return keys.map((k) => k + '=' + (k === 'Pos' || k === 'Motion' ? vec(e[k]) : num(e[k] === undefined ? '-' : e[k]))).join(' ');
}

function chunkArrows(cx, cz) {
  const c = readChunk(cx, cz);
  if (!c) { console.log('chunk(' + cx + ',' + cz + ') missing'); return 0; }
  const ents = (c.Level && c.Level.Entities) || [];
  const arrows = ents.filter((e) => e && e.id === 'etim:metal_arrow');
  console.log('chunk(' + cx + ',' + cz + ') entities=' + ents.length + ' metal_arrows=' + arrows.length
    + ' tileEntities=' + (((c.Level || {}).TileEntities || []).length));
  arrows.forEach((e, i) => console.log('  arrow#' + i + ' ' + arrowRow(e)));
  return arrows.length;
}

if (mode === 'rect') {
  // 矩形区块面：全部实体 {id,CustomName,Health,Fire,Pos}
  const x0 = Number(a1), z0 = Number(a2), x1 = Number(a3), z1 = Number(a4);
  const out = [];
  for (let cx = (x0 >> 4); cx <= (x1 >> 4); cx++) for (let cz = (z0 >> 4); cz <= (z1 >> 4); cz++) {
    const c = readChunk(cx, cz);
    if (!c) continue;
    ((c.Level && c.Level.Entities) || []).forEach((e) => {
      out.push({ id: e.id, CustomName: e.CustomName, Health: e.Health, Fire: e.Fire, Pos: e.Pos });
    });
  }
  console.log(JSON.stringify(out));
} else if (mode === 'player') {
  // 玩家面：usercache.json 取 uuid → playerdata/<uuid>.dat（gzip NBT）
  const cache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'run', 'uw2', 'usercache.json'), 'utf8'));
  const rec = cache.find((r) => String(r.name).toLowerCase() === String(dim || '').toLowerCase());
  if (!rec) { console.log('{"error":"no usercache entry for ' + dim + '"}'); } else {
    const f = path.join(__dirname, '..', '..', 'run', 'uw2', world, 'playerdata', rec.uuid + '.dat');
    if (!fs.existsSync(f)) { console.log('{"error":"no playerdata"}'); } else {
      const t = parseNbt(zlib.gunzipSync(fs.readFileSync(f)));
      console.log(JSON.stringify({ name: rec.name, Health: t.Health, AbsorptionAmount: t.AbsorptionAmount,
        FoodLevel: t.foodLevel, Pos: t.Pos, Motion: t.Motion, Fire: t.Fire, HurtTime: t.HurtTime }));
    }
  }
} else if (mode === 'inv') {
  // 玩家背包面：usercache → playerdata，输出 Inventory 逐格（含 ench tag）
  const cache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'run', 'uw2', 'usercache.json'), 'utf8'));
  const rec = cache.find((r) => String(r.name).toLowerCase() === String(dim || '').toLowerCase());
  if (!rec) { console.log('{"error":"no usercache entry for ' + dim + '"}'); } else {
    const f = path.join(__dirname, '..', '..', 'run', 'uw2', world, 'playerdata', rec.uuid + '.dat');
    if (!fs.existsSync(f)) { console.log('{"error":"no playerdata"}'); } else {
      const t = parseNbt(zlib.gunzipSync(fs.readFileSync(f)));
      const inv = ((t.Inventory || [])).map((it) => ({ Slot: it.Slot, id: it.id, Count: it.Count, Damage: it.Damage, tag: it.tag || null }));
      console.log(JSON.stringify({ name: rec.name, SelectedItemSlot: t.SelectedItemSlot, Inventory: inv }));
    }
  }
} else if (mode === 'ents') {
  // 机读面：扫半径内全部实体（不过滤类型），输出 {id,Fire,Health,Pos,Motion}
  const bx = Number(a1) >> 4, bz = Number(a2) >> 4, r = Number(a3) || 2;
  const out = [];
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const c = readChunk(bx + dx, bz + dz);
    if (!c) continue;
    const ents = (c.Level && c.Level.Entities) || [];
    ents.forEach((e) => {
      out.push({ id: e.id, Fire: e.Fire, Health: e.Health, Pos: e.Pos, Motion: e.Motion, CustomName: e.CustomName });
    });
  }
  console.log(JSON.stringify(out));
} else if (mode === 'json') {
  // 机读面：扫半径内全部 chunk，输出箭实体 JSON 数组（供 driver 直接解析）
  const bx = Number(a1) >> 4, bz = Number(a2) >> 4, r = Number(a3) || 3;
  const out = [];
  const KEYS = ['arrow_item_id', 'pickup', 'damage', 'inGround', 'shot_by_dispenser', 'launcher_was_enchanted', 'Pos', 'Motion'];
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const c = readChunk(bx + dx, bz + dz);
    if (!c) continue;
    const ents = (c.Level && c.Level.Entities) || [];
    ents.filter((e) => e && e.id === 'etim:metal_arrow').forEach((e) => {
      const o = { chunk: [bx + dx, bz + dz] };
      KEYS.forEach((k) => { o[k] = e[k]; });
      out.push(o);
    });
  }
  console.log(JSON.stringify(out));
} else if (mode === 'chunk') {
  chunkArrows(Number(a1), Number(a2));
} else if (mode === 'keys') {
  const c = readChunk(Number(a1), Number(a2));
  if (!c) { console.log('missing'); process.exit(0); }
  const ents = (c.Level && c.Level.Entities) || [];
  console.log('chunk(' + a1 + ',' + a2 + ') entities=' + ents.length);
  ents.forEach((e, i) => console.log('  entity#' + i + ' id=' + e.id + ' keys=' + Object.keys(e).join(',')));
} else if (mode === 'find') {
  const bx = Number(a1) >> 4, bz = Number(a2) >> 4, r = Number(a3) || 4;
  let total = 0;
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) total += chunkArrows(bx + dx, bz + dz);
  console.log('find done world=' + world + ' dim=' + (dim || 'overworld') + ' radius=' + r + ' arrows=' + total);
}
