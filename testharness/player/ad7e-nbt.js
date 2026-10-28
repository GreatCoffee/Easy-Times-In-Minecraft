/**
 * ad7e-nbt.js — 存档级 NBT 读取（1.12 无 /data，玩家背包只能从 playerdata 读）
 *
 * 用途：W11「同 id 只留一条」的机械核讫 —— 读 run/ad7e/ad7e/playerdata/<uuid>.dat
 * （gzip NBT），把 SelectedItemSlot 指向的主手物品的 ench 列表整段打印。
 *
 * 用法（CLI）：
 *   node ad7e-nbt.js ETIM_Harn01            # 打印主手 ench 与全部 ench 计数
 *   node ad7e-nbt.js ETIM_Harn01 --all      # 顺带打印背包每个带 ench 的槽
 * 模块：
 *   const { readMainhand } = require('./ad7e-nbt');
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK = process.env.AD7E_WORK || path.join(ROOT, 'run', 'ad7e');
const LEVEL = process.env.AD7E_LEVEL || 'ad7e';

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

function uuidOf(player) {
  const cache = JSON.parse(fs.readFileSync(path.join(WORK, 'usercache.json'), 'utf8'));
  const hit = cache.find((e) => e.name === player);
  if (!hit) throw new Error('player not in usercache: ' + player);
  return hit.uuid;
}

function playerFile(player) {
  return path.join(WORK, LEVEL, 'playerdata', uuidOf(player) + '.dat');
}

function enchOf(stack) {
  const list = stack && stack.tag && stack.tag.ench;
  if (!Array.isArray(list)) return [];
  return list.map((e) => ({ id: e.id, lvl: e.lvl }));
}

function readMainhand(player) {
  const file = playerFile(player);
  const nbt = parseNbt(zlib.gunzipSync(fs.readFileSync(file)));
  const inv = Array.isArray(nbt.Inventory) ? nbt.Inventory : [];
  const sel = typeof nbt.SelectedItemSlot === 'number' ? nbt.SelectedItemSlot : 0;
  const main = inv.find((s) => s.Slot === sel) || null;
  return {
    file,
    selected: sel,
    mainhand: main ? { id: main.id, count: main.Count, damage: main.Damage, ench: enchOf(main) } : null,
    inventoryEnch: inv.filter((s) => enchOf(s).length > 0).map((s) => ({ slot: s.Slot, id: s.id, ench: enchOf(s) })),
  };
}

/**
 * 甲胄四槽的服务端真值（playerdata 存档级）。
 * 1.12 槽位：100=feet 101=legs 102=chest 103=head（playerdata Inventory 的 Slot 编号）。
 */
function readArmor(player) {
  const file = playerFile(player);
  const nbt = parseNbt(zlib.gunzipSync(fs.readFileSync(file)));
  const inv = Array.isArray(nbt.Inventory) ? nbt.Inventory : [];
  const map = { head: 103, chest: 102, legs: 101, feet: 100 };
  const out = { file };
  for (const [name, slot] of Object.entries(map)) {
    const s = inv.find((it) => it.Slot === slot);
    out[name] = s ? { id: s.id, damage: typeof s.Damage === 'number' ? s.Damage : 0 } : null;
  }
  return out;
}

if (require.main === module) {
  const player = process.argv[2];
  if (!player) { console.error('usage: node ad7e-nbt.js <player> [--all]'); process.exit(2); }
  const r = readMainhand(player);
  console.log(JSON.stringify(r, null, 2));
}

module.exports = { readMainhand, readArmor, parseNbt, uuidOf, playerFile };
