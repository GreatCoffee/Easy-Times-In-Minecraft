# 阶段五 mob 批三轮重验（仅 W7-R · C-1 v3）判决回执

> **执行方**：会话七（验证窗执行）
> **追验对象**：jar **625,928 B @ 2026-10-25 00:45:12**｜SHA256 **872F9B57DAA477DE4C8DB01E2E430D9C6658542AA56AEEF1EB427F625365A410**＝产品 commit **`bb26053`**（`mob batch: C-1 v3 frenzy log dedup - suppression window baseline moved to last SET tick`）。
> **上轮钉值作废**：**625,928 B｜`92271D3D…`｜`1216f59`**（`mob-revenant-bonelord-reverdict2.md`，12,849 B）。**字节数与上轮同值属巧合，判据以 SHA256 为准**。
> **判据正本**：三轮任务书（W7-R-a / W7-R-b / W7-R-c）＋ 上两轮回执；A-MOB-1 已闭、B-MOB-2 通道已验、C-2 ps1 修已验，W1–W6/W8–W10 + W4-R/W5-R **本轮未动**。
> **现役钉值**：HEAD = origin/master = **`bb26053`**｜窗内 **0 rebuild**（起服前 / 收口 jar 字节·SHA·mtime 全同）。
> **判据源**：服务端 `run/w5r/logs/latest.log` 的 `[AILog] frenzy set` 行（`mobDebugLog`）；判窗边界用 `/say W7R3|<win>|begin|end` 落同一日志，证据按标记行切片（不依赖 driver 侧时钟）；现场完整性用 `execute @e[…] ~ ~ ~ say` + `entitydata` 非破坏探针。
> **窗内人员**：无（用户客户端本轮未起；专服独占）。
> **口径**：W7-R 三面全过 → **W7-R PASS**（本轮无 FAIL 判项）。UTF-8 无 BOM、LF、0 U+FFFD。
> **计数口径**：正文字形计数只含 §一/§二 的判定标记（§六 转达块用 PASS/FAIL 文字，避免重复计数）；规格行自身含 1 个叉号字形，故叉号计数恒 ≥1（本轮 FAIL 判项 = 0）。
> **报告字节规格**：`20,438 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 26 / ✗ 1｜250 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 625,928 B | 625,928 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-25 00:45:12 | 2026-10-25 00:45:12（收口复核同值） | ✓ |
| SHA256 | `872F9B57…5365A410` | `872F9B57DAA477DE4C8DB01E2E430D9C6658542AA56AEEF1EB427F625365A410` | ✓ 逐位 |
| 产品 commit | `bb26053` | `bb26053`（= HEAD = origin/master） | ✓ |
| 窗内 rebuild | 禁止 | 起服前 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 载入面 | classpath 单面 | `classpath append: build\libs\etim-1.0.0.jar (mtime=10/25/2026 00:45:12)`；mods 面无 etim | ✓ |
| DuplicateMods | 0 | `DuplicateModsFoundException` = **0** | ✓ |
| Mixin / tick 异常 | 0 | `Mixin apply failed|MixinException|InvalidMixinException|Exception in server tick|ConcurrentModification` = **0** | ✓ |
| 世界 | testw2h 副本 | `run/w5r/testw2h` | ✓ |
| 端口 | 25565 / 25575 | 起服后 LISTEN；收口后 **0 / 0** | ✓ |

### 0.1 起停服台账

| 轮 | 时刻 | 事件 | 备注 |
|---|---|---|---|
| R0 | 00:47:11 → 00:47:15 | 起服 | `Starting minecraft server version 1.12.2`；`Starting Minecraft server on *:25565`；`Done (1.191s)!`；**零 dup crash** |
| R1 | 00:47:55 → 00:50:25 | w7r3 driver 单相位：a 双窗 → b 转场/静默 → c 转场/双静默 → resume 探针 | 一轮成，无重跑 |
| R2a | 00:50:11 → 00:50:13 | probe3 首跑（**弃用**） | `scoreboard players get` 在 1.12 不存在（返回 usage）→ 计数行无效；改 `execute … say` 重跑，不计入任何判值 |
| R2b | 00:50:23 → 00:50:25 | probe3 重跑（非破坏） | 6 骷髅 / 1 lord / `num_troops_summoned:6b` |
| R3 | 00:50:35 | 优雅停服 | RCON `save-all` → `stop`：`Stopping server → Saving players → Saving worlds → Unloading dimension 0`；端口 0 |

### 0.2 产物

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/w7r3-server-final.log` | 87,811 B | 本窗专服会话全档（00:47:06–00:50:35，含停服锚；617 行） |
| `build-logs/w7r3-server-prestop.log` | 86,639 B | 停服前快照（证据留存） |
| `build-logs/w7r3-evidence-rows.txt` | 5,374 B | 按 `/say` 标记切片计数 + 全窗批次表 + 探针计数 |
| `build-logs/w7r3-run.out` | 45,826 B | driver 控制台全档 |
| `build-logs/w7r3-driver.log` | 6,109 B | driver `say()` 时间锚 |
| `build-logs/w7r3-probe3.out` / `w7r3-probe3b.out` | 6,280 / 5,854 B | 探针首跑（弃用）/ 重跑 |
| `build-logs/w7r3-server-start.out` | 846 B | 起服参数与 classpath 面 |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W7-R-a** | 静默面：固定目标双窗各 10 s → **0 行/窗** | **PASS** ✓ | a1 **0** / a2 **0**；连同 b-silence、c-sil-1、c-sil-2，**5 个静默窗全 0 行**（v1 = 60 行/窗，v2 = 18–24 行/窗） |
| **W7-R-b** | 旁路面：换目标 → 每骷髅恰 1 行即时 + 后续 10 s 静默 = 0 | **PASS** ✓ | 转场 **12 行 = 6 `none` + 6 `ETIM_Harn03`**（各有单秒单批）；首行（none）**+316 ms**；b-silence **0 行**（v2 = 11 行） |
| **W7-R-c** | 恢复面：目标清空 → 6 行 `target=none` 即时 + lord 钉住后静默 = 0 | **PASS** ✓ | 转场 **6 行 `target=none`**（00:49:01 单批，首行 **+918 ms**）；c-sil-1 **0** / c-sil-2 **0**（v2 = 18/24 行） |

