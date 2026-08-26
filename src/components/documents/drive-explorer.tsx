"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, File as FileIcon, Trash2, Pencil, FolderPlus, Search } from "lucide-react";
import { CopyLinkButton } from "@/components/console/copy-link-button";
import { ConfirmButton } from "@/components/console/confirm-button";
import type { DriveItem } from "@/app/actions/drive";
import {
  createDriveFolderAction,
  uploadDriveFileAction,
  renameDriveFileAction,
  trashDriveFileAction,
} from "@/app/actions/drive";

type Props = {
  driveFolderId: string;
  access: "write" | "read";
  title: string;
  periodId: string | null;
  departmentId: string | null;
  items: DriveItem[];
  folderNavigable?: boolean;
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function HiddenContext({ periodId, departmentId, parent }: {
  periodId: string | null;
  departmentId: string | null;
  parent: string;
}) {
  return (
    <>
      <input type="hidden" name="periodId" value={periodId ?? ""} />
      <input type="hidden" name="departmentId" value={departmentId ?? ""} />
      <input type="hidden" name="parentDriveFolderId" value={parent} />
    </>
  );
}

export function DriveExplorer({
  driveFolderId,
  access,
  title,
  periodId,
  departmentId,
  items,
  folderNavigable,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newFolder, setNewFolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const canWrite = access === "write";
  // Client-side name filter - Drive lists are small (per-folder), so this
  // beats a round trip for finding one berkas.
  const needle = query.trim().toLowerCase();
  const visible = needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await uploadDriveFileAction(fd);
      form.reset();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    }
  }

  async function onCreateFolder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!newFolder.trim()) return;
    const fd = new FormData();
    fd.set("name", newFolder.trim());
    fd.set("periodId", periodId ?? "");
    fd.set("departmentId", departmentId ?? "");
    fd.set("parentDriveFolderId", driveFolderId);
    try {
      await createDriveFolderAction(fd);
      setNewFolder("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat folder.");
    }
  }

  async function onRename(item: DriveItem) {
    const name = window.prompt("Ubah nama menjadi:", item.name);
    if (!name || !name.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("fileId", item.id);
    fd.set("name", name.trim());
    fd.set("periodId", periodId ?? "");
    fd.set("departmentId", departmentId ?? "");
    try {
      await renameDriveFileAction(fd);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah nama.");
    }
  }

  async function onDelete(item: DriveItem) {
    setError(null);
    const fd = new FormData();
    fd.set("fileId", item.id);
    fd.set("periodId", periodId ?? "");
    fd.set("departmentId", departmentId ?? "");
    try {
      await trashDriveFileAction(fd);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <FolderIcon size={18} className="text-secondary" />
          <h3 className="text-title-md text-on-background">{title}</h3>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-label-caps ${
            canWrite ? "bg-primary-container/40 text-on-primary-container" : "bg-outline-variant/40 text-on-surface-variant"
          }`}
        >
          {canWrite ? "Bisa edit" : "Baca saja"}
        </span>
      </div>

      {error && <p className="text-body-sm text-on-error-container bg-error-container/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {canWrite && (
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <form onSubmit={onUpload} className="flex items-center gap-2">
            <HiddenContext periodId={periodId} departmentId={departmentId} parent={driveFolderId} />
            <input
              type="file"
              name="file"
              required
              className="block text-body-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-primary-container file:px-4 file:py-2 file:text-on-primary file:cursor-pointer"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Mengunggah…" : "Unggah"}
            </button>
            <span className="text-label-caps text-on-surface-variant">maks 4 MB</span>
          </form>
          <form onSubmit={onCreateFolder} className="flex items-center gap-2">
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="nama folder baru"
              className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-lg hover:bg-surface-container-lowest disabled:opacity-60"
            >
              <FolderPlus size={16} /> Folder
            </button>
          </form>
        </div>
      )}

      {items.length > 0 && (
        <div className="relative mb-3 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama berkas…"
            aria-label="Cari nama berkas"
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-body-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant py-6 text-center">Folder kosong.</p>
      ) : visible.length === 0 ? (
        <p className="text-body-md text-on-surface-variant py-6 text-center">Tidak ada berkas yang cocok dengan pencarian.</p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {visible.map((item) => {
            const folderHref =
              item.isFolder && folderNavigable
                ? `/console/documents?folder=${encodeURIComponent(item.id)}${periodId ? `&period=${periodId}` : ""}`
                : null;
            return (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                {item.isFolder ? (
                  <FolderIcon size={18} className="text-secondary shrink-0" />
                ) : (
                  <FileIcon size={18} className="text-secondary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  {folderHref ? (
                    <a href={folderHref} className="font-medium text-primary-container hover:text-primary truncate block">
                      {item.name}
                    </a>
                  ) : item.webViewLink ? (
                    <a href={item.webViewLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-container hover:text-primary truncate block">
                      {item.name}
                    </a>
                  ) : (
                    <span className="font-medium text-on-background truncate block">{item.name}</span>
                  )}
                </div>
                {!item.isFolder && (item.size != null || item.modifiedTime) && (
                  <div className="hidden sm:flex flex-col items-end text-label-caps text-on-surface-variant shrink-0 leading-snug">
                    {item.size != null && <span>{formatBytes(Number(item.size))}</span>}
                    {item.modifiedTime && (
                      <span>{new Date(item.modifiedTime).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
                    )}
                  </div>
                )}
                {item.shortSlug && <CopyLinkButton slug={item.shortSlug} />}
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onRename(item)} aria-label="Ubah nama" className="text-on-surface-variant hover:text-on-background p-1.5">
                      <Pencil size={16} />
                    </button>
                    <ConfirmButton
                      onConfirm={() => onDelete(item)}
                      title="Hapus berkas?"
                      message={`"${item.name}" akan dipindahkan ke sampah Drive.`}
                      aria-label="Hapus"
                      className="text-on-surface-variant hover:text-error p-1.5"
                    >
                      <Trash2 size={16} />
                    </ConfirmButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
