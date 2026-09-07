import React from 'react';
import { NEWS_ADMIN_SECTIONS } from '../lib/newsConstants';

type Props = {
  active: string;
  onChange: (section: string) => void;
};

export default function NewsAdminNavigation({
  active,
  onChange
}: Props) {
  return (
    <nav
      aria-label="Menu pengelolaan berita"
      className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap">
        {NEWS_ADMIN_SECTIONS.map((section) => {
          const selected = active === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={[
                'border-b-2 px-4 py-3 text-left text-sm transition',
                selected
                  ? 'border-slate-900 bg-slate-900 font-semibold text-white'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              ].join(' ')}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
