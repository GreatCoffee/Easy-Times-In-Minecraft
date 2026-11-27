# W-B70UB 判窗正本：回归网第五轮（Arrow / Ench / Repair）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗轮次：r1–r6（r6 终值）
- 判据源：`testharness/player/f18-reg-fifth.js`
- 终判：**PASS**（A=0 / B=5 / C=4）

## §0 钉值

- `f7-wb-lib.js:35` = `b70ty-build1`（本批零产品码改动）
- release 1,569,660 B `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C`
- mtime `2026-11-27T04:17:35.977Z`（窗内未变，0 rebuild）
- MK 114 / 282 / 564 + 115 / 10，ok=true；HEAD `4255f8a`（窗内 0 提交）
- cfg `C69FC496…E5AEC257`、props `6784C3ED…D21322F1EB9` 起收同；port 0→0；crash 0→0
- tee `testharness/build-logs/f18-b70ub-r6-b1.out`（1,384,246 B / 9,317 行）

## §1 三臂锚点（r6）

| 臂 | 通道 | 锚点 |
| --- | --- | --- |
| W1 | ArrowLog | `:7897` `release charge=28 divisor=20 velocity=1.0000 lvl=0 vanilla=1` |
| W2 | EnchLog | `:8273` `nonTable src=mob tension=0.00` |
| W3 | RepairLog | `:9031` `[AILog] repairseek src=skeleton start item=minecraft:bone`；`:9032` `pickup src=skeleton heal=3.00 hp=6.00 cooldown=400 item=minecraft:bone` |

终值：`[done] {"run":"b70ub-r6","pin":true,"w1":true,"w2":true,"w3":true,"stops":0,"crashes":0,"pass":true,"bad":0}` exit 0。

## §2 B 级（五条，全为驱动面，产品码零改动）

- **B-B70UB-1**：1.12 `CommandSummon` 仅在「无 NBT」时走 `onInitialSpawn`（`CommandSummon.java:93-100` 置 flag、`:118` 只在 `!flag` 时调用）⇒ 带 NBT 召唤的僵尸不产 `[EnchLog] nonTable`；驱动改为裸召唤 + `entitydata` 补剑。
- **B-B70UB-2**：`ETIMMobStats.java:161-163` 按 R196 表把骷髅 MAX_HEALTH 压到 6.0；原驱动 `Health:6f` 使首道血量门（`ETIMEntityAIMoveToRepairItem.java:88-90`）恒 false；改 `Health:3f`。
- **B-B70UB-3**：白天 `MixinEntitySkeleton.java:37-41` 的 `FleeSun`（priority 3）互斥占住 movement，优先级 4 的 repair 掷骰从未执行；改 `time set 14000`。
- **B-B70UB-4**：先召唤后撤 bot 会让骷髅锁定玩家并保留 `EntityAIAttackRangedBow` 互斥；改为先 tp 再 summon。
- **B-B70UB-5**：wander 带走后 `validPath()`（`:157-166`）与包围盒相交要求（`:119-138`）皆不成立即静默返回、零行；改用 1×1×2 石笼约束站位。

## §3 C 级

- **C-B70UB-1**：原版箭走 `EntityTippedArrow`，`[ArrowLog] arrow spawn` 属 `etim:metal_arrow` 通道，本窗 0 条；W1 按 `release charge` 判定。
- **C-B70UB-2**：W2 `tension=0.00` 来自 `getClampedAdditionalDifficulty()`（难度 2 首夜取 0），该臂证明通道可落行，不证明非零张力幅面。
- **C-B70UB-3**：每窗两条 `[stop]`，以 `exited:true` 为准。
- **C-B70UB-4**：世界名三段前缀 `w-reg5-b70ub-r6-v1`；`reset cooldown=399` 证明 400 tick 冷却已写入。

## §4 回归网覆盖与不可覆盖清单

- 覆盖 **42/51 → 45/51**（+ArrowLog / EnchLog / RepairLog）。
- 结构性不可覆盖（登记，不再追）：
  - `PoseLog` / `SoundLog`：产出点仅在 `client/`，服务端日志永不出现。
  - `FireLog`：`roll` 概率 0.00125–0.01/tick，60 秒窗不可稳定捕获。
  - `BatLog` / `BatMobLog`：与 `SpawnLog` / `MobLog` 共用判行，不应重复计分。
  - `OozeLog`：src 已无 `[OozeLog]` 产出行，属历史名残留。
- 因此 45/51 即当前回归网实际上限。

## §5 终判

**PASS**（A=0 / B=5 / C=4）。产品钉值 `b70ty-build1` 未变；判窗 r6 全绿。
