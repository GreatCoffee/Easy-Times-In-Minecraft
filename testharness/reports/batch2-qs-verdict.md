# audit20 · 第二批 Q+S 实测窗 + F5/C11 工装 · 判决报告

**基线**：`95bdad5`（jar 324,006B，2026-10-20 19:28:00）
**执行**：会话七｜服务端 = `run/obfuscated`（classpath 324,006B）｜判据源 `run/obfuscated/logs/latest.log` + 探针台 log
**窗口**：Q 窗（bot `ETIM_Harn04`，craftingDebugLog/mobDebugLog=true，moonStateOverride=空）｜S-1 天然窗 20 min｜S-2 Hell 窗｜F5 构床三点头
**声明**：本文件新建；Q 窗 2026-10-20 19:38–19:48（本地），F5 19:35，S 窗见 §2.4。

---

## ① 判据类清单

| # | 判据类 | 终态 |
|---|---|---|
| Q-1 | F-9-16 集外物品（木棍）右键零 cycle + COMPLETE AVERAGE | **PASS**（log；F3+H 客户端待用户转述） |
| Q-2 | F-7-26 debt 10/20 → POOR/WRETCHED 免费；fine+ 收费恢复 | **BLOCKED**（免费半 PASS；收费半被 §3 B2-1 预览重置打断） |
| Q-3 | F-7-27/28 收费对账 N=round(D×2^n/5) + 池非负 | **BLOCKED**（公式行 PASS；无一次实际扣费） |
| Q-4 | F-9-19/23 客户端肉眼（average 行 / 剪刀大师 / 弓精良） | **BLOCKED**（剪刀/弓被 B2-1 打断；average NBT 已证，tooltip 待用户） |
| Q-5 | F-7-30 右键预览即时更新 | **BLOCKED**（预览写入存在，下一 tick 被 B2-1 重置） |
| Q-6 | F-4-19 负级近战系数判据行 | **PASS**（lvl=-10 bonus=0.8；对照 lvl=10 bonus=1.05） |
| Q-7 | F-4-30 /xp 绝对池语义 | **PASS**（100→100、5L→200=level5、再 100→100；收费腿被 B2-1 打断） |
| S-1 | F3+F4b/c 天然窗密度对照 | **PASS**（creeper 1411/6409=22.0% vs BASELINE 30.4%，−8.4pp；total 6409 vs 6051；cap 面见 §2.4） |
| S-2 | F4a Hell ghast 小窗 | **PASS**（12 min 窗；Ghast accept 5，5 个不同 chunk，两两 >48；dedup/cap 无日志行见 §3 B2-6） |
| F5/C11 | 构床即时/save-all/boot 三点头 | **PASS**（三点头双半全在） |

---

## ② 逐项核讫表

### 2.1 Q-1 / Q-2 / Q-3（CraftingLog 原文）

| # | 判据原文 | 实测（`[CraftingLog]`） | 判 |
|---|---|---|---|
| Q-1 | 木棍右键零 cycle；COMPLETE quality=AVERAGE；产物无品质 NBT | 19:40:48 `result click btn=1` **后无** `quality cycle`；19:40:49 `start crafting difficulty=50.0 quality=AVERAGE period=41`；19:40:51 `COMPLETE Stick ×4 quality=AVERAGE xp=0 continue`；木棍非载体（`hasQualityChannel` false），NBT dump `stick nbt=none` | **PASS**（F3+H 待用户） |
| Q-2a | debt 10 → 劣质档 xp=0、无「已消耗」 | 19:41:11 `period SET difficulty=2450.0 quality=POOR period=598`；19:41:43 `COMPLETE Iron Pickaxe ×1 quality=POOR xp=0 continue`；聊天无 `etim.crafting.paid` | **PASS** |
| Q-2b | debt 20 → 贫瘠档 xp=0 | 19:42:09 `quality=WRETCHED period=747`；19:42:48 `COMPLETE Iron Pickaxe ×1 quality=WRETCHED xp=0 continue` | **PASS** |
| Q-2c | 回 fine+ 收费恢复 | 19:43:13 `quality cycle index=3 (FINE) range=[2..3] qDifficulty=4900.0 cost=980`；随即 `result CHANGED …+tag1 → period SET … quality=AVERAGE`；19:43:14 `start crafting … quality=AVERAGE`；19:43:35 `COMPLETE … quality=AVERAGE xp=0` | **BLOCKED** |
| Q-3 | COMPLETE xp=-N，N=round(D×2^n/5)，池逐笔对账 | 公式行：D=2450 时 FINE n=1 cost=**980**、EXCELLENT n=2 cost=**1960**、MASTERWORK n=4 cost=**7840**（全部 = round(2450×2^n/5)）；但每次 cycle 后 `+tag1` 触发重置，**无一条 xp=-N 的 COMPLETE**；池 1000/10000/100 均未被扣 | **BLOCKED** |
| Q-3b | 池 100 的 max 档在预算内、不出现负池 | 19:44:14 `quality=AVERAGE period=474`（无 paid rung ≤100）→ 19:44:40 `COMPLETE … xp=0`；池保持 100 ≥0 | **PASS（非负）** |

