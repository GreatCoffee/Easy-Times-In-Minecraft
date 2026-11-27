# 阶段四 金属砧块批（T7 挂账兑现）· 验证窗判决回执（W1–W9）

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-anvil-blocks-落码批文.md` §一/§三 + 本窗任务书（W1–W9）
> **现役钉值**：jar **590,296 B** @ **2026-10-24 19:47:13**｜SHA256
> **0BD63FF67D533D1B6E69A084C87872C5CA3006CC5191863B0C58470B911D0A1B**｜产品 commit **280f445**｜
> 工装 commit **361a091**（= HEAD = origin/master，不产 jar）｜窗内 **0 rebuild**。
> **判据源**：`[TestLog]` / `[EquipLog]` / `[CraftingLog]` / `[MiningLog]`（服务端权威）＋ 工装
> `[AnvilLog]` 判行（槽包 / `/clear` 计数 / `/etest anvilwear` 三条下发面）＋ 客户端 F2 截图 ＋
> 客户端模型加载日志（W8/W9 的模型面判据）。
> **口径**：通过 ✓、不通过 ✗。**本窗判点 ✗ = 4**（W8 模型项 1 + W9①②③ 3）；表中其余 ✗ 为
> 「关联/基线」记号与图例、规格行记号。UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档；台架 y=99/100 判台 + z=20/22/24 展示排。
> **报告字节规格**：`26,511 B｜UTF-8 无 BOM｜0 U+FFFD｜✓ 52 / ✗ 11｜356 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 590,296 B | 590,296 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-24 19:47:13 | 2026-10-24 19:47:13（客户端两轮后同值） | ✓ |
| SHA256 | `0BD63FF6…1A1B` | `0BD63FF67D533D1B6E69A084C87872C5CA3006CC5191863B0C58470B911D0A1B` | ✓ 逐位 |
| 产品 commit | `280f445` | `git log --oneline` 第 2 行 = `280f445` | ✓ |
| HEAD / origin | `361a091` / `361a091` | `361a091` / `361a091`（工装提交，无 jar 产出） | ✓ |
| 窗内 rebuild | 禁止 | 起服前 / 客户端两轮后 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 起服面 | `runObfServer` 等价面 | `start-server.ps1`：`classpath append … (mtime=10/24/2026 19:47:13)`；起服时 `run/obfuscated/mods` 无 etim jar | ✓ |
| 端口 | 起服前 0 | 25575 无 LISTEN；停服后 0 | ✓ |
| 世界 | `testw2h` 保留 | `level-name=testw2h`，未删档 | ✓ |
| cfg | 与冒烟轮同 | `metalAnvilRepair=true` / `metalDebugLog=true` / `metalSystem=true` / `metalOreGen=true`；`craftingSkipCreative=true`（工装创研面） | ✓ |
| 客户端 | obf 客户端（W7/W9 用户操作） | `runObfClient`（JAVA_HOME=JDK 25；19 mods active）；玩家 `Developer`；用户亲操，AI 未模拟点击/未抢焦点 | ✓ |

