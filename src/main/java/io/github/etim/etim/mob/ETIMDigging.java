package io.github.etim.etim.mob;

import javax.annotation.Nullable;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.mining.ETIMMining;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import net.minecraft.block.Block;
import net.minecraft.block.BlockFalling;
import net.minecraft.block.BlockLeaves;
import net.minecraft.block.BlockMelon;
import net.minecraft.block.BlockPumpkin;
import net.minecraft.block.BlockSlab;
import net.minecraft.block.BlockStoneSlab;
import net.minecraft.block.BlockWoodSlab;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityInject;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;

/**
 * AI-02 — the R196 zombie dig mechanism (mobs-ai verdict 裁 3/4 + 补裁
 * C-9a/C-9b): capability-carried dig state on {@link EntityZombie} plus the
 * verbatim state machine of R196 {@code EntityAnimalWatcher}
 * (EntityAnimalWatcher.java:1-352 — the digger base R196 hangs on the mob
 * class hierarchy; the ETIM host is zombies only, 裁 3, matching the
 * sensor's {@code instanceof EntityZombie} judgement face :1396-1399).
 *
 * <p>Registered mapping notes (verdict裁 4 + 补裁): {@code isFrenzied} is
 * NOT deleted — 补裁 C-9a maps it to the blood-moon night seam ({@code
 * EntityMob.isFrenzied = isBloodMoon(true)}, EntityMob.java:275). Earth
 * Elemental / Bone Lord / Cudgel / Scythe / BlockUnderminable faces are
 * MITE-only and gone. {@code EntityZombie.isDiggingEnabled} (:404-411,
 * C-9a fourth consumer) transposes with {@code is_smart} as the constant
 * false — a blood-moon frenzy short-circuits the tool gate, bare-hand
 * zombies dig on a blood moon,平日 requires a held ItemTool.</p>
 *
 * <p>[SleepLog] rows (verdict §7): {@code bed-dig mob=zombie x,y,z=<block>
 * progress=<p> tick=<t>} on the destroy-progress edge, plus the shipped
 * {@code bed-wake reason=digging} / {@code bed-refuse reason=mobsDigging}
 * faces wired by the callers.</p>
 */
public final class ETIMDigging {

