# G' 复测 + 血月互证 + R-E 七批 · 合并判决报告（v1.1）

**基线**：`ad3f0c4`（＝ master HEAD）｜功能基线 = `a520c88`（`ad3f0c4` 为**纯 javadoc 勘误**，diff 仅 `*` 注释行，无代码变更 ⇒ 20:34:26 的 321,481B jar 与其等价，**免重建**）
**性质**：实测执行，`src/main` 零改动（工装改动与操作失误均记录在 §三）
**轮次纪律**：G' 硬门槛失守即停；② 部分完成；③ 全项完成；④–⑨ **未执行**

---

## ① 判据类清单

| # | 判据类 | 目标行 | 终态 |
|---|---|---|---|
| ① | **G-3'** `bed-wake reason=digging` | `[SleepLog] bed-wake … reason=digging` | **FAIL（受阻）** |
| ① | **G-4'** `bed-refuse reason=mobsDigging` | `[SleepLog] bed-refuse … reason=mobsDigging` | **FAIL（受阻）** |
| ② | 血月弹床链 | `[SleepLog] sleep-window gate=blocked reason=blood` | **PASS（门控）／弹床链未闭合** |
| ② | hunger 互证 | `reason=hungerDeny` + `[FoodLog] tooHungry` + 池 tick | **PASS** |
| ③ | 面14 门控（默认关） | `weatherDebugLog=false` ⇒ `[WeatherLog]` = 0 行 | **PASS** |
| ③ | 面14 门控（开键） | `weatherDebugLog=true` ⇒ 行照常出 | **PASS** |
| ④ | 面6 双读数 | 纯客户端 | **未执行**（需客户端） |
| ⑤ | 面9 四探针 | — | **未执行** |
| ⑥ | 面5 三探针 | — | **未执行** |
| ⑦ | 面10 四场景 | — | **未执行** |
| ⑧ | 面11 三场景 | — | **未执行** |
| ⑨ | 面12 长窗 | — | **未执行** |

---

## ② 逐项核讫表（22 行）

