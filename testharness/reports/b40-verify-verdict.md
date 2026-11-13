# R196 锄地四件套（顶面门／耐久 50／低方块允许臂／鹤嘴锄）**W-B40 判窗**（HEAD `11192d7`）— **W0–W4 全 PASS**

> **结论先行**：b40-build2 双 boot 判窗全绿——侧脸点锄被顶面门 `pass=false` 挡回且块不变、顶脸点锄 `pass=true` 且 grass→farmland；till 打出 `damage=50 dur=3200/3200` 并伴随 `[FoodLog] … hoeDrain hardness=0.6 base=0.3 mod=1.0 amount=0.3`；顶半砖之上 `lowblock … minY=0.5` 仍放行、小麦拒绝；鹤嘴锄侧脸 `reject`、顶脸 `till`；旗断 boot 双零。**`bad=false`（脚本口径），EXIT=0。**
> **HEAD**：`11192d75a6e16be489c3846a00f5ab48a2a964f9`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-13T10:00:44Z` 早于窗起 `10:47:24Z`。
> **jar**：1,165,849 B `ACC584FB7395EC5192D5A5413306304C759D5AE805AD9442617DD2F21062BC5E`（b40-build2，起收同）。
> **MK**：refmap **101/242/484**（dual 484，双份同）、mixins **99+10**、`ok=true`（起收同）。
> **驱动**：`testharness/player/f11-b40-verify.js`（`node --check` 绿）；`EXPECTED_SHA=ACC584FB…062BC5E`。
> **窗口**：boot1 `Done (5.707s)!`（b1:2353，18:47:24）/ boot2 `Done (5.601s)!`（b2:2353，18:48:21），mixinFail 0×2；双停服 `{exitCode:0,exited:true,build:true}`；`BUILD SUCCESSFUL in 56s`（b1:5818）/ `36s`（b2:3174）；PIN 起 `10:47:24.584Z` → 收 `10:48:42.698Z`，总窗约 **1m 18s**，**EXIT=0**。
> **判决**：W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS｜b1 旗断 PASS｜props PASS。
> **报告字节规格**：`8565 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，82 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 `{0,true,true}`×2 | b1:2353 `Done (5.707s)` / b2:2353 `Done (5.601s)`；mixinFail 0×2；`[stop]` 两条同形 | PASS |
| **W1** 顶面门（:94） | 侧脸 `gate face=north pass=false` 且块不变；顶脸 `pass=true` 且 farmland | `b1:5721` `gate face=north pos=-60,67,240 pass=false`；`b1:5727` `gate face=up pos=-60,67,240 pass=true`；`sideBlock=true`（grass 未变）/ `topBlock=true`（farmland） | PASS |
| **W2** till＋耐久 50（:87） | `till damage=50 dur=<n>/<max>` ∧ farmland ∧ hoeDrain 行 | `b1:5728` `[HoeLog] till damage=50 dur=3200/3200`；`b1:5742` `[FoodLog] ETIM_F7 (191) hoeDrain hardness=0.6 base=0.3 mod=1.0 amount=0.3 pool=0.42199993`；`farmland=true`；`durMax=3200` | PASS |
| **W3** 低方块允许臂（:86） | slab 上 `lowblock minY=0.5` ∧ 臂内 `damage=50` ∧ slab 在场；小麦无 lowblock ∧ grass 不变 | `b1:5757` `till lowblock pos=-62,68,240 minY=0.5`；`b1:5758` `till damage=50 dur=3150/3200`；`slabStill=true`；`cropsRows=0 ∧ cropsBlock=true`；`slabDirt=true`（**只记不判**，见 C-B40-4） | PASS |
| **W4** 鹤嘴锄（:93） | 侧脸 `mattock reject` 且 dirt 不变；顶脸 `mattock till` ∧ damage 行 ∧ farmland | `b1:5786` `mattock reject face=north pos=-58,67,240`；`b1:5792` `mattock till pos=-58,67,240`；`dmgRows=3`；`sideBlock=true`（dirt）/ `topBlock=true`（farmland） | PASS |
| **b1** 旗断面 | north 侧脸点锄照常 till ∧ `[HoeLog]` 全档 0 条 | b2 `[HoeLog]` **0** 条（`FarmLog` 仅 1 条启动注册行 `dead-plant carriers registered`）；`farmland=true` | PASS |
| **props** | norm 起收同 ∧ raw 只记 ∧ level 还原 `w-b30v` | norm `5DC243A8…25B7C9` 起收同；raw `DDD76CD8…DFF8620`；`w-b30v->w-b30v` | PASS |
| **cfg** | sha 起收同 | `A4D9EF42BF8C88D81D89D028E05AEBB118DF74BFF832C92D07C0F0FFAE073470` 49,381 B 起收同 | PASS |

`[done]`：`{"w0":true,"w1":true,"w2":true,"w3":true,"w4":true,"b1":true,"pinsOk":true,"propsOk":true,"propsNorm":"5DC243A8…/同","propsRaw":"DDD76CD8…","propsLevel":"w-b30v->w-b30v","bad":false,"run":"v1"}`

## §2 判行锚（b1 = `w-b40v-b1.out`，b2 = `w-b40v2-b1.out`）

**W1（顶面门）**
- `b1:5721` `[18:47:40] … [FarmLog] [HoeLog] gate face=north pos=-60,67,240 pass=false [server]`
- `b1:5727` `[18:47:42] … [FarmLog] [HoeLog] gate face=up pos=-60,67,240 pass=true [server]`

