# 阶段四 链件 SetCount 判据口径专批（A 面产品通道 + B 面受控探针）· 判决回执

> **执行方**：会话七（验证窗执行）
> **判据正本**：本窗任务书（A 面 w4c / B 面 w4probe 六门）＋ loot-chain-setcount 批次工装
> `aaaf0a4`（终审 B-1 勘正：单栈 count=5 在 27 槽空箱结构性不可达）。
> **现役钉值**：jar **530,192 B** @ **2026-10-24 13:39:10**｜SHA256
> **425B25E5F50A6CAC685375FF7213EE591031AF515F95DBB0FE287A1FE101DB3E**｜
> 产品 commit = **f2d2cd2**（jar 产自该 commit，窗内 **0 rebuild**）｜
> HEAD = origin/master = **aaaf0a4**（本批工装 commit：只动 `testharness/player/b3-run.js` +
> `testharness/server/loot_tables/etimtest/chains.json`，产品面零改动）。
> **判据源**：`[LootLog]` 判行（工装 stdout 通道，落盘 `build-logs/b3lc-w4c.out` /
> `build-logs/b3lc-w4p.out`；数值来自服务端下发的箱子窗口槽包，服务端权威）＋
> 服务端 `latest.log` 帧标（chat begin/end、vanilla 告警、停机）。
> **口径**：通过 ✓、不通过 ✗；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档（只在 y=100 台架重建判箱）。
> **报告字节规格**：`12,955 B｜UTF-8 无 BOM｜0 U+FFFD｜通过 28 / 不通过 2｜220 行`

---

## 零、基线 & runbook 核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 530,192 B | 530,192 B | ✓ |
| jar 时间 | 2026-10-24 13:39:10 | 2026-10-24 13:39:10（收口复核同值） | ✓ |
| SHA256 | 425B25E5…FE101DB3E | `425B25E5F50A6CAC685375FF7213EE591031AF515F95DBB0FE287A1FE101DB3E` | ✓ 逐位 |
| 产品 commit | `f2d2cd2` | jar 产自 `f2d2cd2`；`aaaf0a4` 文件范围仅 testharness 两项 | ✓ |
| HEAD / origin | `aaaf0a4` / `aaaf0a4` | `aaaf0a4` / `aaaf0a4` | ✓ |
| `src/main` 未提交 | 无 | `git status --porcelain -- src/main` = 空（全仓亦空） | ✓ |
| 窗内 rebuild | 禁止 | 起服前后 jar 字节/SHA/mtime 全同 → **0 次** | ✓ |
| 端口 | 起服前 0 | 25565 / 25575 无 LISTEN（停机后亦 0） | ✓ |
| cfg | 不改 | `mobEquipDebugLog=true` / `miningDebugLog=true` / `equipDebugLog=true`；`etim.cfg` mtime 仍 12:33:41 | ✓ |
| 世界 | `testw2h` 保留 | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` | ✓ |

### runbook 步骤 1（探针表落位）

| 项 | 值 | 判 |
|---|---|---|
| 源 | `testharness/server/loot_tables/etimtest/chains.json`（713 B，SHA256 `CAE80DE1…C531B5C`） | ✓ |
| 落位（任务书写法） | `run/testw2h/data/loot_tables/etimtest/chains.json` | ✗ 该目录不存在（见 C-LC-3） |
| 落位（实际生效） | `run/obfuscated-server/testw2h/data/loot_tables/etimtest/chains.json`（1.12 `WorldServer` 取「服务端工作目录 + level-name」） | ✓ |
| 拷贝一致性 | 源/目标均 713 B、SHA256 逐位相同 | ✓ |
| 加载实证 | 100 开全非零（`zero=0`）、`Couldn't find resource table etimtest:chains` = **0**、`Tried to over-fill` = **0**（B 面） | ✓ |
| 落位时序 | 拷贝先于起服（14:36 前）→ 先于首次开箱；本轮未改表，无需 `/reload` | ✓ |

boot 锚（`build-logs/b3lc-boot.log` 首 288 行）：

