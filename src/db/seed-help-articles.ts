/**
 * Seeds initial help articles documenting the admin console modules that
 * actually exist, written from what was built (not aspirational). Admins can
 * edit/add more via /console/docs going forward.
 * Run with: npx tsx --env-file=.env src/db/seed-help-articles.ts
 */
import { db } from "./index";
import { helpArticles } from "./schema";

async function main() {
  await db.insert(helpArticles).values([
    {
      section: "Pengguna",
      title: "Mengatur Role dan Divisi Anggota",
      slug: "mengatur-role-dan-divisi-anggota",
      content:
        "Buka Console > Pengguna untuk melihat semua orang yang pernah masuk lewat Google. " +
        "Gunakan dropdown Role dan Divisi di tiap baris untuk menetapkan jabatan - perubahan tersimpan " +
        "otomatis begitu dropdown diubah, tidak perlu tombol Simpan terpisah. Tidak ada form 'Tambah " +
        "Pengguna Baru' karena akun hanya dibuat lewat login Google - assign role/divisi dilakukan setelah " +
        "orang tersebut login minimal sekali.",
    },
    {
      section: "Organisasi",
      title: "Mengelola Struktur Departemen dan Divisi",
      slug: "mengelola-struktur-departemen-dan-divisi",
      content:
        "Console > Organisasi menampilkan struktur BPH dan 3 Departemen beserta Divisi di bawahnya. " +
        "Klik ikon pensil untuk mengubah nama/deskripsi, gunakan tombol panah atas-bawah untuk mengurutkan " +
        "ulang, dan 'Tambah Divisi' untuk menambah divisi baru di bawah suatu departemen. Semua perubahan " +
        "tercatat di halaman Log Audit yang bisa diakses dari halaman ini.",
    },
    {
      section: "Kegiatan",
      title: "Membuat Kegiatan dan Check-in Peserta",
      slug: "membuat-kegiatan-dan-check-in-peserta",
      content:
        "Buat kegiatan baru dari Console > Kegiatan - status awal selalu 'Draf', ubah ke 'Dipublikasikan' " +
        "di halaman edit kegiatan setelah detailnya lengkap agar muncul di halaman publik. Setiap peserta " +
        "yang mendaftar dapat tiket QR unik. Saat hari-H, cari nama peserta di daftar pendaftar dan klik " +
        "'Check-in' untuk menandai kehadiran mereka.",
    },
    {
      section: "Inventaris",
      title: "Menyetujui Peminjaman dan Menambah Barang",
      slug: "menyetujui-peminjaman-dan-menambah-barang",
      content:
        "Pengajuan peminjaman dari anggota muncul di Console > Inventaris dengan status 'Menunggu'. " +
        "Klik Setujui atau Tolak - saat disetujui, stok yang tersedia otomatis berkurang. Setelah barang " +
        "dikembalikan, klik 'Tandai Dikembalikan' untuk mengembalikan stok. Barang baru ditambahkan lewat " +
        "form 'Tambah Barang' di halaman yang sama.",
    },
    {
      section: "Laporan",
      title: "Membaca Ringkasan Sensus dan Ekspor Data",
      slug: "membaca-ringkasan-sensus-dan-ekspor-data",
      content:
        "Console > Laporan menampilkan rekap data sensus (jumlah per universitas, jenjang, dan kota) " +
        "berdasarkan data yang benar-benar sudah diisi anggota lewat halaman Sensus. Tombol 'Ekspor Data " +
        "Mahasiswa' mengunduh CSV berisi nama, email, dan data sensus setiap pengguna terdaftar.",
    },
  ]);
  console.log("Seeded 5 help articles (one per built admin module)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
