package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.BlockCauldron;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.List;
import java.util.WeakHashMap;

/**
 * Stage 5 slice 2 v1 (audit 11 §2.2, A-grade): the 100-tick wellness update
 * of the R196 {@code EntityLivestock} base class, transcribed onto the
 * vanilla livestock family (cow / sheep / pig / chicken) through the
 * {@code etim:livestock} NBT capability.
 *
 * <p>Verbatim R196 rules (EntityLivestock.java):</p>
 * <ul>
 *   <li>{@code onLivingUpdate :245-251} — every 100 ticks, gated by a
 *       9-in-10 random roll: {@code updateWellness()} runs, then (later
 *       slice) the production counter gates on wellness; the wellness
 *       pass itself runs at the 9/10 gate.</li>
 *   <li>{@code updateWellness :215-239} — benefit {@code +0.1}, penalty
 *       {@code -0.005}; food from nearby grass blocks (the cow also rolls a
 *       1% destruction of a found grass block, eaten, no drops); water from
 *       a nearby open water/snow source or the rain fallback
 *       {@code +0.1/10}; freedom when not crowded.</li>
 *   <li>{@code isNearFood :162-180} — the 3 x (−1..floor(height)) x 3 cell
 *       scan around the feet for grass / tall grass.</li>
 *   <li>{@code isNearWaterSource :182-200} — the same scan shape; water
 *       still/flowing, both snow forms, or a cauldron with water above
 *       level 0 whose top sits below the eye line, and NOT covered by a
 *       block with a flat solid bottom face.</li>
 *   <li>{@code isCrowded :202-213} — NOT outdoors, or more than 2 entities
 *       (self included) inside the box grown by (2, 0.5, 2).</li>
 * </ul>
 *
 * <p>v1 deliberately leaves out (queued v2): the production counter and
 * {@code produceGoods} (milk / wool / feather / egg goods), the manure
 * countdown, Block.onTrampledBy and the startle/memory fields, and the
 * client data-watcher mirror (no consumer until production). The v1
 * judgment surface is the [AILog] state-flip lines only.</p>
 */
public final class ETIMLivestockEvents {

    /** auth R196 :216-217 — the wellness benefit/penalty pair. */
    private static final float BENEFIT = 0.1F;
    private static final float PENALTY = -0.005F;
    /** R196 :218 — the cow's grass-eating destruction chance. */
    private static final float COW_DESTROY_CHANCE = 0.01F;

    /**
     * [AILog] dedup: one line per (entity, welfare-glyph) state flip — the
     * 100-tick cadence would otherwise emit a steady hum for every penned
     * animal. Server-only events, so the dual-end lesson needs no key work.
     */
    private static final WeakHashMap<EntityLivingBase, String> LAST = new WeakHashMap<>();

    /** Registers the attach + tick handlers (call from mod preInit, once). */
    public static void register() {
        MinecraftForge.EVENT_BUS.register(ETIMLivestockEvents.class);
    }

    @SubscribeEvent
    public static void onAttachCapabilities(AttachCapabilitiesEvent<Entity> event) {
        Entity e = event.getObject();
        if (e instanceof EntityCow || e instanceof EntitySheep
                || e instanceof EntityPig || e instanceof EntityChicken) {
            event.addCapability(ETIMLivestock.CAPABILITY_KEY, new ETIMLivestock.Provider());
        }
    }

