# sleep-01 判据窗判读 · 终稿（sleep-01-verdict）

**执行方**：会话七 ｜ **落码基线**：`git-workspace/etim @ 788bcc5`（HEAD=origin/master）
**jar**：**270,836B @2026-10-16 10:51:44**（788bcc5 现做现打，`BUILD_EXIT=0`）
**判定源**：`run\obfuscated\logs\latest.log` 的 `[SleepLog]` 通道（与 `[SpawnLog]` 不混用）
**裁定依据**：`playground/audit/audit19-w3-close.md` 后的 sleep-01 裁决批文
**版本链终行**：**788bcc5**

---

## 〇、终稿状态：**4 窗全判据 PASS ／ 3 窗受阻登记 ／ 1 窗结构性登记**

| 窗 | 状态 | 判据达成 |
|---|---|---|
| **W1** 完整睡夜+对齐直证 | **PASS（全判据）** | Δ=0 直证 ＋ 3 条断言逐位吻合 |
| **W3** vanilla passthrough | **PASS（全判据）** | neg 判据（forward/done/mobwake 全无）＋ 被弹床 |
| **W5** hungerDeny 拒绝 | **PASS（全判据）** | `reason=hungerDeny` ＋ 跨通道 `[FoodLog] tooHungry` |
| **W8** 连续两晚 Δ 不裂 | **PASS（全判据）** | 双晚 Δ=0 ＋ 第二晚入口 = 首晚出口+自然推进 |
| W2 血月睡门 | **受阻登记** | 入床被拒且**无 `reason=blood` 行**（phase=BLOOD 已证） |
| W4 doDaylightCycle=false | **受阻登记** | 入床被拒且**无 `sleep-skip` 行** |
| W6 hunger 中断 | **受阻登记** | 弱仓法受阻（nutrition 不可控） |
| W7 leftBed | **结构性登记**（按裁决 3） | 批量循环单拍内完成，`ticks_slept>0` 不可达；`reason=leftBed` 分支已转置（`:128-133`） |

---

## 一、判决类清单（行式观察点 · PASS/FAIL/未触发/登记）

| 观察点 | 行式 | 实测 | 判定 |
|---|---|---|---|
| L1 | `sleep-window gate=blocked reason=blood` | **0 行** | **未触发（受阻）** |
| L2 | `…reason=dayLiar` | **3 行**（`adjusted=5460 day=9`／`5460 day=10`／`10196 day=11`） | **PASS（按裁决 4① 判 PASS，行式不改）** |
| L3 | `…reason=offWindow` | **2 行**（`adjusted=15412 day=9`／`5001 day=10`） | **PASS** |
| L4 | `…reason=hungerDeny` | **1 行**（`adjusted=11780 day=11`） | **PASS（W5）** |
| L5 | `sleep-skip n/a doDaylightCycle=false` | **1 行**（02 切片残留面） | **PASS（面达成；W4 正确前置复跑受阻）** |
| L6 | `sleep-mobwake deferred` | **2 行**（W1／W8 各一） | **PASS** |
| L7 | `sleep-forward slept=N totalTime=T->T+N dayTime=D->D' phase=P gate=open` | **2 行** | **PASS** |
| L8 | `sleep-interrupt reason=hunger ticks_slept=N` | **0 行** | **未触发（受阻）** |
| L9 | `sleep-interrupt reason=leftBed ticks_slept=N` | **0 行** | **未触发（裁决 3 转结构性登记）** |
| L10 | `sleep-done achievements=… potionsCleared=… slept=N` | **2 行** | **PASS** |

---

## 二、逐窗核讫表（每窗一行）

