package io.github.etim.etim.skill;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VO: 修理技能注册表的纯查表行为（R196 skill mask 映射）。
 */
class SkillRepairMaskTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void unknownItemHasNoMask() {
        assertEquals(0, ETIMSkillRegistry.repairMask(new ItemStack(Items.SLIME_BALL)));
    }

    @Test
    void emptyAndNullStacksScoreZero() {
        assertEquals(0, ETIMSkillRegistry.repairMask(ItemStack.EMPTY));
        assertEquals(0, ETIMSkillRegistry.repairMask(null));
    }

    @Test
    void registerThenLookupByStack() {
        ETIMSkillRegistry.registerRepair(Items.STICK, ETIMSkill.CARPENTRY.mask());
        assertEquals(ETIMSkill.CARPENTRY.mask(), ETIMSkillRegistry.repairMask(new ItemStack(Items.STICK)));
    }

    @Test
    void zeroMaskAndNullItemAreNoOps() {
        ETIMSkillRegistry.registerRepair(Items.SNOWBALL, 0);
        assertEquals(0, ETIMSkillRegistry.repairMask(new ItemStack(Items.SNOWBALL)));
        ETIMSkillRegistry.registerRepair((Item) null, 3);
        ETIMSkillRegistry.registerRepair(Items.SNOWBALL, (ETIMSkill[]) null);
    }

    @Test
    void singleSkillMaskIsPowerOfTwo() {
        int mask = ETIMSkill.MASONRY.mask();
        assertTrue(mask > 0);
        assertEquals(1, Integer.bitCount(mask));
        assertEquals(1, Integer.bitCount(ETIMSkill.BLACKSMITHING.mask()));
    }

    @Test
    void distinctSkillsHaveDistinctBits() {
        assertTrue((ETIMSkill.CARPENTRY.mask() & ETIMSkill.MASONRY.mask()) == 0);
        assertTrue(ETIMSkill.maskOf(ETIMSkill.CARPENTRY, ETIMSkill.MASONRY)
            == (ETIMSkill.CARPENTRY.mask() | ETIMSkill.MASONRY.mask()));
        assertEquals(0, ETIMSkill.maskOf());
    }
}
