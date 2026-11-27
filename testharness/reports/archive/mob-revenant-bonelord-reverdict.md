# 阶段五 mob 批重验窗（W5-R / W4-R / W7-R）判决回执

> **执行方**：会话七（验证窗执行）
> **追验对象**：jar **625,906 B @ 2026-10-24 23:51:32**｜SHA256 **BB00ACFA015CC5BCB3206642D77D4602E8FA8A6F4E08F1D8104C2388C00C39BE**＝产品 commit **`c553002`**（`mob batch: A-MOB-1 type2 troop face unreachable fix … + B-MOB-2 … + C-1 frenzy log dedup`）。
> **上轮钉值作废**：**625,542 B｜E7DBED22…｜`9e6071a`**（`mob-revenant-bonelord-verdict.md`，25,362 B）。
> **判据正本**：`playground/audit/mob-revenant-bonelord-落码批文.md` §一（判值正本，沿用上轮判据）＋ 上轮回执。
> **现役钉值**：HEAD = origin/master = **`c553002`**｜窗内 **0 rebuild**（起服前 / 收口 jar 字节·SHA·mtime 全同）。
> **判据源**：服务端 `run/w5r/logs/latest.log` 的 `[AILog]` / `[MobLog]` ＋ RCON `time query` / `entitydata` ＋ 假人（mineflayer）作业面 ＋ 崩溃报告；客户端 `[TestLog]` 本窗不参与判点。
> **窗内人员**：`Developer`（用户）**未连本窗专服**；其客户端 23:56:59 起（用户面测试），00:00:40 已优雅退出（`Stopping!` + `BUILD SUCCESSFUL`），与本窗专服（00:05:32 起）无交集。
> **口径**：通过 ✓、不通过 ✗；**判点 ✗ = 1**（W7-R）。UTF-8 无 BOM、LF、0 U+FFFD。
> **报告字节规格**：`14,445 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 21 / ✗ 9｜170 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 625,906 B | 625,906 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-24 23:51:32 | 2026-10-24 23:51:32（收口复核同值） | ✓ |
| SHA256 | `BB00ACFA…C39BE` | `BB00ACFA015CC5BCB3206642D77D4602E8FA8A6F4E08F1D8104C2388C00C39BE` | ✓ 逐位 |
| 产品 commit | `c553002` | `c553002`（= HEAD = origin/master） | ✓ |
| 窗内 rebuild | 禁止 | 起服前 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 载入面 | 单一 surface | `-cp … forge-universal.jar;build\libs\etim-1.0.0.jar`（mods 面无 etim，起服日志 `classpath append: … (mtime=10/24/2026 23:51:32)`） | ✓ |
| 世界 | testw2h | `run/w5r/testw2h`（testw2h 快照副本，见 C-3） | ✓ |
| 端口 | 25565 / 25575 | 起服后 LISTEN；收口后 0 | ✓ |
| Mixin / tick 异常 | 0 | `Mixin apply failed|MixinException|InvalidMixinException|Exception in server tick` = **0 行** | ✓ |

### 0.1 起停服台账

| 轮 | 时刻 | 事件 | 备注 |
|---|---|---|---|
| C0 | 23:56:59 | 用户客户端起（用户面） | 00:00:40 `Stopping!`；Gradle `BUILD SUCCESSFUL in 3m 43s` |
| R0 | 23:58:38 | 起服尝试 #1 | 23:58:47 `DuplicateModsFoundException`（`crash-2026-10-24_23.58.47-server.txt`）→ C-2 |
| R1 | 00:03:42 | 起服尝试 #2 | 同因崩溃（`crash-2026-10-25_00.03.42-server.txt`）→ C-2 |
| R2 | 00:05:28 | 起服 #3（jar 走 classpath 单面） | 00:05:32 `Done (1.231s)!`；`Starting Minecraft server on *:25565` |
| R3 | 00:14:39 | 优雅停服 | `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出，端口 0 |

