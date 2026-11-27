# W-B70TZ 判窗正本：回归网第三轮（共用子系统通道）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-27 14:0x–14:24（r1–r5，驱动侧收敛）
- 判据源：`git-workspace/etim/testharness/player/f16-reg-third.js`（r5 版）
- 终判：**PASS**（A=0 / B=7 / C=5）

## §0 钉值

- `f7-wb-lib.js:35` = `b70ty-build1`（本批无产品码改动）
- release 1,569,660 B `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C`（mtime `2026-11-27T04:17:35.977Z`，窗内 0 rebuild）
- dev 1,541,016 B `B2B7049C…`；sources 1,370,928 B `ED3583F4…`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- HEAD `119c81f`（窗内 0 提交）；窗口约 68 s

## §1 判窗轨迹

| 轮次 | 结果 | 要点 |
| --- | --- | --- |
| r1–r4 | FAIL | 七臂里六臂驱动写错：pool 正则、天气衰减窗口、boot 行早于 mark、mattock 物品名、1.13 床语法、盔甲架不受击、平顶不遮雨 |
| r5 | PASS | 七臂全绿；W6 在第 80 次挥击命中 1/50 骰 |

终值：`[done] {"run":"b70tz-r5","w1".."w7":true,"stops":0,"crashes":0,"pass":true,"bad":0}` exit 0；
tee `testharness/build-logs/f16-b70tz-r5-b1.out`（1,252,635 B / 8,487 行；`:4724` Done (5.668s)、`:8487` BUILD SUCCESSFUL in 1m 11s）。

## §2 逐臂锚点（r5）

- W1 `:7771` `[EnchantLog] mods slot=feet lvl=0 enchant=1 hunger=1.0 walk=0.1`；`:7793` `[EnchantLog] pool slot=0 budget=0 size=0 item=empty`
- W2 `:7937` `[WeatherLog] rain probe rain=0.4900 thunder=0.0000`（set 0.5，相邻两 tick 读取）
- W3 `:630` `[EquipLog] durability reassert: 134 gear rows ok`；gear dump 128 行
- W4 `:8040` `[FarmLog] [HoeLog] mattock till pos=2,129,2`（`etim:mattock_rusted_iron`）
- W5 `:8124` `[PickupLog] gate flag=true canPickUp=false cooldown=0 entity=EntityZombie#2177`
- W6 `:8405` `[SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`（第 80 次）
- W7 `:8466` `[SleepLog] sleep-probe allAsleep=false lying=1/1 fullyAsleep=0 doDaylightCycle=false`；`:8467` `[SleepLog] sleep-skip n/a doDaylightCycle=false`

## §3 分级

- **A（0）**：产品面零背离。
- **B（7，全部为驱动侧，已闭环）**：
  - B-1 pool 正则把 `slot=` 当玩家、budget 错位；
  - B-2 天气强度每 tick 衰减（~0.01），probe 必须紧贴 set；
  - B-3 equip 两条都是 boot 期行，切片须取 boot 后而非臂前；
  - B-4 `etim:mattock_iron` 不存在，铁档是 `mattock_rusted_iron`；
  - B-5 1.12 床是 metadata（0 脚 / 8 头），不是 1.13 blockstate；
  - B-6 盔甲架 `Invulnerable` 时不进 `ItemStack.hitEntity`；改大血量僵尸并按最近目标、1.2 格内挥击；
  - B-7 床需封闭石屋（`ETIMBedSafety.isOutdoors` 49 柱雨高扫描），平顶不足。
- **C（5）**：C-1 每窗两条 `[stop]`（`exited:true` 为准）；C-2 世界名三段前缀；C-3 `etest food` 上限 6；C-4 `[PickupLog]` 扫场噪声须按实体 id 过滤；C-5 W6 为概率臂，须报实际挥击次数。

## §4 指标

- 回归覆盖 **29/51 → 36/51**（+EnchantLog/WeatherLog/EquipLog/HoeLog/PickupLog/SwingLog/SleepLog）。
- `check-driver` offenders=0；`check-channels` risks=0（7 通道 / 7 强制门）。
- 工具修正：`check-driver --script` 接受带路径参数（原先会拼成 `player/testharness/player/…`）。

## §5 终判

`PASS`（A=0 / B=7 全闭环 / C=5）。钉值 `b70ty-build1`；判窗 r5 全绿。
