#!/usr/bin/env node
/**
 * face-assert.js — 面↔断言覆盖图（B-70UR）
 *
 * check-coverage 只回答「这个面的载体有没有日志通道」；本工具回答下一个问题：
 * 「谁在断言这个通道」——即改某个面时该跑哪个窗口脚本。
 *
 * 判定三档：
 *   ASSERTED  至少一个窗口脚本用正则字面量匹配该通道（真正会判红）
 *   MENTIONED 脚本提到通道名但不在正则里（打印/文档，不作判据）
 *   NO-CHAN   载体无通道（parity / zero-port / no-log 豁免）
 *
 * 用法：
 *   node face-assert.js            # 汇总 + 未断言清单
 *   node face-assert.js --write-doc# 生成 testharness/reports/FACE-ASSERT.md
 *   node face-assert.js --check    # 文档新鲜度（供 preflight）
 *   node face-assert.js --list     # 逐面明细
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

const ROOT = arg('--root', process.env.ASSERT_BOOKS_ROOT || path.resolve(__dirname, '..', '..', '..', '..'));
const REPO = arg('--repo', process.env.ASSERT_REPO || path.resolve(__dirname, '..', '..'));
const CENSUS = path.join(ROOT, 'playground', 'audit', 'census');
const SRC = path.join(REPO, 'src', 'main', 'java');
const PLAYER = process.env.ASSERT_PLAYER || path.join(REPO, 'testharness', 'player');
const DOC = path.join(REPO, 'testharness', 'reports', 'FACE-ASSERT.md');

const DECLARED = /【\s*(parity|zero-port)\s*】/i;

const EXEMPT_CHANNELS = (() => {
    const f = process.env.ASSERT_EXEMPT || path.join(__dirname, 'regression-exempt.json');
    try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        return new Set(Object.keys(j.channels || j));
    } catch (err) {
        return new Set();
    }
})();
const NOLOG_KEYS = (() => {
    const f = process.env.ASSERT_NOLOG || path.join(__dirname, 'no-log.json');
    try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        return new Set(Object.keys(j).map((k) => k.replace(/^[A-F]:/, '')));
    } catch (err) {
        return new Set();
    }
})();

const WRITE = argv.includes('--write-doc');
const CHECK = argv.includes('--check');
const LIST = argv.includes('--list');
const VOL = arg('--vol', null);

const PTR = /([A-Za-z_$][\w$]*\.java):(\d+)(?:\s*-\s*(\d+))?/g;
const CHAN = /\[([A-Z][A-Za-z0-9]*Log)\\?\]|"([A-Z][A-Za-z0-9]*Log)"/g;

function walk(dir, filter, out) {
    if (!fs.existsSync(dir)) {
        return out;
    }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            walk(p, filter, out);
        } else if (filter(e.name)) {
            out.push(p);
        }
    }
    return out;
}

function landedFaces() {
    const out = [];
    for (const p of walk(CENSUS, (n) => /^普查[A-Z]-.*\.md$/.test(n), [])) {
        const vol = path.basename(p).match(/^普查([A-Z])-/)[1];
        const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const s = lines[i];
            if (!s.startsWith('[面]')) {
                continue;
            }
            const parts = s.split('|').map((x) => x.trim());
            const ref = parts[0].replace(/^\[面\]\s*/, '');
            const status = (parts.find((x) => x.startsWith('状态:')) || '').replace('状态:', '');
            if (!status.includes('已落地')) {
                continue;
            }
            const etim = (parts.find((x) => x.startsWith('ETIM位:')) || '').replace('ETIM位:', '');
            out.push({ vol, key: ref, line: i + 1, etim, text: s });
        }
    }
    return out;
}

function srcIndex() {
    const idx = new Map();
    for (const p of walk(SRC, (n) => n.endsWith('.java'), [])) {
        idx.set(path.basename(p), p);
    }
    return idx;
}

