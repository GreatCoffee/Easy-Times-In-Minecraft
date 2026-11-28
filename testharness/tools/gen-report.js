#!/usr/bin/env node
/**
 * gen-report.js —— 对照报告草稿生成器（B-70UY）
 *
 * 把「批次面集 + 就绪度 + 判值表 + R196 原文 + ETIM 载体」拼成一份对照报告初稿，
 * 供会话六核对。生成物是**草稿**：判值仍需回原文逐行核，分级表留空给人填。
 *
 *   node testharness/tools/gen-report.js --batch B-71
 *   node testharness/tools/gen-report.js --batch B-71 --check   # 只比对是否过期
 *   node testharness/tools/gen-report.js --batch B-71 --out <path>
 *
 * 环境变量：REPORT_ROOT（工作区根）、REPORT_REPO（mod 仓）、REPORT_R196。
 * 退出码：0 OK / 1 过期或输入缺失 / 2 参数错。
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.REPORT_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const REPO = process.env.REPORT_REPO || path.resolve(__dirname, '..', '..');
const R196 = process.env.REPORT_R196 || path.join(ROOT, 'mite-src', 'decompile', 'src', 'net', 'minecraft');
const CENSUS = path.join(ROOT, 'playground', 'audit', 'census');
const PLAN = path.join(CENSUS, '批次工单.md');
const READY = path.join(CENSUS, '剩余-就绪度.md');
const VALUES_DIR = path.join(CENSUS, '判值表');
const OUT_DIR = path.join(ROOT, 'playground', 'audit', 'draft');

const MAX_VALUES = 14;
const MAX_EXCERPT = 26;

/**
 * 判值表行的「结构化候选」标记：`  - [掉落] L121 ...`（带类别 + 行号）。
 * 原文窗口行是 `  - [L121] ...`，只有行号没有类别，不算结构化候选。
 */
function isStructured(line) {
    return /\[(?!L\d+\])[^\]]+\]\s*L\d+/.test(line);
}


function arg(name, fallback) {
    const i = process.argv.indexOf('--' + name);
    return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : fallback;
}

function read(p) {
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
}

/** 工单：`### B-71 …` 段内的 `- \`C:141\` EntityPlayer.java:1859 —— 说明` 行。 */
function facesFromPlan(text, batch) {
    const lines = text.split(/\r?\n/);
    const head = lines.findIndex((l) => new RegExp('^###\\s+' + batch + '\\b').test(l));
    if (head < 0) return null;
    let end = lines.length;
    for (let i = head + 1; i < lines.length; i++) {
        if (/^###\s+/.test(lines[i]) || /^##\s+/.test(lines[i])) { end = i; break; }
    }
    const out = [];
    for (let i = head; i < end; i++) {
        const m = /^\s*-\s+`([A-F]:\d+)`\s+(\S+)\s+——\s+(.*)$/.exec(lines[i]);
        if (m) out.push({ key: m[1], ref: m[2], desc: m[3].trim(), vol: m[1].slice(0, 1) });
    }
    return out;
}

/** 就绪度：逐面明细表 `| B:17 | X.java:17 | NEW | 载体 / 依赖 | 说明 |`。 */
function readiness(text) {
    const map = new Map();
    for (const line of text.split(/\r?\n/)) {
        const m = /^\|\s*([A-F]:\d+)\s*\|\s*([^|]+?)\s*\|\s*(WIRE|CITE|NEW|NO-SOURCE)\s*\|\s*([^|]*?)\s*\|/.exec(line);
        if (m) {
            const parts = m[4].split('/').map((s) => s.trim());
            map.set(m[1], { state: m[3], carrier: parts[0] && parts[0] !== '-' ? parts[0] : null, deps: parts[1] || '-' });
        }
    }
    return map;
}

/** 判值表：`## C:141 · EntityPlayer.java:1859` 段。 */
function valuesFrom(text, keys) {
    const map = new Map();
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const m = /^##\s+([A-F]:\d+)\s+·\s+/.exec(lines[i]);
        if (!m || !keys.has(m[1])) continue;
        const body = [];
        for (let j = i + 1; j < lines.length && !/^##\s+/.test(lines[j]); j++) {
            if (lines[j].trim()) body.push(lines[j]);
        }
        map.set(m[1], body);
    }
    return map;
}

function span(ref) {
    const m = /^(.*?):(\d+)(?:-(\d+))?$/.exec(ref);
    if (!m) return null;
    const a = +m[2];
    const b = m[3] ? +m[3] : a;
    return { file: m[1], a, b };
}

function excerpt(ref) {
    const s = span(ref);
    if (!s) return null;
    const p = path.join(R196, s.file);
    const text = read(p);
    if (!text) return null;
    const lines = text.split(/\r?\n/);
    let from = s.a;
    let to = s.b;
    if (to - from > MAX_EXCERPT) to = from + MAX_EXCERPT - 1;
    if (to === from) { from = Math.max(1, s.a - 6); to = Math.min(lines.length, s.a + 6); }
    const out = [];
    for (let n = from; n <= to && n <= lines.length; n++) out.push(`[L${n}] ${lines[n - 1]}`);
    return { from, to, lines: out };
}

