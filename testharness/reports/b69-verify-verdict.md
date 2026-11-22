# W-B69 判窗正本：火花（BlockSpark）+ 挂载基类（BlockMounted）

- 执行会话：会话七（ETIM 验证窗执行）；终审：会话五；对照报告：会话六；落码与汇总：主会话
- 判窗时段：2026-11-22 17:25–21:53（r1–r20，多轮修复后收敛）
- 判据源：`git-workspace/etim/testharness/player/f11-b69-smoke.js`（r20 版）
- 终判：**PASS**（A=0 / B=0 / C=27）

## §0 钉值

- `f7-wb-lib.js:35` = `b69-build9`
- release 1,556,495 B `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`
- dev 1,528,052 B `623F339729544EFBADD65E058048218AF06792ECEA898A7C5C30746C0CF06036`
- sources 1,365,488 B `79CA55A2885784647C805F0EC128029450B4C320DDD5847AF43FDDF6575DAC46`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- jar mtime `2026-11-22T13:30:11.035Z`（r19/r20 窗内 0 rebuild）
- HEAD `24c2350`（判窗期间 0 提交）

## §1 判窗轨迹

| 轮次 | 钉值 | 结果 | 要点 |
| --- | --- | --- | --- |
| r1–r5 | build1/build2 | FAIL→PASS | 首轮 W3 红：farmland 火把被弹（A-B69-1）、熔炉/发射器臂不可达（B-B69-2）；修 `MixinBlockTorchFarmland` + `/etest mayplace` 后 r5 PASS |
| r6–r13 | build3/build4/build5/build6/build7 | FAIL→PASS | 雪层常量（A-B69-5）、骷髅/活板门绕漏斗（A-B69-5/6/7）、牌臂让位（产品缺陷）、断言漂移；r13 PASS |
| r14–r18 | build8 | FAIL→PASS | 终审 r4 三条阻断：满雪六面（A-B69-8）、子类臂让位（A-B69-10）、薄雪活板门（A-B69-11）；工装 C-B69-15..20；r18 PASS |
| r19 | build9 | PASS | 终审 r5 唯一阻断 A-B69-12：垂直活板门过放；两条 stone 顶/底臂 |
| r20 | build9 | PASS | 补臂：薄雪侧面 `trapdoor-thin-snow` reject、满雪侧面 allow（C-B69-21/-22 闭合） |

## §2 逐臂锚点（r20，`testharness/build-logs/b69-b69r20-b1.out`）

- W1 火花：石面孤立（无燃料）2 tick 后 `kind=snuff` 并置空；木板下/下界岩下 `kind=ignite` 成火。
- W2 打火石：`[SparkLog] added … portal=false` + 火；非空气位 HEAD 直接 FAIL 且不扣耐久（A-1）。
- W3 挂载（30+ 臂，节选）：
  - `:3734` `rule=trapdoor-thin-snow face=east support=minecraft:snow_layer … reject pos=10,129,6`
  - `:3743` `rule=trapdoor-shape-defer face=east support=minecraft:snow_layer … allow pos=13,129,9`
  - `:3741` `rule=sign-face … support=minecraft:snow_layer … allow pos=13,129,9`
  - `:3749`/`:3752` `rule=trapdoor-vertical face=up|down … reject pos=18,130,4`
  - `:3714` `front-face` reject（熔炉前脸站立牌）、`:3717` `sponge` reject（海绵侧骷髅）
  - `:3606`/`:3639`/`:3653` `never-hides` reject（刷怪笼侧/顶）
  - `:3720` `tilled-field` allow（耕地顶站立牌）、`:3698` `trapdoor-wrong-half` reject
  - `:3644`/`:3647` 活板门材料门 reject / 石板 allow
- W4 静态：五个新类、四个 mixin 文件与配置各 1 次、`ETIMSpecialBlocks.register()` 恰 1 次、`sparkR196`/`mountedR196` 各 1 次、`setMaxDamage(16)`、`trapdoor-vertical`、资产与 lang — 全 true。

## §3 终审链

| 轮次 | 回执 | 结论 | 关闭项 |
| --- | --- | --- | --- |
| 首审 | `b69-final-audit.md` | 退回 | A-1..A-6 成立；新增 A-B69-1..4、B-B69-1..6 |
| r2 | `b69-final-audit-r2.md` | 退回 | A-B69-5 骷髅绕漏斗、A-B69-6 臂序、A-B69-7 活板门半高 |
| r3 | `b69-final-audit-r3.md` | 退回 | A-B69-8 满雪六面、A-B69-10 子类臂绕基类、A-B69-11 薄雪活板门 |
| r4 | `b69-final-audit-r4.md` | 退回 | A-B69-12 垂直活板门过放 |
| r5 | `b69-final-audit-r5.md` | 退回 | 仅 A-B69-12（同上）；C-B69-19 归因更正 |
| r6 | `b69-final-audit-r6.md` | **放行** | A-B69-12 闭环；A-B69-8/-10/-11、B-B69-8 PASS |

## §4 分级

- **A（真缺陷，全部闭环）**：A-1 打火石非空气扣耐久；A-2 站立牌缺类；A-3 漏斗前脸；A-4 满方块门误杀；A-5 火花只认正下方；A-6 拉杆/按钮/绊线材料门；A-B69-1 两类牌绕 `World.mayPlace`；A-B69-2 修法口径不闭合；A-B69-3 活板门材料门；A-B69-4 刷怪笼过放；A-B69-5 骷髅绕漏斗；A-B69-6 farmland/jukebox 臂序；A-B69-7 活板门缺半高；A-B69-8 满雪只给 UP/DOWN；A-B69-9 牌/骷髅绕基类几何；A-B69-10 子类臂绕基类禁止项；A-B69-11 薄雪活板门；A-B69-12 垂直活板门过放。
- **B（判据/工装，全部处置）**：B-B69-1 group7 玻璃子项撤销；B-B69-2 漏斗臂不可达；B-B69-3 行号尾差；B-B69-4 耐久常量改 ctor 注入；B-B69-5 faceShape 差异；B-B69-6 HEAD 需自行 offset；B-B69-7 C-4 计数；B-B69-8 Spark javadoc 行号。
- **C（可接受，27 条）**：C-B69-1..27 — 含 AGE 16 段外壳、mayPlace 只否决、传送门入口同源、耕地面只放宽火把、梯子更严、可可放置期、可燃表、活塞伸出/前脸、工装类 C-B69-9..11、C-B69-15..20、补臂类 C-B69-21..25、注释/死码 C-B69-26..27。

## §5 终判

`PASS`（A=0 / B=0 / C=27）。产品钉值 `b69-build9`；判窗 r20 全绿；终审 r6 放行。
