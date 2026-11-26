# B-70T4 判窗 r1（挂载判定纯函数化 · 等价性裁定）

判定方：会话七（独立执行）。窗口编号 B-70T4。
对象：`ETIMMountRules` 重构（`decide(...)` 纯函数 + `UpSolid` 注入点），声称行为等价。

---

## §r1.0 钉值与工作树

| 项 | 实测 | 期望 | 结论 |
|---|---|---|---|
| HEAD | `63dd40fed49c23f4cc4f6f585d7e0d3ca7b61b01` | `63dd40f` | 对 |
| release | 1,557,975 B `B40708E176F0B857DCD86D4E538B80F1F89833F3DE56FA1DAB41FA8B4BF3C9C3` | 同 | 对 |
| dev | 1,529,468 B `39BDCAD037159CC7C4223F0FEB405F777A01020A7E048093ACD91DECF595BC2B` | 同 | 对 |
| sources | 1,365,898 B `0C1B19665F614BB580D1CE4462161FE5E4D166B50894C5B6AFCD1EE911742228` | 同 | 对 |
| MK | 114 / 282 / 564 ＋ 115 / 10，ok=true | 同 | 对 |
| jar mtime | `2026-11-26T10:39:28.396Z` | 同 | 对（0 rebuild） |
| `f7-wb-lib.js:35` PIN | `build:'b70t4-build1'`、`releaseSize:1557975` | 同 | 对 |
| cfg（窗起） | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257`（`blockDebugLog=false` L23、`farmDebugLog=false` L314、**无 sparkR196/mountedR196**） | 基线复位态 | 对 |
| props（窗起） | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同 | 对 |
| port / crash | 0 / 0 | 0 / 0 | 对 |

工作树（窗起）：`M testharness/player/f7-wb-lib.js`（PIN 升 b70t4-build1，主会话留存）、`?? .worktrees/`。
窗末新增两处**工装修正**（见 §r1.1／§r1.2）：`M testharness/player/lib/harness.js`、`M testharness/player/f11-b69-smoke.js`。

---

## §r1.1 首跑阻断（C-B70T4-1，A 级候选，工装面）

首跑 `RUN=b70t4-r1` **起服前即崩**，`EXIT=1`，无任何 `[PIN]`／`[cfg]` 行：

```
testharness/player/lib/harness.js:135
        driverLog: path.join(L.ROOT, 'testharness', 'build-logs', run + '-driver.log'),
                   ^
ReferenceError: path is not defined
    at Object.create (.../testharness/player/lib/harness.js:135:20)
    at Object.<anonymous> (.../testharness/player/f11-b69-smoke.js:24:13)
```

- 影响面：`harness.js` 全文只有 `require('fs')` 与 `require('../f7-wb-lib.js')`（`:22-23`），却在 `:135` 用 `path.join`；`grep 'path\.'` 全文仅此一处。⇒ **任何使用该 harness 的脚本都会在 `create()` 处崩**，B-70T 之后新增的 `<run>-driver.log` 通道从未真正跑过。
- 处置（工装面自修 1 行，未动判据）：`:23` 前插 `const path = require('path'); // C-B70T4-1: :135 uses path.join for <run>-driver.log`。
- 复核：`node --check` 通过；`H.create({run:'smoke-check',world:'w-x',cfg:[]})` 返回对象正常；已删除该自检产生的空 driver log，避免污染 `verify-diff --new latest` 的「最新文件」判定。
- 分级：**B**（判据/工装不成立，非产品面缺陷；产品码与 jar 未动）。

---

## §r1.2 第二次阻断与修法（C-B70T4-2，B 级，判据通道缺口）

`RUN=b70t4-r1` 修好 `path` 后起服成功，但探针通道整体消失：

```
[done] {"run":"b70t4-r1","pin":true,"w1":null,"w2":null,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":3,"badKeys":["w1","w2","w3"]}
```

- 现象：`[MountLog] rule=` 行全部正常（44 条，规则名与 r20 一致），但 `probe` 返回空 ⇒ `[W1] … "pos":null`、`[W2] … "pos":null,"pass":null`、`[W3] … "target":null`。
- 根因（决定性，非产品面）：`src/main/java/io/github/etim/etim/farm/ETIMFarm.java:81-82` `public static void row(String line) { if (ETIMConfig.farmDebugLog) { … }` —— `[FarmLog] drought probe` 行受 `farmDebugLog` 门控。本轮基线已复位（`run/config/etim.cfg:314` `B:farmDebugLog=false`），而驱动只强制 `blockDebugLog/sparkR196/mountedR196`，故 22 条 `etest drought probe` 命令回声在（`> etest drought probe` ×22），响应行 **0 条**。
- 对照：`b69-b69r20-b1.out` 与 `b69-b70t-r3-b1.out` 各有 22 条 `[FarmLog] drought probe` —— 当时基线仍是 B-68 遗留的 `farmDebugLog=true`。⇒ **驱动对基线的隐式依赖**，属判据通道缺口。
- 处置（工装面，断言未放宽）：`f11-b69-smoke.js:26-28` 的 `cfg` 追加 `'farm:farmDebugLog'`，附注释 `C-B70T4-2`。
- 分级：**B**（判据通道不成立；未改产品码、未放宽任何断言）。

---

## §r1.3 终跑（`RUN=b70t4-r2`，EXIT=0）

