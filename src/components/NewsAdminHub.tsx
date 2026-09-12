import React, { useState, useEffect, useCallback } from 'react';
import NewsAdminNavigation from './NewsAdminNavigation';
import NewsPostEditor from './NewsPostEditor';
import NewsStatisticsPanel from './NewsStatisticsPanel';
import NewsCommentsPanel from './NewsCommentsPanel';
import { getAllNewsCommentsFromFirestore } from '../lib/firestoreService';
import NewsThemePanel from './NewsThemePanel';
import NewsSettingsPanel from './NewsSettingsPanel';
import type { NewsComment } from '../lib/firestoreService';

type NewsItem = {
  id?: string;
  title?: string;
  status?: string;
  category?: string;
  content?: string;
};



type Props = {
  news?: NewsItem[];
  comments?: NewsComment[];
  initialContent?: string;
  onContentChange?: (html: string) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  statistikContent?: React.ReactNode;
  adsenseContent?: React.ReactNode;
  children?: React.ReactNode;
};

export default function NewsAdminHub({
  news = [],
  comments = [],
  initialContent = '',
  onContentChange,
  activeSection,
  onSectionChange,
  statistikContent,
  adsenseContent,
  children
}: Props) {
  const [section, setSection] = useState(
    activeSection || 'postingan'
  );

  const [managedComments, setManagedComments] = useState<NewsComment[]>(
    comments
  );
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setCommentsLoading(true);
      const result = await getAllNewsCommentsFromFirestore();
      setManagedComments(result);
    } catch (error) {
      console.error('Gagal memuat komentar berita:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'komentar') {
      loadComments();
    }
  }, [section, loadComments]);

  const handleSectionChange = (nextSection: string) => {
    setSection(nextSection);
    onSectionChange?.(nextSection);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Berita
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pusat pengelolaan berita seperti dashboard blog.
        </p>
      </div>

      <NewsAdminNavigation
        active={section}
        onChange={handleSectionChange}
      />

      {section === 'postingan' && (
        <div className="space-y-5">
          {children}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Editor postingan
            </h2>

            <NewsPostEditor
              initialContent={initialContent}
              onChange={onContentChange}
            />
          </div>
        </div>
      )}

      {section === 'statistik' && (
        statistikContent || <NewsStatisticsPanel news={news} />
      )}

      {section === 'adsense' && (
        adsenseContent || (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              AdSense Berita
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pengaturan AdSense untuk area berita.
            </p>
          </div>
        )
      )}

      {section === 'komentar' && (
        <div className="space-y-3">
          {commentsLoading && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              Memuat komentar...
            </div>
          )}

          <NewsCommentsPanel
            comments={managedComments}
            onChanged={loadComments}
          />
        </div>
      )}

      {section === 'tema' && (
        <NewsThemePanel />
      )}

      {section === 'setelan' && (
        <NewsSettingsPanel />
      )}
    </div>
  );
}
