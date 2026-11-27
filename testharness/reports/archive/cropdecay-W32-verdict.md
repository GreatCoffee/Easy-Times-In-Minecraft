# 农物衰减批（B-SK-1 兑现）· W-32a…e 判决回执

> **报告字节规格**：`19,389 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 68 / ✗ 2｜203 行`
> 执行方：会话七（自动化测试执行方）｜窗口：2026-10-29 22:29–22:31（服务器本地时；驱动 UTC 14:29–14:31）｜tag `cropdecay-w32`
> 判决源：判据只吃服务端 `[MiningLog] tool decay face=breaking … loss=` 行；旁证 = 同栈耐久回读（`[BlockLog] probe … dur=x/max` ＋ 假人 NBT `durabilityUsed` 双路）
> 审判权威：audit20 条 128/129/130（修法 @D、B-8 措辞、防误期待表）+ 主会话 W-32 任务书

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `0b1d66d`（mining: B-SK-1 tail - @D guard-hardness redirect） | ✓ 起窗/收口同值 |
| dev jar | 751,082 B｜`35549D2D4B5EFC6BF1508236D0231846FCD6FD69FEE2A040453C3BB5EC1EA103` | ✓ 逐位命中（起/收同值） |
| release jar | 766,792 B｜`48F4999B7174B25930792A66A964413BB9CF7B5EB2170E52F5CA56784C084C9B` | ✓ 逐位命中 |
| 附属 jar | **不在场**（本批不需要五盾） | ✓ `run\mods` 25 文件未动、无 etimextra；两相 FML 清单 15 mods 无 etimextra |
| 世界 | `level-name=test27dev` → 窗内新世界 `cropdecay32` → 收口还原 | ✓ `Preparing level "cropdecay32"` 两相在案；世界目录收口删除 |
| `run\config\etim.cfg` | 31,055 B｜`EBBA318552444A9F7983719C6A67B0A77802425ACDA8C2046FAA0CC7EDA004C0` | ✓ 起窗快照 = 收口整档（byte-identical）；窗内只改两处键值 |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收同值（byte-identical）；窗内改 `level-name` ＋ `spawn-protection=0` |
| 构建 JDK | `gradle.properties` 的 `org.gradle.java.home` → zulu25（agents.md 条 0） | ✓ 未设 JAVA_HOME、未现搜 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ 0 rebuild |
| 通道 | `gradlew runServer` ＋ 控制台 stdin（`server-console.js`，commit `89ce11a`） | ✓ `/etest hold`、`/etest dig`、`/etest blockprobe` 在役 |
| 环境前置 | 25565 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

注入口与旁证面（每判点逐条执行）：

- 工具：`/etest hold <item> <bot>`（建全新栈 damage=0；**不带耐久附魔**，防 `negateDamage` 抽骰污染 loss 面）。
- 摆场：`/setblock` 三连（支撑块 → 目标位清空 → 目标块），落点列取自假人自身 chunk（`/fill` 在未加载区静默不落地，首跑已证）。
- 挖块：`/etest dig <x> <y> <z> <bot>`（START 即时、STOP 后 40 tick；server 侧 `tryHarvestBlock` 完成并触发 `ItemTool.onBlockDestroyed`）。
- 耐久旁证：`/etest blockprobe <bot>` → `[BlockLog] probe … dur=x/max`（服务端权威）＋ mineflayer `heldItem.durabilityUsed`（NBT 侧），两路逐点同值。

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh 挖块（每点换块/换工具取 fresh 行，规避 `ETIMMining.java:587` 的 last-sig 去重），判 **判行 loss 定值** ＋ **dur Δ 旁证**；不判 Σ 击数。

