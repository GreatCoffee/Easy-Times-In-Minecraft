# 阶段四 batch B1（熔炉五档 + 温度门控 + 四矿 + 端到端）· 判决报告

> **执行方**：会话七（验证窗执行）
> **判决源**：`playground/audit/metal-furnace-B1-落码批文.md` ＋ `audit20-裁定回执.md` 补50/补51
> ＋ 本窗任务书 `playground/audit/metal-furnace-B1-验证窗任务书.md`
> **现役钉值**：jar **420,717 B** @ **2026-10-23 22:10:12**｜
> SHA256 **EB9F1369B017A7544A4F6D00349AEB41025A0375ECD4AAFE77D2F8E5FBDE244A**｜commit **7b2cbf0**
> **判定面**：`run/obfuscated-server/logs/latest.log`（`[FurnaceLog]` / `[TestLog]`）＋ 驱动侧统计
> **口径**：通过用 ✓、不通过用叉号；本报告 UTF-8 无 BOM、0 U+FFFD。窗口内 0 次 rebuild。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 420,717 B | 420,717 B | ✓ |
| jar 时间 | 2026-10-23 22:10:12 | 2026-10-23 22:10:12 | ✓ |
| SHA256 | EB9F1369…DE244A | `EB9F1369B017A7544A4F6D00349AEB41025A0375ECD4AAFE77D2F8E5FBDE244A` | ✓ 逐位 |
| commit | 7b2cbf0 | `7b2cbf0` | ✓ |
| `src/main` 相对 HEAD | 0 改动 | `git status --porcelain -- src/main` = 0 行 | ✓ |
| 载入面 | classpath append（mods 零 etim） | `classpath append: …etim-1.0.0.jar (mtime=2026-10-23 22:10:12)` | ✓ |
| 配置面 | furnaceDebugLog/HeatSystem/metalSystem/metalOreGen=true，foodTestMode=false | 启动后 `etim.cfg` 逐项为 true/false | ✓ |
| 窗口内重建 | 禁止 | 全程 0 次 | ✓ |

**世界**：新建 `b1verdict`（`level-type=DEFAULT`、`generator-settings=` 空、`difficulty=0`），
工装平台 y=99（石）、六炉 y=100、工作台 (44,100,12)。收口已还原 `server.properties`
（`level-name=testw2h` / `difficulty=1`）。

---

## 一、判决类清单（V1~V10）

| # | 判点 | 判词 | 依据（一手续行锚） | 判值 |
|---|---|---|---|---|
| V1 | 注册面（boot 静态行） | **PASS** | `ETIMBlocks.registerRecipes` :143；`ETIMMetalLoot` :46 | 注册行 **1**、注入行 **1**（两次 boot 各 1） |
| V2 | cap 按块（GUI 放置） | **PASS** | `FurnaceHeat.getCapFor` :172-177；`MixinContainer.etim$furnacePlaceDeny` :71-119 | **18/18** 格（拒 12 / 收 6），行内 `cap=` + `furnace=` 逐位对 |
| V3 | 温度门控矩阵 | **PASS** | `MixinTileEntityFurnace.etim$heatGate` :199-271；`FurnaceHeat.getSmeltingResult` :243-258 | **6/6** 格（admit 3 + blocked 2 + 夹紧 1），`heat=`/`required=` 逐位 |
| V4 | 大件三层 | **PASS** | `ETIMBlockFurnace` 大件门（R196 BlockFurnace:240-242）；`MixinSlotFurnaceFuel` :57-70；`MixinSlot` :172-186 | clay 2 拒 / vanilla 2 收，**4/4** |
| V5 | F-8-16 heat_level 重载 | **FAIL（A-1）** | `MixinTileEntityFurnace.etim$readHeatLevel` :532-545 → `FurnaceHeat.getNameFor` :196-202 | 重载即 NPE，`heat load` 行 **0**，TE 被丢弃、秘银进度全丢 |
| V6 | F-8-20 熄火面 | **PASS** | `MixinTileEntityFurnace.etim$extinguish` :565-608 | flooded / smothered 各 1 行 + 块回 idle；`burnTime==1` 对照组有行、豁免组 0 行 |
| V7 | 三矿 gen 统计 | **PASS（生成面）／判带待裁 B-1** | `MixinBiomeDecorator` TAIL；`ETIMOreGen.generateOverworld` :43-47 | 25 陆地块：铜 261（10.44/块）、银 160（6.40）、秘银 66（2.64）、艾德曼 **0** |
| V8 | 地牢箱 loot 注入 | **PASS** | `ETIMMetalLoot` :46（`[TestLog]` 行） | 注入行 ×1（实地 roll 挂 C 观察，不判） |
| V9 | 熔炼 XP 五金属 | **PASS 4/5 ＋ 1 阻塞（A-2）** | `FurnaceXpRewards.addReward`（10/15/40/20/100） | Δ = **10 / 15 / 40 / 100** 逐位；远古金属负证因 A-2 无 item 可喂 |
| V10 | 9:1 互转 | **BLOCKED（A-2）** | `ETIMBlocks` :124-135（shapeless ×10） | 十个金属粒/锭**未注册**：`/give` 全 "no such item"，不可喂料 |