### 0.1 快照与工装落盘

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/v7-server-face.log` | 148,982 B | 服务端面 W1–W6 判据源（19:51:39 → 20:03:53，客户端首次启动轮转前快照） |
| `build-logs/v7-client-latest.log` | 227,162 B | 客户端会话快照（`close-client.ps1 -Snapshot`；含 W7 判行、`Stopping!`） |
| `build-logs/v7-session-shared.log` | 227,162 B | 收口快照（含 `Stopping server` / `Saving worlds` / `Unloading dimension 0`） |
| `build-logs/v7-w2-final.out` / `v7-w3-final.out` | 4,856 / 3,906 B | W2（a+b）/ W3 工装 stdout |
| `build-logs/v7-w4-final.out` | 11,884 B | W4 五格矩阵 |
| `build-logs/v7-w5-final.out` / `v7-w5cap-r1.out` | 4,252 / 34,662 B | W5 单修 delta / W5b 容量面（24 轮） |
| `build-logs/v7-w6-final.out` / `v7-showroom.out` | 3,794 / 4,686 B | W6 双面 / 展示排搭建 |
| `build-logs/v7-w9-textures.png` | 367,290 B | 用户 F2：展示排三组（20:14:29） |
| `build-logs/v7-w9-tooltip.png` | 612,638 B | 用户 F2：砧窗 tooltip（20:17:55） |
| `run/obfuscated/testw2h/data/etim_anvil_damage.dat` | 71 B | 收口态：`-34 100 12` 条目已消失（剩 `5600` / `4000` 两条旧账） |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W1** | boot 锚：6 砧 + 5 存储块 + 配方行数 + reassert 122 + cfg + 0 mixin | **PASS** | `metal anvil batch registered: 6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes`；`durability reassert: 122 gear rows ok`；`Done (1.280s)` |
| **W2** | 存储块 9:1 双向 | **PASS 2/2** | a) 9 锭→1 块 `got=1`；b) 1 块→9 锭 `result-before=×9` `got=9`（本窗新判，独立相位） |
| **W3** | 铜砧配方（3 块 + 7 锭） | **PASS** | `w3 anvil-craft out={count:1} got=1 want=1` |
| **W4** | 门值矩阵 5/5 | **PASS** | 原版对照 PASS｜铜砧修铜 PASS｜铜砧修秘银 `material=64.0 > anvil=4.0`｜秘银砧修秘银 PASS｜秘银砧修艾德曼 `material=256.0 > anvil=64.0` |
| **W5** | 损砧按块：一次修 delta=1600 | **PASS** | `anvilwear 21600 → 23200`；take 行 `repaired=1600 nuggets=2 kind=1 anvilWear=1600` |
| **W5b** | 容量面（198,400 基） | **PASS** | 24 次满伤修（每次 +3200）→ `100000`；`anvil wear stage=1 … total=100000` |
| **W6** | GUI 上方门双面 | **PASS** | 上方堵实块 `window=none`；清掉 `window=OPENED` |
| **W7** | BreakEvent 清账（用户挖砧） | **PASS** | `anvil break face: wear ledger cleared at BlockPos{x=-34, y=100, z=12}`；`anvilwear 100000 → 0`；dat 条目消除 |
| **W8** | 负证全 0 | **FAIL（模型面）** | ISE/FATAL/Crash/Dup/CCE/AIOOBE/mixin/配方冲突 = 0；**`Exception loading model for variant etim:*` = 5 条 + `Suppressed additional 87 model loading errors for domain etim` → 92 条** ✗ |
| **W9** | 客户端目检 | **①②③ FAIL / ④ PASS** | ①矿 ②六砧 ③五存储块：全部紫黑棋盘格（缺模型/缺纹理）✗；④ tooltip 金字位置正确、未裁切 ✓ |

**总记**：W1–W7 全 PASS；**W8 模型项 FAIL**；**W9①②③ FAIL、④ PASS**。
**A 级 3 笔**（资产面，阻断闭单）；**B 级 1 笔**；**C 级 5 笔**登记。

---

## 二、逐门核讫

### W1 · boot 锚（`build-logs/v7-server-face.log`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 砧/块注册行 | `6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes` | `[19:51:48] [TestLog] metal anvil batch registered: 6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes [server]` | ✓ |
| 配方锚不回归 | `19 batch rows ok` | `[19:51:48] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 144 incl legacy 94: 90 ingot-based + 4 rusted chain-armor)` | ✓ |
| 耐久重断言 | `122 gear rows ok` | `[19:51:49] [EquipLog] durability reassert: 122 gear rows ok [server]` | ✓ |
| boot 完成 | — | `[19:51:50] Done (1.280s)! For help, type "help" or "?"` | ✓ |
| cfg | `metalAnvilRepair=true` | `run/obfuscated/config/etim.cfg` → `B:metalAnvilRepair=true` / `B:metalDebugLog=true`；行为面：门值/修量判行全出 | ✓ |
| mixin | 0 失败 | `Mixin apply failed` 0 / `MixinApplyError` 0（服务端 + 客户端双面） | ✓ |
| etim-domain total | 登记不判（随批次演化） | `144`（B2 后 128 → 本批 +16 条 block/item 面） | — 登记 |

### W2 · 存储块 9:1 双向（工作台；`build-logs/v7-w2-final.out`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| a) 9 铜锭 → 1 铜块 | `got=1` | `[11:56:42.790] [AnvilLog] w2 ingots->block got=1 want=1 \| PASS` | ✓ |
| b) 1 铜块 → 9 铜锭 | `got=9` | `[11:56:47.521] [AnvilLog] w2b result-before={"name":"unknown","count":9,"metadata":0} result-after=null got=9 want=9 \| PASS` | ✓ |
| 配方落点 | `registerStorageRecipe`：`"###"×3` + shapeless 单格 | 输出格预览 `count=9`（配方命中）；`/clear … etim:ingot_copper -1 0` 计数面 `has 9 items that match` | ✓ |
| 相位隔离 | 冒烟遗留：骑 W2a 已关窗口 → 结果点击落到旧 windowId → `got=0` | 本窗把 W2b 拆成独立相位（新 bot 窗口）后 `got=9`；见 C-ANV-8 | ✓ |

### W3 · 铜砧配方（`build-logs/v7-w3-final.out`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 合成得手 | `got=1` | `[11:56:59.746] [AnvilLog] w3 anvil-craft out={"name":"unknown","count":1,"metadata":0} got=1 want=1 \| PASS` | ✓ |
| 形状 | `"III"/" i "/"iii"`（3 块 + 7 锭） | 工装按 1/2/3 + 5/7/8/9 落料；`wclick-fail` 0 | ✓ |

### W4 · 门值矩阵 5/5（`build-logs/v7-w4-final.out` + 服务端判行）

| 格 | 期望 | 实测判行/槽面 | 判 |
|---|---|---|---|
| w4v 原版铁砧 + 铜镰 | PASS | `out={count:1} tools=1`；`[19:57:14] repair take: tool=etim:scythe_copper repaired=800 nuggets=1 kind=1 anvilWear=800` | ✓ |
| w4a 铜砧 + 铜镰 | PASS | `out={count:1} tools=1`；`[19:57:19] repair take: tool=etim:scythe_copper … anvilWear=800` | ✓ |
| w4b 铜砧 + 秘银镰 | FAIL2 | `out=null tools=1 nugs=9`；`[19:57:23] repair fail: reason=needsHarderAnvil (material=64.0 > anvil=4.0) tool=etim:scythe_mithril` | ✓ |
| w4c 秘银砧 + 秘银镰 | PASS | `out={count:1} tools=1`；`[19:57:30] repair take: tool=etim:scythe_mithril … anvilWear=800` | ✓ |
| w4d 秘银砧 + 艾德曼镰 | FAIL2 | `out=null tools=1 nugs=9`；`[19:57:34] repair fail: reason=needsHarderAnvil (material=256.0 > anvil=64.0) tool=etim:scythe_adamantium` | ✓ |

- 零串扰：w4b 的 `anvil=4.0` 行不出现在 w4c/w4d 判定；w4d 的 `anvil=64.0` 行不出现在 w4b 判定（判行按 `material/anvil` 双值定位）。
- 门值口径：FAIL2 判行携带 `anvil=4.0`（铜，factor 4）与 `anvil=64.0`（秘银，factor 64）→ 逐砧门在役。

### W5 · 损砧按块（`build-logs/v7-w5-final.out`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 单次修量 | `repaired=1600` | `[19:57:46] repair take: tool=etim:scythe_copper repaired=1600 nuggets=2 kind=1 anvilWear=1600` | ✓ |
| 账增 | `+1600` | `/etest anvilwear -34 100 12`：`[19:57:42] = 21600` → `[19:57:47] = 23200`；工装 `delta=1600 want=1600 (base=21600) \| PASS` | ✓ |

### W5b · 容量面（`build-logs/v7-w5cap-r1.out`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 满伤单次 | damage 3200 → 4 chunk | `repair take: tool=etim:scythe_copper repaired=3200 nuggets=4 kind=1 anvilWear=3200` | ✓ |
| 累积 | 24 次 × 3200 | `wear=23200->100000 want=100000`；`takes=24` | ✓ |
| 50% 台阶 | 铜砧容量 1600×31×4 = **198,400** → ≥99,200 进 stage 1 | `[20:01:37] [CraftingLog] anvil wear stage=1 at BlockPos{x=-34, y=100, z=12} total=100000` | ✓ |
| 反证 | 原版/铁 8.0 面（396,800）要到 198,400 才进 stage 1 | 100,000 就进 stage 1 → 容量 ∈ (193,600, 200,000]，198,400 在区间内、396,800 不在 | ✓ |
| 档位可目检 | DAMAGE metadata 1 | 该砧此后 DAMAGE=1（W9 展示排另放 1/2 档）；客户端侧因模型缺陷未渲染，见 W9 | — 登记 |

### W6 · GUI 上方门双面（`build-logs/v7-w6-final.out`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 上方堵实心 | 开窗拒 | `[11:58:19.112] [AnvilLog] w6 blocked-above window=none \| PASS` | ✓ |
| 清掉上方 | 开窗成 | `[11:58:19.518] [AnvilLog] w6 cleared-above window=OPENED \| PASS` | ✓ |
| 双面自洽 | 同一 bot/同一砧、仅上方格差异 | 两行同一 cell 内先后执行；mineflayer 只在收到服务端 `open_window` 才建窗 → `none` = 服务端 cancel（`MixinBlockAnvil` HEAD） | ✓ |

### W7 · BreakEvent 清账（用户操作；`build-logs/v7-client-latest.log`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 前置 | 铜砧 wear>0 | `[20:11:45] [TestLog] anvilwear -34 100 12 = 100000 [server]` | ✓ |
| 用户操作 | 生存 + 镐挖该砧 | 用户本人执行；`[20:12:00] [MiningLog] mine speed item=minecraft:diamond_pickaxe block=anvil_copper str=10.0`；`[20:12:12] [MiningLog] tool decay face=breaking … loss=480` | ✓ |
| 清账判行 | `[TestLog] anvil break face: wear ledger cleared at <pos>` | `[20:12:12] [TestLog] anvil break face: wear ledger cleared at BlockPos{x=-34, y=100, z=12} [server]` | ✓ |
| 查询面归 0 | `/etest anvilwear` = 0 | `[20:12:20] = 0`；`[20:12:36] = 0`（复读） | ✓ |
| 落盘面 | dat 条目消失 | 收口 dat（71 B）= `{-9614015856628:5600, -9064260042740:4000}`，`-9339137949684`（= -34/100/12）已无 | ✓ |

### W8 · 负证照扫

| 负证项 | 判据源 | 计数 | 判 |
|---|---|---|---|
| `IllegalStateException` | 服务端 + 客户端 | 0 | ✓ |
| `ClassCastException` / `ArrayIndexOutOfBoundsException` | 双面 | 0 / 0 | ✓ |
| `DuplicateMods` | 双面 | 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 双面 | 0 / 0 | ✓ |
| ETIM 配方冲突（`Ignoring duplicate recipe` / `Duplicate recipe`） | 双面 | 0 / 0 | ✓ |
| 崩溃 | 双面 | `CrashReport` 仅 2 条 fernflower 反编译行（`Crash` 字样误命中）；无 crash report 目录新增 | ✓ |
| `FATAL` | 双面 | 1 条 = `[20:10:53] [Client thread/FATAL] [FML]: Suppressed additional 87 model loading errors for domain etim`（模型面告警，非崩溃） | ✗ 关联 |
| **`Exception loading model for variant etim:*`** | 客户端 | **5 条逐条 + 87 条抑制 = 92 条** | **✗** |
| `Using missing texture` | 客户端 | 1 条 = `minecraft:textures/blocks/sandstone_side.png`（B1 前既有基线噪声） | — 基线 |
| 服务端 vanilla smelting 冲突 | 服务端 / 客户端 | 7 / 7（两次注册各 7 行，基线同值） | — 基线 |
| held 罐缺 mod 警告 | 服务端 / 客户端 | 2 / 4 | — 基线 |

**92 条模型失败账目**（与结构逐项对齐）：
`6 砧 × 12 变体 = 72` ＋ `5 存储块 × 1 = 5` ＋ `4 矿 × 1 = 4` ＝ **81 个方块变体**；
`6 砧 + 5 存储块 = 11 个 inventory 面`（无 item 模型）→ 81 + 11 = **92**。

### W9 · 客户端目检（用户操作）

| 子项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| ① 四矿贴图/模型 | 无缺模型 | 截图 `v7-w9-textures.png`：矿块为紫黑棋盘格（missing model）；日志 `Exception loading model for variant etim:ore_*#normal` 族（含于 92 条） | **✗** |
| ② 六砧贴图/模型（形状 + FACING + DAMAGE） | 砧形可辨、朝向有旋转、损伤有裂 | 截图：六砧全部紫黑棋盘格；朝向/损伤组（z=24）同样紫黑 → 形状/旋转/档位均不可判 | **✗** |
| ③ 五存储块贴图 | 纯金属色 | 截图：全部紫黑棋盘格 | **✗** |
| ④ tooltip 位置（B-ANV-1 修复） | 输出槽光标旁、不裁切 | 截图 `v7-w9-tooltip.png`：金字 `修理该品质超出你当前的做工预算` 绘于输出槽右侧光标旁，完整可见、未裁切、未跑到屏幕右下；服务端佐证 `[20:17:49] repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper` | **✓** |

