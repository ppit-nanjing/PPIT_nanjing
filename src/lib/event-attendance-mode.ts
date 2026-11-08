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

/** Label untuk konsol dan ekspor (Indonesia, sama seperti sisa konsol). */
export const ATTENDANCE_MODE_LABEL: Record<AttendanceMode, string> = {
  online: "Online",
  offline: "Offline",
};
