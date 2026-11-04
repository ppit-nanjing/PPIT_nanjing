"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, MoreHorizontal, Search } from "lucide-react";
import { setEventStatus } from "@/app/actions/admin-events";
import { ConfirmButton } from "@/components/console/confirm-button";
import { DeleteEventButton } from "@/components/console/delete-event-button";
import { EventCapacityMeter } from "@/components/console/event-capacity-meter";
import { EventStatusMark, type EventStatusTone } from "@/components/console/event-status-mark";

// Daftar kegiatan konsol, sengaja berbentuk seperti /events (acara terdekat besar, kartu
// bersampul, kegiatan lampau abu-abu) ditambah yang hanya perlu panitia: acara yang masih
// disiapkan, kuota, dan aksi per acara. Semua label & tanggal dihitung di server.

export type EventBoardGroup = "datang" | "disiapkan" | "selesai";

export type BoardEvent = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  location: string | null;
  /** Hanya terisi untuk acara terdekat, supaya deskripsi acara lain tidak ikut terkirim. */
  description: string | null;
  group: EventBoardGroup;
  chipLabel: string;
  chipTone: EventStatusTone;
  dayLabel: string | null;
  timeLabel: string | null;
  countdownLabel: string | null;
  scheduledLabel: string | null;
  registered: number;
  attended: number;
  capacity: number | null;
  finalAttendeeCount: number | null;
  isDraft: boolean;
  isPublic: boolean;
  canMoveToDraft: boolean;
  canDelete: boolean;
};

const PAST_PREVIEW = 6;

const FILTERS: { key: "semua" | EventBoardGroup; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "datang", label: "Akan Datang" },
  { key: "disiapkan", label: "Disiapkan" },
  { key: "selesai", label: "Sudah Lewat" },
];

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function seatsLine(event: BoardEvent): string {
  if (event.group === "selesai") {
    return event.finalAttendeeCount != null
      ? `${event.finalAttendeeCount} hadir`
      : `${event.attended} hadir · ${event.registered} terdaftar`;
  }
  if (event.group === "disiapkan") return event.scheduledLabel ?? "Rilis belum dijadwalkan";
  return event.capacity != null ? `${event.registered} / ${event.capacity} terdaftar` : `${event.registered} terdaftar`;
}

