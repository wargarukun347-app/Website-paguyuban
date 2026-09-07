import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  RefreshCw,
  Award,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  BarChart3,
  PieChart as PieIcon,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { CashTransaction } from '../types';
import { formatRupiah, formatDateIndo, exportToCSV } from '../utils/formatters';

interface CashOutViewProps {
  transactions: CashTransaction[];
  logoUrl?: string;
  onAddTransaction: (tx: Omit<CashTransaction, 'id' | 'type'>) => void;
  onDeleteTransaction: (id: string) => void;
  onSyncFinance?: () => Promise<any>;
}

export const CashOutView: React.FC<CashOutViewProps> = ({
  transactions,
  logoUrl,
  onAddTransaction,
  onDeleteTransaction,
  onSyncFinance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'bar' | 'area' | 'donut'>('bar');

  // Form state
  const [formCategory, setFormCategory] = useState('Konsumsi & Pertemuan');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formRecipient, setFormRecipient] = useState('');
  const [formMethod, setFormMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet'>('Tunai');

  const outTransactions = transactions.filter((t) => t.type === 'out');

  const filteredTransactions = outTransactions.filter((tx) => {
    const matchSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.sourceOrRecipient && tx.sourceOrRecipient.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchCategory = true;
    if (categoryFilter === 'Catatan Arisan') {
      matchCategory = tx.category === 'Pencairan Arisan' || tx.category.toLowerCase().includes('arisan');
    } else if (categoryFilter === 'Catatan Iuran') {
      matchCategory = tx.category !== 'Pencairan Arisan' && !tx.category.toLowerCase().includes('arisan');
    }

    return matchSearch && matchCategory;
  });

  const totalOut = outTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Synchronized Lottery vs Operational stats
  const lotteryOutTxs = outTransactions.filter((t) => t.category === 'Pencairan Arisan' || t.category.toLowerCase().includes('arisan'));
  const totalLotteryOut = lotteryOutTxs.reduce((sum, t) => sum + t.amount, 0);

  const operasionalOutTxs = outTransactions.filter((t) => t.category !== 'Pencairan Arisan' && !t.category.toLowerCase().includes('arisan'));
  const totalOperasionalOut = operasionalOutTxs.reduce((sum, t) => sum + t.amount, 0);

  // Filter categories strictly displaying: Semua, Catatan Arisan, Catatan Iuran
  const categories = [
    { key: 'all', label: 'Semua Kas Keluar' },
    { key: 'Catatan Arisan', label: 'Catatan Arisan' },
    { key: 'Catatan Iuran', label: 'Catatan Iuran' },
  ];

  // Monthly aggregated chart data
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyChartData = MONTH_NAMES_SHORT.map((monthName, index) => {
    const monthNum = index + 1;
    const monthTxs = outTransactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() + 1 === monthNum;
    });

    const arisanOutAmt = monthTxs
      .filter((tx) => tx.category === 'Pencairan Arisan' || tx.category.toLowerCase().includes('arisan'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const iuranOutAmt = monthTxs
      .filter((tx) => tx.category !== 'Pencairan Arisan' && !tx.category.toLowerCase().includes('arisan'))
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      name: monthName,
      'Catatan Arisan': arisanOutAmt,
      'Catatan Iuran': iuranOutAmt,
      total: arisanOutAmt + iuranOutAmt,
    };
  });

  const pieChartData = [
    { name: 'Catatan Arisan (Pencairan)', value: totalLotteryOut, color: '#f59e0b' },
    { name: 'Catatan Iuran (Operasional & Sosial)', value: totalOperasionalOut, color: '#e11d48' },
  ].filter(d => d.value > 0);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)} jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)} rb`;
    return value.toString();
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md">
          <p className="font-bold text-amber-300 mb-1.5">{label || payload[0].name}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white">
                  {formatRupiah(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleManualSync = async () => {
    if (!onSyncFinance) return;
    setIsSyncing(true);
    try {
      await onSyncFinance();
      setSyncFeedback('Data uang keluar berhasil disinkronkan. Aktifitas terakhir telah disimpan!');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0 || !formDescription) return;

    const receiptNo = `KK-${new Date().getFullYear()}-${(outTransactions.length + 1).toString().padStart(3, '0')}`;

    onAddTransaction({
      category: formCategory,
      amount: Number(formAmount),
      date: formDate,
      description: formDescription,
      sourceOrRecipient: formRecipient || 'Penerima',
      receiptNo,
      paymentMethod: formMethod,
    });

    setIsAddModalOpen(false);
    // Reset
    setFormAmount('');
    setFormDescription('');
    setFormRecipient('');
  };

  const handleExportCSV = () => {
    const headers = ['No Bukti', 'Tanggal', 'Kategori', 'Keterangan', 'Penerima', 'Metode', 'Nominal Keluar (Rp)'];
    const rows = outTransactions.map((tx) => [
      tx.receiptNo,
      tx.date,
      tx.category,
      tx.description,
      tx.sourceOrRecipient || '-',
      tx.paymentMethod || 'Tunai',
      tx.amount,
    ]);
    exportToCSV(`Laporan_Uang_Keluar_Bani_P3N.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-700 via-rose-800 to-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <img
            src={logoUrl || '/logo.svg'}
            alt="Logo Paguyuban"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain bg-white/10 backdrop-blur-xs p-2 rounded-2xl border border-white/20 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-950/40 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-200 border border-amber-400/30">
                Buku Kas Keluar
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                <CheckCircle2 className="h-3 w-3 text-amber-300" />
                Tersinkron Hasil Undian
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pencatatan Uang Keluar
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl">
              Paguyuban Bani P3N Kedungbanteng • Pengeluaran pencairan get arisan terhubung otomatis dengan Hasil Undian Arisan, konsumsi, dan kas operasional.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 p-3.5 sm:p-4 rounded-xl backdrop-blur-xs border border-white/20 text-right">
            <p className="text-[10px] sm:text-[11px] text-amber-200 uppercase font-semibold">
              Total Seluruh Kas Keluar
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white">
              {formatRupiah(totalOut)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {onSyncFinance && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold px-3.5 py-2 text-xs border border-white/20 transition-all backdrop-blur-xs shadow-xs disabled:opacity-50 cursor-pointer"
                title="Sinkronkan data uang keluar untuk menyimpan aktifitas terakhir"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Uang Keluar'}</span>
              </button>
            )}
            <button
              id="btn-open-add-cash-out"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Catat Kas Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">{syncFeedback}</span>
          </div>
          <button type="button" onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Breakdown Synchronized Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pencairan Arisan (Hasil Undian) */}
        <div 
          onClick={() => setCategoryFilter('Catatan Arisan')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            categoryFilter === 'Catatan Arisan' 
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/30 shadow-md' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Catatan Arisan (Pencairan)
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Tersinkron Hasil Undian Pemenang
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {lotteryOutTxs.length} Putaran
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatRupiah(totalLotteryOut)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Penyerahan hak uang get arisan otomatis tercatat saat nama pemenang diundi
          </p>
        </div>

        {/* Pengeluaran Operasional & Sosial */}
        <div 
          onClick={() => setCategoryFilter('Catatan Iuran')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            categoryFilter === 'Catatan Iuran' 
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 ring-2 ring-rose-400/30 shadow-md' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Catatan Iuran (Operasional & Sosial)
                </p>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                  Konsumsi, Santunan, ATK & Transport
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
              {operasionalOutTxs.length} Pengeluaran
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatRupiah(totalOperasionalOut)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Realisasi belanja dari pos dana kas iuran paguyuban
          </p>
        </div>
      </div>

      {/* Modern Interactive Chart Section: Catatan Arisan vs Catatan Iuran */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Grafik Analitik Kas Keluar
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualisasi tren bulanan antara <strong>Catatan Arisan (Pencairan)</strong> dan <strong>Catatan Iuran (Pengeluaran Kas)</strong>
            </p>
          </div>

          {/* Chart Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setChartTab('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartTab === 'bar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Diagram Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartTab('area')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartTab === 'area'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Tren Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartTab('donut')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartTab === 'donut'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieIcon className="h-3.5 w-3.5" />
              <span>Komposisi Donut</span>
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-64 w-full pt-2">
          {chartTab === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Catatan Arisan" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Catatan Iuran" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorArisanOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorIuranOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Catatan Arisan" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorArisanOut)" />
                <Area type="monotone" dataKey="Catatan Iuran" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIuranOut)" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'donut' && (
            <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Catatan Arisan (Pencairan Undian)</p>
                    <p className="text-amber-600 dark:text-amber-400 font-extrabold font-mono text-sm">
                      {formatRupiah(totalLotteryOut)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Catatan Iuran (Operasional & Sosial)</p>
                    <p className="text-rose-600 dark:text-rose-400 font-extrabold font-mono text-sm">
                      {formatRupiah(totalOperasionalOut)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-500">
                  Total Pengeluaran: <strong className="text-slate-900 dark:text-white font-mono">{formatRupiah(totalLotteryOut + totalOperasionalOut)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="input-search-cash-out"
              type="text"
              placeholder="Cari pengeluaran, penerima, nomor bukti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9.5 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Category Pills - ONLY Catatan Arisan & Catatan Iuran */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter Kategori:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`rounded-xl px-3.5 py-1.5 font-bold transition-all cursor-pointer ${
                categoryFilter === cat.key
                  ? cat.key === 'Catatan Arisan'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : cat.key === 'Catatan Iuran'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">No Bukti</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Kategori</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Deskripsi / Keterangan</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Penerima</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status Sinkron</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Nominal Keluar</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Tidak ada catatan pengeluaran yang cocok.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSyncTx = tx.id.startsWith('tx-sync-') || tx.category === 'Pencairan Arisan';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {tx.receiptNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateIndo(tx.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          tx.category === 'Pencairan Arisan'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : tx.category === 'Sosial & Santunan'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {tx.sourceOrRecipient || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSyncTx ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[9px] font-bold border border-amber-200 dark:border-amber-800">
                            <CheckCircle2 className="h-2.5 w-2.5 text-amber-500" />
                            Tersinkron Hasil Undian
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[9px] font-semibold">
                            Pencatatan Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                        -{formatRupiah(tx.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          title="Hapus Transaksi"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Pengeluaran Kas Baru
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Catat konsumsi pertemuan, santunan sosial, ATK, atau operasional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Konsumsi & Pertemuan">Konsumsi & Pertemuan Rutin</option>
                    <option value="Sosial & Santunan">Sosial & Santunan Duka/Sakit</option>
                    <option value="ATK & Administrasi">ATK & Keperluan Administrasi</option>
                    <option value="Operasional & Transport">Operasional & Transport</option>
                    <option value="Pencairan Arisan">Pencairan Arisan (Manual)</option>
                    <option value="Lain-lain">Pengeluaran Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  min={1000}
                  step={1000}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Keterangan *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Snack dan konsumsi pertemuan rutin bulan Mei 2026..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Penerima / Toko
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Warung Bu Siti / Keluarga Anggota"
                    value={formRecipient}
                    onChange={(e) => setFormRecipient(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="E-Wallet">E-Wallet</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 text-xs shadow-md transition-colors cursor-pointer"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
