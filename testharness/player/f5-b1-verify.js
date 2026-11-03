'use strict';
/* B-1 修复单点回归（判窗 B-1 → 条 273）：[EtimInit] 行 15 枚 id 全打 —
 * 修复前 format 13 槽缺 1（arrow_recovery 尾值不打印）；修复后 14 槽。 */
const path = require('path');
const { startServer } = require('../server/server-console');

(async () => {
  const ROOT = path.resolve(__dirname, '..', '..');
  const srv = await startServer({ root: ROOT, tag: 'f5-b1-verify' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const strip = (l) => l.replace(/\[[0-9;]*m/g, '');
    const line = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*ids=/.test(l));
    if (!line) throw new Error('no EtimInit reg row');
    console.log('ROW: ' + line);
    const ids = line.split('ids=')[1].trim().split(/\s+/).map(Number);
    console.log('COUNT: ' + ids.length + ' ids=' + JSON.stringify(ids));
    console.log('LAST_TWO=' + ids[ids.length - 2] + ',' + ids[ids.length - 1]);
  } finally {
    await srv.stop();
  }
  process.exit(0);
})().catch((e) => { console.log('ERR', e && e.message); process.exit(1); });
