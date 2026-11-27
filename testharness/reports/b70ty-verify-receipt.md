# B-70TY 判窗回执（回归网第二轮：七条公共链）

判定源：会话七（ETIM 验证窗执行）。判据只认服务端日志；客户端未操作。

## §0 钉值与环境（实测）

| 项 | 值 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,569,395 B `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` |
| jar mtime | `2026-11-26T14:28:21.3200589Z`（全程未变 = 0 rebuild） |
| PIN | `b70tj-build1`；`[PIN]` 每轮 `shaOk=true sizeOk=true mkOk=true`；MK 114/282/564 + 115/10 |
| HEAD | `de52032`（窗内 0 提交） |
| cfg | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257`（起收同） |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`（起收同） |
| port / crash | 25565 起前 0 → 收后 0；`run/crash-reports` 0 → 0 |

## §1 七臂（终轮 `RUN=b70ty-r5`，EXIT=0）

`[done] {"run":"b70ty-r5","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

tee：`testharness/build-logs/f15-b70ty-r5-b1.out`（600,380 B / 4,122 行；`:2389` `Done (5.632s)!`、`:4120` `BUILD SUCCESSFUL in 54s`）。

| 臂 | 终值 | 判行锚（file:line） |
|---|---|---|
| W1 FishLog | `gateRows=1`、`type n=50 cod=50 salmon=0` | `:3311` `[FishLog] gate token=1 wt=1000 adj=7000 dist=1500 … [server]`；`:3314` `[FishLog] type n=50 cod=50 salmon=0 pos=BlockPos{x=4, y=129, z=6} biome=minecraft:beaches [server]` |
| W2 CraftingLog | `player=ETIM_F7 item=minecraft:iron_pickaxe kind=NONE` | `:3317`／`:3318` `[CraftingLog] anvilplan player=ETIM_F7 item=minecraft:iron_pickaxe kind=NONE fail=0 required=0 [server]` |
| W3 IngestLog | 通道可达（拒绝行合法） | `:3325` `[IngestLog] ETIM_F7 (67) minecraft:egg right-click refused by canIngest` |
| W4 FurnaceLog | `rows=1` | `:567` `[FurnaceLog] 8 judged smelting rows registered (redstone/lapis/quartz/diamond/emerald/coal ores + sandstone→glass + clay block→hardened clay)` |
| W5 MeleeLog | `target=Zombie lvl_stun=1` | `:3336` `[MeleeLog] melee target=Zombie lvl_stun=1 lvl_vamp=0 lvl_disarm=0 harmed=true [server]` |
| W6 DeathLog | `kind=orb dump` | `:3341` `[DeathLog] ETIM_F7 (67) death orb dump 10 xp (=total/3 of 30) at 6,130,6 [server]`（`:3342` 同轮 settle 行） |
| W7 OreLog | `oreRows=152` | `:656` `[OreLog] ore=ore_copper chunk=(-272,48) rolls=40 veins=2 origin-abort=2 grown=0 [server]` 起，每区块三矿三行（含 `ore_silver` / `ore_mithril`） |

## §2 收敛链（r1→r5）与分级

全部为**驱动/判据面**问题，产品码零改动、jar 零重建。

| 轮 | 结果 | 红面与根因 |
|---|---|---|
| r1 | `w1/w3/w5/w6=false`（bad=4） | 见下四条 B |
| r2 | `w3=false`（bad=1） | W3 正则修好仍无行；`[W3-diag] {"held":"cooked_beef","food":4}` 证明手持与饥饿态正常 |
| r3 | `w3=false` | 改走蛋叉路：`[IngestLog] … minecraft:egg right-click refused by canIngest`（`:3323`）证明通道活着，但仍不匹配旧正则 |
| r4 | `w3=false` | 正则已对但行**早于 mark() 落盘**（r4 `:3325` vs mark 时刻）→ 补 bootFrom 兜底 |
| r5 | **全绿** | — |

**B 级（判据不成立，全部已修；驱动内注释编号 C-B70TY-n）**

* **B-B70TY-1（W6）** `death:deathXpOrbs` 默认 `false`（`ETIMConfig.java:627`、`:1462`）⇒ `orbs=0`，产品只走 settle 分支、永不发 `death orb dump` 行。已强制该项；r2 起出现 `death orb dump 10 xp (=total/3 of 30)`。
* **B-B70TY-2（W1）** `[FishLog] gate` 行可能落在 `mark()` 之前（join 后首轮即发）⇒ r1 `gateRows=0` 而产品行实际存在（`f15-b70ty-r1-b1.out:3309`）。改为自 boot 后全窗切片。
* **B-B70TY-3（W3 正则）** `(\S:[\w:]+)` 无法匹配 `minecraft:cooked_beef`（`:` 前只有一个非空白字符时才成立）⇒ 改为 `(\S+)`。
* **B-B70TY-4（W3 判据不可达）** `[IngestLog] … start eating` 的**唯一产出点是蛋叉路**（`MixinItemEgg.java:54` 调 `ETIMIngestibles.tryStartEating`；`ETIMIngestibles.java:88-96`）；普通食物（熟牛肉）走 vanilla `ItemFood`，**没有任何 IngestLog 行**（r2/r3 全档 0 条）。蛋本身 `value.eatable=false`，`ETIMFoodStats.canIngest` 必拒 ⇒ 「start eating」分支对现有物品不可达。W3 因此改判「通道可达」（拒绝行合法），并把通道缺口单列供主会话决定：①在 vanilla 食物路径加 hook，或 ②把 W3 定为蛋拒绝行契约。
* **B-B70TY-5（W5）** r1 `reach denied: etim.reach.deny_attack 1.7976931348623157e308 > 2.25`（`f15-b70ty-r1-b1.out:3330`）—— ETIM reach 走**实体射线距离**（`ETIMReachEvents.java:51` `ETIMReach.getEntityRayDistance`），视线未对准目标即得 `Double.MAX_VALUE`。修：攻击前 `bot.lookAt(zombie.position.offset(0, height*0.85, 0), true)` + 300 ms。
* **B-B70TY-6（W3 时序）** 蛋拒绝行落在 `mark()` 之前（同 B-2 机制），补 bootFrom 兜底。
* **B-B70TY-7（W3 语义）** 蛋被 `canIngest` 拒绝属**产品正确行为**（蛋非可食），不是缺陷；据此只断言通道可达。

**C 级（可接受偏差）**

* **C-B70TY-1** 世界名随 RUN：`w-reg-b70ty-r1..r5-v1` 五个世界全留。
* **C-B70TY-2** 每窗 `[done]` 前有两条 `[stop]`（`h.stop()` 与 `finish()` 各打一次），带 `exited:true` 者为权威。
* **C-B70TY-3** W2 的 anvilplan 行成对出现（`:3317`／`:3318`，命令回包 + 判定行各一条），内容一致。
* **C-B70TY-4** W4 的注册行只在 boot 期出现一次（`:567`），故断言 `rows===1` 必须在 boot 后全档切片。
* **C-B70TY-5** W7 `oreRows` 逐轮有浮动（140/143/152），只判 ≥1。
* **C-B70TY-6** 驱动新增 `time set 18000`（夜间）以免日光影响实体推出时间。

## §3 收口

| 项 | 状态 |
|---|---|
| 停服 | r5 `{"exitCode":0,"exited":true}`（r1–r4 同，红轮留痕） |
| 钉值 | jar 1,569,395 / `F0904A33…` mtime 未变（0 rebuild）；HEAD `de52032` 窗内 0 提交 |
| 环境 | cfg `C69FC496…`、props `6784C3ED…` 起收同；port 0→0；crash 0→0 |
| 世界 | `run/w-reg-b70ty-r1-v1` … `w-reg-b70ty-r5-v1` 全部保留 |
| 证据 | `build-logs/b70ty-r{1,2,3,4,5}-stdout.out`、`testharness/build-logs/f15-b70ty-r{1..5}-b1.out` |
| 产品码 | 零改动（只改驱动 `testharness/player/f15-reg-chains.js`） |

## §4 终判

**PASS（七臂全绿）**，附一条 B 级判据缺口待主会话裁定：`[IngestLog] … start eating` 对普通食物不可达（B-B70TY-4），当前 W3 以「通道可达」作契约。


## §r6 r6→r11（产品补 IngestLog 两行后复窗）

| 轮 | 结果 | 红面 |
|---|---|---|
| r6 | `w3=false`（bad=1） | 两条 IngestLog 行**在 tee 里都在**（`f15-b70ty-r6-b1.out:3321` beef start eating、`:3324` egg refused），但驱动读 `food=null refused=0` |
| r7 | `w3=false` | 改「先取 mark 再发 say 打标」后 beef 抓到、egg 仍 0 |
| r8 | `EXIT=1` | `[fatal] ReferenceError: say is not defined`（harness 只暴露 `console.log`，不暴露 `say`） |
| r9 | `w3=false` | `[W3-diag] {"len":3332,"fromBeef":3320,"fromEgg":3327,"ingestAll":2}` ⇒ 两行都在切片内；蛋那一行实际是 `minecraft:egg start eating (32 ticks)`（走了 ETIM 蛋叉路，非 ItemFood 拒绝面） |
| r10 | `w3=false` | 用「满腹 `etest food 20`」想让熟牛肉被拒 → 命令报 `The number you have entered (20) is too big, it must be at most 6`（`f15-b70ty-r10-b1.out:3328`，池上限 6）⇒ 饥饿态未变，仍出 start eating |
| r11 | **全绿** | 关键：蛋必须等熟牛肉 32 tick 咀嚼落地（约 +2.5 s）再右键才会被 `canIngest` 拒 —— r6 是 +6 s（拒），r9 是 +1 s（放行并走蛋叉路） |

**r11 终值（`RUN=b70ty-r11`，EXIT=0）**

`[done] {"run":"b70ty-r11","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 终值 | 判行锚（`testharness/build-logs/f15-b70ty-r11-b1.out`，599,974 B / 4,121 行） |
|---|---|---|
| W1 | `gateRows=1`、`n=50 cod=50 salmon=0` | `:3314` `[FishLog] gate token=1 wt=1000 adj=7000 dist=1500 ci0=1500 light=0 ci2=1500 L=0 lure=0 ci3=1500 worm=0 ci4=1500 [server]`；`:3317` `[FishLog] type n=50 cod=50 salmon=0 pos=BlockPos{x=4, y=129, z=6} biome=minecraft:beaches [server]` |
| W2 | `kind=NONE` | `:3320` `[CraftingLog] anvilplan player=ETIM_F7 item=minecraft:iron_pickaxe kind=NONE fail=0 required=0 [server]` |
| W3 | **双面成立** | `:3328` `[IngestLog] ETIM_F7 (67) minecraft:cooked_beef start eating (vanilla ItemFood)`；`:3333` `[IngestLog] ETIM_F7 (67) minecraft:egg right-click refused by canIngest` |
| W4 | `rows=1` | `:558` `[FurnaceLog] 8 judged smelting rows registered (redstone/lapis/quartz/diamond/emerald/coal ores + sandstone→glass + clay block→hardened clay)` |
| W5 | `target=Zombie lvl_stun=1` | `:3344` `[MeleeLog] melee target=Zombie lvl_stun=1 lvl_vamp=0 lvl_disarm=0 harmed=true [server]` |
| W6 | `kind=orb dump` | `:3349` `[DeathLog] ETIM_F7 (67) death orb dump 10 xp (=total/3 of 30) at 6,130,6 [server]` |
| W7 | `oreRows=122` | `:656` `[OreLog] ore=ore_copper chunk=(-272,48) rolls=40 veins=2 origin-abort=2 grown=0 [server]`（含 `ore_silver` / `ore_mithril`） |

boot：`:2388` `Done (5.560s)!`；`:4119` `BUILD SUCCESSFUL in 38s`。
`[cfg] f15-b70ty-r11-b1 fishingDebugLog=true craftingDebugLog=true ingestDebugLog=true furnaceDebugLog=true meleeDebugLog=true deathDebugLog=true deathXpOrbs=true`

**新增分级**

* **C-B70TY-7（W3 时序，决定性）** 蛋的 `canIngest` 拒绝面要等熟牛肉咀嚼落地（32 tick ≈ 1.6 s；实测 +1 s 放行、+2.5 s 拒绝）：驱动在第二面加 `sleep(2500)`。此前蛋会走 ETIM 蛋叉路并打 `start eating (32 ticks)`（`f15-b70ty-r9-b1.out:3330`）。
* **C-B70TY-8（切片）** `[IngestLog]` 行可能落在 `mark()` 之前（r6 两行都早于 mark，`fromBeef` 取点过晚）⇒ 改为「整臂开头取 `from` ＋ `say` 打标」。
* **C-B70TY-9（驱动 API）** `say` 不在 harness 暴露面（只 `console.log`），r8 因此 `[fatal] ReferenceError: say is not defined`。
* **C-B70TY-10（驱动）** `etest food` 上限＝玩家池上限 6（`f15-b70ty-r10-b1.out:3328` `The number you have entered (20) is too big, it must be at most 6`），故「满腹造拒绝」不可用。

**环境收口（r6→r11 全程）**

| 项 | 值 |
|---|---|
| PIN | 每轮 `b70ty-build1`、`sha=D11D4DA3…F25EC7C`、`shaOk/sizeOk/mkOk=true` |
| jar | 1,569,660 B；mtime `2026-11-27T04:17:35.977Z`，窗内未变（新包 rebuild 发生在开窗前） |
| HEAD | `d75cade`（窗内 0 提交） |
| cfg / props | `C69FC496…E5AEC257` / `6784C3ED…D21322F1EB9`（起收同，level `w-b30v`） |
| port / crash | 25565 0→0；`run/crash-reports` 0→0 |
| 停服 | 每轮 `{"exitCode":0,"exited":true}` |
| 世界 | `run/w-reg-b70ty-r{1..11}-v1` 共 11 个，全留 |
| 产品码 | 窗内未改（只改驱动 `testharness/player/f15-reg-chains.js`） |

**§r6 终判：PASS（W1–W7 全绿，W3 双面成立）**

本回执字数规格：11201 B / 130 行。
