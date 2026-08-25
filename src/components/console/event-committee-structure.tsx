import { Users, Plus, Trash2, Award, AlertTriangle } from "lucide-react";
import {
  saveEventDivision,
  deleteEventDivision,
  issueDivisionCertificates,
  issueEventCertificates,
  assignCommittee,
  assignMembersToDivision,
  removeCommittee,
} from "@/app/actions/committee";
import { DivisionMemberPicker } from "@/components/console/division-member-picker";
import { Field, fieldInput } from "@/components/console/form";

// Peran penugasan baru. humas/acara/logistik/dokumentasi sengaja tidak ada:
// itu nama DIVISI, bukan peran - di skema nilainya tinggal demi baris lama.
const ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "supervisor", "anggota"];

// Alias primitif bersama - struktur form di komponen ini padat & spesifik
// (kartu per divisi), jadi cukup tuker kelasnya, bukan seluruh markahe.
const input = fieldInput;
const label = "text-label-caps uppercase tracking-wide text-on-surface-variant";

export interface DivisionRow {
  id: string;
  parentDivisionId: string | null;
  name: string;
  quota: number | null;
  jobDescription: string | null;
  orderIndex: number;
}

export interface MemberRow {
  id: string;
  divisionId: string | null;
  role: string;
  note: string | null;
  userId: string | null;
  name: string | null;
  email: string | null;
}

/**
 * Struktur kepanitiaan satu acara: Departemen → sub-tim, masing-masing dengan
 * kuota, job description, dan anggotanya.
 *
 * Server component penuh — semua aksinya form server action, tidak ada state
 * klien yang perlu dipegang. Sengaja: halaman ini dipakai sesekali saat menyusun
 * kepanitiaan, bukan layar yang diutak-atik terus-menerus.
 */
