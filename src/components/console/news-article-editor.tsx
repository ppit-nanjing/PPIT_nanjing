"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Quote, Redo2, Trash2, Undo2 } from "lucide-react";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { CROP_MAX_EDGE, compressImage, imageExtension } from "@/lib/image-compress";
import { readUploadResult } from "@/components/upload/upload-error";
import { useT } from "@/lib/i18n/client";

const NewsFigure = Node.create({
  name: "newsFigure",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (node) => {
          const figure = node as HTMLElement;
          const image = figure.querySelector("img");
          if (!image?.getAttribute("src")) return false;
          return {
            src: image.getAttribute("src"),
            alt: image.getAttribute("alt") ?? "",
            caption: figure.querySelector("figcaption")?.textContent ?? "",
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption, ...figureAttributes } = HTMLAttributes as {
      src: string;
      alt: string;
      caption: string;
    };
    return [
      "figure",
      mergeAttributes(figureAttributes, { "data-news-figure": "" }),
      ["img", { src, alt }],
      ["figcaption", {}, caption],
    ];
  },
});

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-low"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function plainTextDocument(text: string): JSONContent {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] }));
  return { type: "doc", content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }] };
}

type FigureDraft = {
  mode: "insert" | "edit";
  src: string;
  alt: string;
  caption: string;
};