function etimInfo(carrier) {
    if (!carrier) return { file: null, channels: [], lines: 0 };
    const base = path.basename(/\.java$/.test(carrier) ? carrier : carrier + '.java');
    const roots = [path.join(REPO, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim')];
    let hit = null;
    const walk = (d) => {
        if (hit) return;
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (hit) return;
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name === base) hit = p;
        }
    };
    for (const r of roots) if (fs.existsSync(r)) walk(r);
    if (!hit) return { file: null, channels: [], lines: 0 };
    const t = fs.readFileSync(hit, 'utf8');
    const chans = [...new Set([...t.matchAll(/\[([A-Z][A-Za-z0-9]*Log)\]/g)].map((m) => m[1]))];
    return {
        file: path.relative(REPO, hit).replace(/\\/g, '/'),
        channels: chans,
        lines: t.split(/\r?\n/).length,
    };
}

function fingerprint(parts) {
    const crypto = require('crypto');
    const h = crypto.createHash('sha256');
    for (const p of parts) h.update(String(p));
    return h.digest('hex').slice(0, 12).toUpperCase();
}

function build(batch) {
    const planText = read(PLAN);
    const readyText = read(READY);
    if (!planText || !readyText) return { error: 'missing 批次工单.md / 剩余-就绪度.md' };
    const faces = facesFromPlan(planText, batch);
    if (!faces) return { error: 'batch not found in 批次工单.md: ' + batch };
    if (!faces.length) return { error: 'batch has no faces: ' + batch };
    const ready = readiness(readyText);
    const keys = new Set(faces.map((f) => f.key));
    const vals = new Map();
    for (const v of ['B', 'C', 'E', 'F']) {
        const t = read(path.join(VALUES_DIR, '判值表-' + v + '.md'));
        if (!t) continue;
        for (const [k, body] of valuesFrom(t, keys)) vals.set(k, body);
    }

    const today = new Date().toISOString().slice(0, 10);
    const fp = fingerprint([planText.length, readyText.length, faces.length]);
    const out = [];
    out.push(`# ${batch} 对照报告 · 草稿（生成物，待会话六核定）`, '');
    out.push('> 由 `node testharness/tools/gen-report.js --batch ' + batch + '` 生成，**不要手改**：', '> 改账本或判值表后重跑；`--check` 会拦过期。');
    out.push('> 本稿只做「把已知输入排到一张纸上」，判值仍须回 R196 原文逐行核；§3/§4 留给会话六与终审填。', '');
    out.push(`- 生成日期：${today}`);
    out.push(`- 面数：${faces.length}`);
    out.push(`- 输入指纹：\`${fp}\``, '');

    // §1
    out.push('## §1 面集与本稿判断', '');
    out.push('| 键 | R196 一手 | 就绪 | ETIM 载体 | 载体文件内通道 |', '| --- | --- | --- | --- | --- |');
    const detail = [];
    let noCarrier = 0;
    let noChannel = 0;
    const hasCandidate = (l) => /\[(?!L\d+\])[^\]]+\]\s*L\d+/.test(l);
    let noValues = 0;
    for (const f of faces) {
        const r = ready.get(f.key) || { state: '?', carrier: null, deps: '-' };
        const e = etimInfo(r.carrier);
        const v = vals.get(f.key) || [];
        if (!r.carrier) noCarrier++;
        if (r.carrier && !e.channels.length) noChannel++;
        if (!v.some(isStructured)) noValues++;
        out.push(`| \`${f.key}\` | ${f.ref} | ${r.state} | ${r.carrier ? '`' + r.carrier + '`' : '—'} | ${e.channels.length ? e.channels.map((c) => '`[' + c + ']`').join(' ') : '—'} |`);
        detail.push({ f, r, e, v });
    }
    out.push('');
    out.push(`> 原始面 ${faces.length}：无载体 ${noCarrier} / 有载体但零通道 ${noChannel} / 判值表仅上下文（无结构化候选）${noValues}`);
    out.push('');

    // §2
    out.push('## §2 逐面材料', '');
    for (const d of detail) {
        out.push(`### ${d.f.key} · ${d.f.ref}`, '');
        out.push(`- 工单说明：${d.f.desc}`);
        out.push(`- 就绪：**${d.r.state}**；依赖：${d.r.deps}`);
        if (d.e.file) out.push(`- ETIM 载体：\`${d.e.file}\`（${d.e.lines} 行）${d.e.channels.length ? '，通道 ' + d.e.channels.map((c) => '`[' + c + ']`').join(' ') : '，**无判据通道**'}`);
        else out.push('- ETIM 载体：**未找到同名类**（NEW 面需新建）');
        out.push('');
        const structured = d.v.some(isStructured);
        if (structured) {
            out.push('R196 判值候选（判值表，最多 ' + MAX_VALUES + ' 条，其余见判值表）：', '');
            for (const line of d.v.slice(0, MAX_VALUES)) out.push(line.startsWith('-') ? line : '- ' + line);
            if (d.v.length > MAX_VALUES) out.push(`- …另有 ${d.v.length - MAX_VALUES} 条`);
            out.push('');
        } else if (d.v.length) {
            out.push('R196 判值候选：**判值表只给了原文窗口**（该面未落在已识别方法内），需逐行核：', '');
            for (const line of d.v.slice(0, Math.min(4, d.v.length))) out.push(line.startsWith('-') ? line : '- ' + line);
            out.push('');
        } else {
            out.push('R196 判值候选：**判值表无条目**——需回原文逐行核。', '');
        }
        const ex = excerpt(d.f.ref);
        if (ex) {
            out.push(`R196 原文摘录（${d.f.ref} 的 L${ex.from}-L${ex.to}）：`, '', '```java');
            for (const l of ex.lines) out.push(l);
            out.push('```', '');
        } else {
            out.push('R196 原文摘录：**原文缺失或引用不可解析**。', '');
        }
        const todos = [];
        if (!d.r.carrier) todos.push('无载体：落码前确认是新类还是挂到既有类');
        if (d.r.carrier && !d.e.channels.length) todos.push('载体无判据通道：落码时必须补 `[XxxLog]` 行，否则窗口验不了');
        if (structured) todos.push('判值表有结构化候选：核对判值后可直接进终审');
        else todos.push('判值表只给原文窗口：会话六须回原文逐行核判值');
        if (d.r.state === 'CITE') todos.push('仅注释引用：需确认载体是否真是个载体');
        if (!todos.length) todos.push('材料齐：核对判值后可直接进终审');
        out.push('会话六待办：', '');
        for (const t of todos) out.push('- [ ] ' + t);
        out.push('');
    }

    // §3/§4 blanks
    out.push('## §3 待裁 D 位（会话六填）', '', '| 编号 | 问题 | 选项 | 建议 |', '| --- | --- | --- | --- |', '| D-1 |  |  |  |', '');
    out.push('## §4 分级（终审填）', '', '| 级别 | 编号 | 内容 | 依据 file:line |', '| --- | --- | --- | --- |', '| A |  |  |  |', '| B |  |  |  |', '| C |  |  |  |', '');
    out.push('## §5 终判（会话六填）', '', '- 结论：DIFF / MATCH', '- A=/B=/C=', '- 一句话：', '');
    return { text: out.join('\n'), faces: faces.length, noCarrier, noChannel, noValues };
}

