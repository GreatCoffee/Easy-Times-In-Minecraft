# B-71 蓝莓灌木判窗 — 判定正本

> 生成：会话七（ETIM 验证窗执行）· 2026-11-28 12:44 CST
> 工单：主会话 m06710（2026-11-28 12:40）· 驱动 `testharness/player/f11-b71-smoke.js`（14,214 B，未改）
> 钉值 `b71-build6`；HEAD `e318580`
> **终判：FAIL**（W1 / W3 / W6 红；W2 / W2′ / W4 / W5 绿）

## 终判依据（一句话）

四条绿臂证明「采摘 / 骨粉无效 / 非法移除 / 玩家采掘」的通道与行为成立；三条红臂全部止步于**被测对象或环境未建立**：`/etest bushgen`、`/etest bushtick` 缺玩家参数被服务端拒绝，`time set midnight|noon` 不是 1.12 语法，W6 的 `genOk` 断言与实现落点不符。产品码未改动，未做任何重建。

## 六臂表

| 臂 | 期望（工单） | 实测 | 证据 |
|---|---|---|---|
| W1 生成 | `[BushLog] gen chunk=cx,cz biome=forest* patches=0\|1 placed=N first=x,y,z` ＋ probe（`growth=3 berries=1 soilOk=1 biomeOk=1 sky=1 stay=1 place=1 master=1`） | **红**：`[BushLog] gen` **0 条**；命令被拒 | tee `:11991` 命令回声、`:12000` `Only players can use /state.` |
| W2 采摘 | `pick … growth=3 result=berries->0 drops=etim:blueberries:1`；再点 `result=refused` | **绿**：`berries->0`／`etim:blueberries:1`；二次 `refused`；probe `growth=0 berries=0` | tee `:13228`、`:13363`、`:13412`、`:13443` |
| W2′ 骨粉 | `hand=minecraft:dyex1 growable=0`；点击后 `growth=0`、手牌仍 `dyex1` | **绿**：前后两次 probe 均 `hand=minecraft:dyex1 growable=0 growth=0`，后续 `pick refused` | tee `:13526`、`:13543`、`:13567` |
| W3 生长 | 夜 `result=dark light=<15`、400 tick 后 `after=0`；正午 `light=15`、`after>=1` 且有 `from=<n> to=<n+1>` | **红**：夜/正午都未切换（`time` 语法错），`night/day` 均 null、`darkRows=0 growRows=0`，probe 全程 `light=15` | tee `:13633/:13635`、`:13741/:13749`、`:15869/:15871`、`:15994/:16017` |
| W4 非法移除 | `illegal … growth=3 player=1 drops=etim:blueberries:1`，方块变 air | **绿**：`drops=etim:blueberries:1`；probe `block=minecraft:air growth=-1` | tee `:18127`、`:18169` |
| W5 玩家采掘 | `harvest … growth=3 result=berries drops=etim:blueberries:1`，方块变 air | **绿**：同上；probe `block=minecraft:air` | tee `:18229`、`:18310` |
| W6 静态 | 脚本静态断言全真 | **红（仅 `genOk=false`，其余 9 项 true）** | `[W6] {"srcOk":true,"dropsOnlySelf":true,"genOk":false,…}` |

`[done]`：
```
{"run":"b71r1","pin":true,"w1":false,"w2":true,"w2b":true,"w3":false,"w4":true,"w5":true,"w6":false,"stops":0,"crashes":0,"pass":false,"bad":3,"badKeys":["w1","w3","w6"]}
```

## 冲突分级

> 本批口径：**A＝阻断**（判据面无法成立，附 tee 行号与原文）；B＝判据/工装不成立但不阻断其他臂；C＝可接受偏差。

### A 级（3 条）

**A-B71-1 · W1：`/etest bushgen` 缺玩家参数 → 命令被拒，生成臂无被测对象**

