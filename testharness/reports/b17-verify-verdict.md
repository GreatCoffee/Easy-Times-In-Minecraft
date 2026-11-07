# 马家族幼体生长 burst 面（EntityAgeable.onLivingUpdate R196 :74-92）· **W-B17 判决**（B-17 批，HEAD `bd3247d`）

> **HEAD**：`bd3247db4ba78cb1824ac88ff26f6971766ed46e`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,046,725 B**｜SHA256 `CE5D20F35683D6D3EE43FDA33A776D7CE5EC55F1C0FEF3AA900925AB44E1684A`｜MD5 `22BFFF2E299111FA8E23DF003C2C354A`（起收同值）
> **dev/sources**：1,026,430 B `94A5F2C9468B7821…`／954,821 B `CAF6C1271628F7EA…`（起收同值）
> **refmap**：classes **87** / entries **198**（dual 396，双树同）｜**mixins**：**84** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.383s)`／`Done (5.449s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 20s／1m）｜单假人 `ETIM_F7`｜判窗世界 `w-b17v`（驱动自建；`w-b17a` 保留不动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓｜W5 ✓**（A 0／B 0／D 0／C 4）
> **判据来源**：本窗首跑（驱动 4 处工装补强见 §3 C-B17-3，未触产品码、未动判值口径）
> **报告字节规格**：`8,963 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 13 / ✗ 1｜78 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL＋起收 pin 同 | b1 `Done (5.383s)!`（b1:2325）／b2 `Done (5.449s)!`（b2:2324），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 20s`（b1:3145）／`in 1m`（b2:3676）；两次 `[PIN]` 同 releaseSha `CE5D20F3…`、同 mk 87/198/396 | ✓ |
| **W1** Horse burst | `src=horseBurst` 行 ≥2，每行 `arg-age=+200`，且逐行 `age`＝上一行 `arg`（非锚零写） | **4 行**：`-64000→-63800`（b1:3076）、`-63800→-63600`（b1:3078）、`-63600→-63400`（b1:3080）、`-63400→-63200`（b1:3082）；deltas `[200,200,200]`；入口守卫行 `-64000→-63999`（b1:3072）| ✓ |
| **W2** Donkey burst | 同形（AbstractHorse umbrella 证） | **4 行**：`-64000→-63800`（b1:3094）、`-63800→-63600`（b1:3096）、`-63600→-63400`（b1:3098）、`-63400→-63200`（b1:3100）；deltas `[200,200,200]`；守卫行 b1:3093 | ✓ |
| **W3** Cow control | `src=horseBurst` **0 行**（non-horse 走 vanilla ++1） | 整段 Cow 面 `horseBurst` **0 行**；仅入口守卫 `src=horseEntranceGuard`（b1:3107），非判值面 | ✓ |
| **W4** ageSnapshot 门槛 | snap0＝`kind=EntityHorse age=-64000 isChild=true`；snap1 `age > snap0 age` | snap0 `kind=EntityHorse id=2002 age=-64000 isChild=true ticksExisted=22`（b1:3074）；snap1 `age=-63200 isChild=true ticksExisted=743`（b1:3085）→ `-63200 > -64000` | ✓ |
| **W5** 旗断面 | boot 2 `livestockNeedsR196=false` → `src=horseBurst` **0 行** | b2 全档（3,679 行）`horseBurst` **0 行**；仅守卫行 `src=horseEntranceGuard age=-64000 arg=-63999`（b2:3649）→ 旗断后回 vanilla `++1` 写 | ✓ |

## §2 判行原文

**W1 · Horse burst（4 锚，逐行链式自洽）**
- `[FarmLog] agegate src=horseEntranceGuard age=-64000 arg=-63999 entity=EntityHorse#2002 [server]`（b1:3072）
- `[FarmLog] agegate src=horseBurst age=-64000 arg=-63800 entity=EntityHorse#2002 [server]`（b1:3076）
- `[FarmLog] agegate src=horseBurst age=-63800 arg=-63600 entity=EntityHorse#2002 [server]`（b1:3078）
- `[FarmLog] agegate src=horseBurst age=-63600 arg=-63400 entity=EntityHorse#2002 [server]`（b1:3080）
- `[FarmLog] agegate src=horseBurst age=-63400 arg=-63200 entity=EntityHorse#2002 [server]`（b1:3082）

**W2 · Donkey burst（umbrella 证）**
- `[FarmLog] agegate src=horseEntranceGuard age=-64000 arg=-63999 entity=EntityDonkey#2003 [server]`（b1:3093）
- `[FarmLog] agegate src=horseBurst age=-64000 arg=-63800 entity=EntityDonkey#2003 [server]`（b1:3094）
- `[FarmLog] agegate src=horseBurst age=-63800 arg=-63600 entity=EntityDonkey#2003 [server]`（b1:3096）
- `[FarmLog] agegate src=horseBurst age=-63600 arg=-63400 entity=EntityDonkey#2003 [server]`（b1:3098）
- `[FarmLog] agegate src=horseBurst age=-63400 arg=-63200 entity=EntityDonkey#2003 [server]`（b1:3100）

**W3 · Cow 对照（0 burst 行）**
- `[FarmLog] agegate src=horseEntranceGuard age=-64000 arg=-63999 entity=EntityCow#2004 [server]`（b1:3107，唯一 agegate 行；无 `src=horseBurst`）

**W4 · ageSnapshot 两拍**
- `[FarmLog] ageSnapshot kind=EntityHorse id=2002 age=-64000 isChild=true ticksExisted=22 [server]`（b1:3074）
- `[FarmLog] ageSnapshot kind=EntityHorse id=2002 age=-63200 isChild=true ticksExisted=743 [server]`（b1:3085）

**W5 · 旗断零行**
- `[FarmLog] agegate src=horseEntranceGuard age=-64000 arg=-63999 entity=EntityHorse#2005 [server]`（b2:3649）
- b2 全档 `src=horseBurst` **0 行**（`Select-String` 0 命中）

**W0 · 窗面**
- `Done (5.383s)! For help, type "help" or "?"`（b1:2325）｜`Done (5.449s)!`（b2:2324）
- `BUILD SUCCESSFUL in 2m 20s`（b1:3145）｜`BUILD SUCCESSFUL in 1m`（b2:3676）

## §3 冲突分级

- **A 级：0** —— 六臂全绿，burst 形状面（每行 +200、逐行 age＝上行 arg、非锚零写）与旗断面均落地。
- **B 级：0** —— 本批零 mixin／零 cfg 新增（`mkCounts().ok=true`，87/198/396＋84+10 起收同；`MixinEntityAgeable.java` refmap entries 197→198 已在 build 侧收编）。
- **D 级：0** —— 互通差异仅为窗口相位造成的行数差，无判值面破位（见 §4）。
- **C 级：4**
  - **C-B17-1**（行面·守卫行非马专属）：`src=horseEntranceGuard` 对**所有** `EntityAgeable` 首写发一行——Cow 对照臂同样出守卫行（b1:3107）。W3 判据只认 `src=horseBurst`（0 行），故不误判；登记为行语义注记。
  - **C-B17-2**（工装·窗口相位）：35 s 观测窗与 `tick=(ticksExisted+id*47)%200` 锚点相位相关——smoke r10 的 Horse 面 3 行（snap1 `-63400`），本窗 4 行（snap1 `-63200`），deltas 均为 `+200`、链式 age/arg 全自洽。**行数差非判值漂移**。
  - **C-B17-3**（工装·驱动 4 处补强，未触产品码）：①`fs.rmSync` 世界清理由相对路径改为 `path.join(L.ROOT,'run',world)`（任务书要求 cwd=testharness，相对路径会漏删 `run/w-b17v`，第二次 boot 会继承上一轮世界）；②W5 后补 `stopBoot()`＋显式 `process.exit`（否则 boot 2 常驻 25565 且 mineflayer socket 不释放，B-16 C-B16-6 同型）；③W0 由「只看 boot 1」收紧为「双 boot Done＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2」；④W4 补 `snap1.age > snap0.age` 单调门（原驱动只查 snap0）。
  - **C-B17-4**（口径·有限窗均值）：本窗 snap0→snap1 跨 721 tick、age +800（4 锚），窗内均值 ≈+1.11/tick；R196 形状为「仅锚点写 +200、非锚 199 tick 零写」，整周期均值恰为 +1/tick。任务书明示「判 SHAPE 不判均值」，故以逐行 +200＋链式自洽为准，登记备查。

## §4 收口五件

- **jar／dev／sources 起收同**：1,046,725 `CE5D20F3…`／`22BFFF2E…`；dev 1,026,430 `94A5F2C9…`；sources 954,821 `CAF6C127…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,379 B `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`（`livestockNeedsR196` 已回 `true`）；props 939 B `D7948C27C81FD4FB42B46C5A7B529B43EBA41D271C41FE9AC84ABF029F4E4343`（`level-name=w-b17v`，起收同）。
- **MK 起收同**：refmap 87/198（dual 396）＋mixins 84+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `bd3247d` 窗内 **0 提交**；产品码 mtime（`MixinEntityAgeable.java` 11:14Z、`CommandDevTest.java` 11:39Z、`ETIMLivestockEvents.java` 03:53Z）均早于本窗起点 12:14Z，`git status` 仍为这两处 ` M`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b17v` 保留（16 文件／3,524,533 B）；`run/w-b17a` 未动。
- **互通（vs `build-logs/f11-b17-smoke.json`）**：Horse 面 smoke `n=3`／本窗 `n=4`（deltas 全 `+200`）、Donkey 面 `n=4`／`n=4`（deltas `[200,200,200]` 同）、Cow 面 `0`／`0`、旗断面 `0`／`0`；snap 面 smoke `-64000→-63400`／本窗 `-64000→-63200`，差异全部由 35 s 窗与 200-tick 锚的相位（`id*47` 偏移）解释（§3 C-B17-2），逐行字段语义一致，**非判值偏差**。

> 正本：`testharness/reports/b17-verify-verdict.md`｜byte 五项：`8,963 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 77（split 78）`
> SHA-256 甲（全档零位）`5FACE10287341DE7B31889FDD401227C4513FEAB6C3FF412A07BDDBED5DFC14C`
> SHA-256 乙（LF 归零零位）`5FACE10287341DE7B31889FDD401227C4513FEAB6C3FF412A07BDDBED5DFC14C`
> SHA-256 丙（行链零位）`173F47B868FF4EA438B6B98B1B9DD6A29357B778EE56FC5D57B997DB6906C3CF`
