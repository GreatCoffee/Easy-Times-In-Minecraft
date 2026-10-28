#!/usr/bin/env node
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn04' });
  await sleep(4000);
  const out = [];
  b.on('message', (m) => out.push(m.toString()));
  const run = async (c) => {
    const n = out.length;
    b.chat('/' + c);
    await sleep(800);
    console.log(c + '  ->  ' + out.slice(n).join(' | '));
  };
  await run('advancement test @s etim:root');
  await run('advancement test @s etim:portal_to_nether');
  await run('advancement grant @s only etim:root');
  await run('advancement grant @s only etim:portal_to_nether');
  await run('advancement test @s etim:portal_to_nether');
  await run('advancement revoke @s everything');
  b.quit(); setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
