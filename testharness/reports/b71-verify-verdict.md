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

本文件字数规格：7282 B / 94 行。
