// RV4 · [OreLog] aggregation (verdict B1 re-derivation window)
// Reads the three judged log surfaces and derives per-ore per-chunk statistics.
// Sample split by chunk-origin X coordinate:
//   X (exploration) = 39000..42000  (rv4explore TPs: 40000/40080/40160 block positions)
//   S (spawn)       = -2000..2000   (world b1rv start-region prep, boot0)
//   OTHER           = every other origin (junk chunks created by two harness TP
//                     unit-mistakes during the cross-check; kept only as a count)
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  path.join(ROOT, 'build-logs', 'b1-rev-boot1.log'),
  path.join(ROOT, 'build-logs', 'b1-rev-boot0-killed.log'),
  path.join(ROOT, 'run', 'obfuscated-server', 'logs', 'latest.log'),
];
const RE = /\[OreLog\] ore=(\w+) chunk=\((-?\d+),(-?\d+)\) rolls=(\d+) veins=(\d+) origin-abort=(\d+) grown=(\d+)/;
const seen = new Set();
const rows = [];
const perFile = {};
for (const f of FILES) {
  let text = '';
  try { text = fs.readFileSync(f, 'utf8'); } catch (e) { perFile[path.basename(f)] = 'missing'; continue; }
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = RE.exec(line);
    if (!m) continue;
    n++;
    const key = `${m[1]}|${m[2]}|${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ore: m[1], bx: +m[2], bz: +m[3], rolls: +m[4], veins: +m[5], abort: +m[6], grown: +m[7],
    });
  }
  perFile[path.basename(f)] = n;
}
const sampleOf = (r) => (r.bx >= 39000 && r.bx <= 42000 ? 'X' : (r.bx >= -2000 && r.bx <= 2000 ? 'S' : 'OTHER'));
const stats = (arr) => {
  const n = arr.length;
  if (!n) return { n: 0 };
  const sum = arr.reduce((a, r) => a + r.grown, 0);
  const mean = sum / n;
  const variance = arr.reduce((a, r) => a + (r.grown - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);
  const veins = arr.reduce((a, r) => a + r.veins, 0);
  const abort = arr.reduce((a, r) => a + r.abort, 0);
  const zero = arr.filter((r) => r.grown === 0).length;
  return {
    n, sum, mean: +mean.toFixed(3), sd: +sd.toFixed(3), se: +se.toFixed(3),
    meanMinus2se: +(mean - 2 * se).toFixed(3), meanPlus2se: +(mean + 2 * se).toFixed(3),
    veins, veinsPerChunk: +(veins / n).toFixed(3),
    abort, abortPerChunk: +(abort / n).toFixed(3),
    abortRatePct: veins ? +((100 * abort) / veins).toFixed(2) : 0,
    zeroChunks: zero, zeroPct: +((100 * zero) / n).toFixed(1),
  };
};
const out = { files: perFile, uniqueRows: rows.length, samples: {} };
for (const s of ['X', 'S', 'OTHER']) {
  const arr = rows.filter((r) => sampleOf(r) === s);
  out.samples[s] = {};
  for (const ore of ['ore_copper', 'ore_silver', 'ore_mithril', 'ore_adamantium']) {
    out.samples[s][ore] = stats(arr.filter((r) => r.ore === ore));
  }
  out.samples[s].chunks = new Set(arr.map((r) => `${r.bx},${r.bz}`)).size;
}
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(ROOT, 'build-logs', 'b1-rev-orelog-stats.json'), JSON.stringify(out, null, 2), 'utf8');
