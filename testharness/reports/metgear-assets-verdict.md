# asset 纹理批（11 金属图标 · 程序生成）· W-A1…W-A6 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（CST）｜**窗口形态**：**免 server boot**（0 boot／0 rebuild／0 客户端；理由＝item model 加载全在 client 面 ModelLoader，server 日志无 W 位，条 219 末段）
> **报告字节规格**：`11,921 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 8 / ✗ 2｜111 行`
> **判决源**：audit20 **条 218**（受理＋出身核＋D-0…D-4 全裁）／**条 219**（落码收讫＋SHA 档案）；落码 commit **`4d989a8`**（父 `8127849`）
> **判决**：**PASS** —— **faces=6｜checked=6｜pass=6｜fail=0**；11 png 逐件 16×16 RGBA 且 SHA256 与条 219 档案**逐张全中**、11 处 layer0 全指 `etim:items/<名>`、vanilla 借位残引 **0**、形同度 11/11 全等、亮度 spread 保留、生成器复跑**零字节漂移**、git 结构面 24 文件零 java。
> **判值面**：本批为**资源面纯增量**，产品码判值零动（条 219「钉值预记」：11 png＋11 json 进 resources ⇒ 下窗 rebuild 时 jar 三件体积/SHA 必变，属预期）。

## §0 判定总表（6 判点）

| 点 | 判 read（判据位） | 实测 | 判 |
| --- | --- | --- | --- |
| **W-A1** 文件面 | 11 png 在册，逐件 16×16 RGBA | 11/11 在册；`mode=RGBA`、`size=(16,16)` 逐件亲读；item png 存量 **150**（＝条 218 ② 的 139＋11） | ✓ |
| **W-A2** 词面 | 11 处 model json `layer0` 全指 `etim:items/<名>`；全 models 树残引 `"minecraft:items/shears"`／`"minecraft:items/chainmail` ＝ 0 | 11/11 layer0 恰值全中；全树扫 **216** 个 model json，残引 **0**；父级全未动（`item/handheld`×6／`item/generated`×5） | ✓ |
| **W-A3** 形同度＋亮度 | 六剪 mask 与 ICPM `copper_shears.png` 全等（opaque 77 逐件）；五链面 mask 与 etim 铜族逐件全等（31/78/132/112/86）；亮度 spread 保留（各件 176-223） | 六剪 6/6 mask 全等，opaque **77/77/77/77/77/77**；五链面 5/5 全等，opaque **31/78/132/112/86**；发光度 spread 逐件 **196/223/181/176/221/209** ＋ 五链面 **181** 全件（区间 176–223，无刷平） | ✓ |
| **W-A4** SHA 档案 | 逐张 SHA256 前 16 位与条 219 档案对账（11 值） | **11/11 全中**（全 64 位见 §1）；档案顺序与生成器 `SHEARS`／`CHAIN_GOLD` 表序一致 | ✓ |
| **W-A5** 生成器复现性 | 重跑 `gen-metgear-assets.py` 后 11 png byte-identical、11 json 复写后 `git diff` 零差异；PASS 后改动全 revert、树 clean | 仓根重跑 **exit 0**：`assets: 11 png + 11 json patched`，旧值→新值 11 行自报全为**同值**（幂等）；重跑后 `git status --porcelain` **空**、11 张 SHA256 **逐张同值** ⇒ **零差可 revert**，`git checkout --` 22 路径为空操作，收窗树 clean（复跑两次同结论） | ✓ |
| **W-A6** git 结构面 | `4d989a8` 变更统计＝24 文件（11 png＋11 json＋2 py）、零 `src/main/java` | **24** 文件：png **11**／json **11**／py **2**（`gen-`＋`check-`）／java **0**；变更面全在 `src/main/resources/assets/etim/**` 与 `testharness/**`，越界件 **0**；11 处 json 均为**单行 layer0 一行替换**（父级与键序不动） | ✓ |

## §1 逐张 SHA 档案（W-A4 逐位）

