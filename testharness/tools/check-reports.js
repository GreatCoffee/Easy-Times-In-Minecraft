#!/usr/bin/env node
'use strict';
// 报告卫生检查：索引新鲜度、报告内引用的文件/提交是否还活着、孤儿报告计数。
// 只读；--write-index 时重建 INDEX.md（机制生成物）。
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const arg = (k, d) => {
    const i = process.argv.indexOf(k);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const flag = (k) => process.argv.includes(k);

const REPO = arg('--repo', process.env.REPORT_REPO || path.resolve(__dirname, '..', '..'));
const WS = arg('--root', process.env.REPORT_ROOT || path.resolve(REPO, '..', '..'));
const REP = path.join(REPO, 'testharness', 'reports');
const INDEX = path.join(REP, 'INDEX.md');
const SKIP = new Set(['.git', 'build', 'run', 'node_modules', '.worktrees', 'logs', 'obfuscated']);

if (!fs.existsSync(REP)) {
    console.log('[ReportLog] SKIP reports tree absent: ' + REP);
    process.exit(0);
}

/* ---------- file index ---------- */
const index = new Map();
function add(rel) {
    const base = rel.split('/').pop();
    if (!index.has(base)) index.set(base, []);
    index.get(base).push(rel);
}
function walk(dir, rel, depth) {
    if (depth > 10) return;
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of ents) {
        if (SKIP.has(d.name)) continue;
        const r = rel ? rel + '/' + d.name : d.name;
        if (d.isDirectory()) walk(path.join(dir, d.name), r, depth + 1);
        else add(r);
    }
}
walk(REPO, '', 0);
walk(path.join(WS, 'playground'), 'playground', 0);
walk(path.join(WS, 'mite-src'), 'mite-src', 0);
walk(path.join(REPO, 'build', 'rfg', 'minecraft-src'), 'build/rfg/minecraft-src', 0);
for (const f of fs.readdirSync(WS)) {
    try { if (fs.statSync(path.join(WS, f)).isFile()) add(f); } catch (e) { /* ignore */ }
}

const EXTERNAL = /^(?:entities\.js|inventory\.js|lib\/plugins\/)|node_modules/;
const VOLATILE_BASE = new Set(['ops.json', 'options.txt', 'usercache.json', 'usernamecache.json', 'evidence.json', 'servers.dat', 'level.dat', 'banned-ips.json', 'banned-players.json']);
const VOLATILE = /^(?:run\/|build\/|\.mixin\.out|testharness\/build-logs\/|obfuscated\/)/;

/* 旧名 → 现址；历史报告不改写，靠这张表继续可点 */
const ALIASES = loadJson('report-aliases.json', {});
/* 按设计已不存在的历史产物：只计数 */
const RETIRED = loadJson('report-retired.json', { files: [], patterns: [] });
const RETIRED_FILES = new Set(RETIRED.files || []);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (m) => '\\' + m);
const RETIRED_PATTERNS = (RETIRED.patterns || []).map((g) => new RegExp('^' + g.split('*').map(esc).join('.*') + '$'));
const isRetired = (base) => RETIRED_FILES.has(base) || RETIRED_PATTERNS.some((r) => r.test(base));

function loadJson(name, dflt) {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8')); }
    catch (e) { return dflt; }
}

