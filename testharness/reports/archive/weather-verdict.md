# weather-01 判据窗判读报告（verdict：weather-verdict）

**基线**：`5c9409c`（`6224005` → `5c9409c`，**五枚探针已全拆**，§4.4 定稿行式回归）
**jar**：**289,783B @2026-10-17 20:39:53**（`BUILD_EXIT=0`，`build-logs\weather-01-5c9409c-build.out`）
**判读窗 boot stamp**：Boot① `20261017_2040xx`（W-3 双条件）｜Boot② `20261017_213xxx`（W-2）＋ 二次 boot（W-2 确定性）＋ W-4 窗内/窗外
**判决源**：`[WeatherLog]` 五行式（`weather-schedule` / `weather-flip` / `weather-off` / `weather-resume` / `lightning-struck`）＋ `[SleepLog] sleep-done` 行序
**对照报告**：`playground/audit/weather-verdict.md`（J1–J7 全裁，已采）
**版本链终行**：`5c9409c`

> **判词：W-1 / W-2 / W-3 / W-4 / W-5①②③ 全判据 PASS；A 级冲突 0 条；weather-01 全案可提请关账。**

---

## 一、判决类清单（终）

| # | 判决类 | 核心式 | 终态 |
|---|---|---|---|
| W-1 | 血月强制雷暴 | 强制事件 `(日块起, storm=+13000, type=3)` ＋ 窗首/窗尾 flip | **PASS** |
| W-2 | 非血月随机事件面 ＋ 确定性 | 无强制事件、仅 `type=0` 随机事件；同 day 二次 boot `events` 段逐字节一致；`day<2` 门（源码 `:216`） | **PASS**（确定性面全绿；`day<2` 门为静态证据＋登记） |
| W-3 | 闪电 rarity 选择面 | `lightning-struck … rarity=20000 blood=true` | **PASS**（A1 全案闭） |
| W-4 | sleep snap 收账 | `sleep-done` 后紧跟 `weather-flip … reason=snap` ＋ 强度即时终值 | **PASS**（窗外版全断言；窗内版可选未做） |
| W-5① | off · config | `weather-off reason=config` 一行 ＋ 全族零外推 | **PASS** |
| W-5② | off · gamerule | `weather-off reason=gamerule` | **PASS** |
| W-5③ | resume 接管复位 | `weather-resume` | **PASS** |
| 辅 | 骷髅马 trap 负证 | 雷雨窗内无 trap 生成/闪电 | **PASS（负证）**（strike 面已激活且全窗无 trap 行） |

---

## 二、判决源行序列

### Boot① —— W-3 双条件同现（`override=blood` ＋ **常驻 bot 全程在线**）
```
L367: [WeatherLog] weather-schedule day=22 total=504000 events=2 [(480000..493000 storm=480000..493000 type=3), (504000..522189 storm=504000..517000 type=3)]
L368: [WeatherLog] weather-flip t=504000 raining=true thundering=true reason=event
L677: [WeatherLog] lightning-struck x,y,z=-155,68,209 rarity=20000 blood=true
L716: [WeatherLog] lightning-struck x,y,z=-103,77,180 rarity=20000 blood=true
L874: [WeatherLog] lightning-struck x,y,z=-22,71,186  rarity=20000 blood=true
L880: [WeatherLog] lightning-struck x,y,z=-27,72,192  rarity=20000 blood=true
L1028:[WeatherLog] lightning-struck x,y,z=-16,76,253  rarity=20000 blood=true
L1437:[WeatherLog] lightning-struck x,y,z=-80,64,299  rarity=20000 blood=true
L1534:[WeatherLog] lightning-struck x,y,z=25,68,321   rarity=20000 blood=true
L1838:[WeatherLog] lightning-struck x,y,z=-129,80,336 rarity=20000 blood=true
```
（≥8 条 / ~45s，`rarity=20000 blood=true` 逐条在案）

### Boot② —— W-2 确定性（`override=""`），两次 boot 同 day=22
```
boot ②a  L117: weather-schedule day=22 total=505956 events=1 [(514016..522189 type=0)]
boot ②a  L118: weather-flip t=505956 raining=false thundering=false reason=event
boot ②b  L118: weather-schedule day=22 total=509695 events=1 [(514016..522189 type=0)]
```

### Boot② —— W-4（`override=""`，`/time set 18000` 置夜后真睡）
```
L465:  [WeatherLog] weather-flip t=514016 raining=true  thundering=false reason=event   ← 随机事件窗开启（=schedule start）
L2063: [WeatherLog] weather-flip t=522189 raining=false thundering=false reason=event   ← 事件窗关闭（=schedule end）
L2459: [SleepLog]   sleep-done achievements=none potionsCleared=true slept=4607
L2460: [WeatherLog] weather-flip t=527000 raining=false thundering=false reason=snap
```

