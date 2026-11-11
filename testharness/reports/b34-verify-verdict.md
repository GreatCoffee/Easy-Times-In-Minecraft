# R196 女巫游荡（WitchRoaming）＋ 敌意玩家目标（TargetIfHostileToPlayers）对位验证 **W-B34 判窗**（B-34 正本，HEAD `a7a37f3`）

> **HEAD**：`a7a37f31be81b94c897d9a7992fe103ef4cc2eb4`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-11T09:42:22Z` 早于窗起 `2026-11-11T12:07:53Z`，窗讫同值。
> **jar**：`build/libs/etim-1.0.0.jar` **1,136,316 B**，SHA256 `EA0C7B4946F386E508EF46448DB2E8FCEB9DBF014B7662B268F878F9C743C8DA`（起收同值，＝任务书钉值＝驱动 `EXPECTED_SHA`）。
> **dev/sources**：1,114,632 B `EC0896A4FBB7C8AE7B3F9CC5FD655EFF0EAB51650B6AF22C8DE37664DF24E95B`（mtime `2026-11-11T09:42:21Z`）；1,039,943 B `307D6DDF5833333D13C554BF4E73F87999933848F4920723C3084402841E76CC`（`09:42:22Z`）。二者早于窗起，窗内未动。
> **refmap**：classes **100** / entries **228**（dual 456，双份同）；**mixins**：**98** + 10 client；`mkCounts().ok=true`。
> **窗口**：三 boot —— `Done (6.034s)`（b1:2350，20:08:11）、`Done (5.823s)`（b2:2351，20:21:51）、`Done (5.628s)`（b3:2350，20:23:44），mixinFail **0×3**；三停服 `exitCode=0 exited=true build=true`，`BUILD SUCCESSFUL in 13m 40s`（b1）/ `1m 52s`（b2）/ `1m 5s`（b3）。总窗 12:07:53Z → 12:24:34Z（**16m 41s**），EXIT=0。判窗世界 `w-b34v`（驱动自建，跑讫保留），假人 `ETIM_F7`。
> **判决**：**W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS｜W5 PASS**；`bad=0`，EXIT=0；A 0、B 0、D 0、C 2。
> **判据源**：`testharness/player/f11-b34-verify.js`（未改动，`node --check` 绿）、`build-logs/f11-b34-verify.json`（3,795 B）、`-b1.out` 862,025 B / `-b2.out` 850,090 B / `-b3.out` 515,687 B / `-stdout.out` 82,538 B。
> **报告字节规格**：`9903 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，75 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** boot 卫生 | 三 boot `Done (` ∧ mixinFail=0×3 ∧ 三停服 exitCode=0 ∧ build=true | `Done (6.034s)`(b1:2350) / `Done (5.823s)`(b2:2351) / `Done (5.628s)`(b3:2350)；`mixinFail=0`×3；`stopBoots` 3 条 `{exitCode:0,exited:true,build:true}` | **PASS** |
| **W1** 女巫游荡（a1） | `roamStart≥1` | `n=1`、`probes=14`；start `b1:5032`（`dist=4.07 path=false spawn=(-67,67,240)`） | **PASS** |
| **W2** 狼狂化（a2） | `wolfStart≥1`（bites 只记） | `n=1`、`bites=122`、`probes=0`；start `b1:5372`（`target=EntityPlayerMP#191 hostile=true cd=862 tamed=false`） | **PASS** |
| **W3** 狼受击面（a3） | `bites≥1` | `bites=132`（`prot` 66 + `dmg` 66）；`n=0 probes=2`（AI start 由 W2 独立证）；`b45=70 b50=60` 只记 | **PASS** |
| **W4** 旗断双零（b3） | `roamN=0 ∧ wolfN=0` | `roamN=0 wolfN=0 bites=0`；b3 全档 `[AILog] roam` 0 条、`[AILog] wolfhostile` 0 条 | **PASS** |
| **W5** 钉值 | 双 `[PIN]` 同 sha＝`EA0C7B49…C743C8DA` ∧ `mk.ok` | `12:07:53.795Z`（stdout:1）与 `12:24:34.631Z`（stdout:尾）同 `EA0C7B49…`；MK 双侧 100/228/456、98+10、`ok=true` | **PASS** |
| **props** | 归一化起收同 ∧ level-name 还原 | `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7` → 同值；`level-name` `w-b30v`→`w-b30v`；原始 `35EBC027…CC81A2`→同值（只记不判） | **PASS** |
| **统计观察** | 只记不判 | `a1wb=0`（wanderback 0 次）、`a2probes=0`、`b3bites=0`；b3 另有 176 条 `src=outOfWorld` / 6 条 `inWall` / 1 条 `indirectMagic` 的扫场伤害（非白咬） | 记录 |

