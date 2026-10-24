# 阶段四 B1 复判窗（A-1/A-2 修复批 + V7 铜带重导）· 复判报告

> **执行方**：会话七（复判窗执行）
> **判决来源**：主会话修复轮（补52）＋ 前置回执 `metal-furnace-b1-verdict.md`（前一轮 56 项通过 / 0 项不通过）
> **判据正本**：`playground/audit/metal-furnace-B1-落码批文.md`（R196 逐字面不重判）
> **现役钉值**：jar **422,164 B** @ **2026-10-24 00:29:02**｜
> SHA256 **76076921ED4D149CE8B0708E3F31F1A2E6582C9CDD2C26D40CC01D7C49184A3C**｜commit **591de33**
> **判据源**：`run/obfuscated-server/logs/latest.log`（`[FurnaceLog]` / `[OreLog]` / `[TestLog]` / RCON 回执行）
> ＋ 驱动侧 `/clear` 计数回执；三段判据源已留档 `build-logs/`（见 §七）
> **口径**：通过用 ✓、不通过用叉号；本报告 UTF-8 无 BOM、0 U+FFFD。窗口内 **0 次 rebuild**。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 422,164 B | 422,164 B | ✓ |
| jar 时间 | 2026-10-24 00:29:02 | 2026-10-24 00:29:02 | ✓ |
| SHA256 | 76076921…184A3C | `76076921ED4D149CE8B0708E3F31F1A2E6582C9CDD2C26D40CC01D7C49184A3C` | ✓ 逐位 |
| commit | 591de33 | `591de33` | ✓ |
| `src/main` 相对 HEAD | 0 改动 | `git status --porcelain -- src/main` = 0 行 | ✓ |
| 载入面 | classpath append（mods 零 etim） | `classpath append: …build\libs\etim-1.0.0.jar (mtime=2026-10-24 00:29:02)` | ✓ |
| 窗口内重建 | 禁止 | 前后两次复核字节数/SHA256/mtime 全同 → 0 次 | ✓ |
| config | `metalDebugLog=true` ＋ 既有六项 | cfg 原**缺** `B:metalDebugLog` 行（修复批新增键，旧 cfg 未重生），本窗**手工补入** metal 节；`furnaceDebugLog/furnaceHeatSystem/metalSystem/metalOreGen=true`、`foodTestMode=false` | ✓（见 C-1） |

**世界**：新建 **`b1rv`**（`level-seed=etim27` 原值、`level-type=DEFAULT`、`generator-settings=` 空、
`difficulty=0`；`view-distance` 本窗临时设 4 以压生成量）。工装平台 y=99、六炉 y=100、
工作台 (44,100,12)。收口已整体还原 `server.properties`（`testw2h / difficulty=1 / view-distance=10`）。

---

## 一、判决类清单（RV1~RV4）

| # | 判点 | 判词 | 一手判行锚 | 判值 |
|---|---|---|---|---|
| RV1 | V5 复判：F-8-16 heat_level NBT 跨重启 | **PASS** | `MixinTileEntityFurnace` `etim$readHeatLevel` :548 ＋ `etim$loadLogRow` :558 | `heat load level=3 burn=3109` **1 行**（重启首 tick）＋ 续烧出锭 ＋40 XP |
| RV2 | V9 补尾：远古金属负证（A-2 解除后） | **PASS** | `MixinContainer.etim$furnacePlaceDeny` :72-119；`ETIMBlocks.registerRecipes` :118-121（无 ancient 行） | 远古粒/锭 `/give` 得手，投炉 `gui place denied (no-recipe)`，**0 admit / 0 payout / XP 不变** |
| RV3 | V10 复判：9:1 双向 × 五金属 | **PASS 10/10** | `ETIMBlocks` :124-135（shapeless ×10）；`ETIMItems.simple` 注册 :78 | 每金属「9 粒 → 1 锭」「1 锭 → 9 粒」计数逐位（服务端清仓回执自证） |
| RV4 | V7 铜带重导（[OreLog]）+ 生成面成立 | **PASS（新判带见 §四）** | `ETIMOreGen.genMinable` :51-82（counter-only）；`MixinBiomeDecorator` TAIL | 铜 **10.03 ± 0.61 /块**（n=215）＋ 原点 abort **62.14%**；艾德曼 **0**（65 块普查 + 0 行日志） |