const DELEGATE = /\b([A-Z][A-Za-z0-9_]*)\.([a-z][A-Za-z0-9_]*)\s*\(/g;

function channelsOf(file) {
    const set = new Set();
    for (const m of fs.readFileSync(file, 'utf8').matchAll(CHAN)) {
        set.add(m[1] || m[2]);
    }
    return [...set];
}

/** 面级通道：载体本身 + 指针跨度内的委托（与 check-coverage 同口径）。 */
function channelsForFace(idx, face) {
    const set = new Set();
    for (const m of face.etim.matchAll(PTR)) {
        const hits = idx.get(path.basename(m[1]));
        if (!hits) {
            continue;
        }
        for (const c of channelsOf(hits)) {
            set.add(c);
        }
        const body = fs.readFileSync(hits, 'utf8').split(/\r?\n/);
        const start = +m[2];
        const end = m[3] ? +m[3] : start;
        const span = body.slice(Math.max(0, start - 1), end).join('\n');
        for (const d of span.matchAll(DELEGATE)) {
            const target = idx.get(d[1] + '.java');
            if (!target) {
                continue;
            }
            for (const c of channelsOf(target)) {
                set.add(c);
            }
        }
    }
    return [...set].sort();
}

function assertions() {
    const asserted = new Map();
    const mentioned = new Map();
    for (const p of walk(PLAYER, (n) => n.endsWith('.js'), [])) {
        const name = path.basename(p);
        const text = fs.readFileSync(p, 'utf8');
        const inRegex = new Set();
        for (const m of text.matchAll(/\/[^\/\n]*\[([A-Z][A-Za-z0-9]*Log)\\?\][^\/\n]*\/[a-z]*/g)) {
            inRegex.add(m[1]);
        }
        const anyChan = new Set();
        for (const m of text.matchAll(CHAN)) {
            anyChan.add(m[1] || m[2]);
        }
        for (const ch of inRegex) {
            (asserted.get(ch) || asserted.set(ch, []).get(ch)).push(name);
        }
        for (const ch of anyChan) {
            if (!inRegex.has(ch)) {
                (mentioned.get(ch) || mentioned.set(ch, []).get(ch)).push(name);
            }
        }
    }
    return { asserted, mentioned };
}

function classify() {
    const idx = srcIndex();
    const { asserted, mentioned } = assertions();
    const rows = [];
    for (const f of landedFaces()) {
        if (VOL && f.vol !== VOL) {
            continue;
        }
        const ptrs = [...f.etim.matchAll(PTR)].map((m) => m[1]);
        const files = [...new Set(ptrs.map((n) => idx.get(path.basename(n))).filter(Boolean))];
        const chans = channelsForFace(idx, f);
        const hit = chans.filter((c) => asserted.has(c));
        const soft = chans.filter((c) => !asserted.has(c) && mentioned.has(c));
        // B-70US: 「没人断言」有两种。已登记豁免的（regression-exempt 的通道、
        // no-log 的面）不是债，是决定——归 EXEMPT，别混进 UNASSERTED 噪声。
        const declared = (DECLARED.exec(f.etim || '') || [])[1] || null;
        const exemptWhy = hit.length ? null
            : (chans.length
                ? (chans.every((c) => EXEMPT_CHANNELS.has(c)) ? 'exempt-channel' : null)
                : (declared ? declared.toLowerCase() : (NOLOG_KEYS.has(f.key) ? 'no-log' : null)));
        const exempt = exemptWhy !== null;
        const tier = hit.length ? 'ASSERTED'
            : (exempt ? 'EXEMPT' : (chans.length ? (soft.length ? 'MENTIONED' : 'UNASSERTED') : 'NO-CHAN'));
        rows.push({
            vol: f.vol,
            key: f.key,
            carrier: files.map((p) => path.relative(REPO, p).replace(/\\/g, '/'))[0] || '-',
            chans: chans.join(','),
            scripts: [...new Set(hit.flatMap((c) => asserted.get(c)))].join(','),
            why: exemptWhy || '',
            tier
        });
    }
    return rows;
}

function render(rows) {
    const byVol = {};
    for (const r of rows) {
        (byVol[r.vol] = byVol[r.vol] || []).push(r);
    }
    const lines = [];
    lines.push('# 面↔断言覆盖图');
    lines.push('');
    lines.push('> 生成物，勿手改：`node testharness/tools/face-assert.js --write-doc`。');
    lines.push('> 用途：改某个面时，从这里查出该跑哪个窗口脚本。');
    lines.push('');
    lines.push('三档：**ASSERTED**＝有脚本用正则匹配该通道（会判红）；**MENTIONED**＝只被提到；**EXEMPT**＝无窗口但已决定不验（census 行内【parity】/【zero-port】声明、`regression-exempt.json` 通道、`no-log.json` 面）；**NO-CHAN**＝载体无通道且未登记理由（真空白）。');
    lines.push('');
    const total = rows.length;
    const tier = (t) => rows.filter((r) => r.tier === t).length;
    lines.push('| 卷 | 面数 | ASSERTED | MENTIONED | UNASSERTED | EXEMPT | NO-CHAN |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const v of Object.keys(byVol).sort()) {
        const rs = byVol[v];
        const c = (t) => rs.filter((r) => r.tier === t).length;
        lines.push('| ' + v + ' | ' + rs.length + ' | ' + c('ASSERTED') + ' | ' + c('MENTIONED') + ' | '
            + c('UNASSERTED') + ' | ' + c('EXEMPT') + ' | ' + c('NO-CHAN') + ' |');
    }
    lines.push('| 合计 | ' + total + ' | ' + tier('ASSERTED') + ' | ' + tier('MENTIONED') + ' | '
        + tier('UNASSERTED') + ' | ' + tier('EXEMPT') + ' | ' + tier('NO-CHAN') + ' |');
    lines.push('');
    for (const t of ['ASSERTED', 'MENTIONED', 'UNASSERTED', 'EXEMPT', 'NO-CHAN']) {
        const rs = rows.filter((r) => r.tier === t);
        lines.push('## ' + t + '（' + rs.length + '）');
        lines.push('');
        if (!rs.length) {
            lines.push('（无）');
            lines.push('');
            continue;
        }
        lines.push('| 面 | 载体 | 通道 | 断言脚本 |');
        lines.push('| --- | --- | --- | --- |');
        for (const r of rs.slice(0, 120)) {
            lines.push('| ' + r.vol + ':' + r.key + ' | ' + r.carrier + ' | ' + (r.chans || '-')
                + ' | ' + (r.scripts || '-') + ' |');
        }
        if (rs.length > 120) {
            lines.push('| … | | | 另有 ' + (rs.length - 120) + ' 面 |');
        }
        lines.push('');
    }
    return lines.join('\n') + '\n';
}

function main() {
    if (!fs.existsSync(CENSUS)) {
        console.log('[AssertLog] SKIP census tree absent');
        return;
    }
    const rows = classify();
    const doc = render(rows);

    if (LIST) {
        for (const r of rows) {
            console.log('[AssertLog] ' + r.vol + ':' + r.key + ' tier=' + r.tier + (r.why ? ' why=' + r.why : '')
                + ' chans=' + (r.chans || '-') + ' scripts=' + (r.scripts || '-'));
        }
    }

    const count = (t) => rows.filter((r) => r.tier === t).length;
    console.log('[AssertLog] faces=' + rows.length + ' asserted=' + count('ASSERTED')
        + ' mentioned=' + count('MENTIONED') + ' unasserted=' + count('UNASSERTED')
        + ' exempt=' + count('EXEMPT') + ' noChan=' + count('NO-CHAN'));

    if (CHECK) {
        const current = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
        if (current !== doc) {
            console.log('[AssertLog] stale — run --write-doc');
            process.exit(1);
        }
        console.log('[AssertLog] verdict OK (fresh)');
        return;
    }

    if (WRITE) {
        fs.writeFileSync(DOC, doc, 'utf8');
        console.log('[AssertLog] wrote ' + path.relative(REPO, DOC) + ' (' + doc.split('\n').length + ' lines)');
    }
}

function analyze() {
    return { rows: classify(), exempt: EXEMPT_CHANNELS };
}

module.exports = { analyze };

if (require.main === module) {
    main();
}
