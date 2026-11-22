package io.github.etim.etim.farm;

import net.minecraft.block.Block;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemSeedFood;

/**
 * R196 {@code Item.onion = new ItemSeedFood(931, 1, 1, false, true, Block.onions,
 * Block.tilledField, "onion")} — B-68 (census F :129).
 *
 * <p>1.12 twin: {@link ItemSeedFood} already carries the plant face
 * ({@code onItemUse} on farmland) and the eating face; the R196 food columns
 * (satiation 1 / nutrition 1 / phytonutrients, no protein, no fats) ride
 * {@code NutritionSystem.addEtimFood} at registration. The vanilla
 * heal/saturation pair only feeds the legacy hunger bar and is clamped by the
 * ETIM food model, so it is set to R196's 1 hunger unit.</p>
 */
public class ETIMItemOnion extends ItemSeedFood {

    public ETIMItemOnion(Block crops) {
        super(1, 0.6F, crops, Blocks.FARMLAND);
    }
}
