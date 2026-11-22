# regress-b54-b67 补测回执（会话七 → 主会话）

生成时间：2026-11-22 14:2x CST
任务源：主会话 2026-11-22 14:05 补测令（B-54…B-67 共 14 批复跑）

---

## §0 钉值实测与执行时段

| 项 | 实测值 | 判定 |
|---|---|---|
| release jar | 1,522,450 B / `1E8449FB68B9EF4BC0A29DB57194270C2ED91269B1BCC3A001E4A856E03B015F` | 与 `f7-wb-lib.js:35` PIN（b67-build3）一致 |
| MK | refmap 计数与 manifest 由脚本 `pinOk` 复核，14 批全部 `pin:true` | ok |
| HEAD | `62f03fc05fba0862fe09faff9278563c8b045ea9` | 窗内 0 提交 |
| jar mtime | `2026-11-22T05:43:16Z` | 窗内无 rebuild |
| port 25565 | 起前 0 / 收后 0 | ok |
| 服务端日志落点 | `testharness/build-logs/<run>-<run>-bN.out`（脚本 tee，全量） | 行号锚以此为准 |
| 机器人视图 | `build-logs/regress-b54-b67/<run>.out` | 终判 `[done]` 在此 |

执行方式：`testharness/player/_regress-b54-b67.ps1`（串行 54→67，`$env:RUN=bNN`），计时表 `build-logs/regress-b54-b67/index.tsv`。

| 批 | 起 | 止 | 耗时 | exit |
|---|---|---|---|---|
| b54 | 14:00:00 | 14:01:43 | 103 s | 0 |
| b55 | 14:01:43 | 14:05:32 | 229 s | 0 |
| b56 | 14:05:32 | 14:07:33 | 121 s | 0 |
| b57 | 14:07:33 | 14:11:26 | 233 s | 0 |
| b58 | 14:11:26 | 14:12:26 | 60 s | 0 |
| b59 | 14:12:26 | 14:13:23 | 56 s | 0 |
| b60 | 14:13:23 | 14:14:00 | 37 s | 0 |
| b61 | 14:14:00 | 14:14:40 | 41 s | 0 |
| b62 | 14:14:40 | 14:15:21 | 40 s | 0 |
| b63 | 14:15:21 | 14:15:57 | 37 s | 0 |
| b64 | 14:15:57 | 14:16:30 | 33 s | **2** |
| b65 | 14:16:30 | 14:17:05 | 35 s | 0 |
| b66 | 14:17:05 | 14:17:40 | 34 s | 0 |
| b67 | 14:17:40 | 14:18:21 | 42 s | 0 |

收口与环境：
- 全 14 批未改源码、未 build、未 commit；工作树保持原状。
- **环境泄漏（本轮新增发现）**：跑完后 `run/config/etim.cfg` 停在 `B:mobDebugLog=true`、`run/server.properties` 停在 `level-name=w-b57-b57-v1`（两文件 mtime 均为 14:18:21，即 b67 停服时刻；内容却是 b57 窗口的值）。按现象推断是「脚本 stopBoot 还原 → 服务端进程随后把内存态写回 cfg/props」的竞序：b57 那次留下痕迹后，后续各批把它当作自身基线再原样还原，于是污染被继承到收尾。已用 `testharness/player/_regress-restore.js` 复位：`level-name=w-b30v`、`allow-flight=false`、`B:mobDebugLog=false`；复位后 cfg 56,025 B `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`、props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
- `run/crash-reports` 当前 0 个文件（历史口径为 24），**本轮无法与历史 crash 基线对账**；14 批终判载荷 `crashes:0` 且各批 tee 日志未见崩溃栈。

---

## §1 逐批判读