**总记**：**RV1~RV4 全过（4/4）**｜A 级真值冲突 **0 笔**（首轮 A-1/A-2 均已闭合）｜
B 级 1 笔（B-1′ 铜判带替换，待补53 入账）｜C 级 9 笔（工装/观测面）。

---

## 二、逐项核讫

### RV1 · V5 复判 —— **PASS**

判法：obsidian 炉 + 岩浆桶 + 秘银矿 → 烧到半程（lit 后 4.0 s）→ RCON `stop` 优雅停机 →
重启 → 读首 tick 判行 → **不投料**直接取产物。

**① 停机前（boot1，09:04:38–09:04:43）**

```
[09:04:38] [FurnaceLog] write slot=0 item=etim:ore_mithril [server]
[09:04:39] [FurnaceLog] write slot=1 item=minecraft:lava_bucket [server]
[09:04:39] [FurnaceLog] smelt admit heat=3 required=3 input=etim:ore_mithril [server]
[09:04:43] [MinecraftServer]: Stopping server
[09:04:43] [MinecraftServer]: Saving worlds
```

**② 重启后（boot2，09:05:17–09:05:52）**

```
[09:05:17] [FurnaceLog] heat load level=3 burn=3109 furnace=etim:furnace_obsidian_lit [server]
[09:05:19] [驱动] rv1b window=1 slots=0:4118x1 1:325x1 props={"0":3075,"1":0,"2":126,"3":200}
[09:05:52] [FurnaceLog] xp payout item=etim:ingot_mithril count=1 points=40 creative [server]
```

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| 重启后判行 | `heat load level=3 burn=N>0 furnace=etim:furnace_obsidian` ×1（重启事件窗内） | **1 行**（09:05:17，`level=3` / `burn=3109` / `furnace=etim:furnace_obsidian_lit`） | ✓ |
| 状态留存 | 炉内输入/燃料/进度不丢 | 开窗 slots = `0:<ore_mithril>x1 1:<lava_bucket>x1`；**`props[2]=126 / props[3]=200`** → `CookTime` 半程（63%）原样续上 | ✓ |
| 续烧出锭 | 不投料也烧完并出锭 | 09:05:52 `xp payout item=etim:ingot_mithril count=1 points=40`；XP `0 → 40` 逐位 | ✓ |
| A-1 负证 | `NullPointer` / `cannot be restored` 双 0 | boot1 0/0、boot2 0/0（§三） | ✓ |

**行为差异（已在任务书内声明，判值不变）**：判行由 `loadEntities` 期改到**载入后首个 update tick**；
`furnace=` 取当前真实块名，故带 `_lit` 后缀（燃烧态孪生块，与首轮 22:52:14 的旁路行同形）。

**行语义（C-4）**：`pending` 标记在每次 `readFromNBT` 重新武装 → **每次 TE 载入 1 行**。
本窗同一炉共 7 行（burn 3109→262，随每次区块重载递减），判窗锚定「重启事件后的第一条」。

### RV2 · V9 补尾（远古金属负证）—— **PASS**

**① 物品可得性（抽验：远古粒 / 远古锭 / 常规铜粒）**

```
[09:06:05] [Rcon: Given [Ancient Metal Nugget] * 1 to ETIM_Harn04]
[09:06:05] [Rcon: Given [Ancient Metal Ingot] * 1 to ETIM_Harn04]
[09:06:05] [Rcon: Given [Copper Nugget] * 1 to ETIM_Harn04]
```

**② 投炉负证（netherrack 炉 + 烈焰棒 heat 4，均无熔炼配方）**

```
[09:06:08] [FurnaceLog] gui place denied (no-recipe) item=etim:nugget_ancient_metal [server]
[09:06:25] [FurnaceLog] gui place denied (no-recipe) item=etim:ingot_ancient_metal [server]
```

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| 远古粒投炉 | 无熔炼产物 | `smelt admit` **0**、`xp payout` **0**、XP `40→40`、投入后 12 s 物品仍在背包（`left=1`） | ✓ |
| 远古锭投炉 | 无熔炼产物 | 同上（`left=1`） | ✓ |
| 拒绝机制 | 输入槽无配方门 | `gui place denied (no-recipe)` 两笔 | ✓ |

**说明（C-5）**：`gui place denied` 按 `(item,slot,why,end)` 签名**每 JVM 会话只落 1 行**
（`MixinContainer.etim$placeDenySeen`）。故 09:07 的复跑不再出行，但该复跑的行为面
（admit 0 / payout 0 / XP 不变 / 物品退回 `left=1`）独立成立 → 本窗把 09:06 的拒绝行与 09:07 的
行为面合并判 PASS。

