import Link from "next/link";

const features = [
  ["Yapay Zekâ", "Akıllı analiz ve karar desteği", "◆"],
  ["Otomasyon", "Tekrarlayan işleri otomatikleştirin", "✦"],
  ["Analitik", "Gerçek zamanlı rapor ve içgörüler", "↗"],
  ["Ekosistem", "Tüm sistemlerinizi tek merkezde yönetin", "◎"],
];

export default function WelcomePage() {
  return (
    <main className="page-shell welcome-page">
      <section className="brand-hero">
        <div className="oryvex-mark" aria-label="ORYVEX X">X</div>
        <p className="brand-name">ORYVEX</p>
        <p className="brand-subtitle">BUSINESS OPERATING SYSTEM</p>
        <h1>Tek Çekirdek. <span>Sınırsız Sistem.</span></h1>
        <p className="lead">Tüm şirketlerinizi, yapay zekâ asistanlarınızı, otomasyonlarınızı ve iş süreçlerinizi tek bir akıllı platformdan yönetin.</p>
      </section>

      <section className="feature-grid">
        {features.map(([title, text, icon]) => (
          <article className="glass-card feature-card" key={title}>
            <div className="feature-icon">{icon}</div>
            <div><h2>{title}</h2><p>{text}</p></div>
          </article>
        ))}
      </section>

      <div className="cta-stack">
        <Link className="primary-button" href="/giris">ORYVEX’e Başla <span>→</span></Link>
        <p>Zaten hesabınız var mı? <Link href="/giris">Giriş Yap</Link></p>
      </div>
    </main>
  );
}
