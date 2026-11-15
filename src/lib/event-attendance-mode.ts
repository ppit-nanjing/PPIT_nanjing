// Pilihan hadir online/offline per acara (events.offers_attendance_mode, mis. NYALA).
// Murni dan aman dipakai di klien maupun server.

export const ATTENDANCE_MODES = ["online", "offline"] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];

/** Nilai dari form / database -> mode yang sah, atau null kalau bukan salah satunya. */
export function parseAttendanceMode(value: unknown): AttendanceMode | null {
  return typeof value === "string" && (ATTENDANCE_MODES as readonly string[]).includes(value)
    ? (value as AttendanceMode)
    : null;
}

/**
 * Kategori tarif yang namanya persis "Online" dan "Offline" (mis. NYALA:
 * Offline ¥10, Online ¥0) mengikuti pilihan hadir, supaya peserta tidak memilih
 * online/offline dua kali. Null kalau salah satu mode tidak punya kategori yang cocok.
 */
export function feeOptionsByMode<T extends { label: string }>(options: T[]): Record<AttendanceMode, T> | null {
  const find = (mode: AttendanceMode) => options.find((o) => o.label.trim().toLowerCase() === mode);
  const online = find("online");
  const offline = find("offline");
  return online && offline ? { online, offline } : null;
}

/** Label untuk konsol dan ekspor (Indonesia, sama seperti sisa konsol). */
export const ATTENDANCE_MODE_LABEL: Record<AttendanceMode, string> = {
  online: "Online",
  offline: "Offline",
};
