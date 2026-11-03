package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mob.ETIMEntityArrow;
import io.github.etim.etim.metal.ETIMItemArrow;

import net.minecraft.block.BlockLiquid;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.entity.projectile.EntityFishHook;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraft.world.biome.BiomeOcean;

import java.util.Random;

/**
 * R196 fishing nine-segment gate + fish type + arrow-recovery chance table
 * (batch five, audit20 条 268-271). Single point for every R196 judge value
 * of the fishing face; the [FishLog] channel carries the judgment rows.
 *
 * <p>Anchor sheet (对照报告 §4.2-§4.4, 终审 T-1 亲合):</p>
 * <ul>
 *   <li>bite gate nine segments = R196 {@code EntityFishHook:135-178}.</li>
 *   <li>the window drives the decrement face FIRST ({@code :331-334} —
 *       window ticks spent before any new gate roll).</li>
 *   <li>segment order pinned by T-1: water/air → neighbor probe (dx,dy,dz
 *       spend order) → line of physical reach → clock (float32 chain, A-2:
 *       NO simplification to a pure integer form) → lightning → NO skill
 *       penalty (D-3 甲) → fortune cascade (int per level) → worm half
 *       (AFTER the cascade, :170-172) → the roll.</li>
 *   <li>lure (D-11 丙, user-ruled 条 270): vanilla lure rides the SAME
 *       cascade as a level stack behind cfg gate {@code vanillaLureActive};
 *       luck_of_the_sea → +1 XP per level at the catch (Events face).</li>
 *   <li>crash face-guard: the cascade floor of 1 stays 1 (cfg min window
 *       could otherwise produce a zero-roll nextInt).</li>
 * </ul>
 */
public final class ETIMFishing {

    private ETIMFishing() {
    }

    /** [FishLog] channel gate = fishingDebugLog (D-8 甲, 纪律 9). */
    public static void row(String line) {
        if (ETIMConfig.fishingDebugLog) {
            ETIM.LOGGER.info("[FishLog] " + line + " [server]");
        }
    }

    // ------------------------------------------------------------ bite gate

    /** R196 :135 的满水面（BlockFluid.isFullWaterBlock 1.12 对位 = still source level 0）. */
    public static boolean fullWater(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        return state.getMaterial() == Material.WATER
                && state.getBlock() instanceof BlockLiquid
                && state.getValue(BlockLiquid.LEVEL) == 0;
    }

    /** R196 :129-133 混合判（满水面 OR 水源 meta — 1.12 合并为 level 0 满水面）. */
    public static boolean fishInhabited(World world, BlockPos pos) {
        return fullWater(world, pos);
    }

    /** R196 :147-151 线物理可达（对位 = 原版射线被任何碰撞方块阻断）. */
    public static boolean lineOfReach(World world, BlockPos hookPos, BlockPos fishPos) {
        Vec3d from = new Vec3d(hookPos.getX() + 0.5D, hookPos.getY() + 0.5D, hookPos.getZ() + 0.5D);
        Vec3d to = new Vec3d(fishPos.getX() + 0.5D, fishPos.getY() + 0.5D, fishPos.getZ() + 0.5D);
        RayTraceResult hit = world.rayTraceBlocks(from, to, false, false, false);
        return hit == null;
    }

    /** R196 World:1686-1692 getAdjustedTimeOfDay = (tod + 6000) % 24000. */
    public static int adjustedTime(World world) {
        return (int) ((world.getWorldTime() + 6000L) % 24000L);
    }

    /** R196 World:2391-2397 — day-level blue moon AND night-only (A-3 白天否决); ETIMMoonState carries the backend + judgement moonStateOverride. */
    public static boolean blueMoonNight(World world) {
        if (world.isDaytime()) {
            return false; // R196 isBlueMoon(exclusively_at_night = true) — daytime veto
        }
        if ((world.getTotalWorldTime() / 24000L + 1L) % 128L == 0L) { // R196 :2395
            return true;
        }
        if (!(world instanceof net.minecraft.world.WorldServer)) {
            return false; // client side has no moon backend
        }
        return io.github.etim.etim.mob.ETIMMoonState.phase((net.minecraft.world.WorldServer) world)
                == io.github.etim.etim.mob.ETIMMoonState.Phase.BLUE;
    }

