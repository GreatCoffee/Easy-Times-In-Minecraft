#!/usr/bin/env node
/**
 * move-run.js 鈥?绉诲姩浜旀敮 drain 楠岃瘉绐楋紙浼氳瘽涓冿級鐨勫姩浣滈潰椹卞姩
 *
 * 涓轰粈涔堢敤鍋囩帺瀹讹細R196 EntityPlayer.addMovementStat 鐨勪簲鏀?drain 钀藉湪
 * NetHandlerPlayServer.processPlayer锛堢Щ鍔ㄥ寘杈圭晫锛夆啋 鏈嶅姟绔?addMovementStat(TAIL)
 * 閽╁瓙 鈫?[FoodLog] 琛屻€俠ot 璧板悓涓€鍖呰竟鐣岋紝鍒ゅ畾婧愭槸鏈嶅姟绔棩蹇椼€? *
 * 鐩镐綅锛坆uild-logs/move-gate.txt 鍐欎竴琛岃Е鍙戜竴娆★紱姣忕浉浣嶉鏉?/etest food 20 20
 * 浼氬湪鏈嶅姟绔棩蹇楄惤 [EtimTest] food_set_pool 琛?= 鐩镐綅鍒嗙晫鏍囪锛夛細
 *   M0        閾烘祴閬擄紙璺戦亾/姘存睜/姊/搴婂彴锛? gamerule/time/gamemode
 *   M1        璺戦亾 walk 2.5 s 鈫?sprint 3.0 s锛堢墿鐞嗗紑鍚紝鐪熷疄绉诲姩鍖咃級
 *   M2        姘撮潰锛氭睜搴?dive锛?D锛? 姘撮潰 swim锛?D锛夛紙鐗╃悊鍏抽棴锛屾墜宸ュ寘锛? *   M3        姊潰锛氫笂鍗?/ 涓嬫粦 / 鎮仠锛堢墿鐞嗗紑鍚紝鑷劧鐖锛? *   M4a       楠戜箻锛堣埞锛夌Щ鍔ㄥ寘
 *   M4b       鎮┖锛堣烦寮ч潰锛夌Щ鍔ㄥ寘
 *   M4c       elytra 灞曞紑灏濊瘯锛坋ntity_action start_fall_flying锛? *   M4d       spectator 绉诲姩鍖? *   M4e       韬哄簥锛坆ed 浜や簰锛夌Щ鍔ㄥ寘
 *   M5a       L4 鑳哥敳 鈫?璺戦亾琛岃蛋锛坢od 搴斾粛 1.0锛? *   M5b       L3 restage 鈫?鎵?armor_stand锛坅ttackDrain 搴?0.39999998/0.12锛? *   quit      閫€鍑? * 姣忔潯鍔ㄤ綔鎵?[act] 鈥︼紱杩涘害钀?build-logs/move-done.txt锛屼緵鍒ゅ喅渚у榻愩€? */
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarnBot, log } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(ROOT, 'build-logs', 'move-gate.txt');
const DONE = path.join(ROOT, 'build-logs', 'move-done.txt');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const BOT = process.argv[4] || 'ETIM_Harn04';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (s) => { try { fs.appendFileSync(DONE, s + '\n'); } catch (e) {} log('act', s); };
const P = (v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;

async function cmd(bot, c, w = 500) {
    const line = c.startsWith('/') ? c : '/' + c;
    bot.chat(line);
    log('cmd', line);
    await sleep(w);
}

/** 鎵嬪伐绉诲姩鍖咃紙鐗╃悊鍏抽棴鏃剁敤锛夛細鍐欑粷瀵瑰潗鏍?+ 1.12 position 鍖?*/
function step(bot, dx, dy, dz, onGround) {
    const p = bot.entity.position;
    const x = p.x + dx, y = p.y + dy, z = p.z + dz;
    p.set(x, y, z);
    bot._client.write('position', { x, y, z, onGround });
}

async function steps(bot, n, dx, dy, dz, onGround, gap = 105) {
    for (let i = 0; i < n; i++) { step(bot, dx, dy, dz, onGround); await sleep(gap); }
}

async function setPhysics(bot, on) {
    bot.setControlState('forward', false);
    bot.setControlState('sprint', false);
    bot.setControlState('sneak', false);
    bot.setControlState('jump', false);
    bot.physicsEnabled = on;
    await sleep(300);
}

/**
 * 钀藉湴澶嶄綅锛氭湇鍔＄ floatingTick 鍦ㄦ偓绌?80 tick 鍚庤涪浜? * 锛坢ultiplayer.disconnect.flying锛夛紝鏁呮瘡涓偓绌虹浉浣嶅悗蹇呴』鍥炲湴闈㈠苟閫佽惤鍦板寘澶嶄綅銆? */
async function land(bot, x, y, z) {
    bot.physicsEnabled = false;
    await cmd(bot, `/tp ${BOT} ${x} ${y} ${z}`, 700);
    for (let i = 0; i < 6; i++) { step(bot, 0, 0, 0, true); await sleep(105); }
    await sleep(700);
}

/** 璇绘湇鍔＄渚у綋鍓嶄綅缃細/tp ~ ~ ~ 鐨勫洖鎵э紙鍚屾椂鎶婂鎴风浣嶇疆鍚屾鍒版湇鍔＄锛?*/
function serverPos(bot, timeout = 1600) {
    return new Promise((resolve) => {
        let done = false;
        const onMsg = (m) => {
            const s = m.toString();
            const mm = s.match(/Teleported .* to ([-\d.]+), ([-\d.]+), ([-\d.]+)/);
            if (mm && !done) {
                done = true;
                bot.removeListener('message', onMsg);
                resolve(`${mm[1]},${mm[2]},${mm[3]}`);
            }
        };
        bot.on('message', onMsg);
        bot.chat(`/tp ${BOT} ~ ~ ~`);
        setTimeout(() => { if (!done) { done = true; bot.removeListener('message', onMsg); resolve('timeout'); } }, timeout);
    });
}

/** 鐩镐綅鍒嗙晫锛?etest food 20 20锛堟湇鍔＄钀?[EtimTest] food_set_pool 琛岋級 */
const phaseMark = (bot, tag) => cmd(bot, `/etest food 20 20 ${BOT}`, 700).then(() => mark(`== ${tag} ==`));

const PHASES = {};

PHASES.M0 = async (bot) => {
    await cmd(bot, `/gamerule doMobSpawning false`, 300);
    await cmd(bot, `/gamerule keepInventory true`, 300);
    await cmd(bot, `/time set 1000`, 300);
    await cmd(bot, `/difficulty 1`, 300);
    await cmd(bot, `/gamemode 0 ${BOT}`, 300);
    await cmd(bot, `/tp ${BOT} -50 80 241`, 900);
    await cmd(bot, `/kill @e[type=zombie]`, 300);
    await cmd(bot, `/kill @e[type=armor_stand]`, 300);
    await cmd(bot, `/kill @e[type=boat]`, 300);
    // 璺戦亾锛坸 -72..-32, z 236..246, 鍦伴潰 y=79锛?    await cmd(bot, `/fill -72 79 236 -32 79 246 minecraft:stone`, 800);
    await cmd(bot, `/fill -72 80 236 -32 92 246 minecraft:air`, 800);
    // 姘存睜锛堝澹?y70..77 鈫?鍐呰厰 71..77 鎺忕┖ 鈫?鐏屾按锛涙按闈㈤《 y=78锛?    await cmd(bot, `/fill -22 70 236 -12 77 246 minecraft:stone`, 900);
    await cmd(bot, `/fill -21 71 237 -13 77 245 minecraft:air`, 900);
    await cmd(bot, `/fill -21 71 237 -13 77 245 minecraft:water`, 900);
    // 姊锛歺=0 瀹炲績澧欙紙y80..93锛夛紝x=-1 姊瓙锛堥潰瑗?meta 4锛夛紝绔欎綅 x=-0.5
    await cmd(bot, `/fill -3 79 236 1 79 246 minecraft:stone`, 800);
    await cmd(bot, `/fill -3 80 236 1 93 246 minecraft:air`, 800);
    await cmd(bot, `/fill 0 80 236 0 93 246 minecraft:stone`, 800);
    await cmd(bot, `/fill -1 80 237 -1 92 243 minecraft:ladder 4`, 800);
    // 搴婂彴锛坸 -18..-12, z 247..253锛?    await cmd(bot, `/fill -18 79 247 -12 79 253 minecraft:stone`, 700);
    await cmd(bot, `/fill -18 80 247 -12 84 253 minecraft:air`, 700);
    await cmd(bot, `/etest level 35 ${BOT}`, 500);
    mark(`M0 staged pos=${P(bot.entity.position)}`);
};

PHASES.M1 = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -70 80 241`, 1000);
    await phaseMark(bot, 'M1walk');
    await bot.lookAt(bot.entity.position.offset(10, 0, 0), true);
    await sleep(400);
    const s0 = bot.entity.position.clone();
    bot.setControlState('forward', true);
    await sleep(2500);
    bot.setControlState('forward', false);
    await sleep(700);
    const s1 = bot.entity.position.clone();
    mark(`M1walk start=${P(s0)} end=${P(s1)} dist=${Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(3)}`);
    await phaseMark(bot, 'M1sprint');
    await bot.lookAt(bot.entity.position.offset(10, 0, 0), true);
    await sleep(400);
    const t0 = bot.entity.position.clone();
    bot.setControlState('sprint', true);
    await sleep(250);
    bot.setControlState('forward', true);
    await sleep(3000);
    bot.setControlState('forward', false);
    bot.setControlState('sprint', false);
    await sleep(700);
    const t1 = bot.entity.position.clone();
    mark(`M1sprint start=${P(t0)} end=${P(t1)} dist=${Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(3)}`);
};

PHASES.M2 = async (bot) => {
    await setPhysics(bot, false);
    // dive锛氭睜搴?y=72锛堢溂 73.62 鈫?姘村潡 73 = 鐪煎唴姘达級
    await cmd(bot, `/tp ${BOT} -17 72 240`, 900);
    await phaseMark(bot, 'M2dive');
    mark(`M2dive at=${P(bot.entity.position)}`);
    await steps(bot, 12, 0.15, 0, 0, false);
    mark(`M2dive end=${P(bot.entity.position)}`);
    // swim锛氭按闈?y=77锛堢溂 78.62 鈫?绌烘皵锛涘寘鍥寸洅鍚按鍧?77 = 璐存按锛?    await cmd(bot, `/tp ${BOT} -17 77 240`, 900);
    await phaseMark(bot, 'M2swim');
    mark(`M2swim at=${P(bot.entity.position)}`);
    await steps(bot, 10, 0.15, 0, 0, false);
    mark(`M2swim end=${P(bot.entity.position)}`);
};

PHASES.M3 = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -0.5 80 241.5`, 1000);
    await bot.lookAt(bot.entity.position.offset(1, 0, 0), true);
    await sleep(500);
    await phaseMark(bot, 'M3up');
    const u0 = bot.entity.position.clone();
    mark(`M3up start=${P(u0)} onGround=${bot.entity.onGround} onLadder?`);
    bot.setControlState('forward', true);
    await sleep(1500);
    bot.setControlState('forward', false);
    await sleep(400);
    const u1 = bot.entity.position.clone();
    mark(`M3up end=${P(u1)} dy=${(u1.y - u0.y).toFixed(3)}`);
    await phaseMark(bot, 'M3down');
    const d0 = bot.entity.position.clone();
    await sleep(1500);                       // 鏃犺緭鍏?鈫?璐存涓嬫粦
    const d1 = bot.entity.position.clone();
    mark(`M3down start=${P(d0)} end=${P(d1)} dy=${(d1.y - d0.y).toFixed(3)}`);
    await phaseMark(bot, 'M3hover');
    bot.setControlState('sneak', true);      // 娼滆 = 閿佷綇姊潰锛堜笉鍗囦笉闄嶏級
    await sleep(1200);
    bot.setControlState('sneak', false);
    mark(`M3hover end=${P(bot.entity.position)}`);
};

