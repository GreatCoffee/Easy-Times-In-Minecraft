# W-B68 判窗回执 — R196 根茎作物三族 + 枯死作物四家族

- 窗口：2026-11-22 15:08–15:25（本地 CST，日志为 UTC−8h）
- 驱动：`testharness/player/f11-b68-smoke.js`（单批单 boot，世界 `w-b68-b68r<k>-v1`）
- 判据来源：`testharness/build-logs/b68-b68r4-b1.out`（504,005 B / 3,455 行）
- 终判：**PASS**（W1–W6 全绿，bad=0，exit=0）

## §0 钉值实测与轮次

| 项 | 工单钉值 | 实测 | 结论 |
|---|---|---|---|
| release `build/libs/etim-1.0.0.jar` | 1,537,803 B | 1,537,803 B | 一致 |
| release SHA256 | `3E0A93F8…BDC2C9` | `3E0A93F80DE1038989BF815021B8EC96352222D3FB441C68F03F0CA395BDC2C9` | 一致 |
| dev jar | 1,509,548 B `B142807B…D3B32866` | 同 | 一致 |
| sources jar | 1,348,949 B `83123547…231E1BB9` | 同 | 一致 |
| MK（refmap classes/entries/dual + manifest mixins/client） | 110 / 276 / 552 + 112 / 10 | 110 / 276 / 552 + 112 / 10，ok=true | 一致 |
| HEAD | `0d0517b`（本批未提交） | `0d0517bed33412a8a8cbe0ed240b440bcf401672` | 一致 |
| jar mtime | `2026-11-22T07:08:42Z` | `2026-11-22T07:08:42Z`（窗内未变＝0 rebuild） | 一致 |
| port 25565 | 0 | 起前 0 / 收后 0 | 一致 |
| crash-reports | 基线 | 起前 0 / 收后 0 | 一致 |

四轮时段（本轮判据只用 r4；r1–r3 为工装红留痕）：

| 轮 | 世界 | 起→止（本地） | boot `Done (` | `BUILD SUCCESSFUL` | exit | bad |
|---|---|---|---|---|---|---|
| r1 | `w-b68-b68r1-v1` | 15:10:1x→15:12:15 | 5.559 s（:2381） | 2m 8s（:3506） | 2 | 5 |
| r2 | `w-b68-b68r2-v1` | 15:14:0x→15:16:06 | 5.567 s（:2381） | 2m 2s（:3520） | 2 | 4 |
| r3 | `w-b68-b68r3-v1` | 15:19:0x→15:22:49 | 5.417 s（:2381） | 1m 14s（:3482） | 2 | 1 |
| **r4** | `w-b68-b68r4-v1` | 15:24:0x→15:25:34 | **5.600 s（:2381）** | **44s（:3461）** | **0** | **0** |

r4 `[done]`：

```json
{"run":"b68r4","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

## §1 六臂判读

| 臂 | 内容 | 判读 | 判行锚（`b68-b68r4-b1.out`） |
|---|---|---|---|
| W1 | 洋葱种在湿耕地 / 石头拒绝 | **PASS** `{planted:{block:etim:onions,age:0,x:20,y:131,z:8}, refused:{block:minecraft:air,…x:21}}` | :3327 与 :3332 两条 `[TestLog] step=useblock pos={20,130,8}/{21,130,8} face=up` |
| W2 | 成熟掉落（胡萝卜/马铃薯/洋葱 age7） | **PASS** carrot `mature drops=2 first=minecraft:carrot`；potato `mature drops=2 first=minecraft:potato`；onion `mature drops=3 first=etim:onion` | :3342 / :3347 / :3351 |
| W3 | 种子/未熟/毒马铃薯 | **PASS** carrot age0 `branch=seed drops=1`；carrot age3 `immature drops=0`；potato age3 `poison drops=1 first=minecraft:poisonous_potato`；onion age3 `immature drops=0` | :3363 / :3367 / :3371 / :3376 |
| W4 | 枯萎（potato age7 / onion age7） | **PASS** potato `blighted=1 branch=poison drops=1 first=minecraft:poisonous_potato`；onion `blighted=1 branch=blight drops=0` | 置枯 :3385 / :3387 `blight src=forceSet block=… blighted=1`；收割 :3390 / :3394 |
| W5 | 干旱枯死四家族 | **PASS** 四家族死块与保留 age 全对；成熟洋葱 `kind=mature drop=etim:onion#2` 且位置变 air | :3403 carrot→`dead=etim:dead_carrot` age=3；:3411 potato→`dead_potato` age=5；:3419 onion→`dead_onion` age=2；:3428 wheat→`dead_crop` age=4；:3437 `kind=mature … drop=etim:onion#2` |
| W6 | 静态面（源码/注册/资源/语言） | **PASS** `{srcOk,regOk,helperOk,blightOk,stateOk,texOk,langOk}` 全 true | 驱动内断言，无日志行 |

