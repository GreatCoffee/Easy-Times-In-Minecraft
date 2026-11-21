# W-B52 判窗正本 — Ooze 自然生成（census D :64）

会话七（ETIM 验证窗执行）· 2026-11-21 08:34–08:44 CST · 判据只认服务端日志

## §0 钉值（判定源）

| 项 | 实测 | 工单 | 判 |
|---|---|---|---|
| HEAD | `e78c2e284ed58cb4695d4db06e7ea47d52cd9a57` | `e78c2e2` | ✔ |
| release jar | `build/libs/etim-1.0.0.jar` 1,218,575 B | 1,218,575 B | ✔ |
| release SHA256 | `7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF` | 同 | ✔ |
| jar mtime | `2026-11-21T00:27:37.115Z`（收窗未变） | `2026-11-21T00:27:37Z` | ✔ |
| MK refmap | classes=101 / entries=242 / dual=484 | 101/242/484 | ✔ |
| MK manifest | mixins=101 / client=10 / `ok=true` | 101+10 | ✔ |
| cfg | 49,406 B `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（起收同） | 基线 | ✔ |
| cfg 键值 | `livestockNeedsR196=true`、`mobSpawnR196=true`、`mobDebugLog=false`（收窗还原） | 同 | ✔ |
| props | 939 B `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同；`level-name=w-b30v`、`allow-flight=false`） | 基线 | ✔ |
| crash-reports | 24 → 24（窗内无新增） | 24→24 | ✔ |
| 端口 25565 监听 | 0 | 0 | ✔ |
| 产品码改动 / rebuild | 0 / 0（窗内未 build、未提交） | 禁 | ✔ |

工作树：3 个 M（`ETIMEntityOoze.java`、`ETIMSpawnTables.java`、`testharness/player/f7-wb-lib.js`），与工单一致；窗内未 checkout/reset/clean。
烟测前置：`build-logs/b52-smoke-r1.node.out`、`b52-smoke-r2.node.out` 均 `bad=0`。

## §1 逐窗判读表

臂构造（驱动 `testharness/player/f11-b52-smoke.js`，`RUN=v1/v2`，世界 `w-b52s-<RUN>`）：三臂都取 `-50,y,240` 柱，`/etest spawnpick … 2000` 抽 2000 次，统计 `ETIMEntityOoze` 计数与 `ooze-gate reject` 行。

| 窗 | 说明 | v1 | v2 | 判 |
|---|---|---|---|---|
| W1 | y=20 石地板＋石顶（三明治正例） | ooze=73，gate=0 | ooze=108，gate=0 | PASS |
| W2 | y=60 同结构（深度门应拒） | ooze=0，gate=22（`depth=false`） | ooze=0，gate=10（`depth=false`） | PASS |
| W3 | y=20 石地板＋**玻璃**顶（顶门应拒） | ooze=0，gate=65（`stoneAbove=false`） | ooze=0，gate=66（`stoneAbove=false`） | PASS |
| W4 | y=20 石顶＋**无地板**（地板门应拒） | ooze=0，gate=23（`floor=false`） | ooze=0，gate=27（`floor=false`） | PASS |
| W0 | 双 boot 卫生 | `Done (5.738s)`；停服 `{exitCode:0,exited:true}` | `Done (5.860s)`；停服 `{exitCode:0,exited:true}` | PASS |
| W5 | 旗关（`mobSpawnR196=false`＋`mobDebugLog=true`）自然窗 90 s | `spawnRows=0`、`oozeRows=0`、`mobs=45`、`pickOoze=87`、`pickGate=0`；停服 `{exitCode:0,exited:true}` | — | PASS |

驱动输出的 `[done]`（两轮同形）：

```
[done] {"run":"v1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stop":{"exitCode":0,"exited":true},"pass":true}
[done] {"run":"v2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stop":{"exitCode":0,"exited":true},"pass":true}
[done] {"run":"w5","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}
```

判定：**W1–W5 全 PASS，A 级 0、B 级 0**。建议按 PASS 收批（C 级 8 条，全部为工装/口径面，见 §3）。

## §2 判行锚（文件:行号）

`testharness/build-logs/b52s-v1.out`（966,393 B）

