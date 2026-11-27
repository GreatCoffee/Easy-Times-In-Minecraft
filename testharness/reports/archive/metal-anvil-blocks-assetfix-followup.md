# 阶段四 金属砧块批 · 资产面修复追验（W8-R / W9-R）

> **执行方**：会话七（验证窗执行）
> **追验对象**：产品 commit **597a2fd**（`metal anvil blocks: asset-face fixes (A-ANV-BLK-1/2/3, B-ANV-BLK-4)`）
> **判据正本**：`playground/audit/metal-anvil-blocks-落码批文.md` :88-90/:107（资产面「砧三档形状复用 vanilla parent + etim 贴图」、W9「砧贴图三档/storage/ore 贴图/tooltip」）＋ 本窗任务书
> **现役钉值**：jar **592,683 B** @ **2026-10-24 20:23:45**｜SHA256
> **BC5443DD32E92213656BD5854201A71A21E44FA86266ECB39A8820AD9BBF5FF1**｜HEAD = origin/master = **597a2fd**｜
> 窗内 **0 rebuild**。
> **判据源**：服务端 `[TestLog]` / `[EquipLog]`（boot 锚）＋ 客户端模型加载日志（W8-R）＋ 用户 F2 截图与受控
> 快捷栏目检（W9-R）＋ jar 内资产静态核对。
> **口径**：通过 ✓、不通过 ✗；**判点 ✗ = 2**（W9-R② 损伤档 / W9-R③ 物品形态）。UTF-8 无 BOM、0 U+FFFD。
> **报告字节规格**：`14,015 B｜UTF-8 无 BOM｜0 U+FFFD｜✓ 20 / ✗ 12｜206 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 592,683 B | 592,683 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-24 20:23:45 | 2026-10-24 20:23:45（客户端轮后同值） | ✓ |
| SHA256 | `BC5443DD…5FF1` | `BC5443DD32E92213656BD5854201A71A21E44FA86266ECB39A8820AD9BBF5FF1` | ✓ 逐位 |
| 产品 commit | `597a2fd` | `597a2fd`（= HEAD = origin/master） | ✓ |
| 窗内 rebuild | 禁止 | 起服前 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 客户端加载面 | 钉 jar 单面 | `[etim-harness] pinned etim jar synced+verified: 592683B  SHA256 BC5443DD32E92213656BD5854201A71A21E44FA86266ECB39A8820AD9BBF5FF1` | ✓ |
| 起服面 | classpath append（mods 无 etim） | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/24/2026 20:23:45)`；起服时 `run/obfuscated/mods` 无 etim jar | ✓ |
| 世界 | `testw2h` 保留 | 展示排 z=20/22/24 方块在位（`/testforblock` 逐格命中） | ✓ |
| 端口 | 0 → 0 | 起服后 25575 LISTEN；停服后 0 | ✓ |

