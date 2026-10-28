/**
 * ad10s-config.js — AD-10+SH 验证窗的配置切换器（会话七自研工装，产品码 0 触碰）
 *
 * 只改 run/ad10s/config/etim.cfg 的 combat 段六键：
 *   damageDebugLog / blockDebugLog / blockModel / blockDamageFactor
 *   / blockMinDamage / shieldWearRate
 *
 * 用法：node ad10s-config.js main|nomodel|factor1|shield0|close|show
 *   main     damageDebugLog=true  blockDebugLog=true  blockModel=true
 *            factor=0.5 min=1.0 shieldRate=1.0      （窗 A：W1~W13）
 *   nomodel  blockModel=false                         （窗 B：W14①）
 *   factor1  blockDamageFactor=1.0                    （窗 C：W14②）
 *   shield0  shieldWearRate=0.0                       （窗 D：W14③）
 *   close    damageDebugLog=false blockDebugLog=false blockModel=true
 *            factor=0.5 min=1.0 shieldRate=1.0        （收口还原）
 *   show     只打印当前值
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG = process.env.AD10S_CFG || path.join(ROOT, 'run', 'ad10s', 'config', 'etim.cfg');

const BASE = {
  damageDebugLog: 'true',
  blockDebugLog: 'true',
  blockModel: 'true',
  blockDamageFactor: '0.5',
  blockMinDamage: '1.0',
  shieldWearRate: '1.0',
};
/** 其余 dev 通道一律关（前置②：只留 damageDebugLog + blockDebugLog 两条判据通道）。 */
const QUIET = {
  craftingDebugLog: 'false',
  deathDebugLog: 'false',
  foodDebugLog: 'false',
  ingestDebugLog: 'false',
  furnaceDebugLog: 'false',
  equipDebugLog: 'false',
  metalDebugLog: 'false',
  miningDebugLog: 'false',
  mobEquipDebugLog: 'false',
  mobDebugLog: 'false',
  arrowDebugLog: 'false',
  underworldDebugLog: 'false',
  weatherDebugLog: 'false',
};
const MODES = {
  main: {},
  nomodel: { blockModel: 'false' },
  factor1: { blockDamageFactor: '1.0' },
  shield0: { shieldWearRate: '0.0' },
  close: { damageDebugLog: 'false', blockDebugLog: 'false' },
};
const KIND = {
  damageDebugLog: 'B',
  blockDebugLog: 'B',
  blockModel: 'B',
  blockDamageFactor: 'S',
  blockMinDamage: 'S',
  shieldWearRate: 'S',
};
for (const k of Object.keys(QUIET)) KIND[k] = 'B';

/** 写 combat { } 段里的一行；键不存在时补插（cfg 由上一批 jar 生成时缺 block* 键）。 */
function setKV(text, key, value) {
  const re = new RegExp('^([ \\t]*[BIS]:' + key + '=)(.*)$', 'm');
  if (re.test(text)) return text.replace(re, (m, p1) => p1 + value);
  const blockRe = /(^combat \{[\s\S]*?\n)(\})/m;
  if (!blockRe.test(text)) throw new Error('no combat {} block in ' + CFG);
  return text.replace(blockRe, (m, head, close) => head + '    ' + KIND[key] + ':' + key + '=' + value + '\n' + close);
}

function show(text) {
  const grab = (k) => {
    const m = new RegExp('^[ \\t]*[BIS]:' + k + '=(.*)$', 'm').exec(text);
    return m ? m[1].trim() : '(absent)';
  };
  const out = {};
  for (const k of Object.keys(KIND)) out[k] = grab(k);
  console.log('[ad10s-config] ' + CFG);
  for (const [k, v] of Object.entries(out)) console.log('   ' + k + ' = ' + v);
  return out;
}

const mode = process.argv[2] || 'show';
let text = fs.readFileSync(CFG, 'utf8');
if (mode === 'show') {
  show(text);
  process.exit(0);
}
if (!MODES[mode]) {
  console.error('usage: node ad10s-config.js main|nomodel|factor1|shield0|close|show');
  process.exit(2);
}
const wanted = Object.assign({}, QUIET, BASE, MODES[mode]);
for (const [k, v] of Object.entries(wanted)) text = setKV(text, k, v);
fs.writeFileSync(CFG, text, 'utf8');
console.log('[ad10s-config] applied mode=' + mode);
show(text);
