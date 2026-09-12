import { createConnection } from 'mysql2/promise';

const DEDUP_MINUTES = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/news-view') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method harus POST.'
        }),
        {
          status: 405,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'allow': 'POST'
          }
        }
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
        return new Response(
          JSON.stringify({
            success: false,
            error: 'newsId wajib diisi.'
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          }
        );
      }

      if (!visitorKey) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'visitorKey wajib diisi.'
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          }
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
          AND viewed_at >= (UTC_TIMESTAMP() - INTERVAL ${DEDUP_MINUTES} MINUTE)
        ORDER BY viewed_at DESC
        LIMIT 1
      `);

      if (recentRows.length > 0) {
        const [countRows] = await connection.query(`
          SELECT COUNT(*) AS view_count
          FROM news_view_events
          WHERE news_id = ${safeNewsId}
        `);

        return new Response(
          JSON.stringify({
            success: true,
            recorded: false,
            deduplicated: true,
            newsId,
            viewCount: Number(countRows[0]?.view_count || 0)
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          }
        );
      }

      const [insertResult] = await connection.query(`
        INSERT INTO news_view_events
          (news_id, visitor_key)
        VALUES
          (${safeNewsId}, ${safeVisitorKey})
      `);

      const [countRows] = await connection.query(`
        SELECT COUNT(*) AS view_count
        FROM news_view_events
        WHERE news_id = ${safeNewsId}
      `);

      return new Response(
        JSON.stringify({
          success: true,
          recorded: true,
          deduplicated: false,
          newsId,
          insertId: insertResult.insertId,
          viewCount: Number(countRows[0]?.view_count || 0)
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8'
          }
        }
      );
    } catch (error) {
      console.error('News view API error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Gagal mencatat view berita.'
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json; charset=utf-8'
          }
        }
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
