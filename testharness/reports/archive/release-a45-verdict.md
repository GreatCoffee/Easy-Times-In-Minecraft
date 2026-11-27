# 发布级验收尾巴 · A4/A5 复验判决（R-E 定谳面 × 发布 jar）

**基线（钉死）**：`63d4f80`（= `53d3fef` + comment-only）｜jar **326,788 B @ 2026-10-21 18:49:58**｜SHA256 `7D3A503F99B8F0C6E1A2783935502FC2E4C6E3C57C5CCE8519A47ED2066E573A`｜`src/main` 零改动（`git status --porcelain src/main` 空）｜**全程未 rebuild**
**轮次**：2026-10-21 20:07–20:18（三次起服：R1–R9 首轮 / R5 重跑轮 / 收口轮）
**服务端**：`run/obfuscated-server`（25565 / `testw2h` / seed `etim27` / RCON 25575）｜etim 由 classpath 注入 `build/libs/etim-1.0.0.jar`（`classpath append … mtime=18:49:58`）
**客户端**：`gradlew -I testharness/obfclient-fix.init.gradle runObfClient -x jar -x reobfJar`（19 mod 全量，玩家 `Developer`；`-x jar -x reobfJar` = 只读钉死件，日志实执行任务仅 `prepareObfModsFolder / restoreCompatMods / prioritizeCoremods / runObfClient`）
**判据源**：R1–R9 = HUD 渲染读数（`ETIMDebugOverlay`，约束 9 纯客户端面豁免：用户肉眼转述 + 会话七记录）；R10–R11 = 工装客观补证
**编码注记**：本文件 UTF-8（无 BOM），沿用 `batch3-wd-verdict.md` / `batch4-m-verdict.md` 惯例——GBK 无法表示判据符 `✓/✗`，若强行转码会把判据行打成 `?`，反而自毁 A4 判面。

---

## ① 判决类清单（2 类）

| # | 判据类 | 终态 |
|---|---|---|
| A4-HUD | `zh_cn.lang` 重写（`052d8f5`）后的运行渲染面无 `?`（U+FFFD 渲染态）——三同源面：HUD 标签行 / `/etest` 反馈 / `/state` 反馈 | **PASS**（R7 / R8 / R9 + R10 补证） |
| A5-REACH | reach 谓词换 `ETIMMining.isEffectiveAgainstBlock`（补9 定谳）后当前发布 jar 的 HUD 双读数；重点玻璃回归探针 | **PASS**（R1 主探针 3.50 ✓ + R2/R3/R4/R5/R6 全对） |

---

## ② 逐方法核讫表（R1–R11）

判据行一律为 HUD 原文数值；`体点` 行仅作站位自洽参考（见 C3）。

