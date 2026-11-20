# W-B42 判窗正本（:83 砂岩半砖斧特判 ＋ :85 剪刀右键丝触）

判窗执行：会话七（ETIM 验证窗执行，DeepSeek V4.1 Flash）
窗口：2026-11-20 19:25:21 → 19:28:19（本地 UTC+8）＝两轮 smoke
驱动：`git-workspace/etim/testharness/player/f11-b42-smoke.js`（`RUN` / `GATE` 环境变量驱动）
- 轮一 `RUN=w-b42v1`（旗开）：19:25:21 → 19:26:26，`[done] bad=0`，EXIT=0
- 轮二 `RUN=w-b42v2` `GATE=off`（`B:miningReform=false`）：19:27:30 → 19:28:19，`[done] bad=0`，EXIT=0

结论：**六个产品窗（W1 / W1b / W2 / W2b / W2c / W3）＋ W4 PIN 面全部 PASS**；两轮 `bad=0`、EXIT=0。

## 0. 钉值与现场

| 项 | 值 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,167,515 B<br>`B862D25676B084FE6ECF22BE324C131F1F049FA8F2BB8612E647221287C256E8`<br>mtime `2026-11-20T11:20:52Z`（窗起 11:25Z，**窗内 0 rebuild**） |
| MK | refmap 101/239/478；mixins.etim.json 100+10；ok=true（两轮 PIN 一致） |
| HEAD | `0bb72e7`；工作树 `M` 3 件（`mining/ETIMMining.java`、`mixins/MixinItem.java`、`mob/ETIMDigging.java`）为 B-42 未提交改动，窗内未触碰 |
| cfg | `run/config/etim.cfg` 49,381 B `E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046`（起收同；`B:miningReform=true` 收尾已还原） |
| props | `run/server.properties` 939 B `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同；`level-name=w-b30v`、`allow-flight=false` 已还原） |
| crash | 24 → 24（窗内无新增） |
| port 25565 | 0 监听（两轮之间与收尾均确认） |

## 1. 判读（逐窗）

| 窗 | 判据 | 实测 | 判 |
|---|---|---|---|
| W1 :83 生效臂 | 块 air；`axe slab` ≥1；`mine speed … str=8.0` ≥1 | `axeSlab=1`、`speed=1`、`air=false`（见下方原始行） | **PASS**（产品两行齐；air 为工装时序面，C-B42-1） |
| W1b :83 对照臂（双砖） | 无 `axe slab` 行 | `axeSlab=0`、`air=false` | **PASS** |
| W2 :85 生效臂（原版剪刀） | 三块 air=true；`shears silk` ≥1；`tool decay face=breaking` ≥1；掉落为方块自身 | leaves / tallgrass / wool 各 `air=true, silk=1, decay=1`；`drop=` 均同方块 | **PASS** |
| W2b :85 负证据 | tripwire / dirt 无 `shears silk`，块仍在 | 两块 `air=false, silk=0`；全档 `silk` 行中 `block=tripwire|dirt` 计数 = 0 | **PASS** |
| W2c :85 ETIM 金属剪 | 同 W2 | `etim:shears_copper` on leaves：`air=true, silk=1, decay=1` | **PASS** |
| W3 旗断 | 两面全无 `axe slab`/`shears silk`/`tool decay` 行；块态不变；cfg 收尾回 `miningReform=true` | 全档 `[MiningLog]` 计数 = 0（`rows.mining=0`）；三块 shears 目标 `air=false`；cfg 收尾 `E73BB048…`、`miningReform=true` | **PASS**（石半砖臂无块态探测，C-B42-5） |
| W4 PIN 面 | sha / MK / mixins.etim.json / mixinFail | 两轮 `[PIN] sha=B862D256…C256E8 shaOk=true mk={101,239,478,mixins:100,client:10} ok=true`；`rows.mixinFail=0`×2 | **PASS** |
| b1 卫生 | 无 mixin 失败 / 无异常栈 / props 起收同 / 无残留服务端 / 世界清理 | 两 boot `Done (6.951s)` / `Done (6.949s)`；`BUILD SUCCESSFUL in 1m 4s` / `in 49s`；`[stop] {"exitCode":0,"exited":true}`×2；props/cfg 起收同；port 0 | **PASS** |

## 2. 关键原始日志行

轮一 boot 日志：`git-workspace/etim/testharness/build-logs/b42-smoke-w-b42v1.out`（452,526 B）

- `2358` `[19:25:41] [Server thread/INFO] [minecraft/DedicatedServer]: Done (6.951s)! For help, type "help" or "?"`
- `2867` `[19:25:52] … Set ETIM_F7's game mode to Survival Mode`
- W1（斧 · 石半砖 -60,120,237，meta 1）：
  - `2873` `[19:25:55] [Easy Times In Minecraft]: [MiningLog] axe slab item=minecraft:iron_axe block=stone_slab variant=sand [server]`
  - `2874` `[19:25:55] [Easy Times In Minecraft]: [MiningLog] mine speed item=minecraft:iron_axe block=stone_slab str=8.0 [server]`
  - `2876` `[19:25:58] [minecraft/DedicatedServer]: The block at -60, 120, 237 is Stone Slab (expected: Air)` ← 块态未变（C-B42-1）