    /** Storage key of the capability on zombie entities. */
    public static final ResourceLocation CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "digging");

    @CapabilityInject(IState.class)
    public static Capability<IState> CAPABILITY = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(IState.class, new Capability.IStorage<IState>() {
            @Override
            public NBTBase writeNBT(Capability<IState> capability, IState instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setBoolean("is_destroying_block", instance.isDestroyingBlock());
                tag.setInteger("destroy_block_x", instance.getDestroyBlockX());
                tag.setInteger("destroy_block_y", instance.getDestroyBlockY());
                tag.setInteger("destroy_block_z", instance.getDestroyBlockZ());
                tag.setInteger("destroy_block_progress", instance.getDestroyBlockProgress());
                tag.setInteger("destroy_block_cooloff", instance.getDestroyBlockCooloff());
                tag.setInteger("destroy_pause_ticks", instance.getDestroyPauseTicks());
                return tag;
            }

            @Override
            public void readNBT(Capability<IState> capability, IState instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setDestroyingBlock(tag.getBoolean("is_destroying_block"));
                instance.setDestroyBlockX(tag.getInteger("destroy_block_x"));
                instance.setDestroyBlockY(tag.getInteger("destroy_block_y"));
                instance.setDestroyBlockZ(tag.getInteger("destroy_block_z"));
                instance.setDestroyBlockProgress(tag.getInteger("destroy_block_progress"));
                instance.setDestroyBlockCooloff(tag.getInteger("destroy_block_cooloff"));
                instance.setDestroyPauseTicks(tag.getInteger("destroy_pause_ticks"));
            }
        }, State::new);
    }

    @Nullable
    public static IState get(EntityLivingBase e) {
        return CAPABILITY != null && e.hasCapability(CAPABILITY, null)
                ? e.getCapability(CAPABILITY, null) : null;
    }

    /**
     * The R196 digger state (EntityAnimalWatcher.java:4-10). NBT keys are the
     * R196 :325-330 set; dormant state = cooloff 40 / progress -1 (the
     * onUpdate reset face :314-315).
     */
    public interface IState {
        boolean isDestroyingBlock();

        void setDestroyingBlock(boolean value);

        int getDestroyBlockX();

        void setDestroyBlockX(int value);

        int getDestroyBlockY();

        void setDestroyBlockY(int value);

        int getDestroyBlockZ();

        void setDestroyBlockZ(int value);

        int getDestroyBlockProgress();

        void setDestroyBlockProgress(int value);

        int getDestroyBlockCooloff();

        void setDestroyBlockCooloff(int value);

        int getDestroyPauseTicks();

        void setDestroyPauseTicks(int value);
    }

    /** The capability implementation instance. */
    public static final class State implements IState {
        boolean destroyingBlock;
        int destroyBlockX;
        int destroyBlockY;
        int destroyBlockZ;
        int destroyBlockProgress = -1;
        int destroyBlockCooloff = 40;
        int destroyPauseTicks;

        @Override
        public boolean isDestroyingBlock() {
            return this.destroyingBlock;
        }

        @Override
        public void setDestroyingBlock(boolean value) {
            this.destroyingBlock = value;
        }

        @Override
        public int getDestroyBlockX() {
            return this.destroyBlockX;
        }

        @Override
        public void setDestroyBlockX(int value) {
            this.destroyBlockX = value;
        }

        @Override
        public int getDestroyBlockY() {
            return this.destroyBlockY;
        }

        @Override
        public void setDestroyBlockY(int value) {
            this.destroyBlockY = value;
        }

        @Override
        public int getDestroyBlockZ() {
            return this.destroyBlockZ;
        }

        @Override
        public void setDestroyBlockZ(int value) {
            this.destroyBlockZ = value;
        }

        @Override
        public int getDestroyBlockProgress() {
            return this.destroyBlockProgress;
        }

        @Override
        public void setDestroyBlockProgress(int value) {
            this.destroyBlockProgress = value;
        }

        @Override
        public int getDestroyBlockCooloff() {
            return this.destroyBlockCooloff;
        }

        @Override
        public void setDestroyBlockCooloff(int value) {
            this.destroyBlockCooloff = value;
        }

        @Override
        public int getDestroyPauseTicks() {
            return this.destroyPauseTicks;
        }

        @Override
        public void setDestroyPauseTicks(int value) {
            this.destroyPauseTicks = value;
        }
    }

    /** Capability provider attached by ETIMDiggingEvents (livestock precedent). */
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
            tag.setBoolean("is_destroying_block", state.destroyingBlock);
            tag.setInteger("destroy_block_x", state.destroyBlockX);
            tag.setInteger("destroy_block_y", state.destroyBlockY);
            tag.setInteger("destroy_block_z", state.destroyBlockZ);
            tag.setInteger("destroy_block_progress", state.destroyBlockProgress);
            tag.setInteger("destroy_block_cooloff", state.destroyBlockCooloff);
            tag.setInteger("destroy_pause_ticks", state.destroyPauseTicks);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTBase nbt) {
            NBTTagCompound tag = (NBTTagCompound) nbt;
            state.destroyingBlock = tag.getBoolean("is_destroying_block");
            state.destroyBlockX = tag.getInteger("destroy_block_x");
            state.destroyBlockY = tag.getInteger("destroy_block_y");
            state.destroyBlockZ = tag.getInteger("destroy_block_z");
            state.destroyBlockProgress = tag.getInteger("destroy_block_progress");
            state.destroyBlockCooloff = tag.getInteger("destroy_block_cooloff");
            state.destroyPauseTicks = tag.getInteger("destroy_pause_ticks");
        }
    }

    /**
     * R196 EntityMob.isFrenzied parity (EntityMob.java:275 {@code
     * isBloodMoon(true)}) mapped by 补裁 C-9a to the moon-backend seam:
     * blood phase AND night (phase respects moonStateOverride, judge face).
     */
    public static boolean isFrenzied(EntityLiving digger) {
        if (digger.world.isRemote) {
            return false;
        }
        WorldServer w = (WorldServer) digger.world;
        return ETIMMoonState.phase(w) == ETIMMoonState.Phase.BLOOD && ETIMMoonState.isNight(w);
    }

    /**
     * mob 批 T5① (A-4): the R196 is_smart face activated — the revenant
     * subclass is always smart (R196 EntityZombie :35 {@code is_smart =
     * isRevenant() || 1/8}); the 1/8 roll and the player-hit upgrade stay
     * parked (T5② 挂账 B-2, regular-zombie behavior change). The pre-batch
     * constant-false B 级登记 is superseded.
     */
    public static boolean isSmart(EntityZombie digger) {
        return digger instanceof ETIMEntityRevenant;
    }

    /**
     * R196 EntityZombie.isDiggingEnabled (:404-411): {@code !is_smart &&
     * !isFrenzied ? held instanceof ItemTool : true} — a frenzied
     * (blood-moon) or smart (revenant) zombie digs bare-handed; 平日 requires
     * a held ItemTool.
     */
    public static boolean isDiggingEnabled(EntityZombie digger) {
        if (isHoldingItemThatPreventsDigging(digger)) { // R196 EntityZombie:404-411 最外项（狂化+持剑不可挖）
            return false;
        }
        if (isFrenzied(digger) || isSmart(digger)) {
            return true;
        }
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof ItemTool;
    }

    // ==================== bone-lord frenzy (R196 EntitySkeleton :44-60/:393-399) ====================

    /**
     * The bone-lord frenzy countdown (A-3/A-4): server-side, WeakHashMap
     * keyed by the frenzied skeleton. R196 carries the countdown on a
     * data-watcher object (client-visible face); the ETIM port drops the
     * client sync (C 级) — the 20-tick countdown is ephemeral and needs no
     * persistence.
     */
    private static final java.util.Map<EntitySkeleton, int[]> FRENZY =
            new java.util.WeakHashMap<>();

    /** C-1 dedup: [0] = last log tick, [1] = last logged target entityId (-1 = none). */
    private static final java.util.Map<EntitySkeleton, int[]> FRENZY_LOG_SIG =
            new java.util.WeakHashMap<>();

    /** R196 :393-399 setFrenziedByBoneLord — countdown 20 + target-if-none. */
    public static void setFrenziedByBoneLord(EntitySkeleton skeleton, EntityLivingBase target) {
        if (skeleton.world.isRemote) {
            return;
        }
        FRENZY.put(skeleton, new int[]{20});
        if (target instanceof net.minecraft.entity.EntityLiving
                && skeleton.getAttackTarget() == null) {
            skeleton.setAttackTarget((net.minecraft.entity.EntityLiving) target);
        }
        // C-1: the row = the state-change face ONLY. The countdown (20) equals
        // the re-set window (20 ticks), so every re-set lands on an
        // exactly-zero counter — an expiry-based sig is always "changed" and
        // the flood survives (verdict W7-R). Dedup = suppression window
        // (>40 ticks since the last row = a real resumption) + the target
        // change bypasses the window (a re-target is the AI-visible face).
        int[] sig = FRENZY_LOG_SIG.get(skeleton);
        int tick = skeleton.ticksExisted;
        int targetId = target == null ? -1 : target.getEntityId();
        boolean targetChanged = sig == null || sig[1] != targetId;
        boolean gapElapsed = sig == null || tick - sig[0] > 40;
        if (targetChanged || gapElapsed) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] frenzy set entity=" + skeleton.getName()
                        + " target=" + (target == null ? "none" : target.getName()) + " [server]");
            }
            FRENZY_LOG_SIG.put(skeleton, new int[]{tick, targetId});
        }
    }

    /** R196 :55-60 isFrenziedByBoneLord — countdown > 0. */
    public static boolean isFrenziedByBoneLord(EntitySkeleton skeleton) {
        int[] countdown = FRENZY.get(skeleton);
        return countdown != null && countdown[0] > 0;
    }

    /** R196 :112 — the per-tick decrement, ridden by ETIMDiggingEvents. */
    public static void tickFrenzy(EntitySkeleton skeleton) {
        int[] countdown = FRENZY.get(skeleton);
        if (countdown != null && countdown[0] > 0) {
            countdown[0]--;
        }
    }

    /**
     * R196 isHoldingItemThatPreventsDigging (:17-19): sword/cudgel/scythe —
     * ETIM maps to ItemSword (MITE-only items do not exist).
     */
    public static boolean isHoldingItemThatPreventsDigging(EntityLiving digger) {
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof ItemSword;
    }

    /** R196 hasDownwardsDiggingTool (:139-141): ItemShovel → 1.12 ItemSpade. */
    private static boolean hasDownwardsDiggingTool(EntityZombie digger) {
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof net.minecraft.item.ItemSpade;
    }

    /** R196 getFootBlockPosY (EntityLivingBase.java:2372 {@code floor(posY + 1.0E-4F)}). */
    private static int footBlockPosY(EntityLivingBase e) {
        return MathHelper.floor(e.posY + 1.0E-4F);
    }

    /** R196 getBlockPosX/Y/Z (Entity.java:2638-2648) — the block-coordinate claim face. */
    private static int blockPosX(Entity e) {
        return MathHelper.floor(e.posX);
    }

    private static int blockPosY(Entity e) {
        return MathHelper.floor(e.posY);
    }

    private static int blockPosZ(Entity e) {
        return MathHelper.floor(e.posZ);
    }

    /**
     * R196 canDestroyBlock (:160-229) — the ❗F-15-F1 rebuild. v1 shipped a
     * registered B-级 list-only blacklist; M批 ports the verbatim
     * deny-conjunct (黑名单转主动 + 工具项极性反转 + 狂化空手挖石, per
     * playground/doc/v1.5-账本.md §一/§二). The Earth-Elemental branch
     * (:199-204) is MITE-only and stays gone. The cactus allow-membership
     * keeps the invulnerable/undead caveat verbatim (:220 De Morgan) — an
     * undead digger chews cacti.
     */
    public static boolean canDestroyBlock(EntityZombie digger, IState s,
            int x, int y, int z, boolean checkClipping) {
        if (isHoldingItemThatPreventsDigging(digger)) { // :161-162
            return false;
        }
        int footY = footBlockPosY(digger);
        if (y < footY && !hasDownwardsDiggingTool(digger)) { // :165-167
            return false;
        }
        if (y > footY + 1) { // :170-171
            return false;
        }
        World world = digger.world;
        // :175-176 — the destroy-center distance² gate
        // (getCenterPosYForBlockDestroying :122).
        double dx = digger.posX - (x + 0.5F);
        double dy = digger.posY + digger.height * 0.5F - (y + 0.5F);
        double dz = digger.posZ - (z + 0.5F);
        if (dx * dx + dy * dy + dz * dz > 3.25D) {
            return false;
        }
        if (checkClipping && reachRayBlocked(world, digger, x, y, z)) { // :179-186 → rayTraceBlocks 变体（C 级）
            return false;
        }
        IBlockState state = world.getBlockState(new BlockPos(x, y, z));
        Block block = state.getBlock();
        if (block == Blocks.AIR || state.getMaterial().isLiquid()) { // :189-196
            return false;
        }
        // ❗F-15-F1 — R196 :206-228 verbatim: the dig is denied only when the
        // FULL deny-conjunct holds (:227-228 ternary). An effective tool
        // (:206-207 — the vanilla isToolEffective transpose) SATISFIES the
        // gate: the :210 term drops out and the dig proceeds (with the
        // :288-298 str divisor in the cooloff) — the v1 blacklist had this
        // polarity inverted. The rage unlock (:209) compares the harvest
        // LEVEL, never hardness (U-01): a frenzied bare-hand digger chews
        // anything with min level < 2 — sandstone slab (1) yes, stone (2)
        // never, obsidian (3) absolutely not (D-04).
        boolean hasEffectiveTool = heldToolEffective(digger.getHeldItemMainhand(), state);
        boolean denied = requiresToolFace(state)                                  // :208
                && (!isFrenzied(digger) || getMinHarvestLevelFace(state) >= 2)    // :209
                && !hasEffectiveTool                                              // :210
                && !isAlwaysChewable(block, digger);                              // :211-226
        return !denied && !isBlockClaimedByAnother(digger, x, y, z);              // :227-228
    }

    /**
     * R196 getStrVsBlock(block, metadata) > 0 face → the vanilla
     * tool-class-effective scan (ItemTool has no per-block speed in 1.12).
     */
    public static boolean heldToolEffective(@Nullable ItemStack held, IBlockState state) {
        if (held == null || !(held.getItem() instanceof ItemTool)) {
            return false;
        }
        // R196 ItemTool.isEffectiveAgainstBlock :143-148 — the sandstone-model
        // slab / axe special case (J-11): an axe is effective there.
        if (state.getBlock() instanceof BlockStoneSlab
                && state.getValue(BlockStoneSlab.VARIANT) == BlockStoneSlab.EnumType.SAND
                && held.getItem() instanceof net.minecraft.item.ItemAxe) {
            return true;
        }
        for (String toolClass : held.getItem().getToolClasses(held)) {
            if (state.getBlock().isToolEffective(toolClass, state)) {
                return true;
            }
        }
        return false;
    }

    /**
     * R196 Material.requiresTool (:405-407): {@code requires_tool || block
     * min harvest level > 0} (the E-06 definition face). The 1.12
     * requires_tool carrier is the vanilla Material tool flag (ROCK/IRON/
     * ANVIL/SNOW/CRAFTED_SNOW set it; GROUND/WOOD/SAND/GLASS/CLOTH/ICE do
     * not).
     */
    private static boolean requiresToolFace(IBlockState state) {
        return !state.getMaterial().isToolNotRequired() || getMinHarvestLevelFace(state) > 0;
    }

    /**
     * R196 Block.getMinHarvestLevel(metadata) (Block.java:2903-2905 — the
     * constructor seeds the block level from the material :1145): the block
     * row over the material level. The block rows are the ETIMMining R196
     * table (ores/sandstone/logs/obsidian — the audit-ported clinit rows).
     * The slab families carry the R196 BlockSlab face (:117-120): the
     * sandstone model row = 1, the rest the material level; the double
     * delegates (BlockDoubleSlab :112-115). The R196 obsidian-slab row has
     * no 1.12 slab carrier — obsidian's face rides the block table row (3).
     */
    private static int getMinHarvestLevelFace(IBlockState state) {
        Block block = state.getBlock();
        if (block instanceof BlockStoneSlab) {
            return state.getValue(BlockStoneSlab.VARIANT) == BlockStoneSlab.EnumType.SAND
                    ? 1 : materialMinLevel(state.getMaterial());
        }
        if (block instanceof BlockWoodSlab) {
            return materialMinLevel(state.getMaterial()); // wood = 0
        }
        Integer row = ETIMMining.getTableMinLevel(state);
        if (row != null) {
            return row;
        }
        return materialMinLevel(state.getMaterial());
    }

    /**
     * R196 material levels (Material.java:14-28, E-07): stone 2 / iron 3 /
     * wood 0; the unset utility materials default 0. The R196-only equipment
     * materials (flint/copper/silver/gold/ancient_metal/obsidian-as-material)
     * have no 1.12 carriers.
     */
    private static int materialMinLevel(Material material) {
        if (material == Material.ROCK) {
            return 2;   // Material.java:23
        }
        if (material == Material.IRON) {
            return 3;   // Material.java:49-53
        }
        return 0;
    }

    /**
     * R196 :211-226 — the always-chewable list (the v1 list polarity
     * inverted by the rebuild: these blocks chew regardless of the :208/
     * :210 faces). The cactus membership keeps the invulnerable/undead
     * caveat verbatim (:220). The leaves row transposes as the BlockLeaves
     * class (R196 has one leaves block; v1 pinned Blocks.LEAVES only and
     * missed LEAVES2).
     */
    private static boolean isAlwaysChewable(Block block, EntityZombie digger) {
        return block == Blocks.SAND || block == Blocks.DIRT || block == Blocks.GRASS
                || block == Blocks.GRAVEL || block == Blocks.SNOW_LAYER || block == Blocks.FARMLAND
                || block == Blocks.CLAY || block instanceof BlockLeaves || block == Blocks.WOOL
                || (block == Blocks.CACTUS && (digger.isEntityInvulnerable(DamageSource.GENERIC) || digger.isEntityUndead()))
                || block == Blocks.SPONGE || block instanceof BlockPumpkin || block instanceof BlockMelon
                || block == Blocks.MYCELIUM || block == Blocks.HAY_BLOCK || block == Blocks.GLASS_PANE;
    }

    /**
     * R196 BlockSlab.getBlockHardness (:88-115): the model-block table ×
     * 0.5F — stone 2.4 / sandStone 1.0 / planks 0.8 / quartz 0.8 /
     * cobblestone+brick+stoneBrick+netherBrick 2.0 (the obsidian row, 2.4,
     * has no 1.12 slab carrier) — and the double face (BlockDoubleSlab
     * :107-110) = the single × 2.0. The E-09 cooloff rows read this face:
     * stone slab 1.2 → 180 frenzied; sandstone slab 0.5 → 75.
     */
    private static float slabHardnessFace(IBlockState state) {
        float table;
        if (state.getBlock() instanceof BlockStoneSlab) {
            switch (state.getValue(BlockStoneSlab.VARIANT)) {
                case STONE:
                    table = 2.4F;
                    break;
                case SAND:
                    table = 1.0F;
                    break;
                case WOOD:  // the planks-model row (the wood-textured stone slab)
                case QUARTZ:
                    table = 0.8F;
                    break;
                default:    // cobblestone / brick / stoneBrick / netherBrick
                    table = 2.0F;
                    break;
            }
        } else {
            table = 0.8F; // BlockWoodSlab family — the planks-model row
        }
        return ((BlockSlab) state.getBlock()).isDouble() ? table : table * 0.5F;
    }

    /** The R196 :267 hardness funnel: the slab faces for the R196 slab families, the ETIMMining R196 table (vanilla fallback) elsewhere. */
    private static float r196BlockHardness(IBlockState state, World world, BlockPos pos) {
        Block block = state.getBlock();
        if (block instanceof BlockStoneSlab || block instanceof BlockWoodSlab) {
            return slabHardnessFace(state);
        }
        return ETIMMining.getHardness(state, world, pos);
    }

    /**
     * R196 isBlockClaimedByAnother (:144-158): another digger-family mob
     * within ±4 already destroying the same block (the ETIM family = zombies,
     * 裁 3).
     */
    private static boolean isBlockClaimedByAnother(EntityZombie digger, int x, int y, int z) {
        AxisAlignedBB bb = new AxisAlignedBB(
                digger.posX - 4.0D, digger.posY - 4.0D, digger.posZ - 4.0D,
                digger.posX + 4.0D, digger.posY + 4.0D, digger.posZ + 4.0D);
        for (Entity entity : digger.world.getEntitiesWithinAABBExcludingEntity(digger, bb)) {
            if (entity instanceof EntityZombie) {
                IState other = get((EntityZombie) entity);
                if (other != null && other.isDestroyingBlock()
                        && other.getDestroyBlockX() == x && other.getDestroyBlockY() == y && other.getDestroyBlockZ() == z) {
                    return true; // :151-153
                }
            }
        }
        return false;
    }

    /**
     * R196 setBlockToDig (:231-250) — the state write-in face both the dig
     * AI and the attack-melee dig branch read.
     */
    public static boolean setBlockToDig(EntityZombie digger, IState s,
            int x, int y, int z, boolean checkClipping) {
        if (!canDestroyBlock(digger, s, x, y, z, checkClipping)) { // :232-234
            return false;
        }
        s.setDestroyingBlock(true); // :236
        if (x == s.getDestroyBlockX() && y == s.getDestroyBlockY() && z == s.getDestroyBlockZ()) {
            return true; // :237-239 same-block reuse
        }
        IBlockState state = digger.world.getBlockState(new BlockPos(x, y, z));
        if (y == footBlockPosY(digger) + 1 && state.getBlock() == Blocks.CACTUS
                && canDestroyBlock(digger, s, x, y - 1, z, checkClipping)) {
            y--; // :241-243 cactus foot-face drop
        }
        s.setDestroyBlockProgress(-1); // :245
        s.setDestroyBlockX(x);
        s.setDestroyBlockY(y);
        s.setDestroyBlockZ(z);
        return true;
    }

    /** R196 cancelBlockDestruction (:252-259). */
    public static void cancelBlockDestruction(EntityZombie digger, IState s) {
        if (s.isDestroyingBlock()) {
            digger.world.sendBlockBreakProgress(digger.getEntityId(),
                    new BlockPos(s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ()), -1); // :254 → destroy-stage clear
            s.setDestroyingBlock(false);
            s.setDestroyBlockProgress(-1);
            s.setDestroyBlockCooloff(40);
        }
    }

    /**
     * R196 getCooloffForBlock (:261-301): {@code 300.0F * blockHardness}
     * (:267), frenzy halves it (:268-270), a held ItemTool divides by
     * {@code 1 + strVsBlock * 0.5} (:288-298); an air block keeps the 40
     * default. Shared by the dig task.
     */
    public static int sharedCooloffForBlock(EntityZombie digger, IState s) {
        BlockPos pos = new BlockPos(s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ());
        IBlockState state = digger.world.getBlockState(pos);
        Block block = state.getBlock();
        if (block == Blocks.AIR) {
            return 40; // :263-265
        }
        int cooloff = (int) (300.0F * r196BlockHardness(state, digger.world, pos)); // :267 — the R196 hardness funnel (slab faces + the ETIMMining table)
        if (isFrenzied(digger)) {
            cooloff /= 2; // :268-270
        }
        ItemStack held = digger.getHeldItemMainhand();
        if (held != null && held.getItem() instanceof ItemTool) {
            float str = heldToolEffective(held, state) ? ((ItemTool) held.getItem()).getDestroySpeed(held, state) : 0.0F;
            if (str > 0.0F) {
                cooloff = (int) (cooloff / (1.0F + str * 0.5F)); // :288-298
            }
        }
        return cooloff;
    }

    /**
     * R196 partiallyDestroyBlock (:31-119): one strike — the 10-tick destroy
     * progress, the break face (entity-harvested drop + air), the continue
     * scan (falling above / y-walk), the destroy-stage packet and the break
     * sound. Registered C 级 skips: the cactus hand-damage branch (its guard
     * method is MITE-only and unarchived), the nearby attack-task
     * suppression write (an EntityAIAttackOnCollide field face the 1.12
     * task storage does not expose; falling physics run vanilla-native per
     * 裁 4), and the {@code BlockUnderminable.tryToFall} ride-along (the
     * 1.12 falling chain covers the face, 补裁注册).
     */
    public static void partiallyDestroyBlock(EntityZombie digger, IState s) {
        int x = s.getDestroyBlockX();
        int y = s.getDestroyBlockY();
        int z = s.getDestroyBlockZ();
        if (!canDestroyBlock(digger, s, x, y, z, true)) { // :35-36
            cancelBlockDestruction(digger, s);
            return;
        }
        ((io.github.etim.etim.mixins.EntityLivingBaseAccessor) digger).etim$setIdleTime(-400); // :38 refreshDespawnCounter(-400)
        World world = digger.world;
        BlockPos pos = new BlockPos(x, y, z);
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        s.setDestroyBlockProgress(s.getDestroyBlockProgress() + 1);
        // [SleepLog] bed-dig — the destroy-progress edge row (AI-02 verdict §7:
        // one per strike; the state seeds -1, so progress reads 0..9 while
        // digging, 10 on the break strike before the -1 reset). Covers both the
        // dig-task strikes and the attack-melee dig branch (both funnel through
        // this strike).
        ETIM.LOGGER.info("[SleepLog] bed-dig mob=" + digger.getClass().getSimpleName()
                + " x,y,z=" + x + "," + y + "," + z
                + " progress=" + s.getDestroyBlockProgress()
                + " tick=" + world.getWorldInfo().getWorldTotalTime());
        if (s.getDestroyBlockProgress() < 10) { // :45-46
            s.setDestroyingBlock(true);
        } else {
            s.setDestroyBlockProgress(-1); // :48
            if (state.getMaterial() == Material.GLASS) { // :49-51 — glass drops with the aux face below, no extra
                world.playEvent(2001, pos, Block.getStateId(state));
            }
            block.dropBlockAsItem(world, pos, state, 0); // :53-54 entity-harvested drop (BlockBreakInfo → fortune-0 face)
            world.setBlockToAir(pos); // :55
            ItemStack held = digger.getHeldItemMainhand();
            if (held != null) { // :73-76
                held.getItem().onBlockDestroyed(held, world, state, pos, digger);
            }
            s.setDestroyingBlock(false); // :78
            // :79-98 — the continue scan: dig the block above when it can
            // fall or stands on the just-opened face.
            BlockPos above = new BlockPos(x, y + 1, z);
            IBlockState aboveState = world.getBlockState(above);
            Block blockAbove = aboveState.getBlock();
            if (blockAbove instanceof BlockFalling) { // :80-82
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
            } else if (!blockWillFall(blockAbove)) { // :83 (1.12 states are never null; air above = keep walking)
                if (y == footBlockPosY(digger) && canDestroyBlock(digger, s, x, y + 1, z, true)) {
                    s.setDestroyBlockY(y + 1); // :84-85
                } else {
                    s.setDestroyBlockY(y - 1); // :87
                }
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
            } else if (y == footBlockPosY(digger) + 1
                    && !ETIMBedSafety.isAirOrPassableBlock(world, blockPosX(digger), blockPosY(digger) + 2, blockPosZ(digger), false)
                    && canDestroyBlock(digger, s, x, y - 1, z, true)) { // :92-94
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
                s.setDestroyBlockY(y - 1);
            }
        }
        // :105 — the destroy-stage packet (vanilla sendBlockBreakProgress face).
        world.sendBlockBreakProgress(digger.getEntityId(), new BlockPos(x, y, z), s.getDestroyBlockProgress());
        if (state.getMaterial() == Material.GLASS) { // :106-115 — glass面只出声效（2001 仅 break 拍 :49-51 一次）
            net.minecraft.block.SoundType sound = state.getBlock().getSoundType(state, world, pos, digger);
            world.playSound((EntityPlayer) null, x + 0.5F, y + 0.5F, z + 0.5F, sound.getPlaceSound(),
                    SoundCategory.BLOCKS, sound.getVolume() + 2.0F, sound.getPitch());
        } else {
            world.playEvent(2001, pos, Block.getStateId(state)); // :116 (R196 formula blockID + meta<<12 → state-id face)
        }
    }

    /** R196 blockWillFall (:26-29): falling/cactus/torch/thin-snow blocks. */
    private static boolean blockWillFall(Block block) {
        return block instanceof BlockFalling || block == Blocks.CACTUS
                || block instanceof net.minecraft.block.BlockTorch || block == Blocks.SNOW_LAYER;
    }

    /**
     * R196 :179-186 double-reach clipping — ray from the destroy eye and the
     * leg face; blocked when a ray hits anything but the target block
     * (rayTraceBlocks 变体, C 级).
     */
    private static boolean reachRayBlocked(World world, EntityZombie digger, int x, int y, int z) {
        Vec3d center = new Vec3d(x + 0.5F, y + 0.5F, z + 0.5F);
        Vec3d eye = new Vec3d(digger.posX, digger.posY + digger.height * 0.75F, digger.posZ); // getEyePosForBlockDestroying → getPrimaryPointOfAttack（非玩家 0.75）
        Vec3d leg = new Vec3d(digger.posX, digger.posY + digger.height * 0.25F, digger.posZ); // getAttackerLegPosForBlockDestroying
        return rayHitsOther(world, eye, center, x, y, z) && rayHitsOther(world, leg, center, x, y, z);
    }

    /**
     * R196 :180-185 — one reach ray; the ray may hit the target block
     * itself, or an entity, and still allow the dig.
     */
    private static boolean rayHitsOther(World world, Vec3d from, Vec3d to, int tx, int ty, int tz) {
        RayTraceResult hit = world.rayTraceBlocks(from, to, false, true, false);
        if (hit == null || hit.typeOfHit == RayTraceResult.Type.MISS) {
            return false;
        }
        BlockPos pos = hit.getBlockPos();
        return pos.getX() != tx || pos.getY() != ty || pos.getZ() != tz;
    }

    /** R196 isHostileEntityDiggingNearBed (EntityPlayer.java:1386-1405) — the three-gate sensor face. */
    public static boolean isHostileEntityDiggingNearBed(World world, BlockPos bed) {
        AxisAlignedBB aabb = new AxisAlignedBB(
                bed.getX() - 8.0D, bed.getY() - 5.0D, bed.getZ() - 8.0D,
                bed.getX() + 8.0D, bed.getY() + 5.0D, bed.getZ() + 8.0D); // :1387-1390
        for (EntityLiving entity : world.getEntitiesWithinAABB(EntityLiving.class, aabb)) {
            if (entity instanceof EntityZombie) {
                IState s = get(entity);
                if (s != null && s.isDestroyingBlock()) { // :1396-1399
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * R196 EntityAnimalWatcher.onUpdate face (:303-319), zombie-hosted: keep
     * facing the block and re-admit the destruction while digging; reset the
     * dormant markers otherwise.
     */
    public static void tickDigger(EntityZombie digger) {
        if (digger.world.isRemote || !io.github.etim.etim.ETIMConfig.zombieDigAI) {
            return;
        }
        IState s = get(digger);
        if (s == null) {
            return;
        }
        if (s.isDestroyingBlock()) {
            if (s.getDestroyPauseTicks() == 0) {
                digger.getLookHelper().setLookPosition(
                        s.getDestroyBlockX() + 0.5F, s.getDestroyBlockY() + 0.5F, s.getDestroyBlockZ() + 0.5F,
                        10.0F, digger.getVerticalFaceSpeed()); // :307-308
                if (!canDestroyBlock(digger, s, s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ(), true)) {
                    cancelBlockDestruction(digger, s); // :309-311
                }
            }
        } else {
            s.setDestroyBlockCooloff(40); // :314
            s.setDestroyBlockProgress(-1); // :315
        }
    }

    /** R196 onDeath face (:348-351) — wired by ETIMDiggingEvents. */
    public static void onDiggerDeath(EntityZombie digger) {
        IState s = get(digger);
        if (s != null) {
            cancelBlockDestruction(digger, s);
        }
    }
}
