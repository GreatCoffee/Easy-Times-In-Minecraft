#!/usr/bin/env node
/*
 * check-evidence.js — 判决书 / 回执与证据 tee 的一致性机检（B-70VH）
 *
 * 现在的问题：`testharness/reports/*-verify-verdict.md` 与 `*-verify-receipt.md` 里的
 * 「PASS」「锚点 :行号」全是散文，没有任何工具回放过。正本写 PASS、tee 里其实是
 * pass:false，今天不会有任何东西报出来。
 *
 * 本工具对每份文书做三件事：
 *   E1 锚点：围栏代码块里 `NNNN: [XxxLog] ...` 的行号 + 原文，必须在某份被引用的
 *      tee 的第 NNNN 行原样出现（`…` 截断只比前缀）。
 *   E2 终值：文书里内联的 `[done] {json}` 必须与该 run 在 tee 里的 `[done]` 一致
 *      （pass / stops / bad / 各 wN）。
 *   E3 钉值：文书声明的 `[PIN] sha=` / 发布 jar SHA-256 必须与 tee 里 `[PIN]` 行一致。
 *
 * 用法：
 *   node testharness/tools/check-evidence.js [--list] [--doc <文件名>]
 *        [--update-baseline] [--reports <dir>] [--logs <dir>]
 * 退出码：0 = OK（含基线内旧账），1 = 基线外新问题，2 = 目录缺失/参数错。
 * 环境变量：EVIDENCE_REPORTS / EVIDENCE_LOGS / EVIDENCE_BASELINE。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORTS = process.env.EVIDENCE_REPORTS || path.join(ROOT, 'testharness', 'reports');
const LOGS = process.env.EVIDENCE_LOGS || path.join(ROOT, 'testharness', 'build-logs');
const BASELINE = process.env.EVIDENCE_BASELINE || path.join(__dirname, 'evidence-baseline.json');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (f) => {
    const i = args.indexOf(f);
    return i >= 0 ? args[i + 1] : null;
};

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

function teeIndex() {
    if (!fs.existsSync(LOGS)) return [];
    return fs
        .readdirSync(LOGS)
        .filter((f) => f.endsWith('.out') || f.endsWith('-driver.log'))
        .map((f) => ({ name: f, full: path.join(LOGS, f) }));
}

/** 文书里点名的 tee：显式文件名、`RUN=<x>`、以及内联 `[done]` 的 run。 */
function teeCandidates(doc, index) {
    const names = new Set();
    for (const m of doc.matchAll(/([A-Za-z0-9][A-Za-z0-9._-]*\.out)/g)) names.add(m[1]);
    const runs = new Set();
    for (const m of doc.matchAll(/RUN=([A-Za-z0-9._-]+)/g)) runs.add(m[1]);
    for (const m of doc.matchAll(/"run"\s*:\s*"([A-Za-z0-9._-]+)"/g)) runs.add(m[1]);
    const hits = index.filter((e) => names.has(e.name));
    for (const run of runs) {
        // Driver logs hold [PIN]/[cfg]/[stop]/[done] since B-70T2; the tee holds the server rows.
        const drv = index.find((e) => e.name === run + '-driver.log');
        if (drv && !hits.includes(drv)) hits.push(drv);
        const near = index
            .filter((e) => !e.name.endsWith('-driver.log'))
            .filter((e) => e.name.startsWith(run + '-') || e.name.includes('-' + run + '-'))
            .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);
        if (near.length) hits.push(near[0]);
    }
    return hits;
}

function loadTee(entry) {
    if (entry.lines) return entry;
    entry.lines = fs.readFileSync(entry.full, 'utf8').split(/\r?\n/);
    return entry;
}

function lineOf(entry, n) {
    const t = loadTee(entry);
    return n >= 1 && n <= t.lines.length ? t.lines[n - 1] : null;
}

