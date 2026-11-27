#!/usr/bin/env node
/**
 * t01-run.js — T0-1/T0-2 验证轮的动作面驱动（会话七）
 *
 * 为什么用假玩家：R10 只需「一个玩家的真实挥击 + 服务端 [FoodLog] attackDrain」，
 * 判定源是服务端日志；bot 的 use_entity(ATTACK) 从包边界进入与真客户端同一条
 * NetHandlerPlayServer 路径。R6 同理（弱击 = 事件被取消 → 0 条 attackDrain）。
 *
 * 相位（由 build-logs/t01-gate.txt 文本控制，写一行触发一次）：
 *   R10  → 穿甲 → 架假目标 → L1..L4：/etest enchant chest L + /etest food 20 20 + 1 次挥击
 *   R6   → /etest food 0 0 + 3 次挥击 + 80 s 观察窗（STARVE 行）
 *   quit → 退场
 * 每条动作打印 [act] …，聊天/命令回执由 fmlbot 的 [chat] 行承载。
 * 进度落 build-logs/t01-done.txt（追加），供判决侧直接 grep。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarnBot, log } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(ROOT, 'build-logs', 't01-gate.txt');
const DONE = path.join(ROOT, 'build-logs', 't01-done.txt');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const BOT = process.argv[4] || 'ETIM_Harn04';
const ENCH = process.argv[5] || '12'; // [EtimInit] id（1.12 动态分配，起服日志读）
const ARENA = ['-40.5', '80', '240.5'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (s) => { try { fs.appendFileSync(DONE, s + '\n'); } catch (e) {} log('act', s); };
const CHAT = [];
const recentChat = (needle) => CHAT.slice(-6).some((s) => s.includes(needle));

async function cmd(bot, c, w = 700) {
    const line = c.startsWith('/') ? c : '/' + c;
    bot.chat(line);
    log('cmd', line);
    await sleep(w);
}

function nearestMob(bot, maxD) {
    let best = null, bd = 1e9;
    for (const e of Object.values(bot.entities || {})) {
        if (!e || !e.position || typeof e.position.distanceTo !== 'function') continue;
        if (e === bot.entity) continue;
        if (e.type === 'player' || e.type === 'object' || e.type === 'orb' || e.type === 'other') continue;
        if (e.isValid === false) continue;
        const d = e.position.distanceTo(bot.entity.position);
        if (d < bd) { bd = d; best = e; }
    }
    return bd <= maxD ? { e: best, d: bd } : null;
}

async function swing(bot, tag) {
    const hit = nearestMob(bot, 5);
    if (!hit) { mark(`${tag} NO-MOB`); return false; }
    try {
        const mid = hit.e.height ? hit.e.height * 0.5 : 0.9;
        await bot.lookAt(hit.e.position.offset(0, mid, 0), true); // 服务端 ray 需先瞄准（A12 修正）
        await sleep(250);
        bot.attack(hit.e);
        mark(`${tag} swing -> ${hit.e.name || hit.e.type} id=${hit.e.id} d=${hit.d.toFixed(2)}`);
        return true;
    } catch (err) {
        mark(`${tag} swing-threw ${err.message}`);
        return false;
    }
}

async function ensureArena(bot) {
    await cmd(bot, `/tp ${BOT} ${ARENA.join(' ')}`, 1200);
    await cmd(bot, `/gamemode 0 ${BOT}`, 500);
    await cmd(bot, `/etest level 35 ${BOT}`, 600); // 池上限 = 血食上限（level 0 只有 6）
    await cmd(bot, `/replaceitem entity ${BOT} slot.weapon.mainhand minecraft:air`, 500);
    const p = bot.entity.position;
    mark(`arena pos=${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} onGround=${bot.entity.onGround}`);
}

async function spawnDummy(bot) {
    const before = new Set(Object.keys(bot.entities || {}).map(Number));
    const p = bot.entity.position;
    const offs = [[1.2, 0], [0, 1.2], [-1.2, 0], [0, -1.2]];
    for (const [dx, dz] of offs) {
        const x = (p.x + dx).toFixed(2), y = p.y.toFixed(2), z = (p.z + dz).toFixed(2);
        await cmd(bot, `/summon minecraft:zombie ${x} ${y} ${z} {CustomName:"T01Dummy",NoAI:1b,Silent:1b,PersistenceRequired:1b,Health:1000.0f,Attributes:[{Name:"generic.maxHealth",Base:1000.0}]}`, 900);
        for (let i = 0; i < 6; i++) {
            for (const e of Object.values(bot.entities || {})) {
                if (e && e.name === 'zombie' && !before.has(e.id)) {
                    mark(`dummy id=${e.id} at ${x},${y},${z} d=${e.position.distanceTo(bot.entity.position).toFixed(2)}`);
                    return e;
                }
            }
            await sleep(200);
        }
    }
    mark('dummy NONE');
    return null;
}

/**
 * R10 的「一级一甲」变体：1.12 ItemStack.addEnchantment 是**追加**语义
 * （同 id 不去重），而 EnchantmentHelper 取列表里**首条**同名条目 → 同一件甲
 * 原位 1→2→3→4 的读数恒为 1 级。故每级换一件新甲（/replaceitem air → 新甲）
 * 再注入，读数才是「chest 上恰好 L 级」的干净面。工装本身的这个缺陷另列 FAIL。
 */
