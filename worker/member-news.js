import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

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
    source: 'ANTARA News',
  },
  kemenag: {
    label: 'Kemenag Provinsi seluruh Indonesia',
    urls: [
      {
        url: 'https://jateng.kemenag.go.id/feed',
        source: 'Kemenag Provinsi Jawa Tengah',
      },
      {
        url: 'https://sulbar.kemenag.go.id/rss.xml?page=1',
        source: 'Kemenag Provinsi Sulawesi Barat',
      },
      {
        url: 'https://yogyakartakota.kemenag.go.id/feed/',
        source: 'Kemenag Kota Yogyakarta',
      },
    ],
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

const DEDUP_MINUTES = 30;

function jsonViewResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

async function handleNewsView(request, env) {
  if (request.method !== 'POST') {
    return jsonViewResponse(
      {
        success: false,
        error: 'Method harus POST.',
      },
      405
    );
  }

  let connection;

  try {
    const body = await request.json();

    const newsId =
      typeof body?.newsId === 'string'
        ? body.newsId.trim()
        : '';

    const visitorKey =
      typeof body?.visitorKey === 'string'
        ? body.visitorKey.trim()
        : '';

    if (!newsId) {
      return jsonViewResponse(
        {
          success: false,
          error: 'newsId wajib diisi.',
        },
        400
      );
    }

    if (newsId.length > 128) {
      return jsonViewResponse(
        {
          success: false,
          error: 'newsId terlalu panjang.',
        },
        400
      );
    }

    if (!visitorKey) {
      return jsonViewResponse(
        {
          success: false,
          error: 'visitorKey wajib diisi.',
        },
        400
      );
    }

    if (visitorKey.length > 128) {
      return jsonViewResponse(
        {
          success: false,
          error: 'visitorKey terlalu panjang.',
        },
        400
      );
    }

    connection = await mysqlCreateConnection({
      host: env.HYPERDRIVE.host,
      user: env.HYPERDRIVE.user,
      password: env.HYPERDRIVE.password,
      database: env.HYPERDRIVE.database,
      port: env.HYPERDRIVE.port,
      disableEval: true,
    });

    const safeNewsId = connection.escape(newsId);
    const safeVisitorKey = connection.escape(visitorKey);

    const [recentRows] = await connection.query(`
      SELECT id
      FROM news_view_events
      WHERE news_id = ${safeNewsId}
        AND visitor_key = ${safeVisitorKey}
        AND viewed_at >= (
          UTC_TIMESTAMP() - INTERVAL ${DEDUP_MINUTES} MINUTE
        )
      ORDER BY viewed_at DESC
      LIMIT 1
    `);

    let recorded = false;
    let deduplicated = false;
    let insertId = null;

    if (recentRows.length > 0) {
      deduplicated = true;
    } else {
      const [insertResult] = await connection.query(`
        INSERT INTO news_view_events
          (news_id, visitor_key)
        VALUES
          (${safeNewsId}, ${safeVisitorKey})
      `);

      recorded = true;
      insertId = Number(insertResult.insertId);
    }

    const [countRows] = await connection.query(`
      SELECT COUNT(*) AS view_count
      FROM news_view_events
      WHERE news_id = ${safeNewsId}
    `);

    const viewCount = Number(
      countRows[0]?.view_count || 0
    );

    return jsonViewResponse({
      success: true,
      recorded,
      deduplicated,
      newsId,
      insertId,
      viewCount,
    });
  } catch (error) {
    console.error('News view API error:', error);

    return jsonViewResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Gagal mencatat view berita.',
      },
      500
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {}
    }
  }
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
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/news-view') {
      return handleNewsView(request, env);
    }


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
      const feedSources = Array.isArray(feed.urls)
        ? feed.urls
        : [{ url: feed.url, source: feed.source || feed.label }];

      const results = await Promise.all(
        feedSources.map(async (feedSource) => {
          try {
            const response = await fetch(feedSource.url, {
              headers: {
                'User-Agent': 'PaguyubanNewsPortal/1.0',
                'Accept': 'application/rss+xml, application/xml, text/xml',
              },
            });

            if (!response.ok) {
              console.warn(
                `Kemenag feed gagal: ${feedSource.url} (${response.status})`
              );
              return [];
            }

            const xml = await response.text();

            const itemMatches =
              xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

            return itemMatches
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
                  source: feedSource.source,
                };
              })
              .filter((item) => item.title && item.link);
          } catch (error) {
            console.warn(
              `Kemenag feed error: ${feedSource.url}`,
              error
            );
            return [];
          }
        })
      );

      const data = results
        .flat()
        .sort((a, b) => {
          const da = Date.parse(a.pubDate || '') || 0;
          const db = Date.parse(b.pubDate || '') || 0;
          return db - da;
        })
        .slice(0, 20);

      if (!data.length) {
        return jsonResponse(
          {
            error:
              'Belum ada berita Kemenag Provinsi yang dapat diambil dari sumber resmi.',
          },
          502
        );
      }

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
