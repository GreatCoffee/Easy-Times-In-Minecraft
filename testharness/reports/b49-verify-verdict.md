# W-B49 判窗正本（D 卷基础行为小件：warnPeers 同伴告警 + 拾取总门）

**判窗时间**：2026-11-21 00:06 → 00:15（CST 本地；服务端日志为 UTC，差值 +8h）
**执行方**：会话七（ETIM 验证窗执行）
**判决源**：工作树 HEAD `de263e4`（窗内 0 提交）

## §0 钉值（实测）

| 项 | 实测值 | 钉值 | 判定 |
|---|---|---|---|
| release jar | `build/libs/etim-1.0.0.jar` 1,213,675 B | 1,213,675 B | ✅ |
| release SHA256 | `EEF3C728C6453C01C737C56CAA34A262723B6A38797444EE546D1BE82A17A92F` | 同 | ✅ |
| jar mtime | `2026-11-20T15:53:04Z` | 窗内不变 | ✅ 0 rebuild |
| MK refmap | classes 101 / entries 242 / dual 484 | 101/242/484 | ✅ |
| MK manifest / ok | mixins 101、client 10、`mk.ok=true` | 101 + 10 | ✅ |
| HEAD | `de263e4` | `de263e4` | ✅ 窗内 0 提交 |
| crash-reports | 24 → 24 | — | ✅ 窗内无新增 |
| port 25565 | 0（各臂停服后） | 0 | ✅ |
| cfg SHA256 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（49,406 B） | 起收同 | ✅ |
| props SHA256 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` | 起收同 | ✅ |
| props level-name | 起 `w-b30v` → 收 `w-b30v`；`allow-flight=false` | 还原成立 | ✅ |

工作树：`M` 6 件 + 新文件 `ETIMAnimalWarn.java`，与工单一致；未 checkout/reset/clean，未 build，未 commit。

## §1 判读总表

| 窗 | 内容 | 判据 | 结果 | 判定 |
|---|---|---|---|---|
| W0 | 双 boot 基础 | 两轮 `Done (` ∧ mixinFail=0 ∧ 停服 `{exitCode:0,exited:true}` | v1 `Done (5.453s)`、v2 `Done (5.637s)`；mixinFail=0×2；停服全 0/true | ✅ PASS |
| W1 | 三牛同伴告警 | `[AILog] warnpeers src=EntityCow peers=2 attacker=191` ∧ 3 条 probe | v1/v2 均命中；3 条 probe 全 `revenge=191` | ✅ PASS |
| W2 | 恐慌旗接续 | 两个 peer id 各有 `panicflee src=cow start` | v1 三条 start（2684/2685/2686）；v2 三条（2632/2633/2634） | ✅ PASS |
| W3 | 旗关臂 | 无 `warnpeers src=EntityCow` 汇总行 ∧ 无 peer revenge ∧ 无 `panicflee src=cow start` | summary=0、peerRevenge=0、panicStart=0（r2） | ✅ PASS |
| W4 | B-48 回归 | 骷髅 0.3；狼 8/8/3/16/0.4 与 12/12/3/32/0.4；addGrowth 差 5 | 四项全中（r1） | ✅ PASS |
| W5 | canPickUpLoot 死亡/血量门 | 纯日志不可观察 | 按 `MixinEntityLivingDisarm.java:55-62` 登记 C | ⚪ C 级 |

`[done]` 原文：
- v1 `{"run":"v1","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`
- v2 `{"run":"v2","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`
- W3 `{"run":"w3","pass":true,"bad":0}`（r2；r1 为口径红，见 C-B49-1）
- W4 `{"run":"w4","pass":true,"bad":0}`

## §2 判行锚（tee 全量流行号）

### 轮一 `testharness/build-logs/b49-v1.out`（891,851 B）
- `2361` `Done (5.453s)! For help, type "help" or "?"`
- `5676` `[AILog] warnpeers src=EntityCow peers=2 attacker=191 [server]`
- `5677` `[AILog] warnpeers probe id=2684 revenge=191 flee=false dist=0.00 hurt=true`（被击牛）
- `5678` `[AILog] warnpeers probe id=2685 revenge=191 flee=false dist=1.00 hurt=true`（peer 1）
- `5679` `[AILog] warnpeers probe id=2686 revenge=191 flee=false dist=2.00 hurt=true`（peer 2）
- `5681` `[AILog] panicflee src=cow start speed=1.6 panic=false path=false entity=EntityCow#2684`
- `5682` `… entity=EntityCow#2685`
- `5683` `[AILog] panicflee src=cow start speed=1.8000001 panic=true path=false entity=EntityCow#2686`
- `5714` `BUILD SUCCESSFUL in 28s`

### 轮二 `testharness/build-logs/b49-v2.out`（879,319 B）
- `2362` `Done (5.637s)!`
- `5593` `warnpeers src=EntityCow peers=2 attacker=191`
- `5594/5595/5596` probe id 2632/2633/2634 全 `revenge=191`
- `5598/5599/5600` 三条 `panicflee src=cow start`（#2632/#2633/#2634）
- `5633` `BUILD SUCCESSFUL in 28s`

### W3 旗关 `testharness/build-logs/b49w3.out`（130,986 B，r2）
- `993` `### [harness] > etest warnpeers -50 120 240`
- `997` `[AILog] warnpeers probe id=353 revenge=352 flee=false dist=0.00 hurt=true`（被击牛；352 = 玩家实体 id）
- `998` `[AILog] warnpeers probe id=354 **revenge=0** flee=false dist=1.00 hurt=true`（peer 1 无复仇）
- `999` `[AILog] warnpeers probe id=355 **revenge=0** flee=false dist=2.00 hurt=true`（peer 2 无复仇）
- **全档 `warnpeers src=EntityCow` 汇总行 0 条**；**`panicflee src=cow start` 0 条**
- 日志通道存活旁证：窗口内 `[AILog]` 5 条（`outofwater src=cow probe-in …`），canary 牛再产 1 条
- `1037` `BUILD SUCCESSFUL in 1m 21s`

### W4 B-48 回归 `testharness/build-logs/b49w4.out`（784,087 B）
- `2361` `Done (5.520s)!`
- `5005` `[AILog] mob stats movementSpeed=0.3 entity=EntitySkeleton#2633`
- `5009` `[AILog] wolf probe tamed=false hp=8.0 max=8.0 attack=3.0 follow=16.0 speed=0.4`
- `5013` `[AILog] wolf probe tamed=true hp=12.0 max=12.0 attack=3.0 follow=32.0 speed=0.4`
- `5027` `[FarmLog] addGrowth kind=EntityPig id=2636 n=1 before=-23984 after=-23979`（差 5）
- `5052` `BUILD SUCCESSFUL in 28s`

## §3 A-B-C 分级

**A 级（产品行为与 R196/预期不符）**：无。
**B 级（判据不足或工装歧义）**：无。

**C 级（观察与口径）**

- **C-B49-1 W3 探针行不受总门控（判据口径）**：`src/main/java/io/github/etim/etim/commands/CommandDevTest.java:1574` 的 probe 行是命令自身打印，每头牛一行、无旗判断；产品面在 `src/main/java/io/github/etim/etim/mob/ETIMAnimalWarn.java:34`（`if (!ETIMConfig.livestockNeedsR196) return;`）早返回。故「零行」必须限定为**汇总行**（`warnpeers src=EntityCow`）＋**peer revenge**＋**panic start**，否则首轮必红（已发生，留档 `build-logs/b49-w3-r1.out`）。
- **C-B49-2 W3 首轮工装红（脚本语法）**：补丁时同作用域重复声明 `const pass` → `SyntaxError: Identifier 'pass' has already been declared`，在 `node --check` 阶段即失败，未起服；修正后 r2 通过。
- **C-B49-3 W5 无日志通道**：`src/main/java/io/github/etim/etim/mixins/MixinEntityLivingDisarm.java:55-62` `etim$disarmPickupGate` 在 `canPickUpLoot()` HEAD 直接返回 false（`isDead || getHealth() <= 0F || disarmTicks > 0`），全程不打日志；本窗不做侵入式工装，按 C 级登记，不判绿。
- **C-B49-4 世界残留**：`run/` 下 `w-b49*` 共 7 个（`w-b49s-r1/r2/r3` 开发遗留、`v1/v2` 主窗、`w3/w4` 补臂），全部保留未删。
- **C-B49-5 日志轮转**：`run/logs/latest.log` 停服后不完整，锚行全部取自 `testharness/build-logs/<tag>.out`。
- **C-B49-6 W1 的 peers=2 口径**：三头牛中 `dist=0.00` 者为被击牛（自身也被 panic 覆盖），`peers=2` 指 `dist=1.00/2.00` 两头邻居；W2 判 panic 时按 `#id` 匹配，三头都算。
- **C-B49-7 悬空牛坠落噪声**：探针把牛放在 y=120 空中，落地过程产生 `[DamageLog] … src=fall` 行（W3 canary 牛亦然），不影响判据。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 客户端 | 未启动（全服务端日志判定） |
| 停服 | v1/v2/W3-r2/W4 全 `{"exitCode":0,"exited":true}` |
| BUILD | 各 boot `in 28s` / `1m 21s` / `28s` |
| jar | 1,213,675 B `EEF3C728…`，mtime `2026-11-20T15:53:04Z` 未变（0 rebuild） |
| MK | 101/242/484 + 101/10，`ok=true` |
| crash-reports | 24 → 24 |
| port 25565 | 0 |
| cfg | 起收同 `71EA288B…`；`livestockNeedsR196=true`、`mobDebugLog=false` 已还原 |
| props | 起收同 `E3DE434…`；`level-name=w-b30v`、`allow-flight=false` |
| HEAD | `de263e4`，窗内 0 提交 |
| 世界 | `w-b49s-r1/r2/r3/v1/v2/w3/w4` 全保留（25/24/29/29/26/25/26 文件） |
| 产品码 | 0 改动 |

## §5 文尾

- 正本：`git-workspace/etim/testharness/reports/b49-verify-verdict.md` 9761 B / 129 行
- 证据：`testharness/build-logs/b49-v1.out` 891,851 B、`b49-v2.out` 879,319 B、`b49w3.out` 130,986 B、`b49w4.out` 784,087 B
- 驱动/探针输出：`build-logs/b49-v1.out`、`b49-v2.out`、`b49-w3-r2.out`、`b49-w4.out`；首轮留档 `b49-w3-r1.out`、`b49w3-r1.out`
- 三 SHA：jar `EEF3C728C6453C01C737C56CAA34A262723B6A38797444EE546D1BE82A17A92F`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`

## §6 结论与两个专问

**建议按 PASS 收批**：W0–W4 全部成立（两轮主驱动 `bad=0`、EXIT=0；W3/W4 补臂各一次 PASS），A/B 级 0 条，C 级 7 条均属工装口径与不可观察项。

**专问一：W3 旗关「零行」是否足以证明 warnPeers 被总门关掉？——足以，但须按实质行判。**
- 证据链：旗关 boot 中 `warnpeers src=EntityCow peers=2` **汇总行 0 条**（该行由 `ETIMAnimalWarn.warnPeers` 在 `:34` 之后才打印）；两头 peer 的 `revenge=0`（旗开时是 191）；`panicflee src=cow start` **0 条**（旗开时三条）。
- 通道存活旁证：同窗 `[AILog]` 仍有 5 条（`outofwater src=cow probe-in`），canary 牛再加 1 条 ⇒ 不是日志通道静默造成的假阴性。
- 唯一噪声：命令自身的 `warnpeers probe …` 三行不受旗控（C-B49-1），用行分类即可排除。
- 强度评级：**强**（三条独立负证据 + 通道存活）；弱点是无同 boot 反事实窗（config 仅起服读），正对照取 v1/v2 旗开轮。

**专问二：W5 是否接受 C 级？——接受。**
`canPickUpLoot` 门只影响 `EntityLiving` 的拾取判定，产品码在该路径上不打任何日志（`MixinEntityLivingDisarm.java:55-62` 全静默），观测它必须靠「怪物是否真捡起物品」这类多变量场景，与本批「基础行为小件」判据面不成比例；登记代码行锚即可，待后续有拾取类判窗时顺带覆盖。
