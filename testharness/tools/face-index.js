#!/usr/bin/env node
/**
 * 面 → 通道 → 断言窗口 → 数值金标 三向索引（B-70VL）。
 *
 * 三张表原来各说各话：
 *   - face-assert：每个已落地面有没有通道、被哪个窗口断言；
 *   - regression-plan：通道被哪些窗口覆盖；
 *   - value-goldens：哪些窗口的哪些数值被金标锁住。
 * 本工具把它们合成一张表，并给 kickoff 提供「本批该跑哪些窗、base 取哪份 tee」的建议。
 *
 * 用法：
 *   node testharness/tools/face-index.js            # 生成 reports/FACE-INDEX.md + face-index.json
 *   node testharness/tools/face-index.js --check    # 只比对，过期 exit 1（preflight 用）
 *   node testharness/tools/face-index.js --list     # 只打印汇总
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const GOLDENS = process.env.FACEINDEX_GOLDENS || path.join(__dirname, 'goldens');
const DOC = process.env.FACEINDEX_DOC || path.join(REPORTS, 'FACE-INDEX.md');
const JSON_OUT = process.env.FACEINDEX_JSON || path.join(REPORTS, 'face-index.json');

const CHAN_OF_KEY = /^\[([A-Z][A-Za-z0-9]*Log)\]/;

function splitList(s) {
    return String(s || '').split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
}

/** 金标目录 → [{ script, tee, fields, channels }] */
function loadGoldens(dir) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) continue;
        let g;
        try { g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
        const channels = new Set();
        for (const k of Object.keys(g.values || {})) {
            const m = CHAN_OF_KEY.exec(k);
            if (m) channels.add(m[1]);
        }
        out.push({ script: g.script || f.replace(/\.json$/, ''), tee: g.tee || '', fields: g.fields || 0, channels: [...channels] });
    }
    return out.sort((a, b) => a.script.localeCompare(b.script));
}

/** 纯函数：给 face-assert 的行，返回三向索引行。 */
function buildIndex(rows, goldens) {
    // 排序固定：census 目录遍历顺序不保证稳定，索引必须逐字节可复现。
    rows = rows.slice().sort((a, b) => (a.vol + ':' + a.key).localeCompare(b.vol + ':' + b.key));
    const byChan = new Map();
    for (const g of goldens) for (const c of g.channels) {
        if (!byChan.has(c)) byChan.set(c, []);
        byChan.get(c).push(g);
    }
    return rows.map((r) => {
        const chans = splitList(r.chans);
        const windows = splitList(r.scripts);
        const guard = [];
        for (const c of chans) {
            for (const g of byChan.get(c) || []) {
                if (!guard.some((x) => x.script === g.script)) guard.push({ script: g.script, tee: g.tee });
            }
        }
        return {
            vol: r.vol, key: r.key, carrier: r.carrier || '',
            tier: r.tier, why: r.why || '', chans, windows, guard,
        };
    });
}

function summarize(rows) {
    const s = { faces: rows.length, asserted: 0, exempt: 0, other: 0, withChan: 0, withWindow: 0, withGolden: 0 };
    for (const r of rows) {
        if (r.tier === 'ASSERTED') s.asserted++;
        else if (r.tier === 'EXEMPT') s.exempt++;
        else s.other++;
        if (r.chans.length) s.withChan++;
        if (r.windows.length) s.withWindow++;
        if (r.guard.length) s.withGolden++;
    }
    return s;
}

