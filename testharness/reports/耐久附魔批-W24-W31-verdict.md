# 耐久附魔统一批 · W-24…W-31 判决回执（L3 判点窗）

> **报告字节规格**：`17,995 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 114 / ✗ 1｜170 行`
> 执行方：会话七（自动化测试执行方）｜执行窗：2026-10-29 18:03–18:13（服务器本地时；驱动 UTC 10:03–10:13）｜tag `durability-l3-w24-w31`
> 判决源：`ETIM-Extra\playground\audit\耐久附魔批-终审回执.md` §四「判点窗终点表（finalize）」＋主会话条 125（D-4 冻结）｜对照模型 = R196 面 ×1.818 档（只作分辨性空证辅助，不判数据落位）

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 主 mod 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | 窗内即此目录，`runServer` 工作目录 `run\` |
| 产品 HEAD | `4899163`（build: pin JDK 25；产品码面 = `03bbeff`） | ✓ 起窗/收口同值 |
| dev jar | 750,801 B｜`7998673BB60B7ADDA332709F947426CCC665FEE46D25B42860BC4C61C7E63BA7` | ✓ 起窗前/收口后逐位同值（0 rebuild） |
| 附属 jar（本窗必须在场） | 31,614 B｜`2D42D78AE475E2261C9071B980322570EC7003FC86961771CF32D8374C847A98` | ✓ 逐位命中；窗内置于 `run\mods\etimextra-0.1.0.jar`，收口后移除 |
| 服务端 mod 清单 | `Finished gathering 16 mods`；FMLSrvMods 含 `etim@1.0.0` ＋ `etimextra@0.1.0` | ✓ |
| 附属 boot 行 | `[ETIM-Extra]: [ExtraLog] preInit` | ✓ |
| 构建 JDK | `gradle.properties` 的 `org.gradle.java.home` → `jdk\zulu25.38.107-ca-jdk25-0.5-win_x64` | ✓ 未设 `JAVA_HOME`、未现搜（agents.md 条 0） |
| 起服/停服 | `gradlew runServer` ＋ 控制台 stdin（`server-console.js`，commit `89ce11a`） | ✓ 与任务书一致（本工作区 RCON 在 GradleStart 链下不可用为在案硬规则） |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE` | ✓ 0 rebuild（1 executed = `:runServer`） |
| 环境前置 | 25565 空闲、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

注入口（每腿开打前逐条执行，双证见 §2 `INJ` 列与假人 NBT 回读）：

- 主手盾（W-24…W-26、W-28…W-30）：`/etest hold <盾> ` → `/enchant <bot> unbreaking 3`（7 腿中 6 条走此路；`Enchanting succeeded` 6 条在案）。
- 银盾幽魂腿（W-27）：`/replaceitem entity <bot> slot.weapon.offhand etimextra:silver_shield 1 0 {ench:[{id:34,lvl:3}]}`（`Replaced slot slot.weapon.offhand with 1 * [Silver Shield]` 在案）；举盾走假人 `activateItem(true)`（副手）。
- 铜剑（W-31）：`/etest hold etim:sword_copper` → `/enchant <bot> unbreaking 3`。
- 双证：① 上述命令回执行；② 假人 NBT 回读 `ench[id=34,lvl=3]`（主手 = `mainhand`，副手 = `slot45`），8/8 腿 `enchVerified=true`。

## 1. 逐判点核讫表（Σ 与窗位）

判法：每腿先打 1 击 L0 对照（**不计入窗**，只验单击 `wear=` = W-16 判点值），再打 N 击 8 伤；判 **Σ(每击 durAfter − durBefore)** 落「现行（vanilla L3）」窗，并要求不与「R196 面」窗相交。每击间隔 ≥0.85 s（`hurtResistantTime` 20 tick，>10 时等量伤害被丢弃）；每击以一条 `[BlockLog] wear` 行落地为同步，实际 landed = N+1（L0+正式）逐腿精确。

