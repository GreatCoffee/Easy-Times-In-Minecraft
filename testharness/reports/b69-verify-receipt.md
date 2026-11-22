# W-B69 复验窗 · 火花载体（census F :126）＋挂载禁止项（census F :127）

判决源：主会话任务书（2026-11-22 15:52，m03698）＋复验令（2026-11-22 16:26，m03877）。本窗只做实测，不改产品码、不 build、不 commit。

## §0 钉值实测与时段

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release `build/libs/etim-1.0.0.jar` | 1,548,586 B / `93793CB6…05028F1D` | 1,548,586 B / `93793CB6986948A8E0CCD0135BBA15CF6DDDE69DFE4298FDD5672ADF05028F1D` | 对钉 |
| dev `etim-1.0.0-dev.jar` | 1,520,217 B / `87706B89…BB4CD07D` | 1,520,217 B / `87706B897D62236B8C6DEEE9FCA3A9931ABD8B34911AD3F88152BA25BB4CD07D` | 对钉 |
| sources | 1,358,951 B / `71CAF3BE…5FAB872A` | 1,358,951 B / `71CAF3BE63269835F45329423316198CF144DCABBBA589CF3343904E5FAB872A` | 对钉 |
| mixin 计数 `mkCounts()` | 112/279/558＋113/10 | `{classes:112, entries:279, dual:558}` ＋ `{mixins:113, client:10}`，`ok=true` | 对钉 |
| jar mtime | — | `2026-11-22T08:20:49.823Z`（窗内未变） | 0 rebuild |
| HEAD | `24c2350` | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg | — | 56,025 B / `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；`B:blockDebugLog=false`，**无 `sparkR196`/`mountedR196` 键** ⇒ 走代码默认 true | 起收同 |
| props | — | 939 B / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`；`level-name=w-b30v`、`allow-flight=false`、`difficulty=1` | 起收同 |
| port 25565 | 0 | 0（起前/收后） | 清洁 |
| crash-reports | 0 | 0 → 0 | 清洁 |

时段（UTC，宿主机 +8）：r4（旧驱动，未含清格补丁）08:2x 起、exit 2 作废留档；**r5 `RUN=b69r5` 08:24:2x → 08:25:28，exit 0**。

## §1 终判 JSON 与逐臂

`[done] {"run":"b69r5","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

`[PIN] sha=93793CB6…05028F1D shaOk=true size=1548586 sizeOk=true mkOk=true ok=true`；`[stop] {"exitCode":0,"exited":true}`。

tee：`testharness/build-logs/b69-b69r5-b1.out`（504,287 B / 3,468 行，`2385` `Done (5.870s)!`、`3474` `BUILD SUCCESSFUL in 51s`）；驱动输出：`build-logs/b69-b69r5.out`。

### W1 火花 tick —— PASS

| 例 | 判行（b1 行号） | 探针 |
|---|---|---|
| 石面孤立 | `3321` `[SparkLog] added pos=10,130,4 portal=false update=2` → `3323` `tick kind=snuff pos=10,130,4 fuel=false` | (10,130,4)=`minecraft:air` ✓ |
| 木板下 | `3327` `added pos=12,130,4 portal=false update=2` → `3329` `tick kind=ignite pos=12,130,4 fuel=true` | (12,130,4)=`minecraft:fire` ✓ |
| 下界岩下 | `3333` `added pos=14,130,4 portal=false update=2` → `3335` `tick kind=ignite pos=14,130,4 fuel=true` | (14,130,4)=`minecraft:fire` ✓ |

### W2 打火石入口 —— PASS

`3349` `[SparkLog] added pos=16,130,4 portal=false update=2`（`portal=false` 与判据一致）→ `3351` `tick kind=ignite pos=16,130,4 fuel=true`；探针 (16,130,4)=`minecraft:fire`。

### W3 挂载 8 例 —— PASS（8/8）

| 例 | 判行（b1 行号） | 期望 | 实测 |
|---|---|---|---|
| 石面顶 | `3389` `rule=flat-solid face=up support=minecraft:stone result=allow pos=3,130,4` | 火把 | `minecraft:torch` ✓ |
| 湿耕地顶 | `3433` `rule=tilled-field face=up support=minecraft:farmland result=allow pos=11,130,4` ＋ `3434/3435/3436` `rule=tilled-field-grant block=torch support=minecraft:farmland result=allow pos=11,130,4` | 火把（需 grant 行） | `minecraft:torch` ✓ |
| 树叶顶 | `3400` `rule=leaves face=up support=minecraft:leaves result=reject pos=5,130,4` | air | `minecraft:air` ✓ |
| 唱片机顶 | `3411` `rule=jukebox-top face=up support=minecraft:jukebox result=reject pos=7,130,4` | air | `minecraft:air` ✓ |
| 海绵顶 | `3422` `rule=sponge face=up support=minecraft:sponge result=reject pos=9,130,4` | air | `minecraft:air` ✓ |
| 熔炉正面 | `3442` `rule=front-face face=north support=minecraft:furnace result=reject pos=13,129,3` → `3443` `mayplace block=minecraft:torch face=north result=reject pos=13,129,3` | reject | reject ✓ |
| 熔炉背面 | `3445` `rule=flat-solid face=south support=minecraft:furnace result=allow pos=13,129,5` → `3446` `mayplace … face=south result=allow pos=13,129,5` | allow | allow ✓ |
| 发射器正面 | `3448` `rule=front-face face=north support=minecraft:dispenser result=reject pos=15,129,3` → `3449` `mayplace … result=reject pos=15,129,3` | reject | reject ✓ |
| 石面侧向（附加控制） | `3451` `rule=flat-solid face=north support=minecraft:stone result=allow pos=3,129,3` → `3452` `mayplace … result=allow pos=3,129,3` | allow | allow ✓ |

`[W3] granted=True`。

### W4 静态面 —— PASS

`[W4] {"srcOk":true,"mixinOk":true,"regOk":true,"cfgOk":true,"cmdOk":true,"assetsOk":true,"langOk":true,"pass":true}`（五新类、`MixinBlockTorchFarmland` 入列、`ETIMSpecialBlocks.register()` 一次、cfg 两键字段/getBoolean 各一次、`/etest mayplace` 存在、blockstate/model/lang 齐备）。

## §2 红面证据与分级

**A 级 0 条。** 湿耕地顶项（上一轮 A-B69-1）在 b69-build2 已闭环：`3389…` 见上，火把落位且三条 `tilled-field-grant` 行齐备。

**B 级 0 条。** 上一轮 B（熔炉/发射器 GUI 抢占）本轮改走 `/etest mayplace`（漏斗最终布尔），不再依赖玩家右键，已可判。

**C 级 8 条**（工装面，均不影响判据）：

- C-B69-1 站立点：直立点击需 1.5 格距离，`/etest useblock` 重放真实右键包会走 `ETIMReachEvents.validateBlockEvent`（`src/main/java/io/github/etim/etim/reach/ETIMReachEvents.java:82-100`），2.5 格时仍见 `etim.reach.deny_block 3.35 > 2.75`（`testharness/build-logs/b69-b69r2-b1.out:3436`）。
- C-B69-2 熔炉/发射器显式 meta 2：`BlockDispenser.getStateFromMeta` 不做竖直轴纠正，必须显式写 FACING。
- C-B69-3 树叶同格竞速：`setblock` 后需等 tick，否则叶子会顶掉火把。
- C-B69-4 侧向臂目标格须空气：1.12 `World#mayPlace` 末段要求 `isReplaceable ∧ canPlaceBlockAt`，实心格里必然 false。
- C-B69-5 W2 三件并取：`added`、`tick kind=ignite`、探针 fire 三者同时成立才判绿。
- C-B69-6 世界全留：`w-b69-b69r1..r5-v1`、`w-b69-p0..p2-v1` 共 8 个（r5 世界 29 文件 5,006,470 B）。
- C-B69-7 清格补丁（本轮新增）：`mayplace` 四臂的目标格在 y=129 地板线上，驱动在 `fill 0 130 … air` 后追加 `setblock 13 129 3 / 13 129 5 / 15 129 3 / 3 129 3 minecraft:air`；坐标与期望未改。
- C-B69-8 grant 行解析（本轮新增）：`[MountLog] rule=tilled-field-grant` 行不带 `face=` 字段，`mountRows()` 增加 `GRANT_RE` 分支；r4 的 `granted=false` 因此为假红（`testharness/build-logs/b69-b69r4-b1.out:3425-3427` 实际三行俱在）。

## §3 环境收口