| 窗 | 前置（逐项核，裁决 ④） | 操作 | 判据行序列 | 断言结果 |
|---|---|---|---|---|
| **W1** | `override=`／`bloodMoonSleepBlock=true`(:356)／`sleepFastForward=true`(:359)／`foodTestMode=true`(:95)／`hungerSleepDeny=true`(:116)／`doDaylightCycle=true`；boot stamp `20261016_110556` PID 20548 `Done 1.330s` `exceptions=0` | 读双钟确认 adjusted 进窗 → `bed-ops sleep`（`bot.sleep()` 返回 `isSleeping=true`） | `sleep-mobwake deferred` → `sleep-forward` → `sleep-done` → `reason=dayLiar` | **`(215000-23000)%24000=0`**；`slept=7051=T'-T`；`5000-21949+24000=7051`；无 interrupt；`wellRested`（7051≥6000）；`potionsCleared=true`；`phase=OTHER`（day=9）—— **6/6 PASS** |
| **W2** | `override=blood`／`bloodMoonSleepBlock=true`／`sleepFastForward=false`（W3 遗留，**血门 `:59` 早于 passthrough `:69`，不影响判据**）／`doDaylightCycle=true`；boot stamp `20261017_155823` PID 26504 `Done 1.229s` | 入床 **4 次**（白昼 3 次＋窗口命中 1 次） | **0 行** | **`phase=BLOOD` 已证**（`[SpawnLog] density-eval … daytime=true phase=BLOOD`）＋`bloodMoonSleepBlock=true` → **入床被拒但无 `reason=blood` 行** → **未达成，受阻登记** |
| **W3** | `override=`／`sleepFastForward=false`／`bloodMoonSleepBlock=true`／`doDaylightCycle=true`；boot stamp `20261017_155017` | 轮询等窗命中 → `bed-ops sleep` | **0 行** | **`forward=0 done=0 mobwake=0`**（neg 判据 PASS）；bot **被弹床**（`isSleeping` t+1s=true → t+6s=false，位置 `-65.5,68.6,247.9`→`-66.5,68.0,246.5`）；表钟自然推进（690，非快进）—— **3/3 PASS** |
| **W4** | `override=`／`sleepFastForward=true`／`bloodMoonSleepBlock=true`／`foodTestMode=true`／**`doDaylightCycle=false`**（干净重启后 RCON 设）；boot stamp `20261017_160242` | 入床 2 次（含清僵尸后） | **0 行** | 入床被拒且**无 `sleep-skip` 行** → **未达成，受阻登记** |
| **W5** | `foodTestMode=true`＋`hungerSleepDeny=true`＋survival | `/effect give hunger 255 255` 循环 → `bot.food` 6→0（28.5s）→ 右键床 | `reason=hungerDeny` ＋ `[FoodLog] tooHungry` | `reason` 字面在案；跨通道同拍；`isSleeping=false` 持续 15s；**对照面** `food=3` 时成功入床（门只在 `nutrition==0` 拦）—— **4/4 PASS** |
| **W6** | `override=`／两键 true／`foodTestMode=true`／survival＋hunger effect | 弱仓法两阶段：dry drain 至 `bot.food=1`（345s）→ 轮询等窗 → `starve target=1` 入床 | **0 行** | **nutrition 不可控**：`hunger effect` 仅耗 **satiation**；bot 静止时 satiation 满 → nutrition 不降（第二轮 drain 480s 仍 `food=6`）。裁决 2 的「池<8000 入床」前提**未构造成功** → **受阻登记** |
| **W7** | — | 未执行 | — | **按裁决 3 转结构性登记**：`runSleepTicks`（`:117-133`）单拍内跑完整夜，网络往返不可达批中段（R196 本体同构 `WorldServer.java:533-601`）。`reason=leftBed` 分支**已转置**（`:128-133`），实现完成面为真 → **不判 OFFEND** |
| **W8** | 同 W1（**同 boot 连做**） | 第二晚读双钟确认 `adjusted=21256` → `bed-ops sleep` | `sleep-mobwake deferred` → `sleep-forward` → `sleep-done` | **`(239000-23000)%24000=0`**；`slept=7239=T'-T`；`5000-21761+24000=7239`；双晚 Δ 均 0；表钟 `23000+16761=39761`＝首晚出口+自然推进；`phase=OTHER`（day=10，`:60` 总钟面）—— **6/6 PASS** |

---

## 三、判据行原文（终稿证据）

