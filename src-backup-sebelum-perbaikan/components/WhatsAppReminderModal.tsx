import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink, 
  Users, 
  Coins, 
  Receipt, 
  Copy, 
  Check, 
  Smartphone, 
  Bot, 
  Radio, 
  Search, 
  Filter, 
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { Member, MemberPaymentHistory, PaguyubanProfile } from '../types';
import { formatRupiah, MONTH_NAMES_ID } from '../utils/formatters';

interface WhatsAppReminderModalProps {
  initialType?: 'iuran' | 'arisan' | 'kombinasi';
  initialMonth?: number;
  activeYear: number;
  members: Member[];
  payments: MemberPaymentHistory[];
  profile: PaguyubanProfile;
  onClose: () => void;
  singleMember?: Member | null;
}

type SendStatus = 'idle' | 'queued' | 'sending' | 'sent' | 'failed';

interface MemberReminderQueueItem {
  member: Member;
  status: SendStatus;
  sentAt?: string;
  errorMessage?: string;
  amount: number;
  typeLabel: string;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  initialType = 'iuran',
  initialMonth = 5,
  activeYear,
  members,
  payments,
  profile,
  onClose,
  singleMember = null,
}) => {
  const [paymentType, setPaymentType] = useState<'iuran' | 'arisan' | 'kombinasi'>(initialType);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  // Custom message template state
  const defaultTemplate = 
`Assalamu'alaikum Wr. Wb.
Yth. Bpk/Ibu *{NAMA}* (#{NOMOR})

Pemberitahuan dari Pengurus *Paguyuban Bani P3N KUA Kedungbanteng*:
Mengingatkan untuk setoran *{JENIS}* periode *{BULAN}* sebesar *{NOMINAL}*.

Pembayaran dapat diserahkan tunai pada pertemuan rutin atau melalui transfer ke kas paguyuban:
- Bendahara: *{BENDAHARA}*
- Konfirmasi: *{NO_HP_BENDAHARA}*

Terima kasih atas partisipasi dan kebersamaannya.
Wassalamu'alaikum Wr. Wb.
_Pengurus Paguyuban Bani P3N_`;

  const [messageTemplate, setMessageTemplate] = useState<string>(defaultTemplate);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Dispatch simulation state
  const [isSimulatingDispatch, setIsSimulatingDispatch] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<string, { status: SendStatus; sentAt?: string; error?: string }>>({});
  const [apiGatewayMode, setApiGatewayMode] = useState<'fonnte' | 'wablas' | 'whatsapp_web'>('fonnte');

  const monthName = MONTH_NAMES_ID[selectedMonth - 1] || `Bulan ${selectedMonth}`;
  const periodStr = `${monthName} ${activeYear}`;

  // Find all unpaid members based on selected type and month
  const unpaidMembers = useMemo(() => {
    if (singleMember) {
      return [singleMember];
    }

    return members.filter((member) => {
      const p = payments.find((item) => item.memberId === member.id);
      const key = `${activeYear}-${selectedMonth}`;

      const isArisanUnpaid = member.isArisanParticipant && !p?.arisan[key]?.isPaid;
      const isIuranUnpaid = member.isIuranParticipant && !p?.iuran[key]?.isPaid;

      if (paymentType === 'arisan') return isArisanUnpaid;
      if (paymentType === 'iuran') return isIuranUnpaid;
      return isArisanUnpaid || isIuranUnpaid;
    });
  }, [members, payments, paymentType, selectedMonth, activeYear, singleMember]);

  // Initial selection: select all unpaid members
  useEffect(() => {
    setSelectedMemberIds(unpaidMembers.map((m) => m.id));
  }, [unpaidMembers]);

  // Filtered unpaid members for list display
  const displayedMembers = useMemo(() => {
    return unpaidMembers.filter((m) => {
      const matchSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.no.toString().includes(searchTerm) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [unpaidMembers, searchTerm, selectedCategory]);

  // Calculate amount per member
  const getMemberBill = (member: Member) => {
    const p = payments.find((item) => item.memberId === member.id);
    const key = `${activeYear}-${selectedMonth}`;
    const isArisanUnpaid = member.isArisanParticipant && !p?.arisan[key]?.isPaid;
    const isIuranUnpaid = member.isIuranParticipant && !p?.iuran[key]?.isPaid;

    if (paymentType === 'arisan') {
      return { amount: 50000, label: 'Arisan' };
    }
    if (paymentType === 'iuran') {
      return { amount: 20000, label: 'Iuran Kas Wajib' };
    }

    let amt = 0;
    const labels: string[] = [];
    if (isArisanUnpaid) {
      amt += 50000;
      labels.push('Arisan (Rp 50.000)');
    }
    if (isIuranUnpaid) {
      amt += 20000;
      labels.push('Iuran Kas (Rp 20.000)');
    }
    return { 
      amount: amt > 0 ? amt : 70000, 
      label: labels.length > 0 ? labels.join(' + ') : 'Arisan & Iuran Kas' 
    };
  };

  // Compile dynamic message text for a specific member
  const formatMessageForMember = (member: Member) => {
    const bill = getMemberBill(member);
    return messageTemplate
      .replace(/{NAMA}/g, member.name)
      .replace(/{NOMOR}/g, member.no.toString().padStart(2, '0'))
      .replace(/{KATEGORI}/g, member.category)
      .replace(/{JENIS}/g, bill.label)
      .replace(/{BULAN}/g, periodStr)
      .replace(/{NOMINAL}/g, formatRupiah(bill.amount))
      .replace(/{BENDAHARA}/g, profile.contact?.treasurerName || 'Ahmad Fauzi, S.Ag.')
      .replace(/{NO_HP_BENDAHARA}/g, profile.contact?.treasurerPhone || '0812-3456-7890');
  };

  // Generate direct wa.me URL
  const getWhatsAppUrlForMember = (member: Member) => {
    const text = formatMessageForMember(member);
    const cleanPhone = member.phone ? member.phone.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Selected members queue
  const selectedMembers = unpaidMembers.filter((m) => selectedMemberIds.includes(m.id));

  // Handle selection toggles
  const handleSelectAll = () => {
    setSelectedMemberIds(unpaidMembers.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => 
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Start Automated Batch WhatsApp Sending Simulation
  const handleStartSimulatedDispatch = async () => {
    if (selectedMembers.length === 0 || isSimulatingDispatch) return;

    // If using direct WhatsApp web and 3 or fewer members, open them directly
    if (apiGatewayMode === 'whatsapp_web' && selectedMembers.length <= 3) {
      selectedMembers.forEach((member, index) => {
        setTimeout(() => {
          if (member.phone && member.phone.length >= 8) {
             window.open(getWhatsAppUrlForMember(member), '_blank');
          }
        }, index * 500); // slight delay to help bypass strict popup blockers
      });
      // Mark as sent visually
      const initialMap: Record<string, { status: SendStatus; sentAt?: string; error?: string }> = { ...statusMap };
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      selectedMembers.forEach((m) => {
        if (m.phone && m.phone.length >= 8) {
          initialMap[m.id] = { status: 'sent', sentAt: now };
        } else {
          initialMap[m.id] = { status: 'failed', error: 'Nomor WhatsApp belum terdaftar' };
        }
      });
      setStatusMap(initialMap);
      return;
    } else if (apiGatewayMode === 'whatsapp_web' && selectedMembers.length > 3) {
      alert("Pengiriman Direct WhatsApp Web (wa.me) tidak dapat membuka lebih dari 3 tab sekaligus karena diblokir oleh browser. Silakan gunakan ikon WA di sebelah kanan nama anggota satu-per-satu, atau pilih mode API Gateway (Fonnte/Wablas).");
      return;
    }

    setIsSimulatingDispatch(true);
    setDispatchProgress(0);

    // Initialize all selected members to queued
    const initialMap: Record<string, { status: SendStatus; sentAt?: string; error?: string }> = { ...statusMap };
    selectedMembers.forEach((m) => {
      initialMap[m.id] = { status: 'queued' };
    });
    setStatusMap(initialMap);

    const total = selectedMembers.length;

    for (let i = 0; i < total; i++) {
      const member = selectedMembers[i];

      // Mark current as sending
      setStatusMap((prev) => ({
        ...prev,
        [member.id]: { status: 'sending' },
      }));

      // Simulate API network latency (350ms - 700ms)
      await new Promise((resolve) => setTimeout(resolve, 450 + Math.random() * 250));

      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const hasValidPhone = member.phone && member.phone.length >= 8;

      if (hasValidPhone) {
        setStatusMap((prev) => ({
          ...prev,
          [member.id]: { 
            status: 'sent', 
            sentAt: now 
          },
        }));
      } else {
        setStatusMap((prev) => ({
          ...prev,
          [member.id]: { 
            status: 'failed', 
            error: 'Nomor WhatsApp belum terdaftar' 
          },
        }));
      }

      setDispatchProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsSimulatingDispatch(false);
  };

  // Copy sample preview
  const handleCopyPreview = () => {
    if (unpaidMembers[0]) {
      const text = formatMessageForMember(unpaidMembers[0]);
      navigator.clipboard.writeText(text);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    }
  };

  const sentCount = Object.values(statusMap).filter((item: { status: SendStatus; sentAt?: string; error?: string }) => item.status === 'sent').length;
  const failedCount = Object.values(statusMap).filter((item: { status: SendStatus; sentAt?: string; error?: string }) => item.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-md">
              <MessageCircle className="h-6 w-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Kirim Pengingat WhatsApp Otomatis
                </h3>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold">
                  API Gateway Simulator
                </span>
              </div>
              <p className="text-xs text-teal-200/90">
                Kirim pesan tagihan iuran & arisan secara otomatis kepada seluruh anggota yang belum membayar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Configuration Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Jenis Setoran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Jenis Tagihan
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentType('iuran')}
                  className={`py-1.5 rounded-lg transition-all text-center ${
                    paymentType === 'iuran'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Iuran Kas
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('arisan')}
                  className={`py-1.5 rounded-lg transition-all text-center ${
                    paymentType === 'arisan'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Arisan
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('kombinasi')}
                  className={`py-1.5 rounded-lg transition-all text-center ${
                    paymentType === 'kombinasi'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Bulan Tagihan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Bulan Periode
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {MONTH_NAMES_ID.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Bulan {idx + 1} ({name}) {activeYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Pengiriman API Gateway */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Gateway API WhatsApp</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal">Terkoneksi</span>
              </label>
              <select
                value={apiGatewayMode}
                onChange={(e) => setApiGatewayMode(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="fonnte">Fonnte WA Gateway (Automated Queue)</option>
                <option value="wablas">Wablas Business Gateway</option>
                <option value="whatsapp_web">Direct WhatsApp Web / App (wa.me)</option>
              </select>
            </div>
          </div>

          {/* Quick Summary Pill & Dispatch Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Pilih Semua ({unpaidMembers.length})</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:underline font-semibold"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Batal Pilih</span>
                </button>
              </div>

              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                Ditemukan <strong>{unpaidMembers.length}</strong> anggota belum lunas di {periodStr}.
              </span>
            </div>

            {/* Action Dispatch Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartSimulatedDispatch}
                disabled={selectedMembers.length === 0 || isSimulatingDispatch}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 text-xs font-extrabold transition-all shadow-md cursor-pointer"
              >
                {isSimulatingDispatch ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengirim Otomatis ({dispatchProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Kirim Pengingat ke {selectedMembers.length} Anggota</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar (Visible while sending or when completed) */}
          {(isSimulatingDispatch || sentCount > 0) && (
            <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Bot className="h-4 w-4" />
                  <span>Status Eksekusi API Gateway:</span>
                </span>
                <span className="font-mono">
                  {sentCount} Terkirim {failedCount > 0 && `• ${failedCount} Gagal`} / {selectedMembers.length} Antrian
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${dispatchProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Two-Column Content: Left = Members Queue, Right = Message Template & Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Column 1: Unpaid Members Queue List (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-600" />
                Daftar Anggota Belum Membayar ({unpaidMembers.length})
              </span>

              <div className="relative w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari anggota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-2 py-1 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {displayedMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 opacity-90" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Alhamdulillah, Semua Anggota Telah Lunas!
                </p>
                <p className="text-xs">
                  Tidak ada tanggungan pembayaran untuk filter bulan dan jenis yang dipilih.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  const bill = getMemberBill(member);
                  const statusInfo = statusMap[member.id];

                  return (
                    <div
                      key={member.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        statusInfo?.status === 'sent'
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40'
                          : isSelected
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMember(member.id)}
                          className="shrink-0 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-amber-500 bg-amber-950/30 px-1 rounded">
                              #{member.no.toString().padStart(2, '0')}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {member.name}
                            </span>
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              {member.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {bill.label} ({formatRupiah(bill.amount)})
                            </span>
                            <span>•</span>
                            <span className="font-mono">{member.phone || 'Tanpa No HP'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status / Direct Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {statusInfo?.status === 'sending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Mengirim...</span>
                          </span>
                        )}

                        {statusInfo?.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" />
                            <span>Terkirim {statusInfo.sentAt}</span>
                          </span>
                        )}

                        {statusInfo?.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full" title={statusInfo.error}>
                            <AlertCircle className="h-3 w-3" />
                            <span>Gagal</span>
                          </span>
                        )}

                        {/* Direct WhatsApp Open Button */}
                        <a
                          href={getWhatsAppUrlForMember(member)}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka Chat WhatsApp Langsung"
                          className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Template Editor & Live Preview Bubble (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Template & Preview Pesan
              </span>

              <button
                type="button"
                onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {isEditingTemplate ? 'Selesai Edit' : 'Edit Template'}
              </button>
            </div>

            {/* Template Editor (Collapsible / Toggleable) */}
            {isEditingTemplate ? (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <textarea
                  rows={8}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Tag: &#123;NAMA&#125;, &#123;NOMOR&#125;, &#123;JENIS&#125;, &#123;BULAN&#125;, &#123;NOMINAL&#125;, &#123;BENDAHARA&#125;</span>
                  <button
                    type="button"
                    onClick={() => setMessageTemplate(defaultTemplate)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                  >
                    Reset Template
                  </button>
                </div>
              </div>
            ) : null}

            {/* WhatsApp Phone Mockup & Message Bubble */}
            <div className="rounded-3xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900 p-3.5 shadow-md space-y-3">
              {/* WhatsApp Header bar */}
              <div className="flex items-center justify-between bg-emerald-800 text-white px-3 py-2 rounded-2xl text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px]">
                    KUA
                  </div>
                  <span>BANI P3N NOTIFIKASI</span>
                </div>
                <span className="text-[10px] opacity-80">Online</span>
              </div>

              {/* Chat Bubble Area */}
              <div className="bg-[#e5ddd5] dark:bg-[#0b141a] p-3 rounded-2xl min-h-[160px] flex flex-col justify-end space-y-2">
                <div className="bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 p-3 rounded-2xl rounded-tl-xs shadow-xs text-xs whitespace-pre-wrap leading-relaxed max-w-[95%]">
                  {unpaidMembers[0] ? (
                    formatMessageForMember(unpaidMembers[0])
                  ) : (
                    <span className="text-slate-400 italic">
                      Tidak ada sampel anggota. Pilih bulan dengan anggota yang belum lunas untuk melihat contoh pesan.
                    </span>
                  )}
                  <div className="text-[9px] text-right text-slate-400 mt-1 flex items-center justify-end gap-1">
                    <span>10:30</span>
                    <Check className="h-3 w-3 text-sky-500 inline" />
                  </div>
                </div>
              </div>

              {/* Copy Button */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Pratinjau otomatis untuk anggota penerima
                </span>
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px] cursor-pointer"
                >
                  {copiedPreview ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPreview ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                <span>Simulasi Integrasi API WhatsApp Gateway</span>
              </p>
              <p className="leading-relaxed opacity-90">
                Tombol "Kirim Pengingat" menyimulasikan panggilan API ke WhatsApp Gateway untuk mengirim pesan broadcast tanpa perlu mengetik ulang satu per satu.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            💡 Pengurus dapat memilih pengiriman massal atau klik ikon link untuk membuka chat WhatsApp langsung.
          </span>
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
            {selectedMembers.length} Penerima Terpilih
          </span>
        </div>
      </div>
    </div>
  );
};
