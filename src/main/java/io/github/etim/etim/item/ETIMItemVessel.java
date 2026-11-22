package io.github.etim.etim.item;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.mob.ETIMEntityEarthElemental;
import io.github.etim.etim.mob.ETIMEntityFireElemental;
import io.github.etim.etim.mob.ETIMEntityNetherspawn;
import io.github.etim.etim.mob.ETIMLivestock;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.EnumAction;
import net.minecraft.item.Item;
import net.minecraft.item.ItemFood;
import net.minecraft.item.ItemStack;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.World;

import java.util.EnumMap;
import java.util.Locale;

/**
 * B-65 · R196 {@code ItemVessel}（171 行）的 1.12 载体（D-2 = A）。
 *
 * <p>共同面：容量（standard_volume）、内容物、空器返还、堆叠上限，
 * 以及 {@code tryEntityInteraction} 的三条实体臂（挤奶 / 喂水 / 灭火）。
 * 判定源：{@code ItemVessel.java:65-169} + {@code ItemBowl.java:11-205}。</p>
 *
 * <p>注入点：1.12 没有「物品对实体右键」的原生虚方法，实体臂由
 * {@link ETIMVesselEvents}（{@code PlayerInteractEvent.EntityInteract}）
 * 统一转发；方块面（取水 / 熄火 / 浇耕地）留在 {@link ETIMItemBowl} 的
 * {@code onItemRightClick}。</p>
 */
public abstract class ETIMItemVessel extends ItemFood {

    /** 内容物 → 对应碗物品（R196 {@code ItemBowl.getPeer} 的注册期快照）。 */
    private static final EnumMap<ETIMBowlContents, Item> PEERS = new EnumMap<>(ETIMBowlContents.class);

    private final ETIMBowlContents contents;
    private final int standardVolume;
    private final boolean woodenVessel;
    private Item emptyVessel = Items.BOWL;

    protected ETIMItemVessel(ETIMBowlContents contents, int standardVolume,
                             int emptyStackSize, int fullStackSize, boolean woodenVessel) {
        super(0, 0.0F, false);
        this.contents = contents;
        this.standardVolume = standardVolume;
        this.woodenVessel = woodenVessel;
        this.setMaxStackSize(contents == null ? emptyStackSize : fullStackSize);
        if (contents != null) {
            this.setContainerItem(Items.BOWL);
        }
    }

    /** 注册期绑定：空器与 peer 表（R196 {@code getPeerForContents}）。 */
    public ETIMItemVessel etimBindVessel(Item emptyVessel) {
        this.emptyVessel = emptyVessel;
        if (this.contents != null) {
            this.setContainerItem(emptyVessel);
            PEERS.put(this.contents, this);
        }
        return this;
    }

    public ETIMBowlContents getContents() {
        return this.contents;
    }

    public boolean isEmpty() {
        return this.contents == null;
    }

    public boolean contains(ETIMBowlContents expected) {
        return this.contents == expected;
    }

    public int getStandardVolume() {
        return this.standardVolume;
    }

    public boolean isWoodenVessel() {
        return this.woodenVessel;
    }

    public Item getEmptyVessel() {
        return this.emptyVessel;
    }

    /** R196 {@code getPeerForContents}（碗族只有木器）。 */
    public static Item peerForContents(ETIMBowlContents contents) {
        return contents == null ? Items.BOWL : PEERS.get(contents);
    }

    /** R196 {@code ItemVessel.canContentsDouseFire()}。 */
    public boolean canContentsDouseFire() {
        return this.contents != null && this.contents.dousesFire();
    }

    @Override
    public EnumAction getItemUseAction(ItemStack stack) {
        if (this.contents != null && this.contents.drinkable) {
            return EnumAction.DRINK;
        }
        return EnumAction.EAT;
    }

    @Override
    public int getMaxItemUseDuration(ItemStack stack) {
        return 32;
    }

    @Override
    public ItemStack onItemUseFinish(ItemStack stack, World world, EntityLivingBase entityLiving) {
        super.onItemUseFinish(stack, world, entityLiving);
        if (entityLiving instanceof EntityPlayer) {
            EntityPlayer player = (EntityPlayer) entityLiving;
            if (entityLiving.world.isRemote) {
                return new ItemStack(this.getEmptyVessel());
            }
            if (this.contents == ETIMBowlContents.MILK) {
                player.clearActivePotions();
            }
            NutritionSystem.FoodValue value = NutritionSystem.getFoodValue(stack);
            if (value != null) {
                ETIMFoodStats.applyFoodValue(player, value, "bowl_" + this.contents.texture);
            }
        }
        return new ItemStack(this.getEmptyVessel());
    }

