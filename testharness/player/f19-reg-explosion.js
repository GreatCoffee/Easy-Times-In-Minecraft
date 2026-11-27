#!/usr/bin/env node
/**
 * f19-reg-explosion — B-70UP 回归窗（爆炸链纯函数化后的接线证明）。
 *
 *   W1 DropLog   石头被炸 → boomdrop block=minecraft:stone drop=minecraft:cobblestone
 *   W2 DropLog   同一格的 xpcheck 行（base=0 drops=n xp=0 exempt=false）
 *   W3 ExplosionLog  半径内的僵尸 → dmg entity=… dist=… eff=… density=… damage=
 *   W4 静态       ExplosionGates 被两个调用方引用，且单测文件在位
 *
 * 数值正确性由 ExplosionGatesTest（22 例）保证；本窗只证明「世界里的接线还在」。
 * 判据只认服务端日志；不操作客户端。
 */
const fs = require('fs');
const path = require('path');
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-reg-exp-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 1,
    difficulty: 2,
    tp: [8.5, 130, 8.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: true, doMobLoot: false,
      naturalRegeneration: false, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    fill: ['time set 6000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 133 15 minecraft:air'],
  },
  cfg: ['blocks:explosionR196', 'blocks:dropR196', 'mobs:mobDebugLog'],
});
const { cmd, mark, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DROP_RE = /\[DropLog\] boomdrop block=(\S+) drop=(\S+) count=(\d+) chance=(\S+)/;
const XP_RE = /\[DropLog\] xpcheck block=(\S+) base=(-?\d+) drops=(\d+) xp=(\d+) exempt=(\S+)/;
const DMG_RE = /\[ExplosionLog\] dmg entity=(\S+) dist=(\S+) eff=(\S+) density=(\S+) damage=(\S+) sizef=(\S+)/;

async function main() {
  h.stampPin();
  await h.boot('b70up-' + RUN + '-b1');
  await h.join();

  const res = {};

  // ---- W1/W2: 石头墙被炸 → 圆石 + xpcheck ----
  await cmd('fill 4 129 4 4 131 4 minecraft:stone', 200);
  const from = mark();
  await cmd('summon minecraft:tnt 4.5 130 6.5 {Fuse:20s}', 300);
  await sleep(3500);

  const stoneDrops = logLines().slice(from).map((s) => DROP_RE.exec(s)).filter(Boolean)
    .filter((m) => m[1] === 'minecraft:stone' && m[2] === 'minecraft:cobblestone');
  const xps = logLines().slice(from).map((s) => XP_RE.exec(s)).filter(Boolean)
    .filter((m) => m[1] === 'minecraft:stone');

  res.w1 = stoneDrops.length > 0;
  res.w2 = xps.length > 0 && xps.every((m) => m[2] === '0' && m[4] === '0' && m[5] === 'false');

  // ---- W3: 半径内的实体伤害行 ----
  const from2 = mark();
  await cmd('summon minecraft:zombie 6.5 130 6.5 {NoAI:1b,PersistenceRequired:1b}', 300);
  await cmd('summon minecraft:tnt 6.5 130 8.5 {Fuse:20s}', 300);
  await sleep(3500);
  const dmg = logLines().slice(from2).map((s) => DMG_RE.exec(s)).filter(Boolean)
    .filter((m) => m[1] === 'EntityZombie');
  res.w3 = dmg.length > 0 && dmg.every((m) => Number(m[5]) >= 0);

  // ---- W4: 静态接线 ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const gates = path.join(root, 'world', 'ExplosionGates.java');
  const explosion = path.join(root, 'world', 'ETIMExplosion.java');
  const dropsSrc = path.join(root, 'item', 'ETIMBlockDrops.java');
  const testSrc = path.join(L.ROOT, 'src', 'test', 'java', 'io', 'github', 'etim', 'etim', 'world', 'ExplosionGatesTest.java');
  res.w4 = fs.existsSync(gates)
    && fs.existsSync(testSrc)
    && /ExplosionGates\./.test(fs.readFileSync(explosion, 'utf8'))
    && /ExplosionGates\./.test(fs.readFileSync(dropsSrc, 'utf8'))
    && !/applyChanceModifiers/.test(fs.readFileSync(dropsSrc, 'utf8'));

  await h.stop();
  h.finish(res);
}

h.guard(main);