### 0.2 快照与产物

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/w5r-server-final.log` | 1,766,355 B | 本窗专服会话全档（00:05:28–00:14:39，含停服锚） |
| `build-logs/w5r-evidence-rows.txt` | 11,726 B | 判行分组计数 + 抽样原句（按 W 分组） |
| `build-logs/w5r-w5r-run.out` | 20,936 B | W5-R/W4-R 第 1 轮 driver 输出（36 召唤） |
| `build-logs/w5r-w5r-run2.out` | 18,528 B | W5-R/W4-R 第 2 轮 driver 输出（34 召唤） |
| `build-logs/w5r-w7r-run.out` | 11,190 B | W7-R 受控窗 driver 输出（2×10 s） |
| `build-logs/w5r-driver.log` | 14,324 B | driver 全程时间线（含 HarnMark 锚） |
| `build-logs/w5r-client-latest.log` | 192,809 B | 用户客户端关窗快照（`Stopping!` 在案） |
| `build-logs/w5r-server-start4.out` / `start5.out` | 857 / 846 B | 起服参数与 classpath 面记录（C-2 证据） |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W5-R** | type2 兵团面（A-MOB-1 修复验证） | **PASS** | type2 **15/70**（run1 10/36、run2 5/34）；门行 **15 true / 9 false**；全库历史 type2 = **0/172** |
| **W4-R** | 召唤链回归 | **PASS** | 70 召唤；num 序 max=**6**、0 行 >6；`hold=summoned reset=-9600` **70 = 70**；`persistence` **13**（6+6+1） |
| **W7-R** | 狂化行面（C-1 去重） | **✗ FAIL** | 6 骷髅 + 固定目标：**60 行/10 s × 2 窗**，每秒恒 **6 行** → 20-tick 周期面**零去重** |

**总记**：A-MOB-1 **修复兑现**——type2 兵团从「全库 0/172 不可达」变为 15/70（21.4%，期望 25%），B-MOB-2 门行通道成立；召唤链未被扰动。**C-1 去重未生效**（W7-R ✗，属日志噪声级，非阻断）。

---

## 二、逐 W 核讫

### W5-R · type2 兵团面

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| type2 份额（nether 外） | ≥ 5 / 33（沿用上轮判据） | **15/70**：run1 **10/36**、run2 **5/34**（两轮各自过线） | ✓ |
| B-MOB-2 门行 | `pathOk=true` ≥ 5（证「掷中且过门」） | 门行 **24 行＝15 true / 9 false**；`pathOk=true` 数 **15 = type2 装备行数**（门行→接受→装备三段闭合） | ✓ |
| type 分布 χ² | 期望 2:1:1 → 0.75 type0 / 0.25 type2 | type0 **55** / type2 **15**（n=70）；期望 type2 17.5，**χ²=0.714（df=1，p≈0.40）** | ✓ |
| 全库复核 | 修复后 type2 份额显著非零 | 历史 **110 档 / 172 行** `mob troop equip` → type2 **0 行**；本窗 **15 行** | ✓ |
| type2 装备面 | 1/20 + day≥10 → 锈剑/匕首，else 徒手 | 15 行全为 `type=2 bare (club dropped, C-1)`；**0 行 `melee=`**（期望 0.75 行，P(0)=0.46，与 1/20 一致，非负证）；无弓/铁剑/木棍行 | ✓（通道面） |
| type0 面 | 弓 | 55/55 = `type=0 bow` | ✓ |

判行原句：

```
[00:07:39] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] troop type2 gate pathOk=true [server]
[00:07:42] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] troop type2 gate pathOk=false [server]
[00:07:39] [Server thread/INFO] [Easy Times In Minecraft]: [MobLog] mob troop equip entity=Skeleton type=2 bare (club dropped, C-1) [server]
[00:07:40] [Server thread/INFO] [Easy Times In Minecraft]: [MobLog] mob troop equip entity=Skeleton type=0 bow [server]
[00:07:40] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] bonelord summon entity=Skeleton at -63,65,262 num=1 [server]
```

> 备注：`pathOk=false` 9 行说明门不是恒真（候选到目标的路径仍有不可达面），`true` 行与 type2 装备行 1:1 对齐；type2 份额两轮 27.8% / 14.7%，合并 21.4%，落在 25% 的二项区间内（sd=3.6）。

### W4-R · 召唤链回归

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 20 tick 窗 + num<6 门 | 有召唤行且 num ≤ 6 | **70 行**；num 序 `1,1,2,2,3,1,1,3,1,2,4,5,…,6,6`，**max=6**，**0 行 >6** | ✓ |
| `refreshDespawnCounter(-9600)` | 每召必在 | `hold=summoned reset=-9600` **70 行 = 召唤 70 行**（逐实体 `#id` 不重复） | ✓ |
| 持久化 | 有玩家目标即 persist | `[AILog] bonelord persistence` **13 行 = 6（run1）+ 6（run2）+ 1（W7-R lord）** | ✓ |
| lord 上限 NBT | num 封顶 6 | 收尾 `entitydata @e[type=etim:bonelord,c=1]` → `num_troops_summoned:6b` | ✓ |

