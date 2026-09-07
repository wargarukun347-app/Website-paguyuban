import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Filter, 
  CheckSquare, 
  Square, 
  Search,
  Receipt,
  Coins,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Member, MemberPaymentHistory, PaguyubanProfile } from '../types';
import { formatRupiah, formatDateIndo, MONTH_NAMES_ID } from '../utils/formatters';

interface BulkReceiptModalProps {
  type: 'iuran' | 'arisan';
  month: number;
  activeYear: number;
  members: Member[];
  payments: MemberPaymentHistory[];
  profile: PaguyubanProfile;
  onClose: () => void;
}

interface PrintableReceiptItem {
  member: Member;
  receiptNo: string;
  amount: number;
  monthName: string;
  verificationUrl: string;
  qrDataUrl: string;
  terbilang: string;
}

export const BulkReceiptModal: React.FC<BulkReceiptModalProps> = ({
  type: initialType,
  month: initialMonth,
  activeYear,
  members,
  payments,
  profile,
  onClose,
}) => {
  const [currentType, setCurrentType] = useState<'iuran' | 'arisan'>(initialType);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [receiptsPerPage, setReceiptsPerPage] = useState<'2' | '1'>('2');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const amount = currentType === 'arisan' ? 50000 : 20000;
  const terbilang = currentType === 'arisan' ? 'Lima Puluh Ribu Rupiah' : 'Dua Puluh Ribu Rupiah';
  const monthName = MONTH_NAMES_ID[currentMonth - 1];
  const currentDateStr = formatDateIndo(new Date().toISOString().split('T')[0]);

  // Determine eligible paid members for the selected type and month
  const paidMembers = useMemo(() => {
    const participantMembers = members.filter((m) => 
      currentType === 'arisan' ? m.isArisanParticipant : m.isIuranParticipant
    );

    return participantMembers.filter((m) => {
      const p = payments.find((item) => item.memberId === m.id);
      if (!p) return false;
      const key = `${activeYear}-${currentMonth}`;
      if (currentType === 'arisan') {
        return !!p.arisan[key]?.isPaid;
      } else {
        return !!p.iuran[key]?.isPaid;
      }
    });
  }, [members, payments, currentType, currentMonth, activeYear]);

  // Initial selection: select all paid members when month/type changes
  useEffect(() => {
    setSelectedMemberIds(paidMembers.map((m) => m.id));
  }, [paidMembers]);

  // Filter paid members based on category and search term
  const displayedMembers = useMemo(() => {
    return paidMembers.filter((m) => {
      const matchSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.no.toString().includes(searchTerm) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [paidMembers, searchTerm, selectedCategory]);

  // Generate QR Codes for all selected members
  useEffect(() => {
    let isCancelled = false;
    setIsGeneratingQr(true);

    const generateQrs = async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const map: Record<string, string> = {};

      for (const m of paidMembers) {
        const receiptNo = `${currentType === 'arisan' ? 'KW-ARS' : 'KW-IUR'}/${activeYear}/${currentMonth.toString().padStart(2, '0')}/${m.no.toString().padStart(3, '0')}`;
        const verifyParams = new URLSearchParams({
          verify: 'lottery',
          type: 'kwitansi',
          doc: receiptNo,
          winner: m.name,
          cat: m.category,
          amt: String(amount),
          date: new Date().toISOString().split('T')[0],
          code: `KW-${activeYear}-${currentMonth}-${m.id.substring(0, 6).toUpperCase()}`,
        });
        const verificationUrl = `${origin}${pathname}?${verifyParams.toString()}`;

        try {
          const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 90,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          map[m.id] = qrDataUrl;
        } catch (e) {
          console.error('Error generating QR for member', m.id, e);
        }
      }

      if (!isCancelled) {
        setQrCodeMap(map);
        setIsGeneratingQr(false);
      }
    };

    generateQrs();

    return () => {
      isCancelled = true;
    };
  }, [paidMembers, currentType, currentMonth, activeYear, amount]);

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedMemberIds(paidMembers.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => 
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Selected items to print
  const selectedMembersToPrint = useMemo(() => {
    return paidMembers.filter((m) => selectedMemberIds.includes(m.id));
  }, [paidMembers, selectedMemberIds]);

  const totalSelectedAmount = selectedMembersToPrint.length * amount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      {/* Container Dialog */}
      <div className="relative w-full max-w-5xl my-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
        
        {/* Top Header Controls (Hidden on Print) */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Cetak Massal Kwitansi Pembayaran
                </h3>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-extrabold border border-emerald-300 dark:border-emerald-800">
                  Tahun {activeYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih bulan dan cetak kwitansi resmi untuk semua anggota yang sudah melunasi pembayaran sekaligus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedMembersToPrint.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak {selectedMembersToPrint.length} Kwitansi</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Selection Bar (Hidden on Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Tipe Pembayaran */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Jenis Setoran
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrentType('iuran')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentType === 'iuran'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Iuran Kas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentType('arisan')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentType === 'arisan'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>Arisan</span>
                </button>
              </div>
            </div>

            {/* Pilihan Bulan */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pilih Bulan
              </label>
              <div className="relative">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {MONTH_NAMES_ID.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Bulan {idx + 1} ({name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Format Tata Letak Kertas Cetak */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Format Lembar A4
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setReceiptsPerPage('2')}
                  className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    receiptsPerPage === '2'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  2 Lembar / A4
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptsPerPage('1')}
                  className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                    receiptsPerPage === '1'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1 Lembar / A4
                </button>
              </div>
            </div>

            {/* Filter Kategori */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kategori Anggota
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="P3N">P3N</option>
                <option value="PAI">PAI</option>
                <option value="Staf">Staf</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
          </div>

          {/* Quick Selection Toolbar & Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Pilih Semua ({paidMembers.length})</span>
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

              {/* Search in Modal */}
              <div className="relative w-48 hidden sm:block">
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

            {/* Selection Counter Stats */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">
                Terpilih: <strong className="text-emerald-600 dark:text-emerald-400">{selectedMembersToPrint.length}</strong> dari {paidMembers.length} anggota lunas
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-bold border border-emerald-200 dark:border-emerald-800">
                Total: {formatRupiah(totalSelectedAmount)}
              </span>
            </div>
          </div>

          {/* Member Checkbox Pills Carousel / Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-20 scrollbar-thin">
            {displayedMembers.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleToggleMember(m.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                  }`}
                >
                  <span className="font-mono text-[10px]">#{m.no.toString().padStart(2, '0')}</span>
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Printable Receipts Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          
          {selectedMembersToPrint.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500 opacity-80" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada anggota lunas yang dipilih untuk dicetak.
              </p>
              <p className="text-xs">
                Silakan pilih bulan atau centang nama anggota di atas untuk memunculkan lembar kwitansi.
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${receiptsPerPage === '2' ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2' : 'grid-cols-1 print:grid-cols-1'} print-container`}>
              {selectedMembersToPrint.map((member, index) => {
                const receiptNo = `${currentType === 'arisan' ? 'KW-ARS' : 'KW-IUR'}/${activeYear}/${currentMonth.toString().padStart(2, '0')}/${member.no.toString().padStart(3, '0')}`;
                const qrUrl = qrCodeMap[member.id];

                return (
                  <div
                    key={member.id}
                    className="bulk-receipt-card rounded-2xl border-2 border-dashed border-emerald-500/50 bg-white p-5 sm:p-6 shadow-md text-slate-900 print:shadow-none print:border-emerald-600 print:bg-white print:break-inside-avoid relative overflow-hidden"
                  >
                    {/* Header Kop Kwitansi */}
                    <div className="text-center pb-3 border-b-2 border-emerald-600/30 space-y-0.5">
                      <div className="flex items-center justify-center gap-1.5 font-bold text-[11px] text-emerald-900 uppercase">
                        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span>PAGUYUBAN BANI P3N & PAI KUA KEDUNGBANTENG</span>
                      </div>
                      <h4 className="text-base font-extrabold tracking-tight text-slate-950 uppercase">
                        KUITANSI BUKTI PEMBAYARAN
                      </h4>
                      <p className="text-[10px] font-mono text-slate-600">
                        No. Registrasi: <strong className="text-slate-900">{receiptNo}</strong>
                      </p>
                    </div>

                    {/* Receipt Details Table */}
                    <div className="py-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-start py-0.5 border-b border-slate-100">
                        <span className="text-slate-500 w-32 shrink-0">Telah Diterima Dari:</span>
                        <span className="font-extrabold text-slate-900 text-right">
                          {member.name} <span className="font-normal text-slate-500">({member.category} - #{member.no.toString().padStart(2, '0')})</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-start py-0.5 border-b border-slate-100">
                        <span className="text-slate-500 w-32 shrink-0">Untuk Pembayaran:</span>
                        <span className="font-bold text-emerald-950 text-right">
                          Setoran {currentType === 'arisan' ? 'Arisan' : 'Iuran Kas Wajib'} Bulan {monthName} {activeYear}
                        </span>
                      </div>

                      <div className="flex justify-between items-start py-0.5 border-b border-slate-100">
                        <span className="text-slate-500 w-32 shrink-0">Banyaknya Uang:</span>
                        <span className="italic font-medium text-slate-700 text-right">
                          "{terbilang}"
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-1 bg-emerald-50/80 px-2.5 rounded-lg border border-emerald-200 mt-2">
                        <span className="text-emerald-900 font-bold text-xs">JUMLAH:</span>
                        <span className="font-extrabold text-emerald-900 text-sm font-mono">
                          {formatRupiah(amount)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Signature & Verification QR */}
                    <div className="pt-2 flex items-end justify-between gap-4 border-t border-emerald-500/20">
                      {/* QR Code Scan Verification */}
                      <div className="flex items-center gap-2">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt="QR Verification"
                            className="h-14 w-14 rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                            QR...
                          </div>
                        )}
                        <div className="text-[9px] text-slate-500 leading-tight space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            <span>LUNAS TERVERIFIKASI</span>
                          </div>
                          <p>Scan barcode untuk bukti PDF otentik sistem.</p>
                        </div>
                      </div>

                      {/* Official Signatures */}
                      <div className="text-right text-[10px] space-y-0.5 relative min-w-[130px]">
                        <p className="text-slate-500">Kedungbanteng, {currentDateStr}</p>
                        <p className="font-bold text-slate-800">Bendahara Paguyuban</p>
                        
                        {/* Stamp & Signature Container */}
                        <div className="h-9 flex items-center justify-end relative my-0.5">
                          {profile.officialDocumentConfig?.stampImageUrl ? (
                            <div className="absolute right-4 -top-2 w-11 h-11 pointer-events-none rotate-[-12deg] z-20">
                              <img
                                src={profile.officialDocumentConfig.stampImageUrl}
                                alt="Cap Stempel"
                                className="w-full h-full object-contain filter drop-shadow-xs"
                              />
                            </div>
                          ) : (
                            <div className="absolute right-4 -top-1 w-9 h-9 rounded-full border border-emerald-600/60 bg-emerald-100/30 text-emerald-800 flex flex-col items-center justify-center text-[4.5px] font-black rotate-[-12deg] pointer-events-none z-20">
                              <span>BANI P3N</span>
                              <span>SAH</span>
                            </div>
                          )}

                          {profile.officialDocumentConfig?.treasurerSignatureImageUrl || profile.officialDocumentConfig?.signatureImageUrl ? (
                            <img
                              src={profile.officialDocumentConfig?.treasurerSignatureImageUrl || profile.officialDocumentConfig?.signatureImageUrl}
                              alt="TTD Bendahara"
                              className="max-h-8 max-w-[90px] object-contain relative z-10"
                            />
                          ) : (
                            <span className="text-[9px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 relative z-10">
                              [Tanda Tangan Digital]
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-slate-900 underline">
                          {profile.officialDocumentConfig?.treasurerName || profile.treasurerName || profile.contact?.treasurerName || 'Ahmad Fauzi, S.Ag.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info (Hidden on Print) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between no-print">
          <span>
            💡 Tips: Anda dapat memilih printer <strong>"Save as PDF"</strong> di browser untuk mengunduh semua kwitansi ini ke satu file PDF.
          </span>
          <span className="font-mono">
            {selectedMembersToPrint.length} Dokumen Siap Cetak
          </span>
        </div>
      </div>
    </div>
  );
};