async function phaseR10w(bot) {
    await ensureArena(bot);
    const dummy = await spawnDummy(bot);
    if (!dummy) return;
    for (let lv = 1; lv <= 4; lv++) {
        await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:air`, 500);
        await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:diamond_chestplate 1 0`, 700);
        await cmd(bot, `/etest enchant chest ${lv} ${BOT}`, 800);
        if (recentChat('enchant_empty_slot')) mark(`R10w-L${lv} CHEST-EMPTY`);
        await cmd(bot, `/etest food 20 20 ${BOT}`, 700);
        await sleep(700);
        await swing(bot, `R10w-L${lv}`);
        if (recentChat('weakStrike')) mark(`R10w-L${lv} WEAK-STRIKE (pools empty)`);
        await sleep(1800);
        mark(`R10w-L${lv} window end`);
    }
}

/**
 * E1' 核心链：**同一件甲**连续 restage 1→2→3→4（上轮 E1 的判定面，同口径重演），
 * 每级在注入后立刻用 /testfor 打机制探针：
 *   - self ：本级单条目模式 → 期望 Found
 *   - prev1：1 级单条目模式 → 期望不中（证明旧档已被清掉）
 *   - acc  ：1..L 累积条目模式 → 期望不中（证明没有追加残留 = 病征反转）
 * 探针输出走 bot chat（"Found …" / "… did not match the required data structure"），
 * 由 [-bot.out] 的 [chat] 行承接；每条前先落 [act] probe 标记便于逐条对齐。
 */
