# W-B53 判决书：拾取循环 ＋ contained_items ＋ 牲畜 XP ＋ 蝙蝠倒挂

- 执行会话：会话七（ETIM 验证窗执行）
- 判决时间：2026-11-21 11:05 CST（宿主机本地；服务端日志为 UTC，早 8 小时）
- 判决源：工作树 HEAD `48b9a8cff276e14bf8ea11feb6f9d71f8924fb0c`，`build/libs/etim-1.0.0.jar`（b53-build8，B-53 改动未提交）
- 执行方式：零 build、零产品码改动、零 commit；只写 `testharness/player/f11-b53-verify.js` 与本正本

## §0 钉值（开工／收工实测）

| 项 | 工单 | 实测（开工＝收工） | 结论 |
|---|---|---|---|
| HEAD | `48b9a8c` | `48b9a8cff276e14bf8ea11feb6f9d71f8924fb0c`（302 提交） | 一致 |
| release jar | 1,234,386 B | 1,234,386 B | 一致 |
| release SHA | `53D249CB…7E3AC56F` | `53D249CB5D073E76F2FCBB619013CCC07DB5E95AE73C9907FD5D407E7E3AC56F` | 一致 |
| jar mtime | — | `2026-11-21T02:52:59Z`（窗内未变） | **0 rebuild** |
| dev jar | 1,211,208 B | 1,211,216 B（SHA `C14942C7…1F3E0635` 一致） | 字节数差 8 B（C-B53-8） |
| sources jar | 1,118,873 B | 1,118,926 B（SHA `26A11454…AC1E700C` 一致） | 字节数差 53 B（C-B53-8） |
| MK | 102/256/512、102/10 | refmap 102/256/512、manifest 102/10、`ok=true` | 一致 |
| f7-wb-lib PIN | b53-build8 | `b53-build8`，releaseSize 1,234,386 / releaseSha 同钉 | 一致 |
| cfg | 起窗注入、收窗还原 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（起收同） | 一致 |
| props | — | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同） | 一致 |
| crash-reports | — | 24 → 24（窗内 0 新增） | 一致 |
| 端口 25565 | — | 0 → 0 | 一致 |

## §1 世界与窗口（四 boot）

| boot | tag | 世界 | 旗（pickup/bat/xp/debug/despawn） | 覆盖 |
|---|---|---|---|---|
| b1 | `b53v-v1-b1` | `w-b53-verify-v1`（新建） | true/true/true/true/true | W1–W5 |
| b2 | `b53v-v1-b2` | `w-b53-verify-v2`（新建） | **false/false/false**/true/true | W6a/b/c |
| b3 | `b53v-v1-b3` | `w-b53-verify-v2` | true/true/true/true/true | W7 前段（拾取 contained=1）＋`save-all` |
| b4 | `b53v-v1-b4` | `w-b53-verify-v2` | true/true/true/true/true | W7 后段（重启后死亡掉落） |

- 每 boot 的 gamerule：`doMobSpawning false`、`doMobLoot true`、`doTileDrops false`、`doDaylightCycle false`、`doFireTick false`、`keepInventory true`、`naturalRegeneration false`、`doWeatherCycle false`；`difficulty 1`、`time 18000`、`weather clear`
- 场地：`fill -60 119 235 -30 119 250 stone`（地板）、`-60 120 235 -30 124 250 air`（净空）、`-60 125 238 -30 125 242 stone`（蝙蝠顶棚 y=125），bot `-50.5 120 240.5` 创造悬停
- 四 boot 停服全部 `{"exitCode":0,"exited":true}`

## §2 每臂计数与判行锚

### W1 食物支（僵尸吃猪排）

`[W1] {"n":1,"porkchop":true,"cooldown":true,"contained0":true}`

- `b53v-v1-b1.out:6510` `[11:00:00] … [PickupLog] src=food item=minecraft:porkchop hpBefore=20.00 hpAfter=20.00 cooldown=400 contained=0 entity=EntityZombie#2631`
- 旁证：hp 20.00→20.00（亡灵不回血），与 R196 语义一致

### W2 修理支（骷髅吃骨头）

`[W2] {"n":1,"bone":true,"heal":true}`

- `b53v-v1-b1.out:6526` `[11:00:03] … [PickupLog] src=repair item=minecraft:bone hpBefore=2.00 hpAfter=5.00 cooldown=400 contained=0 entity=EntitySkeleton#2633`
- 先 `etest hit … 4` 把 hp 打到 2，拾取后回到 5（+3，即 50% max 6 的一半，R196 语义）

### W3 贵重支 ＋ 死亡掉落（猪人捡金锭）

`[W3-pick] {"n":1,"gold":true,"contained1":true,"cooldown40":true}` / `[W3-drop] {"n":1}`

- `b53v-v1-b1.out:6539` `[11:00:07] … [PickupLog] src=valuable item=minecraft:gold_ingot hpBefore=20.00 hpAfter=20.00 cooldown=40 contained=1 entity=EntityPigZombie#2635`
- `b53v-v1-b1.out:6549` `[11:00:09] … [DropLog] contained item=minecraft:gold_ingot entity=EntityPigZombie#2635`

### W4 蝙蝠倒挂 ＋ 受伤放下

`[W4] {"hang":1,"release":1}`

