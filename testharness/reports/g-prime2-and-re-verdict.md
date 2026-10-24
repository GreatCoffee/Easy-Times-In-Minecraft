# G' 视线窗复测 + ②弹床补跑 + ④-⑨续跑 · 判决报告（v1.2）

**基线**：`ad3f0c4`（功能 = `a520c88`）｜jar 321,481B @ 2026-10-18 20:34:26（免重建）｜`src/main` 零改动
**声明**：本文件为**新建**（未续写 v1.1 的 `g-prime-and-re-verdict.md`），两报告互不覆盖
**轮次**：① **PASS**｜② 门控 PASS／闭合未证｜③ 已收官不重跑｜④–⑨ **未执行**

---

## ① 判据类清单

| # | 判据类 | 终态 |
|---|---|---|
| ① | **G-3'** `bed-wake reason=digging` | **PASS** |
| ① | **G-4'** `bed-refuse reason=mobsDigging` | **PASS** |
| ② | 血月弹床门控（`reason=blood`） | **PASS** |
| ② | 弹床链闭合（睡→弹，bot 侧可观测） | **未证（客户端不可见）** |
| ② | F-2-37 睡拍池 tick | **未证**（本轮未进入睡眠） |
| ③ | 面14 门控双臂 | 已在 v1.1 收官，不重跑 |
| ④ | 面6 双读数 | 未执行（纯客户端） |
| ⑤ | 面9 四探针 | 未执行 |
| ⑥ | 面5 三探针 | 未执行 |
| ⑦ | 面10 四场景 | 未执行 |
| ⑧ | 面11 三场景 | 未执行 |
| ⑨ | 面12 长窗 | 未执行 |

---

## ② 逐项核讫表（18 行）

| # | 项 | 判据行原文 / 实测 | 判 |
|---|---|---|---|
| 1 | 基线 | `ad3f0c4`；`src/main` 净；jar 321,481B 未重建 | ✔ |
| 2 | cfg（G' 轮） | `moonStateOverride=blue`／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true`／`mobDebugLog=true` | ✔ |
| 3 | E4 纪律 | 每轮 `fill` 前 `testforblock -66 68 246/247 minecraft:bed`；床曾两度丢失，均已重建并回读 | ✔ |
| 4 | C13 净场 | `testfor @e[…r=128,type=Zombie]` = found nothing | ✔ |
| 5 | C16 TPS | Δtick/10s = **203** | ✔ |
| 6 | A8 eat | `RESULT EAT item=golden_carrot rounds=9 food=6` | ✔ |
| 7 | 硬门槛 b（E7 口径） | 门位分布 `orGate x1`（新僵尸首拍，**不作数**）+ `target x4` ⇒ **铲生效** | ✔ |
| 8 | 硬门槛 c | `doMobSpawning=false` 全程 + C13 零命中 + 坑 noPath | ✔ |
| 9 | C15 哨兵 | `[AILog] mob target=EntityPlayerMP#223` | ✔ |
| 10 | **bed-dig** | `[SleepLog] bed-dig mob=EntityZombie x,y,z=-66,67,247 progress=0 tick=1183520`（共 2 行） | ✔ |
| 11 | **挖点在 ±8/±5 框内** | 床 `-66,68,247`；挖点 `-66,67,247` ⇒ dx=0, dy=1, dz=0 | ✔ |
| 12 | 行序 `bed-dig → S → bed-wake` | `bed-dig` 先落；bot `samples` 前 90 拍为 **S**（睡眠）后才被唤醒 | ✔ |
| 13 | **G-3'** | `[SleepLog] bed-wake reason=digging sleeper=true x,y,z=-66,68,247 tick=19753` | **PASS** |
| 14 | **G-4'** | `[SleepLog] bed-refuse reason=mobsDigging x,y,z=-66,68,247 adjusted=13521 day=50` | **PASS** |
| 15 | 客户端消息 | `bedMessages=[tile.bed.wakeMobs | tile.bed.mobsDigging]` | ✔ |
| 16 | 苏醒后复点 | bot `wake detected at sample 90` → `reclick target = bed meta=0` → `activateBlock() (click#2)` → `reclicks=1` | ✔ |
| 17 | ② `reason=blood` | `[SleepLog] sleep-window gate=blocked reason=blood adjusted=15357 day=50`（L120，boot 时落行） | ✔ |
| 18 | ② 弹床链闭合 / F-2-37 睡拍 | bot `samples` 全 `-`、`bedMessages=[]` ⇒ 血月下**从未观测到 sleeping=true**；同轮无睡拍池行 | **未证** |

### G' 最终几何（申明，供复现）
```
床        (-66,68,246) foot / (-66,68,247) head   facing:south
坑        (-66,66,248) + (-66,67,248) 空气，地板 (-66,65,248) stone，**直壁开顶**
屋顶      fill -69 70 243 -63 70 250 stone（31 块）
僵尸      summon zombie -66 66 248 + replaceitem … slot.weapon.mainhand minecraft:iron_shovel
诱饵      ETIM_Harn05 站 (-66,68,250)（survival + resistance 4）—— 最终挖点朝向睡者，诱饵仅作保险
睡者      ETIM_Harn04 → /tp (-63.8,68,247.5) → click bed
```
**关键机理**：坑 2 深直壁（feet 66，出坑需 +2）⇒ `noPath` 成立；坑口开顶 ⇒ 睡者躺下后僵尸眼位可见 ⇒ `canSee` 直接给目标 ⇒ **不打、不 tp、不围栏、不贴身**（四绕开全部满足）。