### 2.2 Q-6 / Q-7（MobLog / /state 原文）

| # | 判据原文 | 实测 | 判 |
|---|---|---|---|
| Q-6a | lvl=-10 → bonus=0.8 | 19:47:29 `[MobLog] level-modifier lvl=-10 melee bonus=0.8` | **PASS** |
| Q-6b | lvl≥0 对照 bonus=1.0+lvl×0.005 | 19:48:02 `[MobLog] level-modifier lvl=10 melee bonus=1.05` | **PASS** |
| Q-7a | /xp 100 → 池=100 | `/state` `total=100` | **PASS** |
| Q-7b | /xp 5L → level=5 | `/state` `total=200`（`pointsForLevel(5)=5·25+15·5=200`，R196 曲线 level 5） | **PASS** |
| Q-7c | 再 /xp 100 → 池=100（绝对值，不是加 100） | `/state` `total=100`（若为增量应为 300） | **PASS** |
| Q-7d | 合成收费后再 /xp 重设 | 木镐 FINE cost=50 的 cycle 行存在，但 `+tag1` 重置 → `COMPLETE … quality=AVERAGE xp=0`；池仍 100；`/xp 100` 后 `total=100` | **BLOCKED（收费腿）** |

### 2.3 F5/C11 构床三点头

| 检查点 | `testforblock -66 68 246/247 minecraft:bed` | 判 |
|---|---|---|
| 即时（拆后重铺 foot meta0 / head meta8） | 246 `Successfully found` / 247 `Successfully found` | **PASS** |
| `save-all` 后 | 246 / 247 均 found | **PASS** |
| `stop` → 重启（pid 24784）后 | 246 / 247 均 found；地板 `-66 67 246 stone` 亦在 | **PASS** |

> 备注：`setblock -66 68 247 air` 报 “The block couldn't be placed” 是因先拆 foot 时床对（head）已被原版联动移除，非丢失。

### 2.4 S-1 / S-2

| # | 窗口 | 终态 |
|---|---|---|
| S-1 | 天然窗（override 空，20 min，`re-window.ps1 -Phase natural`，19:48:36–20:09:49） | **PASS**：`rows=11478`；accept Skeleton 1983 / Zombie 1891 / **Creeper 1411** / Spider 517 / Bat 432 / Enderman 155 / Squid 17 / Slime 3（总 6409）；creeper 占比 **1411/6409=22.0%**（hostile-only 1411/5957=23.7%）vs BASELINE **30.4% → −8.4pp**；总 accept 6409 vs 6051（+5.9%）；reject spawn-point-dist 2198 / moon-night 2001（**denom=1/4**）/ player-near 468；cap-block `deep=false` **343**（count 56..59 / limit 56）、`WATER_CREATURE` **51**（5..8/5）、**`type=CREEPER` 0**（creeper 2/chunk cap 未出 cap-block 行；per-chunk accept 最大 21，非 alive 计数）；TPS 20.01；相位 NEW→OTHER（day 60→61，世界钟推进） |
| S-2 | Hell 窗（ghast，48² dedup + cap1） | **PASS（观测面）**：窗 20:15:50–20:27:50（12 min），bot `the_nether` @ (0.5,71,0.5)，平台 33×33 @y=70 + 空气 71..81；窗内 `[SpawnLog]` **1314** 行：accept PigZombie 565 / MagmaCube 114 / Skeleton 7 / **Ghast 5** / Zombie 4 / Spider 2 / Creeper 1；reject moon-night 441 / player-near 162 / close-player 7 / colliding 1（Ghast @ -25,51,-10）；density-eval dim=-1 5 行。Ghast accept 坐标 (40,38,28) / (-91,53,-86) / (10,85,-83) / (-65,56,42) / (113,32,-84)：**5 个不同 chunk**，两两距离 >48，未见同 chunk 第二只。**注**：48² dedup（`ETIMSpawnTables:215` return null）与 cap 1/chunk（`ETIMSpawnCycle:583` break roundLoop）均**无日志行**，判据以 accept 坐标 + 源码接线为准（B2-6） |

> S-1 备注：`re-window.ps1` 的 clock/day 分段在 `[TimeSpan]::Parse` 上崩（日志时间戳无小数秒，脚本正则要求 `\.\d+`），accept/cap 统计在崩溃前已完成；属工装 C 级问题（B2-4），不影响判据行。

---

## ③ 冲突 / 异常分级

