/**
 * Seeds / tops up the /places directory — curated real spots in Nanjing for
 * Indonesian students. Grouped by the 7 place_category values (see
 * placeCategoryEnum in schema.ts).
 *
 * NON-DESTRUCTIVE and idempotent, by design: the production table already holds
 * rows entered by hand via /console/katalog, so this script must never wipe it.
 *   - CATEGORY_FIXES: re-file existing rows into the finer categories, matched
 *     by exact name. Only touches `category`, nothing else.
 *   - NEW_PLACES: inserted only if no row with that name exists yet, so re-runs
 *     don't create duplicates.
 *
 * `imageUrl` is intentionally left null: Vercel Blob isn't provisioned yet (see
 * docs/Progress & Handoff.md gap #3), so /places renders a category-coloured
 * icon header instead of a photo. Fill photos in later.
 *
 * `mapUrl` uses Google Maps search links by name — stable, no place-id lookup.
 * A committee member who knows Nanjing should sanity-check addresses/spelling.
 *
 * Run with: npx tsx --env-file=.env src/db/seed-places.ts
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { places } from "./schema";

type Category = "tourism" | "spiritual" | "practical" | "culture" | "nature" | "food" | "shopping";

// Re-file the rows already in the DB (all were "tourism" except the mosque)
// into the finer categories. Keyed by the exact existing `name`.
const CATEGORY_FIXES: Record<string, Category> = {
  "Sun Yat-sen Mausoleum": "culture",
  "Ming Xiaoling Mausoleum": "culture",
  "Nanjing City Wall": "culture",
  "Confucius Temple (Fuzimiao)": "tourism",
  "Qinhuai River": "tourism",
  "Xuanwu Lake": "nature",
  "Purple Mountain (Zijinshan)": "nature",
  "Presidential Palace": "culture",
  "Jiming Temple": "spiritual",
  "Nanjing Massacre Memorial Hall": "culture",
  // "Jingjue Mosque" is already spiritual — left alone.
};

type NewPlace = {
  name: string;
  nameZh?: string;
  category: Category;
  district?: string;
  description?: string;
  address?: string;
  addressZh?: string;
  mapUrl?: string;
};

const map = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

// Only genuinely new spots — anything already in the DB is deliberately omitted
// here so we don't fight the hand-entered rows.
const NEW_PLACES: NewPlace[] = [
  // ---------- Sejarah & Budaya (culture) ----------
  {
    name: "Nanjing Museum",
    nameZh: "南京博物院",
    category: "culture",
    district: "Xuanwu",
    description:
      "Salah satu museum terbesar di Tiongkok — koleksi dari zaman kuno sampai era republik. Gratis, tinggal reservasi online.",
    address: "321 Zhongshan East Road, Xuanwu District",
    addressZh: "南京市玄武区中山东路321号",
    mapUrl: map("Nanjing Museum"),
  },
  {
    name: "Qixia Temple",
    nameZh: "栖霞寺",
    category: "culture",
    district: "Qixia",
    description:
      "Kuil kuno di lereng gunung, terkenal saat musim gugur ketika daun mapel berubah merah.",
    address: "88 Qixia Street, Qixia District",
    addressZh: "南京市栖霞区栖霞街88号",
    mapUrl: map("Qixia Temple Nanjing"),
  },

  // ---------- Alam & Rekreasi (nature) ----------
  {
    name: "Mochou Lake Park",
    nameZh: "莫愁湖公园",
    category: "nature",
    district: "Jianye",
    description:
      "Taman danau klasik yang lebih tenang dari Xuanwu — cocok untuk jalan santai sore hari.",
    address: "35 Shuiximen Street, Jianye District",
    addressZh: "南京市建邺区水西门大街35号",
    mapUrl: map("Mochou Lake Park Nanjing"),
  },

  // ---------- Belanja (shopping) ----------
  {
    name: "Xinjiekou",
    nameZh: "新街口",
    category: "shopping",
    district: "Xuanwu",
    description:
      "Pusat perbelanjaan terbesar Nanjing — mal, department store, dan toko elektronik di sekitar stasiun metro Xinjiekou.",
    address: "Xinjiekou, Xuanwu District",
    addressZh: "南京市玄武区新街口",
    mapUrl: map("Xinjiekou Nanjing"),
  },
  {
    name: "Confucius Temple Market",
    nameZh: "夫子庙市场",
    category: "shopping",
    district: "Qinhuai",
    description:
      "Pasar suvenir dan oleh-oleh di kawasan Fuzimiao — kerajinan, teh, dan cinderamata khas Nanjing.",
    address: "Gongyuan Street, Qinhuai District",
    addressZh: "南京市秦淮区贡院街",
    mapUrl: map("Confucius Temple Market Nanjing"),
  },

  // ---------- Kuliner (food) ----------
  {
    name: "Shiziqiao Food Street",
    nameZh: "狮子桥美食街",
    category: "food",
    district: "Gulou",
    description:
      "Jalan kuliner pejalan kaki populer — banyak pilihan makanan Tiongkok dan jajanan lokal. Cek kehalalannya sebelum makan.",
    address: "Shiziqiao, Gulou District",
    addressZh: "南京市鼓楼区狮子桥",
    mapUrl: map("Shiziqiao Food Street Nanjing"),
  },
  {
    name: "Confucius Temple Snack Street",
    nameZh: "夫子庙小吃",
    category: "food",
    district: "Qinhuai",
    description:
      "Deretan jajanan tradisional Nanjing di kawasan Qinhuai. Cek dulu kehalalannya sebelum makan.",
    address: "Qinhuai District",
    addressZh: "南京市秦淮区",
    mapUrl: map("Confucius Temple Snack Street Nanjing"),
  },

  // ---------- Ibadah (spiritual) ----------
  {
    name: "Xiaguan Mosque",
    nameZh: "下关清真寺",
    category: "spiritual",
    district: "Gulou",
    description:
      "Masjid di kawasan utara kota, alternatif tempat salat berjamaah bagi yang tinggal di sekitar Gulou.",
    address: "Xiaguan area, Gulou District",
    addressZh: "南京市鼓楼区下关",
    mapUrl: map("Xiaguan Mosque Nanjing"),
  },

  // ---------- Kebutuhan Sehari-hari (practical) ----------
  {
    name: "Nanjing South Railway Station",
    nameZh: "南京南站",
    category: "practical",
    district: "Yuhuatai",
    description:
      "Stasiun kereta cepat utama Nanjing — keberangkatan ke Shanghai, Beijing, dan kota lain. Terhubung metro.",
    address: "Yuhuatai District",
    addressZh: "南京市雨花台区",
    mapUrl: map("Nanjing South Railway Station"),
  },
  {
    name: "Nanjing Lukou International Airport",
    nameZh: "南京禄口国际机场",
    category: "practical",
    district: "Jiangning",
    description:
      "Bandara internasional Nanjing. Terhubung ke pusat kota lewat metro Line S1 dan bus bandara.",
    address: "Jiangning District",
    addressZh: "南京市江宁区",
    mapUrl: map("Nanjing Lukou International Airport"),
  },
];

async function main() {
  const existing = await db.select({ name: places.name, category: places.category }).from(places);
  const byName = new Map(existing.map((r) => [r.name, r.category]));

  // 1. Re-file existing rows into finer categories (name-matched, category-only).
  let fixed = 0;
  for (const [name, category] of Object.entries(CATEGORY_FIXES)) {
    if (!byName.has(name)) {
      console.warn(`  ! skip category fix — no row named "${name}"`);
      continue;
    }
    if (byName.get(name) === category) continue; // already correct
    await db.update(places).set({ category }).where(eq(places.name, name));
    fixed++;
  }

  // 2. Insert new places only when the name doesn't exist yet.
  const toInsert = NEW_PLACES.filter((p) => !byName.has(p.name));
  const startIndex = existing.length;
  if (toInsert.length) {
    await db.insert(places).values(
      toInsert.map((s, i) => ({
        name: s.name,
        nameZh: s.nameZh ?? null,
        category: s.category,
        district: s.district ?? null,
        description: s.description ?? null,
        address: s.address ?? null,
        addressZh: s.addressZh ?? null,
        imageUrl: null,
        mapUrl: s.mapUrl ?? null,
        orderIndex: startIndex + i,
        published: true,
      })),
    );
  }

  const skipped = NEW_PLACES.length - toInsert.length;
  console.log(
    `Places seed done — ${fixed} categories re-filed, ${toInsert.length} new inserted, ${skipped} skipped (already present).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
