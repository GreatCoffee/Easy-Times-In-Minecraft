# spawn-cycle 02 节段 · per-player 密度门 W3 系列判据窗判读

**执行方**：会话七（自动/半自动测试执行方）｜**基线**：`1498f5a`（origin/master）
**jar**：`build\libs\etim-1.0.0.jar` **266,676B @2026-10-15 21:39:12**（1498f5a 现做现打）
**裁判档**：`playground/audit/audit19-density-limit-closure.md` ＋ `audit19-density-limit-review.md`
**判定源**：`run\obfuscated\logs\latest.log` 的 `[SpawnLog]` 行（唯一依据）
**世界**：testw2h（`level-name`）—— **全程不清世界、不 kill、不 tp、不清场**
**版本链终行**：**1498f5a**

---

## 一、落码面核实（判读前基线核）

| 项 | 实测 | 出处 |
|---|---|---|
| 基线 | `1498f5a spawn-cycle 02: R196 per-player hostile density gate (audit19)`；HEAD=origin/master | `git log` |
| build | `BUILD_EXIT=0`；jar **266,676B** @21:39:12 | `build/libs` |
| 仪器行式 | `density-skip dim=D at (x,y,z) imobs=N limit=L min=M prox=P` —— **六字段齐全** | `ETIMSpawnCycle.java:239-243` |
| `(int)` 外层截断 | `densityLimit = (int)(densityLimit + densityLimit * proximity);` —— A 级保真点**已落** | `ETIMSpawnCycle.java:221` |
| 坐标路线 | **路线乙**（方块坐标，「双否」论证，无 /16 还原） | `ETIMSpawnCycle.java:214-217` |
| IMob 面 | `EntityLiving.class` + `instanceof IMob` 过滤（1.12 泛型不吃接口裸型） | `ETIMSpawnCycle.java:227-234` |
| 预算 | `densitySkipLogBudget = 2`（hostile 建集入口复位） | `ETIMSpawnCycle.java:177` |
| 夜门钟面 | `daytime = w.isDaytime()`（worldInfo 实例面，建集头快照） | `ETIMSpawnCycle.java:174` |
| phase 面 | `ETIMMoonState.phase(w)`（总钟派生 + override 短路） | `ETIMSpawnCycle.java:175` |
| 玩家过滤 | `p.isSpectator() \|\| p.isDead \|\| p.getHealth() <= 0.0F` | `ETIMSpawnCycle.java:185` |

---

## 二、cfg override 序列（改前/改后各引一次行号）

| 序 | 阶段 | 行 254 字面 | 其余键 |
|---|---|---|---|
| 0 | W3a 前（改前） | `S:moonStateOverride=blue` | `B:mobDebugLog=true`(:242) 持开；`I:spawnCapAnimal=10`(:260) |
| 1 | **W3a** | `S:moonStateOverride=blood` | 同上 |
| 2 | **W3b** | `S:moonStateOverride=full` | 同上 |
| 3 | **W3c** | `S:moonStateOverride=`（空串 → 走派生） | 同上 |

**W3c 空串有效性核**：`ETIMMoonState.setOverride` `override = value == null ? "" : value.trim().toLowerCase();` → 空串走 `default: break` → 落 `:51-65` 派生分支 ✓

---

## 三、三窗参数与 day 数

| 窗 | boot stamp | PID | Done | 空载哨 | exceptions | 锁夜 | gametime（boot） | **day** | day%8/%32/%128 | phase |
|---|---|---|---|---|---|---|---|---|---|---|
| W3a | `20261015_213928` | 3044 | 1.036s | **0** | **0** | daytime=13000 | 90410 | **4** | 4 / 4 / 4 | override→BLOOD（派生本会得 NEW） |
| W3b | `20261015_215425` | 13060 | 1.309s | **0** | **0** | daytime=13000 | 107731 | **5** | 5 / 5 / 5 | override→FULL（派生本会得 OTHER） |
| W3c | `20261016_081631` | 12324 | 1.186s | **0** | **0** | daytime=13000 | 125749 | **6** | 6 / 6 / 6 | **OTHER（派生实执行）** |