async function phaseE1(bot) {
    await ensureArena(bot);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:diamond_chestplate 1 0`, 800);
    const dummy = await spawnDummy(bot);
    if (!dummy) return;
    const one = (lv) => `{Inventory:[{Slot:102b,tag:{ench:[{id:${ENCH}s,lvl:${lv}s}]}}]}`;
    const acc = (n) => `{Inventory:[{Slot:102b,tag:{ench:[${Array.from({ length: n }, (_, i) => `{id:${ENCH}s,lvl:${i + 1}s}`).join(',')}]}}]}`;
    for (let lv = 1; lv <= 4; lv++) {
        await cmd(bot, `/etest enchant chest ${lv} ${BOT}`, 800);
        if (recentChat('enchant_empty_slot')) mark(`E1-L${lv} CHEST-EMPTY`);
        mark(`probe L${lv} self`);
        await cmd(bot, `/testfor ${BOT} ${one(lv)}`, 600);
        if (lv > 1) {
            mark(`probe L${lv} prev1`);
            await cmd(bot, `/testfor ${BOT} ${one(1)}`, 600);
            mark(`probe L${lv} accum`);
            await cmd(bot, `/testfor ${BOT} ${acc(lv)}`, 600);
        }
        await cmd(bot, `/etest food 20 20 ${BOT}`, 700);
        await sleep(600);
        await swing(bot, `E1-L${lv}`);
        if (recentChat('weakStrike')) mark(`E1-L${lv} WEAK-STRIKE (pools empty)`);
        await sleep(1800);
        mark(`E1-L${lv} window end`);
    }
}

async function phaseR10(bot) {
    await ensureArena(bot);
    // 1.12 槽名是 slot.armor.chest（slot.chest 是 1.13+ 名，首轮就栽在这）
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:diamond_chestplate 1 0`, 800);
    const dummy = await spawnDummy(bot);
    if (!dummy) return;
    for (let lv = 1; lv <= 4; lv++) {
        await cmd(bot, `/etest enchant chest ${lv} ${BOT}`, 800);
        if (recentChat('enchant_empty_slot')) mark(`R10-L${lv} CHEST-EMPTY`);
        await cmd(bot, `/etest food 20 20 ${BOT}`, 700);
        await sleep(700);
        await swing(bot, `R10-L${lv}`);
        if (recentChat('weakStrike')) mark(`R10-L${lv} WEAK-STRIKE (pools empty)`);
        await sleep(1800); // 每条 attackDrain 独占一行，级间留窗
        mark(`R10-L${lv} window end`);
    }
}

async function phaseR6(bot) {
    // 星火判定门槛：health > starveHealthCeiling(10) 且难度 1 —— 血量上限由等级撑开
    // （level 35 → cap 20），故先抬等级再设血。
    await cmd(bot, `/etest level 35 ${BOT}`, 600);
    await cmd(bot, `/etest food 0 0 ${BOT}`, 700);
    await cmd(bot, `/etest health 20 ${BOT}`, 500);
    for (let i = 0; i < 3; i++) {
        await swing(bot, `R6-swing${i + 1}`);
        await sleep(900);
    }
    mark('R6 window start (80s)');
    await sleep(80000);
    mark('R6 window end');
}

async function main() {
    const bot = await createHarnBot({ host, port, username: BOT });
    bot.on('message', (m) => CHAT.push(m.toString()));
    bot.on('death', () => mark('BOT-DIED'));
    await new Promise((r) => {
        if (bot.entity && bot.entity.position) return r();
        bot.once('move', r);
        setTimeout(r, 15000);
    });
    await sleep(1500);
    mark(`READY bot=${BOT} pos=${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(1)},${bot.entity.position.z.toFixed(1)}`);

    const seen = new Set();
    for (;;) {
        if (fs.existsSync(GATE)) {
            const lines = fs.readFileSync(GATE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const line of lines) {
                if (seen.has(line)) continue;
                seen.add(line);
                mark(`gate <- ${line}`);
                if (line.startsWith('E1')) await phaseE1(bot);
                else if (line.startsWith('R10w')) await phaseR10w(bot);
                else if (line.startsWith('R10')) await phaseR10(bot);
                else if (line === 'R6') await phaseR6(bot);
                else if (line.startsWith('cmd ')) {
                    // 玩家侧发令面（C-4/C-5：发送者必须是玩家）
                    await cmd(bot, line.slice(4).trim(), 900);
                    mark(`cmd-done ${line.slice(4).trim()}`);
                }
                else if (line === 'quit') { mark('quit'); try { bot.quit(); } catch (e) {} setTimeout(() => process.exit(0), 1200); return; }
            }
        }
        await sleep(200);
    }
}

main().catch((e) => { mark('FATAL ' + (e && e.stack ? e.stack : e)); process.exit(1); });