**W9①②③ 根因（三项同源，资产面）**：

1. **方块变体模型路径双前缀**：15 个新 blockstate（`anvil_*`×6 / `storage_*`×5 / `ore_*`×4）都写成
   `"model": "etim:block/<name>"`；1.12 的 blockstate 变体引用由加载器自动补 `block/` →
   实际去取 `etim:models/block/block/<name>.json`：
   `Caused by: java.io.FileNotFoundException: etim:models/block/block/storage_adamantium.json`
   （另见 `…/block/block/anvil_silver.json`、`…/block/block/anvil_copper_damaged.json`）。
2. **砧模型纹理键少下划线**：六个 `models/block/anvil_<metal>.json` 的纹理键写的是
   `etim:blocks/anvil<metal>` / `anvil<metal>_top`（例 `anvilcopper`、`anvilancient_metal_top`），
   实际文件是 `anvil_<metal>.png` / `anvil_<metal>_top.png` → 即便模型加载成功也会缺纹理。
3. **损伤档模型 parent 少下划线**：六个 `models/block/anvil_<metal>_damaged.json` 的
   `"parent": "etim:block/anvil<metal>"`（例 `etim:block/anvilcopper`）指向不存在的模型
   （实际文件 `anvil_copper.json`）。

> 注：`models/item/ore_*.json` 里的 `"parent": "etim:block/ore_*"` 是**正确**的（item 模型的 parent
> 不补 `block/`），修复时不要跟着方块变体一起改。

