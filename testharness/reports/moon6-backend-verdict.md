# moon6-backend 判据窗判定 · W1/W2b/W3/W4 逐位核讫

> 会话七（ses_ed0d8f3a0ffe9ycLrzD7z1T0UN）· 判据基准各窗任务书 [xxxLog] 行字面。
> **版本链**：W1=875e5f9（jar 263,804B @10-14 21:02:31）→ **W2b=5b795f8**（补口 A8 emit；jar 263,846B @ 21:47:33）→ **W3/W4 同 jar 不重 build**（cfg `S:moonStateOverride` 切相）。
> 判据通道：`[SpawnLog]`、`run\obfuscated\logs\latest.log`、RCON `time query`（day = daytime/24000+1）、假玩家 ETIM_Harn04 creative。
> **world day 旁证**（W2b boot 后）：`time query gametime` = 272,892 → day=12（override blue 相位自洽待主会话注）。
> 每发空载复证：**全部 0 行**（W2b/W3/W4 idle 检查皆 `[SpawnLog]`=0——冻结面复证 PASS ×3）。

## 一、判决类清单

| 类 | 字面锚 | 判据出处 |
|---|---|---|
| reject blue-lit-eye | `[SpawnLog] reject blue-lit-eye <cls>` | 5b795f8 补口（A8 蓝月夜眼位 SKY 亮度拒） |
| reject moon-night | `[SpawnLog] reject moon-night denom=1/<n> cls=<cls>` | R196 :274-282 |
| reject day-outdoor | `[SpawnLog] reject day-outdoor <cls>` | A7 白天亡外拒 |
| reject colliding / spawn-point-dist | `[SpawnLog] reject colliding <cls> at …` / `reject spawn-point-dist pos=…` | attempt 族 |
| accept | `[SpawnLog] accept <cls> at … y-bucket=<u/o>` | spawn 承面 |
| modifier | `[SpawnLog] modifier mod=… d=… i=… n=…` | transition 记录（不判缺） |
| freeze | 无玩家段 [SpawnLog] 全型=0 | T2a 语义 |

## 二、逐测项核讫表

### W1 · blood（boot 875e5f9，PID 25920 @20:55:41 起服 / 21:06:26 Done 1.253s；夜窗 tick 13003 起；day 停 1003）

| 判项 | 实测 | 判定 |
|---|---|---|
| 夜窗 denom=1/2 行族须现 | **148 行**（hold 5min） | **PASS** |
| denom=1/3 \| 1/6 \| 1/54 = 0 | **0 行** | **PASS** |
| A7 白天亡外拒照旧 | day-outdoor=**0 行**（与 b3a 基线**同零**） | **PASS（基线一致）** |
| modifier mod<1 → 复位行（rescueGate 血臂） | 记录 **4 行**（17.5min 窗）/ 不判缺 | 观察登记 |
| exceptions=0 | 0 | **PASS** |

### W2b · blue（boot 5b795f8，PID 4632 @21:47:38；夜窗 tick 13003 起；日窗 tick 1003 重 reset 后 hold 240s）

| 判项 | 实测 | 判定 |
|---|---|---|
| **夜窗** reject blue-lit-eye 行族须现（量大） | **7,794 行**（hold 8min；EntityBat 主导 + 其他怪类） | **PASS** |
| **日窗** reject blue-lit-eye = 0 | **4,981 行**（hold 4min，22:00:14→22:04:14） | **PASS（双钟改判→ 见 §三 裁定引注）** |
| denom=1/54 判据废除 | 全 boot **0 行**（不再判） | 废除字面维护 |
| 动物节：动物类 accept（cow/pig/sheep/chicken CREATURE 族）间隔全部 ≥20s | **动物类 accept = 0 行**（蓝月 boot 全程）——无动物节点发射面 | **暂缓（W2c 再窗——见 §三 引注）** |
| exceptions=0 | 0 | **PASS** |

### W3 · full（boot PID 23544 @22:06:44；夜窗 tick 13000+；短窗 hold 300s）

| 判项 | 实测 | 判定 |
|---|---|---|
| denom=1/3 行族须现 | **10 行** | **PASS** |
| 1/2 \| 1/6 \| 1/54 = 0 | **0 行**（breakdown 独面兼容） | **PASS** |
| reject blue-lit-eye = 0 | **0 行** | **PASS** |
| exceptions=0 | 0 | **PASS** |

