# mobs/AI-02 · v8 配方（B8 方向纠正版）判读报告

**基线**：`fe43c0e`（＝ master HEAD）｜jar `etim-1.0.0.jar` 319,996B @2026-10-18 16:33:43
**判决源**：`run\obfuscated\logs\latest.log`（`[SleepLog]` / `[FoodLog]` / `[AILog]` / 控制台）
**全量日志落盘**：`build-logs\v8-full-201353.log`（184,911 B）
**轮次纪律**：任务书「**一次为限，不再迭代**」⇒ 本轮结束后**未做任何迭代**。

---

## 判词

> **G-3 = 未证（FAIL）｜G-4 = 未证（FAIL）**
> **失败点不在几何、不在时序、不在 TPS**，而在 **v8 时序第 1 步「bot 攻击 1 击」被 ETIM 自己的 reach 门全数拒绝**
> ⇒ HurtBy 反击目标从未建立 ⇒ 后续「入坑 → 开挖」链路无目标可用。

---

## 一、前置（全过）

| # | 项 | 结果 |
|---|---|---|
| 1 | **C13 净化** | `kill @e[type=zombie]` → `testfor @e[x=-66,y=68,z=247,r=128,type=Zombie]` = **found nothing** ✔ |
| 2 | **C14 TPS** | 10s 真实 → **Δgametime 204 tick**（≥190 门槛）✔ 实测 TPS ≈ **10.2**（半速，但过门槛，故未触发「清周边实体／关 weatherSystem」分支）|
| 3 | **A10 屋顶** | `fill -69 70 243 -63 70 250 stone`；`testforblock -66 70 247 minecraft:stone` = Successfully ✔ |
| 4 | **坑（东壁 2 层）** | `-68,66,250` / `-68,67,250` = air；`-68,65,250` = stone；**`-67,66/67,250` = stone ＋ `-66,66/67,250` = stone**（2 层）✔ |
| 5 | **C11 铺床** | clear → 支撑 stone → foot → head → 双格回读 **try 1 即 OK** ✔ |
| 6 | **A8 eat** | `rounds=8`（`food=6`），`[FoodLog] tooHungry` 零行 ✔ |
| 7 | **cfg / gamerule** | `moonStateOverride=blood` / `zombieDigAI=true` / `bedSentryWake=true` / `bedHostilePathable=true` / `mobwakeRarity=1000` / `weatherSystem=true`；`doMobSpawning=false` / `doMobLoot=false`；`difficulty easy`；`/gamemode survival ETIM_Harn04` ✔ |
| 8 | **frenzy 窗** | 入窗 adjusted=**19199** ✔ |

### 附：任务书要求的 weatherSystem 依赖 grep（证「frenzy 链不读该键」）

| 词 | 命中 |
|---|---|
| `weatherSystem` | `ETIMConfig.java:81`（字段）、`ETIMConfig.java:397`（读配置）、`mixins/MixinWorldWeather.java:24`（注释）、`MixinWorldWeather.java:53`（`if (!ETIMConfig.weatherSystem)` 直通）、`weather/ETIMWeatherClock.java:108` |
| `isFrenzied` / `isDiggingEnabled` | `mob/ETIMDigging.java:271` / `:285`（定义）、`mob/ETIMEntityAIDig.java:66/108`、`mixins/MixinEntityAIAttackMelee.java:50` |

⇒ **`ETIMDigging.isFrenzied` / `isDiggingEnabled` 与 `ETIMEntityAIDig` 均不读 `weatherSystem`**，天气键只作用于 `MixinWorldWeather` 与 `ETIMWeatherClock`。**结论：若 TPS 不足，关 `weatherSystem` 不会影响 frenzy 链**（本轮 TPS 过门槛，故该分支未执行，`weatherSystem` 全程 `true`，未改动）。

---

## 二、执行实况（v8 时序逐步）

