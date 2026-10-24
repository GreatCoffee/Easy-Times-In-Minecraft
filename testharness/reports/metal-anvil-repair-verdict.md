# 批三 修理面（砧修链）· 验证窗判决回执（W1–W8）

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-anvil-repair-落码批文.md` §三 + 本窗任务书（W1–W8）
> **现役钉值**：jar **564,544 B** @ **2026-10-24 18:15:32**｜SHA256
> **990F7FAED6B40E0F78F3A942BA8B9EBCB9FF240382B340443A7DCA999413C331**｜产品 commit **250fb57**｜
> HEAD = origin/master = **250fb57**｜窗内 **0 rebuild**。
> **判据源**：产品 `[TestLog]` / `[EquipLog]` / `[CraftingLog]` 判行（服务端权威）＋ 工装 `[AnvilLog]` 判行
> （数值来自服务端下发：窗口槽包、`/clear` 计数）＋ `etim_anvil_damage.dat` NBT 直读 ＋ 客户端 F2 截图（辅助，非判据）。
> **口径**：通过 ✓、不通过 ✗（W1–W8 判点失败 0；✗ 仅 T6② 辅助面 1 处「tooltip 位置」与图例/规格行记号）；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档；只在台架 y=99/100 重建判台。
> **报告字节规格**：`22,404 B｜UTF-8 无 BOM｜0 U+FFFD｜✓ 68 / ✗ 4｜308 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 564,544 B | 564,544 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-24 18:15:32 | 2026-10-24 18:15:32（客户端轮后同值） | ✓ |
| SHA256 | `990F7FAE…13C331` | `990F7FAED6B40E0F78F3A942BA8B9EBCB9FF240382B340443A7DCA999413C331` | ✓ 逐位 |
| 产品 commit | `250fb57` | `git rev-parse HEAD` = `250fb57` | ✓ |
| HEAD / origin | `250fb57` / `250fb57` | `250fb57` / `250fb57` | ✓ |
| 工作区 | 窗内禁触产品码与 git | 起服前 `git status --porcelain` 空；收口后仍空 | ✓ |
| 窗内 rebuild | 禁止 | 起服前后、客户端 Gradle 轮后 jar 字节/SHA/mtime 全同 → **0 次** | ✓ |
| 起服面 | `gradlew runObfServer` 等价面 | `start-server.ps1`：`classpath append … (mtime=10/24/2026 18:15:32)`；起服时 `run/obfuscated/mods` 无 etim jar | ✓ |
| 端口 | 起服前 0 | 25575 无 LISTEN；两次停服后均 0 | ✓ |
| 世界 | `testw2h` 保留 | `level-name=testw2h`，未删档 | ✓ |
| cfg | 与冒烟轮同 | `metalAnvilRepair=true` / `metalDebugLog=true` / `metalSystem=true` / `metalOreGen=true`；`miningDebugLog=true` / `equipDebugLog=true` / `mobEquipDebugLog=false` = 默认值，未改 | ✓ |
| 客户端 | obf 客户端（T6②） | `runObfClient`（JAVA_HOME=JDK 25；19 mods active），Direct Connect `localhost`，玩家 `Developer` | ✓ |

### 0.1 快照与工装落盘