```
tee :11991  ### [harness] > etest bushgen -2 -10
tee :12000  Only players can use /state.
```
- 机制：`src/main/java/io/github/etim/etim/commands/CommandDevTest.java` 的 `executeBushGen` 取 `EntityPlayerMP player = targetOrSender(server, sender, args, 3);`；本驱动只发 3 个 token（`bushgen -2 -10`），`args.length > 3` 不成立 → 回退 sender（console）→ `throw new PlayerNotFoundException("commands.state.no_player")`。
- 结果：`ETIMBushGen.generateChunk` 未执行 ⇒ `[BushLog] gen` 0 条、W1 的 `genProbe` 为 null。
- 建议修法（工装面）：驱动 `testharness/player/f11-b71-smoke.js:132` 改成 `etest bushgen ${forest.cx} ${forest.cz} ${A}`（第 4 参为玩家）。

**A-B71-2 · W3：`time set midnight|noon` 不是 1.12 语法 → 夜/正午两态未切换**

```
tee :13633  ### [harness] > time set midnight
tee :13635  'midnight' is not a valid number
tee :15869  ### [harness] > time set noon
tee :15871  'noon' is not a valid number
```
- 机制：1.12 `/time set` 只接受数字（或 `day`/`night`），`midnight`/`noon` 是 1.13+ 别名。
- 结果：两次 `bushprobe` 都在白天实测 `light=15`，`nightProbe.light < 15` 恒假。
- 建议修法（工装面）：`f11-b71-smoke.js:184` → `time set 18000`；`:188` → `time set 6000`（并各等 ≥1 s 让天光重算）。

**A-B71-3 · W3：`/etest bushtick` 缺玩家参数 → 生长臂无被测对象**

```
tee :13741  ### [harness] > etest bushtick -26 151 -154 400
tee :13749  Only players can use /state.
tee :15994  ### [harness] > etest bushtick -26 151 -154 400
tee :16017  Only players can use /state.
```
- 机制：同 A-B71-1，`executeBushTick` 用 `targetOrSender(server, sender, args, 5)`，本驱动发 5 个 token ⇒ `args.length > 5` 不成立 ⇒ console 回退抛异常。
- 结果：`[BushLog] bushtick` 与 `[BushLog] growth` 全 0 条，`night.hit`/`day.hit` 均 null。
- 建议修法（工装面）：`f11-b71-smoke.js:84` 的 `bushtick()` 追加 `${A}`（第 6 参）。

### B 级（2 条）

**B-B71-1 · W6 `genOk` 断言与实现落点不符（非产品缺口）**
- 断言要求 `ETIMBushGen.java` 内含 `canSeeSky`；实测 `Select-String` 计数 `canSeeSky=0`（`isBushBiome=1 canPlaceBlockAt=1 canBlockStay=1 setBlockState=1`）。
- 真实链路（我核实的过程）：`ETIMBushGen.java:70` `if (!canOccurAt(world, pos)) continue;` → `ETIMBushGen.java:109` `return ETIMFarmBlocks.BUSH.canBlockStay(world, pos, …);` → `ETIMBlockBush.java:145-149` `canBlockStay` 内 `if (world.canSeeSky(pos))` 分支。
- 建议修法（判据面）：`f11-b71-smoke.js:253-254` 的 `genOk` 改判 `canOccurAt` 委托（如 `/canBlockStay/` ＋ `/canOccurAt/`），或把天光断言指向 `ETIMBlockBush.java`。

**B-B71-2 · W1 的 `genProbe.place` 期望值与产品语义不一致**
- 工单 W1 要求 probe 带 `place=1`；本窗 12 条 probe 中，仅「方块已被采掘成 air」那条（`tee :18310`）为 `place=1`，其余（含 `growth=3 berries=1` 的熟果 bush）全为 `place=0`。
- 判读：`place` 更像「此格当前是否可放置 bush」（被占时为 0），而非「生成路径成立」。W1 红主要因 A-B71-1（无 gen 行），但即便命令可跑，该字段也会二次判红。
- 建议：等产品行可读后，用 `[BushLog] gen … placed=N` ＋ `first=` 的 probe（`place` 只作记录）重定 W1 断言。

