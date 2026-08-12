import BottomNav from "../components/BottomNav";

const tasks = [
  ["Dashboard Tasarımı","Analitik Panel","25 May 2025","Mert Yılmaz","Yüksek","priority-high"],
  ["AI Modülü","Yapay Zekâ","28 May 2025","Selin Korkmaz","Orta","priority-medium"],
  ["CRM Geliştirme","CRM","02 Haz 2025","Ahmet Demir","Yüksek","priority-high"],
  ["Mobil Test","Mobil Uygulama","05 Haz 2025","Ece Şahin","Düşük","priority-low"],
] as const;

export default function TasksPage(){
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div><a className="icon-button" href="#">＋</a></header>
    <h1 className="section-title">Görevler</h1><p className="section-subtitle">Tüm görevlerinizi tek merkezden yönetin.</p>
    <section className="summary-grid"><article className="summary-card"><span>Yapılacak</span><strong>12</strong></article><article className="summary-card"><span>Devam Ediyor</span><strong>7</strong></article><article className="summary-card"><span>Tamamlandı</span><strong>24</strong></article><article className="summary-card"><span>Geciken</span><strong>3</strong></article></section>
    <section className="task-list">{tasks.map(([title,system,date,assignee,priority,cls])=><article className="glass-card task-card" key={title}><div className="task-head"><div><h2 style={{margin:"0 0 6px"}}>{title}</h2><p style={{margin:0,color:"#9ca6b8"}}>Sistem: <span style={{color:"#b56cff"}}>{system}</span></p></div><strong className={cls}>{priority}</strong></div><div className="task-meta"><span>◷ Bitiş: {date}</span><span>○ Atanan: {assignee}</span></div></article>)}</section>
    <BottomNav active="/gorevler" />
  </main>
}
