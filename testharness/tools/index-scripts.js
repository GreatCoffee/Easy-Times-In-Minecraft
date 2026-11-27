#!/usr/bin/env node
/**
 * Build (or refresh) testharness/player/INDEX.md — one table row per verdict
 * script: batch, size, log channels, whether it runs on lib/harness.js, and the
 * first line of its header doc. The point is retrieval: a later batch can find
 * an existing window by face or channel instead of rewriting one.
 *
 *   node testharness/tools/index-scripts.js          # rewrite INDEX.md
 *   node testharness/tools/index-scripts.js --print  # print, do not write
 *
 * check-scripts.js fails when INDEX.md's fingerprint no longer matches the
 * scripts on disk, so the index cannot silently rot.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.env.SCRIPTS_REPO || path.resolve(__dirname, '..', '..');
const PLAYER = path.join(ROOT, 'testharness', 'player');
const INDEX = path.join(PLAYER, 'INDEX.md');
const SKIP_DIRS = new Set(['node_modules', 'lib', '.git']);

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
}

function headerLine(text) {
    const lines = text.split(/\r?\n/);
    const block = /^\s*\/\*\*?/;
    if (lines.length && block.test(lines[0])) {
        const body = [];
        for (let i = 0; i < Math.min(lines.length, 40); i++) {
            let s = lines[i].replace(/^\s*\/?\*+\s?/, '').replace(/\*\/\s*$/, '').trim();
            if (i === 0 && !s) continue;
            if (s) body.push(s);
            if (/\*\//.test(lines[i])) break;
        }
        const first = body.find((s) => s && !/^@|^eslint|^global/.test(s));
        if (first) return first;
    }
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const m = /^\s*\/\/\s*(.+)$/.exec(lines[i]);
        if (m && !/^eslint|^@ts-/.test(m[1])) return m[1].trim();
    }
    return '';
}

function analyze(file) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PLAYER, file).replace(/\\/g, '/');
    const lines = text.split(/\r?\n/).length;
    const channels = [...new Set([...text.matchAll(/\[([A-Za-z]+Log)\]/g)].map((m) => m[1]))].sort();
    const m = /^(?:[a-z]\d+-)?(b\d+[a-z0-9]*)/i.exec(path.basename(file));
    const raw = m ? m[1].toUpperCase() : '';
    const bm = /^B(\d+)([A-Z0-9]*)$/.exec(raw);
    const batch = bm ? 'B-' + bm[1] + bm[2] : raw;
    return {
        rel,
        lines,
        bytes: Buffer.byteLength(text),
        batch,
        channels,
        harness: /lib\/harness\.js/.test(text),
        doc: headerLine(text),
        scratch: /^_/.test(path.basename(file)),
        pin: /jarBytes\s*[:=]|B\d+\s*=\s*\{[^}]*head:/.test(text) ? 'frozen'
            : (/L\.PIN|mkCounts\(\)/.test(text) ? 'follow' : 'none'),
        fingerprint: rel + ':' + lines + ':' + channels.join(',') + ':' + (text.includes('lib/harness.js') ? 'h' : '-') + ':' + (/^_/.test(path.basename(file)) ? 's' : 'w') + ':' + (/jarBytes\s*[:=]|B\d+\s*=\s*\{[^}]*head:/.test(text) ? 'f' : (/L\.PIN|mkCounts\(\)/.test(text) ? 'p' : 'n')),
    };
}

function collect() {
    const rows = walk(PLAYER).map(analyze).sort((a, b) => a.rel.localeCompare(b.rel));
    const fp = crypto.createHash('sha256').update(rows.map((r) => r.fingerprint).join('\n')).digest('hex').toUpperCase();
    return { rows, fp };
}

function batchKey(b) {
    const m = /^B(\d+)([A-Z0-9]*)$/.exec(b);
    return m ? [ +m[1], m[2] ] : [ -1, b ];
}

function render(rows, fp) {
    const byBatch = new Map();
    for (const r of rows) {
        const k = r.batch || '';
        if (!byBatch.has(k)) byBatch.set(k, []);
        byBatch.get(k).push(r);
    }
    const keys = [...byBatch.keys()].filter(Boolean).sort((a, b) => {
        const [na, sa] = batchKey(a);
        const [nb, sb] = batchKey(b);
        return nb - na || sb.localeCompare(sa);
    });
    const onHarness = rows.filter((r) => r.harness).length;
    const out = [];
    out.push('# 判窗脚本索引（testharness/player）');
    out.push('');
    out.push('> 由 `node testharness/tools/index-scripts.js` 生成，请勿手改；`check-scripts.js` 会校验下方 fingerprint。');
    out.push('> 用途：按批次 / 日志通道检索现成判据，避免重写同面窗口。');
    out.push('');
    out.push('scripts=' + rows.length + ' | batches=' + keys.length + ' | onHarness=' + onHarness +
        ' | withChannel=' + rows.filter((r) => r.channels.length).length +
        ' | undocumented=' + rows.filter((r) => !r.doc).length +
        ' | scratch=' + rows.filter((r) => r.scratch).length +
        ' | pinFollow=' + rows.filter((r) => r.pin === 'follow').length +
        ' | pinFrozen=' + rows.filter((r) => r.pin === 'frozen').length);
    out.push('');
    out.push('fingerprint: `' + fp + '`');
    out.push('');
    for (const k of keys) {
        const group = byBatch.get(k);
        out.push('## ' + k + '（' + group.length + ' 份）');
        out.push('');
        out.push('| 脚本 | 行 | 通道 | pin | harness | 说明 |');
        out.push('| --- | ---: | --- | :---: | :---: | --- |');
        for (const r of group) {
            out.push('| `' + r.rel + '` | ' + r.lines + ' | ' + (r.channels.join(', ') || '—') + ' | ' + r.pin + ' | ' +
                (r.harness ? '✔' : '') + ' | ' + (r.doc.replace(/\|/g, '\\|').slice(0, 110) || '—') + ' |');
        }
        out.push('');
    }
    const loose = byBatch.get('') || [];
    out.push('## 未标批次（' + loose.length + ' 份）');
    out.push('');
    if (!loose.length) {
        out.push('（无）');
    } else {
        out.push('| 脚本 | 行 | 通道 | pin | harness | 说明 |');
        out.push('| --- | ---: | --- | :---: | :---: | --- |');
        for (const r of loose) {
            out.push('| `' + r.rel + '` | ' + r.lines + ' | ' + (r.channels.join(', ') || '—') + ' | ' + r.pin + ' | ' +
                (r.harness ? '✔' : '') + ' | ' + (r.doc.replace(/\|/g, '\\|').slice(0, 110) || '—') + ' |');
        }
    }
    out.push('');
    return out.join('\n');
}

if (require.main === module) {
const { rows, fp } = collect();
const text = render(rows, fp);
if (process.argv.includes('--print')) {
    console.log(text);
} else {
    fs.writeFileSync(INDEX, text, 'utf8');
    console.log('[ScriptLog] index written scripts=' + rows.length + ' bytes=' + Buffer.byteLength(text) + ' fingerprint=' + fp.slice(0, 12));
}
}
module.exports = { collect, render };