---

## 三、逐窗核讫表

### W-3 闪电 rarity 选择面 —— **PASS（A1 全案闭）**

| 项 | 内容 |
|---|---|
| 前置 | `moonStateOverride=blood` ＋ `weatherSystem=true` 重启；**bot 全程在线**（`bed-entry-ops.js rc … 1700 - sweep`，覆盖等窗＋窗体，遵跨切片判据纪律 §8.8） |
| 雷暴窗 | total `504000..517000`（日块首 13000t，与 schedule 的 `storm=504000..517000` 逐 tick 一致） |
| 断言 | `lightning-struck` **≥8 条**，全部 `rarity=20000 blood=true` ✓ |
| 窗首互证 | `L368 weather-flip t=504000 raining=true thundering=true reason=event` ＝ schedule `start=504000` ✓ |
| 判定 | **PASS** |

**A1 根因链（跨三轮闭合）**：v1 `0540a43` 零 strike → v2 `a006ac3` 三探针全零 → v3 `6224005` 四支判读命中 **B 支**（`updateBlocks` 循环零 yield）→ 根因 = **判据窗 RCON-only 无玩家在线 ⇒ `PlayerChunkMap.getChunkIterator()` 在 `players.isEmpty()` 时返回空迭代器**（工装面，非落码缺口）。本窗以「常驻玩家」为唯一变更变量即全链贯通，**A1 正式闭项，A 级清零**。

### W-2 非血月随机事件面 ＋ 确定性 —— **PASS**

| 断言 | 实测 | 判定 |
|---|---|---|
| (i) `override=""` 下**无强制事件** | `events=1 [(514016..522189 type=0)]` —— **无 `storm=` 子窗**、`type=0`（= `random.nextInt(3)`） | **PASS** |
| (ii) 确定性（种子纯函数） | 同一 `day=22` 两次 boot：`events=1 [(514016..522189 type=0)]` **逐字节一致** | **PASS** |
| (iii) `day<2` 门（events=0） | 源码 `ETIMWeatherClock:216 if (day < 2L)` 返回空列表；运行时需新建世界（当前 day=22） | **静态证据＋登记**（未运行时证） |

**注**：`total=` 字段两次 boot 不同（505956 / 509695）属预期 —— 它是读取时刻的钟值，非种子输入；确定性判据面 = `events` 段。

### W-4 sleep snap 收账 —— **PASS（窗外版全断言）**

| 项 | 内容 |
|---|---|
| 口径 | 主会话重裁：`override=""`；`reason=snap` 任意 sleep 后必打；**窗外版已足断言 snap 面与无渐变** |
| 前置 | 睡眠窗（`adjusted≥21000`）＋ `/time set 18000` 置夜面（避 `dayLiar`，表钟面 Δ 分裂特批） |
| 断言 1 | `sleep-done achievements=none potionsCleared=true slept=4607` ✓ |
| 断言 2 | **紧跟**（相邻行 `L2459→L2460`）`weather-flip t=527000 raining=false thundering=false reason=snap` ✓ |
| 断言 3 | 强度即时终值 = **0/0**（窗外态）✓；**无 100-tick 渐变爬升**（静态佐证：`snapAfterSleep` 源码 `ETIMWeatherClock:173-174` 显式 `rainingStrength = precip ? 1.0F : 0.0F`、`thunderingStrength = precip && storm ? 1.0F : 0.0F`，**赋值非 ramp**） |
| 窗内态（1/1） | 可选未做（当日随机事件窗 `514016..522189` 与睡眠窗不重合；任务书明确窗外版已足） |
| 判定 | **PASS** |

### W-1 血月强制雷暴 —— **PASS**（承 v1/v2，本窗再获窗首互证）

| 断言 | 证据 |
|---|---|
| 强制事件 `(日块起, storm=+13000, type=3)` | v1 `L319` day19 `(432000..450784 storm=432000..445000 type=3)`；v2 `L1469` day21 `(480000..493000 storm=480000..493000 type=3)`；本窗 `L367` day22 `(504000..522189 storm=504000..517000 type=3)` |
| 排他门（override 不参与） | events 均 `type=3`，无 0/1/2 随机事件 |
| 窗首 flip | `t=432000` / `t=480000` / **`t=504000`** 三例，逐 tick ＝ schedule `start` |
| 窗尾 flip | `t=445000` / `t=493000`（＝`stormEnd`）；另 `t=450784`/`t=522189`（＝precip `end`） |

