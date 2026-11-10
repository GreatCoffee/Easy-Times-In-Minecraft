# R196 panic 面（EntityAIFleeAttackerOrPanic · 四畜＋狼座）· **W-B29 判决**（B-29 批，HEAD `0b0c3ec`）

> **HEAD**：`0b0c3ec51013626435c17ad0432f4b77e5956281`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar；jar mtime 2026-11-09T23:12:39Z 早于窗起点 23:44Z）
> **jar**：`build/libs/etim-1.0.0.jar` **1,106,009 B**｜SHA256 `6DF63B2BD02F9A4AEF372DD18C49C85D33E1514B5A17C4B6A90D3A2AF9A44C7B`（起收同值）｜MD5 `4B18F27ED24A01D818D2FE3C3AE90AD9`
> **dev/sources**：1,084,790 B `6644FA7CB86E2368…`／1,008,666 B `6130BB62AE515E91…`
> **refmap**：classes **98** / entries **217**（dual 434，双树同）｜**mixins**：**95** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.227s)`／`Done (5.289s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 53s／55s）｜单假人 `ETIM_F7`（左键由 bot 侧 `/etest attack … c=1` 发令）｜判窗世界 `w-b29v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓**（A 0／B 0／D 0／C 7）
> **判据来源**：本窗 r4 单跑（驱动 2 处工装补强见 §3 C-B29-7，未触产品码、未动判值口径）
> **报告字节规格**：`9,840 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 11 / ✗ 1｜78 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.227s)!`（b1:2344，07:44:39）／b2 `Done (5.289s)!`（b2:2344，07:47:19），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 53s`（b1:4463）／`in 55s`（b2:3132）；两条 `[PIN]`（`23:44:10.859Z`／`23:48:01.617Z`）同 releaseSha 同 MK，**JSON 内两条齐**（见 C-B29-7） | ✓ |
| **W1** cow panic 臂 | 4 cow 各一击 → `a1.n>=1`；判行含 `panicflee src=cow start speed=1.6 panic=` | **1 行**：`src=cow start speed=1.8000001 panic=true path=false entity=EntityCow#1988`（b1:3343）；同臂 probe 81 行、`alive=4` | ✓ |
| **W2** chicken panic 臂 | 4 chicken 各一击 → `a2.n>=1` | **1 行**：`src=chicken start speed=1.3 panic=false path=false entity=EntityChicken#1992`（b1:3904）；probe 80 行、`alive=4` | ✓ |
| **W3** wolf chance-0 负向面 | `a3.n>=1` ∧ `a3panicTrue===0` ∧ `a3hurt>=1` | **1 行**：`src=? start speed=1.0 panic=false path=true entity=EntityWolf#1995`（b1:4408）；`panic=True` 计数 **0**；`src=player` 有限伤害 **2 行**（b1:4405 prot `total=0.000`／b1:4406 dmg `raw=1.000 final=1.000 target=Wolf#1995`）；probe 18 行、`alive=2` | ✓ |
| **W4** 旗断（boot 2） | `b1.n===0` ∧ `b1.probes===0`（kernel 不见天日） | b2 全档 3,135 行 `panicflee` **0 命中**（start 与 probe-in 双零；cow 正常召唤、无 `Skipping Entity`） | ✓ |

## §2 判行原文

**W1 · cow（panic 分支起跳，speed 1.6+0.2）**
- `[AILog] panicflee src=cow probe-in inv=16 burn=false panic=false flee=false revenge=false flag=true entity=EntityCow#1986`（b1:3296，诊断行）
- `[AILog] panicflee src=cow start speed=1.8000001 panic=true path=false entity=EntityCow#1988`（b1:3343）

**W2 · chicken（flee 面起跑，speed 1.3 基速）**
- `[AILog] panicflee src=chicken start speed=1.3 panic=false path=false entity=EntityChicken#1992`（b1:3904）

**W3 · wolf（chance-0：panic 支恒关，flee 面照跑；判行紧贴伤害链）**
- `[EtimTest] commands.etest.drive_queued player=ETIM_F7 params=[attack @e[Type=Wolf,r=8,c=1]]`（b1:4403）
- `[DamageLog] dmg target=Wolf#1995 src=player raw=1.000 armorIn=1.000 armorOut=1.000 absorption=0.000 final=1.000 [server]`（b1:4406）
- `[TestLog] step=attack player=ETIM_F7 target=Wolf#1995`（b1:4407）
- `[AILog] panicflee src=? start speed=1.0 panic=false path=true entity=EntityWolf#1995`（b1:4408）——`src=?` 为 `ETIMLivestockEvents.kind` 对非四畜的 glyph（判值面允许）

**W4 · 旗断双零**
- b2 全档 3,135 行 `panicflee` **0 命中**（start 与 probe-in 均为 0）

**W0 · 窗面**
- `Done (5.227s)! For help, type "help" or "?"`（b1:2344）｜`Done (5.289s)!`（b2:2344）
- `BUILD SUCCESSFUL in 2m 53s`（b1:4463）｜`BUILD SUCCESSFUL in 55s`（b2:3132）

## §3 冲突分级

