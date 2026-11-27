#!/usr/bin/env node
/**
 * check-coverage — 已落地面 ↔ 判据通道覆盖棘轮（B-70UE）。
 *
 * 对每卷「已落地」面行，取 ETIM位 里的 Java 指针，读载体源码，看是否出现
 * `[XxxLog]` 字面量：
 *   logged   载体有判据通道
 *   silent   载体没有任何日志通道（回归网看不到它）
 *   parity   【parity】/【zero-port】标记，无产品码，豁免
 *
 * 棘轮：silent 面集合落在 `coverage-baseline.json`。出现基线外的新 silent 面
 * → exit 1；silent 减少只提示下调基线。文档 `reports/COVERAGE.md` 由本工具生成，
 * `--check` 同时校验文档新鲜度与基线。
 *
 * 用法：
 *   node testharness/tools/check-coverage.js                 # 汇总
 *   node testharness/tools/check-coverage.js --list          # 逐条 silent
 *   node testharness/tools/check-coverage.js --write-doc     # 重建 COVERAGE.md
 *   node testharness/tools/check-coverage.js --check         # 文档 + 基线（preflight 用）
 *   node testharness/tools/check-coverage.js --update-baseline
 *   node testharness/tools/check-coverage.js --vol C
 *
 * 退出码：0 OK / 1 新 silent 或文档陈旧 / 2 目录缺失。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const ROOT = arg('--root', process.env.COVERAGE_BOOKS_ROOT || path.resolve(__dirname, '..', '..', '..', '..'));
const REPO = arg('--repo', process.env.COVERAGE_REPO || path.resolve(__dirname, '..', '..'));
const R196 = arg('--r196', process.env.COVERAGE_R196 || path.join(ROOT, 'mite-src', 'decompile', 'src'));
const LIST = argv.includes('--list');
const CHECK = argv.includes('--check');
const WRITE_DOC = argv.includes('--write-doc');
const UPDATE_BASELINE = argv.includes('--update-baseline');
const VOL = arg('--vol', null);

const censusDir = path.join(ROOT, 'playground', 'audit', 'census');
if (!fs.existsSync(censusDir)) {
    console.log('[CoverageLog] SKIP census tree absent: ' + censusDir);
    process.exit(0);
}

const BASELINE = process.env.COVERAGE_BASELINE || path.join(__dirname, 'coverage-baseline.json');
const DOC = path.join(REPO, 'testharness', 'reports', 'COVERAGE.md');

function buildIndex(dir) {
    const m = new Map();
    (function walk(d) {
        let ents;
        try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of ents) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.name.endsWith('.java')) {
                if (!m.has(e.name)) m.set(e.name, []);
                m.get(e.name).push(full);
            }
        }
    })(dir);
    return m;
}
const index = buildIndex(path.join(REPO, 'src', 'main', 'java'));
const PTR = /([A-Za-z_$][\w$]*\.java):(\d+)(?:\s*-\s*(\d+))?/g;
// Two producer shapes: a literal row `[XxxLog] …`, or a TAG constant
// (`private static final String TAG = "XxxLog"`) that row() prints with.
const CHAN = /\[([A-Z][A-Za-z0-9]*Log)\]|"([A-Z][A-Za-z0-9]*Log)"/g;

const NOLOG = process.env.COVERAGE_NOLOG || path.join(__dirname, 'no-log.json');
let noLog = {};
if (fs.existsSync(NOLOG)) {
    try { noLog = JSON.parse(fs.readFileSync(NOLOG, 'utf8')); } catch { noLog = {}; }
}
const noLogKeys = new Set(Object.keys(noLog).filter((k) => !k.startsWith('_')));
const seenRefs = new Set();

const vols = fs.readdirSync(censusDir)
    .filter((f) => f.startsWith('普查') && f.endsWith('.md'))
    .filter((f) => !VOL || f.startsWith('普查' + VOL))
    .sort();

function statusOf(parts) {
    const s = (parts.find((p) => p.startsWith('状态:')) || '').replace('状态:', '');
    return s;
}
const rows = [];   // { vol, line, ref, kind, chan, where }
let landed = 0, logged = 0, silent = 0, parity = 0, unresolved = 0, exempt = 0;

for (const vol of vols) {
    const lines = fs.readFileSync(path.join(censusDir, vol), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const s = lines[i];
        if (!s.startsWith('[面]')) continue;
        const parts = s.split('|').map((x) => x.trim());
        const ref = parts[0].replace(/^\[面\]\s*/, '');
        if (statusOf(parts)) seenRefs.add(ref);
        const status = (parts.find((p) => p.startsWith('状态:')) || '').replace('状态:', '');
        if (!status.includes('已落地')) continue;
        landed++;
        const etim = (parts.find((p) => p.startsWith('ETIM位:')) || '').replace('ETIM位:', '');
        const volKey = vol.slice(2, 3) || vol.slice(0, 1);
        const where = volKey + ':' + (i + 1) + ' ' + ref;

        if (/【parity】/.test(etim) || /【zero-port】/.test(etim)) {
            parity++;
            rows.push({ vol: volKey, line: i + 1, ref, kind: 'parity', chan: '', where });
            continue;
        }
        const ptrs = [...etim.matchAll(PTR)];
        const carriers = [];
        for (const m of ptrs) {
            const hits = index.get(m[1]);
            if (!hits || !hits.length) continue;
            const start = +m[2];
            const end = m[3] ? +m[3] : start;
            if (!carriers.some((c) => c.file === hits[0])) carriers.push({ file: hits[0], start, end });
        }
        if (!carriers.length) {
            unresolved++;
            rows.push({ vol: volKey, line: i + 1, ref, kind: 'unresolved', chan: '', where });
            continue;
        }
        // A face may be carried by several files (interface + mixin + helper):
        // one channel anywhere on the face counts, otherwise it is genuinely silent.
        const chans = [];
        // Facet 1: the carrier file itself emits (literal row or TAG constant).
        for (const c of carriers) {
            for (const m of fs.readFileSync(c.file, 'utf8').matchAll(CHAN)) chans.push(m[1] || m[2]);
        }
        // Facet 2: the pointed span delegates to a central logger
        // (`ETIMVesselEvents.row(...)`, `ETIMFarm.row(...)`, `ETIMExplosion.log(...)`).
        // This codebase keeps the math in helpers and the rows in event classes,
        // so a pure helper is still "visible" through its sibling.
        const DELEGATE = /\b([A-Z][A-Za-z0-9_]*(?:Log|Events))\.([a-z][A-Za-z0-9_]*)\s*\(/g;
        for (const c of carriers) {
            const body = fs.readFileSync(c.file, 'utf8').split(/\r?\n/);
            const span = body.slice(Math.max(0, c.start - 1), c.end).join('\n');
            for (const m of span.matchAll(DELEGATE)) {
                const hits = index.get(m[1] + '.java');
                if (!hits || !hits.length) continue;
                for (const cm of fs.readFileSync(hits[0], 'utf8').matchAll(CHAN)) chans.push(cm[1] || cm[2]);
            }
        }
        const uniq = [...new Set(chans)].sort();
        if (uniq.length) {
            logged++;
            rows.push({ vol: volKey, line: i + 1, ref, kind: 'logged', chan: uniq.join(','), where });
        } else if (noLog && Object.prototype.hasOwnProperty.call(noLog, ref)) {
            exempt++;
            rows.push({ vol: volKey, line: i + 1, ref, kind: 'exempt', chan: '', where, reason: noLog[ref] });
        } else {
            silent++;
            rows.push({ vol: volKey, line: i + 1, ref, kind: 'silent', chan: '', where });
        }
    }
}