**总记**：W7-R **PASS**。v3 稳态指纹 = **每状态变化恰 6 行**（6 只骷髅各 1 行，单秒单批）；全窗共 **10 批 × 6 行 + 窗后 1 行 = 61 行**，其中判窗内只有 3 次真实状态变化（b 转场两段、c 转场一段）与 1 次探针恢复面。v2 的「每骷髅每 60 tick 一行」稳态刷行**已消失**。

---

## 二、逐面核讫

### W7-R-a · 静默面（固定目标）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 双窗各 10 s 行数 | **0 行/窗** | a1（00:48:17–00:48:27）**0**；a2（00:48:27–00:48:38）**0** | ✓ |
| 另行静默窗 | 0 行 | b-silence（00:48:49–00:49:00）**0**；c-sil-1（00:49:03–00:49:13）**0**；c-sil-2（00:49:14–00:49:24）**0** | ✓ |
| 场景完整性 | 6 骷髅 + 1 lord（num=6 不召兵） | `PROBE3 skeleton count = 6`、`PROBE3 bonelord count = 1`、`entitydata` 回报 `num_troops_summoned:6b`（00:50:23，覆盖全部判窗） | ✓ |
| 通道活性（防「0 行 = 场景死了」） | 窗后仍能出批次 | 窗后 00:49:30 恢复面仍出 **6 行**，00:50:18 出 1 行 → 骷髅与续期全程存活 | ✓ |

边界证据（窗前后最近的两批，均**在窗界之外**；判窗内无任何 `frenzy set` 行）：

