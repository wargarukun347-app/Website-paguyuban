import { createConnection } from 'mysql2/promise';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/migration-mysql-audit') {
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

      const [tables] = await connection.query(`
        SELECT
          TABLE_NAME,
          TABLE_ROWS
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'paguyuban'
        ORDER BY TABLE_NAME
      `);

      const result = [];

      for (const table of tables) {
        const [count] = await connection.query(
          `SELECT COUNT(*) AS total FROM \`${table.TABLE_NAME}\``
        );

        result.push({
          table: table.TABLE_NAME,
          rows: Number(count[0].total),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        database: 'paguyuban',
        tables: result
      }, null, 2), {
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, null, 2), {
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
