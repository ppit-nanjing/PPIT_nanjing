/**
 * Seeds the national PPI Tiongkok regional branch directory (distinct from PPIT
 * Nanjing's own department structure - see docs/Data Dictionary.md "Dua skop
 * organisasi"). Only the 9 branches explicitly named on ppitiongkok.com's homepage
 * are known; the organization states 32 total branches exist, but the other 23
 * aren't listed anywhere available to this project - seed what's confirmed, leave
 * the rest for an admin to add via /console once that module exists.
 * Run with: npx tsx --env-file=.env src/db/seed-branches.ts
 */
import { db } from "./index";
import { regionalBranches } from "./schema";

async function main() {
  await db.insert(regionalBranches).values([
    { cityName: "Beijing", region: "north" },
    { cityName: "Tianjin", region: "north" },
    { cityName: "Harbin", region: "north" },
    { cityName: "Shanghai", region: "east" },
    { cityName: "Nanjing", region: "east" },
    { cityName: "Hangzhou", region: "east" },
    { cityName: "Guangzhou", region: "south" },
    { cityName: "Xiamen", region: "south" },
    { cityName: "Shenzhen", region: "south" },
  ]);
  console.log("Seeded 9 known regional branches (of 32 total per PPI Tiongkok - the rest need admin input)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
