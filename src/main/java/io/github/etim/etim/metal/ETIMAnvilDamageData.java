package io.github.etim.etim.metal;

import java.util.HashMap;
import java.util.Map;

import io.github.etim.etim.ETIM;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.storage.WorldSavedData;

/**
 * 批三修理面 T2①载体 b (终审 B-6 修正案): the anvil-wear accumulator. The
 * vanilla 1.12 anvil is a bare {@code BlockFalling} — NOT an
 * {@code ITileEntityProvider}, so there is no TE to hang per-block state on
 * (the R196 TileEntityAnvil :4-15 NBT face has no direct host). The wear
 * total therefore lives in a per-world WorldSavedData map keyed by the
 * packed BlockPos — NBT-persisted across saves, exactly the R196 TE damage
 * field's durability semantics.
 *
 * <p>Judged values: the iron-anvil wear capacity = 1600 × 31 × 8.0 =
 * 396,800 (R196 BlockAnvil :191-197); stage thresholds ≥0.5/0.8/1.0 → the
 * vanilla DAMAGE metadata 1/2/broken (:199-208); breaking plays event 1029,
 * damaging 1030 (vanilla ContainerRepair :114-129 对位). The wear is
 * monotonic — a lower stage never downgrades the metadata.</p>
 */
public class ETIMAnvilDamageData extends WorldSavedData {

    private static final String DATA_NAME = "etim_anvil_damage";

    /** Packed BlockPos → accumulated wear units. */
    private final Map<Long, Integer> wear = new HashMap<>();

    public ETIMAnvilDamageData(String name) {
        super(name);
    }

    public ETIMAnvilDamageData() {
        super(DATA_NAME);
    }

    /** The per-world instance (loads or creates — the MapStorage face). */
    public static ETIMAnvilDamageData get(World world) {
        ETIMAnvilDamageData data = (ETIMAnvilDamageData) world.getMapStorage()
                .getOrLoadData(ETIMAnvilDamageData.class, DATA_NAME);
        if (data == null) {
            data = new ETIMAnvilDamageData();
            world.getMapStorage().setData(DATA_NAME, data);
        }
        return data;
    }

    /**
     * R196 TileEntityAnvil.addDamage :23-34 对位 — accumulate and re-stage
     * the block. Server side only (the R196 :25 client guard).
     */
    public static void addDamage(World world, BlockPos pos, int amount) {
        if (world.isRemote) {
            return;
        }
        if (!(world.getBlockState(pos).getBlock() instanceof net.minecraft.block.BlockAnvil)) {
            return; // the anvil moved/broke between take and wear — drop the unit
        }
        ETIMAnvilDamageData data = get(world);
        long key = pos.toLong();
        int total = data.wear.getOrDefault(key, 0) + amount;
        data.wear.put(key, total);
        data.markDirty();

        float capacity = 1600F * 31F * ETIMAnvilRepair.anvilMetalDurability(world, pos); // 金属砧块批: per-anvil (R196 :191-197 式)
        float factor = (float) total / capacity;
        net.minecraft.block.state.IBlockState state = world.getBlockState(pos);
        int current = state.getValue(net.minecraft.block.BlockAnvil.DAMAGE);
        int stage;
        if (factor >= 1.0F) {
            stage = 3;
        } else if (factor >= 0.8F) {
            stage = 2;
        } else if (factor >= 0.5F) {
            stage = 1;
        } else {
            stage = 0;
        }
        if (stage == 3) {
            world.setBlockToAir(pos);
            data.wear.remove(key); // T3② — the block is gone, its ledger dies with it
            data.markDirty();
            world.playEvent(1029, pos, 0); // the break event
            ETIM.LOGGER.info("[CraftingLog] anvil broken by wear at " + pos
                    + " total=" + total + " [server]");
        } else if (stage > current) {
            world.setBlockState(pos, state.withProperty(net.minecraft.block.BlockAnvil.DAMAGE, stage), 2);
            world.playEvent(1030, pos, 0); // the damage event
            ETIM.LOGGER.info("[CraftingLog] anvil wear stage=" + stage + " at " + pos
                    + " total=" + total + " [server]");
        }
    }

    /** Dev/test face: the raw wear total at a pos (CommandDevTest query). */
    public static int wearAt(World world, BlockPos pos) {
        ETIMAnvilDamageData data = get(world);
        return data.wear.getOrDefault(pos.toLong(), 0);
    }

    /**
     * 金属砧块批 T3② 防脏面 — drop the entry at a pos (the mined/placed anvil
     * must not leak its ledger to whatever comes next at that position).
     */
    public static void removeWear(World world, BlockPos pos) {
        ETIMAnvilDamageData data = get(world);
        if (data.wear.remove(pos.toLong()) != null) {
            data.markDirty();
        }
    }

    @Override
    public void readFromNBT(NBTTagCompound nbt) {
        wear.clear();
        for (String key : nbt.getKeySet()) {
            wear.put(Long.parseLong(key), nbt.getInteger(key));
        }
    }

    @Override
    public NBTTagCompound writeToNBT(NBTTagCompound nbt) {
        for (Map.Entry<Long, Integer> row : wear.entrySet()) {
            nbt.setLong(String.valueOf(row.getKey()), row.getValue());
        }
        return nbt;
    }
}
