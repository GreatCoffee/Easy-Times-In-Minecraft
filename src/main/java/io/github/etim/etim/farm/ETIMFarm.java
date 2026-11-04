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
}
