package io.github.etim.etim.skill;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** R196 skill bit layout (Skill.java:7-19) and the requirement test. */
class SkillMaskTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void r196OrderIsStable() {
        assertEquals(0, ETIMSkill.FIGHTING.id());
        assertEquals(1, ETIMSkill.ARCHERY.id());
        assertEquals(2, ETIMSkill.MINING.id());
        assertEquals(3, ETIMSkill.FOOD_PREPARATION.id());
        assertEquals(4, ETIMSkill.MASONRY.id());
        assertEquals(5, ETIMSkill.FARMING.id());
        assertEquals(6, ETIMSkill.TINKERING.id());
        assertEquals(7, ETIMSkill.CARPENTRY.id());
        assertEquals(8, ETIMSkill.BLACKSMITHING.id());
        assertEquals(9, ETIMSkill.BREWING.id());
        assertEquals(10, ETIMSkill.FINE_ARTS.id());
        assertEquals(11, ETIMSkill.ENCHANTING.id());
        assertEquals(12, ETIMSkill.FISHING.id());
    }

    @Test
    void maskIsSingleBit() {
        for (ETIMSkill skill : ETIMSkill.values()) {
            int mask = skill.mask();
            assertEquals(1, Integer.bitCount(mask), skill.key());
            assertEquals(1 << skill.id(), mask);
        }
    }

    @Test
    void maskOfCombinesAndSkipsNulls() {
        int m = ETIMSkill.maskOf(ETIMSkill.FIGHTING, null, ETIMSkill.FISHING);
        assertEquals(ETIMSkill.FIGHTING.mask() | ETIMSkill.FISHING.mask(), m);
        assertEquals(0, ETIMSkill.maskOf());
        assertEquals(0, ETIMSkill.maskOf((ETIMSkill[]) null));
    }

    @Test
    void byKeyIsCaseInsensitive() {
        assertSame(ETIMSkill.CARPENTRY, ETIMSkill.byKey("CARPENTRY"));
        assertSame(ETIMSkill.FOOD_PREPARATION, ETIMSkill.byKey("foodpreparation"));
        assertNull(ETIMSkill.byKey("nope"));
        assertNull(ETIMSkill.byKey(null));
    }

    @Test
    void byIdBounds() {
        assertSame(ETIMSkill.MINING, ETIMSkill.byId(2));
        assertNull(ETIMSkill.byId(-1));
        assertNull(ETIMSkill.byId(31));
        assertNull(ETIMSkill.byId(30));
    }

    @Test
    void emptyRequirementPasses() {
        assertTrue(ETIMSkills.maskMatches(0, 0));
        assertTrue(ETIMSkills.maskMatches(0b1010, 0));
    }

    @Test
    void anyOverlapPasses() {
        int owned = ETIMSkill.MINING.mask() | ETIMSkill.FARMING.mask();
        assertTrue(ETIMSkills.maskMatches(owned, ETIMSkill.FARMING.mask()));
        assertTrue(ETIMSkills.maskMatches(owned, ETIMSkill.MINING.mask() | ETIMSkill.BREWING.mask()));
    }

    @Test
    void disjointFails() {
        int owned = ETIMSkill.MINING.mask();
        assertFalse(ETIMSkills.maskMatches(owned, ETIMSkill.FISHING.mask()));
        assertFalse(ETIMSkills.maskMatches(0, ETIMSkill.FISHING.mask()));
    }

    @Test
    void translationKeyUsesNormalizedKey() {
        // register() lower-cases the key, so the translation key is all lower case.
        assertEquals("skill.finearts", ETIMSkill.FINE_ARTS.translationKey());
    }

    @Test
    void registrationIsIdempotentAndNormalized() {
        assertSame(ETIMSkill.FIGHTING, ETIMSkill.register("FIGHTING"));
        assertSame(ETIMSkill.CARPENTRY, ETIMSkill.register("Carpentry"));
    }
}
