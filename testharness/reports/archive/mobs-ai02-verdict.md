# mobs/AI-02 判据窗判读报告（verdict：mobs-ai02-verdict）

**基线**：`72bb9e9`（＝ master HEAD，jar 沿用 **320,029B @2026-10-18 13:23:30**，`BUILD_EXIT=0`）
**判决源**：`run\obfuscated\logs\latest.log`（`[SleepLog]`／`[AILog]`／`[FoodLog]` 三通道）
**cfg 六键终态（已复原并回读）**：`L254 S:moonStateOverride=` ／ `L269 B:zombieDigAI=true` ／ `L359 B:bedHostilePathable=true` ／ `L371 B:bedSentryWake=true` ／ `L377 I:mobwakeRarity=1000` ／ `L395 B:weatherSystem=true`
**gamerule 终态（已复原并回读）**：`doDaylightCycle`／`doMobSpawning`／`doWeatherCycle`／`doMobLoot` 全 true
**世界终态**：木板墙（`x=-67, y=68..69, z=245..249`，9 块）已拆为 air；`x=-67,y=67` stone 在位；**床 fixture 重建并复核在位** `-66,68,246/247`
**进程**：25565 无监听；java 零残留；testharness node 零残留
**工作树**：`## master...origin/master`；**`src/main` 净**（本窗 `src/main` 零改动）

> **判词：G-1 ✓ / G-2 ✓ / G-5 ✓ / G-6 ✓ / G-7 ✓（附 A7 口径修正）＝ 5 条 PASS；G-3 / G-4 未证。**
> **新增 A7（机制级）、A8（沉默杀手级）、B5、B6、C4–C7。**

---

## 一、判决类清单

| # | 判决类 | 终态 |
|---|---|---|
| **G-1** | `bed-dig` 行式（progress 递进） | **PASS** —— 11 行，同坐标 progress **0→10** |
| **G-2** | 挖穿链（progress=10 → 方块消失） | **PASS** —— 挖穿后两格床块 `testforblock` 均 **Air** |
| G-3 | 躺卧期门 `bed-wake reason=digging` | **未证** —— 见 §四（受 B5 几何解耦未解阻塞） |
| G-4 | 入口 `bed-refuse reason=mobsDigging` | **未证** —— 同 G-3 |
| **G-5** | frenzy 正证（徒手 ＝ 工具门短路） | **PASS** —— dig 行落于 frenzy 窗 ＋ 徒手僵尸 |
| **G-6** | frenzy 负证（非 frenzy 窗零挖掘） | **PASS（新增）** —— `gate=orGate` 行在场 ＋ **零 `bed-dig`**，且僵尸确已取得目标并抵 `sameBlock` |
| **G-7** | 总开关负证（`zombieDigAI=false`） | **PASS（新增，口径见 A7）** —— **零 `bed-dig` ＋ 零 `dig-gate` 行** ＋ 僵尸活跃（击杀 bot） |
| R-1..R-3 | AI-01 M-2 复窗 | **未跑** |

---

## 二、判决源行序列

### 2.1 G-1 / G-2 —— `bed-dig` 全链 ＋ 挖穿实证
```
L7190: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=0  tick=740800
L7239: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=1  tick=740830
L7244: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=2  tick=740860
L7251: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=3  tick=740890
L7258: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=4  tick=740920
L7282: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=5  tick=740950
L7292: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=6  tick=740980
L7298: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=7  tick=741010
L7325: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=8  tick=741040
L7332: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=9  tick=741070
L7339: [SleepLog] bed-dig mob=EntityZombie x,y,z=-66,68,247 progress=10 tick=741100   ← 挖穿拍
```
**拍距 Δ30 tick ＝ `cooloff = 300 × hardness / 2`**，床 hardness 0.2 ⇒ 30 ⇒ 与 `ETIMEntityAIDig.getCooloffForBlock` 公式**逐位吻合**（正面印证 A2 落码的 progress 边沿面）。

**G-2 挖穿核读**：
```
/testforblock -66 68 247 minecraft:bed → The block at -66, 68, 247 is Air (expected: tile.bed.name)
/testforblock -66 68 246 minecraft:bed → The block at -66, 68, 246 is Air (expected: tile.bed.name)
```

