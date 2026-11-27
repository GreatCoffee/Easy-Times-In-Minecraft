# B-70UB 判窗回执（回归网第五轮 · ArrowLog / EnchLog / RepairLog）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 16:3x CST
> 工单：主会话 m06372（2026-11-27 15:45）
> 终判：**PASS**（A=0 / B=5 全为驱动面 / C=4）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70ty-build1` | 同 | ✔ |
| release | 1,569,660 B | 1,569,660 B | ✔ |
| release SHA256 | `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C` | 同 | ✔ |
| jar mtime | `2026-11-27T04:17:35.977Z` | 未变 | ✔（0 rebuild） |
| MK | 114 / 282 / 564 + 115 / 10，`ok=true` | 同 | ✔ |
| HEAD | `4255f8a` | 同 | ✔（窗内 0 提交） |
| cfg | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 起收同 | ✔ |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`（`level-name=w-b30v` / `allow-flight=false`） | 起收同 | ✔ |
| port 25565 | 0 → 0 | 0→0 | ✔ |
| crash-reports | 0 → 0 | 0→0 | ✔ |
| 驱动 | `testharness/player/f18-reg-fifth.js`（三臂，`H.create`） | 同 | ✔ |

- `[PIN] sha=D11D4DA3…F25EC7C shaOk=true size=1569660 sizeOk=true mkOk=true ok=true`
- `[cfg] f18-b70ub-r6-b1 arrowDebugLog=true mobDebugLog=true livestockNeedsR196=true enchantPoolR196=true enchantDebugLog=true`
- `[stop] {"exitCode":0,"exited":true}`
- 世界：`run/w-reg5-b70ub-r6-v1`（29 文件 / 5,279,826 B，保留）
- tee：`testharness/build-logs/f18-b70ub-r6-b1.out`（1,384,246 B / 9,317 行；`:4724` `Done (5.433s)!`，`:9323` `BUILD SUCCESSFUL in 41s`）

## §1 三臂判读（r6 终值）

`[done] {"run":"b70ub-r6","pin":true,"w1":true,"w2":true,"w3":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 面 | 实测 | 判定 | 锚（`f18-b70ub-r6-b1.out`） |
|---|---|---|---|---|
| W1 | ArrowLog | `release charge=28 divisor=20 velocity=1.0000 lvl=0 vanilla=1`，紧随 `shot wander=5.0000 eff=0 exp=0 lvl=0` | PASS | `:7897`、`:7898` |
| W2 | EnchLog | `nonTable src=mob tension=0.00`（W2 窗口内 1 条；boot 期另有自然刷怪同类行 `:5099`） | PASS | `:8273` |
| W3 | RepairLog | `repairseek src=skeleton start item=minecraft:bone hp=3.00/6.00 dist=0.00 entity=EntitySkeleton#2176` → `pickup src=skeleton heal=3.00 hp=6.00 cooldown=400 item=minecraft:bone` → `reset cooldown=399 targetDead=true` | PASS | `:9031`、`:9032`、`:9036` |

- W1 的 `arrow spawn` 行本窗 **0 条**（`[ArrowLog] arrow register … etim:metal_arrow` 只有注册行 `:601`）——见 C-B70UB-1，W1 判据按工单取 `release charge≥5`，已满足（28）。
- W3 的 `hp=3.00/6.00` 与 §2 的 B-B70UB-2 互证：R196 血量表把骷髅 maxHealth 定为 **6.0**（`[AILog] mob stats maxHealth=6.0 entity=EntitySkeleton#2214`，r2 tee `:8154`）。

## §2 收敛链（r1 → r6，全部驱动面，产品码零改动）

| 轮 | EXIT | 红臂 | 根因 |
|---|---|---|---|
| r1 | 2 | W2/W3 | W2 带 NBT 召唤跳过 `onInitialSpawn`；W3 `Health:6f` 等于 maxHealth 6.0 |
| r2 | 2 | W3 | W2 已绿；W3 仍 0 行——白天露天，fleesun 占 movement 互斥位 |
| r3 | 2 | W3 | 改夜仍未出——先召唤后撤 bot，攻击任务保留目标继续占互斥 |
| r4 | 2 | W3 | 先召唤再 tp，同样失败 |
| r5 | 2 | W3 | 同上（顺序未改） |
| **r6** | **0** | — | 夜 + bot 先撤 44 格 + 1×1×2 石笼 ⇒ 三臂全绿 |

### B 级（判据/工装不成立，逐条闭环）

