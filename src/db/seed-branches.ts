/**
 * Seeds the national PPI Tiongkok regional branch directory (distinct from
 * PPIT Nanjing's own department structure - see docs/Data Dictionary.md
 * "Dua skop organisasi"). The full 32-branch directory is published by PPI
 * Tiongkok (North 9 / East 11 / South 12); we mirror it here as the canonical
 * source. Run with: npx tsx --env-file=.env src/db/seed-branches.ts
 */
import { db } from "./index";
import { regionalBranches } from "./schema";

async function main() {
  // Reset first so re-running stays idempotent (no duplicate rows).
  await db.delete(regionalBranches);

  await db.insert(regionalBranches).values([
    // North (Utara) - 9
    { cityName: "Beijing", region: "north" },
    { cityName: "Changchun", region: "north" },
    { cityName: "Harbin", region: "north" },
    { cityName: "Shandong", region: "north" },
    { cityName: "Shenyang", region: "north" },
    { cityName: "Shijiazhuang", region: "north" },
    { cityName: "Tianjin", region: "north" },
    { cityName: "Xi'an", region: "north" },
    { cityName: "Zhengzhou", region: "north" },

    // East (Timur) - 11
    { cityName: "Ningbo", region: "east" },
    { cityName: "Shanghai", region: "east" },
    { cityName: "Changzhou", region: "east" },
    { cityName: "Hangzhou", region: "east" },
    { cityName: "Hefei", region: "east" },
    { cityName: "Nanchang", region: "east" },
    { cityName: "Nanjing", region: "east" },
    { cityName: "Nantong", region: "east" },
    { cityName: "Suzhou", region: "east" },
    { cityName: "Wuxi", region: "east" },
    { cityName: "Yangzhou", region: "east" },

    // South (Selatan) - 12
    { cityName: "Hong Kong", region: "south" },
    { cityName: "Changsha", region: "south" },
    { cityName: "Chengdu", region: "south" },
    { cityName: "Chongqing", region: "south" },
    { cityName: "Fuzhou", region: "south" },
    { cityName: "Guangzhou", region: "south" },
    { cityName: "Guilin", region: "south" },
    { cityName: "Liuzhou", region: "south" },
    { cityName: "Nanning", region: "south" },
    { cityName: "Shenzhen", region: "south" },
    { cityName: "Wuhan", region: "south" },
    { cityName: "Xiamen", region: "south" },
  ]);

  console.log("Seeded 32 regional branches from PPI Tiongkok directory");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