```
# W1 首晚
[SleepLog] sleep-mobwake deferred (R196 1/1000 bed-mob wake roll :551-578 needs the AI/bed slice; hook reserved)
[SleepLog] sleep-forward slept=7051 totalTime=207949->215000 dayTime=22332->23000 phase=OTHER gate=open
[SleepLog] sleep-done achievements=wellRested potionsCleared=true slept=7051
[SleepLog] sleep-window gate=blocked reason=dayLiar adjusted=5460 day=9

# W8 第二晚
[SleepLog] sleep-forward slept=7239 totalTime=231761->239000 dayTime=39761->23000 phase=OTHER gate=open
[SleepLog] sleep-done achievements=wellRested potionsCleared=true slept=7239

# W5（跨通道）
[SleepLog] sleep-window gate=blocked reason=hungerDeny adjusted=11780 day=11
[FoodLog] ETIM_Harn04 (16609) tooHungry (right-click bed while starvation)

# W2 前置自证（phase 面，非 SleepLog）
[SpawnLog] density-eval dim=0 at (-67,68,246) imobs=1 limit=8 min=8 prox=0.0 daytime=true phase=BLOOD

# W3：forward=0 done=0 mobwake=0（neg 判据，无行即 PASS）
```

---

## 四、B 级三项处置注记（按裁决 4）

① **`dayLiar` 判 PASS，行式不改**：该行是 shipped 日躺面正确发挥作用（bot 日间躺床 → DAY_LIERS 入表 → gate-1 优先于 gate-4 `offWindow`，`MixinWorldServer.java:54` 早于 `:75`）。`offWindow` 纯净字面只在「bot 日间不入床、入床压在 adjusted≥21000 后」可前下可见。**L2 判 PASS。**

② **`dayTime` 入口 raw 值（39761）接受，不改码**：1.12 `worldTime` 是不回卷原始累加计数；log 打原始值，判读器**断言只用出口值与差值**（W1/W8 已如此断）。
**判读器 log 语义注释**：行内 `dayTime=D->D'` 的 `D` 为 raw 累加值（可 >24000），`D'` 为出口取模值（`ETIMSleepClock.java:146` `totalAfter % 24000`）。⇒ **断言式恒用 `(T'-D')%24000==0`，不用入口值。**

③ **Δ 恒定 6380 治理证据**：原残差为 02 切片锁夜/操钟遗留 `Δ≡6380 (mod 24000)`；绝对对齐出口（`D:=T%24000`）在每个睡跳点把它打成 `≡0`。**实测治理已生效**：W2 窗前置核得 `(T-D)%24000 = 3`（旧残差消失）。**相位判定一律用总钟**（mixin `:60` 用 `getWorldTotalTime()`，正确面），沿袭即可。

---

## 五、冲突分级

| 级 | 项 | 内容 |
|---|---|---|
| **A 判定面** | **无** | 4 窗全判据 PASS；核心式 `(T'-D')%24000==0` 在 W1/W8 双窗成立 |
| **B 观察面** | ① | `dayLiar` 优先于 `offWindow` 出线（`:54` 早于 `:75`）；部分窗外入床记为 `dayLiar` 而非 `offWindow`（`adjusted=10196 day=11`） |
| B | ② | `dayTime` 入口 raw 值语义（见 §四②） |
| B | ③ | **W2/W4 入床被拒但无任何门判定行** —— 两窗门条件均已自证（W2：`phase=BLOOD`＋`bloodMoonSleepBlock=true`；W4：`doDaylightCycle=false`），`logWindowBlocked` 未被调用 ⇒ **注入点覆盖面存疑**，登记待核 |
| **C 非判定面** | ④ | **RCON gamerule 跨切片持久化**（存 level.dat）：W4 干净重启后读得 `true`，须 RCON 再设 `false`——每窗重启前逐项核已纳入常备前置 |
| C | ⑤ | **入床窗按总钟判**（`:60`），表钟会因 Δ 残差误判（W2 轮询器一次误判：`daytime=5202` → `adjusted=11202` 而非窗内） |
| C | ⑥ | **`exceptions` 非零行全为 harness bot 断连噪声**（`NetworkDispatcher exception / IOException`），非 mod 异常 |
| C | ⑦ | **白昼僵尸占据床**：W2/W4 白昼入床时 `imobs=1`，僵尸睡床致玩家躺不下（清僵尸后仍失败，见 ⑧） |
| C | ⑧ | **bot 饥饿态致 `gamemode creative` 回执在案但 `health` 不回满**（`Set own game mode` ×3 在案，`health=2.5` 全程）→ 入床被拒；**根因待核**（疑与 `ETIMFoodStats` heal progress 依赖 nutrition 有关，`:75-89`） |
| C | ⑨ | `hunger effect` 仅耗 satiation；静止 bot 的 nutrition 不降（实测 480s 无变化）→ W6 弱仓法前提不可构造 |

