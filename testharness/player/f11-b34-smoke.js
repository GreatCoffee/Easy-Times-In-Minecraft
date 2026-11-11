#!/usr/bin/env node
/**
 * f11-b34-smoke — B-34（WitchRoaming + TargetIfHostileToPlayers）烟测驱动。
 *
 * 与 f11-b33-verify.js 同一套已验证工装面（b31 r2→r7 / b33 r1→r6 逐轮钉死）：
 *   - 全部放置/testfor 走 console（srv.send）绝对坐标，bot 只当受击/目标面；
 *   - bot = SURVIVAL + 药水保命（resist IV/regen IV/absorption IV）——
 *     狼/女巫的 targetTasks 面走 EntityAITarget disableDamage 门（:179-181），
 *     creative bot 不被瞄准（b33 r2 定谳），受击面必须有真玩家仇恨；
 *   - 月相 override = cfg `S:moonStateOverride=`（B-2 工单先例）——
 *     w2 狂化臂需要 blood，w3 超时臂需要空（自然月相），故三 boot：
 *     b1 = 旗开 + blood（w1 witch roam + w2 wolf frenzy）
 *     b2 = 旗开 + 空  （w3 wolf hurt→hostile→40s timeout）
 *     b3 = 旗断      （b1 双零面）
 *
 * 判据行（全服务端日志，run/logs/latest.log 与 build-logs/<tag>-b*.out）：
 *   [AILog] roam src=witch probe-in|start  — B-34 roam 面
 *   [AILog] wanderback src=witch …         — B-30 既有臂（诊断面，不计 bad）
 *   [AILog] wolfhostile src=wolf probe-in|start — B-34 targeting 面
 *   [DamageLog] dmg target=ETIM_F7 src=mob — 狼咬 bot 面攻击链
 *
 * bad = w1.roamStart>=1 && w2.wolfStart>=1 && w3.bites>=1（r3：狼 tp 进 bot
 *       同格受击→hostile→咬；AI start 由 w2 frenzy 面独立判）
 *       && b1.zero==1 && mixinFail==0 x3；w3.timeout 面只记（bitesAfter45/50）。
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b34-smoke';
const RUN = 'r4';
const WORLD = 'w-b34a';
const A = 'ETIM_F7';

const ev = { run: RUN, tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };

let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const sha256 = L.sha256;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };

/** props 归一化（b31/b33 同口径：去 # 注释行去空行 LF 连接取 sha256；raw 只记不判）。 */
function propsNorm(file) {
  const t = fs.readFileSync(file, 'utf8');
  return sha256(Buffer.from(t.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#')).join('\n'), 'utf8'));
}
function propsRaw(file) { return sha256(fs.readFileSync(file)); }
function propsLevel(file) {
  const m = /^level-name=(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : '(none)';
}

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk: L.mkCounts() };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true });
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', world)
    : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
}

/** 场地：围墙台面（b33 形），bot SURVIVAL（受击面要真仇恨）+ 药水保命。 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await sleep(2000);
  await cmd('gamemode 0 ' + A, 500); // SURVIVAL — the targetTasks faces need a real attack target
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doFireTick false', 300); // 血月强制雷暴防意外起火
  await cmd('gamerule mobGriefing true', 300);
  await cmd('difficulty hard', 400);
  await cmd('time set 18000', 300); // midnight — the roam/frenzy night gates
  await cmd('kill @e[type=!player]', 900);
  await cmd('tp ' + A + ' -60.5 67 240.5', 900);
  await sleep(1500);
  await cmd('fill -69 66 235 -35 66 245 minecraft:cobblestone', 1000);
  await cmd('fill -69 67 235 -35 71 245 minecraft:air', 1000);
  // 2 高围墙四连（b33 r2 面：防 zombie/wolf 走缘坠湖）
  await cmd('fill -69 67 235 -35 68 235 minecraft:cobblestone', 700);
  await cmd('fill -69 67 245 -35 68 245 minecraft:cobblestone', 700);
  await cmd('fill -69 67 235 -69 68 245 minecraft:cobblestone', 700);
  await cmd('fill -35 67 235 -35 68 245 minecraft:cobblestone', 700);
  await protectBot();
}

/** bot 保命（b31 verify 形：SURVIVAL 受击必漏伤，regen 兜底）。 */
async function protectBot() {
  await cmd(`effect ${A} minecraft:resistance 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:regeneration 9999 4 true`, 250);
  await cmd(`effect ${A} minecraft:absorption 9999 4 true`, 250);
}