| 判据 | 实测 | 判 |
|---|---|---|
| boot 时长 | `[14:37:52] Done (1.271s)!` | ✓ |
| mixin | `Mixin apply failed` / `MixinApplyError` = **0 / 0** | ✓ |
| `[EquipLog]` 行数 | `gear item=` **109** + `material item=` **7** + `durability reassert` **1** = **117** | ✓ |
| 耐久重断言 | `[14:37:51] [EquipLog] durability reassert: 110 gear rows ok` | ✓ |
| FATAL / Crash | **0 / 0** | ✓ |
| 启动方式 | `javaw.exe`（`start-server.ps1` 默认，WMI 分离、无控制台窗口） | ✓ |

**判据源段界**：boot 戳 `20261024_143742` → `14:37:52 Done`；A 面 `14:38:01 b3w4c-begin → 14:43:05 end`；
B 面 `14:43:11 b3w4p-begin → 14:44:15 end`；收口 `14:44:38 Saving worlds → Stopping server`。

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **A 面** | 产品注入通道 `minecraft:chests/abandoned_mineshaft` @500 开（累积判据） | **PASS 3/3** | `chainStacks=79 ≥20`、`chainItems=102 ≥25`；`c1=62 / c2=11` 各 ≥1；`over5=0`、`zeroRows=0` |
| **B 面** | 受控探针表 `etimtest:chains` @100 开（rolls=1，单 entry `set_count(1,5)`，按单箱跨槽总和判） | **PASS 3/3** | `outOfRange=0`（100/100 总和落 [1,5]）；`hist 1..5 = 18/19/18/24/21` 各 ≥1；`zero=0`、`over5=0` |
| **负证** | 漂移 / 异常 / 缺表 | **PASS** | `drifted from the judged value` 0、`IllegalStateException` 0、mixin 0、FATAL 0、Crash 0、`Couldn't find resource table etimtest:chains` 0 |

**总记**：六门 **6/6 PASS**；A 级 0、B 级 0、C 级 4（均判据口径/工装可达性，不阻塞）。
**SetCount(1,5) 判值成立；「5」面由 B 面守恒总和（21 次）直接实证。**

---

## 二、六门逐门核讫

### A 面 · `w4c`（产品通道，mineshaft 500 开，`fail=0`）

| 门 | 判据 | 实测 | 判 |
|---|---|---|---|
| **w4c-a1** | 链件栈数 ≥20 **且** 链节总数 ≥25 | `chainStacks=79`、`chainItems=102` | **PASS ✓** |
| **w4c-a2** | `c1≥1` 且 `c2≥1`（`c3/c4` 仅记录，`c5` 不设门） | `c1=62`、`c2=11`（`c3=6`、`c4=0`、`c5=0`） | **PASS ✓** |
| **w4c-a3** | `over5=0` 且 `zeroRows=0` | `over5=0`、`zeroRows=0` | **PASS ✓** |

A 面栈计数直方图（`countSamples` 中 `etim:chain_rusted_iron`，n=79 栈 / 102 节）：
`c1=62｜c2=11｜c3=6｜c4=0｜c5=0`。

**补充交叉判（非设门项）**：同一 500 开的**单箱跨槽总和**（`chainSums`，shuffleItems 守恒总量）
直方图 `0→466（未掷中该行）｜1→7｜2→6｜3→8｜4→6｜5→7`，**最大恰为 5、无一例 >5**；
34 个非零箱共 102 节，与 `chainItems` 逐位对账一致（102 = 102）。
即：产品通道每次掷出的链件总量恒落 [1,5]，落箱后被 `shuffleItems` 拆成 1–3 栈，
故单栈观测不到 4/5 —— **与工装注释的机制定案同向**，非 `SetCount` 缺陷。

> 采样完整性：`countSamples` 本轮 150 条 < 工装 200 上限 → **无截断**，A 面计数为全量。

### B 面 · `w4probe`（受控探针，100 开，`fail=0`）

