'use strict';
/* f5-arrow2.js — W-FF9 箭负向臂（doMobLoot=false / 幼体）：循环补射直到真命中 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const TAG = 'f5-wb-arrow2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
}
(async () => {
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  ev.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  setCfg(CFG, 'fishingDebugLog', 'true');
  setCfg(CFG, 'arrowDebugLog', 'true');
  const cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', 'f5wb'), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rows = (f) => srv.all.slice(f).map(strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    await sleep(1500);
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_R7' });
    try { bot.removeAllListeners('message'); } catch (e) {}
    try { bot.physics.enabled = false; } catch (e) {}
    srv.send('op ETIM_R7');
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doWeatherCycle false',
      'randomTickSpeed 0', 'naturalRegeneration false']) srv.send('gamerule ' + g);
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    srv.send('gamemode 0 ETIM_R7');
    srv.send('etest health 20 ETIM_R7');
    await sleep(700);
    const mainEv = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
    const arid = mainEv.regAll['etim:arrow_recovery'].id;
    const land = { bx: -66, by: 68, bz: 248 };
    srv.send(`fill ${land.bx - 6} ${land.by - 1} ${land.bz - 6} ${land.bx + 10} ${land.by - 1} ${land.bz + 6} minecraft:stone 0`);
    srv.send(`fill ${land.bx - 6} ${land.by} ${land.bz - 6} ${land.bx + 10} ${land.by + 6} ${land.bz + 6} minecraft:air 0`);
    srv.send(`tp ETIM_R7 ${land.bx + 0.5} ${land.by} ${land.bz + 0.5}`);
    await sleep(1600);
    srv.send(`clear ETIM_R7`);
    srv.send(`replaceitem entity ETIM_R7 slot.weapon.mainhand minecraft:bow 1 0 {ench:[{id:${arid},lvl:3}]}`);
    srv.send(`replaceitem entity ETIM_R7 slot.hotbar.1 etim:arrow_copper 64`);
    await sleep(600);
    const shootOnce = async (tag, extra) => {
      const f = mark();
      srv.send(`summon minecraft:cow ${land.bx + 3.5} ${land.by} ${land.bz + 0.5} {Health:2.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${extra},Tags:["${tag}"]}`);
      await sleep(400);
      const tgt = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow' && Math.abs(e.position.x - (land.bx + 3.5)) < 1.5);
      if (tgt) { await bot.lookAt(tgt.position.offset(0, 0.9, 0), true); }
      await sleep(250);
      bot.activateItem();
      await sleep(1250);
      bot.deactivateItem();
      await sleep(700);
      const seg = rows(f);
      const dmg = seg.filter((l) => /\[DamageLog\] dmg .*src=arrow/.test(l)).length;
      const recRows = seg.map((l) => /\[ArrowLog\] recovery victim=(\S+) lvl=(\d+) r5=(\d+) pass5=(\d) mat=(\S+) c=([\d.]+) passC=(\d) result=(\S+)/.exec(l))
        .filter(Boolean).map((m) => ({ lvl: +m[2], pass5: +m[3], passC: +m[6], result: m[7] }));
      const rec = recRows.length;
      const death = seg.map((l) => /\[ArrowLog\] recovery-death victim=(\S+) loot=(\d) child=(\d) dropped=(\d+)/.exec(l)).filter(Boolean)
        .map((m) => ({ victim: m[1], loot: +m[2], child: +m[3], dropped: +m[4] }))[0] || null;
      srv.send(`kill @e[tag=${tag}]`);
      await sleep(120);
      return { dmg, rec, recRows, death };
    };
    const arm = async (id, extra, wantDeath) => {
      const shots = [];
      for (let i = 0; i < 8; i++) {
        const r = await shootOnce(`fa_${id}_${i}`, extra);
        shots.push(r);
        if (r.dmg > 0 && (!wantDeath || r.death)) break;
      }
      const hit = shots.find((s) => s.dmg > 0 && (!wantDeath || s.death)) || shots.find((s) => s.dmg > 0) || null;
      const out = { id, shots: shots.length, hit, all: shots };
      log('arm', JSON.stringify(out));
      return out;
    };
    srv.send('gamerule doMobLoot false');
    await sleep(400);
    ev.noLoot = await arm('nl', '', true);
    srv.send('gamerule doMobLoot true');
    await sleep(400);
    ev.child = await arm('ch', ',Age:-24000', true);
    /* 命中且 pending 的对照臂（系统默认门全开） */
    ev.control = await arm('ct', '');
    /* 命中后掉箭物证（对照） */
    {
      const f = mark();
      srv.send(`summon minecraft:cow ${land.bx + 3.5} ${land.by} ${land.bz + 0.5} {Health:2.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["fct2"]}`);
      await sleep(400);
      const tgt = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow' && Math.abs(e.position.x - (land.bx + 3.5)) < 1.5);
      if (tgt) await bot.lookAt(tgt.position.offset(0, 0.9, 0), true);
      await sleep(250);
      bot.activateItem();
      await sleep(1250);
      bot.deactivateItem();
      await sleep(500);
      srv.send(`execute @p ~ ~ ~ testfor @e[type=item,r=5] {Item:{id:"etim:arrow_copper"}}`);
      await sleep(450);
      ev.controlItem = rows(f).filter((l) => /Found item|did not match|Failed/.test(l)).slice(0, 3);
      log('controlItem', JSON.stringify(ev.controlItem));
    }
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) {}
    try { if (!srv.exited) await srv.stop(); } catch (e) {}
    setCfg(CFG, 'fishingDebugLog', 'false');
    setCfg(CFG, 'arrowDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