---

## 三、冲突分级

### A 级（真值冲突，阻断闭单）

1. **A-ANV-BLK-1 · 15 个 blockstate 的变体模型引用双前缀**
   `assets/etim/blockstates/{anvil_*,storage_*,ore_*}.json` → `"model": "etim:block/<name>"`。
   修法：删掉 `block/` → `"model": "etim:<name>"`（15 文件各 1 处，`anvil_*` 12 个变体行同源）。
2. **A-ANV-BLK-2 · 六个砧的方块模型纹理键少下划线**
   `models/block/anvil_<metal>.json`：`"body"/"particle": "etim:blocks/anvil<metal>"`、
   `"top": "etim:blocks/anvil<metal>_top"` → 改为 `anvil_<metal>` / `anvil_<metal>_top`。
3. **A-ANV-BLK-3 · 六个损伤档模型 parent 指向不存在的模型**
   `models/block/anvil_<metal>_damaged.json`：`"parent": "etim:block/anvil<metal>"` →
   `"parent": "etim:block/anvil_<metal>"`（纹理键同上条一并改下划线）。

> 三项合起来 = W8 模型项与 W9①②③ 的全部根因；修完必须 rebuild + 重验 W8/W9（含 92→0 的模型异常计数）。

### B 级（需主会话裁口径）