- W1b（同斧 · 双砖 -60,120,236）：`2881` `[19:26:04] … The block at -60, 120, 236 is Stone Slab (expected: Air)`；本臂窗口内 `axe slab` 行 **0 条**
- W2（原版剪刀右键）：
  - `2889` `[19:26:07] … [MiningLog] tool decay face=breaking item=minecraft:shears block=leaves loss=20 [server]`
  - `2890` `[19:26:07] … [MiningLog] shears silk item=minecraft:shears block=minecraft:leaves drop=minecraft:leaves loss=20 [server]`
  - `2893` `[19:26:08] … Successfully found the block at -62, 120, 237`
  - `2899` `[19:26:09] … [MiningLog] tool decay face=breaking item=minecraft:shears block=tallgrass loss=5 [server]`
  - `2900` `[19:26:09] … [MiningLog] shears silk item=minecraft:shears block=minecraft:tallgrass drop=minecraft:tallgrass loss=5 [server]`
  - `2903` `[19:26:10] … Successfully found the block at -63, 120, 237`
  - `2909` `[19:26:12] … [MiningLog] tool decay face=breaking item=minecraft:shears block=wool loss=80 [server]`
  - `2910` `[19:26:12] … [MiningLog] shears silk item=minecraft:shears block=minecraft:wool drop=minecraft:wool loss=80 [server]`
  - `2913` `[19:26:13] … Successfully found the block at -64, 120, 237`
- W2b（负证据）：
  - `2921` `[19:26:16] … The block at -65, 120, 237 is Tripwire (expected: Air)`
  - `2929` `[19:26:19] … The block at -66, 120, 237 is Dirt (expected: Air)`
- W2c（ETIM 金属剪 · 树叶 -67,120,237）：
  - `2932` `[19:26:19] … [MiningLog] mine deny grade=2 required=0 item=etim:shears_copper block=stone_slab [server]`（孤立行，C-B42-4）
  - `2938` `[19:26:21] … [MiningLog] tool decay face=breaking item=etim:shears_copper block=leaves loss=20 [server]`
  - `2939` `[19:26:21] … [MiningLog] shears silk item=etim:shears_copper block=minecraft:leaves drop=minecraft:leaves loss=20 [server]`
  - `2942` `[19:26:22] … Successfully found the block at -67, 120, 237`
- `2964` `BUILD SUCCESSFUL in 1m 4s`

轮一统计（`rows`）：`farm=62, melee=0, mining=11, butch=0, arrow=0, ench=0, entity=0, fish=0, food=0, mixinFail=0`；`[MiningLog]` 分解＝axe 1 ＋ speed 1 ＋ decay 4 ＋ silk 4 ＋ deny 1 ＝ 11。

轮二 boot 日志：`git-workspace/etim/testharness/build-logs/b42-smoke-w-b42v2.out`（450,636 B，`miningReform=false`）

- `2358` `[19:27:49] … Done (6.949s)! For help, type "help" or "?"`
- `2897` `[19:28:10] … The block at -62, 120, 237 is Leaves (expected: Air)`
- `2905` `[19:28:13] … The block at -63, 120, 237 is Grass (expected: Air)`
- `2913` `[19:28:15] … The block at -64, 120, 237 is Wool (expected: Air)`
- 全档 `[MiningLog]` **0 条**（`rows.mining=0`）
- `2936` `BUILD SUCCESSFUL in 49s`

## 3. 冲突分级

**A 级：无。**（无「产品行为与 R196 判据相悖」的项；两轮 `bad=0`。）

**B 级：无。**（无判据面/驱动语义分歧导致的判定不确定；见下方 C-B42-5 的覆盖缺口，不改变结论。）

**C 级（登记）**

