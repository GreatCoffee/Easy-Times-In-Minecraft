// Restore the environment to the documented baseline after the regression run.
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const props = fs.readFileSync(L.PROPS, 'utf8');
let p = L.setProp(props, 'level-name', 'w-b30v');
p = L.setProp(p, 'allow-flight', 'false');
fs.writeFileSync(L.PROPS, p, 'utf8');

let cfg = fs.readFileSync(L.CFG, 'utf8');
cfg = cfg.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=false');
fs.writeFileSync(L.CFG, cfg, 'utf8');

const read = s => (/^level-name=(.*)$/m.exec(s) || [])[1];
console.log('[restore] level-name=' + read(fs.readFileSync(L.PROPS, 'utf8')));
console.log('[restore] allow-flight=' + (/^allow-flight=(.*)$/m.exec(fs.readFileSync(L.PROPS, 'utf8')) || [])[1]);
console.log('[restore] mobDebugLog=' + (/B:mobDebugLog=(true|false)/.exec(fs.readFileSync(L.CFG, 'utf8')) || [])[1]);