---

## 六、W2/W4/W6 受阻面 · 待裁决

| 窗 | 受阻根因 | 建议下一步（**待裁决，会话七不擅自改**） |
|---|---|---|
| **W2** | 入床被拒且无 `reason=blood`；`phase=BLOOD`＋`bloodMoonSleepBlock=true` 已证 | 核血门**注入点覆盖面**：`MixinWorldServer.java:59` 的 `logWindowBlocked("blood")` 是否覆盖 `trySleepInBed` 路径（vs 仅 `WorldServer.tick` sleep-skip site）。若未覆盖，属落码缺口（不判 OFFEND，须裁决） |
| **W4** | 入床被拒且无 `sleep-skip`；`doDaylightCycle=false` 已证 | 同上，核 `:66` `logDaylightCycleSkip` 的注入点覆盖面 |
| **W6** | nutrition 不可控（`hunger effect` 仅耗 satiation） | 换手段：①入床前让 bot **持续跳跃/行走**耗尽 satiation 再施 hunger；②或用 `[FoodLog] nutritionOnlyPool` 转折点卡位（本会话两次尝试均未构造成功） |
| **共通** | ⑧ gamemode 回执在案但 health 不回满 → 入床被拒 | 核 `ETIMFoodStats` heal progress（`:75-89`）在 gamemode creative 下的行为；可能需先补食回 nutrition 再入床 |

---

## 七、落盘与清理

- **本档**：`testharness\reports\sleep-01-verdict.md`（终稿）｜**版本链终行 788bcc5**
- **harness 新增件**：`testharness/player/bed-ops.js`（`find`/`place`/`sleep`/`starve`/`wake` 五 op）；`testharness/server/wait-window-and-sleep.ps1`（总钟轮询入床窗触发器）
- **世界工装登记**：testw2h 床 2 block（`(-66,68,246)` foot meta=0／`(-66,68,247)` head meta=8）——测试工装，非 ETIM 产物
- **cfg 终态**：`S:moonStateOverride=`／`B:bloodMoonSleepBlock=true`／`B:sleepFastForward=true`／`B:foodTestMode=true`／`B:hungerSleepDeny=true`
- **gamerule 终态**：`doDaylightCycle=false`（W4 前置，**下次起服须核**）
- **进程**：server `stop`；25565 无监听；testharness node 零残留

---

# 八、复跑注记（按 sleep-01 终稿裁决批文）

**原受阻根因登记（保留，见 §五 B③ 与 §六）**：W2/W4 的「无 blood 行／无 skip 行」**经裁决判定为非落码缺口**——blood 门与 sleep-skip 门均在 `WorldServer.tick` 的 `areAllPlayersAsleep` 站点（R196 `:207-212` 同位），语义即「全员真睡后门才现」；入床未成立则门面不触。**受阻根因落位 bot 入床工步。**

## 8.1 门序源码复核（`MixinWorldServer.java:49-81`）

```
:50  if (!self.areAllPlayersAsleep()) return false;        ← 前置门（全员真睡）
:54  hasAnyDayLiar → logWindowBlocked("dayLiar") → false
:59  bloodMoonSleepBlock && phase==BLOOD → logWindowBlocked("blood") → false
:65  !doDaylightCycle → logDaylightCycleSkip → false        ← skip 门
:70  !sleepFastForward → return true（vanilla passthrough）
:75  !windowOpen(adjusted) → logWindowBlocked("offWindow") → false
:80  runSleepTicks(self) → false
```

## 8.2 W2 血月睡门 · 复跑 —— **PASS**

**三硬条件逐项落实**：
1. **入床压在夜窗内**：`wait-window-and-sleep.ps1` 总钟轮询命中后才起跳（`adjusted=21968 ≥ 21000`），未提前（日间躺床会以 DAY_LIERS 入表令 gate-1 `dayLiar` 遮蔽 `reason=blood`——W1 晨行已证蔽面）
2. **窗内先清邻域**：清怪走 chat 面（`box-ops-via-bot.js kill-box` 九型 `r=10`）；床两 block `testforblock` ×2 在位（`(-66,68,246)`／`(-66,68,247)`）
3. **gamerule 设回 true**：RCON 设后复核 `doDaylightCycle = true`

**判据行原文**：
```
[SleepLog] sleep-window gate=blocked reason=blood adjusted=21968 day=16
```