**总记**：PASS 6（V1/V2/V3/V4/V6/V8）｜FAIL 1（V5）｜生成面 PASS 但判带待裁 1（V7）｜
PARTIAL 1（V9 4/5）｜BLOCKED 1（V10）｜**A 级真值冲突 2 笔**。

---

## 二、逐判点核讫

### V1 · 注册面

```
[22:38:59] [FurnaceLog] batch B1 metal content registered: 10 furnace blocks, 4 ores, 10 metal items,
           4 smelting rows, 9:1 conversions, 4 heat rows [server]
[22:39:00] [TestLog] dungeon chest loot injected: ancient metal nugget+ingot (1-4, weight 10) [server]
```

| 判据项 | 判值 | 判 |
|---|---|---|
| 注册行恰 1 行/boot | boot1 = 1、boot2 = 1 | ✓ |
| loot 注入行恰 1 行/boot | boot1 = 1、boot2 = 1 | ✓ |

### V2 · cap 按块（GUI 放置路径）18/18

判法：`block_place` 打开真实 `ContainerFurnace`（FML openGui 只发 `window_items` 不发 `open_window`，
窗口 id 从该帧取），左键 hotbar0 入光标 → 左键燃料槽，判行 `gui place denied (heat=N cap=M furnace=X)`。

| 燃料（heat） | clay(1) | sandstone(1) | hardened(1) | obsidian(3) | netherrack(4) | vanilla(2) |
|---|---|---|---|---|---|---|
| 岩浆桶 (3) | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 收 ✓ `write slot=1` | 收 ✓ | 拒 ✓ `cap=2` |
| 烈焰棒 (4) | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 拒 ✓ `cap=3` | 收 ✓ `write slot=1` | 拒 ✓ `cap=2` |
| 煤 (2) | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 拒 ✓ `cap=1` | 收 ✓ | 收 ✓ | 收 ✓ |

全窗 13 条 `gui place denied`（V2 12 条 + V9 无配方 1 条），行内 `furnace=` 五名 + `minecraft:furnace`
全部逐位对齐，例：

```
[22:42:55] [FurnaceLog] gui place denied (heat=3 cap=1 furnace=etim:furnace_clay) item=minecraft:lava_bucket [server]
[22:43:12] [FurnaceLog] gui place denied (heat=4 cap=3 furnace=etim:furnace_obsidian) item=minecraft:blaze_rod [server]
[22:43:04] [FurnaceLog] gui place denied (heat=3 cap=2 furnace=minecraft:furnace) item=minecraft:lava_bucket [server]
```

### V3 · 温度门控 6/6

