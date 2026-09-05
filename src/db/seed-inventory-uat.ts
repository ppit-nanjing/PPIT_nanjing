/**
 * Barang UJI COBA untuk menguji alur peminjaman aset end-to-end TANPA menyentuh
 * 153 barang inventaris asli:
 *   - form publik  /inventory/[id]/borrow  (batas jumlah, panel stok habis,
 *     jalur internal & eksternal, unggah Pernyataan Peminjam)
 *   - konsol       /console/inventory  section "Pengajuan Peminjaman"
 *     (Setujui -> potong stok, Serahkan, Tandai Dikembalikan -> stok balik)
 *
 * Jalankan  : npx tsx --env-file=.env src/db/seed-inventory-uat.ts
 * Hapus lagi: npx tsx --env-file=.env src/db/seed-inventory-uat.ts --remove
 *
 * IDEMPOTEN — barang dicocokkan lewat `name` tetap (lihat NAME). Dijalankan
 * ulang mengembalikan stok ke kondisi awal (total & tersedia = STOCK) dan
 * membuat ulang satu pengajuan contoh kalau sudah tidak ada.
 *
 * `--remove` menghapus barang uji + seluruh pengajuan/reservasi/log-nya lewat
 * cascade. Barang asli tidak tersentuh.
 *
 * Catatan: barang ini IKUT tampil di daftar publik /inventory selama ada —
 * makanya namanya diberi label "[UJI COBA]" yang keras. Hapus dengan --remove
 * setelah selesai menguji.
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { inventoryItems, borrowRequests, inventoryAuditLogs } from "./schema";

const NAME = "[UJI COBA] Barang Tes Peminjaman — jangan dipinjam sungguhan";
const STOCK = 5;

// Satu pengajuan contoh (peminjam EKSTERNAL / pihak luar) supaya antrean konsol
// langsung ada isinya tanpa harus lewat form dulu. quantity < STOCK biar masih
// bisa disetujui. statementUrl sengaja NULL — konsol akan menampilkan peringatan
// "berkas tidak valid", itu memang salah satu hal yang perlu dicek.
const SAMPLE_REQUEST = {
  borrowerName: "[UJI COBA] Peminjam Tes",
  borrowerEmail: "uji.coba@example.com",
  borrowerWechat: "uji_coba_wechat",
  borrowerPhone: "+8613800000000",
  quantity: 2,
  purpose: "[UJI COBA] Menguji alur persetujuan di konsol — bukan peminjaman sungguhan.",
  usageLocation: "Sekretariat PPIT Nanjing (uji coba)",
} as const;

// Rentang tanggal pengajuan contoh: mulai besok, 7 hari.
function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function remove() {
  const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.name, NAME));
  if (!existing) {
    console.log(`Barang uji "${NAME}" tidak ada — tidak ada yang dihapus.`);
    return;
  }
  // borrow_requests, item_reservations, inventory_audit_logs semua
  // onDelete: "cascade" dari inventory_items.
  await db.delete(inventoryItems).where(eq(inventoryItems.id, existing.id));
  console.log(`Barang uji "${NAME}" (${existing.id}) dihapus beserta seluruh pengajuan & log ujinya.`);
}

async function seed() {
  const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.name, NAME));

  const values = {
    name: NAME,
    category: "Uji Coba",
    description:
      "Barang buatan untuk menguji fitur peminjaman aset (form publik + konsol Logistik). " +
      "Tidak ada barang fisiknya. Hapus lewat skrip seed-inventory-uat.ts --remove setelah selesai.",
    location: "— (uji coba, tidak ada barang fisik)",
    custodian: "Divisi Teknologi (uji coba)",
    totalQuantity: STOCK,
    availableQuantity: STOCK,
    condition: "good" as const,
  };

  let itemId: string;
  if (existing) {
    await db.update(inventoryItems).set(values).where(eq(inventoryItems.id, existing.id));
    itemId = existing.id;
    console.log(`Barang uji diperbarui, stok direset ke ${STOCK}/${STOCK}: ${NAME}`);
  } else {
    const [created] = await db.insert(inventoryItems).values(values).returning({ id: inventoryItems.id });
    itemId = created.id;
    console.log(`Barang uji dibuat (${STOCK}/${STOCK}): ${NAME}`);
    await db.insert(inventoryAuditLogs).values({
      itemId,
      action: "added",
      quantityDelta: STOCK,
      note: "Barang UJI COBA ditambahkan lewat seed-inventory-uat.ts",
    });
  }

  const pending = await db
    .select({ id: borrowRequests.id })
    .from(borrowRequests)
    .where(eq(borrowRequests.itemId, itemId));

  if (pending.length === 0) {
    await db.insert(borrowRequests).values({
      itemId,
      userId: null,
      ...SAMPLE_REQUEST,
      requestedFrom: dateStr(1),
      requestedTo: dateStr(8),
      statementUrl: null,
      status: "pending",
    });
    console.log("Pengajuan contoh (pihak luar, status: pending) dibuat.");
  } else {
    console.log(`Sudah ada ${pending.length} pengajuan untuk barang ini — tidak menambah yang baru.`);
  }

  console.log("");
  console.log(`URL form publik : /inventory/${itemId}/borrow`);
  console.log(`Halaman daftar  : /inventory  (cari "UJI COBA")`);
  console.log(`Konsol Logistik : /console/inventory  ->  section "Pengajuan Peminjaman"`);
  console.log("");
  console.log("Skenario yang bisa dicoba:");
  console.log(`  1. Form: isi Jumlah > ${STOCK}  -> muncul error merah, tombol Selanjutnya mati`);
  console.log("  2. Form: kirim pengajuan (jalur eksternal, unggah gambar apa saja sebagai Pernyataan)");
  console.log("  3. Konsol: Setujui pengajuan  -> stok berkurang");
  console.log("  4. Konsol: Serahkan Barang -> Tandai Dikembalikan  -> stok balik");
  console.log(`  5. Setujui terus sampai stok 0 -> buka form lagi -> muncul panel "Stok sedang habis"`);
  console.log("");
  console.log("Selesai menguji: npx tsx --env-file=.env src/db/seed-inventory-uat.ts --remove");
}

const main = process.argv.includes("--remove") ? remove : seed;
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
