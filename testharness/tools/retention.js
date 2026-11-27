#!/usr/bin/env node
/**
 * retention.js — 磁盘保留策略（B-70UR）
 *
 * 管什么：run/ 下的测试世界与 testharness/build-logs/ 的日志只增不减，硬盘迟早被塞满；
 * 但账册/回执/正本里点过名的文件是判据证据，删了就再也复现不了。
 *
 * 规则（四条）：
 *   1. 日志是证据：md 文档（playground/、testharness/reports/）里出现过文件名的日志，
 *      一律判 keep，永不移动——判据靠它复现。
 *   2. 世界是派生物：run/w-* 是一次运行的存档，结论已抽取进回执与日志，重跑即可复现，
 *      故按「每个前缀保留最新 --keep 份」（默认 6）归档，不参与证据豁免。
 *   3. 近期保留：其余文件同样按前缀保留最新 --keep 份。
 *   4. 只归档不删除：--apply 把候选移到仓库外的 archive 目录，写 manifest 记录去向。
 *
 * 用法：
 *   node retention.js                  # 只打印计划（不会动文件）
 *   node retention.js --apply          # 执行归档（移到 RETENTION_ARCHIVE）
 *   node retention.js --check          # 体积棘轮（超基线 exit 1，供 preflight 使用）
 *   node retention.js --update-baseline# 归档之后重设基线
 *   --root/--repo/--archive/--keep，或 RETENTION_ROOT/RETENTION_REPO/RETENTION_ARCHIVE
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

const ROOT = arg('--root', process.env.RETENTION_ROOT || path.resolve(__dirname, '..', '..', '..', '..'));
const REPO = arg('--repo', process.env.RETENTION_REPO || path.resolve(__dirname, '..', '..'));
const ARCHIVE = arg('--archive', process.env.RETENTION_ARCHIVE || path.join(ROOT, 'archive', 'etim-retention'));
const KEEP = parseInt(arg('--keep', '6'), 10);

const APPLY = argv.includes('--apply');
const CHECK = argv.includes('--check');
const UPDATE = argv.includes('--update-baseline');

const BASELINE = process.env.RETENTION_BASELINE || path.join(__dirname, 'retention-baseline.json');
// B-70US: the manifest describes the archive, so it lives beside it — never in
// the repo (a self-test once wrote 56 fixture entries into the tracked copy).
const MANIFEST = process.env.RETENTION_MANIFEST
    || path.join(path.dirname(ARCHIVE), 'retention-manifest.json');

const docDirs = [
    path.join(ROOT, 'playground'),
    path.join(REPO, 'testharness', 'reports')
];
const skipDoc = (p) => /[\\/]archive[\\/]/.test(p) || /FACE-ASSERT\.md$/.test(p) || /COVERAGE\.md$/.test(p);

function walk(dir, out) {
    if (!fs.existsSync(dir)) {
        return out;
    }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            walk(p, out);
        } else if (/\.md$/.test(e.name) && !skipDoc(p)) {
            out.push(p);
        }
    }
    return out;
}

function evidenceNames() {
    const names = new Set();
    const docs = [];
    for (const d of docDirs) {
        walk(d, docs);
    }
    for (const p of docs) {
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(/[A-Za-z0-9_.\-/]{6,}/g)) {
            const tok = m[0].replace(/^\.?\//, '');
            names.add(tok);
            names.add(path.basename(tok));
        }
    }
    return names;
}

function sizeOf(p) {
    const st = fs.statSync(p);
    if (!st.isDirectory()) {
        return st.size;
    }
    let total = 0;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        total += sizeOf(path.join(p, e.name));
    }
    return total;
}

function worldDirs() {
    const run = path.join(REPO, 'run');
    if (!fs.existsSync(run)) {
        return [];
    }
    return fs.readdirSync(run, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith('w-'))
        .map((e) => ({ name: e.name, full: path.join(run, e.name), kind: 'world' }));
}

function logFiles() {
    const dir = path.join(REPO, 'testharness', 'build-logs');
    if (!fs.existsSync(dir)) {
        return [];
    }
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => ({ name: e.name, full: path.join(dir, e.name), kind: 'log' }));
}

/**
 * 「前缀」= 前两段（w-b69 / w-reg / b69-b70uq / anvilench-w33），
 * 同一批次的十几个运行号共用一个保留额度，避免「每个 run 各留 6 份」形同不删。
 */
function prefixOf(name) {
    const base = name.replace(/\.(out|log|txt|json)$/, '');
    const parts = base.split('-');
    return parts.slice(0, 2).join('-');
}

