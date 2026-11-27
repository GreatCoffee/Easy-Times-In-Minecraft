#!/usr/bin/env node
/** f7-wb-analyze.js - summarize the two W-FM evidence files (read-only). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const read = (f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
const main = read('f7-wb-main-evidence.json');
const moist = read('f7-wb-moist-evidence.json');
const A = {};
A.pins = { head: main.head, headOk: main.headOk, jars: [main.pins.rel.ok, main.pins.dev.ok, main.pins.src.ok],
  mk: main.mk.ok, pinsAfter: main.pinsAfter && { jars: [main.pinsAfter.rel.ok, main.pinsAfter.dev.ok, main.pinsAfter.src.ok], mk: main.pinsAfter.mk.ok } };
A.boot = { main: main.boot, mixinFail: main.mixinFail, ids: main.ids.ids, moist: moist.boot, moistMixin: moist.mixinFail };
A.reg = main.checks.reg;
A.zero = main.zeroChannels;
A.counts = main.rowCounts;
A.dryGate = main.checks.dryGate;
A.decay = main.checks.decay;
A.bucket = main.checks.bucket;
A.bucketFull = main.checks.bucketFull;
A.bottle = main.checks.bottle;
A.bottleFull = main.checks.bottleFull;
A.manureFarm = main.checks.manureFarm;
A.manureFarmSecond = main.checks.manureFarmSecond;
A.manureCrop = main.checks.manureCrop;
A.red = main.checks.redMushroom;
A.brown = main.checks.brownMushroom;
A.mycelium = main.checks.myceliumTop;
A.trample = main.checks.trample;
A.farm1 = { tillage: main.checks.tillage, harvest: main.checks.harvest, growth: main.checks.growth };
A.rain = moist.checks.rain;
A.dry = moist.checks.dry;
A.plots = moist.plots;
A.close = { main: { cfg: main.cfgAfter, obf: main.obfAfter, props: main.propsAfter, port: main.portAfter, crash: [main.crashBefore, main.crashAfter], stop: main.stop, build: main.buildSuccessful },
  moist: { cfg: moist.cfgAfter, props: moist.propsAfter, port: moist.portAfter, stop: moist.stop, build: moist.buildSuccessful } };
fs.writeFileSync(path.join(OUT, 'f7-wb-analysis.json'), JSON.stringify(A, null, 1) + '\n', 'utf8');
console.log(JSON.stringify(A, null, 1));
