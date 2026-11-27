#!/usr/bin/env node
/**
 * regression-plan — 回归覆盖矩阵（B-70TP，豁免口径 B-70UN）。
 *
 * 回答一个问题：已落地的内容里，哪些还有「今天跑得动的窗」守着，哪些已经失守。
 * 粒度是判据通道：src 里有产出点的 `[XxxLog]`，哪些被 harness 脚本断言过。
 *
 * 没有脚本断言的通道分两类：
 *   - 在 regression-exempt.json 里登记过原因（结构上无法覆盖：client 侧、
 *     概率低到 60 s 窗抓不到、行由别的通道共用……）→ EXEMPT，不阻断；
 *   - 没登记 → UNEXPLAINED，exit 1（棘轮：新增通道要么补窗，要么登记）。
 * 豁免键失效（通道已被覆盖或已消失）同样 exit 1，防止白白挂着。
 *
 *   node testharness/tools/regression-plan.js           # 重建 testharness/reports/REGRESSION.md
 *   node testharness/tools/regression-plan.js --check   # 只比对 + 棘轮判定
 *   REG_REPO / REG_EXEMPT 可指向别的树/清单（自检用）
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);

const REPO = process.env.REG_REPO || path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO, 'src', 'main', 'java');
const PLAYER = path.join(REPO, 'testharness', 'player');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const OUT = path.join(REPORTS, 'REGRESSION.md');
const EXEMPT_FILE = process.env.REG_EXEMPT || path.join(__dirname, 'regression-exempt.json');

// Escaped brackets too: scripts write /\\[FishLog\\] .../ (regex literals).
const CH_RE = /\\?\[([A-Z][A-Za-z0-9]*Log)\\?\]/g;
const TAG_RE = /"([A-Z][A-Za-z0-9]*Log)"/g;

function walk(d, out = []) {
    if (!fs.existsSync(d)) return out;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

// 产出点：src 里的通道
const producers = new Map(); // channel -> Set(file basename)
for (const f of walk(SRC).filter((x) => x.endsWith('.java'))) {
    const text = fs.readFileSync(f, 'utf8');
    const seen = new Set();
    for (const m of text.matchAll(CH_RE)) seen.add(m[1]);
    for (const m of text.matchAll(TAG_RE)) seen.add(m[1]);
    for (const c of seen) {
        if (!producers.has(c)) producers.set(c, new Set());
        producers.get(c).add(path.basename(f));
    }
}

// 消费点：harness 脚本
const harness = fs.readdirSync(PLAYER).filter((f) => f.endsWith('.js')
    && /require\(['"]\.\.?\/lib\/harness/.test(fs.readFileSync(path.join(PLAYER, f), 'utf8')));

const consumers = new Map(); // channel -> Set(script)
for (const s of harness) {
    const text = fs.readFileSync(path.join(PLAYER, s), 'utf8');
    const seen = new Set();
    for (const m of text.matchAll(CH_RE)) seen.add(m[1]);
    for (const c of seen) {
        if (!consumers.has(c)) consumers.set(c, new Set());
        consumers.get(c).add(s);
    }
}

// 批次 ↔ verdict / 脚本
const verdicts = new Set(fs.readdirSync(REPORTS)
    .filter((f) => f.endsWith('-verify-verdict.md'))
    .map((f) => f.replace(/-verify-verdict\.md$/, '').toUpperCase().replace(/^B(\d)/, 'B-$1')));

function batchOf(script) {
    const m = /b(\d+)(?:[a-z]+)?-/i.exec(script);
    return m ? 'B-' + m[1] : null;
}

const rows = [...producers.keys()].sort();
const covered = rows.filter((c) => consumers.has(c));
const gaps = rows.filter((c) => !consumers.has(c));

// B-70UN：缺口分「已登记豁免」与「未处理」
function readExempt() {
    try {
        const j = JSON.parse(fs.readFileSync(EXEMPT_FILE, 'utf8'));
        return j.channels || {};
    } catch (e) {
        return {};
    }
}
const exempt = readExempt();
const exempted = gaps.filter((c) => typeof exempt[c] === 'string' && exempt[c].trim());
const unexplained = gaps.filter((c) => !exempted.includes(c));
const staleExempt = Object.keys(exempt).filter((c) => !gaps.includes(c));

const L = [];
L.push('# 回归覆盖矩阵（生成物）');
L.push('');
L.push('> 由 `node testharness/tools/regression-plan.js` 生成，**不要手改**；preflight 第 12 步用 `--check` 拦陈旧。');
L.push('> 粒度：src 里的 `[XxxLog]` 产出点 × 今天仍能跑的 harness 脚本。');
L.push('');
L.push('## 总览');
L.push('');
L.push('| 项 | 数 |');
L.push('| --- | --- |');
L.push('| 判据通道（有产出点） | ' + rows.length + ' |');
L.push('| 被 harness 覆盖 | ' + covered.length + ' |');
L.push('| 登记豁免（结构不可覆盖） | ' + exempted.length + ' |');
L.push('| 未处理 GAP | ' + unexplained.length + ' |');
L.push('| harness 脚本 | ' + harness.length + ' |');
L.push('| 已封批（有 verdict） | ' + verdicts.size + ' |');
L.push('');
L.push('## 在跑的窗口');
L.push('');
L.push('| 脚本 | 推断批次 | 覆盖通道 | verdict |');
L.push('| --- | --- | --- | --- |');
for (const s of harness) {
    const text = fs.readFileSync(path.join(PLAYER, s), 'utf8');
    const chs = [...new Set([...text.matchAll(CH_RE)].map((m) => m[1]))].sort();
    const b = batchOf(s);
    L.push('| `' + s + '` | ' + (b || '-') + ' | ' + chs.length + ' 个：' + (chs.join('/') || '-') + ' | ' + (b && verdicts.has(b) ? '有' : '无') + ' |');
}
L.push('');
L.push('## 通道覆盖');
L.push('');
L.push('| 通道 | 产出文件 | 覆盖脚本 | 状态 |');
L.push('| --- | --- | --- | --- |');
for (const c of rows) {
    const files = [...producers.get(c)].slice(0, 3).join(', ') + (producers.get(c).size > 3 ? ' …' : '');
    const cons = consumers.has(c) ? [...consumers.get(c)].join(', ') : '-';
    const status = consumers.has(c) ? 'COVERED' : (exempted.includes(c) ? 'EXEMPT' : 'GAP');
    L.push('| `' + c + '` | ' + files + ' | ' + cons + ' | ' + status + ' |');
}
L.push('');
L.push('## 结构上不可覆盖（登记豁免）');
L.push('');
L.push('> 这些通道在 `testharness/tools/regression-exempt.json` 里登记了原因。新增的未覆盖通道不会自动豁免：');
L.push('> 要么补一个能重跑的窗，要么在清单里写清为什么盖不了，否则 preflight 第 12 步失败。');
L.push('');
L.push('| 通道 | 原因 |');
L.push('| --- | --- |');
if (exempted.length) {
    for (const c of exempted) L.push('| `' + c + '` | ' + exempt[c].replace(/\|/g, '\\|') + ' |');
} else {
    L.push('| - | - |');
}
L.push('');
L.push('## 缺口怎么读');
L.push('');
L.push('- `GAP` 不代表功能坏，只代表「今天没有脚本能替你重跑它」。老批次结论只有当时的日志可查。');
L.push('- 优先补的 GAP：共享代码改一次就会波及的子系统（伤害/属性、掉落、挖块、干旱、群系刷怪）。');
L.push('- 新窗口上 harness 后重跑本工具，`GAP` 会自动减少，不需要手改本表。');

const body = L.join('\n');
const cov = covered.length + '/' + rows.length;
console.log('[RegLog] channels=' + rows.length + ' covered=' + covered.length + ' gaps=' + gaps.length +
    ' exempt=' + exempted.length + ' unexplained=' + unexplained.length +
    ' scripts=' + harness.length + ' verdicts=' + verdicts.size);
for (const c of unexplained) console.log('[RegLog] UNEXPLAINED ' + c + ': no window script asserts it — add one or register it in regression-exempt.json');
for (const c of staleExempt) console.log('[RegLog] STALE-EXEMPT ' + c + ': no longer a gap (covered or gone) — remove it from regression-exempt.json');

const ratchetBad = unexplained.length > 0 || staleExempt.length > 0;

if (argv.includes('--check')) {
    const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    const same = old === body;
    console.log('[RegLog] stale=' + !same + ' coverage=' + cov);
    const verdict = ratchetBad ? 'GAP' : (same ? 'OK' : 'STALE');
    console.log('[RegLog] verdict ' + verdict);
    process.exit(!same || ratchetBad ? 1 : 0);
}

fs.writeFileSync(OUT, body, 'utf8');
console.log('[RegLog] wrote testharness/reports/REGRESSION.md (' + body.split('\n').length + ' lines) coverage=' + cov);
console.log('[RegLog] verdict ' + (ratchetBad ? 'GAP' : 'OK'));
if (ratchetBad) process.exit(1);
