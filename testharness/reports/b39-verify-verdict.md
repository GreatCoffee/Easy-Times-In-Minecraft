# R196 僵尸 is_smart 面（1/8 出生掷＋拳伤升级＋NBT 往返＋dig 消费）**W-B39 判窗**（HEAD `7bc02e5`）— **W0–W4 全 PASS**

> **结论先行**：b39-build3 双 boot 判窗全绿——revenant 确定性回声 `is_smart:1b`；6 轮素僵尸回声全部携带 `is_smart` 键（写面成立）；玩家拳击后同一僵尸 `0b → 1b` 翻转（R196 :100）；隔墙视线锁定的 smart 僵尸推进 dig 链，`[SleepLog] bed-dig … x,y,z=-61,67,239` 落 **2** 行；旗断 boot 双零。**`bad=0`，EXIT=0。**
> **HEAD**：`7bc02e5a0461ca3a4d36b0a73a686b2c2fdec103`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-13T06:34:14Z` 早于窗起 `08:20:26Z`。
> **jar**：1,162,465 B `CB45F788E88E18FD1860FD86F9D0359E880389D840DCC375078768681C3DD859`（b39-build3，起收同）；dev 1,140,420 B `1813E75B5ADFAA8AEFCCAD8F61917D0E033050CB314BD728CA730F7AF68AF74E`；sources 1,065,737 B `9C97E6D4488A97B614DDB6E7CC17D646FB3DB839F80889836EA72352FD7C97EF`。
> **MK**：refmap **101/239/478**（dual 478，双份同）、mixins **99+10**、`ok=true`（起收同；诊断行体未进 refmap，与任务书预期一致）。
> **驱动**：`testharness/player/f11-b39-verify.js`（344 行，`node --check` 绿；`L25 TAG='w-b39v'`、`L26 WORLD='w-b39v'`、`L28 RUN='v1'`、`L29 EXPECTED_SHA=CB45F788…3DD859`）。
> **窗口**：boot1 `Done (5.453s)`（b1:2349，16:20:40）/ boot2 `Done (5.359s)`（b2:2351，16:24:30），mixinFail 0×2；双停服 `{exitCode:0,exited:true,build:true}`；`BUILD SUCCESSFUL in 3m 49s`（b1:6188）/ `1m 19s`（b2:3954）；PIN 起 `08:20:26.130Z`（stdout:1）→ 收 `08:25:35.820Z`（stdout:1103），总窗约 **5m 10s**，**EXIT=0**。
> **判决**：W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜b1 旗断 PASS｜W4 PASS｜props PASS。
> **报告字节规格**：`8133 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，78 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 `{0,true,true}`×2 | b1:2349 `Done (5.453s)` / b2:2351 `Done (5.359s)`；mixinFail 0×2；双停服同形 | PASS |
| **W1** a1 掷与 NBT 写面 | revenant 回声含 `is_smart:1b` ∧ 素僵尸回声含 `is_smart` 键 ≥4 | revenant：`b1:5538` **`is_smart:1b`**；素僵尸：**6** 条回声全带键（`b1:5866/5882/5898/5913/5929/5944`，值全 `0b`） | PASS |
| **W2** a2 拳伤升级 | 0b 素僵尸经玩家拳击后回声 `0b → 1b` | 候选 `b1:5963` `is_smart:0b` → `b1:5967-5968` `[DamageLog] dmg target=Zombie#2633 src=player raw=1.000 … final=1.000`（两轮）→ `b1:5975` **`is_smart:1b`** | PASS |
| **W3** a3 dig 消费面 | `[SleepLog] bed-dig … x,y,z=-61,67,239` ≥1 | **2** 行：`b1:6142`（`progress=0 tick=3968`）、`b1:6151`（`progress=0 tick=4178`） | PASS |
| **b1** 旗断面 | boot2 零 `is_smart` 键 ∧ 零 bed-dig | b2 `is_smart:` **0** 条、`bed-dig` **0** 条（revenant 与素僵尸的 entitydata 回声均在册，`b2:3590`/`b2:3893`，无该键） | PASS |
| **W4** 钉值面 | 双 PIN 同 `CB45F788…3DD859` ∧ mk.ok（101/239/478、99+10） | `08:20:26.130Z` / `08:25:35.820Z` 同 sha；MK 101/239/478、99+10、`ok=true` | PASS |
| **props** | norm start==end ∧ raw start==end ∧ level 还原 | norm `5DC243A8…25B7C9` 起收同；raw `F7D0F73B…8212C9` 起收同；`w-b30v`→`w-b30v` | PASS |
| **cfg** | 49,380 B `BAE7A8DF…` 起收同 | 同值 | PASS |

`[done]`：`{"a1revSmart":1,"a1keys":6,"a1smart":0,"a2flip":1,"a3bed":2,"a3orGate":0,"b1keys":0,"b1bed":0,"stop":[[0,true],[0,true]],"w0":true,"w1":true,"w2":true,"w3":true,"b1":true,"w4":true,"propsOk":true,"propsNorm":"5DC243A8…/同","propsRaw":"F7D0F73B…/同","propsLevel":"w-b30v->w-b30v","bad":0}`

## §2 判行锚（b1.out / b2.out 行号）

**W1 a1（revenant 确定性）**
- `b1:5533` `### [harness] > summon etim:revenant -60.5 67 240.5`
- `b1:5538` `[16:21:01] … The data tag did not change: {…}` → 体内含 **`is_smart:1b`**（R196 :35 短路）

