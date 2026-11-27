#!/usr/bin/env node
'use strict';
/** Self-test for testharness/tools/gen-channel-doc.js (fixture trees only). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'gen-channel-doc.js');
const results = [];

function build({ channel = 'FooLog', gateKey = 'fooDebugLog', script = true, commentOnly = false } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chandoc-'));
    const pkg = path.join(root, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
    fs.mkdirSync(path.join(pkg, 'mob'), { recursive: true });
    fs.writeFileSync(path.join(pkg, 'ETIMConfig.java'), [
        'public final class ETIMConfig {',
        '    public static boolean ' + gateKey + ' = true;',
        '    public static void init() {',
        '        ' + gateKey + ' = config.getBoolean("' + gateKey + '", "mobs", ' + gateKey + ', "doc");',
        '    }',
        '}',
    ].join('\n'), 'utf8');
    const body = commentOnly
        ? ['public class Emitter {', '    /** copy of [' + channel + '] spec */', '    void a() {}', '}']
        : ['public class Emitter {', '    void a() {', '        if (ETIMConfig.' + gateKey + ') {',
            '            ETIM.LOGGER.info("[' + channel + '] row=1 [server]");', '        }', '    }', '}'];
    fs.writeFileSync(path.join(pkg, 'mob', 'Emitter.java'), body.join('\n'), 'utf8');
    fs.mkdirSync(path.join(root, 'testharness', 'player'), { recursive: true });
    if (script) {
        fs.writeFileSync(path.join(root, 'testharness', 'player', 'fX.js'), [
            "const h = H.create({ cfg: ['mobs:" + gateKey + "'] });",
            "const RE = /\\[" + channel + "\\] row=/;",
            "await cmd('etest foocmd 1 2 3');",
            'if (h.slice(from).some(s => RE.test(s))) res.w1 = true;',
        ].join('\n'), 'utf8');
    }
    return root;
}

function run(root, args) {
    return spawnSync('node', [TOOL].concat(args || []), {
        cwd: root,
        env: Object.assign({}, process.env, {
            CHANDOC_REPO: root,
            CHANDOC_OUT: path.join(root, 'docs', 'CHANNELS.md'),
        }),
        encoding: 'utf8',
    });
}

function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail || '' });
}

// 1. generates a row with gate, producer, driver and asserting script
{
    const root = build();
    const r = run(root);
    const doc = fs.readFileSync(path.join(root, 'docs', 'CHANNELS.md'), 'utf8');
    check('writes doc', r.status === 0 && doc.includes('# Judgement channels'), r.stdout.trim());
    check('row has channel', doc.includes('| `FooLog` |'), '');
    check('row has gate + section', doc.includes('`fooDebugLog` (mobs)'), '');
    check('row has producer', doc.includes('mob/Emitter.java:4'), '');
    check('row has driver', doc.includes('`/etest foocmd`'), '');
    check('row has script', doc.includes('`fX.js`'), '');
    check('counts covered', doc.includes('assorted') === false && doc.includes('Channels: **1**'), '');
    fs.rmSync(root, { recursive: true, force: true });
}

// 2. --check: fresh passes, stale fails
{
    const root = build();
    run(root);
    const ok = run(root, ['--check']);
    check('check fresh', ok.status === 0, ok.stdout.trim());
    fs.appendFileSync(path.join(root, 'docs', 'CHANNELS.md'), '\nstale\n');
    const bad = run(root, ['--check']);
    check('check stale', bad.status === 1 && /stale/.test(bad.stdout), bad.stdout.trim());
    fs.rmSync(root, { recursive: true, force: true });
}

// 3. comment-only mention is not a producer
{
    const root = build({ commentOnly: true });
    run(root);
    const doc = fs.readFileSync(path.join(root, 'docs', 'CHANNELS.md'), 'utf8');
    check('comment not a producer', !doc.includes('| `FooLog` |'), '');
    fs.rmSync(root, { recursive: true, force: true });
}

// 4. no script -> uncovered
{
    const root = build({ script: false });
    run(root);
    const doc = fs.readFileSync(path.join(root, 'docs', 'CHANNELS.md'), 'utf8');
    check('marks uncovered', doc.includes('**uncovered**'), '');
    check('covered count 0', doc.includes('Channels: **1**, asserted by a window script: **0**'), '');
    fs.rmSync(root, { recursive: true, force: true });
}

const pass = results.filter((r) => r.ok).length;
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + r.detail));
console.log('selftest-chandoc: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
