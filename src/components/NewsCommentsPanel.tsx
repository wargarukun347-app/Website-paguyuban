import { saveAdminActivity } from '../lib/firestoreService';
import React, { useState } from 'react';
import {
  deleteNewsCommentFromFirestore,
  moderateNewsComment,
  type NewsComment,
} from '../lib/firestoreService';

type Props = {
  comments?: NewsComment[];
  onChanged?: () => void | Promise<void>;
};

export default function NewsCommentsPanel({
  comments = [],
  onChanged,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const moderate = async (
    id: string,
    status: 'pending' | 'approved' | 'hidden'
  ) => {
    setBusyId(id);

    try {
      await moderateNewsComment(id, status);

      await saveAdminActivity({
        action: 'Komentar diperbarui',
        detail: `Komentar ${id} diubah menjadi ${status}.`,
        module: 'Berita',
      });

      await onChanged?.();
    } catch (error) {
      console.error('Gagal memoderasi komentar:', error);
      window.alert('Komentar gagal diperbarui.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Hapus komentar ini secara permanen?')) {
      return;
    }

    setBusyId(id);

    try {
      await deleteNewsCommentFromFirestore(id);

      await saveAdminActivity({
        action: 'Komentar dihapus',
        detail: `Komentar ${id} dihapus oleh admin.`,
        module: 'Berita',
      });

      await onChanged?.();
    } catch (error) {
      console.error('Gagal menghapus komentar:', error);
      window.alert('Komentar gagal dihapus.');
    } finally {
      setBusyId(null);
    }
  };

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
          {comments.map((item) => {
            const status = item.status || 'approved';

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.userName || 'Pengunjung'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.createdAt instanceof Date
                        ? item.createdAt.toLocaleString('id-ID')
                        : ''}
                    </p>
                  </div>

                  <span
                    className={[
                      'inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold',
                      status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : status === 'hidden'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-700',
                    ].join(' ')}
                  >
                    {status === 'approved'
                      ? 'Tampil'
                      : status === 'hidden'
                        ? 'Disembunyikan'
                        : 'Menunggu'}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {item.comment}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!item.id || busyId === item.id}
                    onClick={() => item.id && moderate(item.id, 'approved')}
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tampilkan
                  </button>

                  <button
                    type="button"
                    disabled={!item.id || busyId === item.id}
                    onClick={() => item.id && moderate(item.id, 'hidden')}
                    className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sembunyikan
                  </button>

                  <button
                    type="button"
                    disabled={!item.id || busyId === item.id}
                    onClick={() => item.id && remove(item.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
