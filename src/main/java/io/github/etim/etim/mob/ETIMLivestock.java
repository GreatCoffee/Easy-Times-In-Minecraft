package io.github.etim.etim.mob;

import io.github.etim.etim.Tags;
import net.minecraft.entity.EntityLivingBase;
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
 * Stage 5 slice 2 v1 (audit 11 §2.2, A-grade): the livestock wellness
 * bookkeeping of the R196 {@code EntityLivestock} base class, carried as an
 * NBT capability on the vanilla livestock entities (cow / sheep / pig /
 * chicken — R196's livestock family; MITE-specific strains do not exist in
 * 1.12). R196 keeps the three needs as plain floats with a data-watcher
 * boolean mirror; carried server-side + NBT. v2 (B-10, audit20 条 300) adds
 * the production state — R196 {@code production_counter} (:9), the cow milk
 * meter (:27-33) and the chicken feather meter (:9-10) — all server-side +
 * NBT persisted (R196 :92/:45/:44-45), still with no client mirror (not
 * needed by any judgment face).
 *
 * <p>Verbatim R196 values (EntityLivestock.java): initial state
 * {@code 0.8 + rand * 0.2} on all three needs (:26-28); the setters clamp
 * into {@code [0,1]} (:40-44); wellness tiers —
 * {@code isWell = min(freedom, food, water) >= 0.25}, thirsty
 * {@code water < 0.5}, hungry {@code food < 0.5}, very
 * {@code < 0.25}, desperate {@code < 0.05} (:113-146).</p>
 */
public final class ETIMLivestock {

