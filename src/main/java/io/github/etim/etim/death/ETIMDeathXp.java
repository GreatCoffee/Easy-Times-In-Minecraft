package io.github.etim.etim.death;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;
import net.minecraftforge.common.capabilities.CapabilityInject;

import javax.annotation.Nullable;

/**
 * Stage 4C (death chain, 8.3): the two death-owned XP numbers, carried on an
 * NBT capability so they survive the respawn clone (the R196
 * {@code respawn_experience} field of ServerPlayer):
 *
 * <ul>
 *   <li><b>stale respawn total</b> — the R196 {@code respawn_experience}
 *       value: written by a sub-level-1 death settlement, otherwise carried
 *       as-is (the ≥1-level death quirk, 8.3 dump §6.1);</li>
 *   <li><b>pending settle</b> — one death's outcome, applied onto the
 *       respawned player in the Clone event (see {@link ETIMDeathEvents}).</li>
 * </ul>
 *
 * <p>The settle constants live here verbatim from the dump (audit job §6.1,
 * ServerPlayer:953-957): the unit {@code xp(1) = 20}, the floor
 * {@code xp(−40) = −800}, and the linear negative extension
 * {@code total(−L) = −20·L} (javap 直读) that maps a negative settle to
 * a negative level — so below zero {@code level = total / 20} exactly, and
 * the regular vanilla XP curve owns the non-negative half.</p>
 */
public final class ETIMDeathXp {

    /** Storage key of the capability on the player entity. */
    public static final ResourceLocation CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "death_xp");

    /** R196 xp(1) = 20 (dump §6.1 level-settlement table). */
    public static final int SETTLE_UNIT = 20;
    /** R196 xp(−40) = −800 (dump §6.1 floor). */
    public static final int SETTLE_FLOOR = -800;

    @CapabilityInject(IState.class)
    public static Capability<IState> CAPABILITY = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(IState.class, new Capability.IStorage<IState>() {
            @Override
            public NBTBase writeNBT(Capability<IState> capability, IState instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setInteger("respawnTotal", instance.getRespawnTotal());
                tag.setInteger("pendingSettle", instance.getPendingSettle());
                return tag;
            }

            @Override
            public void readNBT(Capability<IState> capability, IState instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setRespawnTotal(tag.getInteger("respawnTotal"));
                instance.setPendingSettle(tag.getInteger("pendingSettle"));
            }
        }, State::new);
    }

    public static final class Provider implements ICapabilitySerializable<NBTBase> {
        private final State state = new State();

        @Override
        public boolean hasCapability(Capability<?> capability, EnumFacing facing) {
            return capability == CAPABILITY;
        }

        @SuppressWarnings("unchecked")
        @Override
        public <T> T getCapability(Capability<T> capability, EnumFacing facing) {
            return capability == CAPABILITY ? (T) state : null;
        }

        @Override
        public NBTBase serializeNBT() {
            NBTTagCompound tag = new NBTTagCompound();
            tag.setInteger("respawnTotal", state.respawnTotal);
            tag.setInteger("pendingSettle", state.pendingSettle);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTBase nbt) {
            NBTTagCompound tag = (NBTTagCompound) nbt;
            state.respawnTotal = tag.getInteger("respawnTotal");
            state.pendingSettle = tag.getInteger("pendingSettle");
        }
    }

    @Nullable
    public static IState get(EntityPlayer player) {
        return player.getCapability(CAPABILITY, null);
    }

    /** Death-owned XP numbers; the two ints drive the whole settle path. */
    public interface IState {
        int getRespawnTotal();

        void setRespawnTotal(int value);

        int getPendingSettle();

        void setPendingSettle(int value);
    }

    /** The capability implementation instance. */
    public static final class State implements IState {
        int respawnTotal;
        int pendingSettle;

        @Override
        public int getRespawnTotal() {
            return this.respawnTotal;
        }

        @Override
        public void setRespawnTotal(int value) {
            this.respawnTotal = value;
        }

        @Override
        public int getPendingSettle() {
            return this.pendingSettle;
        }

        @Override
        public void setPendingSettle(int value) {
            this.pendingSettle = value;
        }
    }
}
