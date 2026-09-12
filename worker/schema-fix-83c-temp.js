import mysql from "mysql2/promise";

export default {
  async fetch(request, env) {
    let connection;

    try {
      if (request.method !== "POST") {
        return Response.json(
          { success: false, error: "Method tidak diizinkan." },
          { status: 405 }
        );
      }

      const auth = request.headers.get("Authorization") || "";

      if (
        !env.SCHEMA_MIGRATION_TOKEN ||
        auth !== `Bearer ${env.SCHEMA_MIGRATION_TOKEN}`
      ) {
        return Response.json(
          { success: false, error: "Tidak diizinkan." },
          { status: 401 }
        );
      }

      connection = await mysql.createConnection({
        host: env.HYPERDRIVE.host,
        user: env.HYPERDRIVE.user,
        password: env.HYPERDRIVE.password,
        database: env.HYPERDRIVE.database,
        port: env.HYPERDRIVE.port,
        disableEval: true
      });

      const [beforeRows] = await connection.query(`
        SHOW COLUMNS FROM official_document_config
        WHERE Field IN ('stamp_image_url', 'kop_surat_image_url')
      `);

      await connection.query(`
        ALTER TABLE official_document_config
          MODIFY COLUMN stamp_image_url MEDIUMTEXT NULL,
          MODIFY COLUMN kop_surat_image_url MEDIUMTEXT NULL
      `);

      const [afterRows] = await connection.query(`
        SHOW COLUMNS FROM official_document_config
        WHERE Field IN ('stamp_image_url', 'kop_surat_image_url')
      `);

      const verified =
        afterRows.length === 2 &&
        afterRows.every(
          (row) => String(row.Type).toLowerCase() === "mediumtext"
        );

      return Response.json({
        success: verified,
        connection_test: true,
        before: beforeRows,
        after: afterRows,
        verification: verified
          ? "BERHASIL: kedua kolom sudah MEDIUMTEXT."
          : "GAGAL: hasil ALTER belum sesuai."
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    } finally {
      if (connection) {
        await connection.end().catch(() => {});
      }
    }
  }
};