| # | 炉（cap） | 输入 | 燃料（heat） | 判行（原文摘录） | 判 |
|---|---|---|---|---|---|
| 1 | sandstone(1) | 沙 ×4 | 木炭(1) | `[22:50:59] smelt admit heat=1 required=1 input=minecraft:sand` ＋ `[22:51:12] xp payout item=minecraft:sandstone count=1 points=0` | ✓ |
| 2 | sandstone(1) | 铁矿 | 木炭(1) | `[22:51:16] smelt blocked heat=1 required=2 input=minecraft:iron_ore furnace=etim:furnace_sandstone result=heat-gated` | ✓ |
| 3 | vanilla(2) | 铁矿 | 煤(2) | `[22:51:19] smelt admit heat=2 required=2 input=minecraft:iron_ore` ＋ `[22:51:32] xp payout item=minecraft:iron_ingot count=1 points=10` | ✓ |
| 4 | obsidian(3) | 秘银矿 | 岩浆桶(3) | `[22:51:35] smelt admit heat=3 required=3 input=etim:ore_mithril` ＋ `[22:51:49] xp payout item=etim:ingot_mithril … points=40` | ✓ |
| 5 | netherrack(4) | 艾德曼矿 | 烈焰棒(4) | `[22:51:55] smelt admit heat=4 required=4 input=etim:ore_adamantium` ＋ `[22:52:10] xp payout item=etim:ingot_adamantium … points=100` | ✓ |
| 6 | obsidian(3) | 艾德曼矿 | 烈焰棒(4)（NBT 旁路） | `[22:52:14] smelt blocked heat=3 required=4 input=etim:ore_adamantium furnace=etim:furnace_obsidian_lit result=heat-gated` ＋ `[22:52:14] heat load level=4 burn=200 furnace=etim:furnace_obsidian_lit` | ✓ |

**两条口径偏差（已登记 B-2/B-3）**：
1. 批文本写「clay 炉 + 木炭 + 沙」，但沙/铁矿是方块 → 被 clay 的大件门拒（`slot denied large-item
   furnace=etim:furnace_clay slot=0 item=minecraft:sand`，22:43:51 实测）。热 1 两格改在 **sandstone**
   炉（同 cap=1、收大件）判；clay 的大件拒本身由 V4 正判。**判点语义未变**（heat=1 分支）。
2. 第 6 格（obsidian cap 3 + 烈焰棒 heat 4）在准入层被拒（V2 已证），故用 NBT 写入器注入
   `heat_level=4b/BurnTime=200s` 走「旁路写入者」面，验证 `etim$decisiveHeat = min(heat, cap)` 夹紧到 3。

### V4 · 大件三层（clay 拒 / vanilla 收）

```
[22:43:35] [FurnaceLog] fuel denied large-item furnace=etim:furnace_clay item=minecraft:boat [server]
[22:43:37] [FurnaceLog] slot denied large-item furnace=etim:furnace_clay slot=0 item=minecraft:cobblestone [server]
[22:43:39] [FurnaceLog] write slot=1 item=minecraft:boat [server]
[22:43:41] [FurnaceLog] write slot=0 item=minecraft:cobblestone [server]
```

**规律**：燃料槽走 `SlotFurnaceFuel` 覆写 → 先出 `fuel denied large-item`；输入槽（`Slot.isItemValid`）
出 `slot denied large-item … slot=0`。vanilla 两笔均落槽（`write slot=`），无 large-item 行 ✓。

### V5 · F-8-16 heat_level 重载 —— **FAIL（A-1）**

判法：obsidian 炉 + 岩浆桶 + 秘银矿，`testforblock` 确认 `_lit` 后烧 5.2 s → RCON `stop`
（22:56:44 `Stopping server` / `Saving worlds`）→ 重启 → 读 `heat load` 行并续烧取产物。

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| 重载判行 | `heat load level=3 burn=N>0 furnace=etim:furnace_obsidian` ×1 | **0 行** | 否 |
| TE 恢复 | 继续烧完出秘银锭 | `[22:57:13] Failed to load data for block entity minecraft:furnace`；重启后 `props={0:0,1:0,2:0}`（burn/cook 归零） | 否 |
| 取产物 | `xp payout item=etim:ingot_mithril` ＋ XP +40 | 无 payout，XP 185→185 | 否 |

**根因（A-1，NPE 栈逐帧）**：

```
java.lang.NullPointerException: null
    at io.github.etim.etim.furnace.FurnaceHeat.getNameFor(FurnaceHeat.java:198)
    at net.minecraft.tileentity.TileEntityFurnace.handler$zbh000$etim$readHeatLevel(TileEntityFurnace.java:1144)
    at net.minecraft.tileentity.TileEntityFurnace.func_145839_a(TileEntityFurnace.java:133)
    at net.minecraft.tileentity.TileEntity.func_190200_a(TileEntity.java:120)
    at net.minecraft.world.chunk.storage.AnvilChunkLoader.loadEntities(AnvilChunkLoader.java:495)
```

