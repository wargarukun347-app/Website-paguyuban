import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/news-view-cleanup') {
      return new Response('Not Found', { status: 404 });
    }

    let connection;

    try {
      connection = await createConnection({
        host: env.HYPERDRIVE.host,
        user: env.HYPERDRIVE.user,
        password: env.HYPERDRIVE.password,
        database: env.HYPERDRIVE.database,
        port: env.HYPERDRIVE.port,
        disableEval: true,
      });

      const testIds = [
        'test-firestore-news-001',
        'test-dedup-news-001',
        'final-test-news-001',
        'final-test-news-002'
      ];

      const escapedIds = testIds
        .map((id) => connection.escape(id))
        .join(', ');

      const [beforeRows] = await connection.query(`
        SELECT
          id,
          news_id,
          viewed_at,
          visitor_key
        FROM news_view_events
        WHERE news_id IN (${escapedIds})
        ORDER BY id ASC
      `);

      const [deleteResult] = await connection.query(`
        DELETE FROM news_view_events
        WHERE news_id IN (${escapedIds})
      `);

      const [afterRows] = await connection.query(`
        SELECT
          id,
          news_id,
          viewed_at,
          visitor_key
        FROM news_view_events
        WHERE news_id IN (${escapedIds})
        ORDER BY id ASC
      `);

      const [totalRows] = await connection.query(`
        SELECT COUNT(*) AS total
        FROM news_view_events
      `);

      return new Response(
        JSON.stringify({
          success: true,
          testRowsBefore: beforeRows.length,
          deletedRows: deleteResult.affectedRows,
          testRowsAfter: afterRows.length,
          totalRowsRemaining: Number(totalRows[0]?.total || 0)
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8'
          }
        }
      );
    } catch (error) {
      console.error('Cleanup error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Gagal membersihkan data test.'
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
  }
};