| 判据 | 实测 | 判定 |
|---|---|---|
| `reason=blood` blocked 行 | 字面在案 | **PASS** |
| 全窗无 `sleep-forward`／`sleep-done` | `[SleepLog]` 全窗 **1 行**，无 forward/done | **PASS** |
| 门节拍正常（末 bot 上床 +5s） | `bot.sleep()` 返回 `isSleeping=true`；门行随 5s 内出现 | **正常，非延时异常** |
| bot 状态 | `pre-sleep food=6 health=2.5`（补食线已启动，food>0） | — |

## 8.3 W4 doDaylightCycle=false · 复跑 —— **部分达成（neg 面 PASS，门面未现）**

**前置落实**：
- 干净起服后**重读为 `true`**（C 级坑复现，裁决已证）→ RCON 再设 `false` → **复核 `doDaylightCycle = false`**
- 关键观测：`doDaylightCycle=false` 下**表钟冻结 23209 而总钟照走** → adjusted=(19244+6000)%24000=**1244 < 4000 即在夜窗**，故 W4 的「夜窗入床」在 gamerule=false 下可达（不矛盾）

**实测**：
```
（入床成功：sleep() 返回 isSleeping=true，pos=-65.5,68.6,247.9，持续未弹床）
[SleepLog] → 全窗 0 行（无 sleep-skip，亦无 forward/done）
```

| 判据 | 实测 | 判定 |
|---|---|---|
| 无 `sleep-forward`／`sleep-done` | 0 行 | **PASS（neg 面）** |
| bot 不弹床 | `isSleeping=true` 持续，未弹床 | **PASS** |
| 表钟不跳 | gamerule=false 冻结 | **PASS** |
| `sleep-skip n/a doDaylightCycle=false`（去重一笔） | **未现** | **未达成** |

**门面未现的落位（待核，不判 OFFEND）**：`:65` skip 门在 `:50` `areAllPlayersAsleep()` 之后。若该前置在 `doDaylightCycle=false` 下恒为 false（例如 vanilla 侧在 gamerule=false 时不累积 `sleepCounter`/不置 sleep flag），则 mixin 提前在 `:50` 返回，`:65` 永不触——与 W2 同型的「门前置未成立」。**需核 vanilla `WorldServer.tick` 在 gamerule=false 下的 sleep 判定路径**（会话七未擅自改码）。

## 8.4 W6 hunger 中断 · 复跑 —— **受阻终态（按批文结案，不再追）**

**段一 运动烧实测**（`bed-ops.js burn`：sprint ＋ jump ＋ strafe ＋ 每 250ms 重施 `hunger`）：

```
burn start: food=6 health=2.5
t+15s  food=6   t+45s  food=6   t+105s food=5   t+165s food=6  ← 回升
t+30s  food=6   t+75s  food=6   t+135s food=5   t+195s food=6  ← 回升
t+60s  food=6   t+90s  food=6   t+150s food=5   t+270s food=5
burn done: food=5 health=5 startFood=6
```

**终态判定**：300s 运动烧仅由 6→5，且 **t+165s／t+195s 回升至 6**（nutrition 被回补，抵消 burn）——**批文所述「运动烧亦不可达 nutrition 流速」终态条件成立**。
⇒ **W6 转受阻终态**。批文已定：`reason=hunger` 行**已实现**（`ETIMSleepClock.java:124` 批内同步 eject 面，`:127` reason 判定），**构造不成不再追**。

## 8.5 共通面处置落实（批文：勿用 gamemode 绕，改补食）

`bed-ops.js sleep` op 已改：**移除 `gamemode creative`**，改为入床前 **`food===0` 时补食**（`give cooked_beef` ＋ `bot.consume()` 以 `Promise.race` 2.5s 超时防阻塞），使 nutrition>0 启动回血线。W2 复跑实测 `pre-sleep food=6`（补食线已启动）后入床成功。

## 8.6 复跑后终态汇总

| 窗 | 终态 |
|---|---|
| **W1 / W3 / W5 / W8** | **PASS（全判据）** —— 首轮实况见 §二/§三 |
| **W2** | **PASS（复跑全判据）** —— `reason=blood` 字面 + 全窗无 forward/done |
| **W4** | **部分达成**：neg 面（无 forward/done）＋ 不弹床 ＋ 不跳钟 **PASS**；`sleep-skip` 门面未现（门前置未成立，待核） |
| **W6** | **受阻终态**（批文终态条件成立；`reason=hunger` 实现面已在案） |
| **W7** | **结构性登记**（裁决 3；分支已转置，不判 OFFEND） |

