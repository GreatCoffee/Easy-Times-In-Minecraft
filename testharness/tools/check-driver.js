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
 *   R5 leftover-scaffold harness script still touches a deleted global
 *                        (startBoot/stopBoot/srv/stops/propsBefore/cfgBefore/
 *                        EXPECTED_SHA or bare bot.*); these only fail at runtime
 *   R6 cfg-section       `cfg: ['section:key']` names a section the key is not
 *                        registered under in ETIMConfig.java (a bogus section is
 *                        written to the file but never read — B-70TV r4)
 *   R7 builtin-require   harness script calls path./fs./os./child_process./crypto./
 *                        url./util. without its own require(); node --check accepts
 *                        it and the window dies with ReferenceError (B-70TW-3)
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
/**
 * R6 support: key -> section from ETIMConfig.java's init() registrations.
 * Returns null when the config source is absent (e.g. a fixture tree).
 */
function readSections() {
    const src = path.join(ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java');
    if (!fs.existsSync(src)) return null;
    const text = fs.readFileSync(src, 'utf8');
    const map = new Map();
    const re = /config\.get\w*\(\s*"([A-Za-z0-9_.]+)"\s*,\s*"([A-Za-z0-9_]+)"\s*,/g;
    for (const m of text.matchAll(re)) map.set(m[1], m[2]);
    return map;
}

/** Strip comments so doc-shaped text never trips the code rules (R5/R7). */
function stripComments(text) {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

function checkFile(file, sections) {
    const full = path.join(PLAYER, file);
    const src = fs.readFileSync(full, 'utf8');
    const code = stripComments(src);
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

    // R5: after the move to lib/harness.js the old globals are gone; a surviving
    // reference compiles fine and only throws when the window runs (B-70TV r3/r4).
    if (harness) {
        const leftovers = [
            [/startBoot\(/, 'startBoot('],
            [/stopBoot\(/, 'stopBoot('],
            [/\bsrv\./, 'srv.'],
            [/\bstops\b/, 'stops'],
            [/propsBefore|cfgBefore/, 'propsBefore/cfgBefore'],
            [/EXPECTED_SHA/, 'EXPECTED_SHA'],
            [/(?<!h\.)\bbot\./, 'bare bot.'],
        ];
        for (const [re, name] of leftovers) {
            if (re.test(code)) hits.push({ rule: 'R5 leftover-scaffold', detail: name });
        }
    }

    // R7: the deleted scaffold carried the builtin requires with it; a surviving
    // path.join() compiles and only throws when the window runs (B-70TW-3).
    if (harness) {
        const BUILTINS = ['path', 'fs', 'os', 'child_process', 'crypto', 'url', 'util'];
        for (const mod of BUILTINS) {
            const used = new RegExp('\\b' + mod + '\\.').test(code);
            const req = new RegExp("require\\(\\s*['\"]" + mod + "['\"]\\s*\\)").test(src)
                || new RegExp("require\\(\\s*['\"]node:" + mod + "['\"]\\s*\\)").test(src);
            if (used && !req) {
                hits.push({ rule: 'R7 builtin-require', detail: mod + ' used without require(' + mod + ')' });
            }
        }
    }

    // R6: a cfg entry written under the wrong section is accepted by the file
    // writer, echoed by the readback, and then read as false at runtime.
    if (harness && sections) {
        const arr = /cfg:\s*\[([^\]]*)\]/.exec(src);
        if (arr) {
            for (const m of arr[1].matchAll(/'([A-Za-z0-9_]+):([A-Za-z0-9_]+)'/g)) {
                const want = m[1];
                const key = m[2];
                const actual = sections.get(key);
                if (actual === undefined) {
                    hits.push({ rule: 'R6 cfg-section', detail: key + ' is not registered in ETIMConfig' });
                } else if (actual !== want) {
                    hits.push({ rule: 'R6 cfg-section', detail: key + ' lives in [' + actual + '], script says [' + want + ']' });
                }
            }
        }
    }
    return { file, harness, hits };
}

function main() {
    const args = readArgs(process.argv.slice(2));
    const files = args.script ? [args.script] : fs.readdirSync(PLAYER).filter((f) => f.endsWith('.js'));
    const sections = readSections();
    const rows = files.map((f) => checkFile(f, sections));
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
