import { useEffect, useState } from "react";
import { deleteNews, getAdminNews, NewsRecord } from "../../lib/newsService";
import NewsForm from "./NewsForm";

export default function Dashboard() {
  const [items, setItems] = useState<NewsRecord[]>([]);
  const [editing, setEditing] = useState<NewsRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const result = await getAdminNews();
    if (result.error) setError(result.error.message || "Gagal memuat berita.");
    else setItems((result.data ?? []) as NewsRecord[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!window.confirm("Hapus berita ini? Tindakan ini tidak dapat dibatalkan.")) return;
    const result = await deleteNews(id);
    if (result.error) setError(result.error.message || "Gagal menghapus berita.");
    else await load();
  }

  if (creating || editing) {
    return <NewsForm news={editing} onSaved={() => { setCreating(false); setEditing(null); load(); }} onCancel={() => { setCreating(false); setEditing(null); }} />;
  }

  return <div className="admin-panel">
    <div className="admin-toolbar"><div><span className="eyebrow">ADMIN</span><h1>Kelola Berita</h1><p>Kelola draft dan berita yang sudah dipublikasikan.</p></div><button className="primary-button" onClick={() => setCreating(true)}>+ Berita baru</button></div>
    {error && <div className="form-error">{error}</div>}
    {loading ? <div className="empty-state">Memuat data berita...</div> : !items.length ? <div className="empty-state">Belum ada berita. Buat berita pertama Anda.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Judul</th><th>Kategori</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.slug}</small></td><td>{item.category || "—"}</td><td><span className={`status-badge ${item.status}`}>{item.status === "published" ? "Published" : "Draft"}</span></td><td>{item.created_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at)) : "—"}</td><td className="admin-actions"><button className="text-button" onClick={() => setEditing(item)}>Edit</button><button className="danger-button" onClick={() => remove(item.id)}>Hapus</button></td></tr>)}</tbody></table></div>}
  </div>;
}