判行原句：

```
[00:07:39] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] mob despawn hold=summoned reset=-9600 entity=EntitySkeleton#794 [server]
[00:07:39] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] bonelord persistence [server]
[00:11:41] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] bonelord summon entity=Skeleton at -61,68,255 num=1 [server]
```

> 备注：6 lord 并行召唤 → 行内 num 序列交错（1,1,2,2,3,…），故「每 lord 1→6」以「num 单调 +1 / 复位到 1 分段 + 全程 ≤6 + 收尾 NBT=6」四证合判；本项是回归面，改面仅在 `trySummonTroop` 的 type2 门与日志行（`c553002` 只动 `ETIMEntityBoneLord.pathFinalWithin` / 门行 + `ETIMDigging.frenzy`），链面未动，实测同形。

### W7-R · 狂化行面（C-1 去重）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 行率 = 状态变化级 | 不再 15 行/秒 | **6 骷髅 + 固定目标**：win1 **60 行/10 s（6.00/s）**、win2 **60 行/10 s（6.00/s）** | ✗ |
| 同骷髅同目标 20-tick 重置面 | 零行 | 每秒恒 **6 行**（6 骷髅 × 每 20 tick 一行），**逐秒无衰减** → 周期面**零去重** | ✗ |
| 对照总率 | 上轮 15.3/s | 本窗 w5r run1 **63.5/s**（9,521/150 s）、run2 **15.9/s**（2,380/150 s）；两轮合计 11,901 行 | — |

判行原句（受控窗，每秒 6 条同形行）：

```
[00:10:52] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:10:53] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
[00:11:11] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
```

**根因（读码 + 实测同向）**：`ETIMDigging.setFrenziedByBoneLord` 的去重条件是 `sigChanged = !wasActive || sig == null || target 变化`；而 `wasActive` 取自重设前的 `FRENZY[0] > 0`。`tickFrenzy` 每 tick 递减 1、重设窗恰好是 20 tick → 重设时刻计数已归零 → `wasActive=false` 恒成立 → 条件恒真 → 每窗必打一行。受控窗「每秒恰好 = 骷髅数」是该推断的直接指纹（去重若生效，应为「前 1 秒 N 行、其后 0 行」）。

---

## 三、冲突分级

### A 级（阻断闭单）

**无。** A-MOB-1 已闭合；本轮无需要改产品码 + rebuild 的判点。

### B 级（判定通道缺口）

**无新增。** B-MOB-2（type2 门判定行）本轮**验证成立**：24 行门行可分 `pathOk=true/false`，且与 type2 接受数 15 逐一对齐 → **B-MOB-2 可闭**。

### C 级（登记，不阻塞）

