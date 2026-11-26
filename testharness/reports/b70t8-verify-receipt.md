# B-70T8 判窗回执 —— 刷怪门纯函数化等价性（b70t8-build1）

会话七独立跑窗：窗 1 `f12-b70t8-smoke.js`（主判）+ 窗 2 `f11-b69-smoke.js`（回归，`verify-diff` 对位）。
执行时段：2026-11-26 19:39–19:47 CST（窗 1 `19:39:0x→19:39:43`，窗 2 `19:41:0x→19:43:27`）。
判据只认服务端日志（`testharness/build-logs/` tee 全量）；客户端未操作。

## §0 钉值实测（只读，全对）

| 项 | 期望（工单） | 实测 | 判 |
|---|---|---|---|
| release | 1,563,225 B / `71DF547B…5D5A57` | 1,563,225 B / `71DF547B953D0D7FDDC3E05A4DAC1944DF296913A2CB4FEF61643C799C5D5A57` | 对 |
| dev | 1,534,650 B / `C578A1A6…DF66690` | 1,534,650 B / `C578A1A689A5A0AFA199E77B56AA3E59E3FCD37A420C3E9ED5729FF94DF66690` | 对 |
| sources | 1,366,689 B / `B3CB9408…C7FCD` | 1,366,689 B / `B3CB940896CC05F9D9BDB7EB5B8D7930B5ADCCCD376C779432436695DC2C7FCD` | 对 |
| MK | 114/282/564 + 115/10 ok | `mkOk=true`（`[PIN]`） | 对 |
| jar mtime | 2026-11-26T11:34:13.567Z | `2026-11-26T11:34:13.5665276Z`（窗后仍未变，0 rebuild） | 对 |
| HEAD | `55586fb`，窗内 0 提交 | `55586fbd7b3e23c15c28154527c66f03ec1c1f49`，窗后仍是 `55586fb` | 对 |
| cfg 起 | — | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | — |
| props 起 | — | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | — |
| port / crash 起 | 0 / 0 | 0 / 0 | 对 |

工作树（窗起，未动）：`M src/main/java/io/github/etim/etim/mob/ETIMSpawnTables.java`、`M testharness/player/f7-wb-lib.js`、`?? src/main/java/io/github/etim/etim/mob/SpawnGates.java`、`?? src/test/java/io/github/etim/etim/mob/`、`?? testharness/player/f12-b70t8-smoke.js`、`?? .worktrees/`。

## §1 窗 1（主判）终判 JSON 与逐臂

`build-logs/b70t8-r1-stdout.out` 末行：

```
[done] {"run":"b70t8-r1","pin":true,"w1":false,"w2":false,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":false,"bad":2,"badKeys":["w1","w2"]}
```

`[PIN] sha=71DF547B…5D5A57 shaOk=true size=1563225 sizeOk=true mkOk=true ok=true`
`[cfg] boot mobDebugLog=true mobGelatinousR196=true mobBatFamilyR196=true`
`[stop] {"exitCode":0,"exited":true}`

| 臂 | 结果 | 判定 |
|---|---|---|
| W0 群系选择 | `{"biome":"minecraft:forest","at":[200,200]}` | PASS（非 jungle/swamp/hell） |
| W1 y=70 | `pass=false`（Jelly=0） | **FAIL（B-B70T8-1）** |
| W2 y=40 石顶 | `pass=false`（Jelly=203 ≠ 0） | **FAIL（B-B70T8-1，同一根因）** |
| W3 y=30 | `pass=true`（Ooze=144、Shadow=55、Pudding=0） | PASS |
| W4 y=20 | `pass=true`（Pudding=181） | PASS |
| W5 batpick | `pass=true`（y70 `EntityBat=4000`；y30 `VampireBat=621`/`Nightwing=121`） | PASS |
| W6 gelpick | `pass=true`（`gelpick n=500 flag=true`） | PASS |
| W7 静态 | `pass=true`（`SpawnGates.decide(cls, ctx)` 已接线、`SpawnGatesTest.java` 存在） | PASS |

## §2 红面证据（单列，不并入 A）

### B-B70T8-1　W1/W2 的 Jelly 期望与门本体倒置（判据面）

W1 完整 counts（`testharness/build-logs/b70t8-r1-tee.out:8638`，副本 `b70t8-r1-tee.out` ← 原 `boot.out`）：

```
[SpawnLog] spawnpick n=4000 at BlockPos{x=200, y=70, z=200} counts={ETIMEntityClayGolem=355, ETIMEntityEarthElemental=65, ETIMEntityHellhound=68, EntityCreeper=742, EntityEnderman=67, EntitySkeleton=719, EntitySlime=736, EntitySpider=452, EntityZombie=796}
```