**撞相检查（任务书第4项）**：三窗 day 分别为 4 / 5 / 6，`day%8`、`day%32`、`day%128` 均等于 day 值本身且**均不属于 {0,4} / 0 / 0** 撞相集合 → **三窗均无撞相，无需跳相**。

**方法论注记（C 级）**：任务书第4项给的跳相手段 `/time add` **在派生面上无效**——`/time add` 与 `/time set` 只改表钟（worldInfo dayTime），而 `phase()` 的 day 数由 `w.getTotalWorldTime()` 决定（`ETIMMoonState.java:54`），**无法用命令跳 totalWorldTime**（只能自然推进 24000 tick/天 或靠睡眠跳跃）。本系列前置天然满足，故未执行跳相。

---

## 四、判据逐项核讫

| # | 判据 | W3a | W3b | W3c | 合并判定 |
|---|---|---|---|---|---|
| 1 | [W3a 主判] 行现 `min=12`（×3/2 兑现链） | **0 行** | — | — | **FAIL（无样本）** |
| 2 | [W3b 主判] 行现 `min=10`（×5/4 兑现链） | — | **0 行** | — | **FAIL（无样本）** |
| 3 | [W3c 主判] 行现 `min=8`（派生链直证）＋兼录 phase=OTHER | — | — | **0 行**（phase=OTHER **已录**） | **min 面 FAIL；phase 面 PASS** |
| 4 | [全窗逐行自洽] 六字段齐全 + 逐行算式核 | 无行 | 无行 | 无行 | **FAIL（无行可核）** |
| 5 | [dim 面] 行 `dim` 字段现值 | 无行 | 无行 | 无行 | **FAIL（无行可核）** |
| 6 | [边界语义] ≥1 行 `imobs = limit+1` 级贴边 | 无行 | 无行 | 无行 | **不达（非阻断），实况入账见 §五** |
| 7 | [惯例哨] boot stamp／版本链首行／exceptions=0／空载哨 | ✅ | ✅ | ✅ | **PASS** |

### 判据 3 的 phase 面（唯一有证据的子项）

- W3c 全窗 override 置空 → `phase()` 落 `:54` 派生分支
- boot 时 day=6，窗内 720s 推进 14400 tick → 收线 gametime=**140917** → day = 140917/24000+1 = **6**
- day%8=6 / day%32=6 / day%128=6 → **phase=OTHER 全窗稳定** ✓
- ⇒ `deepDensityMultiplier(OTHER)` 走 `ETIMMoonState.java:111 return 1.0F` → `min = (int)(8×1.0) = 8`（**算式面成立，但无行可证**）

---

## 五、根因诊断（判据 1/2/3 主判全 FAIL 的原因）

### 5.1 门槛算式（可复算）

玩家稳态 `pos = -64.5 68.0 246.5`（三窗 hold 心跳逐窗一致，见各窗 heartbeat 行）→ `footY = 68`

```
densityLimit = (int)(8.0 × (1.0 + (64 − 68)/32)) = (int)(8 × 0.875) = (int)(7.0) = 7
```

| 窗 | phase | min | limit = max(7, min) | prox | 行内 limit = (int)(limit + limit×prox) | 触发门槛 |
|---|---|---|---|---|---|---|
| W3a | BLOOD | `(int)(8×1.5)` = **12** | 12 | 0 | `(int)(12+0)` = **12** | 盒内 IMob **> 12** |
| W3b | FULL | `(int)(8×1.25)` = **10** | 10 | 0 | `(int)(10+0)` = **10** | 盒内 IMob **> 10** |
| W3c | OTHER | `(int)(8×1.0)` = **8** | 8 | 0 | `(int)(8+0)` = **8** | 盒内 IMob **> 8** |

`prox=0` 与 W2k cap-comp 面「主域出生 2000 格内 → proximity 恒 0」一致（`WorldServer.java:1859-1861` 一手；audit19 §8 已注记主域 prox=0 免窗）。

### 5.2 环境实况（只读 testfor 采样，未清场）