export function NewsArticleEditor({
  initialText,
  initialHtml,
}: {
  initialText: string;
  initialHtml: string | null;
}) {
  const t = useT();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [figureSelected, setFigureSelected] = useState(false);
  const [selectionHasFigure, setSelectionHasFigure] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [figureDraft, setFigureDraft] = useState<FigureDraft | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const syncValues = (activeEditor: Editor) => {
    if (textRef.current) textRef.current.value = activeEditor.getText({ blockSeparator: "\n\n" });
    if (htmlRef.current) htmlRef.current.value = activeEditor.getHTML();
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        // Link sudah termasuk di StarterKit v3 — konfigurasi di sini, JANGAN
        // tambah ekstensi Link terpisah: namanya dobel dan Tiptap melempar
        // warning "Duplicate extension names" + handler ganda.
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      NewsFigure,
    ],
    content: initialHtml || plainTextDocument(initialText),
    editorProps: {
      attributes: {
        class:
          "min-h-56 rounded-b-md bg-soft-gray p-4 text-body-md text-on-background outline-none [&_a]:text-primary-container [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-container/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-body-sm [&_figcaption]:text-on-surface-variant [&_figure]:my-6 [&_figure]:rounded-lg [&_figure]:outline [&_figure]:outline-1 [&_figure]:outline-transparent [&_figure]:has-[img.ProseMirror-selectednode]:outline-primary-container [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-headline-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-headline-md [&_img]:w-full [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:my-3 [&_ol]:list-decimal [&_p]:mb-4 last:[&_p]:mb-0 [&_ul]:my-3 [&_ul]:list-disc",
      },
    },
    onCreate: ({ editor: activeEditor }) => syncValues(activeEditor),
    onUpdate: ({ editor: activeEditor }) => syncValues(activeEditor),
    onSelectionUpdate: ({ editor: activeEditor }) => {
      const { from, to } = activeEditor.state.selection;
      setSelectedText(from === to ? "" : activeEditor.state.doc.textBetween(from, to, "\n\n").trim());
      setFigureSelected(activeEditor.isActive("newsFigure"));
      let hasFigure = false;
      activeEditor.state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === "newsFigure") hasFigure = true;
      });
      setSelectionHasFigure(hasFigure);
    },
  });

  async function uploadInlineImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Pilih berkas gambar.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await compressImage(file, CROP_MAX_EDGE);
      const base = file.name.replace(/\.[^.]+$/, "") || "gambar-artikel";
      const payload = new FormData();
      payload.append("file", new File([blob], `${base}-${Date.now()}.${imageExtension(blob.type)}`, { type: blob.type }));
      payload.append("folder", "news");
      const response = await fetch("/api/upload", { method: "POST", body: payload });
      const src = await readUploadResult(response, t);
      setFigureDraft({ mode: "insert", src, alt: "", caption: "" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  function saveFigure() {
    if (!editor || !figureDraft) return;
    const alt = figureDraft.alt.trim();
    if (!alt) return;
    const attrs = { alt, caption: figureDraft.caption.trim() };
    if (figureDraft.mode === "insert") {
      editor.chain().focus().insertContent({ type: "newsFigure", attrs: { ...attrs, src: figureDraft.src } }).run();
    } else {
      editor.chain().focus().updateAttributes("newsFigure", attrs).run();
    }
    setFigureDraft(null);
  }

  function openFigureEdit() {
    if (!editor || !editor.isActive("newsFigure")) return;
    const attrs = editor.getAttributes("newsFigure");
    setFigureDraft({ mode: "edit", src: String(attrs.src ?? ""), alt: String(attrs.alt ?? ""), caption: String(attrs.caption ?? "") });
  }

  function saveLink() {
    if (!editor || !linkUrl) return;
    const url = linkUrl.trim();
    if (!/^(https?:\/\/|mailto:)/i.test(url)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank", rel: "noopener noreferrer" }).run();
    setLinkUrl(null);
  }

  if (!editor) return null;
  // Jangan izinkan AI mengganti rentang yang melintasi gambar. Penggantian
  // teks biasa aman, tetapi insertContentAt pada rentang gabungan akan
  // menghapus node figure yang ikut terseleksi.
  const hasTextSelection = selectedText.length > 0 && !figureSelected && !selectionHasFigure;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-outline-variant bg-surface-container-lowest px-2 py-1.5">
        <ToolbarButton label="Paragraf" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><span className="text-body-sm font-semibold">P</span></ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden />
        <ToolbarButton label="Tebal" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Miring" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Daftar bullet" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
        <ToolbarButton label="Daftar bernomor" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
        <ToolbarButton label="Kutipan" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
        <ToolbarButton label="Tautan" disabled={!hasTextSelection} active={editor.isActive("link")} onClick={() => setLinkUrl(String(editor.getAttributes("link").href ?? ""))}><Link2 size={16} /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden />
        <ToolbarButton label="Sisipkan gambar" disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}</ToolbarButton>
        {figureSelected && <><ToolbarButton label="Edit gambar" onClick={openFigureEdit}><ImagePlus size={16} /></ToolbarButton><ToolbarButton label="Hapus gambar" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 size={16} /></ToolbarButton></>}
        <span className="mx-1 h-5 w-px bg-outline-variant" aria-hidden />
        <ToolbarButton label="Urungkan" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton label="Ulangi" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <textarea ref={textRef} id="news-content" name="content" defaultValue={initialText} hidden />
      <input ref={htmlRef} type="hidden" name="contentHtml" defaultValue={initialHtml ?? ""} />

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <AIImproveButton
          context="news"
          label="Perbaiki teks pilihan"
          value={selectedText}
          disabled={!hasTextSelection}
          disabledReason="Blok teks yang ingin diperbaiki terlebih dahulu."
          onImproved={(improved) => editor.chain().focus().insertContentAt(editor.state.selection, improved).run()}
        />
        <span className="text-label-caps text-on-surface-variant">Blok teks untuk memakai bantuan AI; gambar tidak akan diubah.</span>
      </div>
      {uploadError && <p role="alert" className="text-body-sm text-error">{uploadError}</p>}
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadInlineImage(file); }} />

      {/* Modal lewat portal ke document.body: kalau dirender inline, <form>
          modal jadi turunan <form> artikel (HTML tidak valid -> hydration
          error). Modal hanya muncul setelah interaksi (state awal null), jadi
          tidak ada ketidakcocokan SSR. */}
      {linkUrl !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="news-link-title">
            <form onSubmit={(event) => { event.preventDefault(); saveLink(); }} className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
              <h3 id="news-link-title" className="text-headline-sm text-on-background">Tambahkan tautan</h3>
              <label className="mt-4 flex flex-col gap-2 text-body-sm text-on-surface-variant">URL (https:// atau mailto:)<input autoFocus required value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className="rounded-md bg-soft-gray p-3 text-on-background outline-none focus:ring-2 focus:ring-primary-container" /></label>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setLinkUrl(null)} className="px-4 py-2 text-body-sm text-on-surface-variant">Batal</button><button type="submit" className="rounded-md bg-primary-container px-5 py-2 text-label-caps uppercase text-on-primary">Simpan tautan</button></div>
            </form>
          </div>,
          document.body,
        )}

      {figureDraft &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="news-figure-title">
            <form onSubmit={(event) => { event.preventDefault(); saveFigure(); }} className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
              <h3 id="news-figure-title" className="text-headline-sm text-on-background">{figureDraft.mode === "insert" ? "Sisipkan gambar" : "Edit gambar"}</h3>
              <label className="mt-4 flex flex-col gap-2 text-body-sm text-on-surface-variant">Deskripsi gambar untuk pembaca layar *<input autoFocus required value={figureDraft.alt} onChange={(event) => setFigureDraft({ ...figureDraft, alt: event.target.value })} className="rounded-md bg-soft-gray p-3 text-on-background outline-none focus:ring-2 focus:ring-primary-container" /></label>
              <label className="mt-4 flex flex-col gap-2 text-body-sm text-on-surface-variant">Caption (opsional)<textarea rows={3} value={figureDraft.caption} onChange={(event) => setFigureDraft({ ...figureDraft, caption: event.target.value })} className="resize-none rounded-md bg-soft-gray p-3 text-on-background outline-none focus:ring-2 focus:ring-primary-container" /></label>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setFigureDraft(null)} className="px-4 py-2 text-body-sm text-on-surface-variant">Batal</button><button type="submit" className="rounded-md bg-primary-container px-5 py-2 text-label-caps uppercase text-on-primary">{figureDraft.mode === "insert" ? "Sisipkan" : "Simpan"}</button></div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}
