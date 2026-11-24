"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Pencil, X } from "lucide-react";
import { updateInventoryItem } from "@/app/actions/admin-inventory";
import { FileUpload } from "@/components/upload/file-upload";
import { FilterBar } from "@/components/console/filter-bar";
import { SubmitButton } from "@/components/console/submit-button";
import { fieldInput as input, primaryBtn, Select } from "@/components/console/form";
import { CONDITION_LABEL, INVENTORY_CONDITIONS, conditionLabel, type InventoryCondition } from "@/lib/inventory-labels";

// Tab Barang di Manajemen Inventaris: daftar ringkas (foto kecil, lokasi, pemegang, stok)
// dengan saringan status + kategori + cari. Form edit hanya dirender untuk satu baris
// yang sedang dibuka, bukan ratusan form tersembunyi.

export type InventoryListItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  totalQuantity: number;
  availableQuantity: number;
  condition: InventoryCondition;
  location: string | null;
  custodian: string | null;
};

type StatusFilter = "aktif" | "pensiun" | "semua";

const PAGE = 40;

const CONDITION_TONE: Partial<Record<InventoryCondition, string>> = {
  damaged: "bg-error-container/50 text-on-error-container",
  retired: "bg-surface-container-low text-on-surface-variant",
};

export function InventoryItemList({ items }: { items: InventoryListItem[] }) {
  const [status, setStatus] = useState<StatusFilter>("aktif");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null);

  const retired = items.filter((i) => i.condition === "retired").length;
  const categories = [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort();
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (status === "semua" || (status === "pensiun") === (i.condition === "retired")) &&
      (!category || i.category === category) &&
      (!needle || [i.name, i.category, i.location, i.custodian].filter(Boolean).join(" ").toLowerCase().includes(needle)),
  );
  const shown = visible.slice(0, limit);

  // Saringan baru = mulai lagi dari halaman pertama.
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        label="Saring barang"
        options={[
          { key: "aktif", label: "Aktif", count: items.length - retired },
          { key: "pensiun", label: "Pensiun", count: retired },
          { key: "semua", label: "Semua", count: items.length },
        ]}
        value={status}
        onChange={reset(setStatus)}
        query={query}
        onQuery={reset(setQuery)}
        placeholder="Cari nama, lokasi, pemegang"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label="Kategori"
          value={category}
          onChange={(e) => reset(setCategory)(e.target.value)}
          className="w-auto min-w-48"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <p className="text-body-sm tabular-nums text-on-surface-variant">{visible.length} barang</p>
      </div>

      {status === "pensiun" && (
        <p className="text-body-sm text-on-surface-variant">
          Barang Pensiun tidak tampil di katalog publik dan tidak bisa dipinjam. Riwayat peminjamannya tetap tersimpan.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">
          {items.length === 0 ? "Belum ada barang. Mulai dari tombol Tambah Barang." : "Tidak ada barang yang cocok."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          {shown.map((item) => (
            <li key={item.id}>
              <ItemRow item={item} editing={editing === item.id} onToggle={() => setEditing(editing === item.id ? null : item.id)} />
            </li>
          ))}
        </ul>
      )}

      {shown.length < visible.length && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="self-start rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low"
        >
          Tampilkan Lagi ({visible.length - shown.length} tersisa)
        </button>
      )}
    </div>
  );
}

function ItemRow({ item, editing, onToggle }: { item: InventoryListItem; editing: boolean; onToggle: () => void }) {
  const out = item.totalQuantity - item.availableQuantity;
  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 ${item.condition === "retired" ? "opacity-70" : ""}`}>
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-container-high">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <Package size={20} className="text-outline" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-semibold text-on-background">{item.name}</p>
          <p className="truncate text-body-sm text-on-surface-variant">
            {[item.category, item.location, item.custodian && `Pemegang: ${item.custodian}`].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <p className={`text-body-sm tabular-nums ${item.availableQuantity === 0 ? "text-tertiary" : "text-on-background"}`}>
            {item.availableQuantity} / {item.totalQuantity} tersedia
          </p>
          {out > 0 && <p className="text-body-sm tabular-nums text-on-surface-variant">{out} di luar</p>}
        </div>
        <span
          className={`hidden shrink-0 rounded px-2 py-0.5 text-label-caps uppercase tracking-wide md:inline ${
            CONDITION_TONE[item.condition] ?? "bg-primary-container/10 text-primary-container"
          }`}
        >
          {conditionLabel(item.condition)}
        </span>
        <button
          type="button"
          aria-expanded={editing}
          aria-label={`${editing ? "Tutup edit" : "Edit"} ${item.name}`}
          onClick={onToggle}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-outline-variant px-3 text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background"
        >
          {editing ? <X size={14} aria-hidden /> : <Pencil size={14} aria-hidden />}
          <span className="hidden sm:inline">{editing ? "Tutup" : "Edit"}</span>
        </button>
      </div>
      {/* Di HP stok & kondisi tidak muat di baris; tampil di bawahnya. */}
      <p className="-mt-2 px-3 pb-3 pl-[5.25rem] text-body-sm tabular-nums text-on-surface-variant sm:hidden">
        {item.availableQuantity} / {item.totalQuantity} tersedia · {conditionLabel(item.condition)}
      </p>
      {editing && <ItemEditForm item={item} />}
    </>
  );
}

function ItemEditForm({ item }: { item: InventoryListItem }) {
  return (
    <form action={updateInventoryItem} className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low px-3 py-4 sm:px-4">
      <input type="hidden" name="id" value={item.id} />
      <label className="flex flex-col gap-1">
        <span className="text-label-caps text-on-surface-variant">Nama barang *</span>
        <input name="name" required defaultValue={item.name} className={input} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Kategori</span>
          <input name="category" defaultValue={item.category ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Kondisi</span>
          <Select name="condition" defaultValue={item.condition} className="w-full">
            {INVENTORY_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Lokasi penyimpanan</span>
          <input name="location" defaultValue={item.location ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Pemegang</span>
          <input name="custodian" defaultValue={item.custodian ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Jumlah total</span>
          <input name="totalQuantity" type="number" min={0} required defaultValue={item.totalQuantity} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">Tersedia</span>
          <input name="availableQuantity" type="number" min={0} required defaultValue={item.availableQuantity} className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-label-caps text-on-surface-variant">Deskripsi</span>
        <textarea name="description" rows={2} defaultValue={item.description ?? ""} className={`${input} resize-none`} />
      </label>
      <FileUpload name="imageUrl" folder="inventory" label="Foto barang (opsional)" placeholder="URL atau unggah gambar" defaultValue={item.imageUrl ?? ""} />
      <p className="text-body-sm text-on-surface-variant">
        Untuk mengeluarkan barang dari katalog publik, ubah Kondisi jadi Pensiun. Jangan dihapus: riwayat peminjamannya ikut hilang.
      </p>
      <SubmitButton successMessage="Barang tersimpan." className={primaryBtn}>
        Simpan Perubahan
      </SubmitButton>
    </form>
  );
}
