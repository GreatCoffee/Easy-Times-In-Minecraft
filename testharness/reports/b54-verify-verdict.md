# W-B54 判决书：世界生成期群系刷怪（SpawnerAnimals.java:580-684）

- 执行会话：主会话（ETIM 开发）——本轮由主会话直接跑烟测与掷骰复核，日志判据自读
- 判决时间：2026-11-21 12:05 CST（宿主机本地；服务端日志为 UTC，早 8 小时）
- 判决源：工作树 HEAD `5a023a8`，`build/libs/etim-1.0.0.jar`（b54-build7，B-54 改动未提交）
- 执行方式：零产品码改动、零 commit；只写 `testharness/player/f11-b54-smoke.js`、`testharness/player/f11-b54-dice.js` 与本正本

## §0 钉值（开工／收工实测）

| 项 | 工单 | 实测 | 结论 |
|---|---|---|---|
| HEAD | `5a023a8` | `5a023a8`（B-53 封批点） | 一致 |
| release jar | 1,247,625 B | 1,247,625 B | 一致 |
| release SHA | `F3B37B70…B744E43` | `F3B37B70A51A5E05CE944D2CB0B596E6D4E00766D36901672417C63EDB744E43` | 一致 |
| jar mtime | — | `2026-11-21T03:55:07Z`（r3/r4/dice 三窗内未变） | **0 rebuild** |
| dev jar | 1,224,319 B | SHA `132B3DBFBC50D8C4EB2C2B7D5FFB542BED3E0DE6981358307E0A3D9DF5F348C9` | 一致 |
| sources jar | 1,128,516 B | SHA `5E8C9306780CD9D3FAC18EDF0005B6EAEBC13D24C361DFE0148235EE11B97996` | 一致 |
| MK | 104/259/518、105/10 | refmapTmp 104/259/518、manifest mixins 105/client 10、`ok=true` | 一致 |
| f7-wb-lib PIN | b54-build7 | `b54-build7`，releaseSize/Sha 同钉 | 一致 |
| cfg | 起窗注入、收窗还原 | `D27A403D5213EFBF2A99B2ED0F2B30CF7FF86E1A6A181B30D3529E812E872FE8`（收窗态：`mobDebugLog=false`、`mobWorldGenSpawnR196=true`） | 一致 |
| props | — | `120830258181E5CFC0A921BC705C1805D9BA93CD59EDFD960F5311202865BE99` | 一致 |
| crash-reports | — | 24 → 27（窗内 +3，均为 build3 `getBiomeName` 旧崩溃，见 C-B54-11） | 已解释 |
| 端口 25565 | — | 0 → 0 | 一致 |

## §1 世界与窗口

| 轮次 | build | 世界 | 结果 |
|---|---|---|---|
| r1 | build4 `544911D9…` | `w-b54s-*` | W5/W6/W7/W8 绿；W1–W4 全 0（探针伪影，见 C-B54-12） |
| r2 | build5 `63341212…` | 同上 | 破案：连号种子 LCG 混叠；产品自然生成正常 |
| r3 | build6 `8FE0FB56…` | 同上 | **`pass=true`** |
| r4 | build7 `F3B37B70…` | 同上 | **`pass=true`**（终钉） |
| dice | build7 | `w-b54-dice` | 掷骰复核 `pass`（§3） |

- 每 boot 的 gamerule：`doMobSpawning false`、`doMobLoot false`、`doTileDrops false`、`doDaylightCycle false`、`doFireTick false`、`keepInventory true`、`naturalRegeneration false`、`doWeatherCycle false`；`difficulty 0`、`time 1000`、`clear`
- 三 boot（b1 主窗、b2 重启读回、b3 旗断）停服全部 `{"exitCode":0,"exited":true}`

## §2 每臂判据与判行锚

### W1 群系出群（plains 本体）

`testharness/build-logs/b54-r4-b1.out:7410`
`[WorldGenSpawnLog] batch at (256,0) biome=minecraft:plains repeat=60 creature=4 aquatic=0 groups=13 horsePick=0 horseReject=0 wolfPick=0 wolfReject=0 landReject=96 capReject=12 headroom=0 aquaticSeeds=0 cg=7 ag=6`
→ 60 次 pass 里出 4 只，`cg=7 ag=6` 证实 CREATURE 与 WATER_CREATURE 两类型都跑（R196 两调用顺序共用 rand）。**PASS**

自然路径直接证据 `b54-r4-b1.out:677`：
`[WorldGenSpawnLog] spawn type=CREATURE cls=EntityChicken pos=(-258,72,198) y=72.005 animals=1`

### W2 马/狼掷拒率

- 马 `b54-r4-b1.out:7446`：`repeat=4000 … horsePick=38 horseReject=27` → 拒率 0.711
- 狼 `b54-r4-b1.out:7500`：`mutated_forest repeat=4000 … wolfPick=99 wolfReject=54` → 拒率 0.545
- 两份同 seed base 7001（同一随机流），只能算一份有效样本；单样本 0.667 偏低已在 §3 用四组独立种子复核。**PASS（结合 §3）**

### W3 每 chunk 动物上限 4

`b54-r4-b1.out:7533`：`repeat=400 … capReject=172`；烟测 `[W3] {"staged":0,"spawns":4,"capRejects":172,"animals":4}`
→ 归零后重新生成恰停在 4，超出的走 `reject animal-cap` 并**跳过抖动**（照 R196 :622-629）。**PASS**

### W4 水生分支

