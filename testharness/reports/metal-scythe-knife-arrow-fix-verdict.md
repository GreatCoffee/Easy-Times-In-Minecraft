# scythe/knife + 箭合成面 · A-SK-1 修复复验回执（W1-R / W2-R / W5-R）

> **执行方**：会话七（补窗复验）
> **判据正本**：会话七补窗任务书（A-SK-1 修复复验）；判值底本 = `playground/audit/metal-scythe-knife-arrow-落码批文.md` §一
> **修复对象**：A-SK-1 —— `ETIMGear` 的 `knifeFlint` 字段从未赋值，`new ItemStack(knifeFlint)` 得到 `ItemStack(null)`，
> 结果槽解析为空 → 配方在役但永不可合成（commit `9a65ed4`）。同 commit 落 C-SK-3：配方计数改运行时 REGISTRY delta + fail-fast。
> **现役钉值**：jar **544,545 B** @ **2026-10-24 16:57:19**｜SHA256
> **5E1C52201A398A40C4287FBAF300B5444E41FA3DDB706677D2F5349C97252186**｜= 产品 commit **9a65ed4**｜
> HEAD = origin/master = **9a65ed4**｜窗内 **0 rebuild**。
> **判据源**：产品自身 `[TestLog]` / `[EquipLog]` / `[CraftingLog]` 判行（服务端权威）＋ 工装 `[SkLog]` 判行
> （数值来自服务端下发：窗口槽包、`/clear` 计数回执）＋ 服务端 `latest.log` 帧标。
> **口径**：通过 ✓、不通过 ✗（本窗无判点失败；符号计数含图例与规格行 2 处记号）；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档；只在台架 y=100 重建判台。
> **报告字节规格**：`14,161 B｜UTF-8 无 BOM｜0 U+FFFD｜✓ 45 / ✗ 2｜200 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 544,545 B | 544,545 B | ✓ |
| jar 时间 | 2026-10-24 16:57:19 | 2026-10-24 16:57:19（收口复核同值） | ✓ |
| SHA256 | `5E1C5220…252186` | `5E1C52201A398A40C4287FBAF300B5444E41FA3DDB706677D2F5349C97252186` | ✓ 逐位 |
| 产品 commit | `9a65ed4` | `git rev-parse HEAD` = `9a65ed4`；jar mtime 与该 commit 构建时刻一致 | ✓ |
| HEAD / origin | `9a65ed4` / `9a65ed4` | `9a65ed4` / `9a65ed4` | ✓ |
| 工作区 | 窗内禁触产品码与 git | `git status --porcelain` 空（`src/main` 与 testharness 均已在库） | ✓ |
| 窗内 rebuild | 禁止 | 起服前后 jar 字节/SHA/mtime 全同 → **0 次** | ✓ |
| 起服面 | `gradlew runObfServer` 等价面 | `start-server.ps1`（exec-dump 取 runObfServer 的 classpath；`classpath append … (mtime=10/24/2026 16:57:19)`）→ **mods 目录无 etim jar**，无双面 dup | ✓ |
| 启动方式 | 无窗 | `javaw.exe`（WMI 分离，pid 7048，无控制台窗口） | ✓ |
| 端口 | 起服前 0 | 25575 无 LISTEN（收口后亦 0） | ✓ |
| cfg | 与上窗同 | `miningDebugLog=true` / `equipDebugLog=true` / `mobEquipDebugLog=false` = ETIMConfig 默认值，未改 | ✓ |
| 世界 | `testw2h` 保留 | `level-name=testw2h`，未删档 | ✓ |
| 客户端 | 无 | 未起 obf 客户端（仅 mineflayer 假玩家 `ETIM_Harn04` + 服务端权威面） | — 不适用 |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W1-R** | boot 锚点：真计数行 / 耐久重断言 / knife_flint dump 逐位 | **PASS 3/3** | `17 batch rows ok (runtime REGISTRY delta; etim-domain total 126 incl legacy 94)`；`durability reassert: 122 gear rows ok`；`knife_flint 400/2.0/0.625/grade1/burn100`（与上窗逐位同） |
| **W2-R** | `knife_flint` 合成复验（唯一新增合成面）+ 3 对照 | **PASS 1/1（对照 3/3 + 拆解 1）** | `got=1`（`/clear etim:knife_flint` 计数 = 1，id 逐字匹配）；`COMPLETE Flint Knife ×1`；sinew→4 / scythe→1 / arrow→1 全 PASS |
| **W5-R** | 负证 | **PASS** | drifted 0｜IllegalStateException 0｜FATAL 0｜Crash 0｜DuplicateMods 0｜ETIM 配方冲突 0｜缺贴图/缺模型 0 |

**总记**：W1-R ✓、W2-R ✓、W5-R ✓。**A 级 0**（A-SK-1 关闭）、**B 级 0**（B-SK-1 已裁点，不在本窗测）、**C 级 2 新登记（C-SK-10/11）+ 既有挂账沿用**。

---

## 二、逐门核讫

### W1-R · boot 锚点（`build-logs/scythe-fix2-server.log`，boot 16:59:5x → `Done (1.256s)`）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 批次真计数行 | `17 batch rows ok` | `[16:59:57] [TestLog] gear recipes registered: 17 batch rows ok (runtime REGISTRY delta; etim-domain total 126 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]` | ✓ |
| fail-fast 语义 | `added != 17` → `IllegalStateException` | 未触发：boot 正常完成；全窗 `IllegalStateException` = 0 | ✓ |
| etim-domain total | 登记不判（随批次演化） | `126`（= 94 legacy + 17 本批 + 15 前批 B1/B2；见 C-SK-11） | — 登记 |
| 耐久重断言 | `122 gear rows ok` | `[16:59:58] [EquipLog] durability reassert: 122 gear rows ok [server]` | ✓ |
| `knife_flint` dump | 400 / 2.0 / 0.625 / grade 1 / burn 100 | `[16:59:57] [EquipLog] gear item=etim:knife_flint maxDamage=400 attackDamage=2.0 efficiency=0.625 grade=1 burn=100 armor=0.0` | ✓ 逐位 |
| scythe 六型 dump | §一 真值表 | `copper/silver 3200·4.0·1.75·2`、`ancient 12800·5.0·2.0·3`、`mithril 51200·6.0·2.5·4`、`adamantium 204800·7.0·3.0·5`、`rusted 3200·3.0·1.25·2`，burn 全 100 | ✓ 逐位 |
| dump 行数 | 116 gear + 12 material | `gear item=` 116 行；`material item=` 12 行（7 legacy + 5 arrow） | ✓ |
| drifted | 0 | `drifted from the judged value` = 0 | ✓ |
| boot 时长 | — | `Done (1.256s)! For help, type "help" or "?"` | ✓ |
| mixin | 0 | `Mixin apply failed` 0 / `MixinApplyError` 0 | ✓ |

**旧字面退役确认**：全窗 grep `111 rows` = 0 行；判据主锚点已换成运行时 REGISTRY delta（C-SK-3 关闭）。

### W2-R · `knife_flint` 合成复验（工作台 stage-3 计时器照走；`/clear` 计数判产物 id + 数量）

方法：假玩家开工作台，按 `"Xs","# "` 原位落料（1 = 燧石、2 = 腱绳 `s`、4 = 棍 `#`），点结果槽 arm →
计时器（period 25）→ 驱动自动入包；产物用 `/clear <id> -1 0`（count-only）核数。

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 落料位次 | `1:flint`、`2:sinew`、`4:stick` | `placed=["0:unknownx1","1:flintx1","2:unknownx1","3:-","4:stickx1","5:-","6:-","7:-","8:-","9:-"]`（结果槽 = 1 件，上窗此处恒空） | ✓ |
| 产物 id | `etim:knife_flint` | `/clear ETIM_Harn04 etim:knife_flint -1 0` → 计数 **1**（item id 逐字匹配才计数） | ✓ |
| 产物数量 | 1 | `got=1`（`wantCount=1`） | ✓ |
| 服务端链路 | result CHANGED → period SET → click → start → COMPLETE | `result CHANGED sig=etim:knife_flint#0×1` → `period SET difficulty=75.0 quality=AVERAGE period=25` → `result click btn=0` → `start crafting` → `[17:00:41] COMPLETE Flint Knife ×1 quality=AVERAGE xp=0 continue` | ✓ |
| 产物回收 | 结果槽 `result gone → reset` | `[17:00:41] result gone → reset` | ✓ |
| 对照 sinew | 皮革×1 → `sinew`×4 | `got=4`；`[17:00:17] COMPLETE Sinew ×4` | ✓ |
| 对照 scythe | 铜锭×2 + 棍×3 → `scythe_copper`×1 | `got=1`；`[17:00:25] COMPLETE Copper Scythe ×1` | ✓ |
| 对照 arrow | 铜粒+棍+羽 → `arrow_copper`×1 | `got=1`；`[17:00:33] COMPLETE Copper Arrow ×1` | ✓ |
| 附：拆解 | `arrow_copper`×1 → `nugget_copper`×1 | `got=1`；`[17:00:48] COMPLETE Copper Nugget ×1` | ✓ |
| 点击通道 | 无事务失败 | `wclick-fail` = 0 行（C-SK-5 口径照旧：只走 `bot.clickWindow`） | ✓ |

