# audit20 · W+D 验证窗 · 判决报告（会话七 · 2026-10-21）

**基线**：`8d46b2a`（W+D slice）。jar = `build/libs/etim-1.0.0.jar` **324,966 B @ 2026-10-21 17:54:26**，classpath 直引，全程未 rebuild；`src/main` 0 改动。
**工作目录**：`run\`（server-only；本窗不开客户端、不开 obf 链，不占 `run/obfuscated`）。
**判决源**：服务端 `[WeatherLog]` / `[AILog]`（`run/logs/latest.log` 逐 boot 落盘到 `build-logs/weather-*.latest.log`、`build-logs/wd-server-clean.latest.log`）。
**cfg 现值**（`run/config/etim.cfg`，开测前抄录）：`weatherDebugLog=true`、`mobDebugLog=true`、`weatherSystem=true`、`bloodMoonStorm=true`、`bloodMoonStormTicks=13000`、`moonStateOverride=`（空；W-1 回归后已还原）。
**seed**：`RandomSeed = -1293060200`（`run/test27dev/level.dat`，`_lvldat.js` 读）。
**oracle**：`testharness/weather-oracle.java`（`<seed> <day…> [--old] [--stormTicks N] [--trace]`；stormTicks=13000）。
**level.dat patch 工具**：`testharness/player/_settime.js`（停服态；prismarine-nbt `writeUncompressed` + gzip；写前 `.bak_<stamp>`）。

---

## 0. 环境与 patch 记录

**首 boot 基础设施故障（C 级，已清偿）**：`run\mods` 初始只有 13 个兼容 jar，无 MixinBooter/依赖 → 18:03:02 boot 在 `ETIM.init` 崩：`ClassCastException: net.minecraft.item.ItemSword cannot be cast to io.github.etim.etim.mixins.ItemSwordAccessor`（mixin 未加载）。从 `run\obfuscated-server\mods` 复制 13 个非兼容库 jar（`!mixinbooter-11.13`、asm×5、cleanmix、gson、guava、mixinextras、osxnarratorblocker、strip-latest-forge-requirements）到 `run\mods`（现 26 jar），复 boot 成功。**未改 src/jar**；该 crash 报告在 `run/crash-reports/crash-2026-10-21_18.03.09-server.txt`。

**level.dat patch 表**（`_settime.js` 输出；W 窗全部停服态写入）：

| 窗 | 目标（调整日块起点） | before Time | after Time | backup |
|---|---|---|---|---|
| W-0（首 boot，mixin 缺场崩） | day 31 → 714000 | 692100 | 714000 | `level.dat.bak_20261021100302` |
| W-0（复 boot） | 714000 | 714000 | 714000 | `level.dat.bak_20261021100535` |
| W-1 | day 30 → 690000 | 714273 | 690000 | `level.dat.bak_20261021100606` |
| W-2 | day 24 → 546000 | 690159 | 546000 | `level.dat.bak_20261021100632` |
| W-3 | day 32 → 738000 | 546107 | 738000 | `level.dat.bak_20261021100657` |
| W-4a | day 30 → 690000 | 738039 | 690000 | `level.dat.bak_20261021100721` |
| W-4b | day 30 内 → 696000 | 690024 | 696000 | `level.dat.bak_20261021100752` |
| W-5a | day 30 → 690000 | 696037 | 690000 | `level.dat.bak_20261021100819` |
| W-5b | day 30 → 690000 | 690038 | 690000 | `level.dat.bak_20261021100841` |

**终态**：`Time=705359`、`DayTime=1000`（D 窗后；`/time set day` 写 DayTime）；25565 已释放；除上述 18:03:09 基础设施 crash 外无 crash/hs_err；服务端日志 ERROR = 4 行 FML 启动噪声（Maven 目录 3 + signature 1），运行面 0。

---

## 1. W 窗（`[WeatherLog]`；oracle 逐位对照）

### W-0 oracle 自验 · PASS

- patch `Time = 714000`（当前调整日 30 + 1 = **day 31** 的块起点）。
- 服务端首条：`[WeatherLog] weather-schedule day=31 total=714000 events=0 []`
- oracle：`oracle day=31 events=0 []`
- **逐位一致（一致）**。本日为空 events 面；非空 type/storm 段的逐位对照由 W-2（type=1）与 W-3（storm=744000..757000 type=3）补足。

### W-1 F-14-26 日界面 · PASS

- patch `Time = (30-1)*24000-6000 = 690000`（D=30，非 32k/收获/蓝月日）。
- 服务端首条：`[WeatherLog] weather-schedule day=30 total=690000 events=0 []`
- 校验：`day=(total+6000)/24000+1 = (690000+6000)/24000+1 = 30` ✓；`total=690000` = 块起点 ✓。
- 旧码（unadjusted day-key = `total/24000+1`）在同一 total 下算得 day=29（运行态则保持 day-29 缓存、块起点不刷新）→ 本行 day=30 即日界面修复直证。
- oracle new `day=30 events=0 []` 与日志一致。

### W-2 F-14-25 恢复面 · PASS

- oracle 双式扫 day 2..2000（`--stormTicks 13000`，new / `--old` 各 1999 行）；差异日 **34** 个，首个 `new>0 && old=0` 的 **D\*=24**：
  - `oracle day=24 events=1 [(548972..562394 type=1)]`
  - `oracle day=24 events=0 []`（--old）
- 机制核对：事件 end=562394 的采样点 `end+192000 → dayH=32`（收获日 8+24），该点 `isDaytime(562394)=true`（adjusted=16394 ∈ (5000,19000)）→ 新式夜门 `isHarvestTick` 返回 false，事件保留；旧式无夜门 → 排除。即 F-14-25 的收获排除门加夜门的净效果。
- patch `Time = (24-1)*24000-6000 = 546000`；服务端：
  `[WeatherLog] weather-schedule day=24 total=546000 events=1 [(548972..562394 type=1)]`
- 与 oracle new **逐位一致**；同日 `--old` 为空 = **恢复实证**。

### W-3 F-14-33 面 · PASS

- patch `Time = 738000`（day 32 块起点；(32-1)*24000-6000）。
- 服务端：`[WeatherLog] weather-schedule day=32 total=738000 events=1 [(744000..757000 storm=744000..757000 type=3)]`
- oracle new：`oracle day=32 events=1 [(744000..757000 storm=744000..757000 type=3)]`（逐位一致）。
- 恰 **1 个 storm span**（744000..757000 = firstTick+6000 起 13000t）+ **零随机事件**。旧码（血门读当前日 phase）= generateDay(31) 亦加强制 storm，会多出 day-31 惯性 span `(720000..733000 storm=720000..733000 type=3)`；本行无此 span → F-14-33 修复直证。

### W-4 W-1 回归（`moonStateOverride=blood`）· PASS

- cfg 置 `moonStateOverride=blood`，boot 690000（day 30）：
  `[WeatherLog] weather-schedule day=30 total=690000 events=2 [(672000..685000 storm=672000..685000 type=3), (696000..709000 storm=696000..709000 type=3)]`
  → 强制 storm span 在（day-29 672000..685000 与 day-30 696000..709000 **双遍皆加**；R2 note② 既有惯性面，非缺陷）。
- 该 total=690000 落在两 span 间隙，故同 boot 无 flip；同窗再 boot `Time=696000`（仍在 day 30、落在 day-30 强制 storm 窗内）：
  `[WeatherLog] weather-schedule day=30 total=696000 events=2 [(672000..685000 storm=672000..685000 type=3), (696000..709000 storm=696000..709000 type=3)]`
  `[WeatherLog] weather-flip t=696000 raining=true thundering=true reason=event`
- **override 验后已还原 `S:moonStateOverride=`（空）**。

### W-5 W-2 回归（同日双 boot）· PASS

- 同一 patch `Time=690000`，两次独立 boot：
  - `[18:08:33] ... weather-schedule day=30 total=690000 events=0 []`
  - `[18:08:54] ... weather-schedule day=30 total=690000 events=0 []`
- `[WeatherLog]` 起至行尾 **逐字节一致**（仅日志时间戳前缀不同）。

---

## 2. D 窗（`[AILog]`；单次干净 boot 18:19:46）

**摆场**：`run\` 干净 boot；bot A = `ETIM_Harn04`（survival/op，命令与远端玩家）、bot B = `ETIM_Harn05`（spectator，狼区保载；旁观者不计入 `getClosestPlayer(..., false)` = re-final2-verdict 2.1 #3 已证）。`doMobSpawning=false`、`doDaylightCycle=false`、`time set day`、`difficulty easy`、`kill @e[type=!Player]` 清场；spawn(-60,68,232)+60 处建 6 间封石室（3×3×4 壳、`minecraft:stone 0 hollow`，内部 1×2×1），z=238/244/250/254/258/262。召唤：`zombie_villager`（1.12 注册名；非 `ZombieVillager`）×2、`Wolf`×4。bot A 起始在 spawn（距各室 ~60 格，distSq≈3600 > 256）。

| # | 判据 | 日志原文 / 实测 | 判 |
|---|---|---|---|
| F-11-28 ① | 非转换 `zombie_villager` → counter 过 200 门 → kill 行 `EntityZombieVillager`（旧码永不出现） | `[18:20:25] [AILog] mob despawn kill counter=200 distSq=3636 pos=(0,68,238) entity=EntityZombieVillager#253 [server]`（#253 = WD_ZV，无 IsConverting；counter 自然到 200；旧键 `hold=zombie-villager` 全窗 **0 行**） | **PASS** |
| F-11-28 ② | 转换中 `IsConverting:1b,ConversionTime:600` → `hold=zombie-villager-converting` + 转换窗内零 kill | `[18:20:25] [AILog] mob despawn hold=zombie-villager-converting entity=EntityZombieVillager#254 [server]`；#254 全窗 **0 行 kill**（旧键 `hold=zombie-villager` 已死，0 行；新键为据） | **PASS** |
| F-11-26 ① | 野狼 age≤2400 → `hold=wolf-age`（每狼一 row）+ 零 kill | 3 只野狼各 **恰 1 行**：`[18:20:26] ... hold=wolf-age entity=EntityWolf#255`、`[18:20:26] ... #256`、`[18:20:27] ... #257`；注入前 #255/#257 **0 kill** | **PASS** |
| F-11-26 ② | 同狼 age>2400 且 counter 过墙 → kill 行可现（800/2400 墙 + 200 门重掷锁死判据不受扰） | WD_W2 = #256（室 z=254）：召唤 18:20:18 → 注入 18:22:26 = 128 s，`[18:22:26] ... counter-meter counter=2502 age=2582 entity=EntityWolf#256`；`entitydata {despawn_counter:2501}` 后远端玩家（1140.5,70,232）：`[18:22:26] [AILog] mob despawn kill counter=2502 distSq=1300704 pos=(0,68,254) entity=EntityWolf#256 [server]` | **PASS** |
| F-11-26 ③ | 驯服狼 >2400t：无 kill + testfor 存活 | WD_TAME = #258（`OwnerUUID:"8b01cd34-df04-30b6-b6ca-85914f766604"` → 1.12 由非空 OwnerUUID 推导 `isTamed`；无独立 `Tame` 持久键）：age 2572、counter 2502；`[18:22:26] ... pass-state c=2502 distSq=1445535 wall=none entity=EntityWolf#258` → `canDespawn` 返 false（tame 层静默，无 hold 行）→ **0 kill**；`testfor @e[name=WD_TAME]` → `Found WD_TAME`（另 `Found WD_W1`/`Found WD_W3`；`WD_W2` → `found nothing`） | **PASS** |

