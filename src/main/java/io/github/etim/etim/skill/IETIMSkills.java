package io.github.etim.etim.skill;

/**
 * Public capability surface for the player skill mask. Kept as an interface
 * so addons can read/write the same capability without depending on the
 * concrete state class.
 */
public interface IETIMSkills {

    int getMask();

    void setMask(int mask);

    int getLastLearnDay();

    void setLastLearnDay(int day);

    default boolean has(ETIMSkill skill) {
        return skill != null && (getMask() & skill.mask()) != 0;
    }

    default boolean hasAny(int mask) {
        return mask == 0 || (getMask() & mask) != 0;
    }
}
