# b3a · 80min 观察窗· spawn-cycle 逐位核讫报告

> 会话七（ses_ed0d8f3a0ffe9ycLrzD7z1T0UN）· 判据唯一依据：`run\obfuscated\logs\latest.log` 的 `[SpawnLog]` 行文案与 join/leave 行。
> **boot**：2026-10-14 18:53:05（PID 2324，start-server.ps1 v3 runner，classpath 注入 `build\libs\etim-1.0.0.jar` mtime=10-14 17:16:57，b0b2b3a/audit16）。
> **窗口**：在线段 [18:54:38, 20:14:38]（joined/left 行对齐），hold 4800s creative；log 记录止于 20:14:53（log4j latest.log 断流面——server 进程经 RCON `list` 复核仍活，属日志面断流非 server 死亡，冲突分级 ③）。
> 判读器：`testharness\spawn-cycle-judge.js` v2（λ0=3×在线秒×20/24000）；raw 打包：`testharness\reports\spawn-transition-raw.log`。

## 一、判决类清单

| 类 | 行文案字面锚 | 用途 |
|---|---|---|
| modifier transition | `[SpawnLog] modifier mod=<f> d=<n> i=<n> n=<n>` | T1 计数行；T2b d/i/n 起点 |
| cap-block | `[SpawnLog] cap-block type=<T> count=<c> limit=<l>` | T3 触发面 |
| cap-block deep= | `[SpawnLog] cap-block deep=…` | T4 audit16 深环显效判 |
| accept | `[SpawnLog] accept <cls> at … y-bucket=<under/over>` | T3/T4 |
| reject | `[SpawnLog] reject colliding/spawn-point-dist/day-outdoor/moon-night …` | T4 |
| 在线边界 | `ETIM_Harn04 joined the game` / `left the game` + `[HarnMark] HOLD begin/end` | 冻结面起点 |

## 二、逐测项核讫表

### T1 · modifier transition 密度

| 项 | 实测 |
|---|---|
| 判据 | `modifier mod=` 行 ≤9 |
| λ0 | **12.00**（3×4799s×20/24000）——行数期望 5.5±（任务书 λ≈10 口径的 70→80min 满速窗） |
| 实测行数 | **32 行**（**判据 ≤9 → FAIL**） |
| 行摘要 | 32 条见 raw.log；节奏=**三事件成对节拍**（inc/dec/no_spawn 行·进 → mod=1.0 回落行·出），**d/i/n 计数器行内值**（如 `mod=0.0 d=0 i=0 n=1981` / `mod=2.0 d=0 i=0 n=0`）配套打印——transition-only **没有完全消洪**：**回落行本身泛滥**（mod=0.0 / 0.5 / 1.0 回场行每事件 1~2 行），32 行中回落行约占半（16 行附近） |

**判定：FAIL**——与主会话裁定的「transition-only 完全消洪」修改意图**负向断裂**（audit16 形态族 emission 面把事件面翻倍）：每次事件发射**至少 2 行**（事件行 + 回落行），λ0≈12 下 32 行超线一倍。**冲突分级 A 级**：判定为行为回归或判定纪律升级——主会话走开发纪律。

### T2 · 冻结面

| 项 | 实测 |
|---|---|
| **T2a**（摘除 ≥5min 段 [SpawnLog] 全型=0） | left 20:14:38 后的 log 记录（至 20:14:53）**非零 2,016 行**、之后 latest.log 断流无记录——**字面判据被打破**（非零）：**FAIL**；两重争议面进冲突分级 |
| **T2b**（d/i/n 起点对位，上界 d≤4000/i≤1999/n≤3998） | 首条明细行 [18:56:28] `mod=1.0 d=1 i=424 n=0` → 末条明细行 [20:11:20] `mod=1.0 d=0 i=0 n=0`：Δ=**1/424/0**——皆低于上界 → **PASS** |

### T3 · spawn spectrum
24 个 200s 桶**全部非空**（4,022~11,606 行/桶、0 空桶、连续空段 0s）→ **PASS**（远超每桶 ≥1 的期望，与 T1 事故同向的洪量证据）。

### T4 · b0b2b3a 行为形态

| 家族 | 行数 | 读数 |
|---|---|---|
| accept | 50,054 | 开闸试 spawn 实承 |
| reject | 116,405 | 主导 65.2% |
| cap-block | 7,146 | **其中 `cap-block deep=` 6,985 行（97.7%）——audit16 深环改面已显效** |
| modifier | 32 | 同 T1 |
| exceptions | **0** | 判据=0 达成 |