| 窗 | 载体 | 单击 wear | N | **Σ Δdur** | 现行窗（判②用） | 落窗 | R196 窗（判①用） | 无交集 | 期望 E=w·N/4｜偏差 z |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-24 | 木盾 `minecraft:shield` | 10 | 50 | **120** | 95–155 | ✓ | 241–309 | ✓ | 125｜−0.52σ |
| W-25 | 铜盾 `etimextra:copper_shield` | 9 | 100 | **199** | 186–264 | ✓ | 450–540 | ✓ | 225｜−2.00σ |
| W-26 | 银盾·物理 `etimextra:silver_shield` | 16 | 100 | **415** | 348–452 | ✓ | 820–940 | ✓ | 400｜+0.87σ |
| W-27 | 银盾·幽魂（副手）`etimextra:silver_shield` | 3 | 100 | **73** | 52–98 | ✓ | 139–191 | ✓ | 75｜−0.27σ |
| W-28 | 远古盾 `etimextra:ancient_metal_shield` | 7 | 100 | **154** | 140–210 | ✓ | 345–425 | ✓ | 175｜−1.83σ |
| W-29 | 秘银盾 `etimextra:mithril_shield` | 5 | 100 | **127** | 95–155 | ✓ | 241–309 | ✓ | 125｜+0.21σ |
| W-30 | 艾德曼盾 `etimextra:adamantium_shield` | 4 | 100 | **91** | 74–126 | ✓ | 190–250 | ✓ | 100｜−1.04σ |
| W-31 | 铜剑·工具臂 `etim:sword_copper` | 200 | 10 | **467** | 441–559 | ✓ | 1,033–1,167 | ✓ | 500｜−1.70σ |

覆盖与分离：8/8 落现行窗，8/8 与 R196 窗**零交集**（最近的一行 = W-27：上界 98 < R196 下界 139，裕度 41）；最大 |z| = 2.00σ（W-25），远未触 3σ 边界。

逐腿字段核讫（每击逐行断言，非抽样）：

| 窗 | L0 `wear=` | 正式击 `wear=` 全集 | `rate=` | `mult=` | `decay=` | `block factor=` | `spectral=` | `carrier=` | 击数落地 | dur 单调 | 未破盾 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-24 | 10 ✓ | {10} ✓ | 2.500 ✓ | 1.000 ✓ | na ✓ | 0.500 ✓ | false ✓ | `minecraft:shield` ✓ | 51/51 ✓ | ✓ | ✓（124/336） |
| W-25 | 9 ✓ | {9} ✓ | 2.500 ✓ | 1.000 ✓ | na ✓ | 0.450 ✓ | false ✓ | `etimextra:copper_shield` ✓ | 101/101 ✓ | ✓ | ✓（201/1,600） |
| W-26 | 16 ✓ | {16} ✓ | 3.500 ✓ | 1.400 ✓ | na ✓ | 0.600 ✓ | false ✓ | `etimextra:silver_shield` ✓ | 101/101 ✓ | ✓ | ✓（424/1,600） |
| W-27 | 3 ✓ | {3} ✓ | 1.250 ✓ | 0.500 ✓ | na ✓ | 0.350 ✓ | **true** ✓ | `etimextra:silver_shield` ✓ | 101/101 ✓ | ✓ | ✓（74/1,600） |
| W-28 | 7 ✓ | {7} ✓ | 2.500 ✓ | 1.000 ✓ | na ✓ | 0.350 ✓ | false ✓ | `etimextra:ancient_metal_shield` ✓ | 101/101 ✓ | ✓ | ✓（154/3,200） |
| W-29 | 5 ✓ | {5} ✓ | 2.500 ✓ | 1.000 ✓ | na ✓ | 0.250 ✓ | false ✓ | `etimextra:mithril_shield` ✓ | 101/101 ✓ | ✓ | ✓（128/6,400） |
| W-30 | 4 ✓ | {4} ✓ | 2.500 ✓ | 1.000 ✓ | na ✓ | 0.200 ✓ | false ✓ | `etimextra:adamantium_shield` ✓ | 101/101 ✓ | ✓ | ✓（92/12,800） |
| W-31 | 200 ✓ | {200} ✓ | na ✓ | na ✓ | 50 ✓ | 0.500 ✓ | false ✓ | `etim:sword_copper` ✓ | 11/11 ✓ | ✓ | ✓（520/3,200） |

## 2. 判决源（逐窗两行原文）

每窗给 **L0 对照**（不计入窗）与**末击**两行；中间 740 击的同形行全量在 `durability-l3-w24-w31-server-latest.log`（§4 证据档），逐行 `wear=/rate=/mult=/decay=/factor=/spectral=/carrier=` 与本表同值。

### W-24 木盾（N=50，Σ=120，dur 4→124）