→ **A-SK-1 关闭**：修复后同一工装、同一形状、同一会话内 `knife_flint` 由 `got=0` 变为 `got=1`，且服务端 `[CraftingLog]` 五段链完整；
产物判值（400/2.0/0.625/grade1/burn100）已由 W1-R dump 行锚定，本面不重复判。

### W5-R · 负证（全窗 `latest.log` 377 行）

| 负证项 | 计数 | 判 |
|---|---|---|
| `drifted from the judged value` | 0 | ✓ |
| `IllegalStateException`（fail-fast 若抛即 boot 崩） | 0 | ✓ |
| `FATAL` | 0 | ✓ |
| `Crash` / crash report | 0 | ✓ |
| `DuplicateModsFoundException` | 0 | ✓ |
| ETIM 配方冲突（`Ignoring duplicate recipe` / `Duplicate recipe`） | 0 / 0 | ✓ |
| 缺贴图（`Missing texture` / `missing texture`） | 0 / 0 | ✓ |
| 缺模型（`missing model` / `Missing model` / `Unable to load model`） | 0 / 0 / 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| vanilla smelting 冲突（`Ignored smelting recipe with conflicting input`） | 7 行（oreRedstone/oreLapis/netherquartz/oreDiamond/oreEmerald/oreCoal/clay） | — 基线噪声（同 C-SK-7，两会话同 7 行） |
| held 罐缺 mod 警告（`Attempting connection with missing mods […] at CLIENT/SERVER`） | 2 行 | — 预期噪声（同 C-SK-6） |

