package io.github.etim.etim.mining;

import java.util.HashMap;
import java.util.Map;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.ETIM;
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
 * </ul></p>
 */
public final class ETIMMining {

    /** Instant tier: relative hardness below 3/1024 counts as 0 → 512/tick. */
    private static final float INSTANT_REL = 0.0029296875F;

    /** Cobweb multiplier without an effective tool (EntityPlayer:889-905). */
    private static final float WEB_FACTOR = 0.2F;

    /** Water / airborne divisor (EntityPlayer:907-925); the hungry divisor is configurable (ETIMConfig.hungerDigStrDivisor). */
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
        // Batch-B2 four-ore rows (R196 BlockOre constructor third arg = the
        // pickaxe harvest level 2/2/3/4; hardness 2.5/2.5/3.5/4.0 per the
        // ETIMBlockOre javadoc anchors — 批文 §二.3).
        put("ore_copper", 2.5F, 2);
        put("ore_silver", 2.5F, 2);
        put("ore_mithril", 3.5F, 3);
        put("ore_adamantium", 4.0F, 4);
        put("glass", 2.0F, 0);
        // ❗F-5-31（audit20-05 R8）缺行补全（R196 行号见分卷 05 §2.4；清单不含 bed/planks
        // —— portable 面 pin 吸收、planks 硬度 0.8 在案 —— G 系 cooloff 判据面不受扰）：
        put("obsidian", 2.4F, 3);           // R196 :256 + Material min 3
        put("netherrack", 1.6F, 2);         // R196 :426 + Material min 2
        put("tnt", 1.0F, 0);                // R196 :239（portable pin 4.0×hardness 恢复 128t，免 hardness==0 早退击穿）
        put("snow", 0.05F, 0);              // R196 :381
        put("fence", 0.4F, 0);              // R196 :416
        put("coal_block", 1.2F, 1);         // R196 :728 区 + BlockOreStorage modify(+1)
        put("enchanting_table", 2.4F, 0);   // R196 :549 区
        put("ice", 1.0F, 0);                // R196 :387
        put("melon_block", 0.6F, 0);        // R196 :502
        put("glass_pane", 0.1F, 0);         // R196 :499
        put("mob_spawner", 3.0F, 0);        // R196 :275
        put("hardened_clay", 1.8F, 0);      // R196 1.8
        put("stained_hardened_clay", 1.8F, 0);
        put("clay", 0.8F, 0);               // R196 :399
        put("sapling", 0.02F, 0);
        put("deadbush", 0.02F, 0);
        // 等级侧（BlockOreStorage:6 modify(+1)）——硬度保持 vanilla，只抬等级门：
        BLOCK_MIN_LEVEL.put("gold_block", 3);
        BLOCK_MIN_LEVEL.put("iron_block", 4);
        BLOCK_MIN_LEVEL.put("diamond_block", 5);
        BLOCK_MIN_LEVEL.put("lapis_block", 2);
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

    /** The R196 block-level row only ({@code null} = no row) — the dig-gate face (F-15-F1) stacks the material level under it. */
    public static Integer getTableMinLevel(IBlockState state) {
        return BLOCK_MIN_LEVEL.get(state.getBlock().getRegistryName().getPath());
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
            str = isEffectiveAgainstBlock(held, state) ? BASE_TOOL_STR * getMaterialEfficiency(held, state) : 0.0F;
            if (str < 1.0F) {
                return getCurrentPlayerStrVsBlock(player, state, world, pos, false);
            }
            logMineSpeed(held, state, str);
            int efficiency = EnchantmentHelper.getEnchantmentLevel(Enchantments.EFFICIENCY, held);
            if (efficiency > 0) { // ❗F-5-24（audit20-05 R1）≡ R196 EntityPlayer:897-901：无附魔不加成
                str += (efficiency * efficiency) + 1;
            }
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
            str /= ETIMConfig.hungerDigStrDivisor;
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
        int loss;
        if (held.isEmpty() || !held.getItem().isDamageable()) {
            loss = 0;
        } else if (player.capabilities.isCreativeMode || isPortable(state)) {
            loss = 0;
        } else {
            float hardness = getHardness(state, world, pos);
            if (hardness <= 0.0F) {
                loss = 0;
            } else if (getCurrentPlayerStrVsBlock(player, state, world, pos, true) <= 1.0F) {
                loss = 0;
            } else {
                float decay = 100.0F * getBaseDecayForBreakingBlocks(held, state);
                loss = Math.max(Math.max((int) (hardness * decay), (int) (decay / 20.0F)), 1);
            }
        }
        logToolDecay("breaking", held, state, loss);
        return loss;
    }

