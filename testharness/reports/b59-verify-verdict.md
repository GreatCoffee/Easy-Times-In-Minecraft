# W-B59 判决执行 —— 不死地表三兄弟（B-59）

- 批次：B-59（R196 `EntityGhoul` / `EntityWight` / `EntityShadow` 全量 + 血月地表开集 + 三只刷怪权重）
- 判决源：`git-workspace/etim/testharness/player/f11-b59-smoke.js` r7（build4）
- 结论：**PASS** — A=0 / B=0 / C=11
- 时间：2026-11-21 19:20–19:39（r7 起服 19:38:44，`Done` 后停服 19:39:37，exit 0）

## 0. 钉值

| 项 | 值 |
|---|---|
| release | **1,354,794 B** |
| release SHA-256 | `DD1CEB8495D0B9CB7CC2E4800BAD644D64D43BD341790CA64911D2A6008E069F` |
| dev SHA-256 | `84D4CECBBE8A3CD08B0BEE7E6A869FDB90A17DBC82EF34A7D31CE4F569F4A32A` |
| sources SHA-256 | `21F3F4F6ED6A22B8303AC5F525ED8AC925B333DBEC7BF505232389D956B3B039` |
| MK | classes 104 / entries 263 / dual 526；mixins 105 / client 10（`recentlyHit` accessor 比 B-58 多 1 条 entry） |
| 构建日志 | `git-workspace/etim/build-logs/b59-build4.out` |
| PIN 落点 | `testharness/player/f7-wb-lib.js:35`（`b59-build4`，`node -e` 复核 `mkOk=true`） |

## 1. 试跑轨迹

| 轮 | 失败面 | 定性 |
|---|---|---|
| r1 | W3/W4/W5 崩 | 三条独立缺陷：`fill` 前区块未加载（世界出生点在 x≈-127,z≈196，chunk 0,0 未载入）；`MixinEntityAIAttackMelee` 把 Ghoul 强转 `EntityZombie`（`ClassCastException`）；W3 实体从 y=130 坠到天然地面，不在 32 格扫描盒 |
| r2 | W4/W5/W6 | W4 服务端日志其实已有 snuff，脚本正则匹配不了含空格的 `BlockPos`；W5 食尸鬼独立挖块任务压住 melee；W3 遗留个体对 `/kill`（outOfWorld）免疫并污染后续臂；W6 `blood=false`（`ETIMMoonState.isNight` 用 `totalWorldTime`，`/time set` 无效） |
| r3 | W4 | 其余六臂全绿；W4 判据取值点写在 `setblock` 之后，snuff 在同一 tick 已落盘 |
| r4 | W5 | W4 转绿；W5 的 `resistance 90 4` 把 `final` 压成 0.000，R196 迟缓只在真实掉血时附加，判据永不出现 |
| r5 | W5 | 抵抗降到 III 仍是 `final=0.000`（`[DamageLog]` 两行可证），改为让玩家真实掉血 |
| r6 | — | 全臂绿，但 W5 判据落盘后 1 秒玩家被食尸鬼打死（`/attribute maxHealth` 在该整合包不生效） |
| **r7** | — | **正本：W1–W7 全绿，PIN 绿，stops=0，crashes=0，无死亡** |

`[done]` 行（`build-logs/b59-smoke-r7.out` 末行）：

```
{"run":"r7","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,
 "stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

服务端正本日志快照：`git-workspace/etim/build-logs/b59-r7-server.log`（下文行号均指此文件）。

## 2. 逐臂判决

| 臂 | 判据 | 锚点 |
|---|---|---|
| W1 属性/生成 | 三只 HP 20、follow 40、attack 5、XP 10；速度 0.28/0.25/0.23；Ghoul `undead=false`（R196 `creatureAttribute = UNDEFINED`），Wight/Shadow `undead=true` | `:7276` `[UndeadLog] probe kind=ghoul hp=20.0 max=20.0 follow=40.0 attack=5.0 speed=0.28 xp=10 undead=false`；`:7277/:7278` wight（0.25, undead=true）/ shadow（0.23, undead=true）；`:7281-7283` 三行 `spawn kind=…` |
| W2 Wight 免疫与掉落 | 玩家伤害被拒（`found=1 killed=0`，`aspect=none source=player`）；魔法伤害生效（`killed=1`）；掉落面回答 `flesh=false/nugget=false/hit=false/rare_roll=-1` | `:7352` `[UndeadLog] wight immune aspect=none source=player`；`:7374` `[UndeadLog] wight drop flesh=false nugget=false hit=false rare_roll=-1 looting=0` |
| W3 Shadow 日晒 | 夜间召唤三只全活；白天 Shadow 死、Ghoul/Wight 各 1 活 | `:7289-7290` `[DamageLog] dmg target=Shadow#2069 src=etim.sunlight raw=1000.000 … final=20.000`；`:7703` `[UndeadLog] info total ghoul=1 wight=1 shadow=0` |
| W4 光源抑制 | 玩家 >4 格、`recentlyHit == 0` 时暗影掐灭火把 | `:7819` `[UndeadLog] shadow snuff pos=BlockPos{x=8, y=130, z=1} kind=minecraft:torch` |
| W5 Ghoul 迟缓 | 真实掉血后附加迟缓 V 50 tick | `:7837` `[UndeadLog] ghoul slow target=ETIM_F7 ticks=50 amp=5 lost=true` |
| W6 刷怪门 | y=100 三只全拒；y=40 Ghoul/Wight 放行、Shadow 拒；y=20 Shadow 放行；血月下 Ghoul 放行、Wight/Shadow 因 freezing/desert 仍拒 | `:7856` `undeadgate cls=ETIMEntityWight allowed=false depth=true y=100 blood=true freezing=false desert=false`；`:7866` `cls=ETIMEntityShadow allowed=true … y=20`；`:7852-7854` y=40 三行；`:7857-7858` 血月拒行 |
| W7 资源与 cfg | 三张实体贴图、en_us/zh_cn 三键、`mobUndeadSurfaceR196=true` | `[W7] {"tex":true,"langs":true,"cfgKey":true,"pass":true}` |

