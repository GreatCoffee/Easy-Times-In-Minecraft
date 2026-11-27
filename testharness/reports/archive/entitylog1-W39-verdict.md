# 实体面损耗日志通道批（entitylog1 · 羊面 `face=shearing` [MiningLog] 行）· W-39a…i 判决回执

> **报告字节规格**：`24,809 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 108 / ✗ 2｜235 行`
> 执行方：会话七（自动化验证窗执行方）｜判窗：2026-10-31 07:53:27–07:55:25（服务器本地时；驱动 UTC 23:53:20–23:55:26）｜tag `entitylog1-w39`
> 判决源：**新增面**唯一判据 = `[MiningLog] tool decay face=shearing item=… loss=N [server]`（**无 block= 列**）；回归面（h/i）= `[MiningLog] tool decay face=breaking … block=… loss=N`；磨损量旁证 = `[BlockLog] probe … held=… dur=x/y`（`/etest blockprobe`，`blockDebugLog=true`）；触发面旁证 = `testfor @e[type=sheep] {Sheared:Nb}`／`entitydata`／`testfor @e[type=item]`／`testfor @e[type=cow]`
> 审判权威：条 156（entitylog1 立项摸底）／条 157（终审 T-1…T-9 判值零改动；**T-7 f 点行判反转**：创造面恰 1 条 `loss=0`，0 条＝FAIL）＋ 主会话 W-39 判窗任务书
> 判值纪律（条 138 勘-1／条 156／条 157）：只写 **max 出口值** —— 羊面磨损 **50**（`ETIMMining.java:68` `SHEEP_SHEAR_WEAR` 经 helper 直发）／创造面 **0**（门在发行前）／vanilla 剪 **1**／off 相 **1**／哞菇 **1**／reeds **8**／leaves **20**；未手算任何乘性中间项。
> 计数注记：正文 ✓ 覆盖九个判点结论格、逐点附着判据格与收口表；✗ 仅自指 2 处（规格行计数位 ＋ 本注记），**判点表内无失败叉号**（9/9 通过）。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `87d0edd`（helper＋handler 改形落码件；上一环 `c1b91ef`） | ✓ 起窗/收口同值；工作树 dirty 0（仅新增 harness 驱动） |
| dev jar | 755,574 B｜`F9DD5063D3C6F389C4F42D0E95BD89E06F5EF0A2674254F7DF97D33F467EE6CF` | ✓ 逐位命中（起/收同值） |
| release jar | 771,368 B｜`80C0B8BD1542A4EB026B1FEA2602F5152ADEC70A6CFAFC82889DCB34EB49ABC9` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical = 钉值**（本批零新键） |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=entitylog1`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`(550 B)／`usercache.json`(1,523 B)／`usernamecache.json`(796 B) | ✓ 起收 byte-identical（假人登录改写已还原） |
| MK 面 | mixins **56**／client **10**；refmap 双树 sync **62 类键／138 条目** | ✓ 起窗前直读同值（**139 未出现** —— 条 157 主预言收位：本批只改 helper/handler，未新增注入点） |
| 附属 jar | 不在场（本批不带 etimextra；全窗零 `etimextra` 字样） | ✓ 两相 `etimExtrasOffGate SKIPPED`；`Forge Mod Loader has identified 16 mods to load`（MixinBooter `Finished gathering 15 mods`） |
| 世界 | `level-name=test27dev` → 窗内新世界 `entitylog1` → 收口还原 | ✓ 两相 `Preparing level "entitylog1"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ **0 rebuild** |
| mixin 加载 | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型 | ✓ 两相全 0（第三 `@Redirect` `require = 1` 命中） |
| 环境前置 | 25565 = 0 LISTEN、25575 = 0、`run\crash-reports` 18 条 | ✓ 收口后仍 0／0／18 条 |

两相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 | 停服 |
| --- | --- | --- | --- | --- |
| A | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-39a／b／d／c／f／g／h／i | `Done (5.456s)` | `BUILD SUCCESSFUL in 1m 35s`／exit 0 |
| G | `miningReform=false` | W-39e | `Done (1.031s)` | `BUILD SUCCESSFUL in 29s`／exit 0 |

卫生面（判值前置钉死，实测在案）：`gamemode 0`（f 点临时 `gamemode 1` 后即回 0）｜`etest level 0`（xp=0）｜`etest food 6 6`（饱食满）｜`tp` 后 grounded=true（两相）｜判点工具裸栈（无耐久·效率附魔）｜逐点 `/etest hold` **fresh 栈**｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`｜实体逐点 `/summon`＋判前 `/kill` 清场（`NoAI:1b` 固定站位）｜判点格距假人 ≤1.0 格（交互触及门 2.5 格内）。