```
[00:48:14] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:48:17] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: [ETIM_Harn01] W7R3|a1|begin
[00:48:27] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: [ETIM_Harn01] W7R3|a1|end
[00:48:27] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: [ETIM_Harn01] W7R3|a2|begin
[00:48:38] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: [ETIM_Harn01] W7R3|a2|end
[00:48:46] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
```

### W7-R-b · 旁路面（creative 切目标 + 第二假人）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 转场每骷髅恰 1 行 | 6 行 `none` + 6 行新目标 | **6 行 `none`（00:48:46）+ 6 行 `ETIM_Harn03`（00:48:48）**，各为单秒单批，无重复 | ✓ |
| 转场即时性 | 状态变化当拍出行 | 首行（none）**+316 ms**（≤ 一个 20 tick 续期）；新目标行 **+2167 ms**（见下） | ✓ |
| 后续 10 s 静默 | 0 行 | b-silence **0 行** | ✓ |
| target 串正确 | none → 新目标名 | `target=none` / `target=ETIM_Harn03`，**无 `ETIM_Harn01` 残留行** | ✓ |

判行原句（两批各 6 条，下列各取 2 条）：

```
[00:48:46] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]
[00:48:48] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn03 [server]
```

> **+2167 ms 的口径**：这不是日志面延迟，而是 **lord 侧重新取目标**（原目标转 creative 后 `getAttackTarget()` 清空 → 重新选中 Harn03）所花的时间；日志行仍出现在「取到目标后的第一个 20 tick 续期拍」。同窗内不需要取目标的 `none` 行只用 **+316 ms**、c 转场只用 **+918 ms**，即日志面对状态变化的响应 ≤ 1 个续期窗（20 tick）。
> 方法：Harn03 生存态 RCON 定点落在 lord 侧 1 格 → Harn01 **原地**转 creative（不离职、不 kill）→ 目标失效并重选。

### W7-R-c · 恢复面（目标清空，lord 钉住）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 目标清空 → 6 行 `target=none` | 6 行 | **6 行 `target=none`（00:49:01，单批）** | ✓ |
| 即时性 | 状态变化当拍 | 首行 **+918 ms**（≤ 一个 20 tick 续期） | ✓ |
| 钉住后静默 | 双窗 0 行 | c-sil-1 **0 行** / c-sil-2 **0 行**（lord 每 0.9 s RCON tp 钉回钉点） | ✓ |
| 无重复批次 | 每骷髅恰 1 行 | 00:49:01 之后至窗末（00:49:24）无第二批 | ✓ |

判行原句：

```
[00:49:01] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=none [server]   （同秒共 6 条）
```

### 补充探针 · gap>40 tick 恢复面（**非判点**，验 v3 抑制窗不永久封口）

| 项 | 实测 |
|---|---|
| 做法 | 停钉 → lord 移到钉点 +25 格（16 格盒内无骷髅，续期停）→ 等 4 s（80 tick，> 40）→ 移回钉点 |
| 结果 | 移回后 **6 行 `target=none`（00:49:30，单批）** —— `gapElapsed` 路径生效，抑制窗不吞真恢复 |
| 意义 | 证明「静默」是抑制窗而非 mute；同时是 W7-R-a「0 行」的通道活性旁证 |

---

## 三、冲突分级

### A 级（阻断闭单）

**无。** 三个判点全过，无产品码待改。

### B 级（判定通道缺口）

**无新增。** `[AILog] frenzy set` 通道在 v3 下可判三面真假：状态变化（每骷髅恰 1 行、单秒单批）、静默（0 行）、恢复（gap>40 或目标变更各出 1 行）。另用 `/say` 标记行把判窗边界钉进同一日志，证据可脱离 driver 独立复核。

### C 级（登记，不阻塞）