## 3. 判定要点（实现侧）

1. **`/kill` 不可用于清理**：Wight 的 `isImmuneTo` 除火/岩浆/银/魔法全免疫，`/kill` 走 `outOfWorld` 被拒（`[UndeadLog] shadow immune aspect=none source=outOfWorld`）。为此新增 `/etest undeadkill [player|magic|fire]`，走 aspect 面。
2. **迟缓只在真实掉血时附加**：R196 `attackEntityAsMob` 的顺序是「命中 → `entityLostHealth()` → 迟缓」。1.12 抵抗 IV/III 会把 5 点伤害压成 0（`[DamageLog] dmg … final=0.000`），因此判窗必须让玩家真的掉血；r7 用逐次 `instant_health` 边等边回血，既保住判据又不让玩家死。
3. **Ghoul 挖块只由近战触发**：R196 里食尸鬼没有独立挖块 AI 任务，挖块是 `EntityAIAttackOnCollide` 在够不到目标时的分支。给 `ETIMEntityGhoul` 挂 `ETIMEntityAIDig` 会压住 melee（r2 只出 `dig-gate gate=sameBlock`），已改为仅由 `MixinEntityAIAttackMelee` 承载。
4. **1.12 `ModelBiped` 没有 `onGround`**：R196 `ModelInvisibleStalker` 的 `onGround` 实为挥臂进度，由 `RendererLivingEntity` 每帧灌入；1.12 等价字段是 `ModelBiped.swingProgress`（`RenderLivingBase` 灌入），`ETIMModelStalker` 按其逐行实现。
5. **`recentlyHit` 是 protected 且无 getter**：`ETIMLightSourceSuppression` 通过 `mixins/EntityLivingBaseAccessor` 新增的 `etim$getRecentlyHit()` 读取，避免用 `getRevengeTarget()==null` 之类近似。
6. **`/time set` 不影响血月判定**：`ETIMMoonState.isNight` 用 `totalWorldTime`，W6 的昼夜/血月切换走 `/etest totaltime`。
7. **`fill` 前必须先 tp**：1.12 `CommandFill` 有 `isBlockLoaded` 门，出生点区块之外的填块会报 `Cannot place blocks outside of the world`。

## 4. C 级挂账

| 编号 | 内容 | 影响 |
|---|---|---|
| C-B59-1 | R196 `has_taken_massive_fall_damage` 在 1.12 无对应字段 | 稀有四选一只判 `recentlyHit`，摔过也能出 |
| C-B59-2 | Wight 抽经验的「火/魔法抗性」折减（`getDrainAfterResistance`）未还原 | 直接扣 `max((level+1)*10, 20)` |
| C-B59-3 | Ghoul 的「地下玩家专属索敌」分支（dy ≥ y_range 且 ≤14、水平 <16）用 1.12 原生探针近似 | 索敌范围更宽（40 垂直/40 水平） |
| C-B59-4 | Ghoul `drawBackFaces()`（穿戴时剔除背面）未做 | 纯视觉 |
| C-B59-5 | Shadow 的 `getAmountAfterResistance(2.0F, 4)` | 直加 +2.0 |
| C-B59-6 | 三只 `imported.mob.*` 音效 | 按 D-2 映射原版僵尸音效 |
| C-B59-7 | Ghoul R196 `creatureAttribute = UNDEFINED` | 1.12 `EntityMob` 默认同为 UNDEFINED，天然一致（W1 `undead=false` 佐证） |
| C-B59-8 | 血月地表只放宽刷怪门，仍受 16-attempt 权重循环约束 | 与 R196 同构；判窗记录 attempt |
| C-B59-9 | Ghoul 的 `MoveToFoodItem` 觅食面未落 | `ETIMEntityAIMoveToFoodItem` 强转 `EntityAgeable` 且依赖牲畜状态，不能直接复用 |
| C-B59-10 | R196 三条按类近战（Player/Villager/Animal）合并为单条 `EntityAIAttackMelee` | 命中效果一致，仅目标筛选由 target 任务承担 |
| C-B59-11 | Shadow 回血用无参 `getBrightness()` | R196 用 `getBrightness(1.0F)`（眼部亮度），数值差异可忽略 |

## 5. 判决

**PASS** — A=0 / B=0 / C=11。W1–W7 全绿、`bad=0`、`stops=0`、`crashes=0`；boot 段 cfg 回读一致（`mobDebugLog=true`、`mobUndeadSurfaceR196=true`），起服/停服均为 exit 0。判据全部来自服务端 `[UndeadLog]` / `[SpawnLog]` / `[DamageLog]` 行，无客户端面参与。
