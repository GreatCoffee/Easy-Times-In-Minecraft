# mobs/AI-01 判据窗判读报告（verdict：mobs-ai01-verdict）

**基线**：`f5f2563`（`mobs/AI-01: R196 mobwake 1/1000 roll (batch-night path/spawn/hatch gate + sleep-mobwake judge row, mobs-ai verdict adopted)`）
**jar**：**296,779B @2026-10-18 10:29:54**（`BUILD_EXIT=0`，`build-logs\mobs-ai01-f5f2563-build.out`）
**判决源**：`[SleepLog]` 行式（`sleep-mobwake` / `sleep-interrupt` / `sleep-forward` / `sleep-done` / `bed-refuse` / `bed-wake`）
**版本链终行**：`f5f2563`（测毕时主会话已推 `b6f67e3` mobs/AI-02 至 master，本窗全部判读数据仍取自 `f5f2563` 的 jar）
**cfg 键**：`sleep.mobwakeRarity`（默认 1000，`<1` 拒绝加载 —— `ETIMConfig` reject-load 契约）

> **判词：M-1 / M-3 / M-4 / M-5 全判据 PASS；M-2（`outcome=waked`）落 U 级 ＋ A 级冲突 —— 双支（path / spawn）结构不可达，回主会话裁决落码方向。**

---

## 一、判决类清单（终）

| # | 判决类 | 核心式 | 终态 |
|---|---|---|---|
| M-1 | mobwake 六字段正行 | `sleep-mobwake` ≥1 行，六字段齐（tick/day/mob/x,y,z/player/source/outcome），`source ∈ {path,spawn}`、`outcome ∈ {waked,noPath,noSpawn}` | **PASS** |
| M-2 | waked 判定链 | `outcome=waked` → 相邻 `sleep-interrupt reason=mobwake ticks_slept=N` → `sleep-forward slept=N`（N < 整夜）→ `sleep-done ... slept=N` | **U 级 · A 级冲突**（`outcome=waked` 零产出 13900+ 次骰；结构不可达，见 §3.2） |
| M-3 | deferred 负证 | 全窗 `sleep-mobwake deferred` 零残留 | **PASS**（两 boot 均 0） |
| M-4 | rarity=1 必中工装面 | 每睡拍骰中 ⇒ 首次睡即产 ≥1 行 | **PASS**（`rows == slept` 精确相等） |
| M-5 | rarity=1000 回归面 | `sleep-forward`/`sleep-done` 行式正常；deferred 零；mobwake 行数概率面记录 | **PASS ＋ B 级观察**（8 行，超任务书预期 0..2，归因见 §4-B1） |

---

## 二、判决源行序列（逐行引证）

### boot② — `mobwakeRarity=1000`（常态回归面）

```
L42200: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntitySkeleton x,y,z=-62,69,240 player=- source=spawn outcome=noPath
L42201: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntityZombie  x,y,z=-22,71,230 player=- source=spawn outcome=noPath
L42202: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntitySkeleton x,y,z=-43,72,214 player=- source=spawn outcome=noPath
L42204: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntitySkeleton x,y,z=-90,64,287 player=- source=spawn outcome=noPath
L42205: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntityCreeper  x,y,z=-74,66,269 player=- source=spawn outcome=noPath
L42206: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntityCreeper  x,y,z=-74,68,241 player=- source=spawn outcome=noPath
L42208: [SleepLog] sleep-mobwake tick=567926 day=24 mob=EntitySkeleton x,y,z=-21,70,244 player=- source=spawn outcome=noPath
L42209: [SleepLog] sleep-mobwake tick=567926 day=24 mob=- x,y,z=- player=- source=spawn outcome=noSpawn
L42210: [SleepLog] sleep-forward slept=7074 totalTime=567926->575000 dayTime=18387->23000 phase=FULL gate=open
L42211: [SleepLog] sleep-done achievements=wellRested potionsCleared=true slept=7074
L42213: [SleepLog] bed-wake reason=notSafe sleeper=true x,y,z=-66,68,247 tick=23002
```
全部 8 行 `tick=567926` **同一 tick**（单 tick 内 7074 次骰中 8 次）。

### boot① — `mobwakeRarity=1`（必中工装面，两段）