function norm(tok) {
    return tok
        .replace(/^(?:\.\.?\/)+/, '')
        .replace(/^git-workspace\/etim\//, '');
}
function resolves(tok) {
    const t = norm(tok);
    if (fs.existsSync(path.join(REPO, t)) || fs.existsSync(path.join(WS, t))) return true;
    // B-70UC: historical window scripts live in testharness/archive/player/ now.
    if (t.startsWith('testharness/player/')) {
        const moved = 'testharness/archive/player/' + t.slice('testharness/player/'.length);
        if (fs.existsSync(path.join(REPO, moved))) return true;
    }
    const base = t.split('/').pop();
    const list = index.get(base) || [];
    if (!list.length) return false;
    if (!t.includes('/')) return true;
    return list.some((p) => p === t || p.endsWith('/' + t));
}

/* ---------- reports ---------- */
const META = new Set(['INDEX.md', 'README.md']);
const files = fs.readdirSync(REP).filter((f) => f.endsWith('.md') && !META.has(f)).sort();
const text = new Map(files.map((f) => [f, fs.readFileSync(path.join(REP, f), 'utf8')]));

const ledgerPath = path.join(WS, 'playground', 'audit', '账册', '现行账.md');
const sessionsPath = path.join(WS, 'playground', 'sessions.md');
const ledger = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8') : '';
const sessions = fs.existsSync(sessionsPath) ? fs.readFileSync(sessionsPath, 'utf8') : '';
const censusDir = path.join(WS, 'playground', 'audit', 'census');
let censusText = '';
try {
    for (const f of fs.readdirSync(censusDir)) {
        const q = path.join(censusDir, f);
        if (fs.statSync(q).isFile() && f.endsWith('.md')) censusText += fs.readFileSync(q, 'utf8');
    }
} catch (e) { /* census optional */ }

const refByReport = new Map();
for (const f of files) {
    for (const [g, t] of text) {
        if (g === f) continue;
        if (t.includes(f)) {
            if (!refByReport.has(f)) refByReport.set(f, []);
            refByReport.get(f).push(g);
        }
    }
}
function refsOf(f) {
    const r = [];
    if (ledger.includes(f)) r.push('ledger');
    if (sessions.includes(f)) r.push('sessions');
    if (censusText.includes(f)) r.push('census');
    if ((refByReport.get(f) || []).length) r.push('report');
    return r;
}

/* ---------- checks ---------- */
const deadDoc = [];
const deadSource = [];
const deadHash = [];
let volatileRefs = 0, extRefs = 0, pathRefs = 0, aliased = 0, retired = 0;

const PATH_RE = /`([A-Za-z0-9_@.][A-Za-z0-9_@./-]*\.(?:md|js|java|json|out|png|txt|gradle|yml|lang|ps1|sh|xml))(?::(\d+)(?:-(\d+))?)?`/g;

for (const [f, t] of text) {
    for (const m of t.matchAll(PATH_RE)) {
        const raw = m[1];
        if (raw.includes('..') && !raw.startsWith('../')) continue;
        pathRefs++;
        if (resolves(raw)) continue;
        const n = norm(raw);
        const alias = ALIASES[n];
        if (alias && resolves(alias)) { aliased++; continue; }
        if (EXTERNAL.test(n)) { extRefs++; continue; }
        const base = n.split('/').pop();
        if (VOLATILE.test(n) || VOLATILE_BASE.has(base) || base.endsWith('.out')) { volatileRefs++; continue; }
        if (isRetired(base)) { retired++; continue; }
        const line = m[2] ? m[2] + (m[3] ? '-' + m[3] : '') : '';
        if (/\.md$/.test(base)) deadDoc.push({ f, raw, line });
        else deadSource.push({ f, raw, line });
    }
}

const CTX = /(commit|提交|HEAD|hash|哈希|SHA|祖|abbrev)/i;
let hashRefs = 0;
for (const [f, t] of text) {
    const re = /(?<![0-9A-Za-z_])([0-9a-f]{7,40})(?![0-9A-Za-z_])/g;
    for (const m of t.matchAll(re)) {
        const h = m[1];
        if (!/[a-f]/.test(h) || !/[0-9]/.test(h)) continue;
        if (/^0x/i.test(t.slice(Math.max(0, m.index - 2), m.index))) continue;
        if (h.length !== 40 && (h.length < 7 || h.length > 12)) continue;
        // UUID 片段不是提交哈希：向外扩到整个十六进制串再判形
        let a = m.index;
        while (a > 0 && /[0-9a-f-]/.test(t[a - 1])) a--;
        let b = m.index + h.length;
        while (b < t.length && /[0-9a-f-]/.test(t[b])) b++;
        const tok = t.slice(a, b);
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tok)) continue;
        const before = t.slice(Math.max(0, m.index - 60), m.index);
        const inline = /`[^`]{0,12}$/.test(before) || /[=:：]\s*$/.test(before);
        if (!CTX.test(before) && !inline) continue;
        hashRefs++;
        try {
            cp.execFileSync('git', ['-C', REPO, 'cat-file', '-e', h + '^{commit}'], { stdio: 'ignore' });
        } catch (e) { deadHash.push({ f, h }); }
    }
}

