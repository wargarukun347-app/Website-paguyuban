import { saveAdminActivity } from '../lib/firestoreService';
import React, { useEffect, useState } from 'react';
import {
  DEFAULT_NEWS_PORTAL_CONFIG,
  getNewsPortalConfigFromFirestore,
  saveNewsPortalConfigToFirestore,
  subscribeToNewsPortalConfig,
  type NewsPortalThemeConfig,
} from '../lib/firestoreService';

export default function NewsThemePanel() {
  const [theme, setTheme] = useState<NewsPortalThemeConfig>(
    DEFAULT_NEWS_PORTAL_CONFIG.theme
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToNewsPortalConfig(
      (config) => {
        if (!active) return;
        setTheme(config.theme);
        setLoading(false);
      },
      (error) => {
        console.error('Gagal memantau tema berita:', error);
        if (active) {
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateTheme = <K extends keyof NewsPortalThemeConfig>(
    key: K,
    value: NewsPortalThemeConfig[K]
  ) => {
    setTheme((prev) => ({
      ...prev,
      [key]: value,
    }));
    setMessage('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');

    try {
      const current = await getNewsPortalConfigFromFirestore();

      await saveNewsPortalConfigToFirestore({
        ...current,
        theme,
      });

      await saveAdminActivity({
        action: 'Tema berita diperbarui',
        detail: 'Konfigurasi tema berita disimpan.',
        module: 'Berita',
      });

      setMessage('Tema berita berhasil disimpan dan tersinkron.');
    } catch (error) {
      console.error('Gagal menyimpan tema berita:', error);
      setMessage('Tema gagal disimpan. Periksa login admin dan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Memuat pengaturan tema...</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Tema</h2>
        <p className="text-sm text-slate-500">
          Atur tampilan kartu dan informasi artikel portal berita.
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            Tampilan kartu berita
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Gaya kartu
              </span>
              <select
                value={theme.cardStyle}
                onChange={(event) =>
                  updateTheme(
                    'cardStyle',
                    event.target.value as NewsPortalThemeConfig['cardStyle']
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="overlay">
                  Foto + teks overlay
                </option>
                <option value="standard">
                  Foto + teks di bawah
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Kepadatan kartu
              </span>
              <select
                value={theme.cardDensity}
                onChange={(event) =>
                  updateTheme(
                    'cardDensity',
                    event.target.value as NewsPortalThemeConfig['cardDensity']
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="comfortable">Nyaman</option>
                <option value="compact">Ringkas</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            Informasi pada kartu
          </h3>

          <div className="mt-4 space-y-3">
            {[
              ['showCategory', 'Tampilkan kategori'],
              ['showAuthor', 'Tampilkan penulis'],
              ['showDate', 'Tampilkan tanggal'],
            ].map(([key, label]) => {
              const typedKey = key as keyof NewsPortalThemeConfig;

              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(theme[typedKey])}
                    onChange={(event) =>
                      updateTheme(
                        typedKey,
                        event.target.checked as never
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Tema'}
          </button>

          {message && (
            <span className="text-sm font-medium text-slate-600">
              {message}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