| 批 | 脚本 | 终判 JSON（要点） | PASS/FAIL | 与历史一致? | A/B/C |
|---|---|---|---|---|---|
| b54 | f11-b54-smoke.js | `pin:true, w1{creature:4,groups:12}, w2{horse 0.674/wolf 0.51}, w3{spawns:4,capRejects:164}, w4{aquatic:196}, w5{headOpen,headBlocked}, w6{hooks:400}, w7:3, w8{skipHooks:400,hookLines:0}, pass:true` | PASS | 一致（r4 pass=true） | 0/0/0 |
| b55 | f11-b55-smoke.js | `pin:true, w1..w7 true, w5b true, pass:true, bad:0, stops[3]` | PASS | 一致（r8 PASS） | 0/0/0 |
| b56 | f11-b56-smoke.js | `pin:true, w1..w4 true, pass:true, bad:0, stops[1]` | PASS | 一致（r2/r3 PASS） | 0/0/0 |
| b57 | f11-b57-smoke.js | `pin:true, w1..w8 true, w5b true, w7before{Ooze size:2 progress:12}, pass:true, bad:0, stops[3]` | PASS | 一致（PASS） | 0/0/0 |
| b58 | f11-b58-smoke.js | `pin:true, w1..w6 true, stops:0, pass:true, bad:0` | PASS | 一致（PASS） | 0/0/0 |
| b59 | f11-b59-smoke.js | `pin:true, w1..w7 true, stops:0, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b60 | f11-b60-smoke.js | `pin:true, w1..w6 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b61 | f11-b61-smoke.js | `pin:true, w1..w7 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b62 | f11-b62-smoke.js | `pin:true, w1..w7 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b63 | f11-b63-smoke.js | `pin:true, w1..w6 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| **b64** | f11-b64-smoke.js | `pin:true, w1:false, w2..w6 true, badKeys:["w1"], pass:false` | **FAIL** | **不一致**（r2 为 PASS） | **1/1/1** |
| b65 | f11-b65-smoke.js | `pin:true, w1..w6 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b66 | f11-b66-smoke.js | `pin:true, w1..w6 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |
| b67 | f11-b67-smoke.js | `pin:true, w1..w6 true, crashes:0, badKeys:[]` | PASS | 一致（PASS） | 0/0/0 |

说明：b58–b67 载荷里的 `stops:0` 是这些脚本**不登记**停服返回值（不是没起服）；实际每批都起了一个服务端，tee 日志 `testharness/build-logs/bNN-bNN-b1.out`（1.1–1.3 MB）为证，`[stop]` 行也在各批 stdout 中。

---

## §2 FAIL 证据（b64 / W1 堆叠表）

脚本期望（`testharness/player/f11-b64-smoke.js:128`）：
```js
const want = [32, 16, 16, 64, 16, 8, 4, 8, 1, 1, 16, 1];
```
本轮实测（`build-logs/regress-b54-b67/b64.out`，W1 行）：
```
[W1] {"row":[32,16,4,64,16,4,4,8,1,1,4,1,54],"want":[32,16,16,64,16,8,4,8,1,1,16,1],"etim16":54,"pass":false}
```
服务端原文（`testharness/build-logs/b64-b64-b1.out:7493`）：
```
[14:16:23] [Server thread/INFO] [Easy Times In Minecraft]: [ItemLog] stack stick=32 flint=16 reeds=4 paper=64 quartz=16 cake=4 cauldron=4 pie=8 book=1 bucket=1 dirt=4 sword=1 etim16=54 player=ETIM_F7 [server]
```

三处差异逐项定级：

1. **A（真缺陷）reeds 4 ≠ R196 16**：R196 芦苇是显式 16 的物品——`mite-src/decompile/src/net/minecraft/Item.java:152-156` `public static Item reed = new ItemReed(82, Block.reed, "reeds").setMaxStackSize(16)`。当前 ETIM 把它压成 4。
2. **A（真缺陷）cake 4 ≠ R196 8**：`mite-src/decompile/src/net/minecraft/Item.java:197` `cake = new ItemReed(98, Block.cake, "cake").setMaxStackSize(8)`。当前同样是 4。
3. **B（判据过时）dirt 4 而脚本期望 16**：R196 方块物品默认就是 4——`mite-src/decompile/src/net/minecraft/Block.java:1000` `private int max_stack_size = 4;`、`:2593-2595` `getItemStackLimit()` 直读该字段。脚本的 `want` 仍是 B-64 期「全员默认 16」口径。

缺陷来源（只读定位，未改码）：
- `src/main/java/io/github/etim/etim/item/ETIMBlockStacks.java:41-51`：遍历 `ForgeRegistries.BLOCKS`，凡 `ItemBlock`/`ItemBlockSpecial` 且当前上限 >1 一律 `setMaxStackSize(4)`；`:58-62` 再用 `ItemBlockSpecial` 扫一遍。
- 1.12 里 `Items.REEDS`／`Items.CAKE` 都是方块的物品形态（`ItemBlock`），实测二者都落到 4，与「凡 ItemBlock 且上限 >1 一律 4」的分类完全吻合，即被这把扫帚一并扫掉。
- 执行顺序：`src/main/java/io/github/etim/etim/ETIM.java:122` `ETIMItemStacks.apply();` → `:125` `ETIMBlockStacks.apply();`，后者的 4 覆盖前者写入的 16/8。
- 该 pass 由 `5ddded5`（B-66 方块堆叠/缓冲/摔落/材质/掉落散布）引入，B-64 期不存在，故历史 b64 正本 `w1:true`（`testharness/reports/b64-verify-verdict.md` 记 `[32,16,16,64,16,8,4,8,1,1,16,1]`、etimPinned 53）。

---

## §3 汇总

| 级别 | 计 | 明细 |
|---|---|---|
| A | 1 | b64-W1：`ETIMBlockStacks` 把 R196 显式 16（reeds）/8（cake）压成 4 |
| B | 1 | b64-W1：脚本 `want` 里 dirt=16 属 B-64 期旧口径（R196 方块默认 4） |
| C | 3 | C-R1 环境泄漏（cfg `mobDebugLog=true`＋props `level-name=w-b57-b57-v1` 被后续服务端写回，已复位）；C-R2 `run/crash-reports` 0 条，本轮 crash 无法与历史 24 对账；C-R3 b58–b67 载荷 `stops:0`（脚本不登记停服回执，非无起服） |

A 级修复建议（**不自行改码**，供主会话定夺）：
1. 在 `ETIMBlockStacks.apply()` 的方块扫帚里跳过 R196 显式覆盖项（至少 `Items.REEDS`→16、`Items.CAKE`→8），或在方块 pass 之后**重跑**一遍 `ETIMItemStacks` 的显式表，让显式项最终胜出。
2. 若判「R196 方块默认 4 优先、芦苇/蛋糕也 4」，则需在 census F 里给出反证（R196 `Item.java:152-156/:197` 现为显式 16/8，除非另有 `Block.getBlockFromItem` 路径覆盖），并按 B 处理 b64 的 `want`。
3. 工装侧（可选）：给每个 smoke 脚本收尾加「停服后 2 s 复读 cfg 原文，漂移则再写一次」的守卫，避免服务端关机写入盖掉还原。

---

## §4 终判

`FAIL` —— 14 批中 13 批 PASS、b64-W1 红；红因含 1 个 A 级真缺陷（B-66 的 `ETIMBlockStacks` 覆盖 R196 reeds=16 / cake=8）。