1. **B-ANV-BLK-4 · 11 个 inventory 面模型缺失**：`models/item/` 下没有
   `anvil_<metal>.json` 与 `storage_<metal>.json`（矿有 `ore_*.json`）。
   日志：`Exception loading model for variant etim:anvil_mithril#inventory …
   FileNotFoundException: etim:models/item/anvil_mithril.json`。
   修法：补 11 个 item 模型，形如 `{"parent":"etim:block/<name>"}`。

### C 级（登记，不阻塞）

1. **C-ANV-7 · 客户端/服务端共用 `run/obfuscated/logs/latest.log`（C-ANV-6 复现）**：
   客户端启动轮转把服务端日志改名（本次服务端 19:51→20:03 段落 `logs/2026-10-24-6.log.gz`），
   20:10 后两进程又同写一个 `latest.log`（服务端判行与客户端判行交错）。本窗用「起客户端前快照
   服务端面 + 收口取共享面」双快照覆盖，未丢判据；后续窗口仍建议服务端独立 workdir。
2. **C-ANV-8 · W2b 相位隔离**：冒烟轮 W2b `got=0` 的根因是骑 W2a 刚关的窗口（结果点击落在旧
   windowId），非配方缺陷；本窗已把 W2b 拆独立相位（`metal-anvil-blocks-run.js` 新增 `w2b` 相位）。
