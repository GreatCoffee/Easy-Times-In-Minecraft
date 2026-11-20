package io.github.etim.etim.skill;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.world.World;

/**
 * The acquisition rules for the minimal skill layer (batch B-45, option B).
 *
 * <p>R196 anchors: {@code Skill.java:25-45} (mask helpers) and the
 * {@code /skill learn} cost {@code 5 * (known + 1)} levels, one learning per
 * world day. The world enable switch is the 1.12 replacement for
 * {@code WorldInfo.are_skills_enabled} (R196 {@code World.areSkillsEnabled}).
 * The default is off, so the shipped game keeps the skills-disabled parity
 * path until a pack turns it on.</p>
 */
public final class ETIMSkillRules {

    private ETIMSkillRules() {
    }

    public static boolean enabled(World world) {
        return world != null && !world.isRemote && ETIMConfig.skillsEnabled;
    }

    public static int learnCost(EntityPlayer player) {
        int known = Integer.bitCount(ETIMSkills.mask(player));
        return 5 * (known + 1);
    }

    public static int currentDay(World world) {
        // R196 World.getDayOfWorld :5307-5309 = total/24000 + 1; default lastLearnDay=0
        // therefore day 1 is learnable and day 0 is not a valid in-game day.
        return (int) (world.getTotalWorldTime() / 24000L) + 1;
    }

    public static boolean canLearn(EntityPlayer player, ETIMSkill skill) {
        if (player == null || skill == null || !enabled(player.world)) {
            return false;
        }
        IETIMSkills state = ETIMSkills.get(player);
        if (state == null || state.has(skill)) {
            return false;
        }
        if (player.experienceLevel < learnCost(player)) {
            return false;
        }
        return state.getLastLearnDay() < currentDay(player.world);
    }

    /** Server-authoritative learning; returns false without changing state. */
    public static boolean learn(EntityPlayer player, ETIMSkill skill) {
        if (!canLearn(player, skill)) {
            return false;
        }
        IETIMSkills state = ETIMSkills.get(player);
        if (state == null) {
            return false;
        }
        int cost = learnCost(player);
        state.setMask(state.getMask() | skill.mask());
        state.setLastLearnDay(currentDay(player.world));
        player.addExperienceLevel(-cost);
        return true;
    }

    public static boolean abandon(EntityPlayer player, ETIMSkill skill) {
        if (player == null || skill == null || !enabled(player.world)) {
            return false;
        }
        IETIMSkills state = ETIMSkills.get(player);
        if (state == null || !state.has(skill)) {
            return false;
        }
        state.setMask(state.getMask() & ~skill.mask());
        return true;
    }
}
