# mobs/AI-02 · G' 复测备料（只备料，未开窗）

**基线**：`a520c88`（＝ master HEAD，「audit20 batch 1」）｜jar `etim-1.0.0.jar` **321,481 B @2026-10-18 20:34:26**
**本轮性质**：**只备料** —— 未起服、未搭场景、未改 cfg、未开任何判据窗
**上一轮**：v8 判失败（根因 A12，工装侧已修，冒烟 PASS）

---

## 一、判决类清单（G' 目标）

| 判决类 | 判据行 | 所在面 |
|---|---|---|
| **G-3'** | `[SleepLog] bed-wake reason=digging`，行序 `bed-dig → S → bed-wake`，挖点 ±8/±5 内 | `ETIMBedSafety.tickSentry` :369-377 |
| **G-4'** | `[SleepLog] bed-refuse reason=mobsDigging`（醒后 rcw 复点） | `ETIMBedSafety.logBedRefuse` / MixinEntityPlayer redirect |
| 异常 | `reason=notSafe` = sentry 抢跑（回传重裁）；`wakeHungry` = eat 重做 | — |

---

## 二、逐项核讫表

| # | 核讫项 | 实测 | 判 |
|---|---|---|---|
| 1 | 基线 | `a520c88`，`## master...origin/master`，**`src/main` 净** | ✔ |
| 2 | jar | 321,481 B @ 20:34:26（与任务书一致） | ✔ |
| 3 | cfg 六键 | `moonStateOverride=`（空）/ `zombieDigAI=true` / `bedHostilePathable=true` / `bedSentryWake=true` / `mobwakeRarity=1000` / `weatherSystem=true` | ✔ |
| 4 | **cfg 新键 `weatherDebugLog`** | **cfg 文件内尚无该键**；源码有 `ETIMConfig:82`（`= false`）／`:399`（`getBoolean(...,"weather",false,...)`） | △ 见 P5 |
| 5 | **R-04 落码** | `MixinWorldServer:69` → `ETIMSleepClock.wakeAllSleepers(self)`；门 = `ETIMConfig.bloodMoonSleepBlock && ETIMMoonState.phase(self)==Phase.BLOOD`（每 tick，位置在 `areAllPlayersAsleep()` 之前） | ✔ 确证 |
| 6 | `wakeAllSleepers` 行为 | 遍历 `playerEntities`，`isPlayerSleeping()` ⇒ `wakeUpPlayer(true,false,false)`；无睡者时空转 | ✔ |
| 7 | **持铲路径（源码）** | `ETIMDigging.isDiggingEnabled`：剑→`false`；`isFrenzied`→`true`；否则 `held.getItem() instanceof ItemTool`。**`ItemSpade extends ItemTool`** ⇒ 持铲＝`true` | ✔ |
| 8 | `isFrenzied` 定义 | `phase(w)==BLOOD && isNight(w)`（`isNight` 走 **totalWorldTime**，**不响应 `/time set`**） | ✔ |
| 9 | 工装 `lookAt` 修复在位 | `bed-entry-ops.js:432` `await bot.lookAt(best.position.offset(0, best.height*0.5, 0), true)` | ✔ |
| 10 | sentry 面是否读相位 | `ETIMBedSafety` 内 `MoonState/Phase/isFrenzied/BLOOD/BLUE` **命中数 = 0** | ✔ 相位无关 |
| 11 | sentry 判定顺序 | **`notSafe`（pathable hostiles）在前且 `return`**；`digging` 面在后 | ⚠ 见 P6 |
| 12 | `digging` 面条件 | `isHostileEntityDiggingNearBed`：±8/±5 内 `EntityZombie` 且 `s.isDestroyingBlock()` | ✔ |
| 13 | dig AI 门序 | `:56 cfg` → `state` → `holding`(剑) → `(isDiggingEnabled \|\| canSeeTarget(false))` → `:68 target` → `sameBlock` → 续挖… | ✔ |
| 14 | 进程/端口 | 25565 **无监听**；java = `GradleDaemon:14184` ＋ `Gradle worker:25712`（azul JDK8，daemon 子进程）；node 仅 `Adobe Creative Cloud:25984`（**非我方**） | ✔ |

---

## 三、冲突分级

### P1（**A 级 · 阻塞 G' 前提**）「非血月」没有命令级保证，且默认可能正好是血月日

相位推导（`ETIMMoonState.phase`，`:43-66`）：

```java
long day = w.getTotalWorldTime() / 24000L + 1L;
if (day % 128L == 0L) return Phase.BLUE;
if (day % 32L == 0L)  return Phase.BLOOD;
if (day % 8L == 0L)   return Phase.FULL;
if (day % 8L == 4L)   return Phase.NEW;
return Phase.OTHER;
```

