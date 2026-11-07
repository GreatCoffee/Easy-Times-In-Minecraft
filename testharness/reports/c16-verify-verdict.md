# 雨面（rain）· **W-C16 判决**（C-16 批，B-5 farmlandmoisture 桥判值翻新，HEAD `32ed9d8`）

> **HEAD**：`32ed9d8`（窗内 **0 提交**，起收同 commit）
> **jar**：`build/libs/etim-1.0.0.jar` **1,041,665 B**｜SHA256 `90BB4614ADC03CDEA4ACDFC83EDB28F1C2499EACC3E96DCFB415F3CFD9F96180`｜MD5 `98E1CBC168B2AFFA6B1CBE5B887B5F13`（起收同值，**0 rebuild**）
> **refmap**：classes **87** / entries **197**（dual 394，双树同）｜**mixins**：**84** + 10 client（本批 **零 mixin 新增、零 cfg 新增**，五消费位为既有 mixin／事件体的判值替换）
> **窗口**：1 boot（`Done (5.497s)`，mixinFail 0）＋1 停服（exit 0＋BUILD SUCCESSFUL in 1m 3s）｜单假人 `ETIM_F7`｜世界 `w-c16v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓**（A 0／B 0／D 0／C 7）
> **报告字节规格**：`8,667 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 11 / ✗ 1｜73 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** 窗面与钉值 | boot Done＋mixinFail 0＋stop exit 0 build true＋jar/refmap/mixins 三组钉值同值 | `Done (5.497s)!`（b1:2324）、`mixinFail=0`；stop `exitCode=0 exited=true build=true`，`BUILD SUCCESSFUL in 1m 3s`（b1:5338）；jar 1,041,665／`90BB4614…`／`98E1CBC1…`；refmap 87/197（dual 394，`build/resources/main` 与 `build/tmp/mixins` 双树同）；mixins 84+10 | ✓ |
| **W3** 雨窗开启 | set 前全日志 `src=rain` 行 0 → set 后 ≥1，且 probe 读到 snap 值 1.0000 | preRows **0**；`rain set str=1.0000`（b1:4007）与 `rain probe rain=1.0000 thunder=0.0000`（b1:4008）**同批下发**；set 后 earlyRows **9**；1.2 s 后第二枚 probe `rain=0.4300`（b1:4376）作泄流见证 | ✓ |
| **W1** open 座滴灌 | open 座 `pos=242,*,242` 的 `[FarmLog] moisture … src=rain` ≥1 | openRows **9**（自 set 起全段，与烟测同口径）；`src=rain wet=0→1`（b1:4098）→`wet=1→2`（b1:4127）……重置 farmland 后 `wet=0→1`（b1:4363）→`wet=5→6`（b1:4369）→`wet=6→7`（b1:4378），**cap 7 未越** | ✓ |
| **W2** covered 座零行 | covered 座 `pos=246,*,242` 的 `src=rain` 行 = 0 | coverRows **0**（全段 0、尾窗 0）；同格另有 **7 条** `moisture chance pos=246,242 … ksip=keep`（b1:4009／4212／4375／4377／4529／4530／5058）→ **随机 tick 确实打到该格**，只是 `canSeeSky` 门不过，非"没被 tick 到"的空证 | ✓ |
| **W4** 拉闸 | `set 0.0` 后 12 s 内 `src=rain` 行 = 0，且 probe 归零 | `rain set str=0.0000`（b1:4999）＋`rain probe rain=0.0000 thunder=0.0000`（b1:5000）；rowsAfter **0**；dryRows **0**（重置后 moisture=0，无更低可降面） | ✓ |

## §2 判行原文

**W3 · 雨窗开启（snap 面）**
- `[WeatherLog] rain set str=1.0000 [server]`（b1:4007）
- `[WeatherLog] rain probe rain=1.0000 thunder=0.0000 [server]`（b1:4008，与上一行同批，证明双字段直写即刻生效）
- `[WeatherLog] rain probe rain=0.4300 thunder=0.0000 [server]`（b1:4376，约 1.2 s 后的泄流见证）

**W1 · open 座 `src=rain` 滴灌（wet 逐级 +1）**
- `[FarmLog] moisture tick pos=242,120,242 src=rain wet=0→1 [server]`（b1:4098）
- `[FarmLog] moisture tick pos=242,120,242 src=rain wet=1→2 [server]`（b1:4127）
- `[FarmLog] moisture tick pos=242,120,242 src=rain wet=5→6 [server]`（b1:4369）
- `[FarmLog] moisture tick pos=242,120,242 src=rain wet=6→7 [server]`（b1:4378）

**W2 · covered 座无雨行（同格 chance 行在场）**
- `[FarmLog] moisture chance pos=246,242 temp=0.80 humid=0 chance=0.65 ksip=keep [server]`（b1:4009）
- 同形 7 条（b1:4212／4375／4377／4529／4530／5058），`src=rain` 行 **0**（全档计数 0）

**W4 · 拉闸即停（雨门关闭后转 dry 面）**
- `[FarmLog] moisture tick pos=242,120,242 src=dry wet=7→6 [server]`（b1:4379，紧接 `src=rain wet=6→7`，强度跌破 0.2 后雨臂停止、B-6 dry 面接管）
- `[WeatherLog] rain set str=0.0000 [server]`（b1:4999）
- `[WeatherLog] rain probe rain=0.0000 thunder=0.0000 [server]`（b1:5000）

