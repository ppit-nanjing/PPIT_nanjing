/**
 * One-off: backfill lat/lng on the 9 regional_branches rows seeded by
 * seed-branches.ts (which didn't set coordinates). Public, verifiable city
 * coordinates - not organizational data, safe to hardcode.
 * Run with: npx tsx --env-file=.env src/db/seed-branch-coords.ts
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { regionalBranches } from "./schema";

const COORDS: Record<string, [number, number]> = {
  // North (Utara)
  Beijing: [39.9042, 116.4074],
  Changchun: [43.8171, 125.3235],
  Harbin: [45.8038, 126.535],
  Shandong: [36.6512, 117.1201], // province branch; plotted at Jinan
  Shenyang: [41.8057, 123.4315],
  Shijiazhuang: [38.0428, 114.5149],
  Tianjin: [39.3434, 117.3616],
  "Xi'an": [34.3416, 108.9398],
  Zhengzhou: [34.7466, 113.6254],

  // East (Timur)
  Ningbo: [29.8683, 121.544],
  Shanghai: [31.2304, 121.4737],
  Changzhou: [31.8111, 119.9741],
  Hangzhou: [30.2741, 120.1551],
  Hefei: [31.8206, 117.2272],
  Nanchang: [28.6829, 115.8579],
  Nanjing: [32.0603, 118.7969],
  Nantong: [31.9802, 120.8932],
  Suzhou: [31.2989, 120.5853],
  Wuxi: [31.4912, 120.3119],
  Yangzhou: [32.3942, 119.4145],

  // South (Selatan)
  "Hong Kong": [22.3193, 114.1694],
  Changsha: [28.2282, 112.9388],
  Chengdu: [30.5728, 104.0668],
  Chongqing: [29.563, 106.5516],
  Fuzhou: [26.0745, 119.2965],
  Guangzhou: [23.1291, 113.2644],
  Guilin: [25.2736, 110.299],
  Liuzhou: [24.3268, 109.4283],
  Nanning: [22.817, 108.3665],
  Shenzhen: [22.5431, 114.0579],
  Wuhan: [30.5928, 114.3055],
  Xiamen: [24.4798, 118.0894],
};

async function main() {
  for (const [cityName, [lat, lng]] of Object.entries(COORDS)) {
    await db.update(regionalBranches).set({ lat, lng }).where(eq(regionalBranches.cityName, cityName));
  }
  console.log(`Backfilled coordinates for ${Object.keys(COORDS).length} branches`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
