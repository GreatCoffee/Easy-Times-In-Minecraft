# B-61 验证正本 · 兽族六面（R196 EntityDireWolf / EntityHellhound）

状态：**PASS**（A=0 / B=0 / C=9）
取证日：2026-11-21
烟测脚本：`testharness/player/f11-b61-smoke.js`
终判窗：`build-logs/b61-smoke-r2.out`（exit 0）
服务端日志：`testharness/build-logs/b61-r2-b1.out`（世界 `w-b61-r2-v1`）

## §0 钉值

- build：`b61-build3`
- release：1,386,685 B `9C04F98EEFEF04DC1421FF303F1F09286C74A4407269CF8CA45FE360EECD33BE`
- dev：1,361,662 B `572E6205F5F52276E720F485DFD1175A4418E7D663E5D3D827F30F717B34FAD5`
- sources：1,233,964 B `71B7E64E43E6B92B700EE2EDF17736FC13C177F6110A0532C3DF15F846FA107F`
- MK：classes 104 / entries 263 / dual 526 / mixins 105 / client 10（`mkCounts().ok === true`，MK_PIN 未动）
- PIN：`testharness/player/f7-wb-lib.js:35` 已改 `b61-build3`；`[PIN] shaOk=true sizeOk=true mkOk=true ok=true`

## §1 试跑轨迹

