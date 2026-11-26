#!/usr/bin/env node
/**
 * check-closeout 自检：造一棵临时账本树 + 临时 git 仓库，逐条验证四类风险。
 *   node testharness/tools/selftest-closeout.js
 * 退出码 0 = 全部通过。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-closeout.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-'));

function git(cwd, args) {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

// --- a repo with a working origin ------------------------------------------
const bare = path.join(tmp, 'bare.git');
const repo = path.join(tmp, 'repo');
fs.mkdirSync(repo, { recursive: true });
git(tmp, ['init', '--bare', '-q', bare]);
git(repo, ['init', '-q']);
git(repo, ['config', 'user.email', 't@t']);
git(repo, ['config', 'user.name', 't']);
fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
git(repo, ['add', '.']);
git(repo, ['commit', '-qm', 'one']);
git(repo, ['remote', 'add', 'origin', bare]);
git(repo, ['push', '-qu', 'origin', 'master']);
const head = git(repo, ['rev-parse', '--short=7', 'HEAD']);

let caseNo = 0;
const results = [];
function books(ledger, sessions) {
    const root = path.join(tmp, 'books' + (++caseNo));
    fs.mkdirSync(path.join(root, 'playground', 'audit', '账册'), { recursive: true });
    fs.writeFileSync(path.join(root, 'playground', 'audit', '账册', '现行账.md'), ledger);
    fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), sessions);
    return root;
}
function run(root) {
    try {
        const out = execFileSync('node', [TOOL, '--root', root, '--repo', repo], { encoding: 'utf8' });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
    }
}
function check(name, root, wantCode, wantText) {
    const r = run(root);
    const ok = r.code === wantCode && (!wantText || r.out.includes(wantText));
    results.push({ name, ok, code: r.code, want: wantCode, out: r.out.trim().split('\n').slice(-2).join(' | ') });
}

// 1 clean
check('clean', books(
    `### 条 1 · B-99X 干净批\n\n- 收口提交：\`${head}\`（已推送，origin 欠 0）。\n`,
    '## B-99X\n'), 0, 'verdict OK');

// 2 stale 待提交 in an older entry
check('stale-pending', books(
    `### 条 1 · B-99X 旧批\n\n- 收口提交：待提交。\n\n### 条 2 · B-99Y 新批\n\n- 收口提交：\`${head}\`（已推送，origin 欠 0）。\n`,
    '## B-99X\n\n## B-99Y\n'), 1, 'R1');

// 3 dead hash
check('dead-hash', books(
    `### 条 1 · B-99X\n\n- 收口提交：\`deadbee\`（已推送）。\n`,
    '## B-99X\n'), 1, 'R2');

// 4 missing sessions section
check('missing-sessions', books(
    `### 条 1 · B-99X\n\n- 收口提交：\`${head}\`（已推送）。\n`,
    '## B-98Z\n'), 1, 'R3');

// 5 claims pushed but one commit ahead
fs.writeFileSync(path.join(repo, 'b.txt'), 'b\n');
git(repo, ['add', '.']);
git(repo, ['commit', '-qm', 'two']);
check('push-mismatch', books(
    `### 条 1 · B-99X\n\n- 收口提交：\`${head}\`（已推送，origin 欠 0）。\n`,
    '## B-99X\n'), 1, 'R4');
git(repo, ['reset', '-q', '--hard', 'HEAD~1']);

for (const r of results) {
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + ` (exit=${r.code} want=${r.want}) ${r.ok ? '' : r.out}`);
}
const bad = results.filter((r) => !r.ok).length;
console.log(`selftest-closeout: ${results.length - bad}/${results.length}`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
