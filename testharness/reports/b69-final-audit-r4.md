# B-69 终审复签 r4（r13 全绿）

## §0 复核源与钉值

- 任务：主会话 m00807「B-69 终审终签」，只读复核，不改产品码。
- 产品 HEAD：`24c2350ea815a81f44df4e3ac11f4244d813b118`。
- release：1,556,317 B / SHA-256 `1E02AF43EEC7478053608CB2F18D15CC8F483650152594EA459283325E21F45A`。
- dev：1,527,868 B / `43073ABB14F8FAD9A5B84F36778365D1FC91812106CBB18BD1593C5C4C1AA5C6`。
- sources：1,365,238 B / `B826E79D99C5145D787D505855B0367064D7C54A4165C7E138FAD7D35C8D1D37`。
- MK：classes 114 / entries 282 / dual 564；mixins 115 / client 10。
- r13：`{"run":"b69r13","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`。
- 判窗回执：`git-workspace/etim/testharness/reports/b69-verify-receipt.md`，41,977 B / 465 行。
- 判窗日志：`git-workspace/etim/testharness/build-logs/b69-b69r13-b1.out`，538,394 B / 3,768 行。
- 代码盘面：`ETIMMountRules.java` 356 行；`MixinItemSign.java` 73 行；`MixinItemSkull.java` 63 行；`MixinItemBlock.java` 100 行；`ETIMBlockSpark.java` 126 行。

## §1 三条阻断闭环判定

| 条目 | 判 | 依据 |
|---|---|---|
| A-B69-7 活板门错半 | **PASS** | `ETIMMountRules.java:197-214` 已把 `trapdoorHalfMatches`、`trapdoor-shape-defer`、`trapdoor-wrong-half` 三态分开；`trapdoorLower != null` 且不匹配时 `:211-212` 置 `reject=true`，不再落到基类 `geometry`。r13 `:3692` 记录 `rule=trapdoor-wrong-half ... stone_slab ... reject` 且落点 air；匹配半高 `:3670` allow；`World#mayPlace` 无半高时 `:3628` defer。 |
| A-B69-8 牌/骷髅直通面判 | **FAIL** | `faceFlatAndSolid` 的雪分支 `ETIMMountRules.java:302-310` 在 `layers == 8` 只返回 `DOWN/UP`；R196 `BlockSnow.java:153-157` 为 `depth == 1 ? false : face.isBottom() || depth == getMaxDepth()`，深度 8 时**所有面**为 true。故 sign/skull 在满雪层侧面被 `sign-not-flat` / `skull-not-flat` 误拒；r13 无满雪侧用例，PASS 未覆盖。 |
| A-B69-9 站立牌树叶顶 | **PASS（仅该树叶项）** | r13 `:3726` `rule=leaves face=up support=minecraft:leaves block=minecraft:standing_sign result=reject` 且落点 air；`MixinItemSign` 的 `baseRejected` 已让位给基类 leaves 禁止臂。该 PASS 不覆盖下述 A-B69-10 的其余基类臂。 |

## §2 残余与建议

### §2.1 blocking

**A-B69-10（新，A 级）：sign/skull 子类臂绕过基类禁止项，导致过放与误拒。**

- `MixinItemSign` 的牌臂（`ETIMMountRules.java:181-196`）只把 `leaves / cloth / sponge / 唱片机顶` 四类交回基类；`MixinItemSkull` 的骷髅臂（`:170-180`）只处理 `fence 顶 / cloth / leaves / faceFlat`。两者都未执行基类的 `farmland`、`isFrontFace`、`neverHides` 判定。
- 已核 1.12 载体：`BlockFurnace`、`BlockDispenser`、`BlockDropper` 均满方块/不透明；`BlockSponge` 无 `isFullCube`/`isOpaqueCube` 覆写，同样满方块/不透明。`faceFlatAndSolid` 对这些支撑返回 true，于是：
  - **熔炉/发射器/投掷器前脸**：sign `sign-face` allow、skull `skull-face` allow；R196 `BlockMounted.java:35-37` 的 `face != getFrontFace(meta)` 应拒。
  - **骷髅挂海绵侧面**：`skull-face` allow；R196 `BlockMounted.java:27-31` 的 `BlockSponge` 应拒（牌因 `baseRejected` 含 sponge 已拒，骷髅漏）。
  - **牌/骷髅挂耕地**：`sign-not-flat` / `skull-not-flat` reject；R196 `BlockMounted.java:23-24` 的 `tilledField` 应 allow（`faceFlatAndSolid` 不含 farmland）。
- r13 未覆盖上述支撑，故回执的 A=0 不能证明闭环。
- 建议：牌直接回落到基类全臂，再对 direct path 执行 `faceFlatAndSolid`；骷髅顶面保留子类 flat allow，其余面回退基类。也可给 `rejectsPlacement` 增加 direct 标记，让基类 `geometry` 仅对 direct path 执行面判；不要再用 blanket `isSideSolid`。

**A-B69-11（新，A 级）：薄雪层活板门过放。**

- `ETIMMountRules.java:197-214` 的活板门臂只有 `isHalfShape`（`:274-277`）覆盖 `snowLayers > 3`；`layers 1-3` 不会进入 shape/defer/wrong-half 任一分支，最终落到基类 `:254-255` 的 `geometry` allow。
- R196 `BlockTrapDoor.java:188` 只允许 `snow meta > 2 && isLower`；其余走基类 `BlockSnow.java:153-157`：depth 1 全 false，depth 2-3 仅 `DOWN`。故薄雪顶/侧（以及 depth 1 底面）在 ETIM 被过放；r13 无薄雪活板门用例。
- 建议：给 `SNOW_LAYER && layers <= 3` 增加显式臂：`layers == 1` 全拒；`layers 2-3` 仅 `face == DOWN` 放行，其余 `trapdoor-thin-snow` reject。

### §2.2 非阻断残余

- **B-B69-8**：`ETIMBlockSpark.java:20` 仍写 `BlockSpark.java:1-54`（实际文件 53 行）；`:27` 已改为 `:29-37`（正确）。属注释尾差，不阻断。
- **C-B69-14**：r13 `skullSpawnerReal` 的规则名是 `skull-not-flat`，不是基类 `never-hides`；两处都 reject，判点不变，仅日志归因标签漂移。
- **C-B69-15**：`ETIMMountRules.java:81` javadoc 仍写 `BlockTrapDoor.java:163-193`，R196 方法实际 `:162-193`。
- **C-B69-16**：`ETIMMountRules.java:201-202` 的 `trapdoor-glass` 分支为死码（`hingeMaterialOk` 已在 `:198-200` 排除 glass），不产生行为。
- **C-B69-17**：r13 覆盖缺口——无熔炉/发射器/投掷器前脸的 sign/skull、无耕地 sign/skull、无满雪层侧面 sign/skull、无薄雪层活板门；补 A-B69-8/10/11 时一并补用例。

## §3 终判

**退回。** blocking：A-B69-8（满雪层侧面误拒）、A-B69-10（sign/skull 绕过基类 farmland/front-face/sponge 臂，前脸过放、耕地误拒）、A-B69-11（薄雪层活板门过放）。A-B69-7 PASS；A-B69-9 仅树叶项 PASS。修完并补 §2.2 所列用例后可再复签。
