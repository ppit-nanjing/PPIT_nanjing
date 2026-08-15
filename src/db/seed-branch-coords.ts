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
  Beijing: [39.9042, 116.4074],
  Tianjin: [39.3434, 117.3616],
  Harbin: [45.8038, 126.535],
  Shanghai: [31.2304, 121.4737],
  Nanjing: [32.0603, 118.7969],
  Hangzhou: [30.2741, 120.1551],
  Guangzhou: [23.1291, 113.2644],
  Xiamen: [24.4798, 118.0894],
  Shenzhen: [22.5431, 114.0579],
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
