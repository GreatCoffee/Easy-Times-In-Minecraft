package io.github.etim.etim.mob;

import java.util.List;
import java.util.Locale;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMEndurance;

import net.minecraft.client.util.ITooltipFlag;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.util.NonNullList;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.text.TextFormatting;
import net.minecraft.util.text.translation.I18n;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * B-58 — the R196 {@code ItemGelatinousSphere} (ItemGelatinousSphere.java:1-87),
 * the five-colour slime ball. D-1 (用户裁定 A): a NEW item
 * {@code etim:gelatinous_sphere} carrying metadata 0..4 — the vanilla
 * {@code minecraft:slime_ball} stays untouched (its sticky-piston / magma-cream
 * / lead recipes keep reading it). D-2: the vanilla slime keeps dropping the
 * vanilla slime ball; the green survival source is booked, not invented here.
 *
 * <p>R196 line map (one-hand judged):</p>
 * <ul>
 *   <li>names/subtypes :6/:8-12 — green / ochre / crimson / gray / black.</li>
 *   <li>ctor :14-20 — {@code tabMisc} (1.12 MISC), crafting difficulty 100.0
 *       (:20, carried by {@code CraftingDifficulty}).</li>
 *   <li>:28-36 — the unlocalized name appends "." + names[subtype]
 *       ({@code getTranslationKey(ItemStack)} in 1.12).</li>
 *   <li>:38-43 — all five subtypes on the creative tab.</li>
 *   <li>:54-70 — right-click: server consumes one, charges
 *       0.25 × endurance (:62-65), plays "random.bow" 0.5F / 0.4F/(rand×0.4+0.8)
 *       (:66), spawns the throwable (:67); client only bobs (:69).</li>
 *   <li>:72-75 — {@code getAttackDamage}: subtype &lt; 3 ? subtype + 1 : subtype
 *       ⇒ 1 / 2 / 3 / 3 / 4.</li>
 *   <li>:77-82 — extended tooltip "item.tooltip.missileDamage".</li>
 *   <li>:84-86 — {@code getDamageType}: subtype 3/4 = acid, everything else
 *       pepsin.</li>
 * </ul>
 */
public final class ETIMItemGelatinousSphere extends Item {

    /** R196 ItemGelatinousSphere.java:6 — subtype order is identity order. */
    public static final String[] NAMES = {"green", "ochre", "crimson", "gray", "black"};

    /** R196 ItemGelatinousSphere.java:8-12 — subtype ids (R196 GREEN..BLACK). */
    public static final int GREEN = 0;
    public static final int OCHRE = 1;
    public static final int CRIMSON = 2;
    public static final int GRAY = 3;
    public static final int BLACK = 4;

    /** The one registered instance (D-1: one identity, five metadata values). */
    public static ETIMItemGelatinousSphere ITEM;

    /** R196 Item.java:163 face — in MITE the slime ball IS this item; 1.12 keeps
     *  the vanilla item (D-1), so the ETIM identity is registered here. */
    public static void register() {
        ITEM = new ETIMItemGelatinousSphere();
        ITEM.setRegistryName(new ResourceLocation(ETIM.MOD_ID, "gelatinous_sphere"));
        ITEM.setTranslationKey("etim.gelatinous_sphere");
        ForgeRegistries.ITEMS.register(ITEM);
        if (ForgeRegistries.ITEMS.getValue(ITEM.getRegistryName()) != ITEM) {
            throw new IllegalStateException("etim gelatinous sphere not registered: " + ITEM.getRegistryName());
        }
        // R196 :20 setCraftingDifficultyAsComponent(100.0F) — 100 ticks.
        io.github.etim.etim.crafting.CraftingDifficulty.register(ITEM, 100.0F);
    }

    public ETIMItemGelatinousSphere() {
        this.setHasSubtypes(true); // R196 :6 — metadata is the subtype
        this.setMaxDamage(0); // metadata carries the colour, not durability
        this.setMaxStackSize(64);
        this.setCreativeTab(CreativeTabs.MISC); // R196 :16 tabMisc
    }

