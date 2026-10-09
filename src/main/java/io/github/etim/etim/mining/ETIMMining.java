package io.github.etim.etim.mining;

import java.util.HashMap;
import java.util.Map;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Enchantments;
import net.minecraft.init.MobEffects;
import net.minecraft.item.Item;
import net.minecraft.item.ItemAxe;
import net.minecraft.item.ItemPickaxe;
import net.minecraft.item.ItemSpade;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemTool;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * R196 mining reform (task 2.2): dig progress per tick and the
 * requires-tool gate, ported 1:1 from the javap-verified pseudocode in
 * {@code R196阶段二三判决预核报告.md} §四.4.1/§四.4.2 (EntityPlayer.java:874-944,
 * ItemTool.java:142-152, Material.java:405-407).
 *
 * <p>Model summary: progress/tick = {@code (1 / (hardness / str)) / 512} — a
 * str of 0 means the block cannot be dug at all — and relative hardness below
 * 3/1024 collapses to the 512/tick instant tier. The drop gate is
 * {@code str > 0} (HarvestCheck event); whether a str=0 dig should still
 * decay the block without dropping is awaiting the audit session's
 * tryHarvestBlock verdict (追加任务 4 P1), so the current build is strict.</p>
 *
 * <p>V1 notes (audit report {@code R196 MiningGate 终审.md} landed 2026-10-09):
 * <ul>
 *   <li>Ore hardness/min-level rows are the clinit literals (audit P0.3):
 *       diamond ore sidesteps at min 4 and emerald at min 3 — stage-4 metal
 *       tools (grade 4) are required, which do not exist yet.</li>
 *   <li>str≤0 = the block will not even START digging on the legit client
 *       flow (audit P1.4 granted); "removed without drops" is only reachable
 *       through server-visible client fraud, which the R196 server itself
 *       also permits — the server-side funnel here stays strict.</li>
 *   <li>isPortable now ports the audit P2 list (containers via
 *       hasTileEntity, spawner opts out) with the fixed 4.0×hardness floor.</li>
 *   <li>Dig hunger (0.01×endurance per tick, even on failed digs) ships with
 *       the food reform; tool durability gates ({@code onBlockDestroyed})
 *       pending the 追加任务 5 dump.</li>
 * </ul></p>
 */
public final class ETIMMining {

    /** Instant tier: relative hardness below 3/1024 counts as 0 → 512/tick. */
    private static final float INSTANT_REL = 0.0029296875F;

    /** Cobweb multiplier without an effective tool (EntityPlayer:889-905). */
    private static final float WEB_FACTOR = 0.2F;

    /** Water / airborne / hungry divisor (EntityPlayer:907-925). */
    private static final float ENVIRONMENT_PENALTY = 5.0F;

    /** Str of any effective tool before material efficiency (ItemTool). */
    private static final float BASE_TOOL_STR = 4.0F;

    /** The 512-tick base of the damage-vs-block formula. */
    private static final float PROGRESS_BASE = 512.0F;

    /** R196 block hardness (wiki value / 100). Missing rows keep vanilla values. */
    private static final Map<String, Float> BLOCK_HARDNESS = new HashMap<>();

    /** R196 minimum harvest level per block (0 = hand-breakable). Missing rows fall back to the vanilla harvest level. */
    private static final Map<String, Integer> BLOCK_MIN_LEVEL = new HashMap<>();

