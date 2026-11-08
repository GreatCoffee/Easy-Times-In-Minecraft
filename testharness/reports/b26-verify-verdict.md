# R196 拥挤开阔臂（EntityAISeekOpenSpaceIfCrowded 家族 · 四畜 Livestock 座 task 3）· **W-B26 判决**（B-26 批，HEAD `9445c39`）

> **HEAD**：`9445c39b81c7199551074aa097c40616d7be4e25`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,088,629 B**｜SHA256 `04B0D42212A17A1013424F51723A70BE82DD987543CE74596BEBEC5049A08654`（起收同值）｜MD5 `1A8980824C7D26655A809D50C184481E`
> **dev/sources**：1,067,679 B `110B8886…`／993,026 B `AF4113E1…`
> **refmap**：classes **96** / entries **215**（dual 430，双树同）｜**mixins**：**93** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.351s)`／`Done (5.722s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 45s／1m 13s）｜单假人 `ETIM_F7`（spectator）｜判窗世界 `w-b26v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓**（A 0／B 0／D 0／C 6）
> **判据来源**：本窗第 3 跑（r1 场地致伤、r2 密封围栏致零径均作废，见 §3 C-B26-1/2；产品码零改动）
> **报告字节规格**：`9,092 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 1｜69 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.351s)!`（b1:2342）／b2 `Done (5.722s)!`（b2:2343），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 45s`（b1:3983）／`in 1m 13s`（b2:3308） | ✓ |
| **W1** 拥挤位（boot 1） | 4 cow 聚顶 3×3 石顶（roof y70）＋`prod freedom=0.3` → 90 s 窗 → ≥1 条 `seekopen … start` | **4 行** start：b1:3329 `paths=7 dist=4.47 #2021`、b1:3330 `paths=8 dist=6.16 #2019`、b1:3365 `paths=13 dist=8.60 #2019`、b1:3406 `paths=9 dist=5.83 #2021`；同窗 probe-in 90 行（首 b1:3320 `inv=16 freedom=0.3 crowded=true #2018`）；场地零 `src=inWall`、零 `DeathLog` | ✓ |
| **W2** 非拥挤安静 | 1 solo cow 开阔角＋`prod freedom=0.3` → 45 s 窗 → start **0**（probe 漂为诊断位） | start **0**；probe-in 5 行，末条 b1:3951 `inv=80 freedom=1.0 crowded=false #2022`（机制见 C-B26-4） | ✓ |
| **W3** 旗断（boot 2） | 整臂复放 `livestockNeedsR196=false` → start **0**＋probe **0** | b2 全档 3,311 行 `seekopen` **0 命中**（4 只 cow 正常召唤、零 `Skipping Entity`）；旗闸在 `ETIMEntityAISeekOpenSpaceIfCrowded.java:79` 早于 probe 打印（:83-91） | ✓ |

## §2 判行原文

**W1 · 拥挤位四条 start（逐行体：`src=cow start paths=<整数> dist=<两位小数> entity=<Type>#<id>`）**
- `[AILog] seekopen src=cow start paths=7 dist=4.47 entity=EntityCow#2021`（b1:3329）
- `[AILog] seekopen src=cow start paths=8 dist=6.16 entity=EntityCow#2019`（b1:3330）
- `[AILog] seekopen src=cow start paths=13 dist=8.60 entity=EntityCow#2019`（b1:3365）
- `[AILog] seekopen src=cow start paths=9 dist=5.83 entity=EntityCow#2021`（b1:3406）

**W1 · 诊断 probe 行（非判集，含 crowded/freedom 双字段）**
- `[AILog] seekopen src=cow probe-in inv=16 freedom=0.3 crowded=true flag=true entity=EntityCow#2018`（b1:3320）
- `[AILog] seekopen src=cow probe-in inv=80 freedom=1.0 crowded=false flag=true entity=EntityCow#2022`（b1:3951，a2 窗内）

**W2 · 非拥挤零 start**
- a2 窗 45 s 内 `seekopen … start` **0 行**；同窗 probe-in 5 行，末条即上列 b1:3951（`crowded=false`）

**W3 · 旗断双零**
- b2 全档 `seekopen` **0 命中**（3,311 行逐行扫描，start 与 probe-in 均为 0）

**W0 · 窗面**
- `Done (5.351s)! For help, type "help" or "?"`（b1:2342）｜`Done (5.722s)!`（b2:2343）
- `BUILD SUCCESSFUL in 2m 45s`（b1:3983）｜`BUILD SUCCESSFUL in 1m 13s`（b2:3308）

## §3 冲突分级

