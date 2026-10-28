#!/usr/bin/env node
/**
 * armorD2-config.js — 复验窗配置（会话七，2026-10-26）
 * 用法：node armorD2-config.js on|off|model-off|model-on
 *   on        : damageDebugLog=true  / armorModelR196=true（主窗）
 *   off       : damageDebugLog=false / armorModelR196=true（收口 0 行核）
 *   model-off : damageDebugLog=true  / armorModelR196=false（W19）
 *   model-on  : 还原 armorModelR196=true
 * 同时钉 level-name=armorD / level-type=FLAT（窗内），restore 由 armorD-restore.js 负责。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CFG = path.join(ROOT, 'run', 'uw2', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'uw2', 'server.properties');

const mode = (process.argv[2] || '').toLowerCase();
const want = {
  on: { dmg: 'true', model: 'true', name: 'armorD', type: 'FLAT' },
  off: { dmg: 'false', model: 'true', name: 'armorD', type: 'FLAT' },
  'model-off': { dmg: 'true', model: 'false', name: 'armorD', type: 'FLAT' },
  'model-on': { dmg: 'true', model: 'true', name: 'armorD', type: 'FLAT' },
  restore: { dmg: 'false', model: 'true', name: 'arrowb1', type: 'DEFAULT' },
}[mode];
if (!want) { console.log('usage: on|off|model-off|model-on|restore'); process.exit(2); }

let t = fs.readFileSync(CFG, 'utf8');
const has = (k) => new RegExp('^\\s*B:' + k + '=', 'm').test(t);
for (const [k, v] of [['damageDebugLog', want.dmg], ['armorModelR196', want.model]]) {
  if (has(k)) {
    t = t.replace(new RegExp('^(\\s*B:' + k + '=).*$', 'm'), '$1' + v);
  } else {
    // 追加到已有 combat 段，或新建
    if (/^combat \{/m.test(t)) {
      t = t.replace(/^(combat \{)$/m, '$1' + '\n    B:' + k + '=' + v);
    } else {
      t = t.replace(/\s*$/, '') + '\n\ncombat {\n    B:armorModelR196=' + want.model + '\n    B:damageDebugLog=' + want.dmg + '\n}\n';
    }
  }
}
fs.writeFileSync(CFG, t, 'utf8');

let s = fs.readFileSync(PROPS, 'utf8');
s = s.replace(/^level-name=.*$/m, 'level-name=' + want.name).replace(/^level-type=.*$/m, 'level-type=' + want.type);
fs.writeFileSync(PROPS, s, 'utf8');

const lines = fs.readFileSync(CFG, 'utf8').split(/\r?\n/);
console.log('mode=' + mode);
let inCombat = false;
lines.forEach((l) => {
  if (/^combat \{/.test(l)) inCombat = true;
  if (inCombat) { console.log('  cfg| ' + l.trim()); if (/^\}/.test(l.trim())) inCombat = false; }
});
fs.readFileSync(PROPS, 'utf8').split(/\r?\n/).forEach((l) => { if (/^(level-name|level-type)=/.test(l)) console.log('  props| ' + l); });
