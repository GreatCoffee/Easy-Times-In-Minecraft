#!/usr/bin/env node
/**
 * farm1-wf-te-probe.js — 诊断探针（非判据）：施肥位 TE 生命周期
 *
 * 假设（由 Preflight 观察提出）：ETIMFarmlandTile 未覆写 shouldRefresh，Forge 默认对
 * 非 net.minecraft.* 的 TE 用 `oldState != newState` ⇒ 耕地 moisture 状态一变就把 TE
 * 清掉，施肥位随之消失。preflight 里 growth 行 2s 后停、trample deny 不出现即此因。
 *
 * 三组对照：
 *   A = farmland 7 + TE + 麦（无水源）→ 自然衰减 7→6 应把 TE 清掉（growth 行停）
 *   B = farmland 0 + TE + 麦（无水源，moisture 不变）→ growth 行应持续
 *   D = farmland 0 + TE + 麦，t≈12s 强制 setblock farmland 7（状态变）→ growth 行应停
 * 另：踩踏新鲜位（bit 刚置）应 deny；踩踏 5s 后（moisture 已变）应 allow。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-teprobe';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const WORLD = 'farm1teprobe';
const BOT = 'ETIM_TP';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, t.replace(new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm'), (m, p1) => p1 + v), 'utf8');
}

async function main() {
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  setCfg(CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const ev = { plots: {}, samples: [], trample: {} };
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(800);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false', 'keepInventory true', 'mobGriefing true']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    await sleep(700);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    srv.send(`fill ${bx - 4} ${by - 1} ${bz - 4} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 4} ${by} ${bz - 4} ${bx + 8} ${by + 4} ${bz + 8} minecraft:air 0`);
    await sleep(1800);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(900);

    const mkPlot = (name, z, moisture) => {
      const x0 = bx + 4;
      srv.send(`fill ${x0} ${by - 1} ${z} ${x0 + 2} ${by - 1} ${z} minecraft:farmland ${moisture} replace {EtimFertilized:1b}`);
      srv.send(`fill ${x0} ${by} ${z} ${x0 + 2} ${by} ${z} minecraft:wheat 0`);
      return { name, x0, z, moisture0: moisture };
    };
    ev.plots.A = mkPlot('A', bz, 7);
    ev.plots.B = mkPlot('B', bz + 2, 0);
    ev.plots.D = mkPlot('D', bz + 4, 0);
    srv.send('gamerule randomTickSpeed 200');
    await sleep(800);
    const posKey = (p) => `${p.x0},${p.z}`;
    const growthAt = (x, z) => srv.all.filter((l) => new RegExp('\\[FarmLog\\] growth pos=' + x + ',' + by + ',' + z + ' ').test(l)).length;
    const tf = async (x, y, z, block, state) => {
      const from = srv.all.length;
      srv.send(`testforblock ${x} ${y} ${z} ${block} ${state}`);
      await sleep(300);
      return srv.all.slice(from).map(strip).filter((l) => /Successfully found|The block at/.test(l)).join(' | ');
    };
    const t0 = Date.now();
    for (let i = 0; i < 9; i++) {
      await sleep(4000);
      const t = Math.round((Date.now() - t0) / 1000);
      const row = { t, A: growthAt(bx + 4, bz), B: growthAt(bx + 4, bz + 2), D: growthAt(bx + 4, bz + 4),
        moistureA: await tf(bx + 4, by - 1, bz, 'minecraft:farmland', 'moisture=7'),
        moistureD: await tf(bx + 4, by - 1, bz + 4, 'minecraft:farmland', 'moisture=7') };
      ev.samples.push(row);
      log('sample', JSON.stringify(row));
      if (i === 3) { // t≈16s: 强制 D 组状态变 0→7
        srv.send(`setblock ${bx + 4} ${by - 1} ${bz + 4} minecraft:farmland 7`);
        srv.send(`setblock ${bx + 5} ${by - 1} ${bz + 4} minecraft:farmland 7`);
        srv.send(`setblock ${bx + 6} ${by - 1} ${bz + 4} minecraft:farmland 7`);
        log('force', 'D plot setblock farmland 7 (state change)');
      }
    }
    ev.final = {
      A: growthAt(bx + 4, bz), B: growthAt(bx + 4, bz + 2), D: growthAt(bx + 4, bz + 4),
      A_total: srv.all.filter((l) => new RegExp('\\[FarmLog\\] growth pos=' + (bx + 4) + ',' + by + ',' + bz + ' ').test(l)).length,
      B_total: srv.all.filter((l) => new RegExp('\\[FarmLog\\] growth pos=' + (bx + 4) + ',' + by + ',' + (bz + 2) + ' ').test(l)).length,
      D_total: srv.all.filter((l) => new RegExp('\\[FarmLog\\] growth pos=' + (bx + 4) + ',' + by + ',' + (bz + 4) + ' ').test(l)).length,
      consumeRows: srv.all.filter((l) => /\[FarmLog\] fertilized clear/.test(l)).length,
      consumeSample: srv.all.filter((l) => /\[FarmLog\] fertilized clear/.test(l)).slice(0, 3).map(strip),
      clearRowsByPlot: {
        A: srv.all.filter((l) => new RegExp('\\[FarmLog\\] fertilized clear pos=' + (bx + 4) + ',' + (by - 1) + ',' + bz + ' ').test(l)).length,
        B: srv.all.filter((l) => new RegExp('\\[FarmLog\\] fertilized clear pos=' + (bx + 4) + ',' + (by - 1) + ',' + (bz + 2) + ' ').test(l)).length,
        D: srv.all.filter((l) => new RegExp('\\[FarmLog\\] fertilized clear pos=' + (bx + 4) + ',' + (by - 1) + ',' + (bz + 4) + ' ').test(l)).length,
      },
    };
    log('final', JSON.stringify(ev.final));

    /* 踩踏：新鲜位 vs 5s 后位（S=200 保持） */
    const fresh = { x: bx + 2, y: by - 1, z: bz + 6 };
    const aged = { x: bx + 5, y: by - 1, z: bz + 6 };
    srv.send(`setblock ${fresh.x} ${fresh.y} ${fresh.z} minecraft:farmland  replace {EtimFertilized:1b}`);
    srv.send(`setblock ${aged.x} ${aged.y} ${aged.z} minecraft:farmland  replace {EtimFertilized:1b}`);
    await sleep(5000); // aged: 自然 moisture 衰减应清 TE；fresh: moisture 0 无变
    const trFrom = srv.all.length;
    srv.send(`summon minecraft:cow ${fresh.x + 0.5} ${by + 3} ${fresh.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tfx"]}`);
    srv.send(`summon minecraft:cow ${aged.x + 0.5} ${by + 3} ${aged.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tfy"]}`);
    await sleep(4000);
    ev.trample = {
      freshRows: srv.all.slice(trFrom).map(strip).filter((l) => /FarmLog\] (fertilized trample-deny|trample allow) pos=/.test(l) && new RegExp('pos=' + fresh.x + ',' + fresh.y + ',' + fresh.z).test(l)),
      agedRows: srv.all.slice(trFrom).map(strip).filter((l) => /FarmLog\] (fertilized trample-deny|trample allow) pos=/.test(l) && new RegExp('pos=' + aged.x + ',' + aged.y + ',' + aged.z).test(l)),
      all: srv.all.slice(trFrom).map(strip).filter((l) => /trample/.test(l)).slice(0, 8),
    };
    log('trample', JSON.stringify(ev.trample));
    srv.send('gamerule randomTickSpeed 3');
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    await srv.stop();
    fs.writeFileSync(PROPS, propsBefore);
    setCfg(CFG, 'farmDebugLog', 'false');
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('done');
  }
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
