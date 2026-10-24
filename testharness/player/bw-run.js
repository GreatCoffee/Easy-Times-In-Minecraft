#!/usr/bin/env node
/**
 * bw-run.js — 划船/水中跳 drain 重定位验证窗（会话七）
 *
 * 判决源：server.log [FoodLog] boatDrain / waterJumpDrain 行 + [EtimTest] 相位标记。
 *
 * 工装事实（本轮实测确认）：
 *  1) 1.12.2 CPacketInput（C0C, id 0x16）在 minecraft-data 里误命名为
 *     packet_steer_vehicle，线格式 = f32 strafe + f32 forward + u8 位掩码
 *     (bit0=jumping, bit1=sneaking) → 与 CPacketInput 同构，直接
 *     bot._client.write('steer_vehicle', {sideways, forward, jump})。
 *  2) EntityPlayerMP.setEntityActionState 只在 isRiding() 时写 moveForward
 *     → 只有骑乘期 C0C 喂得到 boat 钩子。
 *  3) EntityBoat.canFitPassenger = size() < 2 → 一船可载驾驶者 + 乘客。
 *  4) 下骑用 /tp 收尾：1.12 CommandTP:95 对被传送实体调 dismountRidingEntity。
 *  5) 物理关闭 + 传送后 bot.entity.onGround=false → 服务端 floatingTick
 *     80 tick 内踢人，故每次落地/传送后 ground() 复位并补 onGround=true 包。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarnBot, log } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(ROOT, 'build-logs', 'bw-gate.txt');
const DONE = path.join(ROOT, 'build-logs', 'bw-done.txt');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const DRIVER = process.argv[4] || 'ETIM_Harn04';
const PAX = process.argv[5] || 'ETIM_Harn05';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (s) => { try { fs.appendFileSync(DONE, s + '\n'); } catch (e) {} log('act', s); };
const P = (v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;

const B = { driver: null, pax: null };
const BOTNAME = (bot) => (bot === B.pax ? PAX : DRIVER);

async function cmd(bot, c, w = 500) {
    const line = c.startsWith('/') ? c : '/' + c;
    bot.chat(line);
    log('cmd', line);
    await sleep(w);
}

/** 手工位移包（物理关闭时用） */
function step(bot, dx, dy, dz, onGround) {
    const p = bot.entity.position;
    const x = p.x + dx, y = p.y + dy, z = p.z + dz;
    p.set(x, y, z);
    bot._client.write('position', { x, y, z, onGround });
}

async function steps(bot, n, dx, dy, dz, onGround, gap = 105) {
    for (let i = 0; i < n; i++) { step(bot, dx, dy, dz, onGround); await sleep(gap); }
}

/** C0C（CPacketInput）—— minecraft-data 误名 steer_vehicle，线格式同构 */
function sendInput(bot, forward, jump = false, sneak = false) {
    bot._client.write('steer_vehicle',
        { sideways: 0, forward: forward, jump: (jump ? 1 : 0) | (sneak ? 2 : 0) });
}

async function holdInput(bot, forward, packets, gap = 50) {
    let n = 0;
    for (let i = 0; i < packets; i++) { sendInput(bot, forward); n++; await sleep(gap); }
    return n;
}

async function setPhysics(bot, on) {
    bot.setControlState('forward', false);
    bot.setControlState('sprint', false);
    bot.setControlState('sneak', false);
    bot.setControlState('jump', false);
    bot.physicsEnabled = on;
    await sleep(300);
}

/** 地面标志复位（防 floating too long 踢人） */
async function ground(bot) {
    bot.entity.onGround = true;
    for (let i = 0; i < 4; i++) { step(bot, 0, 0, 0, true); await sleep(105); }
    await sleep(250);
}

async function land(bot, x, y, z) {
    bot.physicsEnabled = false;
    await cmd(bot, `/tp ${BOTNAME(bot)} ${x} ${y} ${z}`, 800);
    bot.entity.onGround = true;
    for (let i = 0; i < 6; i++) { step(bot, 0, 0, 0, true); await sleep(105); }
    await sleep(600);
}

