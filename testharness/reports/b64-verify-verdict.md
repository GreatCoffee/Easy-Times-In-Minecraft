# B-64 审判执行 · 物品基础面（堆叠 16 / 冰雪融化 / 藤蔓放置）

- 范围：B-64＝F-1 `Item.java` 基础面五面（census `普查F-物品方块-盘点.md:142/143/149/150`，`:145` 已于 B-41 落地，`:148` 由 ETIMCompost 销账）
- 一手源：`mite-src/decompile/src/net/minecraft/Item.java`（默认 `maxStackSize=16`、逐物品覆写、`:1919-1921` 融化概率、`:1820-1893` tryPlaceAsBlock）
- 摸底：`playground/audit/f-item-立项摸底.md`（D-1..D-6 全 A/B）
- 终审判决：**PASS**（A=0 / B=0 / C=6）

## 0. 钉值（build2）

| 件 | 大小 | SHA-256 |
|---|---|---|
| etim-1.0.0.jar | 1,452,560 B | `E6317406F293AE929D6781EBAB1363AA27CC9CEBE7C4BAE8538F27A28CFEA4B4` |
| etim-1.0.0-dev.jar | 1,426,568 B | `204CBAF2AEEB2660936694063AA1C4BF730F4A63085E2B11A95935C126B34D8C` |
| etim-1.0.0-sources.jar | 1,282,453 B | `DC93A6D304E0053507097E3C6874203A5B63FC238DF7981BF0AD0C8628D8F8BA` |

MK：classes 108 / entries 270 / dual 540 / mixins 109 / client 10（`mkCounts().ok=true`）。
PIN：`testharness/player/f7-wb-lib.js:35` = `b64-build2`；`:36` MK_PIN 同步。

## 1. 试跑轨迹

| 轮 | 结果 | 关键失败 |
|---|---|---|
| r1 | W2–W6 绿，W1 红 | 空桶实测 16：1.12 空桶在本运行时是普通 Item，默认 64 被全局改成 16；R196 桶族恒 1 |
| r2 | **全绿** | — |

r2 终判行（`build-logs/b64-smoke-r2.out`）：

```json
{"run":"r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

## 2. 逐臂锚点（服务端 `testharness/build-logs/b64-r2-b1.out`）

| 臂 | 判据 | 锚点 |
|---|---|---|
| W1 | 堆叠表 `[32,16,16,64,16,8,4,8,1,1,16,1]`，etim 命名空间钉 16 计 53 件 | `:574` `[ItemLog] stack table applied default=16 r196Table=9 etimPinned=19` |
| W2 | 雪球/冰在 20.0F、200 tick 下 `chance=0.00190`，lost 79 / 66，`left=count-lost` | `:7550` meltdev snowball、`:7551` meltdev ice |
| W3 | 掉落物 `onUpdate` 钩子 + 玩家背包 `PlayerTickEvent` + 着火 20.0F 规则（源码断言） | 静态 |
| W4 | 单面藤蔓经事件路径与命令路径各放成一次，支撑门生效 | `:7678` vineplace、`:7679` vineplacecmd |
| W5 | cfg 三键（字段 + init）+ `ETIM.java` 三处接线 | 静态 |
| W6 | `MixinItem` 默认 16、`ETIMItemStacks` 表项、`ETIMItemMelt` 材质集合 | 静态 |

## 3. 判定要点

1. 默认堆叠改 16 走 `Item.<init>` TAIL（`MixinItem.etim$defaultStack16`），只在当前值为 64 时下调，子类后写者（paper 64、桶 1、工具 1）覆盖，符合 R196「默认 16 + 逐物品覆写」两层结构。
2. R196 原表九项（stick 32 / flint 16 / reed 16 / paper 64 / cake 8 / cauldron 4 / pumpkinPie 8 / enchantedBook 1 / netherQuartz 16）逐项落 `ETIMItemStacks.apply()`；桶族按容器规则显式 1。
3. ETIM 自建金属件按 D-2 统一钉 16（扫 `ForgeRegistries.ITEMS` 的 `etim:` 命名空间、无耐久、当前非 16 者），r2 计 19 件、命令面统计 53 件（含堆叠上限继承 16 的子类型）。
4. 融化概率逐件掷：`chance = (t-1)×1e-4`，雪球与雪/冰族；掉落物用生物群系温度、玩家背包用 `isBurning() ? 20.0F : 群系温度`，与 R196 两处调用点一一对应。
5. 藤蔓放置要求背面有实心支撑（`!world.isAirBlock(pos.offset(face))`），单面状态按 meta 反推 NORTH/EAST/SOUTH/WEST；放置成功消耗一件，创造模式不消耗。
6. 面 145（木棍/骨头自毁）不需本批代码：B-41 已落 `MixinItem.etim$stickBreak`（`[SwingLog] stickbreak`）；面 148 由 `farm/ETIMCompost` 承担。

## 4. C 级挂账

- C-B64-1 `tryPlaceAsBlock` 只落藤蔓反推，圣砂岩沙漠门与 `BlockMounted` 面源（挂载类方块）未落地（D-5）。
- C-B64-2 面 145 的载体是 B-41 的 `MixinItem.etim$stickBreak`，本批未改其判据，仅复核存在。
- C-B64-3 1.12 空桶在运行时为普通 Item（非 `ItemBucket`），故桶族 1 需显式写入；若后续运行环境变化需复核该假设。
- C-B64-4 融化温度用 1.12 `Biome.getTemperature(pos)` 近似 R196 的群系温度；玩家着火一律 20.0F。
- C-B64-5 ETIM 金属件钉 16 是 D-2 的裁定结果，R196 原表无对应条目。
- C-B64-6 藤蔓放置仅覆盖单面反推，多面/其他可挂载方块仍走原版行为。

## 5. 收口

- census：`普查F-物品方块-盘点.md` 五面状态位更新（`:142`/`:143`/`:149`/`:150` 已落地，`:145`/`:148` 销账），镜像行同步；F 卷 99 面与总面 218 不变。
- 账册条 407、`playground/sessions.md ## B-64`。
- 提交：只 add 本批文件，不 push。
