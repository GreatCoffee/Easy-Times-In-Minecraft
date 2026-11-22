// Summarize regress-b54-b67 batch outputs: [done] JSON per batch + arm lines.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', 'build-logs', 'regress-b54-b67');
const idxPath = path.join(dir, 'index.tsv');
const idx = fs.existsSync(idxPath)
  ? fs.readFileSync(idxPath, 'utf8').trim().split(/\r?\n/).slice(1)
  : [];
const timing = {};
for (const row of idx) {
  const [run, start, end, sec, exit] = row.split('\t');
  timing[run] = { start, end, sec, exit };
}

function extractDone(text) {
  const i = text.lastIndexOf('[done]');
  if (i < 0) return null;
  let j = text.indexOf('{', i);
  if (j < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = j; k < text.length; k++) {
    const ch = text[k];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return text.slice(j, k + 1); }
    }
  }
  return null;
}

const runs = [];
for (let b = 54; b <= 67; b++) runs.push('b' + b);
const rows = [];
for (const run of runs) {
  const p = path.join(dir, run + '.out');
  if (!fs.existsSync(p)) { rows.push({ run, missing: true }); continue; }
  const text = fs.readFileSync(p, 'utf8');
  const doneRaw = extractDone(text);
  let done = null;
  try { done = doneRaw ? JSON.parse(doneRaw) : null; } catch (e) { done = { parseError: String(e) }; }
  const arms = text.split(/\r?\n/).filter(l => /^\[(W|A|B|C)[0-9a-zA-Z_-]*\]/.test(l.trim())).map(l => l.trim().slice(0, 300));
  rows.push({ run, bytes: fs.statSync(p).size, exit: (timing[run] || {}).exit, sec: (timing[run] || {}).sec, done, arms });
}
console.log(JSON.stringify({ timing, rows }, null, 1));
