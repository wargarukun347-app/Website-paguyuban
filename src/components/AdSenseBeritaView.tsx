import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Info,
  Megaphone,
  RefreshCw,
  Settings2,
  TriangleAlert,
} from 'lucide-react';

const AdSenseBeritaView: React.FC = () => {
  const [publisherId, setPublisherId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedPublisher =
      localStorage.getItem('paguyuban_adsense_publisher_id') || '';
    const storedSlot =
      localStorage.getItem('paguyuban_adsense_news_slot_id') || '';

    setPublisherId(
      import.meta.env.VITE_ADSENSE_CLIENT_ID ||
        storedPublisher
    );
    setSlotId(
      import.meta.env.VITE_ADSENSE_NEWS_SLOT_ID ||
        storedSlot
    );
  }, []);

  const saveConfiguration = () => {
    localStorage.setItem(
      'paguyuban_adsense_publisher_id',
      publisherId.trim()
    );
    localStorage.setItem(
      'paguyuban_adsense_news_slot_id',
      slotId.trim()
    );
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const configured =
    publisherId.trim().startsWith('ca-pub-') &&
    slotId.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            AdSense Berita
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pengaturan dan kesiapan iklan Google AdSense untuk
          halaman berita.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-5 ${
          configured
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {configured ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          ) : (
            <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          )}

          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">
              {configured
                ? 'Konfigurasi AdSense tersedia'
                : 'AdSense belum dikonfigurasi'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {configured
                ? 'Publisher ID dan Ad Slot berita sudah terisi.'
                : 'Masukkan Publisher ID dan Ad Slot asli dari akun Google AdSense. Jangan menggunakan ID contoh.'}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-emerald-600" />
          <h2 className="font-bold text-slate-900 dark:text-white">
            Konfigurasi
          </h2>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Google AdSense Publisher ID
            </span>
            <input
              value={publisherId}
              onChange={(event) =>
                setPublisherId(event.target.value)
              }
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ad Slot Berita
            </span>
            <input
              value={slotId}
              onChange={(event) =>
                setSlotId(event.target.value)
              }
              placeholder="1234567890"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveConfiguration}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Simpan Konfigurasi
          </button>

          <button
            type="button"
            onClick={() => {
              setPublisherId('');
              setSlotId('');
              localStorage.removeItem(
                'paguyuban_adsense_publisher_id'
              );
              localStorage.removeItem(
                'paguyuban_adsense_news_slot_id'
              );
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Kosongkan
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Tersimpan
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-slate-900 dark:text-white">
            Catatan Penting
          </h2>
        </div>

        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <li>
            • Publisher ID harus berasal dari akun Google
            AdSense milik pengelola website.
          </li>
          <li>
            • Ad Slot harus dibuat dari unit iklan AdSense yang
            benar.
          </li>
          <li>
            • Menu ini tidak membuat ID AdSense palsu dan tidak
            menjamin persetujuan akun AdSense.
          </li>
          <li>
            • Untuk konfigurasi production yang lebih aman,
            gunakan environment variable
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              VITE_ADSENSE_CLIENT_ID
            </code>
            dan
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              VITE_ADSENSE_NEWS_SLOT_ID
            </code>
            .
          </li>
        </ul>
      </section>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
          <Code2 className="h-4 w-4" />
          Status implementasi
        </div>
        <p className="mt-2">
          Halaman administrasi AdSense sudah tersedia. Iklan
          tidak akan dipasang menggunakan ID palsu. Setelah
          Publisher ID dan Ad Slot asli tersedia, integrasi iklan
          dapat diaktifkan pada halaman berita.
        </p>
      </div>
    </div>
  );
};

export default AdSenseBeritaView;
