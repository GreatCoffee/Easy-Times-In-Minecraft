package io.github.etim.etim.combat;

import net.minecraft.init.Bootstrap;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * B-70VE — the piercing carrier faces
 * ({@link R196ArmorModel#piercingPoints}, {@link R196ArmorModel#carrierOf}).
 */
class ArmorPiercingTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void noSourceHasNoCarrier() {
        assertSame(ItemStack.EMPTY, R196ArmorModel.carrierOf(null));
        assertEquals(0.0F, R196ArmorModel.piercingPoints(null), 1.0E-6F);
    }

    @Test
    void sourceWithoutLivingImmediateHasNoPoints() {
        assertEquals(0.0F, R196ArmorModel.piercingPoints(DamageSource.GENERIC), 1.0E-6F);
        assertEquals(0.0F, R196ArmorModel.piercingPoints(DamageSource.MAGIC), 1.0E-6F);
        assertEquals(0.0F, R196ArmorModel.piercingPoints(DamageSource.IN_FIRE), 1.0E-6F);
    }
}