| 产物 | 字节 / 行 | 说明 |
|---|---|---|
| `build-logs/metal-anvil-verify-server.log` | 52,202 B / 361 行 | W1–W8 判据源（客户端启动轮转前的服务端会话；从 `logs/2026-10-24-7.log.gz` 恢复） |
| `build-logs/metal-anvil-client-latest.log` | 229,863 B / 1,875 行 | 客户端会话快照（close-client.ps1；含 `Stopping!`、截图回执、Developer fail 行） |
| `build-logs/metal-anvil-verify-mixed.log` | 229,863 B / 1,880 行 | 客户端+服务端共用 `latest.log` 的收口快照（含 `Stopping server`/`Saving worlds`） |
| `build-logs/metal-anvil-reboot.log` | 47,344 B / 321 行 | W7 重启读回面（dat 仍为 6400；boot 锚点复现） |
| `build-logs/anvil-verify.out` | 15,024 B | 工装全相位 stdout（7 个结果块） |
| `build-logs/anvil-out.json` | 2,416 B | 工装结构化结果（`ok:true`） |
| `build-logs/metal-anvil-client-tooltip.png` | 637,518 B | 客户端 F2 截图副本（tooltip 辅助面） |
| `run/obfuscated/testw2h/data/etim_anvil_damage.dat` | 52 B | NBT：`data` → `-9339137949684` = long `[0, 6400]` |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W1** | boot 锚：19 batch rows / reassert 122 / cfg | **PASS** | `19 batch rows ok (runtime REGISTRY delta; etim-domain total 128 incl legacy 94…)`；`durability reassert: 122 gear rows ok`；`Done (1.029s)`；cfg `metalAnvilRepair=true`（文件面 + 行为面双证） |
| **W2** | 耗材修理：1600 = 2×800、扣 2 珠、XP 平、wear 1600 | **PASS** | `repaired=1600 nuggets=2 kind=1 anvilWear=1600`；out `count=1 metadata=0`；nuggetsLeft=7；XP 200→200 |
| **W3** | 合并：repaired=800、nuggets=0、anvilWear=0、XP 平 | **PASS** | `repaired=800 nuggets=0 kind=2 anvilWear=0`；out `metadata=0`；toolsLeft=1；XP 200→200 |
| **W3d** | 净双件拒修：out 空、tools=2、无 kind=2 行 | **PASS** | `out=null toolsLeft=2 kind2Rows=0`；XP 200→200 |
| **W4** | fail 2：needsHarderAnvil、件珠原封 | **PASS** | `reason=needsHarderAnvil … tool=etim:scythe_mithril`；`out=null tools=1 nuggets=9` |
| **W5** | fail 1：insufficientSkill、fail2 零串扰 | **PASS** | `reason=insufficientSkill … tool=etim:scythe_copper`；最后一行为 fail1，无 `needsHarderAnvil`；`out=null tools=1 nuggets=9` |
| **W6** | 铁珠 9:1 双向 | **PASS 2/2** | 锭→9 珠 `got=9`（out `iron_nugget ×9`）；9 珠→锭 `got=1`（out `iron_ingot ×1`） |
| **W7** | wear dat 落盘 + `[CraftingLog] anvilWear` 值判 | **PASS** | dat 4800→**6400**（+1600 = 工具 ×1）；`anvilWear=1600` / `0` 两行；停服存盘 + 重启读回仍 6400 |
| **W8** | 负证照扫 | **PASS（服务端面）** | drifted / ISE / FATAL / Crash / Dup / CCE / AIOOBE / mixin / ETIM 配方冲突 = 0；基线噪声同值（smelting 7、held 2） |

**总记**：W1–W8 全 PASS。**A 级 0**；**B 级 2**（B-ANV-1 客户端 tooltip 双偏移、B-ANV-2 B1 四个 ore blockstate 截断）；**C 级 6**（C-ANV-1…6）＋ 沿用 C-SK 挂账。

---

## 二、逐门核讫

### W1 · boot 锚（`build-logs/metal-anvil-verify-server.log`，boot 18:21:0x → `Done (1.029s)`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 批次真计数行 | `19 batch rows ok`（17+2 铁珠行） | `[18:21:08] [TestLog] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 128 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]` | ✓ |
| fail-fast 语义 | `added != 19` → `IllegalStateException` | 未触发：boot 正常完成；全窗 `IllegalStateException` = 0 | ✓ |
| etim-domain total | 登记不判（随批次演化） | `128`（= 94 legacy + 19 本批 + 15 B1/B2；total 数值登记不判） | — 登记 |
| 耐久重断言 | `122 gear rows ok` | `[18:21:09] [EquipLog] durability reassert: 122 gear rows ok [server]` | ✓ |
| cfg 开关 | `metalAnvilRepair=true` | `run/obfuscated/config/etim.cfg` → `B:metalAnvilRepair=true` / `B:metalDebugLog=true`（默认值未改）；行为面：本窗 repair take/fail 行全出 | ✓（文件面 + 行为面；无独立 boot dump 行，见 C-ANV-2） |
| boot 时长 | — | `[18:21:10] Done (1.029s)! For help, type "help" or "?"` | ✓ |
| mixin | 0 异常 | `Mixin apply failed` 0 / `MixinApplyError` 0 | ✓ |
| 旧字面退役 | `17 batch rows` / `111 rows` 不出现 | 全窗各 0 命中 | ✓ |

