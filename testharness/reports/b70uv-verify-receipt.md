# B-70UV 判窗回执（钓鱼 / 耐久 / 砂轮三族纯函数化后的行为等价）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 22:52 CST
> 工单：主会话 m06657（2026-11-27 22:44）
> 终判：**PASS**（A=0 / B=0 / C=4）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70uv-build1` | 同 | ✔ |
| release | 1,582,281 B | 1,582,281 B | ✔ |
| release SHA256 | `736F3CF285D0709EB37D227D4583D8A03BA47C13302D06F1F389D4DB9FBA7470` | 同 | ✔ |
| jar mtime（起/收） | `2026-11-27T14:43:36.1176Z` / 同 | 窗内不变 | ✔（0 rebuild） |
| MK | 114 / 282 / 564 + 115 / 10（两窗 `mkOk=true`） | 同 | ✔ |
| HEAD | `c7c5cd8` | 同 | ✔（窗内 0 提交） |
| cfg（起/收） | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` / 同 | 起收同 | ✔ |
| props（起/收） | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` / 同 | 起收同 | ✔ |
| port 25565 | 0 → 0 | ✔ |
| crash-reports | 0 → 0 | ✔ |

两窗均 `[PIN] sha=736F3CF2…9FBA7470 shaOk=true size=1582281 sizeOk=true mkOk=true ok=true`、`[stop] {"exitCode":0,"exited":true}`。

## §1 两窗

| 窗 | 驱动 | 起止（本地） | 耗时 | EXIT | `[done]` |
|---|---|---|---|---|---|
| r1 | `f15-reg-chains.js` | 22:47:36 → 22:48:19 | 43 s | 0 | `{"run":"b70uv-r1","pin":true,"w1".."w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |
| r2 | `f11-b65-smoke.js` | 22:48:19 → 22:48:53 | 34 s | 0 | `{"run":"b70uv-r2","pin":true,"w1".."w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |

- `[cfg]`：r1 `fishingDebugLog=true craftingDebugLog=true ingestDebugLog=true furnaceDebugLog=true meleeDebugLog=true deathDebugLog=true deathXpOrbs=true`；r2 `mobDebugLog=true foodR196Extra=true foodModel=true`。
- tee：`testharness/build-logs/f15-b70uv-r1-b1.out`（596,132 B / 4,101 行；`:2386` `Done (5.682s)!`、`:4099` BUILD 41s）、`b65-b70uv-r2-b1.out`（1,024,710 B / 6,810 行；`:4724` `Done (6.124s)!`、`:6808` BUILD 33s）。

### r1 七臂

```
[W1] {"gateRows":1,"type":{"n":50,"cod":50,"salmon":0},"pass":true}
[W2] {"anvil":{"player":"ETIM_F7","item":"minecraft:iron_pickaxe","kind":"NONE"},"pass":true}
[W3] {"food":{"player":"ETIM_F7","item":"minecraft:cooked_beef"},"refused":1,"pass":true}
[W4] {"rows":1,"pass":true}
[W5] {"melee":{"target":"Zombie","stun":1},"pass":true}
[W6] {"death":{"player":"ETIM_F7","kind":"orb dump"},"rows":1,"pass":true}
[W7] {"oreRows":137,"sample":["ore_silver","ore_mithril","ore_copper"],"pass":true}
```

### r2 六臂

```
[W1] {"rows":15,"beef":["etim:bowl_beef_stew",16,16],"milk":["etim:bowl_milk",0,1],"water":["etim:bowl_water",0,0],"pass":true}
[W2] {"copper":{"before":0,"after":-15},"gold":{"before":-15,"after":-115},"pass":true}
[W3] {"row":{"meta":"1","cured":"true","converting":"true"},"cure":{"meta":"1","ticks":1},"pass":true}
[W4] {"before":"minecraft:beef","after":"minecraft:cooked_beef","count":3,"alive":"true","hook":true,"pass":true}
[W5] {"hit":"true","fireHp":15,"held":"minecraft:bowl","pass":true}
[W6] {"cfgOk":true,"wireOk":true,"mixOk":true,"texOk":true,"langOk":true,"pass":true}
```

## §2 锚点

### r1（`f15-b70uv-r1-b1.out`）

```
:3312 [FishLog] gate token=1 wt=1000 adj=7000 dist=1500 ci0=1500 light=0 ci2=1500 L=0 lure=0 ci3=1500 worm=0 ci4=1500
:3314 [FishLog] type n=50 cod=50 salmon=0
:573  [FurnaceLog] 8 judged smelting rows registered (redstone/lapis/quartz/diamond/emerald/coal ores + sandstone→glass + clay block→hardened clay)
:3341 [MeleeLog] stun lvl=1 roll=8.166 need=1 amp=0 dur=0
:3343 [MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=50
:653  [OreLog] ore=ore_copper chunk=(-272,48) rolls=40 veins=2 origin-abort=2 grown=0
```

**ci 链核算**（工单要求 `ci0 == clamp(600*timeFactor)`、`ci4 ≥ 1`）：
`/etest fishgate 1000 …` → `adj=(1000+6000)%24000=7000` → `dist=min(|7000-5500|,|7000-17500|)=1500` → `timeFactor=1500/600=2.5` → `ci0=clamp(600*2.5=1500)=1500` ✔；`light=false` ⇒ `ci1=ci0=1500`（未打印，见 C-1）；`L=lure=0` ⇒ `ci3=1500`；`worm=false` ⇒ `ci4=max(1500,1)=1500 ≥ 1` ✔。

跨版本同形复核（该行逐字相同）：

```
f15-b70ty-r5-b1.out:3311  [FishLog] gate token=1 wt=1000 adj=7000 dist=1500 ci0=1500 light=0 ci2=1500 L=0 lure=0 ci3=1500 worm=0 ci4=1500
f15-b70ty-r11-b1.out:3314 同
f15-b70uv-r1-b1.out:3312  同
```

`tool decay … loss=50` 亦与上一批同形（`f15-b70ty-r11-b1.out:3345` 对 `f15-b70uv-r1-b1.out:3343`），说明 `EnduranceGates.perMeter` 委托后损耗值未变。

### r2（`b65-b70uv-r2-b1.out`）

```
:5670 [FoodR196Log] bowlgive contents=BEEF_STEW item=etim:bowl_beef_stew sat=16 nut=16 player=ETIM_F7
:6021 [FoodR196Log] coin created metal=copper count=3 xpValue=5 xpBefore=0 xpAfter=-15
:6064 [FoodR196Log] coin created metal=gold count=1 xpValue=100 xpBefore=-15 xpAfter=-115
:6122 [FoodR196Log] applegold cure meta=1 ticks=1 src=cmd
:6370 [FoodR196Log] firecook raw=minecraft:beef cooked=minecraft:cooked_beef count=3
:6460 [FoodR196Log] vesseldouse hit=true fire_hp=15.0 held=minecraft:bowl
:586  [ItemLog] stack table applied default=16 r196Table=9 etimPinned=29
```

### §2.1 三份/两处 diff

```
node testharness/tools/verify-diff.js --mode=arms \
  --base testharness/build-logs/b65-b70tc-r3-b1.out \
  --new  testharness/build-logs/b65-b70uv-r2-b1.out
[DiffLog] arms base=64 new=63
[DiffLog] summary rules base=0 new=0 mounts base=0 new=0 mayplace=0 diffs=0
[DiffLog] verdict MATCH
```

`--strict-arms` 复跑：`verdict MATCH`（`diffs=0`）。

**数值层归一化比对（工具不覆盖，我自写 `testharness/player/_b70uv-cmp.js`）**：对 `FoodR196Log/VesselLog/ItemLog/FoodLog/AnvilLog/EnduranceLog` 六个通道，剥离 `entity=/player=/zombie=/坐标` 后逐字比：

```
keys base=26 new=26
only-in-base: (none)
only-in-new : (none)
count delta : (none)
```

（26 = `FoodR196Log` 25 条 + `ItemLog` 1 条；逐条含 `sat/nut`、`xpValue/xpBefore/xpAfter`、`fire_hp`、`count` 等数值字段全部一致。）

## §3 分级

- **A=0**：ci 链数值、`tool decay loss=50`、`FoodR196Log` 26 条数值行与基线完全一致，未见行为变化。
- **B=0**
- **C-1**：dev 命令的 gate 行本身**不打印 `ci1`**——`src/main/java/io/github/etim/etim/commands/CommandDevTest.java:2113-2116` 只拼 `ci0 / light / ci2 / L / lure / ci3 / worm / ci4`；工单字段清单里的 `ci1=` 属预期落空（三版 jar 该行逐字相同，非本批引入）。`ci1` 由 `FishingGates.cascade` 内部计算并经 `ci2` 反映，等价性由 `ci2==ci1` 且 `light=false` 下 `ci2==ci0` 间接钉住。
- **C-2**：`verify-diff --mode=arms` 的键是「`[通道] 首 token`」、默认不比同键次数、**也不比行内数值**；我以 `--strict-arms` 复跑补强计数面，数值面另做上述 26 行归一化逐字比对。
- **C-3**：r2（b65）窗口内没有 `AnvilLog` / `EnduranceLog` / `MiningLog` 数值行（各 0 条），砂轮/耐久两族的「值」由 r1 的 `tool decay … loss=50` 与 `AnvilGates`/`EnduranceGates` 的委托面＋单测覆盖；本窗对二者只做「不消失、不改形态」的判。
- **C-4**：世界名三段式 `w-reg-b70uv-r1-v1`、`w-b65-b70uv-r2-v1`（`H.create` 的 world 模板）。

## §4 收口

| 项 | 值 |
|---|---|
| cfg / props 起收 | 同哈希（`C69FC496…` / `6784C3ED…`） |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T14:43:36.1176Z` 未变（0 rebuild） |
| HEAD | `c7c5cd8`，窗内 0 提交 |
| 世界 | `run/w-reg-b70uv-r1-v1`（35 文件 / 6,069,900 B）、`run/w-b65-b70uv-r2-v1`（30 / 3,744,363 B），保留 |
| 证据 | `testharness/build-logs/b70uv-r{1,2}-node.out`、`b70uv-index.tsv`、两份 tee（见 §1） |

## §5 终判

**PASS** — 两窗 `[done]` 全 true、`stops=0`、`crashes=0`；`verify-diff`（默认与 `--strict-arms`）均 `MATCH`、`diffs=0`；ci 链数值按公式复算一致、`ci4 ≥ 1`；`FoodR196Log`/`ItemLog` 26 条数值行归一化后零差异；基线起收一致。A=0 / B=0 / C=4。

本回执字数规格：8226 B / 144 行。
