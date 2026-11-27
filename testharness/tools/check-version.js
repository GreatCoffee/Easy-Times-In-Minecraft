#!/usr/bin/env node
// Release tag vs gradle.properties checker.
//
//   node testharness/tools/check-version.js --tag 1.2.3
//   GITHUB_REF_NAME=1.2.3 node testharness/tools/check-version.js
//
// Exit 0 = tag matches mod_version, 1 = mismatch or malformed tag, 2 = usage.
const fs = require('fs');
const path = require('path');

const ROOT = process.env.VERSION_REPO || path.resolve(__dirname, '..', '..');
const PROPS = path.join(ROOT, 'gradle.properties');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const tag = arg('--tag') || process.env.GITHUB_REF_NAME || process.env.ETIM_TAG;
if (!tag) {
  console.error('[VersionLog] usage: --tag <x.y.z> (or GITHUB_REF_NAME)');
  process.exit(2);
}

const text = fs.readFileSync(PROPS, 'utf8');
const m = /^mod_version\s*=\s*(\S+)\s*$/m.exec(text);
if (!m) {
  console.error('[VersionLog] mod_version not found in gradle.properties');
  process.exit(1);
}
const modVersion = m[1];
const tagOk = /^\d+\.\d+\.\d+$/.test(tag);

console.log(`[VersionLog] tag=${tag} mod_version=${modVersion} tagOk=${tagOk} match=${tag === modVersion}`);
if (!tagOk) {
  console.error('[VersionLog] verdict=FAIL reason=tag-not-x.y.z');
  process.exit(1);
}
if (tag !== modVersion) {
  console.error('[VersionLog] verdict=FAIL reason=tag-mod_version-mismatch');
  process.exit(1);
}
console.log('[VersionLog] verdict=PASS');
