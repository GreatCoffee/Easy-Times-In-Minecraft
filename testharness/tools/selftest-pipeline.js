#!/usr/bin/env node
'use strict';
/** Self-test for testharness/tools/check-pipeline-doc.js (fixture trees only). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-pipeline-doc.js');
const results = [];

function build(docText) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pipedoc-'));
    fs.mkdirSync(path.join(root, 'testharness', 'tools'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'testharness', 'tools', 'alpha.js'), '// tool\n', 'utf8');
    fs.writeFileSync(path.join(root, 'testharness', 'tools', 'preflight.js'),
        "function gradleStep() {}\nstep('beta', 'alpha.js', [], () => false, '[XLog]');\n", 'utf8');
    if (docText !== null) fs.writeFileSync(path.join(root, 'docs', 'PIPELINE.md'), docText, 'utf8');
    return root;
}

function run(root) {
    return spawnSync('node', [TOOL], {
        cwd: root,
        env: Object.assign({}, process.env, { PIPELINE_REPO: root }),
        encoding: 'utf8',
    });
}

function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail || '' });
}

const GOOD = '# pipeline\n\n- `preflight.js` orchestrates\n- `alpha.js` does things\n- gate `gradle` runs tests\n- gate `beta` checks alpha\n';

{
    const r = run(build(GOOD));
    check('clean passes', r.status === 0 && /verdict OK/.test(r.stdout), r.stdout.trim());
}
{
    const r = run(build(GOOD.replace('- `alpha.js` does things\n', '')));
    check('missing tool fails', r.status === 1 && /tool not documented: alpha\.js/.test(r.stdout), r.stdout.trim());
}
{
    const r = run(build(GOOD.replace('- gate `beta` checks alpha\n', '')));
    check('missing step fails', r.status === 1 && /preflight step not documented: beta/.test(r.stdout), r.stdout.trim());
}
{
    const r = run(build(null));
    check('missing doc exits 2', r.status === 2, r.stdout.trim());
}

const pass = results.filter((r) => r.ok).length;
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + r.detail));
console.log('selftest-pipeline: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
