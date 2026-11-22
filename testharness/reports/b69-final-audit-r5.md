# B-69 火花 + 挂载 终审复签 r5

发出者：会话五：ETIM终审
接受者：主会话：ETIM开发
生成时间：2026-11-22 21:30

## §0 复核源与钉值

- 产品 HEAD：`24c2350`（与 r4 复签同一提交；工作树为 B-69 修复态）。
- release jar：1,556,406 B / SHA-256 `50B0B27E9EE01D9912D5F7490E91107665EC68A2D2572CC2076E4FCD35F4DED2`
- dev jar：1,527,959 B / SHA-256 `31872856CF7877AD0449A0D50C909E099F65BEDAC38F134867E7C9C9E9771846`
- sources jar：1,365,355 B / SHA-256 `73E674DEC093D7C220C51B5CFB902F8641DD6F824FF82DA1BD50E9410FFB1623`
- MK：classes 114 / entries 282 / dual 564；mixins 115 / client 10。
- 判窗：`testharness/reports/b69-verify-receipt.md` 48,419 B / 530 行；r18 JSON `{"run":"b69r18","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0}`。
- tee：`testharness/build-logs/b69-b69r18-b1.out` 540,996 B（任务书 3,796 行；本机 PowerShell split 3,806，属统计口径差）。
- 判决源：R196 一手 `mite-src/decompile/src/net/minecraft/`；1.12 载体 `build/rfg/minecraft-src/java/net/minecraft/`。

## §1 三条阻断逐条闭环

| 条目 | 判 | 依据（file:line） |
|---|---|---|
| A-B69-8 满雪层六面 | **PASS** | `ETIMMountRules.java:303-312`：layers==1 false、layers==8 true、其余仅 DOWN；与 R196 `BlockSnow.java:153-157`（depth==1 false，否则 bottom 或 depth==8）及 `BlockSnow.java:61-63`（depth=(meta&7)+1）一致。r18 `:3734` `rule=sign-face face=east support=snow_layer block=standing_sign allow`；`:3624` 火把雪侧维持 allow。 |
| A-B69-10 牌/骷髅基类链 | **PASS** | `ETIMMountRules.java:181-184` 牌臂只留注释，全部落 `:225-257` 基类顺序；骷髅 `:170-180` 只保留 `BlockSkull.java:57-73` 的 fence-top/cloth/flat-top 三条，其余落基类。r18 `:3712` `rule=front-face support=furnace block=standing_sign reject`；`:3715` `rule=sponge support=sponge block=skull reject`；`:3636`/`:3650` `rule=never-hides support=mob_spawner block=skull reject`；`:3718` `rule=tilled-field support=farmland block=standing_sign allow`。 |
| A-B69-11 薄雪活板门 | **PASS** | `ETIMMountRules.java:191-196`：`support==SNOW_LAYER && snowLayers<=3` 直接 `trapdoor-thin-snow` reject。R196 `BlockTrapDoor.java:188` 只接受 `snow && meta>2 && isLower`；薄雪侧面按 `BlockSnow.java:153-157` 为 false；R196 活板门垂直面 metadata 为 -1（见 A-B69-12），故薄雪无合法活板门位。r18 `:3727` `face=up` thin-snow reject；`:3670` deep-snow shape allow；`:3692` wrong-half reject；`:3628` mayplace defer。 |

## §2 残余与建议

### A-B69-12（新，blocking）垂直活板门过放

- R196 `BlockTrapDoor.java:143-152` 的 `getDefaultMetadataForFaceMountedTo(EnumFace)` 只返回 NORTH=0 / SOUTH=1 / WEST=2 / EAST=3，**UP/DOWN 返回 -1**。
- `BlockTrapDoor.java:156-160` 的 `getMetadataForPlacement` 对 UP/DOWN 得到 `-1 | ... = -1`；`Block.java:2818-2824` 的 `tryPlaceFromHeldItem` 明确 `metadata < 0 -> return false`。⇒ R196 活板门只能贴水平面，不能贴顶/底面。
- ETIM `ETIMMountRules.java:185-207` 只处理玻璃/薄雪/半砖/楼梯/厚雪，对普通满方块（stone 等）的 `face==UP/DOWN` 不置 `reject`，最终落 `:255-257` `rule="geometry"` **allow**；`MixinItemBlock.java:95-96` 对 `facing==UP` 还会给出 lower 值并调用规则。r18 无 stone 顶/底活板门用例，故 PASS 未覆盖。
- 修法：在 `ETIMMountRules` 的 `BlockTrapDoor` 臂最前面判 `face.getAxis().isVertical()` 即 `reject=true`（或对 `BlockTrapDoor` 统一在 `rejectsPlacement` 入口拒绝垂直面），并补 stone 顶/底两用例。R196 依据：`BlockTrapDoor.java:143-152`、`:156-160`、`Block.java:2818-2824`。

### C-B69-19（非阻断，测试归因需改）

- `f11-b69-smoke.js:320` 的 `torchAt(11,129,4,'up')` 已在 `11,130,4` 放置火把；`:360` 的 `signFarmland` mayPlace 查询同一格 `11,130,4` 时未先清空，于是 `World.mayPlace` 因目标格被占返回 false。
- 这不是 `BlockFarmland.isFullCube=false` 的 vanilla 限制；r18 `:3718` 的产品规则 `tilled-field allow` 已正确。把查询格清空或改到空位后重测即可。

### 其他非阻断

- `ETIMMountRules.java:189-190` 的 `support == Blocks.GLASS` 分支不置 reject，但 `hingeMaterialOk`（`:388-399`）已排除 GLASS，属死码；可删。
- `ETIMMountRules.java:81` javadoc 写 `BlockTrapDoor.java:163-193`，R196 方法实际 `:162-193`；行号尾差。
- B-B69-8 **PASS**：`ETIMBlockSpark.java:20` 已改为 `BlockSpark.java:1-53`；`:27` 已改为 `:29-37`。
- r18 未覆盖：垂直活板门、满雪侧以外的骷髅/牌支撑、薄雪底面；其中垂直活板门为 blocking，其余为覆盖建议。

## §3 终判

**退回。blocking：A-B69-12（R196 活板门仅允许水平面；ETIM 对 `face==UP/DOWN` 落 `geometry allow`，需在 trapdoor 臂拒绝垂直面并补 stone 顶/底用例）。A-B69-8 / A-B69-10 / A-B69-11 均 PASS；B-B69-8 PASS。**
