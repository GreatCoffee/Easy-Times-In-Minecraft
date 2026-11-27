/**
 * ad7e-restore.js — 一次性证据修复（会话七）：从窗 A 的快照日志重建 report.w9probe。
 * 背景：窗 B 复跑 w9probe（points=0 窗）时按 pts=3.0 断言 → ok=false，并覆盖了窗 A 的条目。
 * 用法：node ad7e-restore.js <窗A快照.log>
 */
'use strict';
const fs = require('fs');
const L = require('./ad7e-lib');

const file = process.argv[2];
if (!file) { console.error('usage: node ad7e-restore.js <session-A.log>'); process.exit(2); }
const lines = fs.readFileSync(file, 'utf8').split('\n');

const idxArrow = lines.findIndex((l) => /\[EnchantLog\] carrier src=arrow immediate=EntityTippedArrow/.test(l));
if (idxArrow < 0) { console.error('arrow carrier row not found'); process.exit(1); }
const idxMelee = lines.slice(0, idxArrow).map((l, i) => (/\[EnchantLog\] carrier src=melee/.test(l) ? i : -1)).filter((i) => i >= 0).pop();
const idxThrown = idxArrow + lines.slice(idxArrow).findIndex((l) => /\[EnchantLog\] carrier src=thrown/.test(l));
const meleeLine = lines[idxMelee];
const thrownLine = lines[idxThrown];
const m = /\[RCON Client #(\d+)\//.exec(meleeLine);
const id = m ? m[1] : null;
const block = id ? lines.filter((l) => l.includes('[RCON Client #' + id + '/')) : [];
const text = block.join('\n');

const rows = {
  melee: L.parseCarrier(meleeLine)[0] || null,
  arrow: L.parseCarrier(lines[idxArrow])[0] || null,
  thrown: L.parseCarrier(thrownLine)[0] || null,
};
const probe = L.parseProbe(text)[0] || null;
const windows = L.parseWindows(text);
const table = L.parseTable(text);
const ok = !!probe && probe.canApply === true && !!rows.melee && rows.melee.level === 3
  && Math.abs(rows.melee.pts - 3.0) < 1e-6
  && !!rows.arrow && rows.arrow.immediate === 'EntityTippedArrow' && Math.abs(rows.arrow.pts) < 1e-9
  && !!rows.thrown && rows.thrown.immediate === 'EntitySnowball' && Math.abs(rows.thrown.pts) < 1e-9;

const rep = L.loadReport();
rep.w9probe = { rows, first: { probe, windows, table }, restoredFrom: file, ok };
L.saveReport(rep);
console.log(JSON.stringify(rep.w9probe, null, 1));
