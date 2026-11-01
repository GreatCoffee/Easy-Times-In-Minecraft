package io.github.etim.etim.combat;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemBow;
import net.minecraft.item.ItemStack;
import net.minecraft.potion.Potion;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mob.ETIMArrowLog;

/**
 * R196 poison semantics as a CUSTOM potion (批 enchant1 case A — 条 243/245).
 * Vanilla 1.12 poison runs a 25-tick interval and a {@code health > 1.0F}
 * guard ({@code potion/Potion.java:97-103,175-187}) — copying R196's
 * {@code PotionEffect(POISON, 400, 0)} verbatim would yield 4× the strength
 * AND an unkillable target (摸底 A-1). The user cut for the faithful face:
 * a self-owned potion with R196's internal arithmetic —
 * {@code interval = 100 >> amp} ({@code Potion.java:146-147},
 * {@code getEffectInterval}), 1.0 point per tick with NO health gate
 * ({@code :95-101's regen branch shows the guard is per-potion in 1.12, ours
 * doesn't carry one — poison can kill, as in MITE).
 *
 * <p>Damage source: 1.12 has no poison-borne {@code DamageSource}, MINE's
 * {@code DamageSource.poison} is unblockable ({@code DamageSource.java:20}) —
 * {@code MAGIC} is the closest non-typed face (摸底 C-2: no ETIM poison
 * resistance system, not player-perceptible). PotionType is NOT registered
 * (no brewing entry — the effect rides the {@code PotionEffect} construct
 * only). HUD icon: grid index configurable ({@code poisonPotionIconIndex});
 * the int-id face of 条 245's 词面 has NO 1.12 counterpart (registry name is
 * the key) — id is implied by registration order, C-registered in 条 246.</p>
 */
public final class ETIMPotionPoison extends Potion {

    public static final ETIMPotionPoison INSTANCE = new ETIMPotionPoison();

    private ETIMPotionPoison() {
        super(false, 0x4D7F3D);
        this.setPotionName("effect.etim_poison");
    }

    public static void register() {
        INSTANCE.setRegistryName(new ResourceLocation(Tags.MOD_ID, "etim_poison"));
        ForgeRegistries.POTIONS.register(INSTANCE);
        ETIM.LOGGER.info("[EtimInit] potion {} (batch enchant1 case A)",
                INSTANCE.getRegistryName());
    }

    /** R196 Potion.java:146-147 — poison interval {@code 100 >> amp}. */
    @Override
    public boolean isReady(int duration, int amplifier) {
        int interval = 100 >> amplifier;
        return interval <= 0 || duration % interval == 0;
    }

    /** 1.0 point, NO health gate (the vanilla 1.12 guard is per-potion — ours has none). */
    @Override
    public void performEffect(EntityLivingBase entity, int amplifier) {
        entity.attackEntityFrom(DamageSource.MAGIC, 1.0F);
        if (!entity.world.isRemote) {
            ETIMArrowLog.row("poison tick dmg=1.0 target=" + entity.getName()
                    + " health=" + entity.getHealth());
        }
    }

    /** Per-potion HUD grid slot (configurable; vanilla overlaps get shadowed by this one). */
    @Override
    public int getStatusIconIndex() {
        return ETIMConfig.poisonPotionIconIndex;
    }

    /**
     * From the arrow's launcher bow: R196 {@code EntityArrow:443-451}
     * {@code rand < L/5} ⇒ {@code PotionEffect(POISON, 160+round(240×L/5), 0)}.
     */
    public static void applyFromLauncher(EntityLivingBase target, EntityPlayer shooter) {
        if (target.world.isRemote || shooter == null) {
            return;
        }
        ItemStack launcher = shooter.getHeldItemMainhand(); // R196 getLauncher :163-170
        int level = launcher.isEmpty() ? 0
                : net.minecraft.enchantment.EnchantmentHelper
                        .getEnchantmentLevel(ETIMEnchantments.POISON, launcher);
        if (level <= 0) {
            return;
        }
        float fraction = (float) level / ETIMConfig.poisonMaxLevel;
        if (target.world.rand.nextFloat() >= fraction) {
            return;
        }
        int duration = ETIMConfig.poisonDurationBase
                + Math.round(ETIMConfig.poisonDurationSpan * fraction);
        target.addPotionEffect(new PotionEffect(ETIMPotionPoison.INSTANCE, duration, 0));
    }
}