### W2 · 耗材修理（工作台外：砧窗；`/etest damage 1600` + 9 铜珠）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 输入 | 铜镰刀 damage 1600；9 铜珠 | `[EtimTest] damage_set params=[0, 1600, 3200]`；`give … nugget_copper 9` | ✓ |
| 修量 | 2×800 = 1600 | `repair take: tool=etim:scythe_copper repaired=1600 nuggets=2 kind=1 anvilWear=1600` | ✓ |
| 扣珠 | 2（9→7） | `nuggetsLeft=7`；`nuggets=2` | ✓ |
| 剩余 damage | 0 | 输出槽 `out={"name":"unknown","count":1,"metadata":0}`（metadata = itemDamage = 0） | ✓ |
| XP | 0 级经验（取件前后逐位） | `xp=200->200`（`[EtimTest] level_set 200`；取件/关窗后仍 200） | ✓ |
| 砧损 | 工具 ×1 = 1600 | `anvilWear=1600`；dat +1600（见 W7） | ✓ |
| 产物回收 | 取件后槽清 | `tools=1`（`/clear etim:scythe_copper -1 0` 计数）；关窗后物品回包 | ✓ |
| 链面 | 批文 W2 字面 `result CHANGED→click→COMPLETE→槽清` | 砧路径判行为单行 `repair take`；无工作台四段链（C-ANV-1 口径登记） | ✓（等价证据） |

### W3 · 合并（-800 / -400）与 W3d · 净双件拒修

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 合并修量 | 剩余 2400+2800=5200 > 3200 → 封顶 damage 0 | `repair take: tool=etim:scythe_copper repaired=800 nuggets=0 kind=2 anvilWear=0`；out `metadata=0` | ✓ |
| 扣珠 | 0 | `nuggets=0`；无珠被消耗 | ✓ |
| 砧损 | 0 | `anvilWear=0`；dat 本相位 +0 | ✓ |
| 工具数 | 1 | `toolsLeft=1` | ✓ |
| XP | 平 | `xp=200->200` | ✓ |
| W3d 净双件 | 输出空、两件原封、无 kind=2 行 | `out=null toolsLeft=2 kind2Rows=0`；XP 200→200 | ✓ |

### W4 · fail 2（mithril 件在铁砧）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 输出 | 空 | `out=null` | ✓ |
| fail 行 | `needsHarderAnvil` | `[18:21:52] repair fail: reason=needsHarderAnvil (material durability > iron 8.0) tool=etim:scythe_mithril [server]` | ✓ |
| 件珠原封 | tools=1、nuggets=9 | `tools=1 nuggets=9` | ✓ |
| 取件拒 | 输出空 → 点结果槽无产物 | 工装 `wclick(2)` 后无产物；`wclick-fail` 0 | ✓ |

### W5 · fail 1（superb 品质 + 等级 0）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 输出 | 空 | `out=null` | ✓ |
| fail 行 | `insufficientSkill` | `[18:21:57] repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper [server]` | ✓ |
| fail2 零串扰 | 最后一行不得含 `needsHarderAnvil` | 最后一行仅 `insufficientSkill`；`noFail2=true` | ✓ |
| 件珠原封 | tools=1、nuggets=9 | `tools=1 nuggets=9` | ✓ |

