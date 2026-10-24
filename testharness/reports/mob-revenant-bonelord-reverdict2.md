# 阶段五 mob 批二轮重验（仅 W7-R · C-1 v2）判决回执

> **执行方**：会话七（验证窗执行）
> **追验对象**：jar **625,928 B @ 2026-10-25 00:21:56**｜SHA256 **92271D3D09503A3413270D2C762FB7F1BC416CAAFEA2EE733EDE5F6E5B77C248**＝产品 commit **`1216f59`**（`mob batch: C-1 v2 frenzy log dedup (… 40-tick suppression window + target-change bypass) + harness start-server.ps1 cp fix`）。
> **上轮钉值作废**：**625,906 B｜BB00ACFA…｜`c553002`**（`mob-revenant-bonelord-reverdict.md`，14,445 B）。
> **判据正本**：二轮任务书（W7-R-a/b/c）＋ 上轮回执；A-MOB-1 已闭、B-MOB-2 通道已验，W1–W6/W8–W10 + W4-R/W5-R **本轮未动**。
> **现役钉值**：HEAD = origin/master = **`1216f59`**｜窗内 **0 rebuild**（起服前 / 收口 jar 字节·SHA·mtime 全同）。
> **判据源**：服务端 `run/w5r/logs/latest.log` 的 `[AILog] frenzy set` 行（`mobDebugLog`）＋ RCON `entitydata` / `gamemode` / `tp` ＋ 假人（mineflayer）作业面。
> **窗内人员**：无（用户客户端本轮未起；专服独占）。
> **口径**：通过 ✓、不通过 ✗；**判点 ✗ = 1**（W7-R）。UTF-8 无 BOM、LF、0 U+FFFD。
> **报告字节规格**：`12,849 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 16 / ✗ 15｜177 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 625,928 B | 625,928 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-25 00:21:56 | 2026-10-25 00:21:56（收口复核同值） | ✓ |
| SHA256 | `92271D3D…5B77C248` | `92271D3D09503A3413270D2C762FB7F1BC416CAAFEA2EE733EDE5F6E5B77C248` | ✓ 逐位 |
| 产品 commit | `1216f59` | `1216f59`（= HEAD = origin/master） | ✓ |
| 窗内 rebuild | 禁止 | 起服前 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 载入面 | classpath 单面 | `classpath append: build\libs\etim-1.0.0.jar (mtime=10/25/2026 00:21:56)`；mods 面无 etim | ✓ |
| DuplicateMods（C-2 修验证） | 0 | 起服 `DuplicateModsFoundException` = **0**；`Mixin apply failed|Exception in server tick` = **0** | ✓ |
| 世界 | testw2h 副本 | `run/w5r/testw2h`（承上轮 C-3） | ✓ |
| 端口 | 25565 / 25575 | 起服后 LISTEN；收口后 **0 / 0** | ✓ |

### 0.1 起停服台账

| 轮 | 时刻 | 事件 | 备注 |
|---|---|---|---|
| R0 | 00:24:01 | 起服 | 00:24:05 `Done (1.179s)!`；`Starting Minecraft server on *:25565`；**零 dup crash** |
| R1 | 00:24:57–00:26:01 | W7R2 driver（a 双窗 + b/c 尝试 1） | b 未切目标；c 段 lord 走失 → C-2 |
| R2 | 00:27:51–00:29:10 | W7R2b（kill 切目标） | 假人重生点在场地上空、落回场内 → C-3 |
| R3 | 00:30:04–00:31:24 | W7R2c（tp 切目标） | 目标清除后 lord 走失 → 假静默 → C-2 |
| R4 | 00:32:33 | probe2 现场探针 | entitydata + kill：lord 与 6 骷髅**仍在**（C-2 直证；C-5 破坏性回收） |
| R5 | 00:33:23–00:34:33 | W7R2d（creative 切目标，锚不动） | b 面成立；c 面 lord 走失 → 复测 |
| R6 | 00:34:59–00:35:44 | W7R2e 首跑（无效） | lord 召唤坐标拼接错（`-63.5.5`）→ 全 0；**弃用**（C-4），工装修复后重跑 |
| R7 | 00:36:14–00:36:59 | W7R2e 重跑（lord 定时 tp 钉住） | c 面 18 / 24 行 → 判据 ✗ |
| R8 | 00:37:15 | 优雅停服 | `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；端口 0 |