    /** MITE attack decay: {@code max((int)(100 × baseDecay), 1)} (getToolDecayFromAttackingEntity, offsets 0-13). */
    public static int getToolDecayFromAttackingEntity(ItemStack held) {
        int loss;
        if (held.isEmpty() || !held.getItem().isDamageable()) {
            loss = 0;
        } else {
            float decay = 100.0F * getBaseDecayForAttackingEntity(held);
            loss = Math.max((int) decay, 1);
        }
        logToolDecay("attacking", held, null, loss);
        return loss;
    }

    private static float getBaseDecayForBreakingBlocks(ItemStack held, IBlockState state) {
        Item item = held.getItem();
        String key = state.getBlock().getRegistryName().getPath();
        boolean sandstone = key.equals("sandstone") || key.equals("red_sandstone");
        // Batch-B2 metal tools first (批文 §〇 衰减全表): the specialized
        // types override the vanilla-class bands below. The sandstone base
        // for the axe family is R196 ItemAxe:34.
        if (item instanceof io.github.etim.etim.metal.ETIMItemHatchet) {
            return sandstone ? 1.875F * 4F / 3F : 4F / 3F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemBattleAxe) {
            return sandstone ? 1.875F * 1.25F : 1.25F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemWarHammer) {
            return 2F / 3F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemHoe) {
            return 2.0F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemMattock) {
            return 0.4F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemShearsRusted) {
            return 1.0F; // R196 ItemShears:37-39
        }
        // scythe/knife 批 (批文 §二.6): scythe = R196 ItemScythe:26-28; the
        // flint knife = the dagger 2.0 base ÷4/÷2 (R196 ItemKnife:21-25).
        if (item instanceof io.github.etim.etim.metal.ETIMItemScythe) {
            return io.github.etim.etim.metal.ETIMItemScythe.isScytheBlock(state) ? 0.5F : 2.0F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemKnifeFlint) {
            net.minecraft.block.material.Material mat = state.getMaterial();
            boolean clothLike = mat == net.minecraft.block.material.Material.CLOTH
                    || mat == net.minecraft.block.material.Material.PLANTS
                    || mat == net.minecraft.block.material.Material.VINE;
            return clothLike ? 0.5F : 1.0F;
        }
        if (item instanceof ItemPickaxe) {
            return 1.0F;
        }
        if (item instanceof ItemAxe) {
            return sandstone ? 1.875F : 1.0F;
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
        // Batch-B2 metal tools first (批文 §〇 衰减全表).
        if (item instanceof io.github.etim.etim.metal.ETIMItemHatchet) {
            return 4F / 3F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemBattleAxe) {
            return 0.75F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemWarHammer) {
            return 2F / 3F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemHoe) {
            return 2.0F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemMattock) {
            return 0.8F;
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemShearsRusted) {
            return 2.0F; // R196 ItemShears:42-44
        }
        if (item instanceof io.github.etim.etim.metal.ETIMItemScythe) {
            return 4.0F; // R196 ItemScythe:31-37 (sharpness/vampiric branches dead, C-4)
        }
        if (item instanceof ItemSword) {
            return 0.5F; // the flint knife rides here (no R196 override, ItemKnife)
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
     * R196 tool grade. Batch-B2 ETIM metal tools read the grade DIRECTLY
     * (G-FB-12 绕 fold, 批文 §二.2 — copper keeps grade 2 and cannot mine
     * mithril ore; adamantium is never folded down). The vanilla set keeps
     * the audit-P1.2 fold ({@code <=1 ? level : 3}; vanilla operand levels
     * map {wood 0, stone 1, iron 3, diamond 3, gold 0} — gold tools losing
     * grade parity is accepted for v1).
     */
    private static int getToolGrade(ItemStack held, String toolClass) {
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMMetalGear) {
            return ((io.github.etim.etim.metal.ETIMMetalGear) held.getItem()).etimGrade();
        }
        int level = held.getItem().getHarvestLevel(held, toolClass, null, null);
        return Math.max(0, level) <= 1 ? level : 3;
    }

    /**
     * Effective held tool (ItemTool.java:141-152, audit P1.2 final): material
     * list ∩ block material + grade ≥ block min. For the vanilla set the
     * R196 materials_effective_against lists collapse to the matching tool
     * class ({@code Block.getHarvestTool}). Batch-B2 metal hoes carry the
     * R196 ItemHoe:6 material list (grass/dirt/sand/snow/cake/craftedSnow
     * — the 1.12 GROUND/ORGANIC/SNOW/SAND/CAKE set) since the vanilla hoe
     * lives outside the ItemTool tree. Metal swords/daggers carry the
     * R196 ItemSword:6 material list the same way (carpet/cloth/leaves/
     * plants/pumpkin→GOURD/vine/web); vanilla swords stay untouched (not
     * ItemTool in 1.12, not ETIMItemSword).
     */
    public static boolean isEffectiveAgainstBlock(ItemStack held, IBlockState state) {
        if (held.isEmpty()) {
            return false;
        }
        int minLevel = getMinHarvestLevel(state);
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMItemHoe) {
            int grade = ((io.github.etim.etim.metal.ETIMItemHoe) held.getItem()).etimGrade();
            boolean ok = isHoeMaterial(state) && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMItemSword) {
            int grade = ((io.github.etim.etim.metal.ETIMItemSword) held.getItem()).etimGrade();
            boolean ok = isSwordMaterial(state) && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMItemShearsRusted) {
            int grade = ((io.github.etim.etim.metal.ETIMItemShearsRusted) held.getItem()).etimGrade();
            boolean ok = isShearsMaterial(state) && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        // scythe/knife 批 (批文 §二.6): R196 scythe effective set = tallGrass +
        // crops (ItemScythe:6); the flint knife inherits the R196
        // ItemSword:6 material list through ItemDagger (no override).
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMItemScythe) {
            int grade = ((io.github.etim.etim.metal.ETIMItemScythe) held.getItem()).etimGrade();
            boolean ok = io.github.etim.etim.metal.ETIMItemScythe.isScytheBlock(state) && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMItemKnifeFlint) {
            int grade = ((io.github.etim.etim.metal.ETIMItemKnifeFlint) held.getItem()).etimGrade();
            boolean ok = isSwordMaterial(state) && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        if (!(held.getItem() instanceof ItemTool)) {
            return false;
        }
        String requiredKind = state.getBlock().getHarvestTool(state);
        if (requiredKind == null) {
            // Blocks without a vanilla tool class: pickaxes stay the R196
            // stone-family carrier; the registry maps everything else.
            int grade = getToolGrade(held, "pickaxe");
            boolean ok = held.getItem() instanceof ItemPickaxe && grade >= minLevel;
            if (!ok) {
                logGradeDeny(held, state, grade);
            }
            return ok;
        }
        int grade = getToolGrade(held, requiredKind);
        boolean ok = grade >= 0 && grade >= minLevel;
        if (!ok && grade >= 0) {
            // The tool-class face (grade < 0) is a "wrong tool", not a grade deny.
            logGradeDeny(held, state, grade);
        }
        return ok;
    }

    /** R196 ItemHoe:6 material list (1.12 mapping). */
    private static boolean isHoeMaterial(IBlockState state) {
        net.minecraft.block.material.Material material = state.getMaterial();
        return material == net.minecraft.block.material.Material.GROUND
                || material == net.minecraft.block.material.Material.GRASS
                || material == net.minecraft.block.material.Material.SAND
                || material == net.minecraft.block.material.Material.SNOW
                || material == net.minecraft.block.material.Material.CRAFTED_SNOW
                || material == net.minecraft.block.material.Material.CAKE;
    }

    /** R196 ItemSword:6 material list (1.12 mapping); dagger inherits via ETIMItemDagger extends ETIMItemSword. */
    private static boolean isSwordMaterial(IBlockState state) {
        net.minecraft.block.material.Material material = state.getMaterial();
        return material == net.minecraft.block.material.Material.CARPET
                || material == net.minecraft.block.material.Material.CLOTH
                || material == net.minecraft.block.material.Material.LEAVES
                || material == net.minecraft.block.material.Material.PLANTS
                || material == net.minecraft.block.material.Material.GOURD
                || material == net.minecraft.block.material.Material.VINE
                || material == net.minecraft.block.material.Material.WEB;
    }

    /** R196 ItemShears:6-7 material list + trip wire block (B3 批文 §〇). */
    private static boolean isShearsMaterial(IBlockState state) {
        net.minecraft.block.material.Material material = state.getMaterial();
        return material == net.minecraft.block.material.Material.CLOTH
                || material == net.minecraft.block.material.Material.LEAVES
                || material == net.minecraft.block.material.Material.PLANTS
                || material == net.minecraft.block.material.Material.VINE
                || material == net.minecraft.block.material.Material.WEB
                || state.getBlock() == net.minecraft.init.Blocks.TRIPWIRE;
    }

    /** [MiningLog] grade-deny row, deduped per (item, block, grade/required) — the W2 matrix channel. */
    private static final Map<String, String> LAST_DENY_SIGS = new HashMap<>();

    private static void logGradeDeny(ItemStack held, IBlockState state, int grade) {
        if (!ETIMConfig.miningDebugLog || grade < 0) {
            return;
        }
        String item = held.getItem().getRegistryName().toString();
        String block = state.getBlock().getRegistryName().getPath();
        int required = getMinHarvestLevel(state);
        String sig = grade + "/" + required;
        String key = item + "@" + block;
        if (sig.equals(LAST_DENY_SIGS.get(key))) {
            return;
        }
        LAST_DENY_SIGS.put(key, sig);
        ETIM.LOGGER.info("[MiningLog] mine deny grade=" + grade + " required=" + required
                + " item=" + item + " block=" + block + " [server]");
    }

    /** [MiningLog] effective-dig speed row, deduped per (item, block, str) — the W3 efficiency channel. */
    private static final Map<String, Float> LAST_SPEED_SIGS = new HashMap<>();

    private static void logMineSpeed(ItemStack held, IBlockState state, float str) {
        if (!ETIMConfig.miningDebugLog || held.isEmpty()) {
            return;
        }
        String item = held.getItem().getRegistryName().toString();
        String block = state.getBlock().getRegistryName().getPath();
        String key = item + "@" + block;
        Float last = LAST_SPEED_SIGS.get(key);
        if (last != null && last.floatValue() == str) {
            return;
        }
        LAST_SPEED_SIGS.put(key, str);
        ETIM.LOGGER.info("[MiningLog] mine speed item=" + item + " block=" + block + " str=" + str + " [server]");
    }

    /** [MiningLog] tool-decay row, last-sig deduped per (face, item, block for the breaking face) — the W9 channel (loss=0 = negative-evidence row). */
    private static final Map<String, String> LAST_DECAY_SIGS = new HashMap<>();

    private static void logToolDecay(String face, ItemStack held, IBlockState state, int loss) {
        if (!ETIMConfig.miningDebugLog || held.isEmpty()) {
            return;
        }
        String item = held.getItem().getRegistryName().toString();
        String key = face + "|" + item;
        String row = "[MiningLog] tool decay face=" + face + " item=" + item;
        if (state != null) {
            String block = state.getBlock().getRegistryName().getPath();
            key += "|" + block;
            row += " block=" + block;
        }
        row += " loss=" + loss + " [server]";
        if (Integer.toString(loss).equals(LAST_DECAY_SIGS.get(key))) {
            return;
        }
        LAST_DECAY_SIGS.put(key, Integer.toString(loss));
        ETIM.LOGGER.info(row);
    }

    /** R196 material efficiency mapped onto the vanilla operand levels; B2 metal tools read direct. */
    private static float getMaterialEfficiency(ItemStack held, IBlockState state) {
        if (held.getItem() instanceof io.github.etim.etim.metal.ETIMMetalGear) {
            float efficiency = ((io.github.etim.etim.metal.ETIMMetalGear) held.getItem()).etimEfficiency();
            if (state != null && held.getItem() instanceof io.github.etim.etim.metal.ETIMItemAxe
                    && (state.getBlock() == Blocks.SANDSTONE || state.getBlock() == Blocks.RED_SANDSTONE)) {
                efficiency *= 0.5F; // R196 ItemAxe:19 sandstone half-efficiency
            }
            return efficiency;
        }
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
     * MITE hasFoodEnergy (satiation/nutrition); delegates to the shared
     * task-2.3 predicate so stage 1.5 has ONE swap point.
     */
    private static boolean hasFoodEnergy(EntityPlayer player) {
        return io.github.etim.etim.hunger.ETIMHunger.hasFoodEnergy(player);
    }

    private ETIMMining() {
    }
}