W2 完整 counts（同文件 `:8822`）：

```
[SpawnLog] spawnpick n=4000 at BlockPos{x=210, y=40, z=200} counts={ETIMEntityBlob=222, ETIMEntityClayGolem=357, ETIMEntityEarthElemental=72, ETIMEntityGhoul=85, ETIMEntityHellhound=68, ETIMEntityInvisibleStalker=71, ETIMEntityJelly=203, ETIMEntityRevenant=63, ETIMEntityWight=84, EntityCreeper=706, EntityEnderman=73, EntitySkeleton=728, EntitySpider=563, EntityZombie=705}
```

同窗旁证（`b70t8-r1-tee.out:5049`）：

```
[SpawnLog] jelly-gate reject stoneAbove=false y=70 at (11,70,143)
```

（全档 30 条 `jelly-gate reject stoneAbove=false`，y 值 55/65/70/73/80/82…，均为顶部无石处。）

门本体（当前工作树 `src/main/java/io/github/etim/etim/mob/SpawnGates.java:146-148`）：

```java
if (cls == ETIMEntityJelly.class && !c.stoneAbove) {
    return reject("jelly");
}
```

重构前一手（`git show 55586fb:src/main/java/io/github/etim/etim/mob/ETIMSpawnTables.java:402-410`）：

```java
if (cls == ETIMEntityJelly.class) {
    boolean stoneCeiling = stoneAbove(w, pos);
    if (!stoneCeiling) {                       // 「Jelly 只要求上方有石」
        ...  [SpawnLog] jelly-gate reject stoneAbove=false y=...
        continue;
    }
}
```

历史对照（重构前 B-57 窗，`testharness/build-logs/b57-b57-b1.out`）同样出现 `[SpawnLog] jelly-gate reject stoneAbove=false y=65/73/82`（28 条）。

**结论**：Jelly 的门是「上方必须有石」（无深度门），故 y=70 露天必然 0、y=40 带石顶必然 >0。工单 W1 期望「y=70 Jelly>0」与 W2 期望「y=40 Jelly=0」与该门（以及重构前 HEAD 同一门）相反 ⇒ 判据不成立（B），不是本批重构引入的背离。若主会话认为 Jelly 在露天本就该出现，那是**重构前即存在**的行为问题，应另开批处置，不计入本窗 A。

### B-B70T8-2　`ooze-gate` / `gel-gate` 日志字段退化（判据通道）

重构后 `src/main/java/io/github/etim/etim/mob/ETIMSpawnTables.java:404`、`:411-413`：

```java
ETIM.LOGGER.info("[SpawnLog] ooze-gate reject at " + posToString(pos));
...
ETIM.LOGGER.info("[SpawnLog] gel-gate reject cls="
        + (cls == ETIMEntityPudding.class ? "pudding" : "blob")
        + " y=" + pos.getY() + " at " + posToString(pos));
```

重构前（`build-logs/_head-spawntables.java:391-400`、`:418-430`）两行分别带 `depth=/floor=/stoneAbove=`（gel 带 `depth= floor= stoneAbove= y=`）。

影响：B-52 的 W2/W3/W4 判据正是按 `ooze-gate reject depth=false floor=true stoneAbove=true y=60` 这类字段裁定的（见 `testharness/reports/b52-verify-verdict.md`）；字段消失后该判据面不可用（B-52 若复跑会红）。本窗未改判定，仅登记。

## §3 窗 2（回归）与 `verify-diff`

`build-logs/b70t8-r2-stdout.out`：