中段（`slept=6951`）：
```
L18200: [SleepLog] sleep-mobwake tick=592049 day=25 mob=EntitySkeleton x,y,z=-62,69,240 player=- source=spawn outcome=noPath
L18203: [SleepLog] sleep-mobwake tick=592049 day=25 mob=EntityCreeper  x,y,z=-27,64,261 player=- source=spawn outcome=noPath
L18216: [SleepLog] sleep-mobwake tick=592049 day=25 mob=EntitySkeleton x,y,z=-49,73,230 player=- source=spawn outcome=noPath
L18220: [SleepLog] sleep-forward slept=6951 totalTime=592049->599000 dayTime=18385->23000 phase=OTHER gate=open
L18221: [SleepLog] sleep-done achievements=wellRested potionsCleared=true slept=6951
L18225: [SleepLog] sleep-window gate=blocked reason=offWindow adjusted=5001 day=25
```

末段（`slept=6907`，环境已清场）：
```
L21646: [SleepLog] sleep-mobwake tick=640093 day=27 mob=EntityCreeper  x,y,z=-85,68,240 player=- source=spawn outcome=noPath
L21647: [SleepLog] sleep-mobwake tick=640093 day=27 mob=EntityCreeper  x,y,z=-102,66,265 player=- source=spawn outcome=noPath
L21650: [SleepLog] sleep-mobwake tick=640093 day=27 mob=EntityCreeper  x,y,z=-31,71,224  player=- source=spawn outcome=noPath
L21651: [SleepLog] sleep-mobwake tick=640093 day=27 mob=EntitySkeleton x,y,z=-76,68,265  player=- source=spawn outcome=noPath
L21652: [SleepLog] sleep-forward slept=6907 totalTime=640093->647000 dayTime=18324->23000 phase=OTHER gate=open
L21653: [SleepLog] sleep-done achievements=wellRested potionsCleared=true slept=6907
```

### M-2 决定性实验（1 格僵尸 ⇒ refuse 触发）

```
[rc] nearEntities(35): … | mob@-64,68,247 d=1.0 | mob@-65,68,248 d=1.1 | mob@-64,68,248 d=0.6 …
[chat] You may not rest now, there are monsters nearby
L22661: [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=6856 day=28
```

### 全 boot 计数（末段 boot①，rarity=1）

```
spawn/noSpawn = 3097      spawn/noPath = 3810      合计 rows = 6907  （== sleep-forward slept=6907）
outcome=waked            = 0
sleep-interrupt reason=mobwake = 0        sleep-interrupt（任意 reason）= 0
sleep-mobwake deferred   = 0
sleep-forward = 1        sleep-done = 1
```

---

## 三、逐窗核讫

### 3.1 M-1 / M-3 / M-4 —— PASS

| 断言 | 实测 | 判定 |
|---|---|---|
| M-1 六字段齐 | `sleep-mobwake tick= day= mob= x,y,z= player= source= outcome=` 八段全在（`ETIMMobWake.java:132-136`） | **PASS** |
| M-1 取值域 | `source ∈ {path,spawn}`（实测 `spawn`）；`outcome ∈ {waked,noPath,noSpawn}`（实测 `noPath` / `noSpawn`） | **PASS** |
| M-3 deferred 负证 | 两 boot 均 **0 行** `sleep-mobwake deferred` | **PASS** |
| M-4 rarity=1 必中 | 末段 `rows = 6907 == slept = 6907`（1:1 精确相等）；中段同构（6951） | **PASS** |

**M-4 的结构发现（重要）**：骰点挂在 **快进循环体内**（`ETIMSleepClock.java:177`：`world.rand.nextInt(ETIMConfig.mobwakeRarity) == 0`），而快进一次性推进整夜 ⇒ **单 tick 内掷 `slept` 次骰**。故：
- `rarity=1` ⇒ `rows == slept`（6907 / 6951，两段精确吻合）
- `rarity=1000` ⇒ `rows ≈ slept/rarity`（7074/1000 = 7.07，实测 8；binomial σ≈2.7，吻合）

⇒ **行数不是「每夜一枚硬币」，而是 `slept / rarity` 的确定性计数**（§4-B1 据此改判）。

### 3.2 M-2 —— U 级 · A 级冲突：双支结构不可达