/** 可靠传送：失败重试，并把客户端位置核到目标附近 */
async function tpTo(bot, x, y, z) {
    for (let i = 0; i < 3; i++) {
        await cmd(bot, `/tp ${BOTNAME(bot)} ${x} ${y} ${z}`, 900);
        const p = bot.entity.position;
        if (Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2 && Math.abs(p.z - z) < 2) {
            mark(`tpTo ok -> ${x},${y},${z} now=${P(p)}`);
            return true;
        }
        await sleep(500);
    }
    mark(`tpTo FAILED -> ${x},${y},${z} now=${P(bot.entity.position)}`);
    return false;
}

/** 下骑：CommandTP 必下骑；客户端 vehicle 标志同步清掉（mineflayer 在 1.12 不总清） */
async function unmount(bot) {
    const x = bot === B.pax ? -52 : -50;
    // 关键：骑乘期写入的 moveForward 在非骑乘时无法再改写（setEntityActionState 仅骑乘生效），
    // 下骑前必须先清零，否则服务端 travel 会带着陈旧输入自己走路（伪 walkDrain）。
    sendInput(bot, 0.0);
    await sleep(150);
    sendInput(bot, 0.0);
    await sleep(150);
    await cmd(bot, `/tp ${BOTNAME(bot)} ${x} 80 241`, 800);
    bot.vehicle = null;
    await sleep(400);
    await ground(bot);
}

/** 相位分界：/etest food 20 20（服务端落 [EtimTest] food_set_pool 行） */
async function phaseMark(bot, tag) {
    await cmd(bot, `/etest food 20 20 ${BOTNAME(bot)}`, 700);
    mark(`== ${tag} ==`);
}

function findEnt(bot, name, maxDist = 8) {
    return Object.values(bot.entities || {}).find(
        (e) => e && e.name === name && e.position.distanceTo(bot.entity.position) < maxDist);
}

async function mount(bot, name, waitMs = 3000) {
    const ent = findEnt(bot, name);
    if (!ent) { mark(`mount ${name}: NOT-FOUND`); return null; }
    mark(`mount ${name}: id=${ent.id} at=${P(ent.position)}`);
    await bot.lookAt(ent.position.offset(0, 0.4, 0), true);
    await sleep(250);
    try { bot.activateEntity(ent); } catch (e) { mark(`mount activate threw ${e.message}`); }
    for (let i = 0; i < Math.ceil(waitMs / 100); i++) {
        await sleep(100);
        if (bot.vehicle && bot.vehicle.name === name) return bot.vehicle;
    }
    mark(`mount ${name}: FAILED vehicle=${bot.vehicle ? (bot.vehicle.name || '?') : 'none'}`);
    return null;
}

/** 召唤一条船并贴到船当前位（船载人/自重会漂移，必须按当前位就位才过 reach 门） */
async function boardBoat(bot, x, z) {
    await cmd(bot, `/tp ${BOTNAME(bot)} ${x} 80 ${z}`, 700);
    await cmd(bot, `/kill @e[type=boat]`, 400);
    await cmd(bot, `/summon minecraft:boat ${(x + 1.5).toFixed(2)} 80.0 ${z}`, 900);
    await sleep(400);
    const b = findEnt(bot, 'boat', 12);
    if (b) {
        await cmd(bot, `/tp ${BOTNAME(bot)} ${(b.position.x - 0.7).toFixed(2)} 80 ${b.position.z.toFixed(2)}`, 700);
    }
    await ground(bot);
    return await mount(bot, 'boat');
}
const PHASES = {};

