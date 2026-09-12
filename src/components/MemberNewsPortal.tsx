import '../styles/news-xapify.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PUBLIC_NEWS_AUTHOR } from '../lib/newsConstants';
import {
  DEFAULT_NEWS_PORTAL_CONFIG,
  getPublishedNewsFromFirestore,
  subscribeToNewsPortalConfig,
  type NewsArticle,
  type NewsPortalThemeConfig,
} from '../lib/firestoreService';

interface NewsItem {
  title: string;
  description?: string;
  image?: string;
  link: string;
  pubDate?: string;
  author?: string;
}

interface ApiResponse {
  data?: NewsItem[];
}

const API_BASE = '/api/member-news';

const categories = [
  { id: 'terkini', label: 'Terkini', source: 'antara', category: 'terkini' },
  { id: 'viral', label: 'Viral', source: 'antara', category: 'viral' },
  { id: 'nasional', label: 'Nasional', source: 'antara', category: 'nasional' },
  { id: 'internasional', label: 'Internasional', source: 'antara', category: 'dunia' },
  { id: 'politik', label: 'Politik', source: 'antara', category: 'politik' },
  { id: 'ekonomi', label: 'Ekonomi', source: 'antara', category: 'ekonomi' },
  { id: 'olahraga', label: 'Olahraga', source: 'antara', category: 'olahraga' },
  { id: 'teknologi', label: 'Teknologi', source: 'antara', category: 'teknologi' },
  { id: 'hiburan', label: 'Hiburan', source: 'antara', category: 'hiburan' },
  { id: 'kesehatan', label: 'Kesehatan', source: 'antara', category: 'kesehatan' },
  { id: 'lifestyle', label: 'Lifestyle', source: 'antara', category: 'lifestyle' },
  { id: 'otomotif', label: 'Otomotif', source: 'antara', category: 'otomotif' },
  { id: 'hukum', label: 'Hukum', source: 'antara', category: 'hukum' },
  {
    id: 'kemenag',
    label: 'Kemenag Provinsi seluruh Indonesia',
    source: 'kemenag',
    category: 'kemenag',
  },
] as const;

type CategoryId = (typeof categories)[number]['id'];
type PortalTab = 'paguyuban' | CategoryId;

