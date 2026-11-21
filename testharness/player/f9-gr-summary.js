#!/usr/bin/env node
/* f9-gr-summary.js - compact dump of the W-B9 evidence for report writing. */
'use strict';
const fs = require('fs');
const p = process.argv[2] || 'testharness/build-logs/f9-gr-verify-evidence.json';
const e = JSON.parse(fs.readFileSync(p, 'utf8'));
const j = (x) => JSON.stringify(x);
console.log('head', e.head.slice(0, 7), e.headOk, 'pins', j({ r: e.pins.rel.ok, d: e.pins.dev.ok, s: e.pins.src.ok }), 'mk', e.mk.ok);
console.log('cfgBefore', j(e.cfgBefore));
console.log('boots', j(e.boots));
console.log('stops', j(e.stops.map((s) => ({ n: s.n, exit: s.exitCode, build: s.build, counts: s.counts }))));
console.log('R0', j(e.arms.R0));
console.log('R1', j({ rows: e.arms.R1 && e.arms.R1.rows, blv: e.arms.R1 && e.arms.R1.blv, window: e.arms.R1 && e.arms.R1.window, pos: e.arms.R1 && e.arms.R1.posSeen, block: e.arms.R1 && e.arms.R1.block }));
console.log('R2', j({ gate: e.arms.R2 && e.arms.R2.gateRows, rate: e.arms.R2 && e.arms.R2.rateRows, block: e.arms.R2 && e.arms.R2.block, sample: e.arms.R2 && e.arms.R2.rateSample }));
console.log('R3', j(e.arms.R3));
console.log('R4', j(e.arms.R4));
console.log('R5', j(e.arms.R5));
console.log('R5swamp', j(e.arms.R5swamp));
console.log('R6', j({ pumpkin: { rows: e.arms.R6 && e.arms.R6.pumpkin.rows, block: e.arms.R6 && e.arms.R6.pumpkin.block, sample: e.arms.R6 && e.arms.R6.pumpkin.sample }, melon: e.arms.R6 && e.arms.R6.melon, wheat: e.arms.R6 && e.arms.R6.wheat }));
console.log('R7', j(e.arms.R7));
console.log('R8off', j(e.arms.R8off));
console.log('R8on', j(e.arms.R8on));
console.log('R9', j({ dry: e.arms.R9.dryGate, roll: e.arms.R9.roll && e.arms.R9.roll.parsed, tokens: e.arms.R9.tokenCount, errors: e.arms.R9.tokenErrors, alive: e.arms.R9.serverAlive, channels: e.arms.R9.channelRows, gateDryTotal: e.arms.R9.gateDryTotal, rateTotal: e.arms.R9.rateTotal }));
console.log('R10', j(e.arms.R10));
console.log('closure', j({ cfg: e.cfgAfter, obf: e.obfAfter, props: e.propsAfter, crash: [e.crashBefore, e.crashAfter], port: [e.portBefore, e.portAfter], head: e.headAfter, commits: e.commitsDuring, worlds: e.worldsLeft }));