PHASES.M4a = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/tp ${BOT} -60.5 80 241.5`, 900);
    await cmd(bot, `/summon minecraft:boat -58.5 80.0 241.5`, 900);
    let boat = null;
    for (let i = 0; i < 12 && !boat; i++) {
        boat = Object.values(bot.entities || {}).find(
            (e) => e && e.name === 'boat' && e.position.distanceTo(bot.entity.position) < 8);
        if (!boat) await sleep(250);
    }
    await phaseMark(bot, 'M4ride');
    if (!boat) { mark('M4ride NO-BOAT'); return; }
    mark(`M4ride boat id=${boat.id} at=${P(boat.position)}`);
    await bot.lookAt(boat.position, true);
    await sleep(300);
    try { bot.activateEntity(boat); } catch (e) { mark(`M4ride activate-threw ${e.message}`); }
    await sleep(1600);
    mark(`M4ride vehicle=${bot.vehicle ? (bot.vehicle.name || bot.vehicle.type) : 'none'}`);
    if (!bot.vehicle) return;
    await steps(bot, 8, 0.1, 0, 0, true);
    mark(`M4ride end=${P(bot.entity.position)} still=${bot.vehicle ? 'riding' : 'dismounted'} server=${await serverPos(bot)}`);
    try { bot.dismount(); } catch (e) {}
    await sleep(600);
    await land(bot, -60.5, 80, 241.5);
};

PHASES.M4b = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/tp ${BOT} -60.5 86 245.5`, 900);
    await phaseMark(bot, 'M4air');
    mark(`M4air at=${P(bot.entity.position)}`);
    await steps(bot, 8, 0.15, 0.05, 0, false);
    mark(`M4air end=${P(bot.entity.position)}`);
    await land(bot, -60.5, 80, 245.5);   // 澶嶄綅 floatingTick锛堝惁鍒?80 tick 鍚庤韪級
};

