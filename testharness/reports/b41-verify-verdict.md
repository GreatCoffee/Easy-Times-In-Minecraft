# W-B41 判窗正本（挥击小件打包：:89 创造持剑禁破 parity ＋ :92 木棍/骨头破击）

判窗执行：会话七（ETIM 验证窗执行，DeepSeek V4.1 Flash）
窗口：2026-11-13 23:28:55 → 23:34:38（本地 UTC+8；boot1 23:28:55–23:33:58，boot2 23:33:46–23:34:38）
驱动：`git-workspace/etim/testharness/player/f11-b41-verify.js`（`RUN=v1`，同一次调用两 boot）
结论：**W0/W1/W2/W3/W4 全 PASS，propsOk PASS，`bad=false`，EXIT=0**

## 0. 钉值与现场

| 项 | 值 |
|---|---|
| release | `build/libs/etim-1.0.0.jar` 1,164,582 B<br>`D4612149B94F7A30A89F8793D57609798EC3DC7D7B68EC6318980D579D488979`<br>mtime `2026-11-13T14:40:42Z`（窗起 15:28Z，**窗内 0 rebuild**） |
| dev / sources | 1,142,454 B `39088477C7AF7BFA6D2C0FE35B5DC60E1ADA7637CE44AB0EE2BD473F95EE6F7B`<br>1,069,104 B `CE61E3E0027504446E161C5CFE03FC205A3A900E9D259C94495287D96BF2D3E2` |
| MK | refmap 101/238/476；mixins.etim.json 100+10；ok=true（双 PIN 一致） |
| HEAD | `b01c6906052fd02f07844552eada3d7cc4e22a30`（窗内 0 提交） |
| cfg | `run/config/etim.cfg` 49,382 B `1AF81626BDBC55090B8594F6157E49F8D30521A87C420C0D46ACD72E27A4F026`（起收同） |
| props | norm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7` 起收同；level `w-b30v→w-b30v` |
| crash | 24 → 24（窗内无新增） |
| port 25565 | 0 监听（窗后） |

## 1. 判读

| 窗 | 判据 | 实测 | 判 |
|---|---|---|---|
| W0 | 双停服 `{exited:true,exitCode:0,build:true}` ∧ mixinFail 0×2 | 双停服 `{"exitCode":0,"exited":true,"build":true}`；双 boot `Done (5.775s)` / `Done (5.578s)`；mixinFail 0×2 | **PASS** |
| W1 | `a1.swordGateRows===0 ∧ a1.padBlock===true ∧ a1.bareBlock===true` | `swordGateRows=0`、`padBlock=true`（泥垫未被破）、`bareBlock=true`（空手能破） | **PASS** |
| W2 | `a1.stickBreaks≥1`（bone 只记） | `stickBreaks=4`（`swings=400 landed=200`）、`boneBreaks=2`（`swings=200 landed=100`） | **PASS** |
| W3 | 旗断：`b1.swordGateRows===0 ∧ b1.padBlock===false ∧ b1.stickBreakRows===0` | `swordGateRows=0`、`padBlock=false`（泥垫仍在）、`stickBreakRows=0` | **PASS** |
| W4 | 双 `[PIN]` 同 sha ∧ mk.ok | 两 PIN 均 `D4612149…D488979`，`mk={classes:101,entries:238,dual:476,mixins:100,client:10} ok=true` | **PASS** |
| propsOk | norm 起收同 ∧ level 还原 `w-b30v` | 同上表 | **PASS** |

`bad = !(W0∧W1∧W2∧W3∧W4∧propsOk) = false`。

## 2. 判行锚（行号为 `build-logs/f11-b41-verify-r2-b1.log` / `-r2-b2.log`）

**boot1（旗开，W1/W2）**

- `b1:2353` `[23:28:55] … Done (5.775s)! For help, type "help" or "?"`
- `b1:5704` `[23:29:11] … Successfully found the block at -60, 67, 240` ← W1 创造＋石剑挖后 pad **仍是 dirt**（`padBlock=true`）
- `b1:5708` `[23:29:15] … Successfully found the block at -60, 67, 240` ← 换成空手后同一格变 air（`bareBlock=true`）
- `b1:5962` `[23:30:22] [Easy Times In Minecraft]: [SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`
- `b1:6003` `[23:30:33] … [SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`
- `b1:6027` `[23:30:38] … [SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`
- `b1:6103` `[23:30:57] … [SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`
- `b1:6579` `[23:32:58] … [SwingLog] stickbreak item=minecraft:bone chance=100 entity=ETIM_F7`（证据面）
- `b1:6617` `[23:33:08] … [SwingLog] stickbreak item=minecraft:bone chance=100 entity=ETIM_F7`（证据面）
- 全档 **0 条** `[SwingLog] swordgate`（与 `a1.swordGateRows=0` 自洽）
- `b1:6711` `BUILD SUCCESSFUL in 5m 3s`

**boot2（旗断，W3）**

- `b2:2351` `[23:33:46] … Done (5.578s)! For help, type "help" or "?"`
- `b2:2795` `[23:34:02] … The block at -60, 67, 240 is Dirt (expected: Air)` ← 创造＋石剑（旗断）**仍不破**，1.12 原生规则
- 全档 0 条 `[SwingLog]`（swordgate 与 stickbreak 皆零）
- `b2:2938` `BUILD SUCCESSFUL in 1m 4s`

**测试工装诊断行**

- `[diag] cowInWall=0`（占位牛未与实心方块重叠，无 `inWall` 无敌帧污染）
- `[diag] swings=400 landed=200 item=minecraft:stick`（服务端挥击冷却 ~1.7/s，落地率 50%，与任务书预期一致）
- `[diag] swings=200 landed=100 item=minecraft:bone`

## 3. 登记项

**C-B41-1（r1 作废，场地缺陷）** r1 的 W2 红是工装面：假人牛被 summon 在实心位，`[DamageLog] … src=inWall` 357 条占满 10 t 无敌帧，400 次裸包只落地 39 次，1/50 判骰只跑 39 次（P(0)≈0.46）。r2 先 `fill -62 67 241 -58 68 244 minecraft:air` 清空气痘并加 `cowInWall` 与 `landed` 两个诊断量，`cowInWall=0 / landed=200` 后转绿。

**C-B41-2（判据面变更：:89 由「ETIM 闸」改判「vanilla parity」）** r1/r2 期间我以探针链（cfgprobe1–9，见 `build-logs/b41-cfgprobe*.out` 与 `b41c..k.out`）追查「创造＋石剑挖不动方块且零 ETIM 行」，一度按产品面停手回报。主会话定谳：1.12 Forge 原生 `Item.canDestroyBlockInCreative`（`!(this instanceof ItemSword)`）＋`ForgeHooks.onBlockBreakEvent` 前置取消＝创造持剑本来就不能破块，与 R196 `ItemInWorldManager:127-129` 同规则同语义（census :89 zero-port）。b41-build2 已删除 `etim$swordGate` 注入，本窗 W1/W3 因此改判 parity：旗开旗断**都不破**、且**零 `[SwingLog] swordgate` 行**。我此前「产品面缺陷」的停手记录 `build-logs/b41-verify-r2-verdict-fail.md` 作废保留（留痕用）。

**C-B41-3（驱动两处微调，判据面命名不一致）** 任务书 W1 写 `padBlock===true`（测 dirt＝没破）、W3 写 `padBlock===false`（测 air＝没破），同一物理状态两个极性。按任务书字面统一：`b1.padBlock` 探测目标由 `minecraft:dirt` 改为 `minecraft:air`（false＝泥垫仍在），`a1.padBlock` 维持测 `minecraft:dirt`（true＝泥垫仍在）。另按任务书 W1 字面补上 `a1.swordGateRows===0` 这一硬门（b41-build2 已无闸，实测 0）。

**C-B41-4（判骰方差面）** 木棍 1/50 在 200 次真实落地中出 4 次（E≈4，吻合）；骨头 1/100 在 100 次落地中出 2 次（E≈1，方差内，且只作证据面不设门）。

**C-B41-5（开工自查偏差）** 开工时 cfg 已停在 `miningReform=true / livestockNeedsR196=false / mobDebugLog=false`（`1AF81626…`，与主会话 r2 前置状态一致，非本会话遗留）；`run/server.properties` 的 `level-name` 开工为 `w-b41b`，驱动在 boot1 起手即归一化为 `w-b30v` 并以此为 propsOk 基线（故 props 绝对 hash 与开工读数不同，属正常口径）。

**C-B41-6（残留面）** `run/` 下 `w-b41*` 共 15 个世界全部保留：判窗 `w-b41v`（28 文件 3,704,638 B）、`w-b41v2`（24 文件 3,639,050 B）；探针 `w-b41a/b/c/d/e/f/g/h/i/j/k/p/p3`。工作树 `M` 4 件（`MixinBlock.java`、`MixinItem.java`、`MixinPlayerInteractionManager.java`、`mixins.etim.json`）与 `??` 若干为本批既有状态，窗内未触碰。

## 4. 收口清单

| 项 | 状态 |
|---|---|
| 服务端 | 双 boot 正常停服，`BUILD SUCCESSFUL`，JVM 已退出 |
| 客户端 | 本窗无客户端（纯服务端判据） |
| 端口 | 25565 无监听 |
| crash | 24 → 24 |
| 世界 | 全保留（见 C-B41-6） |
| 产品码 | 窗内 0 改动、0 rebuild（jar mtime 未变） |
| 证据 | `build-logs/f11-b41-verify-r2-b1.log` / `-r2-b2.log` / `-r2-stdout.out`；r1 三件 `-r1-*` |

## 5. 文尾


本文件 **7998 B / 94 行**（UTF-8 无 BOM、LF、U+FFFD 0、问号 4）；证据 f11-b41-verify-r2-b1.log 1,049,060 B ／ f11-b41-verify-r2-b2.log 452,810 B ／ f11-b41-verify-r2-stdout.out 24,711 B。

三 SHA（判窗口径）：jar D4612149B94F7A30A89F8793D57609798EC3DC7D7B68EC6318980D579D488979；cfg 1AF81626BDBC55090B8594F6157E49F8D30521A87C420C0D46ACD72E27A4F026；propsNorm FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7。
