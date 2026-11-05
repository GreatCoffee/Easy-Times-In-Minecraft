package io.github.etim.etim.farm;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import net.minecraft.block.state.IBlockState;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.registry.GameRegistry;

import java.util.Random;

import io.github.etim.etim.metal.ETIMItemMattock;
import io.github.etim.etim.metal.ETIMItemScythe;
import io.github.etim.etim.tileentity.ETIMFarmlandTile;

/**
 * farm1 (batch B4, audit20 条 254-257) farm helper: fertility/harvesting rows
 * share this one class so the three carriers (hoe/mattock/scythe) and the
 * three event faces (growth consume / trample deny / harvest drops) stay
 * single-call-site thin. Faces (R196 first-hand, 对照报告 §3-§4, 终审 ✓):
 *
 * <ul>
 *   <li><b>F3 fraction</b> — {@code EnchantmentHelper.java:43-49}: BOTH
 *       enchantments act on {@code level / getNumLevels} (a fraction), NOT
 *       integer levels; 1.12 has no such helper (B-1) so this class computes
 *       it with the {@code maxLevel} config keys as denominator (条 256 D-4
 *       preceded by the disarming reuse).</li>
 *   <li><b>F5 tillage roll</b> — {@code ItemHoe.tryTillSoil:78-80}: on the
 *       server after a {@code SUCCESS} till that landed FARMLAND
 *       (B-3: the coarse_dirt SUCCESS branch lands DIRT — excluded), roll
 *       {@code Math.random() < f} and fertilize the tilled block.</li>
 *   <li><b>F6 harvest roll</b> — {@code ItemHoe.onBlockDestroyed:99-113} /
 *       {@code ItemMattock:45-60} / {@code ItemScythe:40-53}: on breaking a
 *       MATUR E crop with a fertility carrier, roll and fertilize
 *       {@code pos.down()}. {@code isDead} has no 1.12 counterpart (C-1);
 *       scythe exact-class gate + no isDead is faithful.</li>
 *   <li><b>F7 matrix</b> — wheat ({@code BlockCrops} exact class) is the
 *       scythe family alone; carrot/potato/onion(+beetroot, D-3) is the
 *       hoe/mattock family. The ETIM現役 effective sets differ (B-5) — the
 *       gate here is a DEDICATED first-hand judgment, never the canHarvest
 *       faces.</li>
 *   <li><b>F8 growth boost</b> — {@code BlockCrops.getGrowthRate:205-207} ×
 *       1.5 rides the single 1.12 static {@code getGrowthChance} mixin
 *       (BlockStem :83 calls the same static, 终审亲证).</li>
 *   <li><b>F9 consume</b> — {@code BlockCrops:120-127} / {@code BlockStem:
 *       130-135}: after a SUCCESS growth
 *       {@code next.nextInt(divisor) == 0} clears the bit — a consumable
 *       expected 256 successes. 1.12: BOTH branches fire onCropsGrowPost
 *       (1.12 BlockStem:113 common tail — D-7 withdrawal, 条 255/256) so the
 *       event subscription covers crops AND stems with zero stem mixin.</li>
 *   <li><b>F10 trample deny</b> — {@code BlockFarmland:78}: the FERTILIZED
 *       half only (D-2, 条 256 — the wetness half belongs to the future
 *       humidity-system batch, census 挂账).</li>
 * </ul>
 *
 * <p>Probability faces use {@code Math.random()} — B-4: not seedable, the
 * verdict window runs frequency statistics; every row logs roll AND need on
 * one line (纪律 9).</p>
 */
public final class ETIMFarm {

    private ETIMFarm() {
    }

    /**
     * [FarmLog] farm1 judgment channel (纪律 9 — created before the batch
     * ships; D-5 条 256). Never called on the client (server callers gate
     * {@code world.isRemote} themselves).
     */
    public static void row(String line) {
        if (ETIMConfig.farmDebugLog) {
            ETIM.LOGGER.info("[FarmLog] " + line + " [server]");
        }
    }

    /** preInit face: the fertilized-bit TE carrier registration (D-1, 条 256)
     *  — the farmland-moisture batch (条 283) rides the same seam to register
     *  the manure item; the mushroom stage carrier joins at the B-3 修 TE
     *  (条 284 甲). */
    public static void registerTile() {
        GameRegistry.registerTileEntity(ETIMFarmlandTile.class,
                new ResourceLocation("etim", "farmland_fertility"));
        GameRegistry.registerTileEntity(ETIMMushroomGrowthTile.class,
                new ResourceLocation("etim", "mushroom_growth"));
        // Farmland-moisture batch (条 283, D-6 甲): the manure item (施用面;
        // 获取面 EntityLivestock/TileEntityChest挂账另批).
        ETIMItemManure.register();
    }

    /** The fertilized TE at {@code pos}, or {@code null} (dry/non-farmland/never-set). */
    public static ETIMFarmlandTile farmlandTile(World world, BlockPos pos) {
        TileEntity te = world.getTileEntity(pos);
        return te instanceof ETIMFarmlandTile ? (ETIMFarmlandTile) te : null;
    }

