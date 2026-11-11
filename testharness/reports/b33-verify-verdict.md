# R196 着火僵尸寻树＋点火机关（MoveToTree / Fire 面）对位验证 **W-B33 判窗**（B-33 正本，HEAD `5c294f3`）

> **HEAD**：`5c294f3cf7cd773bd12427ff4e2538aad67779e8`，窗内 **0 提交**（`git log --since` 计数 0）；**0 rebuild**，jar mtime `2026-11-11T05:00:29Z` 早于窗起 `2026-11-11T06:58Z`，窗讫仍为同值。
> **jar**：`build/libs/etim-1.0.0.jar` **1,127,247 B**，SHA256 `06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03`（起收同值，＝任务书钉值）。
> **dev/sources**：1,105,661 B `229FA9CA492F212C786132B77790C79D0BC06160A2AF43524437AF3516C7B5A0`（mtime `2026-11-11T06:29:10Z`，早于窗起）；1,031,091 B `60989ACA6B7542A9E308015A43DADE11F4023E6E20B91CACA9AF77CACDFB6CBE`（mtime `2026-11-11T05:00:29Z`）。二者窗内未动（0 build）。
> **refmap**：classes **100** / entries **223**（dual 446，双份同）；**mixins**：**98** + 10 client；`mkCounts().ok=true`。
> **窗口**：2 boot —— `Done (5.391s)`（14:59:07，b1:2350）、`Done (5.273s)`（15:02:20，b2:2350），mixinFail 0×2；2 停服 `exitCode=0 exited=true build=true`，`BUILD SUCCESSFUL in 3m 12s`（b1:8207）/ `in 1m 16s`（b2:3471）。总窗 14:58:52 → 15:04:22（**5m 30s**）。判窗世界 `w-b33v`（首 boot 自动新建），假人 `ETIM_F7`。
> **判决**：**W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS**；`bad=0`，EXIT=0；A 0、B 0、D 0、C 2。
> **判据源**：`testharness/player/f11-b33-verify.js`（`[PIN]` 首尾各一）、`testharness/build-logs/f11-b33-verify.json`（3,245 B）、`-b1.out` 1,244,308 B / `-b2.out` 519,791 B / `-stdout.out` 62,625 B / `-stderr.out` 0 B。
> **报告字节规格**：`8946 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，78 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** boot 卫生 | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 两停服 exitCode=0 ∧ build=true | b1 `Done (5.391s)!`（b1:2350，14:59:07）、b2 `Done (5.273s)!`（b2:2350，15:02:20）；`mixinFail=0`×2；`stopBoots` 2 条 `{exitCode:0,exited:true,build:true}`；`BUILD SUCCESSFUL in 3m 12s`（b1:8207）、`in 1m 16s`（b2:3471） | **PASS** |
| **W1** 树面（a1） | `start≥1 ∧ countdownSet≥1 ∧ roll(chance=0.01)≥1 ∧ probes≥1` | `start=4`、`countdownSet=4`、`roll0.01=384`、`probes=21`；行锚 b1:5072/5212/5427/5530（start）、b1:5071/5211/5426/5529（countdown set=100）、b1:5473（roll win=true） | **PASS** |
| **W2** 火面（a2） | `meltN≥1`（`igniteN` 只记不判） | `meltN=2`（b1:6791 `block=minecraft:snow`、b1:7075 `block=minecraft:snow_layer`）；`roll0.00125=1723`；`igniteN=0`（Poisson 饥饿面，按任务书只记） | **PASS** |
| **W3** 旗断（boot2） | `treeN===0 ∧ fireN===0` | b2 全档 `[AILog] tree` **0 条**、`[FireLog]` **0 条**；`b1tree=0 b1fire=0` | **PASS** |
| **W4** 钉值 | 双 `[PIN]` 同 sha＝`06680A25…F1966A03` ∧ `mk.ok===true` | `06:58:52.554Z`（stdout:1）与 `07:03:22.405Z`（stdout:1112）同 `06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03`；MK 双侧 `100/223/446`、`98+10`、`ok=true` | **PASS** |
| **props** | 归一化起收同 ∧ `level-name` 还原 | `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A` → 同值；`level-name` `w-b30v`→`w-b30v`；原始 `35EBC027…CC81A2`→同值（只记不判） | **PASS** |
| **botposMinY** | 只记不判（客户端遥测） | `71`；stdout 54 条 `[botpos] y=71.0 ground=1`（mineflayer 侧，非服务端判据） | 记录 |

## §2 判行摘录

**W1 树面（a1，entity=EntityZombie#2649，全 4 次 start）**
- `[14:59:39] [Server thread/INFO] [Easy Times In Minecraft]: [FireLog] countdown set=100 entity=EntityZombie#2649`（b1:5071）
- `[14:59:39] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] tree src=zombie start target=(-63,67,240) speed=1.0 countdown=100 entity=EntityZombie#2649`（b1:5072）
- `[14:59:45] … [FireLog] countdown set=100 …`（b1:5211）／`[14:59:45] … [AILog] tree src=zombie start target=(-63,67,240) speed=1.0 countdown=100 …`（b1:5212）
- `[14:59:55] … [FireLog] countdown set=100 …`（b1:5426）／`[14:59:55] … [AILog] tree … start target=(-63,67,240) …`（b1:5427）
- `[14:59:59] … [FireLog] countdown set=100 …`（b1:5529）／`[14:59:59] … [AILog] tree … start target=(-63,67,240) …`（b1:5530）

