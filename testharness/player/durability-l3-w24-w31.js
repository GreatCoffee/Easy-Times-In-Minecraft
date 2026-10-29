#!/usr/bin/env node
/**
 * durability-l3-w24-w31.js — 耐久附魔统一批 W-24…W-31（L3 判点窗）
 *
 * 判据正本：ETIM-Extra\playground\audit\耐久附魔批-终审回执.md §四「判点窗终点表
 * （finalize）」；判定 = N 击 Δdur 聚落「现行（vanilla L3 0.75 否定率）」窗，
 * 且与「R196 面（0.45 否定率）」窗无交集。
 *
 * 判什么：
 *   · 每腿先打 1 击 L0 对照（不计入窗）：wear= 必须等于 W-16 单击值
 *     （10/9/16/3/7/5/4；铜剑 200），防附骰面/乘子面偏置；
 *   · 然后 N 击 8 伤，Σ(每击 dur 增量) 落现行窗 = 通过；
 *   · 每行还判：item / spectral / raw=8.000 / shield= / rate= / mult= / decay=；
 *   · 附魔态双证：/enchant（主手或 NBT offhand）+ 假人 NBT 回读。
 *
 * 通道分工：服务端 = runServer + 控制台 stdin（本工作区 RCON 在 GradleStart 链下
 * 不可用，见 testharness/server/README.md）；受击 = /etimghost hurt <p> 8 <t|f>；
 * 举盾/举剑 = /etest useitem（主手）或 mineflayer activateItem(true)（W-27 副手）。
 *
 * i-frame：vanilla hurtResistantTime=20，>10 时等量伤害被丢弃 ⇒ 每击间隔 ≥0.85s。
 *
 * 用法：node durability-l3-w24-w31.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'durability-l3-w24-w31';
const BOTNAME = process.env.DUR_BOT || 'ETIM_Harn24';
const PORT = 25565;
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const ETIMCFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const OUTDIR = path.join(ROOT, 'testharness', 'build-logs');
const EXTRA_SRC = 'D:\\OpenCodeWorkspace\\ETIM-Extra\\build\\libs\\etimextra-0.1.0.jar';
const EXTRA_DEST = path.join(ROOT, 'run', 'mods', 'etimextra-0.1.0.jar');
const EXTRA_CFG = path.join(ROOT, 'run', 'config', 'etimextra.cfg');
const ETIM_JAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');

const EXTRA_PIN = { bytes: 31614, sha: '2D42D78AE475E2261C9071B980322570EC7003FC86961771CF32D8374C847A98' };
const ETIM_PIN = { bytes: 750801, sha: '7998673BB60B7ADDA332709F947426CCC665FEE46D25B42860BC4C61C7E63BA7' };

/** 调试口：DUR_ONLY=<leg|W#> 只跑指定腿；DUR_N=<n> 覆盖击数（仅冒烟，正式窗不设）。 */
const ONLY = (process.env.DUR_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const N_OVERRIDE = process.env.DUR_N ? parseInt(process.env.DUR_N, 10) : 0;

/** 八腿（§四终点表；w=8 伤单击名义磨损、N、现行窗、R196 对照窗）。 */
const LEGS = [
  { w: 'W-24', leg: 'wood',            item: 'minecraft:shield',              spectral: false, N: 50,
    wear8: 10,  rate: 2.5,  mult: 1.0, shield: true, window: [95, 155],   r196: [241, 309],   maxDamage: 336 },
  { w: 'W-25', leg: 'copper',          item: 'etimextra:copper_shield',       spectral: false, N: 100,
    wear8: 9,   rate: 2.5,  mult: 1.0, shield: true, window: [186, 264],  r196: [450, 540],   maxDamage: 1600 },
  { w: 'W-26', leg: 'silver-phys',     item: 'etimextra:silver_shield',       spectral: false, N: 100,
    wear8: 16,  rate: 3.5,  mult: 1.4, shield: true, window: [348, 452],  r196: [820, 940],   maxDamage: 1600 },
  { w: 'W-27', leg: 'silver-spectral', item: 'etimextra:silver_shield',       spectral: true,  N: 100,
    wear8: 3,   rate: 1.25, mult: 0.5, shield: true, window: [52, 98],    r196: [139, 191],   maxDamage: 1600, offhand: true },
  { w: 'W-28', leg: 'ancient',         item: 'etimextra:ancient_metal_shield', spectral: false, N: 100,
    wear8: 7,   rate: 2.5,  mult: 1.0, shield: true, window: [140, 210],  r196: [345, 425],   maxDamage: 3200 },
  { w: 'W-29', leg: 'mithril',         item: 'etimextra:mithril_shield',       spectral: false, N: 100,
    wear8: 5,   rate: 2.5,  mult: 1.0, shield: true, window: [95, 155],   r196: [241, 309],   maxDamage: 6400 },
  { w: 'W-30', leg: 'adamantium',      item: 'etimextra:adamantium_shield',    spectral: false, N: 100,
    wear8: 4,   rate: 2.5,  mult: 1.0, shield: true, window: [74, 126],   r196: [190, 250],   maxDamage: 12800 },
  { w: 'W-31', leg: 'copper-sword',    item: 'etim:sword_copper',             spectral: false, N: 10,
    wear8: 200, tool: true, decay: 50, window: [441, 559], r196: [1033, 1167], maxDamage: 3200 },
];

const RE = {
  block: /\[BlockLog\] block player=(\S+) src=(\S+) raw=([-\d.]+) blocked=([-\d.]+) factor=([-\d.]+) spectral=(true|false) min=([-\d.]+) carrier=(\S+)/,
  wear: /\[BlockLog\] wear player=(\S+) item=(\S+) shield=(true|false) rate=(\S+) mult=(\S+) decay=(\S+) raw=([-\d.]+) blocked=([-\d.]+) wear=(\d+) dur=(\d+)->(\d+)/,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const near = (a, b) => Math.abs(a - b) < 0.0005;

const readLog = () => { try { return fs.readFileSync(RUNLOG, 'utf8'); } catch (e) { return ''; } };

/** 窗内把 `B:blockDebugLog` 置 true（本工作区 cfg 无该键 → 纯字节插入，BOM/CRLF 不动）。 */
function enableBlockLog() {
  const before = fs.readFileSync(ETIMCFG);
  const text = before.toString('utf8');
  if (/B:blockDebugLog/.test(text)) {
    throw new Error('etim.cfg already has B:blockDebugLog — refuse to guess the pre-window bytes');
  }
  if (!/B:devTools=true/.test(text)) {
    throw new Error('etim.cfg devTools is not true — /etest and /etimghost would be unregistered');
  }
  const copy = path.join(OUTDIR, TAG + '-etim.cfg.before');
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(copy, before);
  const anchor = Buffer.from('combat {');
  const i = before.indexOf(anchor);
  if (i < 0) throw new Error('no "combat {" category in etim.cfg');
  const nl = before.indexOf(Buffer.from('\r\n'), i);
  if (nl < 0) throw new Error('no CRLF after "combat {"');
  const line = Buffer.from('    B:blockDebugLog=true\r\n');
  const after = Buffer.concat([before.slice(0, nl + 2), line, before.slice(nl + 2)]);
  fs.writeFileSync(ETIMCFG, after);
  log('config', 'blockDebugLog=true (byte copy -> ' + copy + ')');
  return { copy, shaBefore: sha256(before), bytesBefore: before.length, bytesAfter: after.length };
}

function restoreBlockLog(saved) {
  fs.writeFileSync(ETIMCFG, fs.readFileSync(saved.copy));
  const buf = fs.readFileSync(ETIMCFG);
  const sha = sha256(buf);
  const ok = sha === saved.shaBefore && buf.length === saved.bytesBefore;
  log('config', 'restored: ' + sha + (ok ? ' (byte-identical)' : ' MISMATCH'));
  return { sha, bytes: buf.length, identical: ok };
}

/** 附魔态回读：prismarine-nbt 的 ench 列表里 id=34 / lvl=3。
 * 注意：mod 物品 id 不在 minecraft-data 里 → slot.name 可能是 undefined，
 * 故只按 NBT 认，不按 name 认。 */
function hasUnbreaking3(stack) {
  if (!stack || !stack.nbt) return false;
  const json = JSON.stringify(stack.nbt);
  return /"id":\{[^}]*"value":34[,}]/.test(json) && /"lvl":\{[^}]*"value":3[,}]/.test(json);
}

