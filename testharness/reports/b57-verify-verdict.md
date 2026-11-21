# W-B57 判窗回执 · 凝胶家族溶解协议（B-57）

- 批次：B-57（审计欠账①：`EntityCubic`/`EntityGelatinousCube` 全链）
- 判定源：`git-workspace/etim/testharness/player/f11-b57-smoke.js` r24（build14）
- 结论：**PASS** — A=0 / B=0 / C=7
- 时间：2026-11-21 16:53–16:57（b1 16:53:47–16:56:07、b2 16:56:10–16:56:32、b3/b4 16:56:40–16:57:10）

## 0. 钉值

| 项 | 值 |
|---|---|
| release | **1,308,033 B** |
| release SHA-256 | `627101A61FFEDC53536B4DF5EB67A24CEEAEE3F733FBDBF1319F671DDB266D6B` |
| dev SHA-256 | `52FFA70BDC348B8748B6B1E49482446E8835111DF522813BF0DE7379B1AFC69B` |
| sources SHA-256 | `98CB7B55936EC49E38BB9B17B1D192BA1481C70CF8798DD622CD3B519E46C7F9` |
| MK | classes 104 / entries 262 / dual 524；mixins 105 / client 10 |
| 构建日志 | `git-workspace/etim/build-logs/b57-build14.out` |

## 1. 窗口汇总

| 窗 | 内容 | 结果 |
|---|---|---|
| r1–r11 | 环境/几何/占用判定迭代（地面、区块 fill、cfg 漂移、getBoundingBox offset、计时器重置） | 逐步转绿 |
| r12–r18 | build9–build13：W1/W3/W4/W5 逐个转绿；W6 判行补齐；W7 未决 | 6/8 |
| r19 | build14 前：W1–W6 ✓、W8 ✓ | 7/8 |
| r20–r23 | W7 NBT 往返调试（`nbtread` 判行＋冻结倒计时） | — |
| **r24** | **build14 终判窗** | **W1–W8 全 ✓，bad=0** |
| 派驻 probe | `f11-b57-nbtprobe2.js`（独立世界，验证 NBT 落盘/读回） | ✓ |

环境注记：`run/crash-reports/crash-2026-11-21_15.44.02-server.txt` 为中途迭代窗的陈旧 jar（`ClassNotFoundException: io.github.etim.etim.ingest.ETIMIngestibles`），源码现存在且 build14 三窗零崩溃；不计入本批判决。

`[done]`（`b57-smoke-r24.node.out`）：
```
{"run":"r24","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,
 "w5b":true,"w7":true,"w8":true,
 "stops":[{"exitCode":0,"exited":true},{"exitCode":0,"exited":true},{"exitCode":0,"exited":true}],
 "pass":true,"bad":0}
```

## 2. 逐臂判行

| 臂 | 判据 | 锚（`testharness/build-logs/`） |
|---|---|---|
| W1 属性 | hp=size²、dmg=mult·size、xp 全对 | `b57-r24-b1.out:7562` jelly1 hp1/dmg2/xp2；`:7606` jelly4 hp16/dmg8；`:7648` blob2 hp4/dmg6；`:7684` ooze2 hp4/dmg6/xp8；`:7713` pud3 hp9/dmg12/xp15 |
| W2 酸族渐进溶解 | chest（period 400）最终熔毁 | `b57-r24-b1.out:8388` `[GelLog] melt at (3,130,0) block=minecraft:chest size=2 kind=ACID` |
| W3 瞬熔 | 火把（无碰撞盒、非实心）当刻移除 | `b57-r24-b1.out:11803` `[GelLog] torch at (4,130,0) block=minecraft:torch` |
| W4 胃蛋白酶选择性 | wool 溶、planks 不溶 | `b57-r24-b1.out:12846` `melt (7,130,0) block=minecraft:wool kind=PEPSIN`；planks 行零条 |
| W5 深度/石顶门 | 地表 150 无凝胶；地下 y=20 得凝胶 | `b57-r24-b1.out:14443` `gelpick n=1200 … y=150 counts={EntityCreeper…}`（gel=0）；`:14166` `gelpick n=1200 … y=20 counts={ETIMEntityBlob=64,…,Jelly…,Ooze…,Pudding…}` |
| W6 吞物品 | `itemkill` 判行 | `b57-r24-b1.out:14599` `[GelLog] itemkill at (10,130,0) block=minecraft:air` |
| W7 NBT 往返 | 重启后 `dissolving_blocks_info` 读回 | `b57-r24-b2.out:690` `[GelLog] nbtread entries=1 progress=2 blockCd=12`；W7 前后 `entries=1 progress=12→14` |
| W8 旗断 | `mobGelatinousR196=false` → 四族不入表 | `b57-r24-b4.out:1451` `gelpick n=2 flag=false counts={EntitySkeleton=1, EntityZombie=1}`；`:2011` y=20 `gelpick n=1200 flag=false` 无四族 |

## 3. 判定要点（实现侧）

1. **占位判定**：`ETIMBlockDissolve.intersects` 用 `getBoundingBox(...).offset(pos)`（`getCollisionBoundingBox` 对火把/植物为 null；`getBoundingBox` 是方块局部 0..1，必须 offset）。
2. **非实心 instant 面**：period==0 且非 `blocksMovement()`（火把/植物）走 `onCollidedWithBlock`，不得被 `continue` 吞掉。
3. **液体排除**：`getBlocksOccupied()` 过滤 `Material.isLiquid()` 与空气，否则水会被当 instant 溶掉。
4. **喂养计时器**：`tickAcidContact` 只在 `blockFeedingCountdown <= 0` 时置 20；每 tick 重置会让倒计时永不到 0。
5. **窒息豁免**：`isEntityInsideOpaqueBlock()` 返回 false（R196 凝胶本就身处方块内；1.12 会在 1–2 s 内以 `inWall` 杀死）。
6. **1.12 `/fill` 限制**：方块落入实体 AABB 内时静默 0 块；测试须先放块再召唤。
7. **cfg 生效核对**：`startBoot` 每次启动前重写 cfg 并在 `Done (` 后回读比对，不符则重启（Forge 启动路径会覆盖个别键）。

## 4. C 级登记

| 编号 | 内容 | 影响 |
|---|---|---|
| C-B57-1 | 凝胶球物品与投掷物（`ItemGelatinousSphere`/`EntityGelatinousSphere`）未做，留 B-58 | 玩家可感知缺口，已挂账 |
| C-B57-2 | 原版 `EntitySlime` 改用凝胶渲染/模型未做（R196 `RenderManager` 索引 0） | 视觉差异，不影响判定 |
| C-B57-3 | `extended_dissolving_blocks_info` 仅持久化条数（无跨区块完整字典序） | 远距溶解进度可丢；R196 全量 |
| C-B57-4 | 物品侧 `ItemStack.isHarmedBy` 等价按伤害类型近似（酸/胃蛋白酶统一 1.0 点） | 耐酸物品不会被逐级腐蚀 |
| C-B57-5 | 作物枯萎（`BlockCrops.setBlighted`）未移植 | 酸族不再焦化作物 |
| C-B57-6 | 岩浆/水桶吞噬链仅做「换石头/换空桶」，无容器物品残留语义 | 边界物品交互差异 |
| C-B57-7 | 客户端黑幕类视觉无判据（本批无渲染改动） | 无 |

## 5. 判决

**PASS**：A=0 / B=0 / C=7。产品面 W1–W8 全绿，NBT 往返经独立 probe 二次确认；旗断回归成立。