## 1. 逐判点核讫表

判法：一个判点 = 一次 **fresh 栈** 的实体交互（实体面）或一次 fresh `item×block` 键的挖块（回归面）；实体面判 **判行形 + 行数 + durΔ**，回归面判 **判行 loss 定值 + 行形 + durΔ**。

| 判点 | 工具 × 目标 | 期望判行 | 实测判行（原文见 §2） | durΔ（probe／假人） | 触发面旁证 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| W-39a | `etim:shears_rusted_iron` × 成年未剪羊（生存） | **1 条** `face=shearing loss=50`（无 block 列） | **`face=shearing item=etim:shears_rusted_iron loss=50`（1 条，无 block 列）** | **50／50**（0→50，max 3200） | 未剪→**已剪**（`{Sheared:1b}` 命中） | **✓ 通过** |
| W-39b | 同上 × **同羊再剪**（已剪） | 0 条 | **0 条** | **0／0**（0→0） | **保持已剪**；`{Sheared:0b}` 不命中 | **✓ 通过** |
| W-39d | `minecraft:shears` × 成年未剪羊 | 0 条 | **0 条** | **1／1**（0→1，max 238） | 未剪→**已剪** | **✓ 通过** |
| W-39c | `etim:shears_rusted_iron` × **幼羊**（`Age:-24000`） | 0 条 | **0 条** | **0／0**（0→0） | **仍未被剪**（`{Sheared:1b}` 不命中）＋`child=true` | **✓ 通过** |
| W-39f | 同上 × 成年羊（**创造模式**） | **恰 1 条** `loss=0`（无 block 列） | **`face=shearing item=etim:shears_rusted_iron loss=0`（1 条，无 block 列）** | **0／0**（0→0） | 未剪→**已剪**（剪毛照发生） | **✓ 通过**（★反转判点） |
| W-39g | 同上 × **哞菇**（`minecraft:mooshroom`） | 0 条 | **0 条** | **1／1**（0→1，max 3200） | 场上 **mooshroom→cow**（`Found Cow`／`@e[type=mooshroom]` 空） | **✓ 通过**（门②反证） |
| W-39h | 同上 × `reeds`（回归） | 1 条 `face=breaking block=reeds loss=8` | **`face=breaking item=etim:shears_rusted_iron block=reeds loss=8`（1 条）** | **8／8**（0→8） | 块消失（air 轮询 2,697 ms 确认） | **✓ 通过** |
| W-39i | 同上 × `leaves`（回归） | 1 条 `face=breaking block=leaves loss=20` | **`face=breaking item=etim:shears_rusted_iron block=leaves loss=20`（1 条）** | **20／20**（0→20） | 块消失（air 轮询 2,702 ms 确认） | **✓ 通过** |
| W-39e | 同上 × 成年未剪羊（**off 相** `miningReform=false`） | 0 条 | **0 条** | **1／1**（0→1，max 3200） | 未剪→**已剪** | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样；驱动 `checks` 逐项全 true）：