**观测**：累计 **13900+ 次骰**（6907 ＋ 6951 ＋ 8 ＋ 14）**零 `outcome=waked`**；`sleep-interrupt reason=mobwake` 零行。

**静态根因（path 支）** —— `ETIMMobWake.tryPathMobToSleepingPlayer`：
```java
BlockPos bed = player.bedLocation;                 // 非 null：EntityPlayer.java:1726 trySleep 内赋值
Path path = mob.getNavigator().getPathToXYZ(bed.getX(), bed.getY(), bed.getZ());
if (path == null) return false;
PathPoint finalPoint = path.getFinalPathPoint();
double dx = finalPoint.x - bed.getX();  … 
if (dx*dx + dy*dy + dz*dz > 2.0D) return false;    // 要求 finalPoint 距床 ≲ √2 ≈ 1.41 格
```
1.12.2 `PathNavigatorGround.canReach(node, target)` 语义为 **「节点距目标 < maxPathLength(48) 即判定抵达并终止搜索」**（`maxPathLength` 是 *终止半径*，非 *路径长度上限*）。
⇒ 当 IMob 距床 < 48 格（`pathNearbyMobToRandomSleepingPlayer` 的 AABB 上限恰为 `distance ∈ {16,32,48,64}`）时，**起始节点自身即满足 `canReach`，`getPathToXYZ` 立即返回单节点路径**，`finalPoint` ≡ 僵尸自身位置。
⇒ **`distSq ≤ 2` 只能在「IMob 距床 ≲ 1.41 格」时成立。**

**该门槛与拒绝面互斥（决定性实验）**：`ETIMBedSafety.pathableHostilesNearBed`（`bed-refuse` 重定向面 ＋ `tickSentry` 面）**复用同一 helper**（同一 `getPathToXYZ` ＋ ±1 容差），且 AABB 为床 **±8 / ±5**。
⇒ 满足 mobwake path 判据的 IMob（≲1.41 格）**必然落在 ±8 内** ⇒ 入睡即 `bed-refuse reason=notSafe`（§二 L22661 实测：`d=0.6 / 1.0 / 1.1` 时触发），且一旦在睡则被 `tickSentry` 以 `tile.bed.wakeMobs` 逐 tick 弹出。
⇒ **path 支自锁：能唤醒的怪 ＝ 不能入睡的怪。**

**静态根因（spawn 支）** —— `tryPlaceNewSuitableMob(world, player, 8, 48)`：回退造怪最小半径 **8** 格 ⇒ `finalPoint` 距床 ≥ 8 ⇒ `distSq ≥ 64 > 2` ⇒ **恒 `noPath`**。
⇒ 实测 6907 行中 3810 行 `noPath` 全部来自该支，落点实测 `x,y,z` 覆盖 `(-85,68,240) / (-102,66,265) / (-31,71,224) / (-76,68,265)` 等散布点，与 8-48 格半径一致。

**另有一处放大因子（不构成阻塞，但削弱取证）** —— `pathNearbyMobToRandomSleepingPlayer`：距离扩张 `16→32→48→64` 需 `mobs.size() ≥ 16` 才 break，否则末值为 64；随后 `attempts = min(mobs.size(), 16)` 随机取样，`tried[]` 跳过重复索引。清场后仅 4 只候选时取样本已收敛，仍全失败 ⇒ 归因确定在 `finalPoint` 判据而非取样。

**⇒ A 级冲突 A1：`ETIMMobWake` 的路径探针在 1.12 语义下塌缩为「就近测试」，导致 `outcome=waked` 不可达。** 代码注释已自陈该口径：「the navigator path call loses R196's max-length/flag arguments（C-level）」—— 移植时 R196 的「有界真路径」语义丢失，是缺口根。