function main() {
    if (arg('check-dir', false)) {
        const dir = OUT_DIR;
        if (!fs.existsSync(dir)) { console.log('[DraftLog] drafts=0 verdict OK (no dir)'); return; }
        const drafts = fs.readdirSync(dir).filter((f) => f.endsWith('-对照报告-草稿.md'));
        let stale = 0;
        for (const f of drafts) {
            const batch = f.replace('-对照报告-草稿.md', '');
            const built = build(batch);
            const old = read(path.join(dir, f));
            const ok = !built.error && old === built.text;
            if (!ok) { stale++; console.log('[DraftLog] stale ' + f + (built.error ? ' (' + built.error + ')' : '')); }
        }
        console.log(`[DraftLog] drafts=${drafts.length} stale=${stale} verdict ${stale ? 'STALE' : 'OK'}`);
        process.exit(stale ? 1 : 0);
        return;
    }
    const batch = arg('batch');
    if (!batch || batch === true) { console.error('[DraftLog] usage: --batch B-71 [--check] [--out path]'); process.exit(2); }
    const built = build(batch);
    if (built.error) { console.error('[DraftLog] ' + built.error); process.exit(1); }
    const outPath = arg('out') || path.join(OUT_DIR, batch + '-对照报告-草稿.md');
    const check = !!arg('check', false);
    const old = read(outPath);
    if (check) {
        const same = old === built.text;
        console.log(`[DraftLog] file=${path.relative(ROOT, outPath).replace(/\\/g, '/')} faces=${built.faces} stale=${same ? 0 : 1}`);
        console.log('[DraftLog] verdict ' + (same ? 'OK' : 'STALE'));
        process.exit(same ? 0 : 1);
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, built.text, 'utf8');
    console.log(`[DraftLog] file=${path.relative(ROOT, outPath).replace(/\\/g, '/')} faces=${built.faces} noCarrier=${built.noCarrier} noChannel=${built.noChannel} noValues=${built.noValues} bytes=${Buffer.byteLength(built.text)}`);
}

if (require.main === module) main();
module.exports = { build };
