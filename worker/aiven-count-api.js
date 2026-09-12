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

    if (url.pathname !== '/api/aiven/counts') {
      return json({ success: false, error: 'Endpoint tidak ditemukan.' }, 404);
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

      const tables = [
        'adzan_settings',
        'cash_transactions',
        'lottery_winners',
        'management_members',
        'members',
        'news',
        'news_comments',
        'news_view_events',
        'official_document_config',
        'paguyuban_profile',
        'payment_records',
        'profile_rules',
      ];

      const counts = {};

      for (const table of tables) {
        const [rows] = await connection.query(
          `SELECT COUNT(*) AS count FROM \`${table}\``
        );
        counts[table] = Number(rows[0].count);
      }

      return json({
        success: true,
        source: 'aiven',
        database: env.HYPERDRIVE.database,
        counts,
      });
    } catch (error) {
      console.error('Aiven count API error:', error);

      return json(
        {
          success: false,
          error: error instanceof Error
            ? error.message
            : 'Gagal membaca jumlah data Aiven.',
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
