# W-B58 判决执行 · 凝胶球物品与投掷物（B-58）

- 轮次：B-58（凝胶球 `ItemGelatinousSphere` → `EntityGelatinousSphere` 全量还原）
- 判据源：`git-workspace/etim/testharness/player/f11-b58-smoke.js` r7（build5）
- 结论：**PASS** — A=0 / B=0 / C=6
- 时间：2026-11-21 17:41–18:09（r7：起服 18:06:55 → `Done (6.824s)` 18:07:10 → 停服 18:07:51）

## 0. 钉值

| 项 | 值 |
|---|---|
| release | **1,327,451 B** |
| release SHA-256 | `0D137C67A16F70D289DC724301F96355C3F77142FB9148461AD87A3625EB258F` |
| dev SHA-256 | `093F6245248DAAE6AAFB3984AE9ECE97A53EE658AC25B8E0DACC9CE099EA930F` |
| sources SHA-256 | `626F050101F90D85564A907F7980AA0B4668F1ED816AD8FCF8E89848709E2765` |
| MK | classes 104 / entries 262 / dual 524；mixins 105 / client 10（无新 mixin） |
| 构建日志 | `git-workspace/etim/build-logs/b58-build5.out` |

## 1. 窗口轨迹

| 段 | 内容 | 结果 |
|---|---|---|
| r1–r2 | 首轮跑通骨架；暴露 `/execute` 包裹 sender、控制台 sender 无坐标、`/kill` 不置 `recentlyHit` 三条阻断 | 翻转 |
| r3 | W2/W3/W6 绿；W1 仅 `kind=` 大写；W4 无掉落；W5 背包读空 | 4/6 |
| r4–r6 | 加 `gelinv`/`gelhold`/`gelkill`（玩家伤害→魔法重试）；`getLootTable()` 由 `LootTableList.EMPTY` 改 `null`；W4 改用服务端 drop 行、W5 全日志扫 `[FoodLog]` | 6/6（r6 有 1 次 `[W4]` 窗口内残行误判） |
| **r7** | **build5 全臂重跑** | **W1–W6 全绿，bad=0** |

`[done]`（`testharness/build-logs/b58-smoke-r7.log` 末行）：

```
{"run":"r7","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,
 "stops":0,"pass":true,"bad":0}
```

## 2. 逐臂判行

| 臂 | 判行 | 锚点（`testharness/build-logs/`） |
|---|---|---|
| W1 物品身份 | 五枚 subtype 的 `dmg` 与 `kind` 全对：1/2/3/3/4、pepsin×3 + acid×2 | `b58-r7-b1.out:5923` `give subtype=0 … dmg=1 kind=pepsin`；`:6292` `subtype=1 dmg=2`；`:6637` `subtype=2 dmg=3`；`:7078` `subtype=3 dmg=3 kind=acid`；`:7492` `subtype=4 dmg=4 kind=acid` |
| W2 方块接触 | 草方块顶面→泥土 `changed=true`；同一格侧面 `changed=false`；树叶瞬溶 `changed=true`；羊毛胃蛋白酶 `period=400 changed=false` | `:7675` `impact type=block subtype=4 … face=up block=minecraft:dirt period=-1 changed=true`；`:7752` `face=north block=minecraft:grass … changed=false`；`:7784` `block=minecraft:air … changed=true`；`:7845` `subtype=1 kind=pepsin … block=minecraft:wool period=400 changed=false` |
| W3 实体伤害/免疫 | 僵尸 pepsin `dmg=3 dealt=3` 非免疫；骷髅 pepsin `immune=true dealt=0`；布丁 acid `immune=true dealt=0` | `:7920` `target=EntityZombie immune=false dealt=3.000 hp=17.000`；`:8032` `target=EntitySkeleton immune=true dealt=0.000`；`:8178` `target=ETIMEntityPudding immune=true dealt=0.000` |
| W4 掉落 subtype | 四族 size-1 各掉对应 meta 1/2/3/4；size-2 本体无 drop 行 | `:8491` `drop cls=ETIMEntityJelly size=1 … meta=1`；`:8513` `ETIMEntityBlob … meta=2`；`:8534` `ETIMEntityOoze … meta=3`；`:8555` `ETIMEntityPudding … meta=4`；`:8579` size-2 `kill … hit=true` 后 `bigDropRows:0` |
| W5 投掷消耗 | 生存右击产出 `hunger=0.250` 与 `[FoodLog] sphereThrowDrain base=0.25 mod=1.0 amount=0.25`，背包 3→2 | `:8715` `[GelLog] throw subtype=0 dmg=1 kind=pepsin hunger=0.250 … entity=2412`；`:8714` `[FoodLog] ETIM_F7 (67) sphereThrowDrain base=0.25 … pool=1.0639966` |
| W6 资源 | 5 个模型 JSON、5 张 16×16 贴图、en_us/zh_cn 各 6 个键均在盘 | `src/main/resources/assets/etim/models/item/gelatinous_sphere_{green,ochre,crimson,gray,black}.json`；`.../textures/items/gelatinous_sphere_*.png`；lang 两档 |

