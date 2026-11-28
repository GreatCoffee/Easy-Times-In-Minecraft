#!/usr/bin/env node
/**
 * plan-batches — 把 census 剩余面切成「可开工批次」，产出工单表（B-70TN）。
 *
 * 数据源是 `剩余-就绪度.md` 的逐面明细表（生成物），本工具只做切分与排程：
 *   - WIRE 面按载体簇聚合，超 MAX 的簇按 census 顺序切块
 *   - CITE 面按被引用文件聚合
 *   - NEW 面按卷聚合后再切块
 * 每批给：面清单（卷:行 + R196 引用 + 说明）、要读的 R196 文件、依赖、判据草案提示。
 *
 * 手工钉号（B-70VT）：`plan-pins.json` 里点名的批次保持编号不变（用户裁定的批次号
 * 不允许被重新生成冲掉）；钉过的面不再参与自动分组，自动批次从 START 起按号顺延、
 * 跳过钉号。钉号面一旦落地（不再出现在就绪度表）则自动脱钉，编号继续保留。
 *
 *   node testharness/tools/plan-batches.js            # 重建 批次工单.md
 *   node testharness/tools/plan-batches.js --check    # 只比对，陈旧 exit 1
 *   node testharness/tools/plan-batches.js --start B-71 --max 8
 *
 * 钉号（B-70VT）：`plan-pins.json` 点名的批次保持固定编号与面集，不参与自动
 * 分组（用户裁定过的编号，例如「灌木 = B-71」）。自动批次从 `--start` 起顺延，
 * 跳过被钉的编号、填补空号；面板落地后钉号自动降为空批并继续占号，编号不漂移。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const arg = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const ROOT = process.env.PLAN_BOOKS_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const BOOKS = path.join(ROOT, 'playground', 'audit', 'census');
const SRC = path.join(BOOKS, '剩余-就绪度.md');
const OUT = path.join(BOOKS, '批次工单.md');
const START = arg('--start', 'B-71');
const MAX = Math.max(1, +(arg('--max', '8')) || 8);

function say(s) { if (!QUIET) console.log(s); }

if (!fs.existsSync(SRC)) {
    say('[PlanLog] SKIP readiness table absent (run face-readiness.js first)');
    say('[PlanLog] verdict OK');
    process.exit(0);
}

function parseRows(text) {
    const rows = [];
    let inDetail = false;
    for (const s of text.split(/\r?\n/)) {
        if (/^## 逐面明细/.test(s)) { inDetail = true; continue; }
        if (inDetail && /^## /.test(s)) break;
        if (!inDetail || !s.startsWith('|')) continue;
        if (/^\|\s*卷:行/.test(s) || /^\|\s*-{3}/.test(s)) continue;
        const cells = s.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length < 5) continue;
        const volLine = /^([A-F]):(\d+)$/.exec(cells[0]);
        if (!volLine) continue;
        const carrierCell = cells[3] || '';
        const [carrierPart, depPart] = carrierCell.split(' / ');
        rows.push({
            vol: volLine[1],
            line: +volLine[2],
            ref: cells[1].replace(/`/g, ''),
            state: cells[2],
            carrier: carrierPart === '-' ? '' : carrierPart,
            deps: depPart === '-' ? '' : depPart,
            desc: (cells[4] || '').replace(/\s+/g, ' ').trim(),
        });
    }
    return rows;
}

const all = parseRows(fs.readFileSync(SRC, 'utf8'));
if (all.length === 0) {
    say('[PlanLog] SKIP no detail rows');
    say('[PlanLog] verdict OK');
    process.exit(0);
}

const keyOf = (r) => {
    if (r.state === 'WIRE') return 'W:' + (r.carrier || 'unknown');
    if (r.state === 'CITE') return 'C:' + (r.carrier || 'cite');
    return 'N:' + r.vol;
};

/** 按 keyOrder 顺序聚合，超长则均分成不超过 size 的块（17 → 6/6/5，不剩单面尾巴）。 */
function chunk(list, size) {
    if (list.length <= size) return [list];
    const n = Math.ceil(list.length / size);
    const per = Math.ceil(list.length / n);
    const out = [];
    for (let i = 0; i < list.length; i += per) out.push(list.slice(i, i + per));
    return out;
}

