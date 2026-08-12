"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "panel" | "projeler" | "gunluk" | "raporlar";
type Report = { id: number; project: string; crew: number; work: string; note: string; date: string };

const projects = [
  { name: "Merkez Camii", location: "Ankara", progress: 72, crew: 34, status: "Devam Ediyor" },
  { name: "Konut Projesi A Blok", location: "İstanbul", progress: 48, crew: 26, status: "Devam Ediyor" },
  { name: "Prekast Cephe Uygulaması", location: "Konya", progress: 91, crew: 12, status: "Teslime Yakın" },
];

export default function SantiyeOSPage() {
  const [tab, setTab] = useState<Tab>("panel");
  const [reports, setReports] = useState<Report[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oryvex_santiye_reports");
      if (raw) setReports(JSON.parse(raw));
    } catch {}
  }, []);

  const avgProgress = useMemo(
    () => Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length),
    []
  );

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const report: Report = {
      id: Date.now(),
      project: String(form.get("project") || projects[0].name),
      crew: Number(form.get("crew") || 0),
      work: String(form.get("work") || ""),
      note: String(form.get("note") || ""),
      date: new Date().toLocaleDateString("tr-TR"),
    };
    const next = [report, ...reports];
    setReports(next);
    localStorage.setItem("oryvex_santiye_reports", JSON.stringify(next));
    event.currentTarget.reset();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <main className="santiye-shell">
      <style>{styles}</style>
      <header className="santiye-topbar">
        <div>
          <a className="oryvex-back" href="/sistemler">← ORYVEX</a>
          <div className="brand-row"><span className="brand-mark">S</span><div><strong>ŞANTİYE OS</strong><small>ORYVEX Construction</small></div></div>
        </div>
        <span className="live-badge">● MVP CANLI</span>
      </header>

      <section className="hero">
        <div><p className="eyebrow">İNŞAAT FİRMALARI İÇİN</p><h1>Şantiye tek ekranda.</h1><p>Projeler, günlük saha kaydı ve temel raporlama. İlk sürüm hızlı kullanım için sade tutuldu.</p></div>
        <button onClick={() => setTab("gunluk")}>+ Günlük Rapor</button>
      </section>

      <nav className="tabs">
        <button className={tab === "panel" ? "active" : ""} onClick={() => setTab("panel")}>Ana Panel</button>
        <button className={tab === "projeler" ? "active" : ""} onClick={() => setTab("projeler")}>Projeler</button>
        <button className={tab === "gunluk" ? "active" : ""} onClick={() => setTab("gunluk")}>Şantiye Günlüğü</button>
        <button className={tab === "raporlar" ? "active" : ""} onClick={() => setTab("raporlar")}>Raporlar</button>
      </nav>

      {tab === "panel" && <section>
        <div className="kpi-grid">
          <article><span>Aktif Proje</span><strong>{projects.length}</strong><small>3 saha çalışıyor</small></article>
          <article><span>Bugünkü Personel</span><strong>{projects.reduce((s,p)=>s+p.crew,0)}</strong><small>Saha toplamı</small></article>
          <article><span>Genel İlerleme</span><strong>%{avgProgress}</strong><small>Ortalama tamamlanma</small></article>
          <article><span>Günlük Rapor</span><strong>{reports.length}</strong><small>Bu cihazdaki kayıtlar</small></article>
        </div>
        <div className="two-col">
          <article className="panel-card"><div className="card-head"><h2>Devam Eden Projeler</h2><button onClick={()=>setTab("projeler")}>Tümünü Gör</button></div>{projects.map(p=><ProjectRow key={p.name} project={p}/>)}</article>
          <article className="panel-card"><div className="card-head"><h2>Hızlı İşlemler</h2></div><div className="quick-grid"><button onClick={()=>setTab("gunluk")}>📝<span>Günlük Rapor</span></button><button onClick={()=>setTab("projeler")}>🏗️<span>Projeler</span></button><button onClick={()=>setTab("raporlar")}>📊<span>Raporlar</span></button><button>📷<span>Fotoğraf</span></button></div></article>
        </div>
      </section>}

      {tab === "projeler" && <section className="panel-card"><div className="card-head"><div><h2>Projeler</h2><p>Aktif şantiyelerin hızlı durumu</p></div><span className="count-pill">{projects.length} aktif</span></div><div className="project-grid">{projects.map(p=><article className="project-card" key={p.name}><div className="project-title"><div><h3>{p.name}</h3><p>📍 {p.location}</p></div><span>{p.status}</span></div><div className="progress-meta"><b>%{p.progress}</b><small>{p.crew} personel</small></div><div className="progress"><i style={{width:`${p.progress}%`}}/></div><div className="project-actions"><button>Detay</button><button onClick={()=>setTab("gunluk")}>Rapor Gir</button></div></article>)}</div></section>}

      {tab === "gunluk" && <section className="two-col">
        <form className="panel-card form-card" onSubmit={submitReport}><div className="card-head"><div><h2>Şantiye Günlüğü</h2><p>Sahadan 30 saniyede kayıt gir.</p></div></div><label>Proje<select name="project">{projects.map(p=><option key={p.name}>{p.name}</option>)}</select></label><label>Çalışan Personel<input name="crew" type="number" min="0" placeholder="Örn. 24" required/></label><label>Bugün Yapılan İş<input name="work" placeholder="Örn. Prekast montajı" required/></label><label>Not<textarea name="note" rows={4} placeholder="İlerleme, sorun, teslimat veya saha notu..."/></label><button className="primary" type="submit">{saved ? "✓ Kaydedildi" : "Günlük Raporu Kaydet"}</button></form>
        <article className="panel-card"><div className="card-head"><div><h2>Son Kayıtlar</h2><p>Bu cihazda saklanan saha kayıtları</p></div></div>{reports.length === 0 ? <div className="empty">Henüz günlük rapor yok.</div> : reports.slice(0,6).map(r=><div className="report-row" key={r.id}><div><strong>{r.project}</strong><p>{r.work}</p><small>{r.date} · {r.crew} personel</small></div></div>)}</article>
      </section>}

      {tab === "raporlar" && <section className="report-grid"><article className="panel-card"><h2>Proje İlerlemesi</h2>{projects.map(p=><div className="bar-row" key={p.name}><div><span>{p.name}</span><b>%{p.progress}</b></div><div className="progress"><i style={{width:`${p.progress}%`}}/></div></div>)}</article><article className="panel-card"><h2>Saha Özeti</h2><div className="big-stat"><span>Toplam Personel</span><strong>{projects.reduce((s,p)=>s+p.crew,0)}</strong></div><div className="big-stat"><span>Ortalama İlerleme</span><strong>%{avgProgress}</strong></div><div className="big-stat"><span>Kayıtlı Günlük Rapor</span><strong>{reports.length}</strong></div></article></section>}

      <footer>ORYVEX · ŞANTİYE OS MVP v0.1</footer>
    </main>
  );
}