| 判点 | 工具 × 方块 | 期望 loss | 实测判行 loss | 判行条数 | dur Δ（probe / NBT） | 期望 durΔ | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-32a | `etim:scythe_rusted_iron` × `minecraft:tallgrass` | 2 | **2** | 1 | **2 / 2**（0→2） | 2 | **✓ 通过** |
| W-32b-1 | `etim:scythe_rusted_iron` × `minecraft:yellow_flower`（蒲公英） | 无行 | **无行** | 0 | **0 / 0** | 0 | **✓ 通过** |
| W-32b-2 | `etim:scythe_rusted_iron` × `minecraft:torch` | 无行 | **无行** | 0 | **0 / 0** | 0 | **✓ 通过** |
| W-32c | `etim:scythe_rusted_iron` × `minecraft:wheat`（成熟，age=7，farmland 支撑） | 2 | **2** | 1 | **2 / 2**（0→2） | 2 | **✓ 通过** |
| W-32e（可选） | `minecraft:iron_axe` × `minecraft:sapling` | 5 | **0** | 1 | **0 / 0** | 5 | **✗ 反点**（C-1） |
| W-32d-1 | `etim:scythe_rusted_iron` × `minecraft:tallgrass`（reform **off**） | 无行 | **无行** | 0 | **0 / 0** | 0 | **✓ 通过** |
| W-32d-2 | `minecraft:iron_axe` × `minecraft:dirt`（reform **off**） | 无行 | **无行** | 0 | **1 / 1**（0→1） | 1 | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 支撑块落地 | 目标块落地 | 挖前在场 | dig-start | dig-stop | 挖后块消失 | 无障碍行（reach/fell/died） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-32a | ✓ Block placed | ✓ Block placed | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32b-1 | ✓ | ✓ | ✓ yellow_flower | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32b-2 | ✓ | ✓ | ✓ torch（meta 5） | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32c | ✓ farmland 7 | ✓ | ✓ wheat | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32e | ✓ | ✓ | ✓ sapling | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32d-1 | ✓ | ✓ | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-32d-2 | ✓ | ✓ | ✓ dirt | ✓ | ✓ | ✓ air | ✓ 无 |

窗面分离（A 相 vs B 相，同工具同块）：

| 对照 | reform on（A 相） | reform off（B 相） | 结论 |
| --- | --- | --- | --- |
| 锈镰 × 高草 | 判行 `loss=2` ＋ dur 0→2 | **无判行** ＋ dur 0→0 | 开关有效；off 分支不进 `ETIMMining`（`MixinItemTool.java:65` 早退，改读原生 `getBlockHardness`） |
| 铁斧 × dirt | （未在 A 相跑） | **无判行** ＋ dur 0→1 | off 分支走 vanilla `damageItem(1)`，行级去重面亦不出行（两断言合判） |

## 2. 判决源（逐判点原文）

服务端全量日志：`testharness\build-logs\cropdecay-w32-a-server-latest.log`（A 相）与 `…-b-server-latest.log`（B 相）；控制台全量：`…-a.out`／`…-b.out`。以下每点给 **摆放/在场 → 基线 → 挖 → 判行 → 事后** 五段原句。

### W-32a 高草 × 锈镰（loss=2，dur 0→2）

```text
[22:29:39] [Server thread/INFO] [minecraft/DedicatedServer]: Block placed
[22:29:40] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
[22:29:40] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:40] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:scythe_rusted_iron block=tallgrass str=5.0 [server]
[22:29:40] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:42] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=tallgrass loss=2 [server]
[22:29:42] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:44] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=2/3200 [server]
[22:29:44] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
```

### W-32b-1 蒲公英 × 锈镰（0 行，dur 0→0）

```text
[22:29:46] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
[22:29:46] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:46] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine deny grade=2 required=0 item=etim:scythe_rusted_iron block=yellow_flower [server]
[22:29:46] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:48] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:51] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:50] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
```

（window 内 `tool decay` 行数 = 0；`mine deny` 属挖速有效性面，非本批判行。）

### W-32b-2 火把 × 锈镰（0 行，dur 0→0）

```text
[22:29:52] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
[22:29:52] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:53] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine deny grade=2 required=0 item=etim:scythe_rusted_iron block=torch [server]
[22:29:53] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:55] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:29:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:57] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
```

### W-32c 成熟小麦 × 锈镰（loss=2，dur 0→2）

```text
[22:29:59] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
[22:29:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:29:59] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:scythe_rusted_iron block=wheat str=5.0 [server]
[22:29:59] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:30:01] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=wheat loss=2 [server]
[22:30:01] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:30:03] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=etim:scythe_rusted_iron dur=2/3200 [server]
[22:30:03] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
```

