#!/usr/bin/env node
/**
 * extract-values — 从 R196 一手源码里抽「判值候选」，按面汇总成表（B-70TO）。
 *
 * 产物是**候选表**，不是结论：每条都带 R196 行号，落码前仍要人工逐条校对。
 * 抽取四类：
 *   常量   static final X NAME = <literal>
 *   属性   setBaseValue / setMaxHealth / getEntityAttribute(...).setBaseValue
 *   门     if (...) 且条件里出现数字或 blood/moon/biome/skylight/depth/overworld/rand
 *   掉落   dropItem / entityDropItem / dropBlockAsEntityItem / getDropItemId / dropFewItems
 *
 *   node testharness/tools/extract-values.js --batch B-71
 *   node testharness/tools/extract-values.js --face C:37
 *   node testharness/tools/extract-values.js --file EntityGhoul.java
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const ROOT = process.env.VALUES_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const BOOKS = path.join(ROOT, 'playground', 'audit', 'census');
const R196 = process.env.VALUES_R196 || path.join(ROOT, 'mite-src', 'decompile', 'src', 'net', 'minecraft');
const READY = path.join(BOOKS, '剩余-就绪度.md');
const PLAN = path.join(BOOKS, '批次工单.md');

const CONST_RE = /^\s*(?:public|private|protected)?\s*static\s+final\s+([\w.<>\[\]]+)\s+(\w+)\s*=\s*([^;]+);/;
const METHOD_RE = /^\s{4}(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?[\w.<>\[\], ]+\s+(\w+)\s*\(([^)]*)\)\s*\{?\s*$/;
const ATTR_RE = /\b(setAttribute|setBaseValue|setMaxHealth|setMaxHurtResistantTime)\s*\(([^;]*)\)/;
const DROP_RE = /\b(dropItem|entityDropItem|dropBlockAsEntityItem|getDropItemId|dropFewItems|addDrop)\b/;
const EFFECT_RE = /\b(addPotionEffect|new PotionEffect|addExperience|attackEntityFrom|heal)\b/;
const GATE_WORDS = /blood|moon|biome|skylight|depth|overworld|rand|nextInt|nextFloat|isDay|canSeeSky/i;

function readLines(file) {
    const p = path.join(R196, file);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8').split(/\r?\n/);
}

/** 用大括号配平找方法区间：返回 [{name, sig, start, end}]（1-based 行号，含上下沿）。 */
function methods(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = METHOD_RE.exec(lines[i]);
        if (!m) continue;
        let depth = 0, started = false, end = -1;
        for (let j = i; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '{') { depth++; started = true; }
                else if (ch === '}') depth--;
            }
            if (started && depth === 0) { end = j; break; }
        }
        if (end > i) out.push({ name: m[1], sig: lines[i].trim(), start: i, end });
    }
    return out;
}

