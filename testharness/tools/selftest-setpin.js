#!/usr/bin/env node
/** selftest-set-pin.js — set-pin.js 的五项自检（B-70US）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const TOOL = path.join(__dirname, 'set-pin.js');
const results = [];

function run(args, env) {
    return cp.spawnSync(process.execPath, [TOOL].concat(args), {
        encoding: 'utf8',
        env: Object.assign({}, process.env, env || {})
    });
}

function tree() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'setpin-'));
    fs.mkdirSync(path.join(repo, 'build', 'libs'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'build', 'resources', 'main'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'build', 'tmp', 'mixins'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'src', 'main', 'resources'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'testharness', 'player'), { recursive: true });

    fs.writeFileSync(path.join(repo, 'build', 'libs', 'etim-1.0.0.jar'), 'release-jar');
    fs.writeFileSync(path.join(repo, 'build', 'libs', 'etim-1.0.0-dev.jar'), 'dev-jar');
    fs.writeFileSync(path.join(repo, 'build', 'libs', 'etim-1.0.0-sources.jar'), 'sources-jar');

    const refmap = JSON.stringify({ mappings: { a: { x: 'y', z: 'w' }, b: { q: 'r' } } });
    fs.writeFileSync(path.join(repo, 'build', 'resources', 'main', 'mixins.etim.refmap.json'), refmap);
    fs.writeFileSync(path.join(repo, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json'), refmap);
    fs.writeFileSync(path.join(repo, 'src', 'main', 'resources', 'mixins.etim.json'),
        JSON.stringify({ mixins: ['A', 'B', 'C'], client: ['D'] }));

    const stub = [
        "'use strict';",
        "const PIN = { build: 'stale-build', releaseSize: 1, releaseSha: 'AA', devSha: 'BB', sourcesSha: 'CC' };",
        'const MK_PIN = { classes: 0, entries: 0, dual: 0, mixins: 0, client: 0 };',
        'module.exports = { PIN, MK_PIN };',
        ''
    ].join('\n');
    const pinFile = path.join(repo, 'testharness', 'player', 'f7-wb-lib.js');
    fs.writeFileSync(pinFile, stub);
    return { repo, pinFile };
}

function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

// 1) 过期 PIN 应被 --check 抓住
{
    const t = tree();
    const r = run(['--check'], { PIN_REPO: t.repo });
    check('stale pin fails --check', r.status === 1 && /verdict=STALE/.test(r.stdout), r.stdout.trim().split('\n')[0]);
}

// 2) --build 写出整行，回读一致
{
    const t = tree();
    const r = run(['--build', 'test-build1'], { PIN_REPO: t.repo });
    const text = fs.readFileSync(t.pinFile, 'utf8');
    const wrote = /build: 'test-build1'/.test(text) && /reload=true/.test(r.stdout);
    check('--build writes and reloads', r.status === 0 && wrote, r.stdout.trim().split('\n').pop());
    const again = run(['--check'], { PIN_REPO: t.repo });
    check('--check passes after write', again.status === 0 && /verdict=OK/.test(again.stdout), again.stdout.trim());
}

// 3) 只改 jar 不改 PIN → 再红
{
    const t = tree();
    run(['--build', 'test-build1'], { PIN_REPO: t.repo });
    fs.appendFileSync(path.join(t.repo, 'build', 'libs', 'etim-1.0.0.jar'), 'tampered');
    const r = run(['--check'], { PIN_REPO: t.repo });
    check('jar drift makes --check red', r.status === 1 && /verdict=STALE/.test(r.stdout), 'release sha changed');
}

// 4) 缺 jar → exit 2
{
    const t = tree();
    fs.unlinkSync(path.join(t.repo, 'build', 'libs', 'etim-1.0.0-sources.jar'));
    const r = run(['--check'], { PIN_REPO: t.repo });
    check('missing jar exits 2', r.status === 2 && /missing jar/.test(r.stdout), r.stdout.trim());
}

// 5) 无 --build 的 dry run 只打印，不改文件
{
    const t = tree();
    const before = fs.readFileSync(t.pinFile, 'utf8');
    const r = run([], { PIN_REPO: t.repo });
    const after = fs.readFileSync(t.pinFile, 'utf8');
    check('dry run does not write', before === after && /dry run/.test(r.stdout), r.stdout.trim().split('\n').pop());
}

const bad = results.filter((r) => !r.ok);
console.log('selftest-setpin: ' + (results.length - bad.length) + '/' + results.length);
process.exit(bad.length ? 1 : 0);
