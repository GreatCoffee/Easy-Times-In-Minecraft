#!/usr/bin/env node
/**
 * f5-wb-preflight.js — fishing_fortune 批（W-FF）开窗前工装自检（不判分）
 *   ① [EtimInit] 15 枚 id + 两条新 reg 行（fishing_fortune / arrow_recovery）
 *   ② 载体门探针：燧石/铜/铁杆、弓、剑、镐（table= 字段实读）
 *   ③ fishgate 令牌（bot 通道）——九段链 + 咬率计数
 *   ④ 真实抛竿：造水池 → cast → 咬 → 收杆 → catch 行
 *   ⑤ fishprobe 陆地（100% cod）＋ arrowprobe（数学面）
 *   ⑥ 真实弓射一箭（LivingHurtEvent → recovery 行）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'f5-wb-preflight';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD = 'f5wb';
const BOT = 'ETIM_R7';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
}
const RE = {
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
  gate: /\[FishLog\] gate (token=1 )?wt=(\d+) adj=(\d+) dist=(\d+) ci0=(\d+) light=(\d) ci2=(\d+) L=(\d+) lure=(\d+) ci3=(\d+) worm=(\d+) ci4=(\d+)/,
  summary: /\[FishLog\] gate-summary n=(\d+) hits=(\d+) ci=(\d+)/,
  catchRow: /\[FishLog\] catch kind=(\S+) rod=(\d+) item=(\S+) q=(\d+) removed=(\d+) xp=(\d+) worm=(-?\d+)/,
  window: /\[FishLog\] window ticks=(\d+)/,
  type: /\[FishLog\] type n=(\d+) cod=(\d+) salmon=(\d+) pos=(\S+) biome=(\S+)/,
  recovery: /\[ArrowLog\] recovery victim=(\S+) lvl=(\d+) r5=(\d+) pass5=(\d) mat=(\S+) c=([\d.]+) passC=(\d) result=(\S+)/,
  recoveryDeath: /\[ArrowLog\] recovery-death victim=(\S+) loot=(\d) child=(\d) dropped=(\d+)/,
  arrowToken: /\[ArrowLog\] recovery token=1 mat=(\S+) L=(\d+) divisor=(\d+) c=([\d.]+) n=(\d+) keep=(\d+)/,
  cast: /\[FishLog\] cast player=(\S+) ok=(\d)/,
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  ev.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.headOk = ev.head.startsWith('895fc1e');
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  ev.cfgHadFishingKeys = /fishingDebugLog/.test(fs.readFileSync(CFG, 'utf8'));
  const cfgKeys = (file) => {
    const out = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^    [A-Z]:(\w+)=(.*)$/.exec(line);
      if (m) out[m[1]] = m[2];
    }
    return out;
  };
  const keysBefore = cfgKeys(CFG);
  if (ev.cfgHadFishingKeys) setCfg(CFG, 'fishingDebugLog', 'true');
  const hadArrowLog = /arrowDebugLog/.test(fs.readFileSync(CFG, 'utf8'));
  if (hadArrowLog) setCfg(CFG, 'arrowDebugLog', 'true');
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const mark = () => srv.all.length;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const idsLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = RE.ids.exec(idsLine);
    ev.ids = { line: idsLine.slice(0, 220), ids: idm ? idm[1].trim().split(/\s+/).map(Number) : null };
    log('boot', 'ids=' + JSON.stringify(ev.ids.ids));

    await sleep(1500);
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT }); break; }
      catch (e) { log('bot-retry', attempt + ': ' + e.message); await sleep(2000); }
    }
    if (!bot) throw new Error('bot connect failed');
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 0', 'naturalRegeneration false', 'doWeatherCycle false']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);

    /* ① 载体门：六件探针（只取 fishing_fortune / arrow_recovery 两行 + 全 reg 表） */
    ev.carrier = {};
    const items = ['etim:fishing_rod_flint', 'etim:fishing_rod_copper', 'etim:fishing_rod_iron',
      'minecraft:bow', 'etim:sword_copper', 'etim:pickaxe_copper'];
    for (const item of items) {
      srv.send(`clear ${BOT}`);
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
      await sleep(350);
      const from = mark();
      srv.send(`etest enchantprobe mainhand pool ${BOT}`);
      await sleep(900);
      const seg = rowsFrom(from);
      const reg = {};
      for (const l of seg) { const m = RE.reg.exec(l); if (m) reg[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', window: m[6].trim() }; }
      ev.carrier[item] = {
        fishing_fortune: reg['etim:fishing_fortune'] || null,
        arrow_recovery: reg['etim:arrow_recovery'] || null,
        regCount: Object.keys(reg).length, reg,
      };
      const ff = reg['etim:fishing_fortune'], ar = reg['etim:arrow_recovery'];
      log('carrier', `${item} ff=${ff ? ff.table : 'MISSING'} ar=${ar ? ar.table : 'MISSING'} reg=${Object.keys(reg).length}`);
    }
    ev.regAll = ev.carrier['etim:fishing_rod_copper'].reg;
    ev.vanillaIds = Object.fromEntries(['minecraft:fortune', 'minecraft:lure', 'minecraft:luck_of_the_sea']
      .map((k) => [k, ev.regAll[k] ? ev.regAll[k].id : null]));
    log('ids', JSON.stringify(ev.vanillaIds));

    /* ② fishgate 令牌（bot 通道） */
    const gate = async (args) => {
      const from = mark();
      bot.chat('/etest fishgate ' + args);
      await sleep(900);
      const seg = rowsFrom(from);
      return {
        gate: seg.map((l) => RE.gate.exec(l)).filter(Boolean).map((m) => ({
          token: !!m[1], wt: +m[2], adj: +m[3], dist: +m[4], ci0: +m[5], light: +m[6], ci2: +m[7],
          L: +m[8], lure: +m[9], ci3: +m[10], worm: +m[11], ci4: +m[12],
        }))[0] || null,
        summary: seg.map((l) => RE.summary.exec(l)).filter(Boolean).map((m) => ({ n: +m[1], hits: +m[2], ci: +m[3] }))[0] || null,
      };
    };
    ev.fishgate = {};
    for (const [k, a] of Object.entries({
      'wt6000': '6000 0 0 0 0 1', 'wt11500': '11500 0 0 0 0 1', 'wt23500': '23500 0 0 0 0 1',
      'L1': '23500 1 0 0 0 1', 'L2': '23500 2 0 0 0 1', 'L3': '23500 3 0 0 0 1', 'L4': '23500 4 0 0 0 1',
      'L5': '23500 5 0 0 0 1', 'L5worm': '23500 5 0 1 0 1', 'L5light': '23500 5 0 0 1 1',
      'L5lure5': '23500 5 5 0 0 1', 'L5lure5worm': '23500 5 5 1 0 1',
    })) {
      ev.fishgate[k] = await gate(a);
      log('fggate', k + ' ' + JSON.stringify(ev.fishgate[k]));
    }

    /* ③ 水池 + 真实抛竿 */
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 6} ${by - 6} ${bz - 12} ${bx + 24} ${by + 8} ${bz + 12} minecraft:air 0`);
    srv.send(`fill ${bx - 6} ${by - 1} ${bz - 12} ${bx + 24} ${by - 1} ${bz + 12} minecraft:stone 0`);
    srv.send(`fill ${bx + 1} ${by - 4} ${bz - 9} ${bx + 20} ${by - 1} ${bz + 9} minecraft:water 0`);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 15`);
    await sleep(2500);
    ev.arena.pool = `${bx + 1}..${bx + 20} y${by - 4}..${by - 1}`;

    srv.send(`clear ${BOT}`);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:fishing_rod_copper 1 0`);
    await sleep(500);
    const castFrom = mark();
    bot.activateItem();
    await sleep(1200);
    const bob = bot.entities && Object.values(bot.entities).find((e) => e && e.name === 'fishing_bobber');
    ev.cast = { bobber: bob ? { x: +bob.position.x.toFixed(2), y: +bob.position.y.toFixed(2), z: +bob.position.z.toFixed(2) } : null,
      entityNames: [...new Set(Object.values(bot.entities || {}).map((e) => e && e.name).filter(Boolean))].slice(0, 12),
      castRows: rowsFrom(castFrom).filter((l) => RE.cast.test(l)) };
    log('cast', JSON.stringify(ev.cast));
    /* 等咬（peak 时刻 ci=600 → 平均 30s） */
    const biteT0 = Date.now();
    let bitten = null;
    while (Date.now() - biteT0 < 120000) {
      const g = rowsFrom(castFrom).map((l) => RE.gate.exec(l)).filter(Boolean)
        .map((m) => ({ wt: +m[2], adj: +m[3], ci0: +m[5], ci3: +m[10], ci4: +m[12] }))[0];
      if (g) { bitten = g; break; }
      await sleep(1000);
    }
    ev.bite = { waitedMs: Date.now() - biteT0, gate: bitten };
    log('bite', JSON.stringify(ev.bite));
    /* 窗口行 + 收杆 */
    const ticksFrom = mark();
    await sleep(700);
    const winRows = rowsFrom(ticksFrom).filter((l) => RE.window.test(l)).map((l) => +RE.window.exec(l)[1]);
    ev.windowTicks = { rows: winRows.slice(0, 8), n: winRows.length };
    bot.activateItem();
    await sleep(1200);
    const catchSeg = rowsFrom(castFrom);
    ev.catch = catchSeg.map((l) => RE.catchRow.exec(l)).filter(Boolean).map((m) => ({
      kind: m[1], rod: +m[2], item: m[3], q: +m[4], removed: +m[5], xp: +m[6], worm: +m[7],
    }));
    log('catch', JSON.stringify(ev.catch));

    /* ④ fishprobe 陆地 */
    {
      const from = mark();
      bot.chat('/etest fishprobe type 1000');
      await sleep(1200);
      ev.probeLand = rowsFrom(from).map((l) => RE.type.exec(l)).filter(Boolean).map((m) => ({ n: +m[1], cod: +m[2], salmon: +m[3], pos: m[4], biome: m[5] }))[0] || null;
      log('probeLand', JSON.stringify(ev.probeLand));
    }

    /* ⑤ arrowprobe 数学面 */
    {
      ev.arrowProbe = {};
      for (const [mat, lvl] of [['flint', 0], ['copper', 3], ['copper', 5], ['iron', 0]]) {
        const from = mark();
        bot.chat(`/etest arrowprobe recovery ${mat} ${lvl} 10000`);
        await sleep(900);
        ev.arrowProbe[mat + '-' + lvl] = rowsFrom(from).map((l) => RE.arrowToken.exec(l)).filter(Boolean)
          .map((m) => ({ mat: m[1], L: +m[2], divisor: +m[3], c: +m[4], n: +m[5], keep: +m[6] }))[0] || null;
        log('arrowprobe', JSON.stringify(ev.arrowProbe[mat + '-' + lvl]));
      }
    }

    /* ⑥ 真实弓射（一箭验证链） */
    {
      const ff = ev.regAll['etim:arrow_recovery'];
      const aid = ff ? ff.id : 0;
      srv.send(`clear ${BOT}`);
      srv.send(`give ${BOT} minecraft:arrow 64`);
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:bow 1 0 {ench:[{id:${aid},lvl:3}]}`);
      await sleep(500);
      const cx = bx + 6.5, cz = bz + 0.5;
      srv.send(`summon minecraft:cow ${cx} ${by} ${cz} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["fshot"]}`);
      await sleep(500);
      const tgt = bot.entities && Object.values(bot.entities).find((e) => e && e.name === 'cow' && Math.abs(e.position.z - cz) < 2);
      if (tgt) bot.lookAt(tgt.position.offset(0, 0.8, 0), true);
      await sleep(300);
      const from = mark();
      bot.activateItem();
      await sleep(1300);
      bot.deactivateItem();
      await sleep(1500);
      const seg = rowsFrom(from);
      ev.realShot = {
        target: tgt ? { x: +tgt.position.x.toFixed(1), y: +tgt.position.y.toFixed(1), z: +tgt.position.z.toFixed(1) } : null,
        hits: seg.map((l) => RE.recovery.exec(l)).filter(Boolean).map((m) => ({ victim: m[1], lvl: +m[2], r5: +m[3], pass5: +m[4], mat: m[5], c: +m[6], passC: +m[7], result: m[8] })),
        deaths: seg.map((l) => RE.recoveryDeath.exec(l)).filter(Boolean).map((m) => ({ victim: m[1], loot: +m[2], child: +m[3], dropped: +m[4] })),
      };
      log('realShot', JSON.stringify(ev.realShot).slice(0, 400));
    }

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message); }
    if (ev.cfgHadFishingKeys) setCfg(CFG, 'fishingDebugLog', 'false');
    if (hadArrowLog) setCfg(CFG, 'arrowDebugLog', 'false');
    const keysAfter = cfgKeys(CFG);
    ev.cfgAfter = {
      bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      newKeys: Object.keys(keysAfter).filter((k) => !(k in keysBefore)),
      changed: Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]),
      values: Object.fromEntries(Object.entries(keysAfter).filter(([k]) => /fishing|arrowRecovery|vanillaLure|luckOfTheSea|wormGrass/.test(k))),
    };
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };    fs.writeFileSync(PROPS, propsBefore);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
