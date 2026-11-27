# scythe/knife + 箭合成面 · 验证窗判决回执（W1-W5）

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-scythe-knife-arrow-落码批文.md` §一 判值 + §三 W 面
> （终审回执 A-1 定谳：金属 knife = 死数据，flint knife 是唯一在役 knife 链；A-3 耐久因子 4/4/16/64/256/4）。
> **现役钉值**：jar **544,161 B** @ **2026-10-24 15:21:42**｜SHA256
> **FDE043FF302BF8923D028625DE3C469F25ABFAAE8CDA5ECE1E9B2302CEF49590**｜= 产品 commit **d9c25a1**｜
> HEAD = origin/master = **4ae92d9**｜窗内 **0 rebuild**。
> **判据源**：产品自身 `[EquipLog]` / `[MiningLog]` / `[CraftingLog]` 判行（服务端权威）＋ 工装 `[SkLog]`
> 判行（数值来自服务端下发：窗口槽包、`/clear` 计数回执、`/testfor` NBT 回执）＋ 服务端 `latest.log` 帧标。
> **口径**：通过 ✓、不通过 ✗；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档；新增判台只在 y=99/100 台架（x −52..−16 / z 4..44）重建。
> **报告字节规格**：`23,318 B｜UTF-8 无 BOM｜0 U+FFFD｜✓ 78 / ✗ 6｜309 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 544,161 B | 544,161 B | ✓ |
| jar 时间 | 2026-10-24 15:21:42 | 2026-10-24 15:21:42（收口复核同值） | ✓ |
| SHA256 | FDE043FF…F49590 | `FDE043FF302BF8923D028625DE3C469F25ABFAAE8CDA5ECE1E9B2302CEF49590` | ✓ 逐位 |
| 产品 commit | `d9c25a1` | jar 产自 `d9c25a1`（`build.gradle` classpath append mtime 15:21:42） | ✓ |
| HEAD / origin | `4ae92d9` / `4ae92d9` | `4ae92d9` / `4ae92d9` | ✓ |
| 窗内 rebuild | 禁止 | 起服前后 jar 字节/SHA/mtime 全同 → **0 次** | ✓ |
| 起服面 | `gradlew runObfServer` 等价面 | `start-server.ps1`（exec-dump 取 runObfServer 的 classpath；**jar 挂 classpath，mods 目录无 etim jar**）→ 无双面 dup | ✓ |
| 启动方式 | 无窗 | `javaw.exe`（WMI 分离，无控制台窗口） | ✓ |
| 端口 | 起服前 0 | 25565/25575 无 LISTEN（收口后亦 0） | ✓ |
| cfg | 按窗启用 | `miningDebugLog=true` / `equipDebugLog=true` / `mobEquipDebugLog=false` = **ETIMConfig 默认值**（ETIMConfig.java:748/751/754）→ 收口无需改回 | ✓ |
| 世界 | `testw2h` 保留 | `level-name=testw2h`，未删档 | ✓ |
| 客户端 | 无 | 未起 obf 客户端（仅 mineflayer 假玩家 `ETIM_Harn04` + 服务端权威面） | — 不适用（本窗无客户端面） |

**基线勘正（C-SK-9）**：`start-server.ps1` 的 `-WorkDir` 默认即 `run\obfuscated`（= runObfServer 的 run 目录），
本窗起服命令未改脚本、未触发 gradle 任务，故不可能 rebuild；`classpath append` 行明确打印 jar mtime 15:21:42。

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W1** | boot 锚点：配方行数 / 耐久重断言 / 12 行 dump 逐位 | **PASS 3/3** | `gear recipes registered: 111 rows`；`durability reassert: 122 gear rows ok`；scythe×6 + knife + arrow×5 全部逐位 = §一 |
| **W2** | 工作台合成（stage-3 计时器照走）5 格 | **FAIL 4/5** | sinew→4 ✓、copper scythe→1 ✓、copper arrow→1 ✓、拆解→1 nugget ✓；**knife_flint 无匹配配方（A-SK-1）** |
| **W3** | `[MiningLog] tool decay` 衰减面（破块 + 攻击） | **PASS（可达面 8/8）** | knife wool 40 / leaves 20 / pumpkin 60；scythe & knife 破石 = 门禁 deny 2/2；攻击 scythe 400、knife 50；**农物破块无 decay 行（B-SK-1）** |
| **W4** | 五箭（+rusted 对照）箭伤 | **PASS 6/6** | `EntityArrow.damage` NBT 逐位 = 2.0/2.0/2.5/3.0/3.5/1.5；负控 9.0d 全不匹配；六型各 1 次实射命中（HP 全量→下降） |
| **W5** | 负证 | **PASS** | drifted 0｜IllegalStateException 0｜FATAL 0｜Crash 0｜DuplicateMods 0｜mixin 0｜缺贴图/缺模型 0｜ETIM 配方冲突 0 |

