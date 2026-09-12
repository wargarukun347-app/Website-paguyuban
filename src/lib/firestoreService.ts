import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  deleteDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Member, MemberPaymentHistory, CashTransaction, LotteryWinner, PaguyubanProfile, AdzanSettings } from '../types';

export const COLLECTIONS = {
  MEMBERS: 'members',
  PAYMENTS: 'payments',
  CASH_TRANSACTIONS: 'cash_transactions',
  MEMBER_FINANCE: 'member_finance',
  LOTTERY_WINNERS: 'lottery_winners',
  NEWS: 'news',
  NEWS_COMMENTS: 'news_comments',
  APP_STATE: 'app_state',
  ADMIN_ACTIVITY: 'admin_activity',
};

const PROFILE_DOC_ID = 'paguyuban_profile';
const ADZAN_SETTINGS_DOC_ID = 'adzan_settings';
const FINANCE_SUMMARY_DOC_ID = 'paguyuban_finance_summary';

const NEWS_PORTAL_CONFIG_DOC_ID = 'news_portal_config';

export interface NewsPortalThemeConfig {
  cardStyle: 'overlay' | 'standard';
  cardDensity: 'compact' | 'comfortable';
  showCategory: boolean;
  showAuthor: boolean;
  showDate: boolean;
}

export interface NewsPortalSettingsConfig {
  publicAuthor: string;
  defaultCategory: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
}

export interface NewsPortalAdsenseConfig {
  publisherId: string;
  newsSlotId: string;
}

export interface NewsPortalConfig {
  theme: NewsPortalThemeConfig;
  settings: NewsPortalSettingsConfig;
  adsense: NewsPortalAdsenseConfig;
  updatedAt: string;
  updatedBy: string;
}


export interface AdminActivity {
  id: string;
  action: string;
  detail: string;
  module: string;
  adminUid: string;
  adminEmail: string;
  adminName: string;
  device: string;
  timestamp: string;
}

const ADMIN_ACTIVITY_DOC_ID = 'latest';

const getAdminDeviceLabel = (): string => {
  if (typeof navigator === 'undefined') return 'Server';

  const platform =
    String(navigator.platform || '').trim();

  const userAgent =
    String(navigator.userAgent || '').trim();

  if (platform) {
    return platform;
  }

  if (userAgent) {
    return userAgent.slice(0, 120);
  }

  return 'Perangkat Admin';
};

export const saveAdminActivity = async (
  activity: Partial<AdminActivity> & {
    action: string;
    detail?: string;
    module?: string;
  }
): Promise<void> => {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    const timestamp = new Date().toISOString();

    const payload: AdminActivity = {
      id: ADMIN_ACTIVITY_DOC_ID,
      action: activity.action,
      detail: activity.detail || '',
      module: activity.module || 'Sistem',
      adminUid: user.uid,
      adminEmail: user.email || '',
      adminName:
        user.displayName ||
        user.email ||
        'Admin',
      device: getAdminDeviceLabel(),
      timestamp,
    };

    await setDoc(
      doc(
        db,
        COLLECTIONS.APP_STATE,
        `admin_activity_${ADMIN_ACTIVITY_DOC_ID}`
      ),
      sanitizeForFirestore(payload),
      { merge: true }
    );
  } catch (error) {
    console.warn(
      'Aktivitas admin tidak dapat disimpan:',
      error
    );
  }
};

export const subscribeAdminActivity = (
  callback: (activity: AdminActivity | null) => void
) => {
  return onSnapshot(
    doc(
      db,
      COLLECTIONS.APP_STATE,
      `admin_activity_${ADMIN_ACTIVITY_DOC_ID}`
    ),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(snapshot.data() as AdminActivity);
    },
    (error) => {
      console.warn(
        'Aktivitas admin realtime tidak dapat dibaca:',
        error
      );
      callback(null);
    }
  );
};

