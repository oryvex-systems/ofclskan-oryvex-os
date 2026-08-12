import BottomNav from "../components/BottomNav";

const systems = [
  { name: "TIKLADOY", desc: "Paket Yemek Platformu", status: "Aktif", progress: 92, href: process.env.NEXT_PUBLIC_TIKLADOY_URL || "https://tikladoy.tr", live: true },
  { name: "BURGERMY", desc: "Sipariş ve Operasyon Sistemi", status: "Aktif", progress: 90, href: process.env.NEXT_PUBLIC_BURGERMY_URL || "https://burgermy-v1.ofrkcaliskan.chatgpt.site", live: true },
  { name: "TEKNOM YAPI", desc: "Şantiye ve Proje Yönetim Sistemi", status: "Hazırlanıyor", progress: 34, href: "#", live: false },
  { name: "WOODLIFE", desc: "Satış, Teklif ve CRM", status: "Hazırlanıyor", progress: 28, href: "#", live: false },
  { name: "DOME LIGHTING", desc: "Teklif ve Üretim Yönetimi", status: "Planlandı", progress: 12, href: "#", live: false },
  { name: "KAYNAŞALIM", desc: "Topluluk Platformu", status: "Planlandı", progress: 18, href: "#", live: false },
] as const;

export default function SystemsPage(){
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div><span className="badge">CORE AKTİF</span></header>
    <h1 className="section-title">Sistemler</h1>
    <p className="section-subtitle">Tüm çalışma alanlarınızı tek merkezden yönetin.</p>

    <section className="summary-grid">
      <article className="summary-card"><span>Canlı Sistem</span><strong>2</strong></article>
      <article className="summary-card"><span>Hazırlanan</span><strong>2</strong></article>
      <article className="summary-card"><span>Planlanan</span><strong>2</strong></article>
      <article className="summary-card"><span>ORYVEX Core</span><strong>Aktif</strong></article>
    </section>

    <section className="system-list">
      {systems.map((system) => {
        const content = <>
          <div className="system-head">
            <div><h2 style={{margin:"0 0 5px"}}>{system.name}</h2><p style={{margin:0,color:"#9ca6b8"}}>{system.desc}</p></div>
            <span className="badge">{system.status}</span>
          </div>
          <div className="progress"><span style={{width:`${system.progress}%`}} /></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#8f99ab",fontSize:13}}>
            <span>{system.live ? "Canlı sisteme geç" : "Geliştirme durumu"}</span>
            <strong style={{color:system.live ? "#65ddff" : "#a783ff"}}>{system.live ? "Aç →" : `%${system.progress}`}</strong>
          </div>
        </>;

        return system.live ? (
          <a className="glass-card system-card" key={system.name} href={system.href} target="_blank" rel="noreferrer">{content}</a>
        ) : (
          <article className="glass-card system-card" key={system.name}>{content}</article>
        );
      })}
    </section>

    <a className="primary-button" href="mailto:admin@oryvex.com?subject=ORYVEX%20Yeni%20Sistem%20Talebi" style={{marginTop:22}}>＋ Yeni Sistem Talebi</a>
    <BottomNav active="/sistemler" />
  </main>
}
