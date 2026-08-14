/**
 * Seeds roles + department structure exactly as defined in the 2026/2027 recruitment
 * guidebook ("GUIDEBOOK OPREC_PPIT NANJING 2627.pdf" - Struktur PPIT Nanjing, p.11-12).
 * Run with: npx tsx src/db/seed.ts
 */
import { db } from "./index";
import { roles, departments } from "./schema";

async function main() {
  // ---------- Roles (access tiers per the admin-access rule) ----------
  const [ketuaUmum] = await db
    .insert(roles)
    .values({ name: "Ketua Umum", accessTier: "full", description: "Memimpin seluruh arah kebijakan strategis kabinet" })
    .returning();
  const [wakilKetua] = await db
    .insert(roles)
    .values({ name: "Wakil Ketua", accessTier: "full", description: "Mendampingi Ketua Umum, koordinasi departemen" })
    .returning();
  const [sekretarisBph] = await db
    .insert(roles)
    .values({ name: "Sekretaris (BPH)", accessTier: "full", description: "Tata kelola administrasi, kearsipan, komunikasi internal" })
    .returning();
  const [bendahara] = await db
    .insert(roles)
    .values({ name: "Bendahara", accessTier: "full", description: "Perencanaan anggaran, arus kas, akuntabilitas keuangan" })
    .returning();
  const [koordinator] = await db
    .insert(roles)
    .values({ name: "Koordinator Divisi", accessTier: "full", description: "Memimpin perencanaan teknis divisi" })
    .returning();
  const [anggota] = await db
    .insert(roles)
    .values({ name: "Anggota Divisi", accessTier: "scoped", description: "Mengeksekusi tugas teknis divisi" })
    .returning();
  const [dewanPembina] = await db
    .insert(roles)
    .values({ name: "Dewan Pembina", accessTier: "advisory", description: "Mengayomi dan mengarahkan organisasi" })
    .returning();

  void wakilKetua;
  void sekretarisBph;
  void bendahara;
  void dewanPembina;
  void ketuaUmum;
  void koordinator;
  void anggota;

  // ---------- Departments (BPH + 3 Departemen > 9 Divisi) ----------
  const [bph] = await db
    .insert(departments)
    .values({ name: "Badan Pengurus Harian", orderIndex: 0, description: "Ketua Umum, Wakil Ketua, Sekretaris, Bendahara" })
    .returning();

  const [deptProgramAcara] = await db
    .insert(departments)
    .values({
      name: "Departemen Program & Acara",
      orderIndex: 1,
      description: "Membuat program dan acara menarik dan bermanfaat untuk mahasiswa Indonesia di Nanjing dan kota sekitarnya.",
    })
    .returning();
  const [deptKomunikasiMedia] = await db
    .insert(departments)
    .values({
      name: "Departemen Komunikasi & Media",
      orderIndex: 2,
      description: "Memperkuat kehadiran digital organisasi melalui pengelolaan konten strategis di berbagai platform media sosial.",
    })
    .returning();
  const [deptSumberDaya] = await db
    .insert(departments)
    .values({
      name: "Departemen Sumber Daya & Pengembangan",
      orderIndex: 3,
      description: "Fungsionaris dalam kabinet maupun kepanitiaan untuk berbagai keperluan.",
    })
    .returning();

  // Program & Acara divisions -> scoped to the public Events admin module
  await db.insert(departments).values([
    {
      name: "Divisi Akademia",
      parentDepartmentId: deptProgramAcara.id,
      orderIndex: 0,
      adminModuleScope: ["events"],
      description: "Program kerja akademik: kelas HSK, seminar beasiswa, pendaftaran S1.",
    },
    {
      name: "Divisi Kultura",
      parentDepartmentId: deptProgramAcara.id,
      orderIndex: 1,
      adminModuleScope: ["events", "gallery"],
      description: "Program seni, budaya, dan pariwisata.",
    },
    {
      name: "Divisi Pemberdayaan Sosial",
      parentDepartmentId: deptProgramAcara.id,
      orderIndex: 2,
      adminModuleScope: ["events"],
      description: "Pelayanan sosial dan keolahragaan (Youth and Sport).",
    },
  ]);

  // Komunikasi & Media divisions -> Humas explicitly owns Sensus per the guidebook
  // ("Mengkoordinasikan pelaksanaan sensus dan pemutakhiran data mahasiswa").
  await db.insert(departments).values([
    {
      name: "Divisi Hubungan Masyarakat",
      parentDepartmentId: deptKomunikasiMedia.id,
      orderIndex: 0,
      adminModuleScope: ["sensus", "content"],
      description: "Kehumasan, publikasi media sosial, koordinasi sensus & pemutakhiran data mahasiswa.",
    },
    {
      name: "Divisi Desain",
      parentDepartmentId: deptKomunikasiMedia.id,
      orderIndex: 1,
      adminModuleScope: ["content"],
      description: "Aset digital desain untuk keperluan organisasi.",
    },
    {
      name: "Divisi Komunikasi & Konten",
      parentDepartmentId: deptKomunikasiMedia.id,
      orderIndex: 2,
      adminModuleScope: ["content", "gallery"],
      description: "Pengelolaan data/arsip digital, produksi konten foto/video.",
    },
  ]);

  // Sumber Daya & Pengembangan divisions -> Divisi Teknologi gets full access (they build the site).
  await db.insert(departments).values([
    {
      name: "Divisi Teknologi",
      parentDepartmentId: deptSumberDaya.id,
      orderIndex: 0,
      grantsFullAdminAccess: true,
      description: "Merintis & memelihara website resmi PPIT Nanjing, pengelolaan basis data internal.",
    },
    {
      name: "Divisi Usaha Dana",
      parentDepartmentId: deptSumberDaya.id,
      orderIndex: 1,
      adminModuleScope: ["reports"],
      description: "Pendanaan dan kemitraan/sponsorship.",
    },
    {
      name: "Divisi Logistik",
      parentDepartmentId: deptSumberDaya.id,
      orderIndex: 2,
      adminModuleScope: ["inventory"],
      description: "Pengelolaan aset, peminjaman, dan pemeliharaan barang PPIT Nanjing.",
    },
  ]);

  console.log("Seed complete:", {
    bph: bph.id,
    deptProgramAcara: deptProgramAcara.id,
    deptKomunikasiMedia: deptKomunikasiMedia.id,
    deptSumberDaya: deptSumberDaya.id,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
