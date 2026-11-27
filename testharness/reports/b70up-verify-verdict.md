# W-B70UP 判窗正本：爆炸链纯函数化（ExplosionGates）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-27 20:05–20:15（单轮）
- 判据源：`git-workspace/etim/testharness/player/f19-reg-explosion.js`
- 终判：**PASS**（A=0 / B=0 / C=3）

## §0 钉值

- `testharness/player/f7-wb-lib.js:35` = `b70up-build1`
- release 1,574,356 B `C93AF1151328A7A6E0BA7CD7F61476D9A6D830A7C2B1751479DEE6DD737E02CF`（mtime `2026-11-27T12:01:16.2717Z`，窗内 0 rebuild）
- dev 1,545,639 B `6635C303257F1688E8B4E200AD7E2DCB6AED8CC7CD29D8D01A78E65E9020870D`
- sources 1,373,320 B `593DEA44052216794A9B2BAC73B0B9D524E80723E07F9ECD0E76CDAB98B913C8`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- HEAD `55b0ab1`（判窗期间 0 提交）

## §1 改动（纯提取，语义不变）

- 新增 `src/main/java/io/github/etim/etim/world/ExplosionGates.java`：`entityDamage(size, distance, density)`（Explosion.java:111）、`spookUntil(now, roll400)`（:112）、`livestockReach(size)`、`chanceFor(ChanceClass)`（Block.java:1984-1992）、`keep(count, chance, Rolls)`（:2001-2040）、`experience(base, dropped, exempt)`（:2042-2057）、`motionSpeed(roll)`（:2059-2093）。
- `world/ETIMExplosion.java`：`entityDamage` 保留取距离与 `getBlockDensity`，公式委托；`spookLivestock` 与 `livestockBox` 委托。
- `item/ETIMBlockDrops.java`：`applyChanceModifiers` 删除，改 `chanceClass(Material)` + `chanceFor`；`roll` 删除，改 `keep(..., RAND::nextFloat)`；经验与抛射速度委托。
- 新增 `src/test/java/io/github/etim/etim/world/ExplosionGatesTest.java` 22 例；全仓 **218 例** 0 失败。

## §2 逐臂锚点（`testharness/build-logs/b70up-b70up-r1-b1.out`）

- `:7768` `[DropLog] boomdrop block=minecraft:stone drop=minecraft:cobblestone count=1 chance=1.000 x=3 y=129 z=7`（石墙 3×3×3 共 19 条，逐块一行）
- `:7769` `[DropLog] xpcheck block=minecraft:stone base=0 drops=1 xp=0 exempt=false`（与 W1 逐条配对）
- `:8028` `[ExplosionLog] dmg entity=EntityZombie dist=2.001 eff=16.000 density=1.000 damage=37.331 sizef=4.000`
- `:7766` `dmg entity=EntityPlayerMP dist=4.473 damage=30.740`（对照臂）
- W4 静态：`ExplosionGates.java` 在位、`ExplosionGatesTest.java` 22 例、两个调用方各 4 处委托、`applyChanceModifiers` 残留 0。

## §3 分级

- **A（0）**：无。
- **B（0）**：无。
- **C（3）**：
  - C-B70UP-1 W1/W2 各 19 条为一次 TNT 的整面石墙，会话七按「逐块配对」核对，无缺失。
  - C-B70UP-2 `spookUntil` / `livestockReach` 本窗世界级未触发（无牲畜），仅由 W4 静态 + 22 例单测覆盖；含牲畜的窗口后续补世界级接线（不影响本批语义等价）。
  - C-B70UP-3 世界名四段前缀 `w-reg-exp-b70up-r1-v1`（`H.create` 的 world 模板所致），惯例。

## §4 终判

`PASS`。钉值 `b70up-build1`；判窗单轮全绿；数值正确性由单测固化，窗口证明接线存活。
