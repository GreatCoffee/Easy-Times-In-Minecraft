package io.github.etim.etim.commands;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlockLog;
import io.github.etim.etim.combat.ETIMBlocking;
import io.github.etim.etim.combat.R196ArmorModel;
import io.github.etim.etim.harness.TestDriver;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import io.github.etim.etim.playerstate.PlayerStatLimits;
import io.github.etim.etim.quality.EnumQuality;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.PlayerNotFoundException;
import net.minecraft.command.WrongUsageException;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.entity.projectile.EntityTippedArrow;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.EnumAction;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.nbt.NBTTagList;
import net.minecraft.network.play.server.SPacketSetExperience;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.DamageSource;
import net.minecraft.util.FoodStats;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.text.Style;
import net.minecraft.util.text.TextComponentString;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.util.text.TextFormatting;

import java.util.Arrays;

/**
 * {@code /etest} — dev/test state setter for the debug-overlay test rounds
 * (development facility, mirrors {@code /state}). Lets the tester stage
 * whatever system state the currently tested task needs instead of grinding
 * to it in-game:
 *
 * <ul>
 *   <li>{@code /etest food <satiation> [nutrition] [player]} — the dual
 *       pools (task 1.5), clamped to the per-pool limit; {@code 0 0} starves
 *       the player for the 2.3 gates. Under the legacy food model:
 *       {@code /etest food <points> [saturation] [player]}.</li>
 *   <li>{@code /etest health <points> [player]} — health, clamped to the
 *       cap.</li>
 *   <li>{@code /etest level <number> [player]} — XP level (task-1.2 cap
 *       applies).</li>
 *   <li>{@code /etest debt <levels> [player]} — staged death-debt levels
 *       (0..40).</li>
 *   <li>{@code /etest enchant <slot> <level> [player]} — injects Endurance
 *       into the slot's stack NBT (vanilla {@code /enchant} only touches the
 *       held item and refuses same-level restaging, so one RCON step covers
 *       the level-sampling rounds and the "worn" semantics natively).</li>
 *   <li>{@code /etest attack <selector> [player]} / {@code dig <x> <y> <z>
 *       [player]} / {@code useblock <x> <y> <z> [player]} / {@code useitem
 *       [player]} — T1 packet driver: schedules the vanilla client→server
 *       packets ({@code CPacketUseEntity(ATTACK)}, digging START/STOP, right
 *       click on block / into air) onto the acting player's
 *       {@code NetHandlerPlayServer} over the next server ticks, so the
 *       drain-probe rounds run without real client input. Each executed step
 *       logs a {@code [TestLog]} line.</li>
 *   <li>{@code /etest hold <item> [player]} — stages the main hand directly
 *       (T2 缺口① 裁定=b); {@code /etest release [player]} — queues the
 *       bow-release / eat-stop packet. Together they close the held-item and
 *       hold-use gaps so R7/R8/R9 join the one-RCON suite.</li>
 * </ul>
 *
 * Every sub-command accepts an optional trailing {@code [player]} argument
 * (a player name or a selector such as {@code @p}) so RCON/console can drive
 * the test rounds; when it is omitted the sender must be a player. In the
 * two-token-value shape ({@code food <satiation> [nutrition]}) the middle
 * token is the nutrition/saturation value when numeric, otherwise the player
 * argument — pure-digit player names must use a selector.
 */
public class CommandDevTest extends CommandBase {

    @Override
    public String getName() {
        return "etest";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 2; // ❗F-D2-12（audit20-D2 R1）：与 vanilla /xp、/give 同级
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return new TextComponentTranslation("commands.etest.usage").getUnformattedText();
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length == 0) {
            throw new WrongUsageException("commands.etest.usage");
        }