**绿：5 窗全判据（W1/W2/W3/W5/W8）＋ W4 neg 面；受阻终态 1 窗（W6）＋ 门面待核 1 窗（W4）＋ 结构性登记 1 窗（W7）。A 级冲突仍为零。**

## 8.7 待裁决（复跑面新增）

1. **W4 `sleep-skip` 门面**：需核 vanilla `WorldServer.tick` 在 `doDaylightCycle=false` 下 `areAllPlayersAsleep()` 的判定路径（是否含 gamerule 条件导致 `:50` 提前返回）。若确认，W4 门面为**结构性不可达**，应转登记面（同 W7 处置）。
2. **W6 已按批文结案**，无待裁。

---

# 九、W4 探针复跑注记（基线 `2faef38` · sleep-probe）

**落码**：`2faef38 sleep-01: sleep-probe judge instrument (1/100-tick link localization, W4 window)`
**jar**：**271,336B @2026-10-17 16:45:11**（`BUILD_EXIT=0`）｜**版本链终行改为 `2faef38`**
**boot stamp**：`20261017_164519`｜前置：gamerule `false` 再设并复核（`doDaylightCycle = false`）；敌怪九型 `r=12` 清（chat 面）；床两 block 在位

## 9.1 探针行为（源码核，判读基准）

`ETIMSleepClock.java:108-140` `probe(WorldServer, boolean allAsleep)`：
- `:109-112` `allAsleep==true` → 复位节流返回
- `:113-116` 节流 100 tick（≈5s）
- `:120-131` 遍历非观者：计 `nonSpectators`／`lying`（`isPlayerSleeping`）／`fullyAsleep`（`isPlayerFullyAsleep`）
- **`:132-135` `lying == 0` → 复位节流并 `return`（不发行）**

## 9.2 探针窗实测

**工步**：入床前按批文前置4 内置清怪（床周七型 `r=10`，chat 面）→ 撤 3s → `pre-sleep food=5 health=5` → `bot.sleep()`。

```
[08:49:00] bed at -66 68 246; calling bot.sleep()
[08:49:03] bed neighbourhood cleared; waiting 3s clearance window
[08:49:06] pre-sleep food=5 health=5
[08:49:07] t+1s  isSleeping=false  pos=-63.5,68.0,248.5
[08:49:12] t+6s  isSleeping=false
[08:49:17] t+11s isSleeping=false
[08:49:22] t+16s isSleeping=false

[SleepLog] → 全窗 0 行（无 sleep-probe、无 sleep-skip、无 blocked）
```

## 9.3 探针判读表落位

| 判读项 | 条件 | 实测 | 落位 |
|---|---|---|---|
| a | `lying==总数 && fullyAsleep==总数` 仍 `allAsleep=false` | 不适用 | — |
| b | `fullyAsleep==0` 恒定（`lying>0`） | **不适用**（`lying==0`） | — |
| c | `lying<躺卧预期` | **不适用**（无任何玩家躺卧） | — |
| **d** | 探针全零行 && `bot.isSleeping=true` 持续 | **不适用** —— bot `isSleeping=false` | **落位外** |

**判读结论**：probe 0 行 **不是** d 类（d 类要求 bot 保持 sleeping）；而是 `:132 lying==0 → return` 的**前置换条件不成立**——**没有玩家躺下**，全睡机根本未立。故 probe 无法进入「链段定位」用途，属**上游阻塞**。

## 9.4 上游阻塞根因（本轮新查证）

**(1) 排除「gamerule 禁止入床」假设**（批文假设面与会话七前次假设均不成立）：
- `GameRules.java:22` **只注册 `doDaylightCycle`**，1.12 **无 `allowSleeping` gamerule**
- `WorldInfo` **无 `isAllowSleeping()`**；`EntityPlayerMP` **无 `canSleepThroughNests`**（grep 零命中）
⇒ **`doDaylightCycle=false` 本身不阻止入床**，W4 的阻塞与该 gamerule 无直接因果。