**总记**：W1 ✓、W2 ✗（1/5 格不成立）、W3 ✓（含 1 项 B 级口径）、W4 ✓、W5 ✓。
**A 级 1（knife_flint 配方）、B 级 1（农物破块不伤 = 0.5 档不可达）、C 级 9。**

---

## 二、逐门核讫

### W1 · boot 锚点（`build-logs/scythe-boot.log`，boot 16:24:12 → Done 16:24:14）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 配方行数 | `111 rows` | `[16:24:12] [TestLog] gear recipes registered: 111 rows (94 legacy … +17: 5 scythe + 5 arrow + 5 dismantle + 1 sinew + 1 knife_flint)` | ✓ |
| 耐久重断言 | `122 gear rows ok` | `[16:24:12] [EquipLog] durability reassert: 122 gear rows ok`（110 + 6 scythe + 1 knife + 5 arrow） | ✓ |
| 耐久 fail-fast | 无 drifted | `drifted from the judged value` = 0 | ✓ |
| dump 行数 | 116 gear + 12 material | `[EquipLog] gear item=` 116；`material item=` 12（7 legacy + 5 arrow） | ✓ |
| boot 时长 | — | `Done (1.297s)` | ✓ |
| mixin | 0 | `Mixin apply failed` / `MixinApplyError` = 0 / 0 | ✓ |

**dump 逐位（12 行，§一 真值表）**：

| 物品 | maxDamage | attackDamage | efficiency | grade | burn | 判 |
|---|---|---|---|---|---|---|
| `scythe_copper` | 3200 | 4.0 | 1.75 | 2 | 100 | ✓ |
| `scythe_silver` | 3200 | 4.0 | 1.75 | 2 | 100 | ✓ |
| `scythe_ancient_metal` | 12800 | 5.0 | 2.0 | 3 | 100 | ✓ |
| `scythe_mithril` | 51200 | 6.0 | 2.5 | 4 | 100 | ✓ |
| `scythe_adamantium` | 204800 | 7.0 | 3.0 | 5 | 100 | ✓ |
| `scythe_rusted_iron` | 3200 | 3.0 | 1.25 | 2 | 100 | ✓ |
| `knife_flint` | 400 | 2.0 | 0.625 | 1 | 100 | ✓ |
| `arrow_copper/silver/mithril/adamantium/ancient_metal` | material 分支 | `maxStackSize=64`、`burn=-1`（= 不可作燃料，同 B3 rusted 先例） | — | — | — | ✓ |

> **C-SK-5**：`sinew` 不在 `[EquipLog]` dump 通道内（`ETIMItems.simple("sinew")` 不经 `ETIMGear.ALL`），
> 其 `stack 64 / burn 0` 面**无 boot 锚**；本窗只以「合成产物 `/clear etim:sinew` 计数 = 4」间接证明注册存在。

### W2 · 工作台合成（stage-3 计时器；每次 1 格，`/clear` 计数判产物 id+数量）

方法：假玩家开工作台，按形状用窗口点击落料（`bot.clickWindow`，mode 0 / 右键=落 1），
点结果槽 arm → 计时器（period 25 = 下限）→ 驱动自动入包；产物用 `/clear <id> -1 0`（count-only）核数。

