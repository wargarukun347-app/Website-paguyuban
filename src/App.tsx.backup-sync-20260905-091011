/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { 
  COLLECTIONS, 
  saveMemberToFirestore, 
  deleteMemberFromFirestore, 
  batchSaveMembersToFirestore, 
  savePaymentHistoryToFirestore, 
  batchSavePaymentsToFirestore, 
  saveCashTransactionToFirestore, 
  deleteCashTransactionFromFirestore, 
  batchSaveCashTransactionsToFirestore,
  batchDeleteCashTransactionsFromFirestore,
  saveLotteryWinnerToFirestore, 
  deleteLotteryWinnerFromFirestore, 
  saveProfileToFirestore, 
  seedInitialDataIfEmpty 
} from './lib/firestoreService';
import { 
  buildArisanSyncTransaction, 
  buildIuranSyncTransaction, 
  buildLotterySyncTransaction, 
  reconcileAllTransactions 
} from './utils/syncFinance';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import BeritaView from './components/BeritaView';
import MemberNewsPortal from './components/MemberNewsPortal';
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const ArisanView = lazy(() => import('./components/ArisanView').then(m => ({ default: m.ArisanView })));
const IuranView = lazy(() => import('./components/IuranView').then(m => ({ default: m.IuranView })));
const CashInView = lazy(() => import('./components/CashInView').then(m => ({ default: m.CashInView })));
const CashOutView = lazy(() => import('./components/CashOutView').then(m => ({ default: m.CashOutView })));
const LotteryView = lazy(() => import('./components/LotteryView').then(m => ({ default: m.LotteryView })));
const MembersView = lazy(() => import('./components/MembersView').then(m => ({ default: m.MembersView })));
const PrayerTimesView = lazy(() => import('./components/PrayerTimesView').then(m => ({ default: m.PrayerTimesView })));
import { ReceiptModal } from './components/ReceiptModal';
import { BulkReceiptModal } from './components/BulkReceiptModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import { WinnerCertificateModal } from './components/WinnerCertificateModal';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { VerifiedDocumentModal, VerifiedDocData } from './components/VerifiedDocumentModal';
import { LoginView } from './components/LoginView';
const UserDashboardView = lazy(() => import('./components/UserDashboardView').then(m => ({ default: m.UserDashboardView })));
const AdminChatView = lazy(() => import('./components/AdminChatView').then(m => ({ default: m.AdminChatView })));
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { subscribeToAuthChanges, logoutUser } from './lib/authService';
import { getStoredChatMessages } from './utils/chatManager';
import { 
  INITIAL_MEMBERS, 
  getInitialPaymentHistory, 
  INITIAL_CASH_TRANSACTIONS, 
  INITIAL_LOTTERY_WINNERS,
  INITIAL_PAGUYUBAN_PROFILE
} from './data/initialData';
import { Member, MemberPaymentHistory, CashTransaction, LotteryWinner, PaguyubanProfile, AuthUser, ChatMessage } from './types';

const STORAGE_KEYS = {
  MEMBERS: 'arisan_p3n_members_v2',
  PAYMENTS: 'arisan_p3n_payments_v1',
  CASH_TX: 'arisan_p3n_cashtx_v1',
  WINNERS: 'arisan_p3n_winners_v1',
  PROFILE: 'arisan_p3n_profile_v1',
  THEME: 'arisan_p3n_theme_v1',
};

function getPublicNewsPath() {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/berita') {
    return { type: 'list' as const, slug: null };
  }

  if (path.startsWith('/berita/')) {
    const slug = decodeURIComponent(
      path.slice('/berita/'.length)
    ).trim();

    if (slug) {
      return { type: 'detail' as const, slug };
    }
  }

  return null;
}

function App() {
  const publicNewsRoute = getPublicNewsPath();
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Subscribe to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
      if (user) {
        if (user.role === 'user') {
          setActiveTab('user_portal');
        } else if (user.role === 'admin') {
          setActiveTab((prev) => (prev === 'user_portal' ? 'dashboard' : prev));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Dark mode state with immediate DOM class reflection
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_KEYS.THEME, 'light');
      }
      return next;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Active Tab & Navigation
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    const saved = localStorage.getItem('arisan_p3n_active_tab_v1');
    return (saved as TabType) || 'dashboard';
  });

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    localStorage.setItem('arisan_p3n_active_tab_v1', tab);
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const activeYear = 2026;

  // Selected Winner for Certificate Modal
  const [selectedWinnerForCert, setSelectedWinnerForCert] = useState<LotteryWinner | null>(null);

  // Safe tab selection with strict role-based guard
