# 离水 AI 臂（R196 `EntityAIGetOutOfWater` :1-83 ＋ `EntityAIMovementTask`）· **W-B22 判决**（B-22 批，HEAD `26c96100`）

> **HEAD**：`26c96100b88717b35b45fd1fb3ecf62fcf06449b`（窗内 **0 提交**，起收同 commit；` M src/main/java/io/github/etim/etim/mixins/MixinAbstractHorse.java`／` M src/main/java/io/github/etim/etim/mixins/MixinEntityAnimal.java`／`?? src/main/java/io/github/etim/etim/mob/ETIMEntityAIGetOutOfWater.java` 即本批未入库的 B-22 树）
> **jar**：`build/libs/etim-1.0.0.jar` **1,065,568 B**｜SHA256 `56F0691E4DAA848409DFFE1E8C6679B6EF21F9748C6366E28BFCA992EBF2D625`｜MD5 `ADC525D2BDD265AF01BDD37CFAE42195`（起收同值；与任务书钉值 1,065,205 B / `5E3B7526…` 不符，见 §3 C-B22-1）
> **dev/sources**：1,044,931 B `7FB08E5923812F7D42ABF82E07FCD54BA3AC63BEF75FF914534DFA3417722CAC`／972,676 B `0B2E2EF2CA47B38599E6C9CA958F6C6D2C3DB3DCDEF445B68B2488B60BFAC21E`（起收同值）
> **refmap**：classes **94** / entries **212**（dual 424，双树同）｜**mixins**：**91** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (6.295s)`／`Done (6.227s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 34s／1m 4s）；单假人 `ETIM_F7`；判窗世界 `w-b22v`（驱动自建；`w-b22a` 未动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓**（A 0／B 0／D 0／C 5）
> **判据来源**：本窗第 2 跑（`build-logs/f11-b22-verify.json`，EXIT=0）；第 1 跑因场地盖子作废（§3 C-B22-2），工装 4 处补强见 §3 C-B22-5，未触产品码、未动判值口径
> **报告字节规格**：`8,959 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 7 / ✗ 1｜65 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2＋起收 pin 同 | b1 `Done (6.295s)!`（b1:2339）／b2 `Done (6.227s)!`（b2:2339），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 34s`（b1:4647）／`in 1m 4s`（b2:4441）；两次 `[PIN]` 同 releaseSha `56F0691E…`、同 mk 94/212/424＋91+10（04:39:24.477Z／04:43:05.368Z） | ✓ |
| **W1** boot1 水池臂 | 120 s 窗内 ≥1 条 `[AILog] outofwater … start`（`probe-in` 非判集） | **61 行**（b1:4326 … b1:4611）：`src=cow` **59**（EntityCow#1982 ×29／#1983 ×3／#1984 ×27）＋`src=?` **2**（EntityHorse#1985，b1:4393／b1:4424），全 `speed=1.0`；旁证 probe-in 112 行闸链（`inWater=true` 面）；窗 12:39:42→12:42:16 | ✓ |
| **W2** boot2 旗断 | `livestockNeedsR196=false` → ` start ` **0 行**（probe-in 照打不计） | b2 全档 **4,444 行**、`[AILog] outofwater` 94 行全为 `probe-in`（末行 b2:4410 `src=cow probe-in inv=1504 inWater=true thirst=0.0 … flag=false`），` start ` **0 行** | ✓ |

## §2 判行原文

**W1 · start 面（四例，首/马/末）**
- `[AILog] outofwater src=cow start speed=1.0 entity=EntityCow#1982`（b1:4326）
- `[AILog] outofwater src=cow start speed=1.0 entity=EntityCow#1983`（b1:4356）
- `[AILog] outofwater src=? start speed=1.0 entity=EntityHorse#1985`（b1:4393）
- `[AILog] outofwater src=? start speed=1.0 entity=EntityHorse#1985`（b1:4424）
- `[AILog] outofwater src=cow start speed=1.0 entity=EntityCow#1984`（b1:4611，窗内末条）

**W1 · 闸链旁证（probe-in，非判集）**
- `[AILog] outofwater src=cow probe-in inv=1088 inWater=false thirst=1.0 ridden=false flag=true entity=EntityCow#1984`（b1:4473，12:40:21）

**W2 · 旗断零行**
- `[AILog] outofwater src=cow probe-in inv=1504 inWater=true thirst=0.0 ridden=false flag=false entity=EntityCow#1989`（b2:4410）
- b2 全档 ` start ` **0 行**（4,444 行逐行过滤 0 命中）

**W0 · 窗面**
- `Done (6.295s)! For help, type "help" or "?"`（b1:2339）｜`Done (6.227s)!`（b2:2339）
- `BUILD SUCCESSFUL in 2m 34s`（b1:4647）｜`BUILD SUCCESSFUL in 1m 4s`（b2:4441）

## §3 冲突分级

- **A 级：0** —— 三臂全绿：flag-on 窗内 61 条 start，flag-off 全档 0 条，双 boot/停服/pin 面起收自洽。
- **B 级：0** —— 本批零新 cfg、零新 mixin 注册（EntityAnimal／AbstractHorse 各 +1 行 addTask），refmap 94/212/424＋mixins 91+10 起收同，`mkCounts().ok=true`。
- **D 级：0** —— 互通差异（start 条数与 src 分布）均由场地几何与寻路可得性解释，无判值面互读矛盾（见 C-B22-4）。
- **C 级：5**
  - **C-B22-1**（钉值·任务书与盘上不符）：任务书钉 jar **1,065,205 B** SHA `5E3B7526…`（b22-build2），盘上实测 **1,065,568 B** SHA `56F0691E…`（mtime 2026-11-08T03:21:16Z）；全仓（含 `.worktrees`，排除 run/build/.git）grep `5E3B75|1065205|1,065,205` **零命中**。落件时序：最后一件源码 `ETIMEntityAIGetOutOfWater.java` mtime 03:20:56Z → jar 03:21:16Z（相差 20 s），jar 内含 `io/github/etim/etim/mob/ETIMEntityAIGetOutOfWater.class` ⇒ 盘上 jar 即当前源码最终构建。判窗以盘上 jar 为判基；两次 `[PIN]` 均记 `56F0691E…`，证窗内未换包。**请主会话回填/勘误钉值。**
  - **C-B22-2**（工装·run1 场地盖子，已作废）：run1 的 `buildPool()` 以 `fill PAD 全区 y=67 grass` 铺岸台，把水池 footprint 整体盖死；动物置于 y=66（马高 1.6／牛高 1.4 → 头顶 67.6／67.4 嵌入 y=67 实体块），`[DamageLog] … src=inWall raw=1.000`（12:33:15/17，#1989/#1988）持续掉血、bot `ETIM_F7 drowned`（12:33:22）→ 5 只全灭、probe 自 12:33:17 起静默、**0 start**。判值面未获机会，**非产品 FAIL**。快照：`f11-b22-verify-r1-b1.out` 514,590 B／`-r1-b2.out` 570,349 B／`-r1-stdout.out` 116,533 B／`-r1.json` 2,505 B。
  - **C-B22-3**（工装·run2 边沿卡肉）：修复后岸台改「回」字形，但 summon 点 `[-71,242]` 中心落 `-70.5`，马 AABB 东沿侵入 `x=-70` 岸块 → `src=inWall` 78 行（39 击：Horse#1985 19／#1986 20），12:39:54→12:40:06 共 12 s；两马未死、后续仍 `probe-in`（b1:4445 `inWater=true`），#1985 出 2 条 start。判值面不受影响，登记为场地注记。
  - **C-B22-4**（互通·start 条数与 src 分布）：烟测 r4 `build-logs/f11-b22-smoke.json` b1 `n=2`（全 horse）；本窗 b1 **61**（cow 59＋horse 2）、b2 0。R196 `:16` 的排除面是 `isThirsty()`＝`getWater() < 0.5`：烟测 cow `thirst=0.90015054`、本窗 cow `thirst=1.0`，两者均在排除闸之外，差异来自场地与寻路可得性（旧脏世界 vs 本窗净水池），**非值漂移**。JSON 记 `b1=60` 为落盘时点，日志实际 61 行。
  - **C-B22-5**（工装·驱动 4 处补强，未触产品码）：①`startBoot` 世界清理由相对路径改 `path.join(L.ROOT,'run',world)`（cwd=testharness 会漏删，C-B17-3 同型）；②W1 窗 `sleep(60000)`→`120000`（对齐任务书）；③boot2 c1 臂后补 `stopBoot()`（否则 25565 常驻＋mineflayer socket 不退，C-B16-6 同型）；④尾部改 `process.exit((bad||fails.length)?2:0)`＋catch 补 `bot.quit`／`srv.stop(20000)`／props/cfg 回写。另 run1 后新增：岸台「回」字形 fill＋`tp ETIM_F7 -76.5 68 242.5`（bot 原落水池被溺）。

## §4 收口五件

- **jar／dev／sources 起收同**：1,065,568 `56F0691E…`／`ADC525D2…`；dev 1,044,931 `7FB08E59…`；sources 972,676 `0B2E2EF2…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`、`mobDespawnR196=false` 窗内预设起收同）；props 939 B `E4D977B25622FD40859245EFBB1CA17F2AAE0A5F2D5BB58C0B22E91C40E652B0`（`level-name=w-b22a`，起收同）。
- **MK 起收同**：refmap 94/212（dual 424）＋mixins 91+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `26c96100` 窗内 **0 提交**；产品码 mtime（`MixinEntityAnimal.java` 03:02:50Z、`MixinAbstractHorse.java` 03:03:00Z、`ETIMEntityAIGetOutOfWater.java` 03:20:56Z）均早于本窗起点 04:32Z，`git status` 仍为上述三项。
- **世界**：`run/w-b22v` 保留（17 文件／3,495,061 B）；`run/w-b21v`／`w-b21a`／`w-b22a` 均未动。
- **互通（vs `build-logs/f11-b22-smoke.json` r4）**：b1 start 值 2→61（cow 面由 0 增至 59，horse 面 2 同量级）、c1 0→0；双 boot Done 与停服 exit 0/build 面同；差异归因见 §3 C-B22-4。

> 正本：`testharness/reports/b22-verify-verdict.md`｜byte 五项：`8,959 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 64（split 65）`
> SHA-256 甲（全档零位）`E6FE29363C97B3E0D7A17E30FE1F87EF23DDB7F6C0D3CC0456BB75F528775359`
> SHA-256 乙（LF 归零零位）`E6FE29363C97B3E0D7A17E30FE1F87EF23DDB7F6C0D3CC0456BB75F528775359`
> SHA-256 丙（行链零位）`CD672C8452C050FB77CFAB93D6DA0C7AF5E650A75FD4A95A17CCA3BF51E8E96B`
