import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="page-shell login-wrap">
      <section className="brand-hero">
        <div className="oryvex-mark" aria-label="ORYVEX X">X</div>
        <p className="brand-name">ORYVEX</p>
        <p className="brand-subtitle">BUSINESS OPERATING SYSTEM</p>
      </section>

      <section className="glass-card login-card">
        <h1 className="section-title" style={{fontSize: 36}}>Giriş Yap</h1>
        <p className="section-subtitle">ORYVEX çalışma alanınıza erişin.</p>
        <label className="field"><span>E-posta</span><input type="email" placeholder="E-posta adresinizi girin" /></label>
        <label className="field"><span>Şifre</span><input type="password" placeholder="Şifrenizi girin" /></label>
        <div className="login-options"><span>□ Beni Hatırla</span><a href="#">Şifremi Unuttum</a></div>
        <Link className="primary-button" href="/panel">Giriş Yap <span>→</span></Link>
        <p style={{textAlign:"center",color:"#909bad",marginTop:18}}>Hesabınız yok mu? <a style={{color:"#b46cff"}} href="#">Yöneticiye Başvurun</a></p>
      </section>
    </main>
  );
}
