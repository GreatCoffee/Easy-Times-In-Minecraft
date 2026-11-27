#!/usr/bin/env node
/*
 * gen-window.js — 判窗脚本骨架生成器（B-70US）
 *
 * 每个窗口脚本过去都是复制上一份再删（f11..f19 已 25 份）。脚手架已抽成 lib/harness.js，
 * 但「stage + cfg 段名 + 每臂驱动 + 断言」仍靠手写；删漏一处就是运行时 ReferenceError
 * （B-B70TW-3：迁移把 fs/path 的 require 一起删了）。
 *
 * 用法：
 *   node testharness/tools/gen-window.js --name f20-b71 --batch B-71 \
 *        --faces C:141,C:147 --channels MountLog --out testharness/player/f20-b71-smoke.js
 *
 * 选项：--stage "gamemode=1;difficulty=2;tp=0.5,130,0.5"
 *       --cfg "combat:blockDebugLog,blocks:sparkR196"
 *       --dry-run（只打印）  --force（覆盖已有文件）
 *
 * 生成的骨架**故意是红的**：每个 W 臂写 `res.wN = false; // TODO`，填完判据才会绿。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}

const REPO = path.resolve(arg('--repo', process.env.WINDOW_REPO || path.join(__dirname, '..', '..')));
const NAME = arg('--name', null);
const BATCH = arg('--batch', null);
const FACES = (arg('--faces', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const CHANNELS = (arg('--channels', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = path.resolve(arg('--out', NAME ? path.join(REPO, 'testharness', 'player', NAME + '-smoke.js') : ''));
const STAGE = arg('--stage', 'gamemode=1;difficulty=2;tp=0.5,130,0.5');
const CFG = (arg('--cfg', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const DRY = argv.includes('--dry-run');
const FORCE = argv.includes('--force');

if (!NAME || !BATCH) {
    console.log('usage: node gen-window.js --name f20-b71 --batch B-71 [--faces C:141,C:147] [--channels MountLog] [--out path]');
    process.exit(2);
}
if (!/^[a-z][a-z0-9-]*$/.test(NAME)) {
    console.log('[WindowLog] bad --name (lowercase letters, digits, dash): ' + NAME);
    process.exit(2);
}
if (fs.existsSync(OUT) && !FORCE && !DRY) {
    console.log('[WindowLog] exists, refusing to overwrite: ' + path.relative(REPO, OUT) + ' (use --force)');
    process.exit(1);
}

function parseStage(s) {
    const out = {};
    for (const part of s.split(';').map((x) => x.trim()).filter(Boolean)) {
        const [k, v] = part.split('=');
        if (k === 'tp') {
            out.tp = v.split(',').map(Number);
        } else if (k === 'difficulty' || k === 'gamemode') {
            out[k] = Number(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

const stageSrc = JSON.stringify(parseStage(STAGE)).replace(/"(\w+)":/g, '$1: ');

const arms = (FACES.length ? FACES : ['<face>']).map((f, i) => {
    const n = i + 1;
    return `  // ---- W${n} ${f} ----
  // 驱动：/etest …（见 docs/PIPELINE.md §2）
  // 判据：${CHANNELS.length ? CHANNELS.map((c) => '[' + c + ']').join(' / ') : '[XxxLog]'} 行，逐字段断言
  res.w${n} = false; // TODO: 填驱动与断言
`;
}).join('\n');

const cfgLine = CFG.length
    ? `cfg: [${CFG.map((c) => "'" + c + "'").join(', ')}],`
    : "cfg: [/* TODO: 'section:key'，段名以 ETIMConfig.java 为准 */],";

const staticArm = CHANNELS.length
    ? `  const srcFiles = walk(path.join(L.ROOT, 'src', 'main', 'java'), []);
  res.static = [${CHANNELS.map((c) => "'" + c + "'").join(', ')}]
    .every((c) => srcFiles.some((p) => fs.readFileSync(p, 'utf8').includes('[' + c + ']')));`
    : '  res.static = false; // TODO: 静态检查（文件 / 配置 / 通道）';

const text = `#!/usr/bin/env node
/**
 * ${NAME} — ${BATCH} 判窗（由 gen-window.js 生成；填完判据后删掉这一行）
 *
 * 面：${FACES.join(', ') || '（待填）'}
 * 通道：${CHANNELS.join(', ') || '（待填）'}
 */
'use strict';

const fs = require('fs');
const path = require('path');
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');

/** 递归列出 .java（静态臂用）。 */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, out);
    } else if (e.name.endsWith('.java')) {
      out.push(p);
    }
  }
  return out;
}

const A = 'ETIM_F7';
const RUN = process.env.RUN || '${NAME}-r1';

async function main() {
  const h = H.create({
    run: RUN,
    world: 'w-' + RUN + '-v1',
    bot: A,
    stage: ${stageSrc},
    ${cfgLine}
  });
  const { cmd, mark, slice, waitRow } = h;
  const res = {};

  h.stampPin();
  await h.boot(RUN);
  await h.join();

${arms}
${staticArm}

  await h.stop();
  h.finish(res);
}

h.guard(main);
`;

if (DRY) {
    console.log(text);
    process.exit(0);
}

fs.writeFileSync(OUT, text, 'utf8');
console.log('[WindowLog] wrote ' + path.relative(REPO, OUT) + ' arms=' + (FACES.length || 1)
    + ' channels=' + (CHANNELS.join(',') || '-') + ' (skeleton is red by design)');
