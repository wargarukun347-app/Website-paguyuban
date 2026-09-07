import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Member, MemberPaymentHistory, CashTransaction, LotteryWinner, PaguyubanProfile, AdzanSettings } from '../types';

export const COLLECTIONS = {
  MEMBERS: 'members',
  PAYMENTS: 'payments',
  CASH_TRANSACTIONS: 'cash_transactions',
  LOTTERY_WINNERS: 'lottery_winners',
  APP_STATE: 'app_state',
};

const PROFILE_DOC_ID = 'paguyuban_profile';
const ADZAN_SETTINGS_DOC_ID = 'adzan_settings';

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
  try {
    const membersSnap = await getDocs(collection(db, COLLECTIONS.MEMBERS));
    if (membersSnap.empty) {
      console.log('Seeding initial members & payments to Firestore...');
      await batchSaveMembersToFirestore(initialMembers);
      await batchSavePaymentsToFirestore(initialPayments);
      
      const batch = writeBatch(db);
      initialCashTx.forEach((tx) => {
        batch.set(doc(db, COLLECTIONS.CASH_TRANSACTIONS, tx.id), sanitizeForFirestore(tx));
      });
      initialWinners.forEach((w) => {
        batch.set(doc(db, COLLECTIONS.LOTTERY_WINNERS, w.id), sanitizeForFirestore(w));
      });
      batch.set(doc(db, COLLECTIONS.APP_STATE, PROFILE_DOC_ID), sanitizeForFirestore({
        profile: initialProfile,
        updatedAt: new Date().toISOString(),
      }));
      await batch.commit();
      console.log('Initial data seeded successfully to Firebase Firestore.');
    }
  } catch (error: any) {
    console.warn('Could not seed initial data to Firestore (will use local state):', error?.message || error);
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