### 0.2 快照与产物

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/w7r2-server-final.log` | 232,738 B | 本窗专服会话全档（00:24:01–00:37:15，含停服锚） |
| `build-logs/w7r2-evidence-rows.txt` | 5,090 B | 判行分组计数 + 抽样原句 + 逐秒直方 |
| `build-logs/w7r2-run.out` | 18,304 B | R1（a 双窗 + b/c 尝试 1） |
| `build-logs/w7r2b-run.out` | 18,648 B | R2（kill 切目标） |
| `build-logs/w7r2c-run.out` | 14,620 B | R3（tp 切目标） |
| `build-logs/w7r2d-run.out` | 14,638 B | R5（creative 切目标：b 面成立） |
| `build-logs/w7r2e-run.out` / `w7r2e-run2.out` | 7,798 / 14,450 B | R6 弃用档 / R7 c 面（lord 钉住） |
| `build-logs/w7r2-probe2.out` | 5,206 B | R4 现场探针（lord + 6 骷髅仍在） |
| `build-logs/w7r2-server-start.out` | 845 B | 起服参数与 classpath 面 |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W7-R-a** | 静默面：固定目标双窗 10 s → 0 行/窗 | **✗ FAIL** | **7 窗**实测 **21 / 18 / 21 / 18 / 18 / 24 / 21** 行（1.8–2.4/s）；指纹 = **6 行/3 s**（每骷髅 60 tick 一行） |
| **W7-R-b** | 旁路面：换目标 → 每骷髅恰 1 行即时，后续静默 | **✓ 转场 / ✗ 静默** | 转场 6 s：**6 行 none + 12 行 ETIM_Harn03**（即时且目标串正确）；静默 10 s：**11 行** |
| **W7-R-c** | 恢复面：目标清空 → 每骷髅恰 1 行 `target=none`，后续静默 | **✓ 转场 / ✗ 静默** | 转场：**6 行 `target=none`**（两轮同形）；静默（lord 定时 tp 钉住）10 s：**18 / 24 行** |

**总记**：C-1 v2 **部分兑现**——目标变更/清空的**即时面成立**（每骷髅恰 1 行、target 串正确），但**稳态面仍非静默**：行率从 v1 的 60 行/窗降到 18–24 行/窗（降 60–70%），离判据 0 行/窗仍差一个量级归零动作。**W7-R ✗**。

---

## 二、逐面核讫

### W7-R-a · 静默面（固定目标）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 双窗各 10 s 行数 | **0 行/窗** | run R1：a1 **21** / a2 **18**；R2：a1 **21** / a2 **18**；R3：a1 **18** / a2 **24**；R5：a0 **21**（共 7 窗，区间 **18–24**） | ✗ |
| 行率 | 状态变化级（≈0/s） | **1.8–2.4/s**；逐秒 3 行（R1）或 6 行/3 s（R3）——**每骷髅每 60 tick 固定一行** | ✗ |
| 与 v1 对照 | 上轮 60 行/窗 | 60 → **18–24**（−60%～−70%） | 改善未达标 |
| 场景完整性 | 6 骷髅 + 1 lord（num=6 不召兵） | 受控：`skeleton NoAI x6 r=5`，lord `num_troops_summoned:6b`；R4 probe2 证 6 骷髅 + 1 lord 均在 | ✓ |

判行原句（同秒 6 条，逐 3 s 一批）：

```
[00:30:28] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:30:31] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:30:34] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:30:37] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
```

### W7-R-b · 旁路面（换目标）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 换目标 → 每骷髅恰 1 行即时 | 6 行即时 | 转场 6 s：**6 行 `target=none` + 12 行 `target=ETIM_Harn03`**（第一秒 6 行 none、下一秒 6 行 H03，第二批 = 60 tick 刷行） | ✓（即时面） |
| 后续静默 10 s | 0 行 | **11 行**（全 `ETIM_Harn03`；逐秒 6/3/2） | ✗ |

判行原句：

```
[00:34:01] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
[00:34:02] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn03 [server]
```

> 方法：Harn03（生存）RCON 定点落在 lord 侧 1 格 → Harn01 转 creative（原地不离开）→ lord 目标失效并重选 Harn03（lord 不移动，避免走失干扰）。

### W7-R-c · 恢复面（目标清空）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 目标清空 → 每骷髅恰 1 行 `target=none` | 6 行 | 转场 **6 行 `target=none`**（R1 / R3 / R5 三轮同形） | ✓（即时面） |
| 后续静默 10 s（lord 定时 tp 钉在原位） | 0 行 | c1 **18** / c2 **24** 行（全 `target=none`；逐秒 6 行 / 3 s） | ✗ |

判行原句：

```
[00:36:40] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
[00:36:43] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
[00:36:46] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
```

### 残余机制（读码 + 逐秒指纹同向）

`setFrenziedByBoneLord` v2 的抑制基准取「**上次出行**的 tick」：

```java
boolean targetChanged = sig == null || sig[1] != targetId;
boolean gapElapsed = sig == null || tick - sig[0] > 40;   // sig[0] 只在出行时更新
if (targetChanged || gapElapsed) { log; FRENZY_LOG_SIG.put(skeleton, {tick, targetId}); }
```

lord 的续期窗是 20 tick：出行后第 1 窗 gap=20（静默）、第 2 窗 gap=40（`>40` 为假，仍静默）、第 3 窗 gap=60 → **必刷一行**。故稳态为「每骷髅每 60 tick 一行」，与 target 是否为空无关（c 面 18/24 行同证）。40 tick 窗被 20 tick 续期「追上」，只起到 1/3 降频作用。

**一行级修法（方向）**：把基准改为「**上次 set** 的 tick」——每次调用都写入 `lastSetTick`，仅 `targetChanged || (tick - lastSetTick > 40)` 出行；这样 20 tick 续期时 gap 恒 20（静默），lord 离开 >40 tick（真断档）后的首次 set 才出行（= 真恢复面），目标变更仍即时。

---

## 三、冲突分级

### A 级（阻断闭单）

**无。** 无需要改产品码 + rebuild 的判点（W7-R ✗ 属日志面，判为 C 级；但按任务书「W7-R 过 → 闭单」的条件，本项未过即**闭单条件未满足**）。

### B 级（判定通道缺口）

**无新增。** `[AILog] frenzy set` 通道本身可判真假：目标变更/清空/稳态三面在日志上可分（target 串 + 逐秒指纹），无需补行。

### C 级（登记，不阻塞）

1. **C-1（W7-R ✗ 根因）**：抑制窗基准错位（上次行 tick vs 上次 set tick）→ 稳态每 60 tick 刷行。修法见上；修后只重验 W7-R-a/c + b 转场回归。
2. **C-2（作业面：lord 走失）**：目标清空后 lord 进入 wander，数秒内走出 16 格管理盒 → 出现「假静默」（R3 c 面 0 行）。**直证**：R4 probe2 在同一现场拉到 `ETIMEntityBoneLord` `num_troops_summoned:6b` 且 `kill @e[type=skeleton]` 回收 **6 只**。规避 = 定时 tp 把 lord 钉在原位（R7 采用）。
3. **C-3（作业面：假人重生点）**：kill 目标后假人在场地上空 ~33 格重生并落回场内（hp 6），5 s 后即被 lord 击杀 → 「kill 切目标」方案会自污染（R2）。规避 = creative 切换 / tp 出 16 格。
4. **C-4（弃用 run）**：R6 首跑 lord 召唤坐标拼接错（`-63.5.5`），当轮 frenzy 全 0；**已弃用并按修正后重跑**（R7），不计入任何判值。
5. **C-5（探头破坏性）**：R4 probe2 为确认现场存活，`kill` 回收了 6 骷髅 + 1 lord（判据窗已结束，不影响取证）。
6. **C-6（C-2 修验证）**：本轮起服 **零 `DuplicateModsFoundException`**（classpath 单面 + `start-server.ps1` 尾随 `;` 修复，已入 `1216f59`）。

---

## 四、收口表

| 项 | 终态 |
|---|---|
| 客户端 | 本轮未起（无客户端面判据） |
| 服务端 | RCON `save-all` → `stop`：**00:37:15** `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出；端口 25565 / 25575 = 0 |
| 产品面 | jar **625,928 B @ 2026-10-25 00:21:56**｜SHA256 `92271D3D…5B77C248`｜**0 rebuild**｜HEAD = origin/master = `1216f59` |
| 工作区 | 产品码/资产 **0 改动**；harness 新增 `testharness/player/w7r2-evidence.js` + `mobv2-run.js` 的 `w7r2/w7r2b/c/d/e`、`probe2` 相位；`build-logs/` 产物见 §0.2 |
| 判据面污染 | 无外部玩家；世界为 testw2h 副本（C-3 承上轮） |

---

## 五、待主会话裁决位

1. **W7-R ✗**：是否按「基准改为上次 set tick」的一行级修法再修 → 修后**只重验 W7-R-a（双窗）+ c（钉住 lord 的静默窗）+ b 转场回归**（不需重跑 W5-R/W4-R 或其他面）。
2. **C-2/C-3**：lord 走失与假人重生点的作业面规避（定时 tp 钉住 lord、creative 切目标）是否固化进 `testharness/player/README.md` 的「受控面布局」节。
3. **run/w5r**：保留至闭单（当前保留，判据现场）。
4. **未跟踪工装清单**（交主会话收口）：`testharness/player/mobv2-run.js`、`testharness/player/w5r-evidence.js`、`testharness/player/w7r2-evidence.js`、`testharness/player/mobv-evidence.js`、`testharness/player/mobv-grep.js`、`testharness/player/mobv-logscan.js`、`testharness/player/mobv-run.js`、`testharness/player/spec-mobv2.js`、`testharness/reports/mob-revenant-bonelord-verdict.md`、`testharness/reports/mob-revenant-bonelord-reverdict.md`、`testharness/reports/mob-revenant-bonelord-reverdict2.md`。
