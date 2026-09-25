"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, RemoveFormatting } from "lucide-react";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import { FontSize } from "@/lib/tiptap-font-size";
import { DESCRIPTION_FONT_CATEGORIES, DESCRIPTION_SIZE_OPTIONS } from "@/lib/event-description-style";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
        active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

// Rich text (Bold/Italic/Align/Font/Ukuran per rentang teks terpilih) untuk
// deskripsi acara - menggantikan picker gaya-global sebelumnya (satu
// font/ukuran untuk SELURUH teks). Textarea tersembunyi `id="event-description"`
// tetap ada supaya AIImproveButton (yang baca/tulis lewat DOM id, lihat
// ai-improve-button.tsx) terus jalan tanpa perlu diubah - isinya disinkronkan
// dua arah dengan editor: ketika AI menulis teks baru ke textarea itu (event
// "input" asli), isinya didorong balik jadi paragraf polos ke editor.
export function EventDescriptionEditor({
  defaults,
}: {
  defaults: { description: string; descriptionHtml: string | null };
}) {
  const hiddenTextRef = useRef<HTMLTextAreaElement>(null);
  const hiddenHtmlRef = useRef<HTMLInputElement>(null);
  const lastEditorText = useRef(defaults.description);

  const initialContent: JSONContent | string = defaults.descriptionHtml
    ? defaults.descriptionHtml
    : {
        type: "doc",
        content: (() => {
          const paragraphs = defaults.description
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }));
          return paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }];
        })(),
      };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "bg-soft-gray rounded-md rounded-t-none p-3 text-body-md min-h-[6rem] focus:outline-none [&_p]:mb-2 last:[&_p]:mb-0",
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      lastEditorText.current = text;
      if (hiddenTextRef.current) hiddenTextRef.current.value = text;
      if (hiddenHtmlRef.current) hiddenHtmlRef.current.value = editor.getHTML();
    },
  });

  // AIImproveButton menulis teks baru ke textarea tersembunyi lalu
  // men-dispatch event "input" asli (lihat ai-improve-button.tsx) - itu satu-
  // satunya jalur textarea ini berubah TANPA lewat onUpdate di atas (jalur
  // normal user mengetik ada di editor langsung, bukan di textarea).
  useEffect(() => {
    const el = hiddenTextRef.current;
    if (!el || !editor) return;
    const onExternalInput = () => {
      if (el.value === lastEditorText.current) return;
      const paragraphs = el.value
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ type: "paragraph" as const, content: [{ type: "text" as const, text: p }] }));
      editor.commands.setContent({ type: "doc", content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }] });
      lastEditorText.current = el.value;
      if (hiddenHtmlRef.current) hiddenHtmlRef.current.value = editor.getHTML();
    };
    el.addEventListener("input", onExternalInput);
    return () => el.removeEventListener("input", onExternalInput);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-outline-variant bg-surface-container-lowest px-2 py-1.5">
        <ToolbarButton label="Tebal" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} aria-hidden />
        </ToolbarButton>
        <ToolbarButton label="Miring" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} aria-hidden />
        </ToolbarButton>

        <span className="w-px h-5 bg-outline-variant mx-1" aria-hidden />

        <ToolbarButton
          label="Rata kiri"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={15} aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Rata tengah"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={15} aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Rata kanan"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={15} aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Rata kiri-kanan"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={15} aria-hidden />
        </ToolbarButton>

        <span className="w-px h-5 bg-outline-variant mx-1" aria-hidden />

        <select
          aria-label="Font (berlaku untuk teks yang diblok)"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run();
            e.target.value = "";
          }}
          className="bg-transparent text-body-sm text-on-surface-variant rounded px-1.5 py-1 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <option value="" disabled>
            Font…
          </option>
          {DESCRIPTION_FONT_CATEGORIES.map((cat) => (
            <optgroup key={cat.key} label={cat.label}>
              {cat.fonts.map((f) => (
                <option key={f.key} value={f.cssVar}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          aria-label="Ukuran (berlaku untuk teks yang diblok)"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run();
            e.target.value = "";
          }}
          className="bg-transparent text-body-sm text-on-surface-variant rounded px-1.5 py-1 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <option value="" disabled>
            Ukuran…
          </option>
          {DESCRIPTION_SIZE_OPTIONS.map((s) => (
            <option key={s.key} value={s.px}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="w-px h-5 bg-outline-variant mx-1" aria-hidden />

        <ToolbarButton
          label="Hapus format"
          onClick={() => editor.chain().focus().unsetFontFamily().unsetFontSize().unsetBold().unsetItalic().run()}
        >
          <RemoveFormatting size={15} aria-hidden />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      {/* Blok teks yang diketik/diblok lalu diformat lewat toolbar di atas -
          bukan satu gaya untuk seluruh deskripsi lagi. */}
      <textarea ref={hiddenTextRef} id="event-description" name="description" defaultValue={defaults.description} hidden />
      <input ref={hiddenHtmlRef} type="hidden" name="descriptionHtml" defaultValue={defaults.descriptionHtml ?? ""} />

      <AIImproveButton context="event" targetId="event-description" className="mt-1" />
    </div>
  );
}