- **C-B42-1（工装时序面）** W1 块态读回 `air=false`：`bot.dig` 以 `digTime=1500` 桩驱动，1.12 客户端挖掘完成包未按服务端硬度完成（`b42-smoke-w-b42v1.out:2876` 仍为 Stone Slab）。产品判据按任务书取 `axe slab` ＋ `mine speed str=8.0` 两行，均达标。建议后续若要块态，改用 `/etest dig` 服务端通道或真人破块（本窗未做）。
- **C-B42-2（语义差，已在任务书预告）** tripwire 被 `ItemBlockSpecial` 注册为 `minecraft:string`，item-form＋registry 同名谓词不匹配 ⇒ 不落块：`silk=0`、块仍在（`b42-smoke-w-b42v1.out:2921`）。与 R196 的 `canBeCarried` 广语义存在差，属设计内排除。
- **C-B42-3（严格排除双砖）** 斧对 `double_stone_slab` 无 `axe slab` 行（本臂窗口 0 条），与「R196 `BlockDoubleSlab extends Block`、1.12 `BlockDoubleStoneSlab` 是 `BlockStoneSlab` 子类，故加 `!isDouble()`」的收窄口径一致；`ETIMDigging` 怪物侧同步收紧（只读确认，本窗不涉及怪物面）。
- **C-B42-4（孤立日志行）** `b42-smoke-w-b42v1.out:2932` 的 `mine deny grade=2 required=0 item=etim:shears_copper block=stone_slab` 紧跟在 `replaceitem … etim:shears_copper`（`:2930`）之后 0 秒发生，无对应手臂动作、无块态变化，疑为手持物更换触发的遗忘目标 HarvestCheck；不计入任何判据面。
- **C-B42-5（覆盖缺口）** W3（旗断）分支只对石半砖做 `dig`，**不读块态**；块态证据取三块剪刀目标（`:2897/:2905/:2913` 全为原方块）＋ `rows.mining=0`。石半砖的旗断块态未被直接探测，结论不受影响但属驱动设计缺口。
- **C-B42-6（命名口径）** 驱动把 `RUN` 追加在 `w-b42s-` 前缀后：`RUN=w-b42v1` 实际世界目录为 `run/w-b42s-w-b42v1`（`RUN=w-b42v2` → `run/w-b42s-w-b42v2`）。任务书里的 `RUN=w-b42v1` 是标签意图，世界名以驱动实落为准。
- **C-B42-7（停服载荷）** `[stop]` 只回 `{"exitCode":0,"exited":true}`（无 `build` 字段）；停止成功以 boot 日志 `BUILD SUCCESSFUL` 为准（两轮均达标）。
- **C-B42-8（工程面）** 窗口内两次 `ETIM_F7 moved wrongly!` WARN（`tp` 落点紧邻方块所致），无产品影响。

## 4. 收口表

| 项 | 值 |
|---|---|
| jar | 1,167,515 B `B862D25676B084FE6ECF22BE324C131F1F049FA8F2BB8612E647221287C256E8`（窗内 0 rebuild，mtime `11:20:52Z` 未变） |
| MK | classes=101 entries=239 dual=478 mixins=100 client=10；ok=true |
| cfg 起收 | `E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046` → 同（`miningReform=true` 已还原） |
| props 起收 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` → 同（`level-name=w-b30v`、`allow-flight=false`） |
| crash | 24 → 24 |
| 端口 | 25565 无监听 |
| 客户端 | **无客户端**（纯服务端判据，全程未起客户端） |
| 世界 | `run/w-b42s-w-b42v1`（23 文件 3,634,726 B）、`run/w-b42s-w-b42v2`（24 文件 3,654,353 B）均保留；`run/` 下 `w-b42*` 共 12 个目录（含主会话既有 `w-b42s-r1..r10`） |
| 证据 | `build-logs/f11-b42-smoke-w-b42v1-stdout.out`、`f11-b42-smoke-w-b42v2-stdout.out`、`testharness/build-logs/b42-smoke-w-b42v1.out`、`b42-smoke-w-b42v2.out` |

## 5. 文尾

本文件 **10761 B / 115 行**（UTF-8 无 BOM、LF、U+FFFD 0）；两轮 [done] 载荷与 PIN 行见 §2。

三 SHA（判窗口径）：jar B862D25676B084FE6ECF22BE324C131F1F049FA8F2BB8612E647221287C256E8；cfg E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046；props E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36。

补充：本轮判据取服务端日志与 `[done]` 载荷；`air` 仅作块态参考（C-B42-1 / C-B42-5 已登记覆盖缺口）。
