#!/usr/bin/env node
/**
 * biome-scan.js — offline biome reader for the pinned test world (session 7).
 *
 * Reads the overworld anvil region files (1.12.2: zlib chunk payloads, NBT
 * Level.Biomes byteArray of 256, order z*16+x), maps ids through
 * minecraft-data 1.12.2, and prints:
 *   1) per-biome chunk counts + the chunk bbox,
 *   2) a coarse grid of "col,row -> biome name" over the generated area,
 *   3) every jungle-family chunk (id + center block coords) so a spawn window
 *      can be anchored without teleport-probing the server.
 *
 * Read-only: never writes the world.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const nbt = require('prismarine-nbt');
const mcData = require('minecraft-data')('1.12.2');

const WORLD = path.resolve(__dirname, '..', '..', 'run', 'obfuscated-server', 'testw2h');
const REGION_DIR = path.join(WORLD, 'region');

const biomeById = {};
for (const b of mcData.biomesArray) biomeById[b.id] = b;

function readChunkBiomes(buf, ctor) {
  // header: 4096 location table (offset 3B + sectors 1B) + 4096 timestamps
  const entry = buf.readUInt32BE(ctor * 4);
  if (entry === 0) return null;
  const sector = entry >>> 8;
  const offset = sector * 4096;
  if (offset + 5 > buf.length) return null;
  const len = buf.readUInt32BE(offset);
  if (len === 0 || offset + 4 + len > buf.length) return null;
  const comp = buf.readUInt8(offset + 4);
  const payload = buf.subarray(offset + 5, offset + 4 + len);
  let raw;
  try {
    if (comp === 1) raw = zlib.gunzipSync(payload);
    else if (comp === 2) raw = zlib.inflateSync(payload);
    else return null; // comp 3 = uncompressed (rare)
  } catch (e) { return null; }
  return raw;
}

(async () => {
  const files = fs.readdirSync(REGION_DIR).filter((f) => /^r\.(-?\d+)\.(-?\d+)\.mca$/.test(f));
  const chunks = []; // {cx, cz, biomes:Uint8Array}
  for (const f of files) {
    const m = f.match(/^r\.(-?\d+)\.(-?\d+)\.mca$/);
    const rx = parseInt(m[1], 10), rz = parseInt(m[2], 10);
    const buf = fs.readFileSync(path.join(REGION_DIR, f));
    for (let i = 0; i < 1024; i++) {
      const raw = readChunkBiomes(buf, i);
      if (!raw) continue;
      let parsed;
      try {
        const res = await nbt.parse(raw);
        parsed = nbt.simplify(res.parsed);
      } catch (e) { continue; }
      const level = parsed && parsed.Level;
      if (!level || !level.Biomes) continue;
      const arr = level.Biomes;
      if (arr.length !== 256) continue; // int-array (1.13+) or unexpected
      chunks.push({ cx: rx * 32 + (i % 32), cz: rz * 32 + Math.floor(i / 32), biomes: arr });
    }
  }

  const counts = new Map();
  const bbox = new Map();
  for (const c of chunks) {
    const seen = new Set();
    for (let k = 0; k < 256; k++) seen.add(c.biomes[k]);
    for (const id of seen) {
      counts.set(id, (counts.get(id) || 0) + 1);
      const b = bbox.get(id); // chunk bbox
      if (!b) bbox.set(id, { x0: c.cx, x1: c.cx, z0: c.cz, z1: c.cz });
      else {
        b.x0 = Math.min(b.x0, c.cx); b.x1 = Math.max(b.x1, c.cx);
        b.z0 = Math.min(b.z0, c.cz); b.z1 = Math.max(b.z1, c.cz);
      }
    }
  }

  console.log(`chunks read: ${chunks.length} from ${files.length} region file(s)`);
  console.log('--- per-biome chunk counts (sorted by count desc) ---');
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of rows) {
    const b = bbox.get(id);
    const name = (biomeById[id] && biomeById[id].name) || ('id' + id);
    console.log(`${String(n).padStart(5)}  id=${String(id).padStart(2)}  ${name.padEnd(28)} chunkbox x[${b.x0}..${b.x1}] z[${b.z0}..${b.z1}]`);
  }

  console.log('--- jungle-family chunk centers ---');
  const JUNGLE = new Set([21, 22, 23, 149, 151]); // jungle, jungle_hills, jungle_edge, mutated_jungle, mutated_jungle_edge
  let shown = 0;
  for (const c of chunks) {
    const hit = [];
    for (let k = 0; k < 256; k++) if (JUNGLE.has(c.biomes[k])) hit.push(k);
    if (!hit.length) continue;
    const bx = c.cx * 16, bz = c.cz * 16;
    // dominant jungle column in this chunk (first hit)
    const k = hit[0];
    console.log(`chunk (${c.cx},${c.cz}) jungleCells=${hit.length}/256 first=(x=${bx + (k % 16)},z=${bz + Math.floor(k / 16)}) ids=${[...new Set(hit.map((i2) => c.biomes[i2]))].join('/')}`);
    if (++shown >= 60) { console.log('... (truncated at 60 jungle chunks)'); break; }
  }
  if (!shown) console.log('NO jungle chunk in the generated area');

  // coarse grid around the arena: every 4 chunks, name of the biome at the
  // chunk's first cell — enough to eyeball where the clusters are.
  console.log('--- coarse grid (each cell = 4x4 chunks, biome at top-left cell) ---');
  const byCoord = new Map(chunks.map((c) => [c.cx + ',' + c.cz, c]));
  const xs = [...new Set(chunks.map((c) => c.cx))].sort((a, b) => a - b);
  const zs = [...new Set(chunks.map((c) => c.cz))].sort((a, b) => a - b);
  const x0 = Math.floor(xs[0] / 4) * 4, x1 = Math.floor(xs[xs.length - 1] / 4) * 4;
  const z0 = Math.floor(zs[0] / 4) * 4, z1 = Math.floor(zs[zs.length - 1] / 4) * 4;
  const abbr = (id) => {
    const n = (biomeById[id] && biomeById[id].name) || ('id' + id);
    return n.replace('minecraft:', '').slice(0, 6).padEnd(6);
  };
  let head = '        ';
  for (let x = x0; x <= x1; x += 4) head += String(x).padStart(7);
  console.log(head);
  for (let z = z0; z <= z1; z += 4) {
    let line = String(z).padStart(7) + ' ';
    for (let x = x0; x <= x1; x += 4) {
      const c = byCoord.get(x + ',' + z);
      line += (c ? abbr(c.biomes[0]) : '  .   ') + ' ';
    }
    console.log(line);
  }
})().catch((e) => { console.error(e); process.exit(1); });