```
[PIN] sha=71DF547B…5D5A57 shaOk=true size=1563225 sizeOk=true mkOk=true ok=true
[cfg] b69-b70t8-r2-b1 blockDebugLog=true sparkR196=true mountedR196=true farmDebugLog=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t8-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

tee：`testharness/build-logs/b69-b70t8-r2-b1.out`（542,647 B / 3,811 行；`:2389` `Done (6.283s)!`；`:3817` `BUILD SUCCESSFUL in 1m 36s`）。

对位命令与结果：

```
node testharness\tools\verify-diff.js --base testharness\build-logs\b69-b70t4-r2-b1.out --new testharness\build-logs\b69-b70t8-r2-b1.out
[DiffLog] summary rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0
[DiffLog] verdict MATCH
```

按工单说明单列：base/new 两侧均无 `[done]`/`[PIN]` 行（二者由 `say()` 写 `<run>-driver.log` 与 stdout，tee 不含），工具已打印 `note … base has no [done] row` / `no [PIN] row`，**不计差异**。

六个锚点（`b69-b70t8-r2-b1.out`，与 `b69-b70t4-r2-b1.out` 同名同号）：

- `:3731` `rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6`
- `:3738` `rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9`
- `:3741` `rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9`
- `:3746` `rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4`
- `:3749` `rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4`
- `:3491` `rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4`

## §4 等价性核对（只读源码）

- **门序与阈值**：`SpawnGates.decide`（`SpawnGates.java:107-191`）与重构前 if 链（`_head-spawntables.java:318-500`）逐条同序：creeper(lit→infernal) → spider(lit) → blackwidow(0.5) → demon/phase(y>32 且 underworld) → woodspider → slime(stoneAbove) → ooze(depth≤32 ∧ stoneFloor ∧ stoneAbove) → jelly(stoneAbove) → blob(≤40)/pudding(≤24 ∧ stoneFloor)(二者 ∧ stoneAbove) → revenant(>44)/bonelord(>32)（∧ underworld ∧ ¬blood）→ ghoul/wight/shadow/stalker(cfg+undead) → gel-cfg → bat-cfg → vampireBat(>48)/nightwing(>32) → ghast dedup(CANCEL)。
- **骰序**：creeper `nextInt(4)`→`nextInt(40)`→`nextFloat`；spider `nextInt(4)`；blackwidow `nextFloat` —— 与 HEAD 逐处同参同序（`Dice` 包 `w.rand`，`ETIMSpawnTables.java:353`）。
- **世界读注入**：`context()`（`:346-380`）只为需要的类取 `stoneAbove`/`stoneFloor`（slime+gel；ooze+pudding）、`woodspiderOk`、`blood`、`undeadOk`、`ghastDedup`；`c.overworld = ETIMUnderworldSpawns.checkDepth(w)` 与 HEAD 的 `checkDepth(w)` 同义（HEAD 各处直接调）。
- **INFERNAL 翻译**：`ETIMSpawnTables.java:320-327` 构造 `new SpawnListEntry(ETIMEntityInfernalCreeper.class, picked.itemWeight, picked.minGroupCount, picked.maxGroupCount)`，与 HEAD `:330-332` 同参。
- **CANCEL 翻译**：`:328-335` 打 `[SpawnLog] ghast dedup cancel at (x,y,z) → null` 后 `return null`，与 HEAD `:496` 同语义。
- 唯一行为可见差异＝`logReject` 的字段（B-B70T8-2）。

## §5 环境收口

| 项 | 起 | 收 | 判 |
|---|---|---|---|
| cfg | `C69FC496…AEC257`（56,005 B） | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 同 |
| props | `6784C3ED…2F1EB9` | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同 |
| port | 0 | 0 | 对 |
| crash | 0 | 0 | 对 |
| HEAD | `55586fb` | `55586fb`（0 提交） | 对 |
| jar mtime | `11:34:13.566Z` | `11:34:13.566Z` | 0 rebuild |

世界保留（未删）：`run/w-b70t8-b70t8-r1-v1`（33 文件 5,582,593 B）、`run/w-b69-b70t8-r2-v1`。
证据：`testharness/build-logs/b70t8-r1-tee.out`（1,459,742 B，原 `boot.out` 快照）、`build-logs/b70t8-r1-stdout.out`、`testharness/build-logs/b69-b70t8-r2-b1.out`（542,647 B）、`build-logs/b70t8-r2-stdout.out`。

## §6 分级与终判

| 级 | 编号 | 内容 |
|---|---|---|
| A | — | 无（未发现与重构前背离） |
| B | B-B70T8-1 | W1/W2 的 Jelly 期望倒置（判据不成立；产品门与 HEAD 一致） |
| B | B-B70T8-2 | `ooze-gate`/`gel-gate` 日志字段退化（判据通道；B-52 面不可用） |
| C | C-B70T8-1 | 驱动 `h.boot('boot')` 用常量 tag ⇒ tee 固定 `testharness/build-logs/boot.out`，两轮互相覆盖（已快照 `b70t8-r1-tee.out`）；建议 tag 带 RUN |
| C | C-B70T8-2 | `[PIN]` 在 boot 之后打印（沿用前批惯例，非强制先 PIN） |
| C | C-B70T8-3 | 世界名双前缀 `w-b70t8-b70t8-r1-v1`（world 常量已带 `w-b70t8-`，RUN 亦含 b70t8） |

**终判：FAIL**（`[done] pass=false, bad=2`，驱动自判口径）；等价性面：**未发现 A 级背离**，两条红均为 B（判据/通道），窗 2 回归 `verdict MATCH / diffs=0`。
待裁：① W1/W2 的 Jelly 期望是否按门本体改写（y=70 判 0、y=40 判 >0）——若采纳，本窗可改判 PASS；② B-B70T8-2 的 `depth=/floor=/stoneAbove=` 字段是否恢复（B-52 判据依赖）。

---

当时（§r1）本文件 11,735 B / 181 行（UTF-8 无 BOM、LF）；三 SHA：jar `71DF547B…5D5A57`、cfg `C69FC496…AEC257`、props `6784C3ED…2F1EB9`。

## §r3 复判（build2，窗 1，RUN=b70t8-r3）—— W2 转绿、W1 余红系驱动命名

主会话处置：B-B70T8-1 判据倒置已改驱动（y=70 判 Jelly=0、y=40 判 Jelly>0）；B-B70T8-2 字段已恢复（`logReject` 打 `depth=/floor=/stoneAbove=`）；C-B70T8-1/-3 已修（`h.boot(RUN)`、世界名 `w-<RUN>-v1`）。

钉值（b70t8-build2，实测全对）：release 1,563,382 B `E8C0AAFCF9B83896798B096D602B54A2AED615332335D6A52B12CB99D7BD40D5`（mtime `2026-11-26T11:47:02.810Z`）、dev `63400DB8…6732EF2`、sources `C85D093C…CC337915`、MK ok、HEAD `55586fb`、cfg `C69FC496…AEC257`、props `6784C3ED…2F1EB9`、port 0、crash 0。

```
[cfg] b70t8-r3 mobDebugLog=true mobGelatinousR196=true mobBatFamilyR196=true
[PIN] sha=E8C0AAFC…7BD40D5 shaOk=true size=1563382 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t8-r3","pin":true,"w1":false,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w1"]}
```

- **B-B70T8-1 闭合**：W2 `{"ETIMEntityJelly":214, …}` → `pass=true`（jelly>0、ooze/pudding/shadow=0）；W1 侧 `jelly=0` 与倒置前的期望已一致。
- **B-B70T8-2 闭合**（判据通道字段回位，`testharness/build-logs/b70t8-r3.out`）：
  - `:4885` `[SpawnLog] gel-gate reject cls=pudding depth=false floor=false stoneAbove=false y=72 at (-35,72,300)`（gel-gate 共 99 条）
  - `:5135` `[SpawnLog] ooze-gate reject depth=false floor=false stoneAbove=false y=72 at (13,72,195)`（ooze-gate 共 56 条）
- **W1 余红定谳 = 驱动命名缺陷（B-B70T8-3，非产品）**：`f12-b70t8-smoke.js:124` 原为 `count(c1, 'Creeper', 'ETIMEntityInfernalCreeper') > 0`，而 census 键是注册名 `EntityCreeper`，`count()` 精确匹配 ⇒ 恒 0。实测 `Creeper exact=0 / EntityCreeper=725 / infernal=0`。r1 的 W1 红同样源于此（我当时归因于「Jelly 期望>0」，归属不完整，此处更正）。
- 处置（只改驱动，语义不变）：`:124` 改 `count(c1, 'EntityCreeper', 'ETIMEntityInfernalCreeper') > 0` 并加 B-B70T8-3 注释；`node --check` 绿。

## §r4 窗 2（回归，build2，RUN=b70t8-r4）

```
[PIN] sha=E8C0AAFC…7BD40D5 shaOk=true size=1563382 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t8-r4","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

