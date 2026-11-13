/**
 * Teks untuk dibandingkan dalam pencarian: tanpa huruf besar, aksen, tanda petik,
 * tanda hubung, dan spasi, supaya "gu lou" menemukan Gulou dan "huaian" menemukan Huai’an.
 */
export const plain = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’\-\s]/g, "");
