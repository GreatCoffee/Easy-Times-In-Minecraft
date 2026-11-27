# ①面掉落表批（facedrops · `[MiningLog] shear drop` 行）· W-40a…j 判决回执

> **报告字节规格**：`22,404 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 118 / ✗ 2｜214 行`
> 执行方：会话七（自动化验证窗执行方）｜判窗：2026-10-31 09:39:05–09:40:49（服务器本地时；驱动 UTC 01:39:05–01:40:49）｜tag `facedrops-w40`
> 判决源：**drop 行** `[MiningLog] shear drop item=<held> block=<path> drops=<reg>:<count>:<meta>[+…] [server]`（`ETIMMining.getR196ShearDrops` → `logShearDrops` 单点发行）＋ **loss 行** `[MiningLog] tool decay face=breaking … loss=N`（funnel）＋ **dur**（mineflayer `bot.heldItem.durabilityUsed`，逐点 `/etest hold` fresh 栈）；`blockDebugLog` **全程 false**（本窗不用 probe 面）
> 审判权威：W-40 判窗任务书（主会话 2026-10-31）＋ facedrops 落码件 `a3718a7`
> 判值纪律：只写 **出口值** —— double_plant 5／vine 20／leaves 20／tallgrass 5／web 10／deadbush 5；drops 列按 `reg:count:meta` 逐位比（不手算 count×meta）。
> 计数注记：正文 ✓ 覆盖十个判点结论格、逐点附着判据格与收口表；✗ 仅自指 2 处（规格行计数位 ＋ 本注记），**判点表内无失败叉号**（10/10 通过）。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `a3718a7`（vine `getNumVines` 掉落改写 ＋ 第四 `@Redirect`（`remap=false`）＋ `[MiningLog] shear drop` ＋ `LAST_DROP_SIGS`） | ✓ 起窗/收口同值；工作树 dirty 0（仅新增 harness 驱动） |
| dev jar | 756,824 B｜`16E07CFA581003D712B77CF1AC3F527664E558909B7C1A8CDF8D37F15F1A8727` | ✓ 逐位命中（起/收同值） |
| release jar | 772,626 B｜`198B5C7ED5DEBD6CEE448CC44335BC5076D629BC6182A381DC7AFF2F792E3F5D` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical = 钉值**（本批零新键；窗内仅 `miningReform` 翻 G 相） |
| cfg 三键 | `blockDebugLog=false`（:11）／`miningDebugLog=true`（:363）／`miningReform=true`（:372） | ✓ 起窗直读；`blockDebugLog` **未动**（本窗零 probe 行） |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=facedrops`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`(550 B)／`usercache.json`(1,523 B)／`usernamecache.json`(796 B) | ✓ 起收 byte-identical |
| MK 面 | mixins **56**／client **10**；refmap 双树 sync **62 类键／138 条目** | ✓ 起窗前直读同值（**139／57／11 均未出现** —— 任务书异常门未触发） |
| 附属 jar | 不在场 | ✓ 两相 `etimExtrasOffGate SKIPPED`；`identified 16 mods to load`（MixinBooter `Finished gathering 15 mods`），全窗零 `etimextra` 字样 |
| 世界 | `level-name=test27dev` → 窗内新世界 `facedrops` → 收口还原 | ✓ 两相 `Preparing level "facedrops"`；世界目录收口删除 |
| 产物重建 | `:compileJava`／`:classes`／`:jar` 全 UP-TO-DATE（两相） | ✓ **0 rebuild** |
| mixin 加载 | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` | ✓ 两相全 0（第四 `@Redirect` `require = 1` 命中） |
| 环境前置 | 25565 = 0 LISTEN、25575 = 0、`run\crash-reports` 18 条 | ✓ 收口后仍 0／0／18 条 |

两相（cfg 只在相间翻 `miningReform`，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 | 停服 |
| --- | --- | --- | --- | --- |
| A | `miningReform=true` | W-40a／b／c／d／e／f／g ＋ h（空手）＋ i（创造） | `Done (5.348s)` | `BUILD SUCCESSFUL in 1m 16s`／exit 0 |
| G | `miningReform=false` | W-40j | `Done (1.001s)` | `BUILD SUCCESSFUL in 26s`／exit 0 |

卫生面（判值前置钉死，实测在案）：`gamemode 0`（i 点临时 `gamemode 1` 后即回 0）｜`etest level 0`｜`etest food 6 6`｜`tp` 后 grounded=true（两相）｜裸栈（无耐久·效率附魔）｜逐点 `/etest hold` fresh 栈｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`｜判点格距假人 2.0 格（块触及 2.75 内）。

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh 栈的破块；判 **drop 行（0/1 条 ＋ drops 列逐位）＋ loss 行（loss 序列）＋ durΔ（bot 侧）**。