| 判点 | 召/复用 | 实体被跟踪 | 年龄门 | 手持面一致（前后 `held=`） | 交互送出 | **触及门 0 拒** | 行形（无 block 列） | 剪毛态／场上型 | durΔ 面 | 行表符合期望 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-39a | ✓ `Object successfully summoned` | ✓ id 跟踪 | ✓ `Age 0`（成年） | ✓ | ✓ INTERACT | ✓ `reachDenied=0` | ✓ 无 block 列 | ✓ 已剪 | ✓ 50 | ✓ 1 行 |
| W-39b | ✓ 复用同一只 | ✓ | ✓（复用不判） | ✓ | ✓ | ✓ 0 | ✓（无行） | ✓ 保持已剪 | ✓ 0 | ✓ 0 行 |
| W-39d | ✓ | ✓ | ✓ `Age 0` | ✓ `minecraft:shears` | ✓ | ✓ 0 | ✓（无行） | ✓ 已剪 | ✓ 1 | ✓ 0 行 |
| W-39c | ✓ | ✓ | ✓ `Age -23945`（幼） | ✓ | ✓ | ✓ 0 | ✓（无行） | ✓ 未剪 | ✓ 0 | ✓ 0 行 |
| W-39f | ✓ | ✓ | ✓ `Age 0` | ✓ | ✓ | ✓ 0 | ✓ 无 block 列 | ✓ 已剪 | ✓ 0 | ✓ 1 行（loss=0） |
| W-39g | ✓ `Object successfully summoned` | ✓ | ✓ `Age 0` | ✓ | ✓ | ✓ 0 | ✓（无行） | ✓ `Found Cow`＋mooshroom 空 | ✓ 1 | ✓ 0 行 |
| W-39h | ✓ 摆场（沙＋石圈水盆） | — | — | ✓ | ✓ dig-start／dig-stop | ✓ 0 | ✓ 有 block= 列 | — | ✓ 8 | ✓ 1 行 |
| W-39i | ✓ 摆场（素土） | — | — | ✓ | ✓ dig-start／dig-stop | ✓ 0 | ✓ 有 block= 列 | — | ✓ 20 | ✓ 1 行 |
| W-39e | ✓ | ✓ | ✓ `Age 0` | ✓ | ✓ | ✓ 0 | ✓（无行） | ✓ 已剪 | ✓ 1 | ✓ 0 行 |

全相判行与通道计数（`-server-latest.log` 直数）：

| 相 | decay 总 | `face=shearing` | `face=breaking` | `face=attacking` | mine speed | mine deny | `reach denied` | probe 行（dur 面／cfg 伴行面） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | **4** | **2**（50×1 ＋ 0×1） | **2**（reeds 8＋leaves 20） | **0** | 2（reeds／leaves `str=5.0`） | 0 | **0** | 48（24／24） |
| G | **0** | **0** | **0** | **0** | 0 | 0 | **0** | 6（3／3） |

计数总账（写死判，驱动 `ledger` 逐相核）：A 相 shearing **恰 2**／breaking **恰 2** ⇒ `ok:true`；G 相 shearing **0**／breaking **0** ⇒ `ok:true`；两相 `deny=0`、`reachDenied=0`（零噪声面）。

**last-sig 陷阱直证（条 157 定谳收位）**：a 点（`loss=50`）与 f 点（`loss=0`）落在**同一去重键** `shearing|etim:shears_rusted_iron`（`ETIMMining.java:623` 无 block 后缀），两行**都在**（07:53:48 与 07:54:28）⇒ 去重只吞「同键**同值**」（`ETIMMining.java:631-634`），值变即再发行。b 点未产行不是被吞：其路径根本不进 handler（durΔ0 反证无磨损）。

旁证面（附记，不判）：哞菇剪后 5 份红蘑菇掉落（`onSheared` 返回 5 栈）＋ cow 立刻进入 ETIM livestock 面（`[AILog] livestock … entity=EntityCow#2065`）；羊血 `Health:8.0f` 剪前/剪后同值、哞菇 `Health:10.0f`；剪毛音仍无服务端通道（W-38 C-6 维持）。

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\entitylog1-w39-a-server-latest.log`（503,384 B）／`…-g-server-latest.log`（81,267 B）；控制台全量：`…-a.out`（517,400 B）／`…-g.out`（95,981 B）；逐点证据：`…-evidence.json`（52,591 B）。

### W-39a 锈剪 × 成年未剪羊（本批主证：`loss=50` × 1，dur 0→50）

```text
[07:53:47] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:53:48] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=shearing item=etim:shears_rusted_iron loss=50 [server]
[07:53:52] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=50/3200 [server]
```

（读法：行**无 `block=` 列**（`state=null` 形，`ETIMMining.java:314`），loss 即 R196 flat 50；同窗口 `{Sheared:0b}` 命中→剪后 `{Sheared:1b}` 命中、`{Sheared:0b}` 不命中，dur 0→50 且**只有 1 条** shearing 行 ⇒ 单次发行无重复。`stackParam` 走 host 栈参数（`MixinItemShears.java:140-143`），helper 逻辑见 `ETIMMining.java:305-316`。）

### W-39b 同羊再剪（已剪羊：0 行，Δ0）

```text
[07:53:56] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:53:57] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Selector '@e[type=item]' found nothing
[07:54:01] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（读法：零行的机制不在 handler 内 —— `EntitySheep.isShearable`（`EntitySheep.java:424`）在 `getSheared()` 为真时返回假 ⇒ `ItemShears.java:60` 的 `if` 不进 ⇒ `damageItem`（`ItemShears.java:73`）不被调用 ⇒ redirect 与 helper 均不可达。durΔ0 与「无落毛」双证。）