- **B-B70UB-1**（W2）：1.12 `CommandSummon` 只在「未带 NBT」时才调 `onInitialSpawn`（`build/rfg/minecraft-src/java/net/minecraft/command/server/CommandSummon.java:93-100` 置 `flag=true`，`:118` 只有 `!flag` 才走 `onInitialSpawn`）⇒ 带 NBT 召唤的僵尸不走 `EntityLiving.setEnchantmentBasedOnDifficulty`，`[EnchLog] nonTable` 永不落行（r1 全档窗口内 0 条，只有 boot 期自然刷怪行）。修法：先裸 `summon minecraft:zombie` 触发行，再用 `entitydata` 补 `HandItems` 铁剑。
- **B-B70UB-2**（W3 血量门）：`src/main/java/io/github/etim/etim/mob/ETIMMobStats.java:161-163` 用 R196 表把骷髅 `MAX_HEALTH` 压到 6.0，而旧驱动同时写 `Health:6f` 与 `Attributes:[{Name:"generic.maxHealth",Base:20}]`（后者被覆盖无效）⇒ `health == max`，`ETIMEntityAIMoveToRepairItem.shouldExecute` 的 `getHealth() >= getMaxHealth()`（`ETIMEntityAIMoveToRepairItem.java:88-90`）第一道就返回 false。修法：`Health:3f`。
- **B-B70UB-3**（W3 互斥）：stage 用 `time 1000` + 露天空地，`MixinEntitySkeleton.java:37-41` 的 `addTask(3, ETIMEntityAIFleeSun)` 持续占用 movement 互斥位；`EntityAITasks.canUse`（`build/rfg/minecraft-src/java/net/minecraft/entity/ai/EntityAITasks.java`，`taskEntry.priority >= other.priority` 且互斥不相容即 false）挡住优先级 4 的 repair ⇒ `shouldExecute` 的 1/40 掷骰从未跑到。修法：W3 前 `time set 14000`。
- **B-B70UB-4**（W3 目标保留）：先召唤后撤 bot 时，骷髅当 tick 就锁定 6 格外的玩家，`EntityAIAttackRangedBow` 随 `getAttackTarget()` 保留继续执行（同样占 movement），即使 bot 已撤到 44 格外也不停。修法：**先 `tp` 再 summon**。
- **B-B70UB-5**（W3 静默分支）：骷髅会 wander 离开掉落物；此时 `choosePath()` 的路径因「目标即自身格」被 `validPath()` 判 null（`ETIMEntityAIMoveToRepairItem.java:157-166`），而 `startExecuting` 的手动选取要求包围盒相交（`:119-138`），两者都不成立即**静默返回、不打任何行**（这就是 r2–r5 的 `ailines=0` 而非「掷骰不中」）。修法：1×1×2 石笼，令其只能站在骨头格上。

## §3 C 级

- **C-B70UB-1**：`[ArrowLog] arrow spawn shooter=…` 本窗 0 条（原版箭由 1.12 `EntityTippedArrow` 生成，ETIM 的 spawn 行属于 `etim:metal_arrow` 通道）；W1 判据按工单取 `release charge≥5`（实测 28），spawn 行仅作辅证且缺失。
- **C-B70UB-2**：W2 的 `tension=0.00` 来自 `difficulty.getClampedAdditionalDifficulty()`；本 stage（`difficulty 2` + 首夜）取值为 0，故该臂证明的是「通道可落行」，不证明非零 tension 的加成幅面。
- **C-B70UB-3**：每窗两条 `[stop]`（`h.stop()` 与 `finish()` 各一次），带 `exited:true` 者权威。
- **C-B70UB-4**：世界名三段前缀 `w-reg5-b70ub-r6-v1`；W3 的 `repairseek reset cooldown=399` 证明 400 tick 冷却已写入（R196 `:662`）。

## §4 收口

| 项 | 值 |
|---|---|
| cfg 起收 | 同 `C69FC496…E5AEC257` |
| props 起收 | 同 `6784C3ED…D21322F1EB9`（`level-name=w-b30v`、`allow-flight=false`） |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T04:17:35.977Z` 未变（0 rebuild） |
| HEAD | `4255f8a`，窗内 0 提交 |
| 世界 | `run/w-reg5-b70ub-r1..r6-v1` 六个全留（r6：29 文件 5,279,826 B） |
| 证据 | `build-logs/b70ub-r{1..6}-stdout.out`、`testharness/build-logs/f18-b70ub-r{1..6}-b1.out` |

## §5 终判

**PASS** — W1/W2/W3 全绿；A=0（本批零产品码改动，三条通道的落行点与服务端行为一致）；B=5（全部判据/工装假设失效，已逐条闭环）；C=4。

本回执字数规格：7282 B / 85 行。