| 格 | 形状（判据） | 投入 → 期望 | 实测 | 判 |
|---|---|---|---|---|
| sinew | `#`（皮革×1） | 皮革×1 → `sinew`×4 | `got=4`；`COMPLETE Sinew ×4 difficulty=100 period=25` | **PASS ✓** |
| scythe-copper | `"/X ", "/ X", "/  "`（X=锭 2、/=棍 3） | 铜锭×2 + 棍×3 → `scythe_copper`×1 | `got=1`；`COMPLETE Copper Scythe ×1 difficulty=125 period=25` | **PASS ✓** |
| arrow-copper | `"?", "/", "F"`（粒+棍+羽） | 铜粒+棍+羽 → `arrow_copper`×1 | `got=1`；`COMPLETE Copper Arrow ×1 difficulty=75 period=25` | **PASS ✓** |
| knife-flint | `"Xs", "# "`（燧石+sinew+棍） | 燧石+sinew+棍 → `knife_flint`×1 | `got=0`；**无 `period SET`/`COMPLETE` 行（结果槽始终空）** | **FAIL ✗** |
| 拆解 | shapeless（1 箭→1 粒） | `arrow_copper`×1 → `nugget_copper`×1 | `got=1`；`COMPLETE Copper Nugget ×1 difficulty=40 period=25` | **PASS ✓** |

**knife_flint 失败的排除实验（A-SK-1 证据链）**：

| 实验 | 内容 | 结果 |
|---|---|---|
| 形状本值 | class 常量池取字面量 | `Xs`(2) / `# `(2) / `X` / `#` / `s` 逐位 = 源码；jar 与 HEAD 源码一致 | 形状无歧义 |
| 4 偏移 | 2×2 全部偏移 (0,0)(1,0)(0,1)(1,1)，燧石/丝/棍按 `Xs`+`# ` 位次 | 4/4 结果槽为空 | 非偏移问题 |
| 6 排列 | 三件在 2×2 的 6 种位次全试 | 6/6 结果槽为空 | 非位次问题 |
| 硬件通道自证 | 同一路径同会话内合成：vanilla 工作台 ✓、copper dagger ✓、copper hatchet ✓、rusty chain helmet ✓、copper scythe ✓、copper arrow ✓、copper pickaxe（3×3，3 锭+2 棍 @1,2,3/5,8）✓ | 7/7 PASS | **工装/点击通道无嫌疑** |
| 配方注册自证 | `[TestLog] … 111 rows` 为**硬编码字符串**（非计数），不校验注册结果 | 无法据此证伪 | 见 C-SK-4 |

→ 结论：`knife_flint` 的 shaped 配方在运行期**无匹配**（结果槽永空），其余 16 行新配方全部可合成。
最可疑点 = 该配方唯一的 ETIM 物品键 `'s' → ETIMItems.sinew`（同批其它键 `X=锭/粒`、`/=棍`、`F=羽` 均实测可匹配）。

### W3 · 衰减面（`[MiningLog] tool decay`，miningDebugLog=true，生存 + 饱食 20/20）

| 格 | 判据（§一 / 批文 §三） | 实测行 | 判 |
|---|---|---|---|
| scythe 破成熟小麦（age 7） | 0.5 档 | **无 decay 行**（`broke=true`，`[16:25:4x]` 段无该签名） | ✗→**B-SK-1** |
| scythe 破高草 | 0.5 档 | **无 decay 行**（仅 `mine speed … str=7.0`） | ✗→**B-SK-1** |
| scythe 破石头 | 门禁 deny 面不产生 decay 行 | `mine deny grade=2 required=2 item=etim:scythe_copper block=stone`；`broke=false`；decay 行 0 | **PASS ✓** |
| knife 破羊毛（CLOTH） | 0.5 档 | `tool decay face=breaking item=etim:knife_flint block=wool loss=40`（= 0.8×50） | **PASS ✓** |
| knife 破高草（VINE） | 0.5 档 | 无 decay 行（同 vanilla 硬度 0 门；仅 `mine speed str=2.5`） | **PASS（noro 口径）** |
| knife 破树叶（LEAVES） | 批文写 0.5 / §一 表列 cloth/plants/vine → 实为 1.0 档 | `loss=20`（= 0.2×100） | **PASS ✓（合 §一；见 C-SK-3）** |
| knife 破南瓜（GOURD） | else 1.0 档 | `loss=60`（= 0.6×100） | **PASS ✓** |
| knife 破石头 | 批文写「可破坏面 1.0 档」；实际 grade 1 < required 2 → deny | `mine deny grade=1 required=2 item=etim:knife_flint block=stone`；`broke=false` | **PASS ✓（见 C-SK-3）** |
| scythe 攻击（假人/猪 1000 HP） | 4.0 档 | `tool decay face=attacking item=etim:scythe_copper loss=400`；HP 1000→990 | **PASS ✓** |
| knife 攻击 | 0.5 档（承 sword 链） | `tool decay face=attacking item=etim:knife_flint loss=50`；HP 1000→994 | **PASS ✓** |