function plan() {
    const evidence = evidenceNames();
    const items = [...worldDirs(), ...logFiles()].map((it) => {
        const stat = fs.statSync(it.full);
        return Object.assign({}, it, { mtime: stat.mtimeMs, size: sizeOf(it.full) });
    });
    for (const it of items) {
        it.evidence = it.kind === 'log'
            && (evidence.has(it.name) || evidence.has(it.name.replace(/\.out$/, '')));
    }
    const groups = {};
    for (const it of items) {
        if (it.evidence) {
            continue;
        }
        const k = prefixOf(it.name);
        (groups[k] = groups[k] || []).push(it);
    }
    const archive = [];
    for (const k of Object.keys(groups)) {
        // B-70UR: mtime ties are common in fixtures and in fast runs; tie-break by
        // name descending so "newest" is always a single, reproducible choice.
        groups[k].sort((a, b) => (b.mtime - a.mtime) || (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
        for (const it of groups[k].slice(KEEP)) {
            archive.push(it);
        }
    }
    return { items, archive, evidence };
}

function totals() {
    const worlds = worldDirs().length;
    const logs = logFiles().length;
    const runBytes = worldDirs().reduce((s, w) => s + sizeOf(w.full), 0);
    const logBytes = logFiles().reduce((s, w) => s + sizeOf(w.full), 0);
    return { worlds, logs, runMB: Math.round(runBytes / 1048576), logMB: Math.round(logBytes / 1048576) };
}

function main() {
    const t = totals();

    if (CHECK) {
        const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
        if (!base) {
            console.log('[RetentionLog] no baseline — run --update-baseline first');
            process.exit(2);
        }
        const grown = {
            worlds: t.worlds > base.worlds,
            logs: t.logs > base.logs,
            runMB: t.runMB > base.runMB + Math.ceil(base.runMB * 0.05),
            logMB: t.logMB > base.logMB + Math.ceil(base.logMB * 0.05)
        };
        const bad = Object.keys(grown).filter((k) => grown[k]);
        console.log('[RetentionLog] now worlds=' + t.worlds + ' logs=' + t.logs
            + ' runMB=' + t.runMB + ' logMB=' + t.logMB);
        console.log('[RetentionLog] base worlds=' + base.worlds + ' logs=' + base.logs
            + ' runMB=' + base.runMB + ' logMB=' + base.logMB);
        if (bad.length) {
            console.log('[RetentionLog] GREW ' + bad.join(',') + ' — archive first: node retention.js --apply');
            process.exit(1);
        }
        console.log('[RetentionLog] verdict OK');
        return;
    }

    const p = plan();
    const mb = (n) => (n / 1048576).toFixed(1);

    if (UPDATE) {
        fs.writeFileSync(BASELINE, JSON.stringify(t, null, 2) + '\n', 'utf8');
        console.log('[RetentionLog] baseline written ' + JSON.stringify(t));
        return;
    }

    console.log('[RetentionLog] worlds=' + t.worlds + ' (' + t.runMB + ' MB) logs=' + t.logs
        + ' (' + t.logMB + ' MB) keep-per-prefix=' + KEEP);
    console.log('[RetentionLog] evidence=' + p.items.filter((i) => i.evidence).length
        + ' archive-candidates=' + p.archive.length
        + ' bytes=' + p.archive.reduce((s, i) => s + i.size, 0).toFixed(0));

    const sample = p.archive.slice(0, 8);
    for (const it of sample) {
        console.log('  [' + it.kind + '] ' + it.name + ' ' + mb(it.size) + ' MB');
    }
    if (p.archive.length > sample.length) {
        console.log('  … +' + (p.archive.length - sample.length) + ' more');
    }

    if (!APPLY) {
        console.log('[RetentionLog] dry-run only — add --apply to move them to ' + ARCHIVE);
        return;
    }

    fs.mkdirSync(ARCHIVE, { recursive: true });
    const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { moved: [] };
    let moved = 0;
    for (const it of p.archive) {
        const dest = path.join(ARCHIVE, it.kind, it.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(it.full, dest);
        manifest.moved.push({ name: it.name, kind: it.kind, size: it.size, to: dest, at: new Date().toISOString() });
        moved++;
    }
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const after = totals();
    fs.writeFileSync(BASELINE, JSON.stringify(after, null, 2) + '\n', 'utf8');
    console.log('[RetentionLog] moved=' + moved + ' to ' + ARCHIVE);
    console.log('[RetentionLog] after worlds=' + after.worlds + ' logs=' + after.logs
        + ' runMB=' + after.runMB + ' logMB=' + after.logMB + ' (baseline updated)');
}

main();