### C 级（4 条）

- **C-B71-1**：driver log 实际落 `testharness/build-logs/b71r1-driver.log`（411 B），非工单写的 `b71-b71r1-driver.log`。
- **C-B71-2**：世界名三段式 `run/w-b71-b71r1-v1`（27 文件 / 6,160,851 B），保留。
- **C-B71-3**：`assert-exempt.json` 的 8 条正则豁免仍在（工单已知，首跑后由主会话删除）。
- **C-B71-4**：W2 的 ripe probe 读到 `hand=theoneprobe:probenotex1`（TheOneProbe 占主手）；W2′ 正确读到 `hand=minecraft:dyex1`，故骨粉臂不受影响。

## 建议下一步

1. 修三处工装（A-B71-1/2/3，共 4 行）后重跑 `RUN=b71r2`；
2. 同步处理 B-B71-1（`genOk` 断言）与 B-B71-2（`place` 期望），避免第二轮再因判据面红；
3. 四条已绿臂（W2/W2′/W4/W5）的锚已固化在本文件 §六臂表，重跑时可直接对位。

## r2（2026-11-28）

> 主会话 m06782 修完 r1 三条 A 后重跑；产品码与 jar 未动（HEAD `6faf4c1`，jar mtime 仍 `2026-11-28T04:16:37.0772Z`）
> 窗口 `RUN=b71r2`，12:08 起 89 s，EXIT=2
> **r2 终判：FAIL（A=0 / B=2 / C=2）** —— 红面只剩两条**判据/工装**项，产品行为已由 tee 原文证实

### r1 三条 A 的复核

| r1 项 | 复核点 | r2 实测 | 结论 |
|---|---|---|---|
| A-B71-1 `bushgen` 缺玩家 | 命令带第 4 参 + 出 `[BushLog] gen` 行 | `:12071 > etest bushgen -2 -10 ETIM_F7` → `:12077 [BushLog] gen chunk=-2,-10 biome=minecraft:forest patches=0 placed=0 first=none` | **已闭环**（行出现；`patches=0` 另属新发现，见 B-B71-3） |
| A-B71-3 `bushtick` 缺玩家 | 命令带第 6 参 + 出 `[BushLog] bushtick` 行 | `:13072 [BushLog] bushtick … before=0 after=0 ticks=400 n=400 light=4 sky=1`、`:13617 … before=0 after=3 ticks=400 n=400 light=15 sky=1` | **已闭环** |
| A-B71-2 `time set midnight|noon` | 日志应为 `time set 18000` / `6000` | 全档无 `'midnight'/'noon' is not a valid number`；夜 probe `light=4`、昼 probe `light=15` | **已闭环** |
| B-B71-1 `genOk` | 静态十项全真 | `[W6] {"srcOk":true,"dropsOnlySelf":true,"genOk":true,…,"pass":true}` | **已闭环** |

### r2 六臂

| 臂 | 实测 | 判定 |
|---|---|---|
| W1 生成 | `gen … patches=0 placed=0 first=none`（产品已执行，本随机轮次抽到 0 个 patch）；`genProbe=null` | **红（B-B71-3 抽样）** |
| W2 采摘 | `berries->0` / `etim:blueberries:1`，二次 `refused` | 绿 |
| W2′ 骨粉 | 前后 `growable=0 hand=minecraft:dyex1`，growth 仍 0 | 绿 |
| W3 生长 | 产品行正确（见 §r2.1），驱动 `darkRows=0` | **红（B-B71-4 解析）** |
| W4 非法移除 | `player=1 drops=etim:blueberries:1` → air | 绿 |
| W5 玩家采掘 | `result=berries drops=etim:blueberries:1` → air | 绿 |
| W6 静态 | 十项全真 | 绿 |