### RV3 · V10 复判（9:1 双向 × 五金属）—— **PASS 10/10**

判法：工作台真实 GUI（原始 `window_click`，一次 open 内完成放置与取物），产物/余料用
`/clear <p> <item> 0 0` 只计数不删（回执 `has N items that match the criteria`）。

**服务端自证链**（每金属两段；`Cleared the inventory … removing N items` 是下一轮开头的清仓回执，
即上一轮的背包实数）：

```
[09:08:01] [Rcon: Given [Copper Nugget] * 9 to ETIM_Harn04]          ← 9 粒入包
[09:08:04] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]   ← 合成后只剩 1 件 = 1 锭 ✓
[09:08:04] [Rcon: Given [Copper Ingot] * 1 to ETIM_Harn04]           ← 1 锭入包
[09:08:07] [Rcon: Cleared the inventory of ETIM_Harn04, removing 9 items]   ← 合成后 9 件 = 9 粒 ✓
[09:08:07] [Rcon: Given [Silver Nugget] * 9 to ETIM_Harn04]
[09:08:10] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]
[09:08:10] [Rcon: Given [Silver Ingot] * 1 to ETIM_Harn04]
[09:08:12] [Rcon: Cleared the inventory of ETIM_Harn04, removing 9 items]
[09:08:13] [Rcon: Given [Mithril Nugget] * 9 to ETIM_Harn04]
[09:08:16] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]
[09:08:16] [Rcon: Given [Mithril Ingot] * 1 to ETIM_Harn04]
[09:08:18] [Rcon: Cleared the inventory of ETIM_Harn04, removing 9 items]
[09:08:18] [Rcon: Given [Adamantium Nugget] * 9 to ETIM_Harn04]
[09:08:21] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]
[09:08:21] [Rcon: Given [Adamantium Ingot] * 1 to ETIM_Harn04]
[09:08:24] [Rcon: Cleared the inventory of ETIM_Harn04, removing 9 items]
[09:08:24] [Rcon: Given [Ancient Metal Nugget] * 9 to ETIM_Harn04]
[09:08:27] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]
[09:08:27] [Rcon: Given [Ancient Metal Ingot] * 1 to ETIM_Harn04]
```

| 金属 | 9 粒 → 1 锭 | 1 锭 → 9 粒 | 判 |
|---|---|---|---|
| copper | 1 ✓ | 9 ✓ | ✓ |
| silver | 1 ✓ | 9 ✓ | ✓ |
| mithril | 1 ✓ | 9 ✓ | ✓ |
| adamantium | 1 ✓ | 9 ✓ | ✓ |
| ancient_metal | 1 ✓ | 9 ✓ | ✓ |

配方校验面：两次 boot **`produces unregistered item` = 0**、**`Exception reading … level.dat` = 0**（§三）。

### RV4 · V7 铜带重导（[OreLog]）—— **PASS（生成面成立）**

**① 采样（09:08:39–09:10:39，全新区块，未探索区）**

```
[09:08:39] [OreLog] ore=ore_copper chunk=(40000,39984) rolls=40 veins=7 origin-abort=5 grown=18 [server]
[09:08:39] [OreLog] ore=ore_silver chunk=(40000,39984) rolls=10 veins=0 origin-abort=0 grown=0 [server]
[09:08:39] [OreLog] ore=ore_mithril chunk=(40000,39984) rolls=10 veins=3 origin-abort=1 grown=0 [server]
```

- 判行格式：`ore=<registry path>`（= `ore_copper`）、`chunk=(<块坐标原点X>,<块坐标原点Z>)`
  （`BiomeDecorator.chunkPos` 是**区块原点的方块坐标**，非区块序号——见 C-2）。
- 每区块 3 行（三矿各一），无艾德曼行（主世界 0 生成，负证）。
- 本窗三份判据源合计去重 **21,225 条**（boot2 `latest.log` 19,299 ＋ boot0 1,737 ＋ boot1 192）；
  三套样本互不重叠。

**② 判值（主样本 X = 探索区，区块原点 bx∈[39000,42000]）**

