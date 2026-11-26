#!/usr/bin/env node
/**
 * Read-only audit of the verdict-script corpus against testharness/player/INDEX.md.
 *
 * Hard failure (exit 1): INDEX.md missing, or its fingerprint no longer matches
 * the scripts on disk — the index must be regenerated with index-scripts.js so
 * retrieval never lies about what exists.
 *
 * Warnings (report only, exit 0): S1 no header doc, S3 no [XxxLog] channel, so
 * the debt is visible without blocking older scripts from being committed.
 *
 *   node testharness/tools/check-scripts.js
 *   node testharness/tools/check-scripts.js --list
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { collect } = require('./index-scripts.js');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'testharness', 'player', 'INDEX.md');
const list = process.argv.includes('--list');

const { rows, fp } = collect();

let stale = 0;
if (!fs.existsSync(INDEX)) {
    stale = 1;
    console.log('[ScriptLog] INDEX.md missing — run node testharness/tools/index-scripts.js');
} else {
    const text = fs.readFileSync(INDEX, 'utf8');
    const m = /fingerprint: `([0-9A-F]{64})`/.exec(text);
    if (!m || m[1] !== fp) {
        stale = 1;
        console.log('[ScriptLog] INDEX.md stale — disk `' + fp + '` vs index `' + (m ? m[1] : 'none') + '`');
    }
}

const undocumented = rows.filter((r) => !r.doc);
const nochannel = rows.filter((r) => !r.channels.length);
const loose = rows.filter((r) => !r.batch);

console.log('[ScriptLog] scripts=' + rows.length + ' harness=' + rows.filter((r) => r.harness).length +
    ' batchNamed=' + rows.filter((r) => r.batch).length + ' undocumented=' + undocumented.length +
    ' nochannel=' + nochannel.length + ' scratch=' + rows.filter((r) => r.scratch).length +
    ' pinFollow=' + rows.filter((r) => r.pin === 'follow').length +
    ' pinFrozen=' + rows.filter((r) => r.pin === 'frozen').length + ' stale=' + stale + ' [local]');
if (list) {
    for (const r of undocumented.slice(0, 40)) console.log('[ScriptLog] S1 undocumented ' + r.rel);
    if (undocumented.length > 40) console.log('[ScriptLog] S1 … +' + (undocumented.length - 40) + ' more');
    for (const r of nochannel.slice(0, 20)) console.log('[ScriptLog] S3 nochannel ' + r.rel);
    if (nochannel.length > 20) console.log('[ScriptLog] S3 … +' + (nochannel.length - 20) + ' more');
    for (const r of loose.slice(0, 20)) console.log('[ScriptLog] S4 loose-batch ' + r.rel);
    if (loose.length > 20) console.log('[ScriptLog] S4 … +' + (loose.length - 20) + ' more');
}
const frozenBig = rows.filter((r) => r.pin === 'frozen' && r.lines >= 400);
if (list) for (const r of frozenBig) console.log('[ScriptLog] S6 frozen-pin ' + r.rel + ' (' + r.lines + ' 行，硬编码旧 jar，直接重跑会 PIN 失败)');
console.log('[ScriptLog] verdict ' + (stale ? 'FAIL' : 'OK'));
process.exit(stale ? 1 : 0);
