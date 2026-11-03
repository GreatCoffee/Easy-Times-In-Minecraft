package io.github.etim.etim.fishing;

import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.ItemFishingRod;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.metal.ETIMItems;

/**
 * R196 {@code ItemFishingRod} port (batch five — fishing batch, audit20
 * 条 268-271). Hook material table = R196 EnumEquipmentMaterial one-hand
 * (对照报告 §4.5): {@code maxDamage = 2×durability + (flint ? 1 : 0)}
 * ({@code ItemFishingRod.java:13}); maxStackSize 1; the enchantability face
 * reads the hook material so the 案 M cost window rides the carrier's own
 * material ({@code getItemEnchantability = hook材料附魔价位}).
 *
 * <p>D-4 甲 (条 270, user-ruled): ALL NINE R196 rods land — flint / obsidian /
 * copper / silver / gold / iron / mithril / adamantium / ancient_metal. The
 * hooks (chipFlint / shardObsidian / per-metal nuggets) bridge to vanilla +
 * ETIM nugget items: flint chip → {@code Items.FLINT}; obsidian shard → the
 * vanilla OBSIDIAN block item (shard item does not exist in 1.12 — C-bridge
 * noted on the recipe row); copper/silver/mithril/adamantium/ancient → the
 * ETIM nuggets; gold → vanilla gold nugget; iron → vanilla iron nugget
 * (1.11.1+ item, the ETIMAnvilRepair precedent). The recipe silk slot = R196
 * {@code Item.silk} = the vanilla string item ({@code Item.java:46
 * new ItemReed(31, Block.tripWire, "string")}) — vanilla STRING, not sinew.</p>
 */
public final class ETIMItemFishingRod extends ItemFishingRod {

    /** Hook material constants (R196 EnumEquipmentMaterial, 报告 §4.5 一手表). */
    public enum HookMaterial {
        FLINT("flint", 1.0F, 0),
        OBSIDIAN("obsidian", 2.0F, 0),
        COPPER("copper", 4.0F, 30),
        SILVER("silver", 4.0F, 30),
        GOLD("gold", 4.0F, 50),
        IRON("iron", 8.0F, 30),
        MITHRIL("mithril", 64.0F, 100),
        ADAMANTIUM("adamantium", 256.0F, 40),
        ANCIENT_METAL("ancient_metal", 16.0F, 40);

        /** Registry-name fragment and texture base name. */
        public final String name;
        /** R196 durability (rods ×1 face — not the tools ×100 scale). */
        public final float durability;
        /** R196 material enchantability column. */
        public final int enchantability;

        HookMaterial(String name, float durability, int enchantability) {
            this.name = name;
            this.durability = durability;
            this.enchantability = enchantability;
        }

        /** {@code ItemFishingRod.java:13} — 2×durability + (flint ? 1 : 0). */
        public int maxDamage() {
            return (int) (2.0F * this.durability) + (this == FLINT ? 1 : 0);
        }
    }

    /** This rod's hook material (the 案 M carrier face reads it). */
    public final HookMaterial hook;

    public ETIMItemFishingRod(HookMaterial hook) {
        this.hook = hook;
        this.setMaxDamage(hook.maxDamage());
        this.setMaxStackSize(1);
        this.setCreativeTab(CreativeTabs.TOOLS); // R196 ItemFishingRod:18 tabTools
        this.setTranslationKey("etim.fishing_rod_" + hook.name);
        ETIM.LOGGER.info("[EtimInit] fishing rod {} maxDamage={} ench={}", ETIM.MOD_ID + ":fishing_rod_" + hook.name,
                hook.maxDamage(), hook.enchantability);
    }

    /** R196 :113/:121-123 — enchantability and durability read the hook material. */
    @Override
    public int getItemEnchantability() {
        return this.hook.enchantability;
    }

    /** Nutget/hook element of this rod's R196 recipe row ({@code RecipesMITE.java:102-111}). */
    public net.minecraft.item.Item recipeHookElement() {
        switch (this.hook) {
            case FLINT:
                return net.minecraft.init.Items.FLINT;
            case OBSIDIAN:
                return net.minecraft.item.Item.getItemFromBlock(net.minecraft.init.Blocks.OBSIDIAN); // shard bridge (C)
            case COPPER:
                return ETIMItems.nuggetCopper;
            case SILVER:
                return ETIMItems.nuggetSilver;
            case GOLD:
                return net.minecraft.init.Items.GOLD_NUGGET; // metgear B-4 precedent
            case IRON:
                return net.minecraft.init.Items.IRON_NUGGET; // 1.11.1+ (AnvilRepair precedent)
            case MITHRIL:
                return ETIMItems.nuggetMithril;
            case ADAMANTIUM:
                return ETIMItems.nuggetAdamantium;
            case ANCIENT_METAL:
            default:
                return ETIMItems.nuggetAncientMetal;
        }
    }
}
