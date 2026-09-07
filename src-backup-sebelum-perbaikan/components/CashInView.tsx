import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  Calendar,
  CreditCard,
  Building,
  Check, 
  X, 
  AlertCircle,
  RefreshCw,
  Coins,
  Receipt,
  CheckCircle2,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp
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

interface CashInViewProps {
  transactions: CashTransaction[];
  logoUrl?: string;
  onAddTransaction: (tx: Omit<CashTransaction, 'id' | 'type'>) => void;
  onDeleteTransaction: (id: string) => void;
  onSyncFinance?: () => Promise<any>;
}

export const CashInView: React.FC<CashInViewProps> = ({
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
  const [formCategory, setFormCategory] = useState('Setoran Iuran');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formMethod, setFormMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet'>('Tunai');

  const inTransactions = transactions.filter((t) => t.type === 'in');

  const filteredTransactions = inTransactions.filter((tx) => {
    const matchSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.sourceOrRecipient && tx.sourceOrRecipient.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCategory = 
      categoryFilter === 'all' 
        ? true 
        : tx.category === categoryFilter;

    return matchSearch && matchCategory;
  });

  const totalIn = inTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Synchronized Setoran stats
  const arisanInTxs = inTransactions.filter((t) => t.category === 'Setoran Arisan');
  const totalArisanIn = arisanInTxs.reduce((sum, t) => sum + t.amount, 0);

  const iuranInTxs = inTransactions.filter((t) => t.category === 'Setoran Iuran');
  const totalIuranIn = iuranInTxs.reduce((sum, t) => sum + t.amount, 0);

  // Strictly only Setoran Arisan & Setoran Iuran categories per user requirement
  const categories = [
    { key: 'all', label: 'Semua Kas Masuk' },
    { key: 'Setoran Arisan', label: 'Setoran Arisan' },
    { key: 'Setoran Iuran', label: 'Setoran Iuran' },
  ];

  // Monthly aggregated chart data
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyChartData = MONTH_NAMES_SHORT.map((monthName, index) => {
    const monthNum = index + 1;
    const monthTxs = inTransactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() + 1 === monthNum;
    });

    const arisanAmt = monthTxs
      .filter((tx) => tx.category === 'Setoran Arisan')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const iuranAmt = monthTxs
      .filter((tx) => tx.category === 'Setoran Iuran')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      name: monthName,
      'Setoran Arisan': arisanAmt,
      'Setoran Iuran': iuranAmt,
      total: arisanAmt + iuranAmt,
    };
  });

  const pieChartData = [
    { name: 'Setoran Arisan', value: totalArisanIn, color: '#f59e0b' },
    { name: 'Setoran Iuran', value: totalIuranIn, color: '#0d9488' },
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
      const res = await onSyncFinance();
      setSyncFeedback('Data uang masuk berhasil disinkronkan. Aktifitas terakhir telah disimpan!');
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

    const receiptNo = `KM-${new Date().getFullYear()}-${(inTransactions.length + 1).toString().padStart(3, '0')}`;

    onAddTransaction({
      category: formCategory,
      amount: Number(formAmount),
      date: formDate,
      description: formDescription,
      sourceOrRecipient: formSource || 'Anggota Paguyuban',
      receiptNo,
      paymentMethod: formMethod,
    });

    setIsAddModalOpen(false);
    // Reset
    setFormAmount('');
    setFormDescription('');
    setFormSource('');
  };

  const handleExportCSV = () => {
    const headers = ['No Bukti', 'Tanggal', 'Kategori', 'Keterangan', 'Sumber Dana', 'Metode', 'Nominal (Rp)'];
    const rows = inTransactions.map((tx) => [
      tx.receiptNo,
      tx.date,
      tx.category,
      tx.description,
      tx.sourceOrRecipient || '-',
      tx.paymentMethod || 'Tunai',
      tx.amount,
    ]);
    exportToCSV(`Laporan_Uang_Masuk_Bani_P3N.csv`, [headers, ...rows]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <img
            src={logoUrl || '/logo.svg'}
            alt="Logo Paguyuban"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain bg-white/10 backdrop-blur-xs p-2 rounded-2xl border border-white/20 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-950/40 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-200 border border-teal-400/30">
                Buku Kas Masuk
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                Tersinkron Otomatis Setoran
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pencatatan Uang Masuk
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl">
              Paguyuban Bani P3N Kedungbanteng • Penerimaan kas masuk terhubung langsung dengan pembayaran Setoran Arisan (Rp 50.000) dan Setoran Iuran (Rp 20.000).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 p-3.5 sm:p-4 rounded-xl backdrop-blur-xs border border-white/20 text-right">
            <p className="text-[10px] sm:text-[11px] text-teal-200 uppercase font-semibold">
              Total Seluruh Kas Masuk
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white">
              {formatRupiah(totalIn)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {onSyncFinance && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold px-3.5 py-2 text-xs border border-white/20 transition-all backdrop-blur-xs shadow-xs disabled:opacity-50 cursor-pointer"
                title="Sinkronkan data uang masuk untuk menyimpan aktifitas terakhir"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Uang Masuk'}</span>
              </button>
            )}
            <button
              id="btn-open-add-cash-in"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Catat Non-Setoran
            </button>
          </div>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{syncFeedback}</span>
          </div>
          <button type="button" onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Breakdown Synchronized Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Setoran Arisan Card */}
        <div 
          onClick={() => setCategoryFilter('Setoran Arisan')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            categoryFilter === 'Setoran Arisan' 
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/30 shadow-md' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Setoran Arisan
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Rp 50.000 / anggota per bulan
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {arisanInTxs.length} Transaksi
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatRupiah(totalArisanIn)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Tersinkron otomatis setiap anggota membayar putaran arisan
          </p>
        </div>

        {/* Setoran Iuran Card */}
        <div 
          onClick={() => setCategoryFilter('Setoran Iuran')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer ${
            categoryFilter === 'Setoran Iuran' 
              ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-400 ring-2 ring-teal-400/30 shadow-md' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Setoran Iuran Kas
                </p>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                  Rp 20.000 / anggota per bulan
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
              {iuranInTxs.length} Transaksi
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatRupiah(totalIuranIn)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Tersinkron otomatis setiap anggota membayar iuran kas paguyuban
          </p>
        </div>
      </div>

      {/* Modern Interactive Chart Section: Setoran Arisan vs Setoran Iuran */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Grafik Analitik Setoran Kas Masuk
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualisasi perbandingan tren bulanan antara <strong>Setoran Arisan</strong> dan <strong>Setoran Iuran</strong>
            </p>
          </div>

          {/* Chart Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setChartTab('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartTab === 'bar'
                  ? 'bg-teal-600 text-white shadow-xs'
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
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Tren Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartTab('donut')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                chartTab === 'donut'
                  ? 'bg-teal-600 text-white shadow-xs'
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
                <Bar dataKey="Setoran Arisan" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Setoran Iuran" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorArisanIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorIuranIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Setoran Arisan" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorArisanIn)" />
                <Area type="monotone" dataKey="Setoran Iuran" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIuranIn)" />
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
                    <p className="font-bold text-slate-800 dark:text-slate-200">Setoran Arisan (Rp 50.000)</p>
                    <p className="text-amber-600 dark:text-amber-400 font-extrabold font-mono text-sm">
                      {formatRupiah(totalArisanIn)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-teal-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Setoran Iuran Kas (Rp 20.000)</p>
                    <p className="text-teal-600 dark:text-teal-400 font-extrabold font-mono text-sm">
                      {formatRupiah(totalIuranIn)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-500">
                  Total Terkumpul: <strong className="text-slate-900 dark:text-white font-mono">{formatRupiah(totalArisanIn + totalIuranIn)}</strong>
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
              id="input-search-cash-in"
              type="text"
              placeholder="Cari transaksi, nomor bukti, sumber/nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9.5 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
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

        {/* Category Pills - ONLY Setoran Arisan & Setoran Iuran */}
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
                  ? cat.key === 'Setoran Arisan'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : cat.key === 'Setoran Iuran'
                    ? 'bg-teal-600 text-white shadow-xs'
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
                <th className="py-3.5 px-4 whitespace-nowrap">Sumber / Penyetor</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status Sinkron</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Nominal Masuk</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Tidak ada catatan uang masuk yang cocok.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isSyncTx = tx.id.startsWith('tx-sync-') || tx.category === 'Setoran Arisan' || tx.category === 'Setoran Iuran';
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
                          tx.category === 'Setoran Arisan'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : tx.category === 'Setoran Iuran'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {tx.sourceOrRecipient || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSyncTx ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[9px] font-bold border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                            Tersinkron Setoran
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[9px] font-semibold">
                            Pencatatan Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                        +{formatRupiah(tx.amount)}
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Catat Kas Masuk (Non-Setoran)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Untuk saldo awal, infaq/donasi sukarela, dan jasa kas lainnya
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
                    Kategori Penerimaan
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Saldo Awal">Saldo Awal Kas</option>
                    <option value="Donasi & Infaq">Donasi / Infaq Sukarela</option>
                    <option value="Bunga Kas / Jasa">Bunga / Jasa Kas</option>
                    <option value="Setoran Iuran">Setoran Iuran Manual</option>
                    <option value="Setoran Arisan">Setoran Arisan Manual</option>
                    <option value="Lain-lain">Penerimaan Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Uang Masuk (Rp) *
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 100000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  min={1000}
                  step={1000}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Keterangan *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Saldo awal kas paguyuban tahun 2026..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sumber Dana / Penyetor
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: H. Lubab Habib / Kas Umum"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank (BSI / BRI / Mandiri)</option>
                    <option value="E-Wallet">E-Wallet (QRIS / DANA / OVO)</option>
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
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2 text-xs shadow-md transition-colors cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