| 矿 | n（区块） | grown 均值/块 | sd | SE | 均值±2SE | 脉/块 | 原点 abort 率 | 零块率 |
|---|---|---|---|---|---|---|---|---|
| 铜 | 215 | **10.028** | 8.908 | 0.607 | **[8.81, 11.24]** | 3.870 | **62.14%** | 24.7% |
| 银 | 215 | 4.130 | 4.824 | 0.329 | [3.47, 4.79] | 0.893 | 31.77% | 49.8% |
| 秘银 | 215 | 2.195 | 2.588 | 0.177 | [1.84, 2.55] | 1.000 | 21.40% | 50.7% |
| 艾德曼 | **0** | — | — | — | — | — | — | — |

**旁证样本（同窗同 jar，独立区域）**

| 样本 | n | 铜均值 | 银均值 | 秘银均值 |
|---|---|---|---|---|
| S（出生区/普查顺带，bx∈[-2000,2000]） | 2,249 | 10.087 ± 0.181 | 4.995 | 2.203 |
| OTHER（普查 TP 顺带生成的远端区） | 4,611 | 10.565 ± 0.129 | 5.040 | 2.150 |

三套样本铜均值 10.03 / 10.09 / 10.57 收敛 → 铜均值对区域不敏感（seed 同、分布同）。

**③ 机制模型（解释「天真 24」的偏差）**

`24 = rolls40 × 闸门 10% × 脉宽 6`，但 R196 `generateVein` 在**原点非 stone 时整脉 abort**：

```
每块成功脉数 = 3.870 × (1 − 0.6214) = 1.467
每脉实生块  = 10.028 / 1.467 = 6.83（≈ 脉宽 6 × 深度缩放 1.14）
银：0.893 × (1 − 0.3177) = 0.609 × 6.78 = 4.13 ✓
秘银：1.000 × (1 − 0.2140) = 0.786 × 2.79 = 2.19 ✓
```

闸门率实测 3.870/40 = 9.7%、0.893/10 = 8.9%、1.000/10 = 10.0%（≈ `nextInt(10)==0`）→
**铜低值 0.42× 天真期望完全由 62% 的原点 abort 解释**，与 B-1(b) 裁定一致。

**与任务书预期的偏差（数据面，非 FAIL）**：任务书预期「银/秘银 abort 率近 0（低带）」，
实测为 **31.8% / 21.4%**，并非近 0。成分判断：银（band 0-96、低偏置）原点仍可落在
地表之上（地形低/海洋块），秘银（band 0-32）原点可落在**洞穴空气**里——两者与铜的
「混合高度分布」不是同一主因，但「原点必须 stone」这一闸门对三矿都成立，只是强度不同。

**④ 交叉核（[OreLog] grown ↔ `/fill` 实块）**

| 交叉核 | 区块 | grown 和 | `/fill` 实块和 | 差 | 判 |
|---|---|---|---|---|---|
| 闭区 5×5（邻块全生成后） | 25 | 271 | **275** | +1.5% | ✓ 仪器守恒 |
| 散点抽样（跨区、邻块生成顺序不齐） | 40 | 366 | 337 | −7.9%（25/40 逐块相等） | 见 C-3 |

闭区守恒证明 `grown` 就是真实落块数；散点样本的偏差来自 C-2 的跨块写入/原型块时序，
**不用于判带修正**。艾德曼在这 65 块里 **0**（65 块 = 40 散点 + 25 闭区）。

**⑤ 生成面负证**：艾德曼 `[OreLog]` 行 **0** 条（19,299 行内）；`/fill` 普查 65 块 **0** 块。

---

## 三、A-1 / A-2 负证面（grep 计数，两 boot 分别核）

| 探针 | boot1（09:03:42–09:04:43） | boot2（09:05:0x–09:22:43） | 判 |
|---|---|---|---|
| `NullPointerException` | 0 | 0 | ✓ |
| `cannot be restored` | 0 | 0 | ✓ |
| `Failed to load data for block entity` | 0 | 0 | ✓ |
| `produces unregistered item` | 0 | 0 | ✓ |
| `Exception reading` / `level.dat` | 0 | 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | 0 / 0 | ✓ |
| `FATAL` / `Crash report` / `Exception ticking` | 0 / 0 / 0 | 0 / 0 / 0 | ✓ |
| `getNameFor` 兜底标记 `unbound` | 0 | 0 | ✓（兜底未被触发，说明行只在世界绑定后打） |
| 注册行 `batch B1 metal content registered` | 1 | 1 | ✓ |
| loot 注入行 `dungeon chest loot injected` | 1 | 1 | ✓ |

