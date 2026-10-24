package io.github.etim.etim.mining;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mixins.ItemSwordAccessor;
import net.minecraft.item.Item;
import net.minecraft.item.ItemAxe;
import net.minecraft.item.ItemPickaxe;
import net.minecraft.item.ItemSpade;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemTool;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * MITE material durability on vanilla tools (ToolSuite 终审 §二,
 * EnumEquipmentMaterial.java:4-20 + ItemTool.java:37-39都对 writeup):
 * the decay formula consumes ~100×hardness points per dig, so the vanilla
 * uses (wood 59 / iron 250 / diamond 1561) are on a different scale entirely
 * — without this mapping an iron axe dies on two chops. R196 rule:
 * maxDamage = (int)(4.0 × numComponents × material.durability × 100) with
 * per-class components (pickaxe/axe 3, shovel 1, sword 2).
 *
 * <p>Applied at init (after item registration) to every vanilla ItemTool /
 * ItemSword whose material we can name. Materials without an R196 row are
 * left untouched. Gated by the task-2.2 master switch.</p>
 */
public final class ETIMToolDurability {

    /** R196 durability factors (EnumEquipmentMaterial.java:4-20). */
    private static final int PICKAXE_AND_AXE_COMPONENTS = 3;
    private static final int SHOVEL_COMPONENTS = 1;
    private static final int SWORD_COMPONENTS = 2;

    private ETIMToolDurability() {
    }

    public static void apply() {
        if (!ETIMConfig.miningReform) {
            return;
        }
        for (Item item : ForgeRegistries.ITEMS.getValues()) {
            if (item instanceof io.github.etim.etim.metal.ETIMMetalGear) {
                // B3 A-1: ETIM gear carries its R196-judged maxDamage from the
                // constructor; the vanilla-material mapping below would rewrite it
                // through the IRON placeholder ctor material (pickaxe/axe 9600,
                // shovel 3200, sword 6400 — adamantium pickaxe 307200→9600).
                continue;
            }
            int components = getNumComponentsForDurability(item);
            if (components <= 0) {
                continue;
            }
            float durability = getMaterialDurability(item);
            if (durability < 0.0F) {
                continue;
            }
            item.setMaxDamage((int) (4.0F * components * durability * 100.0F));
        }
    }

    private static int getNumComponentsForDurability(Item item) {
        if (item instanceof ItemPickaxe || item instanceof ItemAxe) {
            return PICKAXE_AND_AXE_COMPONENTS;
        }
        if (item instanceof ItemSpade) {
            return SHOVEL_COMPONENTS;
        }
        if (item instanceof ItemSword) {
            return SWORD_COMPONENTS;
        }
        return 0;
    }

    /**
     * Vanilla ToolMaterial → R196 factor. MITE has no stone tier (flint
     * replaces it), so stone tools borrow the flint row (1.0) — 待判决备注，
     * 若 R196 有石质对照表请指出，我们立即换档.
     */
    private static float getMaterialDurability(Item item) {
        String materialName = materialNameOf(item);
        if (materialName == null) {
            return -1.0F;
        }
        // Vanilla ToolMaterial.toString() is NOT overridden → uppercase enum
        // constant ("WOOD"/"IRON"/...). Verified: Item.java ToolMaterial enum
        // has no toString() method.
        switch (materialName) {
            case "WOOD":
                return 0.5F;
            case "FLINT":
            case "STONE":
                return 1.0F;
            case "GOLD":
                return 4.0F;
            case "IRON":
                return 8.0F;
            case "DIAMOND":
                return 16.0F;
            default:
                // Foreign materials (other mods) keep their own maxDamage.
                return -1.0F;
        }
    }

    private static String materialNameOf(Item item) {
        if (item instanceof ItemTool) {
            // Vanilla name getter: the tool material enum constant (e.g. "WOOD").
            return ((ItemTool) item).getToolMaterialName();
        }
        if (item instanceof ItemSword) {
            Item.ToolMaterial material = ((ItemSwordAccessor) (Object) item).etim$getMaterial();
            return material == null ? null : material.name();
        }
        return null;
    }
}
