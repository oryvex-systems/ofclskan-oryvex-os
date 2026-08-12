import BottomNav from "../components/BottomNav";
import { getWorkspaces, requireUser } from "../../lib/session";

const labels: Record<string,string> = {
  active: "Aktif",
  development: "Geliştiriliyor",
  paused: "Duraklatıldı",
  archived: "Arşivlendi",
};

export default async function SystemsPage(){
  await requireUser();
  const systems = await getWorkspaces();
  const active = systems.filter((item)=>item.status === "active").length + 1;
  const development = systems.filter((item)=>item.status === "development").length;
  const paused = systems.filter((item)=>item.status === "paused").length;
  const archived = systems.filter((item)=>item.status === "archived").length;

  return <main className="page-shell">
    <header className="topbar"><div className="mini-brand">ORYVEX</div><span className="badge">CORE AKTİF</span></header>
    <h1 className="section-title">Sistemler</h1><p className="section-subtitle">Yetkiniz olan tüm çalışma alanlarını tek merkezden yönetin.</p>
    <section className="summary-grid">
      <article className="summary-card"><span>Aktif</span><strong>{active}</strong></article>
      <article className="summary-card"><span>Geliştiriliyor</span><strong>{development}</strong></article>
      <article className="summary-card"><span>Duraklatıldı</span><strong>{paused}</strong></article>
      <article className="summary-card"><span>Arşiv</span><strong>{archived}</strong></article>
    </section>
    <section className="system-list">
      <a className="glass-card system-card" href="/santiye-os">
        <div className="system-head">
          <div><h2 style={{margin:"0 0 5px"}}>ŞANTİYE OS</h2><p style={{margin:0,color:"#9ca6b8"}}>İnşaat firmaları için proje, saha günlüğü ve hızlı raporlama sistemi.</p></div>
          <span className="badge">Aktif</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:18,color:"#8f99ab",fontSize:13}}>
          <span>ORYVEX altında MVP sürümü</span>
          <strong style={{color:"#64e5ff"}}>Sisteme Gir →</strong>
        </div>
      </a>
      {systems.map((system)=>{
        const content = <>
          <div className="system-head">
            <div><h2 style={{margin:"0 0 5px"}}>{system.name}</h2><p style={{margin:0,color:"#9ca6b8"}}>{system.description}</p></div>
            <span className="badge">{labels[system.status] ?? system.status}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:18,color:"#8f99ab",fontSize:13}}>
            <span>{system.app_url ? "Canlı sisteme hazır" : "ORYVEX çekirdeğine bağlı"}</span>
            <strong style={{color:system.app_url?"#64e5ff":"#a783ff"}}>{system.app_url ? "Sisteme Gir →" : "Hazırlanıyor"}</strong>
          </div>
        </>;
        return system.app_url
          ? <a className="glass-card system-card" key={system.id} href={system.app_url} target="_blank" rel="noreferrer">{content}</a>
          : <article className="glass-card system-card" key={system.id}>{content}</article>;
      })}
      {systems.length === 0 && <article className="glass-card"><h2>ORYVEX sistemleri hazırlanıyor</h2><p className="section-subtitle">ŞANTİYE OS kullanıma hazır. Diğer çalışma alanları bağlandıkça burada görünecek.</p></article>}
    </section>
    <BottomNav active="/sistemler" />
  </main>
}
