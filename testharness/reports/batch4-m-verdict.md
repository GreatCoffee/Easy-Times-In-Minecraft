# M 批 · F-15-F1 重建验证 · 判决报告（会话七 · 2026-10-21）

**基线**：`53d3fef`（F-15-F1 rebuild）。jar = `build/libs/etim-1.0.0.jar` **326,788 B @ 2026-10-21 18:49:58**，测试服锁 jar，全程未 rebuild；`src/main` 0 改动。
**服务端**：`run/obfuscated-server`（25565；RCON 25575；世界 `testw2h`；seed `-1293060200`）。
**cfg**：`zombieDigAI=true`；`moonStateOverride` 开测前空 → 狂化轮置 `blood`（验后已还原空）；`mobDebugLog=true`。
**判据源**：服务端 `[SleepLog] bed-dig` / `dig-gate`（`run/obfuscated-server/logs/latest.log`，逐 boot 落盘 `build-logs/m-*.latest.log`）；轮次窗口由 bot `/time query gametime` 的 `tick` 夹取（bot 日志 `build-logs/m-*.log`）。
**摆场**：1 宽 × 2 高封闭石廊（x=-43..-37，y=100..101，z=z_i；墙 z±1、顶 y=102、底 y=99）。目标块 x=-40；bot x=-38.5；僵尸 x=-40.8（距块心 1.3 < 3.25 reach）。半砖向量：目标砖 y=101（头层），下方 y=100 置 stone 阻挡块（阻断寻路；眼→bot 眼射线在砖顶上方 ≈0.18 通过 → 非狂化 canSee 成立；中心射线命中砖体）。整砖向量：目标块 y=100（脚层），腿射线命中。攻击任务因 noPath + 超出近战 reach 不启动 → dig 任务可运行。
**摆场校准（非判决）**：首版把半砖放脚层 y=100，腿射线擦过 0.5 砖顶、且寻路可达 → 攻击任务锁死 dig 任务（`orGate`/零 bed-dig）；改为砖在头层 + 脚下 stone 阻挡后，V6 非狂化先导轮与 OBS 先导均出 bed-dig/破块，矩阵开跑。

> **行式注记**：实际 `bed-dig` 的 progress 为 **0..10（11 行）**，break strike = **10**；任务书的「1..10」系差一（State 初值 -1，首 strike 归 0；AI-02 G-1 同式 0→10）。判据「出现 bed-dig 行且走到 break」按 progress=10 判。

---

## 0. level.dat patch 记录（停服态，`_settime.js`）

| 轮 | 目的 | before Time / DayTime | after Time / DayTime | backup |
|---|---|---|---|---|
| 狂化/校准 boot | night（total%24000=13000） | 1510854 / 8369 | 1501000 / 1501000 | `level.dat.bak_20261021110854` |
| 非狂化 boot | day（total%24000=0；override 空） | 1514465 / 1501190 | 1488000 / 1488000 | `level.dat.bak_20261021112103` |
| 狂化 N1 | night（重补） | 1502662 / 1488000 | 1501000 / 1501000 | `level.dat.bak_20261021113329` |
| 狂化 LOG | night（重补） | 1510932 / 1501000 | 1501000 / 1501000 | `level.dat.bak_20261021114157` |

**终态**：`Time=1503961`、`DayTime=1501000`；25565 已释放；`moonStateOverride=`（空）；jar 326,788 B @ 18:49:58 复验未变；`src/main` 0 改动。

---

## 1. 逐向量核讫表（9 行 × 狂化/非狂化 + E-06 + 观察行）

| # | 目标块（坐标） | 期望 非狂化/狂化 | 实测 非狂化/狂化 | 判 |
|---|---|---|---|---|
| 1 | 石半砖 STONE `-40,101,242` | ✗ / ✗ | ✗（0 行，块在）/ ✗（0 行，块在） | **PASS** |
| 2 | 砂岩半砖 SAND `-40,101,245` | ✗ / ✓ | ✗（0 行，块在）/ ✓（0..10，块 Air） | **PASS** |
| 3 | 石半砖 WOOD `-40,101,248` | ✗ / ✗ | ✗（0 行，块在）/ ✗（0 行，块在） | **PASS** |
| 4 | 石双砖 STONE `-40,100,251` | ✗ / ✗ | ✗（0 行，块在）/ ✗（0 行，块在） | **PASS** |
| 5 | 砂岩双砖 SAND `-40,100,254` | ✗ / ✓ | ✗（0 行，块在；probe legRay=true）/ ✓（0..10，块 Air） | **PASS** |
| 6 | 木半砖 `-40,101,257` | ✓ / ✓ | ✓（0..10，块 Air）/ ✓（0..10，块 Air） | **PASS** |
| 7 | 双木砖 `-40,100,260` | ✓ / ✓ | ✓（0..10，块 Air）/ ✓（0..10，块 Air） | **PASS** |
| 8 | 黑曜石本体 `-40,100,263` | ✗ / ✗ | ✗（0 行，块在）/ ✗（0 行，块在） | **PASS** |
| 9 | 石头本体 `-40,100,266` | ✗ / ✗ | ✗（0 行，块在）/ ✗（0 行，块在） | **PASS** |
| E-06a | 雪块 `minecraft:snow -40,100,269` | ✗ / ✓ | ✗（0 行，块在）/ ✓（0..10，块 Air） | **PASS** |
| E-06b | 原木 `minecraft:log -40,100,272` | ✗ / ✓ | ✗（0 行，块在）/ ✓（0..10，块 Air） | **PASS** |
| 观察 | 砂岩半砖 + 铁斧 `-40,101,275` | 非狂化放行（观察） | ✓ 非狂化 0..10，块 Air（J-11 生效） | **观察行（登记）** |