> **【已更正——见 W3 追加系列 §六；证据链错误（RCON 位置面无效）】**
> 下列采样经 bot chat 面复核为**无效读数**：RCON sender 无实体位置，`@e[r=N]` 统计**原点附近**而非玩家附近；`/execute` 位置锚定同样无效（不带 `r` 的 `testfor @e[type=zombie]` 亦返 0，而同刻全局返 20）。
> **真相**：玩家盒内确实达到过 `imobs=13`（W3 追加系列 `density-skip` 行自含判决值为证）。
> **本节表格与 5.3 结论一律按此标记读取，不得作为玩家盒内实况引用**。原文保留供追溯。

| 采样时刻 | 全量 hostile | 玩家 `r=16` | 玩家 `r=32` | 玩家 `r=64` |
|---|---|---|---|---|
| W3b 收线前 | 30（zombie 2 / skeleton 7 / creeper 11 / spider 2 / enderman 8） | — | **0** | — |
| W3c 收线后 | 30（zombie 10 / skeleton 6 / creeper 13 / spider 0 / enderman 1） | **0** | **0** | **0** |

**gamerule**：`doMobSpawning = true`（W3b 采样）。

**cap 未触顶**：`cap-block` 三窗均只现 `type=WATER_CREATURE count=5 limit=5`（共 34+32+33 行），**MONSTER 面零行** → 怪物生成未被 cap 压制。

**生成链在跑**：三窗 `[SpawnLog]` 分类

| 窗 | accept | reject | cap-block | modifier |
|---|---|---|---|---|
| W3a | 2378 | 1674 | 34 | 3439 |
| W3b | 1942 | 1326 | 32 | 6 |
| W3c | 2489 | 1531 | 33 | 2 |

**生成落点分布旁证**（W2k 窗 accept 坐标实测，相对玩家 `(-64, 68, 246)`）：
`(-186,55,278)`→距≈126 ｜ `(-193,57,261)`→≈130 ｜ `(-104,67,318)`→≈83 ｜ `(46,72,269)`→≈112 ｜ `(49,21,361)`→≈161
→ **落点集中在 64 格以外**，与 vanilla「距玩家 24~128 格」范围一致。

### 5.3 结论

**判据 1/2/3 主判 FAIL 的性质 = 环境前置不可达**（非代码判否）：玩家 AABB `expand(32, 8, 32)` 盒内 IMob 实测 **0 头**，门槛 8~12 **无从触发**，故 `if (imobs > densityLimit)` 分支三窗均未进入，**零行输出**。

> **【已更正——见 W3 追加系列 §六；证据链错误（RCON 位置面无效）】**
> 上句「盒内 IMob 实测 0 头」的**证据来源无效**（RCON 位置面，详见 §5.2 标记），**不得作为玩家盒内实况引用**。
> **本系列结论已由 W3 追加系列整体取代**：judged 判据 1/2/3 在 W3a2/b2/c2 三窗**全部 PASS**（`min=12/10/8` ＋ `phase=BLOOD/FULL/OTHER` ＋ `imobs=limit+1` 三窗精确贴边），基线 `10f91e8`。
> 保留本节原文仅供追溯「甲方案（常发 min 行）落地前的仪器面缺陷史实」。

代码侧的行为面（min 值链、limit 算式、`(int)` 截断、phase 兑现）**在本窗全部未被执行到**，故既不能判 PASS 也不能判 FAIL——**判为「无样本」**。

---

## 六、仪器面缺陷（本次判读的核心发现）

**判据想要的**：`min` 值链（override → phase → seam → min）的兑现证据。
**仪器给的**：`density-skip` 行，且**只在该玩家被跳过时才打**（`ETIMSpawnCycle.java:235-244` 整块位于 `if (imobs > densityLimit)` 内）。

**后果**：`min` 的计算在 `:191-208` 每次建集**必然执行**，但其证据行被挂在触发条件之后 → **门不触发 = 零证据**。本系列三窗 720s×3 共 36 分钟、玩家盒内始终 0 头，于是**判据 1/2/3 全部无法产出任何一行**。

**性质**：仪器覆盖面 < 判据覆盖面，**判据窗设计层面阻塞**，非代码行为缺陷。

**旁证**：判据 6（`imobs = limit+1` 级贴边）依赖同一批行，同因无法产出。

---

## 七、待主会话裁决（四选项）