- **`/time set` 只动 `dayTime`，对 `getTotalWorldTime()` 无效** ⇒ **无法用命令改相位/跳过血月日**。
- `moonStateOverride` 合法值仅 `'' / blue / blood / full / new`（`ETIMConfig:728-737`，其它值**加载即抛 `IllegalStateException`**）⇒ **没有「非血月/OTHER」的强制值**。
- **但 `blue` 可用**：`Phase.BLUE ≠ BLOOD` ⇒
  1. R-04 的每 tick `wakeAllSleepers` 分支**不触发**（门要求 `phase==BLOOD`）⇒ 弹床消失；
  2. `isFrenzied` = `BLOOD && night` ⇒ **false** ⇒ 走 `ItemTool` 支 ⇒ 持铲可挖；
  3. `ETIMBedSafety` 不读相位（核讫 #10）⇒ **不影响 G-3'/G-4' 判定面**；
  4. 免疫「自然日恰好 day%32==0」这一随机否证。

⇒ **候选（待主会话裁决）**
- **方案 A（推荐）**：`moonStateOverride=blue` —— 确定性最强，且与血月场景彻底解耦。
- **方案 B（照任务书原文）**：`moonStateOverride=`（空），但**开窗前必须回读 `day = gametime/24000 + 1` 且 `day%32 != 0`**；若命中 blood 日 ⇒ 本轮直接不开窗（24,000 tick ≈ 20–40 分钟才自然跳日，不现实）。

> 若主会话裁定「空」为口径必需，请确认是否接受「day%32==0 则本轮作废」。

### P2（**A 级 · 会直接否掉 v8 几何**）非狂化 `sightDist` 门限只有 **4.0**

`ETIMEntityAIDig:109`：

```java
if (distanceToTarget > (canAttackerSeeTarget ? 8.0F
                      : (ETIMDigging.isFrenzied(this.digger) ? 6.0F : 4.0F))) {
    return this.gateFail("sightDist", " dist=… seen=… frenzied=…");
}
```

- v8 坑 `-68,66,250` 到 bot 站位 `-63.8,68,247.5` 的距离 = **5.28**。
- 血月（v8）时 `frenzied=true` ⇒ 门限 **6.0** ⇒ 5.28 合法。
- **G' 非狂化** ⇒ `frenzied=false` ⇒ 门限降到 **4.0** ⇒ **5.28 只有在 `seen=true`（门限 8.0）时才合法**。
- `canAttackerSeeTarget` = 自身 eyeY+1 处可通行 **且** `lineOfPhysicalReach(eye+1 → target eye)`。v8 坑的东壁只到 `y=68`（石顶 y=68），射线在 y≈68.8→69.6 之间穿过 ⇒ **大概率 seen=true**，但**必须实测**。

**⇒ 开窗纪律（新增）**：放行后 5 s 内必须看到 `gate=sightDist … seen=true`（或已越过该门进入 `probe`/`bed-dig`）。
- 若出现 `gate=sightDist dist=5.28 seen=false frenzied=false` ⇒ **几何不成立，立即停**，改用「坑移到 ≤4」的备用几何（会把挖掘窗压到 ~45t，需同步调时序）。

### P3（**B 级 · 零成本判据**）持铲是否生效，可由门位直接读出

- `isDiggingEnabled=true` ⇒ 越过 `:66` 的 `orGate`，下一个门位是 `:68 target`（无目标）/ `dist8` / `sameBlock` …
- `isDiggingEnabled=false` ⇒ **`gate=orGate`**（冒烟已实测该行）。
- ⇒ **看到 `orGate` = 铲没生效（或拿了剑）**；看到 `target`/`dist8` = 铲生效。**无需改 `src/main` 加哨兵。**

### P4（**C 级 · 已知**）F-2-37：睡眠中营养池不再冻结

A8 的 70–140 s 归零窗仍在 ⇒ 判据动作压在躺下后 **60 s 内**（任务书已定）。

### P5（**C 级 · 待首启回读**）`weatherDebugLog` 尚未落到 cfg

- 源码有（`ETIMConfig:82` / `:399`），cfg 文件里没有 ⇒ 新 jar **首次加载时由 Forge 写入**。
- ⇒ 正式轮开机后回读该键（预期 `B:weatherDebugLog=false`）。不影响 dig/sleep 面（只在 `ETIMWeatherClock` / `MixinWorldServer:219` 的日志门）。

### P6（**B 级 · 判定面纪律**）`notSafe` 优先于 `digging`

