/**
 * Menugaskan BPH panitia "Fun Hike with PINYX" (`fun-hike-pinyx-2026`).
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-fun-hike-committee.ts
 *
 * IDEMPOTEN — event_committee di-upsert lewat (eventId, userId) [unique index
 * bawaan tabel], event_credits di-upsert lewat (eventId, displayName).
 *
 * Struktur BPH flat (bukan Departemen → sub-tim seperti WIF): peran langsung
 * dari eventCommitteeRoleEnum tanpa eventDivisions, karena cuma ada
 * Ketua/Sekben/Anggota/Dokumentasi, tidak ada sub-tim berjenjang.
 *
 * event_committee (akses konsol acara ini) HANYA untuk yang akunnya sudah
 * ditemukan & dicocokkan lewat nama panjang - lihat MEMBERS di bawah. Bintang
 * Aura BELUM ditugaskan ke sini: kandidat akun terdekat ("Bintangapf") cuma
 * cocok di nama depan, bukan nama panjangnya, jadi tidak cukup yakin untuk
 * dikasih akses konsol. Dia tetap masuk event_credits (kredit publik, tidak
 * perlu akun) supaya tetap tercatat sebagai panitia sampai akunnya
 * dikonfirmasi.
 *
 * `role: "sekretaris"` untuk Gladys + catatan "Sekben" di `note`: enum
 * event_committee_role tidak punya peran gabungan Sekretaris-Bendahara
 * (sekretaris & bendahara terpisah), jadi perannya dipilih salah satu dan
 * cakupan gandanya dicatat di note bebas.
 */
import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { events, eventCommittee, eventCredits } from "./schema";

const SLUG = "fun-hike-pinyx-2026";

const MEMBERS: { userId: string; displayName: string; role: (typeof eventCommittee.role.enumValues)[number]; note?: string; roleLabel: string }[] = [
  {
    userId: "a85837a7-1ac7-4274-95b0-dd95c8773eeb", // akun "Dustinwijaya2" <dustinwijaya2@gmail.com>
    displayName: "Dustin Wijaya",
    role: "ketua",
    roleLabel: "Ketua",
  },
  {
    userId: "abbb656c-1187-4e5c-b59c-4e6d5aa3865a", // akun "Gladys Eunice Gwendolyn" <gladys.eunice.gwendolyn@gmail.com>
    displayName: "Gladys Eunice",
    role: "sekretaris",
    note: "Sekben — merangkap Bendahara",
    roleLabel: "Sekretaris & Bendahara (Sekben)",
  },
  {
    userId: "eefaa3c2-cdf6-4b58-8da8-72949f550bfd", // akun "Manuellacleosa" <manuellacleosa@gmail.com>
    displayName: "Cleosa Manuella",
    role: "anggota",
    roleLabel: "Anggota",
  },
  {
    userId: "5911d486-eb4d-4f4f-bc61-00de8eeca413", // akun "Ferdick Kie" <ferdickkie0606@gmail.com>
    displayName: "Ferdick Kie",
    role: "dokumentasi",
    roleLabel: "Dokumentasi",
  },
  {
    userId: "1cbeff84-154c-4847-956f-24e12c4236f5", // akun "Juan Valentinus" <juanvalentinusset@gmail.com>
    displayName: "Juan Valentinus",
    role: "dokumentasi",
    roleLabel: "Dokumentasi",
  },
];

// Belum ada akun yang cukup yakin dicocokkan - kredit publik saja dulu.
const CREDIT_ONLY: { displayName: string; roleLabel: string }[] = [{ displayName: "Bintang Aura", roleLabel: "Anggota" }];

async function main() {
  const [event] = await db.select().from(events).where(eq(events.slug, SLUG));
  if (!event) throw new Error(`Acara dengan slug "${SLUG}" tidak ditemukan - jalankan seed-fun-hike-2026.ts dulu.`);

  let committeeBaru = 0;
  for (const m of MEMBERS) {
    const [found] = await db
      .select({ id: eventCommittee.id })
      .from(eventCommittee)
      .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, m.userId)));
    if (found) {
      await db.update(eventCommittee).set({ role: m.role, note: m.note ?? null }).where(eq(eventCommittee.id, found.id));
    } else {
      await db.insert(eventCommittee).values({ eventId: event.id, userId: m.userId, role: m.role, note: m.note ?? null });
      committeeBaru++;
    }
  }
  console.log(`event_committee: ${committeeBaru} dibuat, ${MEMBERS.length - committeeBaru} diperbarui.`);

  const allCredits = [...MEMBERS.map((m) => ({ displayName: m.displayName, roleLabel: m.roleLabel, userId: m.userId as string | null })), ...CREDIT_ONLY.map((c) => ({ ...c, userId: null as string | null }))];

  let creditBaru = 0;
  for (const [i, c] of allCredits.entries()) {
    const [found] = await db
      .select({ id: eventCredits.id })
      .from(eventCredits)
      .where(and(eq(eventCredits.eventId, event.id), eq(eventCredits.displayName, c.displayName)));
    if (found) {
      await db.update(eventCredits).set({ roleLabel: c.roleLabel, userId: c.userId, orderIndex: i }).where(eq(eventCredits.id, found.id));
    } else {
      await db.insert(eventCredits).values({ eventId: event.id, displayName: c.displayName, roleLabel: c.roleLabel, userId: c.userId, orderIndex: i });
      creditBaru++;
    }
  }
  console.log(`event_credits: ${creditBaru} dibuat, ${allCredits.length - creditBaru} diperbarui.`);

  console.log("");
  console.log("Panitia dengan akses konsol acara ini (event_committee):");
  for (const m of MEMBERS) console.log(`  - ${m.displayName} (${m.roleLabel})`);
  console.log("");
  console.log("Kredit publik SAJA, belum ada akses konsol (akun belum dikonfirmasi):");
  for (const c of CREDIT_ONLY) console.log(`  - ${c.displayName} (${c.roleLabel})`);
  console.log("");
  console.log("Begitu akun Bintang Aura dikonfirmasi, jalankan lagi skrip ini setelah menambah userId-nya ke MEMBERS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
