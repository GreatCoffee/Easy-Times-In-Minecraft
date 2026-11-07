# 村庄田（village fields）· **W-B14 判决**（B-14 批，条 318-319，HEAD `ddf7901`）

> **HEAD**：`ddf7901`（窗内 **0 提交**，起收同）｜**jar**：`build/libs/etim-1.0.0.jar` **1,036,539 B**｜SHA256 `BAC93E868D1567605BE9E9CAB7B629C3F61B97F4987B5556E7E984A8D2966228`｜MD5 `4105F8E6AB7A0983B76713538E1A5358`（起收同值，**0 rebuild**）
> **refmap**：86 classes / 196 entries（dual 392，两棵树同值）｜**mixins**：83 + 10 client｜`MixinStructureVillageField1/2` 各含 `addComponentParts → func_74875_a(…World;Random;StructureBoundingBox;)Z` ＋ owner-class 双字段（全档 `func_74875_a` 计 2）；`MixinStructureComponent` 无 refmap 条目（设计面）
> **窗口**：2 boot（`Done (11.434s)`／`Done (12.051s)`，`mixinFail=0` ×2）＋2 停服（exit 0＋BUILD SUCCESSFUL）｜单假人 `ETIM_F7`｜seed `20261107`／`view-distance=16`｜世界 `w-b14v`（旗 on）／`w-b14w`（旗 off）｜**0 客户端／0 产品码改动**
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓**（4 臂全 ✓）
> 报告四值：`10,555 B｜UTF-8 无 BOM｜LF｜首字节 0x23｜CR 0｜U+FFFD 0｜76 行｜✓ 10 / ✗ 1`

## §1 逐臂判读

| 臂 | 判据 | 实测（关键计数） | 判 |
| --- | --- | --- | --- |
| **W0** 双 boot | `Done (` 命中＋`mixinFail=0`＋两停服 exit 0／build true | b1 `Done (11.434s)`、b2 `Done (12.051s)`，`mixinFail=0`×2；stops `exitCode=0 exited=true build=true`×2 | ✓ |
| **W1** r196ize 行道 | `villageField src=r196ized` 行 ≥1；types ≥1；每行 dead≥1／water≥1／flag=1；fieldMin 齐备 | rows=**5**、types=`["field2","field1"]`；deadTotal=**112**、waterTotal=**28**、logNormTotal=103；`zeroDead=[]`、`zeroWater=[]`，5 行 `flag=1` 全带 fieldMin | ✓ |
| **W2** 逐行死株采样 | 每行 fieldMin 四点采样 → `etim:dead_crop` 命中（deadHits≥1 硬线）＋同格活作物四连全 miss | probed=20、**deadHits=16**、liveHits=**0**（liveChecked=64）；4 例 miss 全为 `is Air (expected: Dead Crops)`（2 个不同格，见 C-14-2） | ✓ |
| **W3** 旗断零泄漏 | 旗 off boot 同 seed locate 命中后 `src=r196ized` 行 = 0 | located2=`Located Village at 824 (y?) -472`（hop0 命中，与 b1 同点）；flag-off rows=**0** | ✓ |

## §2 判行原文（`build-logs/f11-b14-verify-b1.out` / `-b2.out`）

**W0 · boot**
- `Done (11.434s)! For help, type "help" or "?"`（b1，`mixinFail=0`）
- `Done (12.051s)! For help, type "help" or "?"`（b2，`mixinFail=0`）
- `BUILD SUCCESSFUL in 1m 7s`（b1:11109）／`BUILD SUCCESSFUL in 38s`（b2:5937）

**W1 · r196ized 五行（含坐标与计数）**
- `[FarmLog] villageField src=r196ized type=field2 fieldMin=810,66,-468 dead=28 water=7 logNorm=28 flag=1`（b1:4205）
- `[FarmLog] villageField src=r196ized type=field1 fieldMin=835,63,-486 dead=21 water=7 logNorm=17 flag=1`（b1:4209）
- `[FarmLog] villageField src=r196ized type=field1 fieldMin=835,63,-486 dead=35 water=7 logNorm=30 flag=1`（b1:4219）
- `[FarmLog] villageField src=r196ized type=field2 fieldMin=800,70,-463 dead=24 water=6 logNorm=19 flag=1`（b1:4232）
- `[FarmLog] villageField src=r196ized type=field2 fieldMin=800,70,-463 dead=4 water=1 logNorm=9 flag=1`（b1:4251）
- `/locate`：`Located Village at 824 (y?) -472`（b1／b2 均 hop 0 命中）

