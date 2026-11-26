#!/usr/bin/env node
/**
 * 判据通道活口巡检（只读）。
 *
 * 回答三个问题：
 *   1. 代码里每个 `[XxxLog]` 通道还有没有产出点（改名/删干净了没有）；
 *   2. 它受哪个 cfg 布尔门控；
 *   3. 断言它的判窗脚本有没有把这个门强制打开。
 *
 * 第 3 条是重点：B-70T4 撞过两次「脚本断言某行日志、但那行根本不会出现」——
 * driver log 从未写盘、cfg 复位后 farmDebugLog 关着导致 22 条探针全空。
 *
 * 用法：
 *   node testharness/tools/check-channels.js                 # 摘要 + 结论
 *   node testharness/tools/check-channels.js --list          # 逐通道明细
 *   node testharness/tools/check-channels.js --script <file> # 只查一份脚本（跑窗前用）
 *   node testharness/tools/check-channels.js --strict        # 历史脚本的缺口也算失败
 *
 * 退出码：0 无风险；1 有风险；2 用法错。
 *
 * 口径：
 *   - 门 = 最近 8 行内 `if (ETIMConfig.<布尔键>)` 或 `if (!ETIMConfig.<布尔键>)`。
 *     找不到门的通道（命令驱动、工具侧）只作提示，不判风险。
 *   - 「已上 harness」的脚本必须自己强制它断言的门；老脚本未强制只计入 DEBT 趋势。
 *   - 门在代码里默认 false 或盘上 false 才算「关着」；默认 true 不算。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src', 'main', 'java');
const SCRIPTS = path.join(ROOT, 'testharness', 'player');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');

const argv = process.argv.slice(2);
const LIST = argv.includes('--list');
const STRICT = argv.includes('--strict');
const scriptArg = argv.includes('--script') ? argv[argv.indexOf('--script') + 1] : null;
if (argv.includes('--script') && !scriptArg) {
  console.error('用法: node testharness/tools/check-channels.js --script <file>');
  process.exit(2);
}

const TOOL_CHANNELS = new Set(['HarnessLog', 'DiffLog', 'LedgerLog', 'ChannelLog', 'PinLog']);
const CHANNEL_RE = /\\?\[([A-Za-z][A-Za-z0-9]*Log)\\?\]/g;
const GATE_RE = /if\s*\(\s*!?\s*ETIMConfig\.([A-Za-z0-9_]+)/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---- cfg 默认值与盘上值 -------------------------------------------------

const cfgSrc = fs.readFileSync(path.join(SRC, 'io/github/etim/etim/ETIMConfig.java'), 'utf8');
const isBool = new Set();
for (const m of cfgSrc.matchAll(/public static boolean ([A-Za-z0-9_]+)\s*=\s*(true|false);/g)) isBool.add(m[1]);
const defaults = new Map();
for (const m of cfgSrc.matchAll(/public static boolean ([A-Za-z0-9_]+)\s*=\s*(true|false);/g)) {
  defaults.set(m[1], m[2] === 'true');
}
const disk = new Map();
if (fs.existsSync(CFG)) {
  for (const m of fs.readFileSync(CFG, 'utf8').matchAll(/B:([A-Za-z0-9_]+)=(\w+)/g)) disk.set(m[1], m[2] === 'true');
}

// ---- src 里的通道与门 ---------------------------------------------------

const producers = new Map(); // channel -> [{file,line,gate}]
for (const file of walk(SRC).filter(f => f.endsWith('.java'))) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((text, i) => {
    for (const m of text.matchAll(CHANNEL_RE)) {
      const ch = m[1];
      let gate = null;
      for (let d = 1; d <= 8 && !gate; d++) {
        const hit = GATE_RE.exec(lines[i - d] || '');
        if (hit && isBool.has(hit[1])) gate = hit[1];
      }
      if (!producers.has(ch)) producers.set(ch, []);
      producers.get(ch).push({ file: path.relative(ROOT, file).replace(/\\/g, '/'), line: i + 1, gate });
    }
    // 通道前缀收在常量里（如 ETIMExplosion 的 `TAG = "ExplosionLog"`），也算产出点。
    for (const m of text.matchAll(/String\s+[A-Za-z0-9_]+\s*=\s*"([A-Za-z][A-Za-z0-9]*Log)"/g)) {
      const ch = m[1];
      if (!producers.has(ch)) producers.set(ch, []);
      producers.get(ch).push({ file: path.relative(ROOT, file).replace(/\\/g, '/'), line: i + 1, gate: null });
    }
  });
}

// ---- 脚本：断言了哪些通道 / 强制了哪些门 --------------------------------

function readScript(file) {
  const text = fs.readFileSync(file, 'utf8');
  const keys = new Set();
  for (const m of text.matchAll(/B:([A-Za-z0-9_]+)\s*=\s*true/g)) keys.add(m[1]);
  const cfgArray = /cfg:\s*\[([^\]]*)\]/.exec(text);
  if (cfgArray) {
    for (const m of cfgArray[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
      const raw = m[1] || m[2];
      keys.add(raw.includes(':') ? raw.split(':').pop() : raw);
    }
  }
  const channels = new Set([...text.matchAll(CHANNEL_RE)].map(m => m[1]));
  const onHarness = /lib\/harness\.js/.test(text);
  return { keys, channels, onHarness };
}

function gateState(gate) {
  const codeOff = defaults.get(gate) === false;
  const diskOff = disk.get(gate) === false;
  return { off: codeOff || diskOff, code: defaults.get(gate), disk: disk.get(gate) };
}

/** @returns {{channel:string, gate:string, state:object}[]} */
function risksFor(script) {
  const out = [];
  for (const ch of script.channels) {
    const prod = producers.get(ch);
    if (!prod || !prod.length) continue;
    const gate = prod.find(p => p.gate)?.gate;
    if (!gate) continue;
    const state = gateState(gate);
    if (!state.off) continue;
    if (!script.keys.has(gate)) out.push({ channel: ch, gate, state });
  }
  return out;
}

