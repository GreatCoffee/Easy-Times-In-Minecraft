package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraft.util.SoundEvent;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraftforge.event.ForgeEventFactory;

/**
 * B-61 — R196 {@code EntityDireWolf} (76 lines, {@code extends EntityWolf}).
 *
 * <p>The R196 dire wolf keeps the whole wolf kit (taming, sitting, following,
 * breeding, collar, begging, pack hunting) and only replaces:</p>
 * <ul>
 *   <li>{@code :10-15} the tame-sensitive attributes (24 hp tamed / 16 wild,
 *       attack 5, speed 0.4, follow 32/16) — carried here because the 1.12
 *       wolf {@code setTamed} and the {@code MixinEntityWolf} tail would
 *       otherwise rewrite them to 12/8/3;</li>
 *   <li>{@code :24-30} the ambient growl: quiet in the wolf's own cases
 *       (child / tamed / in love / blue-moon night) and when no vulnerable
 *       player is within 4 blocks and the 10% roll misses; otherwise
 *       {@code mob.wolf.growl};</li>
 *   <li>{@code :31-34} volume ×1.5, pitch ×0.8;</li>
 *   <li>{@code :39-47} the 0.4%-per-tick near aggro: an untamed, non-child
 *       dire wolf that is not in love and not on a blue-moon night picks the
 *       closest vulnerable player within 4 blocks as its attack target;</li>
 *   <li>{@code :54-72} the three-band taming outcome (20% fail + grudge /
 *       20% fail / 5% instant success / the rest scaled by player level),
 *       with the R196 100-tick {@code taming_cooldown};</li>
 *   <li>{@code :74-76} experience ×2 (5 → 10).</li>
 * </ul>
 *
 * <p>Flag seat: {@link ETIMConfig#livestockNeedsR196} (D-6 ruling — the wolf
 * family flag the {@code MixinEntityWolf} seats already ride).</p>
 */
public class ETIMEntityDireWolf extends EntityWolf {

    /** R196 {@code EntityTameable.taming_cooldown} — 100 ticks after a failed bone. */
    private int etimTamingCooldown;

    /** Judge support: the last roll/outcome pair (see {@link #etimTestTameOutcome}). */
    private float etimLastTameRoll;
    private int etimLastTameOutcome;

    public ETIMEntityDireWolf(World world) {
        super(world);
        this.setSize(0.6F, 0.8F); // R196 :10 — the wolf is 0.7 x 0.8
        this.experienceValue = 10; // R196 :74-76 — super (5) * 2
        this.etimApplyR196Attributes();
        this.setHealth(this.getMaxHealth());
    }