    /**
     * The clock→lightning→skill→fortune→worm cascade chain (the parameterized
     * single point; the /etest fishgate token drives THIS face, so the
     * real-hook path and the probe arm can never drift apart).
     *
     * @return {ci0, ci1, ci2, ci3, ci4}
     */
    public static int[] cascadeChain(World world, int adj, int fortune, int lure,
                                     boolean worm, boolean light, boolean blueMoon) {
        int dist = Math.min(Math.abs(adj - 5500), Math.abs(adj - 17500));
        float timeFactor = dist / 600.0F;
        int ci0 = blueMoon
                ? MathHelper.clamp(600, ETIMConfig.fishingBiteChanceMin, ETIMConfig.fishingBiteChanceMax)
                : MathHelper.clamp((int) (600.0F * timeFactor),
                        ETIMConfig.fishingBiteChanceMin, ETIMConfig.fishingBiteChanceMax);
        int ci1 = light ? ci0 / 2 : ci0;
        int ci2 = ci1; // D-3 甲: the skill face is OFF (条 270)
        int ci3 = ci2;
        for (int i = 0; i < fortune + lure; i++) {
            ci3 = (int) (ci3 * ETIMConfig.fishingFortuneBiteFactor);
        }
        int ci4 = worm ? (int) (ci3 * ETIMConfig.fishingWormBiteFactor) : ci3;
        ci4 = Math.max(ci4, 1); // crash face-guard (zero-roll nextInt face)
        return new int[]{ci0, ci1, ci2, ci3, ci4};
    }

    /** The catch/roll RNG face: the ANGLER's own stream (LivingBase getRNG face —
     *  the R196 uses the bobber entity's own rand via {@code this.rand}, whose
     *  MCP stable-39 name is AMBIGUOUS across six vanilla {@code rand} fields and
     *  therefore un-shadowable; the distribution face is identical — C 基差注记,
     *  entry 272). */
    public static java.util.Random hookRng(EntityFishHook hook, net.minecraft.entity.EntityLivingBase fallback) {
        return fallback != null ? fallback.getRNG() : new java.util.Random();
    }

