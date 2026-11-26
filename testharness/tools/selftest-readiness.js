#!/usr/bin/env node
/**
 * selftest-readiness — face-readiness.js 的分类自检（B-70TM）。
 *
 * 每例建独立临时账本树 + 假 mod 仓 + 假 R196 树，跑 `face-readiness.js`，
 * 断言 WIRE / CITE / NEW / NO-SOURCE 四类与 `--check` 的 stale 判定。
 *
 *   node testharness/tools/selftest-readiness.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'face-readiness.js');

function build() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ready-'));
    const books = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(books, { recursive: true });
    const repo = path.join(root, 'repo');
    const src = path.join(repo, 'src', 'main', 'java', 'fake');
    fs.mkdirSync(src, { recursive: true });
    // Wire case: census cites BlockFoo.java, and ETIMBlockFoo exists.
    fs.writeFileSync(path.join(src, 'ETIMBlockFoo.java'), 'package fake;\npublic class ETIMBlockFoo {}\n', 'utf8');
    // Cite case: census cites ItemBar.java; some file cites ItemBar.java:10-20 without a same-name carrier.
    fs.writeFileSync(path.join(src, 'Helper.java'), 'package fake;\n// ItemBar.java:10-20\npublic class Helper {}\n', 'utf8');
    const r196 = path.join(root, 'r196');
    fs.mkdirSync(r196, { recursive: true });
    for (const n of ['BlockFoo.java', 'ItemBar.java', 'BlockNew.java']) {
        fs.writeFileSync(path.join(r196, n), 'class X {}\n', 'utf8');
    }
    fs.writeFileSync(path.join(books, '普查A-fix.md'), [
        '# fix',
        '',
        '[面] BlockFoo.java:1-5 | wire | 状态:【未立项】 | ETIM位:',
        '[面] ItemBar.java:10-20 | cite | 状态:【未立项】 | ETIM位:',
        '[面] BlockNew.java:1-5 | new | 状态:【未立项】 | ETIM位:',
        '[面] BlockGhost.java:1-5 | ghost | 状态:【未立项】 | ETIM位:',
        '',
    ].join('\n'), 'utf8');
    return { root, books, repo, r196 };
}

function run(env, args) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...(args || [])], { encoding: 'utf8', env: { ...process.env, ...env } });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

let pass = 0;
const total = 2;

{
    const t = build();
    const env = { READY_BOOKS_ROOT: t.root, READY_REPO: t.repo, READY_R196: t.r196 };
    const w = run(env, []);
    const ok = w.code === 0 && /unlanded=4 wire=1 cite=1 new=1 noSource=1/.test(w.out);
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'} classify (exit=${w.code})`);
    if (!ok) console.log(w.out.trim());

    const c1 = run(env, ['--check']);
    const c2 = (() => {
        fs.appendFileSync(path.join(t.books, '普查A-fix.md'), '\n[面] BlockFoo.java:9-9 | x | 状态:【未立项】 | ETIM位:\n');
        return run(env, ['--check']);
    })();
    const ok2 = c1.code === 0 && c2.code === 1 && /stale=true/.test(c2.out);
    if (ok2) pass++;
    console.log(`${ok2 ? 'PASS' : 'FAIL'} stale-detect (fresh=${c1.code} stale=${c2.code})`);
    if (!ok2) console.log((c2.out || '').trim());
    fs.rmSync(t.root, { recursive: true, force: true });
}

console.log(`selftest-readiness: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