**W0 · 窗面**
- `Preparing level "w-c16v"`（b1:572）
- `Done (5.497s)! For help, type "help" or "?"`（b1:2324）
- `BUILD SUCCESSFUL in 1m 3s`（b1:5338）

## §3 冲突分级

- **A 级：0** —— 五臂全绿，无判值面破位。
- **B 级：0** —— 零 mixin／零 cfg 新增，无注入面风险；`mkCounts().ok=true`（MK_PIN 已由主会话收编至 87/197/394/84+10）。
- **D 级：0** —— 互通偏差 ≤1，未触发 D 位问（见 §4）。
- **C 级：7（工装／口径／范围注记，不涉判值）**
  - **C-16-1**（工装·日志抢锁）：首跑把 stdout 重定向到 `testharness/build-logs/f11-c16-verify.out`，与 `startServer({tag:'f11-c16-verify'})` 的服务端日志同名，`EBUSY: resource busy or locked` 直接退出且异步流错误绕过 catch，props 留在 `level-name=w-c16v`。已改 stdout 落 `f11-c16-verify-stdout.out`，并用显式 `fs.writeFileSync` 回写 props（复原本窗开窗字节 939 B `703D1725…`，逐字节同）。
  - **C-16-2**（口径·rts 512）：`L.stage` 默认 rts 3 时，1.12 随机 tick 每格约 3/4096 tick（≈68 s 一次），而强度按 ~0.02/tick 下泄，判窗内不可能取到 drip → 首验全零。已改 rts **512**（对齐烟测 `f11-c16-smoke.js:82`），drip 在 set 后 ~1 s 内连打到 cap 7；W1/W2 计数改 `since(set)` 全段（烟测 `allRows` 同口径），尾窗另记。
  - **C-16-3**（文档·泄流速率）：实测 1.0000 → 0.4300 约 1.2 s（≈0.46/s、≈0.023/tick），强度门（>0.2）约 1.7 s 即关；`CommandDevTest.java:1330-1333` 注释称「0.01/s、约 80 s 仍在门内」与实测不符——**注释瑕疵，非判值面**（set 面双字段直写即刻生效已由 b1:4007/4008 同批证死）。
  - **C-16-4**（工装·W4 防空证）：W1 已把 moisture 灌到 7，若拉闸前不重置，W4 的"0 行"是饱和造成的假阴性。驱动已在 `set 0.0` 后立即重置两座 farmland 为 0 再观察 12 s。
  - **C-16-5**（范围·五消费位只直判一处）：本窗直接点火的是 ①`MixinBlockFarmland` 雨面（`src=rain` 行＋cap 7＋covered 零行）；②～⑤（`ETIMFishing:194` 单判、`ETIMFishingEvents:120` isInRain、`ETIMFoodStats:427-430` isInRain＋isThundering 乘法权重、`ETIMLivestockEvents:254/266` thirst）为编译期强类型替换，其语义随 helper 五面（强度门／canSeeSky／precipHeight／canSpawnLightningBolt／freezing）判定；**未在本窗单独点火**，建议主会话在后续臂补点位或按 C 级记账。
  - **C-16-6**（工装·`setProp` 陷阱）：`f7-wb-lib.setProp(text,key,value)` 是**纯函数返回新串、不落盘**；只有 `setCfgValue(file,…)` 会写盘。恢复必须显式 `fs.writeFileSync`（本次已按此复原）。
  - **C-16-7**（簿记·世界保留）：`w-c16v` 未删（任务书五件未要求删）；如需清场按主会话口令处理。

## §4 收口五件

- **cfg 起收同**：49,379 B｜SHA256 `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`（`weatherSystem=true`／`farmDebugLog=true`／`weatherDebugLog=true`，键 250，**未新增任何键**）。
- **props 快照还原**：939 B｜SHA256 `703D17252E4026D35FA2FE45367090C174FDD94D412FC5CB86ED14E4FFDC63EE`（`level-name=w-b13a`／`level-seed=etim27`／`view-distance=10`，起收同）。
- **jar／MK 起收同**：release 1,041,665 `90BB4614…`／`98E1CBC1…`；dev 1,021,450 `97F69202…`；sources 949,464 `85F8B52F…`；refmap 87/197（dual 394）；mixins 84+10；`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `32ed9d8` 窗内 **0 提交**；obf cfg 49,504 B `A7CC32FB…` 未动（本窗只写 `run/config/etim.cfg` 与 `run/server.properties`）。
- **互通（vs `build-logs/f11-c16-smoke.json`）**：smoke `{openRows 8, early 2, coverRows 0, rowsAfterRampDown 0}`；本窗 `{openRows 9, early 9, coverRows 0, rowsAfterRampDown 0}` → 逐项偏差 ≤1（openRows +1、early +7 属 rts 512 下 drip 爆发条数与取样批次差），**无 >1 压差**，按任务书不开 D 位问。

> 正本：`testharness/reports/c16-verify-verdict.md`｜byte 五项：`8,667 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 72（split 73）`
> SHA-256 甲（全档零位）`194413BEAE14B870B8948A0F6AF9584B828FE6461AE2416848C007C81787AFEA`
> SHA-256 乙（LF 归零零位）`194413BEAE14B870B8948A0F6AF9584B828FE6461AE2416848C007C81787AFEA`
> SHA-256 丙（行链零位）`807E9FE112A931C6D964B42AE7683D8F59C6BBCD7576B28379C3078C5C0D0F5E`
