# W-B43 判窗正本（R196 :84 短棍 / 棍棒 — census A）

判窗执行：会话七（ETIM 验证窗执行，DeepSeek V4.1 Flash）
窗口：2026-11-20 20:09:56 → 20:11:44（本地 UTC+8）＝两轮独立 smoke
驱动：`git-workspace/etim/testharness/player/f11-b43-smoke.js`（`RUN` 环境变量）
- 轮一 `RUN=w-b43v1`：20:09:49 → 20:10:46，`[done] bad=0`，EXIT=0
- 轮二 `RUN=w-b43v2`：20:10:59 → 20:11:44，`[done] bad=0`，EXIT=0

结论：**W0 / W1 / W2 / W3 / W4 ＋ PIN 面两轮全部 PASS**；两轮 `bad=0`、EXIT=0，A 级 0 件、B 级 0 件。

## 0. 钉值与现场

| 项 | 值 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,171,488 B<br>`5A8A7FE1E2D34C1C6E562EFC34A96B3C51393A5F645F70B7E91259F98D67D189`<br>mtime `2026-11-20T12:05:13Z`（窗起 12:09Z，**窗内 0 rebuild**） |
| dev / sources | 1,149,146 B／1,076,202 B（非判据） |
| MK | classes 101 / entries 239 / dual 478；mixins.etim.json 100 + 10；ok=true（两轮一致） |
| HEAD | `ac27ef6`（窗内 0 提交）；工作树 `M` 8 件（含本批产品改动）为既有状态，窗内未触碰 |
| cfg | `run/config/etim.cfg` 49,381 B `E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046`（起收同，`B:miningReform=true`） |
| props | `run/server.properties` `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同；`level-name=w-b30v`、`allow-flight=false`） |
| crash | 24 → 24（窗内无新增） |
| port 25565 | 0 监听（两轮之间与收尾） |

## 1. 逐窗判读

| 窗 | 判据 | 轮一实测 | 轮二实测 | 判 |
|---|---|---|---|---|
| W0 注册/装备面 | `gear recipes registered: 37`；cudgel 200/1.0/2.0/0/100；club 400/2.0；mixinFail=0 | 三条皆命中（`b43-smoke-w-b43v1.out:407 / :542 / :543`） | 三条皆命中（`:408 / :543 / :544`） | **PASS** |
| W1 短棍挖玻璃 | `mine speed item=etim:cudgel_wood block=glass str=8.0` ≥1 且无同 item/block 的 `mine deny` | speed=1（`:2882`）；deny 0 | speed=1（`:2877`）；deny 0 | **PASS** |
| W2 棍棒挖南瓜 | `mine speed item=etim:club_wood block=pumpkin str=8.0` ≥1 且无同 item/block 的 `mine deny` | speed=1（`:2896`）；deny 0 | speed=1（`:2891`）；deny 0 | **PASS** |
| W3 短棍挖石头（负证据） | 无 `mine speed … cudgel_wood block=stone`；出现 `mine deny grade=0 required=2 item=etim:cudgel_wood block=stone`；块仍在 | speed=0；deny 1（`:2908`）；`air=false`（`:2912` Stone） | speed=0；deny 1（`:2903`）；`air=false`（`:2907` Stone） | **PASS** |
| W4 耐久上限 | cudgel 200 / club 400（取 W0 的 EquipLog） | `cudgel:true, club:true` | 同 | **PASS** |
| PIN 面 | 每轮 `[PIN]` sha 一致、mk 101/239/478、mixins 100/10、shaOk/ok 皆 true | 全 true | 全 true | **PASS** |
| 收口 | props `allow-flight=false`、`level-name=w-b30v`；cfg `miningReform=true`；无残留服务端；crash 不增 | 同 | 同 | **PASS** |

两轮 `[done]` 载荷一致（除 `run` 名与 `rows.farm` 63/61 噪声）：`w0{recipes37,cudgel200,club400,mixinFail:0}`、`w1{air:false,speed:1,decay:0}`、`w2{air:false,speed:1,decay:0}`、`w3{air:false,speed:0}`、`w4{cudgel:true,club:true}`、`pin.ok:true`、`rows.mining=4`、`bad=0`。

## 2. 锚行（轮一 `testharness/build-logs/b43-smoke-w-b43v1.out` 451,865 B ／ 轮二 `b43-smoke-w-b43v2.out` 450,825 B）

**W0**

- `w-b43v1.out:407` `[20:09:56] [Easy Times In Minecraft]: [TestLog] gear recipes registered: 37 batch rows ok (runtime REGISTRY delta; etim-domain total 162 incl legacy 94: 90 ingot-based + 4 rusted + 4 gold chain-armor) [server]`
- `w-b43v1.out:542` `[EquipLog] gear item=etim:cudgel_wood maxDamage=200 attackDamage=1.0 efficiency=2.0 grade=0 burn=100 armor=0.0`
- `w-b43v1.out:543` `[EquipLog] gear item=etim:club_wood maxDamage=400 attackDamage=2.0 efficiency=2.0 grade=0 burn=100 armor=0.0`
- `w-b43v2.out:408 / :543 / :544` 同三行（时间戳 20:11:06）

**W1（短棍 · 玻璃 -62,120,237）**

- `w-b43v1.out:2876` `[20:10:12] Replaced slot slot.weapon.mainhand with 1 * [Wooden Cudgel]`
- `w-b43v1.out:2882` `[20:10:14] [MiningLog] mine speed item=etim:cudgel_wood block=glass str=8.0 [server]`
- `w-b43v1.out:2883 / :2884` `[TestLog] step=dig-start / dig-stop player=ETIM_F7 pos=BlockPos{x=-62, y=120, z=237}`
- `w-b43v1.out:2886` `[20:10:18] The block at -62, 120, 237 is Glass (expected: Air)`（块态未变，C-1）

**W2（棍棒 · 南瓜 -63,120,237）**

- `w-b43v1.out:2889` `Replaced slot slot.weapon.mainhand with 1 * [Wooden Club]`
- `w-b43v1.out:2890` `[20:10:18] [MiningLog] mine speed item=etim:club_wood block=glass str=8.0 [server]`（换手遗留检查行，C-2）
- `w-b43v1.out:2896` `[20:10:20] [MiningLog] mine speed item=etim:club_wood block=pumpkin str=8.0 [server]` ← W2 正判行
- `w-b43v1.out:2897 / :2898` `dig-start / dig-stop … pos=BlockPos{x=-63, y=120, z=237}`
- `w-b43v1.out:2900` `[20:10:24] The block at -63, 120, 237 is Pumpkin (expected: Air)`（C-1）

**W3（短棍 · 石头 -64,120,237）**

- `w-b43v1.out:2908` `[20:10:27] [MiningLog] mine deny grade=0 required=2 item=etim:cudgel_wood block=stone [server]`
- `w-b43v1.out:2909 / :2910` `dig-start / dig-stop … pos=BlockPos{x=-64, y=120, z=237}`
- `w-b43v1.out:2912` `[20:10:30] The block at -64, 120, 237 is Stone (expected: Air)` ✔ 块仍在
- 全档无 `mine speed … cudgel_wood block=stone`

**轮二对应锚**：`2877`（cudgel+glass speed）、`2884/2885`（换手 club+glass）、`2891`（club+pumpkin speed）、`2892/2893`（dig-start/stop）、`2895`（Pumpkin 仍在）、`2903`（`mine deny grade=0 required=2 … block=stone`）、`2904/2905`（dig-start/stop）、`2907`（Stone 仍在）。

**停止面**：`w-b43v1.out:2934` `BUILD SUCCESSFUL in 47s`；`w-b43v2.out:2929` `BUILD SUCCESSFUL in 47s`；两轮 `[stop] {"exitCode":0,"exited":true}`；双 boot `Done (5.928s)` / `Done (6.007s)`。

## 3. 冲突分级

**A 级：0 件。**
**B 级：0 件。**

**C 级（登记）**

- **C-1（工装完成时序面，任务书 C-9）** `/etest dig` 的 START/STOP 到达服务端、`mine speed` 行正常发出，但 1.12 `PlayerInteractionManager.blockRemoving` 在该驱动里未完成方块破坏：两轮 W1 玻璃、W2 南瓜 `air=false`，且全档 `tool decay` 行 0 条（未进入破坏完成回调）。与 B-42 的 `bot.dig` 块态问题同源；不判产品失败，真人破块补测由主会话另排。
- **C-2（换手遗留检查行）** 两轮皆有一条 `mine speed item=etim:club_wood block=glass str=8.0`（v1 `:2890`、v2 `:2885`），紧跟在 `replaceitem … club_wood` 之后 0 秒、目标却是上一臂尚未破坏的玻璃，非本臂动作产物；与 B-42 C-B42-4 的 `mine deny … block=stone_slab` 同源（换手触发对遗留目标的 HarvestCheck/进度计算）。不计入任何判据面。
- **C-3（判据手核项）** W3 的 `mine deny grade=0 required=2` 行由本会话手工核（驱动只判 `speed===0` 与 `air===false`）：两轮均命中，等级 0 与「短棍 grade=0、石头要求 required=2」自洽。
- **C-4（停服载荷）** `[stop]` 只回 `{"exitCode":0,"exited":true}`（无 `build` 字段）；停止成功以 boot 日志 `BUILD SUCCESSFUL` 为准（两轮 47s）。
- **C-5（世界命名）** 实际世界目录为 `run/w-b43s-w-b43v1`（25 文件 3,679,547 B）与 `run/w-b43s-w-b43v2`（25 文件 3,660,764 B）；`run/` 下另有主会话既有 `w-b43s-r1/r3/r4`。
- **C-6（工程面）** 两 boot `Exception`/`Mixin apply failed` 计数 0；`[PIN]` 双轮同 sha；`mixin.dumpTargetOnFailure : <false>` 属配置 dump 行，不含 `mixinFail` 关键字，不会被驱动的 mixinFail 计数误吃。
- **C-7（工作树）** 现场 `M` 8 件（`combat/ETIMBlocking.java`、`combat/EnchantmentStun.java`、`metal/ETIMGear.java`、`mining/ETIMMining.java`、`mob/ETIMDigging.java`、`mob/ETIMMobEquip.java`、`lang/en_us.lang`、`lang/zh_cn.lang`）为 B-42/B-43 未提交改动，窗内未触碰。

## 4. 收口表

| 项 | 值 |
|---|---|
| jar | 1,171,488 B `5A8A7FE1E2D34C1C6E562EFC34A96B3C51393A5F645F70B7E91259F98D67D189`（mtime `12:05:13Z` 未变，0 rebuild） |
| MK | 101 / 239 / 478；mixins 100 + 10；ok=true |
| cfg 起收 | `E73BB048…6E8169046` → 同（`miningReform=true`） |
| props 起收 | `E3DE4341…633D4E36` → 同（`level-name=w-b30v`、`allow-flight=false`） |
| crash | 24 → 24 |
| 端口 | 25565 无监听 |
| 客户端 | **无客户端**（纯服务端判据） |
| 世界 | `run/w-b43s-w-b43v1`、`run/w-b43s-w-b43v2` 均保留 |
| 证据 | `testharness/build-logs/b43-smoke-w-b43v1.out` 451,865 B／`b43-smoke-w-b43v2.out` 450,825 B；`build-logs/f11-b43-smoke-w-b43v1-stdout.out` 13,027 B／`-w-b43v2-stdout.out` 12,859 B |

## 5. 文尾

本文件 **9252 B / 108 行**（UTF-8 无 BOM、LF、U+FFFD 0）。

三 SHA（判窗口径）：jar 5A8A7FE1E2D34C1C6E562EFC34A96B3C51393A5F645F70B7E91259F98D67D189；cfg E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046；props E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36。

判定口径：W1/W2 取 `mine speed` 行（产品面），块态与 `tool decay` 归 C-1；W3 取 `mine deny grade=0 required=2` 与块态；W4 取 W0 的 EquipLog 数值。