```text
[18:03:48] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=minecraft:shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=4.000 wear=10 dur=0->4 [server]
[18:03:48] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=minecraft:shield [server]
[18:04:30] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=minecraft:shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=4.000 wear=10 dur=122->124 [server]
[18:04:30] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=minecraft:shield [server]
```

### W-25 铜盾（N=100，Σ=199，dur 2→201）

```text
[18:04:34] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:copper_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=3.600 wear=9 dur=0->2 [server]
[18:04:34] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=3.600 factor=0.450 spectral=false min=1.000 carrier=etimextra:copper_shield [server]
[18:05:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:copper_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=3.600 wear=9 dur=198->201 [server]
[18:05:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=3.600 factor=0.450 spectral=false min=1.000 carrier=etimextra:copper_shield [server]
```

### W-26 银盾·物理（N=100，Σ=415，dur 9→424）

```text
[18:06:02] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:silver_shield shield=true rate=3.500 mult=1.400 decay=na raw=8.000 blocked=4.800 wear=16 dur=0->9 [server]
[18:06:02] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.800 factor=0.600 spectral=false min=1.000 carrier=etimextra:silver_shield [server]
[18:07:28] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:silver_shield shield=true rate=3.500 mult=1.400 decay=na raw=8.000 blocked=4.800 wear=16 dur=417->424 [server]
[18:07:28] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.800 factor=0.600 spectral=false min=1.000 carrier=etimextra:silver_shield [server]
```

### W-27 银盾·幽魂（副手，spectral=true；N=100，Σ=73，dur 1→74）

```text
[18:07:31] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:silver_shield shield=true rate=1.250 mult=0.500 decay=na raw=8.000 blocked=2.800 wear=3 dur=0->1 [server]
[18:07:31] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.800 factor=0.350 spectral=true min=1.000 carrier=etimextra:silver_shield [server]
[18:08:56] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:silver_shield shield=true rate=1.250 mult=0.500 decay=na raw=8.000 blocked=2.800 wear=3 dur=74->74 [server]
[18:08:56] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.800 factor=0.350 spectral=true min=1.000 carrier=etimextra:silver_shield [server]
```

### W-28 远古盾（N=100，Σ=154，dur 0→154）

```text
[18:08:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:ancient_metal_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=2.800 wear=7 dur=0->0 [server]
[18:08:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.800 factor=0.350 spectral=false min=1.000 carrier=etimextra:ancient_metal_shield [server]
[18:10:25] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:ancient_metal_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=2.800 wear=7 dur=152->154 [server]
[18:10:25] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.800 factor=0.350 spectral=false min=1.000 carrier=etimextra:ancient_metal_shield [server]
```

### W-29 秘银盾（N=100，Σ=127，dur 1→128）

```text
[18:10:28] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:mithril_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=2.000 wear=5 dur=0->1 [server]
[18:10:28] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.000 factor=0.250 spectral=false min=1.000 carrier=etimextra:mithril_shield [server]
[18:11:53] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:mithril_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=2.000 wear=5 dur=127->128 [server]
[18:11:53] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=2.000 factor=0.250 spectral=false min=1.000 carrier=etimextra:mithril_shield [server]
```

### W-30 艾德曼盾（N=100，Σ=91，dur 1→92）

```text
[18:11:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:adamantium_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=1.600 wear=4 dur=0->1 [server]
[18:11:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=1.600 factor=0.200 spectral=false min=1.000 carrier=etimextra:adamantium_shield [server]
[18:13:22] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etimextra:adamantium_shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=1.600 wear=4 dur=91->92 [server]
[18:13:22] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=1.600 factor=0.200 spectral=false min=1.000 carrier=etimextra:adamantium_shield [server]
```

### W-31 铜剑·工具臂（N=10，Σ=467，dur 53→520）

```text
[18:13:25] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etim:sword_copper shield=false rate=na mult=na decay=50 raw=8.000 blocked=4.000 wear=200 dur=0->53 [server]
[18:13:25] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=etim:sword_copper [server]
[18:13:34] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn24#70 item=etim:sword_copper shield=false rate=na mult=na decay=50 raw=8.000 blocked=4.000 wear=200 dur=473->520 [server]
[18:13:34] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn24#70 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=etim:sword_copper [server]
```

## 3. 冲突分级（A / B / C）

