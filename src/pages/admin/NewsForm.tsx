import { FormEvent, useEffect, useState } from "react";
import { createNews, NewsRecord, updateNews } from "../../lib/newsService";

type Props = { news: NewsRecord | null; onSaved: () => void; onCancel: () => void };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function NewsForm({ news, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(news?.title ?? "");
  const [slug, setSlug] = useState(news?.slug ?? "");
  const [excerpt, setExcerpt] = useState(news?.excerpt ?? "");
  const [content, setContent] = useState(news?.content ?? "");
  const [image, setImage] = useState(news?.featured_image ?? "");
  const [category, setCategory] = useState(news?.category ?? "Umum");
  const [seoTitle, setSeoTitle] = useState(news?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(news?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState(news?.seo_keywords ?? "");
  const [status, setStatus] = useState<"draft" | "published">(news?.status ?? "draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!news && title && !slug) setSlug(slugify(title)); }, [news, title, slug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const payload = {
      title: title.trim(), slug: slugify(slug || title), excerpt: excerpt.trim() || null, content,
      featured_image: image.trim() || null, category: category.trim() || null,
      seo_title: seoTitle.trim() || null, seo_description: seoDescription.trim() || null,
      seo_keywords: seoKeywords.trim() || null, status,
      author_id: news?.author_id ?? null,
      published_at: status === "published" ? news?.published_at ?? new Date().toISOString() : null,
    };
    const result = news ? await updateNews(news.id, payload) : await createNews(payload);
    if (result.error) setError(result.error.message || "Gagal menyimpan berita."); else onSaved();
    setLoading(false);
  }

  return <form className="admin-form" onSubmit={handleSubmit}>
    <div className="admin-form-header"><div><span className="eyebrow">CMS BERITA</span><h2>{news ? "Edit berita" : "Berita baru"}</h2></div><button type="button" className="secondary-button" onClick={onCancel}>Batal</button></div>
    <label>Judul<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
    <label>Slug<input value={slug} onChange={e => setSlug(e.target.value)} required /></label>
    <label>Ringkasan<textarea rows={3} value={excerpt} onChange={e => setExcerpt(e.target.value)} /></label>
    <label>Isi berita<textarea rows={12} value={content} onChange={e => setContent(e.target.value)} required placeholder="HTML sederhana diperbolehkan." /></label>
    <label>URL gambar utama<input type="url" value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." /></label>
    <div className="admin-form-grid"><label>Kategori<input value={category} onChange={e => setCategory(e.target.value)} /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value as "draft" | "published")}><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
    <details className="seo-box"><summary>SEO</summary><label>SEO title<input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} /></label><label>SEO description<textarea rows={3} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} /></label><label>SEO keywords<input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="paguyuban, berita, P3N" /></label></details>
    {error && <div className="form-error">{error}</div>}
    <button className="primary-button" disabled={loading} type="submit">{loading ? "Menyimpan..." : news ? "Simpan perubahan" : "Simpan berita"}</button>
  </form>;
}