### W-32e 树苗 × 铁斧（**反点**：判行 loss=0，dur 0→0）

```text
[22:30:05] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
[22:30:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=minecraft:iron_axe dur=0/9600 [server]
[22:30:05] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:30:07] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_axe block=sapling loss=0 [server]
[22:30:07] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32A pos=BlockPos{x=-68, y=76, z=249}
[22:30:10] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32A#191 held=minecraft:iron_axe dur=0/9600 [server]
[22:30:09] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 76, 249
```

### W-32d-1 高草 × 锈镰（reform off：0 行，dur 0→0）

```text
[22:30:32] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 84, 249
[22:30:32] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32B#56 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:30:32] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32B pos=BlockPos{x=-68, y=84, z=249}
[22:30:34] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32B pos=BlockPos{x=-68, y=84, z=249}
[22:30:37] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32B#56 held=etim:scythe_rusted_iron dur=0/3200 [server]
[22:30:37] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 84, 249
```

（window 内 `tool decay` 行数 = 0；同工具同块在 A 相为 `loss=2` ＋ 0→2，开关面互证。）

### W-32d-2 dirt × 铁斧（reform off：0 行，dur 0→1）

```text
[22:30:39] [Server thread/INFO] [minecraft/DedicatedServer]: Successfully found the block at -68, 84, 249
[22:30:39] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32B#56 held=minecraft:iron_axe dur=0/250 [server]
[22:30:39] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn32B pos=BlockPos{x=-68, y=84, z=249}
[22:30:41] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn32B pos=BlockPos{x=-68, y=84, z=249}
[22:30:43] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_Harn32B#56 held=minecraft:iron_axe dur=1/250 [server]
[22:30:43] [Server thread/INFO] [minecraft:DedicatedServer]: Successfully found the block at -68, 84, 249
```

（window 内 `tool decay` 行数 = 0；dur +1 = vanilla `damageItem(1)`，与 B-8 修正一致。）

## 3. 冲突分级（A / B / C）

A 级 0 条、B 级 0 条；C 级 5 条（均不改判据、不动阈值，按条待裁/留档）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **W-32e 期望值缺陷**：任务书期望 `loss=5`，实测 `loss=0`（dur 0→0）。根因双钉：① 本 mod 的第三道门 `getCurrentPlayerStrVsBlock(...) <= 1.0F → loss=0`（`ETIMMining.java:266`）在 `hardness>0` 与公式（`:270`）之前把非有效工具打 0；② 铁斧对 sapling（Material.plants）不在有效集 —— R196 `ItemAxe.java:6` 材料列表（cactus/clay/glass/hardened_clay/ice/pumpkin/wood）＋ `ItemAxe.java:9` 方块列表（ladder/reed/sandStone）均不含 sapling，`ItemTool.java:203` 的 `getStrVsBlock(...) <= 1.0F` 门同样打 0（`Item.java:886` 默认返 0.0F）。运行时旁证：该 dig **无 `[MiningLog] mine speed` 行**（该行只在有效性分支打印，见 `ETIMMining.java:207`），与「未进有效路径」互证。**两代同源同为 0**，非本批落码引入，且 W-32e 的「新面」部分（守卫过门）已由「有行」本身证明（sapling 行存在 = 0.02 表行被读到） | 期望值与 防误期待表 同批交主会话改判（改期望 0/删点）；产品面不动 |
| C-2 | C | **驱动首版缺陷①**：支撑块字段缺省时写成 `minecraft:undefined`，火把落空后立即弹掉（attempt1 的 W-32b-2 呈 `The block at … is Air`）。修驱动（支撑块缺省 = dirt）后整窗重跑 | 工装缺陷；attempt1 整档留档，不影响判值 |
| C-3 | C | **出生点保护拦挖块**：假人落世界出生点，`spawn-protection` 默认 16 ⇒ `START_DESTROY_BLOCK` 被 `isBlockModifiable` 拒（方块不消失、无判行、**且无任何拒绝日志**——vanilla 该路径静默返）。对照实验锤定：窗内置 `spawn-protection=0` 后同一 dig 即刻生效（同驱动同坐标），收口 properties 字节还原 | 工装面；已写入驱动注释与窗口纪律 |
| C-4 | C | **负证两种形状**（读法注记）：① 硬度 0 的方块（蒲公英/火把）= 守卫先短路 ⇒ **零行**；② 守卫过但有效性门拒（sapling × 铁斧）= **一行 `loss=0`**。二者都是「零磨损」，但行数不同，后续窗口不得把「有 loss=0 行」误读为磨损 | 判读口径注记（条 129 防误期待的补充） |
| C-5 | C | **防误期待表两行同源误判**（静态推定，未实测）：scythe×sapling=10、scythe×double_plant=10 均以「isScytheBlock=false → 2.0 档」推得，但同样漏了有效性门（R196 `ItemScythe.java` 有效集 = tallGrass+crops；`double_plant` 与 sapling 均不在内），实际会落 `loss=0` 而非 10 | 与 C-1 同案交裁；不另开实测 |

