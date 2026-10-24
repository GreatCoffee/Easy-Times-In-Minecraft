/**
 * rcon-client.js — RCON 客户端（会话七 harness 版）
 *
 * 修正 rcon.py（server/）的一个判型 bug：vanilla 1.12.2 的 auth 应答包
 * type=**2**（实测应答字节 `id=1 type=2 body=""`，rcon.py 期待 type==3
 * 死等 10s 超时）。本件以「应答即可信（id≠-1 即成功）」判型。
 *
 * 用法：
 *   & node rcon-client.js "list"        # 与 rcon.py 等价
 *   & node rcon-client.js "op ETIM_Harn04"
 * 默认 127.0.0.1:25575 密码 etim27（与 run/obfuscated/server.properties 一致）
 */
'use strict';
const net = require('net');

const HOST = process.argv[2] || '127.0.0.1';
const PORT = 25575;
const PASS = process.argv[4] || 'etim27';
const CMD = process.argv[5];

if (!CMD) { console.error('usage: node rcon-client.js [host] [port] [pass] "command"'); process.exit(2); }

function packet(id, type, body) {
  const payload = Buffer.alloc(10 + body.length);
  payload.writeInt32LE(id, 0);
  payload.writeInt32LE(type, 4);
  Buffer.from(body, 'utf8').copy(payload, 8);
  payload.writeUInt8(0, 8 + body.length);
  payload.writeUInt8(0, 9 + body.length);
  const out = Buffer.alloc(4 + payload.length);
  out.writeInt32LE(payload.length, 0);
  payload.copy(out, 4);
  return out;
}

function readPacket(sock) {
  return new Promise((resolve, reject) => {
    const pending = [];
    sock.on('data', (d) => pending.push(d));
    sock.on('error', reject);
    const timer = setTimeout(() => reject(new Error('recv timeout 10s')), 10000);
    (function drain() {
      if (pending.length === 0) return setTimeout(drain, 50);
      const buf = Buffer.concat(pending);
      if (buf.length < 4) return;
      const size = buf.readInt32LE(0);
      if (buf.length < size + 4) return setTimeout(drain, 50);
      clearTimeout(timer);
      const id = buf.readInt32LE(4), type = buf.readInt32LE(8);
      const body = buf.slice(12, 12 + size - 10).toString('utf8', 'utf8');
      sock.removeAllListeners('data');
      resolve({ id, type, body });
    })();
  });
}

async function main() {
  const sock = net.connect(PORT, HOST);
  sock.write(packet(1, 3, PASS)); // AUTH
  const authReply = await readPacket(sock);
  // vanilla 应答 type=2 且 id=1；id=-1 = 密码错
  if (authReply.id === -1) { console.error('auth failed'); process.exit(2); }
  sock.write(packet(9, 2, CMD)); // EXEC
  const execReply = await readPacket(sock);
  const out = execReply.body.trim();
  console.log(out.length ? out : '(no output)');
  sock.destroy();
  process.exit(0);
}

main().catch(e => { console.error('RCON ERR:', e.message); process.exit(1); });