### W6 · 铁珠 9:1（T5②；工作台网格，vanilla 物品）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 1 铁锭 → 9 铁珠 | `got=9` | `w6 ingot->nuggets out={"name":"iron_nugget","count":9,"metadata":0} got=9 want=9 | PASS` | ✓ |
| 9 铁珠 → 1 铁锭 | `got=1` | `w6 nuggets->ingot out={"name":"iron_ingot","count":1,"metadata":0} got=1 want=1 | PASS` | ✓ |
| 形状 | shapeless 单格/九格 | 两向均按 `gridCell` 落料；`wclick-fail` 0 | ✓ |

### W7 · 砧损 dat（WorldSavedData 载体 b）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| dat 落盘 | `<world>/data/etim_anvil_damage.dat` 存在 | `run/obfuscated/testw2h/data/etim_anvil_damage.dat` 存在，52 B | ✓ |
| 累积值 | 4800 → 6400（+1600） | NBT `data → -9339137949684 = long [0, 6400]`；起点 4800（冒烟轮遗留），本窗 +1600 | ✓ |
| 等比行 | 工具 ×1 = 修量 | `anvilWear=1600`（W2）；`anvilWear=0`（W3 合并） | ✓ |
| 停服存盘 | 保存后值不变 | 18:36:42 `Saving worlds` 后仍 6400 | ✓ |
| 重启读回 | 存档重进后查读 | 18:37:58 二次 boot 后 dat 仍 6400；`19 batch rows` / `122` 复现；无 NBT 读取错误 | ✓ |
| stage 阈值 | ≥0.5/0.8/1.0 → DAMAGE 1/2/破 | 6400 / 396,800 = 1.61% < 50% → 未达阈值；0.5/0.8/1.0 **经济不可达**，按任务书登记不判（C-ANV-4） | — 登记 |
| 甲 ×200 | 甲修量 ×200 | 本窗工装仅覆盖工具 ×1；甲面未起第二组件（C-ANV-4） | — 登记 |
| breakChance | 0（vanilla 12% 不触发） | 本窗未触发砧损阈值/破砧，无法直接观测；`anvilWear` 行与 dat 累积一致（C-ANV-4） | — 登记 |

### W8 · 负证照扫

| 负证项 | 服务端判据源计数 | 判 |
|---|---|---|
| `drifted from the judged value` | 0 | ✓ |
| `IllegalStateException` | 0 | ✓ |
| `FATAL` | 0 | ✓ |
| `Crash` / crash report | 0 / 0（`crash-reports` 0） | ✓ |
| `DuplicateMods` | 0 | ✓ |
| `ClassCastException` | 0 | ✓ |
| `ArrayIndexOutOfBoundsException` | 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| ETIM 配方冲突（`Ignoring duplicate recipe` / `Duplicate recipe`） | 0 / 0 | ✓ |
| 缺贴图 / 缺模型（服务端） | 0 / 0 | ✓（服务端不加载模型；客户端面见下） |
| 旧字面 `17 batch rows` / `111 rows` | 0 / 0 | ✓ |
| vanilla smelting 冲突（`Ignored smelting recipe with conflicting input`） | 7 行（oreRedstone/oreLapis/netherquartz/oreDiamond/oreEmerald/oreCoal/clay） | — 基线噪声（C-SK-2 同值） |
| held 罐缺 mod 警告（`Attempting connection with missing mods`） | 2 行 | — 基线噪声（C-SK-2 同值） |
| 工装面 | `FAIL` 0 / `wclick-fail` 0 / `NO-WINDOW` 0 / `FATAL` 0 | ✓ |

**客户端面负证（辅助，非 W8 判据）**：`FATAL` 0；`Crash` 0（2 处匹配 = `CrashReport` 类反编译行，非崩溃）；`ISE` / `CCE` / `AIOOBE` / `NPE` / `DuplicateMods` / mixin 异常 = 0。客户端 ERROR 40 行 = 26 fernflower 反编译 + 4 main（Maven/签名）+ 9 Client thread（1 vanilla `sandstone_side.png` + 8 条 ETIM ore variant）+ 1 Netty（客户端关服断连）。其中 8 条 ETIM ore variant 缺模型 = **B-ANV-2**（B1 遗留，非砧批引入）。

