#!/usr/bin/env node
'use strict';
/**
 * check-pipeline-doc — keeps docs/PIPELINE.md honest.
 *
 * The pipeline doc is prose (it cannot be generated), so this check pins the
 * two things that rot silently: every tool in testharness/tools/ must be named
 * in the doc, and every preflight step must appear in the quality-gate table.
 *
 *   node testharness/tools/check-pipeline-doc.js
 *   PIPELINE_REPO / PIPELINE_DOC  point at another tree (self-test)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.PIPELINE_REPO || path.resolve(__dirname, '..', '..');
const TOOLS = path.join(ROOT, 'testharness', 'tools');
const PREFLIGHT = path.join(TOOLS, 'preflight.js');
const DOC = process.env.PIPELINE_DOC || path.join(ROOT, 'docs', 'PIPELINE.md');

if (!fs.existsSync(DOC)) {
    console.log('[PipelineLog] missing ' + path.relative(ROOT, DOC).replace(/\\/g, '/'));
    process.exit(2);
}
if (!fs.existsSync(TOOLS)) {
    console.log('[PipelineLog] SKIP tools dir absent');
    process.exit(0);
}

const doc = fs.readFileSync(DOC, 'utf8');

const tools = fs.readdirSync(TOOLS).filter((f) => f.endsWith('.js') && !f.startsWith('selftest-'));
const missingTools = tools.filter((f) => !doc.includes(f));

const steps = [];
if (fs.existsSync(PREFLIGHT)) {
    const text = fs.readFileSync(PREFLIGHT, 'utf8');
    for (const m of text.matchAll(/step\(\s*'([a-z][a-z0-9-]*)'/g)) steps.push(m[1]);
    if (/function gradleStep\(/.test(text)) steps.unshift('gradle');
}
const missingSteps = steps.filter((s) => !doc.includes('`' + s + '`'));

console.log('[PipelineLog] tools=' + tools.length + ' steps=' + steps.length +
    ' missingTools=' + missingTools.length + ' missingSteps=' + missingSteps.length);
for (const t of missingTools) console.log('[PipelineLog] tool not documented: ' + t);
for (const s of missingSteps) console.log('[PipelineLog] preflight step not documented: ' + s);
const bad = missingTools.length + missingSteps.length;
console.log('[PipelineLog] verdict ' + (bad ? 'GAP' : 'OK'));
process.exit(bad ? 1 : 0);
