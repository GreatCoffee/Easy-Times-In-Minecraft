package io.github.etim.etim.mob;

import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.init.Blocks;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.entity.IEntityLivingData;
import net.minecraft.item.ItemStack;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.World;

import javax.annotation.Nullable;
import java.util.Calendar;

/**
 * R196 {@code EntityRevenant} port (EntityRevenant.java :1-71, one-hand).
 * Registered as {@code etim.revenant} (id 5, {@link ETIMMobEntities}); the
 * R196 RenderManager :56 reuse of RenderZombie maps to the vanilla
 * RenderZombie factory ({@code ETIMMobRender}).
 *
 * <p>Judged faces (批文 §1.1): follow 40 / speed 0.26F (终审 item 1 =
 * same-scale transcription, B-1 unlocked) / attack 7.0 / hp 30.0 /
 * spawn-reinforcements base rand×0.1F (终审 A-M1: field_110186_bp =
 * {@code zombie.spawnReinforcements}, NOT knockback) / XP super×3 (:63-65)
 * / always smart (:35 → {@link ETIMDigging#isSmart}) / gear via the
 * {@link ETIMMobEquip} zombie dispatch (B-M1 instanceof branch → the
 * constant full rusted-iron table :22-44, no chance gate) / per-chunk cap 1
 * (:68-70, rides the ETIMSpawnCycle per-class face).</p>
 *
 * <p>No-GroupData face (A-M2, T10 蓝本覆写法): R196 :284 gates the zombie
 * group-data face with {@code !isRevenant()} — the revenant never rolls
 * child/chicken-jockey. The 1.12 GroupData type is package-private, so a
 * Mixin redirect cannot signature it; the override below is the frozen
 * 1.12 body (EntityLiving :1282-1296 + EntityZombie :495-536) minus the
 * GroupData branch — semantics identical, no vanilla hooks dropped (the
 * EntityLiving body carries no Forge face).</p>
 */
public class ETIMEntityRevenant extends EntityZombie {

    public ETIMEntityRevenant(World world) {
        super(world);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.26D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(7.0D);
        // R196 :17 field_110186_bp — the spawn-reinforcements attribute (A-M1).
        this.getEntityAttribute(EntityZombie.SPAWN_REINFORCEMENTS_CHANCE)
                .setBaseValue(this.rand.nextDouble() * 0.1F);
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(30.0D);
    }

    /**
     * The frozen 1.12 onInitialSpawn body minus the GroupData face (A-M2 —
     * see the class javadoc). The equip calls flow into the
     * {@code MixinEntityZombie} HEAD takeover → {@link ETIMMobEquip#zombieEquip}.
     */
    @Override
    @Nullable
    public IEntityLivingData onInitialSpawn(DifficultyInstance difficulty, @Nullable IEntityLivingData livingdata) {
        // EntityLiving :1282-1296 (no Forge face inside).
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).applyModifier(
                new net.minecraft.entity.ai.attributes.AttributeModifier(
                        "Random spawn bonus", this.rand.nextGaussian() * 0.05D, 1));
        this.setLeftHanded(this.rand.nextFloat() < 0.05F);

        // EntityZombie :495-536 minus the GroupData branch.
        float f = difficulty.getClampedAdditionalDifficulty();
        this.setCanPickUpLoot(this.rand.nextFloat() < 0.55F * f);

        this.setBreakDoorsAItask(this.rand.nextFloat() < f * 0.1F);
        this.setEquipmentBasedOnDifficulty(difficulty);
        this.setEnchantmentBasedOnDifficulty(difficulty);

        if (this.getItemStackFromSlot(EntityEquipmentSlot.HEAD).isEmpty()) {
            Calendar calendar = this.world.getCurrentDate();
            if (calendar.get(2) + 1 == 10 && calendar.get(5) == 31 && this.rand.nextFloat() < 0.25F) {
                this.setItemStackToSlot(EntityEquipmentSlot.HEAD,
                        new ItemStack(this.rand.nextFloat() < 0.1F ? Blocks.LIT_PUMPKIN : Blocks.PUMPKIN));
                this.inventoryArmorDropChances[EntityEquipmentSlot.HEAD.getIndex()] = 0.0F;
            }
        }

        this.getEntityAttribute(SharedMonsterAttributes.KNOCKBACK_RESISTANCE).applyModifier(
                new net.minecraft.entity.ai.attributes.AttributeModifier(
                        "Random spawn bonus", this.rand.nextDouble() * 0.05000000074505806D, 0));
        double d0 = this.rand.nextDouble() * 1.5D * (double) f;
        if (d0 > 1.0D) {
            this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).applyModifier(
                    new net.minecraft.entity.ai.attributes.AttributeModifier(
                            "Random zombie-spawn bonus", d0, 2));
        }
        if (this.rand.nextFloat() < f * 0.05F) {
            this.getEntityAttribute(EntityZombie.SPAWN_REINFORCEMENTS_CHANCE).applyModifier(
                    new net.minecraft.entity.ai.attributes.AttributeModifier(
                            "Leader zombie bonus", this.rand.nextDouble() * 0.25D + 0.5D, 0));
            this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).applyModifier(
                    new net.minecraft.entity.ai.attributes.AttributeModifier(
                            "Leader zombie bonus", this.rand.nextDouble() * 3.0D + 1.0D, 2));
            this.setBreakDoorsAItask(true);
        }
        return livingdata;
    }

    // R196 :63-65 getExperienceValue super×3 — 1.12 death-XP face.
    @Override
    protected int getExperiencePoints(net.minecraft.entity.player.EntityPlayer player) {
        return super.getExperiencePoints(player) * 3;
    }
}
