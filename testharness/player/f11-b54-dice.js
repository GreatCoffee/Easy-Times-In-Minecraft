// B-54 dice corroboration: the horse 0.8 / wolf 0.5 group rolls over several
// independent seed bases (the smoke run's single 4000-pass sample came out at
// 0.667 on 81 draws, which is ~3 sigma low at p=0.8 — verify with fresh seeds).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');

const A = 'ETIM_F7';
const WORLD = 'w-b54-dice';
let srv = null, bot = null, propsBefore = null, cfgBefore = null;

const BATCH_RE = /\[WorldGenSpawnLog\] batch at \((?<x>-?\d+),(?<z>-?\d+)\) biome=(?<biome>\S+) repeat=(?<repeat>\d+) creature=(?<creature>\d+) aquatic=(?<aquatic>\d+) groups=(?<groups>\d+) horsePick=(?<hp>\d+) horseReject=(?<hr>\d+) wolfPick=(?<wp>\d+) wolfReject=(?<wr>\d+) landReject=(?<lr>\d+) capReject=(?<cr>\d+) headroom=(?<hd>\d+) aquaticSeeds=(?<as>\d+) cg=(?<cg>\d+) ag=(?<ag>\d+)/;

function logLines() {
  try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; }
}

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 300 : wait); }

async function main() {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobWorldGenSpawnR196\s*=\s*(true|false)/, 'B:mobWorldGenSpawnR196=true')
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true'), 'utf8');
  srv = await L.startServer({ root: L.ROOT, tag: 'b54dice' });
  if (!(await srv.waitFor(/Done \(/, 180000))) throw new Error('no Done(');
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  await cmd('gamerule doMobSpawning false', 200);
  await cmd('difficulty 0', 200);
  await cmd('tp ' + A + ' 0.5 120 0.5', 400);
  await cmd('kill @e[type=!player]', 500);

  // plains at (256,0) carries the horse row, mutated forest at (0,512) the wolf row
  const targets = [
    { x: 256, z: 0, label: 'plains-horse' },
    { x: 0, z: 512, label: 'forest-wolf' },
  ];
  const out = [];
  for (const t of targets) {
    for (const base of [12001, 22001, 32001, 42001]) {
      await cmd(`etest wgstate ${t.x} ${t.z} 0`, 300);
      const from = logLines().length;
      await cmd(`etest wgspawn ${t.x} ${t.z} ${base} 5000`, 1200);
      let m = null;
      for (let w = 0; w < 120 && !m; w++) {
        await sleep(500);
        m = logLines().slice(from).map(s => BATCH_RE.exec(s)).filter(Boolean).pop() || null;
      }
      if (!m) { out.push({ target: t.label, base, missing: true }); continue; }
      const g = m.groups;
      out.push({
        target: t.label, base, groups: +g.groups, cg: +g.cg, ag: +g.ag,
        horse: { draws: +g.hp, rejects: +g.hr },
        wolf: { draws: +g.wp, rejects: +g.wr },
      });
      console.log('[dice]', JSON.stringify(out[out.length - 1]));
    }
  }

  const sum = { hp: 0, hr: 0, wp: 0, wr: 0 };
  for (const o of out) {
    if (o.missing) continue;
    sum.hp += o.horse.draws; sum.hr += o.horse.rejects;
    sum.wp += o.wolf.draws; sum.wr += o.wolf.rejects;
  }
  console.log('[total]', JSON.stringify({
    ...sum,
    horseRejectRate: sum.hp ? +(sum.hr / sum.hp).toFixed(4) : null,
    wolfRejectRate: sum.wp ? +(sum.wr / sum.wp).toFixed(4) : null,
  }));

  try { bot.quit(); bot = null; await sleep(1200); } catch (e) { /* noop */ }
  const st = await srv.stop();
  console.log('[stop]', JSON.stringify(st));
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  process.exit(0);
}

main().catch(async e => {
  console.error('[fatal]', e && e.stack || e);
  try { if (bot) bot.quit(); } catch (x) { /* noop */ }
  try { if (srv) await srv.stop(); } catch (x) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (x) { /* noop */ }
  process.exit(2);
});