const isTimestamped = (l) => /^\[\d{2}:\d{2}:\d{2}\]/.test(l);
const tsSec = (l) => { const m = /^\[(\d{2}):(\d{2}):(\d{2})\]/.exec(l); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : -1; };

/** 判行过滤器：face 带空格（b31 定谳——"breakdoor" 本身含 break 的教训）。 */
const roamRows = (lines) => lines.filter((l) => l.indexOf('AILog] roam ') >= 0);
const roamStarts = (lines) => lines.filter((l) => l.indexOf('AILog] roam ') >= 0 && l.indexOf(' start ') >= 0);
const roamProbes = (lines) => lines.filter((l) => l.indexOf('AILog] roam ') >= 0 && l.indexOf(' probe-in ') >= 0);
const wolfRows = (lines) => lines.filter((l) => l.indexOf('AILog] wolfhostile ') >= 0);
const wolfStarts = (lines) => lines.filter((l) => l.indexOf('AILog] wolfhostile ') >= 0 && l.indexOf(' start ') >= 0);
const wolfProbes = (lines) => lines.filter((l) => l.indexOf('AILog] wolfhostile ') >= 0 && l.indexOf(' probe-in ') >= 0);
const wbStarts = (lines) => lines.filter((l) => l.indexOf('AILog] wanderback ') >= 0 && l.indexOf(' start ') >= 0);
/** 狼咬 bot：[DamageLog] … target=ETIM_F7 … src=mob（b33 b1.out 实测格式）。 */
const biteRows = (lines) => lines.filter((l) => l.indexOf('[DamageLog]') >= 0 && l.indexOf(' src=mob ') >= 0 && l.indexOf('target=ETIM_F7') >= 0);

async function summonWitch(x, z) {
  await cmd(`summon witch ${x} 67 ${z}`, 900);
}

async function summonWolf(x, z) {
  await cmd(`summon wolf ${x} 67 ${z}`, 900);
}

/** w1 — witch roam 臂：夜＋玩家距 spawn >16 → 1/100 概率离场游荡。 */
async function witchRoamArm(k, waitMs) {
  await summonWitch(-67, 240); // spawn memo = 首次 join 位置（ETIMLivestockEvents）
  await cmd('tp ' + A + ' -45.5 67 242.5', 700); // 距 spawn 22 格 >16 门
  await sleep(waitMs || 120000); // r4: 60s→120s，1%/轮命中率压险（r3 320 轮 0 命中 P≈4%）
  const rows = since(k);
  return {
    n: roamStarts(rows).length,
    probes: roamProbes(rows).length,
    wb: wbStarts(rows).length,
    rows: roamStarts(rows).slice(0, 3).concat(roamProbes(rows).slice(0, 2)),
  };
}

/** w2 — wolf frenzy 臂：blood moon + 夜 → 每 tick setHostile → 择 bot。
 *  ❶ 狂化腿 = ETIMMoonState.isNight 走 totalWorldTime（世界年龄钟，不响应 /time set，
 *     ETIMMoonState.java:96-99）→ 新世界 age≈2000t 时 adjusted=8000＝白天，狂化恒 false
 *     （r1 定谳）。夜窗 = adjusted>19000‖≤5000 ⇔ age∈[13000,18000)：先等世界年龄过 13000
 *     再召唤。boot+w1 已耗 ~2000t → 等约 600s（4×150s 批次，≤180s 纪律），召唤时 age≈14000，
 *     臂长 60s 收于 ~15200 仍在窗内。 */