export const DEFAULT_NEWS_PORTAL_CONFIG: NewsPortalConfig = {
  theme: {
    cardStyle: 'overlay',
    cardDensity: 'comfortable',
    showCategory: true,
    showAuthor: true,
    showDate: true,
  },
  settings: {
    publicAuthor: 'Kresno Gadhing Pramudhyo',
    defaultCategory: 'Paguyuban',
    seoTitle: 'Berita Paguyuban Bani P3N KUA Kedungbanteng',
    metaDescription:
      'Berita dan informasi Paguyuban Bani P3N KUA Kecamatan Kedungbanteng Kabupaten Banyumas.',
    focusKeyword: 'Paguyuban Bani P3N Kedungbanteng',
  },
  adsense: {
    publisherId: '',
    newsSlotId: '',
  },
  updatedAt: '',
  updatedBy: '',
};

export async function getNewsPortalConfigFromFirestore(): Promise<NewsPortalConfig> {
  const snapshot = await getDoc(
    doc(db, COLLECTIONS.APP_STATE, NEWS_PORTAL_CONFIG_DOC_ID)
  );

  if (!snapshot.exists()) {
    return DEFAULT_NEWS_PORTAL_CONFIG;
  }

  const data = snapshot.data() as Partial<NewsPortalConfig>;

  return {
    ...DEFAULT_NEWS_PORTAL_CONFIG,
    ...data,
    theme: {
      ...DEFAULT_NEWS_PORTAL_CONFIG.theme,
      ...(data.theme || {}),
    },
    settings: {
      ...DEFAULT_NEWS_PORTAL_CONFIG.settings,
      ...(data.settings || {}),
    },
    adsense: {
      ...DEFAULT_NEWS_PORTAL_CONFIG.adsense,
      ...(data.adsense || {}),
    },
  };
}

export async function saveNewsPortalConfigToFirestore(
  config: NewsPortalConfig
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Admin belum terautentikasi.');
  }

  await setDoc(
    doc(db, COLLECTIONS.APP_STATE, NEWS_PORTAL_CONFIG_DOC_ID),
    sanitizeForFirestore({
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.uid,
    }),
    { merge: true }
  );
}

export function subscribeToNewsPortalConfig(
  callback: (config: NewsPortalConfig) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.APP_STATE, NEWS_PORTAL_CONFIG_DOC_ID),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(DEFAULT_NEWS_PORTAL_CONFIG);
        return;
      }

      const data = snapshot.data() as Partial<NewsPortalConfig>;

      callback({
        ...DEFAULT_NEWS_PORTAL_CONFIG,
        ...data,
        theme: {
          ...DEFAULT_NEWS_PORTAL_CONFIG.theme,
          ...(data.theme || {}),
        },
        settings: {
          ...DEFAULT_NEWS_PORTAL_CONFIG.settings,
          ...(data.settings || {}),
        },
        adsense: {
          ...DEFAULT_NEWS_PORTAL_CONFIG.adsense,
          ...(data.adsense || {}),
        },
      });
    },
    (error) => {
      console.warn('News portal config snapshot listener:', error);
      onError?.(error);
    }
  );
}


export interface FinanceSummary {
  totalKasMasuk: number;
  totalKasKeluar: number;
  saldoKasBersih: number;
  updatedAt: string;
}

/**
 * Recursively sanitizes data before sending to Firestore by removing any keys with `undefined` values.
 * This prevents Firestore's "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Save single member to Firestore
 */
export async function saveMemberToFirestore(member: Member): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, member.id);
    await setDoc(docRef, sanitizeForFirestore(member), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving member to Firestore:', error);
  }
}

/**
 * Delete member from Firestore
 */
export async function deleteMemberFromFirestore(memberId: string): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, COLLECTIONS.MEMBERS, memberId));
    await deleteDoc(doc(db, COLLECTIONS.PAYMENTS, memberId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (deleted locally):', error?.message);
      return;
    }
    console.error('Error deleting member from Firestore:', error);
  }
}

/**
 * Batch save all members to Firestore (e.g. initial seed or bulk import)
 */
