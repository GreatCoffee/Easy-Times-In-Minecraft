#!/usr/bin/env node
/**
 * armorD-restore.js — 窗后还原（会话七，2026-10-26）
 * 1) etim.cfg 移除探针期手写的 combat 块（armorModelR196 / damageDebugLog 未接 config，键本身不存在）
 * 2) server.properties 还原 level-name=arrowb1 / level-type=DEFAULT
 * 3) 打印还原后关键键位
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const cfg = path.join(ROOT, 'run', 'uw2', 'config', 'etim.cfg');
const props = path.join(ROOT, 'run', 'uw2', 'server.properties');

let t = fs.readFileSync(cfg, 'utf8');
const before = /combat \{/.test(t);
t = t.replace(/(\r?\n)*combat \{\s*\r?\n(\s*B:[^\r\n]*\r?\n)+\}\s*(\r?\n)?/, '\n');
fs.writeFileSync(cfg, t, 'utf8');
console.log('removed combat block: ' + before + ' -> ' + /combat \{/.test(fs.readFileSync(cfg, 'utf8')));

let s = fs.readFileSync(props, 'utf8');
s = s.replace(/^level-name=.*$/m, 'level-name=arrowb1');
s = s.replace(/^level-type=.*$/m, 'level-type=DEFAULT');
fs.writeFileSync(props, s, 'utf8');

const keys = ['armorModelR196', 'damageDebugLog', 'arrowDebugLog', 'mobEquipDebugLog', 'portalCooldown', 'foodModel'];
const lines = fs.readFileSync(cfg, 'utf8').split(/\r?\n/);
console.log('--- cfg ---');
lines.forEach((l) => { if (keys.some((k) => l.indexOf(k) >= 0)) console.log(l.trim()); });
console.log('--- props ---');
fs.readFileSync(props, 'utf8').split(/\r?\n/).forEach((l) => {
  if (/^(level-name|level-type|view-distance|difficulty|pvp|online-mode|rcon.port|enable-rcon)=/.test(l)) console.log(l);
});