> A-1 修复点：`MixinTileEntityFurnace` `etim$readHeatLevel` :548 只置 `pendingLoadLog`
> （:550），行在 `etim$loadLogRow` :558 的 update HEAD 打（:566 清标记）；`FurnaceHeat.getNameFor`
> :196-203 空安全（`block == null → "unbound"`）。载入期**零异常**已实测。
> A-2 修复点：`ETIMItems.simple` :78 `ForgeRegistries.ITEMS.register(item)`；`register()` 末尾
> :52 `assertRegistered()` fail-fast（十项不在 `ITEMS` 即 boot 期抛）。

---

## 四、V7 铜新判带建议值（补53 入账用）

**判定量**：`[OreLog] ore=ore_copper` 的 `grown` **每区块均值**（纯日志解析，零世界交互、
零 `/fill`），采样口径 = **所有已生成区块，不做陆地过滤**（含海洋块）。

| 项 | 建议值 |
|---|---|
| 中心值 μ | **10.0**（= 0.42 × 天真 24；三样本 10.03 / 10.09 / 10.57） |
| 判带（n≥200 样本） | **[8.8, 11.3]**（X 样本 ±2SE） |
| **判带（常设，n≥50）** | **[7.5, 12.5]**（sd 8.9、n=50 → SE 1.26 → ±2.5） |
| 旧判带 [12, 36] | **作废**（基于未计 origin-abort 的天真 24） |
| 机制判据（同时核） | 铜 origin-abort 率 **> 50%**（实测 62.14%）；银 ~32% / 秘银 ~21%，仅作交叉记录 |
| 银/秘银记录值（不重判） | 银 4.13（X）/ 5.00（S）；秘银 2.20 / 2.20 |
| 艾德曼 | **0**（行 0 条、块 0 块）——负证沿用 |

**注 1**：首轮回执的 10.44 是「陆地 25 块 `/fill` 普查」，与本窗 X 样本（10.03，含海洋块）
同量级；本窗陆地子样（stone≥8000，n=38）grown 均值 **9.26**，与 10.44 差 −11%（采样面差异）。
**注 2**：物理块面与日志面在闭区实测差 +1.5%（271 vs 275）→ 两口径可互认。

---

## 五、冲突分级

### A 级（真值冲突）
**无。** 首轮 A-1（载入期 NPE）与 A-2（十金属未注册）均已闭合，本窗两 boot 负证面全 0。

### B 级（需主会话裁的口径）
**B-1′ · 铜判带替换**：建议以 §四 的 `[7.5, 12.5]`（n≥50）/ `[8.8, 11.3]`（n≥200）替换旧 `[12, 36]`，
判定量改为 `[OreLog] grown 均值/区块`（零世界交互）。**待补53 入账**。

### C 级（登记，不阻塞）
- **C-1 `metalDebugLog` 键未进旧 cfg**：修复批新增的 `ETIMConfig.metalDebugLog` 在既有
  `run/obfuscated-server/config/etim.cfg` 里没有行（Forge 只在键缺失时补写？本窗旧 cfg 确实缺），
  本窗手工补入 metal 节；下一窗若 cfg 未重生，需先核该行存在。
- **C-2 `[OreLog]` 字段名/语义**：`ore=` 落的是 registry **path**（`ore_copper`，非任务书示例的
  `copper`）；`chunk=(a,b)` 是**区块原点的方块坐标**（`BiomeDecorator.chunkPos`），不是区块序号。
  工装若按区块序号解读会整体错 16×（本窗踩过一次，已修正）。建议后续把字段改名 `chunkOrigin=`
  或改落 `chunkIndex=(x>>4,z>>4)`（一行改动，仅观测面）。
- **C-3 跨块写入与原型块时序**：`growVein` 会写入相邻区块；若邻块尚是原型块，该落块随后会被
  地形生成覆盖 → 日志 `grown` 会比实块略多（散点样本 −7.9%）。闭区（邻块先生成）实测 +1.5%。
  与首轮 C-2（`loaded a new chunk … cascading worldgen lag`，本窗 **711 条**）同源。
- **C-4 `heat load` 行是「每次 TE 载入 1 行」**：同一个持续燃烧的炉，每次区块重载都会再出一行
  （本窗同一炉 7 行，burn 3109→262 递减）。判窗必须锚定「重启后首条」，不能按全会话计数。
- **C-5 `gui place denied` 每会话去重**：签名 `(item,slot,why,end)` 仅首笔落行
  （`etim$placeDenySeen`）；复跑同格不再出行，判据须以「行 + 行为面」合并取。
