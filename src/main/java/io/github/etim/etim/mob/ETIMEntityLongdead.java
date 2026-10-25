package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMGear;

import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.world.World;

/**
 * R196 {@code EntityLongdead.java:1-53} port (M5-04/05/06 + M7-04).
 *
 * <ul>
 *   <li>attributes (M5-04, :13-19): follow 40 / maxHealth
 *       {@code guardian?24:12} / speed 0.29F / attack {@code guardian?8:6}.
 *       The natural defense face (:45-47) rides the ARMOR attribute as a
 *       +1/+2 approximation (D-8 裁定, logged with the {@code approx} tag —
 *       the 1.12 armor face has no damage-source bypass carrier, B-12).</li>
 *   <li>the constructor's {@code equipmentDropChances[i>0] *= 0.25F} (:7-9)
 *       maps to 1.12 {@code inventoryArmorDropChances} (hands untouched, B-9
 *       双数组面).</li>
 *   <li>equip face (M5-05): type2 → {@code sword_ancient_metal}, type0 → bow
 *       (R196 {@code bowAncientMetal} has no ETIM item, B-8 → D-4 vanilla bow
 *       stands in); four armor slots = the chain ancient pieces, every stack
 *       {@code randomizeForMob(true)} (:27-33) — the dispatch lives in
 *       {@link ETIMMobEquip#skeletonEquip}.</li>
 *   <li>drops (M5-10/M7-03): {@code getLootTable() = null} (B-13 — the 1.12
 *       loot table path would otherwise suppress {@code dropFewItems}) and
 *       the R196 arrow/bone rows verbatim; the type1 (nether) rows are
 *       unreachable (the underworld pool has no nether face).</li>
 *   <li>the volley face is vanilla (A-3/E-3: the damage formula already
 *       matches and the ground arrow is the vanilla ARROW) — this class only
 *       adds the W7 判行.</li>
 * </ul>
 */
public class ETIMEntityLongdead extends EntitySkeleton {

    /** R196 skeletonType 2/0 的 1.12 等价面（AI 由手持物决定）。 */
    protected boolean meleeType;
    /** M5-11 — the spider-jockey ranged handoff (R196 :15-19 do-while type!=0). */
    private boolean jockeyRanged;

    public ETIMEntityLongdead(World world) {
        super(world);
        // R196 :7-9 — armor drop chances ×0.25 (i >= 1 = the armor face only).
        for (int i = 0; i < this.inventoryArmorDropChances.length; i++) {
            this.inventoryArmorDropChances[i] = this.inventoryArmorDropChances[i] * 0.25F;
        }
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :15
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH)
                .setBaseValue(this.isGuardian() ? 24.0D : 12.0D); // :16
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.29D); // :17
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE)
                .setBaseValue(this.isGuardian() ? 8.0D : 6.0D); // :18
        // D-8 裁定 — the natural defense approximation, ARMOR +1/+2 with the
        // [MobLog] approx tag (B-12: no damage-source bypass carrier).
        this.getEntityAttribute(SharedMonsterAttributes.ARMOR)
                .setBaseValue(this.isGuardian() ? 2.0D : 1.0D);
        ETIMMobEquip.mobLog("longdead attr hp=" + (this.isGuardian() ? 24 : 12)
                + " atk=" + (this.isGuardian() ? 8 : 6) + " spd=0.29 armor=" + (this.isGuardian() ? 2 : 1)
                + " approx (naturalDefense +1/+2)");
    }

    /** R196 :36-38. */
    public boolean isLongdead() {
        return true;
    }

    /** R196 :40-42. */
    public boolean isGuardian() {
        return this instanceof ETIMEntityLongdeadGuardian;
    }

    // R196 :50-52 — XP super×3 / guardian ×5.
    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * (this.isGuardian() ? 5 : 3);
    }

    /** M5-09 — the type roll on the troop face (R196 :209-215, longdead half 0.5). */
    public int rollSkeletonType(World world) {
        if (world.provider.isNether()) {
            return 1; // :210-211
        }
        return this.rand.nextFloat() < 0.5F ? 2 : 0; // :213 (isLongdead half)
    }

    // ------------------- M5-11 jockey handoff -------------------

    /** MixinEntitySpiderJockey — force the type 0 (bow) face. */
    public void setJockeyRanged(boolean jockeyRanged) {
        this.jockeyRanged = jockeyRanged;
    }

    public boolean isJockeyRanged() {
        return this.jockeyRanged;
    }

    // ------------------- equip state (set by ETIMMobEquip.longdeadEquip) -------------------

    public boolean isMeleeType() {
        return this.meleeType;
    }

    public void setMeleeType(boolean meleeType) {
        this.meleeType = meleeType;
    }

    // ------------------- M5-10 / M7-03 drops (R196 :149-187) -------------------

    @Override
    protected net.minecraft.util.ResourceLocation getLootTable() {
        // B-13: with a loot table present, 1.12 never runs dropFewItems —
        // the R196 row set rides dropFewItems instead.
        return null;
    }

    @Override
    protected void dropFewItems(boolean recentlyHitByPlayer, int looting) {
        // R196 :151-163 (type1 nether face) unreachable — no nether face in the pool.
        // R196 :164-177 — type2 (melee) carries no arrow row; type0 does.
        int arrows = 0;
        if (!this.meleeType) {
            int numDrops = this.rand.nextInt(2 + looting); // :165
            if (numDrops > 0 && !recentlyHitByPlayer) {
                numDrops -= this.rand.nextInt(numDrops + 1); // :166-168
            }

            if (numDrops > 0) {
                numDrops = this.rand.nextInt(3) == 0 ? 1 : 0; // :170-172 — the longdead 1/3 face
            }

            for (int i = 0; i < numDrops; i++) {
                this.dropItem(ETIMGear.gear("arrow_ancient_metal"), 1); // :175
            }
            arrows = numDrops;
        }

        // :179-186 — the bone row, both types.
        int numBones = this.rand.nextInt(3);
        if (numBones > 0 && !recentlyHitByPlayer) {
            numBones -= this.rand.nextInt(numBones + 1); // :180-182
        }

        for (int i = 0; i < numBones; i++) {
            this.dropItem(Items.BONE, 1); // :185
        }

        ETIMMobEquip.mobLog("longdead drop arrows=" + arrows + " bones=" + numBones
                + " hitByPlayer=" + recentlyHitByPlayer
                + " entity=" + this.getName());
    }

    // ------------------- W7 — the volley 判行 (A-3/E-3: vanilla arrow face) -------------------

    @Override
    public void attackEntityWithRangedAttack(net.minecraft.entity.EntityLivingBase target, float distanceFactor) {
        super.attackEntityWithRangedAttack(target, distanceFactor);
        // E-3: the ground arrow is vanilla Items.ARROW (EntityTippedArrow
        // default potion EMPTY); the damage formula already matches (A-3).
        ETIMMobEquip.mobLog("longdead arrow intended=arrow_ancient_metal factor="
                + Math.round(distanceFactor * 100.0F) / 100.0F);
    }
}
