import React from 'react';

export default function NewsThemePanel() {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Tema</h2>
        <p className="text-sm text-slate-500">
          Pengaturan visual portal berita.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Tata letak</h3>
          <p className="mt-1 text-sm text-slate-500">
            Tampilan portal berita responsif untuk HP dan desktop.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Gaya artikel</h3>
          <p className="mt-1 text-sm text-slate-500">
            Kartu berita, gambar utama, judul, kategori, tanggal, dan penulis.
          </p>
        </div>
      </div>
    </section>
  );
}
