package io.github.etim.etim.item;

/**
 * R196 碗内容物对位表（B-65，D-1 全量）。
 *
 * <p>判定源：{@code mite-src/decompile/src/net/minecraft/ItemBowl.java:112-198}
 * 的 {@code getPeer} 十三分支，以及 {@code Item.java:37-736} 各碗的
 * {@code setFoodValue(...)} 实参。字段顺序与 R196 一一对应：
 * (satiation, nutrition, sugarContent, protein, fats, phyto)。</p>
 *
 * <p>空碗不在此表——空碗复用 vanilla {@code minecraft:bowl}（R196
 * {@code Item.java:37} 的 bowlEmpty 即原版碗 + 空内容物）。</p>
 */
public enum ETIMBowlContents {

    MUSHROOM_STEW("mushroom_stew", 2, 4, 0, false, false, true, false, false, false),
    MILK("bowl_milk", 0, 1, 0, true, false, false, true, false, true),
    WATER("bowl_water", 0, 0, 0, false, false, false, false, true, false),
    BEEF_STEW("beef_stew", 16, 16, 0, true, true, true, true, false, false),
    CHICKEN_SOUP("chicken_soup", 10, 10, 0, true, true, true, true, false, false),
    VEGETABLE_SOUP("vegetable_soup", 6, 6, 0, false, false, true, true, false, false),
    ICE_CREAM("ice_cream", 5, 4, 1000, false, false, true, true, false, false),
    SALAD("bowl_salad", 1, 1, 0, false, false, true, true, false, false),
    CREAM_OF_MUSHROOM_SOUP("cream_of_mushroom_soup", 3, 5, 0, false, false, true, true, false, false),
    CREAM_OF_VEGETABLE_SOUP("cream_of_vegetable_soup", 7, 7, 0, false, false, true, true, false, false),
    PUMPKIN_SOUP("pumpkin_soup", 1, 2, 0, false, false, true, true, false, false),
    MASHED_POTATO("mashed_potato", 12, 8, 0, false, false, true, true, false, false),
    SORBET("sorbet", 4, 2, 2000, false, false, true, true, false, false),
    PORRIDGE("porridge", 4, 2, 2000, false, false, true, true, false, false),
    CEREAL("cereal", 4, 2, 1000, false, false, true, true, false, false);

    /** 注册名片段与贴图名（{@code assets/etim/textures/items/<texture>.png}）。 */
    public final String texture;
    public final int satiation;
    public final int nutrition;
    public final int sugarContent;
    /** R196 {@code setFoodValue(sat, nut, protein, fats, phyto)} 的三枚池标签。 */
    public final boolean protein;
    public final boolean fats;
    public final boolean phyto;
    /** R196 {@code Material.isEdible()}（奶/水同碗族但可饮）。 */
    public final boolean edible;
    /** R196 {@code Material.isDrinkable()}（水碗走饮用路径）。 */
    public final boolean drinkable;
    /** R196 {@code ItemBowl}：奶碗 {@code setAlwaysEdible()}。 */
    public final boolean alwaysEdible;

    ETIMBowlContents(String texture, int satiation, int nutrition, int sugarContent,
                     boolean protein, boolean fats, boolean phyto,
                     boolean edible, boolean drinkable, boolean alwaysEdible) {
        this.texture = texture;
        this.satiation = satiation;
        this.nutrition = nutrition;
        this.sugarContent = sugarContent;
        this.protein = protein;
        this.fats = fats;
        this.phyto = phyto;
        this.edible = edible;
        this.drinkable = drinkable;
        this.alwaysEdible = alwaysEdible;
    }

    /** R196 {@code ItemBowl.isSoupOrStew}：MaterialSoup / MaterialStew 两族。 */
    public boolean isSoupOrStew() {
        return this == MUSHROOM_STEW || this == BEEF_STEW || this == CHICKEN_SOUP
                || this == VEGETABLE_SOUP || this == CREAM_OF_MUSHROOM_SOUP
                || this == CREAM_OF_VEGETABLE_SOUP || this == PUMPKIN_SOUP;
    }

    /** R196 {@code ItemVessel.canContentsDouseFire()}：只有水内容物认这条面。 */
    public boolean dousesFire() {
        return this == WATER;
    }
}
