// Fill @@BYTES@@ / @@LINES@@ in the B-47 verdict report until stable.
const fs = require('fs');
const p = 'testharness/reports/b47-verify-verdict.md';
const TOK_B = '@@BYTES@@';
const TOK_L = '@@LINES@@';

let text = fs.readFileSync(p, 'utf8');
// iterate: substitute with current best estimate until fixed point
let bytes = 0, lines = 0;
for (let i = 0; i < 6; i++) {
  const trial = text
    .split(TOK_B).join(String(bytes))
    .split(TOK_L).join(String(lines));
  const nb = Buffer.byteLength(trial, 'utf8');
  const nl = trial.split('\n').length - (trial.endsWith('\n') ? 1 : 0);
  if (nb === bytes && nl === lines) {
    fs.writeFileSync(p, trial, 'utf8');
    console.log(`[ok] bytes=${nb} lines=${nl}`);
    process.exit(0);
  }
  bytes = nb; lines = nl;
}
console.log('[warn] did not converge');