`[done]`：
```
{"run":"b71r2","pin":true,"w1":false,"w2":true,"w2b":true,"w3":false,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":false,"bad":2,"badKeys":["w1","w3"]}
```

### §r2.1 产品侧证据（tee 原文，`b71-b71r2-b1.out`）

```
:12077 [BushLog] gen chunk=-2,-10 biome=minecraft:forest patches=0 placed=0 first=none
:12719 [BushLog] growth pos=-26,151,-154 result=dark light=4        （全档 400 条，light 恒 4）
:13072 [BushLog] bushtick pos=-26,151,-154 before=0 after=0 ticks=400 n=400 light=4 sky=1 rate=0.0250 mult=1.00 master=1
:13260 [BushLog] growth pos=-26,151,-154 from=0 to=1 light=15 rate=0.025 roll=0.016 temp=0.700 mod=1.000
:13261 [BushLog] growth pos=-26,151,-154 from=1 to=2 light=15 rate=0.025 roll=0.014 temp=0.700 mod=1.000
:13262 [BushLog] growth pos=-26,151,-154 from=2 to=3 light=15 rate=0.025 roll=0.019 temp=0.700 mod=1.000
:13263 [BushLog] growth pos=-26,151,-154 result=ripe growth=3      （全档 354 条）
:13617 [BushLog] bushtick pos=-26,151,-154 before=0 after=3 ticks=400 n=400 light=15 sky=1 rate=0.0250 mult=1.00 master=1
```
⇒ 「夜不长、日必长」的产品语义在 r2 已成立；W3 红是驱动取值错位（见 B-B71-4），不是产品缺陷。

### §r2.2 分级

**A=0**

**B-B71-3 · W1 的抽样设计使 PASS 只有 ~20% 概率**
- `src/main/java/io/github/etim/etim/farm/ETIMBushGen.java:27` `PATCH_TENTHS = 2`；`:95` `patchesFor = PATCH_TENTHS/10 + (rand.nextInt(10) < 2 ? 1 : 0)` ⇒ **80% 抽到 0 个 patch**。
- 工单允许 `patches=0|1`，但 W1 又要求 `placed>=1` ⇒ 两条断言在 `patches=0` 时互斥。
- 建议：驱动改成「最多 10 次 `etest bushgen`（同/异区块）」直到 `placed>=1`（每次 ≈20% 命中；10 次 >89%），或接受 `patches=0` 且只判 gen 行形态、把 `placed>=1` 交一次性强制抽样。

**B-B71-4 · W3 的 growth 行解析取错捕获组**
- `testharness/player/f11-b71-smoke.js:92-94`：`rows2.map((m) => ({ from: num(m[4]), to: num(m[5]), result: m[10] || null, light: num(m[11]) || num(m[6]) }))`。
- `GROWTH_RE`（`:44`）里 `result=(\S+)` 是 **第 11 组**、其后的 `light=(\d+)` 是 **第 12 组**；第 10 组是 `mod=`。⇒ `result` 恒 null（`darkRows=0`、`day.row` 也丢 result），`light` 落到 `m[6]`（rate 值）。
- 建议：改 `result: m[11] || null, light: num(m[12]) || num(m[6])`；改后 `darkRows` 应为 400、`growRows` 3。

**C-B71-5**：`gen force …` 行（`:12078`，`CommandDevTest.java:1042`）与 `gen chunk=…` 行（`:12077`）并出，驱动只认后者（正确，二者语义不同：前者是代表层汇总）。
**C-B71-6**：本窗 `place` 全为 0（熟果 bush 已占位），与 r1 一致，属字段语义而非缺陷。

### §r2.3 建议

修 B-B71-3（重试）＋ B-B71-4（两处索引）后跑 `RUN=b71r3`；两条都是判据面，不需要新增产品码。W1 重试建议同时保留 `patches=0` 的原始行以便统计抽样分布。

本文件字数规格：12192 B / 161 行。
