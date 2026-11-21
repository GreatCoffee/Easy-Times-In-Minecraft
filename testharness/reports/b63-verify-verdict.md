# B-63 判决回执 · 银鱼族收尾（铜刺 / 霜蠹 / 下界炎灵）

- 批次：B-63（census 收尾 2 面：`EntityCopperspine.java:4-7 / EntityHoarySilverfish.java:4-7`、`EntityNetherspawn.java:12-38 / :50-56`）
- 一手源：`mite-src/decompile/src/net/minecraft/{EntitySilverfish,EntityCopperspine,EntityHoarySilverfish,EntityNetherspawn,BlockSilverfish}.java`
- 摸底：`playground/audit/silverfish-立项摸底.md`（D-1..D-6 全 A）
- 正本判决：**PASS**（A=0 / B=0 / C=8）

## 0. 钉值（终轮 build4）

| 件 | 大小 | SHA-256 |
|---|---|---|
| etim-1.0.0.jar | 1,439,550 B | `FBF440944EE83BC7FA12EDFB41CCEDECA4B95C133F667C90530CE26FD62C7F2C` |
| etim-1.0.0-dev.jar | 1,413,866 B | `5942E986558E25995CC01A050C513EA96E6B51BD9197E07B8F7E5CBDF8283AB8` |
| etim-1.0.0-sources.jar | 1,273,852 B | `C09B414E3986FBE5683ECCD0E64678225B6801C8B19D39D6F759B26BC58D401C` |

MK：classes 108 / entries 268 / dual 536 / mixins 109 / client 10（`mkCounts().ok=true`）。
PIN：`testharness/player/f7-wb-lib.js:35` = `b63-build4`；`:36` MK_PIN 同步。

## 1. 试跑轨迹

| 轮 | 结果 | 关键失败 |
|---|---|---|
| r1 | W1/W2/W5/W6 绿；W3/W4 红 | 霜蠹数秒后消失：1.12 原版 `AIHideInStone` 把实体变成银鱼块；W4 抗性 IV 把 5 伤压 0，且 `isDead` 在死亡动画期仍为 false |
| r2 | W3 转绿；W4 仍红 | 死亡触发用 `isDead` 判不到 |
| r3 | **全绿** | — |

r3 终判行（`build-logs/b63-smoke-r3.out`）：

```json
{"run":"r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

## 2. 逐臂锚点（服务端 `testharness/build-logs/b63-r3-b1.out`）

| 臂 | 判据 | 锚点 |
|---|---|---|
| W1 | 三族属性 hp/max 8、attack 3、speed 0.6、xp 10、ARTHROPOD | `:7461` probe copperspine；`:7479` spawn hoary |
| W2 | meta 3 → netherspawn、meta 4 → copperspine；在场合计 2/1/2 | `:7544` hatch meta=3；`:7572` hatch meta=4；`:7602` info total |
| W3 | 铜刺 poison 480、霜蠹 slow 50 amp 5 | `:7645` biteprobe copperspine；`:7669` biteprobe hoary |
| W4 | 火焰免、magic 可杀、死亡自爆、雪球 2 点 | `:7923` immune inFire；`:7928`/`:7933` hit magic；`:7932` explode；`:7941` snowball dealt=2.000 |
| W5 | cfg 字段+init、注册 29/30/31、`MixinBlockSilverfish` 登记并存在 | 静态断言 |
| W6 | lang 三键 en/zh、雪球分支、爆炸白名单源码 | 静态断言 |

## 3. 判定要点

1. 三族均 `extends mob/ETIMEntitySilverfish.java`，属性 HP 8 / speed 0.6 / attack 3 / XP 10，与 R196 `EntitySilverfish.java:40-47` 一致。
2. 1.12 原版 `AIHideInStone` 必须移除（R196 无钻石行为）；移除后 W2/W3 的存活计数稳定。
3. 下界炎灵死亡自爆以 `getHealth() <= 0.0F && !etimExploded` 触发，不用 `isDead`（1.12 死亡动画 20 tick 内 `isDead` 仍为 false）。
4. 爆炸保护走 `canExplosionDestroyBlock` 覆写（下界岩 / 石英矿 / 金矿返回 false），与 R196 `shouldExplodeBlock` 等价，未新增 `MixinExplosion`。
5. 银鱼块来源在 `BlockSilverfish.dropBlockAsItemWithChance` HEAD 注入：meta 3 → 下界炎灵、meta 4 → 铜刺、深渊维度 → 霜蠹，其余放行原版。
6. 雪球对下界炎灵 2 点 + 淬火，接在既有 `MixinEntitySnowball` 分支内。
7. `/kill` 产生的 `outOfWorld` 伤害同样触发自爆（`:7802`/`:7811`），与 R196「entityWasDestroyed 即爆」语义一致，非缺陷。

## 4. C 级挂账

- C-B63-1 碎片物品族无载体（D-2 裁定本批不掉碎片）：下界炎灵 R196 掉 `fragsNetherspawn`，本批不掉。
- C-B63-2 爆炸保护以覆写 `canExplosionDestroyBlock` 实现，未用 `MixinExplosion`（等价面）。
- C-B63-3 银鱼块 meta 语义按注入点直接映射 R196（3→下界岩、4→铜刺）；1.12 原版 meta 3/4 为苔石砖/裂石砖，本批不让这两类转化。
- C-B63-4 音效映射原版 `ENTITY_SILVERFISH_AMBIENT/HURT/DEATH`（D-5）。
- C-B63-5 深渊判定用 `ETIMDimensions.isUnderworld(world)` 替代 R196 `world.isUnderworld()`。
- C-B63-6 盟友召唤沿用 1.12 原版 `EntitySilverfish.AISummonSilverfish`，R196 的 ±5 扫描与 30 秒冷却未逐行还原。
- C-B63-7 铜刺/霜蠹继承链走 `EntitySilverfish` 的碰撞箱 0.3×0.7（R196 同尺寸），但 1.12 原版 `renderYawOffset` 行为保留。
- C-B63-8 `/kill` 的 outOfWorld 会触发下界炎灵自爆，判窗清理时需注意（语义一致，非缺陷）。

## 5. 判定

**PASS**：A=0、B=0、C=8。census 收尾至 218/0。
