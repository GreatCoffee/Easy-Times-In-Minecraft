# W-B46 判窗正本 — D 卷深部／结构选怪门（A 方案）

## §0 钉值与现场

| 项 | 值 |
|---|---|
| 判窗 jar | `build/libs/etim-1.0.0.jar` **1,203,910 B** |
| jar sha256 | `8E68EC033B80926FB0D1A4C3B287C29561D675F4034FB5CE8B47D5B591A3B843` |
| jar mtime | `2026-11-20T14:25:03Z`（窗内未变，0 rebuild） |
| MK | `{classes:101, entries:239, dual:478, mixins:100, client:10}` ok=true |
| HEAD | `a2af07d`（窗内 0 提交） |
| 判决源 | 工作树 5 改（`CommandDevTest`／`ETIMSpawnCycle`／`ETIMSpawnTables`／`en_us.lang`／`zh_cn.lang`）＋未跟踪驱动；窗内未 checkout/stash/reset/commit |
| 主驱动 | `testharness/player/f11-b46-smoke.js`（161 行） |
| 补臂 | `testharness/player/_b46-w5.js`、`_b46-w6.js`（本会话自写，一次性） |
| 轮次 | `RUN=v1`、`RUN=v2`、W5 臂、W6 臂（世界 `run/w-b46s-v1|v2|w5|w6`） |
| cfg | `run/config/etim.cfg` `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（起收同，`B:mobDebugLog=false` L643） |
| props | `run/server.properties` `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同） |
| crash | 24 → 24 |
| port 25565 | 起 0 / 收 0 |

## §1 判读总表

| 窗 | 判据 | 轮一 v1 | 轮二 v2 | 结论 |
|---|---|---|---|---|
| W0 | 地表 (-50,120,240) 2000 次：`EntitySlime>0`、无 `slime-gate` | slime=427、reject=false | slime=432、reject=false | **PASS** |
| W1 | (-49,120,240) 上方 y=121 放石：`EntitySlime=0`、`slime-gate>0` | slime=0、reject=true | slime=0、reject=true | **PASS** |
| W2 | y=60 非血月：Revenant=0／BoneLord=0、两类 deep-gate 均有 | 0／0、两类 true | 0／0、两类 true | **PASS** |
| W3 | y=20：两类均 >0 | 41／22 | 57／28 | **PASS** |
| W4 | 血月＋totaltime 762000、y=60：两类 >0、deep-gate=0 | 58／23、无 reject | 43／33、无 reject | **PASS** |
| W5 | 自然接线（`mobDebugLog=true`，全程无 spawnpick） | 深山 gate 37 条（arm A）、矿史莱姆 gate 59 条（arm B） | — | **PASS** |
| W6 | 默认 `mobDebugLog=false`：gate 行 0；W0/W3 职业计数无异常 | gateRows=0；slime 411／creeper 431／spider 261；rev 45／bone 24／demon 49／phase 21 | — | **PASS** |
| PIN | sha 与钉值一致、mk.ok | shaOk=true ok=true | 同 | **PASS** |

两轮 `[done]`：`bad=0`、`pass=true`、`[stop] {"exitCode":0,"exited":true}`。
轮一 `Done (5.923s)`、`BUILD SUCCESSFUL in 35s`；轮二 `Done (6.076s)`、`in 36s`；W5 `Done (5.860s)`、`in 5m 27s`；W6 `[stop] {exitCode:0}`。

## §2 判行锚（行号＋原文）

轮一 `testharness/build-logs/b46-v1.out`（1,007,562 B）：

- `2360` `Done (5.923s)! For help, type "help" or "?"`
- `5826` `[SpawnLog] spawnpick n=2000 at BlockPos{x=-50, y=120, z=240} counts={EntityCreeper=424, EntityEnderman=40, EntitySkeleton=431, EntitySlime=427, EntitySpider=248, EntityZombie=430}`（W0：无 ETIM 深部类）
- `6025` `… BlockPos{x=-49, y=120, z=240} counts={EntityCreeper=535, …, EntitySpider=390, EntityZombie=494}`（W1：**无 EntitySlime**）
- `6240` `… BlockPos{x=-48, y=60, z=240} counts={EntityCreeper=522, …, EntityZombie=511}`（W2：无 Revenant／BoneLord）
- `6371` `… BlockPos{x=-47, y=20, z=240} counts={ETIMEntityBoneLord=22, ETIMEntityDemonSpider=58, ETIMEntityPhaseSpider=24, ETIMEntityRevenant=41, EntityCreeper=479, …}`（W3）
- `6584` `… BlockPos{x=-46, y=60, z=240} counts={ETIMEntityBoneLord=23, ETIMEntityRevenant=58, EntityCreeper=487, …}`（W4 血月放行）
- `5706/5709/…` `[SpawnLog] deep-gate reject cls=ETIMEntityRevenant y=120 threshold=44 blood=false at (-50,120,240)`（W2 拒绝面）
- `6612` `BUILD SUCCESSFUL in 35s`

轮二 `b46-v2.out`（996,132 B）：`2360` `Done (6.076s)`；`5755` W0（slime=432）；`5973` W1（无 slime）；`6177` W2（无深部类）；`6308` W3（BoneLord=28／Revenant=57）；`6519` W4（33／43）；`6546` `BUILD SUCCESSFUL in 36s`。

W5 臂 `testharness/build-logs/b46w5-w5.out`（5,056,868 B，全程 `spawnpick` 0 条）：