**B-SK-1 依据（结构，非偶发）**：1.12 `ItemTool.onBlockDestroyed` / `ItemSword.onBlockDestroyed` 的
`damageItem` 调用整体包在 `if (state.getBlockHardness(world, pos) != 0.0F)` 内；小麦/高草的
**vanilla** 硬度 = 0（ETIM 表把 tallgrass 记 0.02 只影响 str，不影响该守卫），故本批 @Redirect 根本不被调用
→ 农物破块**永不磨损**，`0.5 档` 在该面不可达。knife 的 0.5 档已由羊毛（loss 40 = 50×0.8）实证。

### W4 · 箭伤（五箭 + rusted 对照）

判值 = `ETIMItemArrow.createArrow` 写入的 `EntityArrow.damage`（double）。判据通道：
`/testfor @e[type=arrow] {damage:<d>d}`（`EntityArrow.writeEntityToNBT` 写入 `damage`，`NBTUtil.areNBTEquals` 逐位比较
→ `NBTTagDouble.equals`），另加 **实射命中**（1000 HP no-AI 猪，`/testfor … {Health:<h>.0f}` 精确读血）。

| 箭 | 判值 | NBT 探针 | 负控（9.0d） | 实射命中（HP 1000→） | 判 |
|---|---|---|---|---|---|
| `arrow_copper` | 2.0 | `{damage:2.0d}` Found ✓ | 不匹配 ✓ | 986 | **PASS ✓** |
| `arrow_silver` | 2.0 | `{damage:2.0d}` ✓ | ✓ | 986 | **PASS ✓** |
| `arrow_ancient_metal` | 2.5 | `{damage:2.5d}` ✓ | ✓ | 984 | **PASS ✓** |
| `arrow_mithril` | 3.0 | `{damage:3.0d}` ✓ | ✓ | 982 | **PASS ✓** |
| `arrow_adamantium` | 3.5 | `{damage:3.5d}` ✓ | ✓ | 970 | **PASS ✓** |
| `arrow_rusted_iron`（对照） | 1.5 | `{damage:1.5d}` ✓ | ✓ | 988 | **PASS ✓** |

> HP 面口径：落血 = `ceil(√(vx²+vy²+vz²) × damage) (+ 暴击随机)`，**不是**判值本身（判值是 `damage` 字段）；
> 故 HP 落点作「实射命中 + 金属序」证据（1.5<2.0=2.0<2.5<3.0<3.5 单调），判值以 NBT 逐位为准。
> 六型箭均 `arrow=yes`（墙射后箭实体在，`damage` 保持），无 `Couldn't find`/无箭实体异常。

### W5 · 负证（全窗 `latest.log` 1,328 行）

| 负证项 | 计数 | 判 |
|---|---|---|
| `drifted from the judged value` | 0 | ✓ |
| `IllegalStateException` | 0 | ✓ |
| `FATAL` / `Crash report` | 0 / 0 | ✓ |
| `DuplicateModsFoundException` | 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| ETIM 配方冲突（shaped/shapeless 重名、`Ignoring duplicate recipe`） | 0 | ✓ |
| 缺贴图/缺模型（log 面 `Missing texture` / `missing model` / `Unable to load model`） | 0 / 0 / 0 | ✓ |
| 缺 mod 警告 | 2 行（`Attempting connection with missing mods […] at CLIENT/SERVER`） | 预期噪声（held 客户端罐，见 C-SK-6） |

**基线对照**：`Ignored smelting recipe with conflicting input` 7 行（oreRedstone/oreLapis/netherquartz/oreDiamond/
oreEmerald/oreCoal/clay）在**上一会话快照**（`build-logs/scythe-stop1-latest.log`）同样 7 行 → vanilla Forge 基线噪声，
非本批配方冲突（C-SK-7）。

---

## 三、冲突分级

### A 级（真值冲突 — 必须修）