### W-39d vanilla 剪 × 成年羊（0 行，Δ1 —— else 支原调直证）

```text
[07:54:06] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=minecraft:shears dur=0/238 [server]
[07:54:11] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=minecraft:shears dur=1/238 [server]
```

（`stackParam.getItem() instanceof ETIMItemShearsRusted` 为假 ⇒ 走 `MixinItemShears.java:146-147` 的 vanilla +1 原调，238 面自洽，零 ETIM 行。）

### W-39c 锈剪 × 幼羊（0 行，Δ0 —— isChild 门）

```text
[07:54:17] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:54:17] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] livestock well food=0.89 water=0.82 freedom=1.00 child=true entity=EntitySheep#2059 [server]
[07:54:21] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（`EntitySheep.java:424` 的 `!isChild()` 使 `isShearable` 假 ⇒ 同上不进 `damageItem` ⇒ 0 行；`entitydata` 双读 `Age -23945 → -23841`（幼），剪后 `{Sheared:0b}` 仍命中＝完全未被剪。）

### W-39f 创造模式锈剪 × 成年羊（★反转判点：恰 1 条 `loss=0`，Δ0）

```text
[07:54:27] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:54:28] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=shearing item=etim:shears_rusted_iron loss=0 [server]
[07:54:32] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（读法：**行存在且 loss=0**，与真栈 durΔ0 自洽 —— 不撒谎的负证据行。创造门在**发行前**（`ETIMMining.java:309-310`），故不会出现 W-38 口径的「0 行」；同窗口剪毛照发生（`{Sheared:1b}` 命中）。真栈不动的机制锚仍为 `EntityPlayer.interactOn:1325-1328`（创造模式把交互目标栈换成副本再 `:1330` 下发，W-38 C-3）。）

### W-39g 锈剪 × 哞菇（门②反证：0 行，Δ1，场上 mooshroom→cow）