`getNameFor` 在 `AnvilChunkLoader` 读 TE 时调 `getBlockType()`（此时 blockType/world 绑定未完成）→
`getBlockType()` 返回 null → `.getRegistryName()` NPE。异常被 `TileEntity.func_190200_a` 捕获 →
**该 TE 直接丢弃**（`its state cannot be restored`）：物品、`heat_level`、`cookTime` 全灭，
块仍留在 `_lit` 态（孤儿 lit 块）。

**注**：同一判行在「运行期 /blockdata 写入」路径是可用的（`[22:52:14] heat load level=4 burn=200
furnace=etim:furnace_obsidian_lit`），故障只在**载入期**触发 → 判行与 TE 恢复互为前提，必须修。

### V6 · F-8-20 熄火面 3/3

```
[22:55:46] [FurnaceLog] extinguished flooded furnace=etim:furnace_netherrack_lit burn=1596 cook=5 [server]
[22:55:49] [FurnaceLog] extinguished smothered furnace=etim:furnace_netherrack_lit burn=1596 cook=5 [server]
[22:55:50] [FurnaceLog] extinguished flooded furnace=minecraft:lit_furnace burn=100 cook=0 [server]   ← 对照组
```

| 面 | 做法 | 判值 | 判 |
|---|---|---|---|
| 淹没（真燃烧） | 正脸 (`z-1`) 置水 | extinguished flooded 恰 1 行；`testforblock` 由 `_lit` 回 `etim:furnace_netherrack` | ✓ |
| 闷灭（真燃烧） | 正脸置圆石 | extinguished smothered 恰 1 行；块回 idle | ✓ |
| `burnTime==1` 豁免 | 水在正脸 + `/blockdata {BurnTime:100s}` → 有行；`{BurnTime:1s}` → **0 行** | 差分成立 | ✓ |

### V7 · 三矿 gen 统计

判法：`/fill <chunk> air 0 replace <block>` 计数（成功回执 `<n> blocks filled`；回执 `No blocks filled` = 0）。
每块先做**石量普查**（`stone ≥ 8000` 才算陆地块，海洋块跳过；**先移石不会动矿块**）。
选区：陆地扫描命中 chunk `2300,2300` 后 5×5。

| 矿 | 期望（任务书） | 实测均值/块（25 陆地块） | 判带 0.5×~1.5× | 判 |
|---|---|---|---|---|
| 铜 | ~24 | **10.44**（sum 261） | [12, 36] → **低于下界** | B-1 |
| 银 | ~6 | **6.40**（sum 160） | [3, 9] ✓ | ✓ |
| 秘银 | ~3 | **2.64**（sum 66） | [1.5, 4.5] ✓ | ✓ |
| 艾德曼 | 0 | **0**（25 块全 0） | 负证 ✓ | ✓ |

**铜的第二样本（高度带分解，9 陆地块）**：

| 带 | 0-31 | 32-63 | 64-127 | 合计/块 |
|---|---|---|---|---|
| 铜块数 | 26 | 62 | 26 | **12.67** |

两样本合并：铜 375 / 34 = **11.03/块**（0.46× 天真的 24）。逐块分布 0~27，方差大。
**机制**：R196 copper 用 `DIST_COPPER_MIXED`（半数脉原点取 0.4~1.0×129 = 51~129），
低地形处原点悬空 → `generateVein` 的「原点必须 stone」直接 abort；带分解证实重心在 32-63。
天真的 `freq/10 × 脉宽6 = 24` 未计这条面 → 归 **B-1 判带待裁**（见 §四）。

### V8 · 地牢箱 loot

`[TestLog] dungeon chest loot injected: ancient metal nugget+ingot (1-4, weight 10)` ×1/boot ✓
（实地 roll 挂 C 观察，不判；注意 A-2 下该注入指向未注册 item）。

### V9 · 熔炼 XP 4/5

| 金属 | 炉/燃料 | before → after | Δ | 期望 | 判 |
|---|---|---|---|---|---|
| 铜 | vanilla/煤 | 160 → 170 | **10** | 10 | ✓ |
| 银 | vanilla/煤 | 170 → 185 | **15** | 15 | ✓ |
| 秘银 | obsidian/岩浆 | 20 → 60 | **40** | 40 | ✓ |
| 艾德曼 | netherrack/烈焰棒 | 60 → 160 | **100** | 100 | ✓ |
| 远古金属（负证） | — | — | — | 无熔炼行 | **阻塞（A-2）** |