### B2-1（**A 级 · Q 切片发布阻断**）右键预览写栈触发结果身份变化 → picker 每 tick 重置
- **现象**：右键循环到 FINE 后，下一次驱动 tick 打印 `result CHANGED sig=…+tag1 prev=… → recompute`，紧接 `period SET … quality=AVERAGE`；左键取件时 `start crafting … quality=AVERAGE`，COMPLETE 为 `xp=0`。
- **证据链**（19:43:13–19:43:35）：`quality cycle index=3 (FINE) … cost=980` → `result CHANGED …+tag1` → `period SET … quality=AVERAGE` → `start crafting … quality=AVERAGE` → `COMPLETE … quality=AVERAGE xp=0`。Q3-masterwork 的 4 次右键出现 FINE→FINE→EXCELLENT→FINE 振荡，永不登顶。
- **根因**：`ETIMCrafting.cycleQuality` 的 F-7-30 预览 `ETIMQuality.set(preview, rung)` + `detectAndSendChanges()` 把品质边车写到结果槽；`onPlayerTick` 用 `ItemStack.areItemStacksEqual(timer.lastOutput, output)` 判“同一结果”，带 tag 的栈与不带 tag 的 `lastOutput` 不相等 → `recomputePeriod` → `timer.qualityIndex = getMinOrdinal(player)`，选档丢失。
- **修法建议**（三选一，最小改动优先）：
  1. 身份比较剥掉 `etim.quality` 边车（仅比较 item/metadata/count/其余 NBT）；
  2. 预览只写客户端（不落服务端结果栈）；
  3. `recomputePeriod` 在“仅品质 tag 变化”时保留 `qualityIndex`。
- **影响**：Q-2 收费恢复、Q-3 全部扣费、Q-4 剪刀/弓顶档、Q-5 预览后取件、Q-7 收费腿全部阻断；免费档（POOR/WRETCHED/AVERAGE）不受影响。

### B2-2（**C 级 · 工装口径**）空手近战 reach 1.25，bot 首次 1.82 被 `deny_attack`
- 日志 19:46:11 `reach denied: etim.reach.deny_attack … > 0.50`（射线未命中，Double.MAX）与 19:46:14 `1.82 > 1.25`；把 NoAI 僵尸与 bot 重叠（distance→0）后判据行正常。**非 ETIM 缺陷**，仅记录 bot 攻击需贴身或持工具。

### B2-3（**C 级 · 记录**）`/etest debt` 的 min 档位
- debt 10 → `min = average + (-10)/10 = POOR(1)`；debt 20 → `WRETCHED(0)`。任务书的 debt 10 只能到 POOR；WRETCHED 需 debt 20（本次两组都跑了）。

### B2-4（**C 级 · 工装**）`re-window.ps1` clock/day 分段崩在 `TimeSpan.Parse`
- 日志时间戳形如 `[19:48:44]`（无小数秒），脚本正则 `\[(\d{2}:\d{2}:\d{2})\.\d+\]` 匹配为空 → `[TimeSpan]::Parse("")` 抛 FormatException；**11,478 行逐行抛错，异常风暴持续约 23 min**（窗 20:09:49 结束，统计段 20:33:16 才落盘），属 O(rows) 异常风暴而非单次崩溃。accept/reject/cap-block 统计在风暴前已完成且数字不变（rows=11478，creeper 1411/6409）；仅 day 分段缺失。S-1 窗为单夜（`doDaylightCycle=false` + `time 18000`），无需 day 分段。

### B2-5（**C 级 · 工装**）`setblock minecraft:portal` 放下的传送门块会被 state/frame 校验立即移除
- S-2 前两次尝试：6 块 `setblock … minecraft:portal 0` 均回 `Block placed`，但 2 s 后 `testforblock` 全为 **Air**（meta 1/2/3 同样被移除）；bot 一直站在空气里等 80-tick 传送，`dim=overworld` 不变。
- 可靠点火：`setblock -44 80 242 minecraft:fire`（底部黑曜石上的火）→ `BlockFire.tryIgnitePortal` 自行写入正确 axis state，6 块复查全为 `minecraft:portal`，bot 进入即 `dim=the_nether`（20:15:34 advancement `We Need to Go Deeper`）。后续传送门测试一律走火点法。

### B2-6（**C 级 · 判定面**）ghast 48² dedup 与 cap 1/chunk 均无日志行
- `ETIMSpawnTables:215` 的 dedup 命中 `return null`（静默）；`ETIMSpawnCycle:583` 的 `++chunkCounts >= getMaxSpawnedInChunk` 直接 `break roundLoop`（静默）；因此 S-2 无法出现 `cap-block type=GHAST` / `dedup` 行。
- 本次以 accept 坐标判：5 只 ghast 落在 5 个不同 chunk 且两两 >48，与两个规则的结果一致；若后续要 A 级直证，需给这两处补 `[SpawnLog] dedup ghast` / `[SpawnLog] cap-block type=GHAST` 行（工装改动，非玩法改动）。

---

## ④ 环境终态（S 窗后回填）

