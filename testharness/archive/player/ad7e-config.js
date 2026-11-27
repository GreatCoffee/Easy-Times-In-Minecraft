/**
 * ad7e-config.js — 批 E / AD-7 验证窗的配置切换器（会话七自研工装）
 *
 * 只改 run/ad7e/config/etim.cfg 的 combat 段三个开关，产品码 0 触碰：
 *   damageDebugLog / piercingMaxLevel / piercingPointsPerLevel
 * 每次切换后打印当前值，供回执 §一 的「配置开关」表引用。
 *
 * 用法：node ad7e-config.js main|points0|max1|close|show
 *   main     damageDebugLog=true  maxLevel=5  points=1.0   （窗 A：W1~W9/W11）
 *   points0  damageDebugLog=true  maxLevel=5  points=0.0   （窗 B：W10①）
 *   max1     damageDebugLog=true  maxLevel=1  points=1.0   （窗 C：W10②）
 *   close    damageDebugLog=false maxLevel=5  points=1.0   （收口还原）
 *   show     只打印当前值
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG = process.env.AD7E_CFG || path.join(ROOT, 'run', 'ad7e', 'config', 'etim.cfg');

const MODES = {
  main: { damageDebugLog: 'true', piercingMaxLevel: '5', piercingPointsPerLevel: '1.0' },
  points0: { damageDebugLog: 'true', piercingMaxLevel: '5', piercingPointsPerLevel: '0.0' },
  max1: { damageDebugLog: 'true', piercingMaxLevel: '1', piercingPointsPerLevel: '1.0' },
  close: { damageDebugLog: 'false', piercingMaxLevel: '5', piercingPointsPerLevel: '1.0' },
};
const KIND = { damageDebugLog: 'B', piercingMaxLevel: 'I', piercingPointsPerLevel: 'S' };

/** 在 combat { } 段里写一行；键不存在时补插（首次 boot 前 cfg 还是旧版）。 */
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
  const out = {
    damageDebugLog: grab('damageDebugLog'),
    armorModelR196: grab('armorModelR196'),
    piercingMaxLevel: grab('piercingMaxLevel'),
    piercingPointsPerLevel: grab('piercingPointsPerLevel'),
  };
  console.log('[ad7e-config] ' + CFG);
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
  console.error('usage: node ad7e-config.js main|points0|max1|close|show');
  process.exit(2);
}
for (const [k, v] of Object.entries(MODES[mode])) text = setKV(text, k, v);
fs.writeFileSync(CFG, text, 'utf8');
console.log('[ad7e-config] applied mode=' + mode);
show(text);
