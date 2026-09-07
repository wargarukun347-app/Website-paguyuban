import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/mysql-schema-columns') {
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

      const [rows] = await connection.query(`
        SELECT
          TABLE_NAME,
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'paguyuban'
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `);

      return new Response(JSON.stringify({
        success: true,
        table_count: [...new Set(rows.map(x => x.TABLE_NAME))].length,
        column_count: rows.length,
        columns: rows
      }), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Schema gagal dibaca.'
      }), {
        status: 500,
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      });
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch {}
      }
    }
  }
};