3. **C-ANV-9 · W7 PlaceEvent 面未单跑**：本窗只判 BreakEvent 面（任务书要求）；放置清账由代码
   路径（`onAnvilPlace`）+ 落码批文 T3② 覆盖，未做用户放砧复验。
4. **C-ANV-10 · 门值矩阵覆盖**：五格覆盖 原版/铜/秘银 三档与两条 FAIL2（64→4、256→64）；银/金/
   古金属/艾德曼砧的**正例**（各自修同级件）未逐格跑（判值表已由 `anvilMetalDurability` 单点决定）。
5. **C-ANV-11 · 1.12 `/setblock` 形态**：本版仅接受 `/<x> <y> <z> <block> [meta] [mode]`（裸数字即
   metadata），不接受 `block[state=…]`；砧的 metadata = `facingIndex | damage<<2`（0/1/2/3 = 南/西/北/东）。
   展示排与判台均按此落块，`/testforblock … <meta>` 逐格复核通过。

---

## 四、判行锚点摘录

### 4.1 W1 boot（`v7-server-face.log`）

```
[19:51:48] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] metal anvil batch registered: 6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes [server]
[19:51:49] [Server thread/INFO] [Easy Times In Minecraft]: [EquipLog] durability reassert: 122 gear rows ok [server]
[19:51:50] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Done (1.280s)! For help, type "help" or "?"
```

### 4.2 W2–W3 工装（`v7-w2-final.out` / `v7-w3-final.out`；工装本地钟 11:xx）

```
[11:56:42.790] [anvilblocks] [AnvilLog] w2 ingots->block got=1 want=1 | PASS
[11:56:47.521] [anvilblocks] [AnvilLog] w2b result-before={"name":"unknown","count":9,"metadata":0} result-after=null got=9 want=9 | PASS
[11:56:59.746] [anvilblocks] [AnvilLog] w3 anvil-craft out={"name":"unknown","count":1,"metadata":0} got=1 want=1 | PASS
```

### 4.3 W4 门值矩阵（`v7-w4-final.out` + 服务端判行）

