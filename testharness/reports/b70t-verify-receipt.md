# B-70T 独立判窗 r1（工装等价性窗口）

判定方：会话七（独立执行）。本窗由我起服、我读日志、我判；主会话代跑的 r21 结果未采信。
窗口编号 B-70T 待用户确认；本文件按 `b70t-verify-receipt.md` 落盘。

---

## §0 钉值与环境

| 项 | 实测 | 期望 | 结论 |
|---|---|---|---|
| HEAD | `3418abe0e4c0388438ce9eb422f5ecd69227040d` | `3418abe` | 对 |
| 工作树 | 仅 `?? .worktrees/` | 仅此一项 | 对 |
| release 字节 | 1,556,495 B | 1,556,495 B | 对 |
| release SHA-256 | `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2` | 同 | 对 |
| dev 字节 | 1,528,052 B | 1,528,052 B | 对 |
| sources 字节 | 1,365,488 B | 1,365,488 B | 对 |
| MK | refmap 114 / 282 / 564，manifest 115 / 10，ok=true | 同 | 对 |
| jar mtime | `2026-11-22T13:30:11.035Z` | 同 | 对（0 rebuild） |
| cfg | 56,025 B `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9` | 同 | 对 |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同 | 对 |
| port 25565 | 0 | 0 | 对 |
| crash 目录 | 0 | 0 | 对 |
| 涉及文件 | `testharness/player/lib/harness.js` 9,588 B；`testharness/player/f11-b69-smoke.js` 23,581 B | — | — |

`check-harness.js` 实测：`[HarnessLog] files=448 onHarness=1 ownBoot=109 ownStop=100 ownCmd=86 ownMark=15 ownSlice=42 ownWaitRow=14 ownPin=70 ownDone=41 offenders=146 [local]`，`on harness: f11-b69-smoke.js` —— 与账册（onHarness=1 / offenders=146）一致。

---

## §1 运行与终判

命令：`RUN=b70t-r1 node testharness/player/f11-b69-smoke.js`（后台起服，30 s 巡检）。
- 世界：`run/w-b69-b70t-r1-v1`（32 文件 5,177,140 B）保留。
- tee：`testharness/build-logs/b69-b70t-r1-b1.out`（542,778 B / 3,813 行；`:2388` `Done (5.366s)!`、`:3820` `BUILD SUCCESSFUL in 1m 47s`）。
- stdout：`build-logs/b70t-r1-stdout.out`。