| 资产 | 字节 | SHA256（全 64 位） | 前 16 位（档案位） |
| --- | --- | --- | --- |
| `shears_copper` | 297 B | `F109FE3AFDE63AD937725819D002B9CAD28E7770FAED151CDF6771DCC9ED1535` | `F109FE3AFDE63AD9` |
| `shears_silver` | 264 B | `DCB3FD52A161CFBF324963AF3BCC809D231EF573FAA194AA96C5A1C834F9C59A` | `DCB3FD52A161CFBF` |
| `shears_gold` | 298 B | `853A868069EE155FA48D8B319CBF69A12DE972C03038EB657943FDDAEC8DF331` | `853A868069EE155F` |
| `shears_mithril` | 295 B | `4D0A7F48243280533C7D3F7FF808615939421418936B806E691BD1BC40E69B02` | `4D0A7F4824328053` |
| `shears_ancient_metal` | 296 B | `D70DBF295DA14013AB6299BDD672F8094ACFBE432D09C4DF1E7C7C9C923D3AD8` | `D70DBF295DA14013` |
| `shears_adamantium` | 298 B | `29B8F18A088AD6A31510E24EA7E7AC05C4B1FA59F053358F888C062128580440` | `29B8F18A088AD6A3` |
| `chain_gold` | 153 B | `07F9A432D0413E10AFCBE803259E5F387E241669EE64A97466BFB66BBBBC670B` | `07F9A432D0413E10` |
| `chain_helmet_gold` | 259 B | `BDDA4D0CD94442F274604CC52276B47D1ABB4E180071BA755E5B1D957C3B2F1A` | `BDDA4D0CD94442F2` |
| `chain_chestplate_gold` | 317 B | `EC585991C5FCC7B11A641068A970FCE8D7A8F64A53ED25530B1E1DF682B2549B` | `EC585991C5FCC7B1` |
| `chain_leggings_gold` | 254 B | `DAB99ED9A973740EC3C6D7D03FA0A2991446DCA762D324D70CD9076E00A730FA` | `DAB99ED9A973740E` |
| `chain_boots_gold` | 250 B | `FCAD948F24AF3AB105D17A7166DEA8160CA5146826B5811508250F3E18E72ACF` | `FCAD948F24AF3AB1` |

> 对账口径：上表前 16 位与条 219「SHA256 档案」两组（shears 六值／链面五值）**逐位吻合**，无一处错序、无一处近似。

## §2 词面（W-A2 旧值→新值全账）

| 资产 | 父级（未动） | 旧 layer0 | 新 layer0 |
| --- | --- | --- | --- |
| `shears_copper`／`silver`／`gold`／`mithril`／`ancient_metal`／`adamantium` | `minecraft:item/handheld` | `minecraft:items/shears`（六件同值） | `etim:items/shears_<名>` |
| `chain_gold` | `minecraft:item/generated` | `etim:items/chain_silver` | `etim:items/chain_gold` |
| `chain_helmet_gold` | `minecraft:item/generated` | `minecraft:items/chainmail_helmet` | `etim:items/chain_helmet_gold` |
| `chain_chestplate_gold` | `minecraft:item/generated` | `minecraft:items/chainmail_chestplate` | `etim:items/chain_chestplate_gold` |
| `chain_leggings_gold` | `minecraft:item/generated` | `minecraft:items/chainmail_leggings` | `etim:items/chain_leggings_gold` |
| `chain_boots_gold` | `minecraft:item/generated` | `minecraft:items/chainmail_boots` | `etim:items/chain_boots_gold` |

> 旧值面与条 218 出身核 ① 的 B-新① 原账**逐字吻合**（六剪同指 vanilla shears／`chain_gold` 错指 `chain_silver`／链甲四借 vanilla chainmail）。新值面 11/11 = `etim:items/<名>`；json 全档 `CR 0／U+FFFD 0`，压缩格式与生成器 `separators=(",",":")＋单尾 LF` 一致。

## §3 形同度与亮度结构（W-A3 明细）

- **A 臂（六剪）**：形基 `ICPM copper_shears.png`（303 B，`C81D3222D91C0080…`，opaque 77，spread 125）——六剪 mask 与之 **6/6 全等**，opaque 恒 77；色调带数 `colors=8` 逐件。
- **B 臂（五链面）**：形基 etim 铜族逐件（`chain_copper` 31／`chain_helmet_copper` 78／`chain_chestplate_copper` 132／`chain_leggings_copper` 112／`chain_boots_copper` 86）——mask **5/5 全等**，opaque 逐件同。
- **亮度不刷平**：逐件发光度 spread（`max−min`，仅 opaque 像素）＝ shears **196／223／181／176／221／209**，五链面 **181**（gold ramp 同源 ⇒ 同 spread）；全值落任务书区间 **176–223** 内。
- **旁证**：前批在册 `shears_rusted_iron.png`（300 B，`22535AED2BA5639A…`）mask 亦与 ICPM 铜剪同形（77）——族形同源成立（不属本批 11 张）。

## §4 生成器复现性（W-A5 实操）

| 步 | 命令 | 结果 |
| --- | --- | --- |
| 1 | `python -X utf8 testharness\textures\gen-metgear-assets.py`（cwd＝仓根） | `assets: 11 png + 11 json patched`；11 行自报 layer0 旧值＝新值（**幂等**）；exit 0 |
| 2 | 11 张 PNG SHA256 复算 | 与 §1 **逐张同值**（11/11 byte-identical） |
| 3 | `git status --porcelain` | **空**（11 json 复写后 `git diff` 零差异） |
| 4 | `git checkout -- <22 路径>` | 空操作（无改动可退）；树仍 clean，HEAD 仍 `4d989a8` |
| 5 | 二次复跑（记录用） | 同结论：零 diff、树 clean |

