/**
 * Seeds the 2026/2027 recruitment period exactly as stated in the guidebook
 * (Syarat & Proses Pendaftaran, p.10): registration ran 1-10 Aug 2026. Seeded
 * closed since that window has already passed - flip isOpen in the DB (or build
 * an admin toggle) to demo the open-registration state of /join-us.
 * Run with: npx tsx --env-file=.env src/db/seed-recruitment.ts
 */
import { db } from "./index";
import { recruitmentPeriods } from "./schema";

async function main() {
  await db.insert(recruitmentPeriods).values({
    isOpen: false,
    opensAt: new Date("2026-08-01T21:00:00+07:00"),
    closesAt: new Date("2026-08-10T21:00:00+07:00"),
    batchLabel: "Kabinet Maju 2026/2027",
  });
  console.log("Seeded recruitment period: Kabinet Maju 2026/2027 (closed - window already passed)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