    static {
        // Official wiki table (MITE玩家侧机制汇总 §2.2) / 100; values with direct
        // bytecode evidence: stone 2.4, cobblestone 2.0, sand 0.4, dirt 0.5,
        // gravel 0.6, log 1.2, planks 0.8, sandstone 0.8, glass 2.0, web 0.1.
        // Ore rows (coal/iron/gold) are pending the audit verdict on whether
        // the BlockHardness fields are consumed — rows stay while that lands.
        put("tallgrass", 0.02F, 0);
        put("double_plant", 0.02F, 0);
        put("vine", 0.2F, 0);
        put("web", 0.1F, 0);
        put("sand", 0.4F, 0);
        put("red_sand", 0.4F, 0);
        put("dirt", 0.5F, 0);
        put("grass", 0.5F, 0);
        put("gravel", 0.6F, 0);
        put("pumpkin", 0.6F, 0);
        put("lit_pumpkin", 0.6F, 0);
        put("planks", 0.8F, 0);
        put("sandstone", 0.8F, 1);
        put("red_sandstone", 0.8F, 1);
        put("log", 1.2F, 1);
        put("log2", 1.2F, 1);
        // Ore rows are clinit literals PER the MiningGate audit (P0.3) — the
        // BlockHardness fields are cemetery data (gold 2.4 ≠ wiki 2.5 ≠ dead 2.5).
        put("coal_ore", 1.2F, 2);
        put("cobblestone", 2.0F, 2);
        put("mossy_cobblestone", 2.0F, 2);
        put("stone", 2.4F, 2);
        put("gold_ore", 2.4F, 2);
        put("iron_ore", 3.0F, 2);
        put("lapis_ore", 3.0F, 2);
        put("redstone_ore", 3.0F, 2);
        put("lit_redstone_ore", 3.0F, 2);
        put("quartz_ore", 3.0F, 2);
        put("emerald_ore", 3.0F, 3);
        put("diamond_ore", 3.0F, 4);
        put("glass", 2.0F, 0);
    }

    /** R196 isPortable (audit P2): the declared set + every TileEntity block; spawner opts back out. */
    public static boolean isPortable(IBlockState state) {
        String name = state.getBlock().getRegistryName().getPath();
        if (PORTABLE_OVERRIDE.contains(name)) {
            return true;
        }
        return name.equals("mob_spawner") ? false : state.getBlock().hasTileEntity();
    }

    private static final java.util.Set<String> PORTABLE_OVERRIDE = new java.util.HashSet<String>(
            java.util.Arrays.asList("anvil", "bed", "cauldron", "dragon_egg", "ender_chest", "ladder", "tnt", "crafting_table"));

    private static void put(String block, float hardness, int minLevel) {
        BLOCK_HARDNESS.put(block, hardness);
        BLOCK_MIN_LEVEL.put(block, minLevel);
    }

    /** R196 requiresTool (Material.java:405-407 simplified): a positive block min level. */
    public static boolean requiresTool(IBlockState state) {
        return getMinHarvestLevel(state) > 0;
    }

    /** R196 min_harvest_level; missing rows inherit the vanilla block harvest level. */
    public static int getMinHarvestLevel(IBlockState state) {
        Integer min = BLOCK_MIN_LEVEL.get(state.getBlock().getRegistryName().getPath());
        return min != null ? min : Math.max(0, state.getBlock().getHarvestLevel(state));
    }

    /** R196 block hardness; missing rows keep the vanilla value. */
    public static float getHardness(IBlockState state, World world, BlockPos pos) {
        Float hardness = BLOCK_HARDNESS.get(state.getBlock().getRegistryName().getPath());
        return hardness != null ? hardness : state.getBlock().getBlockHardness(state, world, pos);
    }

    /**
     * R196 playerStrVsBlock (EntityPlayer.java:874-944). Portable branch is
     * pending (treated false); every environment divisor and the per-level
     * bonus follows the pseudocode verbatim.
     */
    public static float getCurrentPlayerStrVsBlock(EntityPlayer player, IBlockState state, World world, BlockPos pos, boolean useTool) {
        float hardness = getHardness(state, world, pos);
        if (hardness == 0.0F) {
            return 1.0F;
        }
        float floor = -Float.MAX_VALUE;
        float str;
        ItemStack held = player.getHeldItemMainhand();
        if (isPortable(state)) {
            // Audit P2: portable blocks pin str AND floor to 4.0×hardness —
            // fixed 128 ticks/块, no tool/level/potion path beats the floor
            // for the common case (max() only wins when modifiers exceed).
            str = floor = BASE_TOOL_STR * hardness;
        } else if (useTool && !held.isEmpty()) {
            str = isEffectiveAgainstBlock(held, state) ? BASE_TOOL_STR * getMaterialEfficiency(held) : 0.0F;
            if (str < 1.0F) {
                return getCurrentPlayerStrVsBlock(player, state, world, pos, false);
            }
            int efficiency = EnchantmentHelper.getEnchantmentLevel(Enchantments.EFFICIENCY, held);
            str += (efficiency * efficiency) + 1;
        } else {
            str = requiresTool(state) ? 0.0F : 1.0F;
        }
        if (state.getBlock() == Blocks.WEB && !(useTool && !player.getHeldItemMainhand().isEmpty()
                && isEffectiveAgainstBlock(player.getHeldItemMainhand(), state))) {
            str *= WEB_FACTOR;
        }
        PotionEffect digSpeed = player.getActivePotionEffect(MobEffects.HASTE);
        if (digSpeed != null) {
            str *= 1.0F + (digSpeed.getAmplifier() + 1) * 0.2F;
        }
        PotionEffect digSlowdown = player.getActivePotionEffect(MobEffects.MINING_FATIGUE);
        if (digSlowdown != null) {
            str *= 1.0F - (digSlowdown.getAmplifier() + 1) * 0.2F;
        }
        if (player.isInsideOfMaterial(Material.WATER) && !hasAquaAffinity(player)) {
            str /= ENVIRONMENT_PENALTY;
        }
        if (!player.onGround) {
            str /= ENVIRONMENT_PENALTY;
        }
        if (!hasFoodEnergy(player)) {
            str /= ENVIRONMENT_PENALTY;
        }
        str *= 1.0F + player.experienceLevel * ETIMConfig.miningSpeedPerLevel;
        return Math.max(str, floor);
    }

