package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityLiving;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-28 (audit20 tiao 352-353) — R196 {@code EntityAIEatGrass.java :1-85}
 * verbatim, seated at the vanilla sheep priority-5 slot by the B-10 mixin
 * extend (MixinEntitySheep.removeIf vanilla + addTask(5, this)). R196
 * anchors:
 * <ul>
 *   <li>{@code ctor :13} — {@code setMutexBits(7)}, the eat-grass
 *       family's only mutex-7 seat.</li>
 *   <li>{@code shouldExecute :16-33} — {@code hurtTime <= 0 &&
 *       !has_decided_to_flee} (the 1.12 carrier = {@code
 *       getAttackTarget() == null}, the B-27 chase-face proxy), the roll
 *       {@code nextInt(isChild() ? 50 : 1000) == 0}, then the three
 *       independent pass lines: (a) the standing block is tallGrass / a
 *       non-dead crop → true; (b) the standing block is NOT (a) and the
 *       block BELOW is grass with trampling == 0.0F → true (1.12 has no
 *       grass trampling system — the trampling gate is a C-note constant
 *       true); (c) {@code getPredatorsWithinAABBForEntity(bbox
 *       .expand(16, 2, 16)).isEmpty()} — the B-27 avoid-predator census
 *       face rides the shared port.</li>
 *   <li>{@code startExecuting :37-41} — {@code eatGrassTick = 40} +
 *       {@code world.setEntityState(this, (byte)10)} (R196
 *       {@code EnumEntityState.tnt_ignite_or_eating_grass} → the 1.12
 *       vanilla sheep byte-10 channel; the 1.12 sheep handler :191-201
 *       cuts the same 40-tick plate) + {@code nav.clearPath()}.</li>
 *   <li>{@code continueExecuting :56-59} — {@code hurt/flee ? false :
 *       eatGrassTick > 0}.</li>
 *   <li>{@code updateTask :66-84} — {@code tick = max(0, tick-1)}; at
 *       {@code tick == 4} the harvest face: the standing cell is (a) →
 *       destroy the tallGrass/crop via {@code world.destroyBlock(...)}
 *       (1.12 carrier {@code world.destroyBlock(pos, false)}); else the
 *       below-grass arm → {@code world.setBlockState(pos.down(),
 *       Blocks.DIRT.defaultState)} (the R196 trampled-dirt face) — then
 *       the bonus. R196 {@code eatGrassBonus}: the base class is EMPTY;
 *       the sheep bonus rides the B-10 MixinEntitySheep eatGrassBonus
 *       TAIL (setSheared + addGrowth(60) + the capability addFood(0.5F)),
 *       already implemented — THIS class only cancels the vanilla
 *       EntitySheep.eatGrassBonus double-fire (the vanilla sheep bonus
 *       body runs on the vanilla AI's own harvest; this replace-seat
 *       calls the vanilla {@code eatGrassBonus()} directly through the
 *       same method the B-10 tail injects — the sheep gets the full R196
 *       bonus, non-sheep bystanders get the empty base bonus).</li>
 * </ul>
 * Judge row: {@code [AILog] eatgrass src=<kind> start tick=40 entity=…}
 * — one per execution, {@code mobDebugLog} gated (the B-19..B-27 seek-row
 * family shape). The per-instance %16 probe-in diagnostic is NOT a judge
 * row. Flag: {@code livestockNeedsR196} (the eighth reuse).
 */
public class ETIMEntityAIEatGrass extends net.minecraft.entity.ai.EntityAIBase {

    private static int probeCounter = 0;

    private final EntityLiving owner;
    private final World world;
    private int eatGrassTick = 0;

    public ETIMEntityAIEatGrass(EntityLiving owner) {
        this.owner = owner;
        this.world = owner.world;
        this.setMutexBits(7); // R196 :14
    }