| 选 | 方案 | 内容 | 代价 |
|---|---|---|---|
| **甲**（推荐） | **常发 min 值行** | 在 hostile 建集入口按预算打一行 `density-eval … min=M footY=F limit=L prox=P imobs=N dim=D`（与是否跳过无关），`density-skip` 保留原语义 | 需新落码一行；判据 1/2/3 立即可核 |
| 乙 | **扩盒覆盖面** | 多假玩家分散站位并行 hold（N 盒并集），或择高密度站位 | 改环境不改码；站位需先验采样 |
| 丙 | **改环境前置** | 提高生成密度（difficulty hard／view-distance 调小使生成落点内收／gamerule），使盒内 IMob 超门槛 | 改世界设置，且需重新积累 |
| 丁 | **换判据** | 放弃「min 由 density-skip 行证」，改由代码核讫 + phase 面实测承担 | 弱化日志判据（约束 9 不推荐） |

**推荐甲**理由：判据 1/2/3 的实质是**验 min 值链**，与 `imobs > limit` 的真值无关；把常发行放在建集入口即可在**任何环境**下产出证据（限夜锁 + 对应 override 即可），不需赌怪物落点分布。

**附带请裁**：
1. 甲方案是否与既有 `blueAnimal*LogBudget` 惯例并轨（新增 `densityEvalLogBudget`，预算值请给）
2. 常发行的六字段是否够（是否另加 `daytime=` / `phase=` 字段以自含双钟偏差面 evidence）
3. 判据 6（`imobs=limit+1` 贴边）在甲方案下是否仍可达（盒内 0 头时该面恒不达，需另定口径）

---

---

# W3 追加系列 · density-eval 值链 + summon 贴边（W3a2 / W3b2 / W3c2）

**裁定依据**：`playground/audit/audit19-w3-adjudication.md`（W3 全零样本收案：甲方案采边沿细化 + summon 工步改判判据 6 口径）
**基线**：**10f91e8**（`spawn-cycle 02: density-eval edge-deduped instrument row (audit19-w3-A)`；HEAD=origin/master）
**jar**：`build\libs\etim-1.0.0.jar` **266,861B @2026-10-16 08:35:30**（10f91e8 现做现打，`BUILD_EXIT=0`）

## 一、落码面核实（判读前基线核）

| 项 | 实测 | 出处 |
|---|---|---|
| eval 行位 | **位于 `if (imobs > densityLimit)`（`:257`）之前** → **常发**（甲方案落码位置正确） | `ETIMSpawnCycle.java:249-254` |
| eval 行式 | `density-eval dim=D at (x,y,z) imobs=N limit=L min=M prox=P daytime=B phase=X` —— **八字段** | `:249-254` |
| 边沿去重签名 | `evalSig = dim｜footY｜min｜limit｜prox｜daytime｜phase｜x｜z`（**imobs 刻意不入签名**） | `:243-245`（含注释 `:240-242`） |
| skip 行语义 | 未动，六字段 `dim/at/imobs/limit/min/prox` | `:259-266` |
| `(int)` 外层截断 | `:221` 在位 | `ETIMSpawnCycle.java:221` |

## 二、cfg override 序列（行 254 逐窗实引）

| 序 | 阶段 | 行 254 字面 |
|---|---|---|
| 0 | 系列前（改前） | `S:moonStateOverride=blood`（W3 前序窗遗留） |
| 1 | **W3a2** | `S:moonStateOverride=blood` |
| 2 | **W3b2** | `S:moonStateOverride=full` |
| 3 | **W3c2** | `S:moonStateOverride=`（空串 → 走 `:54` 派生） |

`B:mobDebugLog=true`(:242) 三窗持开；`I:spawnCapAnimal=10`(:260) 不动。

## 三、三窗参数

| 窗 | 世界 | boot stamp | PID | Done | 空载哨 | exceptions | 锁夜 daytime | day | day%8/%32/%128 |
|---|---|---|---|---|---|---|---|---|---|
| W3a2 | testw2h | `20261016_083555` | 10336 | 1.025s | **0** | **0** | 13000 | （override 短路，day 不参与） | — |
| W3b2 | testw2h | `20261016_085151` | 22044 | 1.253s | **0** | 3※ | 13000 | （override 短路，day 不参与） | — |
| W3c2 | **testw3c2**（撞相→新世界） | `20261016_091213` | 25560 | 5.759s | **0** | **0** | 13000 | **1** | 1 / 1 / 1 |