**W1 探测与掷骰（a1 窗口内 probes=21、roll(0.01)=384）**
- `[14:59:34] … [AILog] tree src=zombie probe-in inv=16 burning=true flag=true entity=EntityZombie#2649`（b1:4948）
- `[14:59:36] … [AILog] tree src=zombie probe-in inv=32 burning=true flag=true entity=EntityZombie#2649`（b1:5002）
- `[14:59:39] … [AILog] tree src=zombie probe-in inv=48 burning=true flag=true entity=EntityZombie#2649`（b1:5058）
- `[14:59:57] … [FireLog] roll chance=0.01 win=true burning=true countdown=60 entity=EntityZombie#2649`（b1:5473）

**W2 火面（a2，chance=0.00125，1723 掷，2 熔）**
- `[15:00:59] … [FireLog] melt x=-40 y=66 z=240 block=minecraft:snow`（b1:6791）
- `[15:01:11] … [FireLog] melt x=-40 y=66 z=240 block=minecraft:snow_layer`（b1:7075）
- 同档 `chance=0.00125 win=true` 行 b1 计 4 条（示例 `[14:59:33] … [FireLog] roll chance=0.00125 win=true burning=true countdown=0 entity=EntityZombie#2649`，b1:4932）——属 a1 窗口内的火机关掷骰，非 a2 计数。

**W3 旗断面（b2）**
- `[AILog] tree` 0 条、`[FireLog]` 0 条（b2 全档 3,471 行内）；与 b1 的 61 条 `[AILog] tree`、2,820 条 `[FireLog]` 形成对照。

**W4 钉值两行**
- `[PIN] {"at":"2026-11-11T06:58:52.554Z","releaseSha":"06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03","mk":{"refmapResources":{"classes":100,"entries":223,"dual":446},"refmapTmp":{"classes":100,"entries":223,"dual":446},"manifest":{"mixins":98,"client":10},"ok":true}}`（stdout:1）
- `[PIN] {"at":"2026-11-11T07:03:22.405Z","releaseSha":"06680A25…F1966A03","mk":{…同值…}}`（stdout:1112）

## §3 登记项

- **C-B33-1（判据面·props 归一化）**：沿用 C-B31 第 1 条口径 —— Java Properties 保存时重写首部时间戳注释行，原始 hash 必漂。本窗三 hash：
  - `propsNorm` before/after 均 `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A`（判据）
  - `propsRaw` before/after 均 `35EBC027361B0A6976214EE2877F73D420C1A878C6E5DA0C7875D95872CC81A2`（只记）
  - `level-name` `w-b30v` → `w-b30v`（还原成功）
- **C-B33-2（igniteN=0 的饥饿面）**：`igniteN` 按任务书只记不判。a2 窗口 1723 次 `chance=0.00125` 掷骰的期望中签约 2.15 次，实测 0 —— 落在 Poisson 低尾（P(0)≈11.6%），与 W2 判据（`meltN≥1`）无关；熔面已由 2 条 `melt` 行独立成立。
- **botposMinY**：`71`（stdout 54 条 `[botpos] y=71.0 ground=1`，全程未坠落）—— 客户端遥测，只记不判。
- **停服面**：2 停服均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 3m 12s`（b1）/`1m 16s`（b2），均为 `runServer` 任务收尾，非 jar 重建（jar mtime 未变）。
- **异常面**：stdout 无 `[fatal]`，stderr 0 B；驱动未改动（`node --check` 绿）；窗内未改产品码。
- **世界面**：`run/w-b33v` **保留**（24 文件 / 3,548,039 B，踩窗世界按令保留，删除待口令）；`run/` 下 w-b* 共 **42** 个目录。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash-reports **23→23**、HEAD `5c294f3` 窗内 **0 提交**；`git status` 仍为 B-33 未提交的 ` M`×4 / `??`×5（窗内未动）。

## §4 收口清单

- **jar 起收同**：1,127,247 B `06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03`，mtime `2026-11-11T05:00:29Z` 前后一致（**0 rebuild**）。
- **dev / sources 窗内未动**：1,105,661 `229FA9CA…C7B5A0`（mtime 06:29:10Z）、1,031,091 `60989ACA…DFB6CBE`（mtime 05:00:29Z），均早于窗起。
- **cfg 起收同**：49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 旗开/旗断两 boot 分别置值，期末回写原值）。
- **props**：归一化 `9903BDCD…B8D57A` 起收同 ∧ `level-name=w-b30v` 还原；原始 `35EBC027…` 只记不判。
- **MK 起收同**：refmap 100/223（dual 446，双份同）、mixins 98+10、`mkCounts().ok=true`。
- **世界面**：`run/w-b33v` 保留（24 文件 / 3,548,039 B）；既往 41 个 w-b* 目录未删。
- **互通面**：本窗无中途重跑（r1 即绿），首轮判值即正本，无行数漂移对照需求。

## 文尾

- 报告字节：`8946 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，78 行`。
- 三 SHA：jar `06680A25FBF59919C0C90B0B3DE53821688EFB2AA976E93A35158216F1966A03`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A`。