export async function batchSaveMembersToFirestore(membersList: Member[]): Promise<void> {
  if (!auth.currentUser || membersList.length === 0) {
    return;
  }
  try {
    const batch = writeBatch(db);
    membersList.forEach((m) => {
      const docRef = doc(db, COLLECTIONS.MEMBERS, m.id);
      batch.set(docRef, sanitizeForFirestore(m), { merge: true });
    });
    await batch.commit();
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted for batch save (saved to local storage):', error?.message);
      return;
    }
    console.error('Error batch saving members to Firestore:', error);
  }
}

/**
 * Save single payment history record to Firestore
 */
export async function savePaymentHistoryToFirestore(payment: MemberPaymentHistory): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.PAYMENTS, payment.memberId);
    await setDoc(docRef, sanitizeForFirestore(payment), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving payment to Firestore:', error);
  }
}

/**
 * Batch save all payment histories to Firestore
 */
export async function batchSavePaymentsToFirestore(paymentsList: MemberPaymentHistory[]): Promise<void> {
  if (!auth.currentUser || paymentsList.length === 0) {
    return;
  }
  try {
    const batch = writeBatch(db);
    paymentsList.forEach((p) => {
      const docRef = doc(db, COLLECTIONS.PAYMENTS, p.memberId);
      batch.set(docRef, sanitizeForFirestore(p), { merge: true });
    });
    await batch.commit();
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted for payments (saved to local storage):', error?.message);
      return;
    }
    console.error('Error batch saving payments to Firestore:', error);
  }
}

/**
 * Save single cash transaction to Firestore
 */
export async function saveCashTransactionToFirestore(tx: CashTransaction): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.CASH_TRANSACTIONS, tx.id);
    await setDoc(docRef, sanitizeForFirestore(tx), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving cash transaction to Firestore:', error);
  }
}

/**
 * Batch save cash transactions to Firestore
 */
export async function batchSaveCashTransactionsToFirestore(txList: CashTransaction[]): Promise<void> {
  if (!auth.currentUser || txList.length === 0) {
    return;
  }
  try {
    const batch = writeBatch(db);
    txList.forEach((tx) => {
      const docRef = doc(db, COLLECTIONS.CASH_TRANSACTIONS, tx.id);
      batch.set(docRef, sanitizeForFirestore(tx), { merge: true });
    });
    await batch.commit();
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted for cash transactions (saved to local storage):', error?.message);
      return;
    }
    console.error('Error batch saving cash transactions to Firestore:', error);
  }
}

/**
 * Batch delete cash transactions from Firestore
 */
export async function batchDeleteCashTransactionsFromFirestore(txIds: string[]): Promise<void> {
  if (!auth.currentUser || txIds.length === 0) {
    return;
  }
  try {
    const batch = writeBatch(db);
    txIds.forEach((id) => {
      const docRef = doc(db, COLLECTIONS.CASH_TRANSACTIONS, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (deleted locally):', error?.message);
      return;
    }
    console.error('Error batch deleting cash transactions from Firestore:', error);
  }
}

/**
 * Delete cash transaction from Firestore
 */
export async function deleteCashTransactionFromFirestore(txId: string): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, COLLECTIONS.CASH_TRANSACTIONS, txId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (deleted locally):', error?.message);
      return;
    }
    console.error('Error deleting cash transaction from Firestore:', error);
  }
}

/**
 * Save lottery winner to Firestore
 */
export async function saveLotteryWinnerToFirestore(winner: LotteryWinner): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.LOTTERY_WINNERS, winner.id);
    await setDoc(docRef, sanitizeForFirestore(winner), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving lottery winner to Firestore:', error);
  }
}

/**
 * Delete lottery winner from Firestore
 */
export async function deleteLotteryWinnerFromFirestore(winnerId: string): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOTTERY_WINNERS, winnerId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (deleted locally):', error?.message);
      return;
    }
    console.error('Error deleting lottery winner from Firestore:', error);
  }
}

/**
 * Save Paguyuban profile to Firestore
 */
export async function saveProfileToFirestore(profile: PaguyubanProfile): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.APP_STATE, PROFILE_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({ profile, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving profile to Firestore:', error);
  }
}