- **C-6 `/fill` 单命令上限 32768 块**：16×16×256 = 65536 超限（回执
  `Too many blocks in the specified area (65536 > 32768)`），矿石普查须按 y 0-127 / 128-255 两段。
- **C-7 `/clear <p> <item> 0 0` 回执形**：`<p> has N items that match the criteria`；
  **必须**给 `data=0` 与 `maxCount=0` 两个参数（只给一个会真删）。玩家离线时回
  `Player '<p>' cannot be found`（计数不可用）。
- **C-8 生存/创造切换**：假玩家以生存入服，任何 TP 到悬空都会 `multiplayer.disconnect.flying`
  （`allow-flight=false`）；工装须在连接后**先** `/gamemode 1` 再 TP（本窗首跑因此掉线 1 次，
  仅影响工装搭建，未入判）。
- **C-9 服务端进程存活**：`start-server.ps1` 走 WMI 拉起后必须由外层 shell 守着（本窗第一次
  启动的壳退出后 JVM 被连带收走，log 落到 `2026-10-24-2.log.gz`，已解压留档并复核为同一 seed
  数据，未入判）。后续窗建议统一用 keeper 壳启动。

### D 级
无。

---

## 六、工装面（本轮新增，均不入产品 jar）

| 文件 | 作用 |
|---|---|
| `testharness/player/b1-run.js` | 新增相位 `rv1a / rv1b / rv2 / rv4explore / rv4census / rv4ore / rv4ore2 / rv4closed / rvCount`；修 `clearCount` 回执正则、`/gamemode 1` 前置、[OreLog] 区块原点口径 |
| `testharness/player/rv-orelog.js` | [OreLog] 聚合器（去重、样本切分、均值±SE、abort 率）→ `build-logs/b1-rev-orelog-stats.json` |
| `build-logs/b1-rev-boot0-killed.log` | 首启（壳退出连带停机）日志解压留档，464,699 B；579 铜行 |
| `build-logs/b1-rev-boot1.log` | boot1 判据源（RV1 停机前半程） |
| `build-logs/b1-reverdict-server-latest.log` | boot2 判据源 ＋ 收口快照（3,585,549 B） |
| `build-logs/b1-rev-*.out` / `b1-rv*.json` | 各相位驱动原稿与结果 |

**判据源段界**：boot1 = `09:03:42–09:04:43`（RV1a）；boot2 = `09:05:0x–09:22:43`
（RV1b/RV2/RV3/RV4 ＋ 收口 `09:22:43 Saving worlds`）。

---

## 七、终态表（收口）

| 面 | 终态 |
|---|---|
| 服务端 | `[09:22:43] Stopping server` → `Saving worlds` → 进程退出；快照 `build-logs/b1-reverdict-server-latest.log`（3,585,549 B） |
| 端口 | 25565 / 25575 无 LISTEN |
| `server.properties` | 已还原 `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `view-distance=10` / `generator-settings=` |
| 世界 | `b1rv`（本窗一次性工装存档，保留可删）；`testw2h` 未被本窗改动 |
| config | `run/obfuscated-server/config/etim.cfg` 已补 `B:metalDebugLog=true`（保留，供后续窗） |
| 产品面 | jar 422,164 B / SHA256 `76076921…184A3C` / `591de33` / `src/main` 0 改动（窗口内 0 rebuild） |
| 客户端 | 本窗**无客户端面**（RV1~RV4 全部服务端判行 + 假玩家发包），未起 obf 客户端 |

---

## 八、结论

- **RV1~RV4 全过（4/4）**：A-1 载入期 NPE 已消除且 `heat_level` 持久化面实测成立（`heat load`
  首 tick 1 行、`CookTime` 126/200 续上、重启后自然出锭 +40 XP）；A-2 十物品注册已闭合
  （`/give` 抽验 3/3、9:1 双向 10/10、boot 期配方校验零异常）；V7 生成面成立并给出可入账的新判带。
- **新铜判带**：中心 **10.0**（0.42× 天真 24），n≥50 用 **[7.5, 12.5]**；机制面铜原点 abort
  **62.14%** 已由日志直接量化（银 31.8% / 秘银 21.4% 仅作交叉记录）。
- **遗留**：仅 B-1′（判带替换入账）与 C-1~C-9（工装/观测面），无 A 级真值冲突。
- **下一轮**：B2 批文（装备面 + G-FB-12 绕 fold + BLOCK_MIN_LEVEL 行 + burn 100 工具燃面 +
  reach 子类覆写 + C-7 生存 reach 2.75）可开。
