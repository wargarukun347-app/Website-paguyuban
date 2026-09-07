import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { 
  X, 
  Printer, 
  Download, 
  Upload, 
  PenTool, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Camera, 
  ShieldCheck, 
  Building2, 
  User, 
  Eye, 
  Trash2, 
  FileImage,
  QrCode as QrIcon,
  Layers,
  Award,
  CheckCircle2
} from 'lucide-react';
import { Member, PaguyubanProfile } from '../types';

interface MemberCardModalProps {
  member: Member;
  profile: PaguyubanProfile;
  onClose: () => void;
  onUpdateMember?: (updatedMember: Member) => void;
}

type CardSideView = 'both' | 'front' | 'back';

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  member,
  profile,
  onClose,
  onUpdateMember,
}) => {
  const [activeSide, setActiveSide] = useState<CardSideView>('both');
  const [photoUrl, setPhotoUrl] = useState<string>(member.photoUrl || '');
  const [memberSignatureUrl, setMemberSignatureUrl] = useState<string>(member.signatureUrl || '');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // References for card capture & canvas drawing
  const frontCardRef = useRef<HTMLDivElement | null>(null);
  const backCardRef = useRef<HTMLDivElement | null>(null);
  const bothCardsRef = useRef<HTMLDivElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const filePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const fileSigInputRef = useRef<HTMLInputElement | null>(null);

  const memberIdCode = `KTA-P3N-2026-${member.no.toString().padStart(3, '0')}`;
  const chairmanName = profile.officialDocumentConfig?.chairmanName || profile.contact?.chairmanName || 'Imam Husen, S.Ag.';
  const chairmanSignature = profile.officialDocumentConfig?.signatureImageUrl || '';

  // Generate dynamic QR Code for Member Verification
  useEffect(() => {
    const generateQR = async () => {
      try {
        const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=kta&doc=${memberIdCode}&name=${encodeURIComponent(member.name)}&no=${member.no}&cat=${encodeURIComponent(member.category)}&phone=${encodeURIComponent(member.phone || '')}&date=2026-04-01`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 256,
          margin: 1,
          color: {
            dark: '#022c22', // deep emerald dark
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Error generating member QR Code:', err);
      }
    };
    generateQR();
  }, [memberIdCode, member.name, member.no, member.category, member.phone]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto terlalu besar (maksimal 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoUrl(result);
      if (onUpdateMember) {
        onUpdateMember({
          ...member,
          photoUrl: result,
        });
      }
      showToast('Pas foto anggota berhasil diperbarui');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (onUpdateMember) {
      onUpdateMember({
        ...member,
        photoUrl: undefined,
      });
    }
    showToast('Pas foto dihapus (menggunakan avatar default)');
  };

  // Signature Pad Logic
  useEffect(() => {
    if (showSigModal && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a'; // Blue ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [showSigModal]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingSig(false);
  };

  const handleClearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveDrawnSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setMemberSignatureUrl(dataUrl);
    setShowSigModal(false);
    if (onUpdateMember) {
      onUpdateMember({
        ...member,
        signatureUrl: dataUrl,
      });
    }
    showToast('Tanda tangan pemegang berhasil disimpan');
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          // Process image to convert white / near-white background to pure transparent PNG
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // If pixel is near-white or light gray background, make it transparent
              if (r > 200 && g > 200 && b > 200) {
                data[i + 3] = 0;
              } else if (r > 160 && g > 160 && b > 160) {
                // Feather edge pixels
                const brightness = (r + g + b) / 3;
                data[i + 3] = Math.max(0, Math.min(255, Math.round((255 - brightness) * 3)));
              }
            }
            ctx.putImageData(imgData, 0, 0);
            const transparentDataUrl = canvas.toDataURL('image/png');
            setMemberSignatureUrl(transparentDataUrl);
            if (onUpdateMember) {
              onUpdateMember({
                ...member,
                signatureUrl: transparentDataUrl,
              });
            }
            showToast('File tanda tangan berhasil dimuat (latar transparan)');
            return;
          }
        } catch {
          // Fallback to raw base64 if canvas security allows
        }
        setMemberSignatureUrl(rawBase64);
        if (onUpdateMember) {
          onUpdateMember({
            ...member,
            signatureUrl: rawBase64,
          });
        }
        showToast('File tanda tangan berhasil dimuat');
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setMemberSignatureUrl('');
    if (onUpdateMember) {
      onUpdateMember({
        ...member,
        signatureUrl: undefined,
      });
    }
    showToast('Tanda tangan pemegang direset');
  };

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Download Card as Image (Front, Back, or Both)
  const handleDownloadCard = async (side: 'front' | 'back' | 'both') => {
    let targetElement: HTMLDivElement | null = null;
    let filename = `KTA_${member.no}_${member.name.replace(/\s+/g, '_')}`;

    if (side === 'front') {
      targetElement = frontCardRef.current;
      filename += '_DEPAN.png';
    } else if (side === 'back') {
      targetElement = backCardRef.current;
      filename += '_BELAKANG.png';
    } else {
      targetElement = bothCardsRef.current;
      filename += '_LENGKAP.png';
    }

    if (!targetElement) return;

    try {
      setIsDownloading(true);
      const dataUrl = await toPng(targetElement, {
        pixelRatio: 3, // High DPI resolution for crisp printing
        quality: 0.98,
        cacheBust: true,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      showToast(`Kartu (${side.toUpperCase()}) berhasil diunduh!`);
    } catch (err) {
      console.error('Error exporting card:', err);
      try {
        const dataUrl = await toPng(targetElement, {
          pixelRatio: 2,
          skipFonts: true,
        });
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        showToast(`Kartu (${side.toUpperCase()}) berhasil diunduh!`);
      } catch (fallbackErr) {
        console.error('Secondary export error:', fallbackErr);
        alert('Terjadi kesalahan saat mengunduh gambar kartu.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Card Handler with Isolated Print Document Engine
  const handlePrint = async () => {
    try {
      setIsDownloading(true);
      let frontImg = '';
      let backImg = '';

      if (frontCardRef.current) {
        try {
          frontImg = await toPng(frontCardRef.current, {
            pixelRatio: 3,
            quality: 0.98,
            cacheBust: true,
            skipFonts: true,
          });
        } catch (e) {
          console.warn('Front card render error:', e);
        }
      }

      if (backCardRef.current) {
        try {
          backImg = await toPng(backCardRef.current, {
            pixelRatio: 3,
            quality: 0.98,
            cacheBust: true,
            skipFonts: true,
          });
        } catch (e) {
          console.warn('Back card render error:', e);
        }
      }

      // Create an isolated printable iframe
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>KTA_${member.name.replace(/[^a-zA-Z0-9]/g, '_')}_Bani_P3N</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm 12mm;
              }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header-kop {
                border-bottom: 2px solid #059669;
                padding-bottom: 8px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              .header-text {
                text-align: center;
                flex: 1;
              }
              .title-main {
                font-size: 15pt;
                font-weight: 900;
                color: #064e3b;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .sub-title {
                font-size: 9.5pt;
                font-weight: 600;
                color: #334155;
                margin: 2px 0 0 0;
              }
              .doc-label {
                text-align: center;
                margin-bottom: 16px;
              }
              .doc-label h2 {
                margin: 0;
                font-size: 11pt;
                font-weight: 800;
                color: #0f766e;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .doc-label p {
                margin: 3px 0 0 0;
                font-size: 8.5pt;
                color: #64748b;
              }
              .cards-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 18px;
                margin-bottom: 20px;
              }
              .card-box {
                text-align: center;
              }
              .card-box-label {
                font-size: 8pt;
                font-weight: bold;
                color: #475569;
                text-transform: uppercase;
                margin-bottom: 5px;
              }
              .card-img {
                width: 85.6mm;
                height: 53.98mm;
                border-radius: 3.5mm;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                border: 1px solid #94a3b8;
                object-fit: cover;
                display: block;
                margin: 0 auto;
              }
              .info-table {
                width: 100%;
                max-width: 130mm;
                margin: 0 auto 16px auto;
                border-collapse: collapse;
                font-size: 8.5pt;
              }
              .info-table td {
                padding: 3px 6px;
                border-bottom: 1px dashed #e2e8f0;
              }
              .info-label {
                font-weight: bold;
                color: #475569;
                width: 40%;
              }
              .footer-notes {
                font-size: 7.5pt;
                color: #64748b;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                padding-top: 8px;
                margin-top: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header-kop">
              <div class="header-text">
                <h1 class="title-main">PAGUYUBAN BANI P3N</h1>
                <p class="sub-title">KUA KECAMATAN KEDUNGBANTENG &bull; PERIODE RESMI 2026/2027</p>
              </div>
            </div>

            <div class="doc-label">
              <h2>LEMBAR CETAK KARTU TANDA ANGGOTA RESMI (KTA)</h2>
              <p>Nomor Urut: #${member.no.toString().padStart(2, '0')} &bull; Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div class="cards-container">
              ${frontImg ? `
                <div class="card-box">
                  <div class="card-box-label">&bull; Tampak Depan (Front Side) &bull;</div>
                  <img src="${frontImg}" class="card-img" alt="KTA Depan" />
                </div>
              ` : ''}

              ${backImg ? `
                <div class="card-box">
                  <div class="card-box-label">&bull; Tampak Belakang (Back Side) &bull;</div>
                  <img src="${backImg}" class="card-img" alt="KTA Belakang" />
                </div>
              ` : ''}
            </div>

            <table class="info-table">
              <tr>
                <td class="info-label">Nama Lengkap</td>
                <td><strong>: ${member.name}</strong></td>
              </tr>
              <tr>
                <td class="info-label">Nomor Urut Anggota</td>
                <td>: #${member.no.toString().padStart(2, '0')}</td>
              </tr>
              <tr>
                <td class="info-label">Kategori / Jabatan</td>
                <td>: ${member.category}</td>
              </tr>
              <tr>
                <td class="info-label">Desa / Domisili</td>
                <td>: ${member.address || 'Kedungbanteng, Banyumas'}</td>
              </tr>
              <tr>
                <td class="info-label">Status Keanggotaan</td>
                <td>: <strong style="color: #059669;">${member.status}</strong></td>
              </tr>
            </table>

            <div class="footer-notes">
              <p>Kartu Tanda Anggota ini sah dan diakui sebagai identitas resmi Paguyuban Bani P3N KUA Kecamatan Kedungbanteng.</p>
              <p>Gunting sesuai garis batas kartu untuk laminasi atau penggunaan ID Card Holder standar (85.6 mm x 54 mm).</p>
            </div>
          </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 4000);
        }, 600);
      }
    } catch (err) {
      console.error('Direct print error, fallback to window.print():', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto modal-backdrop-print">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-60 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 no-print">
          <CheckCircle2 className="h-4 w-4" />
          <span>{saveToast}</span>
        </div>
      )}

      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 modal-content-print">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <QrIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Kartu Tanda Anggota (KTA) Digital
                </h3>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Resmi 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {member.name} &bull; Nomor Urut: #{member.no.toString().padStart(2, '0')} ({member.category})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar & Side View Selector */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {/* Side Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === 'both'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Dua Sisi (Depan & Belakang)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === 'front'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Tampak Depan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === 'back'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Tampak Belakang (Pakta Integritas)</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isDownloading ? 'Menyiapkan...' : 'Cetak Kartu'}</span>
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadCard(activeSide)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-900/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloading ? 'Mengunduh...' : 'Unduh Gambar (HD)'}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Customization Bar: Pas Foto & Tanda Tangan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 no-print">
            
            {/* 1. Pas Foto Tool */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  <span>Pas Foto Anggota (Foto Formal):</span>
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-12 w-10 shrink-0 rounded-lg border-2 border-emerald-500/50 bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={filePhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => filePhotoInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Unggah Pas Foto (Galeri/File)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Tanda Tangan Pemegang Tool */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <PenTool className="h-4 w-4" />
                  <span>Tanda Tangan Pemegang Kartu:</span>
                </label>
                {memberSignatureUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveSignature}
                    className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-12 w-20 shrink-0 rounded-lg border border-slate-700 bg-white/90 p-1 flex items-center justify-center overflow-hidden">
                  {memberSignatureUrl ? (
                    <img src={memberSignatureUrl} alt="TTD Pemegang" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[9px] text-slate-400 italic">Belum ada</span>
                  )}
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSigModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>Tanda Tangan di Layar</span>
                  </button>

                  <input
                    ref={fileSigInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileSigInputRef.current?.click()}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Upload Gambar Tanda Tangan"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Card Presentation Canvas (For Screen and High-Res Capture) */}
          <div ref={bothCardsRef} className="flex flex-col items-center justify-center gap-8 py-2">
            
            {/* ========== TAMPAK DEPAN (FRONT SIDE - MODERN WHITE DESIGN) ========== */}
            {(activeSide === 'both' || activeSide === 'front') && (
              <div className="flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-3.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                    &bull; Tampak Depan (Front Side - Kartu Putih Elegan) &bull;
                  </span>
                </div>

                {/* ID Card Front Container (Standard ID-1 Aspect Ratio 85.6mm x 53.98mm) */}
                <div
                  ref={frontCardRef}
                  id="kta-card-front"
                  className="w-[440px] sm:w-[500px] h-[280px] sm:h-[318px] rounded-2xl bg-white border border-slate-300 shadow-2xl relative overflow-hidden text-slate-900 flex flex-col justify-between p-4 sm:p-4.5 select-none"
                  style={{
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Subtle Professional Security Pattern Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:10px_10px]" />
                  
                  {/* Top Gradient Stripe */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-800 via-teal-700 to-amber-500 pointer-events-none" />
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none opacity-60" />
                  <div className="absolute -left-20 -top-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl pointer-events-none opacity-40" />

                  {/* Top Header Card */}
                  <div className="relative z-10 flex items-center justify-between border-b border-slate-200 pb-2 mt-0.5">
                    <div className="flex items-center gap-3">
                      {/* Transparent Logo without bounding box */}
                      {(profile.logoUrl || '/logo.svg') ? (
                        <img
                          src={profile.logoUrl || '/logo.svg'}
                          alt="Logo Paguyuban"
                          className="h-11 w-11 sm:h-12 sm:w-12 object-contain bg-transparent shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center text-emerald-800 shrink-0">
                          <Building2 className="h-9 w-9 text-emerald-800 filter drop-shadow-xs" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] sm:text-[13px] font-black tracking-wider text-emerald-950 uppercase font-sans">
                            PAGUYUBAN BANI P3N
                          </p>
                          <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-[8.5px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                            2026
                          </span>
                        </div>
                        <p className="text-[9.5px] sm:text-[10px] text-slate-800 font-bold tracking-wide">
                          KUA KECAMATAN KEDUNGBANTENG
                        </p>
                        <p className="text-[8px] text-emerald-700 font-mono tracking-wider font-extrabold">
                          KABUPATEN BANYUMAS &bull; KTA RESMI
                        </p>
                      </div>
                    </div>

                    {/* Member Number Badge */}
                    <div className="text-right shrink-0">
                      <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-500">
                        No. ID Anggota
                      </p>
                      <div className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-900 text-white font-mono font-black text-[11px] sm:text-xs shadow-xs border border-emerald-950">
                        {memberIdCode}
                      </div>
                    </div>
                  </div>

                  {/* Center Card Body: Photo & Member Bio */}
                  <div className="relative z-10 flex items-center gap-3.5 sm:gap-4 py-1">
                    
                    {/* Member Photo Frame */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div className="w-[86px] sm:w-[96px] h-[108px] sm:h-[120px] rounded-xl overflow-hidden relative flex items-center justify-center bg-slate-100 border-2 border-emerald-700 shadow-md">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                            <User className="h-10 w-10 text-slate-400 mb-1" />
                            <span className="text-[8px] font-bold text-slate-500">Pas Foto</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="flex-1 space-y-1.5 overflow-hidden">
                      <div>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-800">
                          Nama Lengkap Anggota:
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-950 truncate tracking-tight">
                          {member.name}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px] pt-0.5">
                        <div>
                          <p className="text-slate-500 text-[8px] uppercase tracking-wider font-bold">Kategori / Jabatan</p>
                          <p className="font-extrabold text-emerald-950 truncate">
                            {member.category} {member.category === 'P3N' ? '(Pembantu PPN)' : ''}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 text-[8px] uppercase tracking-wider font-bold">No. Urut Undian</p>
                          <p className="font-extrabold text-slate-900 font-mono">
                            #{member.no.toString().padStart(2, '0')} (Putaran Arisan)
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 text-[8px] uppercase tracking-wider font-bold">No. Telepon / WA</p>
                          <p className="font-bold text-slate-800 font-mono text-[9px]">
                            {member.phone || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500 text-[8px] uppercase tracking-wider font-bold">Masa Berlaku</p>
                          <p className="font-bold text-emerald-700 font-mono text-[9px]">
                            01/04/2026 - 31/03/2027
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Security Scanner */}
                    <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                      <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-300">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="QR Verifikasi KTA"
                            className="w-14 h-14 sm:w-15 sm:h-15 object-contain"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 animate-pulse rounded-md" />
                        )}
                      </div>
                      <span className="text-[7px] font-extrabold text-emerald-800 mt-1 uppercase tracking-wider font-mono">
                        Verifikasi Sah
                      </span>
                    </div>

                  </div>

                  {/* Bottom Bar: Barcode strip & Security Seal */}
                  <div className="relative z-10 pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="font-bold text-emerald-900 tracking-wide">
                        PAGUYUBAN RESMI KUA KEDUNGBANTENG &bull; BANYUMAS
                      </span>
                    </div>

                    {/* Faux Linear Barcode Graphic */}
                    <div className="flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                      <div className="w-0.5 h-3 bg-slate-900" />
                      <div className="w-1 h-3 bg-slate-900" />
                      <div className="w-0.5 h-3 bg-slate-900" />
                      <div className="w-1.5 h-3 bg-slate-900" />
                      <div className="w-0.5 h-3 bg-slate-900" />
                      <div className="w-1 h-3 bg-slate-900" />
                      <div className="w-0.5 h-3 bg-slate-900" />
                      <div className="w-2 h-3 bg-slate-900" />
                      <div className="w-0.5 h-3 bg-slate-900" />
                      <div className="w-1 h-3 bg-slate-900" />
                      <span className="text-[7px] font-mono font-bold text-slate-900 ml-1">
                        *{memberIdCode}*
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ========== TAMPAK BELAKANG (BACK SIDE - E-KTP STYLE WITH NFC LIST) ========== */}
            {(activeSide === 'both' || activeSide === 'back') && (
              <div className="flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-3.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                    &bull; Tampak Belakang (Model e-KTP Smart Card & NFC) &bull;
                  </span>
                </div>

                {/* ID Card Back Container */}
                <div
                  ref={backCardRef}
                  id="kta-card-back"
                  className="w-[440px] sm:w-[500px] h-[280px] sm:h-[318px] rounded-2xl bg-white border border-slate-300 shadow-2xl relative overflow-hidden text-slate-900 flex flex-col justify-between p-3.5 sm:p-4 select-none"
                  style={{
                    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:10px_10px]" />
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-800 via-teal-700 to-amber-500 pointer-events-none" />

                  {/* Top Bar: e-KTP NFC Header List */}
                  <div className="relative z-10 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white px-2.5 py-1.5 rounded-lg border border-emerald-800/60 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono font-black text-[8px] tracking-wider shadow-2xs">
                        <span>NFC</span>
                        <span className="text-[8px] font-sans">(((•)))</span>
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[9.5px] font-black tracking-wider uppercase text-emerald-200 leading-none">
                          KARTU TANDA ANGGOTA ELEKTRONIK (SMART ID)
                        </p>
                        <p className="text-[6.5px] sm:text-[7px] text-slate-300 font-mono tracking-tight mt-0.5">
                          NFC CONTACTLESS &bull; ISO/IEC 14443 &bull; KUA KEDUNGBANTENG BANYUMAS
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Metallic Chip Graphic */}
                      <div className="w-6 h-4.5 rounded bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 border border-amber-500 shadow-2xs relative flex items-center justify-center">
                        <div className="w-4 h-2.5 border border-amber-700/60 rounded-xs flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-amber-200/80 rounded-2xs" />
                        </div>
                      </div>
                      <span className="text-[7.5px] font-mono font-black text-amber-300 bg-emerald-900/90 px-1.5 py-0.5 rounded border border-amber-400/30">
                        UID-SMART
                      </span>
                    </div>
                  </div>

                  {/* Pakta Integritas List Layout */}
                  <div className="relative z-10 text-[7.5px] sm:text-[8px] text-slate-800 space-y-0.5 leading-snug px-0.5 my-0.5">
                    <div className="text-[8px] font-black text-emerald-950 uppercase tracking-wide flex items-center justify-between pb-0.5 border-b border-slate-200">
                      <span>PAKTA INTEGRITAS & KETENTUAN ANGGOTA PAGUYUBAN BANI P3N:</span>
                      <span className="text-[7px] font-mono text-emerald-700">TERDAFTAR RESMI 2026</span>
                    </div>
                    <div className="flex items-start gap-1 pt-0.5">
                      <span className="font-black text-emerald-800 shrink-0">1.</span>
                      <span>Menjunjung tinggi ukhuwah islamiyah, kekeluargaan, & silaturahmi keluarga besar KUA Kec. Kedungbanteng.</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-black text-emerald-800 shrink-0">2.</span>
                      <span>Menjaga etika, integritas, dan kehormatan korps P3N, Penyuluh Agama, & Staf KUA.</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-black text-emerald-800 shrink-0">3.</span>
                      <span>Melaksanakan kewajiban setoran Arisan (Rp 50.000) dan Iuran Kas (Rp 20.000) tepat waktu setiap bulan.</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-black text-emerald-800 shrink-0">4.</span>
                      <span>Berhak mengikuti undian get arisan bulanan & menerima hak santunan/manfaat dana sosial kas paguyuban.</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-black text-emerald-800 shrink-0">5.</span>
                      <span>Kartu ini bukti keanggotaan sah dan wajib ditunjukkan saat pertemuan rutin paguyuban.</span>
                    </div>
                  </div>

                  {/* Dual Signatures: Pemegang Kartu & Ketua Paguyuban (With Enlarged Overlapping Stamp & Enhanced Boldness) */}
                  <div className="relative z-10 pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-center">
                    
                    {/* TTD 1: Pemegang Kartu (Anggota) */}
                    <div className="flex flex-col items-center justify-between h-[76px] sm:h-[82px]">
                      <p className="text-[7.5px] font-bold text-slate-600">
                        Pemegang Kartu (Anggota)
                      </p>
                      
                      <div className="h-11 sm:h-12 w-full flex items-center justify-center relative">
                        {memberSignatureUrl ? (
                          <img
                            src={memberSignatureUrl}
                            alt="TTD Anggota"
                            className="max-h-[50px] sm:max-h-[56px] max-w-[160px] sm:max-w-[180px] object-contain mix-blend-multiply bg-transparent scale-125 sm:scale-130 transition-transform filter contrast-[2.2] brightness-[0.4]"
                          />
                        ) : (
                          <span className="text-[7.5px] text-slate-400 italic font-mono border-b border-dashed border-slate-300 px-3 py-0.5">
                            ( Tanda Tangan )
                          </span>
                        )}
                      </div>

                      <p className="text-[8.5px] sm:text-[9px] font-black text-slate-950 border-t border-slate-300 w-full px-1 truncate pt-0.5">
                        {member.name}
                      </p>
                    </div>

                    {/* TTD 2: Ketua Paguyuban (Enlarged Signature & Stamp positioned higher to overlap Ketua text, line and Imam Husen) */}
                    <div className="flex flex-col items-center justify-between h-[76px] sm:h-[82px] relative">
                      <p className="text-[7.5px] font-bold text-slate-700 relative z-10 leading-tight">
                        Kedungbanteng, 01 April 2026<br />
                        <span className="text-[7px] sm:text-[7.5px] text-emerald-900 font-extrabold">Ketua Paguyuban Bani P3N</span>
                      </p>

                      <div className="h-11 sm:h-12 w-full flex items-center justify-center relative">
                        {chairmanSignature ? (
                          <img
                            src={chairmanSignature}
                            alt="TTD Ketua"
                            className="max-h-[58px] sm:max-h-[66px] max-w-[190px] sm:max-w-[210px] object-contain relative z-20 mix-blend-multiply bg-transparent scale-155 sm:scale-170 transition-transform filter contrast-[2.8] brightness-[0.3] drop-shadow-[0_0_0.8px_rgba(0,0,0,0.95)]"
                          />
                        ) : (
                          <span className="text-[11px] sm:text-[12px] font-serif font-black italic text-slate-950 relative z-20 tracking-wider">
                            Imam Husen
                          </span>
                        )}
                      </div>

                      {/* Clean full name: fully visible, high contrast, non-truncated */}
                      <p className="text-[8.5px] sm:text-[9.5px] font-black text-slate-950 border-t border-slate-300 w-full px-0.5 whitespace-nowrap pt-0.5 tracking-tight relative z-10">
                        {chairmanName}
                      </p>

                      {/* Official Stamp: Shifted UP to overlap 'Ketua Paguyuban', signature, and 'I' in Imam Husen */}
                      {profile.officialDocumentConfig?.stampImageUrl ? (
                        <div className="absolute -left-1 sm:-left-2 -top-1.5 sm:-top-2 w-23 h-23 sm:w-27 sm:h-27 rotate-[-13deg] pointer-events-none flex items-center justify-center z-40">
                          <img
                            src={profile.officialDocumentConfig.stampImageUrl}
                            alt="Cap Stempel KTA"
                            className="w-full h-full object-contain filter contrast-[1.5] saturate-[1.7] brightness-[0.85] drop-shadow-xs mix-blend-multiply bg-transparent opacity-95"
                          />
                        </div>
                      ) : (
                        <div className="absolute -left-1 sm:-left-2 -top-1.5 sm:-top-2 w-21 h-21 sm:w-25 sm:h-25 rounded-full border-[3px] border-indigo-900 bg-indigo-50/50 flex flex-col items-center justify-center text-[6.5px] sm:text-[7px] font-black text-indigo-950 rotate-[-13deg] pointer-events-none shadow-sm z-40 opacity-95 mix-blend-multiply">
                          <div className="w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full border-[1.5px] border-indigo-800 flex flex-col items-center justify-center p-0.5">
                            <span className="tracking-wider text-[6px] sm:text-[6.5px] font-black">PAGUYUBAN</span>
                            <span className="text-[5.5px] sm:text-[6px] text-amber-900 font-black tracking-widest my-0.2">BANI P3N</span>
                            <span className="tracking-wider text-[5.5px] sm:text-[6px] font-black">KEDUNGBANTENG</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Disclaimer Bottom Text & NFC Machine Readable Zone */}
                  <div className="relative z-10 flex items-center justify-between text-[6.5px] sm:text-[7px] text-slate-600 border-t border-slate-200 pt-1">
                    <p className="truncate max-w-[320px]">
                      Sekretariat: <strong>KUA Kec. Kedungbanteng, Kab. Banyumas, Jawa Tengah</strong>
                    </p>
                    <div className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      IDIDN&lt;&lt;P3N&lt;{member.no.toString().padStart(3, '0')}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Format kartu standar ID Card (CR80) siap cetak di kertas PVC atau kertas foto.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-900/40 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Kartu Tanda Anggota</span>
            </button>
          </div>
        </div>

      </div>

      {/* Signature Pad Modal (Drawing directly on touchscreen or mouse) */}
      {showSigModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-teal-400" />
                <h4 className="font-bold text-sm">Tanda Tangan Pemegang Kartu</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Goreskan tanda tangan Anda pada kotak putih di bawah ini menggunakan jari atau mouse:
            </p>

            <div className="rounded-2xl border-2 border-teal-500/60 bg-white overflow-hidden shadow-inner p-1">
              <canvas
                ref={sigCanvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearSignature}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Bersihkan</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSigModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawnSignature}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Gunakan Tanda Tangan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Specific CSS to format front and back cards beautifully */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #kta-card-front, #kta-card-front *,
          #kta-card-back, #kta-card-back * {
            visibility: visible;
          }
          #kta-card-front, #kta-card-back {
            position: relative !important;
            margin: 20px auto !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
};