const volOrder = { B: 0, C: 1, E: 2, F: 3 };

// 钉号：用户裁定过的批次编号不再被生成器重排（B-70VT）。
const PINS = process.env.PLAN_PINS || path.join(__dirname, 'plan-pins.json');
const pins = [];
if (fs.existsSync(PINS)) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(PINS, 'utf8'));
    } catch (e) {
        say('[PlanLog] pin-error unreadable ' + path.basename(PINS) + ': ' + e.message);
        process.exit(1);
    }
    const byFace = new Map(all.map((r) => [r.vol + ':' + r.line, r]));
    const seen = new Map();
    for (const id of Object.keys(raw).filter((k) => !k.startsWith('_'))) {
        const entry = raw[id] || {};
        const num = +(/(\d+)\s*$/.exec(id) || [0, 0])[1];
        if (!num) {
            say('[PlanLog] pin-error bad id ' + id);
            process.exit(1);
        }
        if (!Array.isArray(entry.faces) || entry.faces.length === 0) {
            say('[PlanLog] pin-error ' + id + ' needs a non-empty faces array');
            process.exit(1);
        }
        const faces = [];
        const landed = [];
        for (const key of entry.faces) {
            if (seen.has(key)) {
                say('[PlanLog] pin-error face ' + key + ' pinned twice (' + seen.get(key) + ' / ' + id + ')');
                process.exit(1);
            }
            seen.set(key, id);
            const row = byFace.get(key);
            if (row) faces.push(row);
            else landed.push(key);
        }
        pins.push({ id, num, faces, landed, note: entry.note || '' });
    }
    pins.sort((a, b) => a.num - b.num);
    for (const p of pins) {
        if (p.landed.length) {
            say(`[PlanLog] pin ${p.id} already landed, id kept reserved: ${p.landed.join(',')}`);
        }
    }
}

const pinnedKeys = new Set();
for (const p of pins) for (const f of p.faces) pinnedKeys.add(f.vol + ':' + f.line);
const rest = all.filter((r) => !pinnedKeys.has(r.vol + ':' + r.line));