| 项 | 值 |
|---|---|
| 服务端 | 324,006B jar（classpath）；pid 24784 已于 20:30:07 `stop` 保存并退出，**25565 已释放** |
| gamerule | 回读 `doMobSpawning=true` / `doDaylightCycle=true` / `doFireTick=true` |
| 时间 | `time set 1000`；回读 daytime 1013 |
| 探针台 | 传送门架 20 格（-45..-42,79..83,242）+ 床/地板 2 格已移除；Nether 平台 1089 格（-16..16,70）已清；S-1 主世界遗留怪清 36（Skeleton 13 / Zombie 10 / Creeper 4 / Spider 2 / Enderman 2 / Squid 5）+ 测试狼 `RE_W2`；`list` 0 玩家 |
| `src/main` | 净（`git status --short -- src/main` = 0 行；本窗只改 `testharness/`） |
| 工装 | `run/mods` **13** 个 jar；`run/obfuscated/mods` 无 etim jar（服务端走 classpath 324,006B）；残留 java 均为 Gradle daemon/worker（pid 21532/20468/27460），无服务端 |
| 备注 | Nether 侧 `@e[type=PigZombie/MagmaCube]` 在 1.12 为非法 ID（`minecraft:pigzombie`/`magmacube`），平台已清、其余合法类型 `found nothing`；残余 Hell 怪在无玩家时随区块卸载，不落主世界 |

**签署**：会话七｜Q-1 PASS、Q-2 BLOCKED、Q-3 BLOCKED、Q-4 BLOCKED、Q-5 BLOCKED、Q-6 PASS、Q-7 PASS（收费腿 BLOCKED）、S-1 PASS、S-2 PASS（观测面）、F5 PASS。

---

## ⑤ 复跑（B2-1 修复后 · 2026-10-20 20:35–20:42）

**基线**：`a4145d3`，jar 324,626B（20:31:45）｜服务端 pid 20192（classpath 直引）｜判据源 `[CraftingLog]`
**前置**：ETIM_Harn04 原 playerdata 在 S-2 Nether 位置，已移至 `testharness/playerdata-backup/`，本窗 fresh overworld 登录；`craftingDebugLog=true` / `mobDebugLog=true`；gamerule 未动。

| # | 判据 | 实测（`[CraftingLog]` / bot） | 判 |
|---|---|---|---|
| Q-2 | debt 10 → fine+ 收费恢复 | 20:38:03 `quality cycle index=3 (FINE) range=[2..3] qDifficulty=4900.0 cost=980 period=681` → `result CHANGED sig=minecraft:iron_pickaxe#0×1+tag1 prev=minecraft:iron_pickaxe#0×1` → `period SET difficulty=2450.0 quality=AVERAGE period=415` → `start crafting … quality=AVERAGE period=415` → `COMPLETE Iron Pickaxe ×1 quality=AVERAGE xp=0 continue`；池 1000 未扣，无 `etim.crafting.paid` | **BLOCKED** |
| Q-3 | xp=-N COMPLETE ≥1；N 对账；池非负 | 20:38:55 第 1 次 cycle `FINE … cost=980 period=476` → `result CHANGED +tag1` → reset AVERAGE；第 2 次 cycle `FINE … cost=980 period=476`（**无** result CHANGED）→ `start crafting quality=FINE period=476` → 20:39:20 `COMPLETE Iron Pickaxe ×1 quality=FINE xp=-980 proceed stopped`；chat `etim.crafting.paid`；`/state total=9020`（10000−980）；N=980=round(2450×2¹/5) | **PASS** |
| Q-4 | 剪刀满档 MASTERWORK / 弓满档 FINE | 剪刀 20:39:36 1st `FINE cost=640` → reset AVERAGE；2nd `FINE 640`；3rd `EXCELLENT 1280`；4th `SUPERB 2560` → `start crafting quality=SUPERB period=507` → 20:40:04 `COMPLETE Shears ×1 quality=SUPERB xp=-2560`（**差一档**：首 cycle 被 reset 吃掉；5th click 才是 MASTERWORK 5120）；弓 20:40:21 `FINE cost=60` → reset AVERAGE → `COMPLETE Bow ×1 quality=AVERAGE xp=0`；池 100000 未扣；F3+H/NBT 与 tooltip 面**用户转述待补**（bot `inv` 槽同步 count=0） | **BLOCKED** |
| Q-5 | 预览跨 ≥2 tick 存活 + 无 B2-1 链 + 取件非 AVERAGE | bot 读数 t0 / t+1.5s：result slot NBT `etim.quality=3 (FINE)` **两次都在**（正判据存活）；但 20:40:49 `quality cycle FINE cost=50` → `result CHANGED +tag1` → `period SET AVERAGE period=89`（**负判据失败**）；取件 `COMPLETE Wooden Pickaxe ×1 quality=AVERAGE xp=0`（收尾失败）；F3+H 品质行**用户转述待补** | **BLOCKED** |
| Q-7 | /xp 100 → fine → 池 100−N → /xp 重设 | 同 Q-5 木镐腿：FINE 50 被 reset，`COMPLETE AVERAGE xp=0`；池 `100` 未扣；`/xp 100` 后仍 100 | **BLOCKED** |

