#!/usr/bin/env node
/**
 * selftest-faces — check-faces.js 的四类判定自检（B-70TH）。
 *
 * 每例建独立临时账本树（`playground/audit/census/普查X-fix.md`），用真实仓库
 * 作 --repo，跑 `check-faces.js --root <tmp> --repo <repo>` 并断言退出码与
 * `[FaceLog]` 行内容。
 *
 *   node testharness/tools/selftest-faces.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-faces.js');
const REPO = path.resolve(__dirname, '..', '..');

function run(root, repo) {
    try {
        const out = execFileSync(process.execPath, [TOOL, '--root', root, '--repo', repo || REPO, '--list'], { encoding: 'utf8' });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') };
    }
}

/** A throwaway mod repo whose single class name disagrees with its file name. */
function fakeRepo() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'faces-repo-'));
    const dir = path.join(repo, 'src', 'main', 'java', 'fake');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'WrongName.java'), 'package fake;\n\nclass OtherName {\n}\n', 'utf8');
    return repo;
}

function tree(rows) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'faces-'));
    const dir = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '普查X-fix.md'), ['# fix', '', ...rows, ''].join('\n'), 'utf8');
    return root;
}

const cases = [];
// A real ETIM file with a plausible span.
cases.push({
    name: 'clean',
    root: tree([
        '[面] A.java:1-2 | ok | 状态:【已落地】 | ETIM位:item/ETIMItemCoin.java:1-64',
    ]),
    want: 0,
    expect: /verdict OK/,
});
cases.push({
    name: 'missing-file',
    root: tree([
        '[面] B.java:1-2 | bad | 状态:【已落地】 | ETIM位:NoSuchClassXyz.java:1-2',
    ]),
    want: 1,
    expect: /F1 .*NoSuchClassXyz\.java/,
});
cases.push({
    name: 'bad-range',
    root: tree([
        '[面] C.java:1-2 | bad | 状态:【已落地】 | ETIM位:item/ETIMItemCoin.java:1-9999',
    ]),
    want: 1,
    expect: /F2 .*超出文件行数/,
});
cases.push({
    name: 'missing-symbol',
    root: tree([
        '[面] D.java:1-2 | bad | 状态:【已落地】 | ETIM位:WrongName.java:1-3',
    ]),
    repo: 'fake',
    want: 1,
    expect: /F3 .*无 class\/interface\/enum WrongName/,
});
cases.push({
    name: 'r196-citation',
    root: tree([
        '[面] G.java:1-2 | r196 | 状态:【已落地】 | ETIM位:BlockDoubleSlab.java:1-40',
    ]),
    want: 0,
    expect: /r196=1 missingFile=0 badRange=0/,
});
cases.push({
    name: 'unlanded-ignored',
    root: tree([
        '[面] E.java:1-2 | pending | 状态:【未立项】 | ETIM位:',
    ]),
    want: 0,
    expect: /landed=0/,
});

let pass = 0;
for (const c of cases) {
    let repoArg = REPO;
    let fake = null;
    if (c.repo === 'fake') { fake = fakeRepo(); repoArg = fake; }
    const r = run(c.root, repoArg);
    if (fake) fs.rmSync(fake, { recursive: true, force: true });
    const ok = r.code === c.want && c.expect.test(r.out);
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name} (exit=${r.code} want=${c.want})`);
    if (!ok) console.log(r.out.trim().split('\n').slice(-4).map((s) => '    ' + s).join('\n'));
    fs.rmSync(c.root, { recursive: true, force: true });
}
console.log(`selftest-faces: ${pass}/${cases.length}`);
process.exit(pass === cases.length ? 0 : 1);