A 级 0 条、B 级 0 条；C 级 4 条如下（均不触及产品行为与判点结论）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | 首跑（`durability-l3-w24-w31-attempt1-*`）8 腿 Σ 全部落窗，但驱动判 `spectralAll=false`：block 行由服务端同一线程紧接 wear 行写出，控制台 tee 分块到达，驱动取邻行时该行尚未进入流。修驱动（等 block 行落流后再取邻行）后**整窗重跑**，第二次 8/8 全绿 | 驱动侧抓行竞态；首跑证据整档留档；不影响产品判值（首跑日志里每次受击两行齐备） |
| C-2 | C | i-frame 节流：vanilla `hurtResistantTime=20`，`>10` 时等量伤害被丢弃 ⇒ 每击间隔取 0.85 s；每击以一条 `[BlockLog] wear` 落地为同步，实际 landed 逐腿 = N+1（无吞击、无补击） | 工装手法面；判据面不受影响 |
| C-3 | C | mod 物品 id 不在 minecraft-data（`4270` 等），mineflayer 侧 `slot.name` 解析不出 ⇒ 附魔 NBT 回读改为「按 NBT 认物品」（`ench[id=34,lvl=3]`），不按 name | 双证仍成立：命令回执（`Enchanting succeeded` / `Replaced slot …`）＋ NBT 回读（`mainhand` / `slot45`） |
| C-4 | C | 附属五盾注册时 FML 报 `Registry Item: Object did not get ID it asked for`（Expected 4260 Got 4266 等 5 条） | FML 正常 ID 重排，注册名与判行 `carrier=` 不变；不影响本批判点 |

无 provenance 回指：本窗只判「现行面落窗 / R196 面空交集」，未以 R196 写法作反对理由；D-1/D-5/D-4 裁定原样执行，零改码。

## 4. 结论

**W-24…W-31 全部通过**（A 0 / B 0 / C 4）。

- 8/8 腿 Σ Δdur 落「现行（vanilla L3 = nextInt(4)>0，否定率 0.75）」窗；8/8 与「R196 面（level/5×0.75 = 0.45，×1.818 档）」窗**零交集** —— 现行实装即 vanilla 面，R196 面被空证排除（最近裕度 = W-27 上界 98 vs R196 下界 139）。
- 单击 L0 对照 8/8 等于 W-16 判点值（10/9/16/3/7/5/4/200），盾面乘子面（`rate=` 2.500/3.500/1.250、`mult=` 1.000/1.400/0.500）与 `factor=`（0.500/0.450/0.600/0.350/0.350/0.250/0.200）逐位在案；幽魂腿 `spectral=true` 与物理腿 `spectral=false` 互证；副手银盾链路（`slot45`）判通。
- 反点定位：无。无吞击（每腿 N+1 行）、无破盾（末值远低于耐久）、dur 单调、`klass` 无异常。
- 本批为纯判点窗：产品码 0 改动、配置 0 新增（`blockDebugLog` 窗内字节注入、收口整档还原）、`:jar UP-TO-DATE`。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | `Done (1.054s)` 18:03:42 → stdin `stop` → `Saving worlds` → `BUILD SUCCESSFUL in 10m 5s`，驱动退出码 0 |
| 配置还原 | 窗前字节副本整体还原，回读 27,413 B｜SHA-256 `910E2DA0D7AC577FED388C44FD36884F009FADE06CE66E1D7DC8741907CBE398`（**byte-identical**） |
| mods 面还原 | `run\mods\etimextra-0.1.0.jar` 已移除；`run\config\etimextra.cfg`（窗内首建）已移除 |
| 端口 | 25565 收口后 0 条 LISTEN |
| 崩溃 | `run\crash-reports` 18 条，窗前后不变 |
| 客户端 | 本窗全程无客户端进程（纯服务端 + 假人 `ETIM_Harn24`） |
| 证据档 | `testharness\build-logs\durability-l3-w24-w31.out`（全量控制台）、`…-server-latest.log`（服务端日志 2.7 MB）、`…-evidence.json`（逐判点＋每击行）、`…-lines.txt`（逐窗 L0/末击原行）、`…-etim.cfg.before`（窗前字节）、`…-attempt1-*`（首跑留档）、`durability-l3-smoke{,2}-*`（W-27 副手链冒烟，N=5，不判值） |
| 驱动 | `testharness\player\durability-l3-w24-w31.js`（8 腿表＋L0＋节流＋重试）、`testharness\server\server-console.js`（stdin 控制面） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `4899163` 起收同值） |
