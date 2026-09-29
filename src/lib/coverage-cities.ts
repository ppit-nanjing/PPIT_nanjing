export const COVERAGE_CITY_SLUGS = [
  "nanjing",
  "huaian",
  "jurong",
  "lianyungang",
  "maanshan",
  "taizhou",
  "xuzhou",
  "yancheng",
  "zhenjiang",
] as const;

const LABELS: Record<(typeof COVERAGE_CITY_SLUGS)[number], string> = {
  nanjing: "Nanjing",
  huaian: "Huai’an",
  jurong: "Jurong",
  lianyungang: "Lianyungang",
  maanshan: "Ma’anshan",
  taizhou: "Taizhou",
  xuzhou: "Xuzhou",
  yancheng: "Yancheng",
  zhenjiang: "Zhenjiang",
};

const RANK = new Map<string, number>();

for (const [index, slug] of COVERAGE_CITY_SLUGS.entries()) {
  const label = LABELS[slug];
  const keys = new Set([
    slug,
    label.toLowerCase(),
    label.replace(/’/g, "'").toLowerCase(),
  ]);
  for (const key of keys) {
    RANK.set(key, index);
  }
}

export function coverageCityRank(value: string): number {
  return RANK.get(value.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
}

export function sortByCoverageOrder<T>(rows: T[], key: (row: T) => string): T[] {
  return [...rows].sort((a, b) => coverageCityRank(key(a)) - coverageCityRank(key(b)));
}
