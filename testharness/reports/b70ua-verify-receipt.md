# B-70UA 判窗回执（回归网第四轮 · 六条公共通道）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 15:0x CST
> 工单：主会话 m06307（2026-11-27 15:02）
> 终判：**PASS**（A=0 / B=3 全为驱动面 / C=7）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70ty-build1` | 同 | ✔ |
| release | 1,569,660 B | 1,569,660 B | ✔ |
| release SHA256 | `D11D4DA3526CC61AEA850F1E7A116E61AA156809C5CD054BFE83AC255F25EC7C` | 同 | ✔ |
| jar mtime | `2026-11-27T04:17:35.977Z` | 未变 | ✔（0 rebuild） |
| MK | 114 / 282 / 564 + 115 / 10，`ok=true` | 同 | ✔ |
| HEAD | `032c39f` | 同 | ✔（窗内 0 提交） |
| cfg | 56,005 B `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 起收同 | ✔ |
| props | 939 B `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 起收同 | ✔ |
| port 25565 | 0 → 0 | 0→0 | ✔ |
| crash-reports | 0 → 0 | 0→0 | ✔ |
| 驱动 | `testharness/player/f17-reg-fourth.js`（六臂，`H.create`） | 同 | ✔ |

- `[PIN] sha=D11D4DA3…F25EC7C shaOk=true size=1569660 sizeOk=true mkOk=true ok=true`
- `[cfg] f17-b70ua-r3-b1 blockDebugLog=true playerCapDebugLog=true mobDebugLog=true underworldDebugLog=true butcheringDebugLog=true`
- `[stop] {"exitCode":0,"exited":true}`
- 世界：`run/w-reg4-b70ua-r3-v1`（25 文件 / 4,918,736 B，保留）
- tee：`testharness/build-logs/f17-b70ua-r3-b1.out`（1,243,443 B / 8,393 行；`:4729` `Done (5.620s)!`，`:8391` `BUILD SUCCESSFUL in 36s`）

## §1 六臂判读（r3 终值）

`[done] {"run":"b70ua-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 面 | 实测 | 判定 | 锚（`f17-b70ua-r3-b1.out`） |
|---|---|---|---|---|
| W1 | BlockLog | 石面 `fullCube=true moves=true result=true`；空气 `fullCube=false moves=false result=false` | PASS | `:7616`（stone）、`:7629`（air） |
| W2 | CapLog | `lvl=10 cap=10 prevBase=6.0 healthBefore=6.0 heal=4.0 healthAfter=10.0`（cap>prevBase） | PASS | `:7679`（对照 boot 行 `:4822` `lvl=0 cap=6 prevBase=20.0`） |
| W3 | MobLog | `level-modifier lvl=10 melee bonus=1.05`（lvl>0、bonus>1） | PASS | `:7821`、`:7977` |
| W4 | DimLog | `worlds=[0, -1, 1, -2]`（4 个 id）；`portal block registered (metadata 0/1/2 …)` | PASS | `:4732`、`:415` |
| W5 | ButchLog | `cow well=true lvl=0 leather=3 rB=0 nudge=0 beef=1 burning=false` | PASS | `:7980` |
| W6 | SkillLog | `set player=ETIM_F7 mask=3` → `get player=ETIM_F7 mask=3` | PASS | `:8052`（set）、`:8095`（get） |

- W6 的 set/get 成对双写（带 `[server]` 与不带）各一条，判行取 set `:8052`／get `:8095`。

## §2 收敛链（r1 → r3，全部驱动面，产品码零改动）

| 轮 | EXIT | 红臂 | 根因 |
|---|---|---|---|
| r1 | 1 | 全部（起服前崩） | `[fatal] Error: cfg section missing: playerCaps` |
| r2 | 2 | W1/W2/W3 | BlockLog 正则被 `BlockPos{…}` 内空格打断；`xp add` 非 1.12 语法 ⇒ 等级仍 0，连带 CapLog/MobLog |
| **r3** | **0** | — | 全绿 |

### B 级（判据/工装不成立）

- **B-B70UA-1**（r1）：cfg 段头实际是小写 `playercaps {`（`run/config/etim.cfg:765`），驱动声明 `playerCaps:playerCapDebugLog` ⇒ harness 精确匹配失败、起服前 `[fatal]`。改 `playercaps:playerCapDebugLog`。
- **B-B70UA-2**（r2 W1）：`CUBE_RE` 的 `at (\S+)` 无法匹配 `at BlockPos{x=3, y=129, z=3}`（含空格）⇒ `rows:0` 假阴性（产品行 `:7699`、`:7713` 均在）。改 `at (BlockPos\{[^}]*\})`。
- **B-B70UA-3**（r2 W2/W3）：`xp add ETIM_F7 10 levels` 在 1.12 不存在（服务端 `:8042` `'add' is not a valid number`）⇒ 玩家等级仍 0，W2 只读到 boot 行（`lvl=0 cap=6 prevBase=20.0`），W3 为 `lvl=0 bonus=1.0`。改 `xp 10L ETIM_F7` 后 W2/W3 同轮转绿。

## §3 C 级（可接受偏差 / 工具面观察）

- **C-B70UA-1**：驱动 cfg 声明的段名大小写与 cfg 文件不一致即起服前崩，且错误只报段名（`cfg section missing:`），不提示现有段名；建议 harness 增加「近似段名」提示。
- **C-B70UA-2**：1.12 的 `xp` 只认 `<amount>[L] <player>`（无 `add`/`levels` 词），本类命令写法差异属代际语法面。
- **C-B70UA-3**（W5 子断言偏弱）：`ButchLog … cow well=true lvl=0 …` 的 `lvl=` 是被击杀生物的等级，不是玩家等级（玩家此时 lvl=10），故工单要求的 `lvl>=0` 恒真；本臂实际只由 `well=true` 定判。建议后续把 W5 子断言改为「leather+beef 与 lvl 同源」的强约束。
- **C-B70UA-4**（工具面复核，工单请我裁的项）：`node testharness/tools/check-channels.js` 现输出 `channels=56 producers=51 assertions=546 scripts=455 harness-risks=0 debt=0 archived=320 stale=0 harnessTags=3 legacy=1`、`verdict OK`；`HARNESS 脚本自打通道 3 → AnvilLog, LootLog, SkLog`、`LEGACY 仅反向检查引用 1 → ExtraLog`。**未再出现 SkillLog 被误判为 `anvilDebugLog` 门**，即 commands/ 与 client/ 路径一律记无门的改动在本窗观测上成立。
- **C-B70UA-5**（计数口径）：`channel-archive.json` 为 `{"updated":"2026-11-27","total":202,"scripts":{…202 项}}`，与工单「scripts=202」一致；而 check-channels 报的 `archived=320` 是另一个计数器（通道×脚本行数），两者不是同一量，回执按此区分。
- **C-B70UA-6**：每窗两条 `[stop]`（`h.stop()` 与 `finish()` 各一次），带 `exited:true` 者权威。
- **C-B70UA-7**：世界名三段前缀 `w-reg4-b70ua-r3-v1`。

## §4 收口

| 项 | 值 |
|---|---|
| cfg 起收 | 同 `C69FC496…E5AEC257` |
| props 起收 | 同 `6784C3ED…D21322F1EB9`（`level-name=w-b30v`） |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T04:17:35.977Z` 未变（0 rebuild） |
| HEAD | `032c39f`，窗内 0 提交 |
| 世界 | `run/w-reg4-b70ua-r1..r3-v1` 三个全留（r3：25 文件 4,918,736 B） |
| 证据 | `build-logs/b70ua-r{1,2,3}-stdout.out`、`testharness/build-logs/f17-b70ua-r{1,2,3}-b1.out` |

## §5 终判

**PASS** — W1–W6 全绿；A=0（本批零产品码改动，通道面与钉值一致）；B=3（全部驱动假设失效，已修）；C=7。

本回执字数规格：6386 B / 85 行。
