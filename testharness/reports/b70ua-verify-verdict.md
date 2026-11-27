# W-B70UA 判窗正本：回归网第四轮（BlockLog / CapLog / MobLog / DimLog / ButchLog / SkillLog）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-27 14:5x–15:04（r1–r3）
- 判据源：`testharness/player/f17-reg-fourth.js`（r3 版）
- 终判：**PASS**（A=0 / B=3 / C=7）

## §0 钉值

- `f7-wb-lib.js:35` = `b70ty-build1`
- release 1,569,660 B `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C`（mtime 2026-11-27T04:17:35.977Z，窗内 0 rebuild）
- MK 114 / 282 / 564 + 115 / 10，ok=true
- HEAD `032c39f`（窗内 0 提交）

## §1 六臂锚点（`testharness/build-logs/f17-b70ua-r3-b1.out`，1,243,443 B / 8,393 行）

- W1 `:7616` `[BlockLog] solidcube … block=minecraft:stone fullCube=true moves=true result=true`；`:7629` 空气格 result=false
- W2 `:7679` `[CapLog] lvl=10 cap=10 prevBase=6.0 healthBefore=6.0 heal=4.0 healthAfter=10.0`（boot 对照 `:4822` lvl=0 cap=6）
- W3 `:7821`/`:7977` `[MobLog] level-modifier lvl=10 melee bonus=1.05`
- W4 `:4732` `[DimLog] worlds=[0, -1, 1, -2]`；`:415` `[DimLog] portal block registered …`
- W5 `:7980` `[ButchLog] cow well=true lvl=0 leather=3 …`
- W6 `:8052`/`:8095` `[SkillLog] set/get player=ETIM_F7 mask=3`

## §2 B 级（判据/工装，产品零背离）

- B-1 cfg 段名大小写：盘上段头是 `playercaps`，驱动写 `playerCaps` → r1 起服前 `cfg section missing`
- B-2 `CUBE_RE` 的 `at (\S+)` 被 `BlockPos{x=3, y=…}` 内空格截断 → r2 W1 假阴性；改 `(BlockPos\{[^}]*\})`
- B-3 1.12 无 `/xp add <player> <n> levels`；正确形 `/xp 10L <player>` → r2 W2/W3 只读到 boot 行/等级 0

## §3 C 级

- C-1 段名不符时未提示现有段名
- C-2 1.12 xp 语法无 add/levels 词
- C-3 W5 的 `lvl=` 是被击杀生物等级，恒真；本臂实由 `well=true` 定判，后续可加强
- C-4 `check-channels` 的 commands/client 记无门改动成立（SkillLog 不再误判为 anvilDebugLog）
- C-5 `channel-archive.json` 202 项 与 `archived=320` 是不同计数器
- C-6 每窗两条 `[stop]`（取 `exited:true`）
- C-7 世界名三段前缀 `w-reg4-b70ua-r3-v1`

## §4 结构性不可覆盖（登记，非缺陷）

- `PoseLog` / `SoundLog`：产出点在 `client/`，服务端窗口永远看不到
- `FireLog`：`roll` 仅在燃烧实体上以 0.00125–0.01/tick 概率出现，60 秒窗不可稳定捕获

## §5 终判

`PASS`（A=0 / B=3 / C=7）。回归覆盖 **36/51 → 42/51**。