```
[11:57:15.479] [AnvilLog] w4v VANILLA control PASS out={"name":"unknown","count":1,"metadata":0} tools=1 nugs=8 ... | PASS
[11:57:20.783] [AnvilLog] w4a cu-anvil cu-scythe PASS out={...,"count":1,...} tools=1 nugs=8 ... | PASS
[11:57:26.027] [AnvilLog] w4b cu-anvil mi-scythe FAIL2 out=null tools=1 nugs=9 failRow="… repair fail: reason=needsHarderAnvil (material=64.0 > anvil=4.0) tool=etim:scythe_mithril …" | PASS
[11:57:31.333] [AnvilLog] w4c mi-anvil mi-scythe PASS out={...,"count":1,...} tools=1 nugs=8 ... | PASS
[11:57:36.576] [AnvilLog] w4d mi-anvil ad-scythe FAIL2 out=null tools=1 nugs=9 failRow="… repair fail: reason=needsHarderAnvil (material=256.0 > anvil=64.0) tool=etim:scythe_adamantium …" | PASS
```

### 4.4 W5 / W5b（`v7-w5-final.out` / `v7-w5cap-r1.out` + 服务端判行）

```
[11:57:47.839] [AnvilLog] w5 wear delta=1600 want=1600 (base=21600) takeRow="… repaired=1600 nuggets=2 kind=1 anvilWear=1600 …" | PASS
[12:01:38.647] [AnvilLog] w5cap takes=24 wear=23200->100000 want=100000 stageRow="… anvil wear stage=1 at BlockPos{x=-34, y=100, z=12} total=100000 …" transitionTotal=100000 | PASS
[12:01:38.647] [AnvilLog] w5cap lastTake="… repaired=3200 nuggets=4 kind=1 anvilWear=3200 …"
```

### 4.5 W6（`v7-w6-final.out`）

```
[11:58:19.112] [anvilblocks] [AnvilLog] w6 blocked-above window=none | PASS
[11:58:19.518] [anvilblocks] [AnvilLog] w6 cleared-above window=OPENED | PASS
```

### 4.6 W7 用户挖砧（`v7-client-latest.log`）

```
[20:11:45] [RCON Client #23/INFO] [Easy Times In Minecraft]: [TestLog] anvilwear -34 100 12 = 100000 [server]
[20:12:00] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=minecraft:diamond_pickaxe block=anvil_copper str=10.0 [server]
[20:12:12] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] anvil break face: wear ledger cleared at BlockPos{x=-34, y=100, z=12} [server]
[20:12:20] [RCON Client #24/INFO] [Easy Times In Minecraft]: [TestLog] anvilwear -34 100 12 = 0 [server]
```

### 4.7 W9④ tooltip（用户 F2 + 服务端佐证）

```
[20:17:49] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] Developer (489) repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper [server]
[20:17:55] [Client thread/INFO] [net.minecraft.client.gui.GuiNewChat]: [CHAT] 已将截图保存为 2026-10-24_20.17.55.png
```

### 4.8 W9①②③ 模型面（客户端）

```
[20:10:53] [Client thread/ERROR] [FML]: Exception loading model for variant etim:storage_adamantium#normal
[20:10:53] Caused by: java.io.FileNotFoundException: etim:models/block/block/storage_adamantium.json
[20:10:53] [Client thread/ERROR] [FML]: Exception loading model for variant etim:anvil_silver#damage=0,facing=south
[20:10:53] Caused by: java.io.FileNotFoundException: etim:models/block/block/anvil_silver.json
[20:10:53] [Client thread/ERROR] [FML]: Exception loading model for variant etim:anvil_mithril#inventory …
[20:10:53] Caused by: java.io.FileNotFoundException: etim:models/item/anvil_mithril.json
[20:10:53] [Client thread/ERROR] [FML]: Exception loading model for variant etim:anvil_copper#damage=1,facing=west
[20:10:53] Caused by: java.io.FileNotFoundException: etim:models/block/block/anvil_copper_damaged.json
[20:10:53] [Client thread/FATAL] [FML]: Suppressed additional 87 model loading errors for domain etim
```

