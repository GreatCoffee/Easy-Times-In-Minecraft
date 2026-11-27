# B-70TW 判窗回执（回归网扩面：DamageLog / TestLog / MiningLog / StalkerLog）

判定源：会话七（ETIM 验证窗执行）。判据只认服务端日志；客户端未操作。

## §0 钉值与环境（实测，两窗起收）

| 项 | 值 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,569,395 B `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` |
| jar mtime | `2026-11-26T14:28:21.3200589Z`（全程未变 = 0 rebuild） |
| PIN | `b70tj-build1`；dev `823FE705…121E227F`、sources `26CE72A4…83D98EAF`；`[PIN]` 两窗 `shaOk=true sizeOk=true mkOk=true` |
| HEAD | `1a33be0`（ahead 12；窗内 0 提交。**较 B-70TV 窗的 `9e005c8` 前进 1 个提交**，见 C-6） |
| cfg | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257`（起收同） |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`（起收同，`level-name=w-b30v` 已还原） |
| port / crash | 25565 起前 0 → 收后 0；`run/crash-reports` 0 → 0 |

## §1 窗口一（`f14-reg-core.js`，新脚本）

| 轮 | 命令 | EXIT | [done] |
|---|---|---|---|
| r1 | `RUN=b70tw-r1` | 2 | `w1=false w2=false w3=false bad=3` |
| r2（修后） | `RUN=b70tw-r2` | 0 | `w1..w3=true pin=true pass=true bad=0` |

r2 终值（`build-logs/b70tw-r2-stdout.out`）：`[W1] {"hit":{"player":"ETIM_F7","target":"EntityZombie#2139","amount":5},"dmgRows":1,"raw5":1,"pass":true}`、`[W2] {"mine":{"item":"minecraft:iron_pickaxe","block":"stone","str":8},"rows":1,"pass":true}`、`[W3] {"raw10":1,"rows":1,"pass":true}`、`[done] {"run":"b70tw-r2","pin":true,"w1":true,"w2":true,"w3":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`。

判行锚（`testharness/build-logs/f14-b70tw-r2-b1.out`，549,140 B / 3,636 行；`:2389` `Done (5.802s)!`、`:3634` `BUILD SUCCESSFUL in 34s`）：

```
3314: [TestLog] hit player=ETIM_F7 target=EntityZombie#2139 amount=5.0 [server]
3316: [DamageLog] dmg target=Zombie#2139 src=player raw=5.000 armorIn=5.000 armorOut=5.000 absorption=0.000 final=5.000 [server]
3326: [MiningLog] mine speed item=minecraft:iron_pickaxe block=stone str=8.0 [server]
3330: [TestLog] hit player=ETIM_F7 target=EntityZombie#2139 amount=10.0 [server]
3332: [DamageLog] dmg target=Zombie#2139 src=player raw=10.000 armorIn=10.000 armorOut=10.000 absorption=0.000 final=10.000 [server]
```

r1 红面与根因（`testharness/build-logs/f14-b70tw-r1-b1.out`）：

```
3313: Failed to execute 'etest hit @e[type=zombie,limit=1] 5 ETIM_F7' as ETIM_F7
3317: Invalid selector argument: 'limit=1'        ← 探针 tee 同形复现
3341: [EtimTest] commands.etest.drive_queued player=ETIM_F7 params=[dig BlockPos{x=4, y=129, z=2}]
3342: [MiningLog] mine deny grade=1 required=2 item=minecraft:stone_pickaxe block=stone [server]
```

* W1/W3 红因：本链 1.12 目标选择器**不认 `limit=1`**（`Invalid selector argument`，`/execute` 包装只会把它变成 `Failed to execute … as ETIM_F7`，异常消息被吞）⇒ 改为 `c=1`。
* W2 红因：`stone_pickaxe` 的 grade 由 `ETIMConfig`/`ETIMMining.getToolGrade` 折算为 1（`held.getItem().getHarvestLevel(...) <= 1 ? level : 3`），而 `stone` 的 `BLOCK_MIN_LEVEL = 2` ⇒ 闸按设计拒绝。R196 侧根本没有石镐（`mite-src/decompile/src/net/minecraft/Item.java:16` 只有 `pickaxeIron`），故「石镐挖石」不是 R196 语义 ⇒ 改用 `iron_pickaxe`（grade 3），探针 D 臂实测出 `mine speed item=minecraft:iron_pickaxe block=stone str=8.0`。

