# W-B70UV 判窗正本：钓鱼 / 耐久 / 砂轮三族纯函数化

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 批号：B-70UV（工装批：单测第六轮，无 census 面变化）
- 判据源：`testharness/player/f15-reg-chains.js`（r1）、`testharness/player/f11-b65-smoke.js`（r2）
- 终判：**PASS**（A=0 / B=0 / C=4）

## §0 钉值

- `f7-wb-lib.js:35` = `b70uv-build1`（由 `testharness/tools/set-pin.js --build` 一次改写 PIN 与 MK_PIN）
- release 1,582,281 B `736F3CF285D0709EB37D227D4583D8A03BA47C13302D06F1F389D4DB9FBA7470`
- MK refmap 114 / 282 / 564；manifest mixins 115 / client 10
- jar mtime `2026-11-27T14:43:36.1176Z`（两窗内 0 rebuild）
- HEAD `c7c5cd8`（窗内 0 提交）

## §1 改动性质

纯提取 + 委托，语义与骰子顺序不变：

| 新类 | 抽取内容 | 调用方 |
| --- | --- | --- |
| `fishing/FishingGates` | `adjustedTime` / `clockDistance` / `blueMoonCycle` / `cascade`（ci0..ci4，只 clamp ci0，ci4 下限 1） | `ETIMFishing.adjustedTime`、`blueMoonNight`、`cascadeChain` |
| `hunger/EnduranceGates` | `distanceCm` / `perMeter` / `ladderDrain` | `ETIMEndurance.chargeMovement`（四处） |
| `metal/AnvilGates` | `nuggetDurability` / `byKey` | `ETIMAnvilRepair.repairMaterialDurability` + 新增 `metalOf(ItemStack)` |

单测 31 例（Fishing 13 / Endurance 10 / Anvil 8），全仓 20 类 / 286 例 / 0 失败。

## §2 判窗锚点

r1（`f15-b70uv-r1-b1.out`，596,132 B / 4,101 行，43 s，EXIT=0）：

- `:3312` `[FishLog] gate token=1 wt=1000 adj=7000 dist=1500 ci0=1500 light=0 ci2=1500 L=0 lure=0 ci3=1500 worm=0 ci4=1500`
  - 核算：`adj=7000 → dist=1500 → timeFactor=2.5 → ci0=clamp(600×2.5)=1500`；`ci4=max(1500,1)=1500`
  - 跨版本同形：`f15-b70ty-r5:3311`、`f15-b70ty-r11:3314`、本窗 `:3312` 逐字相同
- `:3343` `[MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=50`（对照 `b70ty-r11:3345` 同形同值）
- W2 anvilplan NONE、W3 熟牛肉 start eating + 蛋 refused=1、W4 Furnace 8 rows、W5 Melee stun=1、W6 death orb dump、W7 oreRows=137

r2（`b65-b70uv-r2-b1.out`，1,024,710 B / 6,810 行，34 s，EXIT=0）：

- `:5670` `bowlgive sat=16 nut=16`；`:6021`/`:6064` coin；`:6122` applegold；`:6370` `firecook count=3`；`:6460` `vesseldouse fire_hp=15.0`
- `verify-diff --mode=arms --base b65-b70tc-r3-b1.out --new b65-b70uv-r2-b1.out` → arms 64/63、diffs=0、**MATCH**；`--strict-arms` 复跑仍 MATCH
- 数值层归一化比对（26 键 = FoodR196Log 25 + ItemLog 1）：only-in-base / only-in-new / count delta 全无

## §3 分级

- **A（真缺陷）**：无
- **B（判据/工装）**：无
- **C（可接受）**：
  - C-B70UV-1 开发命令的 gate 行不打印 `ci1`（`CommandDevTest.java:2113-2116` 只拼 ci0/light/ci2/L/lure/ci3/worm/ci4）——工单字段清单里的 `ci1=` 属预期落空，三版 jar 该行逐字相同；`ci1` 经 `ci2` 反映（`light=false` 时 `ci2==ci0`）
  - C-B70UV-2 `verify-diff --mode=arms` 只比「通道 × 首 token」存在性，不比次数与行内数值 ⇒ 会话七以 `--strict-arms` + 26 行归一化比对补强
  - C-B70UV-3 r2 窗口无 AnvilLog/EnduranceLog/MiningLog 数值行（各 0 条）；耐久值与砂轮值由 r1 的 `tool decay loss=50` 与委托面 + 单测覆盖
  - C-B70UV-4 世界名三段式 `w-reg-b70uv-r1-v1`、`w-b65-b70uv-r2-v1`（前缀约定）

## §4 收口

- cfg `C69FC496…E5AEC257` 起收同；props `6784C3ED…D21322F1EB9` 起收同；port 0→0；crash 0→0；jar mtime 未变；HEAD 未变
- 世界保留：`run/w-reg-b70uv-r1-v1`（35 文件 / 6,069,900 B）、`run/w-b65-b70uv-r2-v1`（30 文件 / 3,744,363 B）
- 回执：`testharness/reports/b70uv-verify-receipt.md`（8,226 B / 144 行）

## §5 终判

`PASS`（A=0 / B=0 / C=4）。产品钉值 `b70uv-build1`；两窗一次过。