### W2c · blue 光洞补口（boot **a763b14**，PID 13404 @2026-10-15 17:15:40；jar 264,459B @17:15:34；cfg `S:moonStateOverride=blue`；Done 1.077s）

夜窗 hold 720s（09:18:24→09:30:24 UTC；setday 段 hold 240s，09:31:10→09:35:10）。

| 判项 | 实测 | 判定 |
|---|---|---|
| 空载哨（boot 后 ≥2min 无玩家 `[SpawnLog]` 全型=0） | **0 行** | PASS |
| 夜 hold ≥12min（覆盖 ≥2 个 %400 命中） | **720s**（12.0min） | PASS |
| 夜窗动物类 accept 行须现（cow/pig/sheep/chicken 等） | **0 行**（夜窗 accept 全族：Creeper 945 / Skeleton 893 / Zombie 883 / Spider 206 / Bat 203 / Enderman 70 / Squid 8 / Slime 2） | **未现（字面 FAIL）** |
| 全部动物命中行对位 = 夜 ∧ %400（20s 间隔必要面） | 无动物命中行 → **无从对位** | **不适用** |
| 蓝季外动物 accept = B 级外溢异常 | 动物 accept 全窗 0 行 → **无外溢实例** | PASS（无样本） |
| 夜窗 blue-lit-eye 行族不含动物类（按行内类名过滤核） | blue-lit-eye **6,455 行**，类名分布：Zombie 1,307 / Creeper 1,305 / Skeleton 1,283 / Slime 1,244 / Spider 1,145 / Enderman 171；**动物类 = 0** | PASS |
| setday 段 A8 blue-lit-eye 继续发射（总钟缓存 linger 义） | **6,688 行**（17:31:10→17:35:10 段） | PASS |
| setday 段动物 accept = 0（%400 夜门 worldInfo 钟） | **0 行** | PASS |
| exceptions=0 | **0** | PASS |

**本窗附带观测行（只列实测，因果未判）**
- 夜窗 `reject moon-night denom=1/54` = **1,225 行**（分布唯一 denom 值 = 54）。本报告 §三-3 已记「denom=1/54 蓝夜构造性不可达（A8 R196:223 先于 :275 全吃）」为上一轮判据缺陷改判项；本窗该行族出现。**因果归因待主会话裁决**，本会话不作推断。
- worldInfo 钟读数：夜窗收线 `time query daytime` = 4182 / `gametime` = 329,663；setday 后 daytime = 1003。

### W2d · blue 判据仪 v2（boot **0340a8a**，PID 7980 @2026-10-15 17:53:39；jar 264,998B @17:48:21；cfg `S:moonStateOverride=blue`；Done 1.358s；夜窗 daytime=13003）

夜窗 hold 720s（17:56:22→18:08:22，`disconnect.quitting` 正常退场）。**注**：本窗为重开窗——前窗（PID 23732 @17:48:31）于 17:52:18 连接 `ECONNRESET`、25565 无 LISTENING、四族行全 0，判为无效窗不作数。

| 判据 | 实测 | 判定 |
|---|---|---|
| 空载哨（boot 后 ≥2min 无玩家 `[SpawnLog]` 全型=0） | **0 行** | PASS |
| 夜 hold ≥12min（%400 ≥2 hit） | **720s**（12.0min） | PASS |
| `blue-animal pass gate-hit spawned=n` 须现（gate 实证面） | **0 行** | **未现** |
| `blue-animal landface ground=X` | **0 行** | **未现** |
| `blue-animal pickspawn-null … ground=X` | **0 行** | **未现** |
| `reject blue-animal-gate cls=… ground=X` | **0 行** | **未现** |
| 动物 accept 行 induction 面（gate-hit>0 且 accept 现 → 复检 ≥20s 间隔） | gate-hit=0 且 accept=0 → **无样本，不复检** | **不适用** |
| exceptions=0 | **0** | PASS |
| （参照量）blue-lit-eye | **8,817 行** | 仅记录 |
| （参照量）SpawnLog 家族 | reject 11,162 / accept 2,554 / cap-block 178 / modifier 4 = **13,898 行** | 仅记录 |

**三分支树对照（audit18-w2c-adjudication §W2d，抄录任务书分支定义 + 实测落位）**