**Q-5 完整链（20:40:49，任务书 §五要求）**：
```
20:40:49 quality cycle index=3 (FINE) range=[2..3] qDifficulty=250.0 cost=50 period=123
20:40:49 result CHANGED sig=minecraft:wooden_pickaxe#0×1+tag1 prev=minecraft:wooden_pickaxe#0×1 → recompute difficulty/period
20:40:49 period SET difficulty=125.0 quality=AVERAGE period=89
20:40:51 start crafting difficulty=125.0 quality=AVERAGE period=89
20:40:56 COMPLETE Wooden Pickaxe ×1 quality=AVERAGE xp=0 continue
```
**Q-2 同链（20:38:03）**：`quality cycle index=3 (FINE) … cost=980 period=681` → `result CHANGED …+tag1` → `period SET … AVERAGE period=415` → `start crafting AVERAGE` → `COMPLETE AVERAGE xp=0`。

**根因（证伪点，不替代主会话修法）**：`sameCraftingIdentity` 调 `ETIMQuality.stripSideCar` 只删 `etim.quality`/`etim`，root 变**空 compound** 但未置 null；未打 tag 的 `timer.lastOutput` root 是 **null**，`ItemStack.areItemStacksEqual` 对「空 compound vs null」判不等 → 首个 cycle 仍触发 `result CHANGED` → `recomputePeriod` → `qualityIndex=min`。第 2 次 cycle 起 `lastOutput` 已被 reset 分支写成带 tag 栈，双方 strip 后都是空 root → 相等；故 Q-3 第 2 cycle 存活（FINE 980 收费成功）、Q-4 第 2–4 cycle 存活（SUPERB 2560）。修法建议（主会话裁定）：`stripSideCar` 删除后 `if (root.isEmpty()) stack.setTagCompound(null)`，或 `sameCraftingIdentity` 在两份 copy 上同样归零。

**B2-6 行型检查（备料）**：本窗新 jar `mobDebugLog=true`，`[SpawnLog]` 新增 `cap-class EntityCreeper … count=2 → abandon chunk` **48** 行，另 Skeleton 14 / Bat 12 / Zombie 6 / Spider 1 / Squid 1；主世界无 ghast，`dedup cancel` 行未触发；行型正常（creeper 2/chunk cap 首次有直证行）。

**环境终态（复跑窗后）**：server pid 20192 `stop` 20:42:0x，**25565 已释放**；gamerule `doMobSpawning/doDaylightCycle/doFireTick=true`；`time 1000`（1003）；`list` 0；Q 桌 `-39 79 240` 已移除；`src/main` 净（0 行）；`run/mods` 13；残留 java 仅 Gradle daemon/worker。

**签署（复跑）**：会话七｜Q-2 BLOCKED、Q-3 PASS、Q-4 BLOCKED、Q-5 BLOCKED、Q-7 BLOCKED（B2-1 空 root 证伪；Q-5 完整链见上）。

---

## ⑥ 复跑 round-2（B2-1 round-2 · 2026-10-20 20:56–21:01）

**基线**：`dcb4080`，jar 324,643B（20:45:27）｜服务端 pid 27272（classpath 直引）｜判据源 `[CraftingLog]`
**修复点**：`stripSideCar` 删空 `etim` 后 `if (root.isEmpty()) stack.setTagCompound(null)` —— round-1 的空 compound vs null 不等已消除。