payout 原行（节选）：`xp payout item=etim:ingot_copper count=1 points=10`（22:54:13）、
`… item=etim:ingot_silver … points=15`（22:54:33）、`… mithril … 40`（22:51:49）、
`… adamantium … 100`（22:52:10）。
远古负证改由**静态面**落判：`ETIMBlocks.registerRecipes` 只注册 4 条 ore→ingot 行
（:118-121），无 ancient 行；输入端无配方门已在 22:54:38 以
`gui place denied (no-recipe) item=minecraft:blaze_rod` 现形（该门行为成立）。

### V10 · 9:1 互转 —— **BLOCKED（A-2）**

| 判据项 | 实测 | 判 |
|---|---|---|
| `/give etim:nugget_*` / `etim:ingot_*`（10 项） | 全部 `There is no such item with name etim:…` | 否 |
| `/clear <p> etim:ingot_x 0 0`（背包计数） | 同样 no such item（返回 -1） | 否 |
| 工作台 5 金属 × 双向 | 无法喂料 → 5/5 全 MISMATCH | 不可判 |
| 配方注册本身 | 存在，但校验抛 `IllegalStateException: Recipe etim:ingot_from_nuggets_nugget_copper … produces unregistered item etim:ingot_copper` | 否 |

**A-2 根因**：`ETIMItems.simple()` 只 `setRegistryName` / `setTranslationKey` / `setCreativeTab`，
**从未 `ForgeRegistries.ITEMS.register(item)`**（`ETIMItems.register()` 全文无注册调用）。
连带面：创造栏无条目、`/give`/`/clear`/NBT 物品名解析全不可达、地牢箱注入产出未注册栈、
世界载入时配方校验抛异常（boot2 22:57:04 `Exception reading .\b1verdict\level.dat`
→ `FMLContainer.readData` → `GameData.injectSnapshot` 校验炸）。

---

## 三、负证（全窗）

| 项 | 实测 | 判 |
|---|---|---|
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| `FATAL` / `Crash report` / `Exception ticking` | 0 / 0 / 0 | ✓ |
| 混入（mixin）目标映射 | `MixinBiomeDecorator.generateOres→func_76797_b`、`MixinBlockFurnace.setState→func_176446_a`、`MixinSlotFurnaceOutput.onCrafting→func_75208_c` 均在 refmap | ✓ |
| 服务端 ERROR 行 | 仅 A-1 NPE（1 次/boot 每次 chunk 载入）+ A-2 配方校验（boot2 1 次） | 已分级 |
| 非预期 kick | 1 次（V9 首跑，生存+悬空 → `multiplayer.disconnect.flying`；工装已改「落地+≤2.75 格」后复跑通过） | 工装面，C-6 |
| 端口 25565/25575 | 收口后无 LISTEN | ✓ |
| `server.properties` | 已还原 `testw2h / DEFAULT / difficulty=1 / generator-settings=` | ✓ |
| 产品面 | jar 420,717 B / SHA256 逐位复核；`src/main` 0 改动 | ✓ |

---

## 四、冲突分级

### A 级（真值冲突 / 判据 FAIL）

**A-1 · V5 载入期 NPE（`FurnaceHeat.getNameFor` :198）**
`etim$readHeatLevel` 在 `AnvilChunkLoader.loadEntities` 期间调 `getNameFor` → `getBlockType()`
为 null → NPE → 整只 TE 被 `TileEntity.func_190200_a` 丢弃。
后果：`heat_level` 持久化面**完全失效**（判行不出 + 状态丢失 + 孤儿 `_lit` 块），
且**每次区块载入都可能丢炉内物品**（本轮实测丢了秘银矿 + 岩浆桶 + 半程进度）。
判：V5 **FAIL**；建议主会话立刻出修复轮（改动极小，见 §五）。

**A-2 · 十个金属物品未注册（`ETIMItems.simple()` 漏 `ForgeRegistries.ITEMS.register`）**
后果：V10 全不可判；V9 远古负证不可喂料；地牢箱注入指向未注册栈；
**每次载入存档抛 `IllegalStateException`（配方校验）→ `Exception reading level.dat`**。
判：V10 **BLOCKED**；V9 记 4/5；建议与 A-1 同轮修复。

### B 级（需主会话裁的口径 / 工装面）

