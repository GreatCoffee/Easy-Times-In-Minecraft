# B-69 第三次复签（r3）

## §0 复核源与钉值

- 被审：修复后产品码 + 会话七 build4/r10 判窗回执。
- 判决源：R196 `mite-src/decompile/src/net/minecraft/` 一手；1.12 `git-workspace/etim/build/rfg/minecraft-src/java/net/minecraft/` 正源；行号直读。
- 钉值（只读）：
  - release 1,555,514 B / `98C7DDA548A56FC0493EB7470829B20B8875BC30072B2ADBF6C922D7067A81D7`
  - dev 1,527,060 B / `505E41D07B6CF8AE7EF639B14D62E660CEC26850ED0CC5781CBDD1416D5ABD59`
  - sources 1,364,511 B / `3236CB46F304C9C438614B4775347D14D8B052EFEFB09D6665B2D495A18106AF`
  - MK classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
  - HEAD `24c2350ea815a81f44df4e3ac11f4244d813b118` 未变；port 0/0、crash 0/0
- 判窗：`testharness/reports/b69-verify-receipt.md`（29,354 B / 334 行，§r10.0-§r10.4）；tee `testharness/build-logs/b69-b69r10-b1.out`（533,373 B / 3,716 行）。
- r10 JSON：`{"run":"b69r10","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0}`。
- 被核文件：`mixins/MixinItemSkull.java` 63 行；`mixins/MixinItemBlock.java` 100 行；`world/ETIMMountRules.java` 356 行；`world/ETIMBlockSpark.java` 126 行；`mixins/MixinItemSign.java` 76 行。

## §1 三条阻断逐条闭环判定

| 条目 | 判定 | 依据 |
|---|---|---|
| A-B69-5 骷髅真实物品绕过 `World.mayPlace` | **PASS**（该阻断已闭环；另有 A-B69-8 面判残余） | `MixinItemSkull.java:31-35` 注入 `ItemSkull.onItemUse` HEAD；`:43-58` 按 `ItemSkull.java:43/49-53/54-66` 复原 landing/mountedOn；`:59-60` 调 `rejectsPlacement(..., Blocks.SKULL)`。`mixins.etim.json:33` 已登记，refmap 有 `MixinItemSkull.onItemUse → ItemSkull;func_180614_a`。r10 真实臂：`:3636` 刷怪笼侧 `never-hides reject`、落点 air；`:3648` 石头侧 `geometry allow`、落物 `minecraft:skull`。 |
| A-B69-6 farmland/jukebox 早于子类臂 | **PASS** | `ETIMMountRules.java:147-206` 子类臂先跑；farmland 退到 `:210-211`、jukebox 退到 `:212-214`，序为子类臂 → farmland/jukebox → 基类禁止 → geometry。r10：`:3453` 唱片机顶 `torch-flat-top allow` + `:3456` 探针真落火把（原 air 断言已改）；`:3659` 耕地侧 `trapdoor-material reject`，耕地顶火把仍 `tilled-field` + grant。 |
| A-B69-7 活板门半高匹配 | **FAIL（仍阻断）** | `ETIMMountRules.java:185-190`：`trapdoorHalfMatches` 为 true 才记 `trapdoor-shape`；`trapdoorLower != null` 且半砖不匹配时返回 false，既不进 `trapdoorLower == null` 的 defer 分支，也不置 `reject = true`，`rule` 保持 null，随后基类 `:230-231` 落 `geometry` **allow**。`trapdoorHalfMatches` 见 `:280-293`（slab 半匹配、stairs `(meta & 4) == wantLower`、snow 只允许 lower）。R196 `BlockTrapDoor.java:172-190` 对错半明确拒绝。r10 只测了正确下半：`:3670 trapdoor-shape allow` + `:3671 trapdoor-shape-defer allow`，无错半用例。 |

## §2 残余与建议

### A-B69-8（新发现，A 级；牌/骷髅直连路径缺 R196 面判）

