# R196 出岩浆臂（EntityAIGetOutOfLava 家族 · EntityPigZombie 载体座）· **W-B25 判决**（B-25 批，HEAD `f5a72a3`）

> **HEAD**：`f5a72a37d3713466b45df42e1c073409b4480e75`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,084,206 B**｜SHA256 `2D56E7F8CCCB5B297AFC5CDC8FF2E4705C6F3943003DA19190DA1755B19989CE`（起收同值）｜MD5 `399C4A37E1774751E5B3C11A125D45E8`
> **dev/sources**：1,063,173 B `8805DD93…`／989,347 B `B082D208…`（起收同值）
> **refmap**：classes **96** / entries **215**（dual 430，双树同）｜**mixins**：**93** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.445s)`／`Done (5.497s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 10s／1m 8s）｜单假人 `ETIM_F7`（spectator）｜判窗世界 `w-b25v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓**（A 0／B 0／D 0／C 5）
> **判据来源**：本窗 canonical run（一次跑成，无作废重跑；产品码零改动）
> **报告字节规格**：`8,219 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 7 / ✗ 1｜70 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.445s)!`（b1:2342）／b2 `Done (5.497s)!`（b2:2342），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 10s`（b1:4115）／`in 1m 8s`（b2:3333） | ✓ |
| **W1** 岩浆臂（boot 1） | 4×4 岩浆池＋5 只 `zombie_pigman` 入池 → 100 s 窗 → ≥1 条 `[AILog] outoflava … start ` 行 | **113 行** start（b1:3810 首 `dist=3.33 entity=EntityPigZombie#2000` → b1:4078 末 `dist=1.85 #2004`）；按个体 19／28／21／20／25（#2000–#2004 五只全出）；`dist` 域 1.11–10.34；同窗 probe-in **119 行**（首 b1:3839 `inv=16 inLava=true flag=true #2002`） | ✓ |
| **W2** 旗断（boot 2） | `livestockNeedsR196=false` + 复放 → start **0**＋probe-in **0**（双零门） | b2 全档 3,336 行：`outoflava` **0 命中**（start 0／probe 0）；3 只 pigman 正常召唤（`zombie_pigman` 3 行，无 `Skipping Entity`）→ 旗闸在 `shouldExecute:82` 首行 return false，probe（:85-94）在其后故一并不出 | ✓ |
| **W3** 报告位 | 驱动 `w3='REPORT'` 占位（任务书只定义 W0–W2） | 非判值臂，仅入 JSON | REPORT |

## §2 判行原文

**W1 · 岩浆臂（五只个体全部出 start）**
- `[AILog] outoflava src=? start speed=1.0 dist=3.33 entity=EntityPigZombie#2000`（b1:3810）
- `[AILog] outoflava src=? start speed=1.0 dist=1.74 entity=EntityPigZombie#2001`（b1:3823）
- `[AILog] outoflava src=? start speed=1.0 dist=2.62 entity=EntityPigZombie#2003`（b1:3830）
- `[AILog] outoflava src=? start speed=1.0 dist=5.97 entity=EntityPigZombie#2004`（b1:3837）
- `[AILog] outoflava src=? start speed=1.0 dist=1.85 entity=EntityPigZombie#2004`（b1:4078，窗内末条）

**W1 · 诊断 probe 行（非判集）**
- `[AILog] outoflava src=? probe-in inv=16 inLava=true flag=true entity=EntityPigZombie#2002`（b1:3839）
- `[AILog] outoflava src=? probe-in inv=368 inLava=true flag=true entity=EntityPigZombie#2001`（b1:4081）

**W1 · 场地（池体建立与召唤点）**
- `32 blocks filled`（b1:3803，4×4×2 岩浆填充）
- `### [harness] > summon zombie_pigman -72.5 68 240.5`（b1:3804）／`-73.5 68 241.5`（b1:3811）／`-71.5 68 242.5`（b1:3817）／`-72.5 68 243.5`（b1:3824）／`-71.5 68 244.5`（b1:3831）

**W2 · 旗断零行**
- b2 全档 `outoflava` **0 命中**（3,336 行逐行扫描，`start` 与 `probe-in` 双零）

**W0 · 窗面**
- `Done (5.445s)! For help, type "help" or "?"`（b1:2342）｜`Done (5.497s)!`（b2:2342）
- `BUILD SUCCESSFUL in 2m 10s`（b1:4115）｜`BUILD SUCCESSFUL in 1m 8s`（b2:3333）

## §3 冲突分级

