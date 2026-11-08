# R196 需求 AI 双臂（SeekFoodIfHungry／SeekWaterIfThirsty，共用 NeedBase）· **W-B23 判决**（B-23 批，HEAD `b0240ba`）

> **HEAD**：`b0240ba39c5ac88a42036d210fff29e94bff8bbf`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,074,388 B**｜SHA256 `CBF0D7F5620C46F0655B7DD825AB333FD2407E150B7F5D42F3DC05D02EE3F2A1`｜MD5 `4DA3D54B8896133DF93BE6564113C240`（起收同值）
> **dev/sources**：1,053,542 B `C6DD3AF8…`／980,384 B `C171416C…`（起收同值）
> **refmap**：classes **94** / entries **212**（dual 424，双树同）｜**mixins**：**91** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.482s)`／`Done (5.342s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 3m 22s／1m 10s）｜单假人 `ETIM_F7`｜判窗世界 `w-b23v`（驱动自建；`w-b22v` 保留不动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 REPORT｜W4 ✓**（A 0／B 0／D 0／C 4）
> **判据来源**：本窗 canonical run（驱动 3 处工装补强见 §3 C-B23-1／C-B23-2，未触产品码、未动判值口径）
> **报告字节规格**：`9,315 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 1｜74 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** 双 boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2＋起收 pin 同 | b1 `Done (5.482s)!`（b1:2338，13:50:10）／b2 `Done (5.342s)!`（b2:2339，13:53:33），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 3m 22s`（b1:4241）／`in 1m 10s`（b2:3804）；两次 `[PIN]` 同 releaseSha `CBF0D7F5…`、同 mk 94/212/424＋91+10 | ✓ |
| **W1** seekwater | 3 cow water=0.2 置于池边，60 s 窗内 ≥1 `[AILog] seekwater … start` 行 | 窗内 **3 行**（JSON）：`EntityCow#2019`×2、`#2020`×1；日志档共 **5 行**：b1:3706 `#2018`、b1:3707 `#2021`、b1:3730 `#2019`、b1:3743 `#2019`、b1:3759 `#2020`，全 `start speed=1.0`；probe-in 旁证 321 行 | ✓ |
| **W2** seekfood | 3 cow food=0.2 置于草场，60 s 窗内 ≥1 `[AILog] seekfood … start` 行 | 窗内 **3 行**（JSON）：`#2038`／`#2041`／`#2039`；日志档共 **4 行**：b1:3903 `#2040`、b1:3906 `#2038`、b1:3944 `#2041`、b1:3969 `#2039`，全 `start speed=1.0` | ✓ |
| **W3** desperate 支 | 2 cow food/thirst=0.05 于 5×5 石板，45 s 窗；零行亦 REPORT | **0 start 行**（REPORT）；probe 证门可达：b1:4076 `seekfood probe-in inv=3984 need=0.0400 near=false flag=true entity=EntityCow#2058`、b1:4085 `need=0.0350 … #2057`；b1:4084 `[AILog] livestock unwell|hungry|hungry-desperate food=0.04 … #2057`／b1:4087 同形 `#2058` | REPORT |
| **W4** 旗断面 | boot 2 `livestockNeedsR196=false`＋40 s → `start` **0 行** | b2 全档（3,807 行）`seekwater|seekfood` **0 行**、` start ` 仅 1 处为 `Preparing start region for level 0`（b2:595，非面行）、probe-in **0 行** | ✓ |

## §2 判行原文

**W1 · seekwater（5 行，含窗内 3 行）**
- `[AILog] seekwater start speed=1.0 entity=EntityCow#2018`（b1:3706）
- `[AILog] seekwater start speed=1.0 entity=EntityCow#2021`（b1:3707）
- `[AILog] seekwater start speed=1.0 entity=EntityCow#2019`（b1:3730）
- `[AILog] seekwater start speed=1.0 entity=EntityCow#2019`（b1:3743）
- `[AILog] seekwater start speed=1.0 entity=EntityCow#2020`（b1:3759）

**W2 · seekfood（4 行，含窗内 3 行）**
- `[AILog] seekfood start speed=1.0 entity=EntityCow#2040`（b1:3903）
- `[AILog] seekfood start speed=1.0 entity=EntityCow#2038`（b1:3906）
- `[AILog] seekfood start speed=1.0 entity=EntityCow#2041`（b1:3944）
- `[AILog] seekfood start speed=1.0 entity=EntityCow#2039`（b1:3969）

**W3 · desperate 支（0 start，probe 证门可达）**
- `[AILog] seekfood probe-in inv=3984 need=0.0400 near=false flag=true entity=EntityCow#2058`（b1:4076）
- `[AILog] seekfood probe-in inv=4064 need=0.0350 near=false flag=true entity=EntityCow#2057`（b1:4085）
- `[AILog] livestock unwell|hungry|hungry-desperate food=0.04 water=0.98 freedom=0.80 entity=EntityCow#2057 [server]`（b1:4084）
- `[AILog] livestock unwell|hungry|hungry-desperate food=0.04 water=0.83 freedom=0.91 entity=EntityCow#2058 [server]`（b1:4087）

**W4 · 旗断零行**
- b2 全档 `seekwater|seekfood` **0 行**（`Select-String` 0 命中）；` start ` 唯一命中 b2:595 `Preparing start region for level 0`（启动噪声，非面行）

**W0 · 窗面**
- `Done (5.482s)! For help, type "help" or "?"`（b1:2338）｜`Done (5.342s)!`（b2:2339）
- `BUILD SUCCESSFUL in 3m 22s`（b1:4241）｜`BUILD SUCCESSFUL in 1m 10s`（b2:3804）

## §3 冲突分级

- **A 级：0** —— 五臂门位全部落地：正臂（water／food 两路）出 `start` 行，旗断臂零行，desperate 支按任务书归 REPORT。
- **B 级：0** —— 本批零 mixin 注册新增（两条 `addTask` 走既有 `MixinEntityAnimal.<init>@TAIL`，全注入点走 `<init>` 免 remap；`mkCounts().ok=true`，94/212/424＋91+10 起收同）。
- **D 级：0** —— 互通差异为 roll 相位与窗宽抽样，行域与门位不漂（见 §4）。
- **C 级：4**
  - **C-B23-1**（工装·run 1 作废）：首跑 bot 站立点 `STAND(-72,67,242)` 恰在水池 footprint 内，13:48:09–11 三记 `[DamageLog] … target=ETIM_F7#191 src=drown raw=2.000`＋`[DeathLog] ETIM_F7 (191) death`＋`ETIM_F7 drowned`，无重连；A1 已出 5 行 seekwater，但 A2/A3 的 `prod`／`tp` 通道随玩家消失失效 → 中止（杀 node 23248＋java 29152）并重跑。修复：新增 `BOTPOS={x:-70,y:67,z:241}` 干岸站位，`stageArena` 与 A3 回收两处 `tp` 改用之。run 1 快照：`f11-b23-verify-r1-b1.out` 537,810 B／`-r1-stdout.out` 40,316 B。
  - **C-B23-2**（工装·shakedown 遗留）：起手实测 port 2／JVM 1，为主会话 shakedown 遗留服务端（PID 21268，13:43:42 起；其 JSON `stopBoots` 仅 1 条＝boot 2 未停，同 C-B16-6／C-B22-5 型）。处置：shakedown 证据另存 `f11-b23-shakedown.json`（1,817 B）／`-stdout.out`；强停 PID 21268；驱动补 `await stopBoot()`（B1 臂后），本窗 `stopBoots` 收满 **2 条**。连带：props 头部时间戳由 run 1 boot 在 13:47:39 回写，起手 digest `033B0923…` → canonical 起收同为 `580A8398…`（939 B，`level-name=w-b23v` 未变，canonical 窗内零改写）。
  - **C-B23-3**（互通·抽样漂移）：shakedown `a1=6／a2=2／a3=0／b1=0` → 本窗 `a1=3／a2=3／a3=0／b1=0`。正臂行域（`src=seekwater|seekfood`、`entity=EntityCow#…`、`speed=1.0`）与门位（water<0.5／food<0.5、roll 10/40/120）逐项一致；数量差归 60 s 窗内 `nextInt(scale)` 命中相位。
  - **C-B23-4**（口径·行计数与 W3 语义）：日志档行数（sw 5／sf 4）多于驱动 in-window 计数（3／3），因 prod 后 700 ms 才打窗口标记 `k`，早于 `k` 的行不入臂——判定以驱动 verdicts 为准，行锚两者并列。W3 零行非门位破：石板场无草／水可达目标 → `nav.setPath` 不得路径即不发 `start`（`:369-373`），probe 已证 `need=0.0350~0.0400`、`flag=true`、`near=false`（desperate 门被求值）。

## §4 收口五件

- **jar／dev／sources 起收同**：1,074,388 `CBF0D7F5…`／`4DA3D54B8896133DF93BE6564113C240`；dev 1,053,542 `C6DD3AF8…`；sources 980,384 `C171416C…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name=w-b23v`）。
- **MK 起收同**：refmap 94/212（dual 424）＋mixins 91+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `b0240ba` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAISeekNeedBase.java` 05:16:56Z、`ETIMEntityAISeekWaterIfThirsty.java` 05:17:13Z、`ETIMEntityAISeekFoodIfHungry.java` 05:17:24Z、`MixinEntityAnimal.java` 05:17:41Z、`ETIMLivestockEvents.java` 05:19:15Z）均早于本窗起点 05:49Z；`git status` src 侧仍为 ` M MixinEntityAnimal.java`／` M ETIMLivestockEvents.java`／`?? ETIMEntityAISeekFoodIfHungry.java`／`?? ETIMEntityAISeekNeedBase.java`／`?? ETIMEntityAISeekWaterIfThirsty.java`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b23v` 保留（17 文件／3,506,409 B）；`run/w-b22v` 未动。
- **互通（vs shakedown `build-logs/f11-b23-shakedown.json`）**：a1 6→3、a2 2→3、a3 0→0、b1 0→0；正臂行域与门位逐项同（§3 C-B23-3），差异全部由窗内 roll 相位解释，**非判值偏差**。

> 正本：`testharness/reports/b23-verify-verdict.md`｜byte 五项：`9,315 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 73（split 74）`
> SHA-256 甲（全档零位）`C584EFDC5CFCC33586AAA7EC989C3B45876EFB692431582E74767724992B62AA`
> SHA-256 乙（LF 归零零位）`C584EFDC5CFCC33586AAA7EC989C3B45876EFB692431582E74767724992B62AA`
> SHA-256 丙（行链零位）`CB23E6B6F6ACAC1A68D74B74A3D19D115BAD464C5EAE8A0E1C8AE99B14442EB0`
