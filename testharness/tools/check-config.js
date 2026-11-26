#!/usr/bin/env node
/**
 * check-config —— ETIMConfig.java 静态自检（只读，不起服）。
 *
 * 硬错（exit 1）：
 *   - 字段与 init() 注册不是一一对应（有字段没注册 / 有键没字段）
 *   - 注册的取数函数与字段类型不匹配
 *   - 注册的默认值表达式既不是字段本身、也不等于字段初值
 *   - 数值键的默认值落在声明区间 [min,max] 之外（Forge 会在首启抛错）
 *   - 同一个键被注册两次
 * 提示（不影响退出码）：
 *   - 字段只在 ETIMConfig 内部被读（可能只是转发给子系统，需人工确认）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG = path.join(ROOT, 'src/main/java/io/github/etim/etim/ETIMConfig.java');
const src = fs.readFileSync(CFG, 'utf8');
const lines = src.split(/\r?\n/);

// ---- fields ---------------------------------------------------------------
const fieldRe = /^\s*public\s+static\s+(?!final\b)([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*=\s*(.+?);\s*$/;
const fields = new Map();
let doc = [], inDoc = false, category = '(head)';
for (let i = 0; i < lines.length; i++) {
    const s = lines[i], t = s.trim();
    if (!inDoc && t.startsWith('//')) {
        const m = /^\/\/\s*([A-Za-z][\w .-]*?)\s*(?:\(|-----)/.exec(t);
        if (m) category = m[1].trim();
        continue;
    }
    if (t.startsWith('/**')) { doc = [t]; inDoc = !t.endsWith('*/'); continue; }
    if (inDoc) { doc.push(t); if (t.endsWith('*/')) inDoc = false; continue; }
    const f = fieldRe.exec(s);
    if (f) {
        fields.set(f[2], { type: f[1], def: f[3].trim(), line: i + 1, doc: doc.join(' '), category });
        doc = [];
    }
}

// ---- init() registrations -------------------------------------------------
const initStart = src.indexOf('public static void init(');
if (initStart < 0) {
    console.log('[ConfigLog] FAIL 找不到 init(FMLPreInitializationEvent)');
    process.exit(1);
}
const body = src.slice(initStart);

function callAt(from) {
    const open = body.indexOf('(', from);
    if (open < 0) return null;
    let depth = 0, i = open, quote = false;
    for (; i < body.length; i++) {
        const c = body[i];
        if (quote) {
            if (c === '\\') { i++; continue; }
            if (c === '"') quote = false;
            continue;
        }
        if (c === '"') { quote = true; continue; }
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) return body.slice(open + 1, i); }
    }
    return null;
}

function splitArgs(s) {
    const out = [];
    let depth = 0, quote = false, start = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (quote) { if (c === '\\') i++; else if (c === '"') quote = false; continue; }
        if (c === '"') { quote = true; continue; }
        if (c === '(' || c === '{') depth++;
        else if (c === ')' || c === '}') depth--;
        else if (c === ',' && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
    }
    out.push(s.slice(start).trim());
    return out;
}

const getters = { getBoolean: 'boolean', getInt: 'int', getFloat: 'float', getString: 'String' };
const regs = [];
for (const m of body.matchAll(/config\.(getBoolean|getInt|getFloat|getString|get)\s*\(/g)) {
    const args = callAt(m.index + m[0].length - 1);
    if (!args) continue;
    const a = splitArgs(args);
    const g = m[1];
    if (g === 'get') {
        if (a.length < 3) continue;
        const section = /^"(.*)"$/.exec(a[0]);
        const key = /^"(.*)"$/.exec(a[1]);
        if (!section || !key) continue;
        regs.push({ fn: 'get', key: key[1], category: section[1], defExpr: a[2], min: null, max: null, offset: initStart + m.index });
        continue;
    }
    if (a.length < 3) continue;
    const key = /^"(.*)"$/.exec(a[0]);
    const cat = /^"(.*)"$/.exec(a[1]);
    if (!key || !cat) continue;
    regs.push({
        fn: g, key: key[1], category: cat[1], defExpr: a[2],
        min: a[3] != null ? a[3] : null, max: a[4] != null ? a[4] : null,
        offset: initStart + m.index,
    });
}

// ---- checks ---------------------------------------------------------------
const hard = [], info = [];
const lineOf = (offset) => src.slice(0, offset).split(/\r?\n/).length;
const num = (s) => parseFloat(String(s).replace(/[FfDdLl]$/, ''));

const seen = new Map();
for (const r of regs) {
    if (seen.has(r.key)) hard.push(`键 ${r.key} 重复注册（:${lineOf(r.offset)} 与 :${seen.get(r.key)}）`);
    else seen.set(r.key, lineOf(r.offset));

    const f = fields.get(r.key);
    if (!f) { hard.push(`键 ${r.key} 没有对应字段（:${lineOf(r.offset)}）`); continue; }

    if (r.fn !== 'get') {
        const want = getters[r.fn];
        if (f.type !== want) hard.push(`${r.key}: 字段 ${f.type} 但用 ${r.fn} 注册（:${lineOf(r.offset)}）`);
    }

    const expr = r.defExpr;
    if (expr !== r.key) {
        const isLiteral = /^(true|false)$/.test(expr) || /^".*"$/.test(expr) || /^-?[0-9.]+[FfDdLl]?$/.test(expr);
        if (!isLiteral) {
            hard.push(`${r.key}: 注册默认值不是字段引用也不是字面量（${expr}，:${lineOf(r.offset)}）`);
        } else {
            const norm = (x) => x.replace(/[FfDdLl]$/, '').replace(/^"|"$/g, '');
            if (norm(expr) !== norm(f.def)) {
                hard.push(`${r.key}: 注册默认值 ${expr} ≠ 字段初值 ${f.def}（:${lineOf(r.offset)}）`);
            }
        }
    }

    if (r.min != null && r.max != null) {
        const d = num(f.def), lo = num(r.min), hi = num(r.max);
        if (!isNaN(d) && !isNaN(lo) && !isNaN(hi) && (d < lo || d > hi)) {
            hard.push(`${r.key}: 默认 ${f.def} 落在区间 [${r.min},${r.max}] 外（:${lineOf(r.offset)}）`);
        }
    }
}

for (const [name, f] of fields) {
    if (!seen.has(name)) hard.push(`字段 ${name}（:${f.line}）没有注册到 config`);
}

// usage outside ETIMConfig
function walk(dir, out) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.java')) out.push(p);
    }
    return out;
}
const usage = new Map();
for (const p of walk(path.join(ROOT, 'src/main/java'), [])) {
    if (p === CFG) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/ETIMConfig\.([A-Za-z0-9_]+)/g)) {
        usage.set(m[1], (usage.get(m[1]) || 0) + 1);
    }
}
const configOnly = [...fields.keys()].filter(n => !usage.has(n));