1. **C-1 已闭环（v3 兑现）**：抑制窗基准由「上次出行 tick」改为「上次 set tick」（`FRENZY_LOG_SIG.put` 移出判行块，每次调用都更新）。20 tick 续期下 gap 恒 20 → 稳态静默；目标变更旁路不变；gap>40 恢复面经探针实测仍出行。
2. **C-2 已固化（作业面）**：目标清空后 lord 会 wander 出 16 格盒 → 假静默。规避 = RCON 每 0.9 s `tp @e[type=etim:bonelord,c=1]` 钉回钉点；本轮 a/b/c 全窗在钉住态下取得。**已写入 `testharness/player/README.md`「mob 受控面布局」节（裁决 2 执行）。**
3. **C-3 已固化（作业面）**：`kill` 切目标会因假人重生点在场地上空 ~33 格而落回场内、被 lord 击杀 → 目标自污染；改用 `gamemode 1`（原地转 creative）。**同节固化。**
4. **C-4（世界残留，窗外面）**：`testw2h` 副本保留了上一轮结束时的**未清场实体**（上一轮未跑 clean 相位），起服即加载：00:47:16 `none` ×6（残留 lord 对 6 残留骷髅）、00:47:54 / 00:47:55 / 00:47:59（残留 lord 对 Harn01 的 kill/respawn 反应）。这些批次**全部落在 commonSetup 清场之前、a1 窗界（00:48:17）之外**，不进入任何判值；00:48:09 `none` ×6 与 00:48:14 `ETIM_Harn01` ×6 是本轮新 lord 的首 set 与取到目标。**建议**：闭单前 `run/w5r` 直接删除（本轮结束时场内仍留有本轮 6 骷髅 + 1 lord，未跑 clean）。
5. **C-5（口径）**：W7-R-b 新目标行 +2167 ms 属 **lord 取目标节奏**（原目标转 creative → 清空 → 重选），非日志面延迟；日志面响应以 `none` 行 +316 ms、c 转场 +918 ms 为证（均 ≤ 1 个 20 tick 续期窗）。
6. **C-6（窗后噪声，正面旁证）**：00:50:18 单行 `target=none` ×1，出现在两次 probe3 之间（lord 已停钉、无目标 → wander），某只骷髅在 >40 tick 后重新落入 16 格盒且 LOS 通过 → 按 v3 设计出行 1 行。**不在任何判窗内**；同时旁证 dedup 非永久封口。
7. **C-7（工装手法）**：1.12 **无** `scoreboard players get`（返回 usage）；现场计数改用 `execute @e[type=…] ~ ~ ~ say <TAG>`（日志逐实体一行，非破坏，且天然带位置语义）。`kill` 类回收只在判窗全部结束后做。
8. **C-8（收口）**：未跟踪工装与报告清单见 §五.4，交主会话统一收口。

---

## 四、收口表

