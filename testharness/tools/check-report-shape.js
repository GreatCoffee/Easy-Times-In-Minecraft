#!/usr/bin/env node
/**
 * check-report-shape.js —— 三类文书的最小结构棘轮（B-70UZ）
 *
 * 检查对象：
 *   - 对照报告：playground/audit/**\/*对照报告*.md
 *   - 判窗正本：testharness/reports/*-verify-verdict.md
 *   - 判窗回执：testharness/reports/*-verify-receipt.md
 *
 * 规则（只查「有没有」，不判内容对错）：
 *   V1 正本有终判行（终判/结论 + PASS|FAIL|放行|退回）
 *   V2 正本有分级行 A=n / B=n / C=n
 *   V3 A>0 时，每个 `A-<id>` 附近（300 字符内）要有 `X.java:数字` 锚点
 *   V4 正本有钉值（钉值/PIN/buildN 行）
 *   R1 回执有 `[done]` 或 `"pass":` 行
 *   R2 回执有钉值（PIN/sha/钉值）
 *   C1 对照报告有 R196 锚点 `.java:数字`
 *   C2 对照报告有终判 + 分级行
 *   C3 文件名/正文能认出批次时，工单里的每个面键都要在报告里出现
 *
 * 旧文书格式不一，首跑把失败项记入基线；基线外新增失败 → exit 1。
 *
 *   node testharness/tools/check-report-shape.js            # 棘轮检查
 *   node testharness/tools/check-report-shape.js --list     # 逐份列出
 *   node testharness/tools/check-report-shape.js --update-baseline
 *
 * 环境：SHAPE_ROOT（工作区根）、SHAPE_REPO（mod 仓）、SHAPE_BASELINE。
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.SHAPE_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const REPO = process.env.SHAPE_REPO || path.resolve(__dirname, '..', '..');
const BASELINE = process.env.SHAPE_BASELINE || path.join(__dirname, 'report-shape-baseline.json');
const AUDIT = path.join(ROOT, 'playground', 'audit');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const PLAN = path.join(ROOT, 'playground', 'audit', 'census', '批次工单.md');

const ANCHOR = /[A-Za-z0-9_]+\.java:\d+/;
const GRADE = /A\s*=\s*\d+[\s\S]{0,40}?B\s*=\s*\d+[\s\S]{0,40}?C\s*=\s*\d+/;
const VERDICT_LINE = /(终判|判决|结论|状态)[^\n]{0,40}(PASS|FAIL|放行|退回|通过|DIFF|MATCH)/i;

function hasVerdict(text) {
    for (const m of text.matchAll(/终判|判决|结论|状态/g)) {
        const w = text.slice(m.index, m.index + 200);
        if (/(PASS|FAIL|放行|退回|通过|DIFF|MATCH)/i.test(w)) return true;
    }
    return false;
}

function hasGrade(text) {
    for (const m of text.matchAll(/A\s*=\s*\d+/g)) {
        const w = text.slice(m.index, m.index + 200);
        if (/B\s*=\s*\d+/.test(w) && /C\s*=\s*\d+/.test(w)) return true;
    }
    return false;
}

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

function listAudit(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        // 只查顶层交付件：archive/ 与 draft/ 里的历史副本、草稿不参与棘轮。
        if (!e.isDirectory() && e.name.endsWith('.md') && /对照报告/.test(e.name)) acc.push(path.join(dir, e.name));
    }
    return acc;
}

/** 工单：batch → 面键数组。 */
function planFaces() {
    const t = read(PLAN);
    const map = new Map();
    if (!t) return map;
    let cur = null;
    for (const line of t.split(/\r?\n/)) {
        const h = /^###\s+(B-\d+[A-Z]*)\b/.exec(line);
        if (h) { cur = h[1]; map.set(cur, []); continue; }
        if (/^###\s+/.test(line)) { cur = null; continue; }
        const f = /^\s*-\s+`([A-F]:\d+)`/.exec(line);
        if (f && cur) map.get(cur).push(f[1]);
    }
    return map;
}

function checkVerdict(file, text) {
    const bad = [];
    if (!hasVerdict(text)) bad.push('V1 无终判行');
    if (!hasGrade(text)) bad.push('V2 无 A=n/B=n/C=n 分级行');
    const m = /A\s*=\s*(\d+)/.exec(text);
    if (m && +m[1] > 0) {
        const ids = [...new Set([...text.matchAll(/\bA-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g)].map((x) => x[0]))];
        for (const id of ids) {
            const i = text.indexOf(id);
            const win = text.slice(i, i + 300);
            if (!ANCHOR.test(win)) bad.push('V3 ' + id + ' 无 file:line 锚点');
        }
    }
    if (!/钉值|PIN|build\d+/i.test(text)) bad.push('V4 无钉值');
    return bad;
}

function checkReceipt(file, text) {
    const bad = [];
    if (!/\[done\]|"pass"\s*:/.test(text)) bad.push('R1 无 [done] 行');
    if (!/钉值|PIN|sha256|\bsha\b/i.test(text)) bad.push('R2 无钉值');
    return bad;
}

function checkComparison(file, text, plans) {
    const bad = [];
    if (!ANCHOR.test(text)) bad.push('C1 无 R196 file:line 锚点');
    if (!hasVerdict(text)) bad.push('C2 无终判行');
    if (!hasGrade(text)) bad.push('C2 无 A=n/B=n/C=n 分级行');
    const base = path.basename(file);
    const cands = new Set();
    for (const m of base.matchAll(/B-\d+[A-Z]*/g)) cands.add(m[0]);
    for (const m of text.matchAll(/\bB-\d+[A-Z]*\b/g)) cands.add(m[0]);
    for (const b of cands) {
        const faces = plans.get(b);
        if (!faces || !faces.length) continue;
        const missing = faces.filter((k) => !text.includes(k));
        if (missing.length) bad.push('C3 ' + b + ' 缺面 ' + missing.join(','));
    }
    return bad;
}

function main() {
    const plans = planFaces();
    const rows = [];
    for (const f of fs.readdirSync(REPORTS).filter((x) => x.endsWith('-verify-verdict.md')).sort()) {
        const p = path.join(REPORTS, f);
        rows.push({ key: 'reports/' + f, bad: checkVerdict(p, read(p) || '') });
    }
    for (const f of fs.readdirSync(REPORTS).filter((x) => x.endsWith('-verify-receipt.md')).sort()) {
        const p = path.join(REPORTS, f);
        rows.push({ key: 'reports/' + f, bad: checkReceipt(p, read(p) || '') });
    }
    for (const p of listAudit(AUDIT, []).sort()) {
        rows.push({ key: 'audit/' + path.basename(p), bad: checkComparison(p, read(p) || '', plans) });
    }

    const failing = rows.filter((r) => r.bad.length);
    const baseline = (() => {
        const t = read(BASELINE);
        if (!t) return { files: {} };
        try { return JSON.parse(t); } catch (e) { return { files: {} }; }
    })();

    if (process.argv.includes('--update-baseline')) {
        const files = {};
        for (const r of failing) files[r.key] = r.bad.join('; ');
        fs.writeFileSync(BASELINE, JSON.stringify({ note: '旧文书的结构欠账（格式不一），新文书必须通过；修好一份就从这里删一份。', files }, null, 2) + '\n', 'utf8');
        console.log('[ShapeLog] baseline written files=' + Object.keys(files).length);
        return;
    }

    const fresh = failing.filter((r) => !baseline.files[r.key]);
    const fixed = Object.keys(baseline.files).filter((k) => !failing.some((r) => r.key === k));

    if (process.argv.includes('--list')) {
        for (const r of rows) {
            const st = !r.bad.length ? 'OK' : (baseline.files[r.key] ? 'BASE' : 'FAIL');
            console.log(`[ShapeLog] ${st} ${r.key}${r.bad.length ? ' :: ' + r.bad.join('; ') : ''}`);
        }
    }
    for (const r of fresh) console.log('[ShapeLog] FAIL ' + r.key + ' :: ' + r.bad.join('; '));
    if (fixed.length) console.log('[ShapeLog] baseline can shrink (fixed): ' + fixed.join(', '));
    console.log(`[ShapeLog] files=${rows.length} fail=${failing.length} baseline=${Object.keys(baseline.files).length} fresh=${fresh.length} verdict ` + (fresh.length ? 'RISK' : 'OK'));
    process.exit(fresh.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { checkVerdict, checkReceipt, checkComparison, planFaces };
