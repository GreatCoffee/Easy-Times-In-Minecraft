const fs = require('fs');
const p = 'D:/OpenCodeWorkspace/Easy Times In Minecraft/git-workspace/etim/testharness/player/f7-wb-lib.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('const MK_PIN = {');
const end = s.indexOf('};', start) + 2;
if (start < 0) { console.log('MK_PIN not found'); process.exit(1); }
const before = s.slice(start, end);
s = s.slice(0, start) + 'const MK_PIN = { classes: 95, entries: 214, dual: 428, mixins: 92, client: 10 };' + s.slice(end);
fs.writeFileSync(p, s, 'utf8');
console.log('old :: ' + before);
console.log('new :: const MK_PIN = { classes: 95, entries: 214, dual: 428, mixins: 92, client: 10 };');