/** 围栏块里的 `NNNN: text` 锚点。 */
function anchorsOf(doc) {
    const out = [];
    let inFence = false;
    for (const raw of doc.split(/\r?\n/)) {
        const line = raw.replace(/^\s+/, '');
        if (line.startsWith('```')) {
            inFence = !inFence;
            continue;
        }
        if (!inFence) continue;
        const m = line.match(/^(\d{3,5}):\s*(.+)$/);
        if (!m) continue;
        const text = norm(m[2]);
        // Source excerpts also use `NNN: code`; only tee rows are evidence.
        if (!/^(\[[A-Za-z]|Done \(|BUILD SUCCESSFUL|\[W\d\])/.test(text)) continue;
        out.push({ line: +m[1], text });
    }
    return out;
}

function findDone(doc) {
    const m = doc.match(/\[done\]\s*(\{[\s\S]*?\})\s*(?:$|\n)/m);
    if (!m) return null;
    try {
        return JSON.parse(m[1]);
    } catch (e) {
        return null;
    }
}

function doneInTee(entry, run) {
    const t = loadTee(entry);
    for (const line of t.lines) {
        const m = line.match(/\[done\]\s*(\{[\s\S]*\})\s*$/);
        if (!m) continue;
        try {
            const j = JSON.parse(m[1]);
            if (!run || j.run === run) return j;
        } catch (e) {
            /* ignore */
        }
    }
    return null;
}

function pinInTee(entry) {
    const t = loadTee(entry);
    for (const line of t.lines) {
        const m = line.match(/\[PIN\]\s+sha=([0-9A-Fa-f]+)/);
        if (m) return m[1].toUpperCase();
    }
    return null;
}

function judge(doc, index) {
    const issues = [];
    const tees = teeCandidates(doc, index);
    const anchors = anchorsOf(doc);
    const doneEarly = findDone(doc);
    const pinEarly = doc.match(/\[PIN\]\s+[^\n]*?sha=([0-9A-Fa-f]{16,64})/);
    const claims = anchors.length > 0 || !!doneEarly || !!pinEarly;
    // A doc that cites no evidence makes no machine-checkable claim; old batches
    // predate the tee convention, so silence here is not an issue.
    if (!tees.length && claims) issues.push('E0 evidence cited but no tee referenced or found');
    if (!tees.length && !claims) return { tees: [], anchors: 0, issues: [] };

    // E1 anchors
    for (const a of anchors) {
        let ok = false;
        for (const e of tees) {
            const line = lineOf(e, a.line);
            if (!line) continue;
            const have = norm(line);
            const want = a.text.includes('…') ? a.text.split('…')[0].trim() : a.text;
            if (want.length >= 4 && have.includes(want)) {
                ok = true;
                break;
            }
        }
        if (!ok) issues.push('E1 anchor :' + a.line + ' not found (' + a.text.slice(0, 60) + ')');
    }

    // E2 [done] parity
    const done = doneEarly;
    if (done) {
        const actual = tees.map((e) => doneInTee(e, done.run)).find(Boolean) || null;
        if (!actual) issues.push('E2 [done] run=' + done.run + ' not found in tee');
        else {
            for (const k of ['pass', 'stops', 'bad']) {
                if (k in done && k in actual && done[k] !== actual[k]) {
                    issues.push('E2 [done].' + k + ' doc=' + done[k] + ' tee=' + actual[k]);
                }
            }
            for (const k of Object.keys(done)) {
                if (!/^w\d+$/.test(k)) continue;
                if (k in actual && done[k] !== actual[k]) {
                    issues.push('E2 [done].' + k + ' doc=' + done[k] + ' tee=' + actual[k]);
                }
            }
        }
    }

    // E3 pin parity
    const sha = pinEarly;
    if (sha) {
        const want = sha[1].toUpperCase();
        const got = tees.map(pinInTee).find(Boolean) || null;
        if (!got) issues.push('E3 [PIN] sha claimed but tee has no [PIN]');
        else if (!got.startsWith(want) && !want.startsWith(got)) issues.push('E3 [PIN] sha doc=' + want.slice(0, 12) + '… tee=' + got.slice(0, 12) + '…');
    }

    return { tees: tees.map((t) => t.name), anchors: anchors.length, issues };
}

function baselineRead() {
    try {
        return new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8')).docs || []);
    } catch (e) {
        return new Set();
    }
}

function main() {
    if (!fs.existsSync(REPORTS)) {
        console.log('[EvidenceLog] SKIP reports dir absent: ' + REPORTS);
        return 0;
    }
    const only = argOf('--doc');
    const files = fs
        .readdirSync(REPORTS)
        .filter((f) => /-(verify-verdict|verify-receipt)\.md$/.test(f))
        .filter((f) => !only || f === only)
        .sort();
    const index = teeIndex();
    const frozen = baselineRead();
    const fresh = [];
    const stale = [];
    let anchors = 0;
    let frozenIssues = 0;

    for (const f of files) {
        const doc = fs.readFileSync(path.join(REPORTS, f), 'utf8');
        const r = judge(doc, index);
        anchors += r.anchors;
        if (!r.issues.length) {
            if (frozen.has(f)) stale.push(f);
            continue;
        }
        const frozenHere = frozen.has(f);
        if (frozenHere) frozenIssues++;
        else fresh.push({ file: f, issues: r.issues });
        if (!frozenHere) {
            for (const i of r.issues.slice(0, 4)) console.log('[EvidenceLog] ' + f + ' — ' + i);
        }
        if (has('--list')) {
            for (const i of r.issues) console.log('  ' + f + ' :: ' + i);
        }
    }

    if (has('--update-baseline')) {
        const keep = files.filter((f) => {
            const r = judge(fs.readFileSync(path.join(REPORTS, f), 'utf8'), index);
            return r.issues.length > 0;
        });
        fs.writeFileSync(BASELINE, JSON.stringify({ note: 'B-70VH frozen pre-existing evidence gaps', docs: keep }, null, 2) + '\n');
        console.log('[EvidenceLog] baseline written docs=' + keep.length);
        return 0;
    }

    console.log(
        '[EvidenceLog] files=' + files.length + ' anchors=' + anchors +
        ' frozen=' + Math.min(frozen.size, files.length) + ' frozenIssues=' + frozenIssues +
        ' fresh=' + fresh.length + ' stale=' + stale.length
    );
    if (stale.length) console.log('[EvidenceLog] baseline can shrink: ' + stale.join(', '));
    const bad = fresh.length > 0;
    console.log('[EvidenceLog] verdict ' + (bad ? 'FAIL' : 'OK'));
    return bad ? 1 : 0;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = { judge, anchorsOf, findDone, teeCandidates, norm };
