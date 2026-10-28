# testharness 运行注记（会话七交接资产）

本文件只写「怎么把验证窗跑起来 + 哪些坑已知」，判据数值与判决见
`playground/audit/*-verdict.md`。工作目录一律 `git-workspace/etim`。

## 1. 服务端

- 起服（headless，日志落 build-logs，不污染对话）：
  `powershell -NoProfile -ExecutionPolicy Bypass -File testharness\server\start-server.ps1 -WorkDir "<abs>\run\uw2" -LogDir "<abs>\build-logs\<tag>-server-logs"`
  起服成功标志：`run\uw2\logs\latest.log` 尾部出现 `Done (x.xxxs)!`。
- RCON：`127.0.0.1:25575`，密码 `etim27`；单发命令
  `node testharness\player\rcon-client.js 127.0.0.1 25575 etim27 "<cmd>"`。
- 优雅停服（禁 taskkill 直杀）：`save-all` → 等 2s → `stop` → 等
  `Stopping the server` / `Saving worlds` / `Unloading dimension` 落盘 → 端口自检
  `Get-NetTCPConnection -LocalPort 25565,25575 -State Listen` 必须为空 → 快照
  `run\uw2\logs\latest.log` → `build-logs\<tag>-session-N.log`（每 boot 一份，勿覆盖）。
- 窗内配置：`damageDebugLog=true` 出 `[DamageLog]` 行，收口改 `false` 并核 0 行；
  `armorModelR196` 按判点切（W19 需 false 单独 boot）。配置切换脚本见 §4。

## 2. bot（mineflayer）

- 假人名 `ETIM_Harn01`（`createHarnBot`，`testharness\player\fmlbot.js`）；连上后
  等 `entity.position.y > 0` 再 `sleep 3s` 才操作（出生同步未完成会空打）。
- 每相位独立进程：`node testharness\player\armorD3-run.js <phase>`（`w1`…`w19`）。
- **连击节拍 ≥1.15s**：`hurtResistantTime=20 tick`，窗内 `amount <= lastDamage`
  会在 `attackEntityFrom` 直接 return false，**不产生任何 `[DamageLog]` 行**
  （「未发生」与「被拒收」不可区分，100 发连箭 120ms 节拍会丢一半样本）。
- 箭用 `summon etim:metal_arrow … {Motion:[vx,0,0],arrow_item_id:"etim:arrow_ancient_metal"}`；
  箭击退会让假人漂移（mineflayer 吃速度包），每发前先 `tp` 回位。
- 假人被打死会掉线：`tp` 原语已内置「死则 `bot.respawn()` + 2.6s」兜底。

## 3. 已知污染源（踩过）

- **亡灵日晒**：白天召唤的 `zombie`/`longdead` 会自燃；燃烧中的僵尸命中会把玩家点燃，
  产生 `src=onFire` 行污染磨损面 → 召唤时给第 4 槽（头）戴皮头盔即可。
- **难度缩放**：1.12 `EntityPlayer.attackEntityFrom` 对 `isDifficultyScaled` 源在 easy
  做 `amount/2+1`（zombie 5.0→3.5 非整数，磨损列失真）→ 窗内固定
  `difficulty 2`（normal，不缩放，raw=5.000 整数）。
- **生命上限**：`capAtLevel0=6`（3 心），单发 5.0 就过半 → 多变判点先
  `etest level 40`（6+40/5×2=22→cap 20）+ `etest health 20`。
- **ETIM 怪物属性表**：`ETIMMobStats` 在 `EntityJoinWorldEvent` 写 `ATTACK_DAMAGE=5.0`，
  晚于 summon 参数 → 要压攻击力必须 summon 后 `/entitydata … {Attributes:[…Base:2.0d]}`
  （首击可能仍是 5.0，判据按实际 `raw=` 算，勿硬编码每击磨损）。
- **absorption 列是派生量**（`armorOut − final`）：致死钳位会虚增，判吸收面须取
  未致死且骰未全免的那一次。
- **`/data get entity` 是 1.13+**：1.12 读耐久用 mineflayer 背包元数据
  （`bot.inventory.slots[5..8].durabilityUsed`）或存档离线 NBT
  （`testharness\player\arrowB-nbt.js inv <world> <player>`）。
- **窒息行时点**：`inWall` 在方块落位当 tick 就出，日志 offset 必须先于 `setblock` 取。

## 4. 判点脚本入口（testharness/ 内）

| 用途 | 入口 |
|---|---|
| W1~W19 判点 driver | `testharness\player\armorD3-run.js <w1..w19>` |
| 配置切换/还原 | `testharness\player\armorD3-config.js on\|off\|model-off\|model-on\|restore` |
| `damageDebugLog=false` 0 行核 | `testharness\player\armorD-probe2.js` |
| 单发 RCON | `testharness\player\rcon-client.js <host> <port> <pw> "<cmd>"` |
| 离线 NBT 读背包 | `testharness\player\arrowB-nbt.js inv <world> <player>` |
| 起服 | `testharness\server\start-server.ps1` |
| 客户端优雅关窗 | `testharness\client\close-client.ps1`（按窗口标题 WM_CLOSE，等 `Stopping!`） |

> 客户端面（截图/GUI）一律由用户本人操作；AI 会话不操控鼠标键盘、不抢焦点、不拉窗。

## 5. 批 E / AD-7（ad7e）判点工装（2026-10-27 会话七）

- 工作目录 `run/ad7e`（uw2 的 server-safe mods 21 件派生；`level-name=ad7e`、FLAT、difficulty 2、
  RCON 25575 密码 etim27、online-mode=false）。判据面 = 该链 RCON（binpatch 链，exec 可用）。