```
[PIN] sha=B40708E176F0B857DCD86D4E538B80F1F89833F3DE56FA1DAB41FA8B4BF3C9C3 shaOk=true size=1557975 sizeOk=true mkOk=true ok=true
[cfg] b69-b70t4-r2-b1 blockDebugLog=true sparkR196=true mountedR196=true farmDebugLog=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t4-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

- tee：`testharness/build-logs/b69-b70t4-r2-b1.out`（542,861 B / 3,812 行；`:2388` `Done (6.595s)!`、`:3819` `BUILD SUCCESSFUL in 1m 37s`）。
- 世界：`run/w-b69-b70t4-r2-v1`（27 文件 5,116,161 B）保留。
- `[cfg] absent` 0 行、`[fatal]` 0 行。

---

## §r1.4 锚点对位工具（`verify-diff.js`）

```
[DiffLog] base=b69-b69r20-b1.out new=b69-b70t4-r2-b1.out
[DiffLog] note base has no [done] row (pass the driver log too: <run>-driver.log)
[DiffLog] note base has no [PIN] row
[DiffLog] note new has no [done] row (pass the driver log too: <run>-driver.log)
[DiffLog] note new has no [PIN] row
[DiffLog] summary rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0
[DiffLog] verdict MATCH
```

- **规则名多重集**（我自己另算一遍，44 行逐名计数）：new 44 / base 44，逐名差值 **0**。
- `mayplace block=`：new 22 / base 22。
- `[FarmLog] drought probe`：new 22 / base 22。
- 说明（按工单要求单列）：`[PIN]`／`[cfg]`／`[done]` 三类行由 `say()` 落 `<run>-driver.log` 与 stdout，而 **r20 侧无 driver log**（该通道是 B-70T2 才引入的），故工具在 base 侧报 missing，属预期，不计入差异。

---

## §r1.5 判臂锚点与 W1..W4

| 锚点 | 本窗证据（`b69-b70t4-r2-b1.out`） |
|---|---|
| `trapdoor-thin-snow` reject | `:3732` `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6` |
| `sign-face`（满雪侧）allow | `:3739` `[MountLog] rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9` |
| `trapdoor-shape-defer` allow | `:3742` `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9` |
| `trapdoor-vertical` face=up | `:3747` `[MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `trapdoor-vertical` face=down | `:3750` `[MountLog] rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| `tilled-field`（牌） | `:3718` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow pos=11,130,4` |
| `tilled-field`（火把） | `:3491` `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4` |
| `mayplace block=` / `rule=` | 22 / 44 |

- **W1** `pass=true`：`snuff.pos.block=minecraft:air`、`planks.pos.block=minecraft:fire`、`netherrack.pos.block=minecraft:fire`。
- **W2** `pass=true`、`portal="false"`、`pos.block=minecraft:fire`。
- **W3** `pass=true`，42 键齐全（`stone.target=minecraft:torch`、`leaves.target=minecraft:air`、`farmland.target=minecraft:torch`）。
- **W4** 十键全 true（含 `rulesOk`）。

**源码侧等价性（只读）**：`git show 63dd40f -- …/ETIMMountRules.java` 显示树体整体搬进 `decide(...)`，`rejectsPlacement` 改为「取 `supportPos`/`state` → `decide(state, face, mounted, trapdoorLower, s -> s.getBlock().isSideSolid(s, world, supportPos, EnumFacing.UP))` → 记录日志 → 返回 `decision.reject`」；被替换的唯一世界调用点 `support.isSideSolid(state, world, supportPos, UP)` 与新 lambda **同参数同语义**（`supportPos` 仍是 `pos.offset(face.getOpposite())`），其余臂/顺序/规则名未变。运行面亦与 r20 多重集零差异。32 例 JUnit 未跑（会触发编译，超出本窗范围）。

---

## §r1.6 环境收口与终判

| 项 | 起 | 收 | 结论 |
|---|---|---|---|
| cfg | `C69FC496…AEC257`（56,005 B） | 同 | 一致（`sparkR196`/`mountedR196` 窗内插入、停服还原为缺键） |
| props | `6784C3ED…1FEB9` | 同 | 一致 |
| port / crash | 0 / 0 | 0 / 0 | 一致 |
| HEAD | `63dd40f` | `63dd40f` | 窗内 0 提交 |
| jar mtime | `2026-11-26T10:39:28.396Z` | 同 | 0 rebuild |

**终判：PASS（等价性成立）** —— 依据：`[done]` 全 true／`bad=0`／stops,crashes=0；规则名多重集 44 vs 44 差 0、`mayplace` 22 vs 22、`drought probe` 22 vs 22；`verify-diff` 报 MATCH；6 组锚点全部落位且与 r20 同判；W1..W4 全绿；钉值全对且 0 rebuild。

- A 级 0（产品面未发现背离）。
- B 级 2：**C-B70T4-1**（`harness.js:135` 缺 `const path = require('path')`，首跑即崩）、**C-B70T4-2**（基线复位后 `farmDebugLog=false` 使 `[FarmLog]` 探针通道消失，驱动未强制该键）。两处均已由我做工装面最小修正并在本终跑验证。
- C 级 0。
- **需主会话裁决**：这两处补丁目前只在工作树（未提交），`harness.js` 的 `path` 缺失属**已提交代码的硬缺陷**，建议尽快合入；`f11-b69-smoke.js` 的 `farm:farmDebugLog` 是否作为 B-69 系列的固定判据项长期保留，请一并裁定。

- 字节规格：9960 B / 139 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `B40708E176F0B857DCD86D4E538B80F1F89833F3DE56FA1DAB41FA8B4BF3C9C3`；cfg `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