function render(rows) {
    const s = summarize(rows);
    const L = [];
    L.push('# 面 → 通道 → 断言窗口 → 数值金标（三向索引）');
    L.push('');
    L.push('> 生成：`node testharness/tools/face-index.js`；**不要手改**。');
    L.push('');
    L.push('- 已落地面 **' + s.faces + '**：有通道 ' + s.withChan + '，有断言窗口 ' + s.withWindow + '，有数值金标 ' + s.withGolden + '。');
    L.push('- 分级：ASSERTED ' + s.asserted + ' / EXEMPT ' + s.exempt + ' / 其他 ' + s.other + '。');
    L.push('- 读法：`金标` 非空表示该面的通道数值被这些窗口的金标锁住；改代码后跑这些窗口 + `value-goldens --check` 即可知道有没有动数。');
    L.push('');
    L.push('| 面 | 载体 | 分级 | 通道 | 断言窗口 | 数值金标 |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (const r of rows) {
        L.push('| `' + r.vol + ':' + r.key + '` | `' + (r.carrier || '—') + '` | ' + r.tier + (r.why ? ' (' + r.why + ')' : '') +
            ' | ' + (r.chans.join(', ') || '—') + ' | ' + (r.windows.join(', ') || '—') +
            ' | ' + (r.guard.map((g) => g.script).join(', ') || '—') + ' |');
    }
    L.push('');
    return L.join('\n');
}

/** 给 kickoff 用：一批面 → gate-plan 建议。 */
function propose(rows, faces, goldens) {
    // 面的 ref 与索引里的 key 同为「文件:起-止」；census 行号（C:141）对不上，必须用 ref。
    const refs = new Set(faces.map((f) => f.ref || f.key));
    const picked = rows.filter((r) => refs.has(r.key));
    const scripts = [];
    for (const r of picked) for (const w of r.windows) if (w && !scripts.includes(w)) scripts.push(w);
    const byScript = new Map(goldens.map((g) => [g.script, g]));
    let base = '';
    for (const s of scripts) {
        if (byScript.has(s) && byScript.get(s).tee) { base = byScript.get(s).tee; break; }
    }
    const modes = scripts.some((s) => byScript.has(s)) ? ['arms', 'values'] : ['arms'];
    return { scripts: scripts.length ? scripts : [], base, modes };
}

function main() {
    const check = process.argv.includes('--check');
    const list = process.argv.includes('--list');
    const rows = require('./face-assert.js').analyze().rows || [];
    const goldens = loadGoldens(GOLDENS);
    const index = buildIndex(rows, goldens);
    const s = summarize(index);
    const doc = render(index);
    const json = JSON.stringify({ generatedAt: null, summary: s, goldens: goldens.map((g) => ({ script: g.script, tee: g.tee, fields: g.fields })), rows: index }, null, 2) + '\n';

    if (list) {
        console.log('[IndexLog] faces=' + s.faces + ' chan=' + s.withChan + ' windows=' + s.withWindow + ' goldens=' + s.withGolden + ' goldensFiles=' + goldens.length);
        return 0;
    }
    if (check) {
        const oldDoc = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
        const oldJson = fs.existsSync(JSON_OUT) ? fs.readFileSync(JSON_OUT, 'utf8') : '';
        const docStale = oldDoc !== doc;
        const jsonStale = oldJson !== json;
        const stale = docStale || jsonStale;
        if (stale) {
            for (const [label, a, b] of [['doc', oldDoc, doc], ['json', oldJson, json]]) {
                if (a === b) continue;
                let i = 0;
                while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
                console.log('[IndexLog] ' + label + ' stale at ' + i + ' onDisk=' + JSON.stringify(String(a.slice(i, i + 40))) +
                    ' expected=' + JSON.stringify(String(b.slice(i, i + 40))));
            }
        }
        console.log('[IndexLog] faces=' + s.faces + ' stale=' + (stale ? 1 : 0) + ' verdict ' + (stale ? 'STALE' : 'OK'));
        return stale ? 1 : 0;
    }
    fs.mkdirSync(REPORTS, { recursive: true });
    fs.writeFileSync(DOC, doc, 'utf8');
    fs.writeFileSync(JSON_OUT, json, 'utf8');
    console.log('[IndexLog] faces=' + s.faces + ' chan=' + s.withChan + ' windows=' + s.withWindow + ' goldens=' + s.withGolden);
    console.log('[IndexLog] wrote ' + DOC);
    console.log('[IndexLog] wrote ' + JSON_OUT);
    return 0;
}

if (require.main === module) process.exit(main());

module.exports = { buildIndex, summarize, render, propose, loadGoldens, splitList };