| # | 探针（站位 / 手持 / 目标） | 判据行原文 | 期望 | 判 |
|---|---|---|---|---|
| R1 | 玻璃回归主探针：`/tp -38.5 80 237.9 180 0`｜钻石镐｜`glass @-39,81,234` | `方块触及（含工具加成）：3.50 → ✓`；`挖掘：有效工具 ✓ str=48.80 进度/刻0.05 剩余刻21`；`体点-方块中心距离（双原点取近）：3.47`；`眼命中点距离：2.97` | 触及 3.50 ✓（旧 bug 面 = 2.75 无加成） | **PASS** |
| R2 | 有效类对照：`/tp -38.5 80 241.9 180 0`｜钻石镐｜`stone @-39,81,238` | `方块触及（含工具加成）：3.50 → ✓`；`有效工具 ✓ str=48.80 进度/刻0.04 剩余刻26`；`体点 3.40`；`便携带性✗ 需工具✓ 块等级2` | 3.50 ✓ | **PASS** |
| R3 | 无加成对照：同位｜**空手**｜`stone @-39,81,238` | `方块触及（含工具加成）：2.75 → ✗`；`体点 3.40`；`目标（显示射线）：方块 @-39,81,238`（选择射线被 reach latch 拒，overlay 回落显示射线）；`有效工具✗ str=0.00 剩余刻2147483647`；`手持=null` | 2.75（无加成） | **PASS** |
| R4 | 创造：同位｜空手｜同块 | `方块触及（含工具加成）：5.00 → ✓`；`体点 3.40`；`目标：方块`（创造选择放行） | 5.00（**不是** 16.00；F-6-18 双段式还原面） | **PASS** |
| R5 | 怪探针（重跑轮，生存）：`/tp -39.5 82 247.5 180 41`｜铁剑｜1 HP NoAI 僵尸 `-39.5,80,245.5` | `目标：实体 僵尸`；`眼命中盒进入点距离：2.39`；`近战触及（含容差）：3.25 → ✓`；`交互触及（含容差）：3.50`；左键一击死（服务端 `20:17:13 Developer has made the advancement [Monster Hunter]`） | melee 3.25 ✓ + 一击命中 | **PASS** |
| R6 | 火球探针：`/tp -39.5 80 259.5 180 9`｜铁剑｜零速火球 `-39.5,80.5,255.5` | `目标：实体 火球`；`眼命中盒进入点距离：2.53`；`近战触及（含容差）：4.50 → ✓`；`交互触及（含容差）：2.75` | melee 4.50 ✓（3.0 基 + 2.0 火球 + 0.75 剑 + 0.25 容差；y 同高无仰角项） | **PASS** |
| R7 | HUD 全行扫 `?` + tooltip 面 | 无 `?` 字符。逐行：`饥饿诊断：食物19 饱和度0.00 疲劳=2.41`／`双池：饱食19 营养=19 饥饿池2.66`／`经验：总量=192700 等级=194（负债0）`／`饥饿门：合成✓ 放置✓ 冲刺✓ 空手✓`／`目标…`／`眼命中…`／`体点…`／`方块触及…`／`挖掘：有效工具… str=… 进度/刻… 剩余刻…`／`便携带性… 需工具… 块等级… 手持=…`。背包悬停：新木镐 tooltip 无 `?`、**无品质行**；另 5 号位铁剑同样无品质行（F-9-19 现状延续） | 全行无 `?` | **PASS** |
| R8 | `/etest food 6 6` 聊天反馈 | `已设双池：饱食6 营养=6（上限20 点）`（重点：原断点行「饱?…营养=…（上?…）」已全清） | 无 `?` | **PASS** |
| R9 | `/state` 聊天反馈 | `蛋白质112812 / 160000（70%）`／`必需脂肪112812 / 160000（70%）`／`植物营养112812 / 160000（70%）`／`胰岛素抵抗0 / 192000（无）`／`饱食5 / 20`／`营养6 / 20`／`饥饿池1.595 / 40.0`／`死亡结算total=192700 stale=0 pending=0`（原断点「查?ETIM」= usage 行未触发；状态面全中文） | 无 `?` | **PASS** |
| R10 | 发布 artifact 内 `assets/etim/lang/zh_cn.lang` 解出复扫 | zip 条目 = `assets/etim/lang/zh_cn.lang`，uncompressed **3925 B** / compressed 1859 B；严格 UTF-8 解码（`throwOnInvalidBytes=true`）**OK**，U+FFFD 计数 **0**；键面清点：全文 74 键｜`etim.debug.*` **18**｜`commands.*` **9**（`commands.etest.*` 6 = health_set / level_set / usage / food_set_pool / food_set_bar / debt_set；`commands.state.*` 3 = usage / no_player / not_attached）全在 | 3925 B / 0 U+FFFD | **PASS** |
| R11 | 客户端 latest.log 的 lang/资源载入异常扫描 | `/ERROR]` 共 23 行：Apache Maven 目录格式 2 行、FML 签名缺失 1 行、fernflower 反编译 20 行 —— **零条** lang / 资源包载入失败；`Reloading ResourceManager: Default, FMLFileResourcePack:Forge Mod Loader, FMLFileResourcePack:Minecraft…` 正常；`ETIMDebugOverlay static init ok (toggle default = GRAVE)` 在案 | 无 lang/资源异常 | **PASS** |

**A5 定谳对照（补9 直击案闭合）**：玻璃属 `getHarvestTool=null`，旧谓词 `getDestroySpeed>1.0F` 在该类方块上背离 R196 表（==1.0 ⇒ 无加成 ⇒ 2.75）；当前发布 jar 读 **3.50 ✓**，与 R2 石头行同值，谓词断裂面已消失。

---

## ③ 冲突分级

### C1（工装面 · 非缺陷）R5 首轮在创造态测量，读数作废
- 首轮 图5：`近战 5.25 / 交互 5.25` = `creativeReach 5.0 + reachServerTolerance 0.25`；服务端日志互证 `20:11:49 Set own game mode to Creative Mode` → `20:12:03 Teleported … -39.5, 82.0, 247.5`（R5 落在创造窗内）→ `20:12:31 Set own game mode to Survival Mode`。
- 首轮「左键打不着」同理：原几何射线进盒 **3.45** > melee 3.25（生存口径），命中被合理拒绝；同时显示射线行说明实体选择未成立。
- 处置：僵尸移近至 `-39.5,80,245.5`（2 格外），生存态重跑 → 2.39 / 3.25 ✓ / 一击死。**不影响定谳**，记录为工装流程缺陷（步 4→5 之间必须 `/gamemode 0`）。

