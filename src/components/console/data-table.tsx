"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  Download,
  FileSpreadsheet,
  ListFilter,
  Loader2,
  Lock,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isUploadedFilePath } from "@/lib/private-files";
import type { TableCell, TableColumn, TableRow } from "@/lib/table-view";

// Tabel baca-saja ala spreadsheet untuk konsol: urut, cari, filter per kolom,
// pilih kolom, salin ke Sheets/Excel. Tidak ada penyuntingan di sini.
//
// Komponen ini TIDAK menjaga akses. Data yang masuk lewat props sudah dipotong
// di server sesuai hak pembacanya; `sensitive` hanya menyembunyikan kolom data
// pribadi sampai pembaca memilih menampilkannya.

export type TableExportLink = { label: string; href: string };

// Spreadsheet kosong baru di akun Google yang sedang login di browser.
const NEW_GOOGLE_SHEET_URL = "https://sheets.new";

/** Hasil aksi server "buat Google Sheet": tautan sheet, atau pesan kegagalan yang siap ditampilkan. */
export type OpenSheetsResult = { ok: true; url: string } | { ok: false; error: string };

const SORT_LOCALE = "id";
const DEFAULT_PAGE_SIZE = 100;
const NUMBER_FILTER = /^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/;

type SortState = { key: string; dir: "asc" | "desc" } | null;

const isEmpty = (v: TableCell) => v == null || v === "";
// Hanya path berkas unggahan yang jadi tautan. Isi sel bisa buatan peserta
// (jawaban formulir), jadi "/api/..." sembarang tidak boleh ikut jadi tautan.
const isFilePath = (v: TableCell): v is string => typeof v === "string" && isUploadedFilePath(v);

function compareCells(a: TableCell, b: TableCell, kind: TableColumn["kind"]): number {
  if (kind === "number") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), SORT_LOCALE, { numeric: true, sensitivity: "base" });
}

function matchesFilter(value: TableCell, filter: string, kind: TableColumn["kind"]): boolean {
  const f = filter.trim();
  if (!f) return true;
  if (kind === "number") {
    const m = NUMBER_FILTER.exec(f);
    if (m) {
      if (isEmpty(value)) return false;
      const n = Number(value);
      const target = Number(m[2]);
      switch (m[1]) {
        case ">=":
          return n >= target;
        case "<=":
          return n <= target;
        case ">":
          return n > target;
        case "<":
          return n < target;
        default:
          return n === target;
      }
    }
  }
  return String(value ?? "").toLowerCase().includes(f.toLowerCase());
}

// Sel untuk ditempel ke Sheets/Excel: tab dan baris baru di dalam sel diganti
// spasi supaya kolom tidak bergeser, dan awalan rumus dinetralkan seperti di
// ekspor CSV ("=HYPERLINK(...)" dari jawaban peserta tidak boleh jalan).
function copyCell(value: TableCell, kind: TableColumn["kind"]): string {
  if (isEmpty(value)) return "";
  if (kind === "number") return String(value);
  let s = String(value).replace(/[\t\r\n]+/g, " ");
  if (isFilePath(value)) s = window.location.origin + s;
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s;
}

// Kolom waktu: zonanya ("(jam Tiongkok CST, UTC+8)") jadi baris kedua kecil di
// bawah judul, supaya kolomnya tidak selebar seluruh label.
function HeaderLabel({ column }: { column: TableColumn }) {
  const cut = column.kind === "date" ? column.header.indexOf(" (") : -1;
  if (cut < 0) return <span>{column.header}</span>;
  return (
    <span className="flex flex-col text-left">
      <span>{column.header.slice(0, cut)}</span>
      <span className="text-[0.65rem] font-normal normal-case tracking-normal opacity-80">{column.header.slice(cut + 1)}</span>
    </span>
  );
}