```
召僵尸 -64 68 249（bot 攻击可达位）        → Object successfully summoned
attack gate 放出 20:13:11.925
  12:13:11.928 [digwake] attack#1 -> mob d=1.64
  12:13:11.962 [chat] etim.reach.deny_attack            ← 拒绝 1
  12:13:12.586 [digwake] attack#2 -> mob d=1.64
  12:13:12.610 [chat] etim.reach.deny_attack            ← 拒绝 2
  12:13:13.246 [digwake] attack#3 -> mob d=1.01
  12:13:13.261 [chat] etim.reach.deny_attack            ← 拒绝 3
验锁 → 报 "LOCKED after 7s"（实为 walk 行，见三·2）
tp 入坑 → Teleported Zombie to -67.5, 66.0, 250.5 ；testfor = Found Zombie  ✔
等 bed-dig 首行 20s → **无** ⇒ 按任务书「dig AI 未启动，判失败即停」终止
```

**判决源汇总（全日志）**

```
[SleepLog] dig-gate 全日志 rows = 3
    gate=target  x2
    gate=walk    x1
[SleepLog] bed-dig   = 0
[SleepLog] bed-wake  = 0
[SleepLog] bed-refuse= 0
```
⇒ **窗内无任何 bed-* 判决行**；G-3 的 `bed-wake reason=digging` 与 G-4 的 `bed-refuse reason=mobsDigging` **均未出现**。

---

## 三、异常路径逐条处置（任务书要求）

### 异常 1（**根因 · 阻断 v8 第 1 步**）`etim.reach.deny_attack` 报 `Double.MAX_VALUE`

```
L980: [20:13:11] reach denied: etim.reach.deny_attack 1.7976931348623157E308 > 1.50
L981: [20:13:12] reach denied: etim.reach.deny_attack 1.7976931348623157E308 > 1.50
L983: [20:13:13] reach denied: etim.reach.deny_attack 1.7976931348623157E308 > 1.50
```

- `1.7976931348623157E308` ＝ **`Double.MAX_VALUE`**（IEEE-754 双精度最大值）。
- 门限是 `1.50`；被比较的值恒为 `MAX_VALUE` ⇒ **无论实际距离多近都必然 deny**（实测距离 1.64 / 1.01 均被拒）。
- 典型成因：某个「取最小距离」的累加器以 `Double.MAX_VALUE` 初始化而循环体从未赋值（空集合/过滤条件不成立），或 `min` 的候选集为空。
- **⇒ v8 时序第 1 步「bot 攻击 1 击 ⇒ HurtBy 即时建 target」在结构上不可执行。** 攻击包未进入 `EntityLivingBase.attackEntityFrom`，故 `setRevengeTarget` 从未被调用，300t/600t 反击记忆无从建立。
- **⇒ 归属 A 级 · 待主会话裁决**：该门位于玩家攻击路径上，若同样作用于真实玩家，则**本构建下玩家无法对任何生物造成近战伤害**（远超本切片范围，须一手核验）。本报告只列证据，不做取舍。

### 异常 2「LOCKED after 7s」是**误判**（v7 假锁教训的重演）

窗内 `dig-gate` 只有 3 行：`target ×2`、**`walk ×1`**。锁检测器把任意「非 target/cfg/state/holding」的门位当作锁定成功，而**`gate=walk` 只证明「僵尸有活跃路径」，不证明「持有攻击目标」**（`walk` 出现在目标为 null 之后的其他分支？—— 实测该行与 `target` 行交替出现，说明是同一 tick 内的门位抖动）。

⇒ **锁判定的正确口径应是门位白名单**：仅 `sameBlock` / `dist16` / `dist8` / `sightDist` / `probe` / `strike` 这些**必须以 `getAttackTarget() != null` 为前提**的出口才算锁定；`walk` 不计入。

### 异常 3 `bed-dig` 20s 内零行 ⇒ dig AI 未启动

- 任务书口径：判失败即停。**已停，未迭代。**
- 机制解释：tp 入坑后坑壁切断 `EntitySenses.canSee`，而 HurtBy 未建立（异常 1）⇒ `:68` `getAttackTarget() == null` ⇒ `gateFail("target")` ⇒ dig 面永不进入。

### 异常 4 任务书指定的「`[AILog]` target 行」**不存在**

