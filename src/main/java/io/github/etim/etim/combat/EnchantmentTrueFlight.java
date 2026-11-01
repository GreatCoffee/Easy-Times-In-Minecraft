package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemBow;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentTrueFlight} port (id 89; batch enchant1, 条 241-245).
 * R196 faces: {@code Enchantment.java:39} {@code new EnchantmentTrueFlight(89,
 * EnumRarity.common, 10)}; carrier {@code ItemBow}
 * ({@code EnchantmentTrueFlight.java:14-16}). Effect per §140-148:
 * {@code eff += round(40×L/5)} on top of the player level; the wandered
 * heading is {@code wander = 0.5 + 4.5/(0.8+(eff+1)/5)²} (eff ≥ 0) or
 * {@code 5.0 − 0.5×eff} (debt branch). Baseline = α2 (条 245): the skill gate
 * is NOT ported (ETIM runs the skills-disabled lane — {@code eff = expLevel
 * + bonus}); the 1.12 constant 1.0 equals the eff=10 reading exactly, L0 at
 * exp 0 = 5.0 (the MITE novice face), XP debt −40 = 25.0 (authentic branch).
 * Splash ×2 while suspended in liquid rides along with the formula.
 *
 * <p>Extendability (user red line, 条 245): the level is computed on the
 * product side, then a {@link ETIMArrowAccuracyEvent} rides the Forge bus so
 * an add-on (ETIM-Extra or beyond-MITE) can layer skill increments onto the
 * eff without touching this class. Zero subscribers = α2 verbatim.</p>
 */
public final class EnchantmentTrueFlight extends ETIMMiteEnchantment {

    public EnchantmentTrueFlight() {
        super(Rarity.COMMON, EnumEnchantmentType.BOW, new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_true_flight");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.trueFlightDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.trueFlightMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return !stack.isEmpty() && stack.getItem() instanceof ItemBow;
    }
}