**(2) 真正阻塞面 = vanilla `BED_IS_OCCUPIED`（床被占据）**：
- W4 探针窗表钟冻结在 **8016（永昼/日间）** → 1.12 **僵尸白天主动占床**
- 内置清怪后**撤 3s 窗口内僵尸回床** → `trySleepInBed` 走 `BED_IS_OCCUPIED` 早退 → `isPlayerSleeping()` 恒 false
- **全窗对照高度自洽**：W1/W3/W8（夜间入床）✅、W2 复跑（`adjusted=21968` 夜窗）✅、W2 首轮/W4 首轮/W4 探针窗（**日间入床**）❌ —— **成败严格随「躺床时是否日间」翻转**

**(3) 与批文修正是同族**：批文指出「NOT_SAFE（8×5×8 敌怪邻域，vanilla trySleep :1697-1701）」并要求清怪撤 3s；本轮实测表明**清怪不足以破局**——需同时破 **`BED_IS_OCCUPIED`（睡床上的僵尸本体）**，而白昼下 3s 窗口足够僵尸回床。

## 9.5 W4 门面判级与批注点

**判级：环境阻塞（非结构不可达）** —— 依据 §9.4(1) 已证 gamerule 无因果，故 W4 **不转 W7 式结构性登记**；但在本轮前置下**不可达**，需换环境前置重跑。

**回批注面（待主会话裁决的批注点）** —— 三条候选环境面，任选其一即可解除阻塞：
1. **`/gamerule doMobSpawning=false`**：断敌怪生成 → 清一次后床永空（W4 判据不涉 mobs，环境面中立）
2. **床位移至高处平台**（如 `y=100`）：僵尸不可达，床永空
3. **把冻结表钟设到夜间区间后再入床**（`/time set` 于复跑窗前置一次性设定，避开「永昼→日躺/占床」面；注意此为 W4 窗前置一次性动作，与「全切片禁 /time set」纪律的冲突需裁决）

**另注（永昼日躺面）**：若全睡机在上述任一面下立起，按批文预期**先见 `dayLiar` blocked 行**（gate-1 `MixinWorldServer.java:54` 先于 gate-3 `:65`），而 `sleep-skip` 行只在 `dayLiar` 不成立时才可达 —— 即 **W4 门面可能仍被永昼的 DAY_LIERS 遮蔽**。此点需在解除阻塞后一并核。

---

# 十、W4-v2 终裁复跑 —— **门面 PASS，全窗全判据达成**

**落码**：`2faef38`（HEAD）｜jar **271,336B @2026-10-17 16:45:11**｜**版本链终行 `2faef38`**
**boot stamp**：`20261017_165313`

## 10.1 三前置落实（组合式）

| 前置 | 落实 | 复核读数 |
|---|---|---|
| gamerule `doDaylightCycle=false`（再设，C 级坑） | 设后复核 | **`doDaylightCycle = false`** |
| 一次 `/time set night`（表钟冻夜回调） | `Set the time to 13000` | 表钟 **13000**（夜面）冻结；总钟 **395391 未动** → Δ raw 分裂（特批） |
| `doMobSpawning=false` ＋ chat 面清 `r=12` 撤 3s | 内置于 `sleep` op（床周七型 `r=10` ＋ 3s 撤窗） | **`doMobSpawning = false`** |

## 10.2 判据行原文（判读核心）

```
[SleepLog] sleep-probe allAsleep=false lying=1/1 fullyAsleep=0 doDaylightCycle=false
[SleepLog] sleep-skip n/a doDaylightCycle=false
```

**bot 面**：`sleep() returned; isSleeping=true` 持续 ≥11s（`pos=-65.5,68.6,247.9` 未弹床）；`pre-sleep food=5 health=5`（补食线已启动）。

## 10.3 逐判据核讫

| 判据 | 实测 | 判定 |
|---|---|---|
| `sleep-skip n/a doDaylightCycle=false`（去重一笔） | **1 行** | **PASS** |
| 全窗无 `sleep-forward` | **0 行** | **PASS** |
| 全窗无 `sleep-done` | **0 行** | **PASS** |
| 全窗无 `sleep-mobwake` | **0 行** | **PASS** |
| 全窗无 `reason=blood` | **0 行** | **PASS** |
| 不弹床 | `isSleeping=true` 持续 | **PASS** |
| 表钟不跳 | 表钟恒 **13000**；总钟 395391→396419（照走） | **PASS** |
| `sleep-probe` 行全部不出现 | **1 行**（见下注） | **非判据（仪器面）** |

