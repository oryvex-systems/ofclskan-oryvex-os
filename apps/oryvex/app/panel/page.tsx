import Link from "next/link";
import BottomNav from "../components/BottomNav";
import { getTasks, getWorkspaces, requireUser } from "../../lib/session";

const modules = [
  ["Sistemler", "Tüm çalışma alanlarınızı yönetin ve izleyin.", "/sistemler"],
  ["AI Asistan", "Akıllı asistanınızla etkileşime geçin.", "/ai"],
  ["Analitik", "Verilerinizi analiz edin, içgörüler elde edin.", "#"],
  ["Otomasyon", "Süreçlerinizi otomatikleştirin ve zaman kazanın.", "#"],
];

export default async function DashboardPage() {
  const user = await requireUser();
  const [systems, tasks] = await Promise.all([getWorkspaces(), getTasks()]);
  const activeSystems = systems.filter((item)=>item.status === "active").length;
  const waitingTasks = tasks.filter((item)=>item.status === "todo" || item.status === "overdue").length;
  const name = String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Kullanıcı");

  return (
    <main className="page-shell">
      <header className="topbar"><div className="mini-brand">ORYVEX</div><div className="top-actions"><span className="icon-button">♢</span><Link className="icon-button" href="/profil">○</Link></div></header>
      <p style={{margin:0,color:"#aab3c4"}}>Hoş Geldin,</p><h1 className="section-title">{name}</h1>
      <section className="glass-card ai-hero" style={{textAlign:"left"}}>
        <h2 style={{fontSize:32,margin:"0 0 18px"}}>AI Özet</h2>
        <div className="summary-grid" style={{marginBottom:0}}>
          <article className="summary-card"><span>Aktif Sistem</span><strong>{activeSystems}</strong></article>
          <article className="summary-card"><span>Bekleyen Görev</span><strong>{waitingTasks}</strong></article>
          <article className="summary-card"><span>Toplam Sistem</span><strong>{systems.length}</strong></article>
          <article className="summary-card"><span>Toplam Görev</span><strong>{tasks.length}</strong></article>
        </div>
      </section>
      <section className="module-grid">
        {modules.map(([title,text,href]) => <Link href={href} className="glass-card module-card" key={title}><h3>{title}</h3><p>{text}</p></Link>)}
      </section>
      <section className="glass-card activity"><h2 style={{marginTop:0}}>Sistem Durumu</h2><div className="activity-row"><span>ORYVEX Core kimlik doğrulaması</span><small>Aktif</small></div><div className="activity-row"><span>Çalışma alanı yetkilendirmesi</span><small>Aktif</small></div><div className="activity-row"><span>Supabase veri bağlantısı</span><small>Aktif</small></div></section>
      <BottomNav active="/panel" />
    </main>
  );
}
