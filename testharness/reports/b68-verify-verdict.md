# B-68 验证正本 —— R196 根茎作物三族 + 枯死作物四家族（F-4 前 7 面之 2）

## §0 钉值与判据通道

- build：`b68-build4`（`gradlew build` BUILD SUCCESSFUL；jar mtime `2026-11-22T07:08:42Z`，窗内 0 rebuild）
- release：`etim-1.0.0.jar` 1,537,803 B `3E0A93F80DE1038989BF815021B8EC96352222D3FB441C68F03F0CA395BDC2C9`
- dev：`etim-1.0.0-dev.jar` 1,509,548 B `B142807BA13E34722651310EBDC3118B9700D1351A7400AB0B344C13D3B32866`
- sources：`etim-1.0.0-sources.jar` 1,348,949 B `831235477906D1E5C8FA012BF2EB6590B4BFB2BF2305E71E7A43C343231E1BB9`
- MK：`classes 110 / entries 276 / dual 552`、`mixins 112 / client 10`（`mkCounts().ok=true`）
- HEAD：`0d0517b`（本批改动未提交，判窗内 0 提交）
- 判据通道：`[FarmLog] drought probe / rootcrop / drought event / harvesting / dead-plant carriers`，全部 `[server]` 行；读 `testharness/build-logs/b68-b68r4-b1.out`（504,005 B / 3,455 行）。`[TestLog]` 仅作定位辅助，不作判据。
- 执行会话：会话七（W-B68 判窗 r1–r4，2026-11-22 15:08–15:25 CST）；回执 `testharness/reports/b68-verify-receipt.md`。

## §1 试跑轨迹

| 轮 | 结果 | 说明 |
| --- | --- | --- |
| r1 | bad=5 | 工装：全部放置命令用 1.13 `name[state]` 语法，1.12 拒绝（`b68r1-b1.out:2459`，全档 22 条）→ C-B68-1 |
| r2 | bad=4 | 工装：先 `fill` 后 `tp`，目标区块未加载 → 四条场地 fill 被拒（`:2457`），作物落地即弹掉（`:3396`/`:3397`）→ C-B68-2 |
| r3 | bad=1 | 工装：`DROUGHT_RE` 带行首锚，而实际行是同一行先 `drought force …` 再 `drought event kind=…` → W5 五例正则全 null（块态本身正确）→ C-B68-3 |
| **r4** | **全绿** | `{"run":"b68r4","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，exit=0 |

三处红全部落在驱动工装面，断言与几何坐标未动；独立取证 `_b68-probe.js` → `build-logs/b68-probe.out` 在已加载洁净点一次验四族（238/239/241 `result=true drops=2 first=carrot/potato/etim:onion`，240 小麦 `result=true`），证明 r1–r3 非产品缺陷。

## §2 逐臂锚点（`testharness/build-logs/b68-b68r4-b1.out`）

- W1 种植门：`:3327` `[TestLog] step=useblock pos={20,130,8} face=up`、`:3332` `pos={21,130,8}`；probe 结果 `{block:etim:onions,age:0,x:20,y:131,z:8}`，石头位保持 `minecraft:air`（R196 顶面土壤门）。
- W2 成熟产量：`:3342` carrot `mature drops=2 first=minecraft:carrot`、`:3347` potato `mature drops=2 first=minecraft:potato`、`:3351` onion `mature drops=3 first=etim:onion`（R196 `getMatureYield = rand<0.25 ? 3 : 2`，`BlockCarrot.java`/`BlockPotato.java`/`BlockOnion.java`）。
- W3 分支表：`:3363` carrot age0 `branch=seed drops=1`、`:3367` carrot age3 `immature drops=0`、`:3371` potato age3 `poison drops=1 first=minecraft:poisonous_potato`、`:3376` onion age3 `immature drops=0`。
- W4 枯萎：`:3385`/`:3387` `blight src=forceSet … blighted=1`；`:3390` potato `blighted=1 branch=poison drops=1 first=minecraft:poisonous_potato`、`:3394` onion `blighted=1 branch=blight drops=0`。
- W5 干旱死块家族：`:3403` carrot→`dead=etim:dead_carrot` age=3、`:3411` potato→`dead_potato` age=5、`:3419` onion→`dead_onion` age=2、`:3428` wheat→`dead_crop` age=4、`:3437` 成熟洋葱 `kind=mature … drop=etim:onion#2` 且位置变 air。
- W6 静态：`srcOk/regOk/helperOk/blightOk/stateOk/texOk/langOk` 全 true（两个新类、五死块+洋葱作物/物品注册+营养行、`matureYield`/`deadFor`、`ETIMBlight` 调 `deadFor`、五 blockstate、15 张新贴图+`items/onion.png`、`dead_crop_stage_7` 已删、lang 三键）。

