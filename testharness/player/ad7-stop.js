/**
 * ad7-stop.js — 优雅停服（bot 聊天 /stop，等价控制台 stop）：
 * 落 latest.log 的 "Stopping server"/"Stopping!"，避免直杀 JVM 缺收尾行。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const HOST = process.argv[2] || 'localhost';
const PORT = Number(process.argv[3] || 25565);
const USER = process.argv[4] || 'ETIM_Harn01';

createHarnBot({ host: HOST, port: PORT, username: USER })
  .then(async (bot) => {
    await new Promise((r) => setTimeout(r, 1500));
    log('cmd', '/stop');
    bot.chat('/stop');
    await new Promise((r) => setTimeout(r, 8000));
    process.exit(0);
  })
  .catch((e) => { console.error('STOP ERR:', e.message); process.exit(1); });