- **A 级：0** —— 三臂硬门全部成立：值面（≥1 start）113 行、旗断面双零、boot/停服面全绿。
- **B 级：0** —— 本批唯一注册变化是 `MixinEntityPigZombie`（`<init>@TAIL` → `tasks.addTask(4, new ETIMEntityAIGetOutOfLava(...))`），refmap 95/214→96/215、mixins 92→93，与任务书预期逐项一致，双树同值（dual 430）。
- **D 级：0** —— 互通差异全部由窗口参数解释，无判值面互读矛盾（见 C-B25-3）。
- **C 级：5**
  - **C-B25-1**（工装·PIN 单条）：驱动只在起手调用 `stampPin()`（`f11-b25-verify.js:111`），故 `[PIN]` 仅 1 条（`2026-11-08T08:37:49.653Z`）。收工侧以盘上直读补齐：jar 1,084,206 B／`2D56E7F8…`、MK 96/215/430＋93+10 `ok=true`，且 jar mtime `08:14:07Z` 早于窗起点 `08:37Z`（窗内无重打包）——起收同值成立，仅记录取证通道差异。
  - **C-B25-2**（场地·岩浆外溢）：池体只填 y67..68 岩浆、未砌围栏，y67 岩浆沿平台外溢；5 只 pigman 的 `dist` 域 1.11–10.34、第 5 只召唤点 `-71.5 68 244.5` 落在 4×4 footprint（z 240..243）之外仍入岩浆并出 25 行。判值面不受影响（`isInLava()` 域内为真，行语义未变），但「4×4 池」非字面稳定域，后续复跑不可假设池形。
  - **C-B25-3**（互通·窗口参数）：smoke r3 `b1 n=50／probes 62` vs 本窗 `113／118`；差异由脚本参数造成（smoke 60 s＋4 只 → 本窗按任务书 100 s＋5 只，时长×只数比 2.08，实测比 2.26，同量级）；b2 双零两窗同值（0／0）。方向与门位一致，非判值漂移。
  - **C-B25-4**（工装·3 处补强，判值口径未动）：①W1 对齐任务书（`summonPigmen(4)`→`(5)`、`sleep(60000)`→`sleep(100000)`）；②W2 由「start 0 行」改为「start 0＋probe-in 0」双零门；③W0 补 `boots.length===2 && stopBoots.length===2` 断言，尾部改显式 `process.exit` 并在 catch 补 `bot.quit`／`srv.stop`／props-cfg 回写（B-16 C-B16-6／B-17 C-B17-3 同型）。
  - **C-B25-5**（判据·载体座）：R196 该 AI 的原生载体（DemonSpider／Hellhound）在 1.12 全无，本窗以 `EntityPigZombie` 顶座（任务书自述的替位）。判据只认行语义（`outoflava … start`＋`inLava` 域），不依赖载体族名；若后续移植真载体，需重跑本臂确认座位优先级 `addTask(4, …, 1.0F)` 不与其原生任务冲突。

## §4 收口五件

- **jar／dev／sources 起收同**：1,084,206 `2D56E7F8…`（MD5 `399C4A37…`）／1,063,173 `8805DD93…`／989,347 `B082D208…`（窗内 **0 rebuild**；jar mtime 08:14:07Z 早于窗 08:37Z）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name=w-b23v`，驱动起收回写同值）。
- **MK 起收同**：refmap 96/215（dual 430）＋mixins 93+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `f5a72a3` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIGetOutOfLava.java` 08:13:57Z、`MixinEntityPigZombie.java` 08:00:27Z、`mixins.etim.json` 08:00:35Z）均早于窗起点 08:37Z，`git status` 仍为 ` M mixins.etim.json`＋两处 `??`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b25v` 保留（24 文件／3,543,761 B）；`w-b25a`／`w-b24v` 未动。
- **互通（vs smoke r3 `build-logs/f11-b25-smoke.json`）**：b1 `50／probes 62` → 本窗 `113／118`（C-B25-3 的窗口参数解释）；b2 `0／0` → `0／0`；boots 双 Done、mixinFail 0×2、stopBoots 双 exit 0 三窗同形。

> 正本：`testharness/reports/b25-verify-verdict.md`｜byte 五项：`8,219 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 69（split 70）`
> SHA-256 甲（全档零位）`18C5B46FA37D8FDC1BBFF66CE43AAF71CB06861868C7F0FA051EE29B2F489158`
> SHA-256 乙（LF 归零零位）`18C5B46FA37D8FDC1BBFF66CE43AAF71CB06861868C7F0FA051EE29B2F489158`
> SHA-256 丙（行链零位）`CA133FDD3F98F9FD4F2A8038AA3CF03E69C08B649E2D1068DD41BF28E4C3DB42`