> 工装双读：官方核验器 `check-metgear-assets.py` 输出与本窗独立审计（不复用其逻辑，仅沿用条 219 钉值）**逐项一致**：11 件 `spec16rgba=True`、SHA 全中、`icpm_shears_mask_same=True`／`prev_chain_mask_same=True`、`residuals= []`。

## §5 冲突分级（A 0／B 0／C 4）

### A 级（产品码／资产面缺陷）
- **无。** 11 png 规格、11 处词面、11 张 SHA 与 4 段判据机制全中，无返工位。

### B 级（判据词面缺口，落下一窗任务书）
- **无。** 本窗三条词面量（11 件在册／残引 0／mask 全等）均可判且已判；无「结构性不可达」臂（对比 metgear B-1 型缺口）。

### C 级（登记不阻塞）
- **C-1（目检面外置）**：本 PASS **不含**金属色差可感性判定——按条 218 D-3 归用户目检（主会话另排），属 CT-9 硬边界；本窗零客户端、未截屏。
- **C-2（工装时效）**：`gen-/check-` 两脚本用 `Image.getdata()`，在 Pillow **12.3.0** 下报 `DeprecationWarning`（Pillow 14／2027-10-15 移除）。当前 exit 0、零影响；届时须换 `get_flattened_data()`。
- **C-3（工装可移植性）**：两脚本 `ROOT/ICPM/R196` 为 `D:\…` 硬编码绝对路径，跨机复跑须改三处常量（本机复现性已证：零漂移）。
- **C-4（存量件边界）**：`textures/items` 中与 `shears|chain_.*gold` 同正则命中的共 **12** 张，含前批在册 `shears_rusted_iron.png`；本批判面严格限 11 张，rusted 只作族形旁证（见 §3）。

## §6 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **0**（免 boot 窗；条 219 已定 server 日志无 W 位） |
| 客户端 | **零会话**（未拉起、未关窗、未抢焦点、未截屏） |
| rebuild | **0**（本窗未跑 Gradle；jar 三件仍为旧钉 `94E0AECC…`／`6FFC3CFF…`／`14C5E1B4…`，条 219 预记「作废于下窗 rebuild 前」） |
| 产品码 | **0** 行改动（`4d989a8` 零 `src/main/java`；窗内零提交） |
| 树状态 | 起 `4d989a8` clean → 复跑零 diff → 收 clean（HEAD 未动） |
| 判据档 | `testharness/build-logs/metgear-assets-evidence.json`（13,352 B）＋`-session7-audit.py`（4,644 B）／`-session7-audit.json`（10,104 B）＋`-checker.out`（1,478 B）／`-genrerun.out`（1,111 B） |

## §7 未覆盖面（不补白）

1. **目检面（金属色差可感）**：归用户（C-1），本窗不作判。
2. **客户端渲染实测**（模型加载、handheld 握持姿态、GUI 图标清晰度）：CT-9 零客户端；机制位由词面＋规格判，观感由目检接手。
3. **rebuild 后 jar 体积/SHA 重钉**：本批资产进包后的新钉值属下一窗（rebuild 窗）位，本窗不预判。
4. **穿戴面纹理**（`getArmorTexture`/armor_layer 仍走 vanilla `chainmail_layer_1/2`）：条 218 附记已明确不属本批。

## §8 自报（机械核讫）

> 文件：`testharness/reports/metgear-assets-verdict.md`｜字节五项：size 11,921 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 110（split 行数 111）
> 三口径家族（与 metgear-W62b／unbreak-W50 同型）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序以换行连接成串，再对该串 SHA-256）。
> SHA-256 甲（全档零位）`C0707B6B3FFE356A5FCA475F6808D162E016672C47616B450AF44D28A672EF32`
> SHA-256 乙（LF 归零零位）`C0707B6B3FFE356A5FCA475F6808D162E016672C47616B450AF44D28A672EF32`
> SHA-256 丙（行链零位）`E50CCEFBFCFB658EA47CCF091B796D4C183DA67E0F19F5A279D4A45FE9E42460`
> 叉号计数说明：全文 ✗ 计 2 处＝档头规格行自指 1 处＋本句引用 1 处；判格 6 点无叉。
> 判格 6 全 ✓｜11 png `RGBA/16×16` 逐件｜11 layer0 恰值｜残引 0／扫面 216｜mask 11/11 全等｜SHA 11/11 全中｜复跑零漂移｜24 文件零 java｜冲突 A0 B0 C4｜零 boot／零客户端／零 rebuild／零产品码。
