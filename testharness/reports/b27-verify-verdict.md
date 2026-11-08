# R196 被捕食回避臂（EntityAIAvoidPotentialPredators · 四畜座 task 2）· **W-B27 判决**（B-27 批，HEAD `8e5adcc`）

> **HEAD**：`8e5adcced3fd77778c23b968e82c48614eb7979c`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar；jar mtime 10:29:33Z 早于窗起点 11:19Z）
> **jar**：`build/libs/etim-1.0.0.jar` **1,093,690 B**｜SHA256 `09DA2665EBC8208DB0B71D1C438A2A3281473C98C6EB7AA8B6CE0580F179754E`（起收同值）｜MD5 `976C45434A8F7B2DB80BB64A77BCE8EB`
> **dev/sources**：1,072,623 B `3317063724707AAA…`／997,359 B `8C76F1958F1B9FD2…`
> **refmap**：classes **96** / entries **215**（dual 430，双树同）｜**mixins**：**93** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.403s)`／`Done (5.772s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 5m 30s／1m 7s）｜单假人 `ETIM_F7`｜判窗世界 `w-b27v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓**（A 0／B 0／D 0／C 6）
> **判据来源**：本窗单跑（驱动 1 处工装补强见 §3 C-B27-5，未触产品码、未动判值口径）
> **报告字节规格**：`8,304 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 11 / ✗ 1｜73 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.403s)!`（b1:2342，19:19:29）／b2 `Done (5.772s)!`（b2:2343，19:25:02），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 5m 30s`（b1:4271）／`in 1m 7s`（b2:4424）；三条 `[PIN]`（`11:19:14.523Z`／`11:24:45.911Z`／`11:25:53.859Z`）同 releaseSha 同 MK | ✓ |
| **W1** zombie 捕食位 | cow 场内＋zombie `{NoAI:1b}` → ≥1 条 `avoidpred … start`，`pred=1 speed=1.0` | **2 行**：`src=cow start pred=1 speed=1.0 entity=EntityCow#2009`（b1:3561、b1:3601）；同臂 probe 46 行 | ✓ |
| **W2** wild-wolf 捕食位 | cow＋`wolf {NoAI:1b}`（走 `!isChild && !isTamed` 位）→ ≥1 条同型 start | **2 行**：`src=cow start pred=1 speed=1.0 entity=EntityCow#2011`（b1:3851、b1:3856）；同臂 probe 45 行 | ✓ |
| **W3** 孤 cow 负镜像 | 无捕食者 → `avoidpred … start` **0**（probe 存在即证臂活跃） | start **0**；probe 25 行（`crowded` 无关，纯 predator 面） | ✓ |
| **W4** 旗断（boot 2） | 整臂复放 `livestockNeedsR196=false` → start **0**＋probe **0** 双零 | b2 全档 4,427 行 `avoidpred` **0 命中**（cow/zombie 正常召唤、无 `Skipping Entity`）；旗闸 `ETIMEntityAIAvoidPotentialPredators.java:90` 早于 probe 打印（:94-99） | ✓ |

## §2 判行原文

**W1 · zombie 捕食位（两条 start，同牛 #2009）**
- `[AILog] avoidpred src=cow start pred=1 speed=1.0 entity=EntityCow#2009`（b1:3561）
- `[AILog] avoidpred src=cow start pred=1 speed=1.0 entity=EntityCow#2009`（b1:3601）

**W2 · wild-wolf 捕食位（两条 start，同牛 #2011）**
- `[AILog] avoidpred src=cow start pred=1 speed=1.0 entity=EntityCow#2011`（b1:3851）
- `[AILog] avoidpred src=cow start pred=1 speed=1.0 entity=EntityCow#2011`（b1:3856）

**W3 · 孤 cow 负镜像（0 start，probe 旁证）**
- a3 窗 `avoidpred … start` **0 行**；同窗 probe 25 行

**W4 · 旗断双零**
- b2 全档 4,427 行 `avoidpred` **0 命中**（start 与 probe-in 均为 0）

**W0 · 窗面**
- `Done (5.403s)! For help, type "help" or "?"`（b1:2342）｜`Done (5.772s)!`（b2:2343）
- `BUILD SUCCESSFUL in 5m 30s`（b1:4271）｜`BUILD SUCCESSFUL in 1m 7s`（b2:4424）

**旁证 · b1 全档 probe 面（非判集）**
- 首条 `[AILog] avoidpred src=cow probe-in inv=16 entity=EntityCow#27`（b1:2366）
- 末条 `[AILog] avoidpred src=cow probe-in inv=2752 entity=EntityCow#2013`（b1:4240）
- b1 全档 probe 合计 172 行；四畜载体的自然刷新种群（cow/pig/chicken）也在打 probe，臂窗内计数见 §1

## §3 冲突分级

