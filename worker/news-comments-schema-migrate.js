import { createConnection } from 'mysql2/promise';

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

    if (url.pathname === '/api/migrate/news-comments-schema-test') {
      let testConnection;

      try {
        testConnection = await createConnection({
          host: env.HYPERDRIVE.host,
          user: env.HYPERDRIVE.user,
          password: env.HYPERDRIVE.password,
          database: env.HYPERDRIVE.database,
          port: env.HYPERDRIVE.port,
          disableEval: true,
        });

        const [rows] = await testConnection.query(`
          SELECT
            DATABASE() AS database_name,
            @@hostname AS mysql_hostname,
            @@port AS mysql_port,
            VERSION() AS mysql_version
        `);

        return json({
          success: true,
          connection: true,
          test: rows[0],
        });
      } catch (error) {
        console.error('Connection test error:', error);

        return json({
          success: false,
          connection: false,
          error: error instanceof Error ? error.message : String(error),
        }, 500);
      } finally {
        if (testConnection) {
          try {
            await testConnection.end();
          } catch {}
        }
      }
    }

    if (url.pathname !== '/api/migrate/news-comments-schema') {
      return json({
        success: false,
        error: 'Endpoint tidak ditemukan.'
      }, 404);
    }

    if (request.method !== 'POST') {
      return json({
        success: false,
        error: 'Method tidak diizinkan.'
      }, 405);
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

      const [before] = await connection.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'news_comments'
        ORDER BY ORDINAL_POSITION
      `);

      const existing = new Set(
        before.map(row => row.COLUMN_NAME)
      );

      const added = [];

      if (!existing.has('status')) {
        await connection.query(`
          ALTER TABLE news_comments
          ADD COLUMN status
            ENUM('pending','approved','hidden')
            NOT NULL DEFAULT 'pending'
          AFTER comment
        `);
        added.push('status');
      }

      if (!existing.has('moderated_by')) {
        await connection.query(`
          ALTER TABLE news_comments
          ADD COLUMN moderated_by
            VARCHAR(128)
            NULL
          AFTER status
        `);
        added.push('moderated_by');
      }

      if (!existing.has('moderated_at')) {
        await connection.query(`
          ALTER TABLE news_comments
          ADD COLUMN moderated_at
            DATETIME
            NULL
          AFTER moderated_by
        `);
        added.push('moderated_at');
      }

      const [after] = await connection.query(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'news_comments'
        ORDER BY ORDINAL_POSITION
      `);

      return json({
        success: true,
        database: env.HYPERDRIVE.database,
        table: 'news_comments',
        added,
        columns: after,
      });
    } catch (error) {
      console.error('news_comments schema migration error:', error);

      return json({
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Migrasi schema gagal.'
      }, 500);
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch {}
      }
    }
  },
};
