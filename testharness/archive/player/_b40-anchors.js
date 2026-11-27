// 会话七 · W-B40 判窗取证剪辑（只读）
// 用法: node _b40-anchors.js
const fs = require('fs');
const path = require('path');
const BL = path.join(__dirname, '..', 'build-logs');

function load(f) {
  if (!fs.existsSync(path.join(BL, f))) return null;
  return fs.readFileSync(path.join(BL, f), 'utf8').split(/\r?\n/);
}
function find(lines, re, max) {
  const out = [];
  if (!lines) return out;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) { out.push((i + 1) + ': ' + lines[i].trim()); if (max && out.length >= max) break; }
  }
  return out;
}

const b1 = load('w-b40v-b1.out');
const b2 = load('w-b40v2-b1.out');
const st = load('f11-b40-verify-r2-stdout.out');
const plan = [
  ['W1 nortface gate', b1, /\[HoeLog\] gate .*face=north/],
  ['W1 topface gate', b1, /\[HoeLog\] gate .*face=up/],
  ['W2 till damage', b1, /\[HoeLog\] till damage/],
  ['W3 lowblock', b1, /\[HoeLog\] till lowblock/],
  ['W4 mattock reject', b1, /\[HoeLog\] mattock reject/],
  ['W4 mattock till', b1, /\[HoeLog\] mattock till/],
  ['FoodLog hoeDrain', b1, /\[FoodLog\].*hoe|hoeDrain/],
  ['b1 any HoeLog (must 0)', b2, /\[HoeLog\]/],
  ['PIN', st, /^\[PIN\]/],
  ['arm a1', st, /^\[a1\]/],
  ['arm a2', st, /^\[a2\]/],
  ['arm a3', st, /^\[a3\]/],
  ['arm a4', st, /^\[a4\]/],
  ['arm b1', st, /^\[b1\]/],
  ['props', st, /^\[props\]/],
  ['done', st, /^\[done\]/],
  ['stop', st, /^\[stop\]/],
];
for (const [name, lines, re] of plan) {
  const rows = find(lines, re, 6);
  console.log('## ' + name + ' (' + rows.length + ')');
  for (const r of rows) console.log('  ' + r.slice(0, 300));
}
