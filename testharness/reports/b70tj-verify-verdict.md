# W-B70TJ 判窗正本：单测扩面（摔落 / 垫层 / 枯萎座）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-26 22:34–22:37（单轮）
- 判据源：`git-workspace/etim/testharness/player/f11-b66-smoke.js`（B-70TC 迁移版）
- 终判：**PASS**（A=0 / B=0 / C=4）

## §0 钉值

- `f7-wb-lib.js:35` = `b70tj-build1`
- release 1,569,395 B `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4`
- dev 1,540,749 B `823FE70550028506CAE7607A07625A9BEAEB420B855BC6A0C55E8CCC121E227F`
- sources 1,370,715 B `26CE72A4B264626D43E50D5DCFAEAF9EE8E628CF1CA39FB9640DCFA783D98EAF`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- jar mtime `2026-11-26T14:28:21.320Z`（窗内 0 rebuild）；HEAD `235944f`（窗内 0 提交）

## §1 判窗载荷

`[done] {"run":"b70tj-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0}`，exit 0；tee `b66-b70tj-r1-b1.out`（954,407 B / 6,345 行）。

## §2 行为等价性（本批唯一实质问题）

本批把 `ETIMFall.rawDamage` 与 `ETIMCushioning.total` 各抽出一个纯重载，语义应完全不变。判据：

| 臂 | 期望 | 实测（锚点） |
| --- | --- | --- |
| 垫层四值 | 沙 0.4 / 羊毛 0.8 / 雪层 0.2 / 石 0 | `:5638` / `:5669` / `:5696` / `:5739` |
| 摔落石面 | raw 15 → damage 15 | `:5771` `fall dist=10.000 raw=15.000 damage=15.000` |
| 摔落沙面 | raw 15 → damage 6.600 | `:5904` `fall dist=10.000 raw=15.000 cushion=0.400 damage=6.600` |
| 方块堆叠 | 4/4/1/4/4 | `:5488` `stone=4 dirt=4 anvil=1 cauldron=4 wool=4` |
| 掉落盒 | before 0 → after 1，落点在盒内 | `:5950` |
| 材质 | 冰 acid/douse、雪层 dissolve、石全 false | `:6035` / `:6064` / `:6183` |

## §3 工具口径（C-B70TJ-1 的处置）

`verify-diff` 默认模式的三项计数器是 `[MountLog]` 专用；本窗一行 `[MountLog]` 都没有，故 `base=0 new=0 diffs=0` 是结构性零对零，MATCH 平凡成立。会话七建议加 `--mode=arms`。

当轮已实现并自检：`verify-diff.js --mode=arms` 按「确定性通道 × `[Chan] token`」的存在性对位，默认排除环境噪声通道（`AILog`/`SpawnLog`/`WorldGenSpawnLog`/`GelLog`/`PickupLog`/`OreLog`/`EquipLog`/`UndeadLog`），`--channels=` 可覆盖、`--strict-counts` 才比条数。`selftest-verify-diff` 由 9 项扩到 **11 项全 PASS**（新增「arms 忽略环境噪声」与「arms 抓消失臂」）。

复跑：`--mode=arms --base b66-b70tc-r1-b1.out --new b66-b70tj-r1-b1.out` → `arms base=62 new=57`、`diffs=0`、`verdict MATCH`。

## §4 分级

- **A（0）**：无。
- **B（0）**：无。
- **C（4）**：
  - C-B70TJ-1 `verify-diff` 默认模式对本窗结构性为零 → 已加 `--mode=arms`（§3）。
  - C-B70TJ-2 W4 落点 -60.469,68.279,248.495 与基线差 ≤0.03 格，判据是 `before=0→after=1` 与 `inBox`。
  - C-B70TJ-3 `four=199 one=23` 与基线相同，但与更早历史 205/17 有差（同 C-B70TC-3 的计数浮动）。
  - C-B70TJ-4 `[stop]` 每次两条（`h.stop()` 与 `finish()`），以 `exited:true` 那条为准。

## §5 终判

`PASS`（A=0 / B=0 / C=4）。产品钉值 `b70tj-build1`；单测 150 例 0 失败；纯提取未改行为。