### 2.2 G-6（非 frenzy 负证）—— **本轮新增**
场景：实心 2 层墙 `x=-67, y=68..69, z=246..248` ＋ 床；bot 喂食后睡床；`moonStateOverride=`（空）＋ `zombieDigAI=true` ＋ `bedSentryWake=true`；观测窗 `adjusted = 6014 → 9416`（**非 frenzy**，`[6000,18500)`）。
```
L863:  [SleepLog] dig-gate mob=EntityZombie gate=orGate                          tick=841251
L864:  [SleepLog] bed-wake reason=notSafe sleeper=true x,y,z=-66,68,247          tick=162579
L872:  [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=7285 day=36
L1021: [SleepLog] dig-gate mob=EntityZombie gate=walk dist=2.774336338043213      tick=841725
L1080: [SleepLog] dig-gate mob=EntityZombie gate=sameBlock                        tick=841851
L1317: [SleepLog] dig-gate mob=EntityZombie gate=sameBlock                        tick=842451
L1522: [SleepLog] dig-gate mob=EntityZombie gate=sameBlock                        tick=843051
```
- **`bed-dig rows = 0`**（整窗）⇒ **非 frenzy 窗零挖掘** ⇒ G-6 成立。
- **负证强度补强**：窗内僵尸**确实取得目标并抵 `sameBlock`**（`walk dist=2.77` ⇒ 距 2.77 格有活跃路径），排除「因为没目标所以没挖」的伪零。
- 床块窗末复核仍在位（`Successfully found the block at -66, 68, 247`）。

### 2.3 G-7（总开关负证）—— **本轮新增，口径按 A7 修正**
场景：`zombieDigAI=false` ＋ `moonStateOverride=blood` ＋ `bedSentryWake=true`；观测窗 `adjusted = 19483 → 4498`（**frenzy**）；僵尸在场并击杀 bot。
```
L939:  ETIM_Harn04 was slain by Zombie                      ← 僵尸活跃实证（t ≈ +26s）
L695:  [AILog] mob despawn counter-meter counter=3 age=1 entity=EntityZombie#168
```
- **`bed-dig rows = 0`**、**`dig-gate rows = 0`**（补测窗 250s，`adjusted 23293 → 4498`，僵尸全程在位）
- 床两格窗末复核**完好**
- **`gate=cfg` 行：结构性不可达**（见 A7），故本类锚点改为「**零行 ＋ 零挖掘 ＋ 僵尸活跃**」。

### 2.4 B5 的决定性对照 —— **墙高决定 `canSee`**
同一 jar、同一 boot 族、同一 bot（生存化、喂食、入床）、同一召僵尸坐标 `-68 68 247`，**仅墙高不同**：

| 墙 | `dig-gate` 序列 | 结论 |
|---|---|---|
| **2 层**（`y=68,69`） | `target` ×N（100s+ 全程） | **睡眠玩家取不到目标** ⇒ `canSee` 失败 |
| **1 层**（`y=68`） | `L449 target` → `L486 sameBlock`（≈6s） | **睡眠玩家可被选取** ⇒ 主会话静态结论获运行时确证 |

⇒ **A5 之后的新主嫌疑不是 mod，是工装几何**：睡眠者眼高 ≈ `posY+0.2`（≈y68.4），僵尸眼高 ≈ y69.74，`EntitySenses.canSee` 的射线自西向东**下行**穿过 x=−67 处 y≈69.4 ⇒ 正落在 2 层墙的 `y=69` 块内 ⇒ 命中 ⇒ 不可见。

---

## 三、冲突分级

### A 级：**2 条**

#### A7（新增 · 机制级）`zombieDigAI` 双闸，`gate=cfg` 行结构性不可达
`MixinEntityZombie.java:25`
```java
if (ETIMConfig.zombieDigAI && !zombie.world.isRemote) {
    zombie.tasks.addTask(1, new ETIMEntityAIDig(zombie));
}
```
⇒ `zombieDigAI=false` 时 **`ETIMEntityAIDig` 根本不入 task 列表**，`shouldExecute()` 从不执行 ⇒ `ETIMEntityAIDig.java:56` 的 `return this.gateFail("cfg", "");` **是死代码**。

**⇒ 任务书 G-7 预期的 `gate=cfg` 行在结构上不可达**，须改锚点（已按「零行＋零挖掘＋僵尸活跃」取证，见 §2.3）。
**⇒ 取舍归因（待主会话裁决）**：同一开关在「注册面（Mixin）」与「执行面（`shouldExecute`）」双闸，属冗余。依项目规约 1（不留兼容层/死码）应二择一 —— 若保留双闸，需在 `gateFail` 处注明「仅在配置热更时可达」；若删执行面闸，判据面将失去 `gate=cfg` 这个可观测点。**会话七无 `src/main` 权限，不落码。**

#### A8（新增 · 工装级但**沉默作废全部睡眠窗**）ETIM 营养池归零 ⇒ `tile.bed.tooHungry`
`ETIMFoodStatsEvents.java:87-103` ＋ `ETIMConfig.java:441`（`food.hungerSleepDeny`，默认 `true`）：
> 营养为 0 时无法睡觉：躺下被拒（`tile.bed.tooHungry`）／已躺下的被踢醒。