    /** Storage key of the capability on livestock entities. */
    public static final ResourceLocation CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "livestock");

    @CapabilityInject(IState.class)
    public static Capability<IState> CAPABILITY = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(IState.class, new Capability.IStorage<IState>() {
            @Override
            public NBTBase writeNBT(Capability<IState> capability, IState instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setFloat("food", instance.getFood());
                tag.setFloat("water", instance.getWater());
                tag.setFloat("freedom", instance.getFreedom());
                tag.setBoolean("inited", instance.isInitialized());
                tag.setInteger("manureCountdown", instance.getManureCountdown());
                tag.setInteger("productionCounter", instance.getProductionCounter());
                tag.setInteger("milk", instance.getMilk());
                tag.setInteger("numFeathers", instance.getNumFeathers());
                tag.setInteger("maxNumFeathers", instance.getMaxNumFeathers());
                return tag;
            }

            @Override
            public void readNBT(Capability<IState> capability, IState instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setFood(tag.getFloat("food"));
                instance.setWater(tag.getFloat("water"));
                instance.setFreedom(tag.getFloat("freedom"));
                instance.setInitialized(tag.getBoolean("inited"));
                instance.setManureCountdown(tag.getInteger("manureCountdown"));
                instance.setProductionCounter(tag.getInteger("productionCounter"));
                instance.setMilk(tag.getInteger("milk"));
                instance.setNumFeathers(tag.getInteger("numFeathers"));
                instance.setMaxNumFeathers(tag.getInteger("maxNumFeathers"));
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
            tag.setFloat("food", state.food);
            tag.setFloat("water", state.water);
            tag.setFloat("freedom", state.freedom);
            tag.setBoolean("inited", state.initialized);
            tag.setInteger("manureCountdown", state.manureCountdown);
            tag.setInteger("productionCounter", state.productionCounter);
            tag.setInteger("milk", state.milk);
            tag.setInteger("numFeathers", state.numFeathers);
            tag.setInteger("maxNumFeathers", state.maxNumFeathers);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTBase nbt) {
            NBTTagCompound tag = (NBTTagCompound) nbt;
            state.food = tag.getFloat("food");
            state.water = tag.getFloat("water");
            state.freedom = tag.getFloat("freedom");
            state.initialized = tag.getBoolean("inited");
            state.manureCountdown = tag.getInteger("manureCountdown");
            state.productionCounter = tag.getInteger("productionCounter");
            state.milk = tag.getInteger("milk");
            state.numFeathers = tag.getInteger("numFeathers");
            state.maxNumFeathers = tag.getInteger("maxNumFeathers");
        }
    }

    @Nullable
    public static IState get(EntityLivingBase e) {
        return e.hasCapability(CAPABILITY, null) ? e.getCapability(CAPABILITY, null) : null;
    }

    /** The three R196 wellness needs, clamped server-side floats. */
    public interface IState {
        float getFood();

        void setFood(float value);

        float getWater();

        void setWater(float value);

        float getFreedom();

        void setFreedom(float value);

        boolean isInitialized();

        void setInitialized(boolean value);

        /**
         * R196 {@code manure_countdown} (:11) — the ticks-to-drop registry of
         * face M1-1; the PERIOD itself is re-derived per session (R196 never
         * persists {@code manure_period}, EntityLivestock.java:378-381).
         */
        int getManureCountdown();

        void setManureCountdown(int value);

        /**
         * R196 {@code production_counter} (:9, NBT :92) — the wellness-pass
         * work tally that {@code produceGoods} consumes (:245-251).
         */
        int getProductionCounter();

        void setProductionCounter(int value);

        /**
         * R196 {@code EntityCow} milk meter (:27-33) — 0..100, created at 100
         * (:18); reads 0 for a child (:32). Milking takes 100 (ItemBucket
         * standard_volume 4 × 25, ItemVessel.java:105).
         */
        int getMilk();

        void setMilk(int value);

        /**
         * R196 {@code EntityChicken} feather meter (:9-10) — overflow turned
         * into feather drops by {@code gainFeather} (:193-199).
         */
        int getNumFeathers();

        void setNumFeathers(int value);

        /** R196 max feathers, init {@code 1..2} (:25-28). */
        int getMaxNumFeathers();

        void setMaxNumFeathers(int value);
    }

    /** The capability implementation instance. */
    public static final class State implements IState {
        float food;
        float water;
        float freedom;
        boolean initialized;
        int manureCountdown;
        int productionCounter;
        int milk;
        int numFeathers;
        int maxNumFeathers;

        @Override
        public float getFood() {
            return this.food;
        }

        @Override
        public void setFood(float value) {
            this.food = clamp(value);
        }

        @Override
        public float getWater() {
            return this.water;
        }

        @Override
        public void setWater(float value) {
            this.water = clamp(value);
        }

        @Override
        public float getFreedom() {
            return this.freedom;
        }

        @Override
        public void setFreedom(float value) {
            this.freedom = clamp(value);
        }

        @Override
        public boolean isInitialized() {
            return this.initialized;
        }

        @Override
        public void setInitialized(boolean value) {
            this.initialized = value;
        }

        @Override
        public int getManureCountdown() {
            return this.manureCountdown;
        }

        @Override
        public void setManureCountdown(int value) {
            this.manureCountdown = value;
        }

        @Override
        public int getProductionCounter() {
            return this.productionCounter;
        }

        @Override
        public void setProductionCounter(int value) {
            this.productionCounter = Math.max(0, value);
        }

        @Override
        public int getMilk() {
            return this.milk;
        }

        /** R196 EntityCow.setMilk — {@code clamp_int(milk, 0, 100)} (:28). */
        @Override
        public void setMilk(int value) {
            this.milk = value < 0 ? 0 : (value > 100 ? 100 : value);
        }

        @Override
        public int getNumFeathers() {
            return this.numFeathers;
        }

        @Override
        public void setNumFeathers(int value) {
            this.numFeathers = Math.max(0, value);
        }

        @Override
        public int getMaxNumFeathers() {
            return this.maxNumFeathers;
        }

        @Override
        public void setMaxNumFeathers(int value) {
            this.maxNumFeathers = Math.max(0, value);
        }

        /** R196 setFood/setWater/setFreedom — {@code clamp_float(f, 0, 1)}. */
        private static float clamp(float value) {
            return value < 0.0F ? 0.0F : (value > 1.0F ? 1.0F : value);
        }
    }
}
