# 阶段五批四 · spawn cycle 拒载/transition 判读 · 逐位核讫报告

> 会话七（ses_ed0d8f3a0ffe9ycLrzD7z1T0UN）· 判据唯一依据：`run\logs\latest.log` 的 `[SpawnLog]` 行文案与 join/leave 行（肉眼/UI 不进判据）。
> boot = 21:17:08（runServer Done 行，commit d5f127a 部署位；ce6da57 在 21:34 提交但在本 boot 后——见冲突分级 ①）。
> 判读器：`testharness\spawn-cycle-judge.js`（可复跑定谳）；raw 打包：`testharness\reports\spawn-transition-raw.log`（19 行，[SpawnLog]+[HarnMark]）。
> 判读时点：2026-10-13 21:58:40（T1 窗口 21:17:08~21:57:08 已自然闭合）。

## 一、判决类清单

| 类 | 行文案（字面锚） | 判读用途 |
|---|---|---|
| modifier transition | `[SpawnLog] modifier mod=<f> d=<n> i=<n> n=<n>` | T1 计数行（仅此格式）；T2 残值 d/i/n 来源 |
| cap-block | `[SpawnLog] cap-block type=<TYPE> count=<c> limit=<l>` | T3 trySpawning 触发面行；类型桶分析 |
| accept / reject-* | `[SpawnLog] accept <cls> at …` / `reject colliding …` 等 | T3 触发面行（本窗口 0 行——见观测项） |
| 在线边界 | `… joined the game` / `… left the game` / `lost connection:` | 冻结面起始时刻的独立证据（HOLD end 仅 graceful 退出具备） |

## 二、逐测项核讫表

### T1 · modifier transition 密度

| 项 | 内容 |
|---|---|
| 判据 | 冷启动 40min 窗口内 `modifier mod=` 行总数 ≤9；>9 = fail |
| 窗口 | [21:17:08, 21:57:08]（boot+40min，已闭合） |
| 实测 | **0 行**（全 log grep `\[SpawnLog\] modifier mod=` = 0） |
| 判定 | **PASS（数值）**——0 ≤ 9；**附 C 级延保注**：0 行触发 server-monitor.md 待收 1 的 Poisson 下界分支（见冲突分级 ②），建议主会话定性后重开更长窗口，会话七不自判 |
| 原始行 | 无行可抄 0 行 |

### T2 · 冻结面

| 项 | 内容 |
|---|---|
| 判据 | 假玩家摘除 ≥5min 段内 modifier 行数须为 0；摘除前后 d/i/n 残值差 ≤ 摘除时窗 tick 数上界 |
| 摘除证据链 | joined 21:39:17 → lost connection: `IOException: 远程主机强迫关闭了一个现有的连接` → **left the game 21:49:16**（观察进程被 harness 工具超时截杀，非 graceful；HOLD end 标记未及发出——判读改用 left 行做冻结起点） |
| 实测（T2a） | 自 21:49:16 起无玩家段全部 [SpawnLog] 行（含 cap-block 等）= **0**；截止判读时点 21:58:40，段长 9m24s ≥ 5min。boot 初段（21:17:08~21:39:17，22min 无玩家）亦为 0 行——双重佐证 |
| 判定（T2a） | **PASS** |
| 实测（T2b） | **无下一 boot 的首条 modifier 行可取 d/i/n 起点**——本 boot 内摘除后至判读时点全 0 行，d/i/n 残值面无值可对 |
| 判定（T2b） | **C 级转回主会话**：残值差子项需要主会话在下一 boot 后 5min 内有在线段产出 ≥1 条 modifier 行方可对位（restart/起 boot 权属主会话；会话七不自判） |

### T3 · spawn spectrum