| 判点 | 工具 × 目标 | 期望 drop 行 | 实测 drop 行 | 期望/实测 loss 行 | durΔ | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| W-40a | 锈剪 × `double_plant`(lower, fern) | `double_plant → tallgrass:2:2` | **`block=double_plant drops=minecraft:tallgrass:2:2`（1 条）** | 5／**5** | **5** | **✓ 通过** |
| W-40b | 锈剪 × `vine` meta15（四向） | `vine → vine:4:0` | **`block=vine drops=minecraft:vine:4:0`（1 条）** | 20／**20** | **20** | **✓ 通过** |
| W-40c | 锈剪 × `vine` 单向株（`meta2`=WEST，隔壁 1 格） | `vine → vine:1:0` | **`block=vine drops=minecraft:vine:1:0`（1 条，值变再发）** | **0 条**／**0 条**（同键同值 20 吞） | **20** | **✓ 通过**（阴性对照） |
| W-40d | 锈剪 × 橡木叶 meta0 | `leaves → leaves:1:0` | **`block=leaves drops=minecraft:leaves:1:0`（1 条）** | 20／**20** | **20** | **✓ 通过** |
| W-40e | 锈剪 × `tallgrass` meta0 | `tallgrass → tallgrass:1:0` | **`block=tallgrass drops=minecraft:tallgrass:1:0`（1 条）** | 5／**5** | **5** | **✓ 通过** |
| W-40f | 锈剪 × `web` | `web → web:1:0` | **`block=web drops=minecraft:web:1:0`（1 条）** | 10／**10** | **10** | **✓ 通过**（首验位） |
| W-40g | 锈剪 × `deadbush` | `deadbush → deadbush:1:0` | **`block=deadbush drops=minecraft:deadbush:1:0`（1 条）** | 5／**5** | **5** | **✓ 通过** |
| W-40h | **空手** × `tallgrass` | 0 条 | **0 条** | 0 条／**0 条** | 不适用（空手，`durΔ=null`） | **✓ 通过** |
| W-40i | 锈剪 × `vine` meta15（**创造**） | 0 条 | **0 条** | 0 条／**0 条** | **0** | **✓ 通过**（地面 items=0） |
| W-40j | 锈剪 × `vine` meta15（**off 相**） | 0 条 | **0 条** | 0 条／**0 条** | **1** | **✓ 通过**（地面 1× vine） |

逐点附着判据（每点均核讫，非抽样；驱动 `checks` 逐项全 true）：

