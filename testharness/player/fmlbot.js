/**
 * fmlbot.js — mineflayer 假玩家 + FML|HS 握手公共模块（会话七 · testharness/player）
 *
 * 1.12.2 FML 双向校验客户端 mod 清单：先用 status ping（FML 的 modinfo）
 * 镜像服务器全量 mod 清单（含 etim），再把同一清单递给 forgeHandshake。
 * 服务器若加 mod，清单自动跟随——无需在脚本里硬编码 etim。
 */
'use strict';
const mc = require('minecraft-protocol');
const mineflayer = require('mineflayer');
const forge = require('minecraft-protocol-forge');

const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);

/** FML status ping — 返回服务器 mod 清单（[{modid,version}...]）或 null（原版 banner） */
async function pingServerMods(host, port, version = '1.12.2') {
  const res = await mc.ping({ host, port, version, timeout: 8000 });
  const modinfo = res.modinfo || null;
  if (!modinfo) return null;
  log('ping', `FMLSrvMods: ${modinfo.modList.map(m => `${m.modid}@${m.version}`).join(', ')}`);
  return modinfo.modList;
}

/**
 * 假玩家进服（阻塞到 login 事件 resolve）。
 * @returns bot（mineflayer 实例）
 */
async function createHarnBot(opts = {}) {
  const host = opts.host || 'localhost';
  const port = opts.port || 25565;
  const username = opts.username || 'ETIM_Harn01';
  const version = opts.version || '1.12.2';

  const serverMods = await pingServerMods(host, port, version);
  if (!serverMods) throw new Error('target is not a FML server — no modinfo in status ping');

  const bot = mineflayer.createBot({ host, port, username, version });
  forge.forgeHandshake(bot._client, { forgeMods: serverMods });

  // FML|HS 帧摘要（RegistryData 帧只报计数，避免刷屏）
  let regData = 0;
  const names = { 0: 'HELLO_SERVER', 1: 'HELLO_CLIENT', 2: 'MOD_LIST', 3: 'REGISTRY_DATA', 255: 'ACK' };
  bot._client.on('custom_payload', (msg) => {
    if (msg.channel !== 'FML|HS') return;
    const buf = Buffer.from(msg.data);
    if (buf.length > 2 && buf.readUInt8(0) === 3) { regData++; return; } // 1.12.2 REGISTRY_DATA 只报计数
    log('fmlhs', `disc=${buf.readUInt8(0)}(${names[buf.readUInt8(0)] || '?'}) len=${buf.length}`);
  });
  bot.on('fml-frame-count', () => {}); // 占位：外层需要 registry 计数时读 bot.__fmlRegData
  Object.defineProperty(bot, '__fmlRegData', { get: () => regData });

  bot.on('message', (msg) => log('chat', msg.toString()));
  bot.on('kicked', (why) => log('bot', 'KICKED:', JSON.stringify(why)));
  bot.on('end', (why) => log('bot', 'connection end:', why));
  bot.on('error', (e) => log('bot', 'ERROR:', e.message));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('login timeout 30s')), 30000);
    bot.once('login', () => { clearTimeout(timer); resolve(); });
    bot.once('kicked', () => { clearTimeout(timer); reject(new Error('kicked during handshake/login')); });
  });
  log('bot', `LOGIN OK as ${username} — FML|HS 握手成功，registry_data 帧=${regData}`);
  return bot;
}

module.exports = { createHarnBot, pingServerMods, log };