    @SubscribeEvent
    public static void onLivingUpdate(LivingEvent.LivingUpdateEvent event) {
        if (event.getEntityLiving().world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return;
        }
        EntityLivingBase e = event.getEntityLiving();
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return;
        }
        if (!s.isInitialized()) {
            // R196 ctor :26-28 — 0.8 + rand * 0.2 per need, at construction
            java.util.Random rand = e.getRNG();
            s.setFood(0.8F + rand.nextFloat() * 0.2F);
            s.setWater(0.8F + rand.nextFloat() * 0.2F);
            s.setFreedom(0.8F + rand.nextFloat() * 0.2F);
            s.setInitialized(true);
        }
        if (e.ticksExisted % 100 == 0 && e.getRNG().nextInt(10) > 0) {
            updateWellness(e, s, e instanceof EntityCow);
        }
        // value trace (run27 C3/C4/C5 判据面): one full-readout row per
        // ~60 s of entity age, gated per entity — the glyph-flip dedup hides
        // the absolute values between flips, and C4 needs rain-vs-dry
        // trajectories (the C4B window read zero rows because nothing flipped)
        if (e.ticksExisted % 1200 == 0 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] livestock-value food=" + String.format("%.2f", s.getFood())
                    + String.format(" water=%.2f", s.getWater())
                    + String.format(" freedom=%.2f", s.getFreedom())
                    + " age=" + e.ticksExisted
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        }
    }

    private static final java.util.Map<EntityLivingBase, Long> RAIN_TRACE =
            new java.util.WeakHashMap<EntityLivingBase, Long>();

    /** R196 updateWellness :215-239 — the benefit/penalty pass. */
    private static void updateWellness(EntityLivingBase e, ETIMLivestock.IState s, boolean cow) {
        World w = e.world;
        // C4-d instrument (run27 2026-10-13): one row per entity per ~2 s on
        // each updateWellness pass — names the verdict inputs directly
        // (nearWater / rainingAt per-block / global isRaining) so the
        // roof-vs-rain fork (C4C window: the roofed cow held water=1.00
        // against expectations) reads from the log instead of inference.
        if (ETIMConfig.mobDebugLog) {
            Long last = RAIN_TRACE.get(e);
            if (last == null || System.currentTimeMillis() - last >= 2000) {
                RAIN_TRACE.put(e, System.currentTimeMillis());
                ETIM.LOGGER.info("[AILog] livestock-raincheck pos=(" + Math.floor(e.posX) + "," + Math.floor(e.posY) + "," + Math.floor(e.posZ)
                        + ") nearWater=" + isNearWaterSource(w, e)
                        + " rainingAt=" + w.isRainingAt(new net.minecraft.util.math.BlockPos(e.posX, e.posY, e.posZ))
                        + " isRaining=" + w.isRaining()
                        + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
            }
        }
        if (isNearFood(w, e, cow ? COW_DESTROY_CHANCE : 0.0F)) {
            s.setFood(s.getFood() + BENEFIT);
        } else {
            s.setFood(s.getFood() + PENALTY);
        }
        if (isNearWaterSource(w, e)) {
            s.setWater(s.getWater() + BENEFIT);
        } else if (w.isRainingAt(new BlockPos(e.posX, e.posY, e.posZ))) {
            s.setWater(s.getWater() + BENEFIT / 10.0F);
        } else {
            s.setWater(s.getWater() + PENALTY);
        }
        if (!isCrowded(w, e)) {
            s.setFreedom(s.getFreedom() + BENEFIT);
        } else {
            s.setFreedom(s.getFreedom() + PENALTY);
        }
        logStateFlip(e, s);
    }

    // ------------------------------------------------------------------ scans

    /**
     * R196 isNearFood :162-180 — the 3 x (−1..floor(height)) x 3 scan for
     * grass / tall grass; the destroy roll happens WHEN a block is found
     * (MITE :169) and eats it without drops ({@code destroyBlock(info,false)}).
     */
    private static boolean isNearFood(World w, EntityLivingBase e, float destroyChance) {
        int bx = MathHelper.floor(e.posX);
        int by = MathHelper.floor(e.posY);
        int bz = MathHelper.floor(e.posZ);
        int top = MathHelper.floor(e.height);
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= top; dy++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = new BlockPos(bx + dx, by + dy, bz + dz);
                    IBlockState state = w.getBlockState(pos);
                    if (state.getBlock() != Blocks.GRASS && state.getBlock() != Blocks.TALLGRASS) {
                        continue;
                    }
                    if (destroyChance > 0.0F && e.getRNG().nextFloat() < destroyChance) {
                        w.destroyBlock(pos, false);
                        if (ETIMConfig.mobDebugLog) {
                            ETIM.LOGGER.info("[AILog] livestock ate grass at " + pos
                                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * R196 isNearWaterSource :182-200. 1.12 mapping: WATER (still+flowing
     * states of one block), SNOW_LAYER + SNOW (the two MITE snow forms), or
     * CAULDRON with LEVEL > 0 and the water surface below the eye line;
     * the {@code isBlockFaceFlatAndSolid(above, BOTTOM)} cover test maps to
     * {@code isSideSolid(world, up, DOWN)}.
     */
    private static boolean isNearWaterSource(World w, EntityLivingBase e) {
        int bx = MathHelper.floor(e.posX);
        int by = MathHelper.floor(e.posY);
        int bz = MathHelper.floor(e.posZ);
        int top = MathHelper.floor(e.height);
        double eyeY = e.posY + e.getEyeHeight();
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= top; dy++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = new BlockPos(bx + dx, by + dy, bz + dz);
                    IBlockState state = w.getBlockState(pos);
                    if (!isWaterBlock(state, pos, eyeY)) {
                        continue;
                    }
                    BlockPos up = pos.up();
                    if (w.getBlockState(up).isSideSolid(w, up, EnumFacing.DOWN)) {
                        continue; // covered — MITE isBlockFaceFlatAndSolid tops it out
                    }
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean isWaterBlock(IBlockState state, BlockPos pos, double eyeY) {
        if (state.getBlock() == Blocks.WATER
                || state.getBlock() == Blocks.SNOW_LAYER
                || state.getBlock() == Blocks.SNOW) {
            return true;
        }
        if (state.getBlock() == Blocks.CAULDRON
                && pos.getY() + 1 < eyeY
                && state.getValue(BlockCauldron.LEVEL) > 0) {
            return true;
        }
        return false;
    }

    /**
     * R196 isCrowded :202-213 — NOT outdoors (sky access), or more than 2
     * living entities (self included) in the box grown by (2, 0.5, 2).
     */
    private static boolean isCrowded(World w, EntityLivingBase e) {
        if (!w.canSeeSky(e.getPosition())) {
            return true;
        }
        AxisAlignedBB box = e.getEntityBoundingBox().grow(2.0, 0.5, 2.0);
        List<EntityLiving> neighbors = w.getEntitiesWithinAABB(EntityLiving.class, box);
        return neighbors.size() > 2;
    }

    // ------------------------------------------------------------------ logging

    /** [AILog] state flip — the welfare glyph changes at most per 100 ticks. */
    private static void logStateFlip(EntityLivingBase e, ETIMLivestock.IState s) {
        float min = Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater()));
        StringBuilder glyph = new StringBuilder(min >= 0.25F ? "well" : "unwell");
        if (s.getWater() < 0.5F) glyph.append("|thirsty");
        else if (s.getWater() < 0.25F) glyph.append("|thirsty-very");
        if (s.getWater() < 0.05F) glyph.append("|thirsty-desperate");
        if (s.getFood() < 0.5F) glyph.append("|hungry");
        else if (s.getFood() < 0.25F) glyph.append("|hungry-very");
        if (s.getFood() < 0.05F) glyph.append("|hungry-desperate");
        String prev = LAST.get(e);
        if (glyph.toString().equals(prev)) {
            return;
        }
        LAST.put(e, glyph.toString());
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        boolean isChild = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
        boolean server = Thread.currentThread().getName().contains("Server");
        ETIM.LOGGER.info("[AILog] livestock " + glyph
                + " food=" + String.format("%.2f", s.getFood())
                + " water=" + String.format("%.2f", s.getWater())
                + " freedom=" + String.format("%.2f", s.getFreedom())
                + (isChild ? " child=true" : "")
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId()
                + (server ? " [server]" : " [client]"));
    }
}
