#!/usr/bin/env node
/** f11-rcon-stop.js — graceful RCON stop for a leftover dev server (port 25565
 *  game / 25575 rcon). Usage: node player/f11-rcon-stop.js [port=25575]. */
'use strict';
const net = require('net');

const PORT = Number(process.argv[2] || 25575);
let id = 0;

function packet(type, body) {
  const b = Buffer.from(body, 'ascii');
  const len = 4 + 4 + b.length + 2;
  const buf = Buffer.alloc(4 + len);
  buf.writeInt32LE(len, 0);
  buf.writeInt32LE(++id, 4);
  buf.writeInt32LE(type, 8);
  b.copy(buf, 12);
  return buf;
}

function readPackets(sock, timeoutMs) {
  return new Promise((resolve) => {
    let chunks = [];
    sock.on('data', (d) => chunks.push(d));
    setTimeout(() => resolve(chunks), timeoutMs);
  });
}

(async () => {
  const sock = net.connect(PORT, '127.0.0.1');
  const done = readPackets(sock, 3000);
  await new Promise((r) => sock.once('connect', r));
  sock.write(packet(3, 'etim27'));
  await new Promise((r) => setTimeout(r, 500));
  sock.write(packet(2, 'stop'));
  console.log('[rcon-stop] stop sent on ' + PORT);
  await new Promise((r) => setTimeout(r, 1500));
  sock.destroy();
  process.exit(0);
})().catch((e) => { console.error('[rcon-stop] fail: ' + e.message); process.exit(1); });
