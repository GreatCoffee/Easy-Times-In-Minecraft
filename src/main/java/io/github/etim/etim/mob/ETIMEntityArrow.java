package io.github.etim.etim.mob;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemArrow;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.ResourceLocation;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * The ETIM arrow with an item identity. R196 EntityArrow carries its ammo item
 * as a field ({@code public ItemArrow item_arrow} — R196 :19), so a grounded
 * arrow is picked up as the very ETIM arrow item that was fired, and survives
 * chunk reload through the {@code arrow_item_id} NBT key (R196 :610/:633).
 * 1.12.2's {@code EntityArrow} has no such face ({@code getArrowStack()} is
 * abstract, item/EntityTippedArrow.java:247 hardcodes {@code Items.ARROW}) —
 * this thin subclass restores the identity layer only (D-19 minimal slice):
 *
 * <ul>
 *   <li>the {@code itemArrow} field + the ctor family (R196 :19);
 *   <li>{@code setDamage} from the arrow-head material at spawn (R196 :37,
 *       damage = ETIMItemArrow.damage — the NE-01 in-service values);</li>
 *   <li>{@code getArrowStack()} = new ItemStack(itemArrow) (R196 :641) —
 *       the ground-pickup face rides 1.12 :609 addItemStackToInventory;</li>
 *   <li>NBT write/read with the R196 key names, registry-name string values
 *       (D-27①; R196's int itemID would silently mis-resolve as mod items are
 *       added/removed) — missing key at read ⇒ setDead() (Batch B report §3:
 *       no fallback chain; /summon probes must carry the key, W1);</li>
 *   <li>{@code [ArrowLog]} rows for spawn/pickup/nbt (report §7).</li>
 * </ul>
 *
 * <p>Canonical fields launcher_was_enchanted (R196 :20) and shot_by_dispenser
 * (:24) have no 1.12 counterpart (✗-2/✗-3) — they ride as subclass booleans;
 * the former is sampled from the shooter's held bow at createArrow time
 * (B-1: R196 samples at ItemBow.java:66; same tick here, ≤0 drift), the
 * latter is set by the dispenser behavior. shot_by_dispenser persisted is an
 * ETIM superset of R196 (registered C-8 — harmless, kept).</p>
 */
public class ETIMEntityArrow extends EntityArrow {

    /** R196 :19 item_arrow — the item identity (A-2: no 1.12 counterpart). */
    private ETIMItemArrow itemArrow;
    /** R196 :20 — the "unenchanted launcher ⇒ skeleton lower bound" gate (NE-03 later batch). */
    private boolean launcherWasEnchanted;
    /** R196 :24 — dispenser face flag (DispenserBehaviorArrow.java:14). */
    private boolean shotByDispenser;
    /** Deny-row de-dup (the pickup row fires on state flips only). */
    private boolean pickupDeniedLogged;

    /** Chunk-reload ctor — the identity is restored in readEntityFromNBT. */
    public ETIMEntityArrow(World world) {
        super(world);
    }

    public ETIMEntityArrow(World world, ETIMItemArrow item, boolean launcherEnchanted) {
        super(world);
        this.setSize(0.5F, 0.5F); // R196 :34/:43/:121 — mirror of the base value (:77)
        init(item, launcherEnchanted);
    }

    public ETIMEntityArrow(World world, double x, double y, double z,
                           ETIMItemArrow item, boolean launcherEnchanted) {
        super(world, x, y, z); // 1.12 :80-84
        init(item, launcherEnchanted);
    }

    public ETIMEntityArrow(World world, EntityLivingBase shooter,
                           ETIMItemArrow item, boolean launcherEnchanted) {
        super(world, shooter); // 1.12 :86-95 — a player shooter is already ALLOWED (:93)
        init(item, launcherEnchanted);
    }