/**
 * Save realtime finance summary to Firestore.
 *
 * Summary is intentionally stored in app_state so authenticated
 * members can read the aggregate balance without accessing the
 * admin-only cash_transactions collection.
 */

export interface MemberFinanceSummary {
  memberId: string;
  memberName: string;
  memberPhone: string;
  totalCashIn: number;
  totalCashOut: number;
  netCash: number;
  transactionCount: number;
  updatedAt: string;
}

export async function saveMemberFinanceSummaryToFirestore(
  summary: MemberFinanceSummary
): Promise<void> {
  if (!auth.currentUser) return;

  try {
    const docRef = doc(
      db,
      COLLECTIONS.MEMBER_FINANCE,
      summary.memberId
    );

    await setDoc(
      docRef,
      sanitizeForFirestore(summary),
      { merge: true }
    );
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      error?.message?.includes('insufficient permissions')
    ) {
      console.warn(
        'Member finance Firestore permission restricted:',
        error?.message
      );
      return;
    }

    console.error(
      'Error saving member finance summary:',
      error
    );
  }
}

export async function saveFinanceSummaryToFirestore(
  summary: FinanceSummary
): Promise<void> {
  if (!auth.currentUser) {
    return;
  }

  try {
    const docRef = doc(
      db,
      COLLECTIONS.APP_STATE,
      FINANCE_SUMMARY_DOC_ID
    );

    await setDoc(
      docRef,
      sanitizeForFirestore(summary),
      { merge: true }
    );
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      error?.message?.includes('insufficient permissions')
    ) {
      console.warn(
        'Finance summary Firestore permission restricted:',
        error?.message
      );
      return;
    }

    console.error(
      'Error saving finance summary to Firestore:',
      error
    );
  }
}

/**
 * Seed initial data if Firestore is empty
 */
export async function seedInitialDataIfEmpty(
  initialMembers: Member[],
  initialPayments: MemberPaymentHistory[],
  initialCashTx: CashTransaction[],
  initialWinners: LotteryWinner[],
  initialProfile: PaguyubanProfile
): Promise<void> {
  if (!auth.currentUser) {
    return;
  }

  // Hindari pengecekan getDocs berulang setiap refresh.
  // Seed awal hanya boleh dicoba sekali selama sesi browser ini.
  const seedKey = 'paguyuban_firestore_seed_checked_v1';
  if (sessionStorage.getItem(seedKey) === '1') {
    return;
  }

  try {
    sessionStorage.setItem(seedKey, '1');

    const membersSnap = await getDocs(collection(db, COLLECTIONS.MEMBERS));

    if (membersSnap.empty) {
      console.log('Seeding initial members & payments to Firestore...');
      await batchSaveMembersToFirestore(initialMembers);
      await batchSavePaymentsToFirestore(initialPayments);

      const batch = writeBatch(db);

      initialCashTx.forEach((tx) => {
        batch.set(
          doc(db, COLLECTIONS.CASH_TRANSACTIONS, tx.id),
          sanitizeForFirestore(tx)
        );
      });

      initialWinners.forEach((w) => {
        batch.set(
          doc(db, COLLECTIONS.LOTTERY_WINNERS, w.id),
          sanitizeForFirestore(w)
        );
      });

      batch.set(
        doc(db, COLLECTIONS.APP_STATE, PROFILE_DOC_ID),
        sanitizeForFirestore({
          profile: initialProfile,
          updatedAt: new Date().toISOString(),
        })
      );

      await batch.commit();
      console.log('Initial data seeded successfully to Firebase Firestore.');
    }
  } catch (error: any) {
    console.warn(
      'Could not seed initial data to Firestore (will use local state):',
      error?.message || error
    );
  }
}

/**
 * Save Adzan settings to Firestore
 */
export async function saveAdzanSettingsToFirestore(settings: AdzanSettings): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTIONS.APP_STATE, ADZAN_SETTINGS_DOC_ID);
    await setDoc(docRef, sanitizeForFirestore({ settings, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn('Firestore write permission restricted (saved to local storage):', error?.message);
      return;
    }
    console.error('Error saving adzan settings to Firestore:', error);
  }
}

