#!/usr/bin/env node
/**
 * f7-wb-scan.js - biome coordinate scan for the W-FM moisture window.
 * Reads the SERVER-SENT chunk biome array through the bot world (no chat,
 * no GUI, no config flip). Teleports a physics-off bot on a coarse grid and
 * records the biome at each sample; picks plains / desert / swamp / cold.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-scan';
const WORLD = 'f7wb';
const GRID = parseInt(process.env.GRID || '256', 10);
const RADIUS = parseInt(process.env.RADIUS || '1280', 10);

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), samples: [], found: {} };
  const cfgKeysBefore = L.cfgKeys(L.CFG);
  ev.cfgBefore = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(cfgKeysBefore).length };
  const propsBefore = fs.readFileSync(L.PROPS);
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  ev.propsBefore = { bytes: propsBefore.length, level: L.getProp(propsBefore.toString('utf8'), 'level-name'), seed: L.getProp(propsBefore.toString('utf8'), 'level-seed') };
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(L.PIN.head);
  ev.jars = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  L.log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.jars.rel.ok, ev.jars.dev.ok, ev.jars.src.ok].join(',') + ' mk=' + ev.mk.ok);

  const byId = L.biomeTable();
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixinFail=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    const p0 = bot.entity.position;
    ev.spawn = { x: Math.floor(p0.x), y: Math.floor(p0.y), z: Math.floor(p0.z) };
    L.log('spawn', JSON.stringify(ev.spawn));

    const cats = {
      plains: (b) => b.temperature >= 0.7 && b.temperature <= 0.9 && b.rainfall <= 0.5,
      desert: (b) => b.temperature >= 1.4,
      swamp: (b) => b.rainfall > 0.85 && b.temperature >= 0.7 && b.temperature <= 0.9,
      cold: (b) => b.temperature <= 0.15,
    };
    const have = () => Object.keys(cats).filter((k) => ev.found[k]);
    const from = ev.spawn;
    const n = Math.floor(RADIUS / GRID);
    outer:
    for (let dz = -n; dz <= n; dz++) {
      for (let dx = -n; dx <= n; dx++) {
        const x = from.x + dx * GRID, z = from.z + dz * GRID;
        await L.tp(srv, x, 100, z, { bot: bot.username, wait: 520 });
        let id = null;
        for (let k = 0; k < 6; k++) {
          try {
            const got = await bot.world.getBiome(new Vec3(x, 64, z));
            if (got !== null && got !== undefined) { id = (typeof got === 'object' && got.id !== undefined) ? got.id : got; break; }
          } catch (e) { /* chunk not ready */ }
          await L.sleep(180);
        }
        const b = byId[id];
        const row = { x, z, id, name: b ? b.name : null, temp: b ? b.temperature : null, rain: b ? b.rainfall : null };
        ev.samples.push(row);
        L.log('scan', JSON.stringify(row));
        for (const k of Object.keys(cats)) {
          if (!ev.found[k] && b && cats[k](b)) { ev.found[k] = { x, z, id, name: b.name, temp: b.temperature, rain: b.rainfall }; L.log('found', k + ' ' + JSON.stringify(ev.found[k])); }
        }
        if (have().length === 4) break outer;
      }
    }
    ev.have = have();
    L.log('scan-done', 'have=' + JSON.stringify(ev.have) + ' found=' + JSON.stringify(ev.found));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.portAfter = L.netstatListen(L.PORT);
    ev.crashBefore = ev.crashBefore === undefined ? null : ev.crashBefore;
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    L.log('done', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { L.log('FATAL', (e && e.stack) || e); process.exit(1); });
