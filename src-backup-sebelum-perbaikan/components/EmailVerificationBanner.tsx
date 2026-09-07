import React, { useState } from 'react';
import { Mail, CheckCircle, AlertTriangle, RefreshCw, Send, X } from 'lucide-react';
import { resendVerificationEmail, refreshEmailVerificationStatus } from '../lib/authService';

interface EmailVerificationBannerProps {
  userEmail: string;
  isVerified?: boolean;
  onVerificationRefreshed?: (isVerified: boolean) => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  userEmail,
  isVerified = false,
  onVerificationRefreshed,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (isVerified || dismissed) return null;

  const handleResend = async () => {
    setIsResending(true);
    setFeedback(null);
    const res = await resendVerificationEmail();
    setIsResending(false);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setFeedback(null);
    const verified = await refreshEmailVerificationStatus();
    setIsChecking(false);
    if (verified) {
      setFeedback({ type: 'success', message: 'Alamat email Anda telah terverifikasi!' });
      if (onVerificationRefreshed) {
        onVerificationRefreshed(true);
      }
    } else {
      setFeedback({ 
        type: 'error', 
        message: 'Status email belum terverifikasi. Silakan klik tautan verifikasi yang dikirimkan ke email Anda terlebih dahulu.' 
      });
    }
  };

  return (
    <div id="email-verification-banner" className="bg-amber-500/15 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-700/50 px-4 py-3 text-amber-900 dark:text-amber-200 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold">
              Email Belum Terverifikasi ({userEmail})
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
              Verifikasi email Anda untuk memastikan keamanan akun dan menerima pemberitahuan resmi paguyuban.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            id="btn-resend-verification-email"
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Send className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
            <span>{isResending ? 'Mengirim...' : 'Kirim Ulang Email'}</span>
          </button>

          <button
            id="btn-check-verification-status"
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-amber-300 dark:border-amber-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa...' : 'Cek Status'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup pemberitahuan"
            className="p-1 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      </div>

      {feedback && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-300/40 dark:border-amber-700/40 text-[11px] flex items-center gap-1.5 font-medium">
          {feedback.type === 'success' ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className={feedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
            {feedback.message}
          </span>
        </div>
      )}
    </div>
  );
};