    /**
     * Fertilize/unfertilize the farmland at {@code pos}. R196 wrote a raw
     * bit; here the TE is the bit — created on demand for pre-existing
     * chunks whose farmland was placed before this batch added the TE face
     * (the 1.12 TE map persists for free, 终审 B-side pinned).
     */
    public static void setFertilized(World world, BlockPos pos, boolean value) {
        if (world.isRemote) {
            return;
        }
        if (world.getBlockState(pos).getBlock() != Blocks.FARMLAND) {
            return;
        }
        ETIMFarmlandTile te = farmlandTile(world, pos);
        if (te == null) {
            te = new ETIMFarmlandTile();
            world.setTileEntity(pos, te);
        }
        te.setFertilized(value);
        row("fertilized set pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ() + " value=" + value);
    }

    /** F3: the R196 fraction read with the maxLevel cfg key as denominator. */
    private static float fraction(Enchantment ench, ItemStack stack) {
        int level = EnchantmentHelper.getEnchantmentLevel(ench, stack);
        return level / (float) ench.getMaxLevel();
    }

    /** F1/F2 carrier face: R196 {@code canEnchantItem} = hoe ∨ mattock ∨ scythe (1.12 摊平). */
    public static boolean isFertilityCarrier(Item item) {
        return item instanceof net.minecraft.item.ItemHoe
                || item instanceof ETIMItemMattock
                || item instanceof ETIMItemScythe;
    }

    /**
     * F7 matrix (dedicated judgment, NOT the ETIM canHarvest faces — B-5):
     * wheat is the scythe family alone (R196 scythe exact-block gate :=
     * {@code getClass() == BlockCrops.class}); root crops +
     * beetroot (D-3) are the hoe/mattock family.
     */
    public static boolean isEffectiveForCrop(Item item, IBlockState state) {
        Block block = state.getBlock();
        if (item instanceof ETIMItemScythe) {
            return block.getClass() == BlockCrops.class; // R196 ItemScythe:43 — wheat exact
        }
        return block == Blocks.CARROTS || block == Blocks.POTATOES || block == Blocks.BEETROOTS;
    }

    /**
     * F5 tillage roll. Callers: {@code MixinItemHoe} RETURN-SUCCESS hook
     * (D-6 接线, after the Endurance charge). The block-state check lands
     * the B-3 exclusion for free: the coarse_dirt SUCCESS branch swapped the
     * block to DIRT, so only a FARMLAND make it past.
     */
    public static void onTilled(net.minecraft.entity.player.EntityPlayer player, World world, BlockPos pos) {
        if (world.isRemote) {
            return;
        }
        if (world.getBlockState(pos).getBlock() != Blocks.FARMLAND) {
            return;
        }
        ItemStack held = player.getHeldItemMainhand();
        if (held.isEmpty() || !isFertilityCarrier(held.getItem())) {
            return;
        }
        int level = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.FERTILITY, held);
        if (level <= 0) {
            return;
        }
        float need = fraction(ETIMEnchantments.FERTILITY, held);
        float roll = (float) Math.random(); // R196 Math.random — unseedable (B-4)
        boolean pass = roll < need;
        row("fertility tillage lvl=" + level + " roll=" + String.format("%.4f", roll)
                + " need=" + String.format("%.4f", need) + " pass=" + pass
                + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
        if (pass) {
            setFertilized(world, pos, true);
        }
    }

    /**
     * F6 harvest roll. Callers: the three carrier classes'
     * {@code onBlockDestroyed} (ETIMItemHoe body line; scythe/mattock new
     * overrides + super). Runs BEFORE removeBlock (PIM :344-348) so
     * {@code pos.down()} farmland is still there.
     */
    public static void onCropBroken(net.minecraft.entity.EntityLivingBase entity, ItemStack stack,
                                    World world, BlockPos pos, IBlockState state) {
        if (world.isRemote || !(entity instanceof net.minecraft.entity.player.EntityPlayer)) {
            return; // 机器/假玩家不 roll (终审 C-4 面); creative never reaches here (B-4)
        }
        Block block = state.getBlock();
        if (!(block instanceof BlockCrops) || !((BlockCrops) block).isMaxAge(state)) {
            return; // R196 isMature; isDead 无对位 (C-1)
        }
        if (stack.isEmpty() || !isFertilityCarrier(stack.getItem()) || !isEffectiveForCrop(stack.getItem(), state)) {
            return; // F7 matrix (dedicated gate, B-5)
        }
        int level = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.FERTILITY, stack);
        if (level <= 0) {
            return;
        }
        float need = fraction(ETIMEnchantments.FERTILITY, stack);
        float roll = (float) Math.random(); // R196 Math.random — unseedable (B-4)
        boolean pass = roll < need;
        row("fertility harvest tool=" + stack.getItem().getRegistryName()
                + " crop=" + block.getRegistryName() + " lvl=" + level
                + " roll=" + String.format("%.4f", roll)
                + " need=" + String.format("%.4f", need) + " pass=" + pass
                + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
        if (pass) {
            setFertilized(world, pos.down(), true); // R196 info.x/y-1/z face
        }
    }

    /**
     * F8 growth-boost row (MixinBlockCrops single TAIL/RETURN injection —
     * BlockStem rides the same static). Ratio printed for the verdict window
     * (W-F8: value=base×factor, ratio=1.500±0.001).
     */
    public static void logGrowth(World world, BlockPos pos, float base, float value) {
        if (world.isRemote) {
            return;
        }
        row("growth pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " value=" + String.format("%.4f", value)
                + " base=" + String.format("%.4f", base)
                + " ratio=" + String.format("%.3f", value / base)
                + " factor=" + String.format("%.2f", (double) ETIMConfig.fertilizedGrowthFactor));
    }

    /**
     * F9 consumption roll on the farmland BELOW a growth-successful crop or
     * stem (both fire onCropsGrowPost — D-7 withdrawal). One independent
     * 1/256 (divisor cfg) roll per success; the value clears and dies.
     */
    public static void rollConsume(World world, BlockPos farmPos) {
        if (world.isRemote) {
            return;
        }
        ETIMFarmlandTile te = farmlandTile(world, farmPos);
        if (te == null || !te.isFertilized()) {
            return;
        }
        int roll = world.rand.nextInt(ETIMConfig.fertilizedConsumeDivisor);
        boolean clear = roll == 0;
        row("fertilized clear pos=" + farmPos.getX() + "," + farmPos.getY() + "," + farmPos.getZ()
                + " roll=" + roll + " divisor=" + ETIMConfig.fertilizedConsumeDivisor
                + " cleared=" + clear);
        if (clear) {
            te.setFertilized(false);
        }
    }

    // ------------------------------------------------ 耕湿批（条 283）faces

    /** R196 BlockFarmland.isWaterNearby (:226-249): the 9×2×9 water scan plus
     *  the snow/ice 3×2×3 neighbour face (D-2 甲). */
    public static boolean waterNearbyR196(World world, BlockPos pos) {
        for (int dx = -4; dx <= 4; dx++) {
            for (int dy = 0; dy <= 1; dy++) {
                for (int dz = -4; dz <= 4; dz++) {
                    if (world.getBlockState(pos.add(dx, dy, dz)).getMaterial()
                            == net.minecraft.block.material.Material.WATER) {
                        return true;
                    }
                }
            }
        }
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = 0; dy <= 1; dy++) {
                for (int dz = -1; dz <= 1; dz++) {
                    IBlockState state = world.getBlockState(pos.add(dx, dy, dz));
                    if (state.getBlock() == Blocks.SNOW || state.getBlock() == Blocks.ICE
                            || state.getBlock() == Blocks.PACKED_ICE) {
                        return true; // snow/craftedSnow/ice → SNOW/ICE/PACKED_ICE (终审 裁量④)
                    }
                }
            }
        }
        return false;
    }

    /** R196 isCropsNearby (:199-215): the 3×3 above-ring Crops/Stem face
     *  (1.12 hasCrops is the single-point face — 退化判位差面). */
    public static boolean cropsNearbyR196(World world, BlockPos pos) {
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                Block above = world.getBlockState(pos.add(dx, 1, dz)).getBlock();
                if (above instanceof BlockCrops || above instanceof net.minecraft.block.BlockStem
                        || above == Blocks.BROWN_MUSHROOM || above == Blocks.RED_MUSHROOM) {
                    return true;
                }
            }
        }
        return false;
    }

    /** The dry-face probe (G1 growth gate): below is farmland with MOISTURE 0. */
    public static boolean isDryFarmland(World world, BlockPos farmPos) {
        IBlockState state = world.getBlockState(farmPos);
        return state.getBlock() == Blocks.FARMLAND
                && state.getValue(net.minecraft.block.BlockFarmland.MOISTURE) == 0;
    }

    // ------------------------------------------------ 干旱死亡批（D-4 乙补面·B-8）

    /**
     * R196 BlockCrops.updateTick :66-74 — the drought-death arm, fired from
     * the two dry-gate mixin heads BEFORE the freeze cancel (the D-4 乙 freeze
     * face of 条 283 stays byte-identical; this face is purely additive).
     * Gate composition (literal transcription):
     * <ol>
     *   <li>master switch {@code droughtDeathR196};</li>
     *   <li>{@code growth_rate == 0.0F} — in the 1.12 adapter this is the
     *       frozen-dry-farmland face (the temperature-zero face of R196
     *       getGrowthRate is NOT transcribed yet — debt face; D-3 minimal);
     *   </li>
     *   <li>{@code !BlockFarmland.isWaterNearby(farm)} — the ONLY death-exempt
     *       judgment (R196 :66, 9×2×9 water + 3×2×3 snow/ice; ETIM
     *       {@code waterNearbyR196});</li>
     *   <li>{@code rand.nextFloat() < droughtDeathChance} (R196 :67
     *       {@code 0.05F}).</li>
     * </ol>
     * Mature → R196 :70 drought-harvest: ONE item of the mature crop item
     * (same identity face as the harvest chain via getItemDropped on the
     * mature state — wheat/beet/carrot/potato all covered) then setBlock air
     * (:71). Immature → R196 :73 swap to the dead plant block (growth kept).
     */
    public static void droughtDeathTick(World world, BlockPos pos, IBlockState state, Random rand) {
        if (!ETIMConfig.droughtDeathR196) {
            return;
        }
        if (waterNearbyR196(world, pos.down())) {
            return; // R196 :66 second half — the death-exempt judgment
        }
        roll(world, pos, state, rand, ETIMConfig.droughtDeathChance);
    }

    /** /etest drought roll — one forced evaluation, p replaces the config chance. */
    public static void forceDroughtRoll(World world, BlockPos pos, float p) {
        IBlockState state = world.getBlockState(pos);
        boolean dryFarm = isDryFarmland(world, pos.down());
        boolean water = waterNearbyR196(world, pos.down());
        String head = "drought force block=" + state.getBlock().getRegistryName()
                + " age=" + ageOf(state) + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " dry=" + (dryFarm ? 1 : 0) + " water=" + (water ? 1 : 0)
                + " master=" + (ETIMConfig.droughtDeathR196 ? 1 : 0)
                + " p=" + String.format(java.util.Locale.ROOT, "%.2f", p);
        if (!dryFarm) {
            row(head + " branch=skip-not-dry (drought only rolls behind the freeze gate)");
            return;
        }
        if (water) {
            row(head + " branch=skip-water (death-exempt face)");
            return;
        }
        if (!ETIMConfig.droughtDeathR196) {
            row(head + " branch=skip-master-off");
            return;
        }
        roll(world, pos, state, world.rand, p, head);
    }

    /** /etest drought probe — the verdict-input dump, no dice. */
    public static void probeDrought(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        row("drought probe block=" + state.getBlock().getRegistryName()
                + " age=" + ageOf(state) + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " below=" + world.getBlockState(pos.down()).getBlock().getRegistryName()
                + " dry=" + (isDryFarmland(world, pos.down()) ? 1 : 0)
                + " water=" + (waterNearbyR196(world, pos.down()) ? 1 : 0)
                + " master=" + (ETIMConfig.droughtDeathR196 ? 1 : 0)
                + " chance=" + String.format(java.util.Locale.ROOT, "%.2f", ETIMConfig.droughtDeathChance));
    }

    /** R196 :67-74 — the dice plus the mature/immature branch. */
    private static void roll(World world, BlockPos pos, IBlockState state, Random rand, float chance) {
        roll(world, pos, state, rand, chance, "");
    }

    private static void roll(World world, BlockPos pos, IBlockState state, Random rand, float chance, String head) {
        if (!(state.getBlock() instanceof net.minecraft.block.BlockCrops)
                && !(state.getBlock() instanceof net.minecraft.block.BlockStem)) {
            if (!head.isEmpty()) {
                row(head + " branch=skip-not-crop");
            }
            return;
        }
        float roll = rand.nextFloat(); // R196 :67 — one dice, frozen tick on miss
        if (roll >= chance) {
            if (!head.isEmpty()) {
                row(head + " branch=roll-miss roll=" + String.format(java.util.Locale.ROOT, "%.3f", roll)
                        + " >= " + String.format(java.util.Locale.ROOT, "%.2f", chance));
            }
            return; // R196 :68 — this tick only freezes (the 条 283 face intact)
        }
        boolean stem = state.getBlock() instanceof net.minecraft.block.BlockStem;
        net.minecraft.block.BlockCrops crops = stem ? null : (net.minecraft.block.BlockCrops) state.getBlock();
        String rollTxt = String.format(java.util.Locale.ROOT, "%.3f", roll);
        if (crops != null && crops.isMaxAge(state)) {
            // R196 :70-71 — drought-harvest: ONE mature crop item, then air
            Item cropItem = crops.getItemDropped(state, world.rand, 0);
            net.minecraft.entity.item.EntityItem ei = new net.minecraft.entity.item.EntityItem(
                    world, pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D,
                    new net.minecraft.item.ItemStack(cropItem, 1));
            ei.motionX = 0.0D;
            ei.motionY = 0.0D;
            ei.motionZ = 0.0D; // R196 dropItem ground-scatter face parity with manure M-1-4
            world.spawnEntity(ei);
            world.setBlockState(pos, Blocks.AIR.getDefaultState(), 3);
            row(head + " drought event kind=mature block=" + name(state.getBlock()) + " age=" + ageOf(state)
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " roll=" + rollTxt + " drop=" + cropItem.getRegistryName() + "#1");
        } else {
            int age = ageOf(state);
            IBlockState dead = (stem ? ETIMBlockDeadPlant.DEAD_STEM : ETIMBlockDeadPlant.DEAD_CROP)
                    .getDefaultState().withProperty(BlockCrops.AGE, Integer.valueOf(age));
            world.setBlockState(pos, dead, 3);
            row(head + " drought event kind=immature block=" + name(state.getBlock()) + " age=" + age
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " roll=" + rollTxt
                    + " dead=" + (stem ? "etim:dead_stem" : "etim:dead_crop") + " age=" + age);
        }
    }

    /** The age value of any crop/stem host via its "age" property (public face). */
    private static int ageOf(IBlockState state) {
        for (java.util.Map.Entry<net.minecraft.block.properties.IProperty<?>, Comparable<?>> e
                : state.getProperties().entrySet()) {
            if (e.getKey().getName().equals("age")) {
                return (Integer) e.getValue();
            }
        }
        return -1;
    }

    private static String name(net.minecraft.block.Block block) {
        return block.getRegistryName() == null ? block.getClass().getSimpleName() : block.getRegistryName().toString();
    }

    // ------------------------------------------------ 增速批（B-9 · growth-rate）

    /** R196 {@code BlockGrowingPlant.getTemperatureTolerance :13-15} — the family base. */
    private static final float GROW_TEMP_TOLERANCE = 1.0F;

    /**
     * B-9 temperature windows of the growth-rate family carriers (D-1 直抄):
     * wheat/carrot/potato/beet family = 0.8-1.2 (R196 BlockCrops :35-42); pumpkin
     * stem = 0.6-1.0, melon stem = 1.0-1.4 (R196 BlockStem :29-36). The berry-bush
     * window (R196 BlockBush :209-216) has NO 1.12 carrier — range-out (摸底 §0/§7).
     */
    public static float[] growthTempWindow(Block blockIn) {
        if (blockIn == net.minecraft.init.Blocks.PUMPKIN_STEM) {
            return new float[] { 0.6F, 1.0F };
        }
        if (blockIn == net.minecraft.init.Blocks.MELON_STEM) {
            return new float[] { 1.0F, 1.4F };
        }
        return new float[] { 0.8F, 1.2F };
    }

    /**
     * R196 {@code BlockGrowingPlant.getTemperatureGrowthRateModifier :21-34} —
     * {@code max(1 - delta/tolerance, 0)} with the 1.0 family tolerance; in-window
     * modifiers sit at 1.0. The temperature source is the D-4 ruling
     * {@code getTemperature(pos)} — the ETIMFoodStats :440 precedent (the vanilla
     * height-cooling face above y=64 rides along; the MITE face reads the flat
     * {@code biome.temperature} — the delta is the y-window edge only).
     *
     * @param out receives [0]=temperature [1]=window lo [2]=window hi [3]=mod
     */
    public static float temperatureModifier(World world, BlockPos pos, Block blockIn, float[] out) {
        float[] w = growthTempWindow(blockIn);
        float t = world.getBiome(pos).getTemperature(pos);
        float delta = t < w[0] ? w[0] - t : (t > w[1] ? t - w[1] : 0.0F);
        float mod = Math.max(1.0F - delta / GROW_TEMP_TOLERANCE, 0.0F);
        out[0] = t;
        out[1] = w[0];
        out[2] = w[1];
        out[3] = mod;
        return mod;
    }

    /**
     * B-9 (D-3 直抄) crops-only proximity penalty — R196
     * {@code BlockGrowingPlant.getProximityGrowthRateModifier :38-84}: zero same-block
     * neighbours ×0.5; a single neighbour whose rank-1 direction carries NO rank-2
     * extension (the :69-83 cross) ×0.75; otherwise (≥2 neighbours, or a live extension)
     * ×1.0. Stems never multiply this face (R196 BlockStem :218-221 tail).
     */
    public static float proximityModifierR196(World world, BlockPos pos, Block blockIn) {
        boolean north = world.getBlockState(pos.north()).getBlock() == blockIn;
        boolean east = world.getBlockState(pos.east()).getBlock() == blockIn;
        boolean south = world.getBlockState(pos.south()).getBlock() == blockIn;
        boolean west = world.getBlockState(pos.west()).getBlock() == blockIn;
        int neighbors = (north ? 1 : 0) + (east ? 1 : 0) + (south ? 1 : 0) + (west ? 1 : 0);
        if (neighbors > 1) {
            return 1.0F;
        }
        if (neighbors == 0) {
            return 0.5F; // R196 :64-66
        }
        if (north && (world.getBlockState(pos.north(2)).getBlock() == blockIn
                || world.getBlockState(pos.north().east()).getBlock() == blockIn
                || world.getBlockState(pos.north().west()).getBlock() == blockIn)) {
            return 1.0F;
        }
        if (east && (world.getBlockState(pos.east().north()).getBlock() == blockIn
                || world.getBlockState(pos.east(2)).getBlock() == blockIn
                || world.getBlockState(pos.east().south()).getBlock() == blockIn)) {
            return 1.0F;
        }
        if (south && (world.getBlockState(pos.south().east()).getBlock() == blockIn
                || world.getBlockState(pos.south(2)).getBlock() == blockIn
                || world.getBlockState(pos.south().west()).getBlock() == blockIn)) {
            return 1.0F;
        }
        if (west && (world.getBlockState(pos.west().north()).getBlock() == blockIn
                || world.getBlockState(pos.west().south()).getBlock() == blockIn
                || world.getBlockState(pos.west(2)).getBlock() == blockIn)) {
            return 1.0F;
        }
        return 0.75F;
    }

    /**
     * B-9 composition (R196 crops :162-214 / stems :171-221) — the literal
     * transcription order {@code base × fertilized × temp × humidity × global ×
     * proximity} onto the vanilla dice chain (the wetness 3/1 weighting, the
     * diagonal /4, the same-block /2 and the 25/rate dice are vanilla-identical;
     * fertilized rides the same seam since farm1). Emits ONE composition judgment
     * row (the [FarmLog] growth-rate face; supersedes the F8 ratio row on this path).
     *
     * @param fertilized whether the farmland below carries the fertilized TE bit
     * @param fertilizedFactor the cfg multiplies when {@code fertilized} holds
     */
    public static float composeGrowthRateR196(World world, BlockPos pos, Block blockIn, float base,
            boolean fertilized, float fertilizedFactor) {
        boolean stem = blockIn instanceof net.minecraft.block.BlockStem;
        float[] probe = new float[4];
        float tempMod = temperatureModifier(world, pos, blockIn, probe);
        float humMod = 1.0F;
        if (blockIn == net.minecraft.init.Blocks.MELON_STEM
                && world.getBiome(pos).isHighHumidity()) {
            humMod = 1.2F; // R196 BlockStem :39-40
        }
        float global = ETIMConfig.globalGrowthRateFactor; // R196 :17-19
        float proxMod = stem ? 1.0F : proximityModifierR196(world, pos, blockIn);
        float value = base;
        if (fertilized) {
            value *= fertilizedFactor; // R196 :205-207 order face
        }
        value *= tempMod;
        value *= humMod;
        value *= global;
        value *= proxMod;
        row("growth rate block=" + name(blockIn)
                + " family=" + (stem ? (blockIn == net.minecraft.init.Blocks.MELON_STEM ? "stem_melon" : "stem_pumpkin") : "crops")
                + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " base=" + fmt(base)
                + " fert=" + (fertilized ? fmt(fertilizedFactor) : "none")
                + " temp=" + String.format(java.util.Locale.ROOT, "%.2f", probe[0])
                + " window=" + String.format(java.util.Locale.ROOT, "%.1f..%.1f", probe[1], probe[2])
                + " tempMod=" + fmt(tempMod)
                + " hum=" + fmt(humMod)
                + " prox=" + (stem ? "none" : fmt(proxMod))
                + " global=" + fmt(global)
                + " rate=" + fmt(value));
        return value;
    }

    private static String fmt(float v) {
        return String.format(java.util.Locale.ROOT, "%.3f", v);
    }

    /**
     * B-9 updateTick-head freeze probe (the F1/D-1 light window plus the D-3
     * temperature-zero rate): R196 freezes growth — and ONLY growth — behind the
     * family light window 15..15 (BlockGrowingPlant :86-92; vanilla 1.12 gates
     * {@code >= 9} at BlockCrops :81 / BlockStem :81) and behind a composed rate
     * of zero (temperature is the only zeroable face with the base > 0 remainder;
     * the 条 281 bound keeps the vanilla {@code 25.0F/rate} dice away from zero — a
     * zero rate must NEVER reach the dice). Cancelling the whole tick keeps the
     * freeze face (条 283) and the drought arm (B-8) semantics intact — both ride
     * EARLIER in the same head. Returns true when the tick must freeze.
     */
    public static boolean growthFreezeProbe(World world, BlockPos pos, Block blockIn) {
        if (!ETIMConfig.growthRateR196) {
            return false;
        }
        if (!world.isAreaLoaded(pos, 1)) {
            return false; // vanilla BlockCrops :80 gate — unloaded edges stay frozen silently
        }
        BlockPos head = pos.up();
        int blv = world.getLightFromNeighbors(head);
        boolean stem = blockIn instanceof net.minecraft.block.BlockStem;
        // R196 :68 reads only the lower bound for stems; crops carry the full window (:115)
        boolean lightBlocked = blv < ETIMConfig.growthLightMin || (!stem && blv > ETIMConfig.growthLightMax);
        if (lightBlocked) {
            row("growth gate light block=" + name(blockIn)
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " blv=" + blv + " window=" + ETIMConfig.growthLightMin + ".." + ETIMConfig.growthLightMax);
            return true;
        }
        float[] probe = new float[4];
        float tempMod = temperatureModifier(world, pos, blockIn, probe);
        if (tempMod <= 0.0F) {
            row("growth gate rate-zero block=" + name(blockIn)
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " temp=" + String.format(java.util.Locale.ROOT, "%.2f", probe[0])
                    + " window=" + String.format(java.util.Locale.ROOT, "%.1f..%.1f", probe[1], probe[2])
                    + " mod=0.00 (dice guard 条 281)");
            return true;
        }
        return false;
    }

    /** R196 moisture write face (metadata & 7 — the bit space is vanilla-native). */
    public static void setMoisture(World world, BlockPos pos, int level) {
        IBlockState state = world.getBlockState(pos);
        if (state.getBlock() != Blocks.FARMLAND) {
            return;
        }
        if (state.getValue(net.minecraft.block.BlockFarmland.MOISTURE) != level) {
            world.setBlockState(pos, state
                    .withProperty(net.minecraft.block.BlockFarmland.MOISTURE, Integer.valueOf(level)), 2);
        }
    }

    /** R196 water face (:204-215): dry-to-7 in one step; false when already full (A-2). */
    public static boolean waterSpot(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        if (state.getBlock() != Blocks.FARMLAND) {
            return false;
        }
        if (state.getValue(net.minecraft.block.BlockFarmland.MOISTURE) < 7) {
            if (!world.isRemote) {
                setMoisture(world, pos, 7);
            }
            return true;
        }
        return false;
    }

    // --------------------------------- 耕湿批 B-3/B-4 修（条 284）helpers

    /** R196 World.isOutdoors (:5658-5875) ported verbatim — the same-layer
     *  7×7 flood plus {@code getPrecipitationHeight <= y}. The W-FM7 判窗
     *  probes proved the canSeeSky coarse bridge does NOT agree with it at
     *  edge positions (roofed plaza: canSeeSky false while the flood still
     *  reaches; sunny ground: canSeeSky true while the light band demands
     *  shade), so the A-1 fix replaces the bridge with the one-hand.
     *  {@code initial_call} = the R196 flag that lets the rooftop walk
     *  upward before flooding. */
    public static boolean isOutdoorsMITE(World world, int x, int y, int z, boolean initial_call) {
        if (world.provider.isNether()) {
            return false;
        }

        boolean[] check_block = new boolean[49];
        if (initial_call && isPassableMITE(world, x, y + 1, z)) {
            if (isOutdoorsMITE(world, x, y + 1, z, false)) {
                return true;
            }

            if (isPassableMITE(world, x, y + 2, z) && isOutdoorsMITE(world, x, y + 2, z, false)) {
                return true;
            }
        }

        if (isPassableMITE(world, x, y, z) && precipHeightMITE(world, x, z) <= y) {
            return true;
        }

        if (isPassableMITE(world, x + 1, y, z)) {
            if (precipHeightMITE(world, x + 1, z) <= y) {
                return true;
            }

            check_block[18] = true;
            check_block[26] = true;
            check_block[32] = true;
        }

        if (isPassableMITE(world, x - 1, y, z)) {
            if (precipHeightMITE(world, x - 1, z) <= y) {
                return true;
            }

            check_block[16] = true;
            check_block[22] = true;
            check_block[30] = true;
        }

        if (isPassableMITE(world, x, y, z + 1)) {
            if (precipHeightMITE(world, x, z + 1) <= y) {
                return true;
            }

            check_block[30] = true;
            check_block[38] = true;
            check_block[32] = true;
        }

        if (isPassableMITE(world, x, y, z - 1)) {
            if (precipHeightMITE(world, x, z - 1) <= y) {
                return true;
            }

            check_block[16] = true;
            check_block[10] = true;
            check_block[18] = true;
        }

        if (check_block[18] && isPassableMITE(world, x + 1, y, z - 1)) {
            if (precipHeightMITE(world, x + 1, z - 1) <= y) {
                return true;
            }

            check_block[11] = true;
            check_block[19] = true;
        }

        if (check_block[32] && isPassableMITE(world, x + 1, y, z + 1)) {
            if (precipHeightMITE(world, x + 1, z + 1) <= y) {
                return true;
            }

            check_block[33] = true;
            check_block[39] = true;
        }

        if (check_block[30] && isPassableMITE(world, x - 1, y, z + 1)) {
            if (precipHeightMITE(world, x - 1, z + 1) <= y) {
                return true;
            }

            check_block[29] = true;
            check_block[37] = true;
        }

        if (check_block[16] && isPassableMITE(world, x - 1, y, z - 1)) {
            if (precipHeightMITE(world, x - 1, z - 1) <= y) {
                return true;
            }

            check_block[9] = true;
            check_block[15] = true;
        }

        if (check_block[26] && isPassableMITE(world, x + 2, y, z)) {
            if (precipHeightMITE(world, x + 2, z) <= y) {
                return true;
            }

            check_block[19] = true;
            check_block[27] = true;
            check_block[33] = true;
        }

        if (check_block[38] && isPassableMITE(world, x, y, z + 2)) {
            if (precipHeightMITE(world, x, z + 2) <= y) {
                return true;
            }

            check_block[37] = true;
            check_block[39] = true;
            check_block[45] = true;
        }

        if (check_block[22] && isPassableMITE(world, x - 2, y, z)) {
            if (precipHeightMITE(world, x - 2, z) <= y) {
                return true;
            }

            check_block[15] = true;
            check_block[21] = true;
            check_block[29] = true;
        }

        if (check_block[10] && isPassableMITE(world, x, y, z - 2)) {
            if (precipHeightMITE(world, x, z - 2) <= y) {
                return true;
            }

            check_block[3] = true;
            check_block[9] = true;
            check_block[11] = true;
        }

        if (check_block[11] && isPassableMITE(world, x + 1, y, z - 2)) {
            if (precipHeightMITE(world, x + 1, z - 2) <= y) {
                return true;
            }

            check_block[12] = true;
        }

        if (check_block[19] && isPassableMITE(world, x + 2, y, z - 1)) {
            if (precipHeightMITE(world, x + 2, z - 1) <= y) {
                return true;
            }

            check_block[12] = true;
        }

        if (check_block[33] && isPassableMITE(world, x + 2, y, z + 1)) {
            if (precipHeightMITE(world, x + 2, z + 1) <= y) {
                return true;
            }

            check_block[40] = true;
        }

        if (check_block[39] && isPassableMITE(world, x + 1, y, z + 2)) {
            if (precipHeightMITE(world, x + 1, z + 2) <= y) {
                return true;
            }

            check_block[40] = true;
        }

        if (check_block[37] && isPassableMITE(world, x - 1, y, z + 2)) {
            if (precipHeightMITE(world, x - 1, z + 2) <= y) {
                return true;
            }

            check_block[36] = true;
        }

        if (check_block[29] && isPassableMITE(world, x - 2, y, z + 1)) {
            if (precipHeightMITE(world, x - 2, z + 1) <= y) {
                return true;
            }

            check_block[36] = true;
        }

        if (check_block[15] && isPassableMITE(world, x - 2, y, z - 1)) {
            if (precipHeightMITE(world, x - 2, z - 1) <= y) {
                return true;
            }

            check_block[8] = true;
        }

        if (check_block[9] && isPassableMITE(world, x - 1, y, z - 2)) {
            if (precipHeightMITE(world, x - 1, z - 2) <= y) {
                return true;
            }

            check_block[8] = true;
        }

        if (check_block[12] && isPassableMITE(world, x + 2, y, z - 2) && precipHeightMITE(world, x + 2, z - 2) <= y) {
            return true;
        } else if (check_block[40] && isPassableMITE(world, x + 2, y, z + 2) && precipHeightMITE(world, x + 2, z + 2) <= y) {
            return true;
        } else if (check_block[36] && isPassableMITE(world, x - 2, y, z + 2) && precipHeightMITE(world, x - 2, z + 2) <= y) {
            return true;
        } else if (check_block[8] && isPassableMITE(world, x - 2, y, z - 2) && precipHeightMITE(world, x - 2, z - 2) <= y) {
            return true;
        } else if (check_block[27] && isPassableMITE(world, x + 3, y, z) && precipHeightMITE(world, x + 3, z) <= y) {
            return true;
        } else if (check_block[45] && isPassableMITE(world, x, y, z + 3) && precipHeightMITE(world, x, z + 3) <= y) {
            return true;
        } else {
            return check_block[21] && isPassableMITE(world, x - 3, y, z) && precipHeightMITE(world, x - 3, z) <= y
                ? true
                : check_block[3] && isPassableMITE(world, x, y, z - 3) && precipHeightMITE(world, x, z - 3) <= y;
        }
    }

    /** R196 {@code isAirOrPassableBlock} bridge — 1.12: an air block or any
     *  block whose collision box is absent. */
    public static boolean isPassableMITE(net.minecraft.world.World world, int x, int y, int z) {
        net.minecraft.util.math.BlockPos pos = new net.minecraft.util.math.BlockPos(x, y, z);
        net.minecraft.block.state.IBlockState state = world.getBlockState(pos);
        return state.getBlock().isAir(state, world, pos)
                || state.getCollisionBoundingBox(world, pos) == Block.NULL_AABB;
    }

    /** R196 {@code getPrecipitationHeight(x, z) <= y} bridge — 1.12 returns
     *  the position itself; we take its Y. */
    public static int precipHeightMITE(net.minecraft.world.World world, int x, int z) {
        return world.getPrecipitationHeight(new net.minecraft.util.math.BlockPos(x, 0, z)).getY();
    }

    /** R196 {@code BlockMushroom.isLegalAt} (:121-123) bridge —
     *  {@code hasNoSky || !canBlockSeeTheSky} plus the super
     *  {@code isLegalOn} ground face (which the arms already enforce):
     *  the light band cap rides the brown-only mycelium-tolerance face
     *  (getMaxAllowedLightValue = 13 for brown, 15 for red = no cap). */
    public static boolean mushroomLegalAtMITE(World world, BlockPos pos) {
        if (!world.provider.isNether() && world.canSeeSky(pos)) {
            return false;
        }
        if (world.getBlockState(pos).getBlock() == net.minecraft.init.Blocks.BROWN_MUSHROOM
                && world.getLight(pos) > 13) {
            return false;
        }
        return true;
    }
}