grep 全 `src/main`：`AILog.*target` / `AILog mob (target|aggro)` **零命中**；`[AILog]` 现有行式只有 `mob stats` / `mob despawn` / `livestock-*`。
⇒ **v8 第 1 步「回读 `[AILog]` target 行为准」无可用通道**，本轮改用 dig-gate 门位（并因此踩到异常 2）。**建议主会话补一条 `[AILog] mob target=…` 哨兵**，否则任何「目标是否建立」的判定都只能间接推断。

### 异常 5 TPS 半速但过门槛

实测 TPS ≈ 10.2（Δ=204 tick/10s）。仍低于满速，`300t` 记忆的实际墙钟时长被拉长到 ~30s（对本轮无影响，因目标根本没建立）。**记为已知环境约束。**

### 未触发的异常（任务书要求列明）

| 异常 | 状态 |
|---|---|
| `bed-wake reason=notSafe`（sentry 抢跑） | **未出现** |
| `wakeHungry`（A8 破窗） | **未出现** |
| TPS < 190t | **未触发**（204 ✓） |

---

## 四、新增结论登记

| 级 | 编号 | 内容 |
|---|---|---|
| **A** | **A12** | **ETIM 玩家攻击 reach 门恒拒**：`etim.reach.deny_attack` 的比较值为 `Double.MAX_VALUE`（非距离），门限 1.50 ⇒ 任何近战攻击被拒。**阻断 HurtBy 通道**（v8 唯一通道）。若该门同样作用于真实玩家 ⇒ **本构建玩家无法近战伤害生物**。**待主会话一手核验 + 裁决。** |
| **B** | **B9** | `dig-gate gate=walk` **不能**作为「目标已建立」的证据（`walk` 只需活跃路径）；锁判定须用门位白名单 `{sameBlock, dist16, dist8, sightDist, probe, strike}`。 |
| **C** | **C15** | `[AILog]` **无 target 行**（grep 零命中）⇒ 任务书「回读 `[AILog]` target 行」无通道；建议补哨兵。 |
| **C** | **C16** | TPS 实测 **10.2**（半速）；`Δtick≥190` 门槛只能筛掉"完全卡死"，筛不掉半速。建议门槛提到 **≥195** 并把「半速」写进判据前提。 |

---

## 五、G 系血月场景关账建议（按任务书附注）

任务书已定调：**本轮为 G 系血月场景末轮**（R-04 已定谳：第一批落码后血月全周期弹床，本场景永久消失）。本轮失败 ⇒ 按任务书走**部分关账**：

- **已实证的机制链路**（可关账部分）：
  1. `bed-dig` 行式与 `progress 0→10` 拍距（G-1 ✔，Δ30t ＝ `300×hardness/2`）
  2. 挖穿链（G-2 ✔，两格床块 → Air）
  3. frenzy 正证（G-5 ✔，徒手僵尸 + 窗内 dig 行）
  4. frenzy 负证（G-6 ✔，非 frenzy 窗 `gate=orGate` + 零 `bed-dig`）
  5. 总开关负证（G-7 ✔，A7 后 `gate=cfg` 7 行）
  6. **dig 面 12 出口门链**（v6 实测 `target/walk/sameBlock/strike/probe/orGate/cfg` 全部出过行）
- **未证部分（移交第一批后 G' 复测）**：
  - **G-3** `bed-wake reason=digging`
  - **G-4** `bed-refuse reason=mobsDigging`
  - 移交理由：本场景唯一通道（HurtBy）被 **A12** 结构性阻断；忠实场景（非血月 + 持铲）不受血月弹床影响，可在第一批落码后复测。

---

## 六、环境终态（已回读复核）