## §2 窗口二（`f11-b60-smoke.js` 迁移回归）

| 轮 | 命令 | EXIT | [done] |
|---|---|---|---|
| r3 | `RUN=b70tw-r3` | 1 | `w3=false` + `[fatal] ReferenceError: path is not defined`（`f11-b60-smoke.js:119`） |
| r4 | `RUN=b70tw-r4` | 2 | `w3=false`（其余全 true） |
| r5（修后） | `RUN=b70tw-r5` | 0 | `w1..w6=true pin=true pass=true bad=0` |

r5 逐臂与历史同形（`b60-verify-verdict.md`）：

* W1 `{"probe":{"kind":"stalker","hp":20,"max":20,"follow":40,"attack":4,"speed":0.23,"xp":10,"undead":"false"}, "spawn":{… "invisible":"false"}, "pass":true}`
* W2 `{"snuff":{"pos":"8,130,1","kind":"minecraft:torch"},"pass":true}`
* W3 `{"seek":{"cls":"ETIMEntityInvisibleStalker","torch":"12,130,10","dist":12},"pass":true}`
* W4 `{"low":{"allowed":true,"depth":true,"y":20},"high":{"allowed":false,"y":100},"pass":true}`
* W5 `{"spawnRows":1,"invisibleFalse":1,"pass":true}`
* W6 `{"tex":true,"langs":true,"cfgKey":true,"pass":true}`

判行锚（`testharness/build-logs/b60-b70tw-r5-b1.out`，1,328,513 B / 9,024 行；`:4723` `Done (5.575s)!`、`:9022` `BUILD SUCCESSFUL in 1m 2s`）：

```
7655: [UndeadLog] probe kind=stalker hp=20.0 max=20.0 follow=40.0 attack=4.0 speed=0.23 xp=10 undead=false at BlockPos{x=4, y=130, z=0} [server]
7658: [StalkerLog] spawn kind=stalker hp=20.0 max=20.0 follow=40.0 attack=4.0 speed=0.23 xp=10 undead=false invisible=false entity=2255
7902: [UndeadLog] stalker snuff pos=BlockPos{x=8, y=130, z=1} kind=minecraft:torch entity=ETIMEntityInvisibleStalker['Invisible Stalker'/2425, …]
8971: [StalkerLog] seek cls=ETIMEntityInvisibleStalker torch=BlockPos{x=12, y=130, z=10} dist=12 entity=2454
```

r3/r4 红面（决定性）：

```
r3/testharness/build-logs/b60-b70tw-r3-b1.out:119 → [fatal] ReferenceError: path is not defined at main (…f11-b60-smoke.js:119:19)
   （W6 用 path.join/fs 读贴图与 lang，但脚本只 require 了 harness 与 f7-wb-lib）
r4/testharness/build-logs/b60-b70tw-r4-b1.out:8625 [AILog] mob despawn kill counter=201 distSq=6964 pos=(0,130,2) entity=ETIMEntityInvisibleStalker#2392
r4:8633 [AILog] mob despawn kill counter=201 distSq=6516 pos=(0,130,6) entity=ETIMEntityInvisibleStalker#2404
r4:8635 [AILog] mob despawn kill counter=201 distSq=6100 pos=(0,130,10) entity=ETIMEntityInvisibleStalker#2405
```

* W3 红因：驱动把 bot 传到 `60.5 130 60.5`，三只 stalker 离玩家 ~60 格；`DespawnRules.KILL_DIST_SQ = 256.0`（16 格，MITE `EntityLiving:776`）使它们 **3–4 s 内被 despawn 规则杀掉**，而 `ETIMEntityAISeekLitTorch.shouldExecute()` 是 1/200 抽样（`ETIMEntityAISeekLitTorch.java:43-47`）⇒ 开奖前就被清场。r3 的 1/45 s 窗口同理（`r3` 无 seek 行）。
* 修法：`summon … {PersistenceRequired:1b}`（持久化只把 despawn 计数钉 0，不改 AI 语义），断言未动。

`verify-diff --mode=arms`（base `testharness/build-logs/b60-b60-b1.out`，new `b60-b70tw-r5-b1.out`）：

```
[DiffLog] arms channels=BlockFaceLog,ItemLog,FarmLog,FoodR196Log,FoodLog,SparkLog,MountLog,TestLog,VesselLog
[DiffLog] arms base=66 new=64
[DiffLog] DIFF arm only-in-base: [FarmLog] grass×1 ; [FarmLog] featherDrop×1
[DiffLog] DIFF arm only-in-new: [SparkLog] registered×1
[DiffLog] verdict DIFF
```

