# B-67 验证正本 —— 爆炸与掉落（F-4 前 11 面）

## §0 钉值与判据通道

- build：`b67-build3`（`build-logs/b67-build3.out`，BUILD SUCCESSFUL）
- release：`etim-1.0.0.jar` 1,522,450 B `1E8449FB68B9EF4BC0A29DB57194270C2ED91269B1BCC3A001E4A856E03B015F`
- dev：`etim-1.0.0-dev.jar` `AAA34C068206B680CAF41A420E5926DD44292C86805F94CD538ADA671D108CC6`
- sources：`etim-1.0.0-sources.jar` `B0FBD2113AC863916D1DDC602842FBB0929D78EC4C005D3B97824C3DDB438E93`
- MK：`classes 110 / entries 276 / dual 552`、`mixins 112 / client 10`（`mkCounts().ok=true`）
- 判据通道：`[DropLog] boomdrop/xpcheck/spawn`、`[ExplosionLog] dmg/spook/fire`、`[BoomLog] boom/boomdrops/boomfire`，全部 `[server]` 行，读 `testharness/build-logs/b67-r4-b1.out`。

## §1 试跑轨迹

| 轮 | 结果 | 说明 |
| --- | --- | --- |
| r1 | W1/W3 红 | 煤块/青金石按 `chance 0.5` 逐件掷（R196 `Block.java:2001-2040`），脚本断言「一次掉 9」错；W3 的 `spawn` 行在 W1 阶段已落盘，切片取晚 |
| r2 | 全绿（旧断言） | `boomdrop` 已改「每件一个 `EntityItem`」（对齐 R196 粒度），W3 复用 W1 切片 |
| r3 | W1 红 | 经验通道补 `xpcheck` 行后，脚本 `placed` 断言误留 11（coal_ore 探针已撤回），实际 10 |
| **r4** | **全绿** | `{"run":"r4","pin":true,"w1":..,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |

## §2 逐臂锚点（`testharness/build-logs/b67-r4-b1.out`）

- W1 改写表：`:7499` stone→cobblestone、`:7502` cobblestone→gravel、`:7506` brick×2（chance 1.500）、`:7512` coal×4（chance 0.500）、`:7519` lapis→dye×5、`:7522` planks→stick、`:7525` wool→string、`:7530` dirt→dirt；netherrack/glass 无 `boomdrop` 行（`:7527`/`:7528` 的 `xpcheck drops=0` 反向证明）；`:7532` `boomdrops placed=10`。
- W2 表列与经验：`:7506`/`:7512`/`:7519` 的 `chance` = 1.500/0.500/0.500；`:7520` `xpcheck lapis_block exempt=true xp=0`；`:7500` `xpcheck stone base=0 drops=1 xp=0 exempt=false`。
- W3 落点/延迟：本臂读 W1 的 16 条 `[DropLog] spawn`（`:7501`…），全部 `delay=10`，坐标均在方块局部 0.25–0.75（选中盒 ×0.5）。
- W4 双半径与受惊：`:7678` `boom size=2.0 entity=4.0`；`:7665` `dmg EntityZombie dist=1.000 eff=16.000 damage=40.000 sizef=4.000`；`:7670` `dmg EntityCow dist=2.236 damage=36.704`；`:7674` `spook EntityCow until=752`。
- W5 火焰爆炸：`:7764` `fire placed=2`、`:7765` `boomfire fire=2`（netherspawn 作 exploder）。
- W6 静态：cfg 两键字段+init、`mixins.etim.json` 的 `MixinExplosion`、`ETIMExplosion/ETIMExplosionDuck/ETIMBlockDrops` 存在。

## §3 判定要点

1. 爆炸改写表是**爆炸专属**：`ETIMBlockDrops` 只挂在 `MixinExplosion#doExplosionB` 的 `dropBlockAsItemWithChance` 重定向，普通采掘仍走 1.12（`dropR196` 关时回原版）。
2. 概率是**逐件掷**（R196 :2001-2040），每个存活件生成独立 `EntityItem`，从日志的 `spawn` 行数（16）与 `boomdrop count` 之和一致可证。
3. 经验面按 `block.getExpDrop × 掉落数`，`lapis` 显式豁免（`:7520 exempt=true`）；本批十种可测方块基数均为 0，`xpcheck` 行是唯一可判通道。
4. 双半径走 duck 字段（`ETIMExplosionDuck`），默认等于 1.12 传入的 `size`，不改任何调用点（C-B67-1）。
5. 实体伤害公式 `eff×(1−d/eff)×density×4×2/3`，`eff = entitySize×4`，`≥0.5` 才施加；僵尸 dist=1 → 40.000 与公式手算一致。
6. 牲畜受惊窗 = `now+400+rand(400)`（`:7674 until=752`，当前 `totalWorldTime` ≈ 352）。
7. 火焰爆炸对 `netherspawn`/`infernal creeper` 恒真，点火 1/3 概率、要求下方不透明（`:7764` 放 2 处）。

## §4 冲突与偏差（C 级）

- **C-B67-1** 双半径默认等于方块半径；未改苦力怕/下界炎灵等调用点（生物批次）。
- **C-B67-2** 方块破坏仍用 1.12 抗性步进；R196 「抗性 <0 或 >0.1 归零」未搬——直接套会让石头（抗性 30）全免疫。
- **C-B67-3** 凋灵之首把 >0.8 抗性压到 0.8 的分支无对应（1.12 无 `EntityWitherSkull`）。
- **C-B67-4** R196 预爆炸阶段的「即时掉块」合并进 1.12 的 B 阶段（D-2 裁定合并）。
- **C-B67-5** 经验取 `block.getExpDrop` 而非 R196 的 `Item.getExperienceReward`（1.12 无该 API）；实测基数全 0，行为等价。
- **C-B67-6** 爆炸飞散速度取 `0.25..0.6` 近似，未逐行复刻 `applyExplosionMotion`。
- **C-B67-7** 玩家采掘（落玩家中心、延迟 0）与风落分支仍走 1.12；本批只接管爆炸链。
- **C-B67-8** 落点用 `getBoundingBox ×0.5` 近似 R196 `drop_bounds`；无 `BlockBreakInfo`，tile entity 自定义名未覆盖。

## §5 收口

- 判定：**PASS**（A=0 / B=0 / C=8）。
- census：11 面翻面（`playground/audit/census/普查F-物品方块-盘点.md` §2 `:100`–`:104`、`:108`–`:113`），头部 `65/33 → 76/22`。
- 账册条 410；sessions `## B-67`。
