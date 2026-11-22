# B-65 判决回执 · F-2 食物 / 容器 / 货币 / 药水（census F `:149`–`:165`，17 面）

- 批次：**B-65**
- 判定：**PASS**（A=0 / B=0 / C=9）
- 正本判据：`[FoodR196Log]` 服务端行 + 源码静态断言
- 终判窗：`build-logs/b65-smoke-r1.out` → `{"run":"r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

## §0 钉值（b65-build1）

| 产物 | 字节 | SHA-256 |
| --- | --- | --- |
| `build/libs/etim-1.0.0.jar` | 1,491,993 | `2A6CDE4A6FBF08BEBBCF44F04A775D165690B57E6533762D621800BB57E72AB5` |
| `etim-1.0.0-dev.jar` | 1,464,992 | `F3BE2834ED79DF80A456BB80AA5472FAE841BA980F0B2006B51C88F185FACFC0` |
| `etim-1.0.0-sources.jar` | 1,313,435 | `A3E4387BA9B5A3A15B8360A3AA211AF3A0A00A3CD547F5E8CC7C5FDD3AB9E9CD` |

- MK：classes 109 / entries 270 / dual 540 / mixins 111 / client 10（`mkCounts().ok = true`）。
- `testharness/player/f7-wb-lib.js:35-36`：PIN = `b65-build1`，MK_PIN 同步。

## §1 试跑轨迹

- **r1**（首跑，`build-logs/b65-smoke-r1.out`）六臂全绿，一次通过。
- 服务端快照：`testharness/build-logs/b65-r1-b1.out`（世界 `w-b65-r1-v1`）。

## §2 逐臂锚点

| 臂 | 内容 | 判据行（`b65-r1-b1.out`） |
| --- | --- | --- |
| W1 | 15 种碗内容物 + R196 饱食/营养值 | `:7483` mushroom_stew 2/4、`:7495` milk 0/1、`:7503` water 0/0、`:7537` beef_stew 16/16、`:7548` chicken 10/10、`:7567` vegetable 6/6、`:7579` ice_cream 5/4、`:7590` salad 1/1、`:7600` cream_mushroom 3/5、`:7611` cream_veg 7/7、`:7623` pumpkin 1/2、`:7630` mashed 12/8、`:7642` sorbet 4/2、`:7650` porridge 4/2、`:7682` cereal 4/2 |
| W2 | 货币 `onCreated` 扣经验 | `:7690` copper×3 xpValue=5 → 0→−15；`:7715` gold×1 xpValue=100 → −15→−115 |
| W3 | 附魔苹果治僵尸村民 | `:7736` `applegold cure meta=1 ticks=1`；`:7737` cured/converting=true |
| W4 | 火焰摧毁生食换熟食 | `:7771` `firecook raw=minecraft:beef cooked=minecraft:cooked_beef count=3`；`:7772` alive=true |
| W5 | 水碗浇火元素 | `:7844` `douse kind=fire_elemental damage=5.000 volume=1`；`:7845` fire_hp=15.0 |
| W6 | cfg / 注册 / mixin / 资源静态 | 脚本内断言全 true（cfg 字段 + init、`ETIMFoodItems.register()`、两个事件类、`mixins.etim.json` 两条、21 张贴图、lang 双键） |

## §3 判定要点

1. 碗族 15 内容物全部落地（`item/ETIMBowlContents.java` + `ETIMFoodItems.bowl()`），空碗复用原版 `minecraft:bowl`（D-1）。
2. 容器逻辑统一在 `item/ETIMItemVessel.java`：饮用/挤奶/喂水/灭火一入口，实体臂由 `ETIMVesselEvents` 经 `PlayerInteractEvent.EntityInteract` 转发（D-2/D-3）。
3. 灭火剂量按体积换算：碗 5 / 桶 20；下界炎灵 2 / 8；岩浆态土元素直接 `convertToNormal(true)`。
4. 火焰熟食走 `MixinEntityItem.attackEntityFrom` HEAD：`FurnaceRecipes` 反查命中即换栈并取消原版销毁（D-4）。
5. 附魔苹果效果走 `MixinItemAppleGold.onFoodEaten` TAIL（regen/resistance/fire_res 各 1200 t）；僵尸村民转化走 `MixinEntityZombieVillager` 的 `@Invoker startConverting`，meta 1 → 1 tick、meta 0 → `rand(2401)+3600`（D-5）。
6. 水碗/水瓶熄火与耕地浇灌共用既有 `MixinItemPotionUse` 通道；原版碗取水由 `MixinItem.etim$bowlFill` 承接。
7. 堆肥值/残留接入 `ETIMCompost`：`ETIMItemBowl.etimCompostingValue()`（奶碗 0）+ 残留空碗（D-6）。
8. 货币六金属全做，`onCreated` 扣 `xpValue × count`，tooltip `item.etim.tooltip.xp_each`。

## §4 C 级挂账

- **C-B65-1**：R196 碗族其实 15 种内容物（摸底初稿写 13，漏计 2 项）；本轮按实测 15 落地，`banana_split` / `chocolate_ice_cream` 两张 MITE 贴图存在但无 R196 注册行，不落。
- **C-B65-2**：空碗复用原版 `minecraft:bowl`（1.12 无独立空碗身份）。
- **C-B65-3**：实体臂走 `PlayerInteractEvent.EntityInteract`（1.12 无「物品对实体右键」虚方法）。
- **C-B65-4**：灭火剂量按体积换算（碗 5、桶 20），R196 原文是 20/5 两档常量。
- **C-B65-5**：1.12 附魔金苹果只有 meta 1；R196 的 ENCHANTED 三条 1200 t 已落，原版吸收等行保留。
- **C-B65-6**：扣经验后 `experienceTotal` 可为负（1.12 无 R196 `getExperienceRequired(-40)` 地板）。
- **C-B65-7**：火焰熟食按 1.12 `FurnaceRecipes` 反查（R196 用 `cooked_item` 字段）。
- **C-B65-8**：创造模式不消耗容器（R196 `convertOneOfHeldItem` 同样跳过创造），故 W5 判据行 `held` 仍显示满碗。
- **C-B65-9**：蘑菇煲碗贴图取原版 `mushroom_stew.png`（MITE `bowls/` 目录无该图）。

## §5 收口

- 落码：`item/ETIMBowlContents.java`、`item/ETIMItemVessel.java`、`item/ETIMItemBowl.java`、`item/ETIMItemCoin.java`、`item/ETIMFoodItems.java`、`item/ETIMVesselEvents.java`、`item/ETIMAppleGoldEvents.java`、`mob/ETIMZombieVillagerInvoker.java`、`mixins/MixinItemAppleGold.java`、`mixins/MixinEntityZombieVillager.java`；改动 `ETIMConfig` / `ETIM` / `MixinItem` / `MixinEntityItem` / `MixinItemPotionUse` / `ETIMCompost` / `mixins.etim.json` / `CommandDevTest` / lang / 21 张贴图 + 21 个模型。
- 判据行集：`[FoodR196Log] bowlgive|bowlfill|coin created|coin|applegold|firecook|vesselremain|vesseldouse|douse`。
- census：F-2 17 面翻面（详见账册条 408）。