`b54-r4-b1.out:7618`：`ocean repeat=400 creature=0 aquatic=196 … aquaticSeeds=196 cg=0 ag=49`
`b54-r4-b1.out:5706`：`[WorldGenSpawnLog] seed aquatic idle=-9600 cls=EntitySquid`
→ 水中 y 校正段与 −9600 计数写入均通。**PASS**

### W5 头顶实心拒

`b54-r4-b1.out:3899/3900`：`prevent headroom type=CREATURE cls=EntitySheep pos=(27,87,410) dy=1`
探针 `/etest wghead` 双臂 `{"headOpen":true,"headBlocked":true}`。**PASS**

### W6 自然 hook（新区域）

`[W6] {"hooks":400,"animals":19,"aquatics":32}`（`hook dim=0 center=(3848,3848) biome=minecraft:plains`）
→ `performWorldGenSpawning` HEAD 注入至少在自然区块 populate 上 400 次命中，且自然生成 19+32 只。**PASS**

### W7 animals_spawned NBT 往返

b1 置 `animals` 后停服 → b2 重启读回 `b54-r4-b2.out:789`：`state chunk=(16,0) animals=3`。**PASS**

### W8 旗断负臂

cfg `mobWorldGenSpawnR196=false` → `b54-r4-b3.out:634` 起 `hook dim=0 flag=false skip` ×400，`[W8] {"skipHooks":400,"skipProbe":2,"spawns":0}`
→ 关闭后 ETIM 完全让位给 vanilla `WorldEntitySpawner`（见 C-B54-7）。**PASS**

## §3 马/狼掷骰复核（独立种子）

`f11-b54-dice.js` 单 boot：plains (256,0) 与 mutated_forest (0,512) 各跑 seed base 12001/22001/32001/42001 × 5000 次，`build-logs/b54-dice-run3.node.out`：

| 组 | 马 draws | 马 rejects | 狼 draws | 狼 rejects |
|---|---|---|---|---|
| 合计 | 238 | 196 | 488 | 257 |

- 马拒率 **0.8235**（R196 :587-589 预期 0.8）
- 狼拒率 **0.5266**（预期 0.5）

→ r3/r4 单样本 54/81=0.667 属同流抽样噪声，代码无偏差，无需改动。**PASS**

## §4 冲突分级

| 级 | 编号 | 内容 |
|---|---|---|
| C | C-B54-1 | 注入只接管 `WorldServer`；`ETIMChunkGeneratorUnderworld` 自实现 IChunkGenerator，不调 `performWorldGenSpawning`，下界无此面（设计内） |
| C | C-B54-2 | `animals_spawned` 走 `MixinChunk` duck + `MixinAnvilChunkLoader` 持久化；B-54 之前生成的旧 chunk 无该键，读回 0（等价 R196 新 chunk） |
| C | C-B54-3 | 头顶判定用 `isBlockNormalCube()` 近似 R196 `isBlockSolidStandardFormCube`，metadata 敏感方块（台阶/雪层）口径略宽 |
| C | C-B54-4 | R196 :670-677 抖动回绕条件 bug（z 上界用 `range_x`）**照抄**，未修正 |
| C | C-B54-5 | 群循环加 `MAX_GROUPS=64` 安全阀（R196 无上限） |
| C | C-B54-6 | 未接 Forge `canEntitySpawn`；保留 `TerrainGen.populate(...ANIMALS)` 门（D-9） |
| C | C-B54-7 | 旗断臂只证 ETIM 惰性（`spawns=0`），vanilla 动物生成不产生 `[WorldGenSpawnLog]` 行，故该臂不证 vanilla 实际出怪 |
| C | C-B54-8 | `onInitialSpawn` 在 `spawnEntity` 之前手动调用（照 R196 `onSpawnWithEgg` 先于入世），难度取 `getDifficultyForLocation` |
| C | C-B54-9 | 探针 `/etest wgspawn` 用 SplitMix64 `mixSeed(seed,i)` 派生种子，避开 LCG 连号混叠；产品路径不受此影响 |
| C | C-B54-10 | `Biome.getSpawningChance` 1.12 恒 0.1F，故自写 `temperature<=0.15F ? 0.05F : 0.1F`（R196 BiomeGenBase:285-287） |
| C | C-B54-11 | 窗内 +3 crash-reports 全为 build3 `NoSuchMethodError: Biome.getBiomeName()`（`b54-r1-b1.out:638`），build4 起改用 `getRegistryName()`，后续 r2–r4 与 dice 五窗口零崩溃 |
| C | C-B54-12 | r1 的 W1–W4 全 0 是探针伪影（固定种子 + `parsePasses().pop()` 取到探针自身 pass），非产品缺陷；r2 登记、r3 起修正 |

## §5 判决

**PASS** — A=0、B=0、C=12。

通过项：W1 群系出群、W2 马/狼掷拒、W3 每 chunk 动物上限、W4 水生 y 校正与 −9600、W5 头顶实心拒、W6 自然 hook、W7 NBT 往返、W8 旗断负臂，外加 §3 独立种子掷骰复核。

- 终钉：build7 `1,247,625 B` / `F3B37B70A51A5E05CE944D2CB0B596E6D4E00766D36901672417C63EDB744E43`，MK 104/259/518、105/10
- 日志正本：`b54-smoke-r4.node.out`、`b54-r4-b1.out`、`b54-r4-b2.out`、`b54-r4-b3.out`、`b54-dice-run3.node.out`（均在 `testharness/build-logs/`）
- 收口时 jar mtime 未变（0 rebuild）、cfg/props 已还原、无监听端口、无客户端进程
