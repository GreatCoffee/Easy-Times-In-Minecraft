# B-62 验证正本 · 元素族十面（R196 EntityEarthElemental / EntityFireElemental / EntityClayGolem）

状态：**PASS**（A=0 / B=0 / C=9）
取证日：2026-11-21
烟测脚本：`testharness/player/f11-b62-smoke.js`
终判窗：`build-logs/b62-smoke-r10.out`（exit 0）
服务端日志：`build-logs/b62-r10-server.log`（世界 `w-b62-r10-v1`）

## §0 钉值

- build：`b62-build10`
- release：1,427,049 B `345C0CEE464F7733FF14AECE0451E9920E722F3BEED6D02ADD1AE2C7317E7ADB`
- dev：1,400,154 B `A19606A54DE92EE1777A59C56204FE3EDED9BD60A0E617B549DAD634BFB9FC6E`
- sources：1,265,124 B `7467E575308F57424A19A773DDF02C74CE74443677CC1DEDD9D0294BE6CD7937`
- MK：classes 107 / entries 267 / dual 534 / mixins 108 / client 10（`mkCounts().ok === true`；b62 新增 `MixinEntitySnowball`、`MixinBlockStaticLiquid`、`EntitySnowballInvoker` 三处）
- PIN：`testharness/player/f7-wb-lib.js:35` 已改 `b62-build10`，`:36` MK_PIN 同步；`[PIN] shaOk=true sizeOk=true mkOk=true ok=true`

## §1 试跑轨迹

