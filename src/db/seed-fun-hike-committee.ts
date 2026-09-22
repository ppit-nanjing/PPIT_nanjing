/**
 * Menugaskan struktur kepanitiaan "Fun Hike with PINYX" (`fun-hike-pinyx-2026`)
 * sesuai SK resmi (065/A/SK/PPITNJ/IX/2026, 22 Sep 2026):
 *
 *   Badan Pengurus Harian
 *     Ketua Pelaksana        - Dustin Wijaya
 *     Sekretaris - Bendahara - Gladys Eunice
 *   Divisi Umum
 *     Divisi Acara             - Bintang Aura, Cleosa Manuella
 *     Divisi Media dan Publikasi - Ferdick Kie, Juan Valentinus
 *
 * Jalankan: npx tsx --env-file=.env src/db/seed-fun-hike-committee.ts
 *
 * IDEMPOTEN — eventDivisions di-upsert lewat (eventId, name, parentDivisionId)
 * [pola sama dengan seed-wif-2026.ts], event_committee lewat (eventId, userId)
 * [unique index bawaan tabel], event_credits lewat (eventId, displayName).
 *
 * BPH (Ketua Pelaksana, Sekretaris-Bendahara) ditugaskan TANPA divisi - peran
 * mereka berdiri sendiri, sama seperti pola WIF 2026. "Divisi Umum" adalah
 * payung TANPA anggota langsung (SK tidak menaruh siapa pun di situ, hanya di
 * dua sub-divisinya) - tetap dibuat sebagai baris supaya hierarkinya utuh
 * kalau nanti ditambah anggota langsung.
 *
 * event_committee (akses konsol acara ini) HANYA untuk yang akunnya sudah
 * ditemukan & dicocokkan lewat nama panjang - lihat MEMBERS di bawah. Bintang
 * Aura BELUM ditugaskan ke sini: kandidat akun terdekat ("Bintangapf") cuma
 * cocok di nama depan, bukan nama panjangnya (dikonfirmasi user 2026-09-21
 * bukan dia), jadi tidak cukup yakin untuk dikasih akses konsol. Dia tetap
 * masuk event_credits (kredit publik, tidak perlu akun) di bawah divisi Acara
 * yang benar, supaya tetap tercatat sebagai panitia sampai akunnya
 * dikonfirmasi.
 *
 * `role: "sekretaris"` untuk Gladys + catatan "Sekretaris - Bendahara" di
 * `note`: enum event_committee_role tidak punya peran gabungan
 * Sekretaris-Bendahara (sekretaris & bendahara terpisah), jadi perannya
 * dipilih salah satu dan cakupan gandanya (sesuai SK) dicatat di note bebas.
 */
import { eq, and, isNull } from "drizzle-orm";
import { db } from "./index";
import { events, eventCommittee, eventCredits, eventDivisions } from "./schema";

const SLUG = "fun-hike-pinyx-2026";

// BPH - tanpa divisi.
const BPH: { userId: string; displayName: string; role: (typeof eventCommittee.role.enumValues)[number]; note?: string; roleLabel: string }[] = [
  {
    userId: "a85837a7-1ac7-4274-95b0-dd95c8773eeb", // akun "Dustinwijaya2" <dustinwijaya2@gmail.com>
    displayName: "Dustin Wijaya",
    role: "ketua",
    roleLabel: "Ketua Pelaksana",
  },
  {
    userId: "abbb656c-1187-4e5c-b59c-4e6d5aa3865a", // akun "Gladys Eunice Gwendolyn" <gladys.eunice.gwendolyn@gmail.com>
    displayName: "Gladys Eunice",
    role: "sekretaris",
    note: "Sekretaris - Bendahara (sesuai SK 065/A/SK/PPITNJ/IX/2026)",
    roleLabel: "Sekretaris - Bendahara",
  },
];

// Struktur Divisi Umum -> dua sub-divisi, sesuai SK.
const STRUCTURE: {
  name: string;
  children: {
    name: string;
    members: { userId: string | null; displayName: string; role: (typeof eventCommittee.role.enumValues)[number] }[];
  }[];
}[] = [
  {
    name: "Divisi Umum",
    children: [
      {
        name: "Divisi Acara",
        members: [
          // Kandidat akun terdekat ("Bintangapf") tidak cukup yakin - lihat
          // catatan di atas berkas ini. null = kredit publik saja, tanpa akses.
          { userId: null, displayName: "Bintang Aura", role: "acara" },
          { userId: "eefaa3c2-cdf6-4b58-8da8-72949f550bfd", displayName: "Cleosa Manuella", role: "acara" }, // akun "Manuellacleosa"
        ],
      },
      {
        name: "Divisi Media dan Publikasi",
        members: [
          { userId: "5911d486-eb4d-4f4f-bc61-00de8eeca413", displayName: "Ferdick Kie", role: "dokumentasi" }, // akun "Ferdick Kie"
          { userId: "1cbeff84-154c-4847-956f-24e12c4236f5", displayName: "Juan Valentinus", role: "dokumentasi" }, // akun "Juan Valentinus"
        ],
      },
    ],
  },
];

