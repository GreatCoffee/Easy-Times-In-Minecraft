package io.github.etim.etim.mob;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.init.Blocks;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;

/**
 * B-62 — R196 {@code EntityClayGolem.java} (34 lines, extends EntityEarthElemental).
 *
 * <p>Clay-bodied sibling: material block = clay, no magma rail
 * ({@link #isMagma()} false), attack 6 / HP 30, natural defense 2 only while
 * hardened (heat ≥ 100), spawns on clay only.</p>
 */
public class ETIMEntityClayGolem extends ETIMEntityEarthElemental {

    public ETIMEntityClayGolem(World world) {
        super(world);
        this.setType(CLAY_NORMAL);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(6.0D); // R196 :9-15
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(30.0D);
    }

    /** R196 :16-20 — hardened clay keeps 2.0F, raw clay none. */
    @Override
    public float etimNaturalDefense(DamageSource source) {
        if (source == null || source.isUnblockable() || source.isFireDamage()) {
            return 0.0F;
        }
        return this.isHardenedClay() ? 2.0F : 0.0F;
    }

    @Override
    public boolean isMagma() {
        return false; // R196 :33
    }

    @Override
    public void setTypeForBlock(IBlockState below, boolean heated) {
        this.setType(heated ? CLAY_HARDENED : CLAY_NORMAL); // R196 :26-31
        if (heated) {
            this.heat = 1000;
        }
    }

    @Override
    protected boolean isValidMaterialBlock(Block block) {
        return block == Blocks.CLAY; // R196 :21-24
    }

    @Override
    protected String kind() {
        return "clay";
    }
}
