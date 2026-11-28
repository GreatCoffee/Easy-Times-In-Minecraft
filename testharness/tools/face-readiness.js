#!/usr/bin/env node
/**
 * face-readiness — 未立项面的就绪度分级与排程（B-70TM）。
 *
 * 读六卷 census 的「逐面」段里 `状态:【未立项】` 的行（跳过 §3 镜像重复键），
 * 每面判三件事：
 *   1. R196 原文是否在 `mite-src/decompile/src` 里（缺失 = 摸底缺料）；
 *   2. ETIM 是否已有同名载体（`ETIM<X>` / `ETIMBlock<X>` / `ETIMItem<X>` /
 *      `ETIMEntity<X>` / `Mixin<X>`，或任一 ETIM 文件在注释里引用同文件同区间）；
 *   3. 依赖面（BIOME / SPAWN / GUI），由引用文件名推断。
 *
 * 输出 `playground/audit/census/剩余-就绪度.md`（生成物，不手改），
 * 并按「载体簇」给出批次建议。`--check` 只比对，不写盘（preflight 用）。
 *
 *   node testharness/tools/face-readiness.js
 *   node testharness/tools/face-readiness.js --check
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const QUIET = argv.includes('--quiet');

function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

const MW = process.env.READY_BOOKS_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const BOOKS = path.join(MW, 'playground', 'audit', 'census');
const REPO = process.env.READY_REPO || path.resolve(__dirname, '..', '..');
const R196 = process.env.READY_R196 || path.join(MW, 'mite-src', 'decompile', 'src');
const OUT = path.join(BOOKS, '剩余-就绪度.md');

function say(s) { if (!QUIET) console.log(s); }

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

if (!fs.existsSync(BOOKS)) {
    say('[ReadyLog] SKIP census tree absent');
    say('[ReadyLog] verdict OK');
    process.exit(0);
}

const srcFiles = walk(path.join(REPO, 'src', 'main', 'java')).filter((f) => f.endsWith('.java'));
const etimNames = new Set();
const cites = new Map();
for (const f of srcFiles) {
    etimNames.add(path.basename(f, '.java'));
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\b(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) etimNames.add(m[1]);
    for (const m of text.matchAll(/([A-Za-z][A-Za-z0-9_]*\.java):(\d+)(?:\s*-\s*(\d+))?/g)) {
        const k = m[1];
        if (!cites.has(k)) cites.set(k, []);
        cites.get(k).push({ start: +m[2], end: m[3] ? +m[3] : +m[2] });
    }
}
const r196Names = new Set();
if (fs.existsSync(R196)) {
    for (const f of walk(R196).filter((f) => f.endsWith('.java'))) r196Names.add(path.basename(f));
}

const REF = /([A-Za-z][A-Za-z0-9_]*\.java):(\d+)(?:\s*-\s*(\d+))?/g;

function carriersFor(refs) {
    const named = new Set();
    const cited = new Set();
    for (const r of refs) {
        const base = r.name.replace(/\.java$/, '');
        const cand = [
            'ETIM' + base,
            'Mixin' + base,
            base.startsWith('Block') ? 'ETIMBlock' + base.slice(5) : null,
            base.startsWith('Item') ? 'ETIMItem' + base.slice(4) : null,
            base.startsWith('Entity') ? 'ETIMEntity' + base.slice(6) : null,
            base.startsWith('WorldGen') ? 'ETIMWorldGen' + base.slice(8) : null,
        ].filter(Boolean);
        for (const c of cand) if (etimNames.has(c)) named.add(c);
        for (const c of (cites.get(r.name) || [])) {
            if (Math.min(c.end, r.end) >= Math.max(c.start, r.start)) cited.add('~cite:' + r.name);
        }
    }
    return { named: [...named], cited: [...cited] };
}

function depsFor(refs) {
    const names = refs.map((r) => r.name).join(' ');
    const deps = [];
    if (/BiomeGen|WorldGenPlants|BiomeDecorator/.test(names)) deps.push('BIOME');
    if (/WorldServer|EntityLiving\.java:(6\d\d|7\d\d)/.test(names)) deps.push('SPAWN');
    if (/Gui[A-Z]|Container/.test(names)) deps.push('GUI');
    if (/EntityPlayer|EntityLivingBase|ItemStack/.test(names)) deps.push('CORE');
    return deps;
}

const vols = fs.readdirSync(BOOKS).filter((f) => /^普查[A-F].*\.md$/.test(f)).sort();
const faces = [];
for (const vol of vols) {
    const letter = /^普查([A-F])/.exec(vol)[1];
    const lines = fs.readFileSync(path.join(BOOKS, vol), 'utf8').split(/\r?\n/);
    const seen = new Set();
    lines.forEach((s, i) => {
        if (!s.startsWith('[面]')) return;
        const parts = s.split('|').map((x) => x.trim());
        const status = parts.find((p) => p.startsWith('状态:')) || '';
        if (!status.includes('未立项')) return;
        const ref = parts[0].replace(/^\[面\]\s*/, '');
        if (seen.has(ref)) return;
        seen.add(ref);
        const desc = (parts[1] || '').slice(0, 80);
        const refs = [...ref.matchAll(REF)].map((m) => ({ name: m[1], start: +m[2], end: m[3] ? +m[3] : +m[2] }));
        const r196 = refs.length === 0 ? 'none' : (refs.some((r) => r196Names.has(r.name)) ? 'ok' : 'missing');
        const carriers = carriersFor(refs);
        const deps = depsFor(refs);
        faces.push({ vol: letter, line: i + 1, ref, desc, refs, r196, carriers, deps });
    });
}