// ---- on-disk drift (--file <cfg>) -----------------------------------------
// Forge never rewrites existing entries, so a config written by an older build
// keeps its old values forever. This mode proves the test baseline still equals
// the code defaults (exit 2 = drift/stale entries).
const fileArg = (() => {
    const i = process.argv.indexOf('--file');
    return i > 0 ? process.argv[i + 1] : null;
})();
const drift = [], stale = [], missing = [];
if (fileArg) {
    if (!fs.existsSync(fileArg)) {
        console.log('[ConfigLog] FAIL --file not found: ' + fileArg);
        process.exit(1);
    }
    const disk = new Map();
    for (const line of fs.readFileSync(fileArg, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([BIDS]):(\w+)=(.*)$/.exec(line);
        if (m) disk.set(m[2], m[3].trim());
    }
    const norm = (x) => {
        const t = String(x).replace(/[FfDdLl]$/, '').replace(/^"|"$/g, '').trim();
        const n = Number(t);
        return t !== '' && !isNaN(n) ? String(n) : t;
    };
    for (const r of regs) {
        const f = fields.get(r.key);
        if (!disk.has(r.key)) { missing.push(r.key); continue; }
        if (norm(disk.get(r.key)) !== norm(f.def)) {
            drift.push(`${r.key}: code=${f.def} disk=${disk.get(r.key)}`);
        }
    }
    const known = new Set(regs.map(r => r.key));
    for (const k of disk.keys()) if (!known.has(k)) stale.push(k);
}

// ---- report ---------------------------------------------------------------
const summary = `[ConfigLog] fields=${fields.size} keys=${regs.length} hard=${hard.length} config_only=${configOnly.length} [local]`;
console.log(summary);
for (const h of hard) console.log('[ConfigLog] HARD ' + h);
if (process.argv.includes('--list')) {
    for (const n of configOnly) {
        const f = fields.get(n);
        console.log(`[ConfigLog] INFO ${n} [${f.category}] 仅 ETIMConfig 内引用（:${f.line}）`);
    }
    const byCat = new Map();
    for (const r of regs) {
        if (!byCat.has(r.category)) byCat.set(r.category, 0);
        byCat.set(r.category, byCat.get(r.category) + 1);
    }
    console.log('[ConfigLog] by_category ' + [...byCat.entries()].map(([c, n]) => `${c}:${n}`).join(' '));
}
if (fileArg) {
    console.log(`[ConfigLog] file=${path.basename(fileArg)} drift=${drift.length} stale=${stale.length} missing=${missing.length}`);
    for (const d of drift) console.log('[ConfigLog] DRIFT ' + d);
    for (const k of stale) console.log('[ConfigLog] STALE ' + k + '（文件里有、代码里没有）');
    for (const k of missing) console.log('[ConfigLog] INFO missing ' + k + '（首启会由 Forge 补写）');
}
const bad = hard.length > 0 ? 1 : (fileArg && (drift.length || stale.length)) ? 2 : 0;
console.log('[ConfigLog] verdict ' + (bad === 0 ? 'OK' : bad === 1 ? 'FAIL' : 'DRIFT'));
process.exit(bad);
