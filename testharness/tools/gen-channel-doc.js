#!/usr/bin/env node
'use strict';
/**
 * Generates docs/CHANNELS.md from the source tree.
 *
 * One row per `[XxxLog]` channel that has a producer in `src/main/java`:
 *   channel · gate (config key + section) · producers (file:line) ·
 *   /etest drivers used by the scripts · asserting scripts · regression
 *
 * The doc is generated; do not edit by hand. `--check` fails when the
 * checked-in file is stale, so adding a channel without regenerating is a
 * red preflight (the same ratchet as docs/CONFIG.md).
 *
 * env: CHANDOC_REPO (repo root), CHANDOC_OUT (output path)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.CHANDOC_REPO || path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src', 'main', 'java');
const PLAYER = path.join(ROOT, 'testharness', 'player');
const OUT = process.env.CHANDOC_OUT || path.join(ROOT, 'docs', 'CHANNELS.md');
const CHECK = process.argv.includes('--check');

const TOOL_CHANNELS = new Set(['HarnessLog', 'DiffLog', 'LedgerLog', 'ChannelLog', 'PinLog']);
const CHANNEL_RE = /\\?\[([A-Za-z][A-Za-z0-9]*Log)\\?\]/g;
const GATE_RE = /if\s*\(\s*!?\s*ETIMConfig\.([A-Za-z0-9_]+)/;
const TAG_RE = /String\s+[A-Za-z0-9_]+\s*=\s*"([A-Za-z][A-Za-z0-9]*Log)"/g;
const ETEST_RE = /\/?etest\s+([a-z][a-z0-9]*)/g;

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f, out);
        else if (f.endsWith('.js')) out.push(f);
    }
    return out;
}

function walkJava(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walkJava(f, out);
        else if (f.endsWith('.java')) out.push(f);
    }
    return out;
}

// ---- config keys: default + section -------------------------------------
const cfgFile = path.join(SRC, 'io/github/etim/etim/ETIMConfig.java');
const sections = new Map();
const boolDefaults = new Map();
if (fs.existsSync(cfgFile)) {
    for (const m of fs.readFileSync(cfgFile, 'utf8').matchAll(
        /config\.get(?:Int|Boolean|Float|String)\("([A-Za-z0-9_]+)",\s*"([A-Za-z0-9_]+)"/g)) {
        sections.set(m[1], m[2]);
    }
    // Defaults come from the field initialisers: the registration calls pass
    // the field itself as the default argument, so the literal is not there.
    for (const m of fs.readFileSync(cfgFile, 'utf8').matchAll(
        /public static (?:final )?boolean ([A-Za-z0-9_]+)\s*=\s*(true|false)/g)) {
        boolDefaults.set(m[1], m[2] === 'true');
    }
}
const gated = (key) => boolDefaults.has(key);

// ---- producers ----------------------------------------------------------
/** @type {Map<string, {file:string,line:number,gate:string|null}[]>} */
const producers = new Map();
for (const file of walkJava(SRC)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((text, i) => {
        // Javadoc and line comments mention tags for cross-reference only.
        if (/^\s*(\*|\/\*|\/\/)/.test(text)) return;
        const push = (ch) => {
            let gate = null;
            for (let d = 1; d <= 8 && !gate; d++) {
                const hit = GATE_RE.exec(lines[i - d] || '');
                if (hit && gated(hit[1])) gate = hit[1];
            }
            // Dev commands and client overlays print unconditionally; the gate
            // heuristic would otherwise borrow a neighbouring key that does
            // not guard the row (same rule as check-channels.js).
            if (rel.includes('/commands/') || rel.includes('/client/')) gate = null;
            if (rel.endsWith('ETIMConfig.java')) return;
            if (!producers.has(ch)) producers.set(ch, []);
            const list = producers.get(ch);
            if (list.some((x) => x.file === rel && x.line === i + 1)) return;
            list.push({ file: rel, line: i + 1, gate });
        };
        for (const m of text.matchAll(CHANNEL_RE)) push(m[1]);
        for (const m of text.matchAll(TAG_RE)) push(m[1]);
    });
}

