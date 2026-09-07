import React, { useState } from 'react';
import NewsAdminNavigation from './NewsAdminNavigation';
import NewsPostEditor from './NewsPostEditor';
import NewsStatisticsPanel from './NewsStatisticsPanel';
import NewsCommentsPanel from './NewsCommentsPanel';
import NewsThemePanel from './NewsThemePanel';
import NewsSettingsPanel from './NewsSettingsPanel';

type NewsItem = {
  id?: string;
  title?: string;
  status?: string;
  category?: string;
  content?: string;
};

type Comment = {
  id?: string;
  userName?: string;
  comment?: string;
  createdAt?: unknown;
};

type Props = {
  news?: NewsItem[];
  comments?: Comment[];
  initialContent?: string;
  onContentChange?: (html: string) => void;
  children?: React.ReactNode;
};

export default function NewsAdminHub({
  news = [],
  comments = [],
  initialContent = '',
  onContentChange,
  children
}: Props) {
  const [section, setSection] = useState('postingan');

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
        onChange={setSection}
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
        <NewsStatisticsPanel news={news} />
      )}

      {section === 'komentar' && (
        <NewsCommentsPanel comments={comments} />
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
