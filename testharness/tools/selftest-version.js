#!/usr/bin/env node
/* selftest-version.js — 临时仓库验证 check-version 的四态（匹配 / 不一致 / 格式错 / 无参）。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'check-version.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}
function run(root, args, env) {
    const r = spawnSync('node', [TOOL, ...args], {
        encoding: 'utf8',
        env: { ...process.env, VERSION_REPO: root, GITHUB_REF_NAME: '', ETIM_TAG: '', ...(env || {}) },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ver-'));
fs.writeFileSync(path.join(root, 'gradle.properties'), 'mod_version = 1.0.0\n', 'utf8');

const match = run(root, ['--tag', '1.0.0']);
const mismatch = run(root, ['--tag', '1.0.1']);
const malformed = run(root, ['--tag', 'v1.0.0']);
const usage = run(root, []);
const envTag = run(root, [], { GITHUB_REF_NAME: '1.0.0' });

check('match', match.code === 0 && /verdict=PASS/.test(match.out), 'exit=' + match.code);
check('mismatch', mismatch.code === 1 && /tag-mod_version-mismatch/.test(mismatch.out), 'exit=' + mismatch.code);
check('malformed', malformed.code === 1 && /tag-not-x\.y\.z/.test(malformed.out), 'exit=' + malformed.code);
check('usage', usage.code === 2, 'exit=' + usage.code);
check('env-tag', envTag.code === 0 && /verdict=PASS/.test(envTag.out), 'exit=' + envTag.code);

const pass = results.filter((x) => x.ok).length;
console.log('selftest-version: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