/**
 * Subscribe to Adzan settings from Firestore
 */
export function subscribeToAdzanSettings(
  onSettingsUpdate: (settings: AdzanSettings) => void
): () => void {
  try {
    const docRef = doc(db, COLLECTIONS.APP_STATE, ADZAN_SETTINGS_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.settings) {
            onSettingsUpdate(data.settings);
          }
        }
      },
      (error) => {
        console.warn('Adzan settings subscription notice:', error?.message);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to adzan settings:', err);
    return () => {};
  }
}



// =====================================================
// BERITA
// =====================================================

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  category?: string;
  status: 'draft' | 'published';

  // SEO dan publikasi
  slug?: string;
  excerpt?: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  keywords?: string[];
  altText?: string;
  factCheckNotes?: string[];
  publishedAt?: Date;

  authorId?: string;
  authorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsComment {
  id: string;
  newsId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: Date;
  status?: 'pending' | 'approved' | 'hidden';
  moderatedBy?: string;
  moderatedAt?: Date;
}

// Mengambil seluruh berita.
// Berita terbaru ditempatkan lebih dahulu berdasarkan createdAt.
/**
 * Mengambil hanya berita yang sudah dipublikasikan.
 * Fungsi ini digunakan untuk halaman berita publik sehingga
 * pengunjung tanpa login tidak pernah menerima draft.
 */
export async function getPublishedNewsFromFirestore(): Promise<NewsArticle[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.NEWS),
      where('status', '==', 'published')
    )
  );

  const news: NewsArticle[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    news.push({
      id: docSnap.id,
      title: data.title || '',
      content: data.content || '',
      imageUrl: data.imageUrl || '',
      category: data.category || '',
      status: data.status || 'published',

      slug: data.slug || '',
      excerpt: data.excerpt || '',
      seoTitle: data.seoTitle || '',
      metaDescription: data.metaDescription || '',
      focusKeyword: data.focusKeyword || '',
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      altText: data.altText || '',
      factCheckNotes: Array.isArray(data.factCheckNotes)
        ? data.factCheckNotes
        : [],
      publishedAt: data.publishedAt?.toDate
        ? data.publishedAt.toDate()
        : undefined,

      authorId: data.authorId || '',
      authorName: data.authorName || '',
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt || Date.now()),
    });
  });

  news.sort(
    (a, b) => {
      const aTime = (a.publishedAt || a.createdAt).getTime();
      const bTime = (b.publishedAt || b.createdAt).getTime();
      return bTime - aTime;
    }
  );

  return news;
}

export async function getNewsFromFirestore(): Promise<NewsArticle[]> {
  const snapshot = await getDocs(
    collection(db, COLLECTIONS.NEWS)
  );

  const news: NewsArticle[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    news.push({
      id: docSnap.id,
      title: data.title || '',
      content: data.content || '',
      imageUrl: data.imageUrl || '',
      category: data.category || '',
      status: data.status || 'published',

      slug: data.slug || '',
      excerpt: data.excerpt || '',
      seoTitle: data.seoTitle || '',
      metaDescription: data.metaDescription || '',
      focusKeyword: data.focusKeyword || '',
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      altText: data.altText || '',
      factCheckNotes: Array.isArray(data.factCheckNotes)
        ? data.factCheckNotes
        : [],
      publishedAt: data.publishedAt?.toDate
        ? data.publishedAt.toDate()
        : undefined,

      authorId: data.authorId || '',
      authorName: data.authorName || '',
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt || Date.now()),
    });
  });

  news.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return news;
}

// Menyimpan berita baru.
export async function saveNewsToFirestore(
  news: Omit<NewsArticle, 'id'>
): Promise<string> {
  const newsRef = doc(collection(db, COLLECTIONS.NEWS));

  await setDoc(
    newsRef,
    sanitizeForFirestore(news)
  );

  return newsRef.id;
}