| 判点 | fresh 栈就位 | 摆场块在位 | dig-start／dig-stop | 块转 air | drop 行条数／形状 | loss 行逐位 | durΔ 逐位 | 触及门 0 拒 | 附加判据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-40a | ✓ `dur=0` | ✓ `-68,76,249` | ✓ 两端在 | ✓ 2,792 ms | ✓ 1／✓ | ✓ 5 | ✓ 5（0→5） | ✓ 0 | ✓ upper 剪后 = air |
| W-40b | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,795 ms | ✓ 1／✓ | ✓ 20 | ✓ 20（0→20） | ✓ 0 | — |
| W-40c | ✓ `dur=0` | ✓ `-68,76,250` | ✓ | ✓ 2,795 ms | ✓ 1／✓ | ✓ 0 条 | ✓ 20（0→20） | ✓ 0 | — |
| W-40d | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,789 ms | ✓ 1／✓ | ✓ 20 | ✓ 20 | ✓ 0 | — |
| W-40e | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,793 ms | ✓ 1／✓ | ✓ 5 | ✓ 5 | ✓ 0 | — |
| W-40f | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,800 ms | ✓ 1／✓ | ✓ 10 | ✓ 10 | ✓ 0 | — |
| W-40g | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,799 ms | ✓ 1／✓ | ✓ 5 | ✓ 5 | ✓ 0 | — |
| W-40h | ✓ 空手（`air`） | ✓ 同格 | ✓ | ✓ 2,803 ms | ✓ 0／✓ | ✓ 0 条 | — | ✓ 0 | — |
| W-40i | ✓ `dur=0` | ✓ 同格 | ✓ | ✓ 2,785 ms（`earlyPresent=false`） | ✓ 0／✓ | ✓ 0 条 | ✓ 0 | ✓ 0 | ✓ 地面 items=0 |
| W-40j | ✓ `dur=0` | ✓ `-68,84,249` | ✓ | ✓ 2,790 ms | ✓ 0／✓ | ✓ 0 条 | ✓ 1（0→1） | ✓ 0 | ✓ 地面 1× `minecraft:vine`（Count 1b） |

全相判行与通道计数（`facedrops-w40-{a,g}-server-latest.log` 直数）：

| 相 | shear drop 行 | tool decay 行 | mine speed 行 | mine deny 行 | `[BlockLog] probe` 行 | `reach denied` | mixin 异常 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | **7** | **6** | 6（记录面） | 0 | **0**（blockDebugLog 未翻） | **0** | 0 |
| G | **0** | **0** | 0 | 0 | **0** | **0** | 0 |

计数总账（写死判，驱动 `ledger` 逐相核）：A `drop=7 / loss=6` ⇒ `ok:true`；G `drop=0 / loss=0` ⇒ `ok:true`；两相 `deny=0`、`reachDenied=0`（零噪声面）。

**last-sig 双表直证**：drop 表键＝`item|block`（`ETIMMining.java:372-376`）—— a/d/e/f/g 各 block 异键互不吞；b(4)→c(1) 同键**值变再发**，两行并存。loss 表键＝`face|item|block`（`ETIMMining.java:623` 同族）—— b 已发 `vine loss=20`，c 同键同值 ⇒ **0 条**（阴性对照成立，durΔ20 反证磨损确实发生）。