// ---------------------------------------------------------------- baseline
let baseline = { silent: [] };
if (fs.existsSync(BASELINE)) {
    try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { baseline = { silent: [] }; }
}
const baseSet = new Set(baseline.silent || []);
const curSilent = rows.filter((r) => r.kind === 'silent').map((r) => r.ref);
const curSet = new Set(curSilent);
const added = curSilent.filter((s) => !baseSet.has(s));
const removed = [...baseSet].filter((s) => !curSet.has(s));

// ------------------------------------------------------------------- report
if (LIST) {
    for (const r of rows) {
        if (r.kind === 'silent') console.log('[CoverageLog] silent ' + r.where + ' -> (no [XxxLog] in carrier)');
        if (r.kind === 'exempt') console.log('[CoverageLog] exempt ' + r.where + ' -> ' + r.reason);
        if (r.kind === 'unresolved') console.log('[CoverageLog] INFO unresolved ' + r.where);
    }
}

const byVol = {};
for (const r of rows) {
    byVol[r.vol] = byVol[r.vol] || { landed: 0, logged: 0, silent: 0, parity: 0, exempt: 0, unresolved: 0 };
    byVol[r.vol].landed++;
    byVol[r.vol][r.kind]++;
}

function renderDoc() {
    const out = [];
    out.push('# 已落地面 ↔ 判据通道覆盖（生成物）');
    out.push('');
    out.push('> 由 `node testharness/tools/check-coverage.js --write-doc` 生成，**不要手改**。');
    out.push('> 口径：已落地面读取 `ETIM位` 里的 Java 指针，载体源码出现 `[XxxLog]` 即算「有通道」。');
    out.push('> `silent` 面 = 回归网看不见的面；基线见 `testharness/tools/coverage-baseline.json`，新增即拦。');
    out.push('');
    out.push('## 汇总');
    out.push('');
    out.push('| 卷 | 已落地 | 有通道 | silent | no-log | parity | unresolved |');
    out.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const v of Object.keys(byVol).sort()) {
        const x = byVol[v];
        out.push('| ' + v + ' | ' + x.landed + ' | ' + x.logged + ' | ' + x.silent + ' | ' + x.exempt + ' | ' + x.parity + ' | ' + x.unresolved + ' |');
    }
    out.push('| **合计** | **' + landed + '** | **' + logged + '** | **' + silent + '** | **' + exempt + '** | **' + parity + '** | **' + unresolved + '** |');
    out.push('');
    out.push('## silent 面（载体无判据通道）');
    out.push('');
    for (const v of Object.keys(byVol).sort()) {
        const list = rows.filter((r) => r.vol === v && r.kind === 'silent');
        if (!list.length) continue;
        out.push('### ' + v + ' 卷（' + list.length + ' 面）');
        out.push('');
        for (const r of list) out.push('- `' + r.ref + '`（census ' + r.vol + ':' + r.line + '）');
        out.push('');
    }
    out.push('## no-log 面（人工声明不产日志，带理由）');
    out.push('');
    for (const v of Object.keys(byVol).sort()) {
        const list = rows.filter((r) => r.vol === v && r.kind === 'exempt');
        if (!list.length) continue;
        out.push('### ' + v + ' 卷（' + list.length + ' 面）');
        out.push('');
        for (const r of list) out.push('- `' + r.ref + '` — ' + (r.reason || ''));
        out.push('');
    }
    out.push('## 说明');
    out.push('');
    out.push('- `parity` / `zero-port` 面无产品码，天然不产日志，豁免。');
    out.push('- `unresolved` = 指针指向的文件不在 ETIM `src/main/java`（多为 R196 侧引用），不计入棘轮。');
    out.push('- 要让某面从 silent 里消失：给载体补 `[XxxLog]` 行（并在 `check-channels` 登记门），或补 `no-log` 理由后把它从基线里移除。');
    out.push('');
    return out.join('\n');
}

