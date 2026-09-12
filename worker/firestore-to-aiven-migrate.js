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

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function b(v) {
  return v === true || v === 1 || v === '1' ? 1 : 0;
}

function dt(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toISOString().slice(0, 19).replace('T', ' ');
}

function rowData(x) {
  return x?.data ?? x ?? {};
}

function normalizePaymentRows(collection) {
  const rows = [];

  for (const doc of Object.values(collection || {})) {
    const v = rowData(doc);
    const memberId = String(v.memberId ?? doc?.id ?? '');

    for (const type of ['arisan', 'iuran']) {
      const group = v[type];

      if (!group || typeof group !== 'object') continue;

      for (const [key, raw] of Object.entries(group)) {
        const r = raw ?? {};
        const month = n(r.month ?? key);
        const year = n(r.year);

        if (!month || !year) continue;

        rows.push({
          memberId,
          paymentType: type,
          month,
          year,
          isPaid: b(r.isPaid),
          paidDate: dt(r.paidDate),
          amount: n(r.amount),
          receiptNo: r.receiptNo ?? null,
          notes: r.notes ?? null,
        });
      }
    }
  }

  return rows;
}

async function migrate(data, env) {
  const C = data.collections || {};
  const S = data.appState || {};

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

    const results = {};

    /*
     * SAFETY LOCK:
     * Migrasi hanya boleh berjalan ketika seluruh tabel target
     * masih kosong. news_view_events sengaja TIDAK diperiksa
     * karena tabel tersebut sudah berisi data produksi/test.
     *
     * Ini mencegah migrasi kedua yang dapat menyebabkan duplicate key.
     */
    const targetTables = [
      'members',
      'payment_records',
      'cash_transactions',
      'lottery_winners',
      'news',
      'news_comments',
      'paguyuban_profile',
      'management_members',
      'profile_rules',
      'official_document_config',
      'adzan_settings',
    ];

    const existing = {};

    for (const table of targetTables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${table}`
      );

      const total = Number(rows?.[0]?.total ?? 0);
      existing[table] = total;

      if (total !== 0) {
        return {
          success: false,
          error: `Migrasi dibatalkan: tabel ${table} tidak kosong.`,
          table,
          existingCount: total,
          rolledBack: false,
          protected: ['news_view_events'],
        };
      }
    }

    await connection.beginTransaction();

    /* 1. MEMBERS */
    for (const x of Object.values(C.members || {})) {
      const v = rowData(x);

      await connection.query(`
        INSERT INTO members
        (
          id,no,name,category,phone,address,status,
          is_arisan_participant,is_iuran_participant,
          join_date,notes,photo_url,signature_url,nik,
          created_at,updated_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        String(v.id ?? x.id),
        n(v.no),
        v.name ?? '',
        v.category ?? 'Umum',
        v.phone ?? '',
        v.address ?? null,
        v.status ?? 'Aktif',
        b(v.isArisanParticipant),
        b(v.isIuranParticipant),
        v.joinDate ?? null,
        v.notes ?? null,
        v.photoUrl ?? null,
        v.signatureUrl ?? null,
        v.nik ?? null,
        dt(v.createdAt),
        dt(v.updatedAt),
      ]);
    }

    results.members = Object.keys(C.members || {}).length;

    /* 2. PAYMENT RECORDS */
    const paymentRows = normalizePaymentRows(C.payments);

    for (const r of paymentRows) {
      await connection.query(`
        INSERT INTO payment_records
        (
          member_id,payment_type,month,year,is_paid,
          paid_date,amount,receipt_no,notes,
          created_at,updated_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `, [
        r.memberId,
        r.paymentType,
        r.month,
        r.year,
        r.isPaid,
        r.paidDate,
        r.amount,
        r.receiptNo,
        r.notes,
      ]);
    }

    results.payment_records = paymentRows.length;

    /* 3. CASH TRANSACTIONS */
    for (const x of Object.values(C.cash_transactions || {})) {
      const v = rowData(x);

      await connection.query(`
        INSERT INTO cash_transactions
        (
          id,type,category,amount,date,description,
          member_id,member_name,receipt_no,
          source_or_recipient,payment_method,
          created_at,updated_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        String(v.id ?? x.id),
        v.type ?? 'in',
        v.category ?? '',
        n(v.amount),
        v.date ?? new Date().toISOString().slice(0, 10),
        v.description ?? '',
        v.memberId ?? null,
        v.memberName ?? null,
        v.receiptNo ?? '',
        v.sourceOrRecipient ?? null,
        v.paymentMethod ?? null,
        dt(v.createdAt),
        dt(v.updatedAt),
      ]);
    }

    results.cash_transactions =
      Object.keys(C.cash_transactions || {}).length;

    /* 4. LOTTERY WINNERS */
    for (const x of Object.values(C.lottery_winners || {})) {
      const v = rowData(x);

      await connection.query(`
        INSERT INTO lottery_winners
        (
          id,round_number,draw_date,member_id,member_name,
          member_category,prize_amount,period_label,notes,
          disbursed,disbursed_date,created_at,updated_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        String(v.id ?? x.id),
        n(v.roundNumber),
        v.drawDate,
        String(v.memberId ?? ''),
        v.memberName ?? '',
        v.memberCategory ?? 'Umum',
        n(v.prizeAmount),
        v.periodLabel ?? '',
        v.notes ?? null,
        b(v.disbursed),
        v.disbursedDate ?? null,
        dt(v.createdAt),
        dt(v.updatedAt),
      ]);
    }

    results.lottery_winners =
      Object.keys(C.lottery_winners || {}).length;

    /* 5. NEWS */
    for (const x of Object.values(C.news || {})) {
      const v = rowData(x);

      await connection.query(`
        INSERT INTO news
        (
          id,title,content,image_url,category,status,slug,
          excerpt,seo_title,meta_description,focus_keyword,
          keywords,alt_text,fact_check_notes,published_at,
          author_id,author_name,created_at,updated_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        String(v.id ?? x.id),
        v.title ?? '',
        v.content ?? '',
        v.imageUrl ?? null,
        v.category ?? null,
        v.status ?? 'draft',
        v.slug ?? null,
        v.excerpt ?? null,
        v.seoTitle ?? null,
        v.metaDescription ?? null,
        v.focusKeyword ?? null,
        JSON.stringify(v.keywords ?? []),
        v.altText ?? null,
        JSON.stringify(v.factCheckNotes ?? []),
        dt(v.publishedAt),
        v.authorId ?? null,
        v.authorName ?? null,
        dt(v.createdAt),
        dt(v.updatedAt),
      ]);
    }

    results.news = Object.keys(C.news || {}).length;

    /* 6. NEWS COMMENTS */
    for (const x of Object.values(C.news_comments || {})) {
      const v = rowData(x);

      await connection.query(`
        INSERT INTO news_comments
        (
          id,news_id,user_id,user_name,comment,status,
          moderated_by,moderated_at,created_at
        )
        VALUES (?,?,?,?,?,?,?,?,?)
      `, [
        String(v.id ?? x.id),
        String(v.newsId ?? ''),
        String(v.userId ?? ''),
        v.userName ?? '',
        v.comment ?? '',
        v.status ?? 'pending',
        v.moderatedBy ?? null,
        dt(v.moderatedAt),
        dt(v.createdAt),
      ]);
    }

    results.news_comments =
      Object.keys(C.news_comments || {}).length;

    /* 7. PAGUYUBAN PROFILE */
    const ps =
      S.paguyuban_profile?.data?.profile ??
      S.paguyuban_profile?.profile ??
      null;

    if (ps) {
      const contact = ps.contact ?? {};
      const odc = ps.officialDocumentConfig ?? {};

      await connection.query(`
        INSERT INTO paguyuban_profile
        (
          id,name,short_name,subtitle,description,location,
          current_year,logo_url,vision,meeting_schedule,
          meeting_location,address,treasurer_name,
          treasurer_phone,chairman_name,chairman_phone,email
        )
        VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        ps.name ?? '',
        ps.shortName ?? null,
        ps.subtitle ?? null,
        ps.description ?? null,
        ps.location ?? null,
        n(ps.currentYear) || new Date().getFullYear(),
        ps.logoUrl ?? null,
        ps.vision ?? null,
        ps.meetingSchedule ?? null,
        ps.meetingLocation ?? null,
        contact.address ?? null,
        contact.treasurerName ?? null,
        contact.treasurerPhone ?? null,
        contact.chairmanName ?? null,
        contact.chairmanPhone ?? null,
        contact.email ?? null,
      ]);

      for (const [index, x] of (ps.management ?? []).entries()) {
        await connection.query(`
          INSERT INTO management_members
          (
            id,profile_id,role,name,subtitle,phone,is_signer,sort_order
          )
          VALUES (?,?,?,?,?,?,?,?)
        `, [
          String(x.id ?? `mgr-${index + 1}`),
          1,
          x.role ?? '',
          x.name ?? '',
          x.subtitle ?? null,
          x.phone ?? null,
          b(x.isSigner),
          n(x.sortOrder) || index + 1,
        ]);
      }

      const rules = [
        { id: 1, type: 'arisan', source: ps.arisanRule },
        { id: 2, type: 'iuran', source: ps.iuranRule },
      ];

      for (const rule of rules) {
        if (!rule.source) continue;

        await connection.query(`
          INSERT INTO profile_rules
          (
            id,profile_id,rule_type,amount_per_month,description,rules
          )
          VALUES (?,?,?,?,?,?)
        `, [
          rule.id,
          1,
          rule.type,
          n(rule.source.amountPerMonth),
          rule.source.description ?? null,
          JSON.stringify(rule.source.rules ?? []),
        ]);
      }

      await connection.query(`
        INSERT INTO official_document_config
        (
          id,chairman_title,chairman_name,chairman_nip,
          treasurer_title,treasurer_name,organization_location,
          document_prefix,show_barcode,show_stamp,stamp_text,
          stamp_image_url,signature_image_url,kop_surat_image_url,
          use_custom_kop_image,treasurer_signature_image_url,
          recipient_signature_image_url
        )
        VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        odc.chairmanTitle ?? null,
        odc.chairmanName ?? null,
        odc.chairmanNip ?? null,
        odc.treasurerTitle ?? null,
        odc.treasurerName ?? null,
        odc.organizationLocation ?? null,
        odc.documentPrefix ?? null,
        b(odc.showBarcode),
        b(odc.showStamp),
        odc.stampText ?? null,
        odc.stampImageUrl ?? null,
        odc.signatureImageUrl ?? null,
        odc.kopSuratImageUrl ?? null,
        b(odc.useCustomKopImage),
        odc.treasurerSignatureImageUrl ?? null,
        odc.recipientSignatureImageUrl ?? null,
      ]);

      results.paguyuban_profile = 1;
      results.management_members = (ps.management ?? []).length;
      results.profile_rules =
        (ps.arisanRule ? 1 : 0) +
        (ps.iuranRule ? 1 : 0);
      results.official_document_config =
        ps.officialDocumentConfig ? 1 : 0;
    }

    /* 8. ADZAN SETTINGS */
    const az =
      S.adzan_settings?.data?.settings ??
      S.adzan_settings?.settings ??
      null;

    if (az) {
      await connection.query(`
        INSERT INTO adzan_settings
        (
          id,enabled,voice_type,volume,alarm_before_minutes,
          reminder_imsak,reminder_subuh,reminder_dhuha,
          reminder_dzuhur,reminder_ashar,reminder_maghrib,
          reminder_isya,updated_at
        )
        VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        b(az.enabled),
        az.voiceType ?? '',
        n(az.volume),
        n(az.alarmBeforeMinutes),
        b(az.reminderImsak),
        b(az.reminderSubuh),
        b(az.reminderDhuha),
        b(az.reminderDzuhur),
        b(az.reminderAshar),
        b(az.reminderMaghrib),
        b(az.reminderIsya),
        dt(az.updatedAt),
      ]);

      results.adzan_settings = 1;
    }

    /*
     * IMPORTANT:
     * news_view_events SENGAJA TIDAK DISENTUH.
     */

    await connection.commit();

    return {
      success: true,
      source: 'firestore-backup',
      database: env.HYPERDRIVE.database,
      migrated: results,
      protected: ['news_view_events'],
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error('Migration error:', error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Migrasi gagal.',
      rolledBack: true,
    };
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {}
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/migrate/firestore-to-aiven') {
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

    const auth = request.headers.get('authorization') || '';

    if (!env.MIGRATION_TOKEN || auth !== `Bearer ${env.MIGRATION_TOKEN}`) {
      return json({
        success: false,
        error: 'Tidak diizinkan.'
      }, 401);
    }

    try {
      const data = await request.json();

      if (!data || typeof data !== 'object') {
        return json({
          success: false,
          error: 'Payload backup tidak valid.'
        }, 400);
      }

      const result = await migrate(data, env);

      return json(result, result.success ? 200 : 500);
    } catch (error) {
      console.error('Migration request error:', error);

      return json({
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Payload tidak valid.'
      }, 400);
    }
  }
};
