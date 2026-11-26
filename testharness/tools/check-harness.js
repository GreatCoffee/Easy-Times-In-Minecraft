#!/usr/bin/env node
/**
 * check-harness.js - read-only census of smoke-script boilerplate (B-70T).
 *
 * Reports how many batch scripts still carry their own boot/stop, PIN stamping,
 * log slicing or [done] emission instead of using player/lib/harness.js. Run it
 * before and after a migration batch to see the trend; it never edits anything.
 *
 *   node testharness/tools/check-harness.js
 *   node testharness/tools/check-harness.js --list   # one line per offender
 *
 * Exit code is always 0 (advisory), so it can sit in a pre-commit hook later.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PLAYER = path.join(__dirname, '..', 'player');
const listMode = process.argv.includes('--list');

const PATTERNS = {
    harness: /require\(\s*['"][^'"]*lib\/harness(\.js)?['"]\s*\)/,
    boot: /async function startBoot\s*\(|async function boot\s*\(/,
    stop: /async function stopBoot\s*\(/,
    cmd: /async function cmd\s*\(/,
    mark: /function mark\s*\(/,
    slice: /function slice\s*\(/,
    waitRow: /async function waitRow\s*\(/,
    pin: /function stampPin\s*\(/,
    done: /console\.log\(\s*'\[done\]'/,
};

function scan(file) {
    const src = fs.readFileSync(file, 'utf8');
    const hit = {};
    for (const [k, re] of Object.entries(PATTERNS)) {
        hit[k] = re.test(src);
    }
    return { file, lines: src.split(/\r?\n/).length, hit };
}

const files = fs.readdirSync(PLAYER)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(PLAYER, f));
const rows = files.map(scan);
const onHarness = rows.filter((r) => r.hit.harness);

const count = (k) => rows.filter((r) => r.hit[k]).length;
const offenders = rows
    .filter((r) => !r.hit.harness && (r.hit.boot || r.hit.cmd || r.hit.pin || r.hit.done || r.hit.mark || r.hit.slice || r.hit.waitRow))
    .sort((a, b) => b.lines - a.lines);

console.log(`[HarnessLog] files=${rows.length} onHarness=${onHarness.length} ownBoot=${count('boot')} ownStop=${count('stop')} ownCmd=${count('cmd')} ownMark=${count('mark')} ownSlice=${count('slice')} ownWaitRow=${count('waitRow')} ownPin=${count('pin')} ownDone=${count('done')} offenders=${offenders.length} [local]`);

if (listMode) {
    for (const r of offenders) {
        const what = ['boot', 'stop', 'cmd', 'mark', 'slice', 'waitRow', 'pin', 'done'].filter((k) => r.hit[k]);
        console.log(`${r.lines}\t${path.basename(r.file)}\t${what.join(',')}`);
    }
} else {
    console.log('top offenders (lines, file):');
    for (const r of offenders.slice(0, 10)) {
        console.log(`  ${String(r.lines).padStart(5)}  ${path.basename(r.file)}`);
    }
    if (onHarness.length) {
        console.log('on harness: ' + onHarness.map((r) => path.basename(r.file)).join(', '));
    }
}