function findEnchanted(bot, itemName) {
  if (hasUnbreaking3(bot.heldItem)) return { where: 'mainhand', stack: bot.heldItem };
  const slots = bot.inventory && bot.inventory.slots ? bot.inventory.slots : [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s && hasUnbreaking3(s)) return { where: 'slot' + i, stack: s };
  }
  return null;
}

/** 一次 hurt 的 block/wear 两行（wear 先打，block 紧随）。 */
function blockNear(lines, wearIdx) {
  for (const k of [wearIdx + 1, wearIdx - 1]) {
    if (k < 0 || k >= lines.length) continue;
    const m = RE.block.exec(lines[k]);
    if (m) return { line: lines[k], src: m[2], raw: +m[3], blocked: +m[4], factor: +m[5], spectral: m[6] === 'true', carrier: m[8] };
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true });

  // ---- 钉值（起窗前） ----
  const etimJar = fs.readFileSync(ETIM_JAR);
  const extraJar = fs.readFileSync(EXTRA_SRC);
  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep '-' */ }
  const pins = {
    head,
    etimJar: { bytes: etimJar.length, sha: sha256(etimJar), match: etimJar.length === ETIM_PIN.bytes && sha256(etimJar) === ETIM_PIN.sha },
    extraJar: { bytes: extraJar.length, sha: sha256(extraJar), match: extraJar.length === EXTRA_PIN.bytes && sha256(extraJar) === EXTRA_PIN.sha },
  };
  log('pin', 'HEAD=' + head + ' etim=' + pins.etimJar.bytes + '/' + pins.etimJar.sha + (pins.etimJar.match ? ' OK' : ' MISMATCH'));
  log('pin', 'extra=' + pins.extraJar.bytes + '/' + pins.extraJar.sha + (pins.extraJar.match ? ' OK' : ' MISMATCH'));
  if (!pins.extraJar.match) throw new Error('extra jar pin mismatch — refuse to run');
  if (!pins.etimJar.match) throw new Error('etim dev jar pin mismatch — refuse to run');

  const extraCfgExisted = fs.existsSync(EXTRA_CFG);
  fs.copyFileSync(EXTRA_SRC, EXTRA_DEST);
  log('mods', 'etimextra -> ' + EXTRA_DEST + ' (' + fs.statSync(EXTRA_DEST).size + ' B)');

  const saved = enableBlockLog();
  const srv = await startServer({ root: ROOT, tag: TAG });
  const ev = {
    tag: TAG, bot: BOTNAME, startedAt: new Date().toISOString(),
    pins, workspace: ROOT, cfgBeforeSha: saved.shaBefore, cfgBytesBefore: saved.bytesBefore,
    cfgBytesAfterEdit: saved.bytesAfter, modsInstalled: EXTRA_DEST, legs: [],
  };

  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached "Done (" within 300s');
    log('server', 'READY:', done.trim());
    ev.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    ev.extraLoaded = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 12);
    ev.extraBoot = srv.all.find((l) => /\[ExtraLog\]|ETIM-Extra/i.test(l)) || null;

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOTNAME });
    await sleep(1500);

    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('difficulty 0');
    srv.send('time set 18000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send('gamemode 0 ' + BOTNAME);
    await sleep(1500);

    for (const legRaw of LEGS) {
      if (ONLY.length && !ONLY.includes(legRaw.leg) && !ONLY.includes(legRaw.w)) continue;
      const leg = N_OVERRIDE > 0 ? Object.assign({}, legRaw, { N: N_OVERRIDE }) : legRaw;
      const out = {
        w: leg.w, leg: leg.leg, item: leg.item, spectral: leg.spectral, N: leg.N,
        window: leg.window, r196: leg.r196, offhand: !!leg.offhand, tool: !!leg.tool,
      };
      const tLeg = Date.now();
      log(leg.w, leg.leg, 'start');

      srv.send('say [' + leg.w + '] ' + leg.leg + ' start');
      srv.send('etest release ' + BOTNAME);
      srv.send('clear ' + BOTNAME);
      await sleep(400);

      // ---- 注入口 ----
      if (leg.offhand) {
        srv.send('replaceitem entity ' + BOTNAME + ' slot.weapon.offhand ' + leg.item
          + ' 1 0 {ench:[{id:34,lvl:3}]}');
      } else {
        srv.send('etest hold ' + leg.item + ' ' + BOTNAME);
        await sleep(450);
        srv.send('enchant ' + BOTNAME + ' unbreaking 3');
      }
      await sleep(700);

      let ench = null;
      for (let i = 0; i < 15 && !ench; i++) {
        ench = findEnchanted(bot, leg.item);
        if (!ench) await sleep(200);
      }
      out.ench = ench ? { where: ench.where, ok: true, nbt: JSON.stringify(ench.stack.nbt).slice(0, 400) } : { where: 'missing', ok: false };
      log(leg.w, 'ench', out.ench.where);

      // ---- 进入格挡态 ----
      if (leg.offhand) {
        bot.activateItem(true);
      } else {
        srv.send('etest useitem ' + BOTNAME);
      }
      await sleep(450);

      // ---- 单次 hit（含 i-frame 节流与吞击重试） ----
      const wearRe = new RegExp('\\[BlockLog\\] wear player=\\S+ item=' + escapeRe(leg.item)
        + ' shield=(true|false) rate=\\S+ mult=\\S+ decay=\\S+ raw=8\\.000 ');
      const hurt = async () => {
        const t0 = Date.now();
        srv.send('etest health 6 ' + BOTNAME);
        await sleep(120);
        let rec = null;
        for (let attempt = 0; attempt < 3 && !rec; attempt++) {
          if (attempt > 0) { log(leg.w, 'retry hit', attempt + 1); await sleep(900); }
          const from = srv.all.length;
          srv.send('etimghost hurt ' + BOTNAME + ' 8 ' + (leg.spectral ? 'true' : 'false'));
          const line = await srv.waitFor(wearRe, 6000, from);
          if (!line) continue;
          const m = RE.wear.exec(line);
          // block 行由同一线程紧接 wear 行写出，但控制台 tee 可能分块到达 ⇒
          // 等它落进 all 再取邻行（attempt1 的 C 级根因，2026-10-29）。
          let blk = null;
          for (let k = 0; k < 8 && !blk; k++) {
            blk = blockNear(srv.all, srv.all.lastIndexOf(line));
            if (!blk) await sleep(120);
          }
          rec = {
            line, wear: +m[9], durBefore: +m[10], durAfter: +m[11],
            shield: m[3] === 'true', rate: m[4], mult: m[5], decay: m[6],
            raw: +m[7], blocked: +m[8], item: m[2],
            block: blk,
          };
        }
        await sleep(Math.max(0, 850 - (Date.now() - t0)));
        return rec;
      };

      // ---- L0 对照（不计入窗） ----
      const l0 = await hurt();
      out.l0 = l0 ? { line: l0.line, wear: l0.wear, durBefore: l0.durBefore, durAfter: l0.durAfter, rate: l0.rate, mult: l0.mult, decay: l0.decay, block: l0.block ? l0.block.line : null } : null;
      log(leg.w, 'L0', l0 ? ('wear=' + l0.wear + ' dur=' + l0.durBefore + '->' + l0.durAfter) : 'MISSING');

      // ---- N 击（正式判点） ----
      const hits = [];
      for (let i = 0; i < leg.N; i++) {
        const rec = await hurt();
        if (!rec) { log(leg.w, 'hit', i + 1, 'MISSING'); continue; }
        hits.push(rec);
        if ((i + 1) % 10 === 0 || i === leg.N - 1) {
          log(leg.w, 'hit', (i + 1) + '/' + leg.N, 'dur=' + hits[0].durBefore + '->' + rec.durAfter);
        }
      }

      const startDur = hits.length ? hits[0].durBefore : (l0 ? l0.durAfter : -1);
      const endDur = hits.length ? hits[hits.length - 1].durAfter : -1;
      const sum = hits.reduce((s, h) => s + (h.durAfter - h.durBefore), 0);
      const monotonic = hits.every((h, i) => h.durAfter >= h.durBefore && (i === 0 || h.durBefore === hits[i - 1].durAfter));
      const wearSet = [...new Set(hits.map((h) => h.wear))];
      const rateSet = [...new Set(hits.map((h) => h.rate))];
      const multSet = [...new Set(hits.map((h) => h.mult))];
      const decaySet = [...new Set(hits.map((h) => h.decay))];
      const factorSet = [...new Set(hits.filter((h) => h.block).map((h) => +h.block.factor))];
      const lastBlock = hits.length ? hits[hits.length - 1].block : null;

      const checks = {
        enchVerified: out.ench.ok,
        l0Present: !!l0,
        l0Wear: !!l0 && l0.wear === leg.wear8,
        hitsComplete: hits.length === leg.N,
        wearAllNominal: wearSet.length === 1 && wearSet[0] === leg.wear8,
        raw8: hits.every((h) => near(h.raw, 8)),
        itemAll: hits.every((h) => h.item === leg.item),
        spectralAll: hits.every((h) => !!h.block && h.block.spectral === leg.spectral),
        shieldFlag: hits.every((h) => h.shield === !!leg.shield),
        rateAll: leg.shield ? (rateSet.length === 1 && near(+rateSet[0], leg.rate)) : (rateSet[0] === 'na'),
        multAll: leg.shield ? (multSet.length === 1 && near(+multSet[0], leg.mult)) : (multSet[0] === 'na'),
        decayAll: leg.shield ? (decaySet[0] === 'na') : (decaySet[0] === String(leg.decay)),
        carrierAll: !lastBlock || lastBlock.carrier === leg.item,
        durMonotonic: monotonic,
        noBreak: endDur >= 0 && endDur < leg.maxDamage,
        inWindow: sum >= leg.window[0] && sum <= leg.window[1],
        disjointR196: sum < leg.r196[0] || sum > leg.r196[1],
      };
      out.startDur = startDur;
      out.endDur = endDur;
      out.sum = sum;
      out.elapsedMs = Date.now() - tLeg;
      out.wearSet = wearSet;
      out.rateSet = rateSet;
      out.multSet = multSet;
      out.decaySet = decaySet;
      out.factorSet = factorSet;
      out.hitCount = hits.length;
      out.firstHit = hits.length ? hits[0].line : null;
      out.lastHit = hits.length ? hits[hits.length - 1].line : null;
      out.lastBlockLine = lastBlock ? lastBlock.line : null;
      out.checks = checks;
      out.pass = Object.values(checks).every(Boolean);
      log(leg.w, out.pass ? 'PASS' : 'FAIL',
        'sum=' + sum + ' window=' + leg.window[0] + '-' + leg.window[1]
        + ' r196=' + leg.r196[0] + '-' + leg.r196[1]
        + ' ' + Object.entries(checks).map(([k, v]) => k + '=' + v).join(' '));
      ev.legs.push(out);

      srv.send('etest release ' + BOTNAME);
      await sleep(250);
    }
  } catch (e) {
    ev.fatal = e && e.stack ? e.stack : String(e);
    log('FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    ev.jarTask = srv.all.filter((l) => /^> Task :(compileJava|jar|classes)\b/.test(l));
    ev.cfgAfter = restoreBlockLog(saved);
    try { fs.unlinkSync(EXTRA_DEST); log('mods', 'etimextra removed from run/mods'); } catch (e) { /* ignore */ }
    if (!extraCfgExisted) { try { fs.unlinkSync(EXTRA_CFG); ev.extraCfgRemoved = true; } catch (e) { ev.extraCfgRemoved = false; } }
    // 服务端日志快照（收口判据源）
    try {
      fs.copyFileSync(RUNLOG, path.join(OUTDIR, TAG + '-server-latest.log'));
    } catch (e) { ev.logSnapshot = String(e && e.message); }
    const expectedLegs = LEGS.filter((l) => !ONLY.length || ONLY.includes(l.leg) || ONLY.includes(l.w)).length;
    ev.verdict = ev.legs.length === expectedLegs && ev.legs.every((l) => l.pass)
      && ev.cfgAfter.identical && !ev.fatal ? 'PASS' : 'FAIL';
    const file = path.join(OUTDIR, TAG + '-evidence.json');
    fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log('evidence', file);
    log('VERDICT', ev.verdict);
    process.exit(ev.verdict === 'PASS' ? 0 : 1);
  }
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