- **A 级：0** —— 五臂硬门全成立：cow／chicken／wolf 各 1 条 start（`path=` 字段齐）、wolf `panic=true` 恒零且伤害落实、旗断双零、boot/停服面全绿。
- **B 级：0** —— 本批注册 1 个新 mixin（95+10）＋attach 集合扩 1 员，refmap 98/217 dual 434 双树同，`mkCounts().ok=true`；无未收编残留。
- **D 级：0** —— 互通差异仅为掷骰结果与调用位面，无互读矛盾（见 C-B29-5）。
- **C 级：7**
  - **C-B29-1**（判行位面改·已落产品码）：`startExecuting` 判行由 path 门内移出入口、无条件落并新增 `path=` 字段（`ETIMEntityAIPanic.java:229-241`，`path != null` 只作标注不作门）。r16 旧判面（path 门内）作废；本窗 W3 wolf 行 `path=true`、W1 cow 行 `path=false` 并存，正证「in-path 与 out-path 两种都能起跑」。
  - **C-B29-2**（能力面·attach 扩员）：`ETIMLivestockEvents.onAttachCapabilities` 的集合由四畜扩为五员（`ETIMLivestockEvents.java:102-115`，:110-112 条件含 `e instanceof EntityWolf`）。r2 破案链：狼缺 capability → `get(entity)==null` → `considerFleeing` 写不进 → 被打后 `revenge=true/flee=false` 无 start；build6 双修后本窗 wolf 行落地。
  - **C-B29-3**（工装·selector 三条教训）：①1.12 限幅键是 `c=1`（`limit=`／`sort=` 是 1.13+ 键，1.12 解析成 NO_TARGET）；②selector 半径以**发令者**位置起算——console 无位故 r13 前 12 轮全空，r14 起改为 bot 侧 `bot.chat('/etest attack @e[type=X,r=8,c=1]')`；③`matchOneEntity` 要求**恰一**命中，多体恒 null（r15 BOOTALIVE 探针＋r16 `c=1` 破案）。本窗三臂伤害链（`drive_queued`→`DamageLog`→`TestLog`）逐行可查，通道已稳。
  - **C-B29-4**（判读·环境噪声）：fresh-world 自然刷新的牛/鸡落穿未加载 chunk，产生 `DamageLog … outOfWorld` 行（历史案底 188/179/181 行级）。判读一律 **DROP**：W3 的 `a3.hurtRows` 统计已显式排除 `outOfWorld`（`f11-b29-verify.js:171`）。
  - **C-B29-5**（掷骰变异·与 r3 逐条相反）：r3 实锺 `cow panic=false speed=1.6`／`chicken panic=true speed=1.5`；本窗 `cow panic=true speed=1.8000001`／`chicken panic=false speed=1.3`。两窗各自**字段自洽**（`getMovementSpeed()`＝基速＋panicking?0.2:0：1.6+0.2=1.8、1.3+0=1.3），仅 `rand<chance` 掷骰结果不同——任务书明示「panic=false|true 均为 R196 掷常式，20% 失败是合法变异」，W1／W2 判门只看 `n>=1`，故不破位。
  - **C-B29-6**（产物·sources jar 未随末次 rebuild 更新）：release/dev jar mtime 均为 2026-11-09T23:12（reobf1 构建），而 `etim-1.0.0-sources.jar` mtime 仍是 2026-11-08T13:37、大小 1,008,666 B——末次构建未重生成 sources。判基为 release jar（钉值相符），sources 仅作参考件；登记以免下批对账误判为「换包」。
  - **C-B29-7**（工装·2 处补强）：①W4 硬门按任务书补成双零——`w4` 与 `bad` 均加 `ev.arms.b1.probes === 0`（原驱动只看 `n`）；②`stampPin()` 由 JSON 落盘之后移到之前，使 `f11-b29-verify.json` 内 `pins` 收齐 **2 条**（此前各批 JSON 只 1 条、第二条仅存 stdout，B-24/B-26/B-28 同案）。

## §4 收口五件

- **jar／dev／sources 起收同**：1,106,009 `6DF63B2B…`（MD5 `4B18F27ED24A01D818D2FE3C3AE90AD9`）／1,084,790 `6644FA7C…`／1,008,666 `6130BB62…`（窗内 **0 rebuild**；sources 陈旧见 C-B29-6）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false`）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name` 驱动起收回写 `w-b23v`）。
- **MK 起收同**：refmap 98/217（dual 434）＋mixins 95+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `0b0c3ec` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIPanic.java` 2026-11-09T13:35:55Z、`ETIMLivestockEvents.java` 14:20:57Z、`MixinEntityWolf.java` 2026-11-08T13:36:50Z、`mixins.etim.json` 2026-11-08T13:37:12Z）均早于窗起点 23:44Z，`git status` 仍为四处 ` M`＋两个 `??`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b29v` 保留（23 文件／3,480,135 B）；`w-b29a` 未动。
- **互通（vs smoke r16 与 verify r3）**：见下表——门位（各臂 ≥1／=0）三窗全同，数值与 panic 掷骰为相位差。

| 臂 | smoke r16 | verify r3 | **本窗 r4** | 判读 |
| --- | --- | --- | --- | --- |
| a1 cow | 1 行（`speed=1.6 panic=false`） | 1 行 | 1 行（`speed=1.8000001 panic=true`） | 门 ≥1 同 |
| a2 chicken | 1 行（`speed=1.5 panic=true`） | 1 行 | 1 行（`speed=1.3 panic=false`） | 门 ≥1 同 |
| a3 wolf | 0 行（旧 path 门吞行） | 1 行（`panicTrue=0`／`hurt=2`） | 1 行（`path=true`／`panicTrue=0`／`hurt=2`） | 判行位面改后同 |
| b1 旗断 | 0 | 0 | 0 start／0 probe | 双零同 |

> 正本：`testharness/reports/b29-verify-verdict.md`｜byte 五项：`9,840 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 77（split 78）`
> SHA-256 甲（全档零位）`E96BA7EBCE80043DD2376E5727E3A488E817C77FD802A1A3268EF76BB4FC87F0`
> SHA-256 乙（LF 归零零位）`E96BA7EBCE80043DD2376E5727E3A488E817C77FD802A1A3268EF76BB4FC87F0`
> SHA-256 丙（行链零位）`7962DA6ADF4AC004310AA885E38257FAD0343D04C2A14990F13B2591BC555934`