### 0.1 快照与产物

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/v8-server-face.log` | 46,568 B | 服务端面 boot 锚（20:25:21 → 客户端启动轮转前快照） |
| `build-logs/v8-client-latest.log` | 211,101 B | 客户端全会话快照（`close-client.ps1 -Snapshot`） |
| `build-logs/v8-session-shared.log` | 211,101 B | 收口快照（含 `Stopping!` / `Stopping server`） |
| `build-logs/v8-w9r-world.png` | 294,127 B | 用户 F2：展示排三排（20:29:26） |
| `build-logs/v8-w9r-inventory.png` | 552,161 B | 用户 F2：物品栏/手持（20:29:34） |
| `build-logs/v8-w9r-hotbar.png` | 561,321 B | 用户 F2：受控 8 格对照（20:33:28） |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W8-R** | 客户端整 boot 窗模型加载异常 92 → 0 | **PASS** | `Exception loading model` = **0**；`Suppressed additional` = **0**（客户端全会话） |
| **W9-R①** | 四矿贴图/模型 | **PASS** | 截图四矿为 stone 底 + 各金属斑点（铜橙 / 银白 / 秘银青 / 艾德曼深蓝），无紫黑棋盘格 |
| **W9-R②** | 六砧形状 / FACING / DAMAGE 三档 | **PASS（形状+朝向）/ ✗（损伤档）** | 六砧金属色与砧形可辨；meta 0/1/2/3 四朝向逐格命中；**损伤档与 0 档外观完全相同（无裂纹贴图）** |
| **W9-R③** | 五存储块贴图 + 手持/物品栏形态 | **PASS（方块面）/ ✗（物品形态）** | 世界内五色金属块正常；**全部 ETIM 物品图标为 missing model（紫黑整格）** |
| **W9-R④** | tooltip 位置 | **PASS（免复）** | 上一窗已判 `v7-w9-tooltip.png`：金字在输出槽旁、不裁切；本窗未复跑 |

**总记**：W8-R 兑现（92 → 0，客户端实测）；W9-R 方块的**世界面**全部修复；**物品形态**与**损伤档外观**两处 ✗，
W9-R 总判 **FAIL**，本批仍**不可闭单**。

---

## 二、逐门核讫

### W8-R · 客户端模型加载异常归零（`build-logs/v8-client-latest.log`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| `Exception loading model` | 0 | **0**（全会话；`v8-session-shared.log` 同值） | ✓ |
| `Suppressed additional` | 0 | **0** | ✓ |
| 前窗账目 92 条 | 92 → 0 | 81 方块变体 + 11 inventory 面全部消失 | ✓ |
| `Using missing texture` | 仅基线噪声 | 1 条 = `[20:26:02] … unable to load minecraft:textures/blocks/sandstone_side.png`（B1 前既有） | — 基线 |
| 材质图集 | 正常创建 | `[20:26:03] Created: 1024x512 textures-atlas` | ✓ |

### W9-R① · 四矿（用户目检，`v8-w9r-world.png`）

| 判据 | 实测 | 判 |
|---|---|---|
| 四矿贴图 | 石底 + 金属斑点：铜（橙斑）、银（白斑）、秘银（青斑）、艾德曼（深蓝斑） | ✓ |
| 无紫黑棋盘格 | 截图四格矿均正常 | ✓ |

### W9-R② · 六砧（用户目检 + 落块复核）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 金属色/砧形 | 六砧可辨 | 截图可见铜橙、银白、金黄、秘银青、艾德曼深灰、古金属绿六色砧形 | ✓ |
| FACING 四档 | meta 0/1/2/3 | `/testforblock -42/-40/-38/-36 100 24 etim:anvil_copper <0/1/2/3>` 四格全部 `Successfully found`；jar 内 blockstate `y` = 0/90/180/270；截图可见朝向差异 | ✓ |
| DAMAGE 1/2 档 | 有可见裂纹/差异 | `/testforblock -32/-30 100 24 etim:anvil_copper <6/10>` 命中；但 `textures/blocks/` 仅有 `anvil_<m>.png` 与 `anvil_<m>_top.png`（无 `*_damaged*`），`models/block/anvil_<m>_damaged.json` = `{"parent":"etim:block/anvil_<m>","textures":{"top":"etim:blocks/anvil_<m>_top"}}` → **与 0 档逐字节等价渲染**；用户判词「无法判断是否有裂纹，因为看起来都一样」 | **✗** |

### W9-R③ · 五存储块（世界面 + 物品形态）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 世界内贴图 | 纯金属色 | 截图可见铜橙/银白等存储块，无棋盘格 | ✓ |
| 物品栏图标 | 图标正常 | 用户受控 8 格对照（铜锭/铜砧/铜块/铜珠/铜镰/钻石镐/铜矿/石头）：**除钻石镐与石头外全部紫黑整格** | **✗** |
| 手持形态 | 正常 | 同上（图标与手持共用 missing model） | **✗** |
| 根因 | — | `src/main/java` 全量检索 `setCustomModelResourceLocation|ModelRegistryEvent|registerItemVariants|getItemModelMesher|ModelLoader` = **0 命中**；Forge 1.12 `ModelLoader.onRegisterItems` 只注册 `customModels` 表内条目（javap 复核）→ 未注册的物品走 `ItemModelMesher` 缺省 missing model（**无日志**）；`loadItemModels` 仍会读 `models/item/<name>.json`（故前窗只报缺文件的 11 条） | ✗ 系统性 |

> 说明：11 个 `models/item/{anvil,storage}_<m>.json` 已在 jar 内（各 37-39 B，JSON 合法），B-ANV-BLK-4 的
> **文件面已兑现**；图标仍缺是「注册面」缺失，属**先于本批**的系统性缺口（597a2fd 仅改 assets，源码 0 变动）。

### W9-R④ · tooltip

- 上一窗已判 PASS（`build-logs/v7-w9-tooltip.png`：金字在输出槽光标旁、完整不裁切）。
- 本窗按任务书「已 PASS 免复」未重跑；`MixinGuiRepair` 面本窗 0 改动。

---

## 三、冲突分级

### A 级（阻断闭单）

1. **A-ANV-BLK-5 · ETIM 全物品无 item 模型注册（系统性，先于本批）**
   证据：`src/main/java` 无 `setCustomModelResourceLocation` / `ModelRegistryEvent` / `registerItemVariants`
   任一面；Forge 1.12 `ModelLoader.onRegisterItems` 仅遍历 `customModels`（javap 复核），未被注册的物品
   `ItemModelMesher` 返回 missing model（静默，不产生 `Exception loading model`）。
   现象：全部 ETIM 物品图标/手持 = 紫黑整格（用户受控 8 格对照）；世界内方块不受影响（走 blockstate）。
   修法：新增客户端 `ModelRegistryEvent` 处理器，对 `Item.REGISTRY` 中 `etim:` 域物品逐个
   `ModelLoader.setCustomModelResourceLocation(item, 0, new ModelResourceLocation(item.getRegistryName(), "inventory"))`
   （有子类型的物品按 meta 逐个注册）。**Java 改动 → 需 rebuild。**
2. **A-ANV-BLK-6 · 砧 DAMAGE 三档无外观差异（违反批文 :88-90「三档形状复用 vanilla parent + etim 贴图」）**
   证据：`assets/etim/textures/blocks/` 只有 `anvil_<m>.png` / `anvil_<m>_top.png` 12 张，无任何
   `*_damaged*` 纹素；`anvil_<m>_damaged.json` 仅换 parent 名、`top` 仍指向 `anvil_<m>_top`；
   用户判词「看起来都一样」。修法：补 1/2 档裂纹纹素（或按批文复用 vanilla `block/anvil_damaged_0/1`
   形状 + etim 贴图），blockstate 的 `damage=1` / `damage=2` 分别指向不同模型。**资产改动 → 需 rebuild。**

### B 级

- **B-ANV-BLK-4（前窗）状态更新**：11 个 item 模型文件已落地（jar 内存在、JSON 合法），由
  `Exception loading model` 92 → 0 佐证；但物品图标仍被 A-ANV-BLK-5 卡住，本项**不可单独销账**。

### C 级（登记，不阻塞）

1. **C-ANV-12 · 玩家预览躯干紫黑**：`/clear Developer etim:{helmet,chestplate,leggings,boots,chain_chestplate}_copper 0 0`
   全部 `no items to remove`（未穿 ETIM 甲）→ 紫黑躯干为离线皮肤面，非本批资产，登记。
2. **C-ANV-13 · 共用 `run/obfuscated/logs/latest.log`（C-ANV-7 复现）**：客户端启动轮转服务端日志，
   本窗以起客户端前快照 `v8-server-face.log`（46,568 B）+ 收口共享面双快照覆盖，判据未丢。
3. **C-ANV-14 · 物品图标只能用户目检**：图标渲染无日志判定点；本窗用受控 8 格对照（固定槽位 + 固定物品）
   取用户判词，落 `v8-w9r-hotbar.png`。

---

## 四、判行锚点摘录

### 4.1 服务端 boot（`v8-server-face.log`）

```
[20:25:29] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] metal anvil batch registered: 6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes [server]
[20:25:30] [Server thread/INFO] [Easy Times In Minecraft]: [EquipLog] durability reassert: 122 gear rows ok [server]
[20:25:31] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Done (1.052s)! For help, type "help" or "?"
```

### 4.2 客户端钉 jar 与模型面（`v8-client-gradle.out` / `v8-client-latest.log`）

```
[etim-harness] pinned etim jar synced+verified: 592683B  SHA256 BC5443DD32E92213656BD5854201A71A21E44FA86266ECB39A8820AD9BBF5FF1
[20:26:03] [Client thread/INFO] [net.minecraft.client.renderer.texture.TextureMap]: Created: 1024x512 textures-atlas
[20:26:02] [Client thread/ERROR] [net.minecraft.client.renderer.texture.TextureMap]: Using missing texture, unable to load minecraft:textures/blocks/sandstone_side.png, java.io.FileNotFoundException
```

`Exception loading model` = 0｜`Suppressed additional` = 0（整档 `v8-client-latest.log`，211,101 B）

### 4.3 落块复核（服务端 RCON）

```
/testforblock -42 100 24 etim:anvil_copper 0 -> Successfully found the block at -42, 100, 24
/testforblock -40 100 24 etim:anvil_copper 1 -> Successfully found the block at -40, 100, 24
/testforblock -38 100 24 etim:anvil_copper 2 -> Successfully found the block at -38, 100, 24
/testforblock -36 100 24 etim:anvil_copper 3 -> Successfully found the block at -36, 100, 24
/testforblock -32 100 24 etim:anvil_copper 6 -> Successfully found the block at -32, 100, 24
/testforblock -30 100 24 etim:anvil_copper 10 -> Successfully found the block at -30, 100, 24
```

### 4.4 收口帧标（`v8-session-shared.log`）

```
[20:38:32] [Client thread/INFO] [net.minecraft.client.Minecraft]: Stopping!
[20:38:37] [Server thread/INFO] [net.minecraft.server.MinecraftServer]: Stopping server
[20:38:37] [Server thread/INFO] [net.minecraft.server.MinecraftServer]: Saving worlds
[20:38:37] [Server thread/INFO] [FML]: Unloading dimension 0
```

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 客户端 | `close-client.ps1 -Snapshot`：20:38:32 `Stopping!`（pid 22084）；Gradle `BUILD SUCCESSFUL in 12m 43s`；exit 0 |
| 服务端 | RCON `stop`：20:38:37 `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；pid 25952 退出；端口 25575 = 0 |
| 产品面 | jar **592,683 B @ 20:23:45**｜SHA256 `BC5443DD…5FF1`｜HEAD = origin = `597a2fd`｜**0 rebuild** |
| 工作区 | 产品码/资产 0 改动；仅前窗工装/报告未跟踪（`M testharness/player/metal-anvil-blocks-run.js`、`?? v7-showroom.js`、`?? metal-anvil-blocks-verdict.md`） |
| mods 面 | 客户端同步件已移至 `testharness/mods-hold/etim-1.0.0_597a2fd.jar`，服务端恢复 classpath 单面 |
| 用户操作面 | 世界目检、物品栏/手持目检、受控 8 格对照：全部用户本人执行；AI 仅 RCON 传送/给物/查询与读日志/读截图，未模拟点击、未抢焦点 |

---

## 六、结论

- **W8-R PASS**：客户端整 boot 窗 `Exception loading model` = 0、`Suppressed additional` = 0（前窗 92 → 0），
  blockstate/模型/纹理路径修复**已实测兑现**。
- **W9-R① PASS**：四矿世界面贴图正常。
- **W9-R②**：六砧形状/金属色/四朝向 PASS；**DAMAGE 1/2 档与 0 档外观完全相同 ✗**（无裂纹纹素，
  damaged 模型仅换 parent、top 同图），违反批文「砧三档」。
- **W9-R③**：五存储块世界面 PASS；**全部 ETIM 物品图标/手持 = missing model ✗**（无 item 模型注册，
  静默 missing，世界方块不受影响）。
- **W9-R④ PASS（免复）**。
- **闭单判定：本批仍不可闭单。** 新增 A 级 2 笔：**A-ANV-BLK-5**（item 模型注册缺失，Java，需 rebuild）、
  **A-ANV-BLK-6**（DAMAGE 档无裂纹纹素，资产，需 rebuild）。修完只需重验 W8-R（0 保持）+ W9-R②③；
  W1–W7 与 W8-R 已成立，无需重跑。
