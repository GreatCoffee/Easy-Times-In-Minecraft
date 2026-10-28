/**
 * ad7e-probe.js — 批 E / AD-7 静态面驱动（会话七自研工装）
 *
 * 覆盖 W1（注册行）、W2（七类载体门）、W3（windows/table 封顶）、
 * W9 的 probe 部分（melee/arrow/thrown 载体解析）、W11（注入回执 + 同 id 单条）。
 *
 * 通道：/etest enchantprobe（[EnchantLog]，命令触发才打）+ [EtimInit]/[EtimTest]。
 * 命令面：RCON（run/ad7e = binpatch 链，RCON 实测可用）；bot 只作目标玩家（getPlayer 需在线）。
 *
 * 用法：node ad7e-probe.js w1|w2|w3|w9probe|w11|all
 */
'use strict';
const fs = require('fs');
const L = require('./ad7e-lib');
const { createHarnBot } = require('./fmlbot');
const { readMainhand } = require('./ad7e-nbt');

const ATK = process.env.AD7E_ATK || 'ETIM_Harn01';
const phases = process.argv.slice(2);
const run = (p) => phases.includes('all') || phases.includes(p);
if (phases.length === 0) { console.error('usage: node ad7e-probe.js w1|w2|w3|w9probe|w11|all'); process.exit(2); }

const say = L.say;
const rep = {};

/** 把主手换成某件物品（清 NBT）。 */
const hold = (item) => L.rcon(`replaceitem entity ${ATK} slot.weapon.mainhand ${item} 1`);

/** 发一次 enchantprobe，回读该命令窗口内的全部 [EnchantLog] 行。 */
async function probe(src) {
  const off = L.logOffset();
  await L.rcon(`etest enchantprobe mainhand ${src} ${ATK}`);
  await L.sleep(250);
  const text = L.logSince(off);
  return {
    text,
    probeRows: L.parseProbe(text),
    windows: L.parseWindows(text),
    table: L.parseTable(text),
    carrierRows: L.parseCarrier(text),
    lines: text.split('\n').filter((l) => /\[EnchantLog\]/.test(l)).map((l) => l.trim()),
  };
}