    /** R196 getIconFromSubtype (:22-26) / any out-of-range metadata clamps. */
    public static int clampSubtype(int subtype) {
        if (subtype < GREEN) {
            return GREEN;
        }
        return subtype > BLACK ? BLACK : subtype;
    }

    /** R196 getAttackDamage(:72-75) → 1 / 2 / 3 / 3 / 4. */
    public static float attackDamage(int subtype) {
        int s = clampSubtype(subtype);
        return (float) (s < 3 ? s + 1 : s);
    }

    /** R196 getDamageType(:84-86) — gray/black dissolve with acid, rest pepsin. */
    public static ETIMBlockDissolve.Kind kind(int subtype) {
        int s = clampSubtype(subtype);
        return s != GRAY && s != BLACK ? ETIMBlockDissolve.Kind.PEPSIN : ETIMBlockDissolve.Kind.ACID;
    }

    /** R196 :28-36 — {@code gelatinousSphere.<name>}; 1.12 lowers it to item.etim.gelatinous_sphere.<name>.name. */
    @Override
    public String getTranslationKey(ItemStack stack) {
        return super.getTranslationKey(stack) + "." + NAMES[clampSubtype(stack.getMetadata())];
    }

    /** R196 :38-43 — all five subtypes, no meta holes. */
    @Override
    public void getSubItems(CreativeTabs tab, NonNullList<ItemStack> items) {
        if (!this.isInCreativeTab(tab)) {
            return;
        }
        for (int s = GREEN; s <= BLACK; ++s) {
            items.add(new ItemStack(this, 1, s));
        }
    }

    /** R196 :77-82 — the missile-damage line only in the extended-info face. */
    @Override
    public void addInformation(ItemStack stack, World worldIn, List<String> tooltip,
                               ITooltipFlag flagIn) {
        if (flagIn != null && flagIn.isAdvanced()) {
            int s = clampSubtype(stack.getMetadata());
            tooltip.add(TextFormatting.BLUE + I18n.translateToLocalFormatted(
                    "item.etim.tooltip.missileDamage", (int) attackDamage(s)));
        }
    }

    /** R196 :54-70 — throw one sphere; survival pays 0.25 × endurance (D-3). */
    @Override
    public ActionResult<ItemStack> onItemRightClick(World worldIn, EntityPlayer playerIn,
                                                    EnumHand hand) {
        ItemStack held = playerIn.getHeldItem(hand);
        int subtype = clampSubtype(held.getMetadata());
        if (!worldIn.isRemote) {
            if (!playerIn.capabilities.isCreativeMode) { // R196 :58-60
                held.shrink(1);
                ETIMEndurance.chargeSphereThrow(playerIn);
            }
            // R196 :66 — the bow-release sample, client-side rand is fine (sound only).
            worldIn.playSound(null, playerIn.posX, playerIn.posY, playerIn.posZ,
                    SoundEvents.ENTITY_ARROW_SHOOT, SoundCategory.PLAYERS, 0.5F,
                    0.4F / (this.itemRand.nextFloat() * 0.4F + 0.8F));
            ETIMEntityGelatinousSphere sphere =
                    ETIMEntityGelatinousSphere.throwFrom(worldIn, playerIn, subtype); // R196 :67
            worldIn.spawnEntity(sphere);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[GelLog] throw subtype={} dmg={} kind={} hunger={} x={} y={} z={} entity={} [server]",
                        subtype, (int) attackDamage(subtype), kind(subtype).name().toLowerCase(Locale.ROOT),
                        f3(ETIMConfig.sphereThrowHunger), f3(playerIn.posX), f3(playerIn.posY),
                        f3(playerIn.posZ), sphere.getEntityId());
            }
        } else {
            playerIn.swingArm(hand); // R196 :69 bobItem
        }
        return new ActionResult<>(EnumActionResult.SUCCESS, held);
    }

    /** Judgment-row number format (AGENTS 9: three decimals, locale-free). */
    private static String f3(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
