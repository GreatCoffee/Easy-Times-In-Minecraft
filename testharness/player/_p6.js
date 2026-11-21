// verify 补 propsNorm（主会话 2026-11-11 裁定③a）：期末/窗前各算一次，
// 去掉以 '#' 开头的时间戳注释行（1.12 保存时 Java Properties 会重写该行）。
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'f11-b31-verify.js');
let s = fs.readFileSync(p, 'utf8');
const before = s;

s = s.replace("const fs = require('fs');", "const fs = require('fs');\nconst crypto = require('crypto');");

s = s.replace("const sleep = L.sleep;", `/** props 归一化指纹：去掉 Java Properties 重写的时间戳注释行（\`#Tue Nov 10 20:56:34 CST 2026\`）。
 *  1.12 每次保存都会改写该行，原始 hash 必漂；判据只认归一化值 + level-name 还原。 */
const TS_LINE = /^#\\w{3} \\w{3} +\\d{1,2} \\d{2}:\\d{2}:\\d{2} \\w{3,4} \\d{4}$/;
function sha256(txt) { return crypto.createHash('sha256').update(txt, 'utf8').digest('hex').toUpperCase(); }
function propsNorm(file) {
  const body = fs.readFileSync(file, 'utf8').split(/\\r?\\n/).filter((l) => !TS_LINE.test(l)).join('\\n');
  return sha256(body);
}
function propsRaw(file) { return sha256(fs.readFileSync(file, 'utf8')); }
function propsLevel(file) {
  const m = /^level-name=(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : null;
}

const sleep = L.sleep;`);

s = s.replace("(async () => {\n  stampPin();", `(async () => {
  ev.propsNormBefore = propsNorm(L.PROPS);
  ev.propsRawBefore = propsRaw(L.PROPS);
  ev.propsLevelBefore = propsLevel(L.PROPS);
  stampPin();`);

s = s.replace("  stampPin();\n\n  const a1 = ev.arms.a1",
  `  ev.propsNormAfter = propsNorm(L.PROPS);
  ev.propsRawAfter = propsRaw(L.PROPS);
  ev.propsLevelAfter = propsLevel(L.PROPS);

  stampPin();

  const a1 = ev.arms.a1`);

s = s.replace("    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, w3: ev.verdicts.w3, w4: ev.verdicts.w4,",
  "    w0: ev.verdicts.w0, w1: ev.verdicts.w1, w2: ev.verdicts.w2, w3: ev.verdicts.w3, w4: ev.verdicts.w4,\n    propsNorm: `${ev.propsNormBefore}/${ev.propsNormAfter}`,\n    propsRaw: `${ev.propsRawBefore}/${ev.propsRawAfter}`,\n    propsLevel: `${ev.propsLevelBefore}->${ev.propsLevelAfter}`,");

if (s === before) throw new Error('no change');
fs.writeFileSync(p, s, 'utf8');
console.log('patched bytes=' + s.length);

// 自检：对当前 props 重算，必须等于 r12 已登记的 9903BDCD…
const chk = propsNormCheck(path.join(__dirname, '..', '..', 'run', 'server.properties'));
function propsNormCheck(file) {
  const body = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !TS_LINE.test(l)).join('\n');
  return sha256(body);
}
console.log('propsNorm(current)=' + chk);