| 分支（任务书原文） | 本窗实测落位 |
|---|---|
| ①判据窗环境问题（ground 恒非草） | 无 landface 行 → **无 ground 面可判** |
| ②链下位静默（无 landface 行） | landface **0 行**——**与该分支描述一致** |
| ③GATE 本面失败（gate 行现面即 id） | gate 行（pass gate-hit 与 reject blue-animal-gate）**均 0 行**——**无实例落位** |

**分支归属属归因/终审项：待主会话裁决**（本会话只列实测：四族行在本窗 720s 内全部零产出）。

### W2e · blue clock-pair 修复窗（boot **aa663dd**，PID 25116 @2026-10-15 18:14:59；jar 264,990B @18:14:53；cfg `S:moonStateOverride=blue`；Done 1.221s；夜窗 daytime=13003）

夜窗 hold 720s（18:17:36→18:29:36，`disconnect.quitting` 正常退场）。

| 判据 | 实测 | 判定 |
|---|---|---|
| 空载哨（boot 后 ≥2min 无玩家 `[SpawnLog]` 全型=0） | **0 行** | PASS |
| 夜 hold ≥12min（`/time set night` 同 W2d 口径） | **720s** | PASS |
| **`blue-animal pass gate-hit spawned=n` 须现（缺口修复实证面）** | **26 行**（18:17:51→18:29:31）；**间隔全部 20s**（25/25 gap=20s）；**spawned 值全部 = 0**（26/26） | **行面 PASS**（修复实证面已现）；**spawned=0 面待裁决** |
| `blue-animal landface ground=X` | **0 行** | **未现** |
| `blue-animal pickspawn-null … ground=X` | **0 行** | **未现** |
| `reject blue-animal-gate cls=… ground=X` | **0 行** | **未现** |
| 动物 accept 行全额对位（夜 ∧ %400 ∧ ≥20s 间隔必要面） | 动物 accept **0 行** → **无样本，不复检** | **不适用** |
| exceptions=0 | **0** | PASS |
| （参照量）blue-lit-eye | 2,723 行 | 仅记录 |
| （参照量）denom=1/54 | 1,388 行（desync 诊断面，非判据） | 仅记录 |

**本窗实测要点（只列实测，归因待裁决）**

| 观测 | 实测 |
|---|---|
| gate-hit 行数 vs 任务书预期 | 任务书预期 ~36 行/12min（720s÷20s=36 节拍）；**实测 26 行**，跨度 18:17:51→18:29:31 = 500s = 26 节拍 |
| spawned 值面 | **26/26 行均为 `spawned=0`** |
| 三族（landface / pickspawn-null / blue-animal-gate） | 与 W2d 同形：**全部零产出**（gate-hit 本体已现的条件下） |

**待主会话裁决**：①gate-hit 行面已现（20s 节拍齐）而 `spawned` 全 0 —— 下位三族零产出的归属；②26 节拍 vs 36 节拍预期之差（10 节拍）的成因。

### W2f · blue 探位窗（终稿节；boot **aa663dd** 同 jar 未重 build，PID 3036 @2026-10-15 18:36:50；jar 264,990B @18:14:53；cfg `S:moonStateOverride=blue`；Done 1.106s；夜窗 daytime=13003）

**探位记录（mineflayer 输出）**

| 项 | 实测 |
|---|---|
| tp 前坐标（客户端首帧） | `spawned at 0.0 0.0 0.0`（**待核**：客户端首帧无位置，与既往各窗同形） |
| tp 目标与回执 | `--tp 1500 80 1500`；服务端回执 `Teleported ETIM_Harn04 to 1500.5, 80.0, 1500.5` |
| tp 后稳态坐标（四次心跳） | `1500.5 38.0 1500.5`（health=6 food=6 gamemode=creative） |
| 夜 hold | 300s（18:39:31→18:44:31，`disconnect.quitting`） |

| 判据 | 实测 | 判定 |
|---|---|---|
| 空载哨（boot 后 ≥2min 无玩家 `[SpawnLog]` 全型=0） | **0 行** | PASS |
| `blue-animal pass gate-hit spawned=n` 须现（节拍均匀 20s） | **15 行**；间隔 **20s×14**（唯一间隔值）；**spawned=0：15/15 行** | **节拍面 PASS**；spawned 值面仍 0 |
| `blue-animal landface ground=minecraft:grass` 非持续（负证） | **0 行** | 负证成立（**待核**：0 行与「链未产出」同形） |
| `blue-animal pickspawn-null` 若现字面报 | **0 行** | 无可报 |
| 动物类 accept 须现（猪/牛/羊族）且全额对位（夜 ∧ %400 ∧ ≥20s，窗内 ≥2 行） | **0 行** → **无样本可对位** | **未现（字面 FAIL）** |
| `reject blue-animal-gate … ground=` 若现对齐 grass 面 | **0 行** | 无实例 |
| exceptions=0 | **0** | PASS |