// ---- scripts: asserted channels + /etest drivers -------------------------
/** @type {Map<string, {scripts:Set<string>, drivers:Set<string>}>} */
const asserted = new Map();
const scriptFiles = walk(PLAYER);
for (const file of scriptFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const text = fs.readFileSync(file, 'utf8');
    const chans = new Set([...text.matchAll(CHANNEL_RE)].map((m) => m[1]));
    const isLib = /(f7-wb-lib|fmlbot)\.js$/.test(file);
    const drivers = isLib ? new Set() : new Set([...text.matchAll(ETEST_RE)].map((m) => m[1]));
    for (const ch of chans) {
        if (TOOL_CHANNELS.has(ch)) continue;
        if (!asserted.has(ch)) asserted.set(ch, { scripts: new Set(), drivers: new Set() });
        const slot = asserted.get(ch);
        slot.scripts.add(path.basename(rel));
        for (const d of drivers) slot.drivers.add(d);
    }
}

// ---- render ------------------------------------------------------------
const rows = [];
for (const [ch, prod] of producers) {
    if (TOOL_CHANNELS.has(ch)) continue;
    const gates = [...new Set(prod.map((p) => p.gate).filter(Boolean))].sort();
    const slot = asserted.get(ch) || { scripts: new Set(), drivers: new Set() };
    const sortedProd = [...prod].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    const shown = sortedProd.slice(0, 6)
        .map((p) => '`' + p.file.replace('src/main/java/io/github/etim/etim/', '') + ':' + p.line + '`');
    if (sortedProd.length > shown.length) shown.push('+' + (sortedProd.length - shown.length) + ' more');
    const producersText = shown.join('<br>');
    const gateText = gates.length
        ? gates.map((g) => '`' + g + '`' + (sections.has(g) ? ' (' + sections.get(g) + ')' : '')).join('<br>')
        : '—';
    const driverText = slot.drivers.size
        ? [...slot.drivers].sort().map((d) => '`/etest ' + d + '`').join('<br>')
        : '—';
    const scriptText = slot.scripts.size
        ? [...slot.scripts].sort().map((s) => '`' + s + '`').join('<br>')
        : '**uncovered**';
    rows.push({ ch, gateText, producersText, driverText, scriptText, covered: slot.scripts.size > 0 });
}
rows.sort((a, b) => a.ch.localeCompare(b.ch));

const covered = rows.filter((r) => r.covered).length;
const out = [];
out.push('# Judgement channels');
out.push('');
out.push('> Generated by `node testharness/tools/gen-channel-doc.js` from');
out.push('> `src/main/java/**` (producers), `ETIMConfig.java` (gates) and');
out.push('> `testharness/player/**.js` (assertions + `/etest` drivers). Do not');
out.push('> edit by hand — regenerate (`--check` enforces this).');
out.push('');
out.push('Channels: **' + rows.length + '**, asserted by a window script: **' + covered + '**.');
out.push('');
out.push('| Channel | Gate | Producers | Drivers used | Asserted by |');
out.push('| --- | --- | --- | --- | --- |');
for (const r of rows) {
    out.push('| `' + r.ch + '` | ' + r.gateText + ' | ' + r.producersText + ' | ' + r.driverText + ' | ' + r.scriptText + ' |');
}
out.push('');
const doc = out.join('\n');

if (CHECK) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== doc) {
        console.log('[ChanDocLog] stale docs/CHANNELS.md — run node testharness/tools/gen-channel-doc.js');
        process.exit(1);
    }
    console.log('[ChanDocLog] channels=' + rows.length + ' covered=' + covered + ' verdict OK');
    process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, doc, 'utf8');
console.log('[ChanDocLog] wrote ' + path.relative(ROOT, OUT).replace(/\\/g, '/') +
    ' channels=' + rows.length + ' covered=' + covered);
