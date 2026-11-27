# B-70UP 回归窗回执（爆炸链纯函数化后的世界接线）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 20:15 CST
> 工单：主会话 m06569（2026-11-27 20:05）
> 终判：**PASS**（A=0 / B=0 / C=3）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70up-build1` | 同 | ✔ |
| release | 1,574,356 B | 1,574,356 B | ✔ |
| release SHA256 | `C93AF1151328A7A6E0BA7CD7F61476D9A6D830A7C2B1751479DEE6DD737E02CF` | 同 | ✔ |
| jar mtime（起/收） | `2026-11-27T12:01:16.2717Z` / 同 | 未变 | ✔（0 rebuild） |
| MK | 114 / 282 / 564 + 115 / 10，`mkOk=true` | 同 | ✔ |
| HEAD | `55b0ab1` | — | 窗内 0 提交 |
| cfg（起/收） | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` / 同 | 起收同 | ✔ |
| props（起/收） | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` / 同 | 起收同 | ✔ |
| port 25565 | 0 → 0 | ✔ |
| crash-reports | 0 → 0 | ✔ |
| 驱动 | `testharness/player/f19-reg-explosion.js`（3,768 B，`node --check` 绿） | 同 | ✔ |

- `[PIN] sha=C93AF115…737E02CF shaOk=true size=1574356 sizeOk=true mkOk=true ok=true`
- `[ChannelLog] script=testharness/player/f19-reg-explosion.js channels=2 forced=3 risks=0 dead=0 harness=0 legacy=0 onHarness=true [local]`
- `[cfg] b70up-b70up-r1-b1 explosionR196=true dropR196=true mobDebugLog=true`
- `[stop] {"exitCode":0,"exited":true}`
- 世界：`run/w-reg-exp-b70up-r1-v1`（26 文件 / 4,972,829 B，保留）
- tee：`testharness/build-logs/b70up-b70up-r1-b1.out`（1,236,203 B / 8,265 行；`:4726` `Done (8.864s)!`，`:8263` `BUILD SUCCESSFUL in 48s`）

## §1 四臂判读

`[done] {"run":"b70up-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`（EXIT=0）

| 臂 | 面 | 实测 | 判定 | 锚（`b70up-b70up-r1-b1.out`） |
|---|---|---|---|---|
| W1 | boomdrop | 19 条 `[DropLog] boomdrop block=minecraft:stone drop=minecraft:cobblestone count=1 chance=1.000 x=… y=… z=…` | PASS | 首条 `:7768`（x=3 y=129 z=7），末条 `:8111` 附近；覆盖 y=129..131 立体石墙 |
| W2 | xpcheck | 19 条 `[DropLog] xpcheck block=minecraft:stone base=0 drops=1 xp=0 exempt=false` | PASS | 首条 `:7769`（与 W1 逐条配对，`drops=1 xp=0 exempt=false` 同形） |
| W3 | 半径内实体伤害 | `[ExplosionLog] dmg entity=EntityZombie dist=2.001 eff=16.000 density=1.000 damage=37.331 sizef=4.000`；另有两条 `EntityPlayerMP` 行（`dist=4.473 damage=30.740`、`dist=2.001 damage=37.331`） | PASS | `:8028`（僵尸）／`:7766`、`:8027`（玩家，仅作对照） |
| W4 | 静态接线 | `ExplosionGates.java` 与 `ExplosionGatesTest.java` 均存在（22 个 `@Test`）；`ETIMExplosion.java:44` `ExplosionGates.entityDamage(...)`、`:65` `spookUntil(...)`、`:97` `livestockReach(...)`；`ETIMBlockDrops.java:76` `chanceFor(...)`、`:84` `keep(...)`、`:105` `experience(...)`、`:148` `motionSpeed(...)`；`applyChanceModifiers` 残留 **0** 处 | PASS | 见下「静态项自查」 |

### 静态项自查（不走驱动，独立复核）

```
gates=True  test=True  testcases=22
ETIMExplosion.java:44  float result = ExplosionGates.entityDamage(entitySize, distance, density);
ETIMExplosion.java:65  long until = ExplosionGates.spookUntil(world.getTotalWorldTime(), world.rand.nextInt(400));
ETIMExplosion.java:97  double reach = ExplosionGates.livestockReach(entitySize);
ETIMBlockDrops.java:76 chance = ExplosionGates.chanceFor(chanceClass(state.getMaterial()));
ETIMBlockDrops.java:84 int kept = ExplosionGates.keep(stack.getCount(), chance, RAND::nextFloat);
ETIMBlockDrops.java:105 int xp = ExplosionGates.experience(base, dropped, exempt);
ETIMBlockDrops.java:148 double speed = ExplosionGates.motionSpeed(RAND.nextFloat());
applyChanceModifiers 残留 = 0
```

## §2 数值面解读（只作记录，不作新判据）

- W3 的两条 `density=1.000` 出自「爆炸中心与目标之间未被方块遮挡」的路径；`damage=37.331`（`sizef=4.000`、`eff=16.000`、`dist=2.001`）落在 `ExplosionGatesTest` 已固化的公式区间内，说明 `entityDamage` 委托活的。
- `chance=1.000` 为石头（`ChanceClass.NORMAL`）在 `chanceFor` 下的满值；`xp=0` 与 R196「石头经验 0」一致；`exempt=false` 符合「exempt 只对青金石」的口径。
- 本窗世界无雨天/无火（`doWeatherCycle=false`、`doFireTick=false`），故 `spookUntil`、`livestockReach` 仅有静态引用，未在世界里被触发（见 C-2）。

## §3 C 级

- **C-1**：W1/W2 的 19 条行是**一次 TNT 的完整 3×3×3 石墙**；工单只要求「出现 ≥1」，我按「逐块配对（boomdrop 与 xpcheck 一一对应、共 19 对）」核对，未出现 `xxcheck` 与 `boomdrop` 缺失配对。
- **C-2**：`spookUntil`/`livestockReach` 两条委托本窗未在世界触发（无牲畜、无雨），仅由 W4 静态项与新单测覆盖；世界级接线留给后续含牲畜的窗口。
- **C-3**：世界名四段前缀 `w-reg-exp-b70up-r1-v1`（`H.create` 的 `world` 模板所致），与历史 `w-reg5-…` 命名同族。

## §4 收口

| 项 | 值 |
|---|---|
| cfg 起收 | 同 `C69FC496…E5AEC257` |
| props 起收 | 同 `6784C3ED…D21322F1EB9` |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T12:01:16.2717Z` 未变（0 rebuild） |
| HEAD | `55b0ab1`，窗内 0 提交 |
| 世界 | `run/w-reg-exp-b70up-r1-v1`（26 文件 / 4,972,829 B）保留 |
| 证据 | `build-logs/b70up-r1-stdout.out`、`testharness/build-logs/b70up-b70up-r1-b1.out` |

## §5 终判

**PASS** — W1/W2/W3/W4 全绿；A=0（爆炸链数值与掉落/经验/遮挡密度均与 R196 口径一致）；B=0；C=3（均为窗口覆盖范围说明，非缺陷）。

本回执字数规格：5875 B / 84 行。