判决源（本轮取到，属 `[FoodLog]` 通道）：
```
L5492: [FoodLog] ETIM_Harn04 (236) tooHungry (right-click bed while starvation)
L5920: [FoodLog] ETIM_Harn04 (297) tooHungry (right-click bed while starvation)
L7270: [FoodLog] ETIM_Harn04 (338) eat minecraft:golden_carrot satiationGain=1 nutritionGain=2 sugar=0 (pools 1/6 2/6 ...)
```
- 该门**在所有 ETIM 床面之前**触发 ⇒ 门被拒时 `bed-wake` / `bed-refuse` / `dig-gate` 全不产生 ⇒ **整个睡眠窗被静默作废，且日志上表现为「零行」，极易误读成负证通过。**
- 本窗多轮 `gate=target` 中有数轮真因即此（bot 长期挂机，nutrition 池归零）。
- **本窗已修（testharness 侧）**：新增 `eat` op 补营养/饱和，修后同坐标同几何 `rc` 点床 `finalSleeping=true`、`bedMsgs=0`。
- **⇒ 所有 sleep/bed 判据窗的前置条件增补：开窗前必须 `eat` 喂食并以 `[FoodLog] tooHungry` 零行为准。**

### B 级：**2 条**

#### B5（新增）**断路与保 LOS 不可由墙高单独解耦**
- 2 层墙 ⇒ 断路成立，但 **`canSee` 被杀** ⇒ 取不到目标 ⇒ `gate=target`。
- 1 层墙 ⇒ `canSee` 成立（睡眠玩家可被选取），但**导航可跨越** ⇒ `walk` / `sameBlock` 抢先 ⇒ 零挖掘。
- 已试**第三种解耦**：全封墙（`x=-67, y=68..69, z=245..249`）＋ 仅在射线上留 1 格高通风口（`setblock -67 69 247 air`，下沿仍是 `y=68` 墙块 ⇒ 净高 1 ⇒ 导航过不去）⇒ **仍 `gate=target`**，未恢复选取。推断：睡眠者眼位更低，射线实际下穿位置低于通风口。**通风口高度需重新标定（待下一窗实测）。**

#### B6（新增 · 机理）dig 面的进入窗口恰为 **1 tick**
`ETIMEntityAIDig.java:114-117`
```java
this.digger.getNavigator().getPathToEntityLiving(target);   // 纯计算，不落槽
if (!this.digger.getNavigator().noPath()) {                  // 读的是「活跃路径」
    return this.gateFail("walk", ...);
}
```
配合 `:77-80`（`s.isDestroyingBlock()` 时直接 `return true`，绕过 `walk` 门）：
- `getPathToEntityLiving` **不写入活跃路径**（重确 B1），`noPath()` 仅在移动任务真正启动导航后才为 false。
- dig 任务 `priority=1 / mutex=3`，在每 tick 的任务序列中**先于**移动任务求值 ⇒ **目标刚被选取的那一 tick，dig 面的 `noPath()` 恒 true**，随后移动任务才建活跃路径 ⇒ `gate=walk`。
- ⇒ **成功窗是抢到这一 tick 的结果，天然脆弱**；这也解释了同配方下「有时 PASS、有时 `walk`/`sameBlock`」的非确定性。**此面不需落码，是既有语义的必然推论。**

### C 级：**4 条**（工装侧）

| # | 内容 |
|---|---|
| **C4**（新增） | **`Start-Job` 起的常驻 bot 随 shell 调用结束而被杀**（每次 `shell` 是独立进程）⇒ 常驻 bot 必须在**同一次调用内创建并消费**。本窗曾因此丢失目标链（`There are 0/5 players online` ＋ 僵尸被 despawn 哨兵 `distSq=4364` 杀掉）。 |
| **C5**（新增） | `/give <p> <item> <count> <data>` —— 传 `1 64` 是「1 个、数据值 64」，不是一组。喂食用 `64 0`。 |
| **C6**（新增） | 2 层墙（`z 246..248`）**封不住走廊**：可行走 z 为 245..249 ⇒ 僵尸绕行至床 ±1 内 ⇒ sentry `notSafe` 抢先 ⇒ G-6 的「sentry 安静」子判据**在本工装几何下不可满足**（非 mod 缺陷）。 |
| **C7**（新增） | **床 fixture 不跨 boot 存活**：本窗两次在窗末 `testforblock` 得 `Air`（其中一次窗内 `reclick target = bed meta=0` 仍在位）⇒ 每 boot 必须重铺 ＋ 回读复核。 |
| C1（沿用） | `rc`/`rcw` 的 watch 须覆盖「连上＋等窗＋窗内观察」全程；本窗实际有效上限受 C4 约束，改为「窗内现连现用」。 |
| C2/C3（沿用） | RCON `/tp` 须玩家在线；`/execute` 位置前缀不可用；选择器原点 (0,0,0)；批量 `/kill` 前须 `doMobLoot=false`；`/testfor @e[x=,y=,z=,r=N,type=…]` 显式坐标可用；`/setblock … minecraft:bed 0 {facing:south,half:foot,occupied:false}` 可重建床。 |