function gateAt(line) {
    const s = line.trim();
    if (!/^\}?\s*(if|else if)\s*\(/.test(s) && !/^\s*if\s*\(/.test(s)) return null;
    const open = s.indexOf('(');
    if (open < 0) return null;
    let depth = 0, close = -1;
    for (let i = open; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) return null;
    const cond = s.slice(open + 1, close);
    if (!/\d/.test(cond) && !GATE_WORDS.test(cond)) return null;
    return cond.replace(/\s+/g, ' ');
}

function extract(file) {
    const lines = readLines(file);
    if (!lines) return null;
    const consts = [];
    lines.forEach((s, i) => {
        const m = CONST_RE.exec(s);
        if (m) consts.push({ line: i + 1, type: m[1], name: m[2], value: m[3].trim() });
    });
    const items = [];
    lines.forEach((s, i) => {
        const a = ATTR_RE.exec(s);
        if (a) items.push({ line: i + 1, kind: '属性', text: s.trim() });
        const d = DROP_RE.exec(s);
        if (d) {
            const deadEnd = /getDropItemId\(\)\s*\{/.test(s) && /^\s*return\s+-1\s*;/.test((lines[i + 1] || ''));
            if (!deadEnd) items.push({ line: i + 1, kind: '掉落', text: s.trim() });
        }
        if (EFFECT_RE.test(s)) items.push({ line: i + 1, kind: '效果', text: s.trim() });
        const g = gateAt(s);
        if (g) items.push({ line: i + 1, kind: '门', text: 'if (' + g + ')' });
    });
    return { file, lines, consts, items, methods: methods(lines) };
}

function facesFromBatch(batch) {
    if (!fs.existsSync(PLAN)) throw new Error('批次工单.md absent; run plan-batches.js first');
    const text = fs.readFileSync(PLAN, 'utf8').split(/\r?\n/);
    let inBatch = false;
    const faces = [];
    for (const s of text) {
        const h = /^### (B-\d+[A-Z]*\d*)/.exec(s);
        if (h) { inBatch = h[1] === batch; continue; }
        if (!inBatch) continue;
        const m = /^\s+- `([A-F]:\d+)` (\S+\.java:\d+(?:-\d+)?)/.exec(s);
        if (m) faces.push({ key: m[1], ref: m[2] });
    }
    return faces;
}

function facesFromReady() {
    if (!fs.existsSync(READY)) throw new Error('剩余-就绪度.md absent; run face-readiness.js first');
    const faces = [];
    for (const s of fs.readFileSync(READY, 'utf8').split(/\r?\n/)) {
        if (!s.startsWith('| ')) continue;
        const c = s.split('|').slice(1, -1).map((x) => x.trim());
        if (!/^[A-F]:\d+$/.test(c[0] || '')) continue;
        faces.push({ key: c[0], ref: (c[1] || '').replace(/`/g, ''), state: c[2] });
    }
    return faces;
}

const faceArg = arg('--face');
const batchArg = arg('--batch');
const fileArg = arg('--file');

let targets = [];
if (fileArg) targets = [{ key: 'file', ref: fileArg }];
else if (faceArg) {
    const all = facesFromReady();
    targets = all.filter((f) => f.key === faceArg);
    if (targets.length === 0) { console.error('[ValuesLog] face not found: ' + faceArg); process.exit(2); }
} else if (batchArg) {
    targets = facesFromBatch(batchArg);
    if (targets.length === 0) { console.error('[ValuesLog] batch not found or empty: ' + batchArg); process.exit(2); }
} else {
    console.error('usage: extract-values.js --batch B-71 | --face C:37 | --file X.java');
    process.exit(2);
}

const cache = new Map();
const get = (f) => {
    if (!cache.has(f)) cache.set(f, extract(f));
    return cache.get(f);
};

const out = [];
out.push('# 判值候选表' + (batchArg ? '：' + batchArg : faceArg ? '：' + faceArg : '：' + fileArg));
out.push('');
out.push('> 由 `node testharness/tools/extract-values.js` 生成。**候选表，不是结论**：');
out.push('> 每条带 R196 行号，落码前逐条回原文校对；启发式抽取会漏（例如循环里的阈值、外部常量）。');
out.push('');

let missing = 0, totalItems = 0;
for (const t of targets) {
    let ref = t.ref;
    if (/^[A-Za-z][A-Za-z0-9_]*\.java$/.test(ref)) {
        const ex0 = get(ref);
        ref = ref + ':1-' + (ex0 ? ex0.lines.length : 1);
    }
    const m = /^([A-Za-z][A-Za-z0-9_]*\.java):(\d+)(?:-(\d+))?$/.exec(ref);
    if (!m) { out.push(`## ${t.key} ${t.ref}`); out.push(''); out.push('- （非 class:line 形式，跳过）'); out.push(''); continue; }
    const ex = get(m[1]);
    out.push(`## ${t.key} · ${t.ref}`);
    out.push('');
    if (!ex) { out.push('- R196 原文缺失：`' + m[1] + '`'); out.push(''); missing++; continue; }
    const start = +m[2], end = m[3] ? +m[3] : +m[2];
    const hosts = ex.methods.filter((x) => x.start + 1 <= end && x.end + 1 >= start);
    if (hosts.length === 0) {
        out.push('- 未落在任何方法内（字段声明/匿名块），下面列文件级常量与该行附近候选：');
        for (const c of ex.consts.slice(0, 20)) out.push(`  - [常量] L${c.line} \`${c.name} = ${c.value}\``);
        for (const it of ex.items.filter((x) => x.line >= start - 5 && x.line <= end + 5).slice(0, 20)) {
            out.push(`  - [${it.kind}] L${it.line} \`${it.text.slice(0, 140)}\``);
            totalItems++;
        }
        out.push('');
        continue;
    }
    const empty = [];
    for (const host of hosts) {
        const scoped = ex.items.filter((it) => it.line >= host.start + 1 && it.line <= host.end + 1);
        if (scoped.length === 0) { empty.push(`${host.name}(L${host.start + 1})`); continue; }
        out.push(`- 方法 \`${host.sig.replace(/\s*\{$/, '')}\`（L${host.start + 1}-${host.end + 1}，候选 ${scoped.length} 条）`);
        for (const it of scoped.slice(0, 16)) {
            out.push(`  - [${it.kind}] L${it.line} \`${it.text.slice(0, 140)}\``);
            totalItems++;
        }
        const rel = ex.consts.filter((c) => scoped.some((s) => s.text.includes(c.name)));
        if (rel.length) {
            for (const c of rel.slice(0, 6)) out.push(`  - [常量] L${c.line} \`${c.name} = ${c.value}\``);
        }
    }
    if (empty.length) out.push(`- 无候选的方法：${empty.join('、')}`);
    out.push('');
}

const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
out.push('---');
out.push(`抽取：faces=${targets.length} items=${totalItems} missingFile=${missing} at ${stamp}`);

const body = out.join('\n');
const name = batchArg ? '判值表-' + batchArg : faceArg ? '判值表-' + faceArg.replace(':', '-') : '判值表-file';
const outPath = path.join(BOOKS, name + '.md');
fs.writeFileSync(outPath, body, 'utf8');
console.log(`[ValuesLog] faces=${targets.length} items=${totalItems} missingFile=${missing}`);
console.log(`[ValuesLog] wrote playground/audit/census/${name}.md (${body.split('\n').length} lines)`);
console.log('[ValuesLog] verdict OK');