### T6② · 客户端面（tooltip 辅助 + GUI 冒烟）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 客户端启动 | obf 客户端、19 mods | `runObfClient`（JDK 25；`19 mods loaded, 19 mods active`）；Direct Connect `localhost`；玩家 `Developer` | ✓ |
| GUI 冒烟 | 砧窗可开、可落料、不崩 | 砧窗打开；左格铜镰、右格 9 铜珠；输出空（fail1）；无崩溃 | ✓ |
| 服务端佐证 | fail1 行 | `[18:32:29] [CraftingLog] Developer (104) repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper [server]` | ✓ |
| 金字内容 | `container.repair.insufficientSkill` | zh_cn：`修理该品质超出你当前的做工预算`；截图右侧可见「修理该…」金色字（被裁切） | ✓（内容） |
| 金字位置 | 输出槽 hover 旁 | 实际绘制在屏幕右下（鼠标坐标 + guiLeft/guiTop 双重偏移），被屏幕边缘/JEI 裁切 | ✗（位置）→ **B-ANV-1** |
| 截图 | F2 | `run/obfuscated/screenshots/2026-10-24_18.35.44.png`（637,518 B；副本 `build-logs/metal-anvil-client-tooltip.png`） | ✓ |

**B-ANV-1 根因**：`MixinGuiRepair` 在 `drawGuiContainerForegroundLayer` 的 TAIL 调用
`self.drawHoveringText(text, mouseX, mouseY)`；该回调已处于 `GlStateManager.translate(guiLeft, guiTop, 0)`
的矩阵内，而 `mouseX/mouseY` 是屏幕坐标 → 实际绘制点 = `(guiLeft + mouseX, guiTop + mouseY)`，双重偏移。
修法：经 `GuiContainerAccessor` 取 `guiLeft/guiTop` 后减掉（或改注入到矩阵外）。
按任务书 tooltip 为辅助非判据，故不阻塞 W1–W8；是否另批修由主会话裁。

---

## 三、冲突分级

### A 级（真值冲突）

**0 笔。** 砧修链 W1–W8 判据全部成立；服务端判行、`/clear` 计数、dat NBT 三方自洽。

### B 级（需主会话裁口径）

1. **B-ANV-1 · 客户端 tooltip 双重偏移**：内容正确（`insufficientSkill` 金字），位置错到屏幕右下并被裁切。
   根因与一行修法见上。按任务书 tooltip 非判据，故不阻塞；建议另批修（客户端渲染面）。
2. **B-ANV-2 · B1 四个 ore blockstate 截断 → 客户端缺模型**：`assets/etim/blockstates/ore_{copper,silver,mithril,adamantium}.json`
   均为 **37 B**，内容截断为 `{"variants":{"normal":{"model":"etim:`（缺模型 id 与收尾大括号）。
   客户端日志 4 条 `Exception loading model for variant etim:ore_*#normal` + 4 条 blockstate 异常；
   模型文件 `models/block/ore_*.json` 与贴图均在。修法：四文件补全为
   `{"variants":{"normal":{"model":"etim:ore_<metal>"}}}`（或对应 block 模型路径）。
   属 B1 金属批遗留，非本砧批引入；建议另批修（需 rebuild）。

### C 级（登记，不阻塞）

1. **C-ANV-1 · W2 链面字面口径**：批文 W2 写 `result CHANGED→click→COMPLETE→槽清`（工作台合成链）；
   砧路径判行为单行 `repair take: …`，无四段链。本窗以 `repair take` + `/clear` 计数 + XP 前后值作等价证据。
2. **C-ANV-2 · cfg 无独立 boot dump 行**：批文 W1 要求“cfg 开关 dump 行”；产品未落该行。
   本窗以 `etim.cfg` 文件面（`B:metalAnvilRepair=true`）+ 行为面（repair 行全出）双证。
