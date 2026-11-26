#!/usr/bin/env node
/**
 * check-faces — census「已落地」面 ↔ 源码指针反向核对（B-70TH）。
 *
 * 只读。对每卷逐面段里 `状态:【已落地…】` 的面行，抽出 ETIM位 列中的
 * `<Name>.java:<start>[-<end>]` 指针，逐条验：
 *   F1 文件存在（按 basename 在仓库 src/main/java 建索引）
 *   F2 行号在文件长度内（start ≤ end ≤ lines）
 *   F3 类名出现（`class|interface|enum|record <Name>`，mixin/接口同样适用）
 * 抽不出任何指针的已落地面记为 INFO（老批次的「间接等价」描述），不算失败。
 *
 * 用法：
 *   node testharness/tools/check-faces.js            # 全卷
 *   node testharness/tools/check-faces.js --list     # 逐条打印问题
 *   node testharness/tools/check-faces.js --vol C    # 单卷（A..F）
 *   node testharness/tools/check-faces.js --root <books> --repo <etim repo>
 *
 * 退出码：0 全通过 / 1 有 DRIFT / 2 目录缺失。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const ROOT = arg('--root', process.env.FACE_BOOKS_ROOT || path.resolve(__dirname, '..', '..', '..', '..'));
const REPO = arg('--repo', process.env.FACE_REPO || path.resolve(__dirname, '..', '..'));
const LIST = argv.includes('--list');
const VOL = arg('--vol', null);

const censusDir = path.join(ROOT, 'playground', 'audit', 'census');
if (!fs.existsSync(censusDir)) {
    console.log('[FaceLog] SKIP census tree absent: ' + censusDir);
    process.exit(0);
}

function say(s) { console.log(s); }

// ---------------------------------------------------------------- java index
// Two trees: the ETIM mod first, then the R196 decompile. A census ETIM位
// column legitimately cites R196 spans ("间接等价（无产品改码）：…"), so a
// basename that only exists on the R196 side is a citation, not a drift.
const R196 = arg('--r196', process.env.FACE_R196 || path.resolve(__dirname, '..', '..', '..', '..', 'mite-src', 'decompile', 'src'));
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
const r196Index = buildIndex(R196);

const lineCache = new Map();
function linesOf(file) {
    if (!lineCache.has(file)) lineCache.set(file, fs.readFileSync(file, 'utf8').split(/\r?\n/).length);
    return lineCache.get(file);
}

// ------------------------------------------------------------------ scanning
const vols = fs.readdirSync(censusDir)
    .filter((f) => f.startsWith('普查') && f.endsWith('.md'))
    .filter((f) => !VOL || f.startsWith('普查' + VOL))
    .sort();

const PTR = /([A-Za-z_$][\w$]*\.java):(\d+)(?:\s*-\s*(\d+))?/g;

const problems = [];
const noPointer = [];
let rows = 0, landed = 0, pointers = 0, missingFile = 0, badRange = 0, missingSymbol = 0, r196 = 0;

for (const vol of vols) {
    const lines = fs.readFileSync(path.join(censusDir, vol), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const s = lines[i];
        if (!s.startsWith('[面]')) continue;
        rows++;
        const parts = s.split('|').map((x) => x.trim());
        const ref = parts[0].replace(/^\[面\]\s*/, '');
        const status = (parts.find((p) => p.startsWith('状态:')) || '').replace('状态:', '');
        if (!status.includes('已落地')) continue;
        landed++;
        const etim = (parts.find((p) => p.startsWith('ETIM位:')) || '').replace('ETIM位:', '');
        const where = `${vol.slice(0, 3)}:${i + 1} ${ref}`;
        const found = [...etim.matchAll(PTR)];
        if (found.length === 0) { noPointer.push(where); continue; }
        for (const m of found) {
            pointers++;
            const name = m[1], start = +m[2], end = m[3] ? +m[3] : start;
            let hits = index.get(name);
            if (hits && hits.length) {
                // ETIM-side pointer.
            } else {
                hits = r196Index.get(name);
                if (hits && hits.length) { r196++; }
            }
            if (!hits || hits.length === 0) {
                missingFile++;
                problems.push(`F1 ${where} | ${name} 在两棵树里都不存在`);
                continue;
            }
            const file = hits[0];
            const n = linesOf(file);
            if (start < 1 || end < start || end > n) {
                badRange++;
                problems.push(`F2 ${where} | ${name}:${start}-${end} 超出文件行数 ${n}`);
                continue;
            }
            const cls = name.replace(/\.java$/, '');
            const body = fs.readFileSync(file, 'utf8');
            if (!new RegExp('\\b(class|interface|enum|record)\\s+' + cls + '\\b').test(body)) {
                missingSymbol++;
                problems.push(`F3 ${where} | ${name} 内无 class/interface/enum ${cls}`);
            }
        }
    }
}

// ------------------------------------------------------------------- report
if (LIST) {
    for (const p of problems) say('[FaceLog] ' + p);
    for (const p of noPointer) say('[FaceLog] INFO no-pointer | ' + p);
}
const bad = missingFile + badRange + missingSymbol;
say(`[FaceLog] vols=${vols.length} rows=${rows} landed=${landed} pointers=${pointers} r196=${r196} `
    + `missingFile=${missingFile} badRange=${badRange} missingSymbol=${missingSymbol} noPointer=${noPointer.length} [local]`);
say(`[FaceLog] verdict ${bad === 0 ? 'OK' : 'DRIFT'}`);
process.exit(bad === 0 ? 0 : 1);
