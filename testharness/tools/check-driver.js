#!/usr/bin/env node
/**
 * Driver-template check: the four defects that cost a whole verdict round each
 * in B-70T8 / B-70T9 (10 B-items, all driver-side).
 *
 *   node testharness/tools/check-driver.js            scan every player script
 *   node testharness/tools/check-driver.js --list     list every offender
 *   node testharness/tools/check-driver.js --script f13-b70t9-smoke.js
 *
 * Rules (hard for every script; legacy files simply show up as debt rows, and
 * because the four checks are textual they cost nothing to satisfy):
 *   R1 boot-missing      harness script never calls h.boot(...)
 *   R2 mark-after-use    the first waitRow() sits before the first mark()
 *   R3 player-missing    /etest hungerstate|hungerpools fired without a player
 *                        token (${A}, botName or the literal bot name)
 *   R4 gamerule-missing  asserts regen/heal rows but never names
 *                        naturalRegeneration
 *
 * Exit 0 = no offenders, 1 = at least one, 2 = usage error.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function readRoot(argv) {
    const i = argv.indexOf('--root');
    if (i < 0 || !argv[i + 1]) return path.resolve(__dirname, '..', '..');
    return path.resolve(argv[i + 1]);
}
const ROOT = readRoot(process.argv.slice(2));
const PLAYER = path.join(ROOT, 'testharness', 'player');

/** Commands whose console form needs a player token (PlayerNotFoundException). */
const NEEDS_PLAYER = ['hungerstate', 'hungerpools'];

function readArgs(argv) {
    const out = { list: false, script: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--root') { i++; continue; }
        if (argv[i] === '--list') out.list = true;
        else if (argv[i] === '--script') out.script = argv[++i];
        else if (argv[i].startsWith('--')) {
            console.error('unknown flag ' + argv[i]);
            process.exit(2);
        }
    }
    return out;
}

function count(text, needle) {
    return text.split(needle).length - 1;
}

/**
 * R3: every NEEDS_PLAYER invocation must name a player. Accepts the template
 * form (${A}), the concatenated form ('...' + A) and the literal bot name.
 * Reads up to the closing `);` of the call so multi-line seeds work.
 */
function scanPlayers(src, hits) {
    for (const cmd of NEEDS_PLAYER) {
        const needle = 'etest ' + cmd;
        let idx = 0;
        while ((idx = src.indexOf(needle, idx)) !== -1) {
            const close = src.indexOf(');', idx);
            const call = src.slice(idx, close < 0 ? idx + 200 : Math.min(close + 2, idx + 400));
            if (!/[^A-Za-z0-9_](A|botName|ETIM_F7)[^A-Za-z0-9_]/.test(call)) {
                hits.push({ rule: 'R3 player-missing', detail: call.replace(/\s+/g, ' ').trim() });
            }
            idx += needle.length;
        }
    }
}

/** Check one file; returns { file, harness, hits: [{rule, detail}] }. */
function checkFile(file) {
    const full = path.join(PLAYER, file);
    const src = fs.readFileSync(full, 'utf8');
    const harness = src.includes("require('./lib/harness.js')");
    const hits = [];

    if (harness && !/h\.boot\(/.test(src)) {
        hits.push({ rule: 'R1 boot-missing', detail: 'no h.boot(...)' });
    }
    // R2 is a harness-shaped rule: legacy scripts bypass mark() with their own
    // log readers, so their counts are debt, not offenders.
    // One mark can legitimately serve several waitRow() calls (the slice start
    // is shared), so only the ordering half is a defect.
    const waits = count(src, 'waitRow(');
    const r2 = [];
    if (waits > 0) {
        const firstMark = src.indexOf('mark(');
        const firstWait = src.indexOf('waitRow(');
        if (firstMark < 0 || firstWait < firstMark) {
            r2.push('waitRow before first mark');
        }
    }
    for (const d of r2) {
        hits.push({ rule: 'R2 mark-after-use', detail: d, debt: !harness });
    }
    scanPlayers(src, hits);
    if (/healed|regenFactor|via regen/.test(src) && !src.includes('naturalRegeneration')) {
        hits.push({ rule: 'R4 gamerule-missing', detail: 'asserts regen without naturalRegeneration', debt: !harness });
    }
    return { file, harness, hits };
}

function main() {
    const args = readArgs(process.argv.slice(2));
    const files = args.script ? [args.script] : fs.readdirSync(PLAYER).filter((f) => f.endsWith('.js'));
    const rows = files.map(checkFile);
    const hard = rows.filter((r) => r.hits.some((h) => !h.debt));
    const onHarness = rows.filter((r) => r.harness).length;
    if (args.list) {
        for (const r of hard) {
            for (const h of r.hits) console.log('[DriverLog] ' + r.file + ' ' + h.rule + ' ' + h.detail);
        }
    }
    const rules = {};
    for (const r of hard) for (const h of r.hits.filter((x) => !x.debt)) {
        const k = h.rule.split(' ')[0];
        rules[k] = (rules[k] || 0) + 1;
    }
    const debt = rows.reduce((n, r) => n + r.hits.filter((h) => h.debt).length, 0);
    console.log('[DriverLog] files=' + rows.length + ' onHarness=' + onHarness
        + ' offenders=' + hard.length + ' debt=' + debt + ' byRule=' + JSON.stringify(rules) + ' [local]');
    console.log('[DriverLog] verdict ' + (hard.length ? 'FAIL' : 'OK'));
    process.exit(hard.length ? 1 : 0);
}

main();
