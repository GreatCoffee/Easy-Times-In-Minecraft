#!/usr/bin/env node
'use strict';
/**
 * Generate docs/CONFIG.md from ETIMConfig.java (single source of truth).
 *
 * Usage:
 *   node testharness/tools/gen-config-doc.js           # write docs/CONFIG.md
 *   node testharness/tools/gen-config-doc.js --check   # compare only (exit 1 on drift)
 *   node testharness/tools/gen-config-doc.js --list    # print rows to stdout
 *
 * Env:
 *   CONFIGDOC_REPO   repo root (default: three levels above this file)
 *   CONFIGDOC_OUT    output path (default: <repo>/docs/CONFIG.md)
 *
 * Exit codes: 0 ok, 1 drift (--check), 2 missing input.
 */
const fs = require('fs');
const path = require('path');

const REPO = process.env.CONFIGDOC_REPO || path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java');
const OUT = process.env.CONFIGDOC_OUT || path.join(REPO, 'docs', 'CONFIG.md');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const LIST = args.includes('--list');

function cleanDoc(block) {
    const body = block
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)
        .join(' ');
    const text = body.replace(/\{@link ([^}]+)\}/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return text.trim();
}

function firstSentence(text) {
    const m = /^(.*?[.。])(\s|$)/.exec(text);
    const s = (m ? m[1] : text).replace(/\s+/g, ' ').trim();
    return s.length > 220 ? s.slice(0, 217) + '…' : s;
}

function main() {
    if (!fs.existsSync(SRC)) {
        console.error('[ConfigDocLog] missing source ' + SRC);
        process.exit(2);
    }
    const text = fs.readFileSync(SRC, 'utf8');

    // Field -> javadoc. Grouped declarations share the block's single javadoc:
    // a field with no doc of its own inherits the last doc while the group runs
    // (a blank line ends the group).
    const fields = new Map();
    const lines = text.split('\n');
    let lastDoc = '';
    let groupDoc = '';
    let inDoc = false;
    let docBuf = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (inDoc) {
            docBuf.push(line);
            if (trimmed.endsWith('*/')) {
                inDoc = false;
                lastDoc = cleanDoc(docBuf.join('\n'));
            }
            continue;
        }
        if (trimmed.startsWith('/**')) {
            if (trimmed.endsWith('*/')) {
                lastDoc = cleanDoc(trimmed);
            } else {
                inDoc = true;
                docBuf = [line];
            }
            continue;
        }
        if (trimmed === '') {
            groupDoc = '';
            continue;
        }
        const fm = /^public static (?:final )?([\w\[\]<>]+)\s+(\w+)\s*=\s*([^;]+);/.exec(trimmed);
        if (fm) {
            const name = fm[2];
            let doc = lastDoc;
            if (!doc && groupDoc) doc = groupDoc;
            fields.set(name, { doc, type: fm[1], init: fm[3].trim() });
            groupDoc = doc;
            lastDoc = '';
            continue;
        }
        if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
            groupDoc = '';
        }
    }

    // Registration -> key/section/range (keyed by the assigned field).
    let m;
    const regs = new Map();
    const regRe = /(\w+)\s*=\s*config\.get(Int|Boolean|Float|String)\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*([^,]+),\s*([\s\S]*?)\)\s*;/g;
    while ((m = regRe.exec(text)) !== null) {
        const kind = m[2];
        const body = m[6] || '';
        const beforeDoc = body.split('"')[0];
        const nums = [...beforeDoc.matchAll(/-?\d+(?:\.\d+)?F?/g)].map((x) => x[0].replace(/F$/, ''));
        regs.set(m[1], {
            key: m[3],
            section: m[4],
            kind,
            range: kind === 'Int' || kind === 'Float' ? (nums.length >= 2 ? nums[0] + ' … ' + nums[1] : '') : '',
        });
    }

    // The one Property-API key: `Property xProp = config.get("section", "key", field, ...)`.
    const propRe = /Property\s+\w+\s*=\s*config\.get\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\w+)([\s\S]*?)\)\s*;/g;
    while ((m = propRe.exec(text)) !== null) {
        const nums = [...(m[4] || '').matchAll(/-?\d+(?:\.\d+)?F?/g)].map((x) => x[0].replace(/F$/, ''));
        regs.set(m[3], {
            key: m[2],
            section: m[1],
            kind: 'Property',
            range: nums.length >= 2 ? nums[0] + ' … ' + nums[1] : '',
        });
    }

    const sections = new Map();
    const problems = [];
    for (const [name, f] of fields) {
        const r = regs.get(name);
        if (!r) { problems.push('field without registration: ' + name); continue; }
        if (!sections.has(r.section)) sections.set(r.section, []);
        sections.get(r.section).push({
            key: r.key,
            name,
            type: r.kind,
            init: f.init,
            range: r.range,
            doc: f.doc ? firstSentence(f.doc) : '*(no javadoc)*',
            hasDoc: !!f.doc,
        });
        if (!f.doc) problems.push('field without javadoc: ' + name);
    }
    for (const [name, r] of regs) {
        if (!fields.has(name)) problems.push('registration without field: ' + name + ' (' + r.key + ')');
    }

    const order = [...sections.keys()].sort();
    const rows = [];
    rows.push('# Configuration reference');
    rows.push('');
    rows.push('> Generated by `node testharness/tools/gen-config-doc.js` from');
    rows.push('> `src/main/java/io/github/etim/etim/ETIMConfig.java`. Do not edit by hand —');
    rows.push('> change the javadoc in the source, then regenerate (`--check` enforces this).');
    rows.push('');
    rows.push('Keys: **' + [...fields.keys()].length + '** across **' + order.length + '** sections.');
    rows.push('');
    for (const s of order) {
        const list = sections.get(s).sort((a, b) => a.key.localeCompare(b.key));
        rows.push('## ' + s + ' (' + list.length + ')');
        rows.push('');
        rows.push('| Key | Type | Default | Range | Description |');
        rows.push('| --- | --- | --- | --- | --- |');
        for (const r of list) {
            const def = r.init.replace(/\|/g, '\\|');
            rows.push('| `' + r.key + '` | ' + r.type + ' | `' + def + '` | ' + (r.range || '—') + ' | ' + r.doc.replace(/\|/g, '\\|') + ' |');
        }
        rows.push('');
    }
    const out = rows.join('\n');

    if (LIST) {
        for (const r of rows) console.log(r);
        return;
    }

    if (CHECK) {
        if (problems.length) {
            console.log('[ConfigDocLog] problems=' + problems.length + ' (every config field needs a javadoc)');
            for (const p of problems) console.log('[ConfigDocLog] problem ' + p);
            process.exit(1);
        }
        const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
        if (cur !== out) {
            console.log('[ConfigDocLog] stale docs/CONFIG.md — run node testharness/tools/gen-config-doc.js');
            process.exit(1);
        }
        console.log('[ConfigDocLog] keys=' + fields.size + ' sections=' + order.length + ' problems=0 verdict OK');
        return;
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, out, 'utf8');
    console.log('[ConfigDocLog] wrote ' + path.relative(REPO, OUT).replace(/\\/g, '/') + ' keys=' + fields.size + ' sections=' + order.length + ' problems=' + problems.length);
    for (const p of problems) console.log('[ConfigDocLog] warn ' + p);
}

main();