## §2 判行摘录

**W1 女巫游荡（a1，entity=EntityWitch#2708）**
- `[20:08:29] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] roam src=witch probe-in inv=16 spawnSet=true day=false flag=true entity=EntityWitch#2708`（b1:5023）
- `[20:08:42] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] roam src=witch start dist=4.07 path=false spawn=(-67,67,240) entity=EntityWitch#2708`（b1:5032）
- `[20:09:11] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] roam src=witch probe-in inv=224 spawnSet=true day=false flag=true entity=EntityWitch#2708`（b1:5050，a1 窗口最后一条探针）

**W2 狼狂化（a2，entity=EntityWolf#2756，血月＋世界年龄夜窗）**
- `[20:20:29] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] wolfhostile src=wolf start target=EntityPlayerMP#191 hostile=true cd=862 tamed=false entity=EntityWolf#2756`（b1:5372）
- 咬击行（`[DamageLog] … target=ETIM_F7#191 src=mob …`）b1 计 **122** 条，首条 `[20:20:33]` 区段之后连续至 a2 窗口末。

**W3 狼受击面（a3，非血月 boot）**
- `[20:22:09] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] wolfhostile src=wolf probe-in inv=16 hostile=false cd=0 flag=true entity=EntityWolf#2677`（b2:4979）
- `[20:22:11] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] wolfhostile src=wolf probe-in inv=32 hostile=false cd=0 flag=true entity=EntityWolf#2677`（b2:4986）
- `[20:22:18] [Server thread/INFO] [Easy Times In Minecraft]: [DamageLog] prot target=ETIM_F7#191 src=mob natural=0.000 armor=0.000 potion=25.000 total=25.000 piercing=0.000 wear=0.000 [server]`（b2:4998，首咬）
- `[20:23:24] [Server thread/INFO] [Easy Times In Minecraft]: [DamageLog] dmg target=ETIM_F7#191 src=mob raw=6.000 armorIn=6.000 armorOut=0.000 absorption=0.000 final=0.000 [server]`（b2:5226，末咬）

**W4 旗断双零（b3）**
- `[AILog] roam …` **0 条**、`[AILog] wolfhostile …` **0 条**（b3 全档 515,687 B）；`[DamageLog] … src=mob … target=ETIM_F7` **0 条**（b3 的 14 条 `target=ETIM_F7` 伤害行全为 `outOfWorld`/`inWall`/`indirectMagic`，属 kill 扫场）。

**W5 钉值两行**
- `[PIN] {"at":"2026-11-11T12:07:53.795Z","releaseSha":"EA0C7B4946F386E508EF46448DB2E8FCEB9DBF014B7662B268F878F9C743C8DA","mk":{"refmapResources":{"classes":100,"entries":228,"dual":456},"refmapTmp":{"classes":100,"entries":228,"dual":456},"manifest":{"mixins":98,"client":10},"ok":true}}`（stdout:1）
- `[PIN] {"at":"2026-11-11T12:24:34.631Z","releaseSha":"EA0C7B49…C743C8DA","mk":{…同值…}}`（stdout 尾）

## §3 登记项