## §3 判定要点

1. 成熟产量与 R196 一致：根茎三族 2..3（25% 取 3），麦仍 1；W2 与 W5 成熟洋葱两支均命中。
2. 未熟/种子/枯萎三条门与 R196 `BlockCrops.dropBlockAsEntityItem` 一致：age0 给 1 种子、未熟 0、blight 0、无玩家采掘（`machine`）0。
3. 马铃薯特例成立：未熟（age>0）或 blight → 1 毒马铃薯，先于 blight 归零门（R196 `BlockPotato.java:42-56` 顺序）。
4. 干旱死块按家族落位（麦 `dead_crop` / 胡萝卜 `dead_carrot` / 马铃薯 `dead_potato` / 洋葱 `dead_onion`），保留 age；R196 `getDeadCropBlockId()` 逐族返回。
5. 洋葱作物身份完整：种子食物种植（1.12 `ItemSeedFood` 顶面土壤门）、`getSeed/getCrop` 指向 `etim:onion`，可被 pick/harvesting 加成识别。
6. 枯萎座扩展到任意 `BlockCrops`（排除死块载体），洋葱 age7 枯萎可被置枯并归零掉落。
7. 本批 drop 重写走 `HarvestDropsEvent`，不依赖 1.12 `BlockCrops.getDrops` 的种子掷骰（已由 `rewriteRootCropDrops` 清空重建）。

## §4 C 级登记

| 编号 | 内容 |
| --- | --- |
| C-B68-1 | 驱动 1.13 方块状态语法（`name[moisture=n]`）在 1.12 被拒；已加 `bs()` 归一为 `name <meta>`（工装面，断言未动） |
| C-B68-2 | 驱动先 `fill` 后 `tp`，目标区块未加载导致场地未建成；已把 `tp` 提到 fill 之前（工装面，断言未动） |
| C-B68-3 | `DROUGHT_RE` 行首锚与实际行格式不符（同行含 `drought force …` 前缀）；已去锚（工装面，断言未动） |
| C-B68-4 | 解锁作物判定（`onHarvestDrops` 的 `isFertilityCarrier` 分支）本批未测：判据通道只覆盖产量/分支/blight/干旱四类；harvesting 加成属 B-41 已落面，不重复判定 |
| C-B68-5 | 洋葱活体贴图由 1.12 beetroot 阶段图重着色生成（R196 未随包发布洋葱作物块贴图），仅形状近似；死块贴图为同图去饱和 |
| C-B68-6 | 洋葱第 5 生长阶（age7）复用第 4 阶贴图，与 R196 五段 `getGrowthStage` 的贴图索引对齐但像素无独立素材 |

## §5 终判

**PASS** — W1–W6 六臂在 `b68-build4` 上全部成立；A 级 0、B 级 0、C 级 6。

判据强度说明：
- W2 洋葱 `drops=3` 命中 25% 三连支；r2 曾取到 `#3`、r4 取到 `#2`，2/3 两支均已在历轮出现。
- 干旱/枯萎的随机骰（5%/1/64/1/2 扩散）均由 `forceSet`/`drought roll` 强制通道验证，不依赖随机等待。