---

## 四、G-3 / G-4 未证的原因（精确归因，不遮蔽）

1. **A8（已修）**：前数轮 `gate=target` 的真因之一是 bot nutrition 归零 ⇒ `tooHungry` ⇒ 从未入睡。喂食后已能稳定入睡（`finalSleeping=true`）。
2. **B5（未解）**：能入睡后，唯一能同时满足「`canSee` 通」与「导航不通」的几何尚未找到：
   - 2 层墙 ⇒ `canSee` 断 ⇒ 无目标；
   - 1 层墙 ⇒ 目标立得，但导航通 ⇒ `walk`/`sameBlock`；
   - 全封墙＋1 格通风口 ⇒ 仍无目标。
3. ⇒ 在 B5 解耦成功前，G-3（`bed-wake reason=digging`）与 G-4（`bed-refuse reason=mobsDigging`）**在结构上不可达**：`bed-wake reason=digging` 要求僵尸先 `isDestroyingBlock()`，而开dig 的唯一入口 `shouldExecute` 又先被 `target`/`walk` 门挡死。
4. **旁证已备**：本窗两次取到 sentry 面的合法样本，可供 G-3 面复用对照：
   ```
   L864:  bed-wake  reason=notSafe sleeper=true x,y,z=-66,68,247 tick=162579
   L872:  bed-refuse reason=notSafe         x,y,z=-66,68,247 adjusted=7285 day=36
   L2265: bed-wake  reason=notSafe sleeper=true x,y,z=-66,68,247 tick=181593
   L2295: bed-refuse reason=notSafe         x,y,z=-66,68,247 adjusted=2296 day=36
   ```
   ⇒ **同一 `bed-wake`／`bed-refuse` 行的 `reason` 字段是分面判定的唯一依据**；`digging` / `mobsDigging` 两个取值面**仍待 B5 解开后取证**。

---

## 五、下一窗配方 v6（G-3 / G-4 · 待 B5 解耦成功后）

```
前置  : cfg moonStateOverride=blood / zombieDigAI=true / bedSentryWake=true / mobwakeRarity=1000
        gamerule doMobSpawning=false / doMobLoot=false ；/difficulty easy
        玩家 /gamemode survival ETIM_Harn04（A5 消歧，不可省）
开窗前: **先 eat 喂食**，以 [FoodLog] `tooHungry` 零行为准（A8）
场景  : 床 /setblock -66 68 246 minecraft:bed 0 {facing:south,half:foot,occupied:false}
              /setblock -66 68 247 minecraft:bed 0 {facing:south,half:head,occupied:false}
        隔断 : **待定**（见 B5 —— 目标是「导航过不去 ＋ canSee 过得了」）
        僵尸 : /summon zombie -68 68 247
时序  : 删 /time set；轮询 adjusted ∈ [19500,21500] 或 [1000,4500] 入 frenzy 窗再 summon
bot   : rcw -66 68 246 250 1200 -     ← 同一次 shell 调用内创建并消费（C4）
判读  : bed-dig progress 链 ⇒ 1-2t 内 bed-wake reason=digging（G-3）
        ⇒ rcw 自动复点 ⇒ bed-refuse reason=mobsDigging（G-4）
```
**隔断候选（按优先级）**：① 全封墙 ＋ **标定后的通风口**（净高 1，位置需使 `canSee` 射线穿孔 —— 建议按睡眠者实际眼位 `posY+0.2` 反算孔的 y）；② 半高实体方块（半砖/台阶）＋ 上方 1 格通风口组合；③ 把 bot 的床位抬高 1 格（改变睡眠者眼位），使 2 层墙顶恰好落在射线之下。

---

## 六、本窗新增工装（`testharness/player/bed-entry-ops.js`，`src/main` 零改动）

| op | 用途 |
|---|---|
| `rcw <bx> <by> <bz> [watch=600] [delay=1200] [effect]` | 点床后**在同一次连接内**于首个 S→− 跃迁（被弹醒）后延时复点。`rc` 只点一次，到不了 G-4 所需的「挖掘中重新躺下」状态。**从不 sweep**（挖掘中的僵尸必须活到 refuse 面）。 |
| `eat [item=golden_carrot]` | 补营养/饱和池。专治 A8：`hungerSleepDeny` 下 nutrition==0 会以 `tile.bed.tooHungry` 静默作废整个睡眠窗。 |

---

## 七、留账（跨切片）