PHASES.B0stage = async () => {
    const d = B.driver;
    await cmd(d, `/gamerule doMobSpawning false`, 300);
    await cmd(d, `/gamerule keepInventory true`, 300);
    await cmd(d, `/time set 1000`, 300);
    await cmd(d, `/difficulty 1`, 300);
    await cmd(d, `/gamemode 0 ${DRIVER}`, 300);
    if (B.pax) await cmd(d, `/gamemode 0 ${PAX}`, 300);
    await cmd(d, `/tp ${DRIVER} -50 80 241`, 800);
    if (B.pax) await cmd(d, `/tp ${PAX} -52 80 241`, 800);
    await cmd(d, `/kill @e[type=boat]`, 300);
    await cmd(d, `/kill @e[type=pig]`, 300);
    await cmd(d, `/kill @e[type=zombie]`, 300);
    await cmd(d, `/fill -21 71 237 -13 77 245 minecraft:air`, 800);
    await cmd(d, `/fill -21 71 237 -13 77 245 minecraft:water`, 800);
    await cmd(d, `/fill 3 70 234 11 77 242 minecraft:stone`, 900);
    await cmd(d, `/fill 4 71 235 10 76 241 minecraft:air`, 800);
    await cmd(d, `/fill 4 71 235 10 76 241 minecraft:lava`, 800);
    await cmd(d, `/effect ${DRIVER} minecraft:fire_resistance 900 1`, 400);
    await cmd(d, `/etest level 35 ${DRIVER}`, 400);
    mark(`B0 staged pos=${P(d.entity.position)}`);
};

PHASES.B1boat = async () => {
    const d = B.driver;
    await setPhysics(d, false);
    await cmd(d, `/tp ${DRIVER} -60.5 80 241.5`, 800);
    await cmd(d, `/kill @e[type=boat]`, 400);
    await cmd(d, `/summon minecraft:boat -58.5 80.0 241.5`, 900);
    await sleep(700);
    const v = await mount(d, 'boat');
    mark(`B1 vehicle=${v ? (v.name || v.type) : 'none'}`);
    if (!v) return;
    await phaseMark(d, 'B1-full');
    const n1 = await holdInput(d, 1.0, 40);
    mark(`B1 full sent=${n1} pos=${P(d.entity.position)}`);
    await phaseMark(d, 'B1-idle');
    const n2 = await holdInput(d, 0.0, 30);
    mark(`B1 idle sent=${n2}`);
    await phaseMark(d, 'B1-reverse');
    const n3 = await holdInput(d, -1.0, 20);
    mark(`B1 reverse sent=${n3}`);
};

PHASES.B2pax = async () => {
    const d = B.driver, p = B.pax;
    if (!p) { mark('B2 NO-PAX'); return; }
    await unmount(d);
    await unmount(p);
    await cmd(d, `/kill @e[type=boat]`, 400);
    await cmd(d, `/summon minecraft:boat -58.5 80.0 241.5`, 900);
    await cmd(d, `/tp ${DRIVER} -59.2 80 241.5`, 700);
    await ground(d);
    const vd = await mount(d, 'boat');
    mark(`B2 driver vehicle=${vd ? (vd.name || vd.type) : 'none'} boat=${vd ? P(vd.position) : '-'}`);
    if (!vd) return;
    const bNow = findEnt(p, 'boat') || vd;
    await cmd(d, `/tp ${PAX} ${(bNow.position.x + 0.7).toFixed(2)} ${bNow.position.y.toFixed(2)} ${(bNow.position.z + 0.7).toFixed(2)}`, 700);
    await ground(p);
    const vp = await mount(p, 'boat', 3500);
    mark(`B2 pax vehicle=${vp ? (vp.name || vp.type) : 'none'}`);
    if (!vp) return;
    await phaseMark(d, 'B2-pax');
    let n = 0;
    for (let i = 0; i < 30; i++) { sendInput(d, 0.0); sendInput(p, 1.0); n++; await sleep(50); }
    mark(`B2 pax sent=${n}`);
    await phaseMark(d, 'B2-both');
    n = 0;
    for (let i = 0; i < 20; i++) { sendInput(d, 1.0); sendInput(p, 1.0); n++; await sleep(50); }
    mark(`B2 both sent=${n} each`);
};

