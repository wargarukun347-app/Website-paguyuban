import React from 'react';

export default function NewsSettingsPanel() {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Setelan</h2>
        <p className="text-sm text-slate-500">
          Pengaturan umum publikasi berita dan integrasi monetisasi.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Penulis publik</h3>
          <p className="mt-1 text-sm text-slate-600">
            Kresno Gadhing Pramudhyo
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">AdSense Berita</h3>
          <p className="mt-1 text-sm text-slate-500">
            Pengaturan AdSense tetap dikelola administrator dan tidak
            menampilkan iklan sampai ID AdSense yang valid dikonfigurasi.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">SEO</h3>
          <p className="mt-1 text-sm text-slate-500">
            Judul SEO, meta description, focus keyword, slug, alt text,
            dan fact-check tetap tersedia pada postingan.
          </p>
        </div>
      </div>
    </section>
  );
}