## 3. 判读要点（实现侧）

1. **掉落被 loot table 吞掉**：1.12 `EntityLiving.dropLoot` 一旦 `getLootTable() != null` 就不跑 `dropFewItems`。`ETIMEntityGelatinousCube.getLootTable()` 原返回 `LootTableList.EMPTY`，B-58 改为 `null`（同 B-13 `ETIMEntityLongdead.java:134-136` 先例），R196 `EntityGelatinousCube.java:452-455` 的掉落面才生效。
2. **`/execute` 的 sender 不是玩家**：`/execute <p> ~ ~ ~ <cmd>` 把 sender 包成 `CommandSenderWrapper`，`sender instanceof EntityPlayerMP` 恒 false。统一用 `sender.getCommandSenderEntity()` 取实体（`CommandDevTest.executeGelSphere` / `executeGelHit`）。
3. **酸族对玩家伤害免疫**：`ETIMEntityOoze`/`ETIMEntityPudding.isImmuneToSource` 只放行岩浆/魔法（布丁另加火焰）/雪球；`gelkill` 先打 `causePlayerDamage`，`hit=false` 时重试 `DamageSource.MAGIC`，行里记 `source=`。
4. **模组栈对 mineflayer 不透明**：bot 侧 `bot.inventory.items()` 对 `etim:gelatinous_sphere` 返回空；判定改走服务端 `[GelLog] inv` / `[GelLog] hold` / `[GelLog] drop` 三行，bot 只负责 `activateItem()` 触发真实右键。
5. **`kind=` 必须小写**：`[GelLog] give/hold` 早期打 `PEPSIN/ACID`，与判据小写不一致；统一 `.name().toLowerCase(Locale.ROOT)`。
6. **size-2 肢解会误入窗口**：size-2 被杀死时按 R196 分裂成 size-1 子体，子体若摔死会补 drop 行；r7 中该行落在 y≈77.5（掉出石台）且晚于 2500 ms 判窗，故 `bigDropRows:0` 成立。后续批次若挪动石台范围需复核此臂。
7. **cfg 生效核对**：`startBoot` 每轮先写 `B:mobDebugLog=true`/`B:foodDebugLog=true`，`Done (` 后回读磁盘 cfg 比对；r7 三 boot 段回读一致（`stops` 均为 exitCode 0）。

## 4. C 级登记

| 编号 | 内容 | 影响 |
|---|---|---|
| C-B58-1 | 五色粒子统一 `EnumParticleTypes.SLIME`（R196 用 slime/ochre_jelly/crimson_blob/gray_ooze/black_pudding 五种） | 视觉差异，不影响命中/溶解判定 |
| C-B58-2 | 绿色档无自然来源：原版史莱姆未改（D-2 挂账），绿色球仅创造/命令可得 | 玩家可感知缺口 |
| C-B58-3 | R196 `Item.slimeBall` 即凝胶球，牵引绳/粘性活塞/岩浆膏三条配方因此未改（D-1：仍用 `minecraft:slime_ball`） | 合成链差异 |
| C-B58-4 | 贴图为本批程序生成的 16×16 圆球（R196 原图未随反编译树提供） | 视觉近似 |
| C-B58-5 | 五色粒子未随 subtype 扩散半径/颜色区分 | 视觉差异 |
| C-B58-6 | 投掷物命中方块后的 `onEntityCollision` 调用保持 R196 顺序（先邻位、后本位、最后一次碰撞回调），但 1.12 该方法对非实体踩踏方块无附加效应 | 无（与 R196 等价） |

## 5. 判决

**PASS**：A=0 / B=0 / C=6。W1–W6 全绿，`bad=0`，三 boot 段 cfg 回读一致；掉落面、免疫矩阵、酸/胃蛋白酶两条接触链均以服务端判据行为证。