| 项 | 终态 |
|---|---|
| 客户端 | 本轮未起（无客户端面判据） |
| 服务端 | RCON `save-all` → `stop`：**00:50:35** `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出；端口 25565 / 25575 = **0 / 0** |
| 产品面 | jar **625,928 B @ 2026-10-25 00:45:12**｜SHA256 `872F9B57…5365A410`｜**0 rebuild**｜HEAD = origin/master = `bb26053` |
| 工作区 | 产品码/资产 **0 改动**（`git status --porcelain src/` = 0）；harness 新增 `testharness/player/w7r3-run.js`、`testharness/player/w7r3-evidence.js`，`testharness/player/README.md` 新增「mob 受控面布局」节；`build-logs/` 产物见 §0.2 |
| 判据面污染 | 无外部玩家；世界为 testw2h 副本（C-4 残留已在窗界外）；RCON 仅用于无位置语义命令 + lord 钉点 tp（绝对坐标） |

---

## 五、待主会话裁决位

1. **W7-R PASS** → 按任务书满足闭单条件：mob 批闭单（删 `run/w5r` 现场 + 落账三载体 + 工装收口）。
2. **C-4**：`run/w5r` 现场在本轮结束时仍留有本轮 6 骷髅 + 1 lord（未跑 clean）；闭单即删现场，无需清理——若改主意要复用现场，需先跑 `clean` 相位。
3. **裁决 2 执行完毕**：`testharness/player/README.md` 新节「mob 受控面布局」已落（lord 钉住 0.9 s / creative 切目标 / 骷髅环布按实时坐标 / probe 破坏性回收须在判窗后 / 判窗 `/say` 标记 / 静默窗的活性旁证）。harness 改动未混入产品 commit（`bb26053` 只含 `ETIMDigging.java`）。
4. **未跟踪工装清单**（交主会话收口）：`testharness/player/w7r3-run.js`、`testharness/player/w7r3-evidence.js`、`testharness/player/mobv2-run.js`、`testharness/player/w5r-evidence.js`、`testharness/player/w7r2-evidence.js`、`testharness/player/mobv-evidence.js`、`testharness/player/mobv-grep.js`、`testharness/player/mobv-logscan.js`、`testharness/player/mobv-run.js`、`testharness/player/spec-mobv2.js`、`testharness/reports/mob-revenant-bonelord-verdict.md`、`testharness/reports/mob-revenant-bonelord-reverdict.md`、`testharness/reports/mob-revenant-bonelord-reverdict2.md`、`testharness/reports/mob-revenant-bonelord-reverdict3.md`（本档）。

---

## 六、转达块（围栏，整块复制给主会话）

> 纪律（铁律 7）：本节正文即围栏块，块内自足；块外只留落盘路径一句。

````markdown
【会话七 · mob 批三轮重验（仅 W7-R · C-1 v3）判决回执】

钉值：jar 625,928 B @ 2026-10-25 00:45:12｜SHA256 872F9B57DAA477DE4C8DB01E2E430D9C6658542AA56AEEF1EB427F625365A410
     ｜HEAD = origin/master = bb26053｜窗内 0 rebuild（起收同值）｜上轮 92271D3D / 1216f59 作废
     （注：字节数与上轮同值 625,928 属巧合，判据以 SHA 为准）
回执：testharness/reports/mob-revenant-bonelord-reverdict3.md
证据：build-logs/w7r3-server-final.log（87,811 B / 617 行）＋ w7r3-evidence-rows.txt（5,374 B）
      ＋ w7r3-run.out ＋ w7r3-driver.log ＋ w7r3-probe3b.out ＋ w7r3-server-prestop.log
环境：专服 run/w5r（testw2h 副本）00:47:15 Done (1.191s) → 00:50:35 优雅停服；端口 0/0；
      0 次 DuplicateModsFoundException；Mixin/tick/ConcurrentModification 异常 0；客户端未起

一、判决类清单
| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| W7-R-a | 静默面：固定目标双窗各 10 s → 0 行/窗 | PASS | a1=0、a2=0；连同 b-silence、c-sil-1、c-sil-2 共 5 个静默窗全 0 行（v1=60、v2=18-24） |
| W7-R-b | 旁路面：换目标 → 每骷髅恰 1 行即时 + 10 s 静默 0 | PASS | 转场 12 行 = 6 none + 6 ETIM_Harn03（各单秒单批）；none 首行 +316 ms；静默 0 行（v2=11） |
| W7-R-c | 恢复面：目标清空 → 6 行 none + 钉住静默 0 | PASS | 6 行 target=none（00:49:01 单批，首行 +918 ms）；c-sil-1=0、c-sil-2=0（v2=18/24） |

总记：W7-R PASS。v3 稳态指纹 = 每状态变化恰 6 行（6 骷髅各 1 行、单秒单批）；
      全窗 10 批 × 6 行 + 窗后 1 行 = 61 行；v2 的「每骷髅每 60 tick 一行」刷行消失。

二、逐面判行与判值
W7-R-a（PASS）
- 判窗：a1 00:48:17→00:48:27 = 0 行；a2 00:48:27→00:48:38 = 0 行
- 另三窗：b-silence 00:48:49→00:49:00 = 0；c-sil-1 00:49:03→00:49:13 = 0；c-sil-2 00:49:14→00:49:24 = 0
- 通道活性旁证：窗后 00:49:30 出 6 行、00:50:18 出 1 行（骷髅与续期全程存活）
W7-R-b（PASS）
- [00:48:46] [AILog] frenzy set entity=Skeleton target=none        （同秒 6 条，单批）
- [00:48:48] [AILog] frenzy set entity=Skeleton target=ETIM_Harn03 （同秒 6 条，单批）
- 静默窗 00:48:49→00:49:00 = 0 行
- +2167 ms 口径：属 lord 重新取目标（原目标转 creative → 清空 → 重选）的 AI 节奏，
  非日志面延迟；日志面响应以 none 行 +316 ms / c 转场 +918 ms 为证（≤ 1 个 20 tick 续期窗）
W7-R-c（PASS）
- [00:49:01] [AILog] frenzy set entity=Skeleton target=none （同秒 6 条，单批，首行 +918 ms）
- 钉住静默：c-sil-1 = 0 / c-sil-2 = 0
- 方法：Harn03 原地转 creative（不 kill）→ 目标清空；lord 每 0.9 s RCON tp 钉在钉点

补充探针（非判点）：停钉 → lord 移出 16 格盒 4 s（>40 tick）→ 移回 → 6 行 none（00:49:30）
  = gap>40 恢复面不被抑制窗吞，兼作 W7-R-a 的通道活性旁证。

三、冲突分级
A 级：无（三面全过，无产品码待改）
B 级：无新增（frenzy set 通道可判状态变化/静默/恢复三面；判窗边界用 /say W7R3|win|begin|end 落同一日志）
C-1 已闭环：v3 基准改「上次 set tick」，20 tick 续期 gap 恒 20 → 稳态静默；旁路与 gap>40 恢复面均实测成立
C-2 已固化：lord 0.9 s RCON 定时 tp 钉住（防 wander 出 16 格盒 → 假静默）
C-3 已固化：creative 切目标，kill 方案自污染废弃（假人重生点在场地上空 ~33 格、落回被 lord 杀）
C-4 世界残留：testw2h 保留上轮未清场实体，起服即加载（00:47:16/54/55/59 四批），全在窗界外、不进判值
C-5 口径：b 面 +2167 ms 属 lord 取目标节奏，非日志面延迟
C-6 窗后噪声（正面旁证）：00:50:18 单行 none ×1，lord 停钉 wander 后某骷髅 >40 tick 重入盒 → 按设计出行
C-7 工装：1.12 无 scoreboard players get；现场计数改 execute @e[…] ~ ~ ~ say <TAG>（非破坏、带位置语义）
C-8 收口：未跟踪工装与报告清单见下列第 4 条

四、收口
客户端：本轮未起（无客户端面判据）
服务端：00:50:35 Stopping server → Saving players → Saving worlds → Unloading dimension 0；端口 0/0
产品面：jar 625,928 B @ 2026-10-25 00:45:12｜SHA256 872F9B57…5365A410｜0 rebuild｜HEAD = origin = bb26053
工作区：产品码/资产 0 改动；新增 testharness/player/w7r3-run.js、w7r3-evidence.js；
        testharness/player/README.md 新增「mob 受控面布局」节（harness 改动未混产品 commit）

五、待主会话裁决
1. W7-R PASS → 满足闭单条件：mob 批闭单（删 run/w5r + 落账三载体 + 工装收口）
2. run/w5r 结束时场内仍有本轮 6 骷髅 + 1 lord（未跑 clean）；闭单即删现场，无需清理
3. 裁决 2 执行完毕：README「mob 受控面布局」已落（钉住 0.9 s / creative 切目标 / 环布按实时坐标 /
   probe 破坏性回收须在判窗后 / 判窗 /say 标记 / 静默窗活性旁证）
4. 未跟踪工装与报告：w7r3-run.js、w7r3-evidence.js、mobv2-run.js、w5r-evidence.js、w7r2-evidence.js、
   mobv-evidence.js、mobv-grep.js、mobv-logscan.js、mobv-run.js、spec-mobv2.js、
   reports/mob-revenant-bonelord-{verdict,reverdict,reverdict2,reverdict3}.md
````
