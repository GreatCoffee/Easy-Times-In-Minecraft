const crypto = require('crypto');
function offlineUuid(name) {
  const h = crypto.createHash('md5').update(Buffer.from('OfflinePlayer:' + name, 'utf8')).digest();
  h[6] = (h[6] & 0x0f) | 0x30;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString('hex');
  return hex.slice(0,8) + '-' + hex.slice(8,12) + '-' + hex.slice(12,16) + '-' + hex.slice(16,20) + '-' + hex.slice(20);
}
for (const n of ['ETIM_Harn01', 'ETIM_Harn03', 'ETIM_Harn07']) console.log(n + '=' + offlineUuid(n));