### W-5①②③ —— **PASS**（承 v1）
`weather-off reason=config` 一行 ＋ 全族零外推 ／ `weather-off reason=gamerule` 一行 ／ `weather-resume day=19 total=446872`。

### 辅：骷髅马 trap 负证 —— **PASS（负证）**
本窗 strike 面**已激活**（≥8 条 `lightning-struck`），全窗**零** trap 闪电/trap 实体生成行 ⇒ `etim$noSkeletonTrap`（`updateBlocks` 单点改写，`nextDouble() < difficulty*0.01D` 恒假）负证成立。

---

## 四、冲突分级（终表）

| 级别 | 条数 | 内容 |
|---|---|---|
| **A 级** | **0** | A1/A1′ 已闭项（根因为工装面「无玩家在线」，非落码缺口） |
| **B 级** | 3 | ①门序中段逆位（`notSafe` 等跨面登记，本切片不涉）；②**判定面代差（J6 重裁）**：`flip` 读 `worldInfo` 布尔 vs `updateBlocks` 闸/`isRainingAt` 读 strength 阈值面 —— 两读异域，判读须以 strength 面为准（v3 探针已实测印证）；③事件窗起点缺翻面行是正态（本窗未触发，窗首恰为日块起，首 tick 即出行） |
| **C 级** | 3 | ①**判据窗须保持假玩家在线**（`getChunkIterator()` 以 `players` 为枚举源；凡判据依赖 `updateBlocks` 逐 chunk 面，RCON-only 观测必然全零）——已落为跨切片判据纪律 §8.8；②RCON 输出解析 ＋ 日志路径须绝对、`cd` 置末；③`/time set` 令表钟面 Δ 分裂（本窗 W-4 用于避 `dayLiar`，属特批面；断言面不读 Δ） |

---

## 五、工装改动记录

| 项 | 内容 |
|---|---|
| 落码面 | **零改动**（`src/main` 未碰）。基线 `5c9409c` 由主会话落码（含拆针） |
| cfg | `S:moonStateOverride` Boot① 置 `blood` → **Boot② 前清空**；`B:weatherSystem=true`；`I:lightningRarityBlood=20000` |
| 世界 | 无改动。bed-entry 工装残态（床 `-66,68,246/247`、7×8 玻璃屋盖 `@y=70`、7×7 顶 `@y=100`）沿用为常驻站位与 W-4 入床面 |
| harness | 未新增工步。常驻在线用 `bed-entry-ops.js rc -66 68 246 <secs> - sweep`（内建清场＋实体读数） |
| 长日志 | `build-logs\weather-01-5c9409c-build.out` |

---

## 六、留账

- **挖床 AI（mobsDigging）**：`tickSentry:413` deferred 面仍 **未落码** —— mobs/AI 切片收。
- **mobwake 1/1000 延迟账** —— mobs/AI 切片收。
- **三态意识态延迟账** —— consciousness 切片候选（五批文裁决 5 out 已定）。
- **`Chunk.getPrecipitationHeight` 语义面**：与 bed-entry 轮 A1 同源（`Chunk.java:1095-1127` 缓存 ＋ lazy 重扫）。**本窗 strike 链已贯通且 `isRainingAt` 门未拒**（≥8 条落雷均经该门）⇒ **该门面间接获正证**；但 `getPrecipitationHeight` 的精确返回语义仍未专窗核，**保留为低优先跨切片复核项**。
- **W-2 `day<2` 门**：静态证据在案（`ETIMWeatherClock:216`），运行时需新建世界，**登记为可选补证**。
- **W-4 窗内态（1/1）**：可选未做，**登记为可选补证**。

---

## 七、状态与清理

- **进程**：server `stop`；25565 无监听；testharness node 零残留（Gradle daemon 按纪律不清）。
- **cfg 终态**：`S:moonStateOverride=`（已清空）／`B:weatherSystem=true`／`I:lightningRarityBlood=20000`。
- **gamerule 终态**：`doDaylightCycle=true` ／ `doMobSpawning=true` ／ `doWeatherCycle=true`。
- **工作树**：`HEAD detached at 5c9409c`；**`src/main` 净**；未暂存改动全在 harness 侧。

---

**判读签署（终）**：会话七 ｜ 基线/版本链终行 **`5c9409c`** ｜ jar 289,783B @2026-10-17 20:39:53 ｜ **W-1 / W-2 / W-3 / W-4 / W-5①②③ 全判据 PASS ＋ trap 负证 PASS；A 级 0 条；B 级 3 条、C 级 3 条** ｜ **weather-01 全案可提请关账（关账档由主会话出）**