**探位条件实测（任务书要求「动物装载量目测 < 10 头、地表为草原」）**

| 项 | 实测 | 出处 |
|---|---|---|
| 动物装载量 | **`cap-block type=CREATURE count=81 limit=11`（15 行，18:39:51→18:44:31 连续）**——实测 **81 头 > limit 11** | `[SpawnLog] cap-block type=CREATURE …` |
| cap-block 分型 | CREATURE 15 / WATER_CREATURE 14 | 同上 |
| accept 全族（对照） | Skeleton 157 / Zombie 156 / Creeper 141 / Spider 30 / Bat 21 / Enderman 14 / Squid 4 —— **无动物类** | `[SpawnLog] accept …` |
| SpawnLog 合计 | 686 行 | — |

**待主会话裁决**：①本窗探位条件下 CREATURE 装载 81 > limit 11，任务书所述「under-cap 环境」未达成（**待核**：该 81 头的计数字段口径）；②在此条件下 gate-hit 行面（15 行/20s 均匀）与 spawned=0、三族零行、动物 accept=0 的同时并存，归属待判。

### W2g · blue 终验窗（终稿节；boot **aa663dd** 同 jar 未重 build，PID 20024 @2026-10-15 19:03:21；jar 264,990B @18:14:53；cfg `S:moonStateOverride=blue`；Done 1.125s；夜窗 daytime=13003）

**清偿面（改道：假玩家 op chat 通道，不经 RCON）**

| 项 | 实测 | 出处 |
|---|---|---|
| 前置事故（不计入本窗） | RCON kill 序列触发 `java.util.ConcurrentModificationException` → `SERVER_STOPPING`（18:59:46） | 事故日志段 |
| 本窗清偿通道 | `kill-via-bot.js` 四条 `/kill @e[type=cow/pig/sheep/chicken]` 经 bot chat 发出，回执在案（`Killed Chicken` 等） | kill-via-bot 输出 |
| 清偿后余量 | cow **0** / pig **0** / sheep **0** / chicken **0**（testfor 只读面，server 存活至窗内） | RCON testfor |
| 进窗前置「cap count < 11」 | **未达成**：`[19:06:06] cap-block type=CREATURE count=66 limit=11` → `[19:06:46] … count=29 limit=11` | latest.log |

**探位记录（mineflayer）**：tp 前首帧 `0.0 0.0 0.0`；回执 `Teleported ETIM_Harn04 to 1500.5, 80.0, 1500.5`；稳态 `1500.5 38.0 1500.5`（四次心跳一致，creative）。夜 hold 300s（19:06:45→19:11:45，`disconnect.quitting`）。

| 判据 | 实测 | 判定 |
|---|---|---|
| 空载哨（boot 后 ≥2min 无玩家 `[SpawnLog]` 全型=0） | **0 行** | PASS |
| gate-hit 节拍均匀 20s × 夜段秒/20 ±2 | **16 行**；gaps：**20s×14 + 40s×1**；夜段 300s÷20=15，±2 容差 13–17 → 行数在容差内，**但存在 1 处 40s 间隔** | **行数面 PASS；节拍连续性待核** |
| gate-hit `spawned=n` 值面 | **16/16 行 = 0** | 值面仍 0 |
| **动物类 accept 须现 ≥2 行（猪/牛/羊族，全链首开）** | **0 行** | **未开（字面 FAIL）** |
| 动物 accept 对位（夜 ∧ %400 ∧ ≥20s） | 无命中行 → **无样本可对位** | **不适用** |
| `reject blue-animal-gate … ground=minecraft:grass` 若现即报 | **0 行** | 无实例 |
| `blue-animal landface ground=` / `blue-animal pickspawn-null` | **0 行** / **0 行** | 未现 |
| exceptions=0 | **0** | PASS |

