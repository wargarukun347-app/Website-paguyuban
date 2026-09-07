import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/mysql-test') {
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
          1 AS connection_ok,
          DATABASE() AS database_name,
          VERSION() AS mysql_version
      `);

      return new Response(
        JSON.stringify({
          success: true,
          data: rows,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (error) {
      console.error('Hyperdrive MySQL test error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Koneksi database gagal.',
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