**A-SK-1 · `knife_flint` 的 shaped 配方运行期无匹配（W2 唯一 FAIL）**
- 复现：工作台内 `1:minecraft:flint`、`2:etim:sinew`、`4:minecraft:stick`（= 字面量 `"Xs"`+`"# "` 原位），结果槽恒空；
  4 偏移 × 6 排列共 10 组位次全空；同会话内 7 个对照配方（vanilla 工作台、dagger、hatchet、chain helmet、scythe、arrow、pickaxe）
  全部 PASS → 非工装、非点击、非时序。
- 影响：批文 §三 W2 明列「knife_flint 合成 1 次成功」，flint knife 又是**唯一在役 knife 链**（A-1 定谳），故该面当前不可得。
- 建议排查顺序（主会话）：
  1. 运行期打印 `ForgeRegistries.RECIPES.getValue(new ResourceLocation("etim","knife_flint"))` 是否为 null；
  2. 若存在，检查其 `Ingredient` 里 `'s'` 键解析出的 `matchingStacks` 是否为空（`ETIMItems.sinew` 绑定时机）；
  3. 把 `[TestLog] gear recipes registered: 111 rows` 改成**真计数**（按 `etim` 命名空间遍历 recipe registry），使同类静默丢行可判（见 C-SK-4）。

### B 级（需主会话裁口径）

**B-SK-1 · 农物破块永不磨损 → 批文 W3「scythe 破成熟小麦 = 0.5 档」不可达**
- 实测：scythe 破成熟小麦/高草 `broke=true` 且 **0 条 decay 行**（连 `loss=0` 行也没有）；根因 = vanilla
  `onBlockDestroyed` 的 `damageItem` 调用被 `blockHardness != 0` 守卫整体包住，而小麦/高草 vanilla 硬度 = 0
  （ETIM 表 tallgrass 0.02 只喂 str 计算）。
- 三种收口方式（择一）：
  1. **改判据**：承认「农物 = 硬度 0 = 不磨损」，把 W3 该行改为「无 decay 行（noro）」，0.5 档由 knife/羊毛面实证；
  2. **改产品**：给 `BlockCrops`/`BlockTallGrass` 落 R196 硬度（使守卫成立），使 0.5 档真正生效；
  3. **改工装面**：改用 `ETIMMining.getToolDecayFromBreakingBlock` 的直接调用面（需产品开发口，非本窗可做）。

### C 级（登记，不阻塞）

1. **C-SK-1 · 批文 W3 写「knife 破 leaves/cloth = 0.5 档」，§一 表只列 cloth/plants/vine**
   实测 leaves = 1.0 档（loss 20 = 0.2×100）→ 与 §一 一致；批文该句为笔误，建议改为「cloth/plants/vine 0.5，leaves 1.0」。
2. **C-SK-2 · 批文 W3 写「knife 破石头（可破坏面）= 1.0 档」**
   实测 stone 被 grade 门拦（`grade=1 required=2`）→ 不破、无 decay 行。§一 判值表无「石头可破」依据；
   1.0 档改由南瓜（loss 60 = 0.6×100）实证。
3. **C-SK-3 · `[TestLog] gear recipes registered: 111 rows` 是硬编码字符串**
   不读实际注册数量，配方静默丢行（如 A-SK-1）在该通道不可见。建议改真计数并在启动时 fail-fast。
4. **C-SK-4 · `sinew` 无 `[EquipLog]` 锚行**（`ETIMItems.simple` 通道，不进 `ETIMGear.ALL`）→ `stack 64 / burn 0` 无 boot 判据面。
5. **C-SK-5 · 1.12 窗口点击协议坑（工装知识）**
   原始 `window_click` 若不携带「被点槽位当前物品」，服务端 `processClickWindow` 的事务校验会失败 → 整窗重发 +
   `setCanCraft(false)` → **紧接着的下一击被静默丢弃**（本窗前半程「隔次失败」的根因）。
   正解 = 走 mineflayer `bot.clickWindow`（携带 `window.slots[slot]` 并等事务确认），已落 `wclick()`。
6. **C-SK-6 · held 客户端罐的 2 行缺 mod 警告**（craftingtweaks/inventorysorter/jei/theoneprobe 等 at CLIENT/SERVER）
   = runObfServer 面的预期噪声，非负证项。
