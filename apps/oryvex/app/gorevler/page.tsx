import BottomNav from "../components/BottomNav";
import { getTasks, requireUser } from "../../lib/session";

const statusLabel: Record<string,string> = { todo:"Yapılacak", in_progress:"Devam Ediyor", done:"Tamamlandı", overdue:"Geciken" };
const priorityLabel: Record<string,string> = { low:"Düşük", medium:"Orta", high:"Yüksek", critical:"Kritik" };
const priorityClass: Record<string,string> = { low:"priority-low", medium:"priority-medium", high:"priority-high", critical:"priority-high" };

export default async function TasksPage(){
  await requireUser();
  const tasks = await getTasks();
  const count = (status:string) => tasks.filter((task)=>task.status===status).length;
  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div><span className="icon-button">＋</span></header>
    <h1 className="section-title">Görevler</h1><p className="section-subtitle">Tüm görevlerinizi tek merkezden yönetin.</p>
    <section className="summary-grid"><article className="summary-card"><span>Yapılacak</span><strong>{count("todo")}</strong></article><article className="summary-card"><span>Devam Ediyor</span><strong>{count("in_progress")}</strong></article><article className="summary-card"><span>Tamamlandı</span><strong>{count("done")}</strong></article><article className="summary-card"><span>Geciken</span><strong>{count("overdue")}</strong></article></section>
    <section className="task-list">{tasks.map((task)=><article className="glass-card task-card" key={task.id}><div className="task-head"><div><h2 style={{margin:"0 0 6px"}}>{task.title}</h2><p style={{margin:0,color:"#9ca6b8"}}>Sistem: <span style={{color:"#b56cff"}}>{task.oryvex_workspaces?.name ?? "ORYVEX"}</span></p></div><strong className={priorityClass[task.priority]}>{priorityLabel[task.priority]}</strong></div><div className="task-meta"><span>Durum: {statusLabel[task.status]}</span><span>◷ Bitiş: {task.due_date ?? "Tarih yok"}</span></div></article>)}</section>
    {tasks.length === 0 && <section className="glass-card"><h2>Görev bulunamadı</h2><p className="section-subtitle">Bu hesaba ait aktif görev görünmüyor.</p></section>}
    <BottomNav active="/gorevler" />
  </main>
}