function ProjectRow({project}:{project:(typeof projects)[number]}){
  return <div className="project-row"><div><strong>{project.name}</strong><small>{project.location} · {project.crew} personel</small></div><div className="row-progress"><span>%{project.progress}</span><div className="progress"><i style={{width:`${project.progress}%`}}/></div></div></div>
}

const styles = `
*{box-sizing:border-box}.santiye-shell{min-height:100vh;background:#07111f;color:#eef4ff;padding:24px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.santiye-shell button,.santiye-shell input,.santiye-shell select,.santiye-shell textarea{font:inherit}.santiye-topbar,.hero,.tabs,.santiye-shell>section,.santiye-shell footer{max-width:1180px;margin-left:auto;margin-right:auto}.santiye-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.oryvex-back{color:#8ea1bc;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.08em}.brand-row{display:flex;align-items:center;gap:10px;margin-top:9px}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#f59e0b;color:#07111f;font-weight:900}.brand-row strong{display:block;font-size:18px}.brand-row small{display:block;color:#8797ae;font-size:11px;margin-top:2px}.live-badge,.count-pill{border:1px solid #1f3955;background:#0c1d30;color:#58d6a4;padding:8px 11px;border-radius:999px;font-size:11px;font-weight:800}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;padding:28px;background:linear-gradient(135deg,#0c2138,#0a1727);border:1px solid #17314d;border-radius:24px;box-shadow:0 25px 70px #0005}.hero h1{font-size:clamp(32px,5vw,60px);line-height:.98;margin:8px 0 14px;letter-spacing:-.045em}.hero p{max-width:690px;color:#9eacc1;margin:0;line-height:1.6}.eyebrow{color:#f7b63c!important;font-size:11px;font-weight:900;letter-spacing:.18em}.hero button,.primary{border:0;border-radius:14px;background:#f59e0b;color:#07111f;font-weight:900;padding:14px 18px;cursor:pointer;white-space:nowrap}.tabs{display:flex;gap:8px;overflow:auto;padding:18px 0}.tabs button{border:1px solid #18304a;background:#0b1828;color:#93a5bd;border-radius:12px;padding:11px 15px;cursor:pointer;white-space:nowrap}.tabs button.active{background:#f59e0b;color:#07111f;border-color:#f59e0b;font-weight:900}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px}.kpi-grid article,.panel-card{background:#0b1828;border:1px solid #17314c;border-radius:20px;padding:20px}.kpi-grid span,.kpi-grid small{display:block;color:#8495ad}.kpi-grid strong{display:block;font-size:34px;margin:8px 0}.kpi-grid small{font-size:11px}.two-col,.report-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:14px}.card-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}.card-head h2,.panel-card h2{margin:0;font-size:18px}.card-head p{margin:5px 0 0;color:#8394ab;font-size:12px}.card-head button,.project-actions button{border:0;background:transparent;color:#f7b63c;cursor:pointer;font-weight:800}.project-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid #14283d}.project-row:last-child{border:0}.project-row strong,.project-row small{display:block}.project-row small{color:#7f91a8;font-size:11px;margin-top:5px}.row-progress{width:160px;text-align:right}.row-progress span{font-size:12px;font-weight:800}.progress{height:7px;background:#142a41;border-radius:999px;overflow:hidden;margin-top:7px}.progress i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#ffd16a);border-radius:999px}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quick-grid button{min-height:90px;border:1px solid #17314c;background:#0d1d2f;color:#eaf1fb;border-radius:15px;font-size:23px;cursor:pointer}.quick-grid span{display:block;font-size:11px;margin-top:8px;color:#9babc0}.project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.project-card{background:#0d1d2f;border:1px solid #19344f;padding:18px;border-radius:18px}.project-title{display:flex;justify-content:space-between;gap:12px}.project-title h3{margin:0;font-size:15px}.project-title p{color:#7f91a8;font-size:11px}.project-title span{font-size:10px;color:#58d6a4}.progress-meta{display:flex;align-items:center;justify-content:space-between;margin-top:18px}.progress-meta b{font-size:25px}.progress-meta small{color:#8394ab}.project-actions{display:flex;justify-content:space-between;margin-top:16px}.form-card label{display:block;color:#aab7c9;font-size:12px;font-weight:700;margin:13px 0}.form-card input,.form-card select,.form-card textarea{display:block;width:100%;margin-top:7px;background:#071320;border:1px solid #1a3550;color:#eef4ff;border-radius:12px;padding:12px;outline:none}.form-card textarea{resize:vertical}.form-card .primary{width:100%;margin-top:5px}.report-row{padding:14px 0;border-bottom:1px solid #14283d}.report-row strong{font-size:13px}.report-row p{margin:5px 0;color:#9aacbf;font-size:12px}.report-row small{color:#667a94;font-size:10px}.empty{color:#71849d;padding:40px 10px;text-align:center}.bar-row{margin:22px 0}.bar-row>div:first-child{display:flex;justify-content:space-between;font-size:12px}.big-stat{display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid #14283d}.big-stat span{color:#91a1b6}.big-stat strong{font-size:26px}.santiye-shell footer{color:#5e718a;text-align:center;font-size:10px;padding:36px 0 16px}@media(max-width:820px){.santiye-shell{padding:14px}.hero{align-items:flex-start;flex-direction:column}.hero button{width:100%}.kpi-grid{grid-template-columns:1fr 1fr}.two-col,.report-grid{grid-template-columns:1fr}.project-grid{grid-template-columns:1fr}.santiye-topbar{margin-bottom:16px}.project-row{align-items:flex-start}.row-progress{width:105px}}@media(max-width:440px){.kpi-grid{grid-template-columns:1fr 1fr}.kpi-grid article{padding:15px}.kpi-grid strong{font-size:27px}.hero{padding:20px}.live-badge{font-size:9px}.tabs{padding-bottom:12px}}
`;
