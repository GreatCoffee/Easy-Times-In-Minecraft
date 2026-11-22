# B-66 判决书 · F-3 方块硬度 / 材质 / 破坏信息（12 面）

> 批次：B-66（F 卷第三段）
> 正本路径：`git-workspace/etim/testharness/reports/b66-verify-verdict.md`
> 判决：**PASS**（A=0 / B=0 / C=8）
> 判据源：`build-logs/b66-smoke-r5.out`、服务端快照 `testharness/build-logs/b66-r5-b1.out`

## §0 钉值

| 项 | 值 |
| --- | --- |
| build | `b66-build5` |
| release | 1,510,153 B `807BE896D33634FF2E7BBBC4C3544F56D63BA0AD5C66DC8E152317C0A56C3530` |
| dev | 1,482,818 B `E65400742F9F2746913A1F6BDEF07D8665FE8E6041253D918711E5CA7916D21F` |
| sources | 1,325,291 B `05991ED375DEE82E6E64710666348A3811EBDE3298BA949A176F7CDE38ACD045` |
| MK | classes 109 / entries 271 / dual 542 / mixins 111 / client 10 |
| PIN | `testharness/player/f7-wb-lib.js:35` = `b66-build5`，`:36` MK_PIN 同步 |

## §1 试跑轨迹

| 轮 | 结果 | 说明 |
| --- | --- | --- |
| r1 | W1/W3/W4 红 | W1 判据假设 blockstack 行含 torch（实际命令格式无）；W3/W4 正则与命令日志字段不匹配；堆叠本身仍是 16（B-64 的默认 16 让 `==64` 门永不命中） |
| r2 | W1 红 | 堆叠门改 `> 1` 后 stone/dirt/wool 均为 4，但 `cauldron=16` |
| r3 | W1 红 | 块遍历补 `ItemBlockSpecial` 仍 16 |
| r4 | W1 红 | `ForgeRegistries.ITEMS` 兜底扫 `ItemBlockSpecial` 后日志 `stack4 applied blocks=214`，命令仍读 16 |
| r5 | **全绿** | 探针改读 `Items.CAULDRON`（`Item.getItemFromBlock` 对特殊物品在 1.12 返回 `Items.AIR`），cauldron=4 |

## §2 逐臂锚点（`b66-r5-b1.out`）

| 臂 | 实测 | 锚点 |
| --- | --- | --- |
| W1 | `blockstack stone=4 dirt=4 anvil=1 cauldron=4 wool=4 four=205 one=17` | `:7495`；启动行 `:578` `stack4 applied blocks=214 anvil=1` |
| W2 | sand 0.400 / wool 0.800 / snow_layer 0.200 / stone 0.000 | `:7549` `:7575` `:7587` `:7606` |
| W3 | stone raw 15.000 cushion 0.000 damage 15.000；sand raw 15.000 cushion 0.400 damage 6.600 | `:7623` `:7647` |
| W4 | `dropbox at=2,130,0 before=0 after=1 drop=2.482,130.394,0.483`（落点在火把选中盒×0.5 内） | `:7686` |
| W5 | ice: douse=true dissolve=false acid=true；snow_layer: douse=true dissolve=true；stone: acid=false | `:7723` `:7734` `:7750` |
| W6 | cfgOk / wireOk / hookOk / helpOk 全 true | `[W6]` JSON |

## §3 判定要点

1. R196 `Block.java:1000` 默认 `max_stack_size = 4`，`BlockAnvil.java:19` 唯一 1 例外；本批全 901 方块物品中 214 个被钉 4、205 个最终为 4、17 个为 1（砧/Door/Bed 族）。
2. 1.12 的 `ItemBlockSpecial`（炼药锅等 9 个物品）不进入 `Block.BLOCK_TO_ITEM`，块遍历拿不到；必须另扫 `ForgeRegistries.ITEMS`。
3. `Item.getItemFromBlock` 对无映射方块返回 `Items.AIR`，探针读 AIR 会显示 16（B-64 默认）——调试时必须直接读 `Items.CAULDRON` 这类具体物品。
4. R196 摔落公式：`<0.5` 直接返回；`raw=(d−2.5−jumpAmp)×2`；cushioning 先 `−c×10` 再 `×(1−c)`，雪/雪块额外叠下方块或 +1.0，上方块再加一次，最终夹 1.0；实测 10 格裸摔 15、沙地 6.6。
5. `Block.spawnAsEntity` 1.12 固定 `rand*0.5+0.25` 抖动；非满块改为选中盒 scale 0.5 后取点，火把实测落点 2.482/0.483（盒 2.4375–2.5625）。
6. 材质八轴按 R196 名称表 + 1.12 方块/物品映射落地；ice acid=true（R196 岩矿类），snow_layer acid=false、dissolve=true、replace=true。

## §4 C 级挂账

| 编号 | 内容 |
| --- | --- |
| C-B66-1 | `setBlockUnbreakable`（`:83`）按 parity 记账：1.12 `hardness=-1` 即不可破，未额外写 minHarvestLevel 100 |
| C-B66-2 | `canSupportEntityShadow`（`:88`）零端口：1.12 无动态实体阴影渲染 |
| C-B66-3 | 破坏进度阶段（`:89`）parity：1.12 客户端同式 `(int)(d*10)-1` |
| C-B66-4 | 降水/流体阻挡预计算（`:90`）parity：1.12 `isFullCube`/`isPassable` |
| C-B66-5 | 方块自校验（`:91`）零端口：开发期断言，无玩家可感面 |
| C-B66-6 | `BlockBreakInfo` 载体（`:96`）零端口，掉落域并入 `:99` |
| C-B66-7 | 破坏原因 20 枚举（`:97`）零端口：内部分类，1.12 无对应对象 |
| C-B66-8 | `setHardnessRelativeToWood`（`:82`）仅 ETIM 砧块落地（`metal/ETIMBlockAnvil.java:47`），门/储物箱待后续批次 |

## §5 收口

- 落码：`world/ETIMCushioning.java`、`world/ETIMFall.java`、`item/ETIMBlockStacks.java`、`item/ETIMMaterialTraits.java`、`item/ETIMItemMaterialEvents.java`；mixin `MixinEntityLivingBase.etim$r196Fall`、`MixinBlock.etim$r196DropSpread`、`MixinEntityItem` 追加材质 tick；`ETIMConfig.blockR196Face`；`ETIM.java` 接线；`/etest blockstack|cushion|fall|dropbox|mattrait`。
- census：12 面（`:82` 部分已落地，`:85`/`:87`/`:92`/`:99` 已落地，`:83`/`:88`/`:89`/`:90`/`:91`/`:96`/`:97` parity/zero-port 销账）。
- 判定：**PASS**（A=0 / B=0 / C=8）。