---

## 三、冲突分级

### A 级（真值冲突）

**0 笔。** A-SK-1 已由 commit `9a65ed4`（`knifeFlint = register(...)` 补赋值）关闭：本窗 W2-R `got=1` + 服务端
`COMPLETE Flint Knife ×1` 双证成立，无残留现象（4 偏移 / 6 排列排除实验本窗无需重跑，形状与工装均未变）。

### B 级（需主会话裁口径）

**0 笔。** B-SK-1（农物破块硬度 0 → `damageItem` 守卫不成立）已按裁点「改判据 + 挂账」收口，本窗按任务书
**不测农物 decay 行**；0.5 档仍由 knife/羊毛（上窗 loss 40 = 50×0.8）实证。

### C 级（登记，不阻塞）

1. **C-SK-3 关闭**：`[TestLog] gear recipes registered: 17 batch rows ok (runtime REGISTRY delta; …)` 为运行时
   `CraftingManager.REGISTRY` 的 `etim` 命名空间差值；`added != 17` 直接抛 `IllegalStateException`（真 fail-fast）。
   旧硬编码 `111 rows` 字面全窗 0 命中。
2. **C-SK-10（新登记）· `knife_flint` 合成 difficulty = 75.0**（与 `arrow_copper` 同值）；批文 §三 未钉该值，
   本窗作观测值登记、不判。若后续要钉难度表，需另出判据。
3. **C-SK-11（新登记）· `etim-domain total 126` 为谱系累计**（94 legacy + 17 本批 + 15 B1/B2）。批文明确
   「total 数值登记不判」，后续批次继续增长；判行主锚点只用 `17 batch rows ok`。
4. **沿用挂账**：C-SK-1/2（批文 W3 档位笔误）、C-SK-4（`sinew` 无 `[EquipLog]` 锚）、C-SK-5（1.12 窗口点击
   须携带被点槽位物品）、C-SK-6（held 罐缺 mod 噪声）、C-SK-7（vanilla smelting 冲突 7 行基线）、
   C-SK-8（reach 门禁，靶须 ≤3 格）、C-SK-9（`[MiningLog]`/`[CraftingLog]` 按签名去重 + log4j 落盘延迟）。

---

## 四、判行锚点摘录

### 4.1 boot（`build-logs/scythe-fix2-server.log`）

