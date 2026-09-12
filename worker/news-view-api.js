import { createConnection } from 'mysql2/promise';

const DEDUP_MINUTES = 30;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/news-view') {
      return new Response('Not Found', { status: 404 });
    }

    /*
     * GET /api/news-view?newsIds=id1,id2,id3
     *
     * Dipakai panel Statistik Admin untuk mengambil jumlah
     * view setiap artikel dari tabel news_view_events.
     *
     * Endpoint ini READ ONLY terhadap database.
     */
    if (request.method === 'GET') {
      let connection;

      try {
        const rawIds = url.searchParams.get('newsIds') || '';

        const newsIds = [
          ...new Set(
            rawIds
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          ),
        ].slice(0, 200);

        if (newsIds.length === 0) {
          return json({
            success: true,
            totalViews: 0,
            counts: {},
          });
        }

        if (newsIds.some((id) => id.length > 128)) {
          return json(
            {
              success: false,
              error: 'ID berita terlalu panjang.',
            },
            400
          );
        }

        connection = await createConnection({
          host: env.HYPERDRIVE.host,
          user: env.HYPERDRIVE.user,
          password: env.HYPERDRIVE.password,
          database: env.HYPERDRIVE.database,
          port: env.HYPERDRIVE.port,
          disableEval: true,
        });

        const escapedIds = newsIds
          .map((id) => connection.escape(id))
          .join(',');

        const [rows] = await connection.query(`
          SELECT
            news_id,
            COUNT(*) AS view_count
          FROM news_view_events
          WHERE news_id IN (${escapedIds})
          GROUP BY news_id
        `);

        const counts = {};

        for (const row of rows) {
          counts[String(row.news_id)] = Number(
            row.view_count || 0
          );
        }

        const totalViews = Object.values(counts).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        );

        return json({
          success: true,
          totalViews,
          counts,
        });
      } catch (error) {
        console.error('News view statistics error:', error);

        return json(
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Gagal mengambil statistik view berita.',
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

    if (request.method !== 'POST') {
      return json(
        {
          success: false,
          error: 'Method harus GET atau POST.',
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
        return json(
          {
            success: false,
            error: 'newsId wajib diisi.',
          },
          400
        );
      }

      if (newsId.length > 128) {
        return json(
          {
            success: false,
            error: 'newsId terlalu panjang.',
          },
          400
        );
      }

      if (!visitorKey) {
        return json(
          {
            success: false,
            error: 'visitorKey wajib diisi.',
          },
          400
        );
      }

      if (visitorKey.length > 128) {
        return json(
          {
            success: false,
            error: 'visitorKey terlalu panjang.',
          },
          400
        );
      }

      connection = await createConnection({
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

      return json({
        success: true,
        recorded,
        deduplicated,
        newsId,
        insertId,
        viewCount,
      });
    } catch (error) {
      console.error('News view API error:', error);

      return json(
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
  },
};