// ---- 单脚本模式 ---------------------------------------------------------

if (scriptArg) {
  const file = path.isAbsolute(scriptArg) ? scriptArg : path.join(ROOT, scriptArg);
  if (!fs.existsSync(file)) { console.error('找不到脚本: ' + file); process.exit(2); }
  const script = readScript(file);
  const risks = risksFor(script);
  const dead = [...script.channels].filter(ch => !producers.has(ch) && !TOOL_CHANNELS.has(ch));
  const name = path.relative(ROOT, file).replace(/\\/g, '/');
  console.log(`[ChannelLog] script=${name} channels=${script.channels.size} forced=${script.keys.size} ` +
    `risks=${risks.length} dead=${dead.length} onHarness=${script.onHarness} [local]`);
  for (const r of risks) {
    console.log(`[ChannelLog] SILENT-OFF ${r.channel} gate=${r.gate} (code=${r.state.code} disk=${r.state.disk})`);
  }
  for (const ch of dead) console.log(`[ChannelLog] STALE ${ch}: src 里已无产出点`);
  console.log(`[ChannelLog] verdict ${risks.length + dead.length ? 'RISK' : 'OK'}`);
  process.exit(risks.length + dead.length ? 1 : 0);
}

// ---- 全量模式 -----------------------------------------------------------

const scriptFiles = walk(SCRIPTS).filter(f => f.endsWith('.js'));
const all = new Map();
let assertCount = 0;
const harnessRisks = [];
const debt = [];
const harnessChannels = new Set();

for (const f of scriptFiles) {
  const script = readScript(f);
  const name = path.relative(SCRIPTS, f).replace(/\\/g, '/');
  for (const ch of script.channels) {
    if (!all.has(ch)) all.set(ch, new Set());
    all.get(ch).add(name);
    assertCount++;
    if (script.onHarness) harnessChannels.add(ch);
  }
  const risks = risksFor(script);
  for (const r of risks) (script.onHarness ? harnessRisks : debt).push({ name, ...r });
}

const stale = [];
const staleHarness = [];
for (const ch of all.keys()) {
  if (producers.has(ch) || TOOL_CHANNELS.has(ch)) continue;
  (harnessChannels.has(ch) ? staleHarness : stale).push(ch);
}

console.log(`[ChannelLog] channels=${new Set([...producers.keys(), ...all.keys()]).size} ` +
  `producers=${producers.size} assertions=${assertCount} scripts=${scriptFiles.length} ` +
  `harness-risks=${harnessRisks.length} debt=${debt.length} stale=${stale.length} [local]`);

if (LIST) {
  for (const [ch, set] of [...all].sort((a, b) => b[1].size - a[1].size)) {
    const prod = producers.get(ch) || [];
    const gate = prod.find(p => p.gate)?.gate || '—';
    console.log(`  ${ch.padEnd(16)} asserts=${String(set.size).padEnd(3)} producers=${String(prod.length).padEnd(3)} gate=${gate}`);
  }
}
for (const r of harnessRisks) {
  console.log(`[ChannelLog] SILENT-OFF ${r.channel} gate=${r.gate} script=${r.name} ` +
    `(code=${r.state.code} disk=${r.state.disk})`);
}
for (const ch of stale) console.log(`[ChannelLog] STALE ${ch}: 脚本仍在断言，src 里已无产出点`);

const failed = harnessRisks.length + staleHarness.length + (STRICT ? debt.length + stale.length : 0);
if (debt.length) {
  console.log(`[ChannelLog] DEBT 老脚本未强制门控通道的断言 ${debt.length} 处（历史脚本，趋势项${STRICT ? '，--strict 计为失败' : ''}）`);
}
if (stale.length) {
  console.log(`[ChannelLog] DEBT 老脚本断言了已消失的通道 ${stale.length} 个: ${stale.join(', ')}`);
}
console.log(`[ChannelLog] verdict ${failed ? 'RISK' : 'OK'}`);
process.exit(failed ? 1 : 0);