**B-1 · V7 铜判带冲突**：25 块样本 10.44（<0.5×24=12）、9 块样本 12.67、合并 11.03。
机制明确（mixed 高度分布 + 原点悬空 abort + 深度缩放），银/秘银/艾德曼全中带。
建议二选一：(a) 判据改「生成面成立（矿种/带位/零艾德曼）+ 均值 ≥ 0.4×」；
(b) 下一轮加 `[OreLog]` 逐脉判行（veins/abort/blocks）重导期望值。

**B-2 · V3 首格口径**：clay 炉拒方块输入（大件门），「clay + 沙」物理不可能 →
改 sandstone 炉（同 cap=1）判 heat=1 分支，语义未变。

**B-3 · V3 第 6 格口径**：cap=3 炉 + heat=4 燃料在准入层被拒（V2 已证），
夹紧面只能用 NBT 旁路（`heat_level=4b`）判；若主会话要求「自然路径不可达即不判」，该格转静态。

**B-4 · V10 待复判**：A-2 修复后需整段重跑（喂料/双向/五金属）。

### C 级（登记，不阻塞）

- **C-1** FML `openGui` 只发 `window_items`（不发 `open_window`）→ 原版协议工装须用原始
  `window_click` + 从该帧取 windowId；同一连接反复 open 会与客户端包流竞争
  （本轮观测到 1 次 `PartialReadError`），工装改为「一次 open 内完成放置与取物」。
- **C-2** `ETIMOreGen` 在 population 期触碰邻块 → 全窗 **92** 条
  `Easy Times In Minecraft loaded a new chunk … causing cascading worldgen lag`（世界生成卡顿风险）。
- **C-3** `/blockdata` 是 merge 语义：`{Items:[],BurnTime:0s}` 不会清 `heat_level`（残留 3b），
  注入面必须显式给 `heat_level`。
- **C-4** `/fill` 回执是 `<n> blocks filled`（数字在前），非 `filled <n> blocks`——工装正则踩坑点。
- **C-5** 日志在本地 00:00 滚动：boot2 证据跨 `2026-10-23-7.log.gz` 与 `latest.log`（已解压留档）。
- **C-6** 生存模式两条硬约束：站立面须落地（否则 `multiplayer.disconnect.flying`）、
  方块交互 reach ≤ **2.75**（`reach denied: etim.reach.deny_block`）——创造免检。
- **C-7** 贴图为自绘占位（C-M2/C-2），本窗无渲染判点，缺贴图不计 FAIL。

### D 级
无。

---

## 五、伪代码建议

**A-1 修（最小改动，二选一）**

```java
// 方案 1（推荐）：载入期不打名字，延迟到首 tick
@Unique private boolean etim$pendingHeatLog;
private void etim$readHeatLevel(NBTTagCompound c, CallbackInfo ci) {
    this.etim$heatLevel = c.getByte("heat_level");
    this.etim$pendingHeatLog = this.etim$heatLevel > 0 && this.furnaceBurnTime > 0;   // 只置标记
}
// update HEAD（已有 etim$extinguish 钩子处）：world != null 后补一行
if (etim$pendingHeatLog && world != null && !world.isRemote) { etim$pendingHeatLog = false; log(... getNameFor(self) ...); }

// 方案 2：getNameFor 空安全
public static String getNameFor(IInventory inv) {
    if (inv instanceof TileEntityFurnace) {
        Block b = ((TileEntityFurnace) inv).getBlockType();     // 载入期可为 null
        ResourceLocation n = b == null ? null : b.getRegistryName();
        return n != null ? n.toString() : "minecraft:furnace";
    }
    return "minecraft:furnace";
}
```
（两案都要保「判行不得因取名失败而中断 TE 读」——判行是观察面，不能成为故障源。）

**A-2 修**

```java
private static Item simple(String name) {
    Item item = new Item();
    item.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
    item.setTranslationKey("etim." + name);
    item.setCreativeTab(CreativeTabs.MATERIALS);
    ForgeRegistries.ITEMS.register(item);      // ← 缺这一行
    return item;
}
// register() 末尾自检：五粒五锭 getRegistryName() 必须能在 ITEMS 里查到，否则 throw
```

**B-1 观测增强（若采纳 (b)）**

```java
// ETIMOreGen.genMinable：每 chunk 收束一行
// [OreLog] ore=copper chunk=(x,z) rolls=40 veins=4 origin-abort=2 grown=21 size=...
```