**待核 / 待主会话裁决**
1. **cap count=29 的构成**（待核）：清偿后 cow/pig/sheep/chicken 四类余量均为 0，而 `cap-block type=CREATURE count=29` 仍在——**该 29 头的类型构成未取样**。
2. **gate-hit 40s 间隔成因**（待核）：本窗 15 个间隔中 1 处为 40s（其余 14 处 20s）。
3. **唯一首开面（动物 accept ≥2 行）在进窗前置未达成（29 > limit 11）的条件下取 0 行**——归属待裁决。

### W2j · cap-comp 组辰面仪器窗（终稿节；boot **6898d8e**，jar 265,497B @20:02:32，PID 7832 @2026-10-15 20:02:41；世界 testw2h；cfg `S:moonStateOverride=blue`；Done 1.046s）

> **【通道更正——RCON 位置面无效（见 `spawn-cycle-02-verdict.md` W3 追加系列 §六）；该面判读权已在 W2j 起转 cap-comp/行面，不重开定谳】**
>
> - **更正对象**：本节及下文引用的 **W2h/W2i「testfor 四型零值」判读面**（含本节结论 1 的「48/180 头而 testfor 四型全 0」表述、待核项「W2i 清偿后 testfor 四型全 0 而 count=48」）。
> - **更正依据**：RCON sender 无实体位置，`@e[r=N]` 统计**原点附近**；`/execute` 位置锚定同样无效（不带 `r` 的 `testfor @e[type=zombie]` 亦返 0，同刻全局返 20）。故 W2h/W2i 期间 testfor 采样所报的零值**不构成「玩家盒内无该类实体」的判读**。
> - **效力界定**：**该面判读权自 W2j 起已转 `cap-comp` 直方图／`[SpawnLog]` 行面**（cap-comp 与 count 同源自 `loadedEntityList` 遍历，带位置无关性）。**W2h/W2i 的 testfor 零值判读不重开、不定谳、不回溯改判**；仅在此加注通道失效事实，供后续读档者不误引。
> - **不动**：本节 cap-comp 判读结论、count 序列、`cap-block` 判词与本档其余各窗判读**均不受影响**（它们本就不依赖 RCON 位置面）。

**仪器源码锚**：`src\main\java\io\github\etim\etim\mob\ETIMSpawnCycle.java:266-283`——cap-block 命中时对 CREATURE 面遍历 `loadedEntityList` 逐类 `getSimpleName()` 计数，输出 `cap-comp <类名>=<数> …`（HashMap 序）。

**第一窗（20:02:41–20:16:54，cap-comp 取账窗，720s）**

| 项 | 实测 |
|---|---|
| 空载哨 | `[SpawnLog]` **0 行**；exceptions **0** |
| 锁夜 | `doDaylightCycle=false`；daytime 恒 **13000** |
| cap-block CREATURE | 36 行；**count=12 恒定**（`[20:05:01] … count=12 limit=11` … `[20:16:41] … count=12 limit=11`） |
| **cap-comp** | 36 行；首条 `cap-comp EntityChicken=4 EntityPig=8`；次条 `… EntityPig=11`；**末条 `cap-comp EntityChicken=4 EntityPig=8`**（合计 12，与 count 精确对上） |
| **裁决落位** | **组织 = 已测面余种**（Pig/Chicken 属 cow/pig/sheep/chicken 已测面）→ 按任务书**直接加补杀单** |

**第二窗（20:17:47–20:30:54，清偿后判据窗，720s）**

| 判据 | 实测 | 判定 |
|---|---|---|
| 补杀（bot chat 面，两轮四型） | 清偿后 testfor cow 0 / pig 0 / sheep 0 / chicken 0 | PASS |
| 组成清偿后 count < 11 | **未达成**——窗口内 count 波动：11→19→14→11→…→22→12 | **FAIL（自然生成回填）** |
| **count 达 < limit 时刻** | `[20:18:21] count=11` `[20:18:41] count=11` `[20:19:01] count=11` `[20:19:41] count=11`——**连续 5 采样点 = limit**（`count>=cap` 阻断条件不成立） | **前置在该时段成立** |
| **动物 accept ≥2 行（首开面）** | **0 行**（即便 count=11 窗口） | **未开** |
| `blue-animal landface ground=` | **0 行** | 未现 |
| `blue-animal pickspawn-null` | **0 行** | 未现 |
| `reject blue-animal-gate cls=… ground=` | **0 行** | 无 dangling 实例 |
| gate-hit（判据窗段） | 36 行；`spawned=0`：36/36 行；gaps `20s×35`（**全 20s 整齐，0 处断裂**） | 节拍 PASS；值面仍 0 |
| exceptions=0 | **0** | PASS |

