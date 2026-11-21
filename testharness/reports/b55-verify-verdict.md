# W-B55 判窗正本 — 蝙蝠家族（vampire / nightwing / giant）＋银制判定＋视暗

- 批次：B-55
- 判定源：`git-workspace/etim/testharness/build-logs/b55-smoke-r8.node.out`（驱动 `testharness/player/f11-b55-smoke.js`，RUN=r8）
- 辅助窗口：r1（build4）、r2（build5）、r3（build6）、r4（build7）、r5（build8）、r6（build9）、w2a（单臂探针）、r7（build10 首窗）
- 判决：**PASS** — A=0 / B=0 / C=7

## §0 钉值

| 项 | 值 |
| --- | --- |
| release | `etim-1.0.0.jar` 1,277,221 B / `5CC824877F4AC029AC1D88A894F6CAF24724511035DCD559DAF781C1DC0BCF7F`（b55-build10） |
| dev | 1,253,492 B / `B14D8DEAAF788FBEA2705D9D64B034E1A3C9CC3E0B7973B475970933D9DFE27B` |
| sources | 1,149,826 B / `ED5938FA1840BA053934C21383054D76A4C7617B091302A6930CBD34067F0DEE` |
| MK | classes 104 / entries 262 / dual 524 / mixins 105 / client 10（`mkCounts().ok=true`） |
| PIN 行 | `[PIN] sha=5CC82487… shaOk=true size=1277221 sizeOk=true mkOk=true ok=true` |
| 三 boot | `stops` 全 `{"exitCode":0,"exited":true}`，EXIT=0 |

## §1 窗口汇总

| 窗 | 构建 | 结论 | 说明 |
| --- | --- | --- | --- |
| r1 | build4 | bad=7 | 探针/正则缺陷（1.12 无 `limit=`、`sun` 行名错、`dim` 被 console 门挡、`batpick` JSON 解析、`entity=类名['…'/id` 用斜杠） |
| r2 | build5 | bad — | `dim read` 走数值分支；`JSON.parse({EntityBat=400})` 崩 |
| r3 | build6 | bad=3 | W1/W4/W5/W6/W7 绿；W3 命中但正则失配；W5b 阈值错 |
| r4 | build7 | bad=2 | W5b 转绿；W3 正则仍按 `#` 取不到 id（实数串是 `'/2185`） |
| r5 | build8 | bad=1 | W3 转绿；W2 破案：`AxisAlignedBB.expand` 单向扩展 |
| r6 | build9 | bad=1 | `expand→grow` 后目标获取成立（dist 5.43），仍无咬合 |
| w2a | build10 | 探针 | 45 s 内 19 次 `bite`；咬合盒 `contract` 缩成零宽是真因 |
| r7 | build10 | bad=1 | `bite dealt=1.0 healed=1.0 feed_cd=1200`，仅阈值（≥3 次咬）与 R196 协议反了 |
| **r8** | **build10** | **pass=true / bad=0** | 九臂全绿 |

## §2 W1–W7 逐臂判行

`git-workspace/etim/testharness/build-logs/b55-r8-b1.out`（b1，主窗）：

- **W1 属性/XP**：`:6705` `summon kind=vampire … health=3.0 max=3.0 damage=1.0 xp=5`；`:7483` `kind=nightwing … health=3.0 max=3.0 damage=1.0 xp=10`；`:7493` `kind=giant … health=6.0 max=6.0 damage=2.0 xp=10`。→ `ETIMEntityVampireBat.applyEntityAttributes`（`registerAttribute(ATTACK_DAMAGE)` 后 `3.0×scale` / `1.0×scale`）成立。
- **W2 追击＋咬合＋吸血**：`:7342` `vampire target cls=ETIMEntityVampireBat target=EntityPlayerMP`（`ETIMMobPrey.findNearest` 取到玩家）；`:7604` `bite cls=ETIMEntityVampireBat target=ETIM_F7 dealt=1.0 healed=1.0 feed_cd=1200`，bot 血量 6→5。→ R196 咬合协议完整：伤害 1.0、按失血回血、满血后锁 1200 tick。
- **W3 aspect 门**：`:7628` `nightwing immune aspect=none source=player`（铁剑）；`:7648` `nightwing hurt aspect=silver`（`etim:sword_silver`）；`:7669` `nightwing hurt aspect=magic`（附魔剑 `ench:[{id:16,lvl:1}]`）。→ 三 aspect 判定与免疫门同 R196 `EntityNightwing.isImmuneTo`。
- **W4 日晒**：`:7687` `nightwing hurt aspect=sunlight amount=1000.0 hurt=true`（`time set 6000` 后）；暗处行 `:7630` `nightwing sun=false brightness=0.08333333 heal=3`（每 40 tick 回血）。
- **W5 视暗 set/read**：`:7692` `dim probe value=1.5 player=ETIM_F7`；`b55-r8-b2.out:998` `dim read value=0.33000112`（写 1.5 后衰减读取，>0 且 ≤1.5）。
- **W5b 重启 NBT 往返**：跨 boot2 读出 `0.33000112`（停服瞬间为 1.5，重启后按 0.01/tick 衰减，说明 `vision_dimming` 已写入/读回 NBT）。
- **W6 刷怪表＋深度门＋血月**：`:7801` `batpick n=400 at BlockPos{x=0, y=60, z=0} counts={EntityBat=400}`（地表无家族）；`y=20` → `{ETIMEntityNightwing=12, ETIMEntityVampireBat=65, EntityBat=323}`；`:7702` `bat-gate reject cls=ETIMEntityVampireBat y=60 threshold=48 blood=false`；血月 `totaltime 762000` 后 y=60 → `{ETIMEntityNightwing=15, ETIMEntityVampireBat=61, EntityBat=324}`。
- **W7 旗断**：`B:mobBatFamilyR196=false` 后 `b55-r8-b3.out:726` `batpick n=400 at BlockPos{x=0, y=20, z=0} counts={EntityBat=400}`。