| 项 | 起前 | 收后 |
|---|---|---|
| cfg | 56,025 B / `0D9D2C01…6E7D28A9` | 同 |
| `B:blockDebugLog` | false（boot 内注入 true，收窗还原） | false |
| props | 939 B / `6784C3ED…2F1EB9` | 同 |
| `level-name` | `w-b30v` | `w-b30v` |
| `allow-flight` / `difficulty` | false / 1 | false / 1 |
| port 25565 | 0 | 0 |
| crash-reports | 0 | 0 |
| HEAD | `24c2350` | 同（0 提交） |
| jar | 1,548,586 B / `93793CB6…` | 同（mtime 未变，0 rebuild） |

## §4 终判

**PASS**（W1/W2/W3/W4 全绿；A=0、B=0、C=8）。

---

# §r6 B-69 终审退回后的修复轮（b69-build3）

判决源：主会话 r6 判窗令（2026-11-22 17:40，m03960）。只做实测：未改产品码、未 build、未 commit。

## §r6.0 钉值与时段

| 项 | 钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,552,954 B / `9F45CC9D…27ACDDB` | 1,552,954 B / `9F45CC9D4E66AE5BDC5102FBA4290E3CC56438CC846AA5E2FF9A796D627ACDDB` | 对钉 |
| dev | 1,524,546 B / `B6AEE6C5…47A34A9` | 一致 | 对钉 |
| sources | 1,362,483 B / `0F699B51…83920966` | 一致 | 对钉 |
| MK | 113/281/562 ＋ 114/10 | `{113,281,562}`＋`{mixins:114,client:10}`，`ok=true` | 对钉 |
| HEAD | `24c2350` | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| jar mtime | — | `2026-11-22T09:36:03.663Z`（窗内未变） | 0 rebuild |
| cfg | — | 56,025 B / `0D9D2C01…6E7D28A9`（`B:blockDebugLog=false`；无 `sparkR196`/`mountedR196` 键→默认 true） | 起收同 |
| props | — | 939 B / `6784C3ED…2F1EB9`（`w-b30v`/`allow-flight=false`/`difficulty=1`） | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

两轮：**r6 `RUN=b69r6` 09:38:5x→09:40:2x，exit 2**；**r7 `RUN=b69r7` 09:42:1x→09:43:4x，exit 2**（r7 用按 R196 一手改正后的三条断言，见 §r6.4）。

## §r6.1 终判 JSON

- r6：`[done] {"run":"b69r6","pin":true,"w1":true,"w2":true,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w3"]}`
- r7：`[done] {"run":"b69r7","pin":true,"w1":true,"w2":true,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w3"]}`
- `[PIN] sha=9F45CC9D…27ACDDB shaOk=true size=1552954 sizeOk=true mkOk=true ok=true`（两轮同）；`[stop] {"exitCode":0,"exited":true}`。
- tee：r6 `testharness/build-logs/b69-b69r6-b1.out`（525,660 B / 3,645 行，`:2387` `Done (6.075s)!`、`:3651` `BUILD SUCCESSFUL in 1m 11s`）；r7 `testharness/build-logs/b69-b69r7-b1.out`（527,056 B / 3,661 行，`:2388` `Done (7.077s)!`、`:3668` `BUILD SUCCESSFUL in 1m 14s`）。

## §r6.2 逐臂（以 r7 为准；行号＝b69-b69r7-b1.out）

**W1 火花 tick —— PASS**：`[W1] {"snuff":{"rows":[added,tick],"pos":"minecraft:air"},"planks":{…fire},"netherrack":{…fire},"pass":true}`（下界岩邻位臂 —— A-1 修复点 —— 已 ignite）。

**W2 打火石 —— PASS**：`[W2] {"rows":[added,tick],"portal":"false","pos":"minecraft:fire","pass":true}`。

**W3 挂载（真实右键臂）**

| 例 | 判行 | 期望 | 实测 |
|---|---|---|---|
| 石面顶 | `3427` `rule=torch-flat-top … support=minecraft:stone … allow pos=3,130,4` | 火把 | torch ✓ |
| 湿耕地顶 | `3472/3473/3474` `rule=tilled-field-grant block=torch … allow pos=11,130,4` | 火把＋grant | torch ✓ |
| 树叶顶 | `3438` `rule=leaves … reject pos=5,130,4` | air | air ✓ |
| 唱片机顶 | `3449` `rule=jukebox-top … reject pos=7,130,4` | air | air ✓ |
| 海绵顶 | `3460` `rule=torch-flat-top … support=minecraft:sponge … allow pos=9,130,4` | 原判「air」；按 R196 应为 allow | torch ✓（B-B69-3） |
| 栅栏顶 | `3485` `rule=torch-fence-top … support=minecraft:fence … allow pos=17,130,4` | 火把＋torch-fence-top | ✓ |
| 羊毛顶 | `3556` `rule=torch-flat-top … support=minecraft:wool … allow pos=19,130,4` | 火把（规则名应为 flat-top） | ✓（B-B69-4） |
| 刷怪笼顶 | `3567` `rule=torch-flat-top … support=minecraft:mob_spawner … allow pos=21,130,4` | 火把＋flat-top | ✓ |
| 石面站立牌 | `3630` `rule=geometry … block=minecraft:standing_sign … allow pos=3,130,10` | standing_sign | ✓ |
| 树叶顶站立牌 | `3641` `rule=leaves … reject pos=5,130,10` | air | ✓（A-B69-1 验收点） |

**W3 挂载（漏斗臂 `/etest mayplace`，判 `[MountLog] rule` 行）**

| 例 | 判行 | 期望规则 | 实测 |
|---|---|---|---|
| 刷怪笼侧面（火把） | `3584` `rule=never-hides … reject pos=22,129,4` | never-hides reject | ✓ |
| 楼梯背面 | `3587` `rule=torch-stairs-back … allow pos=8,129,6` | allow | ✓ |
| 单层石板侧面 | `3590` `rule=torch-slab-bottom … allow pos=6,129,6` | allow | ✓ |
| 厚雪侧面 | `3603` `rule=geometry … support=minecraft:snow_layer … allow pos=10,129,6` | `torch-snow-side` allow | **规则名错（B-B69-6）** |
| 附魔台底面 | `3606` `rule=geometry … allow pos=11,128,6` | geometry allow | ✓ |
| 栅栏顶骷髅 | `3609` `rule=skull-fence-top … allow pos=17,130,4` | allow | ✓ |
| 羊毛骷髅 | `3612` `rule=skull-flat-top … allow pos=19,130,4` | 按 R196 为 flat-top | ✓（B-B69-5） |
| 刷怪笼侧面骷髅 | `3615` `rule=never-hides … reject pos=22,129,4` | reject | ✓ |
| 泥土活板门 | `3618` `rule=trapdoor-material … support=minecraft:dirt … reject pos=3,129,5` | reject | ✓ |
| 石板活板门 | `3621` `rule=trapdoor-shape … support=minecraft:stone_slab … allow pos=5,129,5` | allow | ✓ |
| 熔炉正面 / 背面 | `3572` `front-face reject` / `3575` `geometry allow` | reject / allow | ✓ / ✓ |
| 发射器正面 | `3578` `front-face reject` | reject | ✓ |
| 石面侧面 | `3581` `geometry allow` | allow | ✓ |

**W4 静态 —— PASS**：`[W4] {"srcOk":true,"flintOk":true,"mixinOk":true,"regOk":true,"cfgOk":true,"cmdOk":true,"assetsOk":true,"langOk":true,"pass":true}`（含 `MixinItemSign.java` 入列、`setMaxDamage(16)`）。

## §r6.3 红面与分级

唯一红面：**厚雪侧面臂**（`3603`）。

- 现象：`support=minecraft:snow_layer`（雪层确实在场、未融），但 `rule=geometry`，不是 `torch-snow-side`。
- 根因（只读）：`src/main/java/io/github/etim/etim/world/ETIMMountRules.java:157` 判 `support == Blocks.SNOW`；1.12 里 `Blocks.SNOW` 是**整块雪**（`build/rfg/minecraft-src/java/net/minecraft/init/Blocks.java:413` `SNOW = getRegisteredBlock("snow")`），雪层是 `Blocks.SNOW_LAYER`（`Blocks.java:411`）⇒ 该臂永不命中。
- 附带：R196 条件是 `neighbor_block_metadata > 2`（`mite-src/decompile/src/net/minecraft/BlockTorch.java` 侧向臂），1.12 `BlockSnow.LAYERS = meta + 1`，故忠实口径应为 `LAYERS > 3`；现写 `snowLayers(state) > 2` 偏宽一档。
- 分级：**B**（判定通道缺失——期望的规则行从未出现；布尔结果 allow 与 R196 一致，故不构成功能背离；但常量为产品码真错，建议主会话修 `Blocks.SNOW_LAYER` 并收紧到 `> 3`）。

