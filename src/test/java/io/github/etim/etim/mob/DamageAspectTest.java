package io.github.etim.etim.mob;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VD — the damage-tag predicates
 * ({@link ETIMDamageAspects#isSunlight}, {@link ETIMDamageAspects#hasSilver},
 * {@link ETIMDamageAspects#isSilver}, {@link ETIMDamageAspects#hasMagic},
 * {@link ETIMDamageAspects#describe}).
 */
class DamageAspectTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void sunlightConstantAndTypeStringBothMatch() {
        assertTrue(ETIMDamageAspects.isSunlight(ETIMDamageAspects.SUNLIGHT));
        assertTrue(ETIMDamageAspects.isSunlight(new DamageSource("etim.sunlight")));
        assertFalse(ETIMDamageAspects.isSunlight(DamageSource.GENERIC));
        assertFalse(ETIMDamageAspects.isSunlight(null));
    }

    @Test
    void silverNeedsMetalGearWithSilverTag() {
        assertFalse(ETIMDamageAspects.isSilver(ItemStack.EMPTY));
        assertFalse(ETIMDamageAspects.isSilver(null));
        assertFalse(ETIMDamageAspects.isSilver(new ItemStack(Items.IRON_INGOT)));
    }

    @Test
    void noSourceMeansNoSilverAndNoMagic() {
        assertFalse(ETIMDamageAspects.hasSilver(null));
        assertFalse(ETIMDamageAspects.hasMagic(null));
    }

    @Test
    void magicSourceIsMagic() {
        assertTrue(ETIMDamageAspects.hasMagic(DamageSource.MAGIC));
        assertFalse(ETIMDamageAspects.hasMagic(DamageSource.GENERIC));
    }

    @Test
    void describePrefersSunlightThenSilverThenMagic() {
        assertEquals("sunlight", ETIMDamageAspects.describe(ETIMDamageAspects.SUNLIGHT));
        assertEquals("magic", ETIMDamageAspects.describe(DamageSource.MAGIC));
        assertEquals("none", ETIMDamageAspects.describe(DamageSource.GENERIC));
        assertEquals("none", ETIMDamageAspects.describe(null));
    }

    @Test
    void pepsinAndAcidCarryTheirOwnTypes() {
        assertEquals("etim.pepsin", ETIMDamageAspects.PEPSIN.getDamageType());
        assertEquals("etim.acid", ETIMDamageAspects.ACID.getDamageType());
        assertFalse(ETIMDamageAspects.isSunlight(ETIMDamageAspects.PEPSIN));
    }
}
