package io.github.etim.etim.farm;

import net.minecraft.block.state.IBlockState;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.world.BlockEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * farm1 (batch B4, audit20 条 254-257) single-event bus for the three
 * ZERO-mixin faces. Registered MANUALLY from {@code ETIM.preInit} (the
 * {@code ETIMFoodStatsEvents} precedent — deterministic ordering, no
 * {@code @Mod.EventBusSubscriber}).
 *
 * <ul>
 *   <li><b>F9 consume</b> — {@code CropGrowEvent.Post}: BOTH the crop
 *       age-up and the stem age-up/fruit branches ride ONE common
 *       {@code ForgeHooks.onCropsGrowPost} tail (1.12 BlockStem:113,
 *       D-7 withdrawal — 终审条 257 亲证), so a single subscription covers
 *       crops AND stems; the R196 face is a 1/256 roll on the farmland
 *       below the grower (ETIMFarm.rollConsume).</li>
 *   <li><b>F10 trample deny</b> — {@code FarmlandTrampleEvent} (fired ONLY
 *       after {@code canTrample} passes, ForgeHooks:1478-1488): the
 *       FERTILIZED half only (D-2, 条 256 — the wetness half belongs to the
 *       humidity-system batch, census 挂账行). Cancelling skips
 *       turnToDirt; entities that never passed canTrample are untouched,
 *       vanilla-equivalent.</li>
 *   <li><b>F4 harvesting</b> — {@code HarvestDropsEvent}: the 1.12 drops
 *       pipeline has no tool context inside getDrops (A-1) but the event
 *       carries {@code getHarvester()}; the R196 whole-stack expectation is
 *       {@code quantity × (1 + fraction × 0.5)}, realized as ONE extra
 *       {@code rand < f×0.5} roll per base main-crop item (the R196
 *       per-item faces Block.java:2001/:2030 — basis B-6, 基差声明 D-4:
 *       only the ENCHANT INCREMENT is judged; seeds get nothing, R196
 *       :352-353).</li>
 * </ul>
 */
public final class ETIMFarmingEvents {

    private ETIMFarmingEvents() {
    }

    /** F9 — the consumption roll rides the shared growth-success event tail. */
    @SubscribeEvent
    public static void onCropGrowPost(BlockEvent.CropGrowEvent.Post event) {
        World world = event.getWorld();
        if (world.isRemote) {
            return;
        }
        ETIMFarm.rollConsume(world, event.getPos().down());
    }

    /** F10 — D-2 fertilizer-only trample immunity. */
    @SubscribeEvent
    public static void onFarmlandTrample(BlockEvent.FarmlandTrampleEvent event) {
        World world = event.getWorld();
        BlockPos pos = event.getPos();
        String posStr = pos.getX() + "," + pos.getY() + "," + pos.getZ();
        io.github.etim.etim.tileentity.ETIMFarmlandTile te = ETIMFarm.farmlandTile(world, pos);
        if (te == null || !te.isFertilized()) {
            ETIMFarm.row("trample allow pos=" + posStr
                    + " fertilized=false entity=" + event.getEntity().getName());
            return;
        }
        event.setCanceled(true);
        ETIMFarm.row("fertilized trample-deny pos=" + posStr
                + " entity=" + event.getEntity().getName());
    }

    /** F4 — the harvesting yield bonus on the MAIN crop only, per-item extra roll. */
    @SubscribeEvent
    public static void onHarvestDrops(BlockEvent.HarvestDropsEvent event) {
        World world = event.getWorld();
        if (world.isRemote) { // double guard — Forge fires this server-only anyway (Block.java:790)
            return;
        }
        IBlockState state = event.getState();
        if (!(state.getBlock() instanceof net.minecraft.block.BlockCrops)) {
            return;
        }
        net.minecraft.block.BlockCrops crops = (net.minecraft.block.BlockCrops) state.getBlock();
        if (!crops.isMaxAge(state)) {
            return; // seed branch & immature breaks carry no bonus (R196 :352-353)
        }
        net.minecraft.entity.player.EntityPlayer harvester = event.getHarvester();
        if (harvester == null) {
            return; // machine/explosion: R196 had no tool ⇒ no bonus
        }
        ItemStack held = harvester.getHeldItemMainhand();
        if (held.isEmpty() || !ETIMFarm.isFertilityCarrier(held.getItem())
                || !ETIMFarm.isEffectiveForCrop(held.getItem(), state)) {
            return; // F7 matrix (dedicated gate — B-5)
        }
        int level = net.minecraft.enchantment.EnchantmentHelper.getEnchantmentLevel(
                io.github.etim.etim.mining.ETIMEnchantments.HARVESTING, held);
        if (level <= 0) {
            return;
        }
        float fraction = level / (float) io.github.etim.etim.mining.ETIMEnchantments.HARVESTING.getMaxLevel();
        float extraChance = fraction * io.github.etim.etim.ETIMConfig.harvestingYieldFactor;
        // B-2: getCrop() is protected — the SAME item via getItemDropped on the
        // mature state (public super face; getDrops already zeroed fortune).
        net.minecraft.item.Item crop = state.getBlock().getItemDropped(state, world.rand, 0);
        if (crop == null || crop == net.minecraft.init.Items.AIR) {
            return;
        }
        int base = 0;
        for (ItemStack stack : event.getDrops()) {
            if (stack.getItem() == crop) {
                base += stack.getCount();
            }
        }
        if (base <= 0) {
            return;
        }
        int extra = 0;
        for (int i = 0; i < base; i++) {
            if (world.rand.nextFloat() < extraChance) { // R196 per-item chance face
                extra++;
            }
        }
        if (extra > 0) {
            event.getDrops().add(new ItemStack(crop, extra));
        }
        ETIMFarm.row("harvesting crop=" + state.getBlock().getRegistryName()
                + " lvl=" + level + " fraction=" + String.format("%.2f", fraction)
                + " factor=" + String.format("%.2f", extraChance)
                + " base=" + base + " extra=" + extra
                + " pos=" + event.getPos().getX() + "," + event.getPos().getY()
                + "," + event.getPos().getZ());
    }
}