**W2（till 正判＋耐久 50＋hoeDrain）**
- `b1:5728` `[18:47:42] … [FarmLog] [HoeLog] till damage=50 dur=3200/3200 [server]`
- `b1:5741` `[18:47:45] … [FarmLog] [HoeLog] till damage=50 dur=3200/3200 [server]`（第二循环，重新 give 后）
- `b1:5742` `[18:47:45] … [FoodLog] ETIM_F7 (191) hoeDrain hardness=0.6 base=0.3 mod=1.0 amount=0.3 pool=0.42199993`

**W3（低方块允许臂）**
- `b1:5756` `gate face=up pos=-62,67,240 pass=true`（slab 格仍过门）
- `b1:5757` `[18:47:49] … [HoeLog] till lowblock pos=-62,68,240 minY=0.5 [server]`
- `b1:5758` `[18:47:49] … [HoeLog] till damage=50 dur=3150/3200 [server]`（**pre-wear 语义**：先记后用，3150＝3200−50）
- `b1:5772` `gate face=up pos=-62,67,240 pass=true`（小麦格：无 lowblock 行、块未变）

**W4（鹤嘴锄）**
- `b1:5786` `[18:47:57] … [HoeLog] mattock reject face=north pos=-58,67,240 [server]`
- `b1:5792` `[18:47:59] … [HoeLog] mattock till pos=-58,67,240 [server]`

**b1 旗断（b2）**
- `[HoeLog]` 全档 **0** 条；`FarmLog` 仅 `b2:558` `dead-plant carriers registered (dead_crop/dead_stem, no ItemBlock)`
- 侧脸点锄仍把 grass 变 farmland（`farmland=true`）⇒ vanilla 锄面照常

**卫生**
- `b1:2353` / `b2:2353` `Done (…)`；`b1:5818` `BUILD SUCCESSFUL in 56s`；`b2:3174` `BUILD SUCCESSFUL in 36s`
- PIN `10:47:24.584Z` / `10:48:21.133Z`，双条同 `ACC584FB…062BC5E`、MK 101/242/484、99+10、ok=true

## §3 登记项

- **C-B40-1（r1 作废：boot 日志被覆盖）**：驱动原用固定 TAG，boot1 日志被 boot2 覆盖（r1 只剩 b2）。已改为 per-boot tag（`w-b40v-b1` / `w-b40v2-b1`），r1 作废、不计入判据；r2–r4 双日志均在册，r4 另存 `-r4-b1.log` / `-r4-b2.log`。
- **C-B40-2（r1 props 还原缺陷）**：原驱动 boot2 段重置 `propsBefore` 且从不回写，`norm0` 又在末端才取 ⇒ r1 `propsOk=false`、level 停在 `w-b40v2`。已修为：开窗前把 props 归一化为 `w-b30v` 并快照 props/cfg，判定前回写，再比对 norm。r2 起 `propsOk=true`。
- **C-B40-3（W2 hoeDrain 的通道前提）**：`ETIMEndurance.charge()` 在 `player.capabilities.isCreativeMode` 时直返（`ETIMEndurance.java:228-232`），且 `logFood` 由 `foodDebugLog` 门控（`ETIMFoodStats.java:294-296`）。故 a2 臂临时 `gamemode 0` 并在 boot1 cfg 加 `foodDebugLog: true`（跑到 r3 才补齐，r2/r3 的 W2 hoeDrain 为 0 属通道未开，非产品面）。属工装面微调，已登记。
- **C-B40-4（W3 slab 下 farmland→dirt）**：1.12 `BlockFarmland.onBlockAdded/neighborChanged :150-153` 在实心块上方转 dirt，R196 `:295` 无此规则；本窗 `slabDirt=true` 只记不判，判据用 `lowblock` 行＋臂内 `damage=50` 行。
- **C-B40-5（PIN 覆盖面）**：双 PIN 分别落在 boot1 起手与 boot2 起手，窗口尾以两条 `[stop]` 记录为界（不含尾 PIN）。
- **C-B40-6（pre-wear 口径）**：`dur=` 为磨损前值（`MixinItemHoe` redirect 先 log 后 `damageItem(50)`），故首用 `3200/3200`、次用 `3150/3200`。
- **停服面**：2 次 `{exitCode:0,exited:true,build:true}`。
- **异常面**：stdout 无 `[fatal]`；产品码、判据面、`f7-wb-lib.js`、mixin 配置均未动。
- **世界面**：`run/w-b40v` + `run/w-b40v2` 保留（50 文件 / 7,347,834 B）；w-b* 共 58 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash **24→24**、HEAD `11192d7` 窗内 0 提交、jar mtime 未变。

## §4 收口清单

- jar 起收同 1,165,849 B `ACC584FB…062BC5E`（0 rebuild）。
- cfg `A4D9EF42…` 49,381 B 起收同（`foodDebugLog`/`livestockNeedsR196` 已回写原值）。
- props norm `5DC243A8…` 起收同、raw `DDD76CD8…`、`level-name=w-b30v` 已还原。
- MK 起收同 101/242/484、99+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b40v`、`run/w-b40v2` 保留；删世界待口令。
- 证据：`build-logs/f11-b40-verify-r4-{b1,b2}.log`、`-r4-stdout.out`；驱动原始 `w-b40v-b1.out` / `w-b40v2-b1.out` 保留；r1–r3 存档 `-r1-b2.log` / `-r2-*` / `-r3-*`（各带 stdout）。

## 文尾

- 报告字节：`8565 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，82 行`。
- 三 SHA：jar `ACC584FB7395EC5192D5A5413306304C759D5AE805AD9442617DD2F21062BC5E`；cfg `A4D9EF42BF8C88D81D89D028E05AEBB118DF74BFF832C92D07C0F0FFAE073470`；propsNorm `5DC243A84EF7C967428136A12EEF39764A413AD9605FBDAE905997C8FF25B7C9`。
