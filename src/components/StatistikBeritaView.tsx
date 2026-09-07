import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  getNewsFromFirestore,
  type NewsArticle,
} from '../lib/firestoreService';

const formatDate = (value?: Date) => {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch {
    return '-';
  }
};

const StatistikBeritaView: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNews = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getNewsFromFirestore();
      setNews(result);
    } catch (err) {
      console.error('Gagal memuat statistik berita:', err);
      setError('Statistik berita belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNews();
  }, []);

  const statistics = useMemo(() => {
    const published = news.filter(
      (article) => article.status === 'published'
    ).length;

    const draft = news.filter(
      (article) => article.status === 'draft'
    ).length;

    const categories = new Map<string, number>();

    news.forEach((article) => {
      const category = article.category?.trim() || 'Tanpa Kategori';
      categories.set(
        category,
        (categories.get(category) || 0) + 1
      );
    });

    const sortedCategories = [...categories.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    const latest = [...news]
      .sort(
        (a, b) =>
          (b.publishedAt || b.createdAt).getTime() -
          (a.publishedAt || a.createdAt).getTime()
      )
      .slice(0, 5);

    return {
      total: news.length,
      published,
      draft,
      categoryCount: categories.size,
      sortedCategories,
      latest,
    };
  }, [news]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-slate-500">
            Memuat statistik berita...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Statistik Berita
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ringkasan data berita Paguyuban dari Firestore.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadNews()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <RefreshCw className="h-4 w-4" />
          Segarkan
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {statistics.total}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Total Berita
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <span className="text-3xl font-bold text-emerald-600">
              {statistics.published}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Sudah Terbit
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <XCircle className="h-8 w-8 text-amber-600" />
            <span className="text-3xl font-bold text-amber-600">
              {statistics.draft}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Draft
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <FolderOpen className="h-8 w-8 text-violet-600" />
            <span className="text-3xl font-bold text-violet-600">
              {statistics.categoryCount}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Kategori
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 dark:text-white">
              Distribusi Kategori
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {statistics.sortedCategories.length === 0 ? (
              <p className="text-sm text-slate-500">
                Belum ada kategori berita.
              </p>
            ) : (
              statistics.sortedCategories.map(
                ([category, count]) => {
                  const percentage =
                    statistics.total > 0
                      ? Math.round(
                          (count / statistics.total) * 100
                        )
                      : 0;

                  return (
                    <div key={category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {category}
                        </span>
                        <span className="font-semibold text-slate-500">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 dark:text-white">
              Berita Terbaru
            </h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {statistics.latest.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                Belum ada berita.
              </p>
            ) : (
              statistics.latest.map((article) => (
                <div
                  key={article.id}
                  className="py-4 first:pt-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-200">
                        {article.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(
                          article.publishedAt ||
                            article.createdAt
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        article.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {article.status === 'published'
                        ? 'Terbit'
                        : 'Draft'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        Statistik ini hanya menampilkan data yang tersedia di
        Firestore. Jumlah pembaca/view tidak ditampilkan karena
        field penghitung view belum tersedia pada data berita.
      </div>
    </div>
  );
};

export default StatistikBeritaView;
