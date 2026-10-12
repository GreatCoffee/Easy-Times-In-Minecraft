/**
 * P0 · FML|HS 握手小验证（会话七 · testharness/player）
 *
 * 用途：验证 mineflayer 假玩家能否连入主会话起好的 runServer（etim 已装）。
 * 流程：FML ping（拿服务器 mod 清单）→ mirror 清单做 FML|HS 握手 → 登录 →
 *       跑 /list 与 /etest → 打印「握手报文摘要 + 命令响应原文」。
 *
 * 用法：node connect-dev.js [host] [port] [username]
 * 默认：localhost 25565 ETIM_Harn01
 *
 * 判据（自验收，供主会话核）：收到 'login' 事件 + 两条命令的系统消息回文。
 * 调试：NODE_DEBUG=minecraft-protocol-forge node connect-dev.js
 */
'use strict';
const mc = require('minecraft-protocol');
const mineflayer = require('mineflayer');
const forge = require('minecraft-protocol-forge');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn01';

const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);

async function pingMods() {
  // Forge 1.12.2 专服的 status response 带 modinfo（FML ping），直接镜像它的清单
  const res = await mc.ping({ host, port, version: '1.12.2' });
  const modinfo = res.modinfo || null;
  if (!modinfo) {
    log('ping', 'server is NOT advertising FML modinfo — vanilla-style join will be attempted');
    return null;
  }
  log('ping', `FMLSrvMods: ${modinfo.modList.map(m => `${m.modid}@${m.version}`).join(', ')}`);
  return modinfo.modList; // [ {modid, version}... ] — 含 mcp/FML/Forge/minecraft/etim
}

function summarizePingPayload(payload) {
  // FML 1.12.2 FSM: 0=HELLO_SERVER 1=HELLO_CLIENT 2=MOD_LIST 3=REGISTRY_DATA 255=ACK
  const d = payload.readUInt8(0);
  const names = { 0: 'HELLO_SERVER', 1: 'HELLO_CLIENT', 2: 'MOD_LIST', 3: 'REGISTRY_DATA', 255: 'ACK' };
  return `FML|HS disc=${d}(${names[d] || '?'}) len=${payload.length}`;
}

async function main() {
  const serverMods = await pingMods();
  if (!serverMods) throw new Error('not a FML server — handshake not applicable');

  const bot = mineflayer.createBot({
    host, port, username, version: '1.12.2',
    // 离线服务器无所谓，不给密码
  });

  // 把服务器清单原子镜像为客户端清单（1.12.2 FML 双向校验 modid+version 逐一相同）
  forge.forgeHandshake(bot._client, { forgeMods: serverMods });

  // FML|HS 帧摘要（判 P0 报文面）
  let regData = 0;
  bot._client.on('custom_payload', (msg) => {
    if (msg.channel !== 'FML|HS') return;
    const buf = Buffer.from(msg.data);
    if (buf.length > 2 && buf.readUInt8(0) === 3) { regData++; return; } // 1.12.2 REGISTRY_DATA 只报计数
    log('fmlhs', summarizePingPayload(buf));
  });

  const chatLog = [];
  bot.on('message', (msg) => {
    const text = msg.toString();
    chatLog.push(text);
    log('chat', text);
  });
  bot.on('login', () => log('harness', 'LOGIN OK — FML|HS 握手成功，已进服'));
  bot.on('end', (why) => log('harness', 'connection end:', why));
  bot.on('error', (e) => log('harness', 'ERROR:', e.message));
  bot.on('kicked', (why) => log('harness', 'KICKED:', JSON.stringify(why)));

  bot.once('login', () => {
    setTimeout(() => bot.chat('/list'), 1500);
    setTimeout(() => bot.chat('/etest food 6 0'), 3500);
    setTimeout(() => {
      log('harness', '=== P0 验收摘要 ===');
      log('harness', `registry_data frames: ${regData}`);
      log('harness', 'chat responses:', chatLog.length ? JSON.stringify(chatLog) : '(none)');
      bot.quit();
      process.exit(0);
    }, 9000);
  });
}

main().catch((e) => { log('harness', 'FATAL:', e.message); process.exit(1); });