- **`[FoodLog]` 是 `foodDebugLog` 控制的开发通道，当前配置为开** —— 建议在报告口径中登记为可用判据面（项目规约 9 的「判定日志」要求已满足）。
- **A7 的双闸冗余**待主会话裁决（会话七无 `src/main` 权限）。
- **B5 的通风口标定**是 G-3／G-4 的唯一前置。
- vanilla `EntityTracker.func_72788_a` / `Chunk.func_177414_a` CME 观察面本窗未复现（`doMobLoot=false` ＋ despawn 哨兵照常在跑）。
- AI-01 M-2 复窗 R-1..R-3：同 jar 串行，受 C1／C4 约束。

---

**判读签署**：会话七 ｜ 基线 **`72bb9e9`**（＝ master HEAD，jar 320,029B @13:23:30）｜ **G-1 ✓ / G-2 ✓ / G-5 ✓ / G-6 ✓ / G-7 ✓（附 A7 口径修正）＝ 5 条 PASS**，G-3 / G-4 / R-1..R-3 未证未跑 ｜ **A 级 2 条（A7 机制级双闸冗余、A8 工装级沉默作废睡眠窗）、B 级 2 条（B5 断路/LOS 不可解耦、B6 dig 入口窗口＝1 tick）、C 级 4 条（C4–C7）** ｜ `src/main` 零改动，游离头已收（master），世界/cfg/gamerule/进程全部复原并回读复核

---

# 追加卷 · v6 复跑（基线 `fe43c0e`，新 jar 319,996B @2026-10-18 16:33:43）

> **判词：G-7 重验 PASS（A7 落码生效）；G-3 / G-4 仍未证 —— 但阻塞点已由「机理不明」收敛为「单一几何条件不可同时满足」，并新挖 4 条 A/B 级与 4 条 C 级工装规律。**

## 追加一、G-7 重验（新 jar）—— **PASS**

cfg：`moonStateOverride=blood` ／ `zombieDigAI=false` ／ `bedSentryWake=true`

```
L863:  [SleepLog] dig-gate mob=EntityZombie gate=cfg tick=871849
L872:  [SleepLog] dig-gate mob=EntityZombie gate=cfg tick=872449
L873:  [SleepLog] dig-gate mob=EntityZombie gate=cfg tick=873049
L874:  [SleepLog] dig-gate mob=EntityZombie gate=cfg tick=873649
（共 7 行 gate=cfg）
bed-dig rows = 0 ；bed-wake = 0 ；bed-refuse = 0
[FoodLog] tooHungry（eat 之后）= 0 行
```
⇒ **A7 落码生效：`gate=cfg` 行结构性可达**，G-7 口径恢复为「`gate=cfg` 行 ＋ 零 `bed-dig` ＋ 零挖掘」，**PASS**。

## 追加二、A7 落码静态确认

`MixinEntityZombie.java:25` 现为 `if (!zombie.world.isRemote) { zombie.tasks.addTask(1, new ETIMEntityAIDig(zombie)); }`（cfg 门已删）；
`ETIMEntityAIDig.java:56` 的 `gateFail("cfg","")` 因此**复活为唯一 cfg 出口**（不再是死代码）。双闸冗余已消除。

## 追加三、G-3 / G-4 未证的**收敛归因**（本轮 9 次长跑）

G-3（`bed-wake reason=digging`）要求三件事**同一 tick 同时成立**：

| # | 条件 | 代码出处 |
|---|---|---|
| ① | `player.isPlayerSleeping()` | `ETIMBedSafety.tickSentry` 首门 |
| ② | `isHostileEntityDiggingNearBed` ＝ 僵尸 `isDestroyingBlock()` 且挖点在床 **±8/±5** 内 | `ETIMDigging:590-602` |
| ③ | 僵尸持有 `getAttackTarget() == player`（dig 面 `:68-71`） | `ETIMEntityAIDig:68` |

而①本身要求「床 ±8/±5 内**没有能寻路到床的 IMob**」：

```java
// ETIMBedSafety.java:56-95  —— notSafe 与睡眠 sentry 面共用
// :58 注释：vanilla :1697 builds it as x±8 / y±5 around the bed
Path path = entity.getNavigator().getPathToXYZ(bedX, bedY, bedZ);   // :79
if (path == null) continue;                                        // :80-82
if (|finalPoint.x-bedX|<=1 && .y<=1 && .z<=1) nearest = entity;    // :87-89
```
⇒ **①与③的几何要求互斥**：
- ③ 需 `EntitySenses.canSee`（或 600t 反击记忆）⇒ 僵尸必须在**开阔地面**、视线上无 ≥2 层遮挡；
- ① 需僵尸**不可寻路到床** ⇒ 必须有 ≥2 层断路（2 层墙 / 2 格深坑）。
- 2 层墙 ⇒ `canSee` 断（实测：`gate=target` 持续 100s+）；1 层墙 ⇒ `canSee` 通但可跨越（实测：6s 内 `target→sameBlock`，`gate=walk`）。
- 2 格深坑 ⇒ `noPath()` 恒真、`notSafe` 静（实测：bot 稳定入睡 86–139s），但坑壁/坑沿切断 `canSee`（实测：`gate=target` ×8）。