旁证面（附记，不判）：a 点摆场时 upper 半块实测在位（`testforblock` 报 `data value of 10`，见 C-1）；i 点在 +400 ms 已读到 air（`earlyPresent=false` ⇒ 创造面在 START 即破块），其余九点 +400 ms 仍见块（生存面在 STOP 破块，见 C-2）；j 点地面 item NBT 实测 `Item:{id:"minecraft:vine",Count:1b,Damage:0s}`。

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\facedrops-w40-a-server-latest.log`（502,614 B）／`…-g-server-latest.log`（83,857 B）；控制台全量：`…-a.out`（517,214 B）／`…-g.out`（98,976 B）；逐点证据：`…-evidence.json`（40,152 B）。

### W-40a 锈剪 × double_plant(lower, fern)（tallgrass:2:2 ＋ loss 5 ＋ upper 静默清除）

```text
[09:39:31] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=double_plant drops=minecraft:tallgrass:2:2 [server]
[09:39:31] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=double_plant loss=5 [server]
```

（读法：drops 列 `minecraft:tallgrass:2:2` = 2× tallgrass meta 2（fern），与 `BlockDoublePlant.onSheared`（`BlockDoublePlant.java:344-351`）的 2× 面一致 —— R196 无 counterpart，keep vanilla（条 162 N-5）。upper 判据：剪后 `testforblock -68 77 249 minecraft:air` = `Successfully found the block` ⇒ 上半块由 `BlockDoublePlant.checkAndDropBlock`（`BlockDoublePlant.java:90-110`，`if (!flag) dropBlockAsItem` 只对下半生效）**静默清除、零掉落**。）

### W-40b 锈剪 × vine meta15（vine:4:0 —— R196 getNumVines 面）

```text
[09:39:37] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=vine drops=minecraft:vine:4:0 [server]
[09:39:37] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=vine loss=20 [server]
```

（1.12 vanilla `BlockVine.onSheared` 恒 1×（`BlockVine.java:531-534`）；本行 4× = 四向 meta15 经 `getR196ShearDrops` 的 side tally（`ETIMMining.java:338-354`）覆盖。四个水平邻位均置实心支撑，故 meta15 在 dig 前未被 `recheckGrownSides` 削减。）

### W-40c 锈剪 × vine 单向株（vine:1:0；loss 0 条 = 同键同值吞的阴性对照）

```text
[09:39:42] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=vine drops=minecraft:vine:1:0 [server]
```

（drop 行**再发**：同键 `item|vine` 但 sig 由 `vine:4:0` 变 `vine:1:0`；loss 行**未发**：`face|item|block` = `breaking|etim:shears_rusted_iron|vine` 同键同值 20 已被 b 点占用（`ETIMMining.java:631-634`）—— 该点窗口内 `decayRaw=[]`，而 durΔ 实测 **20**，证明磨损真实发生、仅日志被去重。0 条不是 FAIL。）

### W-40d／e／f／g 四个同构面（leaves／tallgrass／web／deadbush，各 1 条 drop ＋ 1 条 loss）

```text
[09:39:47] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=leaves drops=minecraft:leaves:1:0 [server]
[09:39:47] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=leaves loss=20 [server]
[09:39:52] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=tallgrass drops=minecraft:tallgrass:1:0 [server]
[09:39:52] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=tallgrass loss=5 [server]
[09:39:57] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=web drops=minecraft:web:1:0 [server]
[09:39:57] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=web loss=10 [server]
[09:40:02] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] shear drop item=etim:shears_rusted_iron block=deadbush drops=minecraft:deadbush:1:0 [server]
[09:40:02] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=deadbush loss=5 [server]
```

（四面对照 vanilla `onSheared`（`BlockOldLeaf.java:129-132`／`BlockTallGrass.java:216-219`／`BlockWeb.java:110-113`／`BlockDeadBush.java:99-102`）与 R196 同形 ⇒ 原样返回、不改表。loss 值溯源：`ETIMMining.java:92-95`（vine 0.2／web 0.1／tallgrass·double_plant 0.02）与 `:147`（deadbush 0.02）经 `ETIMMining.java:267-273` 的 `max(max(h*100, 100/20), 1)` 得 20／10／5／5；leaves 不在表内 ⇒ 落 vanilla 硬度 0.2 ⇒ 20。）

### W-40h 空手 × tallgrass（drop 0 ＋ loss 0）

```text
[09:39:?] （该点窗口内无 `shear drop` 行、无 `tool decay` 行）
[TestLog] step=dig-start player=ETIM_W40A pos=BlockPos{x=-68, y=76, z=249}
[TestLog] step=dig-stop player=ETIM_W40A pos=BlockPos{x=-68, y=76, z=249}
```

（读法：空手 ⇒ `tryHarvestBlock` 的 `!stack.isEmpty() && …onBlockStartBreak` 门跳过（`ItemShears` 根本不在手上），`itemstack1.isEmpty()` 亦跳过 `onBlockDestroyed` ⇒ 不进 funnel ⇒ 双零；块仍在 2,803 ms 后转 air，属 vanilla 破坏面。）

### W-40i 创造模式锈剪 × vine（drop 0 ＋ loss 0 ＋ durΔ0 ＋ 地面 0）

```text
[TestLog] step=dig-start player=ETIM_W40A pos=BlockPos{x=-68, y=76, z=249}   （+400 ms 已读到 air：earlyPresent=false）
[Server thread/INFO]: Selector '@e[type=item]' found nothing
```

（读法：`ItemShears.onBlockStartBreak` 的创造早退（`ItemShears.java:83`）⇒ 不进 `IShearable` 支（`:91-94`）⇒ 既无 onSheared 亦无 `damageItem`（`:108-110`）；块由 `tryHarvestBlock` 的创造分支 `removeBlock` 摘除，零掉落。判毕 `gamemode 0` 回生。）

### W-40j off 相（`miningReform=false`）锈剪 × vine meta15（drop 0 ＋ loss 0 ＋ durΔ1 ＋ 地面 1× vine）

```text
[09:37:?] （该相窗口内无 `shear drop` 行、无 `tool decay` 行）
[Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: The data tag did not change: {… Item:{id:"minecraft:vine",Count:1b,Damage:0s}, …}
```

（读法：第四 redirect 的首支 `!ETIMConfig.miningReform`（`MixinItemShears.java:178-180`）原样返回 vanilla drops ⇒ 地面 1× vine、零 drop 行；`damageItem(1, player)` 经第二 redirect 的 off 支 ⇒ durΔ1、零 loss 行。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 7 条（均不改判点判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **double_plant upper 摆场 meta 与读回不符**：`/setblock … minecraft:double_plant 8`（= HALF=UPPER、FACING=SOUTH）后 `testforblock … 8` 返回 `had the data value of 10 (expected: 8)`（10 = 8 加 FACING=WEST 的 2）。上半块**在位**（判据成立）。 | 本窗 a 点判据只用「块在 → 剪后 air」，不依赖 upper 的 meta；根因未追（疑似摆场时状态归一/邻块更新），登记待后续纯摆场批次核定。 |
| C-2 | C | **生存面破块落在 dig-stop，创造面落在 dig-start**：九点生存面在 +400 ms 仍 `earlyPresent=true`、air 确认落在 2,785–2,803 ms；唯独 i（创造）`earlyPresent=false`。机制：生存面经 `tryHarvestBlock`（`PlayerInteractionManager:307` 起，`onBlockStartBreak` 在 STOP 收尾）→ `ItemShears.java:91-110`；创造面 `onBlockClicked` 走 `isCreative` 分支即时 `tryHarvestBlock`。 | 判窗一律「命令前 → dig-stop 后」抓行（本窗已按此）；后续同族批次照此，勿只抓 START 或 STOP 单端。 |
| C-3 | C | **vine 单向株取 meta2(WEST) 而非 meta1(SOUTH)**：摆场把支撑放在西侧（最短路径），drop 判值同为 1×；meta 具体向位不参与判值。 | 记录面；判据只吃 drops 列。 |
| C-4 | C | **空手点（h）无 dur 判据**：`bot.heldItem` 为 air，`durabilityUsed` 不可读 ⇒ `durΔ=null`（判据不判）。 | 记录面；空手面以「双零行」为判据。 |
| C-5 | C | **地面落物判据依赖拾取半径**：假人距目标 2.0 格 > 拾取半径（约 1.3 格）⇒ j 的 1× vine 在取数时仍在地面；若后续把靶点拉近到 1.3 格内，须在 500 ms（`setDefaultPickupDelay` 10t）内取样。 | 工装口径，入模板。 |
| C-6 | C | **`doTileDrops=false` 不干扰本批判据**：shearing 落物（含 off 相 vanilla drops）由 `ItemShears.onBlockStartBreak` 直接 `world.spawnEntity(EntityItem)`，不经 gamerule 门；j 实测地面 1× vine 即证。 | 记录面（世界塑形可继续关掉落，不污染判点）。 |
| C-7 | C | **`mine speed` 行 A 相 6 条**（六面各 1，`str=5.0`），与 `[MiningLog] tool decay` 同行窗口出现。 | 记录面（条 149 C-1），不判不扰，不参与总账。 |

## 4. 结论

**判点 10/10 全通过（W-40a…j），驱动总判 PASS（`evidence.json.verdict=PASS`）；计数总账两相 `ok:true`。**

- **掉落表批兑现（本批主目标）**：六面 drop 行逐位命中 —— `double_plant → tallgrass:2:2`（vanilla 2× keep）、`vine meta15 → vine:4:0`（R196 getNumVines 唯一改写的面）、`vine meta1/2 → vine:1:0`、`leaves → leaves:1:0`、`tallgrass → tallgrass:1:0`、`web → web:1:0`、`deadbush → deadbush:1:0`；同构五面原样返回、未引第二张表。
- **掉落面与磨损面解耦且互证**：每点 drop 行 1 条配 loss 行 1 条（c 除外）；c 的「loss 0 条 + durΔ20」把「日志去重」与「磨损发生」两面分清 —— 判据容差在案。
- **四类零行面成立**：空手（h）、创造（i）、off 相（j）以及 c 的 loss 面，均以「0 条 + 独立旁证」而非「缺行」判定。
- **upper 静默清除首证**：剪后 `pos.up()` 为 air、且无第二份 tallgrass 掉落（drop 行 drops 列只有 `2:2` 单 cell）⇒ 双半块「只赔一份」。
- **MK/钉值**：refmap 双树 **62 类键／138 条目**（139／57／11 均未出现）、mixins 56／client 10；cfg 起收 byte-identical（零新键，`blockDebugLog` 全程 false）；release 772,626 B、dev 756,824 B。
- **产品面**：两相 `:jar UP-TO-DATE`，0 rebuild；判窗内产品码 0 改动（HEAD `a3718a7` 起收同值）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.348s／1.001s)` → stdin `stop` → `BUILD SUCCESSFUL`（1m 16s／26s）、退出码 0（两相 `{exitCode:0, exited:true}`） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内仅 `miningReform=true→false`，收口整档还原；`blockDebugLog` 未动） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=facedrops`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical |
| 世界 | 新世界 `facedrops`（两相复用）；收口删除目录（`worldDirRemoved=true`） |
| 端口／崩溃 | 25565 = 0、25575 = 0（收口后）；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W40A`／`ETIM_W40G`） |
| 钉值复核 | dev／release jar 与 cfg／props 收口 sha 均与起窗同值（0 rebuild） |
| 证据档 | `facedrops-w40-a.out`（517,214 B）／`…-g.out`（98,976 B）、`…-a-server-latest.log`（502,614 B）／`…-g-server-latest.log`（83,857 B）、`…-evidence.json`（40,152 B，含逐点 drop/loss 原文、dur 前后、块位、upper 前后、地面 item NBT）、`…-driver.log`（21,752 B）、`…-{etim.cfg,server.properties,ops.json,usercache.json,usernamecache}.before`；冒烟两轮 `facedrops-w40-smk*`（a/b/c/h 4/4 → i/j 2/2） |
| 驱动 | `testharness\player\facedrops-w40.js`（两相 A／G；`rows` 表断言 ＋ drops 列 `reg:count:meta` 逐位 ＋ `ledger` 总账；`W40_ONLY`／`W40_PHASES` 仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `a3718a7` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\facedrops-w40.js`
- `testharness\reports\facedrops-W40-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-2 破块时机入模板**：生存面判点须抓「命令前 → dig-stop 后」整窗（创造面在 START 即破）；是否写入破块类工装纪律。
2. **C-1 upper meta 差异**：`/setblock 8` → 读回 10 —— 是否另立纯摆场批次核定根因（本窗判据不依赖）。
3. **C-5 地面落物取样窗**：靶点 ≤1.3 格时须在 500 ms 内取样，是否写入实体/掉落类工装模板。
4. **C-7 `mine speed` 记录面**：是否与条 149 C-1 合并成「speed 行不判」的统一口径注。
5. **盲区维持**：`double_plant` 的 GRASS 变体（meta 2）本窗未测（FERN 已测），落物同为 2× tallgrass meta 1；是否随下一批补点。


## 7. 自报（机械核讫）

> 文件：`testharness/reports/facedrops-W40-verdict.md`｜**22404 B**（全文）｜SHA-256（**本节之前**的正文，即 `## 7. 自报（机械核讫）` 及其以下全部行不计入）`07419316854C9EBC8E4FD6E3AD6FD4E7A3096A930DE90E1956C3BBE111E983A1`｜anchors **16 / missing 0**｜tables **7 / bad 0**｜首字节 0x23｜UTF-8 无 BOM｜LF｜0 U+FFFD