## §3 判定要点

1. 咬合盒必须与 R196 `boundingBox.copy().scaleXZ(0.5)` 等价：`grow(-0.125, 0, -0.125)`。`contract(0.25,0,0.25)` 会把 0.5 宽的盒缩成零宽，实测 45 s 零咬合。
2. 1.12 `AxisAlignedBB.expand(x,y,z)` 是**单向**扩展（只推正侧），`grow` 才是双向膨胀。B-55 的 `ETIMMobPrey.findNearest` 与诊断盒均已改为 `grow`，否则 32 格扫描只覆盖目标正象限。
3. `EntityBat` 不是 `EntityMob`：`ATTACK_DAMAGE` 未注册，子类必须先 `getAttributeMap().registerAttribute(...)`，否则 `getEntityAttribute` 抛 `Unknown attribute`。
4. `EntityBat.collideWithNearbyEntities()` 在 1.12 是空体、由 `EntityLivingBase.onLivingUpdate` 的 push 段每 tick 虚调用；蝙蝠家族的咬合应落在这里，而不是 `onUpdate`。
5. `feed_cooldown=1200` 是 R196 的正向判据，不是缺陷：咬中满血后自锁，之后 1200 tick 不再猎玩家。

## §4 C 级登记

- **C-B55-1** 客户端黑幕观感（`client/VisionDimOverlay.java` 的 alpha 曲线与 `partialTicks` 插值）只能由用户肉眼判定，A/B 面已由服务端数值覆盖。
- **C-B55-2** 1/4 群上限骰（`ETIMSpawnCycle.java:582-591`）只有聚合日志 `vampire-group max=`，本轮烟测未走自然刷怪路径，无逐 group 判行；`batpick` 直取列表不经过该分支。
- **C-B55-3** 暗处 40 tick 回血只在真刷怪/召唤实体上出现（`sun=false` 行），未做长时间连续采样，`brightness` 边界（0.4 阈值）未取极值复核。
- **C-B55-4** 下界巨型替换（`ETIMUnderworldSpawns.substituteClassToSpawn` 的 1/6）未在本轮判窗覆盖，只有代码路径与既有 B-5x 结构复核。
- **C-B55-5** 银判定按 `ETIMMetalGear.etimMetal()==SILVER` 取，附魔与药水走 `isMagicDamage()/EntityPotion/EntityAreaEffectCloud/主手附魔` 近似；R196 的 `setSilverAspect` 还覆盖银箭（`ETIMEntityArrow` 已接）与投掷物，未做逐物品矩阵。
- **C-B55-6** `preysUpon` 的村民/动物分支只做了玩家臂实测，动物/村民臂靠代码复核。
- **C-B55-7** 死亡当秒 `hurt=false` 刷屏已由 `isDead` 早退修掉，但未做「多实体同秒死亡」压力量测。

## §5 结论

B-55 九个判臂全绿，release 钉值可复现（MK 与 sha 双一致），三 boot 优雅停服。银制判定与最小视暗均按用户「全还原优先」裁定实现，未以工作量换豁免。判定 **PASS（A=0 / B=0 / C=7）**，可进入 census 清账与封批。