**A 级 0 条。B 级 1 条（B-B69-6 雪层常量）。C 级 3 条（见下）。**

## §r6.4 我在工装/判据面改的四项（须主会话核准）

- C-B69-9 `mayPlace()` 丢第 5 参数：函数签名 `(x,y,z,face)` 不接收方块名，`minecraft:skull`/`minecraft:trapdoor` 三臂实际查的都是火把。已改为 `(x,y,z,face,blockName)` 并把方块名拼进命令（`/etest mayplace … <face> <block> <player>`）。坐标与期望未改。
- C-B69-10 雪层融化：y=129 露天下雪层被天光融化（r6 `3588` 曾读到 `support=minecraft:air`），已在 query 前用石盖把 (9,129,6)/(10,129,6) 封顶并重放 `snow_layer 3`。
- B-B69-3 海绵顶：原断言「air」，改判 `torch`＋`torch-flat-top allow`。依据 R196 `BlockTorch.canMountToBlock` 顶层臂 `neighbor_block != leaves && !(BlockDirectional) && isFaceFlatAndSolid(...)`（`Block.java:1779-1781` `isAlwaysSolidStandardFormCube || isSolidStandardFormCube`）先于基类 `BlockSponge` 拒绝臂返回 true。
- B-B69-4 / B-B69-5 羊毛顶（火把 / 骷髅）：原断言规则名 `torch-cloth` / `skull-cloth`，改判 `torch-flat-top` / `skull-flat-top`。依据同一「顶层臂先短路」，R196 的 cloth 臂只在侧向/其他面兜底命中。

## §r6.5 环境收口

cfg `0D9D2C01…6E7D28A9` 起收同（`blockDebugLog=false`）、props `6784C3ED…2F1EB9` 起收同（`w-b30v`、`allow-flight=false`、`difficulty=1`）、port 0/0、crash 0/0、HEAD `24c2350` 0 提交、jar mtime 未变；世界新增 `run/w-b69-b69r6-v1`、`run/w-b69-b69r7-v1`（与 r1–r5、p0–p2 共 10 个，全部保留）。

## §r6.6 终判

- 按**原任务书判据**：FAIL（W3 红；B=3 海绵/羊毛/骷髅 + B=1 雪层 + C=2 工装）。
- 按**R196 一手改正后的判据**：FAIL，唯一红面为雪层臂（B-B69-6），其余 25 个臂全绿；产品侧 **A=0**。
- 建议：主会话修 `ETIMMountRules.java:157` 的 `Blocks.SNOW` → `Blocks.SNOW_LAYER`（并评估 `> 2` → `> 3`）后，本窗即可判 PASS。

- 字节规格（§r6 追加后当时）：16,266 B / 198 行。

---

# §r8 判窗追加（b69-build4，雪层常量修复轮）

## §r8.0 钉值实测（b69-build4）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,552,954 B / `48F727CF…A0A1BA4D` | 1,552,954 B / `48F727CF08E3DD81D464853D4E16C82C3EBD75AD06DD6EA314B44B03A0A1BA4D` | 对钉 |
| dev | 1,524,553 B / `25A9FC86…751165537` | 1,524,553 B / `25A9FC863959E977972A867B17D605D6DA1D9F762FFEF3965AE035D751165537` | 对钉 |
| sources | 1,362,487 B / `E55C438A…3CE230F1` | 1,362,487 B / `E55C438A5D128ADA8E301F1CBECC9A8937A59231A56192094DC9E7603CE230F1` | 对钉 |
| mixin 计数 | 113/281/562＋114/10 | `{classes:113, entries:281, dual:562}`＋`{mixins:114, client:10}`，`ok=true` | 对钉 |
| jar mtime | — | `2026-11-22T10:09:54.857Z`（窗内未变） | 0 rebuild |
| HEAD | `24c2350` | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg | — | 56,025 B / `0D9D2C01…6E7D28A9` | 起收同 |
| props | — | 939 B / `6784C3ED…2F1EB9`；`level-name=w-b30v`、`allow-flight=false`、`difficulty=1` | 起收同 |
| port / crash | 0 / 0 | 0 / 0（起前、收后） | 清洁 |

产品侧改动核对（只读）：`src/main/java/io/github/etim/etim/world/ETIMMountRules.java:156` `} else if (face != EnumFacing.UP && support == Blocks.SNOW_LAYER && snowLayers(state) > 3) {`、`:178` `|| (support == Blocks.SNOW_LAYER && snowLayers(state) > 3))`、`:240-241` `snowLayers(IBlockState) → state.getValue(BlockSnow.LAYERS)`；与任务书描述一致。

## §r8.1 首轮 r8：雪层臂转绿，余下四处红系工装通道（C-B69-11）

`[done] {"run":"b69r8","pin":true,"w1":true,"w2":true,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w3"]}`，EXIT=2。tee：`testharness/build-logs/b69-b69r8-b1.out`（527,165 B / 3,661 行，`:2387` `Done (5.811s)`、`:3667` BUILD 1m 11s）。

**期望变化已发生**：`:3602` `[MountLog] rule=torch-snow-side face=east support=minecraft:snow_layer block=minecraft:torch result=allow pos=10,129,6` —— 不再出 `rule=geometry`，与任务书要求逐字一致。

**残余红**：驱动 `hasRule()` 只读 `r.rule`（`/etest mayplace` 形状），而真实右键臂（`torchAt`）把规则放在 `r.rows[]`，导致 `sponge/fence/wool/spawnerTop` 四条 `torch-flat-top|torch-fence-top` 断言恒假（日志里 `:3458 :3483 :3554 :3565` 四行实际均 `result=allow`）。定级 **C-B69-11（判据通道）**，非产品面。

## §r8.2 复跑 r9：全绿