3. **C-ANV-3 · ancient fail2 未单独跑**：批文 W4 写“ancient 件同构一行”；工装 fail2 cell 只跑 mithril。
   同门同代码路径（`durability > 8.0`），本窗以 mithril 实证；ancient 面登记未覆盖。
4. **C-ANV-4 · 甲 ×200 / stage 阈值 / breakChance 未覆盖**：工具 ×1 已实证；甲面、0.5/0.8/1.0 阈值面、
   breakChance=0 均需长窗口或经济不可达，按任务书登记不判。
5. **C-ANV-5 · 日志噪声分类**：服务端 bot 退出 `IOException`（`ETIM_Harn04 lost connection`）；
   客户端 40 条 ERROR（26 fernflower + 4 Maven/签名 + 1 vanilla sandstone + 8 ore variant + 1 Netty 断连）。
   除 8 条 ore variant 归 B-ANV-2 外，其余为基线噪声。
6. **C-ANV-6 · 客户端/服务端共用 `run/obfuscated/logs/latest.log`**：客户端启动会轮转/截断服务端日志
   （本窗服务端判据已从 `logs/2026-10-24-7.log.gz` 恢复；两进程并发写同一文件还会互相覆盖尾部）。
   建议后续窗口服务端改用独立 workdir（如 `run/obfuscated-server`）或独立日志面。
7. **沿用 C-SK 挂账**：C-SK-2（vanilla smelting 7 行 + held 罐 2 行基线噪声）、C-SK-5（1.12 窗口点击须携带
   被点槽位物品）、C-SK-9（`[CraftingLog]` 按签名去重 + log4j 落盘延迟）。

---

## 四、判行锚点摘录

### 4.1 W1 boot（`build-logs/metal-anvil-verify-server.log`）

```
[18:21:08] [TestLog] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 128 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]
[18:21:09] [EquipLog] durability reassert: 122 gear rows ok [server]
[18:21:10] Done (1.029s)! For help, type "help" or "?"
```

### 4.2 W2–W5 砧判行（同一判据源）

```
[18:21:29] [CraftingLog] ETIM_Harn04 (66) repair take: tool=etim:scythe_copper repaired=1600 nuggets=2 kind=1 anvilWear=1600 [server]
[18:21:35] [CraftingLog] ETIM_Harn04 (66) repair take: tool=etim:scythe_copper repaired=800 nuggets=0 kind=2 anvilWear=0 [server]
[18:21:52] [CraftingLog] ETIM_Harn04 (66) repair fail: reason=needsHarderAnvil (material durability > iron 8.0) tool=etim:scythe_mithril [server]
[18:21:57] [CraftingLog] ETIM_Harn04 (66) repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper [server]
```

### 4.3 工装七块（`build-logs/anvil-verify.out`）

```
[AnvilLog] w2 consumable out={"name":"unknown","count":1,"metadata":0} nuggetsLeft=7 tools=1 xp=200->200 wearRows=[…] | PASS
[AnvilLog] w3 combo out={"name":"unknown","count":1,"metadata":0} toolsLeft=1 xp=200->200 wearRows=[…] | PASS
[AnvilLog] w3d denied out=null toolsLeft=2 xp=200->200 kind2Rows=0 | PASS
[AnvilLog] w4 fail2 out=null tools=1 nuggets=9 failRows=[…] | PASS
[AnvilLog] w5 fail1 out=null tools=1 nuggets=9 failRows=[…] | PASS
[AnvilLog] w6 ingot->nuggets out={"name":"iron_nugget","count":9,"metadata":0} got=9 want=9 | PASS
[AnvilLog] w6 nuggets->ingot out={"name":"iron_ingot","count":1,"metadata":0} got=1 want=1 | PASS
[AnvilLog] wear dat: …\etim_anvil_damage.dat exists=true | PASS
```

### 4.4 W7 dat（NBT 直读）