### C2（工装面 · 非缺陷）`run/obfuscated/mods` 起手为陈旧 jar
- 开工核验：`run/obfuscated/mods/etim-1.0.0.jar` = **324,643 B @ 2026-10-20 20:45:27**（pre-F-15-F1），与任务书钉死的 326,788 B @ 18:49:58 不符；钉死件仅存于 `build/libs/etim-1.0.0.jar`。
- 处置：**未 rebuild**。以 `-x jar -x reobfJar` 启动客户端，由 `testharness/obfclient-fix.init.gradle` 的 doFirst 从 `build/libs` 原样同步（日志 `[etim-harness] copied 326788B etim jar into run/obfuscated/mods`），启动前后 `build/libs` SHA256 不变（`7D3A503F…6E573A`）；服务端直接以该 `build/libs` 件走 classpath。钉死件另备份 `testharness/mods-hold/pinned-53d3fef/etim-1.0.0.jar`。

### C3（判据口径 · 记录）R1 体点 3.47 而非 checklist 的 ≈3.40
- 站位 z=237.9 对玻璃柱中心 z=234.5 = 3.40 平距；`体点-方块中心距离` 为双原点取近，含 0.07 的落点/眼高差 → 3.47。判据行是 `方块触及 3.50 → ✓`（3.47 ≤ 3.50），体点行只作站位自洽参考，不构成偏差。

### C4（工装面 · 记录）服务端在客户端退出瞬间两次终止
- 首轮 / 重跑轮均在 `Developer left the game` 同一秒失去 JVM（无 `Stopping server`、无 `hs_err`、无 crash-report）；读数在退出前已全部录得，不影响判据。收口轮起服正常，`/stop` 归档 `Saving worlds → Stopping server` 完整。

**FAIL 计：0。**

---

## ④ 伪代码建议

无（零 FAIL）。

---

## ⑤ 环境终态（逐项回读）

| 项 | 终值 |
|---|---|
| `gamerule doMobSpawning / doDaylightCycle / doWeatherCycle` | **true / true / true**（收口回读）；`keepInventory=false`；`time set 1000` |
| `moonStateOverride` | **=（空）**；`zombieDigAI=true`；`devTools=true`（客户端 `debugRayLength=8.0`、`blockReachBase=2.75`、`reachBonusTool=0.75`、`creativeReach=5.0`） |
| 25565 / 25575 | **无监听**（仅 `TimeWait`），服务端 `Done (1.058s)` 起、`20:18:18 Stopping server` 收 |
| jar 指纹复验 | **326,788 B @ 2026-10-21 18:49:58**｜SHA256 `7D3A503F99B8F0C6E1A2783935502FC2E4C6E3C57C5CCE8519A47ED2066E573A`（`build/libs` 与 `run/obfuscated/mods` 逐字节同源） |
| `src/main` | 0 改动；HEAD = `63d4f80` |
| 场景清理 | `fill -56 80 234 -24 84 266 air`（6 块测试柱已清）；y=79 石台保留；实体清零（僵尸 / 火球 / 腐肉） |
| crash / hs_err | 无 |
| 进程 | java 仅 Gradle daemon ×3（9932 / 12864 / 19152，非游戏进程） |

---

## 附：落盘日志与工装

- `build-logs/a45-client.out` —— 首轮客户端（20:07–20:14，R1–R4/R6–R9 读数窗）
- `build-logs/a45-client2.out` —— R5 重跑轮客户端（20:16–20:17）
- `build-logs/a45-client-latest.log` —— 客户端 `latest.log` 副本（R11 判据源）
- `build-logs/a45-server-run1.log` / `run2.log` / `run3.log` —— 三次起服服务端日志（run1 = 首轮，run2 = R5 重跑，run3 = 收口）
- `testharness/mods-hold/pinned-53d3fef/etim-1.0.0.jar` —— 钉死件备份
- 摆场：石柱 `-39,80..81,238`（R2）／玻璃柱 `-39,80..81,234`（R1）／垫脚柱 `-40,80..81,247`（R5 抬升 2 格，使 `heightAdvantage=0.75`）；y=79 石台 `-56..-24 / z=234..266`

**签署**：会话七 ｜ 基线 `63d4f80`（jar = `53d3fef` 件）｜ A4-HUD **PASS**／A5-REACH **PASS** ｜ 核讫表 **11 行全判** ｜ FAIL **0**