### 4.9 收口帧标（`v7-session-shared.log`）

```
[20:18:36] [Client thread/INFO] [net.minecraft.client.Minecraft]: Stopping!
[20:18:45] [Server thread/INFO] [net.minecraft.server.MinecraftServer]: Stopping server
[20:18:45] [Server thread/INFO] [net.minecraft.server.MinecraftServer]: Saving worlds
[20:18:45] [Server thread/INFO] [FML]: Unloading dimension 0
```

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 客户端 | `close-client.ps1 -Snapshot`：20:18:36 `Stopping!`（pid 24212）；Gradle `BUILD SUCCESSFUL in 7m 58s`；exit 0（两次客户端轮：20:03 误关一轮 BUILD SUCCESSFUL 6m18s，20:10 正式轮 7m58s） |
| 服务端 | RCON `stop`（19:51:38 起服 pid 6040）；20:18:45 `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出；端口 25575 = 0 |
| 产品面 | jar **590,296 B @ 19:47:13**｜SHA256 `0BD63FF6…1A1B`｜HEAD = origin = `361a091`（产品 `280f445`）｜**0 rebuild** |
| 工作区 | 仅工装面改动：`M testharness/player/metal-anvil-blocks-run.js`（W2b 独立相位 + W5b 容量格）、`?? testharness/player/v7-showroom.js`（展示排搭台）；产品码/资产 **0 改动** |
| 世界 | `testw2h` 未删档；`etim_anvil_damage.dat` 71 B（`-34 100 12` 条目已清） |
| mods 面 | 客户端同步的 `run/obfuscated/mods/etim-1.0.0.jar`（590,296 B，同 SHA）已移至 `testharness/mods-hold/etim-1.0.0_280f445.jar`，服务端恢复 classpath 单面 |
| 用户操作面 | W7 挖砧、W9 三组目检 + tooltip：全部用户本人执行；AI 仅发 RCON 传送/给物/查询与读日志判读，未模拟点击、未抢焦点 |

---

## 六、结论

- **W1 PASS**：`6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes` + `122 gear rows ok`
  + `Done (1.280s)`；cfg 开关在役；mixin 0 失败。
- **W2 PASS 2/2**：9 锭→1 块 `got=1`；1 块→9 锭 `got=9`（本窗新判，独立相位；冒烟 `got=0` 系相位串窗）。
- **W3 PASS**：铜砧 `got=1`（3 块 + 7 锭格形）。
- **W4 PASS 5/5**：原版/铜/秘银正例 + 两条 FAIL2，判行携带 `anvil=4.0` / `anvil=64.0` 逐砧门值。
- **W5 PASS**：一次修 `delta=1600`、`anvilWear=1600`；**W5b PASS**：24 次满伤修到 100,000 触发
  `stage=1`，反证容量 198,400（非原版 396,800）。
- **W6 PASS 双面**：上方堵块拒窗、清掉成窗。
- **W7 PASS（用户操作）**：`anvil break face: wear ledger cleared at BlockPos{x=-34, y=100, z=12}`
  + `/etest anvilwear 100000 → 0` + dat 条目消除，三面自洽。
- **W8 FAIL（模型项）**：崩溃/异常/配方冲突/mixin 全 0，但 ETIM 模型加载失败 **92 条**
  （5 条逐条 + 87 条抑制），与 81 个方块变体 + 11 个 inventory 面逐项对齐。
- **W9**：①②③ **FAIL**——六砧 / 四矿 / 五存储块全部渲染为紫黑棋盘格，形状/朝向/损伤档均不可判；
  ④ **PASS**——B-ANV-1 修复生效，金字绘于输出槽光标旁、完整不裁切。
- **闭单判定：本批不可闭单。** A 级 3 笔（A-ANV-BLK-1/2/3，全部资产面）+ B 级 1 笔（B-ANV-BLK-4），
  修完 rebuild 后须重验 W8 模型计数（92→0）与 W9①②③（含朝向/损伤档目检）；W1–W7 无需重跑
  （行为面判据与资产面正交，已全部成立）。