for (const f of faces) {
    f.state = f.r196 === 'missing' ? 'NO-SOURCE'
        : (f.carriers.named.length ? 'WIRE' : (f.carriers.cited.length ? 'CITE' : 'NEW'));
}

const wire = faces.filter((f) => f.state === 'WIRE');
const cite = faces.filter((f) => f.state === 'CITE');
const fresh = faces.filter((f) => f.state === 'NEW');
const noSrc = faces.filter((f) => f.state === 'NO-SOURCE');

// cluster by first carrier name; citation-only rows cluster by R196 file
const clusters = new Map();
for (const f of [...wire, ...cite]) {
    const key = f.carriers.named[0] || ('cite:' + f.carriers.cited[0].slice(6));
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(f);
}
const clusterList = [...clusters.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const famCount = {};
for (const f of faces) {
    const key = f.vol + ':' + (f.deps[0] || (f.refs[0] ? f.refs[0].name.replace(/\.java$/, '') : '?'));
    famCount[key] = (famCount[key] | 0) + 1;
}

const L = [];
L.push('# 剩余面就绪度与排程（生成物）');
L.push('');
L.push('> 本文件由 `node testharness/tools/face-readiness.js` 生成，**不要手改**；');
L.push('> `--check` 会比对内容，preflight 用它拦「账本变了但排程表没重建」。');
L.push('');
L.push('判据：逐面段 `状态:【未立项】`（跳过 §3 镜像），每面判 R196 原文、ETIM 载体、依赖面。');
L.push('');
L.push(`## 总览`);
L.push('');
L.push('| 项 | 数 |');
L.push('| --- | --- |');
L.push(`| 未立项面 | ${faces.length} |`);
L.push(`| R196 原文齐备 | ${faces.filter((f) => f.r196 === 'ok').length} |`);
L.push(`| 已有同名 ETIM 载体（WIRE，只差行为/接线） | ${wire.length} |`);
L.push(`| 仅注释引用可考（CITE，需确认载体） | ${cite.length} |`);
L.push(`| 需新建载体（NEW） | ${fresh.length} |`);
L.push(`| R196 原文缺失（NO-SOURCE） | ${noSrc.length} |`);
L.push(`| 载体簇 | ${clusterList.length} |`);
L.push('');
L.push('## 分卷');
L.push('');
L.push('| 卷 | 未立项 | WIRE | CITE | NEW | NO-SOURCE |');
L.push('| --- | --- | --- | --- | --- | --- |');
for (const vol of vols) {
    const letter = /^普查([A-F])/.exec(vol)[1];
    const all = faces.filter((f) => f.vol === letter);
    if (!all.length) continue;
    L.push(`| ${letter} | ${all.length} | ${all.filter((f) => f.state === 'WIRE').length} | ${all.filter((f) => f.state === 'CITE').length} | ${all.filter((f) => f.state === 'NEW').length} | ${all.filter((f) => f.state === 'NO-SOURCE').length} |`);
}
L.push('');
L.push('## 载体簇（批次建议，按面数降序）');
L.push('');
L.push('| 载体 | 面数 | 依赖 | 卷:行 |');
L.push('| --- | --- | --- | --- |');
for (const [key, list] of clusterList) {
    const deps = [...new Set(list.flatMap((f) => f.deps))].join(',') || '-';
    const where = list.map((f) => `${f.vol}:${f.line}`).join(' ');
    L.push(`| \`${key}\` | ${list.length} | ${deps} | ${where} |`);
}
L.push('');
L.push('## 逐面明细');
L.push('');
L.push('| 卷:行 | R196 引用 | 状态 | 载体 / 依赖 | 说明 |');
L.push('| --- | --- | --- | --- | --- |');
for (const f of faces) {
    const ref = f.refs.length
        ? f.refs.map((r) => `${r.name}:${r.start}${r.end !== r.start ? '-' + r.end : ''}`).slice(0, 2).join(' + ')
        : f.ref.slice(0, 40);
    const carrier = f.state === 'WIRE' ? f.carriers.named.slice(0, 2).join(', ')
        : (f.state === 'CITE' ? f.carriers.cited.slice(0, 2).join(', ') : '-');
    const deps = f.deps.join(',') || '-';
    L.push(`| ${f.vol}:${f.line} | ${ref} | ${f.state}${f.r196 === 'missing' ? '/NO-SRC' : ''} | ${carrier} / ${deps} | ${f.desc.replace(/\|/g, '/')} |`);
}
L.push('');
const text = L.join('\n');

const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (CHECK) {
    const stale = old !== text;
    say(`[ReadyLog] unlanded=${faces.length} wire=${wire.length} cite=${cite.length} new=${fresh.length} noSource=${noSrc.length} clusters=${clusterList.length} stale=${stale}`);
    say(`[ReadyLog] verdict ${stale ? 'STALE' : 'OK'}`);
    process.exit(stale ? 1 : 0);
}
fs.writeFileSync(OUT, text, 'utf8');
say(`[ReadyLog] unlanded=${faces.length} wire=${wire.length} cite=${cite.length} new=${fresh.length} noSource=${noSrc.length} clusters=${clusterList.length}`);
say(`[ReadyLog] wrote ${path.relative(MW, OUT).replace(/\\/g, '/')} (${text.split('\n').length} lines)`);
