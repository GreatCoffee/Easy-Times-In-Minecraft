#!/usr/bin/env node
'use strict';
/** Self-test for testharness/tools/gen-config-doc.js (fixture trees only). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'gen-config-doc.js');
const results = [];

function tree(configText) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cfgdoc-'));
    const pkg = path.join(root, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, 'ETIMConfig.java'), configText, 'utf8');
    return root;
}

function run(root, args) {
    return spawnSync('node', [TOOL].concat(args || []), {
        cwd: root,
        env: Object.assign({}, process.env, { CONFIGDOC_REPO: root, CONFIGDOC_OUT: path.join(root, 'docs', 'CONFIG.md') }),
        encoding: 'utf8',
    });
}

const CONFIG = [
    'package io.github.etim.etim;',
    'public final class ETIMConfig {',
    '    /** First switch. */',
    '    public static boolean alpha = true;',
    '    /** Count things. */',
    '    public static int beta = 5;',
    '    /** Grouped doc for the pair. */',
    '    public static int gamma = 1;',
    '    public static int delta = 2;',
    '    public static void init() {',
    '        alpha = config.getBoolean("alpha", "misc", alpha, "First switch.");',
    '        beta = config.getInt("beta", "misc", beta, 0, 10, "Count things.");',
    '        gamma = config.getInt("gamma", "misc", gamma, 0, 5, "Grouped doc for the pair.");',
    '        delta = config.getInt("delta", "misc", delta, 0, 5, "Grouped doc for the pair.");',
    '    }',
    '}',
].join('\n');

function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail || '' });
}

// 1. clean generation
{
    const root = tree(CONFIG);
    const r = run(root);
    const doc = fs.readFileSync(path.join(root, 'docs', 'CONFIG.md'), 'utf8');
    check('writes doc', r.status === 0 && doc.includes('# Configuration reference'), r.stdout.trim());
    check('lists keys', doc.includes('`alpha`') && doc.includes('`delta`'), '');
    check('inherits group doc', (doc.match(/Grouped doc for the pair\./g) || []).length >= 2, '');
    check('counts sections', doc.includes('## misc (4)'), '');
    fs.rmSync(root, { recursive: true, force: true });
}

// 2. --check on fresh doc passes, stale doc fails
{
    const root = tree(CONFIG);
    run(root);
    const ok = run(root, ['--check']);
    check('check fresh', ok.status === 0, ok.stdout.trim());
    fs.appendFileSync(path.join(root, 'docs', 'CONFIG.md'), '\nstale line\n');
    const bad = run(root, ['--check']);
    check('check stale', bad.status === 1 && /stale/.test(bad.stdout), bad.stdout.trim());
    fs.rmSync(root, { recursive: true, force: true });
}

// 3. field without javadoc is a problem (blank line breaks group inheritance)
{
    const root = tree(CONFIG.replace('    /** Count things. */\n    public static int beta', '\n    public static int beta'));
    const r = run(root);
    check('reports missing javadoc', /field without javadoc: beta/.test(r.stdout), r.stdout.trim());
    const c = run(root, ['--check']);
    check('check fails on problem', c.status === 1, c.stdout.trim());
    fs.rmSync(root, { recursive: true, force: true });
}

// 4. missing source exits 2
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cfgdoc-'));
    const r = run(root);
    check('missing source', r.status === 2, r.stdout.trim() + r.stderr.trim());
    fs.rmSync(root, { recursive: true, force: true });
}

const pass = results.filter((r) => r.ok).length;
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + r.detail));
console.log('selftest-configdoc: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
