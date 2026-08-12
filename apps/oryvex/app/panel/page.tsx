import Link from "next/link";
import BottomNav from "../components/BottomNav";

const modules = [
  ["Sistemler", "Tüm çalışma alanlarınızı yönetin ve izleyin.", "/sistemler"],
  ["AI Asistan", "Akıllı asistanınızla etkileşime geçin.", "/ai"],
  ["Analitik", "Verilerinizi analiz edin, içgörüler elde edin.", "#"],
  ["Otomasyon", "Süreçlerinizi otomatikleştirin ve zaman kazanın.", "#"],
];

export default function DashboardPage() {
  return (
    <main className="page-shell">
      <header className="topbar"><div className="mini-brand">ORYVEX</div><div className="top-actions"><a className="icon-button" href="#">♢</a><Link className="icon-button" href="/profil">○</Link></div></header>
      <p style={{margin:0,color:"#aab3c4"}}>Hoş Geldin,</p><h1 className="section-title">Ömer</h1>
      <section className="glass-card ai-hero" style={{textAlign:"left"}}>
        <h2 style={{fontSize:32,margin:"0 0 18px"}}>AI Özet</h2>
        <div className="summary-grid" style={{marginBottom:0}}>
          <article className="summary-card"><span>Aktif Sistem</span><strong>12</strong></article>
          <article className="summary-card"><span>Bekleyen Görev</span><strong>3</strong></article>
          <article className="summary-card"><span>Yeni Bildirim</span><strong>5</strong></article>
          <article className="summary-card"><span>Otomasyon</span><strong>18</strong></article>
        </div>
      </section>
      <section className="module-grid">
        {modules.map(([title,text,href]) => <Link href={href} className="glass-card module-card" key={title}><h3>{title}</h3><p>{text}</p></Link>)}
      </section>
      <section className="glass-card activity"><h2 style={{marginTop:0}}>Son Aktiviteler</h2><div className="activity-row"><span>Finansal raporlama sistemi güncellendi.</span><small>2 dk önce</small></div><div className="activity-row"><span>Yeni görev: Aylık performans analizi</span><small>15 dk önce</small></div><div className="activity-row"><span>5 yeni bildirim alındı.</span><small>1 saat önce</small></div></section>
      <BottomNav active="/panel" />
    </main>
  );
}
