package io.github.etim.etim.mob;

import net.minecraft.init.Bootstrap;
import net.minecraft.item.ItemStack;
import net.minecraft.init.Items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VO: 凝胶球五种亚型的纯算术（R196 getAttackDamage :72-75 / getDamageType :84-86）。
 */
class GelatinousSphereTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void clampKeepsKnownSubtypes() {
        for (int i = 0; i < ETIMItemGelatinousSphere.NAMES.length; i++) {
            assertEquals(i, ETIMItemGelatinousSphere.clampSubtype(i));
        }
    }

    @Test
    void clampPinsOutOfRange() {
        assertEquals(ETIMItemGelatinousSphere.GREEN, ETIMItemGelatinousSphere.clampSubtype(-1));
        assertEquals(ETIMItemGelatinousSphere.BLACK, ETIMItemGelatinousSphere.clampSubtype(5));
        assertEquals(ETIMItemGelatinousSphere.BLACK, ETIMItemGelatinousSphere.clampSubtype(99));
    }

    @Test
    void attackDamageMatchesR196Table() {
        // R196 :72-75 -> 1 / 2 / 3 / 3 / 4
        assertEquals(1.0F, ETIMItemGelatinousSphere.attackDamage(0));
        assertEquals(2.0F, ETIMItemGelatinousSphere.attackDamage(1));
        assertEquals(3.0F, ETIMItemGelatinousSphere.attackDamage(2));
        assertEquals(3.0F, ETIMItemGelatinousSphere.attackDamage(3));
        assertEquals(4.0F, ETIMItemGelatinousSphere.attackDamage(4));
    }

    @Test
    void attackDamageClampsFirst() {
        assertEquals(1.0F, ETIMItemGelatinousSphere.attackDamage(-3));
        assertEquals(4.0F, ETIMItemGelatinousSphere.attackDamage(17));
    }

    @Test
    void grayAndBlackDissolveWithAcid() {
        assertEquals(ETIMBlockDissolve.Kind.ACID, ETIMItemGelatinousSphere.kind(3));
        assertEquals(ETIMBlockDissolve.Kind.ACID, ETIMItemGelatinousSphere.kind(4));
    }

    @Test
    void otherSubtypesDissolveWithPepsin() {
        assertEquals(ETIMBlockDissolve.Kind.PEPSIN, ETIMItemGelatinousSphere.kind(0));
        assertEquals(ETIMBlockDissolve.Kind.PEPSIN, ETIMItemGelatinousSphere.kind(1));
        assertEquals(ETIMBlockDissolve.Kind.PEPSIN, ETIMItemGelatinousSphere.kind(2));
    }

    @Test
    void subtypeNamesAreStable() {
        assertEquals(5, ETIMItemGelatinousSphere.NAMES.length);
        assertEquals("green", ETIMItemGelatinousSphere.NAMES[0]);
        assertEquals("black", ETIMItemGelatinousSphere.NAMES[4]);
        assertEquals("minecraft:stick", String.valueOf(Items.STICK.getRegistryName()));
    }
}
