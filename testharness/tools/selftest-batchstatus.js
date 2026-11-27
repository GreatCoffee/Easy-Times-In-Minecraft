#!/usr/bin/env node
/* selftest-batchstatus.js — 临时账本树 + 临时 git 仓库验证 batch-status 的六源判定。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'batch-status.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-'));
const repo = path.join(root, 'git-workspace', 'etim');
const books = path.join(root, 'playground', 'audit');
const census = path.join(books, 'census');
const ledgerDir = path.join(books, '账册');
fs.mkdirSync(census, { recursive: true });
fs.mkdirSync(ledgerDir, { recursive: true });
fs.mkdirSync(path.join(repo, 'testharness', 'reports'), { recursive: true });

fs.writeFileSync(path.join(census, '普查T-自检-盘点.md'), [
    '# 普查T',
    'census_faces_total=1',
    'census_landed=1',
    '## §2 逐面行',
    '[面] Demo.java:1-3 | demo | 状态:【已落地】 | ETIM位:demo/Demo.java:1-3（B-71）',
].join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), '## B-71（演示）\n\n- 演示段。\n', 'utf8');
fs.writeFileSync(path.join(repo, 'testharness', 'reports', 'b71-verify-verdict.md'), '# verdict\n\n终判：**PASS**（A=0）\n', 'utf8');

const git = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
git('init', '-q', '-b', 'master');
git('config', 'user.email', 'selftest@example.invalid');
git('config', 'user.name', 'selftest');
git('commit', '-q', '--allow-empty', '-m', 'init');
const head = git('rev-parse', '--short=7', 'HEAD').stdout.trim();
const origin = path.join(root, 'origin.git');
spawnSync('git', ['init', '-q', '--bare', origin], { encoding: 'utf8' });
git('remote', 'add', 'origin', origin);
git('push', '-q', '-u', 'origin', 'master');
fs.writeFileSync(path.join(ledgerDir, '现行账.md'), [
    '### 条 1 · B-71 演示',
    '- **收口提交**：`' + head + '`（已推送，origin 欠 0）。',
].join('\n') + '\n', 'utf8');

function run(args) {
    const r = spawnSync('node', [TOOL, ...args], {
        encoding: 'utf8',
        env: { ...process.env, BATCH_ROOT: root, BATCH_REPO: repo },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const healthy = run(['B-71']);
check('healthy-ok', healthy.code === 0 && /verdict OK/.test(healthy.out), healthy.out.trim().split('\n').pop());

fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), '# sessions\n\n（无段）\n', 'utf8');
const missing = run(['B-71']);
check('missing-sessions-risk', missing.code === 1 && /sessions/.test(missing.out) && !/verdict OK/.test(missing.out),
    'exit=' + missing.code);

fs.writeFileSync(path.join(repo, 'testharness', 'reports', 'b71-verify-verdict.md'), '# verdict\n\n终判：**退回**\n', 'utf8');
fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), '## B-71（演示）\n\n- 演示段。\n', 'utf8');
const failVerdict = run(['B-71']);
check('fail-verdict-risk', failVerdict.code === 1, 'exit=' + failVerdict.code);

const all = run(['--all']);
check('all-mode', /batches=/.test(all.out), all.out.trim().split('\n').pop());

const pass = results.filter((x) => x.ok).length;
console.log('selftest-batchstatus: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
