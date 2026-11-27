# W-B70TY 判窗正本：回归网第二轮（8 条公共链）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-27 11:5x–12:44（r1–r11，含驱动侧收敛）
- 判据源：`git-workspace/etim/testharness/player/f15-reg-chains.js`（r11 版）
- 终判：**PASS**（A=0 / B=7 / C=10）

## §0 钉值

- `f7-wb-lib.js:35` = `b70ty-build1`
- release 1,569,660 B `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C`（mtime `2026-11-27T04:17:35.977Z`，窗内 0 rebuild）
- dev 1,541,016 B `B2B7049CA6E6087C32D57307C87C87C5C4EE5FDB0EC7997D3A0F836049D52F7B`
- sources 1,370,928 B `ED3583F43606E89582411B1BAF48CC0E18E15154E327D9E1D13697713BC4A644`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- HEAD `d75cade`（窗内 0 提交）

## §1 判窗轨迹

| 轮次 | 结果 | 要点 |
| --- | --- | --- |
| r1–r4 | FAIL→PASS | 首轮 W 面红，驱动写错为主；收敛后七臂同形 |
| r5 | PASS | 报 B-B70TY-1..7 与 C-1..6；B-4 指 IngestLog 熟牛肉零行 |
| r6–r10 | FAIL | 产品补 MixinItemFood 两行后，W3 仍红：切片起点、`say` 未暴露、蛋走 ETIM 叉路、`etest food` 上限 6 |
| r11 | PASS | 决定性条件：蛋须等熟牛肉 32 tick 咀嚼落地后再右键（sleep 2500） |

终值：`[done] {"run":"b70ty-r11","w1".."w7":true,"stops":0,"crashes":0,"pass":true,"bad":0}` exit 0；
tee `testharness/build-logs/f15-b70ty-r11-b1.out`（599,974 B / 4,121 行；`:2388` Done (5.560s)、`:4119` BUILD SUCCESSFUL in 38s）。

## §2 逐臂锚点（r11）

- W1 `:3314` `[FishLog] gate token=1 wt=1000 adj=7000 …`；`:3317` `[FishLog] type n=50 cod=50 … biome=minecraft:beaches`
- W2 `:3320` `[CraftingLog] anvilplan player=ETIM_F7 item=minecraft:iron_pickaxe kind=NONE fail=0 required=0`
- W3 `:3328` `[IngestLog] ETIM_F7 (67) minecraft:cooked_beef start eating (vanilla ItemFood)`；`:3333` `[IngestLog] ETIM_F7 (67) minecraft:egg right-click refused by canIngest`
- W4 `:558` `[FurnaceLog] 8 judged smelting rows registered (…)`
- W5 `:3344` `[MeleeLog] melee target=Zombie lvl_stun=1 lvl_vamp=0 lvl_disarm=0 harmed=true`
- W6 `:3349` `[DeathLog] ETIM_F7 (67) death orb dump 10 xp (=total/3 of 30) at 6,130,6`
- W7 `:656` `[OreLog] ore=ore_copper chunk=(-272,48) rolls=40 veins=2 origin-abort=2 grown=0`（oreRows=122，含 silver/mithril）

## §3 分级

- **A（0）**：无。
- **B（7，全部为驱动侧，已闭环）**：B-1 `deathXpOrbs` 默认 false 需显式强制；B-2/B-6 日志行早于 `mark()`；B-3 正则 `(\S:[\w:]+)` 不匹配 `minecraft:cooked_beef`；**B-4 熟牛肉走 vanilla ItemFood 时 IngestLog 零行**（产品侧静默拒绝，按纪律 9 补两行日志）；B-5 reach 射线未对准得 `Double.MAX_VALUE`；B-7 蛋拒绝语义误判。
- **C（10）**：C-B70TY-1..6 为窗口惯例（计数浮动、双 `[stop]`、世界名前缀、概率臂等）；C-B70TY-7 W3 时序（拒绝面须等咀嚼落地，驱动加 `sleep(2500)`）；C-B70TY-8 切片起点须在整臂开头取、并 `say` 打标；C-B70TY-9 harness 未暴露 `say`（仅 `console.log`）；C-B70TY-10 `etest food` 上限＝池上限 6，满腹造拒绝不可用。

## §4 产品改动（B-4 方案①）

`src/main/java/io/github/etim/etim/mixins/MixinItemFood.java:54-61`：`canIngest` 拒绝分支补 `[IngestLog] … right-click refused by canIngest`，放行分支补 `[IngestLog] … start eating (vanilla ItemFood)`，均受 `ingestDebugLog` 门控 ⇒ 判定可见，不降级判据。

## §5 工具与指标

- `testharness/tools/regression-plan.js` 修复 `CH_RE` 转义（`\\?\[(…)\\?\]`），覆盖 **21/51 → 29/51**。
- `testharness/tools/verify-diff.js` arms 默认表 13 条（+`UndeadLog/DamageLog/MiningLog`）与 `NOISY` 过滤；`testharness/tools/check-driver.js` R7 builtin-require。
- `check-harness offenders=136`、`check-driver offenders=0`、`selftest-driver 9/9`、`selftest-verify-diff 13/13`、preflight 16 步 PASS。

## §6 终判

`PASS`（A=0 / B=7 全闭环 / C=10）。钉值 `b70ty-build1`；判窗 r11 全绿；W3 双面成立。