PHASES.M4c = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:elytra 1 0`, 700);
    await cmd(bot, `/tp ${BOT} -60.5 90 245.5`, 900);
    await sleep(700);                    // 鏈嶅姟绔┖涓?tick 璁?motionY<0
    try {
        bot._client.write('entity_action',
            { entityId: bot.entity.id, actionId: 'start_fall_flying', jumpBoost: 0 });
        mark('M4elytra entity_action start_fall_flying sent');
    } catch (e) { mark(`M4elytra action-threw ${e.message}`); }
    await sleep(400);
    await phaseMark(bot, 'M4elytra');
    mark(`M4elytra at=${P(bot.entity.position)}`);
    await steps(bot, 6, 0.15, -0.05, 0, false);
    mark(`M4elytra end=${P(bot.entity.position)}`);
    await land(bot, -60.5, 80, 245.5);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:air`, 600);
};

PHASES.M4d = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/gamemode 3 ${BOT}`, 800);
    for (let i = 0; i < 12 && bot.game.gameMode !== 'spectator'; i++) await sleep(250);
    await cmd(bot, `/tp ${BOT} -60.5 90 245.5`, 800);
    await phaseMark(bot, 'M4spec');
    mark(`M4spec gamemode=${bot.game.gameMode} at=${P(bot.entity.position)}`);
    await steps(bot, 8, 0.15, 0, 0, false);
    mark(`M4spec end=${P(bot.entity.position)} server=${await serverPos(bot)}`);
    await cmd(bot, `/gamemode 0 ${BOT}`, 800);
    await land(bot, -60.5, 80, 245.5);
};

PHASES.M4e = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/time set 18000`, 500);
    await cmd(bot, `/kill @e[type=zombie]`, 400);
    await cmd(bot, `/setblock -15 80 250 minecraft:bed 0`, 400);
    await cmd(bot, `/setblock -15 80 251 minecraft:bed 8`, 400);
    await cmd(bot, `/tp ${BOT} -13.5 80 250.5`, 1000);
    await phaseMark(bot, 'M4sleep');
    const bedPos = bot.entity.position.offset(-1, 0, 0);
    const bed = bot.blockAt(bedPos);
    mark(`M4sleep bedBlock=${bed ? bed.name : 'null'} at=${P(bedPos)} onGround=${bot.entity.onGround}`);
    if (bed && bed.name === 'bed') {
        try { await bot.activateBlock(bed); } catch (e) { mark(`M4sleep activate-threw ${e.message}`); }
    }
    for (let i = 0; i < 12 && !bot.isSleeping; i++) await sleep(250);
    mark(`M4sleep isSleeping=${bot.isSleeping}`);
    await steps(bot, 8, 0.05, 0, 0, true);
    mark(`M4sleep end=${P(bot.entity.position)} isSleeping=${bot.isSleeping} server=${await serverPos(bot)}`);
    await cmd(bot, `/time set 1000`, 400);
};

