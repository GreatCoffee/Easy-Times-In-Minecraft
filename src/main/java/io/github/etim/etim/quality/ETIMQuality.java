package io.github.etim.etim.quality;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemHoe;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemTool;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.ResourceLocation;
import org.apache.commons.lang3.StringUtils;

import javax.annotation.Nullable;
import java.util.HashMap;
import java.util.Map;

/**
 * Batch 3 (stage 3): the ItemStack NBT sidecar + the picker's three numeric
 * helpers, all in R196 judgment values (audit task 10 §2.2/§2.3/§3.2; the
 * values are javap-quoted in the audit, not re-derived here).
 *
 * <p>ETIM tack: vanilla 1.12 has no per-item quality channel, so the state
 * rides an NBT sidecar ({@code "etim"."quality"} int ordinal) — the batch-3
 * design doc §一 decision ("最少侵入"). The durability write-through lives in
 * {@code MixinItem.getMaxDamage(ItemStack)} (audit §3.1,
 * {@code round(maxDamage × modifier)} min 1).</p>
 *
 * <p>Picker numbers (audit §2.2/§2.3, wired-equivalent in vanilla 1.12):</p>
 * <ul>
 *   <li><b>min</b> = clamp(average + effective_level/10, 0, average) — the
 *       clumsy −20 step has no 1.12 equivalent, so {@code min = average} for
 *       every level ≥ 0 (R196 "upper clamp at average": levels never push the
 *       floor below average); the skillsets branch is skipped (ETIM has no
 *       skillset concept);</li>
 *   <li><b>max</b> = walk {@code itemMax} down to average, take the first
 *       ordinal whose XP cost fits the player budget (xp ≤ 0 → min);</li>
 *   <li><b>cost</b>(q) = round(qAdj / 5.0F) (clumsy ×2 step skipped);</li>
 *   <li><b>qAdj</b>(d, q) = d × 2^n for n = ordinal − average &gt; 0;
 *       below average is NOT discounted (audit §3.2 "n&lt;0 → 不乘").</li>
 * </ul>
 *
 * <p>Max-quality policy for vanilla items (the one structural port
 * difference): R196 reads it off EnumEquipmentMaterial; vanilla 1.12.2 has no
 * such table, so ETIM maps the vanilla ToolMaterial/ArmorMaterial onto the
 * one-hand §2.4 rows (wood/leather→fine, iron→masterwork, gold→superb,
 * diamond→superb), falls back to {@code qualityDefaultMax} for unmapped
 * items, and lets a config override list pin any specific item.</p>
 */
public final class ETIMQuality {

    /** NBT side-car compound key (namespace-safe: the stack's "etim" sub tag). */
    private static final String TAG_ETIM = "etim";
    private static final String TAG_QUALITY = "quality";

    private static final Map<String, Integer> OVERRIDES = new HashMap<>();

    private ETIMQuality() {
    }

    // ---------------------------------------------------------------- sidecar

    public static boolean has(ItemStack stack) {
        return stack.hasTagCompound()
                && stack.getTagCompound().hasKey(TAG_ETIM, 10 /* compound */)
                && stack.getTagCompound().getCompoundTag(TAG_ETIM).hasKey(TAG_QUALITY);
    }

    @Nullable
    public static EnumQuality get(ItemStack stack) {
        if (!has(stack)) {
            return null;
        }
        int ordinal = stack.getTagCompound().getCompoundTag(TAG_ETIM).getInteger(TAG_QUALITY);
        EnumQuality[] values = EnumQuality.values();
        if (ordinal < 0 || ordinal >= values.length) {
            return null;
        }
        return values[ordinal];
    }

    public static void set(ItemStack stack, EnumQuality quality) {
        // R196 writes the rung at every grant; ETIM only materializes the side
        // car for a non-average rung: the average tag would ride EVERY granted
        // item for zero gameplay effect (average durability modifier = 1.0 and
        // the tooltip row suppresses it) — the pick stays server-log judged.
        // 1.12.2 getSubCompound(key) is a read-only accessor (null when
        // absent), so the side-car is created through the root-tag write.
        NBTTagCompound root = stack.getTagCompound();
        if (root == null) {
            root = new NBTTagCompound();
            stack.setTagCompound(root);
        }
        if (!root.hasKey(TAG_ETIM, 10)) {
            root.setTag(TAG_ETIM, new NBTTagCompound());
        }
        root.getCompoundTag(TAG_ETIM).setInteger(TAG_QUALITY, quality.ordinal());
    }

    // ---------------------------------------------------------------- max policy

    /** Called from ETIMConfig.init with the raw override list ("registry=0..7" CSV). */
    public static void setOverrides(String raw) {
        OVERRIDES.clear();
        if (StringUtils.isBlank(raw)) {
            return;
        }
        for (String part : raw.replace('，', ',').split(",")) {
            String entry = part.trim();
            if (entry.isEmpty()) {
                continue;
            }
            int split = entry.lastIndexOf('=');
            if (split <= 0) {
                throw new IllegalStateException("[ETIM] Invalid config: qualityMaxOverrides entry '"
                        + entry + "' (expected itemRegistryName=0..7)");
            }
            OVERRIDES.put(entry.substring(0, split).trim(),
                    Integer.parseInt(entry.substring(split + 1).trim()));
        }
    }

