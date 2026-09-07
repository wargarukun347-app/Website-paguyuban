import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/mysql-schema-check') {
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
          TABLE_ROWS
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME
      `);

      return new Response(
        JSON.stringify({
          success: true,
          database: env.HYPERDRIVE.database,
          table_count: rows.length,
          tables: rows,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (error) {
      console.error('Schema check error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Pemeriksaan schema gagal.',
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
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
