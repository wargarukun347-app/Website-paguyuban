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

    if (url.pathname !== '/api/aiven/members') {
      return json(
        {
          success: false,
          error: 'Endpoint tidak ditemukan.',
        },
        404
      );
    }

    if (request.method !== 'GET') {
      return json(
        {
          success: false,
          error: 'Method tidak diizinkan.',
        },
        405
      );
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
          id,
          no,
          name,
          category,
          phone,
          address,
          status,
          is_arisan_participant,
          is_iuran_participant,
          join_date,
          notes,
          photo_url,
          signature_url,
          nik,
          created_at,
          updated_at
        FROM members
        ORDER BY no ASC, name ASC
      `);

      return json({
        success: true,
        source: 'aiven',
        database: env.HYPERDRIVE.database,
        count: rows.length,
        members: rows,
      });
    } catch (error) {
      console.error('Aiven members API error:', error);

      return json(
        {
          success: false,
          error: error instanceof Error
            ? error.message
            : 'Gagal membaca data Aiven.',
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