※ W3b2 的 `exceptions=3` 见 §五核清。

### W3c2 撞相处置（任务书第3项）

- 旧世界（testw2h）读数 `gametime=183309` → **day=8** → `day%8==0` → **撞相 FULL**（判据 3 要求 OTHER）
- `/time add` **禁用**（audit19-w3 §5 已裁：只改表钟，day 数由 `getTotalWorldTime()` 定，命令不可跳总钟）
- 处置：**boot 新世界**——`server.properties` 行 33-34 `level-name=testw2h` → **`testw3c2`**
- 新世界读数 `gametime=2953` → **day=1**，day%8/%32/%128 全 =1 → **无撞相 → phase=OTHER** ✓
- 收线已恢复 `level-name=testw2h`；cfg 行 254 已恢复 `S:moonStateOverride=blue`

## 四、判据逐项核讫（**三窗全 PASS**）

### evidence 行原文（各窗首行，判读源 `run\obfuscated\logs\latest.log`）

```
[W3a2] [SpawnLog] density-eval dim=0 at (-65,68,246) imobs=0 limit=12 min=12 prox=0.0 daytime=false phase=BLOOD
[W3a2] [SpawnLog] density-skip dim=0 at (-65,68,246) imobs=13 limit=12 min=12 prox=0.0

[W3b2] [SpawnLog] density-eval dim=0 at (-65,68,246) imobs=0 limit=10 min=10 prox=0.0 daytime=false phase=FULL
[W3b2] [SpawnLog] density-skip dim=0 at (-65,68,246) imobs=11 limit=10 min=10 prox=0.0

[W3c2] [SpawnLog] density-eval dim=0 at (-65,68,246) imobs=0 limit=8 min=8 prox=0.0 daytime=false phase=OTHER
[W3c2] [SpawnLog] density-skip dim=0 at (-65,68,246) imobs=9 limit=8 min=8 prox=0.0
```

| # | 判据 | W3a2 | W3b2 | W3c2 | 判定 |
|---|---|---|---|---|---|
| 1 | [W3a2] `min=12 limit=12 prox=0 daytime=false phase=BLOOD` | **逐字段全中** | — | — | **PASS** |
| 2 | [W3b2] `min=10 limit=10 phase=FULL` | — | **逐字段全中** | — | **PASS** |
| 3 | [W3c2] `min=8 limit=8 phase=OTHER`（override 空串→`:54` 派生实执行） | — | — | **逐字段全中**（day=1 派生实执行） | **PASS** |
| 4 | [贴边] 每窗 `imobs = limit+1` | **imobs=13 = 12+1**（45 行） | **imobs=11 = 10+1**（178 行） | **imobs=9 = 8+1**（321 行） | **PASS（三窗均精确最贴边）** |
| 5 | 六字段齐全 + `(int)` 截断在位 | skip 六字段 ✓／截断 `:221` ✓ | ✓ | ✓ | **PASS** |
| 6 | 惯例哨 boot 10f91e8／exceptions=0／空载哨 | ✓ / **0** / **0** | ✓ / 3※ / **0** | ✓ / **0** / **0** | **部分 FAIL（仅 W3b2 exceptions，见下）** |

### 窗内 totals

| 窗 | density-eval | density-skip | accept | reject | cap-block | modifier | exceptions |
|---|---|---|---|---|---|---|---|
| W3a2 | 1 | 45 | 233 | 161 | 2 | 0 | **0** |
| W3b2 | 1 | 178 | 2877 | 1771 | 29 | — | 3※ |
| W3c2 | 1 | 341 | 2636 | 1933 | 22 | 7 | **0** |

### ※ W3b2 exceptions=3 核清（**连接层噪声，非 mod 异常**）

三行同源一事件：
```
[09:06:27] [Netty Server IO #6/ERROR] [FML]: NetworkDispatcher exception
java.io.IOException: 远程主机强迫关闭了一个现有的连接  (socket 栈)
[09:06:28] ETIM_Harn04 lost connection: Internal Exception: java.io.IOException: ...
```
触发时刻与 box-ops bot 退场同拍（`01:06:27` node 侧 = `[09:06:27]` server 侧）→ **harness bot socket 断连噪声**，非 mod/游戏逻辑异常。W3c2 同工步 `exceptions=0`（bot 退场时机不同）→ 属**偶发**，非稳定复现。