| # | 项 | 判据行原文 / 实测 | 判 |
|---|---|---|---|
| 1 | 基线核讫 | `ad3f0c4`；`a520c88..HEAD` 仅 2 文件 5+/2-，全部为 `*` 注释 | ✔ |
| 2 | jar | `etim-1.0.0.jar` 321,481 B @ 2026-10-18 20:34:26 | ✔ |
| 3 | cfg 六键 | `moonStateOverride=blue`／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true` | ✔ |
| 4 | 新键 `weatherDebugLog` | 首启由 Forge 写入：`B:weatherDebugLog=false`（回读） | ✔ |
| 5 | C13 净场 | `testfor @e[x=-66,y=68,z=247,r=128,type=Zombie]` = found nothing | ✔ |
| 6 | C16 TPS | Δtick/10s = **204**（≈10.2 TPS，≥195 门槛） | ✔ |
| 7 | A10 屋顶 | `-66,70,247` = stone（31 块） | ✔ |
| 8 | C11 铺床 | 双格回读 try 1 OK | ✔ |
| 9 | A8 eat | `RESULT EAT item=golden_carrot rounds=8 food=6` | ✔ |
| 10 | **A12 工装（lookAt）** | `deny_attack rows = 0`（多轮恒 0） | ✔ |
| 11 | **持铲生效（坑内隔离探针）** | `[SleepLog] dig-gate mob=EntityZombie gate=target` ⇒ `isDiggingEnabled=true` | ✔ |
| 12 | 对照探针·铁剑 | `gate=holding`（`isHoldingItemThatPreventsDigging`） | ✔ |
| 13 | 对照探针·空手 | `gate=orGate`（唯一行） | ✔ |
| 14 | 对照探针·铁镐/铁斧 | `gate=dist8` / `gate=sameBlock` ⇒ 同类 ItemTool 均生效 | ✔ |
| 15 | **HurtBy 建立** | 三击 `d=1.56/1.63/2.30`，`deny_attack=0` | ✔ |
| 16 | **目标存活（围栏后）** | `gate=strike dist=…` ⇒ 目标非空且进入 strike 面 | ✔ |
| 17 | **bed-dig** | **7 轮全部 0 行** | **FAIL** |
| 18 | **bed-wake reason=digging** | **0 行** | **FAIL** |
| 19 | **bed-refuse reason=mobsDigging** | **0 行** | **FAIL** |
| 20 | ② `reason=blood` | `[SleepLog] sleep-window gate=blocked reason=blood adjusted=17127 day=49` | ✔ |
| 21 | ② `reason=hungerDeny` + 饥饿拒床 | `[SleepLog] … reason=hungerDeny …` ＋ `[FoodLog] ETIM_Harn04 (157) tooHungry (right-click bed while starvation)` | ✔ |
| 22 | ② F-2-37 池 tick | `[FoodLog] … consumed satiation point (nutritionOnlyPool=2.08, pools 5/6 6/6)` 连续多行 | ✔ |
| 23 | ② 弹床链闭合 | bot `samples=---…-`，`isSleeping` 从未为真；吃食后点击床**无任何 `tile.bed.*` 消息** | **不可判** |
| 24 | ③ 开键臂 | `[WeatherLog] weather-flip t=1166396 raining=false thundering=false reason=event`（1 行） | ✔ |
| 25 | ③ 默认关臂 | 重启回读 `B:weatherDebugLog=false` + 强制 thunder/clear ⇒ **0 行** | ✔ |

---

## ③ 冲突 / 异常分级

### E1（**A 级 · 直接决定 G-3'/G-4' 能否成立**）ETIM 近战 reach 门限 = **1.50 格**
```
reach denied: etim.reach.deny_attack <dist> > 1.50
```
- 实测：`d=1.92` 三击全拒；`d=1.56/1.63` 放行。
- ⇒ **要建 HurtBy，bot 必须贴到 ≤1.5**；而 dig 面的 `strike` 门是 `≤ width*2²+width = 2.04 ⇒ 1.43`。
- ⇒ **可同时满足「能打中」与「不打（strike 不触发）」的距离带只有 1.43–1.50**（约 0.07 格），几乎不可操作。

### E2（**A 级**）tp 之后目标被清空
- 实测序列：`sameBlock`（贴身）→ tp 入坑 → `target`（`getAttackTarget()==null`）。
- 机理：1.12 `EntityAITarget.resetTask()` 会 `setAttackTarget(null)`；`EntityAIHurtByTarget` 的 `lastRevengeTimer` 防重触发 ⇒ **被清后不会自行恢复**。
- ⇒ v8 的「先打后 tp」路线**结构性失效**；必须「原地围困、不 tp」。

### E3（**B 级 · 影响几何选择**）1 格高石墙可跳、栅栏仍给 `walk`
- 1 格高 stone 围困：僵尸可跳越。
- `minecraft:fence`（1.5 高）围 4 向：`[SleepLog] dig-gate … gate=walk` ⇒ **寻路仍找到路径**（对角线/跳跃节点）。
- ⇒ 「非路径化」需 2 格实体墙，但那会同时切断视线（seen=false ⇒ sightDist 门限降到 4.0）。

### E4（**B 级 · 操作失误，已记录**）我两次用 `fill` 覆盖把床挖掉
- `fill -66 68 247 -64 68 249 air`（清栅栏残留）连带清掉床 head ⇒ `target block = air`，bot 无法入睡。
- 第二次同源（收口阶段），已单独重启补床并回读双格 OK。
- ⇒ **纪律**：清理 `fill` 必须先排除床坐标 (-66,68,246/247)。

### E5（**B 级**）bot 被僵尸击退导致超距
- 围栏后实测 `re-tp: pos=-62.31 68 246.22`（偏离站位 ~1.9 格）⇒ `|posX-bedX| = 3.7 > 3.0` ⇒ 距床过远，入睡失败。
- ⇒ 贴脸攻击 + 贴身围困的组合会招来击退，须给 bot 击退免疫或把站位放到僵尸 2 格之外（与 E1 冲突）。

### E6（**C 级**）`logWindowBlocked` 非每 tick 落行
- 首轮（饥饿态）出现 1 行 `reason=blood`；次轮（吃食后）**0 行**。
- ⇒ 「连续多 tick 不复睡」只能由 bot 侧 `samples` 佐证，不能由该行计数佐证。

### E7（**C 级**）`dig-gate` 行有 40t/200t 节流且冷却只在 `gateFail` 内递减
- `lastGate` 初值 `""` ⇒ **新僵尸首拍必落行**，此即 `orGate` 频繁作首行的原因（**replaceitem 之前那一拍**）。
- 误判风险：把首行 `orGate` 当「铲未生效」。**正确口径：取「非首行」的末条门位**。

### E8（**C 级**）④–⑨ 未执行
- ④ 面6 为纯客户端选中面，本会话无客户端；⑤–⑨ 需逐场景搭台，在 G'/② 消耗后未获额度。
- ⇒ 一律不臆造，按任务书「单项受阻记录回执」。

---

## ④ 下一批建议

1. **G' 换几何（最高优先）**：放弃「贴脸攻击」，改用**坑内召 + 视线窗口**——
   坑 `(-67,66,249)`，2 深，东壁 `(-66,66..69,249)` 留 **y=68 一格窗**：
   - 僵尸眼位 ≈67.8，经窗可见 bed 内 bot ⇒ `canSee` 成立 ⇒ **无需 HurtBy**（绕开 E1/E2）
   - `walk`：四壁封闭 ⇒ noPath
   - `strike`：dist≈2.24 > 1.43 ⇒ 过
   - `sightDist`：seen=true ⇒ 门限 8
   - 挖掘射线会撞在 `(-66,69,249)`（headroom 路）或 `(-66,67,249)`（center 路）⇒ 挖点在 ±8/±5 内
   **此方案一次性绕开 E1（不用打）、E2（不用 tp）、E3（不用围栏）、E5（不贴身）。**
2. **② 补弹床链闭合**：需先解决「吃食后点击床无任何 `tile.bed.*` 消息」——
   建议加 `[SleepLog] try-sleep result=<Enum>` 哨兵（或先确认 bot 的 use 包是否被服务端接收），否则「弹床链」永远只能间接判。
3. **③ 行名对齐**：任务书称 `W-1/W-2`，实测行名是 `[WeatherLog] weather-flip …`；
   建议在第二批报告里统一行名表，避免后续按名 grep 空手而归。
4. **操作纪律入册**：`fill` 前先 `testforblock` 床双格；清场一律按坐标白名单，禁止整段 `fill … air` 跨过 `-66,68,246/247`。

---

## 附：环境终态（全部回读）

| 项 | 状态 |
|---|---|
| 床 | `-66,68,246` / `-66,68,247` **双格 bed 在位** ✔（收口时单独重启补建） |
| 屋顶 | `-66,70,247` = stone（31 块） ✔ |
| 坑 | `-68,66,250` = stone（已回填） ✔ |
| 栅栏/墙 | `-65,68,247` = air、`-67,68,246` = air（已清） ✔ |
| 僵尸 | 清零（C13 found nothing） ✔ |
| gamerule | `doDaylightCycle / doMobSpawning / doWeatherCycle / doMobLoot` 全 **true** ✔ |
| cfg | `moonStateOverride=`（空）／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true`／**`weatherDebugLog=false`** ✔ |
| TPS | Δtick/10s = 204 ✔ |
| 服务端 | **已 stop，25565 无监听** ✔ |
| java / node | 仅 `GradleDaemon:11760`；测试进程**零残留** ✔ |
| git | `## master...origin/master`；**`src/main` 净** ✔ |

**落盘日志**：`build-logs\g-prime-*.log`（7 轮）、`build-logs\blood-xproof-*.log`（2 轮）

**签署**：会话七 ｜ 基线 `ad3f0c4`（功能＝`a520c88`）｜ **G-3'/G-4' 受阻（E1/E2/E3/E5 四项结构性阻塞，已给出绕开方案）** ｜ **② 门控 PASS／弹床链未闭合** ｜ **③ 双臂 PASS** ｜ ④–⑨ 未执行 ｜ 核讫表 25 行
