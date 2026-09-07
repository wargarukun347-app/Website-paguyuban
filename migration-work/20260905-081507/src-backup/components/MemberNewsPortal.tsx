import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPublishedNewsFromFirestore,
  type NewsArticle,
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
  author: article.authorName,
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
    if (activeTab !== 'paguyuban') {
      void loadInternetNews();
    }
  }, [activeTab, loadInternetNews]);

  const renderPaguyubanNews = () => {
    if (loadingPaguyuban) {
      return (
        <div className="py-12 text-center text-sm text-gray-500">
          Memuat berita paguyuban...
        </div>
      );
    }

    if (errorPaguyuban) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Belum ada berita Paguyuban
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Berita yang diterbitkan Admin akan otomatis
            tampil di sini.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {paguyubanNews.map((item) => {
          const title = cleanText(item.title);
          const description = cleanText(
            item.excerpt || item.content
          );

          const detailPath =
            `/berita/${encodeURIComponent(
              item.slug || item.id
            )}`;

          return (
            <article
              key={item.id}
              className="flex gap-4 py-6 first:pt-2"
            >
              {item.imageUrl ? (
                <a
                  href={detailPath}
                  className="block w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-48"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.altText || title}
                    className="h-24 w-full object-cover sm:h-32"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="hidden w-32 shrink-0 rounded-lg bg-gray-100 sm:block sm:w-48" />
              )}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-blue-600">
                    {item.category || 'Paguyuban'}
                  </span>

                  {(item.publishedAt || item.createdAt) && (
                    <>
                      <span>•</span>
                      <span>
                        {formatDate(
                          item.publishedAt ||
                            item.createdAt
                        )}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-lg font-bold leading-7 text-gray-900 sm:text-xl">
                  <a
                    href={detailPath}
                    className="transition-colors hover:text-blue-600"
                  >
                    {title}
                  </a>
                </h2>

                {description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                    {description}
                  </p>
                )}

                {item.authorName && (
                  <p className="mt-2 text-xs text-gray-500">
                    Oleh {item.authorName}
                  </p>
                )}

                <a
                  href={detailPath}
                  className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
                >
                  Baca berita selengkapnya →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderInternetNews = () => {
    if (loadingInternet) {
      return (
        <div className="py-12 text-center text-sm text-gray-500">
          Memuat berita terbaru...
        </div>
      );
    }

    if (errorInternet) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <div className="py-12 text-center text-sm text-gray-500">
          Belum ada berita yang dapat ditampilkan.
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200">
        {internetNews.map((item, index) => {
          const title = cleanText(item.title);
          const description = cleanText(item.description);

          return (
            <article
              key={`${item.link}-${index}`}
              className="flex gap-4 py-6 first:pt-2"
            >
              {item.image ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-48"
                >
                  <img
                    src={item.image}
                    alt={title}
                    className="h-24 w-full object-cover sm:h-32"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="hidden w-32 shrink-0 rounded-lg bg-gray-100 sm:block sm:w-48" />
              )}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-blue-600">
                    {selectedCategory.label}
                  </span>

                  {item.pubDate && (
                    <>
                      <span>•</span>
                      <span>{formatDate(item.pubDate)}</span>
                    </>
                  )}
                </div>

                <h2 className="text-lg font-bold leading-7 text-gray-900 sm:text-xl">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-blue-600"
                  >
                    {title}
                  </a>
                </h2>

                {description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                    {description}
                  </p>
                )}

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
                >
                  Baca berita selengkapnya →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Berita dan Informasi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Berita Paguyuban dan informasi terkini dari
          berbagai kategori.
        </p>
      </div>

      <div className="overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('paguyuban')}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'paguyuban'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
            }`}
          >
            Berita Paguyuban
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveTab(category.id)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                activeTab === category.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'paguyuban'
        ? renderPaguyubanNews()
        : renderInternetNews()}
    </div>
  );
};

export default MemberNewsPortal;
