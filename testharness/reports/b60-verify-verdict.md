# B-60 判决回执 — 隐形追猎者（R196 EntityInvisibleStalker + EntityAISeekLitTorch）

- 批次：B-60（census D 卷 `:62` / `:119` / `:245` / `:261` 四面 + §三 四条镜像）
- 判决：**PASS**（A=0 / B=0 / C=7）
- 正本日志：`git-workspace/etim/build-logs/b60-smoke-r2.out`（终判窗）、`build-logs/b60-r2-server.log`（服务端快照，世界 `w-b60-r2-v1`）
- 试跑轨迹：r1 全臂绿但 `stops=1`（脚本把 `srv.stop()` 的 `exitCode` 误读成 `code`，判据缺陷非功能缺陷）→ 修 `f11-b60-smoke.js` 的 stops 表达式 → r2 `stops=0`。

## 0. 钉值（b60-build2）

| 产物 | 字节 | SHA-256 |
| --- | --- | --- |
| etim-1.0.0.jar | 1,358,755 | `8D1AE54F4945F9566F0D7A7603C456C7CC4AA0EC3A18D54D2DA2D4CA94C39DBA` |
| etim-1.0.0-dev.jar | 1,333,886 | `8CC58943B8B1C4610820C15CAE5117E322E3E98F05B3E98F90A59E9F8452A490` |
| etim-1.0.0-sources.jar | 1,209,853 | `9FBE623DA10F10F7AD9B5AB67C737B8DE01E72881E863F65152DFE7E3200BD80` |

MK：classes 104 / entries 263 / dual 526 / mixins 105 / client 10（与 b59-build2 持平，本批未新增 accessor）。
PIN 已写入 `testharness/player/f7-wb-lib.js:35`（单行改写，`node -e` + 烟测 `[PIN] ok=true` 双证）。

## 1. 终判窗（r2）

