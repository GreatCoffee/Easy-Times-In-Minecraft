package io.github.etim.etim.skill;

import io.github.etim.etim.Tags;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Attaches the skill-mask capability to every player and carries it through
 * the respawn clone (the R196 player skills are fields on ServerPlayer and
 * survive respawn).
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMSkillEvents {

    private ETIMSkillEvents() {
    }

    @SubscribeEvent
    public static void onAttachEntityCapabilities(AttachCapabilitiesEvent<Entity> event) {
        if (!(event.getObject() instanceof EntityPlayer)) {
            return;
        }
        event.addCapability(ETIMSkills.CAPABILITY_KEY, new ETIMSkills.Provider());
    }

    @SubscribeEvent
    public static void onClone(PlayerEvent.Clone event) {
        EntityPlayer original = event.getOriginal();
        EntityPlayer player = event.getEntityPlayer();
        IETIMSkills from = ETIMSkills.get(original);
        IETIMSkills to = ETIMSkills.get(player);
        if (from == null || to == null) {
            return;
        }
        to.setMask(from.getMask());
        to.setLastLearnDay(from.getLastLearnDay());
    }
}
