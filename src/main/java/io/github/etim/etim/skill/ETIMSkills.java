package io.github.etim.etim.skill;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.ResourceLocation;
import net.minecraft.world.World;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityInject;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;

import javax.annotation.Nullable;

/**
 * Player skill mask capability and the public facade used by gameplay code.
 * The mask is a plain int; the first thirteen bits are the R196 skills, and
 * addons register further bits through {@link ETIMSkill#register(String)}.
 */
public final class ETIMSkills {

    public static final ResourceLocation CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "skills");

    @CapabilityInject(IETIMSkills.class)
    public static Capability<IETIMSkills> CAPABILITY = null;

    private ETIMSkills() {
    }

    /** Registers the capability storage; call once from preInit. */
    public static void register() {
        CapabilityManager.INSTANCE.register(IETIMSkills.class, new Capability.IStorage<IETIMSkills>() {
            @Override
            public NBTBase writeNBT(Capability<IETIMSkills> capability, IETIMSkills instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setInteger("mask", instance.getMask());
                tag.setInteger("lastLearnDay", instance.getLastLearnDay());
                return tag;
            }

            @Override
            public void readNBT(Capability<IETIMSkills> capability, IETIMSkills instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setMask(tag.getInteger("mask"));
                instance.setLastLearnDay(tag.getInteger("lastLearnDay"));
            }
        }, State::new);
    }

    @Nullable
    public static IETIMSkills get(EntityPlayer player) {
        return player == null ? null : player.getCapability(CAPABILITY, null);
    }

    public static int mask(EntityPlayer player) {
        IETIMSkills state = get(player);
        if (state != null) {
            return state.getMask();
        }
        return player != null && player.world.isRemote ? clientMask : 0;
    }

    public static boolean has(EntityPlayer player, ETIMSkill skill) {
        return skill != null && (mask(player) & skill.mask()) != 0;
    }

    /** Empty mask is treated as "no requirement" (R196 null skillset = true). */
    public static boolean hasAny(EntityPlayer player, int requiredMask) {
        return requiredMask == 0 || (mask(player) & requiredMask) != 0;
    }

    public static boolean learn(EntityPlayer player, ETIMSkill skill) {
        return ETIMSkillRules.learn(player, skill);
    }

    public static boolean abandon(EntityPlayer player, ETIMSkill skill) {
        return ETIMSkillRules.abandon(player, skill);
    }

    public static boolean enabled(World world) {
        return world != null && !world.isRemote && ETIMConfig.skillsEnabled;
    }

    /**
     * CLIENT mirror of the server's {@code skillsEnabled} switch, updated by
     * {@link ETIMSkillNetwork}. Server-authoritative gate still reads the
     * config on the logical server.
     */
    private static volatile boolean clientEnabled = false;
    private static volatile int clientMask = 0;

    public static void setClientEnabled(boolean enabled) {
        clientEnabled = enabled;
    }

    /** Fallback when the client-side capability attach has not run yet. */
    public static void setClientMask(int mask) {
        clientMask = mask;
    }

    /** Gate used by the anvil plan on both sides (server config / client mirror). */
    public static boolean enabled(EntityPlayer player) {
        if (player == null) {
            return false;
        }
        return player.world.isRemote ? clientEnabled : ETIMConfig.skillsEnabled;
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
            tag.setInteger("mask", state.mask);
            tag.setInteger("lastLearnDay", state.lastLearnDay);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTBase nbt) {
            NBTTagCompound tag = (NBTTagCompound) nbt;
            state.mask = tag.getInteger("mask");
            state.lastLearnDay = tag.getInteger("lastLearnDay");
        }
    }

    public static final class State implements IETIMSkills {
        private int mask;
        private int lastLearnDay = -1;

        @Override
        public int getMask() {
            return mask;
        }

        @Override
        public void setMask(int mask) {
            this.mask = mask;
        }

        @Override
        public int getLastLearnDay() {
            return lastLearnDay;
        }

        @Override
        public void setLastLearnDay(int day) {
            this.lastLearnDay = day;
        }
    }
}