**W2 · 采样回执（命中与 miss 原文）**
- `Successfully found the block at 811, 67, -467`（`etim:dead_crop`，b1:5942）
- `The block at 812, 67, -465 is Air (expected: Dead Crops)`（b1:6127）
- `Successfully found the block at 814, 67, -463`（b1:6299）
- `The block at 817, 67, -461 is Air (expected: Dead Crops)`（b1:6478）
- `Successfully found the block at 836, 64, -485`（b1:6661）｜`Successfully found the block at 801, 71, -462`（b1:8210）
- `The block at 807, 71, -456 is Air (expected: Dead Crops)`（b1:8705）
- 活作物四连（`wheat/carrots/potatoes/beetroots`）在 16 个命中格上 **全部未命中**（`Successfully found` 0 次，liveHits=0）；反查回执形如 `The block at 801, 71, -462 is Dead Crops (expected: Crops)`／`… (expected: Carrots)`／`… (expected: Potatoes)`／`… (expected: Beetroots)`（b1:10298/10324/10344/10361）

**W3 · 旗断**
- b2 全档 `villageField` 行 **0**（`flag-off r196ized rows=0`）；`Located Village at 824 (y?) -472` 仍命中（证明 locate 面正常，只是不进 r196ize）

## §3 冲突分级

- **A 级：0**　**B 级：0**　**D 级：0**
- **C 级：7（簿记／工装／口径；含主会话负证抓行的 C-14-7）**
  - **C-14-1**（口径·行数）：5 行里 fieldMin 有 2 对重复（`field1 835,63,-486` ×2、`field2 800,70,-463` ×2）。成因＝组件跨 chunk，vanilla 对每个相交 chunk 各调一次 `addComponentParts`，本批在每次 RETURN 各回调一次 `r196ize`，clip 窗口不同 → 分片计数（如 `field2 800,70,-463` 24→4、`field1 835,63,-486` 21→35）。`r196ize` 对已转死株/已翻空气的格不再命中，故幂等；**deadTotal 112 是分片累加值，不等于场地作物总数**。
  - **C-14-2**（判据·允许 miss）：W2 共 4 次 miss（20 探点中 16 命中），全为 `The block at … is Air (expected: Dead Crops)`，落在 **3 个不同格**（`812,67,-465`／`817,67,-461`／`807,71,-456`；最后一格因 `field2 800,70,-463` 双行各探一次而重复 2 次）。同相对偏移在别的格命中：dx=2,dz=3 在 `800,70,-463` 命中（`802,71,-460`）而在 `810,66,-468` 未命中；同一 field 的 [1,1]/[2,3]/[4,5] 命中、[7,7] 未命中 → 属地形/水淹/分片窗口面，落在任务书 T-B14-1 允许范围；`deadHits=16 ≥ 1` 硬线成立，`liveHits=0` 成立。
  - **C-14-3**（口径·RNG）：R196 骰流值在 1.12 不可复刻（既有 C-14-3 口径），本批判据为终面等效（块位／行道／块名），不比对随机序列。
  - **C-14-4**（基线观察·非本批引入）：全项目 `@Shadow` 字段在本 refmap 内**无任何条目**（196 条中 22 条字段条目全部来自 `*Accessor` 接口），含本批 `MixinStructureComponent.boundingBox`；而方法类注入目标条目正常（本批 `func_74875_a` ×2 在表）。属既有基线（B-5 起同形），本批仅继承；判窗无力覆盖生产包，建议主会话在生产面统一核查一次（不影响本窗判值）。→ **已判终（主会话窗外面实证，2026-11-07 10:02）：非缺陷**——@Shadow 字段由 mixin 运行时 classload 直绑、refmap 只管 `@Inject` 目标 remap；obf 服实证见 §5。
  - **C-14-5**（工装·干扰面）：驱动未做 `/kill @e[type=villager]`，但 `difficulty peaceful` 已在 boot 阶段设置、采样紧接 tp 执行（任务书 §五.5/6 允许）。
  - **C-14-6**（簿记·世界保留）：`w-b14v`／`w-b14w` 按任务书 §六⑤ 要求保留目录字面（未删），便于主会话复核。
  - **C-14-7**（工装·负证抓行）：主会话 `build-logs/b14-obf-boot.json` 的 `negatives[].actual` 抓到无关日志行（`[OreLog] …`／`[AILog] …`），系 `testforblock minecraft:wheat` 失败回执未命中预期正则时误取邻行；负证结论不受影响（四锚 `ok=false` ×4，wheat 反查 0），但后续负证建议按时间窗取紧邻回执行。