无 provenance 回指：本窗只判「判行定值 + dur 旁证 + 开面/回退面」，未以其他批次结论作反对理由；零改码（产品码 0 改动、` :jar UP-TO-DATE`）。

## 4. 结论

**核心判点 W-32a / W-32b-1 / W-32b-2 / W-32c / W-32d-1 / W-32d-2 全部通过；W-32e（可选点）为反点（C-1），非产品面缺陷。**

- 守卫面（@D 重定向）成立：高草 `loss=2` ＋ dur 0→2（`MixinItemTool.java:64` 读 `ETIMMining.getHardness`，表行 0.02 生效）；成熟小麦 `loss=2` ＋ dur 0→2（`MixinBlockCrops.java:28` 的 0.02F 保住 `MixinBlockCrops` 面），作物回归面未破。
- 负证面成立：蒲公英/火把 0 行 ＋ dur 0（两代 0.0 拦死面，条 129 钉）；且**不是** vanilla 的 −1/块。
- 回退面成立：`miningReform=false` 下同工具同块 0 行 ＋ 0 磨损（**B-8 修正成立**：off 分支零磨损，非 −1）；dirt 类字段 >0 方块走 vanilla `damageItem(1)`（dur +1）且 0 行。
- 反点定位：**W-32e** —— 期望 `loss=5` / 实测 `loss=0`；根因 = 有效性门（两代同源），非本批 @D 改动；`loss=0` 行本身证明守卫已过门（0.02 表行生效）。建议主会话按 C-1 改期望值（0）或删该可选点，并把 C-5 两行同案修正。
- 零改码：产品码 0 改动、配置 0 新增键（只改 `blockDebugLog`/`miningReform` 两处值）、两相 `:jar UP-TO-DATE`。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | A 相 `Done (5.776s)` 22:29:32 → stdin `stop` → `BUILD SUCCESSFUL`、退出码 0；B 相 `Done (1.135s)` 22:30:25 → `stop` → `BUILD SUCCESSFUL`、退出码 0 |
| `run\config\etim.cfg` | 31,055 B｜`EBBA3185…DA004C0`，**起收 byte-identical**（窗内两处键值改：`blockDebugLog=false→true`、`miningReform=true→false`） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=cropdecay32`、`spawn-protection=0`） |
| 世界 | 新世界 `cropdecay32` 两相复用；收口删除目录（`worldDirRemoved=true`） |
| 端口 / 崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 + 假人 `ETIM_Harn32A` / `ETIM_Harn32B`） |
| 钉值复核 | dev/release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `testharness\build-logs\cropdecay-w32.out` 系列：`-a.out` / `-b.out`（全量控制台）、`-a-server-latest.log` / `-b-server-latest.log`（服务端日志）、`-evidence.json`（逐判点＋逐行）、`-lines.txt`（逐判点原文摘录）、`-etim.cfg.before`、`-server.properties.before`、`-attempt1-*`（首跑留档）、`-smoke{,2,3}-*`（首跑排障留档） |
| 驱动 | `testharness\player\cropdecay-w32.js`（两相：A reform on / B reform off；`W32_ONLY`/`W32_SKIP_B` 调试口仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `0b1d66d` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\cropdecay-w32.js`
- `testharness\reports\cropdecay-W32-verdict.md`（本回执）