    /**
     * Nine-segment R196 bite drive (called from the mixin every server tick
     * the hook is in water, replacing {@code catchingFish} WHOLE). The RNG
     * face rides the angler's own stream (C 基差注记, entry 272).
     *
     * @param catchable  the current {@code ticksCatchable} shadow value
     * @param angler     the shadowed private angler
     * @return the NEW catchable value when the tick is consumed (>= 0, and
     *         the whole vanilla body is cancelled), or -1 to let vanilla run
     *         (fishingSystem off / wrong side).
     */
    public static int tickBite(EntityFishHook hook, EntityPlayer angler, int catchable) {
        if (!ETIMConfig.fishingSystem || hook.world.isRemote) {
            return -1;
        }
        Random rnd = hookRng(hook, angler);

        // R196 :331-333 — window first (decrement face), no gate roll inside.
        if (catchable > 0) {
            int next = catchable - 1;
            row("window ticks=" + next);
            return next;
        }

        // :136-139 water at the hook (y-0.2) + air above.
        int x = MathHelper.floor(hook.posX);
        int y = MathHelper.floor(hook.posY - 0.2F);
        int z = MathHelper.floor(hook.posZ);
        BlockPos hookPos = new BlockPos(x, y, z);
        if (!fullWater(hook.world, hookPos) || !hook.world.isAirBlock(hookPos.up())) {
            return catchable; // consumed, no RNG spend (gate short-circuits before :140)
        }

        // :140-142 ONE-RANDOM-NEIGHBOR probe (spend order dx → dy → dz).
        int dx = rnd.nextInt(7) - 3;
        int dy = -rnd.nextInt(4);
        int dz = rnd.nextInt(7) - 3;
        BlockPos fishPos = new BlockPos(x + dx, y + dy, z + dz);
        if (!fishInhabited(hook.world, fishPos)) {
            return catchable;
        }

        // :147-151 line of physical reach.
        if (!lineOfReach(hook.world, hookPos, fishPos)) {
            return catchable;
        }

        // :153-158 clock (float32 chain intact — A-2) + blue moon (A-3 night face) + lightning.
        int adj = adjustedTime(hook.world);
        int dist = Math.min(Math.abs(adj - 5500), Math.abs(adj - 17500));
        boolean blueMoon = blueMoonNight(hook.world);
        boolean light = hook.world.isRainingAt(hookPos.up()) && hook.world.isThundering();

        int fortune = level(angler, ETIMEnchantments.FISHING_FORTUNE);
        int lure = ETIMConfig.vanillaLureActive ? level(angler, net.minecraft.init.Enchantments.LURE) : 0;
        boolean worm = hasWormInHotbar(angler);
        int[] ci = cascadeChain(hook.world, adj, fortune, lure, worm, light, blueMoon);

        // :174 the roll.
        int roll = rnd.nextInt(ci[4]);
        boolean bite = roll == 0;
        int newCatchable = catchable;
        if (bite) {
            int span = ETIMConfig.fishingBiteWindowMax - ETIMConfig.fishingBiteWindowMin + 1;
            newCatchable = ETIMConfig.fishingBiteWindowMin + rnd.nextInt(Math.max(span, 1)); // 30..59 (R196 :334-335)
            hook.motionY -= 0.2F; // R196 :336
            hook.playSound(splashEvent(), 0.25F, 1.0F + (rnd.nextFloat() - rnd.nextFloat()) * 0.4F); // :337
            if (hook.world instanceof net.minecraft.world.WorldServer) {
                net.minecraft.world.WorldServer ws = (net.minecraft.world.WorldServer) hook.world;
                double waterY = hook.getEntityBoundingBox().minY;
                for (int n = 0; n < 1.0F + hook.width * 20.0F; n++) { // :340-362 bubbles + splash
                    ws.spawnParticle(EnumParticleTypes.WATER_BUBBLE,
                            hook.posX + (rnd.nextFloat() * 2.0F - 1.0F) * hook.width,
                            MathHelper.floor(waterY) + 1.0D,
                            hook.posZ + (rnd.nextFloat() * 2.0F - 1.0F) * hook.width,
                            hook.motionX, hook.motionY - rnd.nextFloat() * 0.2F, hook.motionZ);
                    ws.spawnParticle(EnumParticleTypes.WATER_SPLASH,
                            hook.posX + (rnd.nextFloat() * 2.0F - 1.0F) * hook.width,
                            MathHelper.floor(waterY) + 1.0D,
                            hook.posZ + (rnd.nextFloat() * 2.0F - 1.0F) * hook.width,
                            hook.motionX, hook.motionY, hook.motionZ);
                }
            }
            row("gate wt=" + hook.world.getWorldTime() + " adj=" + adj + " dist=" + dist
                    + " blue=" + (blueMoon ? 1 : 0) + " ci0=" + ci[0] + " light=" + (light ? 1 : 0)
                    + " ci2=" + ci[2] + " L=" + fortune + " lure=" + lure + " ci3=" + ci[3]
                    + " worm=" + (worm ? 1 : 0) + " ci4=" + ci[4] + " roll=" + roll + " bite=1");
        }
        return newCatchable;
    }

    private static SoundEvent splashEvent() {
        return net.minecraft.init.SoundEvents.ENTITY_BOBBER_SPLASH;
    }

    /** Integer enchantment level on the held rod (EncharmHelper integer face). */
    public static int level(EntityPlayer angler, Enchantment enchantment) {
        if (angler == null) {
            return 0;
        }
        ItemStack held = angler.getHeldItemMainhand();
        if (held.isEmpty()) {
            return 0;
        }
        return EnchantmentHelper.getEnchantmentLevel(enchantment, held);
    }

    /** R196 :170-172 hotbar bait presence (slot 0..8 only). */
    public static boolean hasWormInHotbar(EntityPlayer angler) {
        return hotbarWorm(angler) >= 0;
    }

    /** R196 :479-482 consume one bait from the HOTBAR (slot 0..8, one per catch). */
    public static boolean consumeWorm(EntityPlayer angler) {
        int slot = hotbarWorm(angler);
        if (slot < 0) {
            return false;
        }
        angler.inventory.decrStackSize(slot, 1);
        return true;
    }

    private static int hotbarWorm(EntityPlayer angler) {
        for (int slot = 0; slot < 9; slot++) {
            if (angler.inventory.getStackInSlot(slot).getItem() == ETIMFishingItems.wormRaw) {
                return slot;
            }
        }
        return -1;
    }

    // ------------------------------------------------------------ fish type

    /** Hook-pos wrapper of the fish-type face (catch face read of the stashed stream). */
    public static ItemStack rollFishType(EntityFishHook hook) {
        return rollFishType(hook.world, hookRng(hook, hook.getAngler()),
                new BlockPos(hook.posX, hook.posY - 0.2F, hook.posZ));
    }

