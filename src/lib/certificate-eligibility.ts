// Syarat status pendaftaran untuk sertifikat PESERTA, satu sumber untuk server
// (certificate-issuing.ts) dan tampilan konsol. Syarat kedua (sudah mengisi
// evaluasi dengan akun) dicek terpisah di tempat masing-masing.
//
// requiresAttendance = events.certificate_requires_attendance:
//  - true  (bawaan)   hanya status "attended" (QR sudah di-scan);
//  - false (tanpa QR) status "confirmed" atau "attended".

export type CertificateRegistrationStatus = "confirmed" | "attended";

export function participantCertificateStatuses(requiresAttendance: boolean): CertificateRegistrationStatus[] {
  return requiresAttendance ? ["attended"] : ["confirmed", "attended"];
}

export function qualifiesForParticipantCertificate(status: string, requiresAttendance: boolean): boolean {
  return (participantCertificateStatuses(requiresAttendance) as string[]).includes(status);
}
