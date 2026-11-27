# 已落地面 ↔ 判据通道覆盖（生成物）

> 由 `node testharness/tools/check-coverage.js --write-doc` 生成，**不要手改**。
> 口径：已落地面读取 `ETIM位` 里的 Java 指针，载体源码出现 `[XxxLog]` 即算「有通道」。
> `silent` 面 = 回归网看不见的面；基线见 `testharness/tools/coverage-baseline.json`，新增即拦。

## 汇总

| 卷 | 已落地 | 有通道 | silent | parity | unresolved |
| --- | --- | --- | --- | --- | --- |
| A | 70 | 41 | 27 | 1 | 1 |
| B | 68 | 53 | 14 | 1 | 0 |
| C | 28 | 10 | 18 | 0 | 0 |
| D | 214 | 185 | 28 | 1 | 0 |
| E | 12 | 11 | 1 | 0 | 0 |
| F | 97 | 29 | 54 | 14 | 0 |
| **合计** | **489** | **329** | **142** | **17** | **1** |

## silent 面（载体无判据通道）

### A 卷（27 面）

- `ItemTool.java:36-42`（census A:21）
- `ItemTool.java:40-41 + 各类 getNumComponentsForDurability`（census A:22）
- `EnumEquipmentMaterial.java:4-20`（census A:23）
- `EnumQuality.java:4-13`（census A:24）
- `ItemTool.java:289-292`（census A:25）
- `Item.java:1229-1246`（census A:26）
- `ItemTool.java:236-239`（census A:27）
- `ItemTool.java:279-282`（census A:28）
- `ItemSword.java:18-20 / ItemHoe.java:16-18 / ItemMattock.java:14-16 / ItemWarHammer.java:16-18 / ItemBattleAxe.java:15-17 / ItemHatchet.java:15-17 / ItemCudgel.java:16-19`（census A:30）
- `ItemTool.java:68-119`（census A:31）
- `ItemAxe.java:18-20`（census A:34）
- `ItemInWorldManager.java:147`（census A:54）
- `Damage.java:203-208 ＋ ItemTool.java:173-174`（census A:63）
- `ItemTool.java:54-56；ItemHoe.java:26-28；ItemShears.java:27-29；ItemMattock.java:19-21；ItemDagger.java:20-22；ItemHatchet.java:25-27；ItemCudgel.java:27-29`（census A:64）
- `ItemTool.java:28`（census A:65）
- `ItemShears.java:8／ItemDagger.java:6／ItemKnife.java:6／ItemCudgel.java:7／ItemHatchet.java:6／ItemScythe.java:7`（census A:66）
- `EntityPlayer.java:2170-2226`（census A:67）
- `EntityPlayer.java:2174-2182`（census A:68）
- `ItemTool.java:245-252`（census A:69）
- `ItemTool.java:270-273`（census A:70）
- `ItemTool.java:284-287`（census A:71）
- `ItemPickaxe.java:40-42 等`（census A:73）
- `ItemInWorldManager.java:174-183`（census A:74）
- `ItemInWorldManager.java:187-202`（census A:75）
- `ItemHoe.java:75`（census A:85）
- `Enchantment.java:32 ＋ ItemHoe.java:78-80／ItemMattock.java:46-57／ItemScythe.java:40-53`（census A:86）
- `ItemTool.java:29-33`（census A:89）

### B 卷（14 面）

- `EntityPlayer.java:2398-2412`（census B:71）
- `TileEntityFurnace.java:267-294`（census B:119）
- `BlockFurnaceClay.java:26-38／BlockFurnaceHardenedClay.java:25-33／BlockFurnaceSandstone.java:25-33／BlockFurnaceCobblestone.java:25-28／BlockFurnaceObsidian.java:25-28／BlockFurnaceNetherrack.java:25-28`（census B:123）
- `BlockFurnace.java:45-71`（census B:124）
- `SlotFurnace.java:15-25`（census B:128）
- `ContainerFurnace.java:58-66`（census B:132）
- `BlockAnvil.java:47-54`（census B:147）
- `Enchantment.java:96-98`（census B:154）
- `Enchantment.java:79-92`（census B:159）
- `EnchantmentHelper.java:43-57`（census B:163）
- `EnchantmentProtection.java:96-133`（census B:167）
- `EnchantmentTreeFelling.java:8-21`（census B:176）
- `EnchantmentPiercing.java:8-26`（census B:177）
- `EnchantmentEndurance.java:8-26`（census B:178）

### C 卷（18 面）

- `Damage.java:191-193`（census C:21）
- `Damage.java:195-201`（census C:23）
- `Damage.java:203-209`（census C:25）
- `Damage.java:213-220`（census C:27）
- `Damage.java:215-216`（census C:29）
- `Damage.java:218-219`（census C:31）
- `Damage.java:221-229`（census C:33）
- `Damage.java:231`（census C:35）
- `DamageSource.java:13-17`（census C:45）
- `DamageSource.java:156-161`（census C:51）
- `EntityLivingBase.java:705-714`（census C:87）
- `EntityLivingBase.java:1157-1159`（census C:103）
- `EntityLivingBase.java:1209-1224`（census C:111）
- `ItemArmor.java:76-83`（census C:123）
- `ItemArmor.java:226-241`（census C:125）
- `ItemArmor.java:308-335`（census C:127）
- `EntityPlayer.java:2789-2791`（census C:143）
- `EntityPlayer.java:2789,Item.java:1903-1904`（census C:145）

### D 卷（28 面）