**C-2 消抖**

```java
// generateVein/growVein 只用「当前被装饰 chunk」的块状态：
if ((pos.getX() >> 4) != (chunkX) || (pos.getZ() >> 4) != (chunkZ)) return 0;   // 不跨区块
```

---

## 六、工装面（本轮新增，均不入产品 jar）

| 文件 | 作用 |
|---|---|
| `testharness/player/b1-run.js` | 主驱动：`setup/probe/v2/v3/v4/v6/v9/v10/v5a/v5b/v7/v7bands` ＋ 诊断相位 |
| `testharness/player/b1-diag2.js` | 客户端包流诊断（window_items/进度包/desync 定位） |
| `build-logs/b1-server-boot1.log` | 第一段判据源（22:38:40–22:56:44；V1~V4/V6/V9/V10） |
| `build-logs/b1-server-boot2a.log` | 第二段判据源（22:56:55–23:59:59；V5b + V7 首轮） |
| `build-logs/b1-verdict-server-latest.log` | 收口快照（00:00–00:07:08 + `Stopping server`） |
| `build-logs/b1-*.json` / `b1-*.out` | 各相位结果与驱动原稿 |

**世界**：`run/obfuscated-server/b1verdict/`（本轮一次性工装存档，保留可删）。
**工装口径**：FML 容器用原始 `window_click`（windowId 取自 `window_items`，一次 open 内完成放置+取物）；
`/fill` 计数按「数字在前」回执解析；陆地块以 `stone ≥ 8000` 过滤。

---

## 七、终态表（收口）

| 面 | 终态 |
|---|---|
| 服务端 | `[00:07:08] Stopping server` → `Saving worlds` → 进程退出；快照 `build-logs/b1-verdict-server-latest.log`（1,749,425 B） |
| 端口 | 25565 / 25575 无 LISTEN |
| `server.properties` | 还原 `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `generator-settings=` |
| 世界 | `b1verdict` 已保存（工装存档）；`testw2h` 未被本窗改动 |
| 产品面 | jar 420,717 B / SHA256 `EB9F1369…DE244A` / `7b2cbf0` / `src/main` 0 改动（窗口内 0 rebuild） |
| 客户端 | 本窗**无客户端面**（V1~V10 全部服务端判行 + 假玩家发包），未起 obf 客户端 |

---

## 八、执行序（时间线）

1. 22:38 起服 `b1verdict`（boot1）→ V1 两行落地。
2. 22:41 工装搭建（平台 y=99 + 六炉 + 工作台）；22:42–43 V2 18 格；22:43 V4 4 格。
3. 22:43–22:45 V3 首跑（clay 大件门暴露 → 改 sandstone；NBT 夹紧格）。
4. 22:46 客户端包流诊断（`window_items`/进度包）；22:50–52 V3 全 6 格。
5. 22:52–22:54 V9（铜/银）；22:55 V6 三面；22:56 V10（喂料全失败 → A-2 现形）。
6. 22:56:44 V5a 半程停服（`Stopping server`）→ 22:56:54 重启（boot2）。
7. 22:57:13 V5b：载入 NPE（A-1）→ `heat load` 0 行、进度全丢。
8. 23:00–23:17 V7 首轮（海岸/生成竞态）→ 23:14 确认矿石确实生成（17/8 块）。
9. 00:02–00:04 V7 正式普查（25 陆地块，fill-errors 0）。
10. 00:05–00:06 V7 高度带复样本（9 块）。
11. 00:07 收口：RCON stop → 快照 → 还原 properties。

---

## 九、结论

- **PASS 6 / FAIL 1 / 生成面 PASS-判带待裁 1 / PARTIAL 1 / BLOCKED 1**。
- **A 级 2 笔**：A-1 载入期 NPE（V5 失效 + 丢物品）、A-2 十物品未注册（V10 不可判 + 载入期配方校验抛异常）。
  两笔均属**落码遗漏**，改动面极小，建议同轮修复后**只复判 V5 / V9 远古负证 / V10**，其余判点不必重跑。
- **B 级 4 笔**均为口径面（铜判带、clay 大件与 V3 首格的物理冲突、夹紧格旁路、V10 待复判）。
- **C 级 7 笔**为工装/观测面，其中 C-2（population 期跨块加载 92 次）建议随 A 级修复一并消抖。