- `b53v-v1-b1.out:6552` `[11:00:12] … [BatLog] hang blockY=125 pos=-37.50,124.09,240.50 entity=EntityBat#2643`
- `b1:6558` `[11:00:15] … [BatLog] release blockY=125 prevent=60 entity=EntityBat#2643`

### W5 牲畜 XP=0

`[W5]` 四类全为 `{"zero":1,"nonzero":0}`

- `b53v-v1-b1.out:6606` `[11:00:21] [FarmLog] xp kind=cow value=0 entity=EntityCow#2644`
- `[11:00:22] … kind=pig value=0 entity=EntityPig#2645`
- `[11:00:23] … kind=sheep value=0 entity=EntitySheep#2646`
- `[11:00:25] … kind=chicken value=0 entity=EntityChicken#2647`
- 全档 0 条 `value=[1-9]`（vanilla 的 1–3 未出现）

### W6 旗关负臂（`w-b53-verify-v2`，三旗 false）

`[W6] {"pickup":0,"xpRows":0,"batHang":0,"batRelease":0}`

- b2 全档：`[PickupLog]` **0** 条、`[FarmLog] xp` **0** 条、`[BatLog]` **0** 条（hang 与 release 皆无）
- W6a 几何重做时 vanilla 装备循环可能把物品塞进主手（无 ETIM 日志），属工单预期，不计产品失败

### W7 contained_items NBT 往返（重启前拾取 → 重启后掉落）

- 前段（b3，无 `PersistenceRequired`）：`b3:1082` `[11:01:36] … [PickupLog] src=valuable item=minecraft:gold_ingot … cooldown=40 contained=1 entity=EntityPigZombie#117` ⇒ 拾取发生，物品进容器
- `save-all` + 优雅停服 → 重启（b4）
- 后段（b4）：`b4:696` `[11:01:57] … [DropLog] contained item=minecraft:gold_ingot entity=EntityPigZombie#13` ⇒ **重启后仍能掉落该金锭**，实体 id 由 `#117` 变为 `#13`（新会话重新分配），证明是重载后的同一实体，NBT `ETIMContainedItems` 往返成功
- `mobDespawnR196=true` 全程开启，实体在两次 boot 之间未被清除

## §3 判定

### 总结：**PASS**（W1–W5 全正证、W6 三臂全 0、W7 重启后仍掉落）

`[done] {"run":"v1","pin":true,"w1":1,"w2":1,"w3":1,"w3drop":1,"w4hang":1,"w4rel":1,"w5ok":true,"w6pick":0,"w6xpRows":0,"w6bat":0,"w7pick":1,"w7cont":true,"w7drop":1,"stops":[4×{"exitCode":0,"exited":true}],"pass":true}`，EXIT=0

- **A 级：0 条**（无产品行为错误或缺项）
- **B 级：0 条**（驱动一次通过，无需返工）
- **C 级：9 条**（见下）

### C 级登记

- **C-B53-1**：W2 修理行的 `contained=0` —— 骨头属消耗型修理品，不入容器，与 W3 的 `contained=1` 为设计分工，非异常
- **C-B53-2**：三支冷却不同（food 400 / repair 400 / valuable 40），与工单给的期望值逐条吻合
- **C-B53-3**：W4 release 行带 `prevent=60` 字段（工单只要求 `[BatLog] release blockY=125`），属额外字段，不违判据
- **C-B53-4**：W7 前后实体 id 由 `#117` 变 `#13` —— 重启后世界内实体表重建的正常现象，也是「确为同一实体重载」的正面锚
- **C-B53-5**：W6 的 vanilla 装备循环可能无日志地吃掉物品，故 W6 只判「ETIM 日志 0 条」，不判物品去向
- **C-B53-6**：本窗四 boot 各写独立 tag（`b53v-v1-b1..b4`），未使用固定名，避免后一轮覆盖前一轮证据
- **C-B53-7**：`mobDespawnR196=true` 在 W7 的两个 boot 全程开启，实体未被打掉；该旗在本窗只作环境项，不作判据
- **C-B53-8**：工单给的 dev/sources 字节数与实测差 8 B / 53 B（SHA 均一致），判读不受影响
- **C-B53-9**：W5 每类只命中 1 条 `value=0`（`etest hit 1000` 一次），足以判「无 1–3 值」，但未覆盖多次击杀的累积行为

## §4 收口

- 世界：`run/w-b53-verify-v1`（29 文件 / 3,662,443 B）、`run/w-b53-verify-v2`（24 文件 / 3,575,325 B）新建并保留；`run/w-b53-r1..r11`（主会话开发遗留）未动
- cfg / props：SHA 起收同（见 §0），三旗与 `mobDebugLog` 已回基线（`mobDebugLog=false`）
- crash 24→24、port 0、HEAD `48b9a8c` 窗内 0 提交、jar mtime 未变（0 rebuild）
- 证据：`testharness/build-logs/b53v-v1-b1.out` 1,013,627 B / `-b2.out` 989,627 B / `-b3.out` 158,501 B / `-b4.out` 102,437 B；node 侧 `build-logs/b53-verify-v1.node.out`
- 驱动：`testharness/player/f11-b53-verify.js`（`node --check` 绿；单文件覆盖 W1–W7，四 boot 自动切换旗组并收窗还原）

## 字节规格

- 本文件：`8489` B / `125` 行（UTF-8 无 BOM、LF）
- 判据文件 SHA-256：jar `53D249CB5D073E76F2FCBB619013CCC07DB5E95AE73C9907FD5D407E7E3AC56F`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`
