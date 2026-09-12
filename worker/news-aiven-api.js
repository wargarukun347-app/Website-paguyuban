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

async function db(env) {
  return createConnection({
    host: env.HYPERDRIVE.host,
    user: env.HYPERDRIVE.user,
    password: env.HYPERDRIVE.password,
    database: env.HYPERDRIVE.database,
    port: env.HYPERDRIVE.port,
    disableEval: true,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let connection;

    try {
      connection = await db(env);

      /* =========================
         GET /api/aiven/news
         ========================= */
      if (url.pathname === '/api/aiven/news' && request.method === 'GET') {
        const status = url.searchParams.get('status');

        let sql = `
          SELECT
            id,
            title,
            content,
            image_url,
            category,
            status,
            slug,
            excerpt,
            seo_title,
            meta_description,
            focus_keyword,
            keywords,
            alt_text,
            fact_check_notes,
            published_at,
            author_id,
            author_name,
            created_at,
            updated_at
          FROM news
        `;

        const params = [];

        if (status === 'published' || status === 'draft') {
          sql += ` WHERE status = ? `;
          params.push(status);
        }

        sql += `
          ORDER BY
            CASE WHEN published_at IS NULL THEN 1 ELSE 0 END,
            published_at DESC,
            created_at DESC
        `;

        const [rows] = await connection.query(sql, params);

        return json({
          success: true,
          source: 'aiven',
          count: rows.length,
          news: rows,
        });
      }

      /* =========================
         GET /api/aiven/news/slug/:slug
         ========================= */
      if (
        url.pathname.startsWith('/api/aiven/news/slug/') &&
        request.method === 'GET'
      ) {
        const slug = decodeURIComponent(
          url.pathname.slice('/api/aiven/news/slug/'.length)
        );

        const [rows] = await connection.query(
          `
            SELECT
              id,
              title,
              content,
              image_url,
              category,
              status,
              slug,
              excerpt,
              seo_title,
              meta_description,
              focus_keyword,
              keywords,
              alt_text,
              fact_check_notes,
              published_at,
              author_id,
              author_name,
              created_at,
              updated_at
            FROM news
            WHERE slug = ?
              AND status = 'published'
            LIMIT 1
          `,
          [slug]
        );

        if (!rows.length) {
          return json({
            success: false,
            error: 'Berita tidak ditemukan.'
          }, 404);
        }

        return json({
          success: true,
          source: 'aiven',
          news: rows[0],
        });
      }

      /* =========================
         GET /api/aiven/news/:id
         ========================= */
      if (
        url.pathname.startsWith('/api/aiven/news/') &&
        !url.pathname.includes('/slug/') &&
        !url.pathname.endsWith('/comments') &&
        request.method === 'GET'
      ) {
        const id = decodeURIComponent(
          url.pathname.slice('/api/aiven/news/'.length)
        );

        if (!id) {
          return json({
            success: false,
            error: 'ID berita tidak boleh kosong.'
          }, 400);
        }

        const [rows] = await connection.query(
          `
            SELECT
              id,
              title,
              content,
              image_url,
              category,
              status,
              slug,
              excerpt,
              seo_title,
              meta_description,
              focus_keyword,
              keywords,
              alt_text,
              fact_check_notes,
              published_at,
              author_id,
              author_name,
              created_at,
              updated_at
            FROM news
            WHERE id = ?
            LIMIT 1
          `,
          [id]
        );

        if (!rows.length) {
          return json({
            success: false,
            error: 'Berita tidak ditemukan.'
          }, 404);
        }

        return json({
          success: true,
          source: 'aiven',
          news: rows[0],
        });
      }

      /* =========================
         GET /api/aiven/news/:id/comments
         ========================= */
      const commentPrefix = '/api/aiven/news/';
      if (
        url.pathname.startsWith(commentPrefix) &&
        url.pathname.endsWith('/comments') &&
        request.method === 'GET'
      ) {
        const newsId = decodeURIComponent(
          url.pathname.slice(commentPrefix.length, -'/comments'.length)
        );

        const [rows] = await connection.query(
          `
            SELECT
              id,
              news_id,
              user_id,
              user_name,
              comment,
              status,
              moderated_by,
              moderated_at,
              created_at
            FROM news_comments
            WHERE news_id = ?
              AND status = 'approved'
            ORDER BY created_at ASC
          `,
          [newsId]
        );

        return json({
          success: true,
          source: 'aiven',
          count: rows.length,
          comments: rows,
        });
      }

      /* =========================
         GET /api/aiven/news-comments
         Admin
         ========================= */
      if (
        url.pathname === '/api/aiven/news-comments' &&
        request.method === 'GET'
      ) {
        const [rows] = await connection.query(
          `
            SELECT
              id,
              news_id,
              user_id,
              user_name,
              comment,
              status,
              moderated_by,
              moderated_at,
              created_at
            FROM news_comments
            ORDER BY created_at DESC
          `
        );

        return json({
          success: true,
          source: 'aiven',
          count: rows.length,
          comments: rows,
        });
      }

      return json({
        success: false,
        error: 'Endpoint tidak ditemukan.'
      }, 404);

    } catch (error) {
      console.error('Aiven news API error:', error);

      return json({
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Gagal mengakses data berita Aiven.'
      }, 500);

    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch {}
      }
    }
  }
};