const formatDate = (value?: string | Date) => {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const cleanText = (value?: string) => {
  if (!value) return '';

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getApiUrl = (_source: string, category: string) =>
  `${API_BASE}?category=${encodeURIComponent(category)}`;

const mapFirestoreNews = (article: NewsArticle): NewsItem => ({
  title: article.title,
  description:
    article.excerpt ||
    cleanText(article.content).slice(0, 220),
  image: article.imageUrl,
  link: `/berita/${encodeURIComponent(
    article.slug || article.id
  )}`,
  pubDate: formatDate(article.publishedAt || article.createdAt),
  author: PUBLIC_NEWS_AUTHOR,
});

export const MemberNewsPortal: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<PortalTab>('paguyuban');

  const [internetNews, setInternetNews] =
    useState<NewsItem[]>([]);

  const [paguyubanNews, setPaguyubanNews] =
    useState<NewsArticle[]>([]);

  const [loadingInternet, setLoadingInternet] =
    useState(false);

  const [loadingPaguyuban, setLoadingPaguyuban] =
    useState(true);

  const [errorInternet, setErrorInternet] =
    useState('');

  const [errorPaguyuban, setErrorPaguyuban] =
    useState('');

  const [newsTheme, setNewsTheme] = useState<NewsPortalThemeConfig>(
    DEFAULT_NEWS_PORTAL_CONFIG.theme
  );

  const selectedCategory = useMemo(
    () =>
      categories.find((item) => item.id === activeTab) ||
      categories[0],
    [activeTab]
  );

  const loadPaguyubanNews = useCallback(async () => {
    setLoadingPaguyuban(true);
    setErrorPaguyuban('');

    try {
      const result = await getPublishedNewsFromFirestore();
      setPaguyubanNews(result);
    } catch (err) {
      console.error(
        'Gagal memuat berita paguyuban:',
        err
      );
      setPaguyubanNews([]);
      setErrorPaguyuban(
        'Berita Paguyuban belum dapat dimuat. Silakan coba lagi.'
      );
    } finally {
      setLoadingPaguyuban(false);
    }
  }, []);

  const loadInternetNews = useCallback(async () => {
    setLoadingInternet(true);
    setErrorInternet('');

    try {
      const response = await fetch(
        getApiUrl(
          selectedCategory.source,
          selectedCategory.category
        )
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse;

      const items = Array.isArray(result.data)
        ? result.data
        : [];

      setInternetNews(items);
    } catch (err) {
      console.error(
        'Gagal memuat berita umum:',
        err
      );
      setInternetNews([]);
      setErrorInternet(
        'Berita internet belum dapat dimuat. Silakan coba lagi.'
      );
    } finally {
      setLoadingInternet(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    void loadPaguyubanNews();
  }, [loadPaguyubanNews]);

  useEffect(() => {
    const unsubscribe = subscribeToNewsPortalConfig(
      (config) => {
        setNewsTheme(config.theme);
      },
      (error) => {
        console.warn(
          'News theme realtime tidak tersedia, menggunakan tema default:',
          error
        );
        setNewsTheme(DEFAULT_NEWS_PORTAL_CONFIG.theme);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'paguyuban') {
      void loadInternetNews();
    }
  }, [activeTab, loadInternetNews]);

  const renderPaguyubanNews = () => {
    if (loadingPaguyuban) {
      return (
        <div className="news-loading">
          Memuat berita paguyuban...
        </div>
      );
    }

    if (errorPaguyuban) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorPaguyuban}
          <button
            type="button"
            onClick={() => void loadPaguyubanNews()}
            className="ml-2 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      );
    }

    if (paguyubanNews.length === 0) {
      return (
        <div className="news-empty">
          <h2>Belum ada berita Paguyuban</h2>
          <p>Berita yang diterbitkan Admin akan otomatis tampil di sini.</p>
        </div>
      );
    }

    const featured = paguyubanNews[0];
    const rest = paguyubanNews.slice(1);

    const featuredTitle = cleanText(featured.title);
    const featuredDescription = cleanText(
      featured.excerpt || featured.content
    );
    const featuredPath = `/berita/${encodeURIComponent(
      featured.slug || featured.id
    )}`;

    return (
      <div className="news-xapify">
        <article className="news-featured">
          <a href={featuredPath} className="news-featured-image">
            {featured.imageUrl ? (
              <img
                src={featured.imageUrl}
                alt={featured.altText || featuredTitle}
                loading="eager"
              />
            ) : (
              <div className="news-image-empty" />
            )}
          </a>

          <div className="news-featured-content">
            <span className="news-category">
              {featured.category || 'Paguyuban'}
            </span>

            <h2 className="news-featured-title">
              <a href={featuredPath}>{featuredTitle}</a>
            </h2>

            <div className="news-featured-meta">
              {featured.publishedAt || featured.createdAt
                ? formatDate(featured.publishedAt || featured.createdAt)
                : ''}
              {featured.publishedAt || featured.createdAt ? ' • ' : ''}
              Oleh {PUBLIC_NEWS_AUTHOR}
            </div>

            {featuredDescription && (
              <p className="news-featured-excerpt">
                {featuredDescription}
              </p>
            )}

            <a href={featuredPath} className="news-read-more">
              Baca selengkapnya →
            </a>
          </div>
        </article>

        {rest.length > 0 && (
          <div className="news-grid">
            {rest.map((item) => {
              const title = cleanText(item.title);
              const description = cleanText(
                item.excerpt || item.content
              );
              const detailPath = `/berita/${encodeURIComponent(
                item.slug || item.id
              )}`;

              return (
                <article
                  key={item.id}
                  className={[
                    'news-card',
                    newsTheme.cardStyle === 'overlay'
                      ? 'news-card-overlay'
                      : 'news-card-standard',
                    newsTheme.cardDensity === 'compact'
                      ? 'news-card-density-compact'
                      : 'news-card-density-comfortable',
                  ].join(' ')}
                >
                  <a href={detailPath} className="news-card-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.altText || title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="news-image-empty" />
                    )}
                  </a>

                  <div className="news-card-content">
                    {newsTheme.showCategory && (
                      <span className="news-category">
                        {item.category || 'Paguyuban'}
                      </span>
                    )}

                    <h2 className="news-card-title">
                      <a href={detailPath}>{title}</a>
                    </h2>

                    {(newsTheme.showDate || newsTheme.showAuthor) && (
                      <div className="news-card-meta">
                        {newsTheme.showDate &&
                        (item.publishedAt || item.createdAt)
                          ? formatDate(item.publishedAt || item.createdAt)
                          : ''}
                        {newsTheme.showDate &&
                        (item.publishedAt || item.createdAt) &&
                        newsTheme.showAuthor
                          ? ' • '
                          : ''}
                        {newsTheme.showAuthor
                          ? `Oleh ${PUBLIC_NEWS_AUTHOR}`
                          : ''}
                      </div>
                    )}

                    {description && (
                      <p className="news-card-excerpt">
                        {description}
                      </p>
                    )}

                    <a href={detailPath} className="news-read-more">
                      Baca selengkapnya →
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderInternetNews = () => {
    if (loadingInternet) {
      return (
        <div className="news-loading">
          Memuat berita terbaru...
        </div>
      );
    }

    if (errorInternet) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {errorInternet}
          <button
            type="button"
            onClick={() => void loadInternetNews()}
            className="ml-2 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      );
    }

    if (internetNews.length === 0) {
      return (
        <div className="news-empty">
          <h2>Belum ada berita yang dapat ditampilkan</h2>
          <p>Berita terbaru belum tersedia.</p>
        </div>
      );
    }

    const featured = internetNews[0];
    const rest = internetNews.slice(1);

    const featuredTitle = cleanText(featured.title);
    const featuredDescription = cleanText(featured.description);

    return (
      <div className="news-xapify">
        <article className="news-featured">
          <a
            href={featured.link}
            target="_blank"
            rel="noopener noreferrer"
            className="news-featured-image"
          >
            {featured.image ? (
              <img
                src={featured.image}
                alt={featuredTitle}
                loading="eager"
              />
            ) : (
              <div className="news-image-empty" />
            )}
          </a>

          <div className="news-featured-content">
            <span className="news-category">
              {selectedCategory.label}
            </span>

            <h2 className="news-featured-title">
              <a
                href={featured.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {featuredTitle}
              </a>
            </h2>

            <div className="news-featured-meta">
              {featured.pubDate ? formatDate(featured.pubDate) : ''}
              {featured.pubDate ? ' • ' : ''}
              Oleh {PUBLIC_NEWS_AUTHOR}
            </div>

            {featuredDescription && (
              <p className="news-featured-excerpt">
                {featuredDescription}
              </p>
            )}

            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-read-more"
            >
              Baca selengkapnya →
            </a>
          </div>
        </article>

        {rest.length > 0 && (
          <div className="news-grid">
            {rest.map((item, index) => {
              const title = cleanText(item.title);
              const description = cleanText(item.description);

              return (
                <article
                  key={`${item.link}-${index}`}
                  className={[
                    'news-card',
                    newsTheme.cardStyle === 'overlay'
                      ? 'news-card-overlay'
                      : 'news-card-standard',
                    newsTheme.cardDensity === 'compact'
                      ? 'news-card-density-compact'
                      : 'news-card-density-comfortable',
                  ].join(' ')}
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-card-image"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="news-image-empty" />
                    )}
                  </a>

                  <div className="news-card-content">
                    {newsTheme.showCategory && (
                      <span className="news-category">
                        {selectedCategory.label}
                      </span>
                    )}

                    <h2 className="news-card-title">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {title}
                      </a>
                    </h2>

                    {(newsTheme.showDate || newsTheme.showAuthor) && (
                      <div className="news-card-meta">
                        {newsTheme.showDate && item.pubDate
                          ? formatDate(item.pubDate)
                          : ''}
                        {newsTheme.showDate &&
                        item.pubDate &&
                        newsTheme.showAuthor
                          ? ' • '
                          : ''}
                        {newsTheme.showAuthor
                          ? `Oleh ${PUBLIC_NEWS_AUTHOR}`
                          : ''}
                      </div>
                    )}

                    {description && (
                      <p className="news-card-excerpt">
                        {description}
                      </p>
                    )}

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-read-more"
                    >
                      Baca selengkapnya →
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="news-container">
      <header className="news-site-header">
        <div className="news-header-inner">
          <a
            href="/anggota/berita"
            className="news-brand"
            onClick={(event) => {
              event.preventDefault();
              window.history.pushState({}, "", "/anggota/berita");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            <span
              className="news-brand-text"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "4px",
              }}
            >
              <img
                src="https://p84.cooltext.com/Rendered/Cool%20Text%20-%20NEWS%20SERVER%20515232448207319.png"
                alt="NEWS SERVER"
                style={{
                  display: "block",
                  width: "min(260px, 58vw)",
                  height: "auto",
                  maxHeight: "78px",
                  objectFit: "contain",
                }}
              />
              <img
                src="https://r72.cooltext.com/rendered/cooltext515232361625641.png"
                alt="Berita Informasi Masa Kini"
                style={{
                  display: "block",
                  width: "min(220px, 48vw)",
                  height: "auto",
                  maxHeight: "48px",
                  objectFit: "contain",
                }}
              />
            </span>
          </a>

          <nav className="news-top-nav" aria-label="Navigasi berita">
            <a className="active" href="/anggota/berita">
              Berita
            </a>
            <a
              href="/anggota/jadwal-sholat"
              onClick={(event) => {
                event.preventDefault();
                window.history.pushState({}, "", "/anggota/jadwal-sholat");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              Jadwal Sholat
            </a>
          </nav>
        </div>
      </header>

      <div className="news-breadcrumb">
        <strong>Berita Informasi Masa Kini</strong>
      </div>

      <section className="news-category-bar">
        <div className="news-category-scroll">
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={activeTab === category.id ? "active" : ""}
              onClick={() => setActiveTab(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <main className="news-layout">
        <section className="news-main">
          {activeTab === "paguyuban"
            ? renderPaguyubanNews()
            : renderInternetNews()}
        </section>

        <aside className="news-sidebar">
          <section className="news-widget">
            <h3>Tentang News Server</h3>
            <p>
              Berita Informasi Masa Kini.
              Dapatkan informasi kegiatan, pengumuman, dan berita terkini.
            </p>
          </section>

          {activeTab === "paguyuban" && paguyubanNews.length > 0 && (
            <section className="news-widget">
              <h3>Berita Terbaru</h3>
              <div className="news-widget-news">
                {paguyubanNews.slice(0, 4).map((item) => (
                  <a key={item.link} href={item.link}>
                    <strong>{cleanText(item.title)}</strong>
                    <span>
                      {item.pubDate ? formatDate(item.pubDate) : ""}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </main>

      <footer className="news-site-footer">
        <span>Berita Informasi Masa Kini.</span>
      </footer>
    </div>
  )

};

export default MemberNewsPortal;