**D 窗方法备注**：
1. 远端玩家（>1024 格）会使狼区块停止 tick（v1 反例：tp 后 #597–600 的 pass-state 立即断流）；v2 由 **旁观者 Harn05 常驻狼区保载**，且旁观者不计入 `getClosestPlayer(..., false)`——#258 位于 spawn 旁（Harn05 距其仅数格），但远端 tp 后同一 pass 的 `distSq=1445535`（到 Harn04）而非近距，直证旁观者被排除。
2. `despawn_counter` 注入仅用于 **F-11-26 ②/③** 的「过墙」面（`entitydata @e[name=…] {despawn_counter:2501}`；NBT 直证 `despawn_counter:2501`）；F-11-28 ①/② 与 F-11-26 ① 的 counter 均自然过 200 门。
3. 转换实体 #254 的转换窗（ConversionTime=600 = 30 s）内零 kill，全窗无 `kill … #254` 行；未转换 #253 在 10 s（counter=200）被链杀。

---

## 3. 判定汇总

| 项 | 判 |
|---|---|
| F-14-26（日界面：调整日 day-key，块起点刷新） | **PASS** |
| F-14-25（收获排除门夜门；恢复面 D\*=24） | **PASS** |
| F-14-33（血月强制 storm 只读生成日自身血性，day-31 惯性 span 消失） | **PASS** |
| W-1 回归（`moonStateOverride=blood`：强制 storm span + `weather-flip thundering=true`；override 已还原） | **PASS** |
| W-2 回归（同日双 boot `weather-schedule` 载荷逐字节一致） | **PASS** |
| F-11-28（① 非转换可杀；② 转换 hold 新键 + 窗内零 kill） | **PASS** |
| F-11-26（① 每狼一 hold；② 过 2400/墙 + 远端 kill；③ 驯服狼零 kill + 存活） | **PASS** |
| oracle 自验（day 31 首行 vs oracle new） | **一致** |

**签署**：会话七｜W+D 窗 7/7 PASS，oracle 自验一致；W 窗 9 boot（含 1 次 mixin 缺场崩）+ D 窗 1 干净 boot；`src/main` 0 改动、jar 324,966 B @ 17:54:26 未变；25565 已释放；`moonStateOverride` 已还原空。
