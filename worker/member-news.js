const feeds = {
  terkini: {
    label: 'Terkini',
    url: 'https://www.antaranews.com/rss/terkini.xml',
  },
  viral: {
    label: 'Terpopuler',
    url: 'https://www.antaranews.com/rss/top-news.xml',
  },
  nasional: {
    label: 'Nasional',
    url: 'https://www.antaranews.com/rss/terkini.xml',
  },
  politik: {
    label: 'Politik',
    url: 'https://www.antaranews.com/rss/politik.xml',
  },
  ekonomi: {
    label: 'Ekonomi',
    url: 'https://www.antaranews.com/rss/ekonomi.xml',
  },
  olahraga: {
    label: 'Olahraga',
    url: 'https://www.antaranews.com/rss/olahraga.xml',
  },
  teknologi: {
    label: 'Teknologi',
    url: 'https://www.antaranews.com/rss/tekno.xml',
  },
  hiburan: {
    label: 'Hiburan',
    url: 'https://www.antaranews.com/rss/hiburan.xml',
  },
  dunia: {
    label: 'Internasional',
    url: 'https://www.antaranews.com/rss/dunia.xml',
  },
  kesehatan: {
    label: 'Kesehatan',
    url: 'https://www.antaranews.com/rss/humaniora.xml',
  },
  lifestyle: {
    label: 'Lifestyle',
    url: 'https://www.antaranews.com/rss/lifestyle.xml',
  },
  otomotif: {
    label: 'Otomotif',
    url: 'https://www.antaranews.com/rss/otomotif.xml',
  },
  hukum: {
    label: 'Hukum',
    url: 'https://www.antaranews.com/rss/hukum.xml',
  },
};

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value = '') {
  return decodeXml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readXmlTag(xml, tag) {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  );

  return match ? decodeXml(match[1].trim()) : '';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
      'access-control-allow-origin': '*',
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/member-news') {
      return jsonResponse(
        { error: 'Endpoint tidak ditemukan.' },
        404
      );
    }

    const category = (
      url.searchParams.get('category') || 'terkini'
    ).trim().toLowerCase();

    const feed = feeds[category] || feeds.terkini;

    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'PaguyubanNewsPortal/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        return jsonResponse(
          {
            error: `Sumber berita tidak dapat diakses (${response.status}).`,
          },
          502
        );
      }

      const xml = await response.text();

      const itemMatches =
        xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

      const data = itemMatches
        .map((itemXml) => {
          const title = stripHtml(readXmlTag(itemXml, 'title'));
          const description = stripHtml(
            readXmlTag(itemXml, 'description')
          );
          const link = readXmlTag(itemXml, 'link');
          const pubDate = readXmlTag(itemXml, 'pubDate');

          const author =
            readXmlTag(itemXml, 'dc:creator') ||
            readXmlTag(itemXml, 'creator');

          const enclosure = itemXml.match(
            /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
          );

          const mediaContent = itemXml.match(
            /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
          );

          const image =
            enclosure?.[1] ||
            mediaContent?.[1] ||
            '';

          return {
            title,
            description,
            image,
            link,
            pubDate,
            author,
            category: feed.label,
            source: 'ANTARA News',
          };
        })
        .filter((item) => item.title && item.link)
        .slice(0, 20);

      return jsonResponse({
        success: true,
        category,
        source: feed.label,
        updatedAt: new Date().toISOString(),
        data,
      });
    } catch (error) {
      console.error('Member news RSS error:', error);

      return jsonResponse(
        {
          error:
            'Gagal mengambil berita terbaru dari sumber internet.',
        },
        502
      );
    }
  },
};