**W1 a1（素僵尸写面，6 轮）**
- `b1:5858 / 5875 / 5890 / 5905 / 5921 / 5936` `### [harness] > summon zombie -60.5 67 240.5`（无 NBT）
- 对应回声：`b1:5866`（`is_smart:0b`）、`b1:5882`（`0b`）、`b1:5898`（`0b`）、`b1:5913`（`0b`）、`b1:5929`（`0b`）、`b1:5944`（`0b`）

**W2 a2（拳伤升级）**
- `b1:5956` `### [harness] > summon zombie -60.5 67 240.5`（第 7 只，用于选 0b 候选）
- `b1:5963` 回声 `is_smart:0b`
- `b1:5967` `[DamageLog] prot target=Zombie#2633 src=player … total=0.000`
- `b1:5968` `[DamageLog] dmg target=Zombie#2633 src=player raw=1.000 armorIn=1.000 armorOut=1.000 absorption=0.000 final=1.000`
- `b1:5975` `[16:21:46] … The data tag did not change: {HurtByTimestamp:84, … is_smart:1b …}` ⇒ **翻转成立**

**W3 a3（dig 消费面）**
- `b1:6142` `[16:23:59] [Easy Times In Minecraft]: [SleepLog] bed-dig mob=EntityZombie x,y,z=-61,67,239 progress=0 tick=3968`
- `b1:6151` `[16:24:09] [Easy Times In Minecraft]: [SleepLog] bed-dig mob=EntityZombie x,y,z=-61,67,239 progress=0 tick=4178`
- 伴证：`grep 'bed-dig'` 全臂仅此 2 行；`a3orGate=0`（未借 breakdoor 面）

**b1 旗断（b2）**
- `b2:3586` `### [harness] > summon etim:revenant -60.5 67 240.5` → `b2:3590` 回声**无** `is_smart` 键
- `b2:3886` `### [harness] > summon zombie -60.5 67 240.5` → `b2:3893` 回声**无** `is_smart` 键
- 口袋 15 s 窗口 `bed-dig` **0** 行

## §3 登记项

- **C-B39-1（产物命名，沿用 C-B38-2）**：驱动 `L25 const TAG = 'w-b39v'`（＝世界名），boot 日志实际落 `build-logs/w-b39v-b1.out` / `w-b39v-b2.out`；已复制为 `f11-b39-verify-v1-b1.out` / `-v1-b2.out` 留档，原文件保留。驱动不写 JSON，`f11-b39-verify-v1.json` 由本会话从 stdout `[done]` 载荷转写。
- **C-B39-2（props 基线跨批漂移）**：本窗 norm `5DC243A84EF7C967428136A12EEF39764A413AD9605FBDAE905997C8FF25B7C9`、raw `F7D0F73BC4700879455CB1C8AE82147E4E08C9955EDBBBE33311AE1C018212C9`，与 B-38 的 `FA0B6FAB…` / `35EBC027…` 不同；本批判据只要求**起收同**（已满足），绝对值不跨批比对，登记备查。
- **C-B39-3（开工自查偏差）**：任务书要求 `run/w-b39a` 与 `run/w-b39v` 均不存在；实测 `w-b39v` 不存在（符合），但 **`run/w-b39a` 存在**（烟测 r1–r23 遗留世界）。判窗用 `w-b39v`，不受影响；按"判窗世界一律保留、删世界等口令"，本窗未删。
- **观察·a1smart=0**：本窗 6 轮素僵尸无一掷中（1/8 独立，P(0)≈0.39），属方差内；判据只记统计，不影响 W1（写面按"键存在"判）。
- **观察·a3bed=2**：`progress=0` 两行均为挖掘起点，间隔 10 s 且 tick 递增（3968 → 4178）；`a3orGate=0` 说明走的是 bed-dig 面而非 breakdoor 面。
- **停服面**：2 次 `exitCode=0 exited=true build=true`（数组形 `[[0,true],[0,true]]`）。
- **异常面**：stdout 无 `[fatal]`；产品码、判据面、`f7-wb-lib.js`（PIN/MK_PIN）、mixin 配置均未动。
- **世界面**：`run/w-b39v` 保留（28 文件 / 3,620,347 B）；w-b* 共 **54** 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash **24→24**、HEAD `7bc02e5` 窗内 0 提交。

## §4 收口清单

- jar 起收同 1,162,465 B `CB45F788…3DD859`（0 rebuild，mtime 早于窗起）；dev/sources 未动。
- cfg `BAE7A8DF…` 49,380 B 起收同；props norm/raw 起收同、`level-name=w-b30v` 已还原。
- MK 起收同 101/239/478、99+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b39v` 保留；`run/w-b39a` 及既往目录未删（删世界待口令）。
- 证据：`build-logs/f11-b39-verify-v1-{b1,b2}.out`、`-v1.json`、`-v1-stdout.out`；驱动原始 `w-b39v-b1.out` / `w-b39v-b2.out` 保留。

## 文尾

- 报告字节：`8133 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，78 行`。
- 三 SHA：jar `CB45F788E88E18FD1860FD86F9D0359E880389D840DCC375078768681C3DD859`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `5DC243A84EF7C967428136A12EEF39764A413AD9605FBDAE905997C8FF25B7C9`。
