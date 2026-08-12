const systems = [
  {
    name: "TIKLADOY",
    description: "Çevrim içi paket yemek platformu",
    href: "/systems/tikladoy",
  },
  {
    name: "BURGERMY",
    description: "Paket fast-food sipariş uygulaması",
    href: "/systems/burgermy",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="mark" aria-hidden="true">X</div>
        <p className="eyebrow">BUSINESS OPERATING SYSTEM</p>
        <h1>ORYVEX</h1>
        <p className="tagline">Tek Çekirdek. Sınırsız Sistem.</p>
        <p className="intro">
          Tüm sistemlerinizi, yapay zekâ araçlarınızı, otomasyonlarınızı ve iş süreçlerinizi
          tek bir merkezden yönetin.
        </p>
      </section>

      <section className="systems" aria-labelledby="systems-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ÇALIŞMA ALANLARI</p>
            <h2 id="systems-title">Sistemler</h2>
          </div>
          <span className="status">ORYVEX CORE • AKTİF</span>
        </div>

        <div className="grid">
          {systems.map((system) => (
            <a className="system-card" key={system.name} href={system.href}>
              <div className="card-icon">X</div>
              <div>
                <h3>{system.name}</h3>
                <p>{system.description}</p>
              </div>
              <span className="arrow">→</span>
            </a>
          ))}
          <article className="system-card placeholder">
            <div className="card-icon">+</div>
            <div>
              <h3>Yeni Sistem</h3>
              <p>Woodlife, TEKNOM YAPI ve diğer ürünler bu çekirdeğe bağlanacak.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="core-grid">
        <article><strong>Yapay Zekâ</strong><span>Akıllı analiz ve karar desteği</span></article>
        <article><strong>Otomasyon</strong><span>Tekrarlayan süreçleri hızlandırın</span></article>
        <article><strong>Analitik</strong><span>Gerçek zamanlı performans görünümü</span></article>
        <article><strong>Ekosistem</strong><span>Tüm markaları tek çatı altında yönetin</span></article>
      </section>
    </main>
  );
}