| 项 | 内容 |
|---|---|
| 判据 | 假玩家在线且 mod=1.0 帧内，trySpawning 触发行每 4000 tick（200s）≥1；连续 12000 tick（10min）零尝试 = fail |
| 在线段 | [21:39:17, 21:49:16]，时长 599s（21:49:16 起进入 T2 冻结段截断判定） |
| mod=1.0 帧 | 全在线段无任何 modifier 行 → mod 隐式 =1.0（implicit；任务书只要求「处于 1.0 的帧」） |
| 200s 桶 | 桶1 9 行 / 桶2 3 行 / 桶3 6 行（每桶密集满足 ≥1），三桶全部挂实 |
| 连续空段 | 0s（判据：0 = PASS） |
| 判定 | **PASS** |
| 原始行直抄 | 18 行全族 `cap-block type=WATER_CREATURE count=5/6/7/8 limit=5`（首行 21:39:28 `count=5 limit=5`；末行 21:49:08 `count=6 limit=5`）——type 与 count/limit 全带在行内，raw.log 可查 |

## 三、冲突分级

**阻断级：无**

**C 级（转回主会话定谳）**
1. **T1 的 0 行定性**：0 行在任务书判据字面（≤9）内为 PASS，但 server-monitor.md 待收 1 口径「0 行则按 Poisson 均值 24000 tick/计数器算下界后重开更长窗口」未定谳。两读：λ=2（三计数器合计）→ P(0)≈13.5%（不极端）；λ=6（每计数器独立）→ P(0)≈0.25%（极端嫌疑）。建议主会话：a) 复核 transition-only emit 条件是否把全部事件边界吃掉（d/i/n 恒 0 时事件实际从未发生 vs 发生了未打行），b) 拉开 80min 复测窗。本会话可随时续跑观察哨。
2. **T2b 残值差子项**：须下一 boot 早期的在线段产出 ≥1 条 modifier 行方可取对位点，转回。
3. ** ce6da57 部署位**：ce6da57 21:34 提交 > 本 boot 21:17:08——本 boot 的 classpath 含 ce6da57 与否（dev runServer 走 gradle classpath 的 build 时刻在 21:16 d5f127a 之后 21:34 之前？）未经证。moonStateOverride validate 拒载链的判据不在本批测项内，故不影响 T1/T2a/T3 判定；但若主会话意图本 boot 覆盖 ce6da57，须下次 boot 前确认 build 时序。
4. **[AILog] 亦全程出现 mob despawn pass-state 行**（无玩家冻结同语义链的组件），非本判据类，仅作背景不计数。

**观察项（不判 PASS/FAIL）**
- 18/18 行全部 `cap-block type=WATER_CREATURE`，hostile 双环（under60/surface）与 peaceful 环零行、`accept`/`reject` 族零行。字面判据（触发面行 ≥1/4000tick）已达成；但「hostile 尝试从未见」与温驯 `%400` 窗口的组合属行为面推论，建议批四收尾的 `trySpawningHostileMobs` 双环深度对照（server-monitor 下一步开发序列 2）一并定。
- 观察进程死于 harness 工具 600s 背景超时截杀（非 game 侧异常）：`--hold` 参数超过 600s 须 `timeout 0` 启动，已记入 player/README 待更新项。

## 四、伪代码/调参建议（供主会话走开发纪律；本会话未动 src/main）

无生产代码面改动建议。唯一调参方向（若主会话选 a 路线复核 T1 0 行）：
```java
// ETIMSpawnCycle :148 附近——若需 0 行可观察性（仅判定辅助，非判据扩展）：
// 在每计数器第 N 次 tick 归零完成时打一行一次性的 "modifier settle" 行，
// 或在 24000 tick 抽奖循环到点而未发生事件时打 "modifier idle window" 行。
// 两者均属 extra 观察面，须走 ETIMConfig 双语注释 + 一键反测开关，不可混入判据类清单。
```

---
*判读器：`testharness\spawn-cycle-judge.js`（复跑命令见 player/README）· raw：`reports/spawn-transition-raw.log` · 判读会话七 2026-10-13 21:58*