const groups = new Map();
for (const r of rest) {
    const k = keyOf(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
}

const keys = [...groups.keys()].sort((a, b) => {
    const ra = groups.get(a)[0], rb = groups.get(b)[0];
    const va = volOrder[ra.vol] ?? 9, vb = volOrder[rb.vol] ?? 9;
    if (va !== vb) return va - vb;
    const sa = ra.state === 'WIRE' ? 0 : ra.state === 'CITE' ? 1 : 2;
    const sb = rb.state === 'WIRE' ? 0 : rb.state === 'CITE' ? 1 : 2;
    if (sa !== sb) return sa - sb;
    return groups.get(b).length - groups.get(a).length;
});

const startNum = +(/(\d+)/.exec(START) || [0, 71])[1];
const prefix = START.replace(/\d+$/, '') || 'B-';

const pinnedIds = new Set(pins.map((p) => p.id));
const auto = [];
for (const k of keys) {
    for (const part of chunk(groups.get(k), MAX)) {
        auto.push({ key: k, faces: part });
    }
}
let nextNum = startNum;
for (const b of auto) {
    while (pinnedIds.has(prefix + nextNum)) nextNum++;
    b.id = prefix + nextNum;
    nextNum++;
}

const batches = [
    ...pins.filter((p) => p.faces.length > 0)
        .map((p) => ({ id: p.id, key: '', faces: p.faces, pinned: true, note: p.note })),
    ...auto,
];

const lines = [];
lines.push('# 剩余面批次工单（生成物）');
lines.push('');
lines.push('> 由 `node testharness/tools/plan-batches.js` 生成，**不要手改**；preflight 第 11 步用 `--check` 拦陈旧。');
lines.push('> 切分口径：WIRE 按载体簇、CITE 按被引文件、NEW 按卷；每批上限 ' + MAX + ' 面，超长按 census 顺序切块。');
if (pins.length) {
    lines.push('> 钉号：' + pins.map((p) => '`' + p.id + '`' + (p.note ? '（' + p.note + '）' : '')).join('、')
        + ' 为用户裁定的固定编号，面集锁定、不参与自动分组；其余批次跳过这些编号顺延。');
}
lines.push('');
lines.push('## 总览');
lines.push('');
lines.push('| 批次 | 卷 | 面数 | 组成 | 前置 |');
lines.push('| --- | --- | --- | --- | --- |');
batches.forEach((b) => {
    const id = b.id;
    const vols = [...new Set(b.faces.map((f) => f.vol))].join('/');
    const kinds = [...new Set(b.faces.map((f) => f.state))].join('/');
    const comp = b.pinned
        ? '钉号' + (b.note ? '（' + b.note + '）' : '') + ' · ' + kinds
        : (b.key.startsWith('W:') ? b.key.slice(2) : b.key.startsWith('C:') ? 'cite:' + b.key.slice(2) : 'NEW@' + vols) + ' · ' + kinds;
    const deps = [...new Set(b.faces.map((f) => f.deps).filter((d) => d && d !== '-'))].join('/') || '-';
    b.blocked = /BIOME/.test(deps) ? '群系装饰表（E 卷 MixinBiomeDecorator 批）' : '-';
    lines.push(`| ${id} | ${vols} | ${b.faces.length} | ${comp} | ${b.blocked} |`);
});
lines.push('');
lines.push('## 逐批明细');
lines.push('');
for (const b of batches) {
    const refs = [...new Set(b.faces.map((f) => f.ref))];
    lines.push(`### ${b.id}（${b.faces.length} 面，${[...new Set(b.faces.map((f) => f.state))].join('/')}）`);
    lines.push('');
    lines.push('- 组成：' + (b.pinned
        ? '手工钉号' + (b.note ? '（' + b.note + '）' : '') + '，编号由用户裁定，生成器不重排'
        : b.key.startsWith('W:') ? '载体 `' + b.key.slice(2) + '`' : b.key.startsWith('C:') ? '注释引用 `' + b.key.slice(2) + '`' : '新建类'));
    lines.push('- R196 一手：' + refs.map((r) => '`' + r + '`').join('、'));
    if (b.blocked !== '-') lines.push('- 前置：' + b.blocked + '（未落地前本批只做摸底与判据设计）');
    lines.push('- 判据草案：从上述 R196 文件抽「门/常量/掉落/属性」四类判值，日志行沿用同卷已落地面格式，窗口交会话七');
    lines.push('');
    for (const f of b.faces) {
        lines.push(`  - \`${f.vol}:${f.line}\` ${f.ref} —— ${f.desc.slice(0, 96)}`);
    }
    lines.push('');
}

const body = lines.join('\n');
const pinnedCount = batches.filter((b) => b.pinned).length;
say(`[PlanLog] unlanded=${all.length} batches=${batches.length} max=${MAX} start=${START} pinned=${pinnedCount}`);
for (const b of batches) say(`[PlanLog] ${b.id} faces=${b.faces.length} ${b.key || 'PIN'}${b.blocked !== '-' ? ' BLOCKED' : ''}`);

if (argv.includes('--check')) {
    const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    const same = old === body;
    say(`[PlanLog] stale=${!same}`);
    say(`[PlanLog] verdict ${same ? 'OK' : 'STALE'}`);
    process.exit(same ? 0 : 1);
}

fs.writeFileSync(OUT, body, 'utf8');
say(`[PlanLog] wrote playground/audit/census/批次工单.md (${body.split('\n').length} lines)`);
say('[PlanLog] verdict OK');
