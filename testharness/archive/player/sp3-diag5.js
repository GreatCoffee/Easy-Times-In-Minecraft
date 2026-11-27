#!/usr/bin/env node
/** sp3-diag5.js — survival vs creative attack probe, raw chat dumped. */
'use strict';
const fs = require('fs');
const { createHarnBot, log } = require('./fmlbot');
const NAME = 'ETIM_Harn04';
const OUT = process.env.SP3_OUT || '../../build-logs/sp3-diag5.txt';

const out = [];
function note(s) { out.push(s); log('n', s.slice(0, 160)); }

async function run(bot, c, timeoutMs = 2200) {
  const msgs = [];
  const onMsg = (m) => msgs.push(m.toString());
  bot.on('message', onMsg);
  bot.chat(c);
  await new Promise((r) => setTimeout(r, timeoutMs));
  bot.removeListener('message', onMsg);
  note(`${c} => ${JSON.stringify(msgs)}`);
  return msgs;
}

(async () => {
  const gm = process.argv[2] || '0';
  const tag = 'E' + (Date.now() % 100000);
  const nm = 'SP3P_' + tag;
  const bot = await createHarnBot({ username: NAME });
  await run(bot, '/gamemode ' + gm, 1000);
  await run(bot, '/tp ETIM_Harn04 80 136 100', 2000);
  bot.physicsEnabled = false;
  await run(bot, '/kill @e[type=!Player]', 2000);
  await run(bot, `/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:"${nm}"}`, 2000);
  const d1 = await run(bot, `/entitydata @e[name=${nm},r=10] {}`, 2000);
  note('BEFORE ' + (d1.join(' ').match(/num_evasions:-?\d+b|Health:[0-9.]+f|Pos:\[[^\]]+\]/g) || []).join(' '));
  const pre = fs.readFileSync('../../run/obfuscated-server/logs/latest.log', 'utf8').split('\n').length;
  await run(bot, `/etest attack @e[name=${nm},r=10] ETIM_Harn04`, 1500);
  await new Promise((r) => setTimeout(r, 2000));
  const d2 = await run(bot, `/entitydata @e[name=${nm},r=10] {}`, 2000);
  note('AFTER  ' + (d2.join(' ').match(/num_evasions:-?\d+b|Health:[0-9.]+f|Pos:\[[^\]]+\]/g) || []).join(' '));
  const tail = fs.readFileSync('../../run/obfuscated-server/logs/latest.log', 'utf8').split('\n').slice(pre).filter((l) => /step=attack|phase-teleport/.test(l));
  note('LOG ' + JSON.stringify(tail));
  fs.writeFileSync(OUT, out.join('\n'), 'utf8');
  bot.quit();
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error(e); process.exit(1); });