/**
 * M3b 鈥斺€?姊潰澶嶈窇锛氫笂鍗?鈫?鎮仠锛堟綔琛岄攣姊紝闈炶惤鍦帮級鈫?涓嬫粦锛屾瘡娈靛墠鎵?food 鏍囪锛? * 娈垫湯鐢?/tp ~ ~ ~ 璇绘湇鍔＄渚у潗鏍囷紝鏍搞€屽鎴风浣嶇Щ vs 鏈嶅姟绔綅绉?vs 琛屽唴 dy 姹傚拰銆嶃€? */
PHASES.M3b = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -0.5 80 241.5`, 1000);
    await bot.lookAt(bot.entity.position.offset(1, 0, 0), true);
    await sleep(500);
    await phaseMark(bot, 'M3b-up');
    const u0 = bot.entity.position.clone();
    mark(`M3bup start=${P(u0)}`);
    bot.setControlState('forward', true);
    await sleep(1000);
    bot.setControlState('forward', false);
    await sleep(250);
    const u1 = bot.entity.position.clone();
    mark(`M3bup end=${P(u1)} dy=${(u1.y - u0.y).toFixed(3)} server=${await serverPos(bot)}`);
    await phaseMark(bot, 'M3b-hover');
    const h0 = bot.entity.position.clone();
    bot.setControlState('sneak', true);
    await sleep(1200);
    const h1 = bot.entity.position.clone();
    mark(`M3bhover end=${P(h1)} dy=${(h1.y - h0.y).toFixed(3)} sneak=${bot.entity.sneaking}`);
    bot.setControlState('sneak', false);
    await phaseMark(bot, 'M3b-down');
    const d0 = bot.entity.position.clone();
    await sleep(1200);
    const d1 = bot.entity.position.clone();
    mark(`M3bdown end=${P(d1)} dy=${(d1.y - d0.y).toFixed(3)}`);
    await land(bot, -0.5, 80, 241.5);
};

PHASES.M5a = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -70 80 241`, 900);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:diamond_chestplate 1 0`, 600);
    await cmd(bot, `/etest enchant chest 4 ${BOT}`, 600);
    await cmd(bot, `/etest level 35 ${BOT}`, 400);
    await bot.lookAt(bot.entity.position.offset(10, 0, 0), true);
    await sleep(300);
    await phaseMark(bot, 'M5a-walk-L4');
    const a0 = bot.entity.position.clone();
    bot.setControlState('forward', true);
    await sleep(2000);
    bot.setControlState('forward', false);
    await sleep(600);
    const a1 = bot.entity.position.clone();
    mark(`M5a start=${P(a0)} end=${P(a1)} dist=${Math.hypot(a1.x - a0.x, a1.z - a0.z).toFixed(3)}`);
};

PHASES.M5b = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/tp ${BOT} -60 80 241`, 900);
    await cmd(bot, `/kill @e[type=armor_stand]`, 400);
    await cmd(bot, `/summon minecraft:armor_stand -59 80 241`, 900);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:diamond_chestplate 1 0`, 600);
    await cmd(bot, `/etest enchant chest 3 ${BOT}`, 600);
    await cmd(bot, `/etest level 35 ${BOT}`, 400);
    await sleep(600);
    const stand = Object.values(bot.entities || {}).find(
        (e) => e && (e.name === 'armor_stand' || e.name === 'Armor Stand') &&
            e.position.distanceTo(bot.entity.position) < 6);
    await phaseMark(bot, 'M5b-attack-L3');
    if (!stand) { mark('M5b NO-STAND'); return; }
    await bot.lookAt(stand.position.offset(0, 0.9, 0), true);
    await sleep(300);
    bot.attack(stand);
    mark(`M5b swing -> armor_stand id=${stand.id} d=${stand.position.distanceTo(bot.entity.position).toFixed(2)}`);
    await sleep(1500);
};


/**
 * M3c —— 梯面悬停面（潜行全程保持）：爬升 → 松前进（潜行锁住）→ 松潜行下滑。
 * 三个窗口用 food 标记分隔，行数/仅上升/0 行逐窗判。
 */
PHASES.M3c = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -0.5 80 241.5`, 1000);
    await bot.lookAt(bot.entity.position.offset(1, 0, 0), true);
    await sleep(400);
    bot.setControlState('sneak', true);
    await phaseMark(bot, 'M3c-up');
    const u0 = bot.entity.position.clone();
    bot.setControlState('forward', true);
    await sleep(1000);
    const u1 = bot.entity.position.clone();
    mark(`M3cup start=${P(u0)} end=${P(u1)} dy=${(u1.y - u0.y).toFixed(3)} sneak=${bot.controlState.sneak}`);
    await phaseMark(bot, 'M3c-hover');
    bot.setControlState('forward', false);
    const h0 = bot.entity.position.clone();
    await sleep(1200);
    const h1 = bot.entity.position.clone();
    mark(`M3chover start=${P(h0)} end=${P(h1)} dy=${(h1.y - h0.y).toFixed(3)} sneak=${bot.controlState.sneak}`);
    await phaseMark(bot, 'M3c-down');
    bot.setControlState('sneak', false);
    const d0 = bot.entity.position.clone();
    await sleep(1200);
    const d1 = bot.entity.position.clone();
    mark(`M3cdown start=${P(d0)} end=${P(d1)} dy=${(d1.y - d0.y).toFixed(3)}`);
    await land(bot, -0.5, 80, 241.5);
};