```
[16:59:57] [TestLog] gear recipes registered: 17 batch rows ok (runtime REGISTRY delta; etim-domain total 126 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]
[16:59:57] [EquipLog] gear item=etim:knife_flint maxDamage=400 attackDamage=2.0 efficiency=0.625 grade=1 burn=100 armor=0.0
[16:59:57] [EquipLog] gear item=etim:scythe_ancient_metal maxDamage=12800 attackDamage=5.0 efficiency=2.0 grade=3 burn=100 armor=0.0
[16:59:57] [EquipLog] gear item=etim:scythe_adamantium maxDamage=204800 attackDamage=7.0 efficiency=3.0 grade=5 burn=100 armor=0.0
[16:59:58] [EquipLog] durability reassert: 122 gear rows ok [server]
[16:59:59] Done (1.256s)! For help, type "help" or "?"
```

### 4.2 W2-R（`build-logs/sk2-w2.out` + `[CraftingLog]`）

```
[SkLog] skw2-sinew        want=etim:sinew x4        got=4 | PASS
[SkLog] skw2-scythe-copper want=etim:scythe_copper x1 got=1 | PASS
[SkLog] skw2-arrow-copper  want=etim:arrow_copper x1  got=1 | PASS
[SkLog] skw2-knife-flint   want=etim:knife_flint x1   got=1 | PASS
[SkLog] skw2-dismantle-arrow-copper want=etim:nugget_copper x1 got=1 | PASS

[17:00:39] [CraftingLog] result CHANGED sig=etim:knife_flint#0×1 prev=none → recompute difficulty/period [server]
[17:00:39] [CraftingLog] period SET difficulty=75.0 quality=AVERAGE period=25 [server]
[17:00:40] [CraftingLog] result click btn=0 [server]
[17:00:40] [CraftingLog] start crafting difficulty=75.0 quality=AVERAGE period=25 [server]
[17:00:41] [CraftingLog] COMPLETE Flint Knife ×1 quality=AVERAGE xp=0 continue [server]
[17:00:41] [CraftingLog] result gone → reset [server]
```

### 4.3 收口帧标

```
[17:01:07] [Server thread/INFO] [MinecraftServer]: Stopping server
[17:01:07] [Server thread/INFO] [MinecraftServer]: Saving worlds
   （RCON：node testharness/player/rcon-client.js 127.0.0.1 25575 etim27 "stop"；不是 taskkill）
```

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[17:01:07] Stopping server → Saving worlds`（RCON stop，非 taskkill）；pid 7048 退出；端口 25575 **0** |
| 判据源快照 | `build-logs/scythe-fix2-server.log`（**54,990 B / 377 行**） |
| 工装输出 | `build-logs/sk2-w2.out`（5/5 PASS）、`build-logs/b3-skcraft.json`（5 cells `ok:true`） |
| 产品面 | jar **544,545 B @ 16:57:19**｜SHA256 `5E1C52…252186`｜HEAD = origin = `9a65ed4`｜**0 rebuild**｜工作区干净 |
| cfg | `miningDebugLog=true` / `equipDebugLog=true` / `mobEquipDebugLog=false` = 默认值，未改 |
| 世界 | `testw2h` 照用未删档；只在台架 y=100 重建 |
| 客户端 | 未起（假玩家 `ETIM_Harn04`；obf 客户端窗口 0 个） |
| 工装改动 | 本窗 **0 改动**（`b3-run.js` 的 `skcraft` phase 已在 `393a6fd` 入库） |

---

## 六、结论

- **W1-R PASS 3/3**：`17 batch rows ok` 真计数行成立且 fail-fast 未触发；`122 gear rows ok`；`knife_flint`
  400/2.0/0.625/grade1/burn100 与上窗逐位同；scythe 六型与 12 行 material dump 亦逐位不变（0 drifted）。
- **W2-R PASS 1/1**：`knife_flint` 合成 `got=1`（`/clear` 计数 + item id 逐字匹配）+ 服务端
  `COMPLETE Flint Knife ×1` 全链完整；同会话 3 个对照（sinew→4 / scythe→1 / arrow→1）与拆解→1 全 PASS，环境面无回退。
- **W5-R PASS**：drifted / IllegalStateException / FATAL / Crash / DuplicateMods / mixin / 缺贴图缺模型 /
  ETIM 配方冲突 全 0；7 行 smelting 冲突 + 2 行 held 罐警告 = 已知基线噪声。
- **闭单判定：本窗全判据成立（W1-R/W2-R/W5-R 三面 PASS），A-SK-1 修复验证通过、可闭单。**
  本窗 A 级 0、B 级 0（已裁点）、C 级新增 2 笔（C-SK-10/11 均为观测登记，不阻塞）。
