import React, { useEffect, useRef, useState } from 'react';

type NewsPostEditorProps = {
  initialContent?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
};

type ToolButtonProps = {
  title: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
};

function ToolButton({
  title,
  children,
  onClick,
  active
}: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition',
        active
          ? 'bg-slate-900 text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function NewsPostEditor({
  initialContent = '',
  onChange,
  placeholder = 'Tulis isi berita di sini...'
}: NewsPostEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState(initialContent);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const emit = () => {
    const value = editorRef.current?.innerHTML ?? '';
    setHtml(value);
    onChange?.(value);
  };

  const command = (
    name: string,
    value?: string
  ) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    emit();
  };

  const formatBlock = (value: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, value);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt('Masukkan URL:');
    if (!url) return;
    command('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt('Masukkan URL gambar:');
    if (!url) return;
    command('insertImage', url);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-2 sm:p-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <ToolButton title="Tebal" onClick={() => command('bold')}>
            <strong>B</strong>
          </ToolButton>

          <ToolButton title="Miring" onClick={() => command('italic')}>
            <em>I</em>
          </ToolButton>

          <ToolButton title="Garis bawah" onClick={() => command('underline')}>
            <u>U</u>
          </ToolButton>

          <span className="mx-1 h-6 w-px bg-slate-300" />

          <ToolButton title="Rata kiri" onClick={() => command('justifyLeft')}>
            ≡
          </ToolButton>

          <ToolButton title="Rata tengah" onClick={() => command('justifyCenter')}>
            ≡
          </ToolButton>

          <ToolButton title="Rata kanan" onClick={() => command('justifyRight')}>
            ≡
          </ToolButton>

          <ToolButton
            title="Rata kiri-kanan / Justify"
            onClick={() => command('justifyFull')}
          >
            ☰
          </ToolButton>

          <span className="mx-1 h-6 w-px bg-slate-300" />

          <select
            aria-label="Format paragraf"
            defaultValue="p"
            onChange={(event) => formatBlock(event.target.value)}
            className="h-9 max-w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="p">Paragraf</option>
            <option value="h2">Judul 2</option>
            <option value="h3">Judul 3</option>
            <option value="h4">Judul 4</option>
            <option value="blockquote">Kutipan</option>
          </select>

          <ToolButton title="Daftar bernomor" onClick={() => command('insertOrderedList')}>
            1.
          </ToolButton>

          <ToolButton title="Daftar bullet" onClick={() => command('insertUnorderedList')}>
            •
          </ToolButton>

          <ToolButton title="Tautan" onClick={insertLink}>
            🔗
          </ToolButton>

          <ToolButton title="Gambar" onClick={insertImage}>
            🖼
          </ToolButton>

          <ToolButton title="Hapus format" onClick={() => command('removeFormat')}>
            Tx
          </ToolButton>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        data-placeholder={placeholder}
        className="min-h-[360px] overflow-x-auto px-4 py-4 text-[16px] leading-8 text-slate-800 outline-none sm:min-h-[420px] sm:px-5 sm:py-5 empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        Editor berita • {html.replace(/<[^>]*>/g, '').trim().length} karakter
      </div>
    </div>
  );
}
