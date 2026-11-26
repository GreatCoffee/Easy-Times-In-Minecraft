#!/usr/bin/env node
/**
 * 账本自检（只读）：普查卷头计数、账册条号、报告清单。
 *
 *   node testharness/tools/check-books.js
 *   node testharness/tools/check-books.js --list   （逐条列出发现，默认只列前若干）
 *
 * 硬错（退出码 1）：landed+pooled+unrecorded(+zero_port)≠total、【未立项】行数与卷头不符、账册条号重复。
 * 软错（仅提示）：唯一 [面] 行数≠total（各卷 §3 结构不同）、总账表与卷头不一致、条号跳号、
 * 已落地行 ETIM位 为空、报告未被账册/sessions 引用。
 */
const fs = require('fs');
const path = require('path');

// --root / BOOKS_ROOT lets the selftest point at a synthetic tree.
const rootArg = process.argv.indexOf('--root');
const ROOT = rootArg > 0 ? path.resolve(process.argv[rootArg + 1])
    : (process.env.BOOKS_ROOT ? path.resolve(process.env.BOOKS_ROOT) : path.resolve(__dirname, '..', '..', '..', '..'));
const CENSUS = path.join(ROOT, 'playground', 'audit', 'census');
const LEDGER = path.join(ROOT, 'playground', 'audit', '账册', '现行账.md');
const SESSIONS = path.join(ROOT, 'playground', 'sessions.md');
const REPORTS = path.join(__dirname, '..', 'reports');

const LIST = process.argv.includes('--list');
const hard = [];
const soft = [];

function read(p) {
    return fs.readFileSync(p, 'utf8').split(/\r?\n/);
}

function parseHeader(lines) {
    const out = {};
    for (const line of lines) {
        const m = /^census_([a-z_]+)=(\d+)$/.exec(line.trim());
        if (m) {
            out[m[1]] = Number(m[2]);
        }
    }
    return out;
}

function faceRows(lines) {
    const rows = new Map();
    lines.forEach((s, i) => {
        if (!s.startsWith('[面] ')) {
            return;
        }
        const body = s.slice(4);
        const cut = body.indexOf(' | ');
        const key = (cut < 0 ? body : body.slice(0, cut)).trim();
        if (!rows.has(key)) {
            rows.set(key, { line: i + 1, text: s });
        }
    });
    return rows;
}

function statusOf(text) {
    const m = /状态:([^|]*)/.exec(text);
    return m ? m[1].trim() : '';
}

// ---- A. 各卷 ----
const volumes = fs.readdirSync(CENSUS).filter((f) => f.startsWith('普查') && f.endsWith('.md')).sort();
const volumeStats = [];
for (const file of volumes) {
    const lines = read(path.join(CENSUS, file));
    const head = parseHeader(lines);
    const rows = faceRows(lines);
    const stats = { file, head, unique: rows.size, unrecorded: 0, landedNoEtim: 0 };
    if (!head.faces_total) {
        hard.push(`${file}: 缺 census_faces_total`);
        continue;
    }
    const sum = (head.landed || 0) + (head.pooled || 0) + (head.unrecorded || 0) + (head.zero_port || 0);
    if (sum !== head.faces_total) {
        hard.push(`${file}: landed+pooled+unrecorded+zp=${sum} ≠ total=${head.faces_total}`);
    }
    // 各卷 §3 结构不同（重列 vs 独立行），唯一行数只作提示，不作硬判。
    if (rows.size < head.faces_total) {
        soft.push(`${file}: 唯一 [面] 行=${rows.size} < total=${head.faces_total}（可能有面缺行）`);
    } else if (rows.size > head.faces_total) {
        soft.push(`${file}: 唯一 [面] 行=${rows.size} > total=${head.faces_total}（§3 重贴或独立行，需按档口径核对）`);
    }
    for (const [, r] of rows) {
        const st = statusOf(r.text);
        if (st === '【未立项】') {
            stats.unrecorded++;
        }
        const landedish = /已落地|已落码|判窗 PASS|parity|已裁定|已摸底/.test(st) && st !== '【未立项】';
        if (landedish && !/ETIM位:[^|]*\S/.test(r.text)) {
            stats.landedNoEtim++;
            soft.push(`${file}:${r.line} ${st} 但 ETIM位 为空`);
        }
    }
    if (stats.unrecorded !== (head.unrecorded || 0)) {
        hard.push(`${file}: 【未立项】行=${stats.unrecorded} ≠ unrecorded=${head.unrecorded}`);
    }
    volumeStats.push(stats);
}