/** M4e2 —— 躺床面（补屋顶满足 notSheltered 门） */
PHASES.M4e2 = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/time set 18000`, 400);
    await cmd(bot, `/kill @e[type=zombie]`, 300);
    await cmd(bot, `/fill -18 83 247 -12 83 253 minecraft:stone`, 500);
    await cmd(bot, `/setblock -15 80 250 minecraft:bed 0`, 300);
    await cmd(bot, `/setblock -15 80 251 minecraft:bed 8`, 300);
    await cmd(bot, `/tp ${BOT} -13.5 80 250.5`, 900);
    const bed = bot.blockAt(bot.entity.position.offset(-1, 0, 0));
    mark(`M4sleep2 bedBlock=${bed ? bed.name : 'null'} at=${P(bot.entity.position.offset(-1, 0, 0))}`);
    if (bed && bed.name === 'bed') {
        try { await bot.activateBlock(bed); } catch (e) { mark(`M4sleep2 activate-threw ${e.message}`); }
    }
    for (let i = 0; i < 16 && !bot.isSleeping; i++) await sleep(250);
    mark(`M4sleep2 isSleeping=${bot.isSleeping}`);
    await phaseMark(bot, 'M4sleep2-open');
    await steps(bot, 8, 0.05, 0, 0, true);
    await phaseMark(bot, 'M4sleep2-close');
    mark(`M4sleep2 end=${P(bot.entity.position)} isSleeping=${bot.isSleeping} server=${await serverPos(bot)}`);
    await cmd(bot, `/time set 1000`, 400);
    await land(bot, -13.5, 80, 250.5);
};

/**
 * M4f —— elytra 正面判据：悬空 5 s（>80 tick）不被「floating too long」踢，
 * 即服务端 isElytraFlying() 置位（floating 门对 elytra 豁免）。
 * 期间移动包全走 else 支 → 移动 tag 0 行。
 */
PHASES.M4f = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:elytra 1 0`, 600);
    await cmd(bot, `/tp ${BOT} -60.5 95 245.5`, 800);
    await sleep(700);
    let kicked = false;
    bot.once('kicked', () => { kicked = true; mark('M4elytra KICKED'); });
    try {
        bot._client.write('entity_action',
            { entityId: bot.entity.id, actionId: 'start_fall_flying', jumpBoost: 0 });
        mark('M4elytra entity_action start_fall_flying sent');
    } catch (e) { mark(`M4elytra action-threw ${e.message}`); }
    await sleep(300);
    await phaseMark(bot, 'M4elytra-open');
    for (let i = 0; i < 50 && !kicked; i++) { step(bot, 0.02, -0.02, 0, false); await sleep(100); }
    await phaseMark(bot, 'M4elytra-close');
    mark(`M4elytra airborne5s kicked=${kicked} at=${P(bot.entity.position)}`);
    if (!kicked) {
        await land(bot, -60.5, 80, 245.5);
        await cmd(bot, `/replaceitem entity ${BOT} slot.armor.chest minecraft:air`, 500);
    }
};