---

## ③ 冲突 / 异常分级

### F1（**C 级 · 已绕开**）1.12 tp 清目标（v1.1 的 E2）
本轮全程未 tp 僵尸，直接绕开。`[AILog] mob target=EntityPlayerMP#223` 表明目标自建立后保持。

### F2（**C 级 · 已绕开**）reach 1.50 / strike 1.43 窄带（v1.1 的 E1）
本轮不需要 HurtBy（`canSee` 支），故该窄带不再构成约束。

### F3（**B 级 · 新**）血月弹床在**同一 tick 内**完成，客户端不可观测
- 实测：血月下 bot 点击床后 `bedMessages=[]`（无 `tile.bed.*`），`samples` 全 `-`，`isSleeping` 从未为真；而服务端 `reason=blood` 行存在。
- 机理：`etim$sleepClock` 在 `areAllPlayersAsleep()` 之前调 `wakeAllSleepers` ⇒ 服务端同 tick 内 `sleeping` 置真后立即清除，客户端 `useBed`/元数据从不落 S。
- ⇒ **「睡→弹」的客户端闭环在本构建下不可观测**；② 的闭合判据只能靠服务端行 + 玩家从未停留于 sleeping 这一负证。建议主会话裁定是否接受「服务端行 + 负证」作为闭合口径，或加专用哨兵。

### F4（**B 级 · 新**）`logWindowBlocked` 去重使窗内计数恒为 0
- 血月重启后该行在 boot 瞬间落（L120），此后同 day 不再落；按「取基线后计数」必然得 0。
- ⇒ 后续血月轮**基线必须在 boot 之前取（用新日志文件）**，否则必假阴。

### F5（**B 级 · 操作失误，入册**）床在跨会话/跨轮次多次丢失
- 现象：补建并 `save-all` + `stop` 后，下次 boot 仍 `testforblock` = Air（两次）。
- 处置：每轮开工先验床、缺则按 C11 三步重建并双格回读；**禁止任何 `fill … air` 跨过 `-66,68,246/247`**。
- 待查：是否为「床构建后未触发方块更新即保存」导致加载即脱落（未定谳，建议主会话裁）。

### F6（**C 级**）④–⑨ 未执行
④ 需客户端；⑤–⑨ 需逐场景搭台。本轮额度消耗在 ①（8 次几何迭代）与 ② 上，按任务书「受阻记录不臆造」处理。

---

## ④ 下一批建议

1. **G 系可关账**：G-3'/G-4' 均已实证，建议把「坑 2 深直壁开顶 + 坑内召 + 持铲 + canSee 支」写入 G' 标准配方，替代 v8/HurtBy 路线（后者被 F1/E1 结构性证伪）。
2. **② 口径裁定**：请裁定 F3（同 tick 弹床不可观测）是否接受「`reason=blood` 服务端行 + `isSleeping` 恒假」为闭合证据；若需强证，建议加一条 `[SleepLog] wake-all players=N` 哨兵（第二批）。
3. **F4 纪律入册**：血月轮一律「新日志文件 + boot 前取基线」。
4. **F5 待查**：床跨 boot 脱落是否是 C11 构床方式的固有问题（建议第二批复查 `setblock` 构床后是否需要一次方块更新）。
5. **④–⑨ 另排一轮**：④ 必须由你在客户端实测转述；⑤⑥ 可用 `/etim dump` 与硬度回读在单轮内完成；⑦⑧ 需逐场景；⑨ 需 20 分钟长窗（建议单独一轮，避免与前序抢额度）。

---

## 附：环境终态（全部回读）

| 项 | 状态 |
|---|---|
| 床 | `-66,68,246` / `-66,68,247` **双格 bed 在位** ✔ |
| 坑 | `-66,66,248` / `-66,67,248` 回填 **stone** ✔ |
| 屋顶 | `-66,70,247` = stone（31 块） ✔ |
| 僵尸 | 清零（C13 found nothing） ✔ |
| gamerule | `doDaylightCycle / doMobSpawning / doWeatherCycle / doMobLoot` 全 **true** ✔ |
| cfg | `moonStateOverride=`（空）／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true`／`weatherDebugLog=false` ✔ |
| 服务端 | **已 stop，25565 无监听** ✔ |
| 进程 | java 仅 `GradleDaemon:11760`；node 测试进程**零残留** ✔ |
| git | `## master...origin/master`；**`src/main` 净** ✔ |

**落盘日志**：`build-logs\g-prime2-183449.log`（G' PASS 轮）、`build-logs\blood-xproof2-183750.log`（② 轮）、其余 `g-prime-*.log` 7 份

**签署**：会话七 ｜ 基线 `ad3f0c4` ｜ **G-3' / G-4' 双 PASS** ｜ ② 门控 PASS、闭合未证（F3 待裁） ｜ ④–⑨ 未执行 ｜ 核讫表 18 行