PHASES.B3pig = async () => {
    const d = B.driver;
    await unmount(d);
    await cmd(d, `/tp ${DRIVER} -55.5 80 241.5`, 800);
    await cmd(d, `/kill @e[type=pig]`, 300);
    await cmd(d, `/summon minecraft:pig -53.5 80 241.5 {NoAI:1b,Saddle:1b}`, 800);
    await sleep(700);
    await ground(d);
    const v = await mount(d, 'pig');
    mark(`B3 vehicle=${v ? (v.name || v.type) : 'none'}`);
    if (!v) return;
    await phaseMark(d, 'B3-pig');
    const n = await holdInput(d, 1.0, 20);
    mark(`B3 sent=${n}`);
    await unmount(d);
};

PHASES.B4water = async () => {
    const d = B.driver;
    await unmount(d);
    await setPhysics(d, false);
    // 水面（swim 面）：feet 77 → 眼 78.62（空气），包围盒含水块 77
    if (!await tpTo(d, -17, 77, 241)) return;
    await phaseMark(d, 'B4-surface');
    mark(`B4 surface at=${P(d.entity.position)}`);
    await steps(d, 6, 0.10, 0.06, 0, false, 55);
    mark(`B4 surface end=${P(d.entity.position)}`);
    // 潜水（dive 面）：feet 72 → 眼 73.62（水内）
    if (!await tpTo(d, -17, 72, 241)) return;
    await phaseMark(d, 'B4-under');
    mark(`B4 under at=${P(d.entity.position)}`);
    await steps(d, 6, 0.10, 0.06, 0, false, 55);
    mark(`B4 under end=${P(d.entity.position)}`);
    // 下沉（dy<0）：waterJumpDrain 应 0 行（dive/swim 照充）
    if (!await tpTo(d, -17, 77.2, 241)) return;
    await phaseMark(d, 'B4-sink');
    mark(`B4 sink at=${P(d.entity.position)}`);
    await steps(d, 6, 0.10, -0.30, 0, false, 55);
    mark(`B4 sink end=${P(d.entity.position)}`);
};

PHASES.B5lava = async () => {
    const d = B.driver;
    await setPhysics(d, false);
    await cmd(d, `/effect ${DRIVER} minecraft:fire_resistance 900 1`, 500);
    if (!await tpTo(d, 7, 71, 238)) return;
    await phaseMark(d, 'B5-lava');
    mark(`B5 lava at=${P(d.entity.position)}`);
    await steps(d, 6, 0.10, 0.06, 0, false, 55);
    mark(`B5 lava end=${P(d.entity.position)}`);
    if (!await tpTo(d, 7, 72, 238)) return;
    await phaseMark(d, 'B5-lava-sink');
    mark(`B5 lava sink at=${P(d.entity.position)}`);
    await steps(d, 6, 0.10, -0.30, 0, false, 55);
    mark(`B5 lava sink end=${P(d.entity.position)}`);
};

PHASES.B6rideMove = async () => {
    const d = B.driver;
    await unmount(d);
    await setPhysics(d, false);
    const v = await boardBoat(d, -60.5, 241.5);
    mark(`B6 vehicle=${v ? (v.name || v.type) : 'none'}`);
    if (!v) return;
    await phaseMark(d, 'B6-ride-move');
    await steps(d, 8, 0.20, 0, 0, true);
    mark(`B6 end pos=${P(d.entity.position)} riding=${!!d.vehicle}`);
};