| 门 | 判据 | 实测 | 判 |
|---|---|---|---|
| **w4p-b1** | 单箱跨槽总和 `outOfRange=0`（全落 [1,5]） | 100/100 落位，`min=1`、`max=5`、总和 311 | **PASS ✓** |
| **w4p-b2** | 直方图 1..5 各 ≥1 | `1:18｜2:19｜3:18｜4:24｜5:21` | **PASS ✓** |
| **w4p-b3** | `zero=0` 且 `over5=0` | `zero=0`、`over5=0` | **PASS ✓** |

B 面直方图（按单箱守恒总和，n=100）：

```
value  1    2    3    4    5
count  18   19   18   24   21      (all in [1,5], zero=0, over5=0)
```

`count=5` 命中 **21/100**（期望 20/100，均匀 1..5）→ 判值 5 可达且分布正常。
探针表加载面：`Couldn't find resource table` = 0；`Tried to over-fill` = 0。

---

## 三、冲突分级

### A 级（真值冲突 — 必须修）

**无。**

### B 级（需主会话裁口径）

**无。** 本批口径（A 面累积门 + B 面守恒总和）与实测完全自洽。

### C 级（登记，不阻塞）

1. **C-LC-1 · A 面 3 次 vanilla `Tried to over-fill a container`**
   `[14:41:48] / [14:42:04] / [14:42:26]`，均在 w4c 段内（B 面 0 次）。
   成因 = 1.12 `LootTable.fillInventory`（`LootTable.java:55-78`）在空槽预算耗尽后提前 return，
   该次开箱多出的栈被丢弃。属 **vanilla 行为**，非本批产品/工装缺陷；影响面 = 500 开中的 3 开计数
   偏小，A 面为累积门（79 栈 vs 门 20）余量充足，判定不受影响。
   建议：后续若把 A 面改成精确对账，先按 `Tried to over-fill` 剔除该开。
2. **C-LC-2 · `javaw.exe` 无控制台启动的 console-handler `IOException`（2 行）**
   `[14:37:48] Server console handler/ERROR: Exception handling console input` +
   `java.io.IOException`（`FileInputStream.readBytes(Native Method)`）。
   成因 = WMI 分离启动后 stdin 不可读，**非崩溃**（服务器随后 `Done (1.271s)`）。
   与本批判据无关，登记为启动面噪声。
3. **C-LC-3 · runbook 路径写法与 1.12 世界目录实际路径不一致**
   任务书写 `run/testw2h/data/loot_tables/...`；实际 1.12 `WorldServer` 取「服务端工作目录 + level-name」
   = `run/obfuscated-server/testw2h/data/loot_tables/...`（`run/testw2h` 不存在）。
   本窗按实际路径落位并已由 100/100 非零 + 零缺表告警实证加载。
   建议下轮 runbook 直接写 `<WorkDir>/<level-name>/data/loot_tables/...`（工装注释已按此写法）。
4. **C-LC-4 · B 面 `countSamples` 触 200 上限（不影响判定）**
   B 面单箱 5 抽会被 `shuffleItems` 拆成多栈，100 开共 >200 栈 → `countSamples` 截断为 200 条
   （其总和 259 ≠ 守恒总和 311）。
   **B 面三门全部取 `chainSums`（每开跨槽总和，无上限）**，故判定不受影响；仅提示后续若要用
   单栈分布，需先抬上限或改流式统计。

---

## 四、判行锚点摘录

### A 面（`build-logs/b3lc-w4c.out`）

```
[b3] w4c mineshaft-b opens=500 fail=0 chainN=79 hist={"1":62,"2":11,"3":6} rusted=["etim:pickaxe_rusted_iron","etim:chain_rusted_iron","etim:shovel_rusted_iron","etim:mattock_rusted_iron","etim:axe_rusted_iron","etim:hatchet_rusted_iron","etim:war_hammer_rusted_iron"]
[b3] [LootLog] w4c-a1 chainStacks=79 chainItems=102 gate stacks>=20 items>=25 | PASS
[b3] [LootLog] w4c-a2 c1=62 c2=11 gate each>=1 (c3/c4 record-only) | PASS
[b3] [LootLog] w4c-a3 over5=0 zeroRows=0 gate=0 | PASS
```

### B 面（`build-logs/b3lc-w4p.out`）

