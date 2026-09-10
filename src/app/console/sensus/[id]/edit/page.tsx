import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { sensusProfiles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { updateSensusProfile } from "@/app/actions/sensus";
import {
  DEGREE_OPTIONS,
  FUNDING_OPTIONS,
  GENDER_OPTIONS,
  MANDARIN_ABILITY_OPTIONS,
  MEDIUM_OF_INSTRUCTION_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from "@/lib/sensus-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { TextField, SelectField, TextAreaField, CheckboxField, primaryBtn } from "@/components/console/form";
import { ProofView } from "@/components/console/proof-view";
import { SubmitButton } from "@/components/console/submit-button";

// Form ubah data sensus oleh pengurus (modul "sensus"). Perubahan dicatat ke
// audit_logs oleh updateSensusProfile(). Berkas kartu tidak diedit sebagai
// teks — hanya bisa dikosongkan lewat kotak centang.

const opts = (values: string[]) => values.map((x) => ({ value: x, label: x }));

export default async function EditSensusPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("sensus");
  const { id } = await params;

  const [row] = await db
    .select({ s: sensusProfiles, userName: users.name, userEmail: users.email })
    .from(sensusProfiles)
    .leftJoin(users, eq(sensusProfiles.userId, users.id))
    .where(eq(sensusProfiles.id, id))
    .limit(1);
  if (!row) notFound();
  const { s } = row;
  const who = s.fullName || row.userName || row.userEmail || "Tanpa nama";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <Link href={`/console/sensus/${id}`} className="text-label-caps text-secondary uppercase hover:text-on-background">
        &larr; Kembali
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mt-2 mb-1">Ubah Sensus — {who}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Boleh disimpan meski belum lengkap. Status kelengkapan dihitung ulang otomatis. Semua perubahan tercatat.
      </p>

      <form action={updateSensusProfile} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="currentStudentCardUrl" value={s.studentCardUrl ?? ""} />

        <CollapsibleSection title="Biodata">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <TextField name="fullName" label="Nama Lengkap" defaultValue={s.fullName} />
            <TextField name="mandarinName" label="Nama Mandarin" defaultValue={s.mandarinName} />
            <TextField name="passportNumber" label="Nomor Paspor" defaultValue={s.passportNumber} />
            <SelectField name="gender" label="Jenis Kelamin" defaultValue={s.gender ?? ""} options={[{ value: "", label: "—" }, ...opts(GENDER_OPTIONS)]} />
            <TextField name="passportExpiry" label="Berlaku Paspor s/d" type="date" defaultValue={s.passportExpiry} />
            <TextField name="province" label="Asal Provinsi" defaultValue={s.province} />
            <TextField name="birthDate" label="Tanggal Lahir" type="date" defaultValue={s.birthDate} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Data Mahasiswa">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <TextField name="branch" label="Asal Cabang" defaultValue={s.branch} />
            <SelectField name="studentStatus" label="Status Mahasiswa" defaultValue={s.studentStatus ?? ""} options={[{ value: "", label: "—" }, ...opts(STUDENT_STATUS_OPTIONS)]} />
            <TextField name="university" label="Nama Universitas" defaultValue={s.university} />
            <SelectField name="degreeLevel" label="Jenjang Pendidikan" defaultValue={s.degreeLevel ?? ""} options={[{ value: "", label: "—" }, ...opts(DEGREE_OPTIONS)]} />
            <TextField name="major" label="Jurusan" defaultValue={s.major} />
            <SelectField name="mediumOfInstruction" label="Bahasa Pengantar" defaultValue={s.mediumOfInstruction ?? ""} options={[{ value: "", label: "—" }, ...opts(MEDIUM_OF_INSTRUCTION_OPTIONS)]} />
            <SelectField name="mandarinAbility" label="Kemampuan Mandarin" defaultValue={s.mandarinAbility ?? ""} options={[{ value: "", label: "—" }, ...opts(MANDARIN_ABILITY_OPTIONS)]} />
            <SelectField name="fundingSource" label="Sumber Pembiayaan" defaultValue={s.fundingSource ?? ""} options={[{ value: "", label: "—" }, ...opts(FUNDING_OPTIONS)]} />
            <TextField name="entryYear" label="Tahun Masuk" type="number" defaultValue={s.entryYear} />
            <TextField name="graduationYear" label="Perkiraan Tahun Kelulusan" type="number" defaultValue={s.graduationYear} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Kontak">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <TextField name="activeEmail" label="Email Aktif" type="email" defaultValue={s.activeEmail} />
            <TextField name="wechatId" label="WeChat ID" defaultValue={s.wechatId} />
            <TextField name="phoneActive" label="Nomor Telepon Aktif (+86)" defaultValue={s.phoneActive} />
            <TextField name="whatsappNumber" label="Nomor WhatsApp" defaultValue={s.whatsappNumber} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Penanganan Darurat">
          <div className="grid grid-cols-1 gap-4 pt-2">
            <TextAreaField name="emergencyContact" label="Kontak Darurat" defaultValue={s.emergencyContact} rows={2} />
            <TextAreaField name="chinaAddress" label="Alamat di Tiongkok" defaultValue={s.chinaAddress} rows={2} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Dokumen & Persetujuan">
          <div className="flex flex-col gap-4 pt-2">
            <div>
              <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-1">Kartu Tanda Mahasiswa / LOA</p>
              <ProofView url={s.studentCardUrl} label={`Bukti mahasiswa — ${who}`} />
            </div>
            {s.studentCardUrl && (
              <CheckboxField name="clearStudentCard" label="Hapus berkas kartu ini (minta anggota unggah ulang lewat /sensus)" />
            )}
            <CheckboxField name="agreeTerms" label="Setuju Syarat & Ketentuan" defaultChecked={s.agreeTerms} />
            <CheckboxField name="subscribeNewsletter" label="Berlangganan Newsletter" defaultChecked={s.subscribeNewsletter} />
          </div>
        </CollapsibleSection>

        <div className="flex items-center gap-3">
          <SubmitButton successMessage="Sensus tersimpan." className={primaryBtn}>Simpan Perubahan</SubmitButton>
          <Link href={`/console/sensus/${id}`} className="text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