- `2362` `Done (5.738s)!`（boot 完成）
- `5717` `[SpawnLog] spawnpick n=2000 at BlockPos{x=-50, y=20, z=240} counts={ETIMEntityBoneLord=16, ETIMEntityDemonSpider=39, ETIMEntityInfernalCreeper=115, ETIMEntityOoze=73, ETIMEntityPhaseSpider=25, ETIMEntityRevenant=38, EntityCreeper=332, EntityEnderman=42, EntitySkeleton=462, EntitySpider=358, EntityZombie=500}`
- `5731` `[SpawnLog] ooze-gate reject depth=false floor=true stoneAbove=true y=60 at (-50,60,240)`（W2 拒因＝深度门）
- `5937` `[SpawnLog] ooze-gate reject depth=true floor=true stoneAbove=false y=20 at (-50,20,241)`（W3 拒因＝石顶门）
- `6108` `[SpawnLog] ooze-gate reject depth=true floor=false stoneAbove=true y=20 at (-50,20,242)`（W4 拒因＝地板门）
- `6364` `BUILD SUCCESSFUL in 33s`

`testharness/build-logs/b52s-v2.out`（977,882 B）

- `2362` `Done (5.860s)!`
- `5785` `[SpawnLog] spawnpick n=2000 at BlockPos{x=-50, y=20, z=240} counts={ETIMEntityBoneLord=23, ETIMEntityDemonSpider=35, ETIMEntityInfernalCreeper=113, ETIMEntityOoze=108, …}`
- `5817` `ooze-gate reject depth=false floor=true stoneAbove=true y=60 at (-50,60,240)`
- `6007` `ooze-gate reject depth=true floor=true stoneAbove=false y=20 at (-50,20,241)`
- `6149` `[SpawnLog] spawnpick n=2000 at BlockPos{x=-50, y=20, z=241} counts={… EntitySlime=406 …}`（玻璃顶同时放开 vanilla slime，见 C-B52-7）
- `6162` `ooze-gate reject depth=true floor=false stoneAbove=true y=20 at (-50,20,242)`
- `6443` `BUILD SUCCESSFUL in 35s`

`testharness/build-logs/b52-w5.out`（1,545,492 B）

- `1` `[cfg] B:mobDebugLog=true B:mobSpawnR196=false`（臂内生效读数）
- `2362` `Done (5.880s)!`
- `6167` `### [harness] > fill -56 23 234 -44 23 246 minecraft:stone`（三明治封顶，自然窗起点之前）
- `298` `[W5] {"spawnRows":0,"oozeRows":0,"mobs":45,"pickOoze":87,"pickGate":0}`
- `9705` `### [harness] > etest spawnpick -50 20 240 2000`（旁证探针；此后 `9712…9856` 的 128 条 `slime-gate reject stoneAbove`＋111 条 `creeper-gate infernal` 全在 `08:42:59` 同一刻，属探针自身触发，见 C-B52-6）
- `10104` `BUILD SUCCESSFUL in 1m 58s`；`300` `[stop] {"exitCode":0,"exited":true}`

产品面锚（只读）

- `src/main/java/io/github/etim/etim/mob/ETIMSpawnTables.java:328-342`：`depthOk = !ETIMUnderworldSpawns.checkDepth(w) || pos.getY() <= 32`、`stoneFloor = w.getBlockState(pos.down()).getBlock() == Blocks.STONE`、`stoneCeiling = stoneAbove(w, pos)`，reject 行 `"[SpawnLog] ooze-gate reject depth=" + depthOk + " floor=" + stoneFloor + " stoneAbove=" + stoneCeiling + " y=… at …"`
- `src/main/java/io/github/etim/etim/mob/ETIMSpawnTables.java:255`：`public static Biome.SpawnListEntry pickSpawn(WorldServer w, EnumCreatureType type, BlockPos pos)` —— **不读 `mobSpawnR196`**
- `src/main/java/io/github/etim/etim/mob/ETIMSpawnCycle.java:90`：`if (!ETIMConfig.mobSpawnR196) {`（总开关）
- `src/main/java/io/github/etim/etim/commands/CommandDevTest.java:811-829`：`spawnpick` 直接循环调 `pickSpawn` 且先 `resetGateLogBudget()`
- `src/main/java/io/github/etim/etim/world/ETIMUnderworldSpawns.java:82`：`[SpawnLog] pool underworld size=10 …` 池描述行（不受总开关门控，见 C-B52-5）

## §3 分级登记

**A 级：无。**
**B 级：无。**

**C 级（8 条）**

