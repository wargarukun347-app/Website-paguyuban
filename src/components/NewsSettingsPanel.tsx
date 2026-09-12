import { saveAdminActivity } from '../lib/firestoreService';
import React, { useEffect, useState } from 'react';
import {
  DEFAULT_NEWS_PORTAL_CONFIG,
  getNewsPortalConfigFromFirestore,
  saveNewsPortalConfigToFirestore,
  subscribeToNewsPortalConfig,
  type NewsPortalSettingsConfig,
} from '../lib/firestoreService';

export default function NewsSettingsPanel() {
  const [settings, setSettings] = useState<NewsPortalSettingsConfig>(
    DEFAULT_NEWS_PORTAL_CONFIG.settings
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToNewsPortalConfig(
      (config) => {
        if (!active) return;
        setSettings(config.settings);
        setLoading(false);
      },
      (error) => {
        console.error('Gagal memantau setelan berita:', error);
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

  const update = <K extends keyof NewsPortalSettingsConfig>(
    key: K,
    value: NewsPortalSettingsConfig[K]
  ) => {
    setSettings((prev) => ({
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
        settings,
      });

      await saveAdminActivity({
        action: 'Setelan berita diperbarui',
        detail: 'Setelan portal berita disimpan.',
        module: 'Berita',
      });

      setMessage('Setelan berita berhasil disimpan dan tersinkron.');
    } catch (error) {
      console.error('Gagal menyimpan setelan berita:', error);
      setMessage('Setelan gagal disimpan. Periksa login admin dan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Memuat setelan berita...</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Setelan</h2>
        <p className="text-sm text-slate-500">
          Pengaturan umum publikasi, penulis, dan SEO portal berita.
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            Publikasi berita
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Penulis publik
              </span>
              <input
                value={settings.publicAuthor}
                onChange={(event) =>
                  update('publicAuthor', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Kategori default
              </span>
              <input
                value={settings.defaultCategory}
                onChange={(event) =>
                  update('defaultCategory', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">SEO portal berita</h3>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Judul SEO
              </span>
              <input
                value={settings.seoTitle}
                onChange={(event) =>
                  update('seoTitle', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Meta description
              </span>
              <textarea
                value={settings.metaDescription}
                onChange={(event) =>
                  update('metaDescription', event.target.value)
                }
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Focus keyword
              </span>
              <input
                value={settings.focusKeyword}
                onChange={(event) =>
                  update('focusKeyword', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Setelan'}
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
