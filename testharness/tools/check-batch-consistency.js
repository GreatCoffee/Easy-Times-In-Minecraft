#!/usr/bin/env node
/**
 * 批次一致性校对（B-70VC）。
 *
 * 五份文书说的是不是同一件事：
 *   工单（面集） → 判窗正本（逐面结论） → census（翻面与批次标记）
 *                → 账册（条 N · B-xx） → sessions（## B-xx）
 *
 * 只校对「可机械判定」的四件事：
 *   V  产品批（工单面数 > 0）必须有 `<batch>-verify-verdict.md`
 *   F  工单里每个面键都要在正本里出现
 *   L  每个面键在 census 里为【已落地】且本行带该批次标记
 *   B  账册有一条 `### 条 N · B-xx`；sessions 有 `## B-xx`
 * 工装批（0 面）只查 B。
 *
 * 老批次的问题冻结在 `batch-consistency-baseline.json`，只拦新增。
 *
 * 用法：
 *   node testharness/tools/check-batch-consistency.js --batch B-71
 *   node testharness/tools/check-batch-consistency.js --all
 *   node testharness/tools/check-batch-consistency.js --all --update-baseline
 *   node testharness/tools/check-batch-consistency.js --all --list
 *
 * 环境变量：CONSIST_ROOT / CONSIST_REPO / CONSIST_BASELINE
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.CONSIST_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const REPO = process.env.CONSIST_REPO || path.resolve(__dirname, '..', '..');
const BOOKS = path.join(ROOT, 'playground', 'audit', 'census');
const LEDGER = path.join(ROOT, 'playground', 'audit', '账册', '现行账.md');
const SESSIONS = path.join(ROOT, 'playground', 'sessions.md');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const BASELINE = process.env.CONSIST_BASELINE || path.join(__dirname, 'batch-consistency-baseline.json');
const ORDER = path.join(BOOKS, '批次工单.md');

function slugOf(batch) {
    return batch.toLowerCase().replace(/^b-/, 'b');
}

/** 工单：batch -> { faces: ['C:141', ...], count } */
function workOrder() {
    const out = new Map();
    if (!fs.existsSync(ORDER)) return out;
    const lines = fs.readFileSync(ORDER, 'utf8').split(/\r?\n/);
    let cur = null;
    for (const line of lines) {
        const h = line.match(/^###\s+(B-\d+[A-Z]*(?:-\d+)?)\s*[（(](\d+)\s*面/);
        if (h) {
            cur = { batch: h[1], count: Number(h[2]), faces: [] };
            out.set(cur.batch, cur);
            continue;
        }
        if (/^###\s+/.test(line)) { cur = null; continue; }
        if (!cur) continue;
        const f = line.match(/`([A-F]:\d+)`/);
        if (f) cur.faces.push(f[1]);
    }
    return out;
}

/** census：行级状态与批次标记。face key -> { landed, batches:Set } */
function volLetter(file) {
    const m = file.match(/普查([A-F])/);
    return m ? m[1] : null;
}

/** 面键 = 卷字母 + 该卷文件的 1-based 行号（与 check-faces 同口径） */
function censusIndex() {
    const idx = new Map();
    if (!fs.existsSync(BOOKS)) return idx;
    for (const f of fs.readdirSync(BOOKS).filter((x) => x.endsWith('.md'))) {
        const vol = volLetter(f);
        if (!vol) continue;
        const lines = fs.readFileSync(path.join(BOOKS, f), 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
            if (!line.includes('[面]')) return;
            const key = vol + ':' + (i + 1);
            const landed = line.includes('【已落地】');
            const batches = new Set((line.match(/B-\d+[A-Z]*(?:-\d+)?/g) || []));
            const prev = idx.get(key);
            idx.set(key, { landed, batches: new Set([...(prev ? prev.batches : []), ...batches]) });
        });
    }
    return idx;
}

function ledgerBatches() {
    if (!fs.existsSync(LEDGER)) return [];
    const out = new Set();
    for (const line of fs.readFileSync(LEDGER, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^###\s*条\s*\d+\s*·\s*(B-\d+[A-Z]*(?:-\d+)?)/);
        if (m) out.add(m[1]);
    }
    return [...out];
}

function censusFacesOf(batch) {
    if (!fs.existsSync(BOOKS)) return [];
    const out = new Set();
    for (const f of fs.readdirSync(BOOKS).filter((x) => x.endsWith('.md'))) {
        const text = fs.readFileSync(path.join(BOOKS, f), 'utf8');
        for (const line of text.split(/\r?\n/)) {
            const m = line.match(/\[面\]\s*([A-F]):(\d+)/);
            if (!m || !line.includes('【已落地】')) continue;
            const marks = line.match(/B-\d+[A-Z]*(?:-\d+)?/g) || [];
            if (marks.includes(batch)) out.add(m[1] + ':' + m[2]);
        }
    }
    return [...out];
}

function hasLedger(batch) {
    if (!fs.existsSync(LEDGER)) return false;
    return new RegExp('^###\\s*条\\s*\\d+\\s*·\\s*' + batch + '\\b', 'm').test(fs.readFileSync(LEDGER, 'utf8'));
}

function hasSessions(batch) {
    if (!fs.existsSync(SESSIONS)) return false;
    return new RegExp('^##\\s*' + batch + '\\b', 'm').test(fs.readFileSync(SESSIONS, 'utf8'));
}

function verdictText(batch) {
    const p = path.join(REPORTS, slugOf(batch) + '-verify-verdict.md');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function auditBatch(batch, wo, census) {
    const issues = [];
    const text = verdictText(batch);
    const woFaces = wo ? wo.faces : [];
    const faces = [...new Set([...woFaces, ...censusFacesOf(batch)])];
    if (!text && faces.length) issues.push('V no verdict file (' + slugOf(batch) + '-verify-verdict.md)');
    if (faces.length) {
        for (const key of faces) {
            if (text && !text.includes(key)) issues.push('F ' + key + ' missing in verdict');
            if (!woFaces.includes(key)) continue; // census 反推出的面必然已落地
            const row = census.get(key);
            if (!row) issues.push('L ' + key + ' not found in census');
            else if (!row.landed) issues.push('L ' + key + ' not landed');
            else if (!row.batches.has(batch)) issues.push('L ' + key + ' landed but not marked ' + batch);
        }
    }
    if (!hasLedger(batch)) issues.push('B no ledger entry');
    if (!hasSessions(batch)) issues.push('B no sessions section');
    return issues;
}

function loadBaseline() {
    if (!fs.existsSync(BASELINE)) return null;
    try {
        return new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8')).batches || []);
    } catch (e) {
        return null;
    }
}

function main() {
    const argv = process.argv.slice(2);
    const list = argv.includes('--list');
    const update = argv.includes('--update-baseline');
    const one = argv.indexOf('--batch') >= 0 ? argv[argv.indexOf('--batch') + 1] : null;

    if (!fs.existsSync(ORDER)) {
        console.log('[ConsistLog] SKIP work order absent');
        return 0;
    }

    const wo = workOrder();
    const census = censusIndex();
    const targets = one ? [one] : [...new Set([...ledgerBatches(), ...wo.keys()])];

    const failed = [];
    let skipped = 0;
    for (const b of targets) {
        const w = wo.get(b) || null;
        if (!w && !hasLedger(b)) { console.log('[ConsistLog] unknown batch ' + b); continue; }
        // 未开工的批次（还没有正本、账册条、且工单面一个都没翻）不参与校对。
        const faces = w ? w.faces : [];
        const started = verdictText(b) || hasLedger(b)
            || faces.some((k) => { const r = census.get(k); return r && r.landed; });
        if (!started) { skipped++; continue; }
        const issues = auditBatch(b, w, census);
        if (issues.length) failed.push({ batch: b, issues });
    }

    if (update) {
        const body = {
            note: '既有批次的文书缺口（只拦新增）。补齐后从本表删除。',
            batches: failed.map((x) => x.batch).sort(),
        };
        fs.writeFileSync(BASELINE, JSON.stringify(body, null, 2) + '\n', 'utf8');
        console.log('[ConsistLog] baseline written batches=' + body.batches.length);
        return 0;
    }

    const baseline = loadBaseline();
    if (baseline === null) {
        console.log('[ConsistLog] baseline missing: run once with --all --update-baseline');
        return 1;
    }

    const fresh = failed.filter((x) => !baseline.has(x.batch));
    if (list) {
        for (const x of failed) {
            const tag = baseline.has(x.batch) ? 'BASE' : 'NEW ';
            console.log('[ConsistLog] ' + tag + ' ' + x.batch + ' :: ' + x.issues.join(' | '));
        }
    }
    for (const x of fresh) console.log('[ConsistLog] FAIL ' + x.batch + ' :: ' + x.issues.join(' | '));
    const stale = [...baseline].filter((b) => !failed.some((x) => x.batch === b));
    if (stale.length) console.log('[ConsistLog] baseline can shrink by ' + stale.length + ': ' + stale.join(','));

    console.log('[ConsistLog] batches=' + targets.length + ' checked=' + (targets.length - skipped) + ' skipped=' + skipped + ' withIssues=' + failed.length +
        ' baseline=' + baseline.size + ' fresh=' + fresh.length +
        ' verdict ' + (fresh.length ? 'RISK' : 'OK'));
    return fresh.length ? 1 : 0;
}

module.exports = { workOrder, censusIndex, auditBatch, slugOf };

if (require.main === module) {
    try {
        process.exit(main());
    } catch (e) {
        console.error('[ConsistLog] error ' + e.message);
        process.exit(2);
    }
}
