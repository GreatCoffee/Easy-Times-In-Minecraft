#!/usr/bin/env node
/** face-index 自检：三向合并（面→通道→窗口→金标）+ 汇总 + kickoff 建议（纯函数，不读真实账本）。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'face-index.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

const I = require(TOOL);

const rows = [
    { vol: 'C', key: 'EntityPlayer.java:10-20', carrier: 'src/.../ETIMMelee.java', chans: 'MeleeLog', scripts: 'f15-reg-chains.js', tier: 'ASSERTED' },
    { vol: 'C', key: 'EntityPlayer.java:30-40', carrier: 'src/.../ETIMMelee.java', chans: 'MeleeLog, DamageLog', scripts: 'f15-reg-chains.js', tier: 'ASSERTED' },
    { vol: 'A', key: 'ItemTool.java:1-2', carrier: 'src/.../ETIMToolDurability.java', chans: '', scripts: '', why: 'no-log', tier: 'EXEMPT' },
];
const goldens = [
    { script: 'f15-reg-chains.js', tee: 'f15-b70uv-r1-b1.out', fields: 13, channels: ['MeleeLog'] },
    { script: 'f14-reg-core.js', tee: 'f14-b70tw-r2-b1.out', fields: 4, channels: ['DamageLog'] },
    { script: 'f11-b66-smoke.js', tee: 'b66-b70tc-r1-b1.out', fields: 30, channels: ['BlockFaceLog'] },
];

// 1) channel → golden mapping
const idx = I.buildIndex(rows, goldens);
const row = (k) => idx.find((r) => r.key === k);
check('golden joined by channel', row('EntityPlayer.java:10-20').guard.length === 1 && row('EntityPlayer.java:10-20').guard[0].script === 'f15-reg-chains.js', JSON.stringify(row('EntityPlayer.java:10-20').guard));
check('multi-channel face joins two goldens', row('EntityPlayer.java:30-40').guard.length === 2, JSON.stringify(row('EntityPlayer.java:30-40').guard.map((g) => g.script)));
check('exempt face has no golden', row('ItemTool.java:1-2').guard.length === 0 && row('ItemTool.java:1-2').tier === 'EXEMPT');

// 2) summarize
const s = I.summarize(idx);
check('summary counts', s.faces === 3 && s.asserted === 2 && s.exempt === 1 && s.withChan === 2 && s.withGolden === 2, JSON.stringify(s));

// 3) propose: scripts + base from first golden + modes
const proposal = I.propose(idx, [
    { key: 'C:10', ref: 'EntityPlayer.java:10-20' },
    { key: 'C:30', ref: 'EntityPlayer.java:30-40' },
    { key: 'A:1', ref: 'ItemTool.java:1-2' },
], goldens);
check('propose picks window scripts', proposal.scripts.length === 1 && proposal.scripts[0] === 'f15-reg-chains.js', JSON.stringify(proposal));
check('propose takes golden tee as base', proposal.base === 'f15-b70uv-r1-b1.out', proposal.base);
check('propose uses arms+values when a golden exists', proposal.modes.join('+') === 'arms+values', proposal.modes.join('+'));

const noWin = I.propose([{ vol: 'z', key: 'New.java:1-2', carrier: '', tier: 'NEW', chans: [], windows: [], guard: [] }], [{ key: 'Z:1', ref: 'New.java:1-2' }], goldens);
check('propose empty for brand-new faces', noWin.scripts.length === 0 && noWin.modes.join('+') === 'arms', JSON.stringify(noWin));

// 4) render mentions each face and the guard column
const md = I.render(idx);
check('doc lists faces and golden column', /EntityPlayer\.java:10-20/.test(md) && /数值金标/.test(md) && /f15-reg-chains\.js/.test(md));

// 5) CLI --check on a temp tree (stale detection)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'));
const env = Object.assign({}, process.env, { FACEINDEX_JSON: path.join(tmp, 'idx.json'), FACEINDEX_DOC: path.join(tmp, 'idx.md') });
const CWD = path.resolve(__dirname, '..', '..');
function cli(args, e) {
    try { return { code: 0, out: execFileSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: e, cwd: CWD }) }; }
    catch (x) { return { code: x.status, out: String(x.stdout || '') }; }
}
const r1 = cli(['--check'], env);
check('check reports STALE before first write', r1.code === 1 && /stale=1/.test(r1.out), r1.out.trim());

const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'idx2-'));
const env2 = Object.assign({}, process.env, { FACEINDEX_JSON: path.join(tmp2, 'idx.json') });
const GOLD = path.join(tmp2, 'goldens');
fs.mkdirSync(GOLD);
fs.writeFileSync(path.join(GOLD, 'a.json'), JSON.stringify({ script: 'a.js', tee: 't-b1.out', fields: 1, values: { '[FooLog] x': { 'n:1': 1 } } }), 'utf8');
const env3 = Object.assign({}, process.env, { FACEINDEX_JSON: path.join(tmp2, 'idx.json'), FACEINDEX_DOC: path.join(tmp2, 'idx.md'), FACEINDEX_GOLDENS: GOLD });
cli([], env3);
const r3 = cli(['--check'], env3);
check('check OK right after write', r3.code === 0 && /stale=0/.test(r3.out), r3.out.trim().split('\n').pop());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