async function upsertDivision(eventId: string, name: string, parentDivisionId: string | null, orderIndex: number): Promise<string> {
  const [found] = await db
    .select({ id: eventDivisions.id })
    .from(eventDivisions)
    .where(
      and(
        eq(eventDivisions.eventId, eventId),
        eq(eventDivisions.name, name),
        parentDivisionId ? eq(eventDivisions.parentDivisionId, parentDivisionId) : isNull(eventDivisions.parentDivisionId)
      )
    );
  if (found) {
    await db.update(eventDivisions).set({ orderIndex }).where(eq(eventDivisions.id, found.id));
    return found.id;
  }
  const [created] = await db
    .insert(eventDivisions)
    .values({ eventId, parentDivisionId, name, orderIndex })
    .returning({ id: eventDivisions.id });
  return created.id;
}

async function main() {
  const [event] = await db.select().from(events).where(eq(events.slug, SLUG));
  if (!event) throw new Error(`Acara dengan slug "${SLUG}" tidak ditemukan - jalankan seed-fun-hike-2026.ts dulu.`);

  let committeeBaru = 0;
  async function upsertCommittee(userId: string, role: (typeof eventCommittee.role.enumValues)[number], divisionId: string | null, note?: string) {
    const [found] = await db
      .select({ id: eventCommittee.id })
      .from(eventCommittee)
      .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, userId)));
    if (found) {
      await db.update(eventCommittee).set({ role, divisionId, note: note ?? null }).where(eq(eventCommittee.id, found.id));
    } else {
      await db.insert(eventCommittee).values({ eventId: event.id, userId, role, divisionId, note: note ?? null });
      committeeBaru++;
    }
  }

  for (const m of BPH) await upsertCommittee(m.userId, m.role, null, m.note);

  // event_credits (kredit publik - tampil di halaman acara publik pasca-acara,
  // tidak terkait akses) untuk SEMUA orang di SK, termasuk yang belum punya
  // akun.
  const allCredits: { displayName: string; roleLabel: string; userId: string | null }[] = BPH.map((m) => ({
    displayName: m.displayName,
    roleLabel: m.roleLabel,
    userId: m.userId,
  }));

  let divisiBaru = 0;
  let creditNoBintang = 0;
  for (const [i, dept] of STRUCTURE.entries()) {
    const deptId = await upsertDivision(event.id, dept.name, null, i);
    for (const [j, sub] of dept.children.entries()) {
      const subId = await upsertDivision(event.id, sub.name, deptId, j);
      for (const member of sub.members) {
        if (member.userId) {
          await upsertCommittee(member.userId, member.role, subId);
        } else {
          creditNoBintang++;
        }
        allCredits.push({ displayName: member.displayName, roleLabel: sub.name, userId: member.userId });
      }
    }
  }
  console.log(`event_divisions: struktur Divisi Umum -> Acara / Media & Publikasi disamakan.`);
  console.log(`event_committee: ${committeeBaru} dibuat/ditugaskan (${creditNoBintang} orang tanpa akun dilewati - lihat catatan di atas berkas).`);

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
  console.log(`  - ${BPH[0].displayName} (${BPH[0].roleLabel})`);
  console.log(`  - ${BPH[1].displayName} (${BPH[1].roleLabel})`);
  console.log("  - Cleosa Manuella (Divisi Acara)");
  console.log("  - Ferdick Kie (Divisi Media dan Publikasi)");
  console.log("  - Juan Valentinus (Divisi Media dan Publikasi)");
  console.log("");
  console.log("Kredit publik SAJA, belum ada akses konsol (akun belum dikonfirmasi):");
  console.log("  - Bintang Aura (Divisi Acara)");
  console.log("");
  console.log("Begitu akun Bintang Aura dikonfirmasi, tambahkan userId-nya ke STRUCTURE lalu jalankan lagi skrip ini.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
