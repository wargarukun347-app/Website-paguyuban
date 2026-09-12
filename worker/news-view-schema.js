import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/news-view-schema') {
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

      await connection.query(`
        CREATE TABLE IF NOT EXISTS news_view_events (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          news_id VARCHAR(128) NOT NULL,
          viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          visitor_key VARCHAR(128) NULL,
          PRIMARY KEY (id),
          INDEX idx_news_view_events_news_id (news_id),
          INDEX idx_news_view_events_viewed_at (viewed_at),
          INDEX idx_news_view_events_news_time (news_id, viewed_at),
          INDEX idx_news_view_events_visitor (news_id, visitor_key, viewed_at)
        )
      `);

      const [rows] = await connection.query(`
        SELECT
          TABLE_NAME,
          TABLE_ROWS
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'news_view_events'
      `);

      const [columns] = await connection.query(`
        SELECT
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT,
          EXTRA,
          ORDINAL_POSITION
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'news_view_events'
        ORDER BY ORDINAL_POSITION
      `);

      return new Response(
        JSON.stringify({
          success: true,
          database: env.HYPERDRIVE.database,
          table: rows,
          columns
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8'
          }
        }
      );
    } catch (error) {
      console.error('News view schema error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
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