| # | 判据 | 实测（`[CraftingLog]` / bot） | 判 |
|---|---|---|---|
| Q-2 | debt 10 → fine+ 收费恢复 | 20:57:26 `quality cycle index=3 (FINE) range=[2..3] qDifficulty=4900.0 cost=980 period=681` → **无 result CHANGED** → 20:57:27 `start crafting quality=FINE period=681` → 20:58:01 `COMPLETE Iron Pickaxe ×1 quality=FINE xp=-980 proceed stopped`；chat `etim.crafting.paid`；`/state total=20`（1000−980） | **PASS** |
| Q-3 | **单次** cycle → 直接起合成；xp=-N；N 对账；池非负 | 20:58:18 `quality cycle index=3 (FINE) range=[2..6] qDifficulty=4900.0 cost=980 period=476` → **无 result CHANGED** → 20:58:20 `start crafting quality=FINE period=476` → 20:58:43 `COMPLETE Iron Pickaxe ×1 quality=FINE xp=-980 proceed stopped`；chat `etim.crafting.paid`；`/state total=9020`（10000−980）；N=980=round(2450×2¹/5) | **PASS** |
| Q-4 | 剪刀满档 MASTERWORK / 弓满档 FINE；F3+H/tooltip 用户转述 | 剪刀 20:58:59 起 4 次 cycle 全存活：`FINE 640` → `EXCELLENT 1280` → `SUPERB 2560` → `MASTERWORK 5120`；20:59:02 `start crafting quality=MASTERWORK period=867` → 20:59:45 `COMPLETE Shears ×1 quality=MASTERWORK xp=-5120 proceed stopped`；弓 21:00:02 `FINE cost=60`（无链）→ 21:00:03 `start crafting quality=FINE period=42` → 21:00:05 `COMPLETE Bow ×1 quality=FINE xp=-60 proceed stopped`；池 94880 / 99940；F3+H/NBT 与 tooltip 面**用户转述待补**（bot `inv` 槽同步 count=0） | **PASS**（log 面） |
| Q-5 | 预览跨 ≥2 tick 存活；零 `result CHANGED …+tag1` 链；取件 quality=所选档 | 21:00:30 `quality cycle index=3 (FINE) range=[2..3] qDifficulty=250.0 cost=50 period=123` → **无 result CHANGED**（本窗 `+tag1` 链 **0 行**）；bot 读数 t0 / t+1.5s 结果槽 NBT 均为 `etim.quality=3`（FINE）；21:00:32 `start crafting quality=FINE period=123` → 21:00:38 `COMPLETE Wooden Pickaxe ×1 quality=FINE xp=-50 proceed stopped`；F3+H 品质行**用户转述待补** | **PASS**（log 面） |
| Q-7 | /xp 100 → fine → 池 100−N → /xp 重设 | 同 Q-5 木镐腿：FINE 50 收费成功，`/state total=50`；`/xp 100` 后 `/state total=100` | **PASS** |

**修复验收**：本窗 5 腿共 8 次 quality cycle（Q-2 1、Q-3 1、剪刀 4、弓 1、木镐 1），首 cycle 全部存活；`result CHANGED …+tag1` **0 行**；round-1 的「首 cycle 打回」未复现。

**B2-6 行型检查（备料）**：本窗 `[SpawnLog]` 出现 `cap-class EntityCreeper` **47** 行、`cap-class EntityBat` 16、`cap-class EntityZombie` 16（另 spider/squid 少量）；主世界无 ghast，dedup cancel 行未触发；行型正常。

**环境终态（round-2 后）**：server pid 27272 `stop` 21:01:24，**25565 已释放**；gamerule `doMobSpawning/doDaylightCycle/doFireTick=true`；`time 1000`；`list` 0；Q 桌 `-39 79 240` 已移除；`src/main` 净（0 行）；`run/mods` 13；残留 java 仅 Gradle daemon/worker。playerdata 沿用 round-1 fresh 账号（原 S-2 Nether 档仍在 `testharness/playerdata-backup/`）。

**签署（round-2）**：会话七｜Q-2 PASS、Q-3 PASS、Q-4 PASS（log 面）、Q-5 PASS（log 面）、Q-7 PASS；F3+H/tooltip 面待用户转述。

---

## ⑦ Q-4/Q-5 客户端肉眼轮（2026-10-20 21:55–22:04 · obf 19 mod）

**基线**：`dcb4080`，jar 324,643B（2026-10-20 20:45:27）未变。
**链路**：客户端 `runObfClient`（obf 19 mod）先行 → 服务端 16 mod + ETIM classpath（`run/obfuscated-server` 副本；客户端先起锁住 `run/obfuscated/mods/etim-1.0.0.jar`，原目录起服会 DuplicateMods，故副本起服；13 兼容 mod 全在，无 hold）。
**判决源**：用户肉眼截图/转述（唯一）；服务端 `[CraftingLog]`（`run/obfuscated-server/logs/latest.log`）与客户端 `run/obfuscated/logs/latest.log` 仅对照。

**两枚链路证据行**（客户端 Gradle 输出）：
```
[etim-harness] obf compat gate OK: all 13 compat mod(s) present alongside etim
[etim-harness] copied 324643B etim jar into run/obfuscated/mods
```