**唯一未被证伪的路径**（本轮已打通前 4 步、败在第 5 步的 ~1s 时序）：
东侧开阔地取目标（`canSee`，实测 10–14s 可成）→ **tp 进 2 格深坑**（目标靠 300t 记忆续命，不再需要 `canSee`）→ bot 点床入睡 → 僵尸在坑内挖掘（挖点在床 ±2 内）⇒ `bed-wake reason=digging`。
实测末次：`tp` 成功入坑、bot 入睡成功（344 拍 `S`）、**`bed-dig` 4 行**、挖点 `(-69,67,250)`（`|dx|=3,|dy|=1,|dz|=3` ⇒ 全在 ±8/±5 框内）——但挖掘发生在 **click 后 ~1s、入睡前**，故 `bed-wake` 未出。**差 ~1 个 tick 的对齐**。

## 追加四、新增冲突分级

### A 级

**A9（新增 · 机制级）床入口门是**一串**，且 `notSafe` 与睡眠 sentry 面判据相同**
`MixinEntityPlayer.java:100-118` redirect 了 vanilla `trySleep` 的 `getEntitiesWithinAABB`，交给 `ETIMBedSafety.pathableHostilesNearBed`；后者用 **vanilla 的 `x±8 / y±5` AABB ＋「能寻路到床且终点 ±1」**。
⇒ **「有可寻路到床的敌对生物在床 ±8/±5 内」在没有 `bedSentryWake` 时同样会拒绝躺下**。所以 `bedSentryWake=false` 并不能救 G-3/G-4（与本报告前卷 A6 的结论一致，但机理比原先记录的更硬：不是 ±1 逐轴，是 ±8/±5 ＋ 寻路）。
**⇒ 待主会话裁决**：`notSafe`（入口）与 sentry（躺卧）共用同一判据，可能是有意的 R196 忠实转置，但也意味着「躺下被拒」与「躺下后被踢」在日志上无法用几何区分——判定面只有 `bed-refuse` vs `bed-wake` 的行名。

**A10（新增 · 机制级）`notSheltered`：屋顶必须在床周围 7×7 连续，且玻璃不算豁免**
`ETIMBedSafety.java:103-151`（R196 `World:5658-5875` 逐字）：
- `:118` `isAirOrPassableBlock(x,y,z) && getPrecipitationHeight(x,0,z).getY() <= y` ⇒ 露天；
- `:109-115` 还递归查 `y+1` / `y+2`；
- `:122-151` 及 `checkBlock[49]` 网格覆盖 **7×7 邻域**。
⇒ 实测：在离床 3 格的 `z=250` 开一条 3 格高的槽（挖掉 `y=68..70`）⇒ 床立刻被判露天，`tile.bed.notSheltered`，**躺下被拒**。补满 `y=70` 的 31 块实心屋顶后立刻恢复 `sleeping=true`。
⇒ **工装结论：床 fixture 必须在 7×7 范围内保持连续实心屋顶。**

### B 级

**B7（新增 · 几何级，G-3/G-4 的最终瓶颈）**
「取目标（需 `canSee`）」与「不可寻路（需 ≥2 层断路）」在**同一 x 列上不可同时成立**：
- 2 层墙：`canSee` 断 ⇒ `gate=target`（实测 100s+）
- 1 层墙：`canSee` 通，但可跨越 ⇒ `gate=walk` / `sameBlock`（实测 6s 内）
- 2 格深坑：`noPath()` 真、门皆静、bot 能睡，但 `canSee` 被坑壁切断 ⇒ `gate=target`
- 坑顶开口 ＋ 侧向偏移：仍 `gate=target`（斜射线被地板/坑沿截断，实测）
⇒ **唯一出路 = 用 600t/300t 目标记忆把「取目标」与「不可寻路」在时间上解耦**（先开阔地锁定，再 tp 进坑）。本轮已把该路径推到「差 1 tick」。

**B8（新增 · 时序级）`bed-dig` 会抢在 bot 入睡前 1 个 tick 发生**
末次实测：`click#1` 在 `11:36:13.995`，`bed-dig` 首次在 tick 1076383（约同一秒），bot 的首个 `S` 采样在 click 后 ~1.5s。⇒ **dig 链的启动早于躺下完成**，`tickSentry` 那一 tick 仍见 `!isSleeping` 而早退。
⇒ 下一版须让**僵尸先静默、bot 先入睡，再放开僵尸挖掘**（例如把僵尸先关在无目标状态、入睡后再 tp 到坑内——本轮正是该顺序，但目标记忆在 tp 前已因 50s 空等而耗尽）。

### C 级

