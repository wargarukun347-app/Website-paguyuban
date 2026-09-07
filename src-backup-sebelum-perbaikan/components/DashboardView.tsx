import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Coins, 
  Receipt, 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles, 
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Cloud,
  HardDriveDownload,
  MessageSquare,
  MessageCircle,
  Send,
  PlusCircle,
  UserPlus,
  Printer,
  RefreshCw,
  Zap,
  Check,
  X,
  CreditCard,
  Building,
  Plus
} from 'lucide-react';
import { Member, MemberPaymentHistory, CashTransaction, LotteryWinner, ChatMessage } from '../types';
import { formatRupiah, formatDateIndo, MONTH_NAMES_ID } from '../utils/formatters';
import { calculatePrayerTimes, getNextPrayer, getHijriDate } from '../utils/prayerCalculator';
import { getStoredChatMessages } from '../utils/chatManager';
import { TabType } from './Sidebar';

interface DashboardViewProps {
  members: Member[];
  payments: MemberPaymentHistory[];
  cashTransactions: CashTransaction[];
  lotteryWinners: LotteryWinner[];
  logoUrl?: string;
  onNavigate: (tab: TabType) => void;
  onOpenBackupModal?: () => void;
  onOpenWhatsAppReminder?: (type: 'kombinasi' | 'iuran' | 'arisan', month: number) => void;
  onAddCashTransaction?: (tx: Omit<CashTransaction, 'id' | 'type'>, type: 'in' | 'out') => void;
  onSyncFinance?: () => Promise<any>;
  onOpenBulkReceipt?: (type: 'iuran' | 'arisan', month: number) => void;
  activeYear: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  payments,
  cashTransactions,
  lotteryWinners,
  logoUrl,
  onNavigate,
  onOpenBackupModal,
  onOpenWhatsAppReminder,
  onAddCashTransaction,
  onSyncFinance,
  onOpenBulkReceipt,
  activeYear,
}) => {
  // Current month (defaults to current or Month 5 / Mei 2026 based on active data)
  const currentMonthNum = 5; // Mei
  const currentMonthKey = `${activeYear}-${currentMonthNum}`;
  const currentMonthName = MONTH_NAMES_ID[currentMonthNum - 1];

  // Quick Transaction Modal State
  const [isQuickTxModalOpen, setIsQuickTxModalOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<'in' | 'out'>('in');
  const [formCategory, setFormCategory] = useState('Setoran Iuran');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formMethod, setFormMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet'>('Tunai');
  const [formMemberId, setFormMemberId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync Finance State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Financial calculations
  const totalCashIn = cashTransactions
    .filter((tx) => tx.type === 'in')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCashOut = cashTransactions
    .filter((tx) => tx.type === 'out')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentBalance = totalCashIn - totalCashOut;

  // Open quick transaction modal
  const handleOpenQuickTx = (type: 'in' | 'out') => {
    setQuickTxType(type);
    setFormCategory(type === 'in' ? 'Setoran Iuran' : 'Konsumsi / Snack Pertemuan');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormSource('');
    setFormMethod('Tunai');
    setFormMemberId('');
    setFormError(null);
    setIsQuickTxModalOpen(true);
  };

  // Submit quick transaction
  const handleSaveQuickTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Nominal transaksi harus lebih dari Rp 0');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Keterangan transaksi wajib diisi');
      return;
    }

    const selectedMember = members.find((m) => m.id === formMemberId);

    if (onAddCashTransaction) {
      onAddCashTransaction(
        {
          category: formCategory,
          amount: Number(formAmount),
          date: formDate,
          description: formDescription,
          memberId: formMemberId || undefined,
          memberName: selectedMember ? selectedMember.name : undefined,
          receiptNo: '',
          sourceOrRecipient: formSource || undefined,
          paymentMethod: formMethod,
        },
        quickTxType
      );
    }

    setIsQuickTxModalOpen(false);
  };

  // Trigger sync finance
  const handleTriggerSync = async () => {
    if (!onSyncFinance || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onSyncFinance();
      setSyncFeedback('Buku kas berhasil disinkronkan dengan seluruh setoran iuran & arisan!');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Sinkronisasi selesai.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Arisan collection stats
  const arisanParticipants = members.filter((m) => m.isArisanParticipant && m.status === 'Aktif');
  const totalArisanParticipants = arisanParticipants.length;
  
  let arisanPaidCountCurrentMonth = 0;
  payments.forEach((p) => {
    if (p.arisan[currentMonthKey]?.isPaid) {
      arisanPaidCountCurrentMonth++;
    }
  });

  const arisanCurrentMonthCollected = arisanPaidCountCurrentMonth * 50000;
  const arisanTargetMonthly = totalArisanParticipants * 50000;
  const arisanPercentage = totalArisanParticipants > 0 ? Math.round((arisanPaidCountCurrentMonth / totalArisanParticipants) * 100) : 0;

  // Iuran collection stats
  const iuranParticipants = members.filter((m) => m.isIuranParticipant && m.status === 'Aktif');
  const totalIuranParticipants = iuranParticipants.length;

  let iuranPaidCountCurrentMonth = 0;
  payments.forEach((p) => {
    if (p.iuran[currentMonthKey]?.isPaid) {
      iuranPaidCountCurrentMonth++;
    }
  });

  const iuranCurrentMonthCollected = iuranPaidCountCurrentMonth * 20000;
  const iuranTargetMonthly = totalIuranParticipants * 20000;
  const iuranPercentage = totalIuranParticipants > 0 ? Math.round((iuranPaidCountCurrentMonth / totalIuranParticipants) * 100) : 0;

  // Latest winner
  const latestWinner = lotteryWinners.length > 0 ? lotteryWinners[lotteryWinners.length - 1] : null;

  // Unpaid members this month
  const unpaidMembersThisMonth = members.filter((m) => {
    if (!m.isArisanParticipant && !m.isIuranParticipant) return false;
    const memberPayment = payments.find((p) => p.memberId === m.id);
    const arisanUnpaid = m.isArisanParticipant && !memberPayment?.arisan[currentMonthKey]?.isPaid;
    const iuranUnpaid = m.isIuranParticipant && !memberPayment?.iuran[currentMonthKey]?.isPaid;
    return arisanUnpaid || iuranUnpaid;
  });

  // Chat messages stats
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => getStoredChatMessages());

  useEffect(() => {
    const handleUpdate = () => {
      setChatMessages(getStoredChatMessages());
    };
    window.addEventListener('paguyuban_chat_updated', handleUpdate);
    return () => window.removeEventListener('paguyuban_chat_updated', handleUpdate);
  }, []);

  const unreadMessages = chatMessages.filter((m) => m.status === 'Baru');
  const latestMessage = chatMessages.length > 0 ? chatMessages[0] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Ringkasan Selamat Datang */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 max-w-2xl">
            <img
              src={logoUrl || '/logo.svg'}
              alt="Logo Paguyuban"
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain bg-white/10 backdrop-blur-xs p-2 rounded-2xl border border-white/20 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                Sistem Keuangan & Undian Terpadu
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Paguyuban Bani P3N
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Paguyuban Bani P3N Kedungbanteng, Kab. Banyumas Tahun {activeYear}. Transparan, akuntabel, dan silaturahmi berkah.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              id="btn-quick-lottery"
              type="button"
              onClick={() => onNavigate('lottery')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-sm transition-all shadow-md hover:shadow-amber-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Kocokan Arisan
            </button>
            <button
              id="btn-quick-arisan"
              type="button"
              onClick={() => onNavigate('arisan')}
              className="flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2.5 text-sm border border-white/20 transition-all"
            >
              <Coins className="h-4 w-4" />
              Setoran Arisan
            </button>
            <button
              id="btn-quick-prayer"
              type="button"
              onClick={() => onNavigate('prayer_times')}
              className="flex items-center gap-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 text-sm border border-emerald-400/30 transition-all shadow-xs"
            >
              <Clock className="h-4 w-4 text-emerald-300" />
              Jadwal Sholat
            </button>
            {onOpenBackupModal && (
              <button
                id="btn-quick-backup"
                type="button"
                onClick={onOpenBackupModal}
                className="flex items-center gap-2 rounded-xl bg-teal-600/90 hover:bg-teal-500 text-white font-semibold px-4 py-2.5 text-sm border border-teal-300/30 transition-all shadow-xs cursor-pointer"
              >
                <Cloud className="h-4 w-4 text-teal-200" />
                Backup Google Drive
              </button>
            )}
          </div>
        </div>

        {/* Decorative solid element */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-500/10 pointer-events-none" />
      </div>

      {/* Quick Prayer Times Strip Widget */}
      {(() => {
        const today = new Date();
        const pt = calculatePrayerTimes(today, -7.3686, 109.2135, undefined, 'KEMENAG');
        const next = getNextPrayer(pt);
        return (
          <div 
            onClick={() => onNavigate('prayer_times')}
            className="cursor-pointer rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Jadwal Sholat Hari Ini (Kedungbanteng)
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-sm font-semibold">
                    {pt.hijriDate || getHijriDate(today)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Berikutnya: <strong className="text-emerald-600 dark:text-emerald-400">{next.nextName} ({next.nextTime})</strong> — {next.formattedRemaining} lagi
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] mr-1">Subuh:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pt.subuh}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] mr-1">Dzuhur:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pt.dzuhur}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] mr-1">Ashar:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pt.ashar}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] mr-1">Maghrib:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pt.maghrib}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 text-[11px] mr-1">Isya:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pt.isya}</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-0.5 ml-1">
                Selengkapnya <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        );
      })()}

      {/* Quick Messages & Inquiries Notification Strip */}
      <div 
        onClick={() => onNavigate('messages')}
        className="cursor-pointer rounded-2xl bg-gradient-to-r from-teal-900/90 via-slate-900 to-emerald-950 p-4 text-white border border-teal-500/30 shadow-md hover:border-teal-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30 shadow-xs">
            <MessageSquare className="h-5 w-5" />
            {unreadMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse">
                {unreadMessages.length}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-white">
                Pusat Layanan Pesan & Pengajuan Anggota
              </h4>
              {unreadMessages.length > 0 ? (
                <span className="rounded-full bg-rose-500/30 border border-rose-400/40 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                  {unreadMessages.length} Pesan Baru Perlu Direspon
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/30 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  Semua Ditanggapi
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
              {latestMessage ? (
                <span>
                  Pesan terakhir dari <strong>{latestMessage.memberName}</strong>: "{latestMessage.topic || latestMessage.category}" ({latestMessage.timestamp})
                </span>
              ) : (
                'Pantau pertanyaan, konfirmasi setoran transfer, dan pengajuan anggota.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Buka Inbox Chat</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Automated Payment Reminder Strip (If any member hasn't paid this month) */}
      {unpaidMembersThisMonth.length > 0 && onOpenWhatsAppReminder && (
        <div 
          id="dashboard-wa-reminder-banner"
          className="rounded-2xl bg-gradient-to-r from-emerald-900/90 via-teal-950 to-slate-900 p-4 text-white border border-emerald-500/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-md">
              <MessageCircle className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-extrabold text-white">
                  Pengingat Tagihan WhatsApp Bulan {currentMonthName} {activeYear}
                </h4>
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold">
                  {unpaidMembersThisMonth.length} Anggota Belum Bayar
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Kirim pesan tagihan iuran kas & arisan otomatis melalui gateway WhatsApp API.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenWhatsAppReminder('kombinasi', currentMonthNum)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Kirim Pengingat Otomatis</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Panel for Admin */}
      <div 
        id="dashboard-quick-actions-panel"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Actions (Aksi Cepat Admin)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pintasan cepat untuk mempercepat alur kerja pembukuan kas, pengundian arisan, dan operasional paguyuban.
            </p>
          </div>

          {syncFeedback && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <Check className="h-3.5 w-3.5" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {/* Action 1: Catat Kas Masuk */}
          <button
            id="quick-action-cash-in"
            type="button"
            onClick={() => handleOpenQuickTx('in')}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:border-emerald-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              Catat Kas Masuk
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Penerimaan baru
            </span>
          </button>

          {/* Action 2: Catat Kas Keluar */}
          <button
            id="quick-action-cash-out"
            type="button"
            onClick={() => handleOpenQuickTx('out')}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 hover:border-rose-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <ArrowUpRight className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              Catat Kas Keluar
            </span>
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
              Belanja & get arisan
            </span>
          </button>

          {/* Action 3: Kocokan Arisan Baru */}
          <button
            id="quick-action-lottery"
            type="button"
            onClick={() => onNavigate('lottery')}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 hover:border-amber-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="h-4.5 w-4.5 fill-current" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              Kocokan Arisan
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Undi pemenang baru
            </span>
          </button>

          {/* Action 4: Kirim Pengingat WA */}
          <button
            id="quick-action-reminder"
            type="button"
            onClick={() => {
              if (onOpenWhatsAppReminder) {
                onOpenWhatsAppReminder('kombinasi', currentMonthNum);
              } else {
                onNavigate('iuran');
              }
            }}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-800/40 hover:bg-teal-100/70 dark:hover:bg-teal-900/40 hover:border-teal-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <MessageCircle className="h-4.5 w-4.5 fill-current" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              Pengingat WA
            </span>
            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
              Broadcast tagihan
            </span>
          </button>

          {/* Action 5: Cetak Kwitansi Massal */}
          <button
            id="quick-action-bulk-receipt"
            type="button"
            onClick={() => {
              if (onOpenBulkReceipt) {
                onOpenBulkReceipt('iuran', currentMonthNum);
              } else {
                onNavigate('iuran');
              }
            }}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 hover:border-blue-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Printer className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              Kwitansi Massal
            </span>
            <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
              Cetak PDF bulan ini
            </span>
          </button>

          {/* Action 6: Sinkronisasi Buku Kas */}
          <button
            id="quick-action-sync-finance"
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="group flex flex-col items-start p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 hover:border-indigo-300 transition-all text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <RefreshCw className={`h-4.5 w-4.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
              {isSyncing ? 'Sinkronisasi...' : 'Sinkron Buku Kas'}
            </span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
              Auto rekap kas
            </span>
          </button>
        </div>
      </div>

      {/* Main Financial Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Kas Utama */}
        <div
          id="stat-card-balance"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Saldo Kas Bersih
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(currentBalance)}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Kas Aktif Paguyuban
            </p>
          </div>
        </div>

        {/* Total Uang Masuk */}
        <div
          id="stat-card-cash-in"
          onClick={() => onNavigate('cash_in')}
          className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Uang Masuk
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <ArrowDownLeft className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(totalCashIn)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Iuran, Arisan & Infaq Masuk
            </p>
          </div>
        </div>

        {/* Total Uang Keluar */}
        <div
          id="stat-card-cash-out"
          onClick={() => onNavigate('cash_out')}
          className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-amber-300 dark:hover:border-amber-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Uang Keluar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatRupiah(totalCashOut)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Pencairan Arisan & Konsumsi
            </p>
          </div>
        </div>

        {/* Total Anggota */}
        <div
          id="stat-card-members"
          onClick={() => onNavigate('members')}
          className="cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-blue-300 dark:hover:border-blue-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Anggota Terdaftar
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {members.length} Orang
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              P3N, PAI & Staf Paguyuban
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bulan Berjalan: Setoran Arisan & Iuran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Setoran Arisan Bulan Ini */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 font-bold">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Setoran Arisan ({currentMonthName} {activeYear})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tarif Rp 50.000 / peserta
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('arisan')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Lihat Matriks <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Terkumpul Bulan Ini:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatRupiah(arisanCurrentMonthCollected)} / {formatRupiah(arisanTargetMonthly)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${arisanPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {arisanPaidCountCurrentMonth} Sudah Bayar
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                {totalArisanParticipants - arisanPaidCountCurrentMonth} Belum Bayar
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {arisanPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Card Setoran Iuran Bulan Ini */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Setoran Iuran Kas ({currentMonthName} {activeYear})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tarif Rp 20.000 / anggota
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('iuran')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Lihat Matriks <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Terkumpul Bulan Ini:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatRupiah(iuranCurrentMonthCollected)} / {formatRupiah(iuranTargetMonthly)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${iuranPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {iuranPaidCountCurrentMonth} Sudah Bayar
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                {Math.max(0, totalIuranParticipants - iuranPaidCountCurrentMonth)} Belum Bayar
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {iuranPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Pemenang Arisan Terakhir & Ringkasan Perlu Ditagih */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pemenang Terkini */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-amber-500" />
              Pemenang Arisan Terakhir
            </h4>
            <span className="rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[11px] font-bold">
              {latestWinner ? `Putaran ${latestWinner.roundNumber}` : 'Belum Ada'}
            </span>
          </div>

          {latestWinner ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent p-4 border border-amber-500/20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Nama Pemenang:
                </p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {latestWinner.memberName}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 border-t border-amber-500/20 pt-2.5">
                  <span>Nominal Get:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(latestWinner.prizeAmount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Tanggal Undian:</span>
                  <span>{formatDateIndo(latestWinner.drawDate)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Total Putaran Selesai:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {lotteryWinners.length} dari {members.length} Putaran
                </span>
              </div>

              <button
                id="btn-goto-lottery-page"
                type="button"
                onClick={() => onNavigate('lottery')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold py-2.5 text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Buka Halaman Kocokan
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              Belum ada putaran arisan yang dikocok.
            </div>
          )}
        </div>

        {/* Transaksi Terbaru */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              Catatan Kas Terbaru
            </h4>
            <button
              type="button"
              onClick={() => onNavigate('cash_in')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Semua Transaksi <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
            {cashTransactions.slice(-5).reverse().map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      tx.type === 'in'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {tx.type === 'in' ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDateIndo(tx.date)}</span>
                      <span>•</span>
                      <span className="font-medium">{tx.category}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      tx.type === 'in'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {tx.type === 'in' ? '+' : '-'} {formatRupiah(tx.amount)}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {tx.receiptNo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unpaid Alert List */}
      {unpaidMembersThisMonth.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm mb-3">
            <AlertCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            <span>
              Perhatian: {unpaidMembersThisMonth.length} Anggota Belum Menyelesaikan Setoran Bulan Ini ({currentMonthName} {activeYear})
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {unpaidMembersThisMonth.slice(0, 10).map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {m.name}
              </span>
            ))}
            {unpaidMembersThisMonth.length > 10 && (
              <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                +{unpaidMembersThisMonth.length - 10} lainnya
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Transaction Modal (Pencatatan Kas Cepat) */}
      {isQuickTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className={`p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-white ${
              quickTxType === 'in'
                ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
                : 'bg-gradient-to-r from-rose-800 to-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white shadow-xs">
                  {quickTxType === 'in' ? (
                    <ArrowDownLeft className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {quickTxType === 'in' ? 'Catat Kas Masuk Cepat' : 'Catat Kas Keluar Cepat'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Aksi cepat pencatatan transaksi kas langsung dari Dashboard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickTxModalOpen(false)}
                className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type Switcher Tabs inside Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickTxType('in');
                  setFormCategory('Setoran Iuran');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  quickTxType === 'in'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Kas Masuk (Penerimaan)
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickTxType('out');
                  setFormCategory('Konsumsi / Snack Pertemuan');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  quickTxType === 'out'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Kas Keluar (Pengeluaran)
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuickTx} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kategori Transaksi
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    {quickTxType === 'in' ? (
                      <>
                        <option value="Setoran Iuran">Setoran Iuran Kas</option>
                        <option value="Setoran Arisan">Setoran Arisan</option>
                        <option value="Infaq & Donasi">Infaq & Donasi</option>
                        <option value="Sumbangan Kas">Sumbangan Kas</option>
                        <option value="Saldo Awal">Saldo Awal</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </>
                    ) : (
                      <>
                        <option value="Konsumsi / Snack Pertemuan">Konsumsi / Snack Pertemuan</option>
                        <option value="Pemenang Arisan (Get)">Pemenang Arisan (Get)</option>
                        <option value="Biaya Kebersihan & Tempat">Biaya Kebersihan & Tempat</option>
                        <option value="Santunan Sosial">Santunan Sosial</option>
                        <option value="ATK & Fotokopi">ATK & Fotokopi</option>
                        <option value="Operasional Pengurus">Operasional Pengurus</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                  </input>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nominal (Rupiah) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Contoh: 50000"
                    min="1000"
                    step="1000"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2 text-sm font-extrabold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                {formAmount && Number(formAmount) > 0 && (
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-1">
                    Terbaca: {formatRupiah(Number(formAmount))}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Keterangan / Uraian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    quickTxType === 'in'
                      ? 'Contoh: Iuran bulanan Bpk. H. Ahmad bulan Mei 2026'
                      : 'Contoh: Pembelian konsumsi rapat bulanan di aula KUA'
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Related Member */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Anggota Terkait (Opsional)
                  </label>
                  <select
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value="">-- Bukan Transaksi Perorangan --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberNumber} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  >
                    <option value="Tunai">Tunai (Cash)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="E-Wallet">E-Wallet (QRIS)</option>
                  </select>
                </div>
              </div>

              {/* Source or Recipient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {quickTxType === 'in' ? 'Sumber Dana / Penyetor' : 'Penerima Pembayaran / Toko'} (Opsional)
                </label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder={quickTxType === 'in' ? 'Contoh: Kas Anggota' : 'Contoh: Toko Barokah Kedungbanteng'}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-all flex items-center gap-1.5 ${
                    quickTxType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan Transaksi Kas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