    /** World-level core of the fish-type face (the fishprobe token drives it positionally). */
    public static ItemStack rollFishType(World world, Random rnd, BlockPos hookPos) {
        if (rnd.nextFloat() < 1.0F - ETIMConfig.fishingLargeFishChance) { // :415 (0.8 face; cfg key row 14)
            return cod();
        }
        BlockPos p = hookPos;
        if (!(world.getBiome(p) instanceof BiomeOcean)) { // :419-424
            return cod();
        }
        int radius = ETIMConfig.fishingCleanScanRadius; // R196 :426-428 (16)
        for (int dxdz = -radius; dxdz <= radius; dxdz++) {
            for (int dz = -radius; dz <= radius; dz++) {
                for (int dy = -3; dy <= 0; dy++) {
                    IBlockState state = world.getBlockState(p.add(dxdz, dy, dz));
                    if (state.getBlock() == net.minecraft.init.Blocks.DIRT
                            || state.getBlock() == net.minecraft.init.Blocks.GRASS
                            || state.getBlock() == net.minecraft.init.Blocks.SAND) { // :430
                        return cod();
                    }
                }
            }
        }
        return salmon(); // :437
    }

    public static ItemStack cod() {
        return new ItemStack(Items.FISH, 1, 0);
    }

    public static ItemStack salmon() {
        return new ItemStack(Items.FISH, 1, 1);
    }

    // ------------------------------------------------------------ cast gate

    /** R196 EntityPlayer:2859-2871 canCastFishingRod. */
    public static boolean canCast(EntityPlayer player) {
        net.minecraft.entity.Entity ridden = player.getRidingEntity();
        if (ridden instanceof net.minecraft.entity.item.EntityBoat) {
            return true;
        }
        if (ridden instanceof net.minecraft.entity.passive.AbstractHorse) { // R196 :2864 EntityHorse family face
            return true;
        }
        if (!player.onGround) {
            return false;
        }
        if (player.isInWater() || player.isInLava()) { // suspended-in-liquid face
            return false;
        }
        BlockPos head = new BlockPos(player.posX, player.posY + player.getEyeHeight(), player.posZ);
        return !player.world.getBlockState(head).getMaterial().isLiquid();
    }

    // ------------------------------------------------------------ arrow recovery

    /** R196 ItemArrow:47-63 — the per-arrowhead recovery baseline (1.12 workalike). */
    public static float recoveryChance(ItemStack ammo) {
        Item item = ammo.getItem();
        if (item instanceof ETIMItemArrow) {
            io.github.etim.etim.metal.ETIMMetals metal = ((ETIMItemArrow) item).etimMetal();
            switch (metal) {
                case COPPER:
                case SILVER:
                    return 0.6F;
                case MITHRIL:
                case ANCIENT_METAL:
                    return 0.8F;
                case ADAMANTIUM:
                    return 0.9F;
                case RUSTED_IRON:
                    return 0.5F;
                case GOLD:
                    return 0.5F;
                default:
                    return 0.3F;
            }
        }
        return 0.3F; // vanilla-style arrow = flint baseline (R196's first material)
    }

    /** The name-keyed face of the same table (the /etest arrowprobe token drives it; W-FF8). */
    public static float recoveryChanceByName(String metalName) {
        switch (metalName) {
            case "copper":
            case "silver":
                return 0.6F;
            case "rusted_iron":
            case "gold":
                return 0.5F;
            case "iron":
                return 0.7F;
            case "obsidian":
                return 0.4F;
            case "mithril":
            case "ancient_metal":
                return 0.8F;
            case "adamantium":
                return 0.9F;
            case "flint":
            default:
                return 0.3F;
        }
    }

    /** The arrow's own ammo face. ETIM arrows carry their item identity
     *  (ETIMEntityArrow.etimItemArrow — the R196 :641 getArrowStack shape);
     *  vanilla arrows bridge to plain Items.ARROW (R196's default arrowhead
     *  face; tipped/spectral metadata is not preserved — C 基差注记, the
     *  1.12 getArrowStack is protected). */
    public static ItemStack ammoOf(EntityArrow arrow) {
        if (arrow instanceof ETIMEntityArrow) {
            return new ItemStack(((ETIMEntityArrow) arrow).etimItemArrow(), 1);
        }
        if (arrow instanceof net.minecraft.entity.projectile.EntitySpectralArrow) {
            return new ItemStack(Items.SPECTRAL_ARROW, 1);
        }
        return new ItemStack(Items.ARROW, 1);
    }
}