- 起服：`powershell -File testharness\server\start-server.ps1 -WorkDir <abs>\run\ad7e -LogDir <abs>\build-logs\ad7e-boot<N>`
  （jar 从 `build\libs\etim-1.0.0.jar` 走 classpath append，mods 里不得放 etim jar）。
- 停服：`powershell -File testharness\server\ad7e-stop.ps1 -Tag ad7e-session-<N>`（save-all → stop → 等端口退 → 快照日志）。
- 配置切换：`node ad7e-config.js main|points0|max1|close|show`（只改 combat 段
  damageDebugLog / piercingMaxLevel / piercingPointsPerLevel）。
- 判点驱动：
  - `node ad7e-probe.js w1|w2|w3|w9probe|w11|all`（静态面；bot 只需在线作 `getPlayer` 目标）
  - `node ad7e-fight.js w456|w7 [--hits 200]|w8|w9|w10a|w10b`（真打面；双 bot Harn01/Harn03）
  - `node ad7e-nbt.js <player>`（playerdata 存档级：主手 ench 列表 / 甲胄四槽 Damage）
- 证据档：`build-logs/ad7e-report.json`（逐相位原始判行 + 汇总，重跑按 key 覆盖）。
- 坑（本批实测）：
  - **甲胄耐久只认存档 NBT**（save-all 后 playerdata）：客户端 `inventory.slots[6].durabilityUsed`
    会滞后/丢更新——p3 臂实测读到 0，而服务端 NBT 有真值。
  - **R196 磨损是整数随机分配，空槽会吞预算**：只有四槽占满时「每击 = int(min(wearBase, raw))」
    确定（满铁 wear 7.200 → 7/击 × 10 = 70）；两件/单件甲时每击落在甲上的点数随机，
    不能判「同值」。
  - `piercingMaxLevel=1` 时 `/etest enchant mainhand 3 piercing` 会被 parseInt 上限截断 →
    旧 NBT 高等级只能用 `replaceitem ... {ench:[{id:13,lvl:3}]}` 注。
  - `[DamageLog]` player 路径 `armorIn = raw × 1.2`（1.12 CombatRules 乘法先跑），mob 路径
    `armorIn == raw`；判值一律用 `armorIn`，不要用 raw 算差值。
  - W7 骰面每发必须 ≥1.25 s（受击无敌 20 tick），且每发前双侧 `tp` 复位（击退出 reach 门会整发 cancel）。

## 6. AD-10 + 盾面 SH（ad10s）判点工装（2026-10-27 会话七）

- 工作目录 `run/ad10s`（同 §5 的 21 件 server-safe mods 派生；`level-name=ad10s`、FLAT、difficulty 2、
  RCON 25575/etim27、online-mode=false）。判据面 = 该链 RCON（binpatch 链）。
- 起服：`powershell -File testharness\server\start-server.ps1 -WorkDir <abs>\run\ad10s -LogDir <abs>\build-logs\ad10s-boot<N>`
- 停服：`powershell -File testharness\server\ad10s-stop.ps1 -Tag ad10s-session-<N>`
- 配置切换：`node ad10s-config.js main|nomodel|factor1|shield0|close|show`
  （combat 段六键：damageDebugLog / blockDebugLog / blockModel / blockDamageFactor / blockMinDamage / shieldWearRate；
  `main` 同时把其余 dev 通道全关，只留两条判据通道）
- 判点驱动：`node ad10s-run.js w1 w2 … w12 w6x | w14a | w14b | w14c`
  （w14a/b/c 必须分别在 `nomodel` / `factor1` / `shield0` 三窗起服后跑）
- 证据：`node ad10s-evidence.js <窗号>` → `build-logs/ad10s-evidence-rows.txt`；逐相位判行在 `build-logs/ad10s-report.json`
- 坑（本批实测，务必先读）：
  - **`DamageSource.GENERIC` 带 bypassesArmor**：`/etest hurt <amount>`（无 src）会同时跳过护甲步与减半门
    （四件铁甲在身也 `prot armor=0.000`、无 `block` 行）。护甲/格挡判点一律走 mob 源形：
    `etest hurt @e[type=minecraft:zombie,c=1] <amount> <player>`。
  - **1.12 选择器是 `c=1`**，`limit=1` 会抛 `commands.generic.selector_argument`（`limit` 是 1.13 才有的）。
  - **mob 假人加 `{NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Fire:-1s}`**，且要 `time 18000`
    （白天会自燃）；长窗里仍会静默消失 → 驱动里「`NO_TARGET` 则补蛊并重发该发」兜底。
  - **W8/W12 这类连续 N 击的格挡臂必须 Unbreakable 武器**：铜剑 3200 耐被 `(int)(2.5×50)=125/击` 在 26 击打碎，
    断剑 → 空栈 → 1.12 `updateActiveHand` 结束 use 态 → 后续全退化成未挡臂（比率掉到 51.5%）。
  - **`[BlockLog]` 的 `dur=` 是已磨损值**（`getItemDamage()`），`probe … dur=` 是 `cur/max`；
    「D0−dur=400」按 `Δdur=400` 读。
  - 连击间隔 ≥11 tick（`hurtResistantTime` 20 / 2 的差额门），驱动默认 700 ms。

## 7. 跨项目附属索引（2026-10-28，ETIM-Extra 五金属盾批交接）

- ETIM-Extra 验证工装与判决全部在附属仓库：工装 `ETIM-Extra/testharness/`；回执 `testharness/reports/extra-shield-*-verdict.md`（首批/真实合成/补种数值/三件受击/会话七复跑五份）；账本 `playground/audit/audit-extra-裁定回执.md`（条 1–22）。本侧不重复落索引。


