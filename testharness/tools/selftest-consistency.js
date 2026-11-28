#!/usr/bin/env node
/**
 * selftest-consistency：批次一致性校对的夹具自检。
 *
 * 六个用例，各自一棵临时账本树 + 临时仓库：
 *   clean        五份文书齐全 → exit 0
 *   missing-face 正本不提面键 → exit 1
 *   not-landed   census 仍【未立项】 → exit 1
 *   no-ledger    账册无该批 → exit 1
 *   no-sessions  sessions 无该批 → exit 1
 *   baseline     坏批已冻结 → exit 0；新增坏批 → exit 1
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-batch-consistency.js');
const results = [];

function mkTree(opts) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'consist-'));
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'consist-repo-'));
    const census = path.join(root, 'playground', 'audit', 'census');
    const ledgerDir = path.join(root, 'playground', 'audit', '账册');
    const reports = path.join(repo, 'testharness', 'reports');
    for (const d of [census, ledgerDir, reports]) fs.mkdirSync(d, { recursive: true });

    fs.writeFileSync(path.join(census, '批次工单.md'), [
        '# 批次工单',
        '',
        '### ' + (opts.batch || 'B-90') + '（1 面）',
        '',
        '- `A:5` Foo.java:1-2 —— 夹具面',
        '',
    ].join('\n'), 'utf8');

    fs.writeFileSync(path.join(census, '普查A-夹具-盘点.md'), [
        'census_faces_total=1',
        '',
        '## 二、逐面行',
        '',
        '[面] A:5 | Foo.java:1-2 | 夹具面 | 状态:' + (opts.landed === false ? '【未立项】' : '【已落地】') +
            ' | ETIM位:world/ETIMFoo.java:1-10' + (opts.marked === false ? '' : '（' + (opts.batch || 'B-90') + '）'),
        '',
    ].join('\n'), 'utf8');

    const verdict = path.join(reports, (opts.slug || 'b90') + '-verify-verdict.md');
    if (opts.verdict !== false) {
        fs.writeFileSync(verdict, [
            '# ' + (opts.batch || 'B-90') + ' 判窗正本',
            '',
            '终判：**PASS** — A=0 / B=0 / C=0',
            '',
            opts.face === false ? '（本正本不提任何面键）' : '| `A:5` | Foo.java:1-2 |',
            '',
        ].join('\n'), 'utf8');
    }

    if (opts.ledger !== false) {
        fs.writeFileSync(path.join(ledgerDir, '现行账.md'), [
            '# 现行账',
            '',
            '### 条 1 · ' + (opts.batch || 'B-90') + '',
            '',
            '- **收口提交**：未推送',
            '',
        ].join('\n'), 'utf8');
    } else {
        fs.writeFileSync(path.join(ledgerDir, '现行账.md'), '# 现行账\n\n### 条 1 · B-1\n', 'utf8');
    }

    fs.writeFileSync(path.join(root, 'playground', 'sessions.md'),
        '# sessions\n\n' + (opts.sessions === false ? '## B-1\n' : '## ' + (opts.batch || 'B-90') + '\n'), 'utf8');

    return { root, repo, baseline: path.join(root, 'consist-baseline.json') };
}

function run(tree, args) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], {
            env: { ...process.env, CONSIST_ROOT: tree.root, CONSIST_REPO: tree.repo, CONSIST_BASELINE: tree.baseline },
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status == null ? 2 : e.status, out: (e.stdout || '') + (e.stderr || '') };
    }
}

function check(name, ok, detail) {
    results.push({ name, ok, detail });
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

// 1 clean
{
    const t = mkTree({});
    const r = run(t, ['--all', '--update-baseline']);
    const r2 = run(t, ['--all']);
    check('clean', r.code === 0 && r2.code === 0, 'baseline+check exit=' + r2.code);
}

// 2 missing-face
{
    const t = mkTree({ face: false });
    run(t, ['--all', '--update-baseline']);
    const r = run(t, ['--batch', 'B-90']);
    check('missing-face (frozen)', r.code === 0, 'exit=' + r.code);
    const r2 = run(t, ['--batch', 'B-90', '--list']);
    check('missing-face-detected', r2.out.includes('missing in verdict'), 'list output');
}

// 3 not-landed
{
    const t = mkTree({ landed: false });
    run(t, ['--all', '--update-baseline']);
    const r = run(t, ['--batch', 'B-90', '--list']);
    check('not-landed', r.out.includes('not landed'), '');
}

// 4 no-ledger
{
    const t = mkTree({ ledger: false });
    run(t, ['--all', '--update-baseline']);
    const r = run(t, ['--batch', 'B-90', '--list']);
    check('no-ledger', r.out.includes('no ledger entry'), '');
}

// 5 no-sessions
{
    const t = mkTree({ sessions: false });
    run(t, ['--all', '--update-baseline']);
    const r = run(t, ['--batch', 'B-90', '--list']);
    check('no-sessions', r.out.includes('no sessions section'), '');
}

// 6 baseline: frozen vs fresh
{
    const t = mkTree({ face: false });
    run(t, ['--all', '--update-baseline']);
    const frozen = run(t, ['--all']);
    // 新增一个同样坏的批次，不在基线里
    fs.appendFileSync(path.join(t.root, 'playground', 'audit', 'census', '批次工单.md'),
        '\n### B-91（1 面）\n\n- `A:6` Bar.java:1-2 —— 新增坏批\n', 'utf8');
    fs.writeFileSync(path.join(t.repo, 'testharness', 'reports', 'b91-verify-verdict.md'),
        '# B-91\n\n终判：**PASS** — A=0 / B=0 / C=0\n\n（不提面键）\n', 'utf8');
    fs.writeFileSync(path.join(t.root, 'playground', 'audit', '账册', '现行账.md'),
        '# 现行账\n\n### 条 1 · B-90\n\n### 条 2 · B-91\n\n- **收口提交**：未推送\n', 'utf8');
    fs.appendFileSync(path.join(t.root, 'playground', 'sessions.md'), '## B-91\n', 'utf8');
    const fresh = run(t, ['--all']);
    check('baseline', frozen.code === 0 && fresh.code === 1 && fresh.out.includes('B-91'), 'frozen=' + frozen.code + ' fresh=' + fresh.code);
}

const bad = results.filter((r) => !r.ok);
console.log('[SelftestLog] consistency: ' + (results.length - bad.length) + '/' + results.length);
process.exit(bad.length ? 1 : 0);