    /** The drop/damage gate: {@code str > 0} (ItemInWorldManager, audit pending). */
    public static boolean canPlayerDamageBlock(EntityPlayer player, IBlockState state) {
        return getCurrentPlayerStrVsBlock(player, state, null, null, true) > 0.0F;
    }

    /**
     * MITE tool decay when used to break a block (ToolSuite 终审 §三): five
     * gates — damageable ∧ !portable ∧ !creative ∧ hardness>0 ∧ str>1 — then
     * {@code max(max((int)(hardness × 100 × baseDecay), (int)(100×baseDecay/20)), 1)}
     * (getToolDecayFromBreakingBlock, bytecode offsets 0-43). baseDecay is a
     * per-CLASS override, not a material field: pickaxe 1.0 / shovel 0.5 /
     * axe 1.0 (1.875 on sandstone) / sword 2.0; material durability only
     * scales the maxDamage budget.
     */
    public static int getToolDecayFromBreakingBlock(EntityPlayer player, IBlockState state, World world, BlockPos pos) {
        ItemStack held = player.getHeldItemMainhand();
        if (held.isEmpty() || !held.getItem().isDamageable()) {
            return 0;
        }
        if (player.capabilities.isCreativeMode || isPortable(state)) {
            return 0;
        }
        float hardness = getHardness(state, world, pos);
        if (hardness <= 0.0F) {
            return 0;
        }
        if (getCurrentPlayerStrVsBlock(player, state, world, pos, true) <= 1.0F) {
            return 0;
        }
        float decay = 100.0F * getBaseDecayForBreakingBlocks(held, state);
        return Math.max(Math.max((int) (hardness * decay), (int) (decay / 20.0F)), 1);
    }

    /** MITE attack decay: {@code max((int)(100 × baseDecay), 1)} (getToolDecayFromAttackingEntity, offsets 0-13). */
    public static int getToolDecayFromAttackingEntity(ItemStack held) {
        if (held.isEmpty() || !held.getItem().isDamageable()) {
            return 0;
        }
        float decay = 100.0F * getBaseDecayForAttackingEntity(held);
        return Math.max((int) decay, 1);
    }

    private static float getBaseDecayForBreakingBlocks(ItemStack held, IBlockState state) {
        Item item = held.getItem();
        String key = state.getBlock().getRegistryName().getPath();
        if (item instanceof ItemPickaxe) {
            return 1.0F;
        }
        if (item instanceof ItemAxe) {
            return key.equals("sandstone") || key.equals("red_sandstone") ? 1.875F : 1.0F;
        }
        if (item instanceof ItemSpade) {
            return 0.5F;
        }
        if (item instanceof ItemSword) {
            return 2.0F;
        }
        return 0.0F;
    }

    private static float getBaseDecayForAttackingEntity(ItemStack held) {
        Item item = held.getItem();
        if (item instanceof ItemSword) {
            return 0.5F;
        }
        if (item instanceof ItemPickaxe || item instanceof ItemAxe || item instanceof ItemSpade) {
            return 1.0F;
        }
        return 0.0F;
    }