| 项 | 状态 |
|---|---|
| 坑 | `-68,66,250` / `-68,67,250` 回填 stone；`-67/-66,66/67,250` 回填 air（已拆） |
| 屋顶 | `fill -69 70 243 -63 70 250 stone`；`-66,70,247` = stone ✔（31 块） |
| 木板墙 | 全清 air（`fill -67 68 245 -67 69 249 air`） |
| 床 fixture | `-66,68,246` + `-66,68,247` 双格 **Successfully found the block … minecraft:bed** ✔ |
| 僵尸 | 清零（末次 `kill @e[type=zombie]`） |
| gamerule | `doDaylightCycle/doMobSpawning/doWeatherCycle/doMobLoot` 全 **true** ✔ |
| cfg 六键 | `moonStateOverride=`（空）/ `zombieDigAI=true` / `bedHostilePathable=true` / `bedSentryWake=true` / `mobwakeRarity=1000` / `weatherSystem=true` ✔ |
| **服务端** | **已 stop；25565 无监听** ✔ |
| **java** | 仅 **GradleDaemon PID 19504**（按纪律保留）；服务端进程零残留 ✔ |
| **node** | 测试进程**零残留** ✔ |
| git | `## master...origin/master`；**`src/main` 净**（本轮 `src/main` 零改动） |

---

**判读签署**：会话七 ｜ 基线 `fe43c0e` ｜ **G-3 / G-4 未证（一次为限，已按任务书判失败即停）** ｜ 前置 8 项全过 ｜ **根因 A12：`etim.reach.deny_attack` 比较值恒为 `Double.MAX_VALUE` ⇒ 玩家近战恒拒 ⇒ HurtBy 通道结构阻断** ｜ 新增 A12 / B9 / C15 / C16 ｜ 全量日志 `build-logs\v8-full-201353.log` ｜ `src/main` 零改动、服务端已停、进程自清

---

## 追加 · A12 工装修复 + 冒烟（testharness 侧，`src/main` 零改动）

### A12 定谳修正（主会话裁决）
`mineflayer bot.attack()` **纯发包、零视线处理**（`entities.js:843-856` 实证）⇒ 服务端 slab ray miss ⇒ `deny_attack` 恒拒。
**⇒ ETIM 的 reach 门无缺陷；缺陷在工装侧。**（本报告上一节的「若同样作用于真实玩家则玩家无法近战」推测**已被裁决否定**，以主会话定谳为准。）

### 修复内容（`testharness/player/bed-entry-ops.js` · `digwake` 攻击循环）
```js
await bot.lookAt(best.position.offset(0, best.height * 0.5, 0), true);  // 先对准躯干中点
await sleep(150);
bot.attack(best);                                                      // 再发包
// 三击循环每击都重新 lookAt（僵尸会移动）
```

### 冒烟（不搭场景，仅起服 + 净场 + 召一只邻位僵尸）
```
前置  : C13 zombies(r128) = found nothing ✔ ；C16 TPS Δtick/10s = 204（≥195 门槛）✔
op 输出: attack#1 -> mob d=1.92 aimed=(3.11,-0.32)
         attack#2 -> mob d=1.91 aimed=(2.92,-0.32)
         attack#3 -> mob d=1.92 aimed=(2.75,-0.38)
验收  : 服务端 deny_attack rows = 0   ★ PASS
旁证  : dig-gate rows=1 → gate=orGate（当日为白天、非 frenzy ⇒ isDiggingEnabled=false，符合预期；
        本项不作锁定证据，按 B9 白名单口径）
```
**⇒ 攻击包被服务端接受，HurtBy 通道（`EntityLivingBase.attackEntityFrom` → `setRevengeTarget`）恢复可用。**

冒烟日志落盘：`build-logs\a12-smoke-201846.log`（81,361 B）

### 口径同步（B9 / C16 采纳）
- **B9**：`gate=walk` **不作**锁定证据；锁定白名单 `{sameBlock, dist16, dist8, sightDist, probe, strike}`。
- **C16**：TPS 门槛 **≥195**；半速写入判据前提（本轮实测 204 tick/10s ≈ 10.2 TPS，仅过门槛）。
- **C15**：`[AILog] target` 哨兵行进第一批落码。

### 待命
- **G' 复测（G-3'/G-4'，非血月 + 持铲忠实场景）**：等主会话在新基线通知后交付任务书；**冒烟已通过，但正式场景搭建仍按指令未动**。