## §4 收口

- **cfg**：49,084 B `8382F0AEC00D8FC8D14327B1C5ED1DAA306CE55E3BB5CDF9B302813B8621C796` 起收同；`villageFieldsR196=true`、键数 249。
- **props**：939 B `80D12ACA9202EF0DC0BC166546FD30573432A8D1710D02D49E713C5DFAB7B683` 起收同（`level-name=w-b13a`／`level-seed=etim27`／`view-distance=10` 全部回写）。
- **jar/MK**：1,036,539 B／`BAC93E86…`／`4105F8E6…` 同；refmap 86/196（dual 392）同；mixins 83+10 同；`mkCounts().ok=false`（MK_PIN 仍钉 B-11，禁值/预期）。
- **残留**：crash **23→23**；端口 **0→0**；GradleStart JVM **0**；HEAD `ddf7901`（窗内 0 提交）；obf 30,524 B `262BFF5E…` 未动。
- **互通**（与主会话 r6 烟测）：5 行／deadTotal 112／waterTotal 28 **逐值同**，偏差 0。

## §5 附：C-14-4／D-13-1 窗外面实证（主会话，2026-11-07 10:02；非本窗判据，登记备查）

- **C-14-4 判终＝非缺陷**：`gradlew runObfServer`（srg 环）＋ mineflayer 通道起 obf 服（props `w-b14p`／seed `20261107`／vd 16），`Located Village at 824 (y?) -472`，四锚 `811,67,-467`／`814,67,-463`／`836,64,-485`／`801,71,-462` 的 `testforblock etim:dead_crop` **HIT 4/4**，同位 wheat 反查 **0**；`Done (11.967s)`、`mixinFailRows=[]`、etim@1.0.0 入 FML 握手。→ `MixinStructureVillageField1/2` 的 `addComponentParts→func_74875_a` 与 `MixinStructureComponent` 的 `@Shadow boundingBox` 在 obf 环**实证绑定**并产出正确地形；@Shadow 字段由 mixin classload 直绑，字段条目缺席 refmap 为设计面。
- **过程三幕（新案底，已入 build.gradle＋账册条 320）**：①首跑四锚全 MISS『no such block etim:dead_crop』——真因＝`runObfServer` 通道 etim 从未装载（`etimTestServerModsHold` 移走 jar，javaexec classpath 内无 etim jar），即 B-13 r5 的 `mixinFail=0` 系空证（主会话自认债务）；②jar 回 mods 触发 `DuplicateModsFoundException etim@etim-1.0.0.jar×2`——`Loader.findClasspathMods`（LaunchClassLoader 内的 jar，由 MixinBooter 注入）＋`LibraryManager.gatherLegacyCanidates` 双候选，`Loader.identifyDuplicates :466`（forge 1.12.2 `Loader.java:398-468`）；③终案＝etim 单源 javaexec classpath（`classpath = classpath + files('build/libs/etim-1.0.0.jar')`，缺 jar loud throw；hold 名单回补，mods 内无 etim）。
- **D-13-1 补讫**：`f13-b13-obf-boot.js` 现役链重跑 `Done (1.308s)`、`mixinFailRows=[]`、etim 实载行（`:132 Added etim`、`:498 etim:underworld 注册行`）、零 dup → B-13 `canGrow`／`canUseBonemeal`／`grow` 三位（`remap=true`）在 obf boot 绑讫，D-13-1 销案。
- **钉值不受影响**：本轮全案无源码变更（build.gradle 装载面修不进 jar），jar 1,036,539 B／`BAC93E86…` 保持有效；commit `182c36ce` 已落（origin 欠 1 待推）。

> 正本：`testharness/reports/b14-verify-verdict.md`｜byte 五项：`10,555 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 75（split 76）`
> SHA-256 甲（全档零位）`2AFF41C19C6450492F587E85F537BBFF0DE264496A2085561B339C30E0AFB407`
> SHA-256 乙（LF 归零零位）`2AFF41C19C6450492F587E85F537BBFF0DE264496A2085561B339C30E0AFB407`
> SHA-256 丙（行链零位）`45D6DE233E485364BC404C8509F5CB21F44500923DD190DCA66468B9423971BC`