两处差异均为环境噪声（世界随机草/羽毛掉落、boot 期注册行），**不在 W1–W6 判臂内**；且该工具通道表不含 `StalkerLog` / `UndeadLog`（见 C-4），故 b60 的等价性以逐臂逐值对照为准（上表，六臂全同形）。

## §3 分级

**A = 0**（两窗 W1–W6 与其产品语义全部成立，无产品退化）。

B 级（判据/脚本不成立，已修，均为「脚本写错」而非产品退化）：

* **B-B70TW-1** `f14-reg-core.js` W1/W3 用 `@e[type=zombie,limit=1]` —— 本链 `Invalid selector argument: 'limit=1'`；改 `c=1`。
* **B-B70TW-2** `f14-reg-core.js` W2 用 `stone_pickaxe` 挖 `stone` —— 该工具 grade 1、stone 需 grade 2（`ETIMMining.getToolGrade` / `BLOCK_MIN_LEVEL`），R196 无石镐；改 `iron_pickaxe`。
* **B-B70TW-3** `f11-b60-smoke.js` 缺 `require('fs')` / `require('path')` —— W6 静态臂必崩（r3 `[fatal]`）；已补两行。
* **B-B70TW-4** `f11-b60-smoke.js` W3 未带 `PersistenceRequired` —— 60 格外受 despawn 规则清场，1/200 抽样无法开奖（r3/r4 实测 kill 行式）；已加 `{PersistenceRequired:1b}`。

C 级（可接受偏差）：

* **C-1** `f14` 的 stage 加 `time set 18000`：日光下召唤的僵尸每 tick 受 `src=onFire raw=1.000`，会在 8 s 等待内烧死并淹没物证。
* **C-2** W2 工具由石镐换铁镐（同 B-B70TW-2），`MINE_RE` 断言同步为 `minecraft:iron_pickaxe`，block/str 判据不变。
* **C-3** 世界名随 RUN 变：`w-reg-b70tw-r1/r2-v1`、`w-b60-b70tw-r3/r4/r5-v1`、`w-reg-probe-v1`（探针）全留。
* **C-4** `verify-diff --mode=arms` 通道表不含 `StalkerLog`/`UndeadLog`，b60 等价性改用逐臂逐值对照；两处 `DIFF` 行属环境噪声。
* **C-5** 每窗 `[done]` 前一条 `[stop]`（`h.stop()` 与 `finish()` 各打一次），带 `exited:true` 者为权威。
* **C-6** HEAD 实测 `1a33be0`（ahead 12），较 B-70TV 窗 `9e005c8` 前进 1 个提交（工单未钉 HEAD 具体值；jar/配置未变，0 rebuild）。

## §4 收口

| 项 | 状态 |
|---|---|
| 两窗停服 | r2 `{"exitCode":0,"exited":true}`；r5 `{"exitCode":0,"exited":true}`；r1/r3/r4 亦 0（红轮留痕） |
| 钉值 | jar/SHA/mtime 起收同（0 rebuild）；HEAD `1a33be0` 窗内 0 提交 |
| 环境 | cfg `C69FC496…`、props `6784C3ED…` 起收同；port 0→0；crash 0→0 |
| 世界 | `run/w-reg-b70tw-r1-v1`、`w-reg-b70tw-r2-v1`、`w-reg-probe-v1`、`w-b60-b70tw-r3-v1`、`w-b60-b70tw-r4-v1`、`w-b60-b70tw-r5-v1` 全部保留 |
| 证据 | `build-logs/b70tw-r{1,2,3,4,5}-stdout.out`、`build-logs/b70tw-probe-stdout.out`、`testharness/build-logs/f14-b70tw-r{1,2}-b1.out`、`b60-b70tw-r{3,4,5}-b1.out` |
| 产品码 | 零改动（本轮只改驱动 `f14-reg-core.js`、`f11-b60-smoke.js`） |

## §5 终判

**PASS** —— 窗口一 r2 `bad=0`（W1/W2/W3 全 true，判行锚见 §1）；窗口二 r5 `bad=0`（W1–W6 全 true，与 `b60-verify-verdict.md` 六臂同形，判行锚见 §2）。首轮的 4 条红（r1 三臂、r3 fatal+W3、r4 W3）全部归因为脚本/工装面（B-B70TW-1..4），产品面零退化。

本回执字数规格：9952 B / 134 行。