`tickSentry` 先跑 `pathableHostilesNearBed(...)`，命中即 `logBedWake(...,"notSafe",...)` + `wakeUpPlayer` + **`return`**。
⇒ 只要床 ±8/±5 内存在**任意可寻路敌对生物**，就永远只出 `notSafe`。
⇒ **坑必须 `noPath`**（C13 清场必须彻底，且 `doMobSpawning=false` 全程保持）。

---

## 四、待主会话裁决（3 项）

1. **P1 方案 A（`moonStateOverride=blue`）是否采纳？** 若坚持空值，是否接受「自然日为血月日则本轮作废」。
2. **P2 是否预先改几何？** 现方案＝沿用 v8 几何 + 实测 `seen`；备选＝坑移到 ≤4（牺牲挖掘窗）。
3. **G' 判据是否加「首 5 s 必过 sightDist」这一硬门槛**（不达标即停，避免把几何失败误判成机制失败）。

---

## 五、配方 v9 草案（**未执行**，仅备料）

```
【前置】
 1. cfg：moonStateOverride=（按 P1 裁决；推荐 blue）/ zombieDigAI=true / bedSentryWake=true
         bedHostilePathable=true / mobwakeRarity=1000 / weatherSystem=true
 2. 起服 → boot OK → 回读 weatherDebugLog（P5）
 3. gamerule doDaylightCycle true / doWeatherCycle true / doMobSpawning false / doMobLoot false
    difficulty easy
 4. C13：kill @e[type=zombie] → testfor @e[x=-66,y=68,z=247,r=128,type=Zombie] = found nothing
 5. C16：10s 真实 → Δgametime ≥195（否则先清周边实体；再不足才关 weatherSystem——已证 frenzy 链不读该键）
 6. 相位回读：day = gametime/24000 + 1；若用空值且 day%32==0 ⇒ 停（P1-B）
 7. A10 屋顶：fill -69 70 243 -63 70 250 stone
 8. 坑（东壁 2 层）：fill -68 65 250 stone / fill -69 66 249 -67 67 251 stone
                     / fill -68 66 250 -68 67 250 air / fill -67 66 250 -66 67 250 stone
 9. C11 铺床三步 + 双格回读（≤4 轮）
10. A8：eat 直到 rounds>0

【窗口】
11. digwake op（attack gate / click gate）；bot /tp 到站位
12. summon 持铲僵尸（bot 攻击可达位）：
      summon zombie -64 68 249 {HandItems:[{id:"minecraft:iron_shovel",Count:1b},{}]}
    回读门位：出 orGate ⇒ 铲未生效 ⇒ 停（P3）
13. 放 attack gate ⇒ 三击（已 lookAt）⇒ 服务端 deny_attack 须为 0
14. ≤5s 内 /tp 僵尸入坑（-68 66 250，按回显核位）
15. 等 bed-dig 首行（≤20s）；无 ⇒ dig AI 未启动 ⇒ 停
16. **首 5s 内必过 sightDist**（P2 硬门槛）；见 seen=false 且 dist>4 ⇒ 停
17. bed-dig 首行后 ≤2s 放 click gate ⇒ bot 复 tp + 1.5s 点床
18. 见 S 行 ⇒ 预期 ≤2t 内 bed-wake reason=digging（G-3'）
19. 醒后 rcw 复点 ⇒ bed-refuse reason=mobsDigging（G-4'）
20. 失败即停，全量日志落盘

【收口】
21. 坑回填 / 屋顶 31 块 / 墙清 / 床双格 / 僵尸清零 / gamerule 四项 true / cfg 复原
22. 服务端 stop + 自清进程（25565 无监听、node 零残留、java 仅 daemon）
```

---

## 六、环境终态（本轮零改动）

| 项 | 状态 |
|---|---|
| 服务端 | **未启动**（全程无 25565 监听） |
| 世界 | **未改动**（床 `-66,68,246/247` 在位、屋顶 stone、坑 air） |
| cfg | **未改动**（六键原样、`moonStateOverride=` 空） |
| `src/main` | **净**（本轮零改动） |
| 进程 | java = GradleDaemon 14184 + Gradle worker 25712；node = Adobe 25984（非我方）；**测试进程零残留** |
| git | `## master...origin/master` @ `a520c88` |

---

**备料签署**：会话七 ｜ 基线 `a520c88` ｜ **只备料未开窗** ｜ 核讫 14 项 ｜ **P1（非血月无命令保证，推荐 `moonStateOverride=blue`）／P2（非狂化 sightDist=4.0，v8 几何需实测 `seen`）为两项 A 级待裁** ｜ 配方 v9 已备