```json
{"run":"r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

## 2. 逐臂锚点

| 臂 | 判据 | 实测 | 锚点 |
| --- | --- | --- | --- |
| W1 属性 | `/etest stalker` probe = 20/20/40/4.0/0.23/10/undead=false | `{"kind":"stalker","hp":20,"max":20,"follow":40,"attack":4,"speed":0.23,"xp":10,"undead":"false"}` | `b60-r2-server.log:7361` |
| W2 光源抑制 | 玩家 >4 格时贴脸火把被拔 | `snuff pos=8,130,1 kind=minecraft:torch` | `:7694` |
| W3 趋光 | 1/200 掷中 → 接受通向火把的路径 | `seek cls=ETIMEntityInvisibleStalker torch=12,130,10 dist=12` | `:8562` |
| W4 深度门 | y=20 放行 / y=100 拒绝（无血月/群系旗） | `allowed=true depth=true y=20 blood=false freezing=false desert=false`；`allowed=false y=100` | `:8594` / `:8596` |
| W5 F3+B | spawn 行 `invisible=false`（RenderManager:408 的绘制门） | `spawnRows=1 invisibleFalse=1` | `:7361` / `:7680` |
| W6 资源/cfg | wight 贴图 + 中英 lang + `mobUndeadSurfaceR196` 键在位 | `{"tex":true,"langs":true,"cfgKey":true}` | 脚本 fs 面（`b60-smoke-r2.out`） |

补充锚点：`etim:invisible_stalker` 注册与召唤可用（`Object successfully summoned` + `:7361` 行）；`/kill` 可清（无免疫覆写）；W3 三条通道各自可独立掷中（`:8252` / `:8300` / `:8307`）。

## 3. 判定要点

1. **任务表**：0 swim / 1 break-door / 2 melee(1.0,true) / 4 限制内移动 / 4 趋光(1.0) / 6 游走(1.0) / 7 观察 8 格 / 7 空闲；targets 1 hurt-by / 2 近战玩家（chance 0，sight）。
2. **每 tick 抑制光源**：`onLivingUpdate` 先调用再 super，与 R196 :38-41 同序；行前缀复用 `[UndeadLog]` 保 B-59 正则，标签区分 `stalker` / `shadow`。
3. **趋光**：`shouldExecute` 对 Shadow 用 40、其余 200 的掷率；候选 ≤8、半径 16/垂直 4；终点仍须 `isNearLitTorch` 成立——与 R196 逐行一致。
4. **刷怪门**：仅 `y<=40`，无血月/群系旗（R196 WorldServer:654-657），非主世界走 `checkDepth` 旁路。
5. **透明**：R196 `getModelOpacity()=0.05` 由 `ETIMUndeadRender.renderModel` 用 `disableAlpha()+enableBlend()` 还原（1.12 doRender 的 alpha test 阈值 0.1 会裁掉 5%）。
6. **F3+B 可用性**：实体从不 `setInvisible(true)`，spawn 行 `invisible=false` 即 RenderManager:408 的 `!entity.isInvisible()` 前置；物理透明不影响碰撞框绘制。
7. **刷怪权重**：BASE monster 表新增 `invisibleStalker 10(1,1)`（R196 BiomeGenBase:173），仍受 16-attempt 循环约束。

## 4. 冲突与挂账

- **C-B60-1** R196 `imported.mob.invisiblestalker.*` 音效无 1.12 载体（D-2 A）：映射 `ENTITY_ZOMBIE_AMBIENT/HURT/DEATH`，音量 0.2F，脚步静音。
- **C-B60-2** R196 `AttackOnCollide(Villager)` 行无 villager 目标源（R196 targetTasks 只有玩家），1.12 合并为单条 `EntityAIAttackMelee`（同 C-B59-10 口径）。
- **C-B60-3** 5% 透明为纯客户端面；服务器只保证 `invisible=false` 与注册，最终观感由用户目视（AGENTS 9 允许的渲染类例外）。
- **C-B60-4** 光源抑制行沿用 `[UndeadLog]` 前缀 + 标签，非新通道（保 B-59 判据兼容）。
- **C-B60-5** 血月/权重：本批不改 16-attempt 主循环，自然刷出率按权重与深度门生效（同 C-B59-8）。
- **C-B60-6** 1.12 `EntityLiving.onInitialSpawn` 给 FOLLOW_RANGE 加随机 spawn 修正，spawn 行会出现 38.3～41.7 的浮动；`/etest` probe 行读基值 40，判据以 probe 行为准。
- **C-B60-7** 趋光路径终点依赖原版 `PathNavigate` 对非行走方块的就近取点（R196 同做法），不另写寻路。

## 5. 落码清单（八项）

1. 新建 `mob/ETIMEntityInvisibleStalker.java`（R196 102 行全量：任务表、属性、每 tick 抑制、音效/脚步、UNDEFINED、XP×2、spawn 行）。
2. `mob/ETIMLightSourceSuppression.java` 加标签重载（`shadow` 默认保 B-59 判据）。
3. `mob/ETIMEntityAISeekLitTorch.java` 加 `[StalkerLog] seek` 行。
4. `mob/ETIMMobEntities.java` 注册 `etim:invisible_stalker` id 23，并清掉 B-59 遗留的重复注册块（id 20/21/22 曾注册两遍）。
5. `mob/ETIMSpawnTables.java` BASE 表 + 深度门显式分支 + cfg 门纳入。
6. `client/ETIMUndeadRender.java` 加 alpha 构造与 `renderModel` 覆写；`client/ETIMMobRender.java` 注册（wight 贴图，0.05F）。
7. `commands/CommandDevTest.java`：`/etest stalker`、`undeadgate … stalker`、probe xp 分支。
8. 资源：`en_us.lang` / `zh_cn.lang` 键 `entity.etim.invisible_stalker.name`（贴图复用 `wight.png`，无需新增）。

## 6. 收口

- census：§一 4 面翻【已落地】（`:62` / `:119` / `:245` / `:261`），§三 删 4 条镜像，头部 `196/22 → 200/18`，总面 218 不变。
- 账册条 403、`sessions.md` `## B-60` 段待写；提交只 add 本批文件，不 push。