    /** R196 :37 — damage = the arrow item's judged damage, logged once at spawn. */
    private void init(ETIMItemArrow item, boolean launcherEnchanted) {
        this.itemArrow = item;
        this.launcherWasEnchanted = launcherEnchanted;
        this.setDamage(ETIMItemArrow.damage(item.etimMetal()));
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow spawn shooter="
                    + (this.shootingEntity == null ? "-" : this.shootingEntity.getName())
                    + " item=" + item.getRegistryName()
                    + " metal=" + item.etimMetal().name
                    + " damage=" + this.getDamage()
                    + " enchanted=" + this.launcherWasEnchanted);
        }
    }

    /** The identity accessor (B2-9 carrier checks, quality faces). */
    public ETIMItemArrow etimItemArrow() {
        return this.itemArrow;
    }

    /** The dispenser-behavior write point (R196 :14). */
    public void setShotByDispenser(boolean value) {
        this.shotByDispenser = value;
    }

    /** R196 :641 — the ground arrow is picked up as the very item that was fired. */
    @Override
    protected ItemStack getArrowStack() {
        return new ItemStack(this.itemArrow);
    }

    /** R196 :637-651 pickup face over the untouched 1.12 :603-620 logic + judgment row.
     *  1.12 has no pop sound (B-5): the R196 "random.pop" 0.2F (R196 :646) rides as
     *  ENTITY_ITEM_PICKUP at the same volume. */
    @Override
    public void onCollideWithPlayer(net.minecraft.entity.player.EntityPlayer player) {
        super.onCollideWithPlayer(player);
        if (this.world.isRemote) {
            return;
        }
        // picked = the arrow went dead in the super call (inventory accepted, :609);
        // the vanilla gate (inGround && arrowShake<=0, 1.12 :605 = R196 :639) is
        // already inside super — the deny row fires on state flips only (A-1
        // fix, recheck verdict: standing on a disallowed arrow must log ONCE,
        // not per collision tick).
        boolean picked = this.isDead; // Entity.isDead, a public field (entity/Entity.java:146)
        if (picked) {
            this.playSound(SoundEvents.ENTITY_ITEM_PICKUP, 0.2F, 1.0F); // B-5, R196 :646 0.2F
        }
        if (picked || !this.pickupDeniedLogged) {
            ETIMArrowLog.row("arrow pickup player=" + player.getName()
                    + " item=" + (this.itemArrow == null ? "-" : this.itemArrow.getRegistryName())
                    + " ok=" + picked);
        }
        this.pickupDeniedLogged = !picked;
    }

    // R196 :610 flag NBT (key name literally) — the value field is a registry name string (D-27①).
    @Override
    public void writeEntityToNBT(NBTTagCompound nbt) {
        super.writeEntityToNBT(nbt);
        nbt.setString("arrow_item_id", this.itemArrow.getRegistryName().toString());
        nbt.setBoolean("launcher_was_enchanted", this.launcherWasEnchanted);
        nbt.setBoolean("shot_by_dispenser", this.shotByDispenser); // C-8 superset
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow nbt write item=" + this.itemArrow.getRegistryName());
        }
    }

    /** R196 :633 read face (+ the missing-key setDead strategy — Batch B report §3 key-missing policy). */
    @Override
    public void readEntityFromNBT(NBTTagCompound nbt) {
        super.readEntityFromNBT(nbt);
        String name = nbt.getString("arrow_item_id");
        if (!name.isEmpty()) {
            net.minecraft.item.Item item =
                    ForgeRegistries.ITEMS.getValue(new ResourceLocation(name));
            if (item instanceof ETIMItemArrow) {
                this.itemArrow = (ETIMItemArrow) item;
                this.setDamage(ETIMItemArrow.damage(this.itemArrow.etimMetal()));
            }
        }
        this.launcherWasEnchanted = nbt.getBoolean("launcher_was_enchanted");
        this.shotByDispenser = nbt.getBoolean("shot_by_dispenser");
        if (this.itemArrow == null) {
            this.setDead(); // new type has no legacy saves — no identity, no behavior
            return;
        }
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow nbt read item=" + this.itemArrow.getRegistryName());
        }
    }
}
