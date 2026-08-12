"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Giriş yapılamadı.");

      router.replace("/panel");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell login-wrap">
      <section className="brand-hero">
        <div className="oryvex-mark" aria-label="ORYVEX X">X</div>
        <p className="brand-name">ORYVEX</p>
        <p className="brand-subtitle">BUSINESS OPERATING SYSTEM</p>
      </section>

      <form className="glass-card login-card" onSubmit={handleSubmit}>
        <h1 className="section-title" style={{ fontSize: 36 }}>Giriş Yap</h1>
        <p className="section-subtitle">ORYVEX çalışma alanınıza güvenli şekilde erişin.</p>

        <label className="field">
          <span>E-posta</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta adresinizi girin" autoComplete="email" required />
        </label>

        <label className="field">
          <span>Şifre</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifrenizi girin" autoComplete="current-password" required />
        </label>

        <div className="login-options">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Beni Hatırla
          </label>
          <a href="mailto:admin@oryvex.com?subject=ORYVEX%20Şifre%20Yardımı">Şifremi Unuttum</a>
        </div>

        {error ? <p style={{ color: "#ff7a9a", margin: "0 0 14px" }}>{error}</p> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"} <span>→</span>
        </button>

        <p style={{ textAlign: "center", color: "#909bad", marginTop: 18 }}>
          Hesabınız yok mu? <a style={{ color: "#b46cff" }} href="mailto:admin@oryvex.com?subject=ORYVEX%20Hesap%20Talebi">Yöneticiye Başvurun</a>
        </p>
        <p style={{ textAlign: "center", marginTop: 6 }}><Link href="/">Ana sayfaya dön</Link></p>
      </form>
    </main>
  );
}