7. **C-SK-7 · `Ignored smelting recipe with conflicting input` ×7 = vanilla Forge 基线**（两会话同 7 行，见 W5 对照）。
8. **C-SK-8 · reach 门禁口径**：假人距离 4.7 格时攻击被拒（chat 回 `etim.reach.deny_attack`，无 decay 行）；
   本窗最终把靶心压到 2 格（knife/scythe 均命中）。后续攻击面判据须把靶置于 ≤3 格。
9. **C-SK-9 · 通道时序**：`[MiningLog]`/`[CraftingLog]` 行**按签名去重**（`LAST_DECAY_SIGS` / `LAST_SPEED_SIGS` /
   `LAST_DENY_SIGS`），同会话重复同一格不再落行；log4j 落盘亦有秒级延迟。判据必须按「全窗存在性 + 轮询」读，
   不能只读单次行号切片（本窗 `waitRows()` 已落）。

---

## 四、判行锚点摘录

### 4.1 boot（`build-logs/scythe-boot.log`，266 行 / 40,235 B）

```
[16:24:12] [TestLog] gear recipes registered: 111 rows (94 legacy: 90 ingot-based + 4 rusted chain-armor; +17: 5 scythe + 5 arrow + 5 dismantle + 1 sinew + 1 knife_flint) [server]
[16:24:12] [EquipLog] gear item=etim:scythe_copper maxDamage=3200 attackDamage=4.0 efficiency=1.75 grade=2 burn=100 armor=0.0
[16:24:12] [EquipLog] gear item=etim:scythe_rusted_iron maxDamage=3200 attackDamage=3.0 efficiency=1.25 grade=2 burn=100 armor=0.0
[16:24:12] [EquipLog] gear item=etim:scythe_adamantium maxDamage=204800 attackDamage=7.0 efficiency=3.0 grade=5 burn=100 armor=0.0
[16:24:12] [EquipLog] gear item=etim:knife_flint maxDamage=400 attackDamage=2.0 efficiency=0.625 grade=1 burn=100 armor=0.0
[16:24:12] [EquipLog] durability reassert: 122 gear rows ok [server]
[16:24:14] Done (1.297s)! For help, type "help" or "?"
```

### 4.2 W2（`build-logs/sk-w2.out` + `[CraftingLog]`）

```
[SkLog] skw2-sinew            want=etim:sinew x4            got=4 | PASS
[SkLog] skw2-scythe-copper    want=etim:scythe_copper x1    got=1 | PASS
[SkLog] skw2-arrow-copper     want=etim:arrow_copper x1     got=1 | PASS
[SkLog] skw2-knife-flint      want=etim:knife_flint x1      got=0 | FAIL
[SkLog] skw2-dismantle-arrow-copper want=etim:nugget_copper x1 got=1 | PASS
[16:24:28] [CraftingLog] COMPLETE Sinew ×4 quality=AVERAGE xp=0 continue
[16:24:36] [CraftingLog] COMPLETE Copper Scythe ×1 quality=AVERAGE xp=0 continue
[16:24:45] [CraftingLog] COMPLETE Copper Arrow ×1 quality=AVERAGE xp=0 continue
[16:25:17] [CraftingLog] COMPLETE Copper Nugget ×1 quality=AVERAGE xp=0 continue
   (knife-flint 段：无 period SET / 无 COMPLETE)
```

### 4.3 W3（`build-logs/scythe-server-latest.log`，12 条 `[MiningLog]`）

```
[16:25:40] [MiningLog] mine speed item=etim:scythe_copper block=tallgrass str=7.0 [server]
[16:25:49] [MiningLog] mine deny grade=2 required=2 item=etim:scythe_copper block=stone [server]
[16:26:16] [MiningLog] mine speed item=etim:knife_flint block=wool str=2.5 [server]
[16:26:26] [MiningLog] tool decay face=breaking item=etim:knife_flint block=wool loss=40 [server]
[16:26:38] [MiningLog] mine speed item=etim:knife_flint block=leaves str=2.5 [server]
[16:26:42] [MiningLog] tool decay face=breaking item=etim:knife_flint block=leaves loss=20 [server]
[16:26:53] [MiningLog] tool decay face=breaking item=etim:knife_flint block=pumpkin loss=60 [server]
[16:26:57] [MiningLog] mine deny grade=1 required=2 item=etim:knife_flint block=stone [server]
[16:27:25] [MiningLog] tool decay face=attacking item=etim:scythe_copper loss=400 [server]
[16:27:31] [MiningLog] tool decay face=attacking item=etim:knife_flint loss=50 [server]
```