---

## 2. 判据行原文（逐向量）

### 2.1 非狂化轮（override 空；world total 为 day/OTHER；`build-logs/m-day-non.latest.log`）

| 向量 | bed-dig / testforblock 原文 |
|---|---|
| 1 | **0 行**（窗口 tick 1488389..1488646）；`Successfully found the block at -40, 101, 242` |
| 2 | **0 行**（1488747..1489004）；`Successfully found the block at -40, 101, 245` |
| 3 | **0 行**（1489105..1489363）；`Successfully found the block at -40, 101, 248` |
| 4 | **0 行**（1489457..1489714）；`Successfully found the block at -40, 100, 251` |
| 5 | **0 行**（1489808..1490066）；`Successfully found the block at -40, 100, 254`；`[SleepLog] dig-gate ... gate=probe headRay=false centerRay=false legRay=true tick=1489852`（腿射线命中块、被拒门挡下） |
| 6 | `[SleepLog] bed-dig mob=EntityZombie x,y,z=-40,101,257 progress=0 tick=1490273` … `progress=10 tick=1491473`；`The block at -40, 101, 257 is Air (expected: Wood Slab)` |
| 7 | `... -40,100,260 progress=0 tick=1498187` … `progress=10 tick=1500587`（本表补跑窗；首跑 132s 只到 9，二次 150s 到 10）；`The block at -40, 100, 260 is Air (expected: Wood Slab)` |
| 8 | **0 行**（1494469..1494726）；`Successfully found the block at -40, 100, 263` |
| 9 | **0 行**（1494821..1495079）；`Successfully found the block at -40, 100, 266` |
| E-06a | **0 行**（1495174..1495431）；`Successfully found the block at -40, 100, 269` |
| E-06b | **0 行**（1495525..1495783）；`Successfully found the block at -40, 100, 272` |
| 观察 | `... -40,101,275 progress=0 tick=1501312` … `progress=10 tick=1502312`；`The block at -40, 101, 275 is Air (expected: Stone Slab)`（僵尸持铁斧、非狂化） |

### 2.2 狂化轮（override=blood + night；`build-logs/m-night2.latest.log` + `m-night3-log.latest.log`）

| 向量 | bed-dig / testforblock 原文 |
|---|---|
| 1 | **0 行**（1501306..1501724 窗）；`Successfully found the block at -40, 101, 242` |
| 2 | `... -40,101,245 progress=0 tick=1501971` … `progress=10 tick=1502721`；`The block at -40, 101, 245 is Air (expected: Stone Slab)` |
| 3 | **0 行**（1503042..1503460 窗）；`Successfully found the block at -40, 101, 248` |
| 4 | **0 行**（1503555..1503972 窗）；`Successfully found the block at -40, 100, 251` |
| 5 | `... -40,100,254 progress=0 tick=1504219` … `progress=10 tick=1505719`；`The block at -40, 100, 254 is Air (expected: Stone Slab)` |
| 6 | `... -40,101,257 progress=0 tick=1507245` … `progress=10 tick=1507845`；`The block at -40, 101, 257 is Air (expected: Wood Slab)` |
| 7 | `... -40,100,260 progress=0 tick=1508229` … `progress=10 tick=1509429`；`The block at -40, 100, 260 is Air (expected: Wood Slab)` |
| 8 | **0 行**（1509841..1510258 窗）；`Successfully found the block at -40, 100, 263` |
| 9 | **0 行**（1510353..1510770 窗）；`Successfully found the block at -40, 100, 266` |
| E-06a | `... -40,100,269 progress=0 tick=1506167` … `progress=10 tick=1506237`；`The block at -40, 100, 269 is Air (expected: Snow)` |
| E-06b | `... -40,100,272 progress=0 tick=1501445` … `progress=10 tick=1503245`；`The block at -40, 100, 272 is Air (expected: Wood)` |