| # | 期望 | 转述原文 | 判 |
|---|---|---|---|
| Q-4a | 大师之作 + 耐久满值 | 剪刀 (#0359)；大师之作品质；耐久加成 +200%；耐久度 713 / 714；minecraft:shears；NBT：1个标签。用户注：刚做出来满，打掉一个树叶少 1 点。 | **PASS**（品质/加成对；713/714 为打树叶−1） |
| Q-4b | 精良 | 弓 (#0261)；精良品质；耐久加成 +50%；minecraft:bow；NBT：1个标签。 | **PASS** |
| Q-4c | 普通品质 | 铁镐 (#0257)；在主手时：1.2 攻击速度 / 4 攻击伤害；minecraft:iron_pickaxe。**无品质行、无 NBT 标签**。 | **FAIL**（average 行未渲染） |
| Q-5 | 每次右键品质行即时变化；末档取出与所见一致 | 品质已选档：精良品质（640）→ 优秀（1280）→ 卓越（2560）→ 大师之作（5120）→ 普通（320）→ 精良（640）→ … → 大师之作（5120）；末档取出剪刀 (#0359)：大师之作品质 / 耐久加成 +200% / minecraft:shears / NBT：1个标签。 | **PASS** |

**服务端对照（`[CraftingLog]`）**：
- Q-4a：22:00:13 `quality cycle index=6 (MASTERWORK) cost=5120`；22:00:17 `start crafting quality=MASTERWORK`；22:00:50 `COMPLETE Shears quality=MASTERWORK xp=-5120`。
- Q-4b：22:02:05 `FINE cost=60`；22:02:11 `COMPLETE Bow quality=FINE xp=-60`。
- Q-4c：22:02:36/47 `start crafting quality=AVERAGE`；22:02:42/53 `COMPLETE Iron Pickaxe quality=AVERAGE xp=0`；客户端 tooltip 无 average 行 → **FAIL**。
- Q-5：22:03:03–05 循环 FINE 640 → EXCELLENT 1280 → SUPERB 2560 → MASTERWORK 5120 → AVERAGE 320 → … → MASTERWORK 5120；22:03:23 `start crafting quality=MASTERWORK`；22:03:57 `COMPLETE Shears quality=MASTERWORK xp=-5120`。

**Q-4c 发现（客户端渲染面）**：服务端合成确为 AVERAGE（无 xp 扣费），客户端 `铁镐` tooltip 只有原版攻击行，没有 `普通品质` 行、没有 `NBT：1个标签`；与 Q-4a/Q-4b/Q-5 的非 average 档显示不一致。建议主会话查 `QualityTooltip` 对 AVERAGE 的显示条件/边车写入；非服务端合成缺陷。

**客户端 ERROR 计数**：客户端本侧 **5** 行 —— FML/Maven 启动噪声 **4**（`Apache Maven library folder` / `Full` / `Trimmed` / `FML appears to be missing any signature data`）+ `[Client thread/ERROR] [minecraft/Minecraft]: Null returned as 'hitResult'` **1**（22:00:58，用户打树叶时；非连接层、非 ETIM 合成异常）。连接层/握手 **0** 行 ERROR（`Attempting connection with missing mods [mousetweaks, rad, smoothfont] at SERVER` 为服务端缺客户端侧 mod 的正常提示，连接已建立）。共享 `run/obfuscated/logs/latest.log` 另含 **3** 行前一次原目录起服失败（21:57:29 `DuplicateModsFoundException`，服务端 crash，非客户端），已分列。
→ **客户端 ERROR=0：否**（测试面 1 行 Null hitResult；启动噪声 4 行；连接层 0）。

**收口**：客户端 22:04:08 关闭（`Stopping!`）；服务端 `stop` 已发、25565 释放；`/gamemode 0` 保持生存（测试前后均为 0，无变化）；`run/obfuscated-server` 副本保留（世界/日志），`run/obfuscated/mods` 仍为 ETIM + 13 兼容（无移出）；`src/main` 未动；jar 324,643B @ 20:45:27 未变。

**签署（§⑦）**：会话七｜Q-4a PASS、Q-4b PASS、Q-4c FAIL、Q-5 PASS；客户端 ERROR 5（测试面 1 + 启动噪声 4；连接层 0）；两枚门行在；收口完成。

## §⑦ 更正标记（主会话判读 2026-10-20 深夜）

- **Q-4c FAIL 撤销（误检旧物）**：playerdata（`run/obfuscated-server/testw2h/playerdata/a01a21f5-…dat`，22:04:06 存盘）直证——
  - slot 10 / slot 14 = 本轮两笔 COMPLETE grant 的现合铁镐，**均带 `etim:{quality:2}`（AVERAGE）** → 服务端 F-9-19 对 average 档落 tag 成立；
  - 被检铁镐 = slot 2 无 NBT 那把，同槽区钻石镐/石镐/木镐×2（一把带 ench）/铁剑/黑曜石/probenote = **re-final2 轮 /give 工具组残留**（/give 本就不落品质 tag），非本轮产物。
- **average 行客户端渲染已被本报告 §⑦ Q-5 转述自行证实**：循环列表「普通（320）」= 同一渲染器（QualityTooltip 无 AVERAGE 分支）对同一 tag 形态（etim.quality=2）的亲眼确认。
- **裁定：Q-4c = PASS（证据合成：playerdata 授予面 + Q-5 渲染面）**。可选加固（不作必需）：悬停背包 slot 10/14 两把现合铁镐，应见「普通品质」行。
- 客户端 ERROR 计数分列核讫：5 行全非 ETIM（启动噪声 4 + Null hitResult 1 = 够不着左键原版噪声，re-final2 v2 已档）；连接层 0。
- **运维发现（C 级，登记）**：客户端先起会锁 `run/obfuscated/mods/etim-1.0.0.jar` → 原目录起服 DuplicateMods（21:57:29 crash 在案）→ 本轮改 `run/obfuscated-server` 副本起服成立（start-server.ps1 -WorkDir 可参数化）。

---

## ⑧ Q-4c 复测轮 · 普通品质三件套（2026-10-20 22:13–22:15 · obf 19 mod）

**基线**：`dcb4080`，jar 324,643B @ 2026-10-20 20:45:27（开测前 `Get-Item` 核讫，测试后复核未变；禁 rebuild，`src` 未动）。
**链路**：客户端 `runObfClient` 先行（19 mod）至主菜单 → 服务端 16 mod + ETIM classpath（`run/obfuscated-server` 副本，16 mod，ETIM 走 classpath）→ Direct Connect localhost；生存模式；F3+H 开。
**清场（关键步）**：RCON `clear Developer` 移除 **25** 件 v2 残留旧物 → `give` 铁锭×15、木棍×10。三件逐件合、**全程不右键循环**、左键直接开工（默认档 AVERAGE）。
**判决源**：用户肉眼转述（唯一）；`[CraftingLog]` 与 playerdata NBT 仅服务端面对照。

**两枚链路证据行**（客户端 Gradle 输出）：
```
[etim-harness] obf compat gate OK: all 13 compat mod(s) present alongside etim
[etim-harness] copied 324643B etim jar into run/obfuscated/mods
```

| # | 件 | 期望 | 转述原文 | 判 |
|---|---|---|---|---|
| R-1 | 铁镐 | 普通品质 + 耐久 250/250 + NBT：1个标签 | 用户裁定：**本轮测试全部 PASS**（用户原话「本轮测试全部PASS」；本轮未逐字抄 tooltip 行） | **PASS** |
| R-2 | 铁剑 | 同上（耐久 250/250） | 同上 | **PASS** |
| R-3 | 铁斧 | 同上（耐久 250/250） | 同上 | **PASS** |

**服务端面直证**（playerdata `a01a21f5-c117-3c1f-b5d0-e055b927f733.dat`，22:15:11 落盘，`_inspect-inv.js` 读出）：
```
{"slot":0,"id":"minecraft:iron_pickaxe","count":1,"nbtKeys":["etim"],"etim":"{\"quality\":2}"}
{"slot":1,"id":"minecraft:iron_sword","count":1,"nbtKeys":["etim"],"etim":"{\"quality\":2}"}
{"slot":2,"id":"minecraft:iron_axe","count":1,"nbtKeys":["etim"],"etim":"{\"quality\":2}"}
```
三件均 **`etim:{quality:2}`（AVERAGE）**、均恰 1 个 NBT 标签，且按 R-1/R-2/R-3 顺序占 slot 0/1/2；余料 `iron_ingot×7`、`stick×5` = 15−8、10−5，与三件配方消耗精确吻合 → 无旧物混入、无额外产出。

**`[CraftingLog]` 对照**：
- 22:14:49 `COMPLETE Iron Pickaxe ×1 quality=AVERAGE xp=0`
- 22:14:58 `COMPLETE Iron Sword ×1 quality=AVERAGE xp=0`
- 22:15:07 `COMPLETE Iron Axe ×1 quality=AVERAGE xp=0`

**客户端 ERROR 分列**（`run/obfuscated/logs/latest.log`，共 **24** 行）：
- 启动噪声 **4**：FML Maven 目录 3（`Apache Maven` / `Full` / `Trimmed`）+ FML signature 1；
- fernflower 反编译 **19**（`Unable to simplify switch on enum`，obf 启动固有）；
- 连接层 **1**：22:14:19 `[Server Connector #1/ERROR] [GuiConnecting]: Couldn't connect to server`（Connection refused——客户端先行自动连 lastServer 时服务端尚未起；22:14:26 重连成功，非模组/非测试面）；
- 合成/渲染/测试面 **0**（本轮无 `Null hitResult`，无 ETIM 异常）。

**收口**：客户端 22:15:13 关闭（`Stopping!`）；服务端进程已于 22:15:15 退出、25565 释放（无 `crash-reports`、无 `hs_err`、无 `Stopping` 日志行，非 RCON stop 路径——记 C 级观察项，不影响本轮判定）；playerdata 22:15:11 落盘；`run/obfuscated/mods` 仍 27（ETIM + 13 兼容，无移出）；`src/main` 未动；jar 324,643B @ 20:45:27 未变。

**签署（§⑧）**：会话七｜R-1 PASS、R-2 PASS、R-3 PASS（用户裁定）；playerdata 三件 `etim.quality=2` 直证均在；两枚门行在；**Q-4c 按 v2 更正裁定结案**。
