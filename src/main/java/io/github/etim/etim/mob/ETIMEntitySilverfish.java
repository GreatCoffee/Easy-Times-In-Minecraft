package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.monster.EntitySilverfish;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.world.World;

/**
 * R196 {@code EntitySilverfish} 的 1.12 载体基类。
 *
 * <p>R196 一手：{@code setSize(0.3F, 0.7F)}、HP 8、speed 0.6、attack 3、
 * {@code getExperienceValue() = isNormalSilverfish() ? 5 : 10}、
 * {@code preysUpon(Entity) = isTrueAnimal() || entity instanceof EntityVillager}。
 * 1.12 原版银鱼是 0.4x0.3 / HP 8 / speed 0.25 / attack 1，故属性与尺寸全部覆写。</p>
 *
 * <p>原版 1.12 的 {@code AISummonSilverfish} 与 {@code AIHideInStone} 保持不动：
 * R196 的盟友召唤（{@code allySummonCooldown} 扫 ±5/±10/±10 的银鱼块）在 1.12
 * 由这两个任务负责，语义一致。</p>
 */
public class ETIMEntitySilverfish extends EntitySilverfish {

    public ETIMEntitySilverfish(World worldIn) {
        super(worldIn);
        this.setSize(0.3F, 0.7F);
        this.experienceValue = 10;
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(8.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.6D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(3.0D);
    }

    /**
     * R196 追加的猎物目标：动物与村民。原版 1.12 只追玩家。
     * 概率 10（R196 {@code findNonPlayerToAttack} 的最近猎物逻辑近似）。
     */
    @Override
    protected void initEntityAI() {
        super.initEntityAI();
        // R196 银鱼没有「钻进石头」行为（1.12 原版的 AIHideInStone 会把实体变成银鱼块）。
        this.tasks.taskEntries.removeIf(entry -> entry.action.getClass().getSimpleName().contains("AIHideInStone"));
        this.targetTasks.addTask(3, new EntityAINearestAttackableTarget<EntityAnimal>(this, EntityAnimal.class, 10, false, false, null));
        this.targetTasks.addTask(3, new EntityAINearestAttackableTarget<EntityVillager>(this, EntityVillager.class, 10, false, false, null));
    }

    /** R196 {@code preysUpon(Entity)}。 */
    public boolean etimPreysUpon(Entity entity) {
        return entity instanceof EntityAnimal || entity instanceof EntityVillager;
    }

    /**
     * R196 {@code attackEntityAsMob}：命中且真实掉血时，由子类附加药水效果
     * （铜刺 → 中毒 480t I；霜蠹 → 缓慢 50t V）。基类只写判据行。
     */
    @Override
    public boolean attackEntityAsMob(Entity entityIn) {
        float before = entityIn instanceof EntityLivingBase ? ((EntityLivingBase) entityIn).getHealth() : 0.0F;
        boolean hit = super.attackEntityAsMob(entityIn);
        boolean lost = hit && entityIn instanceof EntityLivingBase
                && ((EntityLivingBase) entityIn).getHealth() < before;
        if (lost) {
            this.etimOnBite((EntityLivingBase) entityIn);
        }
        if (hit && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[SilverLog] bite kind={} target={} hit={} lost={} entity={} [server]",
                    this.etimKind(), entityIn.getClass().getSimpleName(), hit, lost, this.getEntityId());
        }
        return hit;
    }

    /** 子类覆写：命中掉血后的药水效果。 */
    protected void etimOnBite(EntityLivingBase target) {
    }

    /** 开发探针：只触发咬击药水面，不做伤害判定（供 /etest silverbite 使用）。 */
    public void etimProbeBite(EntityLivingBase target) {
        this.etimOnBite(target);
    }

    public String etimKind() {
        return "silverfish";
    }

    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[SilverLog] spawn kind={} hp={} max={} attack={} speed={} xp={} clazz={} entity={} [server]",
                    this.etimKind(),
                    fmt(this.getHealth()),
                    fmt(this.getMaxHealth()),
                    fmt(this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue()),
                    fmt(this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue()),
                    this.experienceValue,
                    this.getClass().getSimpleName(),
                    this.getEntityId());
        }
    }

    protected static String fmt(double value) {
        return String.format(java.util.Locale.ROOT, "%.3f", value);
    }
}