```
{"data":{"-9339137949684":{"type":"long","value":[0,6400]}}}
（窗口前 4800；本窗 W2 +1600；停服存盘与二次 boot 后均为 6400）
```

### 4.5 客户端 T6② 佐证

```
[18:32:29] [CraftingLog] Developer (104) repair fail: reason=insufficientSkill (quality over budget) tool=etim:scythe_copper [server]
[18:35:44] [CHAT] 已将截图保存为 2026-10-24_18.35.44.png
[18:36:28] [Client thread/INFO] [Minecraft]: Stopping!
```

### 4.6 收口帧标

```
[18:36:42] [Server thread/INFO] [MinecraftServer]: Stopping server
[18:36:42] [Server thread/INFO] [MinecraftServer]: Saving worlds
（RCON：node testharness/player/rcon-client.js 127.0.0.1 25575 etim27 "stop"；第二次 boot 18:38:06 同形）
```

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 客户端 | `close-client.ps1` 18:36:28 优雅退窗（pid 28048）；`Stopping!` 记录；Gradle `BUILD SUCCESSFUL in 8m 43s`；exit 0 |
| 服务端 | 18:36:42 `Stopping server → Saving worlds`（RCON stop，非 taskkill）；pid 27556 退出；端口 25575 = 0 |
| W7 复读窗 | 18:37:50 起服（pid 22012）→ 18:37:58 boot 完成 → dat 6400 → 18:38:06 RCON 停服；端口 0 |
| 产品面 | jar **564,544 B @ 18:15:32**｜SHA256 `990F7FAE…13C331`｜HEAD = origin = `250fb57`｜**0 rebuild**｜工作区干净 |
| cfg | `metalAnvilRepair=true` / `metalDebugLog=true` / `metalSystem=true` / `metalOreGen=true`；`mining/equip=true`、`mobEquip=false` = 默认值，未改 |
| 世界 | `testw2h` 照用未删档；台架 y=99/100 判台保留 |
| mods 面 | 客户端 init 同步的 `run/obfuscated/mods/etim-1.0.0.jar`（564,544 B，同 SHA）已移至 `testharness/mods-hold/etim-1.0.0_250fb57.jar`，服务端面恢复 classpath 单面 |
| 工装改动 | 本窗 **0 改动**（`anvil-run.js` 已在 250fb57 入库）；未触产品代码/git |

---

## 六、结论

- **W1 PASS**：`19 batch rows ok` 真计数行成立、fail-fast 未触发；`122 gear rows ok` 不回归；
  cfg 开关 `metalAnvilRepair=true`（文件面 + 行为面）。
- **W2 PASS**：1600 = 2×800、扣 2 珠、剩余 damage 0、XP 200→200、`anvilWear=1600` 全成立。
- **W3/W3d PASS**：合并 repaired=800 / nuggets=0 / anvilWear=0 / XP 平；净双件拒修 out 空、tools=2、无 kind=2 行。
- **W4/W5 PASS**：fail2（needsHarderAnvil）与 fail1（insufficientSkill）分行、件珠原封、fail2 不串扰。
- **W6 PASS 2/2**：锭→9 珠、9 珠→锭双向成立。
- **W7 PASS**：dat 4800→6400（+1600 = 工具 ×1），停服存盘 + 重启读回仍 6400；阈值/甲面/breakChance 按任务书登记不判。
- **W8 PASS（服务端面）**：所列负证全 0；smelting 7 + held 2 为基线噪声。
- **客户端 T6②**：GUI 冒烟 PASS；金字内容正确但位置双重偏移（B-ANV-1）；客户端另见 B1 ore blockstate
  截断导致的 4 个 ore variant 缺模型（B-ANV-2）。两项均为客户端/资产面，不阻塞本砧批 W1–W8 判决。
- **闭单判定：砧修链 W1–W8 全判据成立，本批可闭单。** A 级 0；B 级 2（B-ANV-1/B-ANV-2，建议另批修）；
  C 级 6 登记不阻塞。