PHASES.B7creative = async () => {
    const d = B.driver;
    await cmd(d, `/gamemode 1 ${DRIVER}`, 800);
    for (let i = 0; i < 12 && d.game.gameMode !== 'creative'; i++) await sleep(200);
    const vb = await boardBoat(d, -60.5, 241.5);
    mark(`B7 gamemode=${d.game.gameMode} vehicle=${vb ? (vb.name || vb.type) : 'none'}`);
    if (!vb) return;
    await phaseMark(d, 'B7-creative-boat');
    const n = await holdInput(d, 1.0, 20);
    mark(`B7 creative boat sent=${n}`);
    await unmount(d);
    await phaseMark(d, 'B7-creative-water');
    if (await tpTo(d, -17, 77, 241)) {
        await steps(d, 4, 0.10, 0.06, 0, false, 55);
        mark(`B7 creative water end=${P(d.entity.position)}`);
    }
    await land(d, -50, 80, 241);
    await cmd(d, `/gamemode 0 ${DRIVER}`, 800);
    for (let i = 0; i < 12 && d.game.gameMode !== 'survival'; i++) await sleep(200);
    mark(`B7 back gamemode=${d.game.gameMode}`);
};

PHASES.B8walk = async () => {
    const d = B.driver;
    await setPhysics(d, true);
    await cmd(d, `/tp ${DRIVER} -70 80 241`, 1000);
    await d.lookAt(d.entity.position.offset(10, 0, 0), true);
    await sleep(400);
    await phaseMark(d, 'B8-walk');
    const s0 = d.entity.position.clone();
    d.setControlState('forward', true);
    await sleep(2500);
    d.setControlState('forward', false);
    await sleep(700);
    const s1 = d.entity.position.clone();
    mark(`B8walk start=${P(s0)} end=${P(s1)} dist=${Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(3)}`);
    await d.lookAt(d.entity.position.offset(10, 0, 0), true);
    await sleep(400);
    await phaseMark(d, 'B8-sprint');
    const t0 = d.entity.position.clone();
    d.setControlState('sprint', true);
    await sleep(250);
    d.setControlState('forward', true);
    await sleep(3000);
    d.setControlState('forward', false);
    d.setControlState('sprint', false);
    await sleep(700);
    const t1 = d.entity.position.clone();
    mark(`B8sprint start=${P(t0)} end=${P(t1)} dist=${Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(3)}`);
};

/** 停靠 pax：物理关闭 + 远端落地，避免其自身位移污染 walkDrain 窗口 */
PHASES.B9park = async () => {
    if (!B.pax) return;
    B.pax.physicsEnabled = false;
    await cmd(B.driver, `/tp ${PAX} -72 80 245`, 700);
    await ground(B.pax);
    mark(`B9 pax parked pos=${P(B.pax.entity.position)}`);
};
async function main() {
    B.driver = await createHarnBot({ host, port, username: DRIVER });
    await new Promise((r) => {
        if (B.driver.entity && B.driver.entity.position) return r();
        B.driver.once('move', r);
        setTimeout(r, 15000);
    });
    await sleep(1500);
    mark(`READY driver=${DRIVER} pos=${P(B.driver.entity.position)}`);
    try {
        B.pax = await createHarnBot({ host, port, username: PAX });
        await new Promise((r) => {
            if (B.pax.entity && B.pax.entity.position) return r();
            B.pax.once('move', r);
            setTimeout(r, 15000);
        });
        await sleep(1200);
        mark(`READY pax=${PAX} pos=${P(B.pax.entity.position)}`);
    } catch (e) {
        mark(`PAX-FAILED ${e.message}`);
    }

    const seen = new Set();
    for (;;) {
        if (fs.existsSync(GATE)) {
            const lines = fs.readFileSync(GATE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const line of lines) {
                if (seen.has(line)) continue;
                seen.add(line);
                mark(`gate <- ${line}`);
                try {
                    if (line === 'quit') {
                        mark('quit');
                        try { B.driver.quit(); } catch (e) {}
                        try { if (B.pax) B.pax.quit(); } catch (e) {}
                        setTimeout(() => process.exit(0), 1500);
                        return;
                    }
                    const fn = PHASES[line];
                    if (fn) await fn(); else mark(`unknown phase ${line}`);
                } catch (e) {
                    mark(`PHASE-ERROR ${line} ${e && e.message ? e.message : e}`);
                }
            }
        }
        await sleep(200);
    }
}

main().catch((e) => { mark('FATAL ' + (e && e.stack ? e.stack : e)); process.exit(1); });
