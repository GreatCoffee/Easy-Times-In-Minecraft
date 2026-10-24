package io.github.etim.etim.client;

import net.minecraft.client.renderer.block.model.ModelResourceLocation;
import net.minecraft.item.Item;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.client.model.ModelLoader;
import net.minecraftforge.client.event.ModelRegistryEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.registry.ForgeRegistries;
import net.minecraftforge.fml.relauncher.Side;

import io.github.etim.etim.ETIM;

/**
 * 金属砧块批 A-ANV-BLK-5（验证窗定谳，系统性、先于本批）— ETIM never
 * registered its items with the {@code ItemModelMesher}: Forge 1.12's
 * {@code ModelLoader.onRegisterItems} only meshes the {@code customModels}
 * table (javap 复核), everything else falls to the silent missing model —
 * every ETIM item icon/hand model rendered the purple-black checkerboard
 * while the BLOCKS were fine (blockstates face is independent).
 *
 * <p>Fix: one {@code inventory} variant per ETIM item, meta 0 (ETIM carries
 * no meta subtypes — each gear is its own item). The item-model JSONs have
 * been in assets all along (models/item/&lt;x&gt;.json, the gear full set +
 * ingots/nuggets/anvils/storage blocks). Loaded on the client side only
 * (the {@code value = Side.CLIENT} subscriber face — dedicated servers
 * never load this class).</p>
 */
@Mod.EventBusSubscriber(value = Side.CLIENT, modid = ETIM.MOD_ID)
public final class ETIMItemModels {

    @SubscribeEvent
    public static void onModelRegistry(ModelRegistryEvent event) {
        int registered = 0;
        for (Item item : ForgeRegistries.ITEMS.getValues()) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || !ETIM.MOD_ID.equals(name.getNamespace())) {
                continue;
            }
            // dual write: the mesh-definition face (a stack->model FUNCTION, the
            // first block consumed in ModelLoader.onRegisterItems) + the static
            // (item, meta) table. The 20:43 round proved the static face alone
            // reached the table (164 rows) but never the mesher — the function
            // face removes the lookup gap entirely.
            final Item it = item;
            ModelLoader.setCustomMeshDefinition(it,
                    stack -> new ModelResourceLocation(it.getRegistryName(), "inventory"));
            ModelLoader.setCustomModelResourceLocation(it, 0,
                    new ModelResourceLocation(name, "inventory"));
            registered++;
        }
        ETIM.LOGGER.info("[TestLog] item model registry: " + registered + " etim items -> inventory variants (mesh+model dual) [client]");
    }

    private ETIMItemModels() {
    }
}