async function wolfFrenzyArm(k, waitMs) {
  await cmd('tp ' + A + ' -60.5 67 240.5', 600);
  await protectBot();
  for (let i = 0; i < 4; i++) {
    console.log('[w2] age-wait batch ' + (i + 1) + '/4');
    await sleep(150000);
  }
  console.log('[w2] age window reached — summoning wolf');
  await summonWolf(-62, 240); // bot 西 2 格——视线内、可瞄准
  await sleep(1500);
  const t0Date = new Date();
  ev.arms.w2.t0 = t0Date.toISOString();
  await sleep(waitMs || 60000);
  const rows = since(k);
  return {
    n: wolfStarts(rows).length,
    probes: wolfProbes(rows).length,
    bites: biteRows(rows).length,
    rows: wolfStarts(rows).slice(0, 3),
  };
}

/** w3 — hurt→hostile→timeout 臂：非血月、bot 近战打狼一次 → 受击面置 hostile
 *  → AI 锁 bot → ~40s 后 countdown 到 0 → 清 target+hostile。 */
async function wolfHurtArm(k, waitMs) {
  await cmd('tp ' + A + ' -60.5 67 240.5', 600);
  await protectBot();
  await summonWolf(-61, 240); // bot 西 1 格
  await sleep(1500);
  const raw0 = srv.all.slice(k); // 未 strip 行（含 [hh:mm:ss] 前缀）
  const t0 = tsSec(raw0.find(isTimestamped) || '');
  if (bot && bot.entity) {
    // R196 近战 1.5+容差（ETIMReachEvents.onAttackEntity :42-53）会拒远攻；狼在游走，
    // 故用「读狼现位→tp bot 贴身→lookAt+attack」重试环，命中即停（deny 行=etim.reach.deny_attack）。
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ent = Object.values(bot.entities).find((e) => e.type === 'mob' && e.name && String(e.name).indexOf('wolf') >= 0);
      if (!ent) { console.log('[w3] no wolf entity (attempt ' + attempt + ')'); await sleep(1200); continue; }
      // r4: park wolf 0.8 blocks from bot (exact stacking made ETIM reach read Float.MAX -> deny), 3 attacks, no break
      srv.send('tp @e[type=wolf] -61.3 67 240.5');
      await sleep(500);
      try {
        bot.lookAt(ent.position.offset(0, 1, 0));
        await sleep(250);
        bot.attack(ent);
      } catch (e) { console.log('[w3] bot.attack err: ' + e.message); }
      await sleep(800);
    }
  } else {
    console.log('[w3] bot dead — the hurt face untried');
  }
  await sleep(waitMs || 70000);
  const rawRows = srv.all.slice(k);
  const rawBites = biteRows(rawRows);
  const strippedRows = since(k);
  return {
    n: wolfStarts(strippedRows).length,
    probes: wolfProbes(strippedRows).length,
    bites: rawBites.length,
    bitesAfter45: t0 >= 0 ? rawBites.filter((l) => tsSec(l) >= (t0 + 45)).length : -1,
    bitesAfter50: t0 >= 0 ? rawBites.filter((l) => tsSec(l) >= (t0 + 50)).length : -1,
    firstBite: rawBites[0] || '', lastBite: rawBites[rawBites.length - 1] || '',
    rows: wolfStarts(strippedRows).slice(0, 3),
  };
}

/** b1 — 旗断双零面（witch + wolf 各 30s，零判行零探针）。 */
async function flagOffArm(k, waitMs) {
  await summonWitch(-67, 240);
  await cmd('tp ' + A + ' -45.5 67 242.5', 700);
  await summonWolf(-62, 240);
  await sleep(waitMs || 30000);
  const rows = since(k);
  return {
    roamN: roamStarts(rows).length + roamProbes(rows).length,
    wolfN: wolfStarts(rows).length + wolfProbes(rows).length,
    bites: biteRows(rows).length,
  };
}