    /**
     * Progress per tick (pre-核 §四.4.2). This is the value vanilla 1.12
     * derives from {@code Block.getPlayerRelativeBlockHardness} — both the
     * client digging clock and the server progress reporter consume one
     * funnel, which is why the mixin point lives there.
     */
    public static float getProgressPerTick(EntityPlayer player, IBlockState state, World world, BlockPos pos) {
        float hardness = getHardness(state, world, pos);
        if (hardness == 0.0F) {
            return 1.0F;
        }
        float str = getCurrentPlayerStrVsBlock(player, state, world, pos, true);
        float rel;
        if (hardness < 0.0F || str <= 0.0F) {
            rel = -1.0F;
        } else {
            rel = hardness / str;
        }
        if (rel >= 0.0F && rel < INSTANT_REL) {
            rel = 0.0F;
        }
        float relStr = rel < 0.0F ? 0.0F : (rel == 0.0F ? PROGRESS_BASE : 1.0F / rel);
        return relStr / PROGRESS_BASE;
    }

    /**
     * R196 tool grade for the vanilla set (audit P0.2/P1.2: the R196 grade
     * = metal ? material.min : material.min − 1). Vanilla operand levels map
     * {wood 0, stone 1, iron 3, diamond 3, gold 0} — the divergence note on
     * Iron(3) was confirmed by the grade table; gold stays 0 in vanilla
     * numerals, which cannot currently be lifted without ToolMaterial
     * identity, and gold tools losing grade parity is accepted for v1.
     */
    private static int getToolGrade(ItemStack held, String toolClass) {
        int level = held.getItem().getHarvestLevel(held, toolClass, null, null);
        return Math.max(0, level) <= 1 ? level : 3;
    }

    /**
     * Effective held tool (ItemTool.java:141-152, audit P1.2 final): material
     * list ∩ block material + grade ≥ block min. For the vanilla set the
     * R196 materials_effective_against lists collapse to the matching tool
     * class ({@code Block.getHarvestTool}); exact per-material lists land
     * with the 追加任务 5 dump.
     */
    public static boolean isEffectiveAgainstBlock(ItemStack held, IBlockState state) {
        if (held.isEmpty() || !(held.getItem() instanceof ItemTool)) {
            return false;
        }
        String requiredKind = state.getBlock().getHarvestTool(state);
        if (requiredKind == null) {
            // Blocks without a vanilla tool class: pickaxes stay the R196
            // stone-family carrier; the registry maps everything else.
            return held.getItem() instanceof ItemPickaxe && getToolGrade(held, "pickaxe") >= getMinHarvestLevel(state);
        }
        int grade = getToolGrade(held, requiredKind);
        return grade >= 0 && grade >= getMinHarvestLevel(state);
    }

    /** R196 material efficiency (预核 §2.1 表) mapped onto the vanilla operand levels. */
    private static float getMaterialEfficiency(ItemStack held) {
        String kind = held.getItem() instanceof ItemPickaxe ? "pickaxe"
                : held.getItem() instanceof ItemSpade ? "shovel" : "axe";
        int level = held.getItem().getHarvestLevel(held, kind, null, null);
        switch (MathHelper.clamp(level, 0, 3)) {
            case 1: return 1.25F; // flint-like band
            case 2: return 2.0F;  // iron-like band
            case 3: return 2.5F;  // diamond-like band
            default: return 1.0F; // wood band (gold falls here in vanilla numerals)
        }
    }

    /** Aqua affinity on any armor piece (R196 Environment of §4.1, line 332). */
    private static boolean hasAquaAffinity(EntityPlayer player) {
        for (ItemStack armor : player.getArmorInventoryList()) {
            if (!armor.isEmpty() && EnchantmentHelper.getEnchantmentLevel(Enchantments.AQUA_AFFINITY, armor) > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * MITE hasFoodEnergy (satiation/nutrition); the 1.4nutrition system does
     * not expose a unified check yet, so the vanilla food bar stands in —
     * flagged for the stage-1.5 satiation reform.
     */
    private static boolean hasFoodEnergy(EntityPlayer player) {
        return player.getFoodStats().getFoodLevel() > 0 || player.getFoodStats().getSaturationLevel() > 0;
    }

    private ETIMMining() {
    }
}
