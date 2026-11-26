# B-70T8 判窗正本：刷怪门纯函数化（SpawnGates）

- 执行会话：会话七；落码与汇总：主会话
- 判窗时段：2026-11-26 19:40–19:58（r1–r5）
- 判据源：`testharness/player/f12-b70t8-smoke.js`（7 臂）+ `f11-b69-smoke.js`（回归）
- 终判：**PASS**（A=0 / B=3 / C=3）

## §0 钉值

- `f7-wb-lib.js:35` = `b70t8-build2`
- release 1,563,382 B `E8C0AAFCF9B83896798B096D602B54A2AED615332335D6A52B12CB99D7BD40D5`
- dev 1,534,811 B `63400DB8365AD07311BB48E579D6CD2211F8149A02B84023FC6498D456732EF2`
- sources 1,366,774 B `C85D093C58D78E5C2EFDCA871BADEA74BF4DC43CE3FB9BDDB0E9E502CC337915`
- MK 114/282/564 + 115/10（`ok=true`）；jar mtime `2026-11-26T11:47:02.810Z`（r3–r5 窗内 0 rebuild）
- HEAD `55586fb`（窗内 0 提交）；单测 75 例（`SpawnGatesTest` 43 + `MountRulesTest` 32）0 失败

## §1 判窗轨迹

| 轮次 | 窗口 | 钉值 | 结果 | 要点 |
| --- | --- | --- | --- | --- |
| r1/r2 | f12 + f11 | build1 | FAIL（bad=2） | W1/W2 的 Jelly 期望写反（B-B70T8-1）；ooze/gel 拒行字段退化（B-B70T8-2） |
| r3 | f12 | build2 | FAIL（bad=1） | 两条 B 已闭环；W1 仍红为驱动命名（`Creeper` vs `EntityCreeper`，B-B70T8-3） |
| r4 | f11 | build2 | PASS | `verify-diff` `rules 25/25 mounts 41/41 mayplace 22 diffs=0` → MATCH |
| r5 | f12 | build2 | PASS | 七臂全绿，通道实证齐 |

## §2 锚点（`testharness/build-logs/b70t8-r5.out`）

- `:4724` `Done (6.749s)`；`:9650` `BUILD SUCCESSFUL in 36s`
- W1 y=70：`EntityCreeper=742`、`Jelly=0`、六不死族 0、`Blob/Ooze/Pudding=0`
- W2 y=40 石顶：`Blob=228`、`Jelly=215`、`Ghoul=82`、`Wight=88`、`InvisibleStalker=72`；`Ooze=Pudding=Shadow=0`
- W3 y=30：`Ooze=132`、`Shadow=67`、`Pudding=0`；W4 y=20：`Pudding=186`
- W5：y70 `EntityBat=4000`；y30 `VampireBat=643 / Nightwing=135 / EntityBat=3222`
- W6：`gelpick n=500 flag=true`；W7：`SpawnGates.decide` 已接线 + `SpawnGatesTest` 存在
- 通道实证：`:4830` `gel-gate reject cls=blob depth=false floor=false stoneAbove=false y=67`；`:4876` `cls=pudding y=71`；`:5218`/`:8294` `ooze-gate reject depth=false floor=false stoneAbove=false`
- 回归 `b69-b70t8-r4-b1.out`：`:3733` thin-snow reject、`:3740` sign-face allow、`:3743` shape-defer allow、`:3748`/`:3751` trapdoor-vertical reject、`:3491` tilled-field(torch) allow

## §3 产品改动

- 新增 `src/main/java/io/github/etim/etim/mob/SpawnGates.java`：`Kind{PASS,REJECT,INFERNAL,CANCEL}`、`Ctx`、`Decision(rule,value)`、`Dice` 包装、`decide(Class, Ctx)` 按 R196 原序 16 门。
- `ETIMSpawnTables.pickSpawn` 由约 200 行内联门折为「取 context → decide → 翻译」；`context()` 只按类取所需世界读；`logReject(pos, cls, d, ctx)` 逐字保留原拒行（含 `depth=/floor=/stoneAbove=`）。
- 单测 `src/test/java/io/github/etim/etim/mob/SpawnGatesTest.java`（43 例，`ScriptedDice` 控骰）。

## §4 分级

- **A（0）**：无。
- **B（3，全闭环）**：B-B70T8-1 工装 Jelly 期望与门本体倒置（露天判 0、石顶判 >0）；B-B70T8-2 `ooze-gate`/`gel-gate` 拒行丢 `depth=/floor=/stoneAbove=`（判据通道退化，已逐字段恢复）；B-B70T8-3 驱动用 `Creeper` 而非 `EntityCreeper` 导致 W1 恒红（改 `count(c1,'EntityCreeper','ETIMEntityInfernalCreeper')`）。
- **C（3）**：C-B70T8-1 `h.boot('boot')` 固定 tee 名（改 `h.boot(RUN)`）；C-B70T8-2 `[PIN]` 仍在 boot 后打印（沿用）；C-B70T8-3 世界名双前缀（改 `w-<RUN>-v1`）。

## §5 终判

`PASS`（A=0 / B=3 / C=3）。刷怪门重构前后等价性成立：单测 75 例覆盖决策表，r5 七臂覆盖四个深度 + 蝙蝠表 + gelpick 行，r4 回归 `verify-diff` 零差异。