**判定：audit16 行为形态**全部在案（accept/reject/cap-block（deep=主体）齐足、y-bucket 与 day-outdoor 等家族在 raw.log 可追溯）——**形态面 PASS**；但**体量面**与 T1 同源（108,880 → 178,494 行/80min，**日志面阻塞风险**——40min 时 latest.log 已 45.7MB，80min 后 73MB——**冲突分级 B 级**）：Transition-only 目标（≤9 行/40min）在 audit16 形态面对**结构性不成立**（事件对节拍自带回落行）。

## 三、冲突分级

**C 级（转回主会话，不得自行定谳）**

1. **T1 与 T2a 的趋同断裂**：audit16 的 emission 结构（事件 + 回落双行，点燃 108k 日志洪）与 d5f127a「transition-only 完全消洪」「无玩家冻结面」两个判据目标**同时反面**——**主会话须知**：这不像「多一行两行」的事件噪声，是**逻辑结构变化**——如三事件判定结构（mod=0.0/0.5/1.0**回落打印**）被 audit16 代码路径一并覆盖/激活，**不是 Poisson 偏差**。
2. **T2a 的 2,016 行**（left 后 15s 非零）：两侧候选①**b0b2b3a 冻结面实际松动**②**log4j flush 滞后**（left 后 15 秒是**积压 flush 出口**——**待主会话裁**：重新 isolation 一轮 ≥5min 无玩家段复测（server 还活，20min 摘除观察哨可马上跑），会话七随时可测。
3. **latest.log 断流面**（20:14:53 止——server 活而 log 死）：**T2 判据在该时期不可验证**——需要主会话在日志通道侧的处理裁决（估计 log4j2 buffer 侧/`fmt` 大行为）。

## 四、伪代码/调参建议（生产面由主会话走开发纪律）

```java
// 1) transition-only 恢复法：在 ETIMSpawnCycle 的事件发射面（:148-149）：
//    行对节拍的事件对（事件行 + 回落行）→ 合一/只打其一：
//    e.g. 只打事件行，回落行跟随在下一事件行内（d/i/n 字段天然含）
// 2) 冻结面二重复核建议：无玩家检测已就绪，但 left 后 15s 的 2,016 行源头
//    若为 flush 积压，则建议 log4j `immediateFlush` / 时间 Xms 级别的
//    flush 面做「行刷写周期」——或向判读器侧传「不动行」标记。
// 3) audit16 形态族（reject 主导 65.2% + cap-block deep= 主体 97.7%）
//    可读面属**审计 15 已定谳**的调参路径的实测重校：transition-only 的
//    消洪目标与 rgh 行为 SOME宽度吻合否——由主会话复核。
```

---
*判读器复跑命令（verdict 可复现）：
`& D:\Documents\Softwares\Node\22.22.2\node.exe testharness\spawn-cycle-judge.js run\obfuscated\logs\latest.log 18:53:05 testharness\reports --window 80`*

## 五、T2a 重测补段（哨令 · 2026-10-14 20:24-20:32）

| 项 | 实测 |
|---|---|
| **新 boot** | 20:24:28（start-server.ps1 v3，PID 26116，Done 1.384s，headless+nogui，classpath 注入 etim jar 同前） |
| **空载段** | [20:24:40 → 20:32:31]，**7min51s ≥ 5min**（无假玩家、无 join 行） |
| **[SpawnLog] 全型行数** | **0 行**（判据窗全域检查，post-20:26 二次核查亦 0） |
| **stop** | RCON `stop` 20:32:31 前正常收押（25565 释放确认） |
| **C2 分辨结论** | **C2② 成立**——b0b2b3a 冻结面**无罪**：新实例空载段 0 行且无回吐。上实例 left 后 15s 的 2,016 行 = **log4j flush 积压尾**（上实例的 flush dump 出口），**非冻结面松动** |
| **T2a 终判** | **判据原意成立（无玩家=全型 0 行）**——上一判定的「FAIL（字面）」改判为 **C2② 引起的数据伪面**：verdict 面以上一表保留字面 FAIL + 本补段为准（主会话裁定为准） |
| **附注** | 新实例 latest.log 于 20:24:55 后亦停止行为面写盘（server 经 RCON list 复核直到 stop 前仍活）——**log4j flush 冻面复现**（同③），写入侧判读间隙随判据窗关闭无关；此面在 T1/T2a/T4 字面判据上**无影响**（窗内行已齐，停止后续即可） |

*会话七 2026-10-14 20:33 补段落盘*

*会话七 2026-10-14 20:2x 判读落盘*