## §2 红面与工装修复（A/B/C 分级）

本轮 **无 A、无 B 判据失败项**；r1–r3 的红全部落在工装面，已修并复跑，逐条登记为 C。

| 编号 | 轮次 | 现象与日志原文 | 分级 | 处置 |
|---|---|---|---|---|
| C-B68-1 | r1 | 脚本全部放置命令用 1.13+ 方块状态语法：`b68-b68r1-b1.out:2459` `There is no such block with name minecraft:farmland[moisture=7]`，全档 22 条同类；场地未建，W1–W5 无被测对象 | C（工装） | 在 `f11-b68-smoke.js:26` 区加 `bs()` 把 `name[moisture|age=n]` 归一为 1.12 `name <meta>`；断言未动 |
| C-B68-2 | r2 | 四条场地 fill 全被拒：`:2457` `Cannot place blocks outside of the world`（石地板 / air 清除 / 两条耕地），原因是 1.12 `fill` 要求目标区块已加载，而脚本先 fill 后 tp；随后 `setblock` 虽回 `Block placed`，作物立即因支撑/区块面不符被弹掉 → `:3396/:3397` `rootcrop … harvester=none branch=machine drops=0`（放置当刻即掉），W2 的 carrot/potato 与 W3 四例、W4 两例的 `[TestLog] step=harvest … result=false` 全由此而来 | C（工装） | 把 `tp` 提到四条 fill 之前（`f11-b68-smoke.js` stageArena 段，注释 C-B68-2）；断言未动 |
| C-B68-3 | r3 | 干旱事件行正则带行首锚 `\[FarmLog\] drought event`，而产品实际输出是**同一行先 `drought force …` 再 `drought event …`**（:3403/:3411/:3419/:3428/:3437），导致 W5 五例 `d` 全 null 而块态已正确 | C（工装） | `DROUGHT_RE` 去掉行首锚，改为 `drought event kind=…`；断言未动 |

独立取证（非判据，仅用于定位 r2 红因）：`testharness/player/_b68-probe.js` → `build-logs/b68-probe.out`，在已加载的洁净点 (−60,120,238..241) 一次性验四族：

```
[placed] {"238":"Carrots","239":"Potatoes","240":"Crops","241":"Onions"}
[harvest] 238 result=true drops=2 first=minecraft:carrot
          239 result=true drops=2 first=minecraft:potato
          240 result=true (wheat, 非 rootcrop 表，正常无 rootcrop 行)
          241 result=true drops=2 first=etim:onion
```

⇒ 产品面在正确场地上一次即成立，r1–r3 的红不属于产品缺陷。

## §3 环境收口

| 项 | 起前 | 收后 | 结论 |
|---|---|---|---|
| `run/config/etim.cfg` | 56,025 B `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9` | 同哈希 | 一致 |
| `B:farmDebugLog` / `B:blightR196` / `B:droughtDeathR196` | true / false / true | true / false / true | 起收一致（驱动 boot 内临时置三旗 true，退服后按文件还原） |
| `run/server.properties` | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同哈希 | 一致 |
| `level-name` / `allow-flight` / `difficulty` | `w-b30v` / false / 1 | `w-b30v` / false / 1 | 一致 |
| port 25565 / crash / HEAD | 0 / 0 条 / `0d0517b` | 0 / 0 条 / 未变（0 提交） | 一致 |
| 世界保留 | — | `run/w-b68-b68r1-v1`(30 文件,5,110,077 B)、`-r2-v1`(28,5,125,174)、`-r3-v1`(29,5,018,667)、`-r4-v1`(26,4,966,331)、`w-b68-probe`(25,3,648,907) | 全部保留，未删 |

GradleStart 残留：窗后 `port 25565` 无监听（`netstat` 0 行）。

## §4 终判

**PASS** — W1–W6 六臂在 b68-build4（jar 1,537,803 B `3E0A93F8…`、MK 110/276/552 + 112/10、HEAD `0d0517b`、0 rebuild）上全部成立；A 级 0、B 级 0、C 级 3（C-B68-1 / C-B68-2 / C-B68-3，全部为驱动工装面且已修）。

判据强度说明：
- W2 的洋葱 `drops=3` 命中 R196 的 25% 三连支，两轮内未见 2 与 3 的全覆盖属抽样范围（C 级不另立条目）。
- W5 的成熟洋葱在本轮取到 `#2`（r2 取到过 `#3`），`matureYield` 的 2/3 两支均已在历轮出现。