    /**
     * R196 {@code ItemVessel.tryEntityInteraction}（:100-169）：挤奶 → 喂水 → 灭火。
     *
     * @return true 表示该次右键已被容器消费（调用方应取消原版继续执行）
     */
    public boolean etimTryEntityInteraction(Entity entity, EntityPlayer player, ItemStack stack,
                                            EnumHand hand, String source) {
        if (!ETIMConfig.foodR196Extra) {
            return false;
        }
        boolean creative = player.capabilities.isCreativeMode;

        // 1) 空碗 + 奶牛：奶量必须达到 standard_volume * 25（R196 :105）
        if (this.isEmpty() && entity instanceof EntityCow) {
            ETIMLivestock.IState state = ETIMLivestock.get((EntityCow) entity);
            int need = this.standardVolume * 25;
            if (state == null || state.getMilk() < need) {
                ETIMVesselEvents.row("milk src=bowl deny need=" + need
                        + " have=" + (state == null ? -1 : state.getMilk()) + " from=" + source);
                return state != null; // 奶量不足时仍要拦住原版无限奶（R196 返回 false 由原版继续）
            }
            state.setMilk(state.getMilk() - need);
            ItemStack milk = new ItemStack(ETIMFoodItems.bowlMilk);
            if (!creative) {
                this.consumeOne(player, hand, milk);
            } else {
                player.setHeldItem(hand, stack);
            }
            ETIMVesselEvents.row("milk src=bowl serve take=" + need
                    + " left=" + state.getMilk() + " from=" + source);
            return true;
        }

        // 2) 水碗 + 口渴牲畜：addWater(0.25F * volume)（R196 :116-127）
        if (this.contains(ETIMBowlContents.WATER) && entity instanceof EntityLivingBase) {
            ETIMLivestock.IState state = ETIMLivestock.get((EntityLivingBase) entity);
            if (state != null && state.getWater() < 0.5F) {
                state.setWater(Math.min(1.0F, state.getWater() + 0.25F * this.standardVolume));
                if (!creative) {
                    this.consumeOne(player, hand, new ItemStack(this.getEmptyVessel()));
                }
                ETIMVesselEvents.row("water src=bowl amount=" + fmt(0.25F * this.standardVolume)
                        + " left=" + fmt(state.getWater()) + " from=" + source);
                return true;
            }
        }

        // 3) 含水容器 + 火属性目标：R196 火元素 20/5、下界炎灵 8/2、岩浆态土元素淬火
        if (this.canContentsDouseFire()) {
            if (entity instanceof ETIMEntityFireElemental) {
                float damage = this.standardVolume >= 4 ? 20.0F : 5.0F;
                entity.attackEntityFrom(DamageSource.DROWN, damage);
                this.quenchParticles(entity);
                if (!creative) {
                    this.consumeOne(player, hand, new ItemStack(this.getEmptyVessel()));
                }
                ETIMVesselEvents.row("douse kind=fire_elemental damage=" + fmt(damage)
                        + " volume=" + this.standardVolume + " from=" + source);
                return true;
            }
            if (entity instanceof ETIMEntityNetherspawn) {
                float damage = this.standardVolume >= 4 ? 8.0F : 2.0F;
                ((ETIMEntityNetherspawn) entity).extinguish();
                entity.attackEntityFrom(DamageSource.DROWN, damage);
                this.quenchParticles(entity);
                if (!creative) {
                    this.consumeOne(player, hand, new ItemStack(this.getEmptyVessel()));
                }
                ETIMVesselEvents.row("douse kind=netherspawn damage=" + fmt(damage)
                        + " volume=" + this.standardVolume + " from=" + source);
                return true;
            }
            if (entity instanceof ETIMEntityEarthElemental
                    && ((ETIMEntityEarthElemental) entity).isMagma()) {
                ((ETIMEntityEarthElemental) entity).convertToNormal(true);
                this.quenchParticles(entity);
                if (!creative) {
                    this.consumeOne(player, hand, new ItemStack(this.getEmptyVessel()));
                }
                ETIMVesselEvents.row("douse kind=earth_elemental quench=true"
                        + " volume=" + this.standardVolume + " from=" + source);
                return true;
            }
        }
        return false;
    }

    private void consumeOne(EntityPlayer player, EnumHand hand, ItemStack replacement) {
        ItemStack held = player.getHeldItem(hand);
        if (held.getCount() <= 1) {
            player.setHeldItem(hand, replacement);
        } else {
            held.shrink(1);
            if (!player.addItemStackToInventory(replacement)) {
                player.dropItem(replacement, false);
            }
        }
    }

    private void quenchParticles(Entity entity) {
        if (entity.world.isRemote) {
            return;
        }
        entity.world.spawnParticle(EnumParticleTypes.SMOKE_LARGE,
                entity.posX, entity.posY + entity.height * 0.4D, entity.posZ,
                0.02D, 0.12D, 0.02D);
    }

    /** R196 {@code ItemVessel.getItemProducedWhenDestroyed}：木器被火毁 → 无返还。 */
    public ItemStack etimDestroyedRemainder(DamageSource source) {
        if (this.woodenVessel && source != null && source.isFireDamage()) {
            return ItemStack.EMPTY;
        }
        return this.contents == null ? ItemStack.EMPTY : new ItemStack(this.getEmptyVessel());
    }

    private static String fmt(float value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    /** 供开发命令读取当前药水状态（不参与游戏逻辑）。 */
    public static String describeEffects(EntityPlayer player) {
        StringBuilder sb = new StringBuilder();
        for (PotionEffect effect : player.getActivePotionEffects()) {
            if (sb.length() > 0) {
                sb.append(',');
            }
            sb.append(effect.getPotion().getRegistryName()).append(':').append(effect.getDuration());
        }
        return sb.length() == 0 ? "none" : sb.toString();
    }
}