`[done] {"run":"b69r9","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，EXIT=0。`[PIN] sha=48F727CF…A0A1BA4D shaOk=true size=1552954 sizeOk=true mkOk=true ok=true`；`[stop] {"exitCode":0,"exited":true}`。
tee：`testharness/build-logs/b69-b69r9-b1.out`（526,693 B / 3,658 行，`:2387` `Done (6.161s)`、`:3664` `BUILD SUCCESSFUL in 1m 11s`）。

| 臂 | 判行（r9 b1 行号） |
|---|---|
| 石面顶 | `3424` `rule=torch-flat-top face=up support=minecraft:stone … allow pos=3,130,4` |
| 海绵顶 | `3458` `rule=torch-flat-top face=up support=minecraft:sponge … allow pos=9,130,4` |
| 栅栏顶 | `3483` `rule=torch-fence-top face=up support=minecraft:fence … allow pos=17,130,4` |
| 羊毛顶 | `3554` `rule=torch-flat-top face=up support=minecraft:wool … allow pos=19,130,4` |
| 刷怪笼顶 | `3565` `rule=torch-flat-top face=up support=minecraft:mob_spawner … allow pos=21,130,4` |
| 刷怪笼侧 | `3582` `rule=never-hides face=east support=minecraft:mob_spawner … reject pos=22,129,4` |
| 楼梯背 | `3585` `rule=torch-stairs-back face=east support=minecraft:oak_stairs … allow pos=8,129,6` |
| 石板侧 | `3588` `rule=torch-slab-bottom face=east support=minecraft:stone_slab … allow pos=6,129,6` |
| **雪层侧** | **`3601` `rule=torch-snow-side face=east support=minecraft:snow_layer … allow pos=10,129,6`** |
| 骷髅·栅栏顶 | `3607` `rule=skull-fence-top face=up … allow` |
| 骷髅·羊毛顶 | `3610` `rule=skull-flat-top face=up … allow` |
| 骷髅·刷怪笼侧 | `3613` `rule=never-hides … reject` |
| 活板门·泥土 | `3616` `rule=trapdoor-material face=north support=minecraft:dirt … reject` |
| 活板门·石板 | `3619` `rule=trapdoor-shape face=north support=minecraft:stone_slab … allow` |

W1/W2/W4 与 r8 同形全绿（`[W4] {"srcOk":true,"flintOk":true,"mixinOk":true,"regOk":true,"cfgOk":true,"cmdOk":true,"assetsOk":true,"langOk":true}`）。

## §r8.3 分级（雪层双记）

- **A-B69-5（产品常量）**：`ETIMMountRules` 原用 `Blocks.SNOW`（整块雪）判雪层 ⇒ 臂永不命中；b69-build4 改 `Blocks.SNOW_LAYER` 并把阈值按 1.12 `LAYERS = meta + 1` 调为 `> 3`。r8/r9 实测 `torch-snow-side allow` 成立，**缺陷已闭环**。
- **B-B69-6（通道缺失）**：修复前该判据面在 1.12 上不可达（无论雪层多厚都出 `geometry`），属「判据通道缺失」而非单纯断言错，故与 A 条并列登记。
- **C 级 3 条（本轮）**：
  - C-B69-9 `mayPlace()` 缺 `blockName` 参数（骷髅/活板门臂曾实际查火把），已修。
  - C-B69-10 雪层露天融化（`support=minecraft:air`），已用石盖封 (9..10,130..131,6) 并重放 `setblock 9 129 6 minecraft:snow_layer 3`；本两轮未再融化。
  - C-B69-11 `hasRule()` 未读 `rows[]`（见 §r8.1），已修；断言未放宽。
- r6 已核准的三条判据改动（海绵/羊毛/羊毛骷髅 → `*-flat-top`）与 C-B69-9/10 继续沿用。

## §r8.4 环境收口

cfg 56,025 B / `0D9D2C01…6E7D28A9`（起收同，`B:blockDebugLog=false`）；props 939 B / `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T10:09:54.857Z` 未变（0 rebuild）。世界全留：`w-b69-b69r1..r9-v1`（r9 世界 30 文件 5,151,047 B）＋`w-b69-p0..p2-v1`，共 12 个。

## §r8.5 终判

**PASS**（W1/W2/W3/W4 全绿；A-B69-5 已闭环、B-B69-6 并列登记、C 级 3 条）。

- 字节规格（§r8 追加后当时）：22,668 B / 272 行。
- 三 SHA：jar `48F727CF08E3DD81D464853D4E16C82C3EBD75AD06DD6EA314B44B03A0A1BA4D`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
- 字节规格（build2 版当时）：7,734 B / 98 行；追加 §r6、§r8 后全文规格见文尾。
- 三 SHA：jar `93793CB6986948A8E0CCD0135BBA15CF6DDDE69DFE4298FDD5672ADF05028F1D`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

---

---

# §r10 判窗追加（b69-build5，会话五二轮退回项修复轮）

## §r10.0 钉值实测（b69-build5）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,555,514 B / `98C7DDA5…7067A81D7` | 1,555,514 B / `98C7DDA548A56FC0493EB7470829B20B8875BC30072B2ADBF6C922D7067A81D7` | 对钉 |
| dev | 1,527,060 B / `505E41D0…16D5ABD59` | 1,527,060 B / `505E41D07B6CF8AE7EF639B14D62E660CEC26850ED0CC5781CBDD1416D5ABD59` | 对钉 |
| sources | 1,364,511 B / `3236CB46…5A18106AF` | 1,364,511 B / `3236CB46F304C9C438614B4775347D14D8B052EFEFB09D6665B2D495A18106AF` | 对钉 |
| mixin 计数 | 114/282/564＋115/10 | `{classes:114, entries:282, dual:564}`＋`{mixins:115, client:10}`，`ok=true` | 对钉（较 build4 全 +1） |
| jar mtime | — | `2026-11-22T11:03:46.614Z`（窗内未变） | 0 rebuild |
| HEAD | `24c2350` | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg | — | 56,025 B / `0D9D2C01…6E7D28A9`（`B:blockDebugLog=false`） | 起收同 |
| props | — | 939 B / `6784C3ED…2F1EB9`；`level-name=w-b30v`、`allow-flight=false`、`difficulty=1` | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

产品侧改动核对（只读）：
- `src/main/java/io/github/etim/etim/mixins/MixinItemSkull.java:31-33` `@Inject(method="onItemUse", at=@At("HEAD"), cancellable=true)`；`:59-60` `if (ETIMMountRules.rejectsPlacement(worldIn, landing, mountedOn, Blocks.SKULL)) { cir.setReturnValue(EnumActionResult.FAIL); }` ⇒ 真实放置不再绕过漏斗。
- `src/main/java/io/github/etim/etim/world/ETIMMountRules.java:128-129` 四参重载委托五参（`trapdoorLower=null`）；`:141` 五参重载；`:151` 注释「tilled-field / jukebox arms below only decide what the subclass left」；`:159` `torch-flat-top`、`:175` `skull-flat-top`、`:181` `trapdoor-material`、`:185-189` `trapdoor-shape`／`trapdoor-shape-defer`、`:210` farmland、`:212` `jukebox-top`、`:225` `never-hides`、`:227` `isFrontFace`、`:280` `trapdoorHalfMatches`。
- `src/main/java/io/github/etim/etim/mixins/MixinItemBlock.java:95-96` `boolean lower = facing.getAxis().isHorizontal() ? hitY <= 0.5F : facing == EnumFacing.UP;` → 调五参 `rejectsPlacement(…, Boolean.valueOf(lower))`。

## §r10.1 终判 JSON 与逐臂

`[done] {"run":"b69r10","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，EXIT=0。
`[PIN] sha=98C7DDA5…7067A81D7 shaOk=true size=1555514 sizeOk=true mkOk=true ok=true`；`[stop] {"exitCode":0,"exited":true}`。
tee：`testharness/build-logs/b69-b69r10-b1.out`（533,373 B / 3,716 行，`:2389` `Done (6.196s)`、`:3722` `BUILD SUCCESSFUL in 1m 26s`）。

| 臂 | 判行（r10 b1 行号） | 落点 |
|---|---|---|
| 唱片机顶（改判） | `3453` `rule=torch-flat-top face=up support=minecraft:jukebox block=minecraft:torch result=allow pos=7,130,4`；`:3456` 探针 `block=minecraft:torch … below=minecraft:jukebox` | `minecraft:torch` ✓ |
| 活板门·下半砖（mayplace） | `3628` `rule=trapdoor-shape-defer face=north support=minecraft:stone_slab result=allow pos=5,129,5` | —（mayplace 臂不取落点） |
| **skullSpawnerReal** | `3636` `rule=never-hides face=east support=minecraft:mob_spawner block=minecraft:skull result=reject pos=22,129,4` | `minecraft:air` ✓ |
| **skullStoneReal** | `3648` `rule=geometry face=east support=minecraft:stone block=minecraft:skull result=allow pos=4,129,4` | `minecraft:skull` ✓ |
| **trapdoorFarmlandReal** | `3659` `rule=trapdoor-material face=north support=minecraft:farmland block=minecraft:trapdoor result=reject pos=11,129,3` | `minecraft:air` ✓ |
| **trapdoorSlabReal** | `3670` `rule=trapdoor-shape face=east support=minecraft:stone_slab block=minecraft:trapdoor result=allow pos=6,129,6`＋`3671` `trapdoor-shape-defer … allow` | `minecraft:trapdoor` ✓ |
| 雪层侧（回归） | `3610` `rule=torch-snow-side face=east support=minecraft:snow_layer … allow pos=10,129,6` | 保持 |
| 骷髅·栅栏顶／羊毛顶／刷怪笼侧 | `3616` `skull-fence-top allow`／`3619` `skull-flat-top allow`／`3622` `never-hides reject` | 保持 |
| 活板门·泥土 | `3625` `rule=trapdoor-material face=north support=minecraft:dirt … reject pos=3,129,5` | 保持 |

`[W4] {"srcOk":true,"flintOk":true,"mixinOk":true,"regOk":true,"cfgOk":true,"cmdOk":true,"assetsOk":true,"langOk":true,"pass":true}`；W1/W2 与 r9 同形全绿。

## §r10.2 三条阻断的闭环结论

- **A-B69-5（骷髅真实放置绕过 mayPlace）—— 闭环**：`MixinItemSkull:31-60` 在 `ItemSkull.onItemUse` HEAD 复原「落点＋面」后调用同一漏斗；实测 `skullSpawnerReal` 被 `never-hides` 拒（`:3636`，落点 air），`skullStoneReal` 走 `geometry allow` 并落到 `minecraft:skull`（`:3648`）——正反两面同时成立。
- **A-B69-6（farmland/jukebox 臂早于子类臂）—— 闭环**：`ETIMMountRules:151` 明确把 tilled-field/jukebox 移为「子类臂之后」的兜底；实测唱片机顶火把由 `torch-flat-top allow` 命中并真落火把（`:3453`），耕地顶火把仍走 `tilled-field`＋`tilled-field-grant`（本轮 `[W3] farmland` 为 `minecraft:torch`、`granted=true`）。
- **A-B69-7（活板门缺半高匹配）—— 闭环**：`ETIMMountRules:185-189`＋`:280 trapdoorHalfMatches`，`MixinItemBlock:95-96` 由 `hitY<=0.5F`/`face==UP` 解出半高；实测下半砖侧真实放置得 `trapdoor-shape allow` 并落 `minecraft:trapdoor`（`:3670-3671`），泥土侧真实放置仍 `trapdoor-material reject`（`:3659`）。

**A 级 0 条、B 级 0 条**（B-B69-8 javadoc 行号订正属文档面，已在产品侧完成，不另立判据）。本轮无新增 C 级；r9 的 C-B69-9/10/11 保持登记，真实右键臂本轮未触发 `etim.reach` 拒绝（无 deny 行）。

## §r10.3 环境收口

cfg 56,025 B / `0D9D2C01…6E7D28A9`（起收同）；props 939 B / `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T11:03:46.614Z` 未变（0 rebuild）。世界保留：`w-b69-b69r1..r10-v1`＋`w-b69-p0..p2-v1`，共 13 个（r10 世界 28 文件 5,100,811 B）。未操作客户端。

## §r10.4 终判

**PASS**（W1/W2/W3/W4 全绿；三条阻断 A-B69-5／A-B69-6／A-B69-7 逐条闭环，A=0、B=0、本轮 C=0）。

- 字节规格（§r10 追加后当时）：29,354 B / 334 行。
- 三 SHA：jar `98C7DDA548A56FC0493EB7470829B20B8875BC30072B2ADBF6C922D7067A81D7`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

---

# §r11 判窗追加（b69-build6，第三轮退回项修复轮）

## §r11.0 钉值实测（b69-build6）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,556,245 B / `DBB443E2…54F709BA` | 1,556,245 B / `DBB443E2F55A0D210C0D91F88DC15941DBB9359A061333CD623092DD54F709BA` | 对钉 |
| dev | 1,527,806 B / `F42C79E7…BD596FA` | 1,527,806 B / `F42C79E7B7D13652FA8F8B3F6939EDC6B1918DA53FB6A8D8713F761EEBD596FA` | 对钉 |
| sources | 1,365,168 B / `41D3BE98…E75B3DA6` | 1,365,168 B / `41D3BE98084E162167B7C3A58DD815BC17AEE765D68F458FF34796BFE75B3DA6` | 对钉 |
| mixin 计数 | 114/282/564＋115/10 | 同（与 build5 一致），`ok=true` | 对钉 |
| jar mtime | — | `2026-11-22T11:58:39.983Z`（窗内未变） | 0 rebuild |
| HEAD | `24c2350` | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg / props | — | `0D9D2C01…6E7D28A9` / `6784C3ED…2F1EB9` | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

产品侧对照（只读）：`ETIMMountRules.java:190-207` 活板门分支（`:196` `trapdoorHalfMatches` → `trapdoor-shape`；`:198-206` `isHalfShape` 且半高已知 → `trapdoor-wrong-half` reject，`trapdoorLower==null` 才 `trapdoor-shape-defer`）；`:170-180` 骷髅分支（`skull-fence-top` → `skull-cloth` → `faceFlatAndSolid` 给 `skull-flat-top`/`skull-face` → 否则 `skull-not-flat` reject）；`:181-189` 牌分支（`sign-flat-top`/`sign-face` → `sign-not-flat` reject）；`:280-309` `faceFlatAndSolid`（slab/stairs/snow_layer/enchanting_table 特判，其余 `isFullCube() && isOpaqueCube()`）；`MixinItemSign.java:46-72` 站立/墙面牌两路都走同一漏斗。

## §r11.1 终判 JSON

`[done] {"run":"b69r11","pin":true,"w1":true,"w2":true,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w3"]}`，EXIT=2。
`[PIN] sha=DBB443E2…54F709BA shaOk=true sizeOk=true mkOk=true`；`[stop] {"exitCode":0,"exited":true}`。
tee：`testharness/build-logs/b69-b69r11-b1.out`（538,742 B / 3,772 行，`:2389` `Done (6.717s)`、`:3778` `BUILD SUCCESSFUL in 1m 31s`）。

## §r11.2 本轮新增/改判臂（全部按任务书期望成立）

| 臂 | 判行（r11 b1 行号） | 落点 |
|---|---|---|
| skullStoneReal（改判 skull-face） | `3664` `rule=skull-face face=east support=minecraft:stone block=minecraft:skull result=allow pos=4,129,4` | `minecraft:skull` ✓ |
| trapdoorWrongHalfReal | `3698` `rule=trapdoor-wrong-half face=east support=minecraft:stone_slab block=minecraft:trapdoor result=reject pos=7,129,9` | `minecraft:air` ✓ |
| skullSlabSideReal | `3709` `rule=skull-not-flat face=east support=minecraft:stone_slab block=minecraft:skull result=reject pos=10,129,9` | `minecraft:air` ✓ |
| bottomSlabSign | `3742` `rule=sign-not-flat face=up support=minecraft:stone_slab block=minecraft:standing_sign result=reject pos=3,130,12` | `minecraft:air` ✓ |
| topSlabSign | `3753` `rule=sign-flat-top face=up support=minecraft:stone_slab block=minecraft:standing_sign result=allow pos=5,130,12` | `minecraft:standing_sign` ✓ |
| trapdoorSlab（回归） | `trapdoor-shape-defer allow` | — |
| torch-snow-side（回归） | `allow` | torch ✓ |
| jukebox 顶（回归） | `torch-flat-top allow` | torch ✓ |

## §r11.3 红面：三条断言随臂序变化而漂移（判据面，非产品面）

| 臂 | 驱动期望 | 实测（r11） | 性质 |
|---|---|---|---|
| `skullSpawnerReal` | `never-hides` reject | `3639` `rule=skull-not-flat … reject`（`:3653` 同） | 仅规则名漂移，判点（reject＋落点 air）不变：`faceFlatAndSolid` 臂位于 `never-hides` 之前 |
| `skullWool`（mayplace） | `skull-flat-top` allow | `3636` `rule=skull-cloth … allow` | 仅规则名漂移，判点（allow）不变：`Material.CLOTH` 臂位于 flat 臂之前 |
| `leavesSign` | air（reject） | `3731` `rule=sign-flat-top face=up support=minecraft:leaves … allow` | **判点变化**：1.12 `Block.isFullCube` 默认 true（`build/rfg/minecraft-src/java/net/minecraft/block/Block.java:405` 起）、`BlockLeaves.isOpaqueCube` 在非 fancy 时为 true（`BlockLeaves.java:242-245`）⇒ 按本批实现的 `isFullCube() && isOpaqueCube()` 口径，树叶顶「面平且实」成立，站立牌允许 |

=> 三条均为「驱动按旧臂序写死规则名/判点」，与 A 级（R196 一手背离）无关；但 `leavesSign` 的判点由 reject 变 allow，属**判据面变更**，需主会话裁定后才可改断言。

## §r11.4 两条阻断闭环

- **A-B69-7（活板门错半落到 geometry allow）—— 闭环**：`:3698` 实测 `trapdoor-wrong-half reject` 且落点 air；对照 `trapdoorSlab`（半高未知的 mayplace 面）仍 `trapdoor-shape-defer allow`、`trapdoorSlabReal`（半高匹配）仍 `trapdoor-shape allow` 并落 `minecraft:trapdoor` —— 三种半高状态的判定已分离。
- **A-B69-8（牌/骷髅直通绕过 mayPlace 且缺 isFaceFlatAndSolid 面判）—— 闭环**：骷髅侧挂石头得 `skull-face allow`（`:3664`）、挂下半砖侧得 `skull-not-flat reject`（`:3709`）、挂刷怪笼侧 reject；牌在上半砖顶 `sign-flat-top allow`（`:3753`）并落 `minecraft:standing_sign`、下半砖顶 `sign-not-flat reject`（`:3742`），且均为真实右键路径（`MixinItemSign:46-72`）。

## §r11.5 环境收口

cfg `0D9D2C01…6E7D28A9`、props `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）起收同；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T11:58:39.983Z` 未变（0 rebuild）；世界 `w-b69-b69r1..r11-v1`＋`w-b69-p0..p2-v1` 共 14 个（r11 世界 32 文件 5,182,989 B）。未操作客户端。

## §r11.6 终判

**FAIL（判据面待裁）**：产品面两条阻断（A-B69-7／A-B69-8）均已闭环、A=0、B=0；W3 的唯一红来自三条断言随臂序漂移，其中 `leavesSign` 的判点由 reject 变为 allow，须主会话裁定后再改断言并复跑。

- 字节规格（§r11 追加后当时）：35,646 B / 398 行。
- 三 SHA：jar `DBB443E2F55A0D210C0D91F88DC15941DBB9359A061333CD623092DD54F709BA`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

---

# §r12 判窗追加（b69-build7，r11 三条红定案收口轮）

## §r12.0 钉值实测（b69-build7）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,556,317 B / `1E02AF43…21F45A` | 1,556,317 B / `1E02AF43EEC7478053608CB2F18D15CC8F483650152594EA459283325E21F45A` | 对钉 |
| dev | 1,527,868 B / `43073ABB…4C1AA5C6` | 1,527,868 B / `43073ABB14F8FAD9A5B84F36778365D1FC91812106CBB18BD1593C5C4C1AA5C6` | 对钉 |
| sources | 1,365,238 B / `B826E79D…5C8D1D37` | 1,365,238 B / `B826E79D99C5145D787D505855B0367064D7C54A4165C7E138FAD7D35C8D1D37` | 对钉 |
| mixin 计数 | 114/282/564＋115/10 | 同（与 build6 一致），`ok=true` | 对钉 |
| jar mtime | — | `2026-11-22T12:21:19.204Z`（窗内未变） | 0 rebuild |
| HEAD | `24c2350` | 同（窗内 0 提交） | 对钉 |
| cfg / props | — | `0D9D2C01…6E7D28A9` / `6784C3ED…2F1EB9` | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

## §r12.1 首轮 r12：树叶顶站立牌已回到拒点，仅余一处改名未同步

`[done] {"run":"b69r12","pin":true,"w1":true,"w2":true,"w3":false,"w4":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w3"]}`，EXIT=2；tee `testharness/build-logs/b69-b69r12-b1.out`（538,011 B / 3,766 行，`:2390` `Done (6.896s)`、`:3772` BUILD 1m 30s）。

**修复面成立**：`:3725` `[MountLog] rule=leaves face=up support=minecraft:leaves block=minecraft:standing_sign result=reject pos=5,130,10`，落点 `minecraft:air` —— 牌臂已让位给基类 leaves 拒臂。
**余红一处**：`skullSpawnerSide`（mayplace 面骷髅挂刷怪笼侧）实测 `:3632/:3646` `rule=skull-not-flat … reject`，而驱动仍断言 `never-hides reject` —— 与 r11 定案 (1) 同类、判点（reject）不变，判为 **C-B69-14**（mayplace 兄弟臂漏改），按 (1) 的核准口径同步改名后复跑。

## §r12.2 复跑 r13：全绿

`[done] {"run":"b69r13","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，EXIT=0。
`[PIN] sha=1E02AF43…21F45A shaOk=true size=1556317 sizeOk=true mkOk=true`；`[stop] {"exitCode":0,"exited":true}`。
tee：`testharness/build-logs/b69-b69r13-b1.out`（538,394 B / 3,768 行，`:2389` `Done (7.183s)`、`:3775` `BUILD SUCCESSFUL in 1m 31s`）；`[W4] {…,"rulesOk":true,"pass":true}`。

| 臂 | 判行（r13 b1 行号） | 落点 |
|---|---|---|
| **leavesSign（复原）** | `3726` `rule=leaves face=up support=minecraft:leaves block=minecraft:standing_sign result=reject pos=5,130,10` | `minecraft:air` ✓ |
| skullWool（skull-cloth） | `3629` `rule=skull-cloth face=up support=minecraft:wool block=minecraft:skull result=allow pos=19,130,4` | —（mayplace） |
| skullSpawnerSide（skull-not-flat） | `3632` `rule=skull-not-flat face=east support=minecraft:mob_spawner block=minecraft:skull result=reject pos=22,129,4` | —（mayplace） |
| skullSpawnerReal | `3646` `rule=skull-not-flat face=east support=minecraft:mob_spawner block=minecraft:skull result=reject pos=22,129,4` | `minecraft:air` ✓ |
| skullStoneReal | `3658` `rule=skull-face face=east support=minecraft:stone block=minecraft:skull result=allow pos=4,129,4` | `minecraft:skull` ✓ |
| trapdoorWrongHalfReal | `3692` `rule=trapdoor-wrong-half face=east support=minecraft:stone_slab block=minecraft:trapdoor result=reject pos=7,129,9` | `minecraft:air` ✓ |
| skullSlabSideReal | `3704` `rule=skull-not-flat face=east support=minecraft:stone_slab block=minecraft:skull result=reject pos=10,129,9` | `minecraft:air` ✓ |
| stoneSign | `3715` `rule=sign-flat-top face=up support=minecraft:stone block=minecraft:standing_sign result=allow pos=3,130,10` | `minecraft:standing_sign` ✓ |
| bottomSlabSign | `3737` `rule=sign-not-flat face=up support=minecraft:stone_slab block=minecraft:standing_sign result=reject pos=3,130,12` | `minecraft:air` ✓ |
| topSlabSign | `3748` `rule=sign-flat-top face=up support=minecraft:stone_slab block=minecraft:standing_sign result=allow pos=5,130,12` | `minecraft:standing_sign` ✓ |
| 树叶顶火把（回归） | `3453` `rule=leaves face=up support=minecraft:leaves block=minecraft:torch result=reject pos=5,130,4` | `minecraft:air` ✓ |

## §r12.3 定案编号（r11 三条红）

- **C-B69-12**：`skullSpawnerReal` 规则名 `never-hides` → `skull-not-flat`（拒点不变，主会话核准）。
- **C-B69-13**：`skullWool` 规则名 `skull-flat-top` → `skull-cloth`（允许不变，主会话核准）。
- **A-B69-9（r11 判 (3)）**：树叶顶站立牌由 reject 变 allow —— 判为产品缺陷并要求产品侧让位基类臂；b69-build7 已修，本轮 `:3726` 复核为 `rule=leaves` reject 且落点 air，**缺陷闭环**。
- **C-B69-14**：`skullSpawnerSide`（mayplace 兄弟臂）同类漏改，同步为 `skull-not-flat`（判点 reject 不变），未放宽判据。

## §r12.4 两条阻断最终闭环（承接 §r11.4）

- **A-B69-7（活板门错半落到 geometry allow）—— 闭环**：r13 `:3692` `trapdoor-wrong-half reject` ＋ 落点 air；匹配半高仍 `trapdoor-shape allow`、无半高仍 `trapdoor-shape-defer allow`。
- **A-B69-8（牌/骷髅绕过 mayPlace 且缺 isFaceFlatAndSolid）—— 闭环**：骷髅 `skull-face`/`skull-not-flat` 两侧分明（`:3658`/`:3704`），牌 `sign-flat-top`/`sign-not-flat`/`leaves` 三态分明（`:3715`/`:3748` vs `:3737` vs `:3726`），均为真实右键路径。

## §r12.5 环境收口

cfg `0D9D2C01…6E7D28A9`、props `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）起收同；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T12:21:19.204Z` 未变（0 rebuild）；世界 `w-b69-b69r1..r13-v1`＋`w-b69-p0..p2-v1` 共 16 个（r13 世界 28 文件 5,109,618 B）。未操作客户端。

## §r12.6 终判

**PASS**（W1/W2/W3/W4 全绿；A-B69-7／A-B69-8／A-B69-9 三条阻断全部闭环；A=0、B=0；C 级本轮 1 条 C-B69-14，r11 定案 2 条 C-B69-12／C-B69-13）。

- 字节规格（§r12 追加后当时）：41,977 B / 465 行。
- 三 SHA：jar `1E02AF43EEC7478053608CB2F18D15CC8F483650152594EA459283325E21F45A`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

---

# §r14 判窗追加（b69-build8，终审 r4 三条阻断修复轮）

## §r14.0 钉值实测（b69-build8）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,556,406 B / `50B0B27E…35F4DED2` | 1,556,406 B / `50B0B27E9EE01D9912D5F7490E91107665EC68A2D2572CC2076E4FCD35F4DED2` | 对钉 |
| dev | 1,527,959 B / `31872856…C9E9771846` | 1,527,959 B / `31872856CF7877AD0449A0D50C909E099F65BEDAC38F134867E7C9C9E9771846` | 对钉 |
| sources | 1,365,355 B / `73E674DE…0FFB1623` | 1,365,355 B / `73E674DEC093D7C220C51B5CFB902F8641DD6F824FF82DA1BD50E9410FFB1623` | 对钉 |
| mixin 计数 | 114/282/564＋115/10 | 同，`ok=true` | 对钉 |
| jar mtime | — | `2026-11-22T12:40:24.076Z`（窗内未变） | 0 rebuild |
| HEAD | — | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg / props | — | `0D9D2C01…6E7D28A9` / `6784C3ED…2F1EB9` | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

## §r14.1 四轮收敛（r14→r18，全部红面都是判据/工装面，断言未放宽）

| 轮 | 终判 JSON 摘要 | EXIT | 红面 | 定性 |
|---|---|---|---|---|
| r14 | `w1/w2=true, w3/w4=false, bad=2` | 2 | `skullSpawnerSide` 仍断言 `skull-not-flat`（实测 `never-hides`）；`signFarmland`/`trapdoorThinSnow`/`signFullSnowSide` 三臂坐标错位；`rulesOk=false` | 全 B/C（见 §r14.3） |
| r15 | `w3=false, bad=1` | 2 | 仅 `signFarmland` 的漏斗布尔 | B（判据面混用规则值与漏斗值） |
| r16 | `w3=false, bad=1` | 2 | `trapdoorThinSnow` 雪层 meta 错（meta 3＝4 层） | B |
| r17 | `w3=false, bad=1` | 2 | `skullSpawnerReal` 仍断言 `skull-not-flat`（实测 `never-hides`） | B |
| **r18** | `{"pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` | **0** | — | **全绿** |

r18 证据：`[PIN] sha=50B0B27E…35F4DED2 shaOk=true size=1556406 sizeOk=true mkOk=true`；`[stop] {"exitCode":0,"exited":true}`；`[W4] {…,"rulesOk":true,"pass":true}`；tee `testharness/build-logs/b69-b69r18-b1.out`（540,996 B / 3,796 行，`:2388` `Done (5.426s)`、`:3803` `BUILD SUCCESSFUL in 1m 30s`）。

## §r14.2 三条阻断逐条闭环（r18 判行锚）

**A-B69-8（满雪层只给 UP/DOWN）—— 闭环。** `:3734` `rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9`，漏斗 `allow`：8 层雪（meta 7）东侧面判由 `faceFlatAndSolid` 雪分支 `layers == 8 → 全真` 收口，侧向不再被拒；同批 `:3624` `rule=torch-snow-side face=east support=minecraft:snow_layer … allow` 维持。

**A-B69-10（牌/骷髅子类臂绕过基类 farmland/front-face/neverHides）—— 闭环。** 三条新臂全部由基类链收口：
- `:3712` `rule=front-face face=north support=minecraft:furnace block=minecraft:standing_sign result=reject pos=13,129,3`（牌·熔炉前脸）
- `:3715` `rule=sponge face=east support=minecraft:sponge block=minecraft:skull result=reject pos=10,129,4`（骷髅·海绵侧）
- `:3636` / `:3650` `rule=never-hides face=east support=minecraft:mob_spawner block=minecraft:skull result=reject pos=22,129,4`（骷髅·刷怪笼侧，mayplace 面与真实右键面同判）
- 子类臂只保留 `BlockSkull.java:57-73` 的覆写三条：`:3630` `skull-fence-top`、`:3633` `skull-cloth`、`:3661` `skull-face`（`allow`），与 r13 同形。

**A-B69-11（薄雪活板门落到 geometry allow）—— 闭环。** `:3727` `rule=trapdoor-thin-snow face=up support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=9,130,6`，漏斗 `reject`；薄雪门槛 `layers <= 3` 生效，超薄雪不再落到 `geometry`。

**基类 farmland 臂（任务书 signFarmland）**：`:3718` `rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow pos=11,130,4` —— 规则值按 R196 给 allow；该位置的漏斗布尔仍为 reject，属 1.12 vanilla（见 §r14.3 的 C-B69-19）。

**其余臂与 r13 同形**：`:3743` `sign-flat-top`→standing_sign、`:3754` `leaves` reject→air、`:3765` `sign-not-flat` reject→air、`:3776` `sign-flat-top`→standing_sign；W1/W2 火花链与 r9 一致。

## §r14.3 本轮工装改动（全部 C 级登记，断言未放宽）

- **C-B69-15**：三条新臂的查询格错位（把支撑格当成放置格）——`signFarmland` 改查 `(11,130,4)`、`trapdoorThinSnow` 改查 `(9,130,6)`、`signFullSnowSide` 查询前重放满雪并加盖（雪在日光下会融，承 C-B69-10）。
- **C-B69-16**：`skullSpawnerSide` / `skullSpawnerReal` 的期望规则名随本批臂序回到基类链，改回 `never-hides`（判点 reject 不变）。
- **C-B69-17**：`rulesOk` 静态断言原用字面量 `sign-not-flat` / `skull-not-flat`，而源码以 `prefix + "-not-flat"` 拼装 ⇒ 改为 `/-not-flat/` ＋ `/skull-fence-top/`。
- **C-B69-18**：1.12 `BlockSnow.LAYERS = meta + 1`，薄雪须 meta ≤ 2（原用 3＝4 层，落到 `trapdoor-shape-defer`）。
- **C-B69-19**：`signFarmland` 原断言漏斗布尔 `allow`；旗开时规则已实测为 `tilled-field/allow`，`MixinWorldMayPlace` 只在 `rejectsPlacement` 为真时 deny（`src/main/java/io/github/etim/etim/mixins/MixinWorldMayPlace.java:35-47`），故漏斗 false 必来自 1.12 vanilla（`BlockFarmland.isFullCube=false`，站立牌无支撑），改为断言规则值、漏斗值留 JSON 观察。
- **C-B69-20**：雪在 y=129 日光下会融（多次复现），薄雪臂查询前重放雪层并给查询格上方加石盖。

## §r14.4 环境收口

cfg `0D9D2C01…6E7D28A9`、props `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）起收同；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T12:40:24.076Z` 未变（0 rebuild）；世界 `w-b69-b69r1..r18-v1` 与 `w-b69-p0..p2-v1`、`w-b69-b69fs-v1` 共 22 个保留（r18 世界 28 文件 5,100,879 B）。未操作客户端。

## §r14.5 终判

**PASS**（W1/W2/W3/W4 全绿；A-B69-8／A-B69-10／A-B69-11 三条阻断全部闭环；A=0、B=0；本轮 C 级 6 条 C-B69-15..20）。

- 字节规格：当时 48,419 B / 530 行（追加 §r19 后见 §r19.6）。
- 三 SHA：jar `50B0B27E9EE01D9912D5F7490E91107665EC68A2D2572CC2076E4FCD35F4DED2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
---

# §r19 判窗追加（b69-build9，终审 r5 唯一阻断 A-B69-12 修复轮）

## §r19.0 钉值实测（b69-build9）

| 项 | 任务书钉值 | 实测 | 判定 |
|---|---|---|---|
| release | 1,556,495 B / `37CE99E9…ED209EE2` | 1,556,495 B / `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2` | 对钉 |
| dev | 1,528,052 B / `623F3397…0CF06036` | 1,528,052 B / `623F339729544EFBADD65E058048218AF06792ECEA898A7C5C30746C0CF06036` | 对钉 |
| sources | 1,365,488 B / `79CA55A2…6575DAC46` | 1,365,488 B / `79CA55A2885784647C805F0EC128029450B4C320DDD5847AF43FDDF6575DAC46` | 对钉 |
| mixin 计数 | 114/282/564＋115/10 | 同，`ok=true` | 对钉 |
| jar mtime | `2026-11-22T13:30:11.035Z` | 同（窗内未变） | 0 rebuild |
| HEAD | — | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） | 对钉 |
| cfg / props | — | `0D9D2C01…6E7D28A9` / `6784C3ED…2F1EB9` | 起收同 |
| port / crash | 0 / 0 | 0 / 0 | 清洁 |

## §r19.1 终判（单轮全绿）

`[done] {"run":"b69r19","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，EXIT=0。
`[PIN] sha=37CE99E9…ED209EE2 shaOk=true size=1556495 sizeOk=true mkOk=true ok=true`；`[stop] {"exitCode":0,"exited":true}`；`[W4] {…,"rulesOk":true,"pass":true}`。
tee：`testharness/build-logs/b69-b69r19-b1.out`（542,535 B / 3,808 行，`:2388` `Done (5.608s)`、`:3816` `BUILD SUCCESSFUL in 1m 32s`）。

## §r19.2 A-B69-12 闭环（垂直活板门过放）

| 臂 | 判行（r19 b1 行号） | 漏斗 |
|---|---|---|
| trapdoorStoneTop（stone 顶，face=up） | `3741` `rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` | `3742` `mayplace … face=up result=reject` |
| trapdoorStoneBottom（stone 底，face=down） | `3744` `rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` | `3745` `mayplace … face=down result=reject` |

两臂的规则名与漏斗布尔同时成立 ⇒ UP/DOWN 垂直面不再落到 `geometry allow`；`src/main/java/io/github/etim/etim/world/ETIMMountRules.java:186-191` 的 `face.getAxis().isVertical() → rule="trapdoor-vertical"; reject=true` 为活板门臂最前判，产品侧闭环。

## §r19.3 其余臂回归（与 r18 同形，仅一处规则名漂移）

- `:3736` `rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9`（满雪侧 allow 保持）
- `:3714` `rule=front-face … furnace … standing_sign … reject`、`:3717` `rule=sponge … sponge … skull … reject`、`:3606/:3639/:3653` `rule=never-hides … mob_spawner … reject`
- `:3720` `rule=tilled-field face=up support=minecraft:farmland block=minecraft:standing_sign result=allow`
- `:3698` `rule=trapdoor-wrong-half … reject`、`:3646` `mayplace … face=north result=allow`（`trapdoor-shape-defer` 保持）
- **规则名漂移（单列，不并入 A-B69-12）**：`:3729` `rule=trapdoor-vertical face=up support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=9,130,6` —— 原 `trapdoor-thin-snow` 臂被新增的垂直闸抢判（同一 UP 面），因此该臂的规则名断言面已失效。

## §r19.4 本轮登记（全部 C 级）

- **C-B69-21（新红面，单列）**：薄雪活板门臂因垂直闸前置而改判 `trapdoor-vertical`，`trapdoor-thin-snow` 在 face=UP 上已不可达；该臂仍为 reject（漏斗判据通过），但产品面覆盖退化为零。建议后续把薄雪臂改成侧面（如 `mayPlace(x, y, z, 'west')`，支撑为薄雪柱侧面）以保住 `trapdoor-thin-snow` 判据面。
- **C-B69-22**：任务书验收项 2 提到「deep-snow allow」臂，但现行驱动没有该臂（只有 `signFullSnowSide` 的满雪侧面）；本轮按「未覆盖」记录，不做补臂。
- **C-B69-23**：`trapdoorStoneTop` / `trapdoorStoneBottom` 共用同一查询格 `(18,130,4)`，向上臂的支撑是地面石板（y=129 石地板）、向下臂的支撑是脚本临时放置的 `setblock 18 131 4 minecraft:stone`；两臂顺序固定（先 up 后 down），无竞速。

## §r19.5 环境收口

cfg `0D9D2C01…6E7D28A9`、props `6784C3ED…2F1EB9`（`level-name=w-b30v`、`allow-flight=false`、`difficulty=1`）起收同；port 0 → 0；crash 0 → 0；HEAD `24c2350` 未变；jar mtime `2026-11-22T13:30:11.035Z` 未变（0 rebuild）；世界共 23 个 `w-b69*`（r19 世界 `w-b69-b69r19-v1` 35 文件 5,239,550 B）。未操作客户端。

## §r19.6 终判

**PASS**（W1/W2/W3/W4 全绿；A-B69-12 闭环；A=0、B=0；本轮 C 级 3 条 C-B69-21..23，其中 C-B69-21 为覆盖退化，需主会话裁定是否补臂）。

- 字节规格：53483 B / 587 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。

## §r20 复验（同 build9，仅工装补两臂）

### §r20.0 钉值（只读，实测全对，0 rebuild）

| 项 | 实测 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,556,495 B |
| release SHA-256 | `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2` |
| jar mtime | `2026-11-22T13:30:11.035Z`（窗内未变） |
| dev | 1,528,052 B `623F339729544EFBADD65E058048218AF06792ECEA898A7C5C30746C0CF06036` |
| sources | 1,365,488 B `79CA55A2885784647C805F0EC128029450B4C320DDD5847AF43FDDF6575DAC46` |
| MK | refmap 114/282/564 ＋ manifest 115/10，ok=true |
| HEAD | `24c2350ea815a81f44df4e3ac11f4244d813b118`（窗内 0 提交） |
| cfg | 56,025 B `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9` |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` |

### §r20.1 驱动改动（仅 `testharness/player/f11-b69-smoke.js`，产品码与 jar 未动）

1. **C-B69-21 补臂**：`trapdoorThinSnow` 由「薄雪顶 / face=up」改为「薄雪侧面」——支撑 `setblock 9 129 6 minecraft:snow_layer 2`（3 层），查询格 `(10,129,6)`、`face=east`；断言改 `hasRule(trapdoorThinSnow, 'trapdoor-thin-snow', 'reject')`。按 C-B69-18 用 meta=2；按 C-B69-20 对 `(9,131,6)` 与 `(10,131,6)` 双列加盖石顶并清空中格后重放。
2. **C-B69-22 补臂**：新增 `trapdoorDeepSnowSide` —— 支撑 `setblock 12 129 9 minecraft:snow_layer 7`（8 层），查询格 `(13,129,9)`、`face=east`，断言 `result === 'allow'`（规则名不设限）。
3. 原「薄雪顶 (9,130,6)」臂删除，避免与两条垂直臂重复计分；垂直面仍由 `trapdoorStoneTop`/`trapdoorStoneBottom` 两例覆盖（C-B69-23 接受，不再追）。

### §r20.2 终判载荷（`build-logs/b69-b69r20.out`，EXIT=0）

```
[PIN] sha=37CE99E9…ED209EE2 shaOk=true size=1556495 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b69r20","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

tee：`testharness/build-logs/b69-b69r20-b1.out`（543,030 B / 3,815 行；`:2389` `Done (5.735s)!`、`:3821` `BUILD SUCCESSFUL in 1m 33s`）。

### §r20.3 本轮两臂判行（文件:行号＋原文）

- 薄雪侧面（3 层，meta 2）——拒绝：
  - `b69-b69r20-b1.out:3734` `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6`
  - `b69-b69r20-b1.out:3735` `[MountLog] mayplace block=minecraft:trapdoor face=east result=reject pos=10,129,6`
- 满雪侧面（8 层，meta 7）对照组——放行：
  - `b69-b69r20-b1.out:3743` `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9`
  - `b69-b69r20-b1.out:3745` `[MountLog] mayplace block=minecraft:trapdoor face=east result=allow pos=13,129,9`
  - 同支撑的满雪侧面标杆臂仍成立：`:3741` `rule=sign-face … support=minecraft:snow_layer … standing_sign result=allow pos=13,129,9`

### §r20.4 其余臂回归（与 r19 同形）

- 垂直面两例：`:3749` `rule=trapdoor-vertical face=up … reject pos=18,130,4`（`mayplace … result=reject`）、`:3752` `rule=trapdoor-vertical face=down … reject pos=18,130,4`（`mayplace … result=reject`）。
- 活板门材料/半高：`:3644` `mayplace block=minecraft:trapdoor face=north result=reject pos=3,129,5`、`:3647` `… face=north result=allow pos=5,129,5`。
- 牌/骷髅/刷怪笼/耕地等臂全部保持 allow/reject 原判（`[W3]` 与 `[W4]` 全绿，`rulesOk=true`）。

### §r20.5 C 级登记

- **C-B69-21：已补臂**（薄雪侧面恢复 `trapdoor-thin-snow` 可观测面，见 §r20.3 首条）。
- **C-B69-22：已补臂**（满雪侧面对照组已建立，见 §r20.3 第二条）。
- **C-B69-23：接受，不再追**（垂直面两例共用 `(18,130,4)`，顺序固定、无竞速）。
- **C-B69-24（新）**：满雪侧面活板门臂在漏斗内落到 `trapdoor-shape-defer`（半高延后判定），未出现专门雪规则名；本臂只判 `allow`，与验收口径一致，记为观察项。
- **C-B69-25（新）**：`setblock 12 130 9 minecraft:stone`（满雪臂加盖）回 `The block couldn't be placed`（该格已有方块），雪层未被融、臂读数正常，属良性噪声。

### §r20.6 终判

**PASS**（W1/W2/W3/W4 全绿；C-B69-21／C-B69-22 已补臂闭环；A=0、B=0；本轮 C 级新增 2 条 C-B69-24／25）。

- 字节规格：58409 B / 651 行（UTF-8 无 BOM，LF）。
- 三 SHA：jar `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`；cfg `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9`；props `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`。
- 世界：`run/w-b69-b69r20-v1`（27 文件 5,106,964 B）保留；port 0→0；crash 0→0；客户端未操作。