const orphans = files.filter((f) => refsOf(f).length === 0);
let indexRows = null, indexMissing = [];
if (fs.existsSync(INDEX)) {
    const it = fs.readFileSync(INDEX, 'utf8');
    indexRows = (it.match(/^\| `[^`]+\.md` \|/gm) || []).length;
    const listed = new Set((it.match(/^\| `([^`]+\.md)` \|/gm) || []).map((s) => s.replace(/^\| `/, '').replace(/` \|$/, '')));
    indexMissing = files.filter((f) => !listed.has(f));
}

function conclusionOf(t) {
    const lines = t.split(/\r?\n/);
    for (const l of lines) {
        if (/^\s*\|/.test(l)) continue;
        if (/[{}]/.test(l)) continue;
        if (/(终判|结论|判定|判决|verdict)/i.test(l) && /(PASS|FAIL|放行|退回|✓|✗|DIFF|MATCH)/i.test(l)) {
            return l.replace(/^[#>\-\s*]+/, '').replace(/\|/g, '/').slice(0, 120);
        }
    }
    for (const l of lines) if (/^#\s+/.test(l)) return l.replace(/^#\s+/, '').slice(0, 120);
    return '';
}

if (flag('--write-index')) {
    const rows = files.map((f) => {
        const t = text.get(f);
        const size = Buffer.byteLength(t, 'utf8');
        const refs = refsOf(f).join('/') || '无';
        return '| `' + f + '` | ' + size + ' | ' + refs + ' | ' + conclusionOf(t).replace(/\|/g, '/') + ' |';
    });
    const body = [
        '# 判窗报告索引',
        '',
        '> 机制生成（`node testharness/tools/check-reports.js --write-index`）：共 ' + files.length + ' 份。',
        '> 引用方 = 账册 / sessions / census / 其他报告；「无」表示目前没有出处引用（历史留存）。',
        '> 结论列取文中首个「终判/结论/判决/verdict」行，取不到退回一级标题；正文一字未改。',
        '',
        '| 文件 | 字节 | 引用方 | 结论 |',
        '|---|---|---|---|',
        ...rows,
        '',
    ].join('\n');
    fs.writeFileSync(INDEX, body, 'utf8');
    console.log('[ReportLog] wrote testharness/reports/INDEX.md (' + files.length + ' rows)');
    indexRows = files.length;
    indexMissing = [];
}

/* ---------- report ---------- */
const hard = deadDoc.length + deadSource.length + deadHash.length + indexMissing.length;
const uniqHash = [...new Set(deadHash.map((d) => d.h))];

console.log('[ReportLog] files=' + files.length + ' refs=' + pathRefs + ' hashes=' + hashRefs + ' orphans=' + orphans.length + ' volatile=' + volatileRefs + ' external=' + extRefs + ' aliased=' + aliased + ' retired=' + retired);
console.log('[ReportLog] deadDoc=' + deadDoc.length + ' deadSource=' + deadSource.length + ' deadHash=' + uniqHash.length + ' indexRows=' + (indexRows === null ? 'n/a' : indexRows) + ' indexMissing=' + indexMissing.length);

if (flag('--list')) {
    for (const d of deadDoc.slice(0, 40)) console.log('  [deadDoc] ' + d.f + ':' + d.line + ' -> ' + d.raw);
    for (const d of deadSource.slice(0, 60)) console.log('  [deadSource] ' + d.f + ':' + d.line + ' -> ' + d.raw);
    for (const h of uniqHash.slice(0, 20)) console.log('  [deadHash] ' + h + ' <- ' + deadHash.filter((x) => x.h === h).map((x) => x.f).slice(0, 3).join(','));
    for (const f of indexMissing.slice(0, 40)) console.log('  [indexMissing] ' + f);
    for (const f of orphans.slice(0, 60)) console.log('  [orphan] ' + f);
}

console.log('[ReportLog] verdict ' + (hard ? 'FAIL' : 'OK') + ' hard=' + hard);
process.exit(hard ? 1 : 0);