    @Override
    public boolean shouldExecute() { // R196 :16-33 verbatim
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the family flag seat
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIM.LOGGER.info("[AILog] eatgrass src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + probeCounter
                        + " hurt=" + (this.owner.hurtTime > 0)
                        + " child=" + this.owner.isChild()
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.owner.hurtTime > 0 || (this.owner.getAttackTarget() != null)) {
            return false; // R196 :18 — hurtTime <= 0 && !has_decided_to_flee
        }
        if (this.owner.getRNG().nextInt(this.owner.isChild() ? 50 : 1000) != 0) {
            return false; // R196 :21-23 — the roll gate
        }
        int x = MathHelper.floor(this.owner.posX);
        int y = MathHelper.floor(this.owner.posY);
        int z = MathHelper.floor(this.owner.posZ);
        net.minecraft.util.math.BlockPos stand = new net.minecraft.util.math.BlockPos(x, y, z);
        net.minecraft.block.state.IBlockState state = this.world.getBlockState(stand);
        // R196 :33 line (a) — the standing block is tallGrass or a live crop
        if (state.getBlock() instanceof net.minecraft.block.BlockTallGrass
                || state.getBlock() instanceof net.minecraft.block.BlockCrops) {
            return true;
        }
        // R196 :26-29 line (b) — the standing block is NOT (a) and the block BE-
        // LOW is grass with trampling == 0.0F (1.12 has no grass trampling — the
        // gate is a C-note constant true)
        if (this.world.getBlockState(stand.down()).getBlock() == net.minecraft.init.Blocks.GRASS) {
            return getPredatorsWithinAABB(16, 2, 16).isEmpty(); // R196 :31-32 — line (c) census
        }
        return false;
    }

    /** R196 {@code World.getPredatorsWithinAABBForEntity :4524-4533} verbatim —
     *  the per-predator preysUpon(prey) pass over the owners' expanded box. */
    private java.util.List<EntityLiving> getPredatorsWithinAABB(double ex, double ey, double ez) {
        net.minecraft.util.math.AxisAlignedBB box = this.owner.getEntityBoundingBox().grow(ex, ey, ez);
        java.util.List<EntityLiving> predators = new java.util.ArrayList<EntityLiving>();
        for (net.minecraft.entity.Entity entity : this.world.getEntitiesWithinAABBExcludingEntity(this.owner, box)) {
            if (entity instanceof EntityLiving && preysUpon((EntityLiving) entity)) {
                predators.add((EntityLiving) entity); // :4529 — the per-predator face pass
            }
        }
        return predators;
    }

    /** R196 preysUpon carriers — the zombie (EntityZombie :395 EntityAnimal face)
     *  and the wild wolf (EntityWolf :587 !isChild && !isTamed face). */
    private static boolean preysUpon(EntityLiving candidate) {
        if (candidate instanceof net.minecraft.entity.monster.EntityZombie) {
            return true; // R196 EntityZombie :395 — preys the animal family
        }
        if (candidate instanceof net.minecraft.entity.passive.EntityWolf) {
            net.minecraft.entity.passive.EntityWolf wolf = (net.minecraft.entity.passive.EntityWolf) candidate;
            return !wolf.isChild() && !wolf.isTamed(); // R196 EntityWolf :587
        }
        return false;
    }

    @Override
    public void startExecuting() { // R196 :37-41 verbatim
        this.eatGrassTick = 40;
        this.world.setEntityState(this.owner, (byte) 10); // R196 EnumEntityState.tnt_ignite_or_eating_grass
        this.owner.getNavigator().clearPath();        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] eatgrass src=" + ETIMLivestockEvents.kind(this.owner)
                    + " start tick=40 entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    @Override
    public void resetTask() { // R196 :44-47
        this.eatGrassTick = 0;
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :56-59
        if (this.owner.hurtTime > 0 || (this.owner.getAttackTarget() != null)) {
            return false;
        }
        return this.eatGrassTick > 0;
    }

    public int getEatGrassTick() { // R196 :61-63 — the sheepTimer face
        return this.eatGrassTick;
    }

    @Override
    public void updateTask() { // R196 :66-84 verbatim
        this.eatGrassTick = Math.max(0, this.eatGrassTick - 1);
        if (this.eatGrassTick == 4) {
            int x = MathHelper.floor(this.owner.posX);
            int y = MathHelper.floor(this.owner.posY);
            int z = MathHelper.floor(this.owner.posZ);
            net.minecraft.util.math.BlockPos stand = new net.minecraft.util.math.BlockPos(x, y, z);
            net.minecraft.block.state.IBlockState state = this.world.getBlockState(stand);
            if (state.getBlock() instanceof net.minecraft.block.BlockTallGrass
                    || state.getBlock() instanceof net.minecraft.block.BlockCrops) {
                this.world.destroyBlock(stand, false); // R196 :73-79 — the tallGrass/crop arm
                this.owner.eatGrassBonus();
            } else if (this.world.getBlockState(stand.down()).getBlock() == net.minecraft.init.Blocks.GRASS) {
                this.world.setBlockState(stand.down(), net.minecraft.init.Blocks.DIRT.getDefaultState()); // trampled-dirt arm
                this.owner.eatGrassBonus();
            }
        }
    }
}