// ---- B. 总账表 ----
const ledgerLines = read(LEDGER);
const ledgerText = ledgerLines.join('\n');
const sessionsText = read(SESSIONS).join('\n');
const grand = path.join(CENSUS, 'census-总账.md');
if (fs.existsSync(grand)) {
    const g = read(grand);
    for (const line of g) {
        const m = /^\|\s*([A-F])\s[^|]*\|\s*[^|]*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/.exec(line);
        if (!m) {
            continue;
        }
        const st = volumeStats.find((v) => v.file.includes(m[2].trim()) || v.file.startsWith('普查' + m[1]));
        if (!st) {
            soft.push(`总账 ${m[1]} 行指向 ${m[2].trim()}，未找到该卷`);
            continue;
        }
        const want = [Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])];
        const got = [st.head.faces_total, st.head.landed, st.head.pooled, st.head.unrecorded];
        if (want.join(',') !== got.join(',')) {
            soft.push(`总账 ${m[1]} 卷：合计 faces/landed/pooled/unrecorded=${want.join('/')}，卷头为 ${got.join('/')}（总账为旧快照）`);
        }
    }
}

// ---- C. 账册条号 ----
const entries = [];
ledgerLines.forEach((s, i) => {
    const m = /^### 条 (\d+)/.exec(s);
    if (m) {
        entries.push({ n: Number(m[1]), line: i + 1 });
    }
});
const seen = new Map();
for (const e of entries) {
    if (seen.has(e.n)) {
        hard.push(`账册条号重复：条 ${e.n} 在 :${seen.get(e.n)} 与 :${e.line}`);
    } else {
        seen.set(e.n, e.line);
    }
}
const nums = [...seen.keys()].sort((a, b) => a - b);
const gaps = [];
for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
        gaps.push(`${nums[i - 1]}→${nums[i]}`);
    }
}
if (gaps.length) {
    soft.push(`账册条号跳号 ${gaps.join(', ')}`);
}

// ---- D. 报告清单 ----
const reports = fs.readdirSync(REPORTS).filter((f) => f.endsWith('.md'));
const unreferenced = reports.filter((f) => !ledgerText.includes(f) && !sessionsText.includes(f));

// ---- 输出 ----
console.log(`[LedgerLog] volumes=${volumes.length} ` + volumeStats
    .map((v) => `${v.file.replace(/^普查/, '').replace(/-盘点\.md$/, '')}=${v.head.landed}/${v.head.unrecorded}`)
    .join(' ') + ` [local]`);
console.log(`[LedgerLog] entries=${entries.length} unique=${seen.size} max=${nums[nums.length - 1]} reports=${reports.length} unreferenced=${unreferenced.length}`);
console.log(`[LedgerLog] hard=${hard.length} soft=${soft.length}`);

const show = (tag, list) => {
    const take = LIST ? list : list.slice(0, 8);
    for (const s of take) {
        console.log(`[LedgerLog] ${tag} ${s}`);
    }
    if (take.length < list.length) {
        console.log(`[LedgerLog] ${tag} …另有 ${list.length - take.length} 条（--list 全列）`);
    }
};
show('HARD', hard);
show('SOFT', soft);
console.log('[LedgerLog] verdict ' + (hard.length ? 'FAIL' : 'OK'));
process.exit(hard.length ? 1 : 0);