- **r1 FAIL（w1/w2/w3/w4/w5/w6）**：① 自然防御探针用 `DamageSource.GENERIC`，1.12 里 GENERIC 带 `setDamageBypassesArmor()`，`etimNaturalDefense` 判成 0；② `/summon snowball` 抛落命中不稳定；③ W4 抓到 W2 遗留的硬化黏土（`isHardenedClay` 本就不吃普通伤害）；④ `probeBiomeRow` 只查 CREATURE，土元素是 MONSTER；⑤ 脚本引用未导出的 `L.MIXIN_JSON` 直接崩。
- **r2 FAIL（w3/w4）**：W4 仍抓硬化黏土（`found.get(0)` 不筛）；W3 火元素雪球打空（飞行 tick 竞态）。
- **r3 FAIL（w3）**：earth 臂抓到 `ETIMEntityClayGolem`（子类），非岩浆态无 quench 行。
- **r4 FAIL（w3）**：`/kill @e` 走 outOfWorld 被土元素白名单拒绝，W1 的普通土元素未死，雪球仍打到非岩浆体；新增 `/etest elementalkill` 用爆炸/魔法源清理。
- **r5–r8 FAIL（w3）**：`EntityThrowable.java:215-219` 在前两 tick 把 `getEntitiesWithinAABB(...).grow(1.0D)` 的第一个实体钉成 `ignoreEntity` 并全程忽略——贴脸生成的雪球永远打不中静止目标；把生成点挪到 `posZ+1.5 → +3.0` 均无效（r7 连兜底 `snowball other` 行都没有）。
- **r9 FAIL（boot）**：`ETIMSnowballDuck` 放在 `io.github.etim.etim.mixins` 包被 mixin 所有权拦截（`IllegalClassLoadError: … is in a defined mixin package … and cannot be referenced directly`）；`EntitySnowballInvoker` 未登记进 `mixins.etim.json`。
- **r10 PASS**（改法：Duck 接口移入 `mob/ETIMSnowballDuck.java`，访问器登记进 `mixins.etim.json`，W3 改用 `/etest elementalsnowimpact` 直接注入命中）：`{"run":"r10","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

## §2 逐臂锚点（`b62-r10-server.log`）

| 臂 | 断言 | 锚点 |
| --- | --- | --- |
| W1 属性 | 土元素 hp/max 30、attack 12、speed 0.20、follow 20、xp 15、type 0、defense 4；火元素 20/5/0.25/40/15；黏土 30/6/20/15/type 8/defense 0 | `:7416`/`:7417` earth probe/spawn、`:7429`/`:7434` fire、`:7478`/`:7480` clay |
| W2 热量 | 土元素 heat→1000、type 0→1、magma=true、defense 4；黏土 type 8→9、hardened=true、defense 2、magma=false | `:7763` magma earth from=0 to=1、`:7764` 状态行、`:7778` magma clay from=8 to=9 |
| W3 雪球 | 岩浆态土元素 quench=true；火元素 dealt=3、hit=true | `:7787` snowball earth quench、`:7788` snowimpact、`:7806` snowball fire dealt=3.000、`:7807` snowimpact |
| W4 免疫 | fall applied=1；玩家伤害 earth applied=0、clay applied=1；火焰对火元素 applied=0 | `:7934` hit earth fall、`:7948` hit earth player、`:7968` hit clay player、`:7984` hit fire fire |
| W5 深度门 + 群系行 | y=20 allowed=true、y=100 allowed=false；BASE 行 `weight=10 min=1 max=1 source=base` | `:8044`/`:8048` undeadgate、`:8045`/`:8049` row |
| W6 刷怪行 | BASE `earth 10(1,1)`、`clay 50(1,1)`；HELL `earth 40(1,1)`；END `earth 20(1,4)`；`y<=40` 门；熔岩 mixin 在位 | 源码断言（`ETIMSpawnTables` / `MixinBlockStaticLiquid`） |
| W7 资源 | 12 张贴图存在、en/zh 三键、注册 id 26/27/28 | 资源/源码断言 |

## §3 判定要点

1. **自然防御只在非穿透、非火焰源生效**：`etimNaturalDefense` 返回 `isUnblockable() || isFireDamage() ? 0 : 4.0F`，实测 CACTUS 源 4（`:7416`）、FALL 源放行（`:7934`）、玩家源被 `attackEntityFrom` 白名单整条拒绝（`:7948`），黏土硬化态防御 2（W1 `defense:0` → W2 `defense:2`）。
2. **热量状态机与 R196 同构**：`convertToMagma()` 置 heat=1000，土元素 type 0→1、黏土 type 8→9，`isMagma()` 只在非黏土成立（`:7763-7778`）。
3. **雪球反应落在原版伤害点**：`MixinEntitySnowball` 的 `@Redirect` 截 `Entity.attackEntityFrom`，火元素改为固定 3 点（`:7806`），岩浆态土元素改为 `convertToNormal(true)`（`:7787`）。
4. **`/kill` 不能作判据**：`attackEntityFrom` 白名单拒绝 outOfWorld（`:7624`/`:7626`），需 `/etest elementalkill` 走爆炸源。
5. **深度门只在主世界生效**：`checkDepth` 为 true 时 `y<=40` 才拦（`:8044` vs `:8048`），与 R196 `!check_depth || y<=40` 同构。
6. **群系行 `source=base` 是预期**：`minecraft:beaches` 无 override，落 BASE monster 表 10(1,1)（`:8045`）；HELL/END 走 `overrideAll`（W6 源码断言）。
7. **火元素完全透明属一手行为**：`getModelOpacity=0.0F` 与 R196 同（D-2 A），客户端渲染面由用户目视，不作判据。

## §4 C 级挂账

- **C-B62-1** 火元素 `fire_elemental_glow.png` 全工作区缺失（R196 仅 `fire_elemental.png` 108 B），主体 0% 不透明照抄，客户端观感无法还原原版辉光。
- **C-B62-2** 1.12 无 `DamageSource.bypassesMundaneArmor()`，自然防御门用 `isUnblockable() || isFireDamage()` 近似（与 `ETIMEntityLongdead` 先例同口径）。
- **C-B62-3** 土元素 `isInPrecipitation()` 用 `world.isRainingAt(pos)` 近似，寒冷衰减只取群系温度（`<=0.15F`），未计脚下两格材质的 `isFreezing`。
- **C-B62-4** 火元素火声循环用 `BLOCK_FIRE_AMBIENT` 映射 R196 `"fire.fire"`，音高/间隔按原式 `rand(21)+30`。
- **C-B62-5** 熔岩生成火元素的 mixin 挂 `BlockStaticLiquid.updateTick`（1.12 无 `BlockStationary`），门按 1.12 的 `hasSkyLight` 近似 R196 `hasSkylight()`。
- **C-B62-6** 雪球命中改由 `/etest elementalsnowimpact` 直接注入 `onImpact`；飞行命中因 `EntityThrowable` 两 tick `ignoreEntity` 规则不可作稳定判据（探针通道，非移植面）。
- **C-B62-7** 土元素破门时长沿用 ETIM 载体 1920/480 再除 4/6/8，未复刻 R196 `EntityAIBreakDoor` 的逐 tick 进度日志。
- **C-B62-8** 黏土傀儡 `isHardenedClay()` 由 heat>=100 推导，1.12 侧不写独立 `hardened` 字段。
- **C-B62-9** 土元素 `getMaxSpawnedInChunk=1` 与 `ETIMSpawnCycle` 的 ghast/revenant 分支并列，未参与 1.12 的 mob-cap 加权。

## §5 落码文件

- `mob/ETIMEntityEarthElemental.java`（新）
- `mob/ETIMEntityFireElemental.java`（新）
- `mob/ETIMEntityClayGolem.java`（新）
- `mob/ETIMDigging.java`（土元素挖块分支 + `minHarvestLevelOf`）
- `mob/ETIMEntityAIBreakDoor.java`（土元素 /4/6/8）
- `mob/ETIMDiggingEvents.java`（土元素挂载/tick/death）
- `mob/ETIMSpawnTables.java`（BASE/HELL/END 行 + `y<=40` 门 + `probeBiomeRow` 四参重载）
- `mob/ETIMSpawnCycle.java`（土元素 cap 1）
- `mob/ETIMMobEntities.java`（id 26/27/28）
- `mob/ETIMSnowballDuck.java`（新，dev 通道接口）
- `mixins/MixinEntityAIAttackMelee.java`、`mixins/MixinEntitySnowball.java`、`mixins/EntitySnowballInvoker.java`（新）、`mixins/MixinBlockStaticLiquid.java`（新）
- `client/ETIMEarthElementalRender.java`（新）、`client/ETIMFireElementalRender.java`（新）、`client/ETIMMobRender.java`
- `commands/CommandDevTest.java`（`/etest elemental|elementalmagma|elementalhit|elementalgate|elementalkill|elementalsnowball|elementalsnowimpact`）
- `ETIMConfig.java`（`mobElementalR196`）
- `resources/assets/etim/textures/entity/earth_elemental/**`（12 张）、`fire_elemental.png`、`lang/en_us.lang`、`lang/zh_cn.lang`、`mixins.etim.json`

## §6 收口

- census：`:63` / `:91` / `:93` / `:117` / `:118` / `:120` / `:243` / `:244` / `:247` / `:84`（十一行变体）共 10 面落【已落地】，§三 镜像 10 行删除，头部 206/12 → 216/2。
- 账册：条 405。
- sessions：`## B-62`。
