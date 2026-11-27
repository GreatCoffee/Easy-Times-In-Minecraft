// B3 W1 · [EquipLog] boot-dump diff (B2 fix-batch jar 504,479 B vs B3 jar 529,601 B).
// Proves the B3 批文 W1 face: exactly +21 rows (18 rusted gear + shears + arrow + chain),
// and the pre-existing 95 rows (90 gear + 5 material) are byte-identical.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OLD = process.argv[2] || path.join(ROOT, 'build-logs', 'b2r-boot.log');
const NEW = process.argv[3] || path.join(ROOT, 'build-logs', 'b3r-boot.log');
const OUT = path.join(ROOT, 'build-logs', 'b3r-equip-diff.json');

const RE = /\[EquipLog\] (gear|material) item=(\S+)(.*)$/;
function rows(file) {
  const map = new Map();
  for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = RE.exec(l);
    if (!m) continue;
    map.set(m[2], { kind: m[1], body: m[3].trim(), raw: l.replace(/^.*\[EquipLog\] /, '[EquipLog] ') });
  }
  return map;
}
const a = rows(OLD);
const b = rows(NEW);
const changed = [];
const onlyOld = [];
const onlyNew = [];
for (const [k, v] of a) {
  if (!b.has(k)) { onlyOld.push(k); continue; }
  if (b.get(k).body !== v.body) changed.push({ item: k, old: v.raw, now: b.get(k).raw });
}
for (const [k, v] of b) if (!a.has(k)) onlyNew.push({ item: k, kind: v.kind, raw: v.raw });

const out = {
  old: OLD, new: NEW,
  oldRows: a.size, newRows: b.size,
  changedCount: changed.length, changed,
  onlyOld, onlyNew,
  unchangedCount: a.size - changed.length - onlyOld.length,
  addedCount: onlyNew.length,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify({
  oldRows: out.oldRows, newRows: out.newRows, changedCount: out.changedCount,
  unchangedCount: out.unchangedCount, addedCount: out.addedCount,
  onlyOld: out.onlyOld, onlyNew: out.onlyNew.map((x) => x.item),
}, null, 2));
for (const c of changed) console.log('CHANGED ' + c.item + '\n  old: ' + c.old + '\n  now: ' + c.now);