        switch (args[0]) {
            case "food":
            case "hunger":
                executeFood(server, sender, args);
                break;
            case "health":
                executeHealth(server, sender, args);
                break;
            case "level":
                executeLevel(server, sender, args);
                break;
            case "debt":
                executeDebt(server, sender, args);
                break;
            case "enchant":
                executeEnchant(server, sender, args);
                break;
            case "enchantprobe":
                executeEnchantProbe(server, sender, args);
                break;
            case "blockprobe":
                executeBlockProbe(server, sender, args);
                break;
            case "hurt":
                executeHurt(server, sender, args);
                break;
            case "attack":
                executeAttack(server, sender, args);
                break;
            case "dig":
                executeDig(server, sender, args);
                break;
            case "useblock":
                executeUseBlock(server, sender, args);
                break;
            case "useitem":
                executeUseItem(server, sender, args);
                break;
            case "hold":
                executeHold(server, sender, args);
                break;
            case "release":
                executeRelease(server, sender, args);
                break;
            case "damage":
                executeDamage(server, sender, args);
                break;
            case "quality":
                executeQuality(server, sender, args);
                break;
            case "anvilwear":
                executeAnvilWear(server, sender, args);
                break;
            default:
                throw new WrongUsageException("commands.etest.usage");
        }
    }

    private static void executeFood(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        // Target: /etest food <satiation> [value] [player]. The middle token
        // is the nutrition/saturation value when numeric, otherwise the
        // optional player argument; four tokens are always <satiation>
        // <value> <player>. Pure-digit player names use a selector.
        EntityPlayerMP player;
        if (args.length >= 4) {
            player = CommandBase.getPlayer(server, sender, args[3]);
        } else if (args.length == 3 && !isNumber(args[2])) {
            player = CommandBase.getPlayer(server, sender, args[2]);
        } else if (sender instanceof EntityPlayerMP) {
            player = (EntityPlayerMP) sender;
        } else {
            throw new PlayerNotFoundException("commands.state.no_player");
        }
        if (ETIMConfig.foodModel) {
            // Task 1.5 pools: /etest food <satiation> <nutrition>
            int limit = ETIMFoodStats.getLimit(player);
            int satiation = CommandBase.parseInt(args[1], 0, limit);
            int nutrition = args.length >= 3 && isNumber(args[2])
                    ? CommandBase.parseInt(args[2], 0, limit)
                    : satiation;
            ETIMFoodStats.IFoodState state = ETIMFoodStats.get(player);
            if (state == null) {
                return;
            }
            state.setSatiation(satiation);
            state.setNutrition(nutrition);
            ETIMFoodStats.syncVanillaFoodLevel(player);
            respond(player, "commands.etest.food_set_pool", satiation, nutrition, limit);
        } else {
            // Legacy model: /etest food <points> [saturation]
            int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
            int level = CommandBase.parseInt(args[1], 0, cap);
            float saturation = args.length >= 3 && isNumber(args[2])
                    ? (float) parseDouble(args[2], 0.0D, cap) : 0.0F;
            FoodStats stats = player.getFoodStats();
            stats.setFoodLevel(level);
            stats.setFoodSaturationLevel(saturation); // vanilla clamps saturation to the food level
            respond(player, "commands.etest.food_set_bar", level, stats.getSaturationLevel(), cap);
        }
        FoodDebugNetwork.sync(player);
    }

    private static void executeHealth(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        float health = (float) parseDouble(args[1], 0.0D, cap);
        player.setHealth(health);
        respond(player, "commands.etest.health_set", health, cap);
    }

    private static void executeLevel(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        int target = CommandBase.parseInt(args[1], 0, ETIMConfig.levelCap);
        // R196: the LEVEL derives from POINTS (cost budget §53-56 reads
        // experienceTotal). A legit level-N player owns exactly curve(N)
        // points — set the trio via the curve helper so the HUD, the
        // death-chain settle arithmetic and the quality budget all agree
        // (run26 157-round report).
        io.github.etim.etim.playerstate.ETIMXp.applyTotal(player,
                io.github.etim.etim.playerstate.ETIMXp.pointsForLevel(target));
        respond(player, "commands.etest.level_set", player.experienceLevel);
    }

    // ❗F-D2-14（audit20-D2 R3）：experiencePointsForLevel 死码已删——vanilla
    // 1.12.2 曲线对照 = level<=16: L²+6L / <=30: 2.5L²−40.5L+360 / else: 4.5L²−162.5L+2220
    // （curve 仅作注释引用，不留可调用私有方法）。

    /**
     * {@code /etest debt <levels> [player]} — stages the R196 death-debt state directly
     * (negative level, linear total −20·L) without grinding deaths; the same
     * shape the respawn settle writes (death/ETIMDeathXp linear negative
     * half). Unlimited to 0..40 (= R196 xp(−40) floor).
     */
    private static void executeDebt(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        int debt = CommandBase.parseInt(args[1], 0, 40);
        player.experienceLevel = -debt;
        player.experienceTotal = -20 * debt;
        player.experience = 0.0F;
        player.connection.sendPacket(new SPacketSetExperience(
                player.experience, player.experienceTotal, player.experienceLevel));
        respond(player, "commands.etest.debt_set", -debt, player.experienceTotal);
    }

    /**
     * {@code /etest enchant <slot> <level> [ench] [player]} — writes an ETIM
     * enchantment straight into the slot's stack NBT. Vanilla {@code /enchant}
     * is held-item-only and merges levels via the anvil rules (same-level
     * restaging rejected), while the sampling rounds need to restage the
     * slot in one step. 1.12.2 {@link ItemStack#addEnchantment} is
     * APPEND semantics (same-id entries accumulate; EnchantmentHelper reads
     * the FIRST matching entry — E1, harness-t01-t02-verdict), so same-id
     * entries are filtered out before the add: exactly one entry survives,
     * at the injected level (this also cleans an already-polluted stack).
     * Slot names follow {@link EntityEquipmentSlot#fromString}; offhand is
     * excluded (Endurance reads the armor semantics, C1). The NBT change
     * reaches the client via the inventory container's per-tick
     * detectAndSendChanges.
     *
     * <p>{@code ench} is {@code endurance} (default, batch G4/G5) or
     * {@code piercing} (batch E / AD-7). The token is recognised by name;
     * anything else at that position is the player argument — the same
     * numeric-vs-selector disambiguation rule as {@code /etest food}.</p>
     */
    private static void executeEnchant(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 3) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityEquipmentSlot slot;
        try {
            slot = EntityEquipmentSlot.fromString(args[1]);
        } catch (IllegalArgumentException e) {
            throw new WrongUsageException("commands.etest.usage");
        }
        if (slot == EntityEquipmentSlot.OFFHAND) {
            throw new WrongUsageException("commands.etest.usage");
        }
        Enchantment enchantment = ETIMEnchantments.ENDURANCE;
        int playerIndex = 3;
        if (args.length > 3 && "piercing".equalsIgnoreCase(args[3])) {
            enchantment = ETIMEnchantments.PIERCING;
            playerIndex = 4;
        } else if (args.length > 3 && "endurance".equalsIgnoreCase(args[3])) {
            playerIndex = 4;
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, playerIndex);
        ItemStack stack = player.getItemStackFromSlot(slot);
        if (stack.isEmpty()) {
            throw new CommandException("commands.etest.enchant_empty_slot", args[1]);
        }
        int level = CommandBase.parseInt(args[2], 1, enchantment.getMaxLevel());
        // E1: addEnchantment appends, so drop same-id entries first — the
        // ench list ends up holding exactly one entry of this enchantment.
        int id = Enchantment.getEnchantmentID(enchantment);
        NBTTagCompound tag = stack.getTagCompound() != null ? stack.getTagCompound() : new NBTTagCompound();
        NBTTagList list = tag.getTagList("ench", 10);
        NBTTagList kept = new NBTTagList();
        for (int i = 0; i < list.tagCount(); i++) {
            NBTTagCompound entry = list.getCompoundTagAt(i);
            if (entry.getShort("id") != id) {
                kept.appendTag(entry); // keep other enchantments verbatim (no reverse lookup)
            }
        }
        tag.setTag("ench", kept);
        stack.setTagCompound(tag); // empty list must persist too
        stack.addEnchantment(enchantment, level);
        // S3b (harness-e1-retest N2): pass the enchant name + roman level as
        // translation components so the client renders it in its own language
        // (zh chat "耐力 IV" == tooltip), instead of the server-side
        // pre-translated en_US string. The [EtimTest] mirror logs the raw
        // TranslatableComponent (key form) — grep keys, not baked text.
        respond(player, "commands.etest.enchant_set", args[1],
                new TextComponentTranslation(enchantment.getName())
                        .appendSibling(new TextComponentString(" "))
                        .appendSibling(new TextComponentTranslation("enchantment.level." + level)),
                stack.getDisplayName());
    }

    /**
     * {@code /etest enchantprobe <slot> [src] [player]} — the AD-7 static +
     * carrier probe (batch E). Prints {@code [EnchantLog]} rows only on
     * invocation (no resident switch): the carrier gate of the held stack, the
     * acquisition windows, the 1.12 table clamp proof and the immediate-source
     * resolution. {@code src} = {@code melee} (default) | {@code arrow} |
     * {@code thrown} | {@code none}; the carrier row calls the PRODUCT helper
     * ({@link R196ArmorModel#piercingPoints}) instead of re-implementing it.
     */
    private static void executeEnchantProbe(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityEquipmentSlot slot;
        try {
            slot = EntityEquipmentSlot.fromString(args[1]);
        } catch (IllegalArgumentException e) {
            throw new WrongUsageException("commands.etest.usage");
        }
        String src = args.length > 2 ? args[2].toLowerCase(java.util.Locale.ROOT) : "melee";
        if (!"melee".equals(src) && !"arrow".equals(src) && !"thrown".equals(src) && !"none".equals(src)) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 3);
        ItemStack stack = player.getItemStackFromSlot(slot);
        Enchantment piercing = ETIMEnchantments.PIERCING;
        // Row 1 — carrier gate + max level (W2)
        ETIM.LOGGER.info("[EnchantLog] enchantprobe slot={} item={} canApply={} maxLevel={} [server]",
                slot, stack.isEmpty() ? "empty" : String.valueOf(stack.getItem().getRegistryName()),
                !stack.isEmpty() && piercing.canApplyAtEnchantingTable(stack), piercing.getMaxLevel());
        // Row 2 — acquisition windows (W3)
        StringBuilder windows = new StringBuilder();
        for (int level = 1; level <= piercing.getMaxLevel(); level++) {
            if (level > 1) {
                windows.append(' ');
            }
            windows.append('L').append(level).append('=')
                    .append(piercing.getMinEnchantability(level)).append('/')
                    .append(piercing.getMaxEnchantability(level));
        }
        ETIM.LOGGER.info("[EnchantLog] windows {} [server]", windows);
        // Row 3 — the 1.12 table clamp (power>15 → 15) and a live sample (W3)
        ETIM.LOGGER.info("[EnchantLog] table power={} slot0={} slot1={} slot2={} power30={} slot0={} slot1={} slot2={} "
                        + "bound=slot0:2..10,slot1:6..21,slot2:30..30 (power clamped to 15) [server]",
                15, tablePower(player, 0, 15, stack), tablePower(player, 1, 15, stack), tablePower(player, 2, 15, stack),
                30, tablePower(player, 0, 30, stack), tablePower(player, 1, 30, stack), tablePower(player, 2, 30, stack));
        // Row 4 — immediate-source resolution through the product helper (W9)
        DamageSource probe = probeSource(player, src);
        Entity immediate = probe.getImmediateSource();
        ItemStack carrier = R196ArmorModel.carrierOf(probe);
        ETIM.LOGGER.info("[EnchantLog] carrier src={} immediate={} carrier={} level={} pts={} [server]",
                src, immediate == null ? "none" : immediate.getClass().getSimpleName(),
                carrier == null || carrier.isEmpty() ? "none"
                        : String.valueOf(carrier.getItem().getRegistryName()),
                carrier == null || carrier.isEmpty() ? 0
                        : EnchantmentHelper.getEnchantmentLevel(piercing, carrier),
                R196ArmorModel.piercingPoints(probe));
    }

    /** The {@code /etest enchantprobe} src selector: the four damage-source shapes. */
    private static DamageSource probeSource(EntityPlayerMP player, String src) {
        switch (src) {
            case "arrow":
                return DamageSource.causeArrowDamage(new EntityTippedArrow(player.world, player), player);
            case "thrown":
                return DamageSource.causeThrownDamage(new EntitySnowball(player.world, player), player);
            case "none":
                return DamageSource.GENERIC;
            case "melee":
            default:
                return DamageSource.causePlayerDamage(player);
        }
    }

    private static int tablePower(EntityPlayerMP player, int slot, int power, ItemStack stack) {
        return EnchantmentHelper.calcItemStackEnchantability(player.getRNG(), slot, power, stack);
    }

    /**
     * {@code /etest attack <selector> [player]} — queues one
     * {@code CPacketUseEntity(ATTACK)} against the selector's entity
     * (resolved on the server thread, centered on the acting player, e.g.
     * {@code @e[type=zombie,limit=1]}), for the attackDrain probe rounds.
     */
    /**
     * {@code /etest blockprobe [player]} — the M7-2 blocking-state probe: the
     * carrier / action / use-state / stack-durability / config faces, all
     * carried on the [BlockLog] channel (the W1 arms drive it 19 times with
     * {@code hold}); the cfg re-read arm of W14 rides the second probe line.
     * Everything reads the PRODUCT helper ({@link ETIMBlocking}) instead of
     * re-implementing the gate.
     */
    private static void executeBlockProbe(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        EntityPlayerMP player = targetOrSender(server, sender, args, 1);
        ItemStack held = player.getHeldItemMainhand();
        ItemStack active = player.getActiveItemStack();
        ETIMBlockLog.carrier(held, ETIMBlocking.isBlockCarrier(held));
        ETIMBlockLog.action(held, held.isEmpty() ? EnumAction.NONE
                : held.getItem().getItemUseAction(held));
        ETIMBlockLog.state(player, active, held,
                !active.isEmpty() && ItemStack.areItemStacksEqual(active, held));
        ETIMBlockLog.probeDurability(player, held);
        ETIMBlockLog.probeConfig(player);
        respond(player, "commands.etest.blockprobe");
    }

    /**
     * {@code /etest hurt …} — the M7-1 blocking-verdict driver (input port of
     * the D-2 halving), two shapes:
     * <ul>
     *   <li>{@code hurt <mob-selector> <amount> [player]} — one
     *       {@code causeMobDamage} strike at the selected entity (the W3
     *       default: {@code hurt @e[type=zombie,limit=1] 8});</li>
     *   <li>{@code hurt <amount> [src] [player]} — a direct vanilla source
     *       strike (the W10 faces): {@code src} = {@code generic} (default) |
     *       {@code fire} (IN_FIRE) | {@code oow} / {@code absolute}
     *       (OUT_OF_WORLD).</li>
     * </ul>
     * Both resolve and strike on the server thread through
     * {@link TestDriver#hurt}/{@link TestDriver#hurtByMob} (never on the RCON
     * thread); the spacing face of W7/W8 stays with the RCON script (≥11
     * ticks between strikes).
     */
    private static void executeHurt(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        if (!isNumber(args[1])) {
            if (args.length < 3) {
                throw new WrongUsageException("commands.etest.usage");
            }
            EntityPlayerMP player = targetOrSender(server, sender, args, 3);
            float amount = (float) parseDouble(args[2], 0.0D, 1000.0D);
            TestDriver.hurtByMob(player, args[1], amount);
            respond(player, "commands.etest.drive_queued", "hurt " + args[1] + " " + args[2]);
            return;
        }
        float amount = (float) parseDouble(args[1], 0.0D, 1000.0D);
        String src = args.length >= 3 && !isNumber(args[2]) ? args[2].toLowerCase(java.util.Locale.ROOT) : "generic";
        int playerIndex = args.length >= 3 && !isNumber(args[2]) ? 3 : 2;
        EntityPlayerMP player = targetOrSender(server, sender, args, playerIndex);
        TestDriver.hurt(player, sourceFor(src), amount, src);
        respond(player, "commands.etest.drive_queued", "hurt " + args[1] + " " + src);
    }

    /** The W10 source faces. */
    private static DamageSource sourceFor(String src) throws WrongUsageException {
        switch (src) {
            case "fire":
                return DamageSource.IN_FIRE;
            case "oow":
            case "absolute":
                return DamageSource.OUT_OF_WORLD;
            case "generic":
                return DamageSource.GENERIC;
            default:
                throw new WrongUsageException("commands.etest.usage");
        }
    }

    private static void executeAttack(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        TestDriver.attack(player, args[1]);
        respond(player, "commands.etest.drive_queued", "attack " + args[1]);
    }

    /**
     * {@code /etest dig <x> <y> <z> [player]} — queues the dig pair: digging
     * START on the block (reach-checked by the vanilla handler) and STOP
     * after the driver's hold window, so the per-tick digDrain face
     * accumulates and the break completes server-side.
     */
    private static void executeDig(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 4) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 4);
        BlockPos pos = CommandBase.parseBlockPos(sender, args, 1, false);
        TestDriver.dig(player, pos);
        respond(player, "commands.etest.drive_queued", "dig " + pos);
    }

    /** {@code /etest useblock <x> <y> <z> [player]} — queues one right-click on the block. */
    private static void executeUseBlock(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 4) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 4);
        BlockPos pos = CommandBase.parseBlockPos(sender, args, 1, false);
        TestDriver.useBlock(player, pos);
        respond(player, "commands.etest.drive_queued", "useblock " + pos);
    }

    /** {@code /etest useitem [player]} — queues one right-click into the air. */
    private static void executeUseItem(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        EntityPlayerMP player = targetOrSender(server, sender, args, 1);
        TestDriver.useItem(player);
        respond(player, "commands.etest.drive_queued", "useitem");
    }

    /**
     * {@code /etest hold <item> [player]} — stages the main hand directly
     * (T2 缺口① 裁定=b：R7 place / R8 till / R9 bow need a held item, and
     * the 1.12 hotbar selection is client-side state unreachable from RCON).
     * Mirrors the T0-2 staging pattern: direct inventory write into the
     * currently-selected hotbar slot ({@code currentItem} = what
     * {@code getHeldItem(MAIN_HAND)} reads), client syncs via the inventory
     * container's per-tick detectAndSendChanges. Accepts the plain registry
     * name or the {@code minecraft:} domain form.
     */
    private static void executeHold(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        Item item = Item.getByNameOrId(args[1]);
        if (item == null) {
            throw new CommandException("commands.etest.hold_bad_item", args[1]);
        }
        ItemStack stack = new ItemStack(item, 1);
        player.inventory.setInventorySlotContents(player.inventory.currentItem, stack);
        respond(player, "commands.etest.hold_set", stack.getDisplayName());
    }

    /** {@code /etest release [player]} — queues one use-stop packet (bow release / eat stop). */
    private static void executeRelease(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        EntityPlayerMP player = targetOrSender(server, sender, args, 1);
        TestDriver.release(player);
        respond(player, "commands.etest.drive_queued", "release");
    }

    /**
     * Target-player resolution for the sub-commands whose only optional token
     * is the trailing one ({@code health} / {@code level} / {@code debt}):
     * when present it is the player argument (a name or a selector such as
     * {@code @p}), otherwise the sender resolves the target and must then be
     * a player (RCON/console always passes the target explicitly).
     */
    /**
     * 批三修理面 (anvil-repair chain) test faces:
     *
     * <ul>
     *   <li>{@code /etest damage <amount> [player]} — adds N points of
     *       durability damage to the HELD main-hand item (capped at
     *       maxDamage). Creates the damaged-gear state the repair window
     *       needs; the damage value rides the [EtimTest] row.</li>
     *   <li>{@code /etest quality <poor|fine|average|excellent|superb|masterwork|legendary> [player]} —
     *       sets the carried quality of the held item (ETIMQuality.set) —
     *       the fail-1 (quality over budget) probe.</li>
     * </ul>
     */
    /** 金属砧块批 — the per-pos anvil-wear query (W4/W6 判据通道): /etest anvilwear <x> <y> <z>. */
    private static void executeAnvilWear(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 4) {
            throw new WrongUsageException("commands.etest.usage");
        }
        BlockPos pos = new BlockPos(CommandBase.parseInt(args[1]), CommandBase.parseInt(args[2]), CommandBase.parseInt(args[3]));
        int wear = io.github.etim.etim.metal.ETIMAnvilDamageData.wearAt(server.getWorld(0), pos);
        io.github.etim.etim.ETIM.LOGGER.info("[TestLog] anvilwear " + pos.getX() + " " + pos.getY() + " " + pos.getZ() + " = " + wear + " [server]");
        sender.sendMessage(new net.minecraft.util.text.TextComponentString(
                "[TestLog] anvilwear " + pos.getX() + " " + pos.getY() + " " + pos.getZ() + " = " + wear));
    }

    private static void executeDamage(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        ItemStack held = player.getHeldItemMainhand();
        if (held.isEmpty() || !held.isItemStackDamageable()) {
            throw new CommandException("commands.etest.damage_not_damageable");
        }
        int amount = CommandBase.parseInt(args[1], 0, held.getMaxDamage());
        int before = held.getItemDamage();
        held.setItemDamage(Math.min(before + amount, held.getMaxDamage()));
        respond(player, "commands.etest.damage_set", before, held.getItemDamage(), held.getMaxDamage());
    }

    private static void executeQuality(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        ItemStack held = player.getHeldItemMainhand();
        if (held.isEmpty()) {
            throw new CommandException("commands.etest.damage_not_damageable");
        }
        EnumQuality quality;
        try {
            quality = EnumQuality.valueOf(args[1].toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new WrongUsageException("commands.etest.usage");
        }
        io.github.etim.etim.quality.ETIMQuality.set(held, quality);
        respond(player, "commands.etest.quality_set", quality.name());
    }

    private static EntityPlayerMP targetOrSender(MinecraftServer server, ICommandSender sender,
            String[] args, int targetIndex) throws CommandException {
        if (args.length > targetIndex) {
            return CommandBase.getPlayer(server, sender, args[targetIndex]);
        }
        if (sender instanceof EntityPlayerMP) {
            return (EntityPlayerMP) sender;
        }
        throw new PlayerNotFoundException("commands.state.no_player");
    }

    private static boolean isNumber(String token) {
        try {
            Integer.parseInt(token);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private static void respond(EntityPlayerMP player, String key, Object... params) {
        // S2 (harness-t01-t02-verdict): RCON/bot rounds can't see the green
        // chat line and bot clients show the raw key only — mirror the
        // receipt to the server log so a verdict window greps [EtimTest].
        ETIM.LOGGER.info("[EtimTest] {} player={} params={}", key, player.getName(),
                Arrays.toString(params));
        player.sendMessage(new TextComponentTranslation(key, params)
                .setStyle(new Style().setColor(TextFormatting.GREEN)));
    }
}
