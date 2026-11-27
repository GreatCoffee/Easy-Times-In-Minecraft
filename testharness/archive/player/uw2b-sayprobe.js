#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarnBot } = require('./fmlbot');
const LOG = path.join(__dirname, '..', '..', 'run', 'uw2', 'logs', 'latest.log');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn03' });
  await sleep(4000);
  const out = [];
  b.on('message', (m) => out.push(m.toString()));
  const run = async (c, ms) => { const n = out.length; b.chat('/' + c); await sleep(ms || 1200); return out.slice(n).join(' | '); };
  console.log('pos=', JSON.stringify(b.entity.position));
  console.log('summon ->', await run('summon minecraft:arrow ~ ~2 ~ {Tags:["uw2probe"]}'));
  await sleep(800);
  console.log('say plain ->', await run('say PROBE_SAY_PLAIN'));
  console.log('execute say ->', await run('execute @e[type=arrow,r=50] ~ ~ ~ say PROBE_SAY_EXEC'));
  console.log('chat plain ->', (() => { b.chat('PROBE_CHAT_PLAIN_MSG'); return 'sent'; })());
  await sleep(1200);
  const ed = await run('entitydata @e[type=arrow,r=50,limit=1] {}', 1500);
  console.log('entitydata ->', ed.slice(0, 900));
  await sleep(1500);
  const t = fs.readFileSync(LOG, 'utf8');
  ['PROBE_SAY_PLAIN', 'PROBE_SAY_EXEC', 'PROBE_CHAT_PLAIN_MSG', 'uw2probe'].forEach((k) => {
    const hits = t.split('\n').filter((l) => l.includes(k));
    console.log('LOG[' + k + '] = ' + hits.length + (hits[0] ? ' :: ' + hits[0].slice(0, 160) : ''));
  });
  b.chat('/kill @e[tag=uw2probe]');
  await sleep(600);
  b.quit(); setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
