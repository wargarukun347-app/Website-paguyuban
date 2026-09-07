import React from 'react';

type Comment = {
  id?: string;
  userName?: string;
  comment?: string;
  createdAt?: unknown;
};

type Props = {
  comments?: Comment[];
};

export default function NewsCommentsPanel({
  comments = []
}: Props) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Komentar</h2>
        <p className="text-sm text-slate-500">
          Kelola komentar pembaca berita.
        </p>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium text-slate-700">Belum ada komentar</p>
          <p className="mt-1 text-sm text-slate-500">
            Komentar pembaca akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-slate-900">
                {item.userName || 'Pengunjung'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {item.comment}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
