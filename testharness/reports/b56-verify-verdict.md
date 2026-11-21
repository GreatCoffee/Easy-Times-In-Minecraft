# W-B56 验证判决（审计欠账 #2 木蜘蛛结构门 + #3 头顶标准立方谓词）

- 批次：B-56（`playground/audit/近半月还原力审计-2026-11-21.md` 净欠账 A 类 ②③）
- 判据通道：服务端日志（`[BlockLog]` / `[SpawnLog]`），客户端不参与判定
- 驱动：`git-workspace/etim/testharness/player/f11-b56-smoke.js`
- 日期：2026-11-21

## §0 钉值

| 产物 | 字节 | SHA-256 |
|---|---|---|
| `etim-1.0.0.jar` | 1,278,877 | `C14A54D45A3AF80EF38EAF27E4CD114695B9B7B7EF3FE23A6CB22887D7833850` |
| `etim-1.0.0-dev.jar` | 1,255,088 | `53A1956840951422516D2A4280BD01F9AAA073D6BBC0451594E0DCE55B512156` |
| `etim-1.0.0-sources.jar` | 1,151,283 | `1FB3511259EFD2FB50ED330EDEA319E602B52D7853DCF2546E333E120BE564FA` |

MK 计数：classes 104 / entries 262 / dual 524 / mixins 105 / client 10（`mkCounts().ok=true`）。
终钉 = **b56-build2**；build1（release 1,278,770 B / `C8B639308DD73C4C06B4C15E894F4A9657329FA4FA148C602C1C313FA6A4BDB9`）为玻璃白名单前的中间钉。

## §1 判窗汇总

| 窗口 | 构建 | 结果 | 说明 |
|---|---|---|---|
| r1 | build1 | `bad=1` | W1 失配：`blockcube` 解析正则把含空格的 `BlockPos{x=…}` 当作单个 `\S+`；且 `setblock` 在未加载区块静默失败 |
| r2 | build1 | `pass=true` `bad=0` | 改 `fill` + 先 tp 到探针点后 W1–W4 全绿 |
| r3 | build2 | `pass=true` `bad=0` | 玻璃白名单改毕；W1 snow 臂落砖失败（`block=minecraft:air`），判据退化 |
| r4 | build2 | `pass=true` `bad=0` | 加雪层承托砖 + 严格方块 id 断言，**终判窗** |

r4 终值：`{"run":"r4","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":[{"exitCode":0,"exited":true}],"pass":true,"bad":0}`。

## §2 逐臂判行

### W1 头顶谓词（`ETIMWorldGenSpawning.isSolidStandardFormCube`）

`git-workspace/etim/testharness/build-logs/b56-r4-b1.out`：

- `:7461` `solidcube at BlockPos{x=10, y=121, z=0} block=minecraft:stone fullCube=true moves=true result=true`
- `:7504` `solidcube at BlockPos{x=11, y=121, z=0} block=minecraft:glass fullCube=false moves=true result=true` — 1.12 玻璃 `isFullCube()==false`，白名单补回 R196 的标准立方语义
- `:7539` `solidcube at BlockPos{x=12, y=121, z=0} block=minecraft:stone_slab fullCube=false moves=true result=false`
- `:7607` `solidcube at BlockPos{x=13, y=121, z=0} block=minecraft:snow_layer fullCube=false moves=false result=false`
- `:7650` `solidcube at BlockPos{x=14, y=121, z=0} block=minecraft:glass_pane fullCube=false moves=true result=false` — 玻璃板同为 `Material.GLASS` 但非标准立方（R196 同样非标准）

### W2 开阔列：结构门必须拒绝

- `:7699` `woodspider-gate reject sky=true leafAbove=false logAbove=false woodNear=false leafNear=false at (0,120,0)`
- `:5830` 暖场 `wspick n=5 at BlockPos{x=0, y=120, z=0} counts={EntitySkeleton=1, EntitySlime=1, EntitySpider=1, EntityZombie=2}` — 无 `ETIMEntityWoodSpider`
- W2 臂窗口内 `woodspider-gate reject` 共 14–17 行，`last` 行五因子全 false/单 true，拒绝面可见

### W3 结构列：门必须放行

- `:8001` `wspick n=400 at BlockPos{x=-11, y=120, z=-11} counts={ETIMEntityWoodSpider=11, EntityCreeper=90, EntityEnderman=8, EntitySkeleton=74, EntitySlime=82, EntitySpider=65, EntityZombie=70}`
- 结构：`fill -19 119 -19 -7 119 -7 grass` + `fill -10 120 -10 -10 122 -10 log` + `fill -16 125 -16 -6 126 -6 leaves`；五因子全部满足

