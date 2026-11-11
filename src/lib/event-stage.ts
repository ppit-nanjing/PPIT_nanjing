import { committeeLockAt, eventApprovalState, isCommitteeLocked } from "@/lib/event-capabilities";
import type { EventStatusTone } from "@/components/console/event-status-mark";

// Tahap hidup acara untuk tampilan konsol. Berbeda dari events.status: acara berstatus
// "published" yang tanggalnya sudah lewat tetap "pasca", dan "berlangsung" hanya bisa
// dihitung dari tanggal. Aturan "sudah lewat" sama dengan isCommitteeLocked().

export type EventStage = "persiapan" | "tayang" | "berlangsung" | "pasca" | "terkunci" | "dibatalkan";

type EventTiming = {
  status: string;
  startAt: Date | string | null;
  endAt: Date | string | null;
};

type EventApproval = {
  status: string;
  approvedAt: Date | string | null;
  approvalRequestedAt: Date | string | null;
};

type EventSchedule = EventTiming &
  EventApproval & {
    scheduledPublishAt: Date | string | null;
    registrationDeadline: Date | string | null;
  };

const TIME_ZONE = "Asia/Shanghai";

export function eventStage(ev: EventTiming, now: Date = new Date()): EventStage {
  if (ev.status === "cancelled") return "dibatalkan";
  if (ev.status === "draft" || ev.status === "scheduled") return "persiapan";
  const end = ev.endAt ?? ev.startAt;
  if (ev.status === "completed" || (end != null && new Date(end) < now)) {
    return isCommitteeLocked(ev, now) ? "terkunci" : "pasca";
  }
  if (ev.startAt != null && new Date(ev.startAt) <= now) return "berlangsung";
  return "tayang";
}

export function eventStatusChip(ev: EventApproval, stage: EventStage): { label: string; tone: EventStatusTone } {
  switch (stage) {
    case "dibatalkan":
      return { label: "Dibatalkan", tone: "alarm" };
    case "persiapan": {
      if (ev.status === "scheduled") return { label: "Terjadwal", tone: "gold" };
      const approval = eventApprovalState(ev);
      if (approval === "diajukan") return { label: "Menunggu Persetujuan", tone: "gold" };
      return approval === "disetujui" ? { label: "Draf · Disetujui", tone: "jade" } : { label: "Draf", tone: "neutral" };
    }
    case "berlangsung":
      return { label: "Berlangsung", tone: "gold" };
    case "tayang":
      return ev.status === "registration_closed"
        ? { label: "Pendaftaran Ditutup", tone: "neutral" }
        : { label: "Dipublikasikan", tone: "jade" };
    default:
      return { label: "Selesai", tone: "neutral" };
  }
}

/** Langkah berikutnya bagi acara yang masih disiapkan. */
export function eventPreparationNote(ev: EventApproval & { scheduledPublishAt: Date | string | null }): string {
  const approval = eventApprovalState(ev);
  if (approval === "belum") return "Belum diajukan ke BPH";
  if (approval === "diajukan") return "Menunggu persetujuan BPH";
  return ev.scheduledPublishAt ? `Rilis ${eventDayLabel(ev.scheduledPublishAt)}` : "Rilis belum dijadwalkan";
}

export function eventDayLabel(date: Date | string, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: style,
    year: "numeric",
  }).format(new Date(date));
}

/** Tanggal dan bulan terpisah, untuk plat tanggal acara yang belum punya sampul. */
export function eventDatePlate(date: Date | string): { day: string; month: string } {
  const parts = new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, day: "numeric", month: "short" }).formatToParts(new Date(date));
  return {
    day: parts.find((p) => p.type === "day")?.value ?? "",
    month: parts.find((p) => p.type === "month")?.value ?? "",
  };
}

/** Jam di Tiongkok, atau null bila acaranya tidak mencantumkan jam (tersimpan 00.00). */
export function eventTimeLabel(date: Date | string): string | null {
  const label = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));
  return label === "00.00" ? null : label;
}

function chinaDayNumber(date: Date): number {
  return Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date)) / 86_400_000;
}

/** "Hari ini", "Besok", "9 hari lagi", dihitung per hari kalender di Tiongkok. */
export function eventCountdownLabel(start: Date | string, now: Date = new Date()): string | null {
  const days = chinaDayNumber(new Date(start)) - chinaDayNumber(now);
  if (days < 0) return null;
  if (days === 0) return "Hari ini";
  return days === 1 ? "Besok" : `${days} hari lagi`;
}

export type EventLifecycleStep = {
  stage: EventStage;
  label: string;
  note: string | null;
  state: "done" | "current" | "next";
};

const LIFECYCLE_ORDER: EventStage[] = ["persiapan", "tayang", "berlangsung", "pasca", "terkunci"];

const LIFECYCLE_LABEL: Partial<Record<EventStage, string>> = {
  persiapan: "Persiapan",
  tayang: "Tayang",
  berlangsung: "Berlangsung",
  pasca: "Pasca-Acara",
  terkunci: "Terkunci",
};

/** Lima tahap acara beserta tanggalnya. Kosong untuk acara yang dibatalkan. */
export function eventLifecycle(ev: EventSchedule, now: Date = new Date()): EventLifecycleStep[] {
  const stage = eventStage(ev, now);
  if (stage === "dibatalkan") return [];

  const end = ev.endAt ?? ev.startAt;
  const lock = end ? committeeLockAt(ev) : null;
  const notes: Partial<Record<EventStage, string | null>> = {
    persiapan:
      stage === "persiapan"
        ? eventPreparationNote(ev)
        : ev.scheduledPublishAt
          ? `Rilis ${eventDayLabel(ev.scheduledPublishAt)}`
          : null,
    tayang: ev.registrationDeadline ? `Daftar s.d. ${eventDayLabel(ev.registrationDeadline)}` : null,
    berlangsung: ev.startAt ? eventDayLabel(ev.startAt) : "Tanggal belum diisi",
    pasca: end ? `Sejak ${eventDayLabel(end)}` : null,
    terkunci: lock ? eventDayLabel(lock) : null,
  };

  const currentIndex = LIFECYCLE_ORDER.indexOf(stage);
  return LIFECYCLE_ORDER.map((step, index) => ({
    stage: step,
    label: LIFECYCLE_LABEL[step] ?? step,
    note: notes[step] ?? null,
    state: index < currentIndex ? "done" : index === currentIndex ? "current" : "next",
  }));
}