```text
[07:54:36] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: The data tag did not change: {… Health:10.0f, Silent:1b, … NoAI:1b, … Pos:[-68.5d,76.0d,249.5d], …}
[07:54:37] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:54:38] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.mushroom
[07:54:39] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Selector '@e[type=mooshroom]' found nothing
[07:54:40] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Cow
[07:54:41] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Selector '@e[type=mooshroom]' found nothing
[07:54:42] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（读法：哞菇 `isShearable`＝`getGrowingAge() >= 0`（`EntityMooshroom.java:93`）为真 ⇒ `onSheared`（`:95-97`）把自己 `setDead`、生成 `EntityCow`、返回 5 份红蘑菇；回到 redirect 时 `entity instanceof EntitySheep` 为假 ⇒ 0 行、vanilla +1（`MixinItemShears.java:146-147`）⇒ dur 0→1。门②（1.12 另两个 IShearable 实现者 keep +1）实测收位。）

### W-39h 锈剪 × 甘蔗（回归：`block=reeds loss=8`，dur 0→8）

```text
[07:54:48] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]
[07:54:48] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=8/3200 [server]
```

（与 W-36a／W-37i／W-38g 同值同形；`dig-start`／`dig-stop` 均在 `BlockPos{x=-68, y=76, z=249}`，2,697 ms 后 air 轮询确认；`mine speed … str=5.0` 为记录面（条 149 C-1），不判。）

### W-39i 锈剪 × 树叶（回归：`block=leaves loss=20`，dur 0→20）

```text
[07:54:53] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=leaves loss=20 [server]
[07:54:54] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39A#191 held=etim:shears_rusted_iron dur=20/3200 [server]
```

（与 W-37a／W-38h 同值同形；2,702 ms 后 air 确认。实体面 shearing 行与块面 breaking 行键域互不串门。）

### W-39e off 相（`miningReform=false`）：锈剪 × 成年羊（0 行，Δ1）

```text
[07:55:19] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39G#21 held=etim:shears_rusted_iron dur=0/3200 [server]
[07:55:24] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W39G#21 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（`!miningReform` 首支（`MixinItemShears.java:127-131`）原调 `damageItem(vanillaAmount, shearedEntity)` ⇒ dur +1、G 相零判行（shearing／breaking／speed／deny 全 0）—— 今日行为基线复现。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 7 条（均不改判点判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **攻击面（`face=attacking`）的创造门缺口**：helper 注释自述该面「发行前无创造门」属既存缺陷（`ETIMMining.java:281-291` 的 attacking 行无创造判）。本窗 attacking 行 A／G 相均 **0**（无攻击判点），故**本批未实测**，不能据此判定攻击面行为。 | 转交主会话：另批或并入攻击面批时实测；本批仅登记。 |
| C-2 | C | **哞菇判据锚必须换面**：剪后哞菇 `setDead`，`entitydata @e[type=mooshroom] {}` 返回 `Selector … found nothing`（`nbtAfter` 全 null，非解析故障）。 | 哞菇面判据固定为 `testfor @e[type=cow]` 命中 ＋ `testfor @e[type=mooshroom]` 空（本窗已按此判）。 |
| C-3 | C | **幼羊 Age 仍逐 tick 漂移**：`-23945 → -23841`（≈104 t/5 s），与 W-38 C-7 同源；`NoAI` 不减计时。 | 判窗内不影响 `isChild` 门（24000 t 量级）；长窗重测幼羊注意漂移。 |
| C-4 | C | **剪毛音仍无服务端通道**：全窗无 `playSound` 类行（W-38 C-6 维持）。 | 维持「不可达面」登记，不用截图/手感替代（AGENTS §9）。 |
| C-5 | C | **`mine speed` 行在回归面出现 2 条**（reeds／leaves 均 `str=5.0`）。 | 记录面（条 149 C-1），不判不扰；亦不参与本批总账。 |
| C-6 | C | **哞菇落物 5 份红蘑菇**（`onSheared` 返回 5 栈；本窗 `testfor @e[type=item]` 捕到 `Found item.tile.mushroom`）。 | 旁证不判（落毛/落物数属随机或固定掉落面，W-38 C-5 惯例）。 |
| C-7 | C | **cow 转换后接管 ETIM livestock 面**：`[AILog] livestock … entity=EntityCow#2065`＋`[AILog] mob despawn counter-meter … entity=EntityCow#2065`。 | 旁证记录：实体面转换不丢 ETIM 能力挂载；不参与本批判值。 |

补充记录面（不计 C）：`blockDebugLog=true` 下 probe 每次两条（dur 面 ＋ `cfg blockModel=…` 伴行面），A 相 48 条＝24＋24、G 相 6 条＝3＋3；判值正则以 `held=` 锚定，未受污染（W-37 C-1／W-38 C-1 先例沿用）。

## 4. 结论

**判点 9/9 全通过（W-39a／b／c／d／e／f／g／h／i），驱动总判 PASS（`evidence.json.verdict=PASS`）；计数总账两相 `ok:true`。**