/** M3d —— 梯面悬停净窗：爬升 → 松前进静置 1.2 s（动量耗尽）→ 开窗悬停 1.5 s → 松潜行下滑 */
PHASES.M3d = async (bot) => {
    await setPhysics(bot, true);
    await cmd(bot, `/tp ${BOT} -0.5 80 241.5`, 1000);
    await bot.lookAt(bot.entity.position.offset(1, 0, 0), true);
    await sleep(400);
    bot.setControlState('sneak', true);
    bot.setControlState('forward', true);
    await sleep(1000);
    bot.setControlState('forward', false);
    await sleep(1200);                       // 静置：残速耗尽，潜行锁梯
    const h0 = bot.entity.position.clone();
    await phaseMark(bot, 'M3d-hover');
    await sleep(1500);
    const h1 = bot.entity.position.clone();
    mark(`M3dhover start=${P(h0)} end=${P(h1)} dy=${(h1.y - h0.y).toFixed(4)} sneak=${bot.controlState.sneak}`);
    await phaseMark(bot, 'M3d-down');
    bot.setControlState('sneak', false);
    const d0 = bot.entity.position.clone();
    await sleep(1200);
    const d1 = bot.entity.position.clone();
    mark(`M3ddown start=${P(d0)} end=${P(d1)} dy=${(d1.y - d0.y).toFixed(3)}`);
    await land(bot, -0.5, 80, 241.5);
};