- **A 级：0** —— 四臂硬门成立：拥挤位 4 行 start、非拥挤位 0 行、旗断双零、boot/停服面全绿。
- **B 级：0** —— 本批零新 mixin 注册（`mixins.etim.json` 仍 93+10），refmap 96/215 dual 430 双树同；新类只挂既有四畜座，不新增 refmap 条目。
- **D 级：0** —— 互通差异（a1 1→4、paths/dist 数值漂）由场地与相位解释，无互读矛盾（见 C-B26-5）。
- **C 级：6**
  - **C-B26-1**（场地·r1 致伤作废）：主会话首跑（17:27）的 pen 为「y68 整层石＋y69 空气＋y70 石顶」，即内净高仅 1 格；4 只 cow 头顶嵌入 y70 → 全程 `src=inWall` 掉血（r1 b1 内 inWall 90+ 行），样本在伤害下取样。判值面虽得 1 行（`paths=14 dist=11.36`），按 B-22 判例（致伤场地不作判基）整跑作废，快照 `f11-b26-verify-r1-{json,b1.out,b2.out,stdout.out}`。
  - **C-B26-2**（场地·r2 密封围栏零径）：把内净高改 2 格、四壁封死、屋顶 5×5 后，4 cow 零伤但 **a1=0**——`startExecuting` 只在 `getShortestPathToFreedom()` 返回非空路径时才打行（:106-113），密封围栏内寻路无解 → 永不出行。这是工装几何缺陷（把「拥挤」做成了「囚禁」），非产品 FAIL，整跑作废，快照 `f11-b26-verify-r2-*`。
  - **C-B26-3**（场地·canonical 定型）：终跑改为「只盖顶、不砌壁」——`fill -74 70 240 -72 70 242 stone` 单层石顶（`canSeeSky=false` → `isCrowdedEntity()` 直接 true）＋ y67..69 清空留出出走路径。结果 a1=4 行、inWall 0、DeathLog 0。**结论：本臂的「拥挤」判据由遮天单独满足，围栏既非必要且会把可行路径清零**；此几何已定型进驱动，后续复跑勿再加壁。
  - **C-B26-4**（判据·W2 触发机制）：`prod freedom=0.3` 只是播种，wellness 管线每轮按 `isCrowded` 加减（`ETIMLivestockEvents.java:272-276`：不拥挤 `+BENEFIT`、拥挤 `+PENALTY`）。solo cow 在开阔地 45 s 内收敛到 `freedom=1.0`（b1:3951 实证），于是 `shouldExecute` 在 :98 的 `freedom > 0.5` 即返回 false——**a2 的 0 行成立，但实际拦截它的是自由度高门，而非任务书假设的「startExecuting crowded cut（:107）」**。该语义在稳态下不可观测（非拥挤时 freedom 必然上行越过 0.5），仅登记为机制注记，不开 D。
  - **C-B26-5**（互通·场地与相位）：smoke r1 `a1=1／a2=0／b1=0` vs 本窗 `4／0／0`；`paths`／`dist` 数值（smoke 14／11.36；本窗 7／8／13／9 与 4.47/6.16/8.60/5.83）随 rts/窗相位漂移，行语义（`src=cow start paths=… dist=… entity=#`）逐字段一致。方向与门位一致，非判值漂移。
  - **C-B26-6**（工装·5 处补强＋PIN 通道）：①`fs.rmSync` 相对路径 → `path.join(L.ROOT,'run',world)`（任务书点名要求，cwd=testharness 时相对路径漏删世界）；②W0 补 `boots/stopBoots` 各 2 条断言；③b1 臂由合并计数改为 `{n, starts, probes}` 分解（判读需分列）；④尾部改显式 `process.exit`＋catch 补 bot.quit／srv.stop／props-cfg 回写；⑤pen 几何两次修正见 C-B26-1/2/3。另：驱动第二次 `[PIN]` 打在 JSON 落盘之后，故 `f11-b26-verify.json` 内 `pins` 仅 1 条，起收同值以 stdout 两条（`09:37:16.737Z`／`09:41:16.793Z`）为据，两条 releaseSha 与 MK 逐字段同。

## §4 收口五件

- **jar／dev／sources 起收同**：1,088,629 `04B0D422…`（MD5 `1A898082…`）／1,067,679 `110B8886…`／993,026 `AF4113E1…`（窗内 **0 rebuild**；jar mtime 09:11:30Z 早于窗 09:37Z）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name` 驱动起收回写 `w-b23v`）。
- **MK 起收同**：refmap 96/215（dual 430）＋mixins 93+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `9445c39` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAISeekOpenSpaceIfCrowded.java` 09:10:51Z、`MixinEntityAnimal.java` 09:11:20Z、`CommandDevTest.java` 09:13:54Z、`ETIMLivestockEvents.java` 09:14:05Z）均早于窗起点 09:37Z，`git status` 仍为三处 ` M`＋一处 `??`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b26v` 保留（25 文件／3,549,579 B）；`w-b26a`／`w-b25v` 未动。
- **互通（vs smoke r1 `build-logs/f11-b26-smoke.json`）**：a1 `1`→`4`、a2 `0`→`0`、b1 `0`→`0`；boots 双 Done、mixinFail 0×2、stopBoots 双 exit 0 两窗同形（详见 C-B26-5）。

> 正本：`testharness/reports/b26-verify-verdict.md`｜byte 五项：`9,092 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 68（split 69）`
> SHA-256 甲（全档零位）`9C3181BD04537C43EECD3727AB4780809C1868A5D77832F5018758DC2A3BF53E`
> SHA-256 乙（LF 归零零位）`9C3181BD04537C43EECD3727AB4780809C1868A5D77832F5018758DC2A3BF53E`
> SHA-256 丙（行链零位）`795FD8E3DAA4AD941FDA2EE20281718753CC4978670C598A14E0DA3843D4409E`