**判读分支落位**：批文列四分支，本窗命中**首分支（`sleep-skip` 行现 → W4 门面 PASS）**。
另**未**命中「仍见 `dayLiar`」分支（`reason=dayLiar` = 0 行）——**证明 `/time set night` 确实把天空冻成夜面，DAY_LIERS 面全闭**，与裁决预期一致。

## 10.4 `sleep-probe` 1 行的时序自洽（仪器面，非阻断）

```
[~5s 内] sleep-probe allAsleep=false lying=1/1 fullyAsleep=0   ← sleepTimer<100 累积期
[~5s 后] sleep-skip n/a doDaylightCycle=false                  ← sleepTimer>=100 → areAllPlayersAsleep=true → :65 命中
```

- probe 参数 `allAsleep` 即 `MixinWorldServer.java:50` 的 `self.areAllPlayersAsleep()` 返回值；
- 累积期该值为 false → probe 依 `:108-116` 发行，**成功定位「sleepTimer 链段」**（`lying=1/1` 全躺 / `fullyAsleep=0` 未达阈值）；
- 达阈值后 `allAsleep=true` → probe `:109-112` 复位返回，转由 `:65` gate-3 出行。

⇒ **probe 的设计用途（链段定位）在 W4-v2 兑现**，且其 1 行是**预期行为**（批文「probe 只在 `!allAsleep` 时出」），非判据违背。**非 d 类**（bot 保持 sleeping 至窗末）。

## 10.5 `/time set` 分裂面（特批残留，判读器注记）

本窗一次 `/time set night` 令 Δ raw 分裂（`dayTime:=13000` 冻结，`total` 395391 不动 ⇒ `(T-D)%24000` 不再为 0）。
**登记（不设专项窗，遵批文）**：W4-v2 断言面（neg 面／`sleep-skip`／不弹床／不跳）**无一读 Δ**；绝对对齐出口自愈——此后任一 W1 型 `sleep-forward` 出口（`D:=T%24000`，`ETIMSleepClock.java:146`）即把 Δ 重新归一。

## 10.6 sleep-01 全案终态

| 窗 | 终态 |
|---|---|
| **W1** | **PASS（全判据）** —— Δ=0 直证 ＋ 3 条断言逐位吻合 |
| **W2** | **PASS（全判据）** —— `reason=blood adjusted=21968 day=16` ＋ 无 forward/done |
| **W3** | **PASS（全判据）** —— neg 面全零 ＋ 被弹床 ＋ 表钟自然推进 |
| **W4** | **PASS（全判据）** —— `sleep-skip` 门面达成（本节）＋ neg 面 ＋ 不弹床 ＋ 不跳 ＋ probe 仪器面兑现 |
| **W5** | **PASS（全判据）** —— `reason=hungerDeny` ＋ 跨通道 `[FoodLog] tooHungry` |
| **W6** | **受阻终态**（批文结案：`reason=hunger` 实现面已在案，运动烧不可达 nutrition 流速） |
| **W7** | **结构性登记**（批文结案：分支已转置 `:128-133`，不判 OFFEND） |
| **W8** | **PASS（全判据）** —— 双晚 Δ=0 ＋ 入口=首晚出口+自然推进 |

**结论：6 窗全判据 PASS（W1/W2/W3/W4/W5/W8）＋ W6 受阻终态 ＋ W7 结构性登记 ＋ A 级冲突为零。**

---

**判读签署（终）**：会话七 ｜ 基线 **`2faef38`** ｜ jar 271,336B @2026-10-17 16:45:11 ｜ 判读窗 boot stamp `20261016_110556`(W1/W8) / `20261017_155017`(W3) / `20261017_155823`(W2 首轮) / `20261017_160242`(W4 首轮) / `20261017_161145`(W2 复跑) / `20261017_162524`(W4 复跑) / `20261017_164519`(W4 探针窗) / `20261017_165313`(W4-v2 终裁) ｜ **W1/W2/W3/W4/W5/W8 六窗全判据 PASS；W6 受阻终态；W7 结构性登记；A 级冲突为零；sleep-01 全案待关账**