    /**
     * R196 {@code :10-15} — re-applied after {@code super(world)} because the
     * 1.12 wolf constructor's {@code setTamed(false)} drives the
     * {@code MixinEntityWolf} attribute tail (8 hp / 3 attack / follow 16).
     */
    private void etimApplyR196Attributes() {
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH)
                .setBaseValue(this.isTamed() ? 24.0D : 16.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.4D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D);
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE)
                .setBaseValue(this.isTamed() ? 32.0D : 16.0D);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.etimApplyR196Attributes();
    }

    // ------------------------------------------------------------------
    // R196 :24-34 — the growl seat
    // ------------------------------------------------------------------

    @Override
    protected SoundEvent getAmbientSound() {
        boolean quiet = this.isChild() || this.isTamed() || this.isInLove() || this.etimIsBlueMoonNight()
                || (this.world.getNearestAttackablePlayer(this, 4.0D, 4.0D) == null
                && this.rand.nextFloat() >= 0.1F);
        return quiet ? super.getAmbientSound() : SoundEvents.ENTITY_WOLF_GROWL;
    }

    @Override
    public float getSoundVolume() { // R196 :31 — super (0.4 / child 0.2) * 1.5
        return super.getSoundVolume() * 1.5F;
    }

    @Override
    public float getSoundPitch() { // R196 :33-34 — super * 0.8
        return super.getSoundPitch() * 0.8F;
    }

    // ------------------------------------------------------------------
    // R196 :39-47 — the near aggro tick
    // ------------------------------------------------------------------

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        if (this.ticksExisted == 1) {
            this.etimLogSpawn();
        }
        if (this.etimTamingCooldown > 0) {
            this.etimTamingCooldown--;
        }
        if (!this.isChild() && !this.isTamed() && !this.isInLove() && !this.etimIsBlueMoonNight()
                && this.rand.nextFloat() < 0.004F) {
            EntityPlayer player = this.world.getNearestAttackablePlayer(this, 4.0D, 4.0D);
            if (player != null) {
                this.setAttackTarget(player);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[BeastLog] aggro kind=direwolf player=" + player.getName()
                            + " dist=" + fmt(this.getDistance(player))
                            + " tick=" + this.ticksExisted + " entity=" + this.getEntityId() + " [server]");
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // R196 :54-72 — the taming outcome (F5)
    // ------------------------------------------------------------------

    /** R196 {@code :54-72} — verbatim three-band roll; also stashes the roll for the judge row. */
    private int etimTamingOutcome(EntityPlayer player) {
        float roll = this.rand.nextFloat();
        this.etimLastTameRoll = roll;
        int outcome;
        if (roll < 0.2F) {
            outcome = -1;
        } else if (roll < 0.4F) {
            outcome = 0;
        } else if (roll > 0.95F) {
            outcome = 1;
        } else {
            roll += this.rand.nextFloat() * player.experienceLevel * 0.02F;
            if (roll < 0.5F) {
                outcome = -1;
            } else if (roll < 1.0F) {
                outcome = 0;
            } else {
                outcome = 1;
            }
        }
        this.etimLastTameOutcome = outcome;
        return outcome;
    }

    @Override
    public boolean processInteract(EntityPlayer player, EnumHand hand) {
        ItemStack stack = player.getHeldItem(hand);
        if (!this.world.isRemote && !this.isTamed() && !this.isChild()
                && !stack.isEmpty() && stack.getItem() == Items.BONE) {
            // R196 EntityWolf :395-410 — the 100-tick cooldown swallows the
            // next attempt entirely (no roll, no bone consumed).
            if (this.etimTamingCooldown <= 0) {
                this.etimTryTame(player, stack);
            }
            return true;
        }
        return super.processInteract(player, hand);
    }

    /** R196 {@code EntityWolf :415-450} — the tame attempt, R196 outcome semantics. */
    private void etimTryTame(EntityPlayer player, ItemStack stack) {
        int outcome = this.etimTamingOutcome(player);
        boolean tamed = outcome > 0;
        if (tamed && ForgeEventFactory.onAnimalTame(this, player)) {
            tamed = false; // another mod vetoed the tame — treat as a plain failure
        }
        boolean aggro = false;
        if (tamed) {
            this.setTamedBy(player);
            this.navigator.clearPath();
            this.setAttackTarget(null);
            this.setSitting(true);
            this.playTameEffect(true);
            this.world.setEntityState(this, (byte) 7);
            this.playSound(SoundEvents.ENTITY_WOLF_WHINE, 0.4F, 1.0F);
            if (!player.capabilities.isCreativeMode) {
                stack.shrink(1);
            }
        } else {
            this.playTameEffect(false);
            this.world.setEntityState(this, (byte) 6);
            this.etimTamingCooldown = 100;
            if (outcome < 0 && !this.etimIsBlueMoonNight()) {
                this.setAttackTarget(player);
                aggro = true;
            }
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BeastLog] tame kind=direwolf roll=" + fmt(this.etimLastTameRoll)
                    + " level=" + player.experienceLevel
                    + " outcome=" + outcome
                    + " tamed=" + this.isTamed()
                    + " aggro=" + aggro
                    + " cooldown=" + this.etimTamingCooldown
                    + " player=" + player.getName() + " [server]");
        }
    }

    // ------------------------------------------------------------------
    // Judge / test hooks
    // ------------------------------------------------------------------

    /** `/etest beasttame` — runs the R196 roll n times against the given level, no side effects. */
    public int etimTestTameOutcome(EntityPlayer player) {
        int outcome = this.etimTamingOutcome(player);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BeastLog] tame kind=direwolf roll=" + fmt(this.etimLastTameRoll)
                    + " level=" + player.experienceLevel
                    + " outcome=" + outcome
                    + " tamed=" + this.isTamed()
                    + " aggro=" + (outcome < 0)
                    + " cooldown=" + this.etimTamingCooldown
                    + " player=" + player.getName() + " [server]");
        }
        return outcome;
    }

    public float etimLastTameRoll() {
        return this.etimLastTameRoll;
    }

    public int etimTamingCooldown() {
        return this.etimTamingCooldown;
    }

    private boolean etimIsBlueMoonNight() {
        return this.world instanceof WorldServer
                && ETIMMoonState.phase((WorldServer) this.world) == ETIMMoonState.Phase.BLUE
                && ETIMMoonState.isNight((WorldServer) this.world);
    }

    /** B-61 probe: the R196 experience value (5 * 2). */
    public int etimXp() {
        return this.experienceValue;
    }

    private void etimLogSpawn() {
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        ETIM.LOGGER.info("[BeastLog] spawn kind=direwolf hp=" + fmt(this.getHealth())
                + " max=" + fmt(this.getMaxHealth())
                + " attack=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue())
                + " speed=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue())
                + " follow=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue())
                + " tamed=" + this.isTamed()
                + " xp=" + this.experienceValue
                + " entity=" + this.getEntityId() + " [server]");
    }

    private static String fmt(double value) {
        return String.format(java.util.Locale.ROOT, "%.3f", value);
    }
}