const handleSelectTab = useCallback((tab: TabType) => {
  if (currentUser?.role === 'user') {
    // Member can access user portal, berita, prayer times, and profile
    if (tab !== 'user_portal' && tab !== 'berita' && tab !== 'prayer_times' && tab !== 'profile') {
      setActiveTab('user_portal');
      return;
    }
  }

  setActiveTab(tab);
}, [currentUser]);

// Authentication Handlers
  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'user') {
      setActiveTab('user_portal');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };


  // Firebase Sync State
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(false);

  // Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Verified Barcode Scan Modal State (detected via URL query params or manual trigger)
  const [verifiedDocData, setVerifiedDocData] = useState<VerifiedDocData | null>(null);

  // Members State (local fallback + Firestore sync)
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_MEMBERS;
  });

  // Auto-resolve partial / nickname to full official name in dashboard for logged-in members
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || members.length === 0) return;

    const userEmail = currentUser.email?.toLowerCase().trim();
    const currentUserName = currentUser.name?.toLowerCase().trim() || '';

    // Match by email, memberId, or name matching
    const matched = members.find((m) => {
      if (currentUser.memberId && (m.id === currentUser.memberId || (m as any).userId === currentUser.id)) return true;
      if (userEmail && (m.email?.toLowerCase() === userEmail)) return true;
      if (currentUserName) {
        const mName = m.name.toLowerCase();
        if (mName === currentUserName) return true;
        if (mName.includes(currentUserName) && currentUserName.length >= 3) return true;
        const strippedMName = mName.replace(/^(h\.|k\.h\.|drs\.|dr\.|kh\.|ust\.|haji)\s+/i, '').trim();
        if (strippedMName.includes(currentUserName) || currentUserName.includes(strippedMName)) return true;
      }
      return false;
    });

    if (matched && matched.name !== currentUser.name) {
      setCurrentUser((prev) => prev ? {
        ...prev,
        name: matched.name,
        memberId: matched.id,
        phoneNumber: matched.phone || prev.phoneNumber,
      } : null);
    }
  }, [currentUser?.id, currentUser?.name, members]);

  // Payments State
  const [payments, setPayments] = useState<MemberPaymentHistory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return getInitialPaymentHistory();
  });

  // Cash Transactions State
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_TX);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_CASH_TRANSACTIONS;
  });

  // Lottery Winners State
  const [lotteryWinners, setLotteryWinners] = useState<LotteryWinner[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WINNERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_LOTTERY_WINNERS;
  });

  // Paguyuban Profile State
  const [profile, setProfile] = useState<PaguyubanProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_PAGUYUBAN_PROFILE;
  });

  // Receipt Modal State
  const [receiptModal, setReceiptModal] = useState<{
    member: Member;
    month: number;
    type: 'arisan' | 'iuran';
  } | null>(null);

  // Bulk Receipt Modal State
  const [bulkReceiptModal, setBulkReceiptModal] = useState<{
    type: 'arisan' | 'iuran';
    month: number;
  } | null>(null);

  // WhatsApp Reminder Modal State
  const [whatsAppReminderModal, setWhatsAppReminderModal] = useState<{
    type: 'iuran' | 'arisan' | 'kombinasi';
    month: number;
    singleMember?: Member | null;
  } | null>(null);

  // 1. Check URL parameters for Barcode / QR Code Verification (PDF View)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const verifyType = searchParams.get('verify');
      const docParam = searchParams.get('doc');

      if (verifyType || docParam) {
        const docNo = docParam || searchParams.get('doc') || 'BA-ARS/2026/05/001';
        const docType = (searchParams.get('type') as 'ba' | 'kwitansi') || (docNo.startsWith('KW') ? 'kwitansi' : 'ba');
        const roundNo = Number(searchParams.get('round')) || 1;
        const winnerName = searchParams.get('winner') || 'Anggota Paguyuban';
        const cat = searchParams.get('cat') || 'P3N';
        const amt = Number(searchParams.get('amt')) || 1850000;
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const chair = searchParams.get('chair') || profile.officialDocumentConfig?.chairmanName || 'Drs. H. Mustofa';
        const treas = searchParams.get('treas') || profile.officialDocumentConfig?.treasurerName || 'Hj. Siti Aminah, S.Ag';
        const code = searchParams.get('code') || `P3N-ARS-2026-${roundNo.toString().padStart(2, '0')}-VALID`;
        const notes = searchParams.get('notes') || undefined;

        setVerifiedDocData({
          docNumber: docNo,
          docType,
          roundNumber: roundNo,
          winnerName,
          category: cat,
          prizeAmount: amt,
          drawDate: date,
          chairmanName: chair,
          treasurerName: treas,
          paguyubanName: profile.name || 'Paguyuban Bani P3N KUA Kedungbanteng',
          verificationCode: code,
          verifiedAt: new Date().toISOString(),
          logoUrl: profile.logoUrl,
          notes,
        });
      }
    } catch (err) {
      console.warn('Error parsing verification URL:', err);
    }
  }, [profile]);

  // 2. Initialize Firestore Cloud Synchronization & Listeners based on authenticated Role
  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;
    const unsubs: (() => void)[] = [];

    const setupFirestore = async () => {
      try {
        setIsFirebaseSyncing(true);
        // Only attempt initial seeding when user has verified admin role
        if (currentUser.role === 'admin') {
          await seedInitialDataIfEmpty(
            INITIAL_MEMBERS,
            getInitialPaymentHistory(),
            INITIAL_CASH_TRANSACTIONS,
            INITIAL_LOTTERY_WINNERS,
            INITIAL_PAGUYUBAN_PROFILE
          );
        }
      } catch (err) {
        console.warn('Firestore initial check error (using offline state):', err);
      } finally {
        if (isSubscribed) setIsFirebaseSyncing(false);
      }
    };

    setupFirestore();

    if (currentUser.role === 'admin') {
      // Admin: Listen to entire Members collection
      const unsubMembers = onSnapshot(collection(db, COLLECTIONS.MEMBERS), (snapshot) => {
        if (!snapshot.empty) {
          const cloudMembers: Member[] = [];
          snapshot.forEach((docSnap) => {
            cloudMembers.push(docSnap.data() as Member);
          });
          cloudMembers.sort((a, b) => a.no - b.no);
          setMembers(cloudMembers);
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cloudMembers));
        }
      }, (err) => console.warn('Members snapshot listener:', err));
      unsubs.push(unsubMembers);

      // Admin: Listen to entire Payments collection
      // Merge Firestore snapshots with the current local state so that a
      // delayed snapshot cannot overwrite a payment that was just toggled.
      const unsubPayments = onSnapshot(collection(db, COLLECTIONS.PAYMENTS), (snapshot) => {
        const cloudPayments: MemberPaymentHistory[] = [];

        snapshot.forEach((docSnap) => {
          cloudPayments.push(docSnap.data() as MemberPaymentHistory);
        });

        setPayments((currentPayments) => {
          const currentByMember = new Map(
            currentPayments.map((payment) => [payment.memberId, payment])
          );

          const merged = cloudPayments.map((cloudPayment: any) => {
      const localPayment: any = currentByMember.get(cloudPayment.memberId);

      if (localPayment) {
        return cloudPayment;
      }

      return {
        ...cloudPayment,
        arisan: [
          ...(cloudPayment.arisan || []),
          ...(localPayment?.arisan || []),
        ],
        iuran: [
          ...(cloudPayment.iuran || []),
          ...(localPayment?.iuran || []),
        ],
      };
    });

    // Keep locally-created member payment records until Firestore
          // contains them as well.
          const cloudMemberIds = new Set(
            cloudPayments.map((payment) => payment.memberId)
          );

          currentPayments.forEach((localPayment) => {
            if (!cloudMemberIds.has(localPayment.memberId)) {
              merged.push(localPayment);
            }
          });

          return merged;
        });
      }, (err) => console.warn('Payments snapshot listener:', err));
      unsubs.push(unsubPayments);

      // Admin: Listen to Cash Transactions collection
      const unsubCashTx = onSnapshot(collection(db, COLLECTIONS.CASH_TRANSACTIONS), (snapshot) => {
        if (!snapshot.empty) {
          const cloudTx: CashTransaction[] = [];
          snapshot.forEach((docSnap) => {
            cloudTx.push(docSnap.data() as CashTransaction);
          });
          cloudTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setCashTransactions(cloudTx);
          localStorage.setItem(STORAGE_KEYS.CASH_TX, JSON.stringify(cloudTx));
        }
      }, (err) => console.warn('CashTx snapshot listener:', err));
      unsubs.push(unsubCashTx);

    } else {
      // Member: Listen strictly to their own Member document
      const memberId = currentUser.memberId || currentUser.uid;
      const unsubMemberDoc = onSnapshot(doc(db, COLLECTIONS.MEMBERS, memberId), (docSnap) => {
        if (docSnap.exists()) {
          const singleMember = docSnap.data() as Member;
          setMembers((prev) => {
            const index = prev.findIndex((m) => m.id === singleMember.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = singleMember;
              return updated;
            }
            return [singleMember];
          });
        }
      }, (err) => console.warn('Single member snapshot listener:', err));
      unsubs.push(unsubMemberDoc);

      // Member: Listen strictly to their own Payments document
      const unsubPaymentDoc = onSnapshot(doc(db, COLLECTIONS.PAYMENTS, memberId), (docSnap) => {
        if (docSnap.exists()) {
          const singlePayment = docSnap.data() as MemberPaymentHistory;
          setPayments((prev) => {
            const index = prev.findIndex((p) => p.memberId === singlePayment.memberId);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = singlePayment;
              return updated;
            }
            return [singlePayment];
          });
        }
      }, (err) => console.warn('Single payment snapshot listener:', err));
      unsubs.push(unsubPaymentDoc);
    }

    // Lottery winners are kept from localStorage and synchronized on add/update/delete.
    // Avoid a full collection listener here to reduce unnecessary Firestore reads.

    // Both Admin & Member: Listen to Paguyuban Profile
    const unsubProfile = onSnapshot(doc(db, COLLECTIONS.APP_STATE, 'paguyuban_profile'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile) {
          setProfile(data.profile as PaguyubanProfile);
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data.profile));
        }
      }
    }, (err) => console.warn('Profile snapshot listener:', err));
    unsubs.push(unsubProfile);

    return () => {
      isSubscribed = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.memberId]);

  // Save changes to localStorage as secondary backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_TX, JSON.stringify(cashTransactions));
  }, [cashTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(lotteryWinners));
  }, [lotteryWinners]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  // Toggle Single Payment Month with instant Cash In synchronization
  const handleTogglePayment = async (memberId: string, month: number, type: 'arisan' | 'iuran') => {
    const key = `${activeYear}-${month}`;
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const paidDate = new Date().toISOString().split('T')[0];

    // Build the complete updated payment record from the latest React state.
    // Do NOT assign variables from inside setPayments(), because React state
    // updates are asynchronous and this can cause one month's data to overwrite another.
    const existing = payments.find((p) => p.memberId === memberId);

    const baseRecord: MemberPaymentHistory = existing
      ? {
          ...existing,
          arisan: { ...existing.arisan },
          iuran: { ...existing.iuran },
        }
      : {
          memberId,
          arisan: {},
          iuran: {},
        };

    // Ensure all 12 months exist without replacing existing paid data.
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${activeYear}-${m}`;

      if (!baseRecord.arisan[monthKey]) {
        baseRecord.arisan[monthKey] = {
          month: m,
          year: activeYear,
          isPaid: false,
          amount: 50000,
        };
      }

      if (!baseRecord.iuran[monthKey]) {
        baseRecord.iuran[monthKey] = {
          month: m,
          year: activeYear,
          isPaid: false,
          amount: 20000,
        };
      }
    }

    const currentRecord = baseRecord[type][key];
    const willBePaid = !currentRecord?.isPaid;

    const receiptNo = willBePaid
      ? `${type === 'arisan' ? 'KW-ARS' : 'KW-IUR'}/${activeYear}/${month
          .toString()
          .padStart(2, '0')}/${member.no.toString().padStart(3, '0')}`
      : undefined;

    // Update ONLY the selected month.
    // All other months remain untouched.
    const updatedMonthRecord = {
      month,
      year: activeYear,
      isPaid: willBePaid,
      paidDate: willBePaid ? paidDate : undefined,
      amount: type === 'arisan' ? 50000 : 20000,
      receiptNo,
    };

    const updatedPaymentRecord: MemberPaymentHistory = {
      ...baseRecord,
      [type]: {
        ...baseRecord[type],
        [key]: updatedMonthRecord,
      },
    };

    // Update local state immediately.
    setPayments((prev) => {
      const exists = prev.some((p) => p.memberId === memberId);

      if (!exists) {
        return [...prev, updatedPaymentRecord];
      }

      return prev.map((p) =>
        p.memberId === memberId ? updatedPaymentRecord : p
      );
    });

    // Save the COMPLETE payment history to Firestore.
    // merge:true in firestoreService preserves the other fields/months.
    await savePaymentHistoryToFirestore(updatedPaymentRecord);

    // Synchronize directly with Cash Transactions (Buku Kas Masuk)
    const syncTxId = `tx-sync-${type}-${memberId}-${activeYear}-${month}`;

    if (willBePaid) {
      const syncTx = type === 'arisan'
        ? buildArisanSyncTransaction(member, month, activeYear, paidDate)
        : buildIuranSyncTransaction(member, month, activeYear, paidDate);

      setCashTransactions((prev) => {
        const withoutOld = prev.filter((t) => t.id !== syncTxId);

        return [syncTx, ...withoutOld].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      await saveCashTransactionToFirestore(syncTx);
    } else {
      setCashTransactions((prev) =>
        prev.filter((t) => t.id !== syncTxId)
      );

      await deleteCashTransactionFromFirestore(syncTxId);
    }
  };

  // Add Cash Transaction
  const handleAddCashTransaction = async (tx: Omit<CashTransaction, 'id' | 'type'>, type: 'in' | 'out') => {
    const newTx: CashTransaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      type,
    };
    setCashTransactions((prev) => [newTx, ...prev]);
    await saveCashTransactionToFirestore(newTx);
  };

  const handleDeleteCashTransaction = async (id: string) => {
    setCashTransactions((prev) => prev.filter((t) => t.id !== id));
    await deleteCashTransactionFromFirestore(id);
  };

  // Add Lottery Winner with instant Cash Out synchronization
  const handleAddLotteryWinner = async (winnerData: Omit<LotteryWinner, 'id'>) => {
    const newWinnerId = `lot-${Date.now()}`;
    const newWinner: LotteryWinner = {
      ...winnerData,
      id: newWinnerId,
    };
    setLotteryWinners((prev) => [...prev, newWinner]);
    await saveLotteryWinnerToFirestore(newWinner);

    // Automatically create synchronized cash transaction for payout (Buku Kas Keluar)
    const syncPayoutTx = buildLotterySyncTransaction(newWinner, activeYear);
    setCashTransactions((prev) => {
      const withoutOld = prev.filter((t) => t.id !== syncPayoutTx.id);
      return [syncPayoutTx, ...withoutOld].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
    await saveCashTransactionToFirestore(syncPayoutTx);
  };

  const handleUpdateLotteryWinner = async (updatedWinner: LotteryWinner) => {
    setLotteryWinners((prev) =>
      prev.map((w) => (w.id === updatedWinner.id ? updatedWinner : w))
    );
    await saveLotteryWinnerToFirestore(updatedWinner);

    // Update synchronized cash transaction
    const syncPayoutTx = buildLotterySyncTransaction(updatedWinner, activeYear);
    setCashTransactions((prev) => {
      const exists = prev.some((t) => t.id === syncPayoutTx.id);
      if (exists) {
        return prev.map((t) => (t.id === syncPayoutTx.id ? syncPayoutTx : t));
      } else {
        return [syncPayoutTx, ...prev].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      }
    });
    await saveCashTransactionToFirestore(syncPayoutTx);
  };

  const handleDeleteLotteryWinner = async (id: string) => {
    setLotteryWinners((prev) => prev.filter((w) => w.id !== id));
    await deleteLotteryWinnerFromFirestore(id);

    // Delete synchronized cash transaction
    const syncTxId = `tx-sync-lottery-${id}`;
    setCashTransactions((prev) => prev.filter((t) => t.id !== syncTxId && t.id !== `tx-${id}`));
    await deleteCashTransactionFromFirestore(syncTxId);
  };

  // Reconcile / Synchronize all payments & lottery winners with cash transactions
  const handleSyncAllFinance = async () => {
    const result = reconcileAllTransactions(
      members,
      payments,
      lotteryWinners,
      cashTransactions,
      activeYear
    );
    setCashTransactions(result.reconciledTransactions);
    localStorage.setItem(STORAGE_KEYS.CASH_TX, JSON.stringify(result.reconciledTransactions));

    if (result.addedTransactions.length > 0) {
      await batchSaveCashTransactionsToFirestore(result.addedTransactions);
    }
    if (result.deletedTxIds.length > 0) {
      await batchDeleteCashTransactionsFromFirestore(result.deletedTxIds);
    }
    return result;
  };

  // Member CRUD
  const handleAddMember = async (memberData: Omit<Member, 'id' | 'no'>) => {
    const newNo = members.length > 0 ? Math.max(...members.map((m) => m.no)) + 1 : 1;
    const newId = `m-${Date.now()}`;
    const newMember: Member = {
      ...memberData,
      id: newId,
      no: newNo,
    };

    setMembers((prev) => [...prev, newMember]);
    await saveMemberToFirestore(newMember);

    // Initialize empty payment record
    const emptyArisan: { [key: string]: any } = {};
    const emptyIuran: { [key: string]: any } = {};
    for (let m = 1; m <= 12; m++) {
      emptyArisan[`${activeYear}-${m}`] = { month: m, year: activeYear, isPaid: false, amount: 50000 };
      emptyIuran[`${activeYear}-${m}`] = { month: m, year: activeYear, isPaid: false, amount: 20000 };
    }

    const newPayment: MemberPaymentHistory = {
      memberId: newId,
      arisan: emptyArisan,
      iuran: emptyIuran,
    };

    setPayments((prev) => [...prev, newPayment]);
    await savePaymentHistoryToFirestore(newPayment);
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    await saveMemberToFirestore(updatedMember);
  };

  const handleDeleteMember = async (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setPayments((prev) => prev.filter((p) => p.memberId !== id));
    await deleteMemberFromFirestore(id);
  };

  const handleBulkImportMembers = async (importedList: Omit<Member, 'id' | 'no'>[]) => {
    let currentMaxNo = members.length > 0 ? Math.max(...members.map((m) => m.no)) : 0;
    const newMembers: Member[] = [];
    const newPaymentHistories: MemberPaymentHistory[] = [];

    importedList.forEach((item) => {
      currentMaxNo++;
      const newId = `m-imp-${Date.now()}-${currentMaxNo}`;
      const newM: Member = {
        ...item,
        id: newId,
        no: currentMaxNo,
      };
      newMembers.push(newM);

      const emptyArisan: { [key: string]: any } = {};
      const emptyIuran: { [key: string]: any } = {};
      for (let m = 1; m <= 12; m++) {
        emptyArisan[`${activeYear}-${m}`] = { month: m, year: activeYear, isPaid: false, amount: 50000 };
        emptyIuran[`${activeYear}-${m}`] = { month: m, year: activeYear, isPaid: false, amount: 20000 };
      }
      newPaymentHistories.push({
        memberId: newId,
        arisan: emptyArisan,
        iuran: emptyIuran,
      });
    });

    setMembers((prev) => [...prev, ...newMembers]);
    setPayments((prev) => [...prev, ...newPaymentHistories]);

    await batchSaveMembersToFirestore(newMembers);
    await batchSavePaymentsToFirestore(newPaymentHistories);
  };

  const handleUpdateProfile = async (updated: PaguyubanProfile) => {
    setProfile(updated);
    await saveProfileToFirestore(updated);
  };

  // Restore data from Google Drive or JSON file
  const handleRestoreData = async (backupData: {
    members?: Member[];
    payments?: MemberPaymentHistory[];
    cashTransactions?: CashTransaction[];
    lotteryWinners?: LotteryWinner[];
    profile?: PaguyubanProfile;
  }) => {
    if (backupData.members && Array.isArray(backupData.members)) {
      setMembers(backupData.members);
      await batchSaveMembersToFirestore(backupData.members);
    }
    if (backupData.payments && Array.isArray(backupData.payments)) {
      setPayments(backupData.payments);
      await batchSavePaymentsToFirestore(backupData.payments);
    }
    if (backupData.cashTransactions && Array.isArray(backupData.cashTransactions)) {
      setCashTransactions(backupData.cashTransactions);
      for (const tx of backupData.cashTransactions) {
        await saveCashTransactionToFirestore(tx);
      }
    }
    if (backupData.lotteryWinners && Array.isArray(backupData.lotteryWinners)) {
      setLotteryWinners(backupData.lotteryWinners);
      for (const w of backupData.lotteryWinners) {
        await saveLotteryWinnerToFirestore(w);
      }
    }
    if (backupData.profile) {
      setProfile(backupData.profile);
      await saveProfileToFirestore(backupData.profile);
    }
  };

  // Tab Title helper
  const getTabTitle = (tab: TabType): string => {
    switch (tab) {
    case 'berita': return 'Berita';
      case 'dashboard':
        return 'Dashboard';
      case 'user_portal':
        return 'Data Anggota';
      case 'messages':
        return 'Pesan & Chat';
      case 'prayer_times':
        return 'Jadwal Sholat';
      case 'profile':
        return 'Profil';
      case 'arisan':
        return 'Setoran Arisan';
      case 'iuran':
        return 'Setoran Iuran';
      case 'cash_in':
        return 'Uang Masuk';
      case 'cash_out':
        return 'Uang Keluar';
      case 'lottery':
        return 'Kocokan Arisan';
      case 'members':
        return 'Data Anggota';
      default:
        return 'Arisan Bani P3N';
    }
  };

  // Chat Messages State for global badges
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => getStoredChatMessages());

  useEffect(() => {
    const handleChatUpdated = () => {
      setChatMessages(getStoredChatMessages());
    };
    window.addEventListener('paguyuban_chat_updated', handleChatUpdated);
    return () => {
      window.removeEventListener('paguyuban_chat_updated', handleChatUpdated);
    };
  }, []);

  const unreadMessagesCount = chatMessages.filter((m) => m.status === 'Baru').length;

  // 1. Initial Authentication Loading State
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt="Logo Paguyuban"
              className="h-20 w-20 object-contain animate-pulse bg-transparent"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl animate-pulse">
              <span className="text-xl font-black">P3N</span>
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-200">
              PAGUYUBAN BANI P3N
            </h2>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Paguyuban Bani P3N Kedungbanteng
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pt-2">
            <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Memeriksa sesi keamanan akun...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. If not logged in, render the Secure Authentication Screen (Login, Register, Forgot Password)
  if (publicNewsRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <BeritaView
          isAdmin={false}
          currentUser={null}
          publicMode={true}
          publicSlug={publicNewsRoute.slug}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <LoginView
          members={members}
          onLogin={handleLogin}
          logoUrl={profile.logoUrl || '/logo.svg'}
        />

        {/* Verified Barcode Online Verification Modal even on login screen */}
        {verifiedDocData && (
          <VerifiedDocumentModal
            data={verifiedDocData}
            onClose={() => {
              setVerifiedDocData(null);
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      {/* Email Verification Notification Banner */}
      {!currentUser.emailVerified && (
        <EmailVerificationBanner
          userEmail={currentUser.email}
          isVerified={currentUser.emailVerified}
          onVerificationRefreshed={(verified) => {
            setCurrentUser((prev) => (prev ? { ...prev, emailVerified: verified } : null));
          }}
        />
      )}

      <div className="flex-1 flex min-h-0">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
          totalMembersCount={members.length}
          unreadMessagesCount={unreadMessagesCount}
          logoUrl={profile.logoUrl || '/logo.svg'}
          isFirebaseSyncing={isFirebaseSyncing}
          onOpenBackup={() => setShowBackupModal(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Container */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <Header
            darkMode={darkMode}
            onToggleTheme={toggleDarkMode}
            mobileMenuOpen={mobileMenuOpen}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            activeTabTitle={getTabTitle(activeTab)}
            logoUrl={profile.logoUrl || '/logo.svg'}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {/* User Portal View for Regular Members (Default for role === 'user') */}
            {(activeTab === 'user_portal' || (currentUser.role === 'user' && activeTab !== 'prayer_times' && activeTab !== 'profile' && activeTab !== 'berita')) && (
              <UserDashboardView
                currentUser={currentUser}
                members={members}
                payments={payments}
                lotteryWinners={lotteryWinners}
                cashTransactions={cashTransactions}
                profile={profile}
                activeYear={activeYear}
                onOpenReceipt={(member, month, type) => setReceiptModal({ member, month, type })}
                onOpenWinnerCertificate={(winner) => setSelectedWinnerForCert(winner)}
                onUpdateMember={handleUpdateMember}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'dashboard' && currentUser.role === 'admin' && (
              <DashboardView
                members={members}
                payments={payments}
                cashTransactions={cashTransactions}
                lotteryWinners={lotteryWinners}
                logoUrl={profile.logoUrl || '/logo.svg'}
                onNavigate={handleSelectTab}
                onOpenBackupModal={() => setShowBackupModal(true)}
                onOpenWhatsAppReminder={(type, month) => setWhatsAppReminderModal({ type, month })}
                onAddCashTransaction={handleAddCashTransaction}
                onSyncFinance={handleSyncAllFinance}
                onOpenBulkReceipt={(type, month) => setBulkReceiptModal({ type, month })}
                activeYear={activeYear}
              />
            )}

            {activeTab === 'messages' && currentUser.role === 'admin' && (
              <AdminChatView
                members={members}
                profile={profile}
                activeYear={activeYear}
              />
            )}

            {activeTab === 'prayer_times' && (
              <PrayerTimesView />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                isReadOnly={currentUser?.role === 'user'}
              />
            )}

            {activeTab === 'arisan' && currentUser.role === 'admin' && (
              <ArisanView
                members={members}
                payments={payments}
                logoUrl={profile.logoUrl || '/logo.svg'}
                onTogglePayment={(memberId, month) => handleTogglePayment(memberId, month, 'arisan')}
                onOpenReceipt={(member, month) => setReceiptModal({ member, month, type: 'arisan' })}
                onOpenBulkReceipt={(type, month) => setBulkReceiptModal({ type, month })}
                onOpenWhatsAppReminder={(type, month, member) => setWhatsAppReminderModal({ type, month, singleMember: member })}
                activeYear={activeYear}
              />
            )}

            {activeTab === 'iuran' && currentUser.role === 'admin' && (
              <IuranView
                members={members}
                payments={payments}
                logoUrl={profile.logoUrl || '/logo.svg'}
                onTogglePayment={(memberId, month) => handleTogglePayment(memberId, month, 'iuran')}
                onOpenReceipt={(member, month) => setReceiptModal({ member, month, type: 'iuran' })}
                onOpenBulkReceipt={(type, month) => setBulkReceiptModal({ type, month })}
                onOpenWhatsAppReminder={(type, month, member) => setWhatsAppReminderModal({ type, month, singleMember: member })}
                activeYear={activeYear}
              />
            )}

            {activeTab === 'cash_in' && currentUser.role === 'admin' && (
              <CashInView
                transactions={cashTransactions}
                logoUrl={profile.logoUrl || '/logo.svg'}
                onAddTransaction={(tx) => handleAddCashTransaction(tx, 'in')}
                onDeleteTransaction={handleDeleteCashTransaction}
                onSyncFinance={handleSyncAllFinance}
              />
            )}

            {activeTab === 'cash_out' && currentUser.role === 'admin' && (
              <CashOutView
                transactions={cashTransactions}
                logoUrl={profile.logoUrl || '/logo.svg'}
                onAddTransaction={(tx) => handleAddCashTransaction(tx, 'out')}
                onDeleteTransaction={handleDeleteCashTransaction}
                onSyncFinance={handleSyncAllFinance}
              />
            )}

            {activeTab === 'lottery' && currentUser.role === 'admin' && (
              <LotteryView
                members={members}
                winners={lotteryWinners}
                profile={profile}
                onAddWinner={handleAddLotteryWinner}
                onUpdateWinner={handleUpdateLotteryWinner}
                onDeleteWinner={handleDeleteLotteryWinner}
                onUpdateProfile={handleUpdateProfile}
                activeYear={activeYear}
              />
            )}

            {activeTab === 'berita' && (
              currentUser.role === 'admin' ? (
                <BeritaView
                  isAdmin={true}
                  currentUser={currentUser}
                />
              ) : (
                <MemberNewsPortal />
              )
            )}

            {activeTab === 'members' && currentUser.role === 'admin' && (
              <MembersView
                members={members}
                profile={profile}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onBulkImportMembers={handleBulkImportMembers}
                onResetDefaultMembers={async () => {
                  setMembers(INITIAL_MEMBERS);
                  await batchSaveMembersToFirestore(INITIAL_MEMBERS);
                }}
                onSyncMembers={async () => {
                  await batchSaveMembersToFirestore(members);
                }}
              />
            )}
        </main>

        {/* Bottom Application Footer */}
        <footer id="app-footer" className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-xs text-slate-600 dark:text-slate-400 text-center gap-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Paguyuban Bani P3N Kedungbanteng ©2026
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kresno Gadhing Pramudhyo | Hak Cipta
            </p>
          </div>
        </footer>
      </div>
    </div>

      {/* Printable Single Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          member={receiptModal.member}
          month={receiptModal.month}
          type={receiptModal.type}
          activeYear={activeYear}
          profile={profile}
          onClose={() => setReceiptModal(null)}
        />
      )}

      {/* Printable Bulk / Mass Receipts Modal */}
      {bulkReceiptModal && (
        <BulkReceiptModal
          type={bulkReceiptModal.type}
          month={bulkReceiptModal.month}
          activeYear={activeYear}
          members={members}
          payments={payments}
          profile={profile}
          onClose={() => setBulkReceiptModal(null)}
        />
      )}

      {/* WhatsApp Automated Payment Reminder Modal */}
      {whatsAppReminderModal && (
        <WhatsAppReminderModal
          initialType={whatsAppReminderModal.type}
          initialMonth={whatsAppReminderModal.month}
          singleMember={whatsAppReminderModal.singleMember}
          activeYear={activeYear}
          members={members}
          payments={payments}
          profile={profile}
          onClose={() => setWhatsAppReminderModal(null)}
        />
      )}

      {/* Winner Official Certificate & Berita Acara Modal */}
      {selectedWinnerForCert && (
        <WinnerCertificateModal
          winner={selectedWinnerForCert}
          member={members.find((m) => m.id === selectedWinnerForCert.memberId)}
          profile={profile}
          onClose={() => setSelectedWinnerForCert(null)}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Google Drive Backup & Restore Modal */}
      {showBackupModal && (
        <GoogleDriveBackupModal
          members={members}
          payments={payments}
          cashTransactions={cashTransactions}
          lotteryWinners={lotteryWinners}
          profile={profile}
          onRestoreData={handleRestoreData}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {/* Verified Barcode Online Verification Modal */}
      {verifiedDocData && (
        <VerifiedDocumentModal
          data={verifiedDocData}
          onClose={() => {
            setVerifiedDocData(null);
            // clean url without full reload
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
        />
      )}
    </div>
  );

}

export default App;