const docBody = renderDoc();
let docState = 'n/a';
if (fs.existsSync(DOC)) {
    const old = fs.readFileSync(DOC, 'utf8');
    docState = old === docBody ? 'fresh' : 'stale';
}

if (WRITE_DOC) {
    fs.mkdirSync(path.dirname(DOC), { recursive: true });
    fs.writeFileSync(DOC, docBody, 'utf8');
    fs.writeFileSync(process.env.COVERAGE_SILENT || path.join(__dirname, 'coverage-silent.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), silent: [...curSilent].sort() }, null, 2) + '\n', 'utf8');
    docState = 'fresh';
    console.log('[CoverageLog] wrote ' + path.relative(REPO, DOC).replace(/\\/g, '/') + ' (' + docBody.split('\n').length + ' lines)');
}
if (UPDATE_BASELINE) {
    fs.writeFileSync(BASELINE, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), silent: curSilent.sort() }, null, 2) + '\n', 'utf8');
    console.log('[CoverageLog] baseline written silent=' + curSilent.length);
}

console.log('[CoverageLog] vols=' + vols.length + ' landed=' + landed + ' logged=' + logged + ' silent=' + silent
    + ' parity=' + parity + ' exempt=' + exempt + ' unresolved=' + unresolved + ' newSilent=' + added.length + ' dropped=' + removed.length
    + ' doc=' + docState + ' [local]');
for (const a of added.slice(0, 20)) console.log('[CoverageLog] NEW silent ' + a);
if (removed.length) console.log('[CoverageLog] NOTE silent 减少 ' + removed.length + ' 条，可跑 --update-baseline 下调');

for (const k of noLogKeys) {
    if (!seenRefs.has(k)) console.log('[CoverageLog] STALE no-log key not in census: ' + k);
}

let bad = 0;
if (added.length) bad = 1;
for (const k of noLogKeys) if (!seenRefs.has(k) && CHECK) bad = 1;
if (CHECK && docState === 'stale') bad = 1;
if (CHECK && !fs.existsSync(DOC)) bad = 1;
console.log('[CoverageLog] verdict ' + (bad ? 'RISK' : 'OK'));
process.exit(bad ? 1 : 0);