- `EntityRevenant.java:12-21`（census D:105）
- `EntityAncientBoneLord.java:12-18`（census D:107）
- `EntityWoodSpider.java:10-14 / EntityDemonSpider.java:15-19 / EntityPhaseSpider.java:17-21`（census D:109）
- `EntityClayGolem.java:9-15`（census D:120）
- `EntityWolf.java:48-50`（census D:121）
- `EntityJelly.java / EntityBlob.java / EntityOoze.java / EntityPudding.java（各 :4-9）`（census D:122）
- `EntityJelly.java:24-34 / EntityBlob.java:24-34 / EntityOoze.java:36-56 / EntityPudding.java:24-44`（census D:124）
- `EntityLongdeadGuardian.java:11-16`（census D:142）
- `EntitySpider.java:13-22`（census D:144）
- `EntityLiving.java:1185-1194`（census D:146）
- `EntityOcelot.java:53-55`（census D:156）
- `Entity.java:1801-1803 / :1899`（census D:158）
- `EntityLivingBase.java:2587`（census D:172）
- `EntityZombie.java:35`（census D:181）
- `EntityZombie.java:100`（census D:182）
- `EntityAIAttackOnCollide.java:153-165`（census D:190）
- `EntityWoodSpider.java:34-47`（census D:204）
- `EntityDemonSpider.java:30-42`（census D:205）
- `EntityWeb.java:16-54`（census D:207）
- `EntityWolf.java:205-207`（census D:208）
- `EntityLivestock.java:26-28`（census D:222）
- `EntityLivestock.java:40-79`（census D:223）
- `EntityInfernalCreeper.java:11-15 / :16-36`（census D:246）
- `EntityClayGolem.java:16-33`（census D:247）
- `EntityCopperspine.java:4-7 / EntityHoarySilverfish.java:4-7`（census D:248）
- `EntityAISeekFoodIfHungry.java:12-72`（census D:255）
- `EntityAISeekWaterIfThirsty.java:12-72`（census D:256）
- `EntityZombie.java:13/:35/:100/:221/:239/:404-411`（census D:300）

### E 卷（1 面）

- `E-72 BiomeGenUnderworld.java:19-65`（census E:96）

### F 卷（54 面）

- `Item.java:1903-1905`（census F:23）
- `Item.java:1277-1292`（census F:24）
- `Item.java:917-926/1546-1616`（census F:37）
- `Item.java:1338-1341`（census F:38）
- `ItemFood.java:60-64`（census F:48）
- `ItemFood.java:104-108`（census F:50）
- `ItemFood.java:118-128`（census F:51）
- `FoodStats.java:43`（census F:54）
- `FoodStats.java:46-56`（census F:55）
- `FoodStats.java:62-89`（census F:57）
- `FoodStats.java:190-196`（census F:58）
- `ItemVessel.java:100-170`（census F:59）
- `ItemVessel.java:82-85`（census F:60）
- `ItemBowl.java:4-8/107-110`（census F:61）
- `ItemBowl.java:11-24`（census F:62）
- `ItemBowl.java:37-83`（census F:63）
- `ItemBowl.java:112-172`（census F:64）
- `ItemBowl.java:198-206`（census F:65）
- `ItemManure.java:9-78`（census F:66）
- `ItemCoin.java:13-56`（census F:67）
- `ItemAppleGold.java:23-65`（census F:68）
- `ItemPotion.java:90-140`（census F:72）
- `Block.java:2575-2582`（census F:85）
- `Block.java:2597-2600`（census F:86）
- `Material.java:10-178`（census F:92）
- `Block.java:1882-1918`（census F:100）
- `Block.java:1984-1992`（census F:101）
- `Block.java:2042-2047/2055-2057`（census F:102）
- `Block.java:2059-2093`（census F:103）
- `Explosion.java:20-34`（census F:108）
- `Explosion.java:37-96`（census F:109）
- `Explosion.java:98-165`（census F:110）
- `Explosion.java:167-214`（census F:111）
- `Explosion.java:223-228`（census F:112）
- `Explosion.java:297-308`（census F:113）
- `Block.java:971-979`（census F:119）
- `BlockUnderminable.java:1-101`（census F:122）
- `BlockSpark.java:1-54`（census F:126）
- `BlockMounted.java:1-115`（census F:127）
- `BlockCropsDead.java:1-48/BlockCarrotDead.java/BlockOnionDead.java/BlockPotatoDead.java`（census F:128）
- `BlockCarrot.java:1-38/BlockOnion.java:1-38/BlockPotato.java:1-57`（census F:129）
- `ItemFood.java:60-64`（census F:149）
- `ItemFood.java:118-128`（census F:151）
- `ItemVessel.java:100-170`（census F:153）
- `ItemVessel.java:82-85`（census F:154）
- `ItemBowl.java:4-8/107-110`（census F:155）
- `ItemBowl.java:11-24`（census F:156）
- `ItemBowl.java:37-83`（census F:157）
- `ItemBowl.java:112-172`（census F:158）
- `ItemBowl.java:198-206`（census F:159）
- `ItemManure.java:9-78`（census F:160）
- `ItemCoin.java:13-56`（census F:161）
- `ItemAppleGold.java:23-65`（census F:162）
- `ItemPotion.java:90-140`（census F:163）

## 说明

- `parity` / `zero-port` 面无产品码，天然不产日志，豁免。
- `unresolved` = 指针指向的文件不在 ETIM `src/main/java`（多为 R196 侧引用），不计入棘轮。
- 要让某面从 silent 里消失：给载体补 `[XxxLog]` 行（并在 `check-channels` 登记门），或补 `no-log` 理由后把它从基线里移除。