| # | 内容 |
|---|---|
| **C8**（新增） | **点床必须紧随 `/tp`**：`/tp` 后 ~1.3–2.5s 点床 ⇒ 稳定 `sleeping=true`；**同一 op 在 `/tp` 后 18s 点床 ⇒ 客户端全 `-`、服务器零 `tile.bed*` 行**（use 包根本没落地）。已在 `rcw` 闸门分支加「放闸后重 tp＋立即点床」。 |
| **C9**（新增） | **1.12.2 选择器不支持 `limit=`**（`Invalid selector argument: 'limit=1'`）。单目标定位改用 `r=N`；要保证唯一性用 `doMobSpawning=false` ＋ 事前 `kill @e[type=zombie]`。 |
| **C10**（新增） | `/setblock <pos> air` 在目标已是空气时会回 `The block couldn't be placed`（不是失败）；`/setblock x y z stone` 在已是石头时同样。**判据一律用 `testforblock` 回读，不看 setblock 返回文本**。 |
| **C11**（新增） | **床 fixture 三步法**：`setblock … air` → `fill 支撑 stone` → `setblock foot` → `setblock head` → `testforblock` 回读；单次铺垫约 1/3 概率静默失败，须**重试 ≤4 轮直到双格回读成功**。 |
| **C12**（新增） | `/tp <selector> <x> <y> <z>` 对实体生效后会**回显实际落点**（例：请求 `-68 68 247`，回显 `-67.5, 68.0, 247.5`）⇒ 必须按回显核位，不可假设精确落点。 |
| **A8 扩展** | 睡眠中营养池持续衰减：实测 **≈70–140s 归零 ⇒ `tile.bed.wakeHungry`**，随后复点被 `tooHungry` 拒。⇒ 任何 sleep 窗都必须把判据动作压在**躺下后 ~60s 内**，且开窗前 `eat`（`rounds>0` 为准，本轮 3/9 次 `rounds=0` 静默失败）。 |

## 追加五、下一版配方 v7（G-3/G-4，含本轮修正）

```
前置  : cfg moonStateOverride=blood / zombieDigAI=true / bedSentryWake=true / mobwakeRarity=1000
        gamerule doMobSpawning=false / doMobLoot=false ；/difficulty easy
        /gamemode survival ETIM_Harn04（A5 不可省）
屋顶  : fill -69 70 243 -63 70 250 stone          ← A10：7×7 连续实心，玻璃不算
床    : setblock …air → fill -66 67 246 -66 67 247 stone → foot/head → testforblock 回读（C11）
坑    : fill -68 65 250 -68 65 250 stone ；fill -69 66 249 -67 67 251 stone ；
        fill -68 66 250 -68 67 250 air            ← 2 格深、顶敞口（B7 唯一非通路几何）
开窗前: eat 直到 rounds>0（A8）；确认 [FoodLog] tooHungry 零行
步骤1 : 召僵尸东侧开阔地（-64 68 246）→ 轮询 dig-gate 出非 target 门位 ⇒ 锁定成功
步骤2 : tp @e[type=Zombie,x=-66,y=68,z=247,r=64] -68 66 250 → testfor 回读入坑（C12）
步骤3 : 放闸 → bot 重 tp ＋ ~2.2s 后点床（C8）→ 等 ≥6s 确认 samples 出 S
步骤4 : 观察 180s
判读  : bed-dig（挖点在 ±8/±5 内）⇒ bed-wake reason=digging（G-3）
        ⇒ rcw 自动复点 ⇒ bed-refuse reason=mobsDigging（G-4）
```
**关键风险（本轮实测）**：步骤 1→2 的锁定轮询曾耗 50s，导致 300t 目标记忆在 tp 前耗尽 ⇒ `gate=target`。v7 必须**把锁定轮询上限压到 ≤12s**，超时则重召僵尸重锁，不可空等。

## 追加六、本轮环境终态（已回读复核）

- 世界：竖坑回填 stone；木板墙全清 air；**屋顶 `y=70` 复原为 31 块 stone**；床 fixture `-66,68,246/247` 双格在位
- gamerule 四项全 true；cfg 六键复原（`moonStateOverride=` 空）
- 进程：**服务端 PID 3780 保留运行中**（25565 LISTENING）；Gradle daemon PID 19504 保留；node 零残留
- `## master...origin/master`；`src/main` 净；**新 jar `fe43c0e` 全程零 FATAL / 零 NPE**

---

# 追加卷 2 · v7 复跑（同基线 `fe43c0e`）

> **判词：G-3 / G-4 仍未证。本轮未取到判决行，但挖出两条会把所有时序窗静默作废的工装级原因（C13 / C14），二者优先级高于 B7 几何。**

## v7 执行实况

cfg `moonStateOverride=blood` / `zombieDigAI=true` / `bedSentryWake=true`；屋顶 31 块 stone 复原；坑 `(-68,66..67,250)` 重挖；墙全清。