- **r1 FAIL（w2/w3/pin）**：① PIN 仍指 `b61-build2`（整行写入未生效，已按 `const PIN = {` 前缀定位重写）；② W2 断言了 `tamedrow` 的 `hp`，而探针路径 `setTamed(true)` 只改属性上限、不回血（hp 16 / max 24）——属判据口径错，改断言 max/attack/follow；③ W3 在创造模式下咬人，`EntityPlayer.attackEntityFrom` 被 `capabilities.disableDamage` 直接挡回，`bites=0`，改为生存＋抗性 IV＋回血循环。
- **r2 PASS**：`{"run":"r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

## §2 逐臂锚点（`b61-r2-b1.out`）

| 臂 | 断言 | 锚点 |
| --- | --- | --- |
| W1 属性 | 恐狼 hp/max 16、attack 5、speed 0.40、follow 16、tamed=false、xp 10；地狱犬 max 20、attack 4、follow 16、xp 15 | `:7537` probe dire、`:7538` spawn dire、`:7551` probe hell、`:7554` spawn hell |
| W2 驯服 | 200 掷 → aggro 74 / fail 119 / success 7 = 200；`tamedrow` max 24、attack 5、follow 32 | `:8086` tamesum、`:8085` tamedrow、`:7885-8084` 逐掷 tame 行 |
| W3 点燃 | 地狱犬咬中 40% 触发点燃 1..8 秒 | `:8112` `bite kind=hellhound target=ETIM_F7 fire=4 hurt=false` |
| W4 免疫 | 火焰来源 `applied=0` 且出 `hell immune`；玩家来源 `applied=1` | `:8137` immune、`:8138` hit fire、`:8144` hit player |
| W5 深度门 | y=20 allowed=true、y=100 allowed=false，cls=ETIMEntityHellhound | `:8256`、`:8258` |
| W6 刷怪行 | BASE `hellhound 10(1,1)`、TAIGA `direwolf 5(1,3)`、SNOWY `direwolf 1(1,3)`、`y<=32` 门源码在位 | 源码断言（`ETIMSpawnTables.java:125` / `:196-197` / `:200-201` / `:663-667`） |
| W7 资源 | 5 张贴图、en/zh 双键、注册 id 24/25 | 源码/资源断言 |

## §3 判定要点

1. **恐狼属性不被狼系兜底覆盖**：`ETIMMobStats` 的 `EntityWolf` 分支改为跳过 `io.github.etim.etim.` 前缀，`MixinEntityWolf.setTamed` 尾部加恐狼分支（24/16、attack 5、follow 32/16），实测野生 16/5/16、驯服态 24/5/32（`:8085`）。
2. **Wight/Shadow 式 aspect 免疫不适用于地狱犬**：地狱犬只拦火焰/岩浆（`:8137-8138`），玩家伤害照常（`:8144`），与 R196 `isHarmedByFire/isHarmedByLava=false` 同义。
3. **咬中点燃概率与 R196 同式**：`rand<0.4F` 时 `setFire(1+rand(8))`，`fire=4` 实测落界（`:8112`）；`hurt=false` 只因抗性 IV 把 5 点压到 1 点后仍记「未失血」以外路径，不影响点燃分支。
4. **驯服判定三段式**：`roll<0.2 → 结仇(-1)`、`<0.4 → 失败(0)`、`>0.95 → 成功(1)`、其余按等级加成后再分档；200 掷分布 74/119/7 与 20%/20%/5% 量级一致（`:8086`）。
5. **深度门只在主世界生效**：`ETIMUnderworldSpawns.checkDepth` 为 true 时 `y<=32` 才拦（`:8256` vs `:8258`），与 R196 `!check_depth || y<=32` 同构。
6. **`/kill` 不可作判据**：地狱犬继承狼的 `attackEntityFrom` 减伤路径，W4 走 `/etest beasthit` 直取 `applied`。
7. **创造模式咬不动人**：`disableDamage` 让 `attackEntityAsMob` 恒 false，W3 必须切生存（r1 教训，已固化进脚本注释）。

## §4 C 级挂账

- **C-B61-1** 狼嚎 `imported.mob.wolf.howl` 未落：1.12 无长距离音效通道，恐狼沿用继承行为。
- **C-B61-2** `getClosestVulnerablePlayer` 的 ghost/锦标赛/恩典免疫分支无 1.12 对应，改用 `World.getNearestAttackablePlayer`（潜行/隐身缩放随原版）。
- **C-B61-3** 音效 `imported.mob.wolf.*` / `imported.mob.hellhound.*` 映射原版 `ENTITY_WOLF_*`；吐息按 D-4 勘误用 `ENTITY_BLAZE_BURN`。
- **C-B61-4** 恐狼/地狱犬不参与 1.12 的狼项圈染色与 HUD 血条显示。
- **C-B61-5** 地狱犬仍受 16-attempt 刷怪循环与权重上限约束（同 B-59）。
- **C-B61-6** `taming_cooldown` 为 ETIM 自建字段（`etimTamingCooldown`），未复刻 R196 `EntityTameable` 全量冷却。
- **C-B61-7** 地狱犬 `canSpawnInShallowWater=false` 用 `isNotColliding()` 近似，1.12 无同名开关。
- **C-B61-8** 恐狼 `getTamingOutcome` 的等级加成取 1.12 `experienceLevel`，与 R196 同义。
- **C-B61-9** 地狱犬 `getNavigator().setAvoidsWater(true)` 无 1.12 对应（陆地生物默认绕水），删调用。

## §5 落码文件

- `mob/ETIMEntityDireWolf.java`（新）
- `mob/ETIMEntityHellhound.java`（新）
- `mixins/MixinEntityWolf.java`（恐狼属性分支）
- `mob/ETIMMobStats.java`（ETIM 前缀前移）
- `mob/ETIMMobDrops.java`（排除地狱犬狼皮）
- `mob/ETIMSpawnCycle.java`（三类别 chunk cap 8）
- `mob/ETIMSpawnTables.java`（BASE 行、TAIGA/SNOWY override、y<=32 门、`probeBiomeRow`）
- `mob/ETIMMobEntities.java`（id 24/25）
- `client/ETIMDireWolfRender.java`、`client/ETIMHellhoundRender.java`（新）、`client/ETIMMobRender.java`
- `commands/CommandDevTest.java`（`beast|beasttame|beastgate|beastbite|beasthit`）
- 资源：`textures/entity/dire_wolf/{neutral,tame,angry,collar}.png`、`textures/entity/hellhound/hellhound.png`、en/zh lang

## §6 census

- 翻面：`:69`/`:278`、`:86`/`:281`、`:115`/`:286`、`:116`/`:287`、`:241`/`:293`、`:242`/`:294`（6 面 / 12 行）。
- 头部：`census_landed 200 → 206`、`census_unrecorded 18 → 12`，总面数 218 不变。
- `:280` BiomeGenBase 十一行变体面**不翻**（等 EarthElemental/ClayGolem 等全在位）。