- **A 级：0** —— 五臂硬门全成立：两捕食位各 2 行 start 且 `pred=1 speed=1.0` 语义齐、孤牛 0 行、旗断双零、boot/停服面全绿。
- **B 级：0** —— 本批零新 mixin 注册（`mixins.etim.json` 仍 93+10），refmap 96/215 dual 430 双树同；新类只挂既有四畜座。
- **D 级：0** —— 互通差异仅为 id 与 probe 相位，无互读矛盾（见 C-B27-4）。
- **C 级：6**
  - **C-B27-1**（钉值·HEAD 落后）：任务书写 HEAD `f5a72a3`，实测 HEAD 为 `8e5adcc`（B-26 批已提交：`mob B-26 batch: R196 crowded-open-space arm …`）。jar 钉值 `1,093,690 B / 09DA2665…` 与盘上逐字段相符、mtime 10:29:33Z 早于窗起点 11:19Z，包面未被换；仅 HEAD 文本需勘误。
  - **C-B27-2**（判读·环境 mob 噪声）：`avoidpred` probe 行对**所有四畜载体**开放，判窗场地周边的自然刷新 cow/pig/chicken 也在打 probe（b1 全档 172 行，其中臂窗内 46／45／25）。判集只认 ` start ` 行且行内 `entity=` 与召唤目标对得上，故噪声不污染判值面；登记备查。
  - **C-B27-3**（工装·窗长）：驱动 W1／W2 各 120 s、A3 60 s、b1 40 s（任务书 W1／W2 写 90 s）。判门为「≥1」与「=0」，窗长拉长只增机会不缩门；canonical（judge v1 shell）与 smoke r1 同用此驱动，故保留以维持互通可比性。
  - **C-B27-4**（互通·id 与相位）：smoke r1 `a1=2 #2008／a2=2 #2010／a3=0/25／b1=0/0`；judge v1 shell `#2047／#2050`（probes 47／45）；本窗 `#2009／#2011`（probes 46／45）。行语义（`src=cow start pred=1 speed=1.0 entity=#`）逐字段一致，id 与 probe 计数随实体分配与窗相位漂移，非判值偏差。
  - **C-B27-5**（工装·1 处补强）：`f11-b27-verify.js` 尾部由 `process.exitCode = …` 改为 `setTimeout(() => process.exit(bad ? 2 : 0), 800)`，并把 `.catch` 改 async——补 `bot.quit()`／`srv.stop(20000)`／props-cfg 回写／`process.exit(1)`（mineflayer socket 不释放，B-16 C-B16-6 起第四次同型）。世界清理已是绝对路径（`path.join(L.ROOT,'run',world)`），本窗未再复现 C-B17-3。
  - **C-B27-6**（PIN·三条同值）：`stampPin()` 在 boot 1 起手、boot 2 起手、终写三处各打一次，故 `f11-b27-verify.json` 内 `pins` 为 **3 条**（B-26 为 1 条，通道不同）。三条 `releaseSha`＝`09DA2665…`、MK＝96/215/430＋93+10 `ok=true` 逐字段同，起收同值成立。

## §4 收口五件

- **jar／dev／sources 起收同**：1,093,690 `09DA2665…`（MD5 `976C45434A8F7B2DB80BB64A77BCE8EB`）／1,072,623 `33170637…`／997,359 `8C76F195…`（窗内 **0 rebuild**）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name` 驱动起收回写 `w-b23v`）。
- **MK 起收同**：refmap 96/215（dual 430）＋mixins 93+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `8e5adcc` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIAvoidPotentialPredators.java` 10:28:44Z、`MixinEntityAnimal.java` 10:29:23Z）均早于窗起点 11:19Z，`git status` 仍为 ` M MixinEntityAnimal.java`＋`?? ETIMEntityAIAvoidPotentialPredators.java`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b27v` 保留（27 文件／3,566,828 B）；`w-b27a`／`w-b26v`／`w-b25v` 未动。
- **互通（vs `build-logs/f11-b27-smoke.json` r1）**：a1 `2`→`2`、a2 `2`→`2`、a3 `0/25`→`0/25`、b1 `0/0`→`0/0`；boots 双 Done、mixinFail 0×2、stopBoots 双 exit 0 两窗同形（id 与 probe 相位差异见 C-B27-4）。

> 正本：`testharness/reports/b27-verify-verdict.md`｜byte 五项：`8,304 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 72（split 73）`
> SHA-256 甲（全档零位）`64897B783AE35BFFEE501752609300753D28F26A7769C6494AB383034100496D`
> SHA-256 乙（LF 归零零位）`64897B783AE35BFFEE501752609300753D28F26A7769C6494AB383034100496D`
> SHA-256 丙（行链零位）`E48AD4C438075060B37AB8AD578F1A806F3691A30CDE14B9B377B97D2314A539`