```
[PIN] sha=37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2 shaOk=true size=1556495 sizeOk=true mkOk=true ok=true
[cfg] b69-b70t-r1-b1 blockDebugLog=true sparkR196=true mountedR196=true
[cfg] absent b69-b70t-r1-b1 sparkR196 mountedR196 (key not on disk yet; server default stands)
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

进程 exit 0。两行 `[cfg]` 与工单预期逐字一致。

---

## §2 锚点对位（与 B-69 r20 同集合）

| 锚点 | 本窗证据（`b69-b70t-r1-b1.out`） |
|---|---|
| `trapdoor-thin-snow` … reject | `:3733` `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6` |
| `sign-face` … snow_layer … allow | `:3740` `[MountLog] rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9` |
| `trapdoor-shape-defer` … snow_layer … allow | `:3743` `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9` |
| `trapdoor-vertical` face=up | `:3748` `[MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `trapdoor-vertical` face=down | `:3751` `[MountLog] rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `tilled-field` … farmland … allow（牌） | `:3720` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow pos=11,130,4` |
| `tilled-field` … farmland … allow（火把） | `:3493` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4`（另有 `:3494-3496` 三条 `tilled-field-grant`） |
| `mayplace block=` 计数 | **22**（与工单要求一致） |
| `[MountLog] rule=` 总行 | 44 |

规则名集合与 r20 完全一致（25 个名字，`Compare-Object` 差异 0）：
`front-face, geometry, leaves, never-hides, sign-face, sign-flat-top, sign-not-flat, skull-cloth, skull-face, skull-fence-top, skull-not-flat, sponge, tilled-field, tilled-field-grant, torch-fence-top, torch-flat-top, torch-slab-bottom, torch-snow-side, torch-stairs-back, trapdoor-material, trapdoor-shape, trapdoor-shape-defer, trapdoor-thin-snow, trapdoor-vertical, trapdoor-wrong-half`。

W1/W2/W4 形状核对（与 r20 逐键一致）：
- `[W1]` 键 `["snuff","planks","netherrack","pass"]`；`snuff.pos.block=minecraft:air`、`planks/netherrack` 见 `rows` 与 `pos`。
- `[W2]` 键 `["rows","portal","pos","pass"]`；`portal="false"`、`pos.block=minecraft:fire`、`pass=true`。
- `[W4]` 键 `["srcOk","flintOk","mixinOk","regOk","cfgOk","cmdOk","assetsOk","langOk","rulesOk","pass"]`，全 true。
- `[W3]` 键共 **42** 个，与 r20 相比缺失 0、新增 0：
  `stone, leaves, jukebox, sponge, farmland, granted, fence, wool, spawnerTop, furnaceFront, furnaceBack, dispenserFront, stoneSide, spawnerSide, stairsBack, slabSide, snowSide, enchBottom, skullFenceTop, skullWool, skullSpawnerSide, trapdoorDirt, trapdoorSlab, skullSpawnerReal, skullStoneReal, trapdoorFarmlandReal, trapdoorSlabReal, trapdoorWrongHalfReal, skullSlabSideReal, signFurnaceFront, skullSpongeSide, signFarmland, trapdoorThinSnow, signFullSnowSide, trapdoorDeepSnowSide, trapdoorStoneTop, trapdoorStoneBottom, stoneSign, leavesSign, bottomSlabSign, topSlabSign, pass`。

---

## §3 harness 只读复核（逐段）

复核对象：`testharness/player/lib/harness.js`（237 行）。对照基线：`git show HEAD~1:testharness/player/f11-b69-smoke.js`（旧脚手架 27,436 B，新 23,581 B）。

### 3.1 差异面（`git diff HEAD~1 HEAD`）
只有一个 hunk 组：`f11-b69-smoke.js:13` 加 `require('./lib/harness.js')`；删旧 `bs/cmd/logLines/slice/mark/waitRow/stampPin/startBoot/stopBoot/join`（旧 :18-112）；新增 `H.create({...})` 配置块（新 :24-36）；`main()` 里 `stampPin/startBoot/join` 改 `h.stampPin/h.boot/h.join`；尾部 `stopBoot + 手写 [done] + 手写 exit` 改 `h.stop() + h.finish(res)`；`main().catch(...)` 改 `h.guard(main)`。
**判臂与断言区（旧 :114 之后 → 新 :39 之后）零 diff** —— 工单「判臂与断言一行未改」成立。

### 3.2 `finish(res)`（harness.js:211-222）
```js
const bad = Object.keys(res).filter((k) => !res[k]);
const out = Object.assign({ run, pin: h.pinOk }, res, {
    stops: h.stops.filter((s) => !(s && s.exitCode === 0)).length,
    crashes: L.crashCount(),
    pass: h.pinOk && bad.length === 0,
    bad: bad.length, badKeys: bad,
}, extra || {});
process.exit(out.pass && out.stops === 0 ? 0 : 2);
```
与旧尾部逐项等价：旧 `stops: stops.map(s => (s.exitCode===0)?0:1).reduce(...)` ＝ 非零退出计数；`pass = pinOk && bad.length===0`；`exit = pass && stops===0 ? 0 : 2`。**无吞错路径。**
唯一差异：新增第 2 参 `extra`，其键在 `Object.assign` 最后合并，理论上可覆盖 `pass/bad/stops`。本批未使用该参数 → 记为 C-B70T-1（潜在面，未触发）。

### 3.3 `guard(fn)`（harness.js:225-231）
```js
Promise.resolve().then(fn).catch(async (e) => {
    console.error('[fatal]', (e && e.stack) || e);
    try { await stop(); } catch (x) { /* noop */ }
    process.exit(1);
});
```
异常仍打 `[fatal]`、仍 `stop()`、仍 `exit 1`；被 try 包住的只有 `stop()` 本身（旧版同样如此）。**未吞错。** 差异：`stop()` 在 `h.srv == null` 时返回 `{exitCode:0}` 而不抛（旧 `stopBoot()` 会在 `srv.stop()` 处抛、被外层 catch 吃掉），属更安全，不影响判定。

### 3.4 `cmd()` / `bs()`（harness.js:28-30, 85-88）
`bs()` 正则与旧脚本**逐字符相同**：`/([A-Za-z0-9_:.]+)\[(?:moisture|age)=(\d+)\]/g → '$1 $2'`；`cmd` 默认等待同样 `wait == null ? 250 : wait`。**等价。**

### 3.5 `waitRow()`（harness.js:91-102）
单正则分支与旧实现等价（`slice(from).map(s => re.exec(s)).filter(Boolean)`，命中即返回，无命中返回 `[]`）。新增数组分支：
```js
const res = Array.isArray(re) ? re : [re];
const hit = slice(from).map((s) => res.map((r) => r.exec(s)).find(Boolean)).filter(Boolean);
if (hit.length) return hit;
```
语义为「**任一**正则命中即返回」，不是「全部命中才返回」。本批 `waitRow` 只用单正则（`f11-b69-smoke.js:46` `waitRow(PROBE_RE, from, 6000)`），故本窗不受影响；数组语义对后续迁移是可踩的坑 → C-B70T-2。

### 3.6 `boot()/stop()`（harness.js:121-184）
- 快照：`propsBefore`/`cfgBefore` 在任何写盘之前读取（:123-124）；`stop()` 用同一份快照还原（:180-181），**还原完整**（顺序 props→cfg 与旧一致）。
- props：`allow-flight=true` 由脚本 `opts.props` 显式传入（新 :29），`level-name` 由 `world` 注入（:131-133），与旧 `:57-58` 等价。
- cfg：旧脚本用三个 `.replace()`，键不存在时**静默不写**；新实现同样不写，但把缺失键收集进 `absent` 并打 `[cfg] absent …` 行（:136-147, :161-163）。
  ⇒ **本窗两键 `sparkR196` / `mountedR196` 在磁盘上不存在，运行时按代码默认 true 生效**（`ETIMConfig.java:682/684` 默认 true）。判据未被弱化（W1/W2/W3 全绿证明三旗在运行时确为开），但**「缺键即放行」存在未来风险**：若某天默认翻成 false，窗口会静默跑在关态而仍可读绿 → C-B70T-3（附建议：把 `[cfg] absent` 升级为硬失败，或对 `absent` 键显式插入 `=true`）。
- 端口排空/重试：`:148-169` 与旧 `:63-79` 同构（36×5 s、3 次、`waitFor(/Done \(/, 180000)`），抛错文本不同但语义相同。

### 3.7 `join()`（harness.js:187-208）
顺序：`op` → `gamemode`（默认 0）→ 8 条 gamerule（`DEFAULT_RULES`，:33-36，键值集合与旧 :100-103 完全一致）→ `difficulty 2` → `weather clear` → `time set 6000` → `tp` → 两条 `fill`（:202-207）。
与旧 `:93-112` 逐项等价；`setblock`/`fill` 顺序遵守 C-B68-2（先 tp 后 fill）。唯一非等价项：空气 fill 等待 900 ms（旧 600 ms），加长等待只会更稳，**不构成判据弱化**。

### 3.8 其余
- `stampPin()`（:110-118）：`L.sha256` 本身返回大写 hex（`f7-wb-lib.js:40` `.digest('hex').toUpperCase()`），旧脚本的额外 `.toUpperCase()` 是冗余，**等价**；`ok = sha && size && mk.ok` 三件与旧一致。
- `logLines()/mark()/slice()`：与旧逐字等价，读 `h.srv.logPath`，异常返回 `[]`。

### 3.9 复核结论
未发现把失败吞成通过的路径。三条 C 级为潜在面/风格面，不构成本窗阻断：
- **C-B70T-1** `finish(res, extra)` 的 `extra` 可覆盖 `pass/bad/stops`（本批未用）。
- **C-B70T-2** `waitRow` 数组入参为「任一命中」语义，非「全部命中」。
- **C-B70T-3** `boot()` 对磁盘缺键采用「按默认放行」，仅打 `[cfg] absent`；建议后续升级为硬失败或显式写入。

---

## §4 环境收口

| 项 | 起 | 收 | 结论 |
|---|---|---|---|
| cfg SHA | `0D9D2C01…6E7D28A9` | 同 | 一致 |
| props SHA | `6784C3ED…2F1EB9` | 同 | 一致（level-name 已还原 `w-b30v`、allow-flight=false） |
| port 25565 | 0 | 0 | 一致 |
| crash 目录 | 0 | 0 | 一致 |
| HEAD | `3418abe` | `3418abe` | 窗内 0 提交 |
| jar mtime | `2026-11-22T13:30:11.035Z` | 同 | 0 rebuild |
| 世界 | — | `run/w-b69-b70t-r1-v1`（32 文件 5,177,140 B） | 保留 |

客户端未操作；未改产品码、未改账册。

---

## §5 终判

**独立通过**（[done] w1–w4 全 true、pin=true、stops=0、crashes=0、bad=0、exit 0；钉值全对且 0 rebuild；§2 锚点 8/8 对位且规则名集合与 r20 差异 0、W3 键集合 42/42 无损；§3 harness 未发现吞错路径，三条 C 级为潜在面）。A 级 0、B 级 0、C 级 3（C-B70T-1/2/3）。

- 字节规格：12237 B / 164 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

## §r2 回归窗（C-B70T-1/-2/-3 修复确认，HEAD c7169ef）

### §r2.0 钉值与变更面

| 项 | 实测 | 期望 | 结论 |
|---|---|---|---|
| HEAD | `c7169ef7a81f574f67cd2c2ad8de688de97c3aca` | `c7169ef` | 对 |
| 工作树 | `?? .worktrees/`、`?? testharness/reports/b70t-verify-receipt.md` | 同 | 对 |
| release | 1,556,495 B `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2` | 同 | 对 |
| dev / sources | 1,528,052 `623F3397…0CF06036` / 1,365,488 `79CA55A2…5DAC46` | 同 | 对 |
| MK | 114 / 282 / 564 ＋ 115 / 10，ok=true | 同 | 对 |
| jar mtime | `2026-11-22T13:30:11.035Z` | 不变 | 对（0 rebuild） |

`git diff --stat 3418abe c7169ef`：`f11-b69-smoke.js` 2 行（±1）、`lib/README.md` 5 行、`lib/harness.js` 73 行。
`git diff 3418abe c7169ef -- testharness/player/f11-b69-smoke.js` **只有一行**：
```diff
-  cfg: ['blockDebugLog', 'sparkR196', 'mountedR196'],
+  cfg: ['combat:blockDebugLog', 'blocks:sparkR196', 'blocks:mountedR196'],
```

### §r2.1 三条 C 的源码侧证据（`testharness/player/lib/harness.js`）

- **C-B70T-1 闭环**：`harness.js:244` `function finish(res) {` —— 形参只有一个；`:250-256` 的 `Object.assign(...)` 末尾不再有 `extra`，无可覆盖口。
- **C-B70T-2 闭环**：`harness.js:115` `async function waitRow(re, from, ms) {`、`:118` `const hit = slice(from).map((s) => re.exec(s)).filter(Boolean);` —— 全函数无 `Array.isArray`、无数组分支；`README.md` 新增一行「`waitRow()` 只接单个 RegExp」。
  （注：`harness.js:49` 确有 `Array.isArray(item)`，但它在 `cfgPair` 里，服务于 `cfg: [['blocks','k']]` 的元组写法，与 `waitRow` 无关。）
- **C-B70T-3 闭环**：`harness.js:33` `function insertCfgEntry(text, section, key, value)`、`:48` `function cfgPair(item)`、`:156-170` 逐键「有则原位改 `B:key=true`，无则插入该 section」、`:183-196` 起服后回读 `^\s+[A-Z]:key=(.*)$`，非 `true` 即 `throw new Error('cfg not forced after boot: …')`（`:194`）；`[cfg] absent` 行整体删除（`README.md` 同步改为「不再按默认放行」）。
- section 名与产品注册一致（只读核对 `src/main/java/io/github/etim/etim/ETIMConfig.java`）：`:1417` `config.getBoolean("blockDebugLog", "combat", false, …)`；`:1529` `sparkR196 … "blocks"`；`:1532` `mountedR196 … "blocks"`。

### §r2.2 运行与终判（`RUN=b70t-r2`，EXIT=0）

```
[PIN] sha=37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2 shaOk=true size=1556495 sizeOk=true mkOk=true ok=true
[cfg] b69-b70t-r2-b1 blockDebugLog=true sparkR196=true mountedR196=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

- `[cfg] absent` 行计数 **0**、`[fatal]` 计数 0、`[cfg]` 行计数 1（工单「出现 absent 即判 FAIL」未触发）。
- tee：`testharness/build-logs/b69-b70t-r2-b1.out`（542,989 B / 3,813 行；`:2390` `Done (5.647s)!`、`:3821` `BUILD SUCCESSFUL in 1m 41s`）。
- 世界：`run/w-b69-b70t-r2-v1`（29 文件 5,138,791 B）保留。

### §r2.3 窗内 cfg 取证与窗后还原

窗内（服务端运行中，直接读 `run/config/etim.cfg`，文件长 55,186 B）：
```
3: blocks {
12:     B:sparkR196=true
13:     B:mountedR196=true
17: combat {
25:     B:blockDebugLog=true
```
⇒ 两个新键确实被插入 `blocks` section 内部（该 build 之前磁盘无此键），`blockDebugLog` 在其所属 `combat` section 内，三者均为 `true`（强制成立，非「默认放行」）。

窗后（stop 还原）：cfg 回到 56,025 B / `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`（＝窗前值）；props 回到 `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

### §r2.4 锚点与集合对位（与 r1 同集合）

| 锚点 | 本窗证据（`b69-b70t-r2-b1.out`） |
|---|---|
| `trapdoor-thin-snow` reject | `:3736` `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6` |
| `sign-face` allow | `:3743` `[MountLog] rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9` |
| `trapdoor-shape-defer` allow | `:3746` `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9` |
| `trapdoor-vertical` face=up | `:3751` `[MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `trapdoor-vertical` face=down | `:3754` `[MountLog] rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `tilled-field`（牌） | `:3723` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow pos=11,130,4` |
| `tilled-field`（火把） | `:3495` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4` |
| `mayplace block=` 计数 | **22**（＝r1） |
| `[MountLog] rule=` 行数 | **44**（＝r1） |

- 规则名集合：25 个，与 r1 逐项相同（`Compare` 差异 0）。
- `[W3]` 键：42 个，与 r1 相比缺失 0、新增 0。
- `[W1]/[W2]/[W4]` 与 r1 同形（W2 `portal="false"`、`pos.block=minecraft:fire`；W4 十键全 true）。

### §r2.5 本轮新观察（潜在面，均未影响本窗）

- **C-B70T-4**：起服回读用 `^\s+[A-Z]:<key>=(.*)$` 全文件搜索，**与 section 无关** —— 若将来把 `section:` 前缀写错（键被插进别的 section），回读仍可能读到 `true` 而通过，而服务端按注册 category 读到的仍是默认值。本窗两个 section 名与 `ETIMConfig.java:1417/1529/1532` 一致、且窗内读盘已确认落位，故未触发。建议改为「在该 section 内回读」。
- **C-B70T-5**：`insertCfgEntry` 以 `section + ' {'` 找头、以「头之后第一个 `}` 行」找尾；1.12 的 `etim.cfg` 无嵌套块（已核 `run/config/etim.cfg` 无缩进 `}` 嵌套），故安全；若将来出现嵌套会早闭。记为文档面风险。

### §r2.6 终判

**独立通过**（[done] w1–w4 全 true、pin=true、stops=0、crashes=0、bad=0、exit 0；`[cfg] absent` 0 行；三条 C 源码侧与运行侧均闭环；锚点 8/8、mayplace 22、rule 44、规则名 25 差异 0、W3 键 42/42；钉值全对且 0 rebuild；cfg/props 起收同哈希）。A=0、B=0、C=2（新增 C-B70T-4/5，均为潜在面）。

- 字节规格：19133 B / 249 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

## §r3 回归窗（C-B70T-4/-5 修复确认，HEAD 5d50574）

### §r3.0 钉值与变更面

| 项 | 实测 | 期望 | 结论 |
|---|---|---|---|
| HEAD | `5d505748c68246352f6df9c0ef21c9ac004bfdee` | `5d50574` | 对 |
| 工作树 | `?? .worktrees/`、`?? testharness/reports/b70t-verify-receipt.md` | 同 | 对 |
| release | 1,556,495 B `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2` | 同 | 对 |
| dev / sources | `623F3397…0CF06036` / `79CA55A2…5DAC46` | 同 | 对 |
| MK | 114 / 282 / 564 ＋ 115 / 10，ok=true | 同 | 对 |
| jar mtime | `2026-11-22T13:30:11.035Z` | 不变 | 对（0 rebuild） |

`git diff --stat c7169ef 5d50574`：仅 `testharness/player/lib/harness.js`（86 行）与 `lib/README.md`（2 行）；`f11-b69-smoke.js` **零改动**（cfg 行仍是 `['combat:blockDebugLog', 'blocks:sparkR196', 'blocks:mountedR196']`）。

### §r3.1 源码侧证据（`testharness/player/lib/harness.js`）

- `:33` `function indentOf(line)` —— 行首空白宽度（tab 计 1）。
- `:43` `function sectionBounds(lines, section)`：`:44-47` 找 `s.trim() === section + ' {'` 的头行；`:49` `const indent = indentOf(lines[head]);`；`:50` `const end = lines.findIndex((s, i) => i > head && s.trim() === '}' && indentOf(s) === indent);` —— **收尾同时要求 `trim()==='}'` 与缩进等于头行缩进**，嵌套块更深 `}` 不会提前截断。
- `:57` `function readCfgEntry(text, section, key)`：`:59` 取 `[head, end]`；`:60` `for (let i = head + 1; i < end; i++)` —— **只在 section 的 `[head+1, end)` 内扫**；`:61` `const m = /^\s+([A-Z]):(\S+)=(.*)$/.exec(lines[i]);`，命中返回 `{type, value}`，否则 `null`。
- `:70` `function insertCfgEntry(...)`：`:72` 用 `sectionBounds` 取尾行；`:73` `const lead = ' '.repeat(indentOf(lines[end]) + 4);` 按 section 缩进生成新行；`:74` 插在尾行之前。
- `:79` `function setCfgEntry(...)`：`:82-85` 在 section 内遍历，命中同名键则校验类型必须为 `B`（否则 throw），`:86` 原位改写；未命中走 `insertCfgEntry`。
- `boot()` 强制段：`:206-212` `for (const [section, key] of forced) { bootCfg = setCfgEntry(bootCfg, section, key, 'true'); }` —— 不再有全文件正则。
- `boot()` 回读段：`:224-236` `for (const [section, key] of forced) { const hit = readCfgEntry(disk, section, key); … }`（`:228`），非 `true` 收集 `section:key=value|absent` 并 `:234` `throw new Error('cfg not forced after boot: …')`。
- 未回归项：`:163` `waitRow` 仍单正则无数组分支；`:284` `finish(res)` 仍单形参。
- `README.md` 增两句：section 内回读、按缩进找尾。

### §r3.2 负向自检（我自己跑的，未采信工单）

用 `testharness/player/lib/harness.js` 的导出函数直接跑（不启服）：

1. 工单原命令等价结果：
   `{"blocksA":{"type":"B","value":"true"},"tailY":{"type":"B","value":"true"},"wrong":null}`
   ⇒ `blocks.a` 读到 `B/true`、`tail.y` 读到 `true`、`tail.b`（嵌在 `blocks → sub {` 里）为 **null**，与预期一致。
2. 跨段同名键（把 `sparkR196` 塞进 `combat`，读 `blocks`）：
   `combat` 读 `{"type":"B","value":"true"}`；`blocks` 读 **null** ⇒ C-B70T-4 闭环。
3. 反向（插进 `blocks`，读 `combat`）：`blocks` 读 `true`、`combat` 读 **null** ⇒ 写入侧同样分区。
4. 嵌套收尾（`root { a { … } B:k=true }` 后插入 `z`）：插入落在 section 自身 `}` 之前（`… B:k=true\n    B:z=true\n}`），`k`/`z` 均可读 ⇒ C-B70T-5 的早闭风险已消除。
5. 追加探针（我自加）：若**同一 section 内**存在与顶层键同名的嵌套键且排在前面，`setCfgEntry` 会先改嵌套那一行（实测输出 `a { B:k=true }` 与顶层 `B:k=true` 同时为 true）。真实 `etim.cfg` 无嵌套块，故仅记为潜在面 C-B70T-6。

### §r3.3 运行与终判（`RUN=b70t-r3`，EXIT=0）

```
[PIN] sha=37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2 shaOk=true size=1556495 sizeOk=true mkOk=true ok=true
[cfg] b69-b70t-r3-b1 blockDebugLog=true sparkR196=true mountedR196=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

`[cfg] absent` 0 行、`[fatal]` 0 行。tee：`testharness/build-logs/b69-b70t-r3-b1.out`（542,894 B / 3,814 行；`:2388` `Done (5.487s)!`、`:3820` `BUILD SUCCESSFUL in 1m 34s`）。世界：`run/w-b69-b70t-r3-v1`（28 文件 5,118,318 B）保留。

### §r3.4 窗内 cfg 取证与窗后还原

窗内（服务端运行中读盘，55,186 B）：
```
3: blocks {
12:     B:sparkR196=true
13:     B:mountedR196=true
17: combat {
25:     B:blockDebugLog=true
```
窗后：cfg 回到 56,025 B / `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props 回到 `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

### §r3.5 锚点与集合（与 r2 同集合）

| 锚点 | 本窗证据（`b69-b70t-r3-b1.out`） |
|---|---|
| `trapdoor-thin-snow` reject | `:3735` `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6` |
| `sign-face` allow | `:3742` `[MountLog] rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9` |
| `trapdoor-shape-defer` allow | `:3745` `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9` |
| `trapdoor-vertical` up | `:3750` `[MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `trapdoor-vertical` down | `:3753` `[MountLog] rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `tilled-field`（牌） | `:3722` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow pos=11,130,4` |
| `tilled-field`（火把） | `:3494` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4` |
| `mayplace block=` 计数 | **22**（＝r2） |
| `[MountLog] rule=` 行数 | **44**（＝r2） |

规则名 25 个与 r2 逐项相同；`[W3]` 键 42 个缺失 0／新增 0；`[W1]` 键 `snuff,planks,netherrack,pass`、`[W2]` 键 `rows,portal,pos,pass`、`[W4]` 十键全 true —— 三者与 r2 同形。

### §r3.6 终判

**独立通过**（[done] 全 true、pin=true、stops=0、crashes=0、bad=0、exit 0；`[cfg] absent`／`[fatal]` 均 0；C-B70T-4（跨段同名键）与 C-B70T-5（嵌套早闭）由源码行号＋我自跑的负向自检双向闭环；锚点 7/7 定位达标、mayplace 22、rule 44、规则名 25 差异 0、W3 键 42/42；钉值全对且 0 rebuild；cfg/props 起收同哈希）。A=0、B=0、C=1（新增 C-B70T-6：同 section 内同名嵌套键会先命中，现实 cfg 无嵌套，纯潜在面）。

- 字节规格：26450 B / 335 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
