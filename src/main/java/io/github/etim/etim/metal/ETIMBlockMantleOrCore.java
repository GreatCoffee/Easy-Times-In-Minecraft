package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.BlockStateContainer;
import net.minecraft.block.state.IBlockState;

import net.minecraft.block.properties.PropertyInteger;

/**
 * R196 {@code BlockMantleOrCore.java:5-112} + {@code Block.java:971-979} port
 * (M1-03, D-2 裁定 = 新方块). The underworld floor block:
 *
 * <ul>
 *   <li>meta 0 = mantle / meta 1 = core ({@code METADATA_MANTLE/CORE :6-9};
 *       R196 names {@code "mantle", "core"} :10).</li>
 *   <li>unbreakable ({@code setAlwaysImmutable} constants → 1.12
 *       {@code setBlockUnbreakable}), blast resistance 6000000.0F, light
 *       value 0.9F (R196 Block :971-979 判值面), id 95 → 1.12 registry face.</li>
 *   <li>D-2 裁定: the texture temporarily stands in on the vanilla bedrock
 *       texture (blockstate/model JSONs reference {@code minecraft:block/bedrock}).</li>
 *   <li>the R196 {@code updateTick} fire-spread face (:74-111) rides the
 *       fire/portal batch (后置) — NOT carried here.</li>
 *   <li>no ItemBlock — R196 {@code canBeCarried() = false} (:18-20).</li>
 * </ul>
 */
public class ETIMBlockMantleOrCore extends Block {

    public static final int METADATA_MANTLE = 0; // R196 :6
    public static final int METADATA_CORE = 1;   // R196 :7

    public static final PropertyInteger VARIANT = PropertyInteger.create("mantle", 0, 1);

    public ETIMBlockMantleOrCore() {
        super(Material.ROCK);
        this.setTranslationKey("etim.mantle_or_core");
        this.setBlockUnbreakable();      // R196 setAlwaysImmutable (Block.java:971-979)
        this.setResistance(6000000.0F);  // R196 :971-979
        this.setLightLevel(0.9F);        // R196 :971-979
        this.setDefaultState(this.blockState.getBaseState().withProperty(VARIANT, METADATA_MANTLE));
    }

    /** R196 isMantle (BlockMantleOrCore.java:41-43) — the meta 0 face. */
    public static boolean isMantle(IBlockState state) {
        return state.getBlock() instanceof ETIMBlockMantleOrCore
                && state.getValue(VARIANT) == METADATA_MANTLE;
    }

    /** R196 isCore (:49-51) — the meta 1 face. */
    public static boolean isCore(IBlockState state) {
        return state.getBlock() instanceof ETIMBlockMantleOrCore
                && state.getValue(VARIANT) == METADATA_CORE;
    }

    @Override
    protected BlockStateContainer createBlockState() {
        return new BlockStateContainer(this, VARIANT);
    }

    @Override
    public IBlockState getStateFromMeta(int meta) {
        return this.getDefaultState().withProperty(VARIANT,
                net.minecraft.util.math.MathHelper.clamp(meta, METADATA_MANTLE, METADATA_CORE));
    }

    @Override
    public int getMetaFromState(IBlockState state) {
        return state.getValue(VARIANT);
    }
}