    /**
     * Max craftable quality of one item: config override first, then the
     * vanilla material mapping (one-hand §2.4 rows), then the config fallback.
     */
    public static EnumQuality getMaxQualityFor(Item item) {
        ResourceLocation name = item.getRegistryName();
        if (name != null) {
            Integer override = OVERRIDES.get(name.toString());
            if (override != null) {
                return topOrBelow(override);
            }
        }
        EnumQuality materialMax = materialMaxOf(item);
        if (materialMax != null) {
            return materialMax;
        }
        return topOrBelow(ETIMConfig.qualityDefaultMax);
    }

    @Nullable
    private static EnumQuality materialMaxOf(Item item) {
        if (item instanceof ItemTool) {
            // ItemTool exposes only the material NAME (decompiled ItemTool:110).
            return ofToolMaterialName(((ItemTool) item).getToolMaterialName());
        }
        if (item instanceof ItemSword) {
            return ofToolMaterialName(((ItemSword) item).getToolMaterialName());
        }
        if (item instanceof ItemHoe) {
            return ofToolMaterialName(((ItemHoe) item).getMaterialName());
        }
        if (item instanceof ItemArmor) {
            return ofArmorMaterial(((ItemArmor) item).getArmorMaterial());
        }
        // Everything else (shears, anvils, mod items) has no §2.4 row — it
        // falls to the config fallback (documented open-decision, see the
        // unattended test list "待用户裁决" #1); no per-item guess here.
        return null;
    }

    /**
     * ❗F-9-18 熔断（audit20-09 R3）：模组自定义材质（EnumHelper.addToolMaterial）
     * 不在 vanilla 枚举内，valueOf 抛 IllegalArgumentException → 返回 null
     * 交回 config fallback，服务端合成链不得崩。
     */
    @Nullable
    private static EnumQuality ofToolMaterialName(String name) {
        if (name == null) {
            return null;
        }
        try {
            return ofToolMaterial(Item.ToolMaterial.valueOf(name));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static EnumQuality ofToolMaterial(Item.ToolMaterial material) {
        switch (material) {
            case WOOD:    return EnumQuality.FINE;
            case STONE:   return EnumQuality.FINE;
            case IRON:    return EnumQuality.MASTERWORK;
            case GOLD:    return EnumQuality.SUPERB;
            case DIAMOND: return EnumQuality.SUPERB;
            default:      return null;
        }
    }

    private static EnumQuality ofArmorMaterial(ItemArmor.ArmorMaterial material) {
        switch (material) {
            case LEATHER: return EnumQuality.FINE;
            case IRON:    return EnumQuality.MASTERWORK;
            case GOLD:    return EnumQuality.SUPERB;
            case DIAMOND: return EnumQuality.SUPERB;
            default:      return EnumQuality.FINE; // chain and mod armours: no §2.4 row -> fine ceiling
        }
    }

    private static EnumQuality topOrBelow(int ordinal) {
        EnumQuality[] values = EnumQuality.values();
        int clamped = Math.min(Math.max(ordinal, 0), values.length - 1);
        return values[clamped];
    }

    // ---------------------------------------------------------------- picker math

    /**
     * R196 getMinCraftingQuality (EntityPlayer:2398-2412): floor = average for
     * any level ≥ 0 (the −20 clumsy step and the skillsets branch have no
     * equivalent in ETIM); a negative level can pull the floor below average.
     */
    public static int getMinOrdinal(EntityPlayer player) {
        int effectiveLevel = player.experienceLevel;
        return Math.min(Math.max(EnumQuality.AVERAGE.ordinal() + effectiveLevel / 10, 0),
                EnumQuality.AVERAGE.ordinal());
    }

    /**
     * R196 getMaxCraftingQuality (EntityPlayer:2414-2438): pure XP budget —
     * walk {@code itemMax} down to average and take the first affordable
     * step; xp ≤ 0 falls to the floor.
     */
    public static int getMaxOrdinal(EntityPlayer player, float unadjustedDifficulty, ItemStack result) {
        int min = getMinOrdinal(player);
        if (player.experienceTotal <= 0) {
            return min;
        }
        int itemMax = getMaxQualityFor(result.getItem()).ordinal();
        for (int i = itemMax; i >= EnumQuality.AVERAGE.ordinal(); i--) {
            if (getExperienceCost(qualityAdjustedDifficulty(unadjustedDifficulty, i)) <= player.experienceTotal) {
                return i;
            }
        }
        return min;
    }

    /** Audit §3.2: n ≥ 0 multiplications of 2.0F; below average is NOT discounted. */
    public static float qualityAdjustedDifficulty(float difficulty, int qualityOrdinal) {
        float modified = difficulty;
        int n = qualityOrdinal - EnumQuality.AVERAGE.ordinal();
        for (int i = 0; i < n; i++) {
            modified *= 2.0F;
        }
        return modified;
    }

    /** R196 getCraftingExperienceCost (javap 7004-7020): round(qAdj / 5.0F). */
    public static int getExperienceCost(float qualityAdjustedDifficulty) {
        return (int) Math.round(qualityAdjustedDifficulty / 5.0F);
    }

    /** The completion charge: negative XP points through the vanilla level machinery. */
    public static void chargeExperience(EntityPlayer player, int cost) {
        // R196 §65: addExperience(−cost), i.e. the POOL is the store of
        // truth. Vanilla addExperience() has no negative branch (the bar
        // would go negative and the level freeze — run26 158-round), so
        // re-derive level+bar from the decremented pool instead.
        io.github.etim.etim.playerstate.ETIMXp.applyTotal(player, player.experienceTotal - cost);
        if (player.experienceTotal < 0) {
            player.experienceTotal = 0;
        }
    }
}
