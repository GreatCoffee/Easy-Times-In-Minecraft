package io.github.etim.etim.metal;

import net.minecraft.block.SoundType;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.util.ResourceLocation;

import io.github.etim.etim.ETIM;

/**
 * 金属砧块批 T1① — one ETIM metal anvil (R196 {@code BlockAnvil(id, metal_type)}
 * 对位, Block.java :876-888/:959-961). The vanilla 1.12 {@code BlockAnvil}
 * constructor is protected no-arg (:43-45), so a subclass rides it legally and
 * carries the R196 {@code metal_type} face as a float field.
 *
 * <p>Judged values (批文 §一):</p>
 * <ul>
 *   <li>anvil durability = 1600 × 31 × metal durability (R196 BlockAnvil
 *       :191-197) — copper/silver/gold 4.0 → 198,400; ancient 16.0 → 793,600;
 *       mithril 64.0 → 3,174,400; adamantium 256.0 → 12,697,600. The repair
 *       metal gate reads this value ({@link ETIMAnvilRepair#anvilMetalDurability}).</li>
 *   <li>hardness = the R196 relative form, 1.2 (log) × metal durability
 *       (T5②, 终审 javap: setHardnessRelativeToWood = arg × metal_type.durability;
 *       BlockHardness.log = 1.2F) — 4.8/19.2/76.8/307.2.</li>
 *   <li>stack 1 (R196 BlockAnvil :19, set on the ItemBlock at registration);
 *       creative tab decorations (R196 :16 tabDecorations); ANVIL sound
 *       (R196 :877 setStepSound(soundAnvilFootstep)).</li>
 * </ul>
 *
 * <p>The vanilla BlockAnvil superclass carries BlockFalling + the
 * FACING/DAMAGE blockstate + the GUI activation; the T4① above-cell gate
 * rides {@code MixinBlockAnvil}. The vanilla iron anvil keeps vanilla
 * hardness 5.0 (T5② 定谳: the relative form would give 9.6 — the in-place
 * block is not touched).</p>
 */
public class ETIMBlockAnvil extends net.minecraft.block.BlockAnvil {

    /** R196 metal_type.durability — the repair gate + wear capacity driver. */
    private final float anvilDurability;

    public ETIMBlockAnvil(String name, float anvilDurability) {
        super();
        this.anvilDurability = anvilDurability;
        this.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        this.setTranslationKey("etim." + name);
        this.setHardness(1.2F * anvilDurability); // T5② relative form
        this.setSoundType(SoundType.ANVIL);
        this.setCreativeTab(CreativeTabs.DECORATIONS);
    }

    /** The gate value (R196 metal_type.durability column). */
    public float etimAnvilDurability() {
        return this.anvilDurability;
    }
}