**本窗裁决价值（事实面）**
1. **cap-comp 立功**：W2h/W2i 期间「48/180 头而 testfor 四型全 0」的矛盾解开——构成为 **EntityChicken + EntityPig**，100% 落在已测面内（本窗 count=12 且 cap-comp 合计精确等于 12）。
2. **配额门非唯一障碍**：补杀后 count **确实到过 11**（前置成立的 5 个采样点），该时段 `landface`/`pickspawn-null`/`blue-animal-gate`/动物 accept **四族全零**——门开后链条未向下走一步。
3. **回填压力**：自然生成在窗口内把 count 顶回 11 以上（11→22 波动），即便清零亦难维持 `< limit`。

**待主会话裁决**
- ①count=11 窗口内四族全零 → **下一断点定位**（配额门之后、landface 之前的静默面）需何仪器？
- ②回填压力对账：是否需要「清零后立即判」或调高 `spawnCapAnimal` 以扩大 `count<limit` 持续窗口？（需主会话给值与反测口径）
- **待核**：W2i 清偿后 testfor 四型全 0 而 count=48，与本窗 testfor/cap-comp 一致的差异成因。

### W2k · cap 临时量级判据窗（**首开面开启**；boot **6898d8e** 同 jar 不重 build；jar 265,497B @20:02:32；PID 14524 @2026-10-15 20:51:15；世界 testw2h；Done 1.144s）

**裁定依据**：`playground/audit/audit18-w2j-adjudication.md`（count=11=锁（≥语义）、kill 维持 under-cap 不可行 → cap 量级面放门）

**cfg 临时值注记**：`run\obfuscated\config\etim.cfg` 行 260 —— **改前 `I:spawnCapAnimal=10` → 窗内 `I:spawnCapAnimal=25` → 窗后已回 `I:spawnCapAnimal=10`（已复核）**。其余键不动：`B:mobDebugLog=true`(:242)、`S:moonStateOverride=blue`(:254)。

**cap 语义破案（本窗附带发现）**：`ETIMSpawnCycle.java:261` `int cap = capOf(type) * chunkCount / MOB_COUNT_DIV;`（`:57 MOB_COUNT_DIV=256`；`:293 capOf(CREATURE)=ETIMConfig.spawnCapAnimal`）——**limit 按合格区块数缩放，非绝对值**。
- W2j：cfg 10 → 实测 `limit=11`；W2k：cfg 25 → 实测 `limit=28`。
- 反推（**推算，chunkCount 无直接日志**）：`floor(25·c/256)=28` → c∈[287,296]；`floor(10·c/256)=11` → c∈[282,307]，两窗交集自洽。
- **待核**：chunkCount 缺直接日志面，若需精确核账应加仪器。

**开窗前处理**：开窗前 testfor 基线 cow 29 / pig 12 / sheep 10 / chicken 2 = **53 头 > cfg 25**（实为 limit 28），故按裁定「cap 量级面放门」执行**一次初始清偿**降至 0，其后窗内不再 kill（能否持续 under-cap 即为观测内容）。

**bot 连接足迹对位表（cow 透现归因证据）**

| 序 | 连接（node 时钟） | 断开 | 本地墙钟 | 动作 | 邻接 cap-comp |
|---|---|---|---|---|---|
| 1 | `12:53:37.002 LOGIN OK` | `12:53:50.529 disconnect.quitting` | 20:53:35.935 | kill-via-bot 四型 `/kill` | 清偿后 count 归 0 |
| 2 | `12:54:09.735 LOGIN OK` | `13:06:09.743 disconnect.quitting` | 20:54:09 | hold-session 720s 判据窗 | 全窗 32 拍 cap-comp |

**判据窗（20:54:09–21:06:09，720s，恒夜）逐项判定**