```
[b3] w4probe opens=100 fail=0 hist={"1":18,"2":19,"3":18,"4":24,"5":21}
[b3] [LootLog] w4p-b1 outOfRange=0 gate=0 | PASS
[b3] [LootLog] w4p-b2 coverage 1..5 each>=1 hist={"1":18,"2":19,"3":18,"4":24,"5":21} | PASS
[b3] [LootLog] w4p-b3 zero=0 over5=0 gate=0 | PASS
```

### 服务端帧标（`build-logs/b3lc-server-latest.log`）

```
[14:37:51] [Easy Times In Minecraft]: [EquipLog] durability reassert: 110 gear rows ok [server]
[14:37:52] Done (1.271s)! For help, type "help" or "?"
[14:38:01] [ETIM_Harn04] [B3] b3w4c-begin
[14:41:48] [net.minecraft.world.storage.loot.LootTable]: Tried to over-fill a container
[14:42:04] [net.minecraft.world.storage.loot.LootTable]: Tried to over-fill a container
[14:42:26] [net.minecraft.world.storage.loot.LootTable]: Tried to over-fill a container
[14:43:05] [ETIM_Harn04] [B3] b3w4c-end
[14:43:11] [ETIM_Harn04] [B3] b3w4p-begin
[14:44:15] [ETIM_Harn04] [B3] b3w4p-end
[14:44:38] [MinecraftServer]: Stopping server → Saving worlds
```

判据工件（`build-logs/`）：`b3lc-server-latest.log`（186,366 B / 1,563 行）、`b3lc-boot.log`
（43,097 B / 288 行）、`b3lc-w4c.out`（78,010 B / 1,039 行）、`b3lc-w4p.out`（19,982 B / 239 行）、
`b3-w4c.json`（33,516 B / 1,681 行）、`b3-w4probe.json`（19,070 B / 955 行）。

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[14:44:38] Saving worlds → Stopping server (Shutdown Thread)`；RCON `stop`（非 taskkill）；keeper 报 `exited after 410s` |
| 判据源快照 | `build-logs/b3lc-server-latest.log`（**186,366 B** / 1,563 行）＋ `build-logs/b3lc-boot.log`（**43,097 B** / 288 行） |
| 端口 | 25565 / 25575 **无 LISTEN** |
| `server.properties` | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `online-mode=false` / `allow-flight=false`（值未改；mtime 14:37:51 为服务端自写） |
| cfg | `mobEquipDebugLog` / `miningDebugLog` / `equipDebugLog` 均 true（未改） |
| 世界 | `testw2h` 照用未删档；本窗仅在 y=100 台架重建判箱/地板 |
| 产品面 | jar **530,192 B @ 13:39:10** / SHA256 `425B25E5…FE101DB3E` / HEAD `aaaf0a4` = origin / `src/main` 干净 |
| 窗内 rebuild | **0 次** |
| 启动方式 | `javaw.exe`（无控制台窗口） |
| 客户端 | 未起 obf 客户端（仅 mineflayer 假玩家 `ETIM_Harn04` + 服务端权威槽包） |
| 工装改动 | **无**（本批只执行 `aaaf0a4` 既有 `w4c` / `w4probe`，未改任何文件） |

---

## 六、结论

- **A 面 PASS 3/3**：产品通道 500 开、`fail=0`；`chainStacks=79`、`chainItems=102`、`c1=62`、`c2=11`、
  `over5=0`、`zeroRows=0`；单箱守恒总和最大 5、无 >5，`chainItems` 与逐箱总和逐位对账一致。
- **B 面 PASS 3/3**：受控探针 100 开、`fail=0`；`outOfRange=0`，直方图 `1..5 = 18/19/18/24/21`
  （`count=5` 命中 21 次），`zero=0`、`over5=0` → **SetCount(1,5) 全区间可达**。
- **负证 PASS**：漂移/reassert 异常/mixin/FATAL/Crash/缺表 全 0。
- A 级 0、B 级 0、C 级 4（1 项 vanilla over-fill、1 项 javaw 启动噪声、2 项判据/工装可达性）。
- **链件 SetCount 判据口径专批满足闭单条件**：A 面累积门 + B 面守恒总和双向成立。
