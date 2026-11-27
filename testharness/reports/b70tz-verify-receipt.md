# B-70TZ 判窗回执（回归网第三轮 · 七条公共链）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 14:2x CST
> 工单：主会话 m06101（2026-11-27 14:05）
> 终判：**PASS**（A=0 / B=7 全部为驱动面 / C=5）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70ty-build1` | 同 | ✔ |
| release | 1,569,660 B | 1,569,660 B | ✔ |
| release SHA256 | `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C` | 同 | ✔ |
| jar mtime | `2026-11-27T04:17:35.977Z` | 同 | ✔（窗内未变，0 rebuild） |
| dev | 1,541,016 B `B2B7049C…` | 同 | ✔ |
| sources | 1,370,928 B `ED3583F4…` | 同 | ✔ |
| MK | 114 / 282 / 564 + 115 / 10，`ok=true` | 同 | ✔ |
| HEAD | `119c81f` | 同 | ✔（窗内 0 提交） |
| cfg | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 起收同 | ✔ |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 起收同 | ✔ |
| port 25565 | 起前 0 / 收后 0 | 同 | ✔ |
| crash-reports | 0 → 0 | — | ✔ |
| 驱动 | `testharness/player/f16-reg-third.js`（`H.create` 工厂） | 同 | ✔ |

- `[PIN] sha=D11D4DA3…F25EC7C shaOk=true size=1569660 sizeOk=true mkOk=true ok=true`
- `[cfg] f16-b70tz-r5-b1 enchantDebugLog=true weatherDebugLog=true equipDebugLog=true farmDebugLog=true mobDebugLog=true mobPickupR196=true livestockNeedsR196=true`
- `[stop] {"exitCode":0,"exited":true}`
- 窗口：`14:19:26` 起服 → `14:20:34` 收窗（约 68 s，含 boot）
- 世界：`run/w-reg3-b70tz-r5-v1`（33 文件 / 5,005,145 B，保留）
- tee：`testharness/build-logs/f16-b70tz-r5-b1.out`（1,252,635 B / 8,487 行；`:4724` `Done (5.668s)!`，`:8487` `BUILD SUCCESSFUL in 1m 11s`）

## §1 七臂判读（r5 终值）

`[done] {"run":"b70tz-r5","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 面 | 实测 | 判定 | 锚（`f16-b70tz-r5-b1.out`） |
|---|---|---|---|---|
| W1 | EnchantLog | `mods slot=feet lvl=0 enchant=1 hunger=1.0 walk=0.1`；`pool slot=0 budget=0 size=0 item=empty` | PASS | `:7771`（mods）、`:7793`（pool） |
| W2 | WeatherLog | `rain set str=0.5000` → `rain probe rain=0.4900 thunder=0.0000` | PASS | set `:7929` 前段、probe `:7937` |
| W3 | EquipLog | `durability reassert: 134 gear rows ok`；gear dump 128 行 | PASS | `:630`（reassert）、`:396` 起（material 行） |
| W4 | HoeLog | `[FarmLog] [HoeLog] mattock till pos=2,129,2` | PASS | `:8040` |
| W5 | PickupLog | `gate flag=true canPickUp=false cooldown=0 entity=EntityZombie#2177` | PASS | `:8124`（目标僵尸；`:5402` 为早前 `canPickUp=true` 行，未参与本臂切片） |
| W6 | SwingLog | `[SwingLog] stickbreak item=minecraft:stick chance=50 entity=ETIM_F7`（第 80 次挥击命中） | PASS | `:8405` |
| W7 | SleepLog | `sleep-probe allAsleep=false lying=1/1 fullyAsleep=0 doDaylightCycle=false` → `sleep-skip n/a doDaylightCycle=false` | PASS | `:8466`（probe）、`:8467`（skip） |

- W6 概率面：1/50 判骰，80 次挥击命中 1 次（P(≥1)=1-(49/50)^80≈80.1%），属正常方差；`deny_attack` 计数 0。
- W7 前置面：`bed-refuse`／`sleep-window gate=blocked` 本窗 0 条，`lying=1/1` 证明玩家确实躺下。

## §2 收敛链（r1 → r5，全部驱动/场地面，产品码零改动）

| 轮 | EXIT | 红臂 | 根因 |
|---|---|---|---|
| r1 | 2 | W1/W2/W3/W4/W6/W7 | 见 B-B70TZ-1..5 |
| r2 | 2 | W2/W6/W7 | 天气钟压雨、盔甲架不产 SwingLog、床被 `notSheltered`+`hungerDeny` 拒 |
| r3 | 2 | W2/W6/W7 | `doWeatherCycle=true` 后天气钟按排程把雨压回 0；W6 目标距 3.4 格被 reach 拒；W7 平顶不足 |
| r4 | 2 | W6/W7 | W6 抓到 W5 遗留僵尸（`deny_attack 4.90 > 2.00`）；W7 7×7 平顶仍 `notSheltered` |
| **r5** | **0** | — | 全绿 |

### B 级（判据/工装不成立，产品面均无背离）

- **B-B70TZ-1**（r1 W1）：`ENCH_POOL_RE` 要求 `slot=feet` 且把 budget 当玩家名；产品行形如 `pool slot=0 budget=0 size=0 item=empty`。
- **B-B70TZ-2**（r1/r3 W2）：`etest rain set` 直接写 `world.rainingStrength`，但 ETIM 天气钟对非排程雨强按约 0.01/tick 衰减（r3 置 0.5、4 s 后探 0.0000），且 `doWeatherCycle=false` 会被锁成 `weather-off reason=gamerule`。改为 set/probe 相邻两 tick 连发（各 50 ms，实测 0.4900，落在 ±0.02 内）。
- **B-B70TZ-3**（r1 W3）：`durability reassert: 134 gear rows ok` 与 gear dump 都在 boot 期落盘（`:630`、`:396` 起），早于任何 `mark()`；改为全窗切片。
- **B-B70TZ-4**（r1 W4）：驱动写 `etim:mattock_iron`，注册表无此 id（只有 `mattock_copper/silver/rusted_iron/ancient_metal/mithril/adamantium`）⇒ `is not a valid item id`；改 `etim:mattock_rusted_iron`。
- **B-B70TZ-5**（r1 W7）：床用 1.13 方块状态 `minecraft:bed[part=head,facing=west]` ⇒ `There is no such block`；1.12 为 metadata（`0` 脚 / `8` 头）。
- **B-B70TZ-6**（r2/r3/r4 W6）：盔甲架 `Invulnerable` 时 1.12 `attackTargetEntityWithCurrentItem` 不会走到 `ItemStack.hitEntity`；换大血量普通僵尸后仍 0 行，实测是 reach 闸：目标距 3.4 格（`deny_attack 4.90 > 2.00` 为抓到 W5 遗留僵尸）。改为先清场、按最近僵尸选目标、目标置于 1.2 格内 ⇒ 80 次内命中。
- **B-B70TZ-7**（r2/r3/r4 W7）：`PlayerBedEvents.onPlayerSleepInBed` 的 S1 闸调用 `ETIMBedSafety.isOutdoors`（49 柱雨高扫描）⇒ 露天床 `notSheltered`；7×7 平顶仍不足，改砌封闭石屋（四面墙 y=130..131、顶盖 y=132、内部挖空）后通过。另需 `etest food 6` 避开 `sleep-window gate=blocked reason=hungerDeny`。

### C 级（可接受偏差）

- **C-B70TZ-1**：每窗两条 `[stop]`（`h.stop()` 与 `finish()` 各打一次），带 `exited:true` 者为权威。
- **C-B70TZ-2**：世界名三段前缀 `w-reg3-b70tz-r5-v1`（run 已含 `b70tz-`）。
- **C-B70TZ-3**：`etest food` 上限＝池上限 6（`The number you have entered (20) is too big, it must be at most 6`），高位补给不可用。
- **C-B70TZ-4**：`[PickupLog]` 在扫场期也会为自然刷出的僵尸/骷髅出行（`:4972`、`:5228`、`:5402`），臂内必须按切片＋实体 id 归并。
- **C-B70TZ-5**：W6 为概率臂（1/50），0 命中不构成 FAIL，须给实际挥击次数。

## §3 收口

| 项 | 值 |
|---|---|
| cfg 起收 | 同 `C69FC496…E5AEC257` |
| props 起收 | 同 `6784C3ED…D21322F1EB9`（`level-name=w-b30v`） |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T04:17:35.977Z` 未变（0 rebuild） |
| HEAD | `119c81f`，窗内 0 提交 |
| 世界 | `run/w-reg3-b70tz-r1..r5-v1` 五个全留（r5 33 文件 5,005,145 B） |
| 证据 | `build-logs/b70tz-r{1..5}-stdout.out`、`testharness/build-logs/f16-b70tz-r{1..5}-b1.out` |

## §4 终判

**PASS** — W1–W7 全绿；A=0（产品行为与 R196 面一致，零产品码改动）；B=7（全部为驱动/场地假设失效，已修）；C=5。

本回执字数规格：7202 B / 94 行。