tee `testharness/build-logs/b69-b70t8-r4-b1.out`（542,987 B / 3,814 行；`:2389` `Done (6.638s)!`；`:3820` `BUILD SUCCESSFUL in 1m 38s`）。

```
[DiffLog] base=b69-b70t4-r2-b1.out new=b69-b70t8-r4-b1.out
[DiffLog] summary rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0
[DiffLog] verdict MATCH
```

（`note … has no [done]/[PIN] row`：tee 不含 `say()` 行，两侧同况，不计差异。）

六锚点（行号较 r1 后移 2 行，文本与 base 同）：

- `:3733` `rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6`
- `:3740` `rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9`
- `:3743` `rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9`
- `:3748` `rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4`
- `:3751` `rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4`
- `:3491` `rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4`

## §r5 复判终窗（build2，窗 1，RUN=b70t8-r5）—— 全绿

```
[cfg] b70t8-r5 mobDebugLog=true mobGelatinousR196=true mobBatFamilyR196=true
[PIN] sha=E8C0AAFC…7BD40D5 shaOk=true size=1563382 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t8-r5","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

tee `testharness/build-logs/b70t8-r5.out`（1,431,180 B / 9,644 行；`:4724` `Done (6.749s)!`；`:9650` `BUILD SUCCESSFUL in 36s`）。

| 臂 | 关键 counts | 判 |
|---|---|---|
| W0 | `{"biome":"minecraft:forest","at":[200,200]}` | PASS（非 jungle/swamp/hell） |
| W1 y=70 | `EntityCreeper=742`、`Jelly=0`、六不死族 0、`Blob/Ooze/Pudding=0` | PASS |
| W2 y=40 | `Blob=228, Jelly=215, Ghoul=82, Wight=88, InvisibleStalker=72`；`Ooze=0, Pudding=0, Shadow=0` | PASS |
| W3 y=30 | `Ooze=132, Shadow=67, Pudding=0` | PASS |
| W4 y=20 | `Pudding=186` | PASS |
| W5 | y70 `EntityBat=4000`；y30 `VampireBat=643, Nightwing=135, EntityBat=3222` | PASS |
| W6 | `gelpick n=500 flag=true`（rows=1） | PASS |
| W7 | `SpawnGates.decide` 已接线 + `SpawnGatesTest` 存在 | PASS |

判据通道（同窗 tee）：

- `:4830` `[SpawnLog] gel-gate reject cls=blob depth=false floor=false stoneAbove=false y=67 at (-104,67,227)`（gel-gate 共 115 条）
- `:4876` `[SpawnLog] gel-gate reject cls=pudding depth=false floor=false stoneAbove=false y=71 at (-27,71,314)`
- `:5218` `[SpawnLog] ooze-gate reject depth=false floor=false stoneAbove=false y=69 at (-93,69,221)`（ooze-gate 共 50 条）
- `:8294` `[SpawnLog] ooze-gate reject depth=false floor=false stoneAbove=false y=70 at (200,70,200)` ← 正是 W1 的取样点，石顶缺失被判出，与 W1 `Jelly=0 / Ooze=0` 自洽

环境收口（r3/r4/r5 三轮同）：cfg `C69FC496…AEC257` 起收同、props `6784C3ED…2F1EB9` 起收同、port 0→0、crash 0→0、HEAD `55586fb` 0 提交、jar mtime `11:47:02.810Z` 未变（0 rebuild）。
世界保留：`run/w-b70t8-r3-v1`（29 文件 5,481,653 B）、`run/w-b69-b70t8-r4-v1`（26 文件 5,097,344 B）、`run/w-b70t8-r5-v1`（23 文件 5,368,846 B）。
命名修正确认：r3/r5 世界名为 `w-b70t8-r3-v1` / `w-b70t8-r5-v1`（不再双前缀），tee 亦按 RUN 命名 ⇒ C-B70T8-1/-3 闭合。

## §r-final 分级与终判（build2）

| 级 | 编号 | 状态 |
|---|---|---|
| A | — | 无（重构前后未发现行为背离） |
| B | B-B70T8-1 | W1/W2 的 Jelly 期望倒置 → 主会话改驱动，r3 起闭合 |
| B | B-B70T8-2 | `ooze-gate`/`gel-gate` 字段退化 → 已恢复，r3 起有 `depth=/floor=/stoneAbove=` 实证 |
| B | B-B70T8-3 | 驱动 `count(c1,'Creeper')` 精确匹配不到 `EntityCreeper` → 我改驱动（语义不变），r5 闭合 |
| C | C-B70T8-1 | 常量 tag 致 tee 覆盖 → 已改 `h.boot(RUN)`，闭合 |
| C | C-B70T8-2 | `[PIN]` 在 boot 后打印（沿用前批） |
| C | C-B70T8-3 | 世界名双前缀 → 已改 `w-<RUN>-v1`，闭合 |

**终判：PASS**。窗 1 `pass=true / bad=0`（W0–W7 全绿）；窗 2 `pass=true / bad=0` 且 `verify-diff verdict MATCH / diffs=0`；A=0，三条 B 全部闭环（两条为工装/判据面、一条为本次判据通道回归并已由重构方修复）。











本文件 18888 B / 287 行（UTF-8 无 BOM、LF）；三 SHA：jar `E8C0AAFC…7BD40D5`、cfg `C69FC496…AEC257`、props `6784C3ED…2F1EB9`。
