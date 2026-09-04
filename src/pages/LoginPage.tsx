import { FormEvent, useState } from "react";
import { signIn } from "../lib/authService";

export default function LoginPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await signIn(email.trim(), password);
    if (loginError) setError(loginError.message || "Login gagal.");

    setLoading(false);
  }

  return (
    <section className="section page-section">
      <div className="container auth-page">
        <div className="auth-card">
          <span className="eyebrow">AKSES ANGGOTA</span>
          <h1>Login</h1>
          <p className="auth-description">
            Masuk untuk mengakses menu sesuai peran akun Anda.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Sandi
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <button className="back-button" onClick={onBack}>
            ← Kembali ke website
          </button>
        </div>
      </div>
    </section>
  );
}