export function EventCommitteeStructure({
  eventId,
  divisions,
  members,
  candidates,
  certifiedUserIds,
}: {
  eventId: string;
  divisions: DivisionRow[];
  members: MemberRow[];
  candidates: { id: string; name: string | null; email: string }[];
  // Siapa yang sudah punya sertifikat panitia untuk acara ini. Umpan balik
  // tombol terbit-massal sengaja dibuat permanen begini, bukan pesan sekilas:
  // masih terbaca setelah halaman di-reload, dan langsung terlihat siapa yang
  // terlewat kalau ada yang ditugaskan belakangan.
  certifiedUserIds: string[];
}) {
  const certified = new Set(certifiedUserIds);
  const certifiedCount = members.filter((m) => m.userId && certified.has(m.userId)).length;
  const roots = divisions.filter((d) => !d.parentDivisionId);
  const childrenOf = (id: string) => divisions.filter((d) => d.parentDivisionId === id);
  const membersOf = (id: string) => members.filter((m) => m.divisionId === id);
  const unassigned = members.filter((m) => !m.divisionId);
  // Ketua saat ini per divisi - ditampilkan di header kartu + form "ganti ketua".
  const ketuaOf = (id: string) => membersOf(id).find((m) => m.role === "ketua");

  // Kuota dihitung termasuk sub-tim: "Perlengkapan (2+3+2)" harus terbaca utuh
  // di kartu induknya, bukan cuma orang yang menempel langsung di sana.
  const filledDeep = (id: string): number =>
    membersOf(id).length + childrenOf(id).reduce((sum, c) => sum + filledDeep(c.id), 0);
  const certifiedDeep = (id: string): number =>
    membersOf(id).filter((m) => m.userId && certified.has(m.userId)).length +
    childrenOf(id).reduce((sum, c) => sum + certifiedDeep(c.id), 0);
  const quotaDeep = (id: string): number => {
    const self = divisions.find((d) => d.id === id);
    return (self?.quota ?? 0) + childrenOf(id).reduce((sum, c) => sum + quotaDeep(c.id), 0);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-body-md text-on-surface-variant max-w-xl">
          Susunan panitia acara ini. <strong className="text-on-background">Berbeda dari jabatan struktural</strong> —
          seseorang bisa jadi Ketua Departemen Perlengkapan di acara ini tanpa memegang jabatan apa pun di kabinet.
        </p>
        {members.length > 0 && (
          <form action={issueEventCertificates}>
            <input type="hidden" name="eventId" value={eventId} />
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-3 rounded-md hover:bg-primary transition-colors"
            >
              <Award size={16} /> Terbitkan Sertifikat Semua Panitia ({members.length - certifiedCount})
            </button>
          </form>
        )}
      </div>
      <p className="text-xs text-on-surface-variant -mt-3">
        Setiap peran di kepanitiaan dapat sertifikat, termasuk BPH &amp; Supervisory Committee yang tidak berada di
        divisi mana pun — tombol per-departemen di bawah tidak menjangkau mereka, tombol ini menjangkau.
        Yang sudah punya dilewati, jadi menekannya lagi setelah menambah orang hanya menerbitkan untuk yang baru.
      </p>

      {divisions.length === 0 && (
        <p className="text-body-md text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg p-4">
          Belum ada divisi. Tambahkan departemen dulu di bawah, lalu sub-timnya.
        </p>
      )}

      {roots.map((dept) => {
        const subs = childrenOf(dept.id);
        const filled = filledDeep(dept.id);
        const quota = quotaDeep(dept.id);
        const certCount = certifiedDeep(dept.id);
        return (
          <section key={dept.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h3 className="text-headline-sm text-on-background">{dept.name}</h3>
                <p className="text-label-caps text-on-surface-variant mt-1">
                  <Users size={12} className="inline mr-1" />
                  {filled} orang{quota > 0 && ` dari ${quota}`}
                  {quota > 0 && filled < quota && (
                    <span className="text-error"> · kurang {quota - filled}</span>
                  )}
                  {filled > 0 && (
                    <span className="text-on-surface-variant">
                      {" "}· {certCount} dari {filled} sudah bersertifikat
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={issueDivisionCertificates}>
                  <input type="hidden" name="divisionId" value={dept.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-2 rounded-md hover:bg-surface-container-low transition-colors"
                  >
                    <Award size={14} /> Terbitkan Sertifikat
                  </button>
                </form>
                <form action={deleteEventDivision}>
                  <input type="hidden" name="id" value={dept.id} />
                  <button type="submit" className="text-error hover:opacity-70 p-2" aria-label={`Hapus ${dept.name}`}>
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </div>

            {/* Kuota itu TARGET, bukan batas - penugasan lewat kuota tetap
                lolos, angkanya cuma buat indikator "kurang N". Form ini ada
                supaya targetnya sendiri bisa digeser kapan pun tanpa hapus-ulang
                (hapus divisi memindahkan orang-orangnya ke "Tanpa divisi"). */}
            <details className="mb-1">
              <summary className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background cursor-pointer w-fit">Ubah departemen</summary>
              <form action={saveEventDivision} className="mt-2 bg-surface-container-low border border-outline-variant rounded-lg p-3 flex flex-col gap-2 max-w-xl">
                <input type="hidden" name="id" value={dept.id} />
                <input type="hidden" name="eventId" value={eventId} />
                <input name="name" defaultValue={dept.name} required aria-label="Nama departemen" className={input} />
                <input name="quota" type="number" min="1" defaultValue={dept.quota ?? ""} placeholder="Kuota ketua dept. (orang)" aria-label="Kuota" className={input} />
                <textarea name="jobDescription" defaultValue={dept.jobDescription ?? ""} rows={2} placeholder="Job description (satu poin per baris)" aria-label="Job description" className={`${input} resize-none`} />
                <button type="submit" className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-primary transition-colors">
                  Simpan Perubahan
                </button>
              </form>
            </details>

            {dept.jobDescription && <JobDesc text={dept.jobDescription} />}
            <MemberList rows={membersOf(dept.id)} certified={certified} />

            {/* Ketua departemen: satu dropdown, sekali klik - tanpa lewat form
                umum. Orang yang sudah jadi ketua tidak muncul lagi di pilihan. */}
            <div className="mt-3 flex flex-wrap items-center gap-2 bg-surface-container-low rounded-lg p-3">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                Ketua Dept.: <strong className="text-on-background normal-case">{ketuaOf(dept.id)?.name ?? "belum ada"}</strong>
              </span>
              <form action={assignCommittee} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="divisionId" value={dept.id} />
                <input type="hidden" name="role" value="ketua" />
                <select name="userId" required defaultValue="" className={`${input} w-auto`} aria-label={`Pilih ketua ${dept.name}`}>
                  <option value="" disabled>Ganti / tetapkan ketua…</option>
                  {candidates
                    .filter((c) => c.id !== ketuaOf(dept.id)?.userId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name ?? c.email}</option>
                    ))}
                </select>
                <button type="submit" className="text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors">
                  Tetapkan Ketua
                </button>
              </form>
            </div>

            {/* Anggota: centang banyak orang sekaligus dari daftar yang bisa
                dicari - inilah yang diminta untuk divisi berisi banyak orang. */}
            <details className="mt-2">
              <summary className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary cursor-pointer w-fit">+ Tambah anggota (centang banyak)</summary>
              <DivisionMemberPicker eventId={eventId} divisionId={dept.id} candidates={candidates} action={assignMembersToDivision} />
            </details>

            {subs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {subs.map((sub) => {
                  const subFilled = membersOf(sub.id).length;
                  return (
                    <div key={sub.id} className="bg-surface-container-low rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-body-lg font-semibold text-on-background">{sub.name}</h4>
                          <p className="text-label-caps text-on-surface-variant">
                            {subFilled} orang{sub.quota != null && ` dari ${sub.quota}`}
                            {sub.quota != null && subFilled < sub.quota && (
                              <span className="text-error"> · kurang {sub.quota - subFilled}</span>
                            )}
                          </p>
                        </div>
                        <form action={deleteEventDivision}>
                          <input type="hidden" name="id" value={sub.id} />
                          <button type="submit" className="text-error hover:opacity-70 p-1" aria-label={`Hapus ${sub.name}`}>
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </div>
                      {sub.jobDescription && <JobDesc text={sub.jobDescription} />}
                      <MemberList rows={membersOf(sub.id)} certified={certified} />
                      <details className="mt-2">
                        <summary className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary cursor-pointer w-fit">+ Tambah anggota (centang banyak)</summary>
                        <DivisionMemberPicker eventId={eventId} divisionId={sub.id} candidates={candidates} action={assignMembersToDivision} />
                      </details>
                      <details className="mt-2">
                        <summary className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background cursor-pointer w-fit">Ubah sub-tim</summary>
                        <form action={saveEventDivision} className="mt-2 flex flex-col gap-2">
                          <input type="hidden" name="id" value={sub.id} />
                          <input type="hidden" name="eventId" value={eventId} />
                          <input name="name" defaultValue={sub.name} required aria-label={`Nama ${sub.name}`} className={input} />
                          <input name="quota" type="number" min="1" defaultValue={sub.quota ?? ""} placeholder="Kuota (orang)" aria-label="Kuota" className={input} />
                          <textarea name="jobDescription" defaultValue={sub.jobDescription ?? ""} rows={2} placeholder="Job description (satu poin per baris)" aria-label="Job description" className={`${input} resize-none`} />
                          <button type="submit" className="self-start text-label-caps uppercase tracking-wide border border-outline-variant px-3 py-1.5 rounded-md hover:bg-surface-container-low transition-colors">
                            Simpan
                          </button>
                        </form>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {unassigned.length > 0 && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h3 className="text-headline-sm text-on-background mb-1">Tanpa divisi</h3>
          <p className="text-label-caps text-on-surface-variant mb-3">
            Panitia inti, atau ditugaskan sebelum struktur divisi dibuat.
          </p>
          <MemberList rows={unassigned} certified={certified} />
        </section>
      )}

      {/* --- Formulir --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form
          action={saveEventDivision}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3"
        >
          <h3 className="text-body-lg font-semibold text-on-background flex items-center gap-2">
            <Plus size={16} /> Tambah Divisi
          </h3>
          <input type="hidden" name="eventId" value={eventId} />
          <label className="flex flex-col gap-1">
            <span className={label}>Nama Divisi *</span>
            <input name="name" required placeholder="mis. Perlengkapan / Konsumsi" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Di bawah</span>
            <select name="parentDivisionId" defaultValue="" className={input}>
              <option value="">— Departemen (tingkat atas)</option>
              {roots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Kuota (orang)</span>
            <input name="quota" type="number" min="1" placeholder="mis. 2" className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Job Description</span>
            <textarea
              name="jobDescription"
              rows={3}
              placeholder={"Satu poin per baris, mis.\nMenyiapkan konsumsi saat acara.\nMemastikan jumlah konsumsi mencukupi."}
              className={input}
            />
          </label>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Divisi
          </button>
        </form>

        <form
          action={assignCommittee}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3"
        >
          <h3 className="text-body-lg font-semibold text-on-background flex items-center gap-2">
            <Users size={16} /> Tugaskan Panitia
          </h3>
          <input type="hidden" name="eventId" value={eventId} />
          <label className="flex flex-col gap-1">
            <span className={label}>Orang *</span>
            <select name="userId" required defaultValue="" className={input}>
              <option value="" disabled>
                Pilih anggota
              </option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Divisi</span>
            <select name="divisionId" defaultValue="" className={input}>
              <option value="">— Tanpa divisi (panitia inti)</option>
              {roots.map((d) => (
                <optgroup key={d.id} label={d.name}>
                  <option value={d.id}>{d.name} (langsung)</option>
                  {childrenOf(d.id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Peran di divisi</span>
            <select name="role" defaultValue="anggota" className={input}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-on-surface-variant">
            Peran + nama divisi yang membentuk sebutan lengkapnya — <em>ketua</em> di divisi <em>Perlengkapan</em> =
            Ketua Departemen Perlengkapan.
          </p>
          <label className="flex flex-col gap-1">
            <span className={label}>Catatan</span>
            <input name="note" placeholder="mis. PJ konsumsi hari-H" className={input} />
          </label>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Tugaskan
          </button>
        </form>
      </div>

      <p className="flex items-start gap-2 text-xs text-on-surface-variant">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        Menghapus divisi tidak menghapus panitianya — mereka pindah ke &ldquo;Tanpa divisi&rdquo;, jadi catatan
        kepanitiaan dan sertifikat yang sudah terbit tetap utuh.
      </p>
    </div>
  );
}

function JobDesc({ text }: { text: string }) {
  const items = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 my-3">
      {items.map((item, i) => (
        <li key={i} className="text-body-md text-on-surface-variant flex gap-2">
          <span className="text-primary-container shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function MemberList({ rows, certified }: { rows: MemberRow[]; certified?: Set<string> }) {
  if (rows.length === 0) {
    return <p className="text-label-caps text-on-surface-variant mt-2">Belum ada yang ditugaskan.</p>;
  }
  return (
    <ul className="flex flex-col gap-1 mt-2">
      {rows.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-2 text-body-md">
          <span className="text-on-background">
            {m.name ?? m.email ?? "(tanpa nama)"}
            <span className="text-on-surface-variant"> · {m.role}</span>
            {m.note && <span className="text-on-surface-variant"> · {m.note}</span>}
            {m.userId && certified?.has(m.userId) && (
              <span className="text-primary-container" title="Sertifikat panitia sudah terbit">
                {" · "}
                <Award size={12} className="inline align-[-1px]" aria-hidden /> sertifikat
              </span>
            )}
          </span>
          <form action={removeCommittee}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" className="text-error hover:opacity-70 text-label-caps" aria-label="Lepas">
              Lepas
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