- `MixinItemSign` 与 `MixinItemSkull` 都绕过 `World.mayPlace`（`ItemSign.java:31-86`、`ItemSkull.java:41-78` 均不调用它），所以 `ETIMMountRules` 基类 `geometry` 的“交给 vanilla `canPlaceBlockOnSide`”假设失效：1.12 `ItemSign.java:36` / `ItemSkull.java:60` 只查 material solid / isSideSolid，不查逐面 flat-solid。
- 现状：`ETIMMountRules.java:230-231` 的 `geometry` 为纯 allow；`MixinItemSign`/`MixinItemSkull` 只送 R196 禁止项。故站立牌/墙牌/骷髅在以下 R196 拒绝位仍会放行：
  - bottom slab 顶/侧（R196 `BlockSlab.java:83-86` 仅允许 bottom slab 的 bottom face、top slab 的 top face）；
  - stairs 非平贴面（R196 `BlockStairs.java:366-387` 按 metadata 朝向/半砖）；
  - thin snow 顶/侧（R196 `BlockSnow.java:153-157` depth==1 false，否则 bottom 或 max depth）；
  - enchantment table 顶/侧（R196 `BlockEnchantmentTable.java:94-97` 仅 bottom）。
- R196 依据：`BlockSign.java:3` extends `BlockMountedWithTileEntity`，无 `canMountToBlock` 覆写，基类 `isFaceFlatAndSolid` 即其几何门；`BlockSkull.java:57-73` 顶面用 `isFaceFlatAndSolid`，侧面走 `super.canMountToBlock`。
- 建议：为 direct path 增加 R196 `isFaceFlatAndSolid` 等价臂（仅 `MixinItemSign`/`MixinItemSkull` 调用，避免影响已由 1.12 原生几何兜底的 `ItemBlock` 路径），不要用 blanket `isSideSolid`。与 A-B69-7 同批修；r10 的 `:3648 skullStoneReal` 只覆盖 stone 平面，不能证明这些支撑位。

### A-B69-7 修法

- 在 `ETIMMountRules.java:185-190` 对 `isSingleSlab || BlockStairs || SNOW_LAYER && snowLayers > 3` 的支撑，当 `trapdoorLower != null` 且 `!trapdoorHalfMatches` 时置 `rule = "trapdoor-half"; reject = true`；`trapdoorLower == null` 才保留 `trapdoor-shape-defer`。
- 补 wrong-half 用例：下半砖 + `hitY > 0.5`、上半砖 + `hitY <= 0.5`、stairs 两种半、厚雪上半，均须 air。

### B-B69-8（非阻断，文档残）

- `ETIMBlockSpark.java:20` 仍写 `BlockSpark.java:1-54`（R196 文件 53 行）；`:27` 写 `:29-52`，实际 `onBlockAdded :22-26`、`updateTick :29-37`、icons `:40-52`。任务称已改 `:22-27 / :29-52`，实际仅起点改对，尾行仍漂。

### C 级注记

- `ETIMMountRules.java:183-184` 的 `trapdoor-glass` 分支不置 `reject`，但 `:180` 的 `hingeMaterialOk` 已排除 glass，属死码，无行为影响。
- `ETIMMountRules.java:81` javadoc 仍写 `BlockTrapDoor.java:163-193`，R196 方法实际 `:162-193`。
- r10 回执 §r10.2 自判 A=0/B=0，但未覆盖 A-B69-7 错半与 A-B69-8 的 sign/skull 非平面支撑，不能据此认定闭环。

## §3 终判

**退回。** blocking：A-B69-7（错半活板门仍落 `geometry allow`）、A-B69-8（牌/骷髅直连路径缺 R196 `isFaceFlatAndSolid` 面判，可在 slab/stairs/thin snow/enchantment 支撑上过放）。A-B69-5、A-B69-6 已通过；B-B69-8 为非阻断文档残。修 A-B69-7/8、补错半与 direct-path 用例后，可再复签。