function Cover({ event, sizes, muted }: { event: BoardEvent; sizes: string; muted?: boolean }) {
  if (!event.coverImageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-container-high" aria-hidden="true">
        <span className="text-headline-lg text-outline">{event.title.charAt(0)}</span>
      </div>
    );
  }
  return (
    <Image
      src={event.coverImageUrl}
      alt=""
      fill
      sizes={sizes}
      className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none ${
        muted ? "grayscale group-hover:grayscale-0" : ""
      }`}
    />
  );
}

function EventMenu({ event }: { event: BoardEvent }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const showMoveToDraft = event.canMoveToDraft && !event.isDraft;
  if (!event.isPublic && !showMoveToDraft && !event.canDelete) return null;

  const item = "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-body-sm transition-colors";
  const plainItem = `${item} text-on-background hover:bg-surface-container-low`;

  return (
    // z-index hanya saat terbuka: dialog ConfirmButton hidup di dalam menu ini, jadi lapisan menu
    // harus di atas seluruh halaman, dan saat tertutup tidak boleh menimpa menu kartu lain.
    <div ref={rootRef} className={`relative -mr-1.5 -mt-1 shrink-0 ${open ? "z-[60]" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Aksi untuk ${event.title}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background sm:h-9 sm:w-9"
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-outline-variant bg-surface-container-lowest p-1 shadow-[0_14px_40px_rgba(29,27,20,0.12)]">
          {event.isPublic && (
            <a href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer" className={plainItem}>
              <ExternalLink size={14} aria-hidden /> Buka Halaman Publik
            </a>
          )}
          {showMoveToDraft && (
            <ConfirmButton
              title="Jadikan draf?"
              message={`"${event.title}" akan langsung disembunyikan dari publik.`}
              confirmLabel="Ya, jadikan draf"
              action={setEventStatus}
              payload={{ eventId: event.id, status: "draft" }}
              danger={false}
              className={plainItem}
            >
              Jadikan Draf
            </ConfirmButton>
          )}
          {event.canDelete && (
            <DeleteEventButton
              eventId={event.id}
              label="Pindahkan ke Sampah"
              className={`${item} text-error hover:bg-error-container/30`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EventMeta({ event }: { event: BoardEvent }) {
  return (
    <div className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
      <span className="flex items-start gap-1.5">
        <CalendarDays size={14} className="mt-1 shrink-0" aria-hidden />
        <span>
          {event.dayLabel ?? "Belum dijadwalkan"}
          {event.timeLabel && ` · ${event.timeLabel}`}
          {event.countdownLabel && <span className="text-on-background"> · {event.countdownLabel}</span>}
        </span>
      </span>
      {event.location && (
        <span className="flex items-start gap-1.5">
          <MapPin size={14} className="mt-1 shrink-0" aria-hidden />
          <span className="line-clamp-1">{event.location}</span>
        </span>
      )}
    </div>
  );
}

function EventBoardCard({ event }: { event: BoardEvent }) {
  const isPast = event.group === "selesai";
  return (
    <article className="group relative flex rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold sm:flex-col">
      <div className="relative w-24 shrink-0 overflow-hidden rounded-l-lg bg-surface-container-high sm:h-44 sm:w-full sm:rounded-l-none sm:rounded-t-lg">
        <Cover event={event} sizes="(max-width: 640px) 96px, (max-width: 1280px) 50vw, 33vw" muted={isPast} />
        <div className="absolute left-3 top-3 hidden sm:block">
          <EventStatusMark label={event.chipLabel} tone={event.chipTone} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-5">
        <EventStatusMark label={event.chipLabel} tone={event.chipTone} bare className="self-start sm:hidden" />
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-headline-sm text-on-background">
            <Link
              href={`/console/events/${event.id}`}
              className="rounded transition-colors after:absolute after:inset-0 after:rounded-lg group-hover:text-primary-container focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
            >
              {event.title}
            </Link>
          </h3>
          <EventMenu event={event} />
        </div>
        {event.category && <p className="text-body-sm text-on-surface-variant">{event.category}</p>}
        <EventMeta event={event} />
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <p className="text-body-sm tabular-nums text-on-background">{seatsLine(event)}</p>
          {event.group === "datang" && <EventCapacityMeter registered={event.registered} capacity={event.capacity} />}
        </div>
      </div>
    </article>
  );
}

function FeaturedEventCard({ event }: { event: BoardEvent }) {
  const left = event.capacity != null ? Math.max(event.capacity - event.registered, 0) : null;
  return (
    <article className="group relative grid grid-cols-1 rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold lg:grid-cols-12">
      <div className="relative h-56 overflow-hidden rounded-t-lg bg-surface-container-high sm:h-72 lg:col-span-7 lg:h-auto lg:min-h-[22rem] lg:rounded-l-lg lg:rounded-tr-none">
        <Cover event={event} sizes="(max-width: 1024px) 100vw, 55vw" />
        <EventStatusMark label={event.chipLabel} tone={event.chipTone} className="absolute left-4 top-4" />
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-8 lg:col-span-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-headline-md sm:text-headline-lg text-on-background">
              <Link
                href={`/console/events/${event.id}`}
                className="rounded transition-colors after:absolute after:inset-0 after:rounded-lg group-hover:text-primary-container focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
              >
                {event.title}
              </Link>
            </h3>
            <EventMenu event={event} />
          </div>
          {event.category && <p className="text-body-md text-on-surface-variant">{event.category}</p>}
        </div>
        <EventMeta event={event} />
        {event.description && <p className="line-clamp-3 text-body-md text-on-surface-variant">{event.description}</p>}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="tabular-nums text-on-background">
              <span className="text-headline-md">{event.registered}</span>
              <span className="text-body-sm text-on-surface-variant">
                {event.capacity != null ? ` / ${event.capacity} terdaftar` : " terdaftar"}
              </span>
            </p>
            {left != null && <p className="text-body-sm tabular-nums text-on-surface-variant">{left === 0 ? "Penuh" : `${left} sisa`}</p>}
          </div>
          <EventCapacityMeter registered={event.registered} capacity={event.capacity} />
        </div>
      </div>
    </article>
  );
}

function BoardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-headline-md text-on-background">{title}</h2>
      {children}
    </section>
  );
}

export function EventsBoard({ events, emptyText }: { events: BoardEvent[]; emptyText: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("semua");
  const [query, setQuery] = useState("");
  const [showAllPast, setShowAllPast] = useState(false);

  const counts = useMemo(() => {
    const result: Record<(typeof FILTERS)[number]["key"], number> = { semua: events.length, datang: 0, disiapkan: 0, selesai: 0 };
    for (const event of events) result[event.group] += 1;
    return result;
  }, [events]);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          (filter === "semua" || event.group === filter) &&
          (!needle || [event.title, event.category, event.location].filter(Boolean).join(" ").toLowerCase().includes(needle)),
      ),
    [events, filter, needle],
  );

  if (events.length === 0) {
    return <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">{emptyText}</p>;
  }

  const upcoming = visible.filter((event) => event.group === "datang");
  const preparing = visible.filter((event) => event.group === "disiapkan");
  const past = visible.filter((event) => event.group === "selesai");
  const [featured, ...otherUpcoming] = upcoming;
  const shownPast = showAllPast || needle || filter === "selesai" ? past : past.slice(0, PAST_PREVIEW);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6 xl:border-b xl:border-outline-variant">
        <div
          role="group"
          aria-label="Saring kegiatan"
          className="flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-outline-variant xl:border-b-0"
        >
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors ${
                filter === option.key
                  ? "border-primary-container text-primary-container"
                  : "border-transparent text-on-surface-variant hover:text-on-background"
              }`}
            >
              {option.label} <span className="tabular-nums">{counts[option.key]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-md bg-soft-gray px-3 xl:w-72 xl:shrink-0">
          <Search size={15} className="shrink-0 text-on-surface-variant" aria-hidden />
          <span className="sr-only">Cari kegiatan</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, kategori, lokasi"
            className="min-w-0 flex-1 bg-transparent py-2 text-body-sm placeholder:text-on-surface-variant focus:outline-none"
          />
        </label>
      </div>

      {visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">
          {needle ? `Tidak ada kegiatan yang cocok dengan "${query.trim()}".` : "Tidak ada kegiatan di kelompok ini."}
        </p>
      )}

      {featured && (
        <BoardSection title="Terdekat">
          <FeaturedEventCard event={featured} />
        </BoardSection>
      )}

      {otherUpcoming.length > 0 && (
        <BoardSection title="Akan Datang">
          <div className={GRID}>
            {otherUpcoming.map((event) => (
              <EventBoardCard key={event.id} event={event} />
            ))}
          </div>
        </BoardSection>
      )}

      {preparing.length > 0 && (
        <BoardSection title="Sedang Disiapkan">
          <div className={GRID}>
            {preparing.map((event) => (
              <EventBoardCard key={event.id} event={event} />
            ))}
          </div>
        </BoardSection>
      )}

      {past.length > 0 && (
        <BoardSection title="Sudah Lewat">
          <div className={GRID}>
            {shownPast.map((event) => (
              <EventBoardCard key={event.id} event={event} />
            ))}
          </div>
          {shownPast.length < past.length && (
            <button
              type="button"
              onClick={() => setShowAllPast(true)}
              className="self-start rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low"
            >
              Tampilkan Semua ({past.length})
            </button>
          )}
        </BoardSection>
      )}
    </div>
  );
}