// Memperbarui berita.
export async function updateNewsInFirestore(
  newsId: string,
  data: Partial<Omit<NewsArticle, 'id'>>
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.NEWS, newsId),
    sanitizeForFirestore({
      ...data,
      updatedAt: new Date(),
    }),
    { merge: true }
  );
}

// Menghapus berita dan komentarnya.
export async function deleteNewsFromFirestore(
  newsId: string
): Promise<void> {
  const commentsSnapshot = await getDocs(
    collection(db, COLLECTIONS.NEWS_COMMENTS)
  );

  const batch = writeBatch(db);

  commentsSnapshot.forEach((commentDoc) => {
    if (commentDoc.data().newsId === newsId) {
      batch.delete(commentDoc.ref);
    }
  });

  batch.delete(
    doc(db, COLLECTIONS.NEWS, newsId)
  );

  await batch.commit();
}

// Mengambil komentar untuk satu berita.
export async function getNewsCommentsFromFirestore(
  newsId: string
): Promise<NewsComment[]> {
  // Publik/anggota hanya membaca komentar yang sudah disetujui.
  // Query status dilakukan di Firestore agar pending/hidden tidak ikut terbaca.
  const commentsSnapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.NEWS_COMMENTS),
      where('status', '==', 'approved')
    )
  );

  const comments: NewsComment[] = [];

  commentsSnapshot.forEach((commentDoc) => {
    const data = commentDoc.data();

    if (data.newsId === newsId) {
      const status = 'approved';

      comments.push({
        id: commentDoc.id,
        newsId: data.newsId || newsId,
        userId: data.userId || '',
        userName: data.userName || 'Pengunjung',
        comment: data.comment || '',
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt || Date.now()),
        status,
        moderatedBy: data.moderatedBy || undefined,
        moderatedAt: data.moderatedAt?.toDate
          ? data.moderatedAt.toDate()
          : undefined,
      });
    }
  });

  comments.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  return comments;
}

/**
 * Mengambil SEMUA komentar untuk panel admin.
 * Hanya dipanggil oleh area admin.
 */
export async function getAllNewsCommentsFromFirestore(): Promise<NewsComment[]> {
  const commentsSnapshot = await getDocs(
    collection(db, COLLECTIONS.NEWS_COMMENTS)
  );

  const comments: NewsComment[] = [];

  commentsSnapshot.forEach((commentDoc) => {
    const data = commentDoc.data();

    comments.push({
      id: commentDoc.id,
      newsId: data.newsId || '',
      userId: data.userId || '',
      userName: data.userName || 'Pengunjung',
      comment: data.comment || '',
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt || Date.now()),
      status: data.status || 'approved',
      moderatedBy: data.moderatedBy || undefined,
      moderatedAt: data.moderatedAt?.toDate
        ? data.moderatedAt.toDate()
        : undefined,
    });
  });

  comments.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return comments;
}

/**
 * Moderasi komentar oleh admin.
 */
export async function moderateNewsComment(
  commentId: string,
  status: 'pending' | 'approved' | 'hidden'
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Admin belum terautentikasi.');
  }

  const commentRef = doc(
    db,
    COLLECTIONS.NEWS_COMMENTS,
    commentId
  );

  await setDoc(
    commentRef,
    sanitizeForFirestore({
      status,
      moderatedBy: auth.currentUser.uid,
      moderatedAt: new Date(),
    }),
    { merge: true }
  );
}

/**
 * Menghapus komentar oleh admin.
 */
export async function deleteNewsCommentFromFirestore(
  commentId: string
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Admin belum terautentikasi.');
  }

  const commentRef = doc(
    db,
    COLLECTIONS.NEWS_COMMENTS,
    commentId
  );

  await deleteDoc(commentRef);
}

export async function saveNewsCommentToFirestore(
  comment: Omit<NewsComment, 'id'>
): Promise<string> {
  const commentRef = doc(
    collection(db, COLLECTIONS.NEWS_COMMENTS)
  );

  await setDoc(
    commentRef,
    sanitizeForFirestore({
      ...comment,
      status: comment.status || 'pending',
    })
  );

  return commentRef.id;
}
