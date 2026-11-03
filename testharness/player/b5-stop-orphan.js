'use strict';
/* 应急：用 op 假人把孤立的 runServer 优雅停掉（driver 早退后的收口） */
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const name = process.argv[2] || 'ETIM_R6';
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: name });
  await sleep(1500);
  bot.chat('/save-all');
  await sleep(1500);
  bot.chat('/stop');
  console.log('stop sent as ' + name);
  await sleep(6000);
  try { bot.quit(); } catch (e) { /* noop */ }
  process.exit(0);
})().catch((e) => { console.log('ERR', e && e.message); process.exit(1); });