**伪代码建议（落码方向，待主会话裁决 —— 会话七不碰 `src/main`）**：
```
// 现状（ETIMMobWake.tryPathMobToSleepingPlayer）
Path p = mob.getNavigator().getPathToXYZ(bed);      // 起点 <48 格 ⇒ 退化为单节点
if (p == null) return false;
if (distSq(finalPoint, bed) > 2.0) return false;   // ⇒ 仅 ≲1.41 格可过

// 建议：绕开 canReach 的终止半径，改走「可达邻域」判据（R196 语义）
BlockPos mobPos = new BlockPos(mob.posX, mob.posY, mob.posZ);
if (mobPos.distanceSq(bed) > maxPathLength^2) return false;   // 真·长度上限
// 末段邻域须真实可达（复刻 pathNearbyHostilesNearBed 的 ±1/±1/±1 判据，
// 但 AABB 用 mob 自身 ±maxPathLength，避开「起点已达标即终止」的陷阱）：
for (PathPoint n : nodesAround(bed, 1))           // bed 三轴各 ±1 的 27 点
    if (mob.getNavigator().canReach(n, maxPathLength) && hasLOS(n, bed)) return true;
// 或改用 PathNavigateSmallMob / 手动 A*，使 maxPathLength 成为长度上限而非终止半径
```
**同时需裁决的互斥面**：`pathableHostilesNearBed`（±8、拒绝入睡）vs `tryPathMobToSleepingPlayer`（新判据可能放宽到数十格）—— **两者同 helper 共用判据会再次自锁**。建议将「拒绝入睡」半径与「可唤醒」半径**解耦**（例如 refuse 仍取 ±8 内的 *已逼近* 判据，wake 判据允许远端但要求真实路径抵达）。

---

## 四、冲突分级

### A 级：**1 条**

| # | 内容 |
|---|---|
| **A1** | `ETIMMobWake.tryPathMobToSleepingPlayer` 的路径判据在 1.12 `PathNavigatorGround.canReach`（终止半径 = `maxPathLength`）语义下塌缩为「≲1.41 格就近测试」；`source=path` 自锁于 `bed-refuse`/`tickSentry`（±8，同 helper），`source=spawn` 因回退造怪最小半径 8 格恒 `noPath` ⇒ **`outcome=waked` 双支皆不可达** ⇒ M-2 U 级。**待主会话裁落码方向**（建议见 §3.2 伪代码） |

### B 级：**2 条**

| # | 内容 |
|---|---|
| **B1** | **mobwake 行数口径改判**：非「每夜概率面」，而是 **`rows ≈ slept / rarity`** 的确定性计数（`rarity=1` 两段精确 `rows==slept`：6907/6951；`rarity=1000`：`7074/1000=7.07` vs 实测 8）。任务书 M-5 的「0..2 属预期」应修订为 `⌊Binomial(slept, 1/rarity)⌋`。 |
| **B2** | **vanilla CME 崩溃 ×3（非 mod 面，异窗污染源）**：`crash-2026-10-18_11.20.01` = `ConcurrentModificationException @ Chunk.func_177414_a`（`EntityItem` tick 面，批量 kill 掉战利品所致）；`crash-2026-10-18_11.42.42` = `CME @ EntityTracker.func_72788_a`（`MinecraftServer.func_71190_q:779`），紧邻 `[AILog] mob despawn kill counter=200/202`。两份 crash report 均标 **"No Mixin Metadata is found in the Stacktrace"** ⇒ 纯 vanilla 面。**观察面**：ETIM 的 `[AILog] mob despawn` 哨兵会加重实体 churn，与 vanilla tracker 迭代交叠时放大崩溃概率 —— 是否需要在哨兵侧规避，**待主会话裁决**（我方无 src/main 权限，不自行改码）。 |

### C 级：**5 条**（全为工装侧）