- **C-B34-1（props 基线跨批漂移未定键）**：b33 判窗基线 `9903BDCD…B8D57A`，本窗起收均为 `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`（驱动口径：去全部 `#` 注释行与空行后 LF 连接取 sha256；与 b31/b33 只用「时间戳注释行」过滤的口径不同，两口径不可跨批比绝对值）。起收同契约逐轮成立；漂移发生在 b33 收口后～b34 烟测起窗前，`run/` 不被 git 跟踪，无法定键。原始 hash 起收同 `35EBC027361B0A6976214EE2877F73D420C1A878C6E5DA0C7875D95872CC81A2`（只记不判）。
- **C-B34-2（W3 采用 bites 判据，AI start 空缺面）**：a3 `n=0`（`[AILog] wolfhostile … start` 0 条），仅 2 条 `probe-in`（`hostile=false cd=0`）。按主会话 r3/r4 口径，受击面的 AI start 由 W2 狂化面独立证明，本窗 hurt 面以 `bites≥1` 判定；`bitesAfter45=70`、`bitesAfter50=60` 表明咬击持续超过 R196 `:184-195` 的清除点（受击后 ~45–50 s），即 **R196 countdown 清除面被 `HurtByTarget` 复仇链遮蔽**——本窗采证，不计 bad。
- **观察·扫场噪声**：b3 的 `[DamageLog]` 14 条 `target=ETIM_F7` 全为 `src=outOfWorld`（176 条 dmg 中的一部分）/`inWall`（6）/`indirectMagic`（1），来自 `kill @e` 与场地复位，非狼咬；bites 判据已按 `src=mob` 过滤，b3 计 0。
- **观察·a1wb=0**：游荡臂未出现 `[AILog] wanderback` 行；`wanderback`（返巢）面不在本判窗判据内，只记。
- **观察·保护面**：`protectBot()` 三药水（resistance/regeneration/absorption 4 级 9999 s）每臂重下；b2 首咬 `potion=25.000 total=25.000`、后续 `final=0.000`，bot 全程存活（无 `slain by`）。
- **停服面**：3 次停服均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 13m 40s / 1m 52s / 1m 5s`（b1 时长含 a2 的 600 s 等待，非 reheap）。
- **异常面**：stdout 无 `[fatal]`；驱动未改动；窗内未改产品码、未 build。
- **世界面**：`run/w-b34v` **保留**（28 文件 / 3,617,012 B）；`run/` 下 w-b* 共 43 个目录，均未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash-reports **23→23**、HEAD `a7a37f3` 窗内 **0 提交**；`git status` 仍为 B-34 未提交的 ` M`×3 / `??`×若干（窗内未动）。

## §4 收口清单

- **jar 起收同**：1,136,316 B `EA0C7B4946F386E508EF46448DB2E8FCEB9DBF014B7662B268F878F9C743C8DA`，mtime `2026-11-11T09:42:22Z` 前后一致（**0 rebuild**）。
- **dev / sources 窗内未动**：1,114,632 `EC0896A4…DF24E95B`（`09:42:21Z`）、1,039,943 `307D6DDF…8402841E76CC`（`09:42:22Z`）。
- **cfg 起收同**：49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（三 boot 分别置旗开/旗断与 `moonStateOverride`，期末由驱动回写原值）。
- **props**：归一化 `FA0B6FAB…B89733C7` 起收同 ∧ `level-name=w-b30v` 还原；原始 `35EBC027…72CC81A2` 只记不判（C-B34-1）。
- **MK 起收同**：refmap 100/228（dual 456，双份同）、mixins 98+10、`ok=true`。
- **世界面**：`run/w-b34v` 保留（28 文件 / 3,617,012 B）；既往 42 个 w-b* 目录未删。
- **互通面**：本窗 r1 即绿，无重跑；判值与烟测 r4 同形（`a1 n≥1`、`a2 bites 122`、`a3 bites 132>0`、`b1 双零`、`propsNorm` 同值），仅 `w3` 由「smoke 的 bites≥1」升级为「verify 的 bites≥1 + b45/b50 采证」。

## 文尾

- 报告字节：`9903 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，75 行`。
- 三 SHA：jar `EA0C7B4946F386E508EF46448DB2E8FCEB9DBF014B7662B268F878F9C743C8DA`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`。