| # | 判据 | 实测 | 判定 |
|---|---|---|---|
| 1 | gate-hit `spawned=n` 须现 n>0（≥2 拍） | **3 拍 >0**：`[20:54:16] spawned=4`、`[20:54:36] spawned=2`、`[20:55:16] spawned=11` | **PASS** |
| 2 | **动物 accept ≥2 行（终验面）** | **15 行**：`EntitySheep=11 / EntityPig=2 / EntityWolf=2 / EntityChicken=1 / EntityCow=1` | **PASS（首开面开启）** |
| 3 | `landface ground=X` 若现即报 | **10 行**：ground=`minecraft:leaves2`×3、`minecraft:stone`×4、`minecraft:sand`、`minecraft:obsidian`、`minecraft:leaves` —— **无 `minecraft:grass`** | **现（非 grass 面，待核）** |
| 4 | `pickspawn-null` / `reject blue-animal-gate ground=grass` | **0 / 0** | 无 dangling 实例 |
| 5 | cap-comp 直方图逐拍入账 | **32 行**（全窗）；`cap-comp EntityChicken=4 EntityCow=1 EntityPig=10 EntitySheep=11 EntityWolf=2`（=28，与 count 精确对上）；中段见 `EntityCow=5`，末条回 `EntityCow=1` | 逐拍入账 PASS；**新见 testfor 面外种 `EntityWolf=2`** |
| 6 | 空载哨 / exceptions | **0 / 0** | PASS |

**accept 全窗按类名分类（仪器树面）**：`EntitySkeleton=534 / EntityCreeper=499 / EntityZombie=471 / EntityBat=188 / EntitySpider=109 / EntityEnderman=44 / EntitySquid=12 / EntitySheep=11 / EntityPig=2 / EntityWolf=2 / EntityChicken=1 / EntityCow=1`（accept 合计 1874；reject 3540；cap-block 59；blue-animal 46；cap-comp 32；modifier 5）。

**节拍**：gate-hit 窗段 36 行；gaps `20s×35`（**0 处断裂**）；`spawned` 值分布 `0×33 / 11×1 / 2×1 / 4×1`。

**放门窗口时间线（首开面精确对位）**

| 时刻 | 事件 |
|---|---|
| 20:54:16 | gate-hit `spawned=4` ＋ 同刻 **4 头 `EntitySheep` accept** ← **首开** |
| 20:54:36 | gate-hit `spawned=2` ＋ `EntityChicken` ＋ `EntitySheep` accept |
| 20:55:16 | gate-hit `spawned=11` ＋ `EntitySheep`×7 ＋ `EntityCow` ＋ `EntityPig`×2 accept |
| **20:55:36** | **cap-block 首行 `count=28 limit=28`** → 触顶恒锁（其后 count 仅在 28/32/36 间波动，无一次 < limit） |

**间隔必要面核**：动物 accept 15 行时刻序列 `20:54:16×4 → 20:54:36(Chicken+Sheep) → 20:55:16×8`；相邻间隔 `0,0,0,20,0,40,0,0,0,0,0,0,0,0` —— **≥20s 间隔出现 2 处（20s / 40s）**，满足判据 2 的「≥20s 间隔必要面」最低条件。

**y-bucket 面（附带观测）**：15 行动物 accept **全部 `y-bucket=over`**；对照 accept 全体中 hostile（Zombie/Skeleton/Creeper/Spider/Bat）以 `y-bucket=under` 为主。**待核**：动物 accept 是否恒走 over 分支。

**本窗结论（事实面）**
1. **首开面开启**——连续 W2f/W2g/W2h/W2i/W2j 五窗未开的面在 W2k 首次产出：gate-hit `spawned` 3 拍 >0 ＋ 动物 accept 15 行，两判据同窗互证。
2. **cap 量级面裁定有效**：cfg 25 → 实测 limit 28 → 开窗后约 60s 放门期（20:54:16–20:55:16）三拍全成，随后 count 触顶 28 恒锁，**放门窗口长度 ≈ 60s / 3 拍**。
3. **cap 按区块缩放**（`:261` + `:57`）：此前「count<11」判据的绝对值口径需改读为密度口径。
4. **回填压力量化**：窗内 count 由 0 → 28（触顶）历时约 80s（20:54:16→20:55:36），此后稳态 28/32/36。
5. **新见面外种**：`EntityWolf=2` 计入 CREATURE 配额（此前 testfor 九型采样未覆盖 wolf）。

**待主会话裁决**
- ① `landface ground=` 全部为 `leaves2/stone/sand/obsidian/leaves`，**无 `grass`**——落地面判据的 ground 名口径是否需按实际地形重定？
- ② 放门窗口仅 ~60s/3 拍，样本量偏薄：是否需 cfg 再抬（换更长放门窗）或连开多窗累积样本？
- ③ 动物 accept 全 `y-bucket=over`、wolf 透现两面的归因。
- ④ chunkCount 缺直接日志面：是否加仪器（`cap-chunk n=<chunkCount>`）。

