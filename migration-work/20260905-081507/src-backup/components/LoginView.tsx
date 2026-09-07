import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  CircleDollarSign, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  UserPlus, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  CreditCard, 
  HelpCircle,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { Member, AuthUser, MemberCategory } from '../types';
import { 
  loginWithEmailPassword, 
  registerMember, 
  sendPasswordReset, 
  resendVerificationEmail,
  RegisterMemberParams 
} from '../lib/authService';

type AuthScreen = 'login' | 'register' | 'forgot_password' | 'verify_notice';

interface LoginViewProps {
  members: Member[];
  onLogin: (user: AuthUser) => void;
  logoUrl?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  members,
  onLogin,
  logoUrl,
}) => {
  const [screen, setScreen] = useState<AuthScreen>('login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [selectedMemberMatch, setSelectedMemberMatch] = useState<Member | null>(null);
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Helper to find member match by partial name or nickname
  const getMemberMatch = (query: string): Member | null => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    return (
      members.find((m) => {
        const mName = m.name.toLowerCase();
        // Exact substring match or word matching
        if (mName.includes(q)) return true;
        // Strip common titles (H., K.H., Drs., S.Ag, etc.)
        const strippedName = mName.replace(/^(h\.|k\.h\.|drs\.|dr\.|kh\.|ust\.|haji)\s+/i, '').trim();
        return strippedName.includes(q) || q.includes(strippedName);
      }) || null
    );
  };

  // Find all matches for dropdown suggestions if user wants to pick
  const memberMatches = regName.trim().length >= 2 
    ? members.filter((m) => {
        const q = regName.trim().toLowerCase();
        const mName = m.name.toLowerCase();
        return mName.includes(q) || mName.replace(/^(h\.|k\.h\.|drs\.|dr\.|kh\.|ust\.|haji)\s+/i, '').includes(q);
      }).slice(0, 4)
    : [];

  const activeMatchedMember = selectedMemberMatch || getMemberMatch(regName);

  // Forgot Password Form States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // Global Feedback States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick helper: is valid email format
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const email = loginEmail.trim();
    if (!email) {
      setErrorMsg('Silakan masukkan alamat email Anda.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg('Format email tidak valid. Masukkan email yang benar.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    const result = await loginWithEmailPassword(email, loginPassword);
    setIsLoading(false);

    if (result.success && result.user) {
      onLogin(result.user);
    } else {
      setErrorMsg(result.error || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    }
  };

  // Handle Register Member Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim()) {
      setErrorMsg('Silakan masukkan nama lengkap Anda.');
      return;
    }
    if (!regEmail.trim() || !isValidEmail(regEmail)) {
      setErrorMsg('Silakan masukkan alamat email yang valid.');
      return;
    }
    if (!regPhone.trim()) {
      setErrorMsg('Silakan masukkan nomor telepon / WhatsApp aktif.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
      return;
    }

    setIsLoading(true);
    // If a member was matched by partial name, automatically resolve to their official full name
    const finalOfficialName = activeMatchedMember ? activeMatchedMember.name : regName.trim();
    const finalPhone = regPhone.trim() || activeMatchedMember?.phone || '0812-3456-7890';
    const finalCategory = activeMatchedMember?.category || 'P3N';
    const finalAddress = activeMatchedMember?.address || 'Kec. Kedungbanteng, Kab. Banyumas';
    const finalNik = activeMatchedMember?.nik;

    const params: RegisterMemberParams = {
      name: finalOfficialName,
      email: regEmail.trim(),
      password: regPassword,
      phone: finalPhone,
      category: finalCategory,
      address: finalAddress,
      nik: finalNik,
      notes: activeMatchedMember ? `Terhubung otomatis dengan data resmi: ${activeMatchedMember.name}` : undefined,
    };

    const result = await registerMember(params);
    setIsLoading(false);

    if (result.success && result.user) {
      setSuccessMsg('Pendaftaran Anggota berhasil! Email verifikasi telah dikirim.');
      // Auto sign in user as member
      setTimeout(() => {
        onLogin(result.user!);
      }, 700);
    } else {
      setErrorMsg(result.error || 'Pendaftaran gagal. Silakan coba beberapa saat lagi.');
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotSuccessMsg(null);

    const email = forgotEmail.trim();
    if (!email || !isValidEmail(email)) {
      setErrorMsg('Silakan masukkan alamat email yang valid untuk pengiriman tautan reset.');
      return;
    }

    setIsLoading(true);
    const result = await sendPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setForgotSuccessMsg(result.message);
    } else {
      setErrorMsg(result.message || 'Gagal mengirim instruksi reset kata sandi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden transition-colors duration-200">
      {/* Background Subtle Gradient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 dark:bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Paguyuban"
              className="h-8 w-8 object-contain bg-transparent"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
            Paguyuban Bani P3N Kedungbanteng
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-800/60">
          <ShieldCheck className="h-4 w-4" />
          <span>Firebase Authentication & Cloud Firestore</span>
        </div>
      </header>

      {/* Main Centered Auth Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 transition-colors duration-200">
            
            {/* Logo and Organization Title */}
            <div className="flex flex-col items-center text-center space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo Paguyuban Bani P3N"
                  className="h-16 w-16 object-contain bg-transparent"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md ring-2 ring-emerald-500/20">
                  <CircleDollarSign className="h-7 w-7" />
                </div>
              )}
              <div>
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  PAGUYUBAN BANI P3N
                </h1>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Paguyuban Bani P3N Kedungbanteng
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-150 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Gagal Masuk / Mendaftar</span>
                    <span className="font-normal leading-relaxed text-slate-700 dark:text-slate-300 block">{errorMsg}</span>
                  </div>
                </div>

                {errorMsg.includes('operation-not-allowed') || errorMsg.includes('Metode masuk Email') ? (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1.5 text-[11px]">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>📌 Cara Mengaktifkan di Firebase Console:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      <li>Buka <a href="https://console.firebase.google.com/project/gen-lang-client-0342748058/authentication/providers" target="_blank" rel="noreferrer" className="underline font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800">Firebase Console Authentication</a></li>
                      <li>Pilih tab <strong>Sign-in method</strong> &gt; klik <strong>Email/Password</strong></li>
                      <li>Aktifkan toggle <strong>Enable</strong> lalu klik tombol <strong>Save</strong></li>
                    </ol>
                  </div>
                ) : null}

                {errorMsg.includes('sudah terdaftar') && (
                  <div className="pt-1.5 flex items-center gap-2 border-t border-rose-200/60 dark:border-rose-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(regEmail);
                        setErrorMsg(null);
                        setScreen('login');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-all cursor-pointer"
                    >
                      Beralih ke Layar Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(regEmail);
                        setErrorMsg(null);
                        setScreen('forgot_password');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold text-[11px] hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in duration-150">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 1: LOGIN (Masuk Pengguna & Admin) */}
            {/* ========================================================================= */}
            {screen === 'login' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    Masuk Akun Paguyuban
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Masukkan email dan kata sandi akun Member atau Admin Anda
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                  {/* Email Field */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-auth-email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="contoh: anggota@gmail.com / admin@kua.id"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setScreen('forgot_password');
                          setErrorMsg(null);
                          setForgotEmail(loginEmail);
                        }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Lupa Kata Sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-auth-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Masukkan kata sandi..."
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="btn-auth-login"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50 mt-3"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Memproses Autentikasi...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Masuk ke Portal</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Bottom Navigation for Registration */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Belum memiliki akun anggota?
                  </p>
                  <button
                    id="btn-switch-to-register"
                    type="button"
                    onClick={() => {
                      setScreen('register');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Daftar Sebagai Member Baru</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 2: DAFTAR MEMBER (Pendaftaran Khusus Anggota) */}
            {/* ========================================================================= */}
            {screen === 'register' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('login');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Kembali ke Masuk</span>
                  </button>

                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    Pendaftaran Member
                  </span>
                </div>

                <div className="text-center space-y-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    Pendaftaran Akun Anggota
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lengkapi data diri Anda untuk mengakses KTA dan laporan arisan
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                  {/* Nama (Fleksibel: Panggilan / Sebagian) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Nama *
                      </label>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                        Cukup nama panggilan / sebagian
                      </span>
                    </div>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-reg-name"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value);
                          setSelectedMemberMatch(null);
                          setErrorMsg(null);
                        }}
                        placeholder="Contoh: Sugeng, Ahmad, Samsul, Zaenal..."
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>

                    {/* Auto-detected Full Official Name Indicator */}
                    {activeMatchedMember ? (
                      <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 space-y-1 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">
                              Nama Lengkap Otomatis di Dashboard:
                            </span>
                          </div>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-sm shrink-0">
                            Resmi
                          </span>
                        </div>
                        <p className="text-xs font-black text-emerald-800 dark:text-emerald-100 pl-5">
                          {activeMatchedMember.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 pl-5">
                          Nomor Anggota #{activeMatchedMember.no.toString().padStart(2, '0')} • {activeMatchedMember.category}
                        </p>
                      </div>
                    ) : regName.trim().length >= 2 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          💡 Anda tidak harus mengetik nama lengkap. Di menu dashboard nama lengkap Anda akan tertera secara otomatis.
                        </p>
                        {memberMatches.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[10px] text-slate-500 font-semibold">Pilih data resmi:</span>
                            {memberMatches.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMemberMatch(m);
                                  setRegName(m.name);
                                  if (m.phone && !regPhone) setRegPhone(m.phone);
                                }}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-slate-700 dark:text-slate-300 hover:text-emerald-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Alamat Email Aktif *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="nama@gmail.com"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Nomor Telepon / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-reg-phone"
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => {
                          setRegPhone(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="0812-3456-7890"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Kata Sandi (Diatas) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Kata Sandi *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Minimal 6 karakter"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        aria-label={showRegPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Ulangi Sandi (Dibawah) */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Ulangi Sandi *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="input-reg-confirm-password"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          setErrorMsg(null);
                        }}
                        placeholder="Ketik ulang kata sandi Anda"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        aria-label={showRegConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="btn-auth-register"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50 mt-3"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Mendaftarkan Member...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Daftar Sebagai Member</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sudah memiliki akun terdaftar?{' '}
                    <button
                      type="button"
                      onClick={() => setScreen('login')}
                      className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SCREEN 3: LUPA KATA SANDI (Password Reset) */}
            {/* ========================================================================= */}
            {screen === 'forgot_password' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('login');
                      setErrorMsg(null);
                      setForgotSuccessMsg(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Kembali ke Masuk</span>
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    Reset Kata Sandi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Masukkan email Anda untuk menerima tautan pembuatan kata sandi baru
                  </p>
                </div>

                {forgotSuccessMsg ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Tautan Berhasil Dikirim</span>
                      </div>
                      <p>{forgotSuccessMsg}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScreen('login');
                        setForgotSuccessMsg(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer"
                    >
                      Kembali ke Halaman Masuk
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Alamat Email Akun
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="input-forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            setErrorMsg(null);
                          }}
                          placeholder="nama@gmail.com"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>

                    <button
                      id="btn-auth-forgot-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Mengirim Tautan...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Kirim Tautan Reset Kata Sandi</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Clean Institutional Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 gap-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Paguyuban Bani P3N Kedungbanteng ©2026
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Kresno Gadhing Pramudhyo | Hak Cipta
        </p>
      </footer>
    </div>
  );
};
