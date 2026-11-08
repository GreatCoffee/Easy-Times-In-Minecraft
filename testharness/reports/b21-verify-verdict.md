# 菌丝 spread 家族（R196 BlockMycelium.updateTick :47-124）· **W-B21 判决**（B-21 批，HEAD `80dbffe8`）

> **HEAD**：`80dbffe81a958e0820dd3d4cae079c28819530a9`（窗内 **0 提交**，起收同 commit；` M src/main/java/io/github/etim/etim/mixins/MixinBlockMycelium.java` 即本批未入库的 B-21 patch）
> **jar**：`build/libs/etim-1.0.0.jar` **1,060,653 B**｜SHA256 `06DF8B32B25AA425E48C69B078B5F8401F15A5BFC29D395FAB907FCF0109AFA6`（起收同值，mtime 01:13:21Z 早于窗）
> **dev/sources**：1,040,071 B `8988CCCCEB3E7BA0…`／968,410 B `2252210A73732EBA…`（起收同值）
> **refmap**：classes **94** / entries **212**（dual 424，双树同）｜**mixins**：**91** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.651s)`／`Done (5.919s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL）；单假人 `ETIM_F7`；判窗世界 `w-b21v`（驱动自建；`w-b21a` 未动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓｜W5 ✓｜W6 ✓**（A 0／B 0／D 0／C 5）
> **判据来源**：本窗首跑（`build-logs/f11-b21-verify.json`，EXIT=0）；驱动 2 处工装补强见 §3 C-B21-1，未触产品码、未动判值口径
> **报告字节规格**：`9,956 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 1｜81 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL＋起收 pin 同 | b1 `Done (5.651s)!`／b2 `Done (5.919s)!`，`mixinFail=0`×2；`stopBoots` 2 条均 `exitCode=0 exited=true build=true`；两次 `[PIN]`（`02:12:17.706Z`／`02:17:07.484Z`）同 releaseSha `06DF8B32…`、同 MK 94/212/424＋91+10 | ✓ |
| **W1** 昼死面（D1） | day 1000＋rain 0.0＋full mycelium 20 s → ≥1 行 `src=rainDeath`（in-Patch），`rain=false freezing=false sky=true` | **76 行**（位面口径）；样本 `pos=-77,67,239 light=15 rain=false freezing=false sky=true`（b1:3784）、`pos=-78,67,239`（b1:3785）、`pos=-77,67,242`（b1:3786） | ✓ |
| **W2** 蘑菇孕苗（A2 前半） | chamber＋checker 120 s 暗支窗 → ≥1 行 `src=spawn` | **1 行**（A2 窗口）：`pos=-72,68,241 neighborCount=0`（b1:43846，10:15:04） | ✓ |
| **W3** 暗 spread（A2 后半） | 同窗 ≥1 行 `src=spread` 且 **shapeStraight ≥1**；diag 不算 FAIL | **256 行** spread，`shapeStraight=220`／`shapeDiag=36`（85.9%／14.1%）；直线样本 `from=-76,66,245 to=-75,67,245 dx=1 dy=1 dz=0`（b1:46043）、`from=-73,66,244 to=-73,67,243 dx=0 dy=1 dz=-1`（b1:46281）；对角样本 `from=-72,66,238 to=-73,67,239 dx=-1 dy=1 dz=1`（b1:46349） | ✓ |
| **W4** 邻菌 census cap（A3） | 5 蘑菇 staged → 60 s 窗内 **in-Patch spawn == 0**（cap >2 门） | A3 窗口 `spawn=0`；`skip reason=neighborCap count=3` 2 行：`pos=-73,67,240`（b1:54679）、`pos=-72,67,243`（b1:73402）→ 上闸生效 | ✓ |
| **W5** WATER 顶（A4） | 两格 mycelium＋y68 water → 6 s → `testforblock dirt` ×2 成功＋≥1 行 `src=waterAbove` | `Successfully found the block at -77, 67, 240`（b1:121512）、`at -76, 67, 241`（b1:122118）；`src=waterAbove pos=-77,67,240`（b1:113097）、`pos=-76,67,241`（b1:113429）；dirtCount=2 | ✓ |
| **W6** 旗断（B1） | `livestockNeedsR196=false` 复放 D1 16 s → **0 行**（全局不分区） | b2 全档（4,086 行）`[FarmLog] mycelium src=` **0 行**（in-Patch 亦 0） | ✓ |

## §2 判行原文

**W1 · 昼死面（1/4 闸后采样，位面 76 行）**
- `[FarmLog] mycelium src=rainDeath pos=-77,67,239 light=15 rain=false freezing=false sky=true [server]`（b1:3784，10:13:0x）
- `[FarmLog] mycelium src=rainDeath pos=-78,67,239 light=15 rain=false freezing=false sky=true [server]`（b1:3785）
- `[FarmLog] mycelium src=rainDeath pos=-77,67,242 light=15 rain=false freezing=false sky=true [server]`（b1:3786）

**W2 · 孕苗（A2 窗口唯一 spawn）**
- `[FarmLog] mycelium src=spawn pos=-72,68,241 neighborCount=0 [server]`（b1:43846，10:15:04）
- 旁证（D1 窗口内的 1 条，因树冠遮光命中 dark 支，不计入 W1 判据）：`[FarmLog] mycelium src=spawn pos=-73,68,242 neighborCount=0 [server]`（b1:4048，10:13:08）

**W3 · 暗 spread（3 例：2 直线＋1 对角 tail 直落）**
- `[FarmLog] mycelium src=spread from=-76,66,245 to=-75,67,245 dx=1 dy=1 dz=0 attempts=8 [server]`（b1:46043）
- `[FarmLog] mycelium src=spread from=-73,66,244 to=-73,67,243 dx=0 dy=1 dz=-1 attempts=8 [server]`（b1:46281）
- `[FarmLog] mycelium src=spread from=-72,66,238 to=-73,67,239 dx=-1 dy=1 dz=1 attempts=8 [server]`（b1:46349）

**W4 · census cap（0 spawn，2 次上闸）**
- `[FarmLog] mycelium src=skip reason=neighborCap count=3 pos=-73,67,240 [server]`（b1:54679，10:15:18）
- `[FarmLog] mycelium src=skip reason=neighborCap count=3 pos=-72,67,243 [server]`（b1:73402，10:15:39）

**W5 · WATER 顶（行＋testforblock 双证）**
- `[FarmLog] mycelium src=waterAbove pos=-77,67,240 [server]`（b1:113097，10:16:14）
- `[FarmLog] mycelium src=waterAbove pos=-76,67,241 [server]`（b1:113429）
- `Successfully found the block at -77, 67, 240`（b1:121512）｜`Successfully found the block at -76, 67, 241`（b1:122118）

**W6 · 旗断（b2）**
- b2 全档 4,086 行：`[FarmLog] mycelium src=` **0 命中**（`rainDeath/spawn/spread/skip/waterAbove` 全 0）

**W0 · 窗面**
- `Done (5.651s)! For help, type "help" or "?"`（b1）｜`Done (5.919s)!`（b2）
- `[PIN]` `2026-11-08T02:12:17.706Z`／`02:17:07.484Z`：releaseSha 同 `06DF8B32…`、MK 同 94/212/424＋91+10 `ok=true`

## §3 冲突分级

- **A 级：0** —— 五面（waterAbove／1/4 闸／spawn／census cap／spread＋昼死）全部落地，行型、门位与 R196 语义一致。
- **B 级：0** —— 零 mixin／零 cfg 新增：MK 94/212/424＋91+10 起收同、`ok=true`；`MixinBlockMycelium` 已在 refmap 收编。
- **D 级：0** —— 互通数值漂移全部由窗时长与 random-tick 相位解释，无互读矛盾、无门位漂移。
- **C 级：5**
  - **C-B21-1**（工装·驱动 2 处补强，未触产品码）：①`startBoot` 的 `fs.rmSync(path.join('run', world))` 为相对路径，任务书要求 cwd=`testharness` 会漏删 `run/w-b21v`（boot 2 继承上一轮世界）→ 改 `path.join(L.ROOT,'run',world)`；②boot 2 跑完后无 `stopBoot()`、无显式 `process.exit`（25565 常驻／gradle 不收／mineflayer socket 不释放）→ 补 stopBoot 与 `process.exit(bad?2:0)`，catch 侧补 `srv.stop`＋props/cfg 回写。**此为 C-B16-6／C-B17-3 同型问题第三次复现，建议直接把两条写进驱动基线模板**。
  - **C-B21-2**（行池·位面过滤）：fresh `w-b21v` 种子落全球蘑菇岛地形，b1 全档 `[FarmLog] mycelium src=` **119,477 行**（19.2 MB），其中 in-Patch 仅 **577 行**（x∈[−78,−67] ∧ z∈[238,249]）。本窗所有判值一律取位面口径（驱动 `inPatch` helper），raw 池数字仅作环境背景。
  - **C-B21-3**（互通·窗相位漂移，vs `build-logs/f11-b21-smoke.json` r3）：d1 **76 vs 73**（+4.1%）；a2 spawn **1 vs 2**；a2 spread **256 vs 173**（+48.0%）；a2 skip **4 vs 10**；straight/diag **220/36＝85.9%/14.1% vs 154/19＝89.0%/11.0%**；a3 spawn **0=0**、a3 skip **2 vs 5**；a4 dirt **2=2**、a4 rows **6=6**；b1 **0=0**。行型与门位不漂，规模差异由 W1 20 s／W2·W3 120 s／W4 60 s／W5 6 s／W6 16 s 窗与 `rts512` 随机刻相位解释。
  - **C-B21-4**（窗口·D1 混入 1 条 spawn）：D1 窗口（`refillFull` 后 20 s）内出现 1 条 in-Patch `src=spawn`（b1:4048，`pos=-73,68,242`）——patch 上方有树冠遮挡的格子满足 `light≤13 && !canSeeSky`，走 dark 支而非昼死支。D1 判据只认 `rainDeath`，该行不计入任何臂；登记为窗口污染注记，非判值破位。
  - **C-B21-5**（判读·diag 口径）：a2 的 `shapeDiag=36`（14.1%）为 R196 tail 语义直落（尾部对「最后一次抽签结果」不再复查 break 判式），任务书 ③ 已明示「diag 行＝值面正证、不许记 FAIL」；本窗 W3 只硬门 `spread≥1 ∧ shapeStraight≥1`，diag 仅作比率报告。

## §4 收口五件

- **jar／dev／sources 起收同**：1,060,653 B `06DF8B32B25AA425E48C69B078B5F8401F15A5BFC29D395FAB907FCF0109AFA6`；dev 1,040,071 `8988CCCC…`；sources 968,410 `2252210A…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,379 B `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`（`livestockNeedsR196`／`farmDebugLog`／`mobDebugLog` 三旗均回 `true`）；props 939 B `BC471097F200862BF42FCBF5CA361ABAA4AF73763967B31E92B860F85F3765D8`（`level-name` 已回 `w-b21a`）。
- **MK 起收同**：refmap 94/212（dual 424）＋mixins 91+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `80dbffe8` 窗内 **0 提交**；产品码 `MixinBlockMycelium.java` 10,940 B mtime **01:13:10Z** 早于本窗起点（02:12Z），`git status` 仍为该项 ` M`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b21v` 保留（26 文件／3,518,598 B）；`run/w-b21a` 未动。
- **互通（vs `build-logs/f11-b21-smoke.json` r3）**：门位七项全同（W1 有行／W2 有行／W3 有行＋直线／W4 零行／W5 dirt×2＋有水行／W6 零行）；数值漂移见 §3 C-B21-3，全部落在窗时长与随机刻相位可解释区间。

> 正本：`testharness/reports/b21-verify-verdict.md`｜byte 五项：`9,956 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 80（split 81）`
> SHA-256 甲（全档零位）`4075ABDBE7714B11494E25C9B23D3D8254FBA241E3F88728B941792F37FEAA09`
> SHA-256 乙（LF 归零零位）`4075ABDBE7714B11494E25C9B23D3D8254FBA241E3F88728B941792F37FEAA09`
> SHA-256 丙（行链零位）`A07061DB239B13564F7709A9428F3F3F6750A4A9164D8A6B319D16EDC6A703ED`