(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();

  // ---------------- boot 1: 旗开 + blood moon（w1 roam + w2 frenzy） ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false, moonStateOverride: 'blood' });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.w1 = await witchRoamArm(k);
    console.log('[w1]', JSON.stringify({ n: ev.arms.w1.n, probes: ev.arms.w1.probes, wb: ev.arms.w1.wb }));
    await cmd('kill @e[type=!player]', 600);
  }
  {
    const k = srv.all.length;
    ev.arms.w2 = { t0: null };
    ev.arms.w2 = Object.assign(ev.arms.w2, await wolfFrenzyArm(k));
    console.log('[w2]', JSON.stringify({ n: ev.arms.w2.n, probes: ev.arms.w2.probes, bites: ev.arms.w2.bites }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 2: 旗开 + 自然月相（w3 hurt→hostile→timeout） ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: true, mobDebugLog: true, mobDespawnR196: false, moonStateOverride: '' });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.w3 = await wolfHurtArm(k);
    console.log('[w3]', JSON.stringify({ n: ev.arms.w3.n, probes: ev.arms.w3.probes, bites: ev.arms.w3.bites, b45: ev.arms.w3.bitesAfter45, b50: ev.arms.w3.bitesAfter50 }));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  // ---------------- boot 3: 旗断（b1 双零） ----------------
  srv = await startBoot(TAG + '-b3', WORLD, { livestockNeedsR196: false, mobDebugLog: true, mobDespawnR196: false, moonStateOverride: '' });
  const mixFail3 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail3 });
  await stageArena();

  {
    const k = srv.all.length;
    ev.arms.b1 = await flagOffArm(k);
    console.log('[b1]', JSON.stringify(ev.arms.b1));
    await cmd('kill @e[type=!player]', 600);
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);

  stampPin();

  const w1 = ev.arms.w1 || {}, w2 = ev.arms.w2 || {}, w3 = ev.arms.w3 || {}, b1 = ev.arms.b1 || {};
  const w0 = ev.boots.length === 3 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length === 3 && ev.stopBoots.every((s) => s.exitCode === 0 && s.build === true);
  const w1ok = (w1.n || 0) >= 1;
  const w2ok = (w2.n || 0) >= 1;
  const w3ok = (w3.bites || 0) >= 1; // r3: hurt-face judge = bites (AI start itself proven by w2 frenzy face)
  const b1ok = (b1.roamN || 0) === 0 && (b1.wolfN || 0) === 0;
  const w4 = ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
    && ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: w0 ? 'PASS' : 'FAIL', w1: w1ok ? 'PASS' : 'FAIL', w2: w2ok ? 'PASS' : 'FAIL',
    w3: w3ok ? 'PASS' : 'FAIL', b1: b1ok ? 'PASS' : 'FAIL', w4: w4 ? 'PASS' : 'FAIL',
    w3note: 'r3 judge = bites>=1 (wolf tp into bot cell, hurt face -> hostile -> bite); bitesAfter45/50 recorded for timeout-face analysis; AI-start judged by w2 frenzy face',
  };
  const bad = !(w0 && w1ok && w2ok && w3ok && b1ok && w4);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    w1: w1.n, w1probes: w1.probes, w1wb: w1.wb,
    w2: w2.n, w2bites: w2.bites,
    w3: w3.n, w3bites: w3.bites, w3b45: w3.bitesAfter45, w3b50: w3.bitesAfter50,
    b1roam: b1.roamN, b1wolf: b1.wolfN, b1bites: b1.bites,
    stop: ev.stopBoots.map((s) => `${s.exitCode}/${s.exited}/${s.build}`).join(','),
    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, w3: ev.verdicts.w3, b1: ev.verdicts.b1, w4: ev.verdicts.w4,
    propsNorm: `${ev.propsNormBefore}/${ev.propsNormAfter}`,
    propsLevel: `${ev.propsLevelBefore}->${ev.propsLevelAfter}`,
    bad: bad ? 1 : 0,
  }));
  process.exitCode = bad ? 2 : 0;
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