export function DataTable({
  columns,
  rows,
  exportLinks = [],
  canCopy = false,
  onOpenSheets,
  pageSize = DEFAULT_PAGE_SIZE,
  maxHeightClass = "max-h-[36rem]",
  label,
  emptyText = "Belum ada data.",
  note,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  /** Unduhan file asli (Excel/CSV). Hanya diisi pemanggil yang memang boleh mengekspor. */
  exportLinks?: TableExportLink[];
  /** Tombol "Salin" untuk ditempel ke Sheets/Excel; sama gerbangnya dengan ekspor. */
  canCopy?: boolean;
  /**
   * Buat Google Sheet dari data ini di server lalu buka. Server membangun ulang
   * datanya sendiri (semua baris, tanpa kolom pribadi), bukan memakai pencarian,
   * filter, atau kolom yang sedang tampil di layar. Sama gerbangnya dengan ekspor.
   */
  onOpenSheets?: () => Promise<OpenSheetsResult>;
  pageSize?: number;
  maxHeightClass?: string;
  /** Nama tabel untuk pembaca layar. */
  label: string;
  emptyText?: string;
  note?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [chooserOpen, setChooserOpen] = useState(false);
  const [fullText, setFullText] = useState(false);
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [sheetsBusy, setSheetsBusy] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);

  // Kolom data pribadi tersembunyi sampai pembaca menyalakannya sendiri.
  const visible = useMemo(
    () => columns.filter((c) => overrides[c.key] ?? !c.sensitive),
    [columns, overrides],
  );
  const hiddenCount = columns.length - visible.length;
  const hasLong = visible.some((c) => c.long);

  useEffect(() => {
    if (!chooserOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!chooserRef.current?.contains(e.target as Node)) setChooserOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChooserOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [chooserOpen]);

  const activeFilters = visible.filter((c) => (colFilters[c.key] ?? "").trim() !== "").length;
  const isFiltered = query.trim() !== "" || activeFilters > 0;

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      for (const c of visible) {
        if (!matchesFilter(r.cells[c.key], colFilters[c.key] ?? "", c.kind)) return false;
      }
      if (!q) return true;
      // Pencarian hanya membaca kolom yang sedang tampil, jadi kolom data pribadi
      // yang disembunyikan tidak bisa "ketahuan" lewat kotak cari.
      return visible.some((c) => String(r.cells[c.key] ?? "").toLowerCase().includes(q));
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = a.cells[col.key];
          const bv = b.cells[col.key];
          // Sel kosong selalu di bawah, apa pun arah urutnya.
          if (isEmpty(av) || isEmpty(bv)) return isEmpty(av) === isEmpty(bv) ? 0 : isEmpty(av) ? 1 : -1;
          return dir * compareCells(av, bv, col.kind);
        });
      }
    }
    return out;
  }, [rows, columns, visible, query, colFilters, sort]);

  const pageCount = Math.max(1, Math.ceil(processed.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = processed.slice(start, start + pageSize);

  function cycleSort(key: string) {
    setPage(1);
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      return s.dir === "asc" ? { key, dir: "desc" } : null;
    });
  }

  function resetView() {
    setQuery("");
    setColFilters({});
    setSort(null);
    setPage(1);
  }

  // true = tersalin. `message` mengganti toast bawaan.
  async function copyAll(message?: string): Promise<boolean> {
    const lines = [
      visible.map((c) => c.header.replace(/[\t\r\n]+/g, " ")).join("\t"),
      ...processed.map((r) => visible.map((c) => copyCell(r.cells[c.key], c.kind)).join("\t")),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(message ?? `${processed.length} baris disalin. Tempel di Google Sheets atau Excel.`);
      return true;
    } catch {
      toast.error("Browser menolak akses clipboard. Pakai tombol unduh sebagai gantinya.");
      return false;
    }
  }

  // Tempel manual: salin dulu, baru buka Google Sheets kosong. Tab baru bisa
  // mengambil fokus dan clipboard menolak tulis dari halaman yang tidak fokus,
  // jadi urutannya salin -> buka. Salinan memakan milidetik, jadi klik masih
  // dihitung sebagai aksi pengguna untuk membuka tab. Tidak ada data yang lewat
  // server atau Google dari sini: Sheets hanya menerima apa yang pengguna tempel.
  async function copyToSheets() {
    const ok = await copyAll("Tabel disalin. Di Google Sheets yang terbuka, klik sel A1 lalu tekan Ctrl+V.");
    if (ok) window.open(NEW_GOOGLE_SHEET_URL, "_blank", "noopener,noreferrer");
  }

  // Sheet dibuat di server (lihat src/app/actions/export-sheets.ts), hanya kalau
  // induknya memberi onOpenSheets (server sudah dikonfigurasi). Isinya semua
  // baris tanpa kolom pribadi, bukan pencarian/filter/kolom yang sedang tampil.
  async function openSheetsFromServer() {
    if (!onOpenSheets || sheetsBusy) return;
    // Jendela dibuka SEKARANG, selagi klik masih dihitung sebagai aksi pengguna:
    // pembuatan sheet makan beberapa detik, dan popup yang dibuka sesudah await
    // diblokir browser. opener dilepas supaya halaman Google tidak memegang tab ini.
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "Membuat Google Sheet…";
      popup.document.body.textContent = "Membuat Google Sheet… tunggu sebentar.";
    }
    setSheetsBusy(true);
    try {
      const res = await onOpenSheets();
      if (res.ok) {
        if (popup) popup.location.replace(res.url);
        else toast.success("Google Sheet siap.", { action: { label: "Buka", onClick: () => window.open(res.url, "_blank", "noopener") } });
      } else {
        popup?.close();
        toast.error(res.error);
      }
    } catch {
      popup?.close();
      toast.error("Gagal membuat Google Sheet. Pakai tombol Salin sebagai gantinya.");
    } finally {
      setSheetsBusy(false);
    }
  }

  const btnCls =
    "inline-flex items-center gap-1.5 rounded-md bg-soft-gray px-2.5 py-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
  const inputCls =
    "w-full bg-soft-gray rounded-md px-2 py-1 text-body-sm normal-case tracking-normal text-on-background font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari di kolom yang tampil"
            aria-label={`Cari di ${label}`}
            className="w-full bg-soft-gray rounded-md py-2 pl-8 pr-2 text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        </label>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-pressed={filtersOpen}
          className={`${btnCls} ${filtersOpen || activeFilters > 0 ? "text-primary-container" : ""}`}
        >
          <ListFilter size={13} aria-hidden /> Filter{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>

        <div className="relative" ref={chooserRef}>
          <button
            type="button"
            onClick={() => setChooserOpen((o) => !o)}
            aria-expanded={chooserOpen}
            aria-haspopup="true"
            className={btnCls}
          >
            <Columns3 size={13} aria-hidden /> Kolom
            {hiddenCount > 0 ? <span className="normal-case tracking-normal">({visible.length}/{columns.length})</span> : null}
          </button>
          {chooserOpen && (
            <div
              role="group"
              aria-label="Pilih kolom yang tampil"
              className="absolute left-0 top-full z-30 mt-1 w-64 max-h-80 overflow-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-2 shadow-lg"
            >
              <div className="flex items-center justify-between px-1 pb-1.5 text-label-caps text-on-surface-variant">
                <button type="button" className="hover:text-on-background" onClick={() => setOverrides(Object.fromEntries(columns.map((c) => [c.key, true])))}>
                  Tampilkan semua
                </button>
                <button type="button" className="hover:text-on-background" onClick={() => setOverrides({})}>
                  Bawaan
                </button>
              </div>
              {columns.map((c) => {
                const on = overrides[c.key] ?? !c.sensitive;
                return (
                  <label key={c.key} className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-body-sm hover:bg-surface-container-low">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => setOverrides((o) => ({ ...o, [c.key]: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1 break-words">{c.header}</span>
                    {c.sensitive && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-label-caps text-on-surface-variant" title="Data pribadi: tersembunyi sampai kamu menampilkannya">
                        <Lock size={11} aria-hidden /> pribadi
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {hasLong && (
          <button type="button" onClick={() => setFullText((v) => !v)} aria-pressed={fullText} className={`${btnCls} ${fullText ? "text-primary-container" : ""}`}>
            <AlignLeft size={13} aria-hidden /> Teks penuh
          </button>
        )}

        {isFiltered || sort ? (
          <button type="button" onClick={resetView} className={btnCls}>
            <X size={13} aria-hidden /> Reset
          </button>
        ) : null}

        <span className="ml-auto flex flex-wrap items-center gap-2">
          {canCopy && (
            <>
              <button
                type="button"
                onClick={onOpenSheets ? openSheetsFromServer : copyToSheets}
                disabled={sheetsBusy || (onOpenSheets ? rows.length === 0 : processed.length === 0)}
                title={
                  onOpenSheets
                    ? "Membuka Google Sheet langsung untuk data ini (semua baris, tanpa paspor, telepon, dan KTM): dibuat sekali, lalu diperbarui otomatis dari website beberapa detik setelah datanya berubah. Kamu hanya bisa membacanya; mengedit di sheet tidak mengubah data di website dan akan tertimpa. Dihapus otomatis kalau 30 hari tidak berubah."
                    : "Menyalin tabel (kolom yang tampil, sesuai pencarian dan filter) lalu membuka Google Sheets kosong. Tempel dengan Ctrl+V. Itu salinan: mengubah isinya tidak mengubah data di website."
                }
                className={`${btnCls} disabled:opacity-60`}
              >
                {sheetsBusy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <FileSpreadsheet size={13} aria-hidden />} Ke Google Sheets
              </button>
              <button type="button" onClick={() => copyAll()} disabled={processed.length === 0} className={`${btnCls} disabled:opacity-50`}>
                {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} Salin
              </button>
            </>
          )}
          {exportLinks.map((l) => (
            <a key={l.href} href={l.href} download className={`${btnCls} text-primary-container hover:text-primary`}>
              <Download size={13} aria-hidden /> {l.label}
            </a>
          ))}
        </span>
      </div>

      {note && <p className="text-xs text-on-surface-variant">{note}</p>}

      <div
        tabIndex={0}
        role="region"
        aria-label={label}
        className={`bg-surface-container-lowest border border-outline-variant rounded-xl overflow-auto ${maxHeightClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container`}
      >
        <table className="w-full border-separate border-spacing-0 text-body-sm">
          <thead className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              {visible.map((c, i) => {
                const sorted = sort?.key === c.key ? sort.dir : null;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    className={`sticky top-0 border-b border-outline-variant bg-surface-container-low px-3 py-2 text-left align-bottom font-medium ${
                      i === 0 ? "left-0 z-20 border-r" : "z-10"
                    } ${c.kind === "number" ? "text-right" : ""} ${c.kind === "date" ? "whitespace-nowrap" : ""}`}
                    // Judul panjang (mis. pertanyaan evaluasi) diberi lebar secukupnya
                    // supaya tidak terlipat jadi lima baris.
                    style={c.kind === "text" ? { minWidth: `${Math.min(14, Math.max(8, Math.ceil(c.header.length * 0.55)))}rem` } : undefined}
                  >
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => cycleSort(c.key)}
                        className={`inline-flex items-center gap-1 rounded uppercase tracking-wide hover:text-on-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${c.kind === "number" ? "self-end" : "self-start"}`}
                      >
                        <HeaderLabel column={c} />
                        {c.sensitive && <Lock size={10} aria-hidden />}
                        {sorted === "asc" ? <ArrowUp size={12} aria-hidden /> : sorted === "desc" ? <ArrowDown size={12} aria-hidden /> : <ArrowUpDown size={12} className="opacity-40" aria-hidden />}
                      </button>
                      {filtersOpen && (
                        <input
                          type="search"
                          value={colFilters[c.key] ?? ""}
                          onChange={(e) => {
                            setColFilters((f) => ({ ...f, [c.key]: e.target.value }));
                            setPage(1);
                          }}
                          placeholder={c.kind === "number" ? "mis. >=8" : "Cari…"}
                          aria-label={`Filter kolom ${c.header}`}
                          className={inputCls}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(visible.length, 1)} className="px-3 py-8 text-center text-on-surface-variant">
                  {isFiltered ? "Tidak ada baris yang cocok dengan pencarian atau filter." : emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id} className="group">
                  {visible.map((c, i) => {
                    const v = r.cells[c.key];
                    const clamp = c.long && !fullText;
                    return (
                      <td
                        key={c.key}
                        title={clamp && !isEmpty(v) ? String(v) : undefined}
                        className={`border-b border-outline-variant/60 px-3 py-2 align-top ${
                          i === 0 ? "sticky left-0 z-[5] min-w-[8rem] sm:min-w-[10rem] max-w-[16rem] border-r bg-surface-container-lowest group-hover:bg-surface-container-low font-medium" : "group-hover:bg-surface-container-low"
                        } ${c.kind === "number" ? "text-right tabular-nums" : ""} ${
                          c.long ? (fullText ? "min-w-[20rem] max-w-[36rem] whitespace-pre-wrap break-words" : "min-w-[16rem] max-w-[22rem]") : c.kind === "date" ? "whitespace-nowrap" : c.kind === "text" ? "min-w-[8rem]" : ""
                        }`}
                      >
                        {isEmpty(v) ? (
                          <span className="text-on-surface-variant/50" aria-label="kosong">—</span>
                        ) : isFilePath(v) ? (
                          <a href={v} target="_blank" rel="noopener noreferrer" className="text-primary-container underline-offset-2 hover:underline">
                            Buka berkas
                          </a>
                        ) : clamp ? (
                          <span className="line-clamp-2 break-words">{v}</span>
                        ) : (
                          String(v)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <span>
          {processed.length === 0
            ? "0 baris"
            : isFiltered
              ? `${processed.length} dari ${rows.length} baris`
              : `${rows.length} baris`}
          {processed.length > pageSize ? ` · menampilkan ${start + 1}–${Math.min(start + pageSize, processed.length)}` : ""}
          {hiddenCount > 0 ? ` · ${hiddenCount} kolom disembunyikan` : ""}
        </span>
        {pageCount > 1 && (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Halaman sebelumnya"
              className="rounded-md bg-soft-gray p-1.5 hover:text-on-background disabled:opacity-40"
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span className="px-1">
              Halaman {currentPage} dari {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              aria-label="Halaman berikutnya"
              className="rounded-md bg-soft-gray p-1.5 hover:text-on-background disabled:opacity-40"
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