1. **C-1（升级：去重未生效）**：W7-R ✗。日志面证据 12,492 行（本窗 1.77 MB 档的主膨胀源）。**修法方向（二选一）**：①用「最近设置 tick」做抑制窗（如 `worldTick - lastSetTick <= 40` 则静默），②`countdown` 归零时清 `FRENZY_LOG_SIG` 并去掉 `!wasActive` 分支（只在 target 变化或断档 >2 窗时记）。**非阻断**（纯日志面，不改狂化行为与判值）。
2. **C-2（harness 起服面）**：mods 面与 classpath 面对同一 etim jar 的双扫 → `DuplicateModsFoundException`（同文件两条：`.\mods\etim-1.0.0.jar` 与 `<abs>\.\mods\etim-1.0.0.jar`）。规避 = 只留 classpath 单面（起服日志 `classpath append: build\libs\…`）。同因修复了 `start-server.ps1` 的 `-cp` 尾随 `;`（空 cp 项 = cwd，会被 FML 当目录项再扫一遍 `.\mods`）。两个崩溃档：`crash-2026-10-24_23.58.47-server.txt`、`crash-2026-10-25_00.03.42-server.txt` —— **均发生在判据窗（00:07:38 起）之前**，无 Mixin/ETIM 帧，不计入任何负证。
3. **C-3（世界面）**：本轮专服用 `testw2h` 的**快照副本**（`run/w5r/testw2h`），目的是把专服日志与用户客户端（单机世界写入同一 `run/obfuscated/logs`）隔离，并避开客户端对 `run/obfuscated/mods` 的占用。判点均为 mob AI 面，与世界身份无关；原世界未被本窗改动。
4. **C-4（噪声面）**：`[AILog] mob despawn pass-state` / `livestock-raincheck` 等既有通道在开盘即满速打印（世界内既有 livestock 存量），本窗仅靠通道过滤判读。
5. **C-5（作业面）**：假人落点血量低（hp=5~6，登录瞬间/落点伤害），全程靠 `resistance IV + regeneration III + 每 15 s instant_health` 维持；不构成判据影响，但 W5-R 与 W7-R 的假人都必须带这套保命效果才跑得完 150 s。
6. **C-6（站址漂移）**：W7-R 受控窗前假人由 mob 推挤从 `-65.5,68,255.5` 漂到 `-73.7,67,258.8`，环形布置按实时坐标计算（脚本内相对），不影响「6 骷髅 + 固定目标」的结论。

---

## 四、收口表

| 项 | 终态 |
|---|---|
| 客户端 | 23:56:59 起（用户面）→ **00:00:40 `Stopping!`**，Gradle `BUILD SUCCESSFUL in 3m 43s`；快照 `build-logs/w5r-client-latest.log`（192,809 B）。本轮不判客户端面 |
| 服务端 | RCON `save-all` → `stop`：**00:14:39** `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出；端口 25565 / 25575 = 0 |
| 产品面 | jar **625,906 B @ 2026-10-24 23:51:32**｜SHA256 `BB00ACFA…C39BE`｜**0 rebuild**｜HEAD = origin/master = `c553002` |
| 工作区 | 产品码/资产 **0 改动**；harness 改动 1 件（`testharness/server/start-server.ps1`：`-cp` 尾随 `;` 修复）+ 新增 3 件工装（`mobv2-run.js`、`w5r-evidence.js`、`build-logs/` 产物） |
| 用户操作面 | AI 侧无客户端键鼠操作；用户客户端为自管（单机世界「新的世界」），与本窗专服无连接 |

---

## 五、待主会话裁决位

1. **W5-R PASS / W4-R PASS**：A-MOB-1 可**闭单**；mob 批（W1–W10）在 W5 修复后已全数 PASS（W7 另行见下）。
2. **W7-R ✗（C-1 去重未生效）**：判是否本轮再派一次日志面单点修（改 `ETIMDigging` 去重条件 → 只重验 W7-R，无需重跑 W5/W4）；若判「日志噪声可延后」，则本项以 C 级挂账、不阻断 mob 批闭单。
3. **C-2**：`start-server.ps1` 的 `-cp` 修复与「mods 单面会双扫」结论，是否固化进 `testharness/server/README.md` 起服链（建议固化：客户端占 jar 时走独立 WorkDir + classpath 单面）。
4. **C-3**：`run/w5r`（副本世界 35.6 MB + mods 20 MB）保留作复验现场，还是收口后删除——请裁决（当前保留）。
5. **未跟踪工装清单**（交主会话收口）：`testharness/player/mobv2-run.js`、`testharness/player/w5r-evidence.js`、`testharness/player/mobv-evidence.js`、`testharness/player/mobv-grep.js`、`testharness/player/mobv-logscan.js`、`testharness/player/mobv-run.js`、`testharness/player/spec-mobv2.js`、`testharness/reports/mob-revenant-bonelord-verdict.md`、`testharness/reports/mob-revenant-bonelord-reverdict.md`；已修改 1 件：`testharness/server/start-server.ps1`。