(async () => {
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: ATK });
  for (let i = 0; i < 40 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(1500);
  say('bot up:', ATK, bot.entity && bot.entity.position.toString());

  // ---------------- W1 ----------------
  if (run('w1')) {
    const text = L.logAll();
    const rows = text.split('\n').filter((l) => /\[EtimInit\] enchant /.test(l)).map((l) => l.trim());
    const idOf = (name) => {
      const m = new RegExp('\\[EtimInit\\] enchant ' + name + ' id=(\\d+)').exec(text);
      return m ? +m[1] : null;
    };
    const pId = idOf('etim:piercing');
    const eId = idOf('etim:endurance');
    rep.w1 = {
      rows: rows.slice(-6),
      piercingId: pId,
      enduranceId: eId,
      distinct: pId !== null && eId !== null && pId !== eId,
      ok: pId !== null && pId !== 12 && pId !== eId,
    };
    L.saveReport(rep);
    say('W1 piercingId=' + pId + ' enduranceId=' + eId + ' → ' + (rep.w1.ok ? 'PASS' : 'FAIL'));
  }

  // ---------------- W2 ----------------
  const EXPECT = {
    'etim:pickaxe_copper': true,
    'etim:battle_axe_copper': true,
    'minecraft:iron_pickaxe': true,
    'etim:war_hammer_copper': false,
    'etim:axe_copper': false,
    'etim:shovel_copper': false,
    'etim:sword_copper': false,
  };
  if (run('w2')) {
    const out = {};
    for (const item of Object.keys(EXPECT)) {
      await hold(item);
      await L.sleep(120);
      const p = await probe('melee');
      const row = p.probeRows.find((r) => r.item === item) || p.probeRows[0] || null;
      out[item] = {
        expected: EXPECT[item],
        observed: row ? row.canApply : null,
        itemSeen: row ? row.item : null,
        maxLevel: row ? row.maxLevel : null,
        line: row ? row.line : null,
        ok: !!row && row.canApply === EXPECT[item] && row.item === item,
      };
      say('   W2 ' + item + ' canApply=' + (row ? row.canApply : 'n/a') + ' 期望=' + EXPECT[item] + (out[item].ok ? ' ✓' : ' ✗'));
    }
    rep.w2 = { rows: out, ok: Object.values(out).every((x) => x.ok) };
    L.saveReport(rep);
    say('W2 ' + (rep.w2.ok ? 'PASS' : 'FAIL'));
  }

  // ---------------- W3 ----------------
  if (run('w3')) {
    await hold('etim:pickaxe_copper');
    await L.sleep(120);
    const p = await probe('melee');
    const win = p.windows;
    const tab = p.table;
    const winOk = win === 'L1=1/21 L2=7/27 L3=13/33 L4=19/39 L5=25/45';
    const tableOk = !!tab
      && tab.power === 15 && tab.power30 === 30
      && tab.slot2 === 30 && tab.slot2b === 30
      && tab.slot0 >= 2 && tab.slot0 <= 10
      && tab.slot1 >= 6 && tab.slot1 <= 21
      && tab.slot0b >= 2 && tab.slot0b <= 10
      && tab.slot1b >= 6 && tab.slot1b <= 21;
    rep.w3 = { windows: win, winOk, table: tab, tableOk, lines: p.lines, ok: winOk && tableOk };
    L.saveReport(rep);
    say('W3 windows=' + win + ' → ' + (winOk ? '✓' : '✗'));
    say('W3 table=' + (tab ? tab.line : 'n/a') + ' → ' + (tableOk ? '✓' : '✗'));
  }

  // ---------------- W9 probe ----------------
  if (run('w9probe')) {
    await hold('etim:pickaxe_copper');
    await L.rcon(`etest enchant mainhand 3 piercing ${ATK}`);
    await L.sleep(200);
    const rows = {};
    const first = {};
    for (const src of ['melee', 'arrow', 'thrown']) {
      const p = await probe(src);
      rows[src] = p.carrierRows.find((r) => r.src === src) || p.carrierRows[0] || null;
      if (src === 'melee') {
        first.probe = p.probeRows[0] || null;
        first.windows = p.windows;
        first.table = p.table;
      }
      say('   W9 probe ' + src + ' → ' + (rows[src] ? rows[src].line : 'n/a'));
    }
    const ok = rows.melee && rows.melee.immediate === 'EntityPlayerMP' && rows.melee.carrier === 'etim:pickaxe_copper'
      && Math.abs(rows.melee.pts - 3.0) < 1e-6 && rows.melee.level === 3
      && rows.arrow && rows.arrow.immediate === 'EntityTippedArrow' && rows.arrow.carrier === 'none' && Math.abs(rows.arrow.pts) < 1e-9
      && rows.thrown && rows.thrown.immediate === 'EntitySnowball' && rows.thrown.carrier === 'none' && Math.abs(rows.thrown.pts) < 1e-9;
    rep.w9probe = { rows, first, ok: !!ok };
    L.saveReport(rep);
    say('W9 probe ' + (ok ? 'PASS' : 'FAIL'));
  }

  // ---------------- W10① probe（points=0 窗） ----------------
  if (run('w10probe')) {
    await hold('etim:pickaxe_copper');
    await L.rcon(`etest enchant mainhand 3 piercing ${ATK}`);
    await L.sleep(200);
    const p = await probe('melee');
    const probeRow = p.probeRows[0] || null;
    const carrier = p.carrierRows.find((r) => r.src === 'melee') || null;
    const ok = !!probeRow && probeRow.canApply === true && probeRow.maxLevel === 5
      && p.windows === 'L1=1/21 L2=7/27 L3=13/33 L4=19/39 L5=25/45'
      && !!carrier && carrier.level === 3 && Math.abs(carrier.pts) < 1e-9;
    rep.w10_probe = { probe: probeRow, windows: p.windows, table: p.table, carrier, ok };
    L.saveReport(rep);
    say('W10① probe canApply=' + (probeRow ? probeRow.canApply : 'n/a')
      + ' windows=' + p.windows + ' carrier pts=' + (carrier ? L.f3(carrier.pts) : 'n/a')
      + ' → ' + (ok ? 'PASS' : 'FAIL'));
  }

  // ---------------- W11 ----------------
  if (run('w11')) {
    await hold('etim:pickaxe_copper');
    await L.sleep(120);
    const off = L.logOffset();
    await L.rcon(`etest enchant mainhand 3 piercing ${ATK}`);
    await L.sleep(250);
    await L.rcon(`etest enchant mainhand 3 piercing ${ATK}`);
    await L.sleep(350);
    const text = L.logSince(off);
    const receipts = text.split('\n').filter((l) => /\[EtimTest\].*enchant_set/.test(l)).map((l) => l.trim());
    const p = await probe('melee');
    const carrier = p.carrierRows.find((r) => r.src === 'melee') || null;
    await L.rcon('save-all');
    await L.sleep(1500);
    let nbt = null;
    let nbtErr = null;
    try { nbt = readMainhand(ATK); } catch (e) { nbtErr = e.message; }
    const ench13 = nbt && nbt.mainhand ? nbt.mainhand.ench.filter((e) => e.id === 13) : [];
    const ok = receipts.length === 2 && !!carrier && carrier.level === 3 && Math.abs(carrier.pts - 3.0) < 1e-6
      && !!nbt && ench13.length === 1 && ench13[0].lvl === 3;
    rep.w11 = { receipts, carrier, nbt, nbtErr, ench13Count: ench13.length, ok };
    L.saveReport(rep);
    say('W11 receipts=' + receipts.length + ' carrierLevel=' + (carrier ? carrier.level : 'n/a')
      + ' NBT ench13=' + JSON.stringify(ench13) + ' → ' + (ok ? 'PASS' : 'FAIL'));
  }

  bot.quit();
  await L.sleep(600);
  say('probe done');
  process.exit(0);
})().catch((e) => { console.error('PROBE ERR:', e.stack || e.message); process.exit(1); });
