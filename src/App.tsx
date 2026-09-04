import { useEffect, useState } from "react";
import "./App.css";
import {
  getPublishedNews,
  searchPublishedNews,
} from "./lib/newsService";

type News = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featured_image?: string | null;
  published_at?: string | null;
};

type Page =
  | "home"
  | "news"
  | "about"
  | "contact"
  | "privacy"
  | "disclaimer"
  | "terms";

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(new Date(value));
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [news, setNews] = useState<News[]>([]);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadNews(query = "") {
    setLoading(true);

    const result = query.trim()
      ? await searchPublishedNews(query)
      : await getPublishedNews();

    if (!result.error) {
      setNews((result.data ?? []) as News[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  function navigate(next: Page) {
    setSelectedNews(null);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNews(item: News) {
    setSelectedNews(item);
    setPage("news");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark">P</span>
            <span>
              <strong>Paguyuban Arisan Bani P3N</strong>
              <small>Portal Informasi & Berita</small>
            </span>
          </button>

          <nav>
            <button onClick={() => navigate("home")}>Beranda</button>
            <button onClick={() => navigate("news")}>Berita</button>
            <button onClick={() => navigate("about")}>Tentang</button>
            <button onClick={() => navigate("contact")}>Kontak</button>
          </nav>
        </div>
      </header>

      <main>
        {page === "home" && (
          <>
            <section className="hero-section">
              <div className="container hero-content">
                <div>
                  <span className="eyebrow">SELAMAT DATANG</span>
                  <h1>
                    Paguyuban Arisan
                    <br />
                    <span>Bani P3N</span>
                  </h1>
                  <p>
                    Wadah informasi, komunikasi, silaturahmi, dan kegiatan
                    bersama keluarga besar Paguyuban Arisan Bani P3N.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() => navigate("news")}
                    >
                      Baca Berita
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => navigate("about")}
                    >
                      Tentang Paguyuban
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">INFORMASI TERBARU</span>
                    <h2>Berita Paguyuban</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("news")}
                  >
                    Lihat semua →
                  </button>
                </div>

                <NewsGrid
                  news={news.slice(0, 6)}
                  loading={loading}
                  onOpen={openNews}
                />
              </div>
            </section>
          </>
        )}

        {page === "news" && (
          <section className="section page-section">
            <div className="container">
              {selectedNews ? (
                <article className="article">
                  <button
                    className="back-button"
                    onClick={() => setSelectedNews(null)}
                  >
                    ← Kembali ke berita
                  </button>

                  {selectedNews.featured_image && (
                    <img
                      className="article-image"
                      src={selectedNews.featured_image}
                      alt={selectedNews.title}
                    />
                  )}

                  <span className="eyebrow">BERITA PAGUYUBAN</span>
                  <h1>{selectedNews.title}</h1>
                  <div className="article-date">
                    {formatDate(selectedNews.published_at)}
                  </div>

                  {selectedNews.excerpt && (
                    <p className="article-excerpt">
                      {selectedNews.excerpt}
                    </p>
                  )}

                  <div
                    className="article-content"
                    dangerouslySetInnerHTML={{
                      __html: selectedNews.content,
                    }}
                  />
                </article>
              ) : (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">PUBLIKASI</span>
                      <h1>Berita Paguyuban</h1>
                    </div>
                  </div>

                  <form
                    className="search-box"
                    onSubmit={(event) => {
                      event.preventDefault();
                      loadNews(search);
                    }}
                  >
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari berita..."
                    />
                    <button className="primary-button" type="submit">
                      Cari
                    </button>
                  </form>

                  <NewsGrid
                    news={news}
                    loading={loading}
                    onOpen={openNews}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {page === "about" && (
          <InfoPage
            title="Tentang Paguyuban"
            eyebrow="TENTANG KAMI"
          >
            <p>
              Paguyuban Arisan Bani P3N merupakan wadah kebersamaan untuk
              mempererat silaturahmi, berbagi informasi, serta mendukung
              kegiatan positif anggota dan keluarga besar paguyuban.
            </p>
          </InfoPage>
        )}

        {page === "contact" && (
          <InfoPage title="Kontak" eyebrow="HUBUNGI KAMI">
            <p>
              Untuk informasi kegiatan dan komunikasi dengan pengurus
              paguyuban, silakan gunakan kanal komunikasi resmi yang telah
              disediakan oleh pengurus.
            </p>
          </InfoPage>
        )}

        {page === "privacy" && (
          <InfoPage title="Kebijakan Privasi" eyebrow="LEGAL">
            <p>
              Website ini menghargai privasi pengunjung. Informasi yang
              dikumpulkan digunakan hanya untuk menjalankan layanan dan
              meningkatkan pengalaman pengguna.
            </p>
          </InfoPage>
        )}

        {page === "disclaimer" && (
          <InfoPage title="Disclaimer" eyebrow="LEGAL">
            <p>
              Informasi pada website ini disediakan untuk tujuan informasi
              umum. Pengelola berupaya menjaga keakuratan informasi namun
              tidak menjamin seluruh informasi selalu bebas dari kesalahan.
            </p>
          </InfoPage>
        )}

        {page === "terms" && (
          <InfoPage title="Syarat & Ketentuan" eyebrow="LEGAL">
            <p>
              Dengan menggunakan website ini, pengunjung menyetujui penggunaan
              website sesuai hukum yang berlaku dan tidak menyalahgunakan
              layanan maupun konten yang tersedia.
            </p>
          </InfoPage>
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <strong>Paguyuban Arisan Bani P3N</strong>
            <p>Portal informasi dan silaturahmi keluarga besar paguyuban.</p>
          </div>

          <div className="footer-links">
            <button onClick={() => navigate("privacy")}>Privasi</button>
            <button onClick={() => navigate("disclaimer")}>
              Disclaimer
            </button>
            <button onClick={() => navigate("terms")}>
              Syarat & Ketentuan
            </button>
          </div>
        </div>

        <div className="container copyright">
          © {new Date().getFullYear()} Paguyuban Arisan Bani P3N.
        </div>
      </footer>
    </div>
  );
}

function NewsGrid({
  news,
  loading,
  onOpen,
}: {
  news: News[];
  loading: boolean;
  onOpen: (news: News) => void;
}) {
  if (loading) {
    return <div className="empty-state">Memuat berita...</div>;
  }

  if (!news.length) {
    return (
      <div className="empty-state">
        Belum ada berita yang dipublikasikan.
      </div>
    );
  }

  return (
    <div className="news-grid">
      {news.map((item) => (
        <article className="news-card" key={item.id}>
          {item.featured_image ? (
            <img src={item.featured_image} alt={item.title} />
          ) : (
            <div className="news-placeholder">P3N</div>
          )}

          <div className="news-card-body">
            <div className="news-date">
              {formatDate(item.published_at)}
            </div>

            <h3>{item.title}</h3>

            {item.excerpt && <p>{item.excerpt}</p>}

            <button
              className="text-button"
              onClick={() => onOpen(item)}
            >
              Baca selengkapnya →
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function InfoPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section page-section">
      <div className="container content-page">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <div className="content-text">{children}</div>
      </div>
    </section>
  );
}

export default App;
