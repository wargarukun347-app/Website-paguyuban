import { signOut } from "../lib/authService";

type Props = { name: string; email: string | null; onLogout: () => void };

export default function MemberDashboard({ name, email, onLogout }: Props) {
  async function logout() { await signOut(); onLogout(); }
  return <section className="section page-section"><div className="container member-panel">
    <span className="eyebrow">AKUN ANGGOTA</span><h1>Selamat datang, {name || "Anggota"}</h1>
    <p>Akun Anda memiliki akses ke area anggota. Menu administrasi tidak ditampilkan untuk akun anggota.</p>
    <div className="member-card"><strong>Profil</strong><span>{email || "Email tidak tersedia"}</span><small>Peran: Anggota</small></div>
    <div className="member-actions"><button className="primary-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Lihat informasi</button><button className="secondary-button" onClick={logout}>Keluar</button></div>
  </div></section>;
}