/** M4e3 —— 躺床面（屋顶扩到 7×7 降水高程扫描面） */
PHASES.M4e3 = async (bot) => {
    await setPhysics(bot, false);
    await cmd(bot, `/time set 18000`, 400);
    await cmd(bot, `/kill @e[type=zombie]`, 300);
    await cmd(bot, `/fill -21 83 244 -9 83 258 minecraft:stone`, 700);
    await cmd(bot, `/fill -15 80 250 -15 80 251 minecraft:air`, 400);
    await cmd(bot, `/setblock -15 80 250 minecraft:bed 0`, 300);
    await cmd(bot, `/setblock -15 80 251 minecraft:bed 8`, 300);
    await cmd(bot, `/tp ${BOT} -13.5 80 250.5`, 900);
    const bed = bot.blockAt(bot.entity.position.offset(-1, 0, 0));
    mark(`M4sleep3 bedBlock=${bed ? bed.name : 'null'}`);
    if (bed && bed.name === 'bed') {
        try { await bot.activateBlock(bed); } catch (e) { mark(`M4sleep3 activate-threw ${e.message}`); }
    }
    for (let i = 0; i < 16 && !bot.isSleeping; i++) await sleep(250);
    mark(`M4sleep3 isSleeping=${bot.isSleeping}`);
    await phaseMark(bot, 'M4sleep3-open');
    await steps(bot, 8, 0.05, 0, 0, true);
    await phaseMark(bot, 'M4sleep3-close');
    mark(`M4sleep3 end=${P(bot.entity.position)} isSleeping=${bot.isSleeping}`);
    await cmd(bot, `/time set 1000`, 400);
    await land(bot, -13.5, 80, 250.5);
};

async function main() {
    const bot = await createHarnBot({ host, port, username: BOT });
    await new Promise((r) => {
        if (bot.entity && bot.entity.position) return r();
        bot.once('move', r);
        setTimeout(r, 15000);
    });
    await sleep(1800);
    mark(`READY bot=${BOT} pos=${P(bot.entity.position)}`);

    const seen = new Set();
    for (;;) {
        if (fs.existsSync(GATE)) {
            const lines = fs.readFileSync(GATE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const line of lines) {
                if (seen.has(line)) continue;
                seen.add(line);
                mark(`gate <- ${line}`);
                try {
                    if (line === 'quit') { mark('quit'); try { bot.quit(); } catch (e) {} setTimeout(() => process.exit(0), 1200); return; }
                    const fn = PHASES[line];
                    if (fn) await fn(bot); else mark(`unknown phase ${line}`);
                } catch (e) {
                    mark(`PHASE-ERROR ${line} ${e && e.message ? e.message : e}`);
                }
            }
        }
        await sleep(200);
    }
}

main().catch((e) => { mark('FATAL ' + (e && e.stack ? e.stack : e)); process.exit(1); });