### 4.4 W4（`build-logs/sk-w4.out`）

```
[SkLog] skw4-arrow_copper        damage=2   nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=986 hpDrop=14 | PASS
[SkLog] skw4-arrow_silver        damage=2   nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=986 hpDrop=14 | PASS
[SkLog] skw4-arrow_ancient_metal damage=2.5 nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=984 hpDrop=16 | PASS
[SkLog] skw4-arrow_mithril       damage=3   nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=982 hpDrop=18 | PASS
[SkLog] skw4-arrow_adamantium    damage=3.5 nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=970 hpDrop=30 | PASS
[SkLog] skw4-arrow_rusted_iron   damage=1.5 nbtProbe=PASS negProbe=PASS arrow=yes fullHP=true hp=988 hpDrop=12 | PASS
```

### 4.5 收口帧标

```
[16:40:50] [Server thread/INFO] [MinecraftServer]: Saving worlds
[16:40:50] [Server Shutdown Thread/INFO] [MinecraftServer]: Stopping server
   （RCON：node testharness/player/rcon-client.js 127.0.0.1 25575 etim27 "stop"；禁 taskkill）
```

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[16:40:50] Saving worlds → Stopping server`（RCON stop，非 taskkill）；keeper `exited after 1005s`；端口 25565/25575 **0** |
| 判据源快照 | `build-logs/scythe-server-latest.log`（**181,593 B / 1,328 行**）＋ `build-logs/scythe-boot.log`（**40,235 B / 266 行**） |
| 中间快照 | `build-logs/scythe-stop1-latest.log`（464,073 B，第一段会话；vanilla 冲突基线对照用） |
| 工装输出 | `build-logs/sk-w2.out`、`sk-w3.out`、`sk-w4.out`、`sk-rec.out`、`sk-pr.out`、`sk-dbg*.out`、`b3-sk*.json` |
| 产品面 | jar **544,161 B @ 15:21:42**｜SHA256 `FDE043FF…F49590`｜HEAD = origin = `4ae92d9`｜`src/main` 干净 |
| 窗内 rebuild | **0 次**（起服只走 classpath append，未触 gradle 任务） |
| cfg | `miningDebugLog=true` / `equipDebugLog=true` / `mobEquipDebugLog=false` = **默认值**，未改 |
| 世界 | `testw2h` 照用未删档；只在台架 y=99/100 重建 |
| 客户端 | 未起（假玩家 `ETIM_Harn04`；obf 客户端窗口 0 个） |
| 工装改动 | `testharness/player/b3-run.js`（**未提交**：`ETIM_LOG` 覆盖 + SK 面 `skcraft/skdecay/skarrow` 等 phase） |

---

## 六、结论

- **W1 PASS**：111 行配方 + 122 行耐久重断言 + 12 行 dump 全部逐位等于 §一（含 knife 400/2.0/0.625/grade1、scythe 六型耐久/伤害/效率/品质）。
- **W2 FAIL（4/5）**：sinew→4、copper scythe→1、copper arrow→1、拆解→1 全 PASS；**knife_flint 配方运行期无匹配（A-SK-1）**。
- **W3 PASS（可达面 8/8）**：knife 0.5 档（羊毛 40）与 1.0 档（树叶 20 / 南瓜 60）、两把工具的破石 deny 面、攻击 400/50 全部成立；
  **农物破块无 decay 行 = 结构性的（B-SK-1，需裁口径）**。
- **W4 PASS 6/6**：`EntityArrow.damage` 逐位 2.0/2.0/2.5/3.0/3.5/1.5，负控全不匹配，六型各 1 次实射命中。
- **W5 PASS**：drifted / IllegalStateException / FATAL / Crash / DuplicateMods / mixin / 缺贴图缺模型 / ETIM 配方冲突 全 0；
  7 行 smelting 冲突 = vanilla 基线（两会话一致），held 罐缺 mod 警告 2 行 = 预期噪声。
- **闭单判定：本批不满足闭单（W2 knife_flint 不成立）**；其余 W 面成立。A 级 1、B 级 1、C 级 9。
