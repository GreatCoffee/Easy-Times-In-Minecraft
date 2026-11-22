# B-69 火花 + 挂载 终审复签 r6

发出者：会话五：ETIM终审
接受者：主会话：ETIM开发
生成时间：2026-11-22 22:05

## §0 复核源与钉值

- 产品 HEAD：`24c2350`（r19/r20 窗内未变）。
- release jar：1,556,495 B / SHA-256 `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`
- dev jar：1,528,052 B / SHA-256 `623F339729544EFBADD65E058048218AF06792ECEA898A7C5C30746C0CF06036`
- sources jar：1,365,488 B / SHA-256 `79CA55A2885784647C805F0EC128029450B4C320DDD5847AF43FDDF6575DAC46`
- MK：classes 114 / entries 282 / dual 564；mixins 115 / client 10。
- jar mtime：`2026-11-22T13:30:11.035Z`（r19/r20 窗内 0 rebuild）。
- 判窗：`testharness/reports/b69-verify-receipt.md` 58,409 B / 651 行；r20 JSON `{"run":"b69r20","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0}`。
- tee：`b69-b69r19-b1.out` 542,535 B；`b69-b69r20-b1.out` 543,030 B。
- 判决源：R196 一手 `mite-src/decompile/src/net/minecraft/`；1.12 载体 `build/rfg/minecraft-src/java/net/minecraft/`。

## §1 A-B69-12 闭环复核

| 检查面 | 判 | 依据（file:line） |
|---|---|---|
| 产品垂直闸 | **PASS** | `ETIMMountRules.java:185-192` 在 `BlockTrapDoor` 臂最前新增 `if (face.getAxis().isVertical()) { rule="trapdoor-vertical"; reject=true; }`，早于材料门/玻璃/薄雪/半砖臂。 |
| R196 依据 | **PASS** | `BlockTrapDoor.java:143-152` 的 `getDefaultMetadataForFaceMountedTo` 只映射 NORTH/SOUTH/WEST/EAST=0/1/2/3，UP/DOWN 返回 -1；`:156-160` 的 `getMetadataForPlacement` 对 UP/DOWN 得 -1；`Block.java:2818-2824` 的 `tryPlaceFromHeldItem` 明确 `metadata < 0 -> return false`。 |
| 判据 up | **PASS** | `b69-b69r19-b1.out:3741` `rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4`；`:3742` `mayplace ... result=reject`。 |
| 判据 down | **PASS** | `b69-b69r19-b1.out:3744` `rule=trapdoor-vertical face=down support=minecraft:stone ... result=reject pos=18,130,4`；`:3745` `mayplace ... result=reject`。 |
| 回归 | **PASS** | r20 `:3749`/`:3752` 同判重放；`:3734` thin-snow 侧面 reject；`:3744` deep-snow 侧面 defer allow；`[W3]/[W4]` 全绿。 |

结论：A-B69-12 **闭环**，无残余。

## §2 残余与新观察

### 已闭合项复核

- **A-B69-8 满雪六面**：`ETIMMountRules.java:303-312` layers==8 返回 true；r18 `:3734` 满雪侧 sign-face allow。PASS。
- **A-B69-10 牌/骷髅基类链**：牌臂仅注释；骷髅仅保留 `BlockSkull.java:57-73` 三条覆写；基类 `:225-257` 顺序生效；r18 `:3712` front-face、`:3715` sponge、`:3636`/`:3650` never-hides、`:3718` tilled-field 均符合。PASS。
- **A-B69-11 薄雪活板门**：`:191-201` thin-snow reject；r20 `:3734` face=east reject。PASS。
- **B-B69-8**：`ETIMBlockSpark.java:20` 已改 `BlockSpark.java:1-53`；`:27` 已改 `:29-37`。PASS。

### 非阻断项

- **C-B69-19（测试归因）**：`f11-b69-smoke.js:320` 的 `torchAt(11,129,4,'up')` 在 `11,130,4` 放火把；`:360` 的 `signFarmland` mayPlace 查询同格时未清空，故 false。不是 `BlockFarmland.isFullCube=false` 的 vanilla 限制；产品规则 `:3718 tilled-field allow` 已正确。重测前清空该格即可。
- **C-B69-21/22**：薄雪侧面与满雪侧面对照已补，r20 `:3734`/`:3744` 可观察；闭合。
- **C-B69-24（观察）**：满雪侧面 mayPlace 无半高信息，落 `trapdoor-shape-defer allow`；真实物品路径由 `MixinItemBlock.java:95-96` 带 lower 再判，未发现新过放。
- **C-B69-25（工装）**：r20 `setblock 12 130 9 stone` 失败，属测试布置，非产品。
- **C-B69-26（注释）**：`ETIMMountRules.java:81` 仍写 `BlockTrapDoor.java:163-193`，R196 方法实际 `:162-193`；非阻断。
- **C-B69-27（死码）**：`ETIMMountRules.java:195-196` 的玻璃分支不置 reject，但 `hingeMaterialOk` 已排除 GLASS；可删，非阻断。

## §3 终判

**放行。A-B69-12 已闭环；A-B69-8 / A-B69-10 / A-B69-11 / B-B69-8 均 PASS；未发现新的 blocking 项，可封批。**
