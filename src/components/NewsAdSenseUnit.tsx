import React, { useEffect, useState } from 'react';

const NewsAdSenseUnit: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  const publisherId =
    String(import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-9689921412010430').trim();

  const slotId =
    String(import.meta.env.VITE_ADSENSE_NEWS_SLOT_ID || '5945959180').trim();

  useEffect(() => {
    const validPublisher =
      /^ca-pub-\d+$/.test(publisherId);

    const validSlot =
      /^\d+$/.test(slotId);

    if (!validPublisher || !validSlot) {
      setEnabled(false);
      return;
    }

    const scriptId = 'google-adsense-script';

    const existing =
      document.getElementById(scriptId);

    if (!existing) {
      const script = document.createElement('script');

      script.id = scriptId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
        encodeURIComponent(publisherId);

      document.head.appendChild(script);
    }

    setEnabled(true);

    const renderAd = () => {
      try {
        const adsbygoogle =
          (window as Window & {
            adsbygoogle?: unknown[];
          }).adsbygoogle ||
          ((window as Window & {
            adsbygoogle?: unknown[];
          }).adsbygoogle = []);

        adsbygoogle.push({});
      } catch (error) {
        console.warn('AdSense belum dapat dirender:', error);
      }
    };

    if (document.readyState === 'loading') {
      window.addEventListener('load', renderAd, { once: true });
      return () => window.removeEventListener('load', renderAd);
    }

    renderAd();
  }, [publisherId, slotId]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      aria-label="Iklan"
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          minHeight: '90px',
        }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default NewsAdSenseUnit;