- **新增面兑现（本批主目标）**：锈剪 × 成年未剪羊发行 **恰 1 条** `face=shearing loss=50`（无 block 列）＋ dur 0→50 ⇒ 羊面损耗从「只有探头可读」升级为「判行可读」，且行值与实际磨损逐位一致（50＝R196 flat）。
- **★反转判点收位**：创造模式剪毛发行 **恰 1 条 `loss=0`**、真栈 Δ0 —— 负证据行（不撒谎）成立；W-38f 的「0 行」口径正式翻面为「1 条 loss=0」。
- **零发行三面**：已剪羊（b）、幼羊（c）、vanilla 剪（d）、哞菇（g）、off 相（e）共 5 点全 0 行，各自机制独立且在案（`getSheared()` 门／`!isChild()` 门／非 ETIM 剪具 else 支／非 `EntitySheep` 支／`!miningReform` 首支）。
- **去重纪律直证**：a(50) 与 f(0) 同键不同值 ⇒ 两行并存；b 点 0 行非吞噬（durΔ0 反证）。同键同值多点复测须换值或 fresh boot 的工装纪律由此获得实测支撑。
- **回归无扰**：reeds `loss=8`／leaves `loss=20` 与 dur 8／20 逐位复现 ⇒ 实体面 helper 与块面两处 redirect（`onBlockDestroyed`／`onBlockStartBreak`）互不串门。
- **MK/钉值**：refmap 双树 **62 类键／138 条目**（**139 未出现**，条 157 主预言命中）、mixins 56／client 10；cfg 起收 byte-identical（零新键）；release 771,368 B（相对 W-38 的 771,189 B 增 179 B）、dev 755,574 B。
- **产品面**：两相 `:jar UP-TO-DATE`，0 rebuild；判窗内产品码 0 改动（HEAD `87d0edd` 起收同值）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.456s／1.031s)` → stdin `stop` → `BUILD SUCCESSFUL`（1m 35s／29s）、退出码 0（两相同值 `{exitCode:0, exited:true}`） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两处键值改：`blockDebugLog=false→true`、`miningReform=true→false`，收口整档还原） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=entitylog1`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical |
| 世界 | 新世界 `entitylog1`（两相复用）；收口删除目录（`worldDirRemoved=true`） |
| 端口／崩溃 | 25565 = 0、25575 = 0（收口后）；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W39A`／`ETIM_W39G`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `entitylog1-w39-a.out`（517,400 B）／`…-g.out`（95,981 B）、`…-a-server-latest.log`（503,384 B）／`…-g-server-latest.log`（81,267 B）、`…-evidence.json`（52,591 B，含逐点 probe 前后行、NBT 前后、判行原文、落物、剪毛态／cow 断言）、`…-etim.cfg.before`／`…-server.properties.before`／`…-{ops,usercache,usernamecache}.json.before`；冒烟 `entitylog1-w39-smk-*`（单轮 a/b/f/g 4/4 PASS，先行验证 mooshroom 分支与行形） |
| 驱动 | `testharness\player\entitylog1-w39.js`（两相 A／G；`rows[]` 行表断言＋`hasBlockCol` 无 block 列断言＋`ledger` 总账；`W39_ONLY`／`W39_PHASES` 仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `87d0edd` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\entitylog1-w39.js`
- `testharness\reports\entitylog1-W39-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-1 攻击面创造门缺口**：是否与 entitylog1 同批收口（给 attacking 行加发行前创造门）或另立批 —— 本窗未实测，不宜在无证据下改判。
2. **C-2 哞菇判据锚**：把「哞菇面判据＝cow 命中＋mooshroom 空」写入实体面工装模板（与 W-38 C-2 体心瞄准并列）。
3. **W-38 C-2 纪律复验**：体心瞄准（成年 0.60／幼羊 0.30／哞菇 0.70）＋`reach denied=0` 入判据在本批两相（48＋6 条 probe 窗口）继续零拒，建议正式固化。
4. **同键同值吞行纪律**：本批直证「值变即再发行」；后续实体面多点复测（同工具同 face）拟统一「换值路径或 fresh boot」二选一，是否写入工装模板。
5. **盲区维持**：雪傀儡面本窗未测（与哞菇同属门② keep +1 面，1.12 存在、R196 无面），维持盲区登记。


## 7. 自报（机械核讫）

> 文件：`testharness/reports/entitylog1-W39-verdict.md`｜**24809 B**（全文）｜SHA-256（**本节之前**的正文，即 `## 7. 自报（机械核讫）` 及其以下全部行不计入）`F2CF1F9B1CE5A5EB395F690B701973BB40750CD899AE956F6DAAD413E04B8D81`｜anchors **14 / missing 0**｜tables **7 / bad 0**｜首字节 0x23｜UTF-8 无 BOM｜LF｜0 U+FFFD