## 五、工步修正（两处必要修正，会话七自纠）

1. **bot 名冲突**：`box-ops-via-bot.js` 与 `hold-session.js` 同用 `ETIM_Harn04` → W3a2 窗内 `[00:38:27] KICKED "multiplayer.disconnect.duplicate_login"`，hold bot 被踢下线（有效在场约 30s，**未满 720s**）。
   **修正**：W3b2/W3c2 改「**hold 收线 → 工步**」顺序，两者不同时在线；两窗 hold 均**完整 720s**。
2. **summon 存活率**：W3b2 首投 11 头（无 NBT），6s 后 bot chat 面 `testfor @e[type=zombie,r=32]` 仅回 1 头 → 堆叠互殴/摔落致死。
   **修正**：改 `{NoAI:1b,Silent:1b,Health:20.0f,Attributes:[{Name:generic.maxHealth,Base:20.0}]}` 冻结投放 + 在线保持 25s 覆盖密度门求值拍 → **imobs 稳定 11/9**，无损耗。

## 六、方法论更正（**须更正本档 §五·5.2 旧结论**）

旧报告（§五）称「玩家盒内 IMob = 0 头（r=16/32/64 全 0）」——**该证据链错误**：

- RCON sender **无实体位置**，故 `@e[r=32]` 统计的是**原点附近**而非玩家附近；
- `/execute -64 68 246 run testfor @e[type=zombie]`（**不带 r**）同样返回 0，而同一时刻全局 `testfor @e[type=zombie]` 返回 **20** → **`execute` 位置锚定同样无效**；
- 真相：玩家盒内确实达到过 `imobs=13`（本系列 density-skip 行自含判决值为证）。

**可靠通道**：`/kill @e[type=X,r=32]` 与 `/testfor @e[...]` **走 bot chat 面**——bot 是有位置的实体，sender 位置正确（工步 a 预清与工步 e 清扫均真实作用于玩家箱域）。故 RCON 仅用于**无位置语义的**命令（`gamerule`／`time set`／`testfor 全局`／`stop`）。

## 七、待主会话裁决

1. **惯例哨口径**：W3b2 `exceptions=3` 已核为 box-ops bot 断连噪声（连接层 IOException）。是否将哨改为「**mod 异常=0**，连接层 IOException 单列且不计」？
2. **W3a2 hold 时长**：W3a2 因 bot 名冲突有效在场仅约 30s（判据 1/4/5/6 结论不受影响，evidence 由 box-ops 期间在场 bot 产生）。是否需补跑一窗完整 720s 的 W3a2 以齐整？
3. **§六方法论更正**是否需在本档 §五 加「已更正」标记（旧结论留着会被后续读档者误引）。
4. **W3d（prox>0 直证）** 本系列未做（可选窗），是否补做。

## 八、落盘与清理

- **本档**：`testharness\reports\spawn-cycle-02-verdict.md`（本节追加）
- **版本链终行**：**10f91e8**
- 环境恢复：`server.properties` `level-name=testw3c2` → **`testw2h`**；cfg 行 254 `S:moonStateOverride=` → **`blue`**
- 新增 harness 件：`testharness\player\box-ops-via-bot.js`（kill-box／summon／test 三 op，bot chat 面）
- 进程：server 已 `stop`；25565 无监听；java/node 零残留

---

## 九、W3 前序系列落盘与清理（历史节，保留）

- **本档**：`testharness\reports\spawn-cycle-02-verdict.md`（另立档，与 `moon6-backend-verdict.md` 不同源——后者为后端生成链判据，前者为 spawn-cycle 02 节段判据）
- **版本链终行**：**1498f5a**
- 进程：见会话收尾（server `stop`；25565 无监听；testharness node 零残留）

---

**判读签署**：会话七 ｜ 基线 `1498f5a` ｜ jar 266,676B @21:39:12 ｜ 三窗 boot stamp `20261015_213928` / `20261015_215425` / `20261016_081631` ｜ **结论标「待主会话裁决」**