- **C-B52-1 世界名与工单不符**：工单写 `w-b52v1` / `w-b52v2`，驱动实际为 `w-b52s-<RUN>`（`RUN` 后缀注入），W5 为 `w-b52-w5`。判据不受影响，世界按令保留。
- **C-B52-2 `spawnpick` 绕过总开关**：`ETIMSpawnTables.pickSpawn` 不读 `mobSpawnR196`，命令面又直接调用它，故 W1–W4 的绿**只能**证明 ooze 门的分支正确，不能证明自然接线；W5 因此改用「自然窗（90 s、`doMobSpawning true`、difficulty 1、夜、深石三明治）＋0 行」为主证、`pickOoze=87` 为表侧旁证。
- **C-B52-3 v2 臂前环境 SpawnLog**：`b52s-v2.out` 在首个臂汇总（`5785`）之前已有 265 条 `[SpawnLog]`（例 `2975` `ooze-gate reject depth=false floor=false stoneAbove=false y=63 at (-180,63,187)`），属世界开局的自然刷怪尝试；臂内全部按 `since(index)` 切片计数，不受污染。
- **C-B52-4 单 PIN**：驱动只在开窗打一条 `[PIN]`（`shaOk=true`、`mk.ok=true`）；「窗内 0 rebuild」由收窗 jar mtime 与 SHA 复核（§0）补证。
- **C-B52-5 `pool underworld size=10` 不受总门控**：`b52-w5.out` 在旗关臂 `08:41:15` 仍打该行（`ETIMUnderworldSpawns.java:82`），属池描述而非级联证据；判「旗关后级联停摆」只采 `ooze-gate` / `spawnpick` / `[AILog]` 面。
- **C-B52-6 W5 的 gate 行全是探针自身产物**：`slime-gate reject stoneAbove` 128 条（已撞 `gateLogBudget`）与 `creeper-gate infernal` 111 条，时间戳全为 `08:42:59`，即 `/etest spawnpick` 触发的表侧判定，非自然刷怪；90 s 自然窗内为 0 条。
- **C-B52-7 玻璃顶同时放开 vanilla slime**：W3 臂 y=20 玻璃顶使 slime 的三明治门（stoneAbove）不成立，`b52s-v2.out:6149` 出现 `EntitySlime=406`；与 ooze 门互不影响，属预期，只登记。
- **C-B52-8 W1「无 gate 行」的范围**：指臂内切片；全档仍存在开局期环境 gate 行（见 C-B52-3）。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 判定源 jar / SHA / MK | 1,218,575 B / `7B7071A4…D978A6CF` / 101-242-484＋101-10、`ok=true` |
| 窗内 rebuild | 0（mtime `2026-11-21T00:27:37.115Z` 未变） |
| 产品码 | 未改、未提交（3 个 M 保持原样） |
| cfg | `71EA288B…` 起收同；`mobSpawnR196=true`、`mobDebugLog=false` 已还原 |
| props | `E3DE4341…` 起收同；`level-name=w-b30v`、`allow-flight=false` |
| crash-reports | 24 → 24 |
| 端口 25565 | 0 |
| HEAD | `e78c2e2…` 窗内 0 提交 |
| 世界 | `run/w-b52s-r1`、`w-b52s-r2`、`w-b52s-v1`、`w-b52s-v2`、`w-b52-w5` 全部保留（v1 为 24 文件 3,638,020 B） |
| 证据 | 驱动 stdout：`build-logs/b52-v1.out`（12,075 B）、`b52-v2.out`（12,169 B）、`b52-w5.out`（15,204 B）；全量 tee：`testharness/build-logs/b52s-r1.out`（976,296 B）、`b52s-r2.out`（982,650 B）、`b52s-v1.out`（966,393 B）、`b52s-v2.out`（977,882 B）、`b52-w5.out`（1,545,492 B） |
| 驱动 | `testharness/player/f11-b52-smoke.js`（工单件，未改）；补臂自写 `testharness/player/_b52-w5.js` |

## §5 三 SHA 与文尾

- release jar：`7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF`（1,218,575 B）
- cfg：`71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（49,406 B）
- props：`E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（939 B）

正本字节规格：`10083 B / 124 行`（UTF-8 无 BOM、LF）。

## 补记（2026-11-21 09:25，A-B52b-1 / W-B52b2）

- 本报告 W1–W4 走 `/etest spawnpick`，只证 ooze 门三分支；`getCanSpawnHere` 未被覆盖。
- B-52b 补臂三窗自然 accept 2,752 次、ooze 0；根因 `ETIMEntityOoze.getCanSpawnHere` 仍调 `super`（EntitySlime 的 slime-chunk 币）。A-B52b-1 成立。
- 修复后 build2：1,218,667 B `59F9AF83…956F7`；W-B52b2 两窗自然 accept 999 次、acceptOoze **26**，`/testfor @e[type=etim:ooze]` 成功，修复有效。
- 本报告仍作为 build1 门三分支证据保留；自然正证以 `b52-w5b2-verdict.md` 为准。
