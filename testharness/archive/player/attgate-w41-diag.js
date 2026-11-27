#!/usr/bin/env node
/**
 * attgate-w41-diag.js — W-41 判窗前通道诊断（非判据；C 级工装记录）
 *
 * 目的：给「第 5 调用点（盾面 wearShieldOrTool）怎样才吃得到一次 mundane 伤害」定通道：
 *   ① difficulty 2 + useitem + mob 源 → 期望 1 条 attacking row ＋ 血量下降；
 *   ② difficulty 0 + useitem + mob 源（同条件 A/B，仅难度不同）；
 *   ③ difficulty 2 + useitem + generic 源（`setDamageBypassesArmor` ⇒ unblockable 反证）。
 * 只记录，不判决；落 build-logs/attgate-w41-diag-*。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const TAG = process.argv[2] || 'attgate-w41-diag';
const BOT = 'ETIM_DIAG';
const WORLD = 'attgatediag';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const propsBefore = fs.readFileSync(PROPS);
  const txt = propsBefore.toString('utf8').replace(/(^|\r\n)level-name=[^\r\n]*/m, `$1level-name=${WORLD}`);
  fs.writeFileSync(PROPS, txt, 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  try {
    await srv.ready;
    const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    await sleep(2500);
    srv.send(`op ${BOT}`);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('time set 6000');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest level 35 ${BOT}`);
    await sleep(1500);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(1200);
    console.log('health after setup', bot.health);

    // 平台：by = 地面 +8，与主驱动同形（tp 后等落地再判定）
    const p = bot.entity.position;
    const bx = Math.floor(p.x); const by = Math.floor(p.y) + 8; const bz = Math.floor(p.z);
    for (const dx of [0, 1, 2]) srv.send(`setblock ${bx + dx} ${by - 1} ${bz} minecraft:dirt 0`);
    for (const dx of [0, 1, 2]) for (const dy of [0, 1, 2]) srv.send(`setblock ${bx + dx} ${by + dy} ${bz} minecraft:air 0`);
    await sleep(900);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1800);
    console.log('pos after tp', JSON.stringify(bot.entity.position), 'health', bot.health);

    const prep = async (sword) => {
      srv.send('kill @e[type=pig]');
      await sleep(500);
      srv.send(`etest hold ${sword} ${BOT}`);
      await sleep(700);
      srv.send(`summon minecraft:pig ${bx + 1.5} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Health:1000.0f,Attributes:[{Name:"generic.maxHealth",Base:1000.0},{Name:"generic.knockbackResistance",Base:1.0}]}`);
      await sleep(900);
      srv.send(`etest useitem ${BOT}`);
      await sleep(900);
    };

    const step = async (label, cmd, extra) => {
      const from = srv.all.length;
      const h0 = bot.health;
      srv.send(cmd);
      await sleep(1700);
      const seg = srv.all.slice(from).map(strip);
      const rows = seg.filter((l) => /\[MiningLog\] tool decay/.test(l)).map((l) => l.slice(0, 180));
      const dmg = seg.filter((l) => /\[DamageLog\] dmg target=/.test(l)).map((l) => l.slice(0, 180));
      const hurt = seg.filter((l) => /\[TestLog\] step=hurt/.test(l)).map((l) => l.slice(0, 180));
      console.log(`--- ${label}`);
      console.log('    health', h0, '->', bot.health);
      if (extra) console.log('    note', extra);
      console.log('    hurtLog', JSON.stringify(hurt));
      console.log('    damageLog', JSON.stringify(dmg));
      console.log('    decayRows', JSON.stringify(rows));
      return { label, h0, h1: bot.health, rows, dmg, hurt };
    };

    const out = [];
    srv.send('difficulty 2');
    await sleep(600);
    await prep('minecraft:irom_sword'.replace('irom', 'iron'));
    out.push(await step('① diff=2 mob(useitem)', `etest hurt @e[type=pig,r=6,c=1] 8 ${BOT}`));

    srv.send('difficulty 0');
    await sleep(600);
    await prep('minecraft:iron_sword');
    out.push(await step('② diff=0 mob(useitem) 同条件 A/B', `etest hurt @e[type=pig,r=6,c=1] 8 ${BOT}`));

    srv.send('difficulty 2');
    await sleep(600);
    await prep('minecraft:iron_sword');
    out.push(await step('③ diff=2 generic(useitem) unblockable 反证', `etest hurt 8 generic ${BOT}`));

    // ④ 非格挡对照：同难度下不 useitem 的 mob 伤害（expect: 无 row，血量直落 8）
    srv.send('difficulty 2');
    await sleep(600);
    srv.send('kill @e[type=pig]');
    await sleep(400);
    srv.send(`etest hold minecraft:iron_sword ${BOT}`);
    await sleep(600);
    srv.send(`summon minecraft:pig ${bx + 1.5} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Health:1000.0f,Attributes:[{Name:"generic.maxHealth",Base:1000.0},{Name:"generic.knockbackResistance",Base:1.0}]}`);
    await sleep(900);
    out.push(await step('④ diff=2 mob(no useitem) 非格挡对照', `etest hurt @e[type=pig,r=6,c=1] 8 ${BOT}`));

    fs.writeFileSync(path.join(OUT, TAG + '-matrix.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
    try { bot.quit(); } catch (e) { /* ignore */ }
  } finally {
    await sleep(800);
    await srv.stop();
    fs.writeFileSync(PROPS, propsBefore);
    const w = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(w)) fs.rmSync(w, { recursive: true, force: true });
    try { fs.copyFileSync(path.join(ROOT, 'run', 'logs', 'latest.log'), path.join(OUT, TAG + '-server-latest.log')); } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