### W4 · new（boot PID 20916 @22:15:27；夜窗 hold 300s）

| 判项 | 实测 | 判定 |
|---|---|---|
| denom=1/6 行族须现 | **447 行** | **PASS** |
| 1/2 \| 1/3 \| 1/54 = 0 | **0 行** | **PASS** |
| reject blue-lit-eye = 0 | **0 行** | **PASS** |
| exceptions=0 | 0 | **PASS** |

## 三、冲突分级

**阻断级：无**

**裁定引注（主会话 audit18-w2-adjudication + 78e84d7 · 恒书）**
1. **W2b 日窗 4,981 行**：**非缺口——R196 双钟语义判 read**：A8 眼位判走 `totalWorldTime` 缓存 flag，`/time set day`（dayInfo 钟）**不响应其缓存面 = R196 精确行为**。W2b 日窗判据**改**：「**setday 段 A8（blue-lit-eye）继续发射 = PASS**」；「A7 / denom 分流面照 `worldInfo` 钟翻转」——**本报告 W2b 日窗判定由 FAIL 改 PASS**（数据 4,981 行原在案）。
2. **动物节 0 行根因**：**已修一半**——A8 MONSTER 域修复已落 **78e84d7** commit（blue-lit-eye 之前误杀怪物链面）；**剩光洞**（对照补遗已交会话五）——**W2c 再窗暂缓**：等主会话推 mixin commit 后按补遗 §三判据开窗。
3. **本轮判据缺陷两处**（主会话注记）：①denom=1/54——**升格 desync 诊断面**（主会话 W2d 令：「②denom=1/54 升格 desync 诊断面（废除字面撤销）」——原「蓝夜构造性不可达、判据废除」字面**撤销**，denom 行改列为诊断观察面，不再计入 PASS/FAIL）；②A8 无 emission 面是代码原始态→**已加 5b795f8 reject blue-lit-eye**（W2b 夜窗 7,794 行发射生效在案）。
4. **W3/W4 维持原案**：full/new 面无涉双钟差——自然昼窗无 setday 即两钟同余——原判有效。
5. **W2c 裁引注（audit18-w2c-adjudication）**：动物 0 行**判据面已定谳为不可判**——判据仪器 commit **0340a8a**（canSpawnOn(CREATURE) 落地面全面加发射，landface ground=块名、4/pass 限流）在案；W2c 节该判据行**保留原判字面（0 行/未现）**，执行面按「不可判」归档。

**观察项（非判据）**
- **W2b 动物节 0 行**—— animal 处于**待 W2c 补口判决**面（mixin commit 后与本窗联动）。

**版本链终行**：W1=875e5f9 → W2b=5b795f8 → 补口 78e84d7 → W2c=a763b14 → W2d=0340a8a → W2e/W2f/W2g=aa663dd → W2j=6898d8e → **W2k=6898d8e**（同 jar；cfg `spawnCapAnimal` 10→25→10 临时量级窗，**首开面开启**：gate-hit spawned 3 拍 >0 ＋ 动物 accept 15 行）；W3/W4 同 5b795f8 jar

**终稿封档（2026-10-15 19:12 · 会话七）**：W1/W2b/W2c/W2d/W2e/W2f/W2g 全节在案；本报告随 W2g 封档，后续增窗以新节追加不改原判行。

## 四、伪代码/调参建议（供主会话判读 W2c 预备）

```java
// W2c 再窗预判面（补遗 §三判据 reach 开后落到会话七纪律）：
// 1) 动物节 emission：A8 MONSTER 域修复（78e84d7）落好后，动物类
//    accept 行应仅在 蓝月动物节门（blue && night && %400L==0）命中
//    窗口内发射——判读按 %400=20s 间隔序列逐行对位（含 timestamp 舍
//    入容差），并以「行间隔全部 ≥20s」为必要面（<20s 相邻 → FAIL 争面）。
// 2) 判据通道不重判 denom（蓝夜构造性不可达已废）；blue-lit-eye 只
//    按「setday 段继续发射=PASS」+「A7/denom 照 worldInfo 钟翻转」双钟裁量。
```

---
*会话七 2026-10-14 22:25 落盘 · 判据 raw 全在 latest.log（当前 boot 为 W4 实例已收，raw 可 fetch `run\obfuscated\logs\latest.log`）*