```
锁定：try1/try2/try3 三次重召（硬上限 12s）→ 报 LOCKED after 12s
tp  ：Teleported Zombie to -67.5, 66.0, 250.5（入坑 OK）
放闸：19:51:07.698 → 重 tp → click#1 19:51:11.014
judgeRows 全程 = 1
dig-gate rows = 141，**全部 gate=target**
bed-dig rows = 1（-67,67,250，挖点在 ±8/±5 内）
bed-wake = 0 ；bed-refuse = 0
```
⇒ 「LOCKED」是**假锁**：检测器扫到的是重召前旧僵尸留下的非 target 门位行；实际新僵尸自 tp 后一直 `gate=target`（141 行），目标记忆没建立。

## 追加四·二、新增冲突分级（优先级高于 B7）

### C13（新增 · **会静默作废所有床面判定**）世界里的僵尸从来不是 0 只

收口时 `kill @e[type=zombie]` 回显 **`Killed Zombie` ×12**。

- 每次「复原」把 `doMobSpawning` 置回 `true` 后，世界持续自然刷怪；前一次 `kill` 到下一次判据窗之间会重新积累。
- 后果：`pathableHostilesNearBed`（A9，±8/±5 ＋ 可寻路）**可能被任意一只非实验僵尸命中** ⇒ 躺下被拒（`bed-refuse reason=notSafe`）或躺下后被踢；此前多次 `notSafe` 拦截，几何并非唯一嫌疑。
- **⇒ 判据窗前置条件增补：开窗前必须 `doMobSpawning=false` ＋ `kill @e[type=zombie]` ＋ **回读 `testfor @e[type=Zombie]` 为 found nothing**，且召唤实验僵尸后**再回读一次总数为 1**。

### C14（新增 · **会静默作废所有 tick 级时序**）TPS 剧烈抖动：10.25 → ~0.4

- 稳态实测：10s 真实 → 205 tick（≈10.25 TPS，已半速）。
- **观测窗内实测**：`adjusted` 在 180s 真实时间内只前进 **72 tick ⇒ ≈0.4 TPS**。
- 该窗口内 `bed-dig` 只出了 1 行（正常应为数十行），`gate=target` 却刷了 141 行（门位日志每 200t 冷却，说明那段时间 tick 极稀）。
- ⇒ 300t 目标记忆、1-tick dig 入口窗、`tickSentry` 的每 tick 判定在这个 TPS 下**全部失去意义**；v6/v7 的「差 1 tick」很可能有一部分是**掉帧造成的假象**。
- 可能来源：`weatherSystem=true` 下 `[AILog] livestock-raincheck` / `mob despawn pass-state` 每 tick 刷大量行（末 400 行日志仅覆盖 27 秒）＋ 世界内数百只 livestock。
- **⇒ 判据窗前置条件增补：先测 TPS（10s 真实 vs Δgametime），须 ≥19；不足则先降实体负载或临时关 `weatherSystem` 再测。**（取舍待主会话裁决：关 `weatherSystem` 会改变天气面，但本切片不判天气。）

## 追加五·二、配方 v8（G-3/G-4）

```
前置A : doMobSpawning=false ；kill @e[type=zombie] ；回读 testfor @e[type=Zombie] = found nothing（C13）
前置B : TPS 校准 —— 10s 真实 vs Δgametime ≥ 190 tick；不足则先削减负载（C14）
前置C : 屋顶 fill -69 70 243 -63 70 250 stone（A10）
前置D : 床三步重铺 + 双格回读（C11）
前置E : eat 直到 rounds>0（A8）
坑    : fill -68 65 250 stone ；fill -69 66 249 -67 67 251 stone ；fill -68 66 250 -68 67 250 air
时序  : 召实验僵尸 → 锁定（硬上限 12s，且**必须先杀光重召再计基线行号**，防假锁）
        → 回读总僵尸数 = 1 → tp 入坑 → 回读入坑 → 放闸 → bot 重 tp + 2.2s 点床 → 等见 S
判读  : bed-dig（挖点 ±8/±5）⇒ bed-wake reason=digging ；复点 ⇒ bed-refuse reason=mobsDigging
```
**v7 的直接教训**：假锁（基线行号取在 kill 之前）＋ 12 只野生僵尸 ＋ TPS 掉到 0.4，三者任一都足以让 G-3/G-4 无声失败。

## 追加六·二、本轮环境终态（已回读复核）

- 世界：坑回填 stone；屋顶 `y=70` 31 块 stone；木板墙全清；床 `-66,68,246/247` 双格在位；**僵尸清零（12 只已杀）**
- gamerule 四项全 true；cfg 六键复原（`moonStateOverride=` 空）
- 服务端 PID 3780 保留运行中（25565 LISTENING）；Gradle daemon 19504 保留；node 零残留
- `## master...origin/master`；`src/main` 净