### W4 自然臂：真实刷怪通道接受木蜘蛛

- `:7192` `accept dim=0 ETIMEntityWoodSpider at (-58,75,114) y-bucket=over`
- `:9525` `accept dim=0 ETIMEntityWoodSpider at (-61,73,68) y-bucket=over`
- 150 s 观察窗内 2 次 accept（存在性判定，不估速率）

## §3 判定要点

1. **R196 头顶谓词**：`World.java:3266-3271` → `Block.java:1780` = `isAlwaysSolidStandardFormCube() || isSolidStandardFormCube(metadata)`；1.12 侧 `Block.isBlockNormalCube` = `blocksMovement() && isFullCube()`，`isFullCube` 默认 true，46 个 R196 覆写类中的绝大多数在 1.12 也各自覆写为 false（slab/stairs/snow/farmland/chest/pane/anvil/bed/cake/carpet/cauldron/cactus/hopper…）。
2. **唯一实质缺口是玻璃方块**：1.12 `BlockGlass.isFullCube()` 返回 false，R196 玻璃保持默认标准立方。故谓词改为「`isFullCube()` ∨ 方块 == `Blocks.GLASS` ∨ `Blocks.STAINED_GLASS`」；玻璃板/信标等 `Material.GLASS` 非立方方块不得误判（W1 玻璃板臂即此守卫）。
3. **木蜘蛛门**逐字照 R196 `WorldServer.java:690-700`：`(canBlockSeeTheSky || blockTypeIsAbove(leaves) || blockTypeIsAbove(wood)) && blockTypeIsNearTo(wood, ±5/±2) && blockTypeIsNearTo(leaves @ y+5, ±5/±5)`。
4. **回表**：`BiomeGenBase.java:176` `WoodSpider 20(1,1)` 已写入 BASE MONSTER（`ETIMSpawnTables.java:103`），门在 `pickSpawn`（`:344`）。
5. **辅助语义**：`blockTypeIsAbove` 先在 y+1 上方遇木类为真、遇任何非空气即假（`ETIMSpawnTables.java:466-479`）；`blockTypeIsNearTo` 为整数盒（`:482-493`）；木类判定 `instanceof BlockLeaves/BlockLog`（`:495-497`）。
6. **工装教训**：`setblock` 在未加载区块会静默失败且无回执，`fill` 同点可用；探针前置一次 `wspick(0,120,0,5)` 暖场后放置稳定。`BlockPos.toString()` 含空格，正则必须写成 `BlockPos\{[^}]*\}`，不得用 `\S+`。

## §4 C 级登记

| 编号 | 内容 | 影响 |
|---|---|---|
| C-B56-1 | 头顶谓词只补玻璃/染色玻璃两处白名单，其余依赖 1.12 自带 `isFullCube` 覆写与 R196 `isStandardFormCube` 覆写集的重合；未逐方块比对全表 | 若后续发现某方块两边结论不同，需追加白名单 |
| C-B56-2 | 木类判定用 `instanceof BlockLog/BlockLeaves`，R196 用 block id；1.12 无去皮木等新变体，当前等价 | 后期若引入新木种需复核 |
| C-B56-3 | `blockTypeIsAbove` 上界统一取 `getActualHeight()`，R196 依 `lightOpacity==0` 在 `getActualHeight()` 与 `getHeightValue()` 间切换 | 极端地形（高草/雪层改变 heightmap）可能差 1–2 格 |
| C-B56-4 | 自然臂只证存在性（2 次 accept / 150 s），不估速率与 y 分布 | 速率面留给后续采样 |
| C-B56-5 | `wspick` 探针不计落点/光照门，只测结构门；与 B-52 的 `spawnpick` 口径一致 | 落点面由 `[SpawnLog] accept` 自然臂覆盖 |
| C-B56-6 | 蜘蛛家族本体的光照门仍走 1.12 `EntityMob` 默认，未复刻 R196 `getSuitableCreature` 的统一施加顺序 | 已被既有 D 卷门批覆盖 |
| C-B56-7 | r1 的 `setblock` 静默失败属工装面，不是产品缺陷；已在 §3.6 记入纪律 | 后续探针一律 `fill` + 暖场 |

## §5 判决

**PASS** — A 级 0、B 级 0、C 级 7。

- 审计欠账 ③（头顶谓词近似）已按 R196 `isSolidStandardFormCube` 语义收口，玻璃缺口以白名单补足并经 5 方块探针验证。
- 审计欠账 ②（WoodSpider 结构门）已按 R196 五因子逐字落码，回表 20(1,1)，拒绝面（14–17 行）与放行面（11 次 pick／2 次自然 accept）双证。
- 本批不动凝胶溶解协议（审计欠账 ①），留 B-57。