| # | 内容 |
|---|---|
| **C1** | **`/execute <x> <y> <z> <cmd>` 位置前缀在本服不可用**：`execute 0 0 0 testfor @e[type=creeper]` ⇒ `Entity '0' cannot be found`。⇒ **所有「限定半径 kill/testfor」经 RCON 的做法全是空操作**（本窗前数次清场因此全部无效，浪费多轮）。位置语义面只能走 **bot chat 面**（`@e[r=]` 以 bot 为原点）或全局选择器。 |
| **C2** | **RCON 选择器原点是 (0,0,0) 而非世界出生点** ⇒ RCON 侧 `@e[…,r=]` 需按原点换算坐标，或改走 bot chat 面。 |
| **C3** | **批量 `/kill` 前须 `gamerule doMobLoot=false`**：掉落 `EntityItem` 在 tick 中并发改 `Chunk` 的 `ArrayList` ⇒ vanilla CME（`crash-…11.20.01`）。实测 `doMobLoot=false` 后 kill 批次不再触发该面。 |
| **C4** | **`bed-refuse`/`tickSentry` 共用 ±8 AABB ＋ pathable 判据** ⇒ 判据环境任何位于床 ±8 的可寻路怪都会阻断入睡（含玩家自己召唤的怪，僵尸 `followRange=32.0` 会主动走进 ±8）。判据搭建纪律：**候选怪必须同时满足「在 mobwake AABB（≤64 格）内」且「在 ±8 拒绝域外」**。 |
| **C5** | **harness 无 chat 工步**：`bed-entry-ops.js` 工步表（`hut/block/slab/mob/cage/rc/effect/cagebed/pit/roof/fill2/info`）无 `chat`，故任务书的「bot chat 面」降级为 RCON ＋ **显式坐标**（`/summon zombie <x> <y> <z>` 无位置歧义）。**建议主会话择机补一个 `chat` 工步**以对齐位置语义面纪律。 |

---

## 五、工装改动记录

| 项 | 内容 |
|---|---|
| 落码面 | **零改动**（`src/main` 未碰）。基线 `f5f2563` 由主会话落码 |
| cfg | `I:mobwakeRarity`：boot① 前置置 `1` → **用毕复原 `1000`**（终态）；`S:moonStateOverride=`（空，全程）；`B:weatherSystem=true` |
| 世界 | **新增石走廊 246 块**（判据环境，可随时清）：`/fill -88 67 245 -66 67 249 stone`（115）＋ `/fill -114 67 245 -88 67 249 stone`（130）＋ `/fill -65 67 247 -65 67 247 stone`（1）。床块 `-66,68,246/247` 未受影响（`testforblock … minecraft:bed` 复核在位）。**若主会话要求零残留，可一条命令回填** |
| harness | 未新增工步。常驻在线用 `bed-entry-ops.js rc -66 68 246 <secs> - sweep` |
| 长日志 | `build-logs\mobs-ai01-f5f2563-build.out`；崩溃档 `run\obfuscated\crash-reports\crash-2026-10-18_11.20.01 / 11.39.16 / 11.42.42` |

---

## 六、留账

- **挖床 AI（mobsDigging）**：`tickSentry:413` deferred 面 —— 主会话已落 `b6f67e3`（mobs/AI-02: zombie dig AI），**本窗未覆盖**，留待 AI-02 判据窗。
- **mobwake 1/1000 延迟账** —— 本窗首次取得口径（B1）：计数口径为 `slept/rarity`，非每夜概率。
- **三态意识态延迟账** —— consciousness 切片候选（五批文裁决 5 out 已定），本窗未触及。
- **`Chunk.getPrecipitationHeight` 语义面** —— 跨切片复核项，本窗未触及。
- **`PathNavigatorGround.canReach` 终止半径语义** —— 本窗新发现，**不限于 mobwake**：凡以 `getPathToXYZ` 的 `finalPoint` 做「是否抵达」判据的落码面，均可能在起点已达标时静默退化。**建议全项目 grep 该模式**（待主会话裁决）。

---

## 七、状态与清理

- **进程**：server `stop`（11:5x）；25565 无监听；testharness node 零残留（Gradle daemon 按纪律不清）。
- **cfg 终态**：`S:moonStateOverride=`（空）／`I:mobwakeRarity=1000`（归常态）／`B:weatherSystem=true`。
- **gamerule 终态**：`doDaylightCycle=true` ／ `doMobSpawning=true` ／ `doWeatherCycle=true` ／ `doMobLoot=true`（已复原）。
- **工作树**：测毕时已被主会话推至 `master` @ `b6f67e3`；**`src/main` 净**；本窗未产生任何本地改动。

---

**判读签署**：会话七 ｜ 基线/版本链终行 **`f5f2563`** ｜ jar 296,779B @2026-10-18 10:29:54 ｜ **M-1 / M-3 / M-4 / M-5 全判据 PASS；M-2 落 U 级**（`outcome=waked` 13900+ 次骰零产出，双支结构不可达，A 级冲突 A1，附伪代码建议）｜ **A 级 1 条、B 级 2 条、C 级 5 条**