> 注：狂化轮 V1/V3/V4/V8/V9 的零行窗内 `dig-gate` 仍有 target/probe 行（僵尸在挖面上、由拒绝门挡下），零 bed-dig 不是「僵尸不在场」；非狂化轮 V1–V4/V8/V9/E-06 的零行同理，V5 有 `probe headRay=false centerRay=false legRay=true tick=1489852` 直证腿射线命中后由拒绝门挡下。

---

## 3. E-09 冷却采样（`bed-dig` 行间 tick 差）

### 3.1 直测：砂岩半砖 · 狂化徒手（唯一直测路径）

行 tick 原值（`-40,101,245`，progress 0..10）：

```
1501971, 1502046, 1502121, 1502196, 1502271, 1502346,
1502421, 1502496, 1502571, 1502646, 1502721
```

相邻差（10 个）：**75, 75, 75, 75, 75, 75, 75, 75, 75, 75**（±0，容差 ±2）→ **75 tick** ✓（= `300 × 0.5 ÷ 2`）。

### 3.2 石半砖 180（面值不直测）

V1 狂化被拒绝面阻断（零 bed-dig），180 不直测；按同一公式 `300 × 1.2 ÷ 2 = 180`，与砂岩行（`300 × 0.5 ÷ 2 = 75`）同源，登记为公式一致性覆盖。

### 3.3 副产采样（可选；同公式对照）

| 块 | 状态 | tick 差 | 公式 |
|---|---|---|---|
| 木半砖 | 狂化 | **60**（1507245..1507845） | 300×0.4÷2 |
| 木半砖 | 非狂化 | **120**（1490273..1491473） | 300×0.4 |
| 双木砖 | 狂化 | **120**（1508229..1509429） | 300×0.8÷2 |
| 双木砖 | 非狂化 | **240**（1498187..1500587） | 300×0.8 |
| 原木 | 狂化 | **180**（1501445..1503245） | 300×1.2÷2 |
| 雪块 | 狂化 | **7**（1506167..1506237） | 300×0.05÷2（整型截断） |
| 砂岩半砖+铁斧 | 非狂化 | **100**（1501312..1502312） | 300×0.5÷(1+1.0×0.5)（J-11 有效工具除数） |

---

## 4. E-06 定义面（requires_tool || 等级>0 两半分测）

| 块 | 挂旗/等级 | 非狂化 | 狂化 | 判 |
|---|---|---|---|---|
| 雪块（CRAFTED_SNOW） | requires_tool=true / 等级 0 | ✗（0 行，块在） | ✓（0..10，块 Air） | **PASS** |
| 原木（表行） | 免工具旗 / 等级 1 | ✗（0 行，块在） | ✓（0..10，块 Air） | **PASS** |

- 雪块非狂化：`requiresToolFace=true`，`!frenzied` 项成立、无有效工具、非 always-chewable → 拒绝；狂化：等级 0 < 2 → `(!frenzied || level>=2)` 为 false → 放行。
- 原木非狂化：表行等级 1 >0 → requiresTool 成立，`!frenzied` 项成立 → 拒绝；狂化：等级 1 < 2 → 放行。

---

## 5. 观察行（不判 PASS/FAIL）

**僵尸持铁斧 × 砂岩半砖 × 非狂化**：`bed-dig -40,101,275 progress=0..10`，块 Air；行间 **100 tick**。→ R196 :210「有效工具满足门」的 J-11 斧特判在非狂化面同样放行（即 v1 极性反转面：有效工具不再是拒绝项）。登记为观察项，不作为 F-15-F1 判值。

---

## 6. 结论与终端态

**9 向量 × 两态全部与账本 §二 期望一致；E-06 两半分测一致；观察行按 J-11 放行。** 未发现 FAIL。

**终端**：25565 无监听；`moonStateOverride=`（空，已还原）；`zombieDigAI=true`；jar **326,788 B @ 2026-10-21 18:49:58**（指纹复验未变）；`src/main` 0 改动；level.dat 终值 `Time=1503961 / DayTime=1501000`；无 crash/hs_err（服务端 ERROR 仅 FML 启动噪声）。

**证据文件**：
- `build-logs/m-day-non.latest.log`（非狂化全轮 + V7/OBS 补跑）
- `build-logs/m-night2.latest.log`（狂化 N1+N2：V1–V9、SNOW）
- `build-logs/m-night3-log.latest.log`（狂化 LOG）
- `build-logs/m-day-non.log` / `m-day-non2.log` / `m-night1.log` / `m-night2.log` / `m-night3-log.log`（bot 轮次窗口 + testforblock 回执）
- `build-logs/m-probe-server.latest.log`（摆场校准首版，非判决）