- `2544` `[SpawnLog] slime-gate reject stoneAbove at (-45,49,334)`（世界载入的自然刷怪即触门）
- `[W5] {"armA_deepGate":37,"armA_slimeGate":98,"armB_slimeGate":59,"armB_deepGate":25,"spawnpickRows":0,…}`
- arm A 样本：`deep-gate reject cls=ETIMEntityRevenant y=63 threshold=44 blood=false at (-171,63,303)`、`y=80 … at (-63,80,143)`
- arm B 样本：`slime-gate reject stoneAbove at (-5,33,238)`、`(-2,31,162)`、`(-103,31,136)`（随机坐标，非探针点）
- `34138` `BUILD SUCCESSFUL in 5m 27s`

W6 臂（`b46w6-w6.out`）：`[W6] {"gateRows":0,"w0":{"slime":411,"creeper":431,"spider":261},"w3":{"revenant":45,"boneLord":24,"demon":49,"phase":21,"blackWidow":0}}`；`cfg mobDebugLog=false (no injection in this arm)`。

PIN：`[PIN] sha=8E68EC03…3A3B843 expected=… shaOk=true mk={classes:101,entries:239,dual:478,mixins:100,client:10} ok=true`

## §3 分级与建议

**A 级：0 件。** 特别核：W4 走 `WorldInfo.setWorldTotalTime` 后**未复现 `NoSuchMethodError`**（两轮全档 `Exception in thread` / `NoSuchMethodError` 均 0 条）。

**B 级：0 件。**

**C 级（9 件）**

- **C-1** 主驱动只覆盖 W0–W4；W5/W6 由本会话自写探针补齐（`player/_b46-w5.js`、`_b46-w6.js`），非工单原驱动。
- **C-2** 门行（`slime-gate` / `deep-gate`）不带 `src=` 字段，无法从行面区分自然与探针；W5 的「自然」判定靠「本 boot 全程 0 条 `spawnpick`」间接成立。建议后续在门行加 `src=natural|probe`。
- **C-3** W0 前只清 `-50`、`-49` 两列 `y=120..255`（工装去地形），未波及其他读值；W0 两轮 slime 427/432 与 W3 的 2000 次采样相互独立。
- **C-4** `ETIMEntityBlackWidow` 在 v1／v2／w6 的 W3 计数均为 0（该坐标的选怪表不含此类），非 W6 回归；若要覆盖需单列臂。
- **C-5** W1 的石头放在 `(-49,121,240)`（候选点正上方一格），两轮 slime 均归零且 reject 行成立。
- **C-6** W5 世界 `run/w-b46s-w5` 达 93 文件 7.66 MB（含我搭的石箱与 5 分钟自然刷怪实体），按令保留。
- **C-7** 世界面：`w-b46s-r1..r4`（开发烟测遗留）与本窗 `v1/v2/w5/w6` 共 8 个世界全部保留。
- **C-8** W5 的 arm A 里 `slime-gate` 也有 98 条（地表自然刷怪点上方多为非空气方块）；因此 W5 两臂各自只看「是否存在至少一条」，不按比例判。
- **C-9** 本批门行未见 B-45 那种「带 `[server]` 尾标的双写」，判据直接按行内容匹配。

**伪代码建议（不判据，仅建言）**

```
// 目标：把门判定收敛到一处，供 spawn cycle 与 /etest spawnpick 共用
boolean passGate(Class<? extends EntityLiving> cls, World w, BlockPos p) {
    if (cls == EntitySlime.class && !w.isAirBlock(p.up()))
        return reject("slime-gate reject stoneAbove at (%d,%d,%d)", p, "src=" + src);
    if ((cls == Revenant.class && p.getY() > 44) || (cls == BoneLord.class && p.getY() > 32))
        if (!isBloodMoon(w))
            return reject("deep-gate reject cls=%s y=%d threshold=%d blood=false at (%d,%d,%d)", ...);
    return true;
}
```

`src` 由调用方传入（`natural` / `probe`），可让后续判窗直接区分自然与探针，不必依赖「无 spawnpick 行」这种间接条件。

## §4 收口

- 客户端：本窗未起客户端（无客户端面判据）。
- 服务端：四次 boot（v1／v2／w5／w6），四次 `[stop] {exitCode:0,exited:true}`，四次 `BUILD SUCCESSFUL`。
- jar：mtime `2026-11-20T14:25:03Z` 起收一致，窗内 0 rebuild。
- cfg：hash 起收同；`B:mobDebugLog` 收窗后回到 `false`（L643）。
- props：hash 起收同；`allow-flight=false`、`level-name=w-b30v` 已还原。
- crash：24 → 24；port 25565 起收均无监听。
- 世界：`w-b46s-v1`（26 文件 3,681,993 B）、`w-b46s-v2`（27 文件 3,690,900 B）、`w-b46s-w5`（93 文件 7,655,411 B）、`w-b46s-w6`（24 文件 3,623,429 B）保留。
- 证据：`b46-v1.out` 1,007,562 B、`b46-v2.out` 996,132 B、`b46w5-w5.out` 5,056,868 B、`b46w6-w6.out`、`f11-b46-smoke-v1-stdout.out` 11,221 B、`-v2-stdout.out` 11,221 B、`f11-b46-w5-stdout.out` 12,275 B、`f11-b46-w6-stdout.out` 11,188 B。

本文件 **8300 B / 109 行**（UTF-8 无 BOM、LF、U+FFFD 0）。
