import React, { useMemo } from 'react';

type NewsItem = {
  id?: string;
  status?: string;
  category?: string;
  publishedAt?: unknown;
};

type Props = {
  news: NewsItem[];
};

export default function NewsStatisticsPanel({ news }: Props) {
  const stats = useMemo(() => {
    const published = news.filter((item) => item.status === 'published').length;
    const drafts = news.filter((item) => item.status !== 'published').length;

    const categories = new Set(
      news.map((item) => item.category).filter(Boolean)
    ).size;

    return {
      total: news.length,
      published,
      drafts,
      categories
    };
  }, [news]);

  const cards = [
    ['Total postingan', stats.total],
    ['Diterbitkan', stats.published],
    ['Draft', stats.drafts],
    ['Kategori', stats.categories]
  ];

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Statistik</h2>
        <p className="text-sm text-slate-500">
          Ringkasan pengelolaan portal berita.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
