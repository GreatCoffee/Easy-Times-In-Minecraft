/** op-harn07.js — 一次性：Harn01 执行 /op ETIM_Harn07，退出 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn01' });
  await sleep(12000);
  bot.chat('/op ETIM_Harn07');
  await sleep(2000);
  log('op', 'sent /op ETIM_Harn07');
  bot.chat('/tp ETIM_Harn01 1100 70 0');
  await sleep(2000);
  bot.quit();
  setTimeout(() => process.exit(0), 1500);
}
main().catch((e) => { log('op', 'FATAL:', e.message); process.exit(1